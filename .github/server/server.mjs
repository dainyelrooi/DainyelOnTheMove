/* Optional server runtime. Disabled until configured and explicitly released. */
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {renderPublic} from './render.mjs';
import {createService,HttpError} from './service.mjs';

export async function productionAdapters(env=process.env) {
  const {initializeApp,applicationDefault}=await import('firebase-admin/app');
  const {getFirestore,Timestamp}=await import('firebase-admin/firestore');
  const {getAuth}=await import('firebase-admin/auth');
  const {getAppCheck}=await import('firebase-admin/app-check');
  const app=initializeApp({credential:applicationDefault(),projectId:env.GOOGLE_CLOUD_PROJECT});
  const db=getFirestore(app,'dainyel-content');
  const persisted=data=>data.expiresAt?{...data,expiresAt:Timestamp.fromDate(new Date(data.expiresAt))}:data;
  const store={
    async get(path){const snapshot=await db.doc(path).get();return snapshot.exists?snapshot.data():null;},
    async set(path,data){await db.doc(path).set(persisted(data));},
    async list(collection,limit){const snapshot=await db.collection(collection).orderBy('updatedAt','desc').limit(limit).get();return snapshot.docs.map(s=>s.data());},
    async publicAnswers(){const snapshot=await db.collection('questions').where('status','==','published').orderBy('answeredAt','desc').limit(100).get();return snapshot.docs.map(s=>({id:s.id,question:s.data().question,answer:s.data().answer,topic:s.data().topic}));},
    atomic(fn){return db.runTransaction(tx=>fn({get:async path=>{const s=await tx.get(db.doc(path));return s.exists?s.data():null;},set:(path,data)=>tx.set(db.doc(path),persisted(data)),delete:path=>tx.delete(db.doc(path))}));}
  };
  return {
    store,
    async verifyOwner(token){if(!env.JOURNEY_OWNER_UID)throw Error();const claims=await getAuth(app).verifyIdToken(token,true);if(claims.uid!==env.JOURNEY_OWNER_UID||claims.email_verified!==true)throw Error();},
    async verifyApp(token){if(!token)throw Error();await getAppCheck(app).verifyToken(token);},
    config:{rateSalt:env.JOURNEY_RATE_SALT},
    mail:{
      configured:Boolean(env.BREVO_API_KEY&&env.CONTACT_TO&&env.CONTACT_FROM),
      async send(content,id){
        const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({sender:{name:'Dainyel on the Move',email:env.CONTACT_FROM},to:[{email:env.CONTACT_TO}],replyTo:{email:content.email,name:content.name},subject:'Website collaboration enquiry',textContent:`Name: ${content.name}\nOrganisation: ${content.brand}\nFormat: ${content.format}\n\n${content.message}\n\nReference: ${id}`,headers:{idempotencyKey:id}})});
        if(!r.ok)throw Error('Mail provider did not confirm acceptance.');const result=await r.json();if(typeof result.messageId!=='string')throw Error('Ambiguous mail response.');return result.messageId.slice(0,500);
      }
    }
  };
}

export function createHttpHandler(service,{origins,publicWrites=false,publishing=false,proxyHops=0,store,shell}={}) {
  return async(req,res)=> {
    const respond=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(body));};
    try{
      const path=new URL(req.url,'http://local').pathname;
      if(req.method==='GET'&&path==='/sitemap-updates.xml'){
        const records=store?await store.list('journeyPublic',200):[];
        const xml='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+records.filter(r=>r.status==='published'&&['journal','postcard'].includes(r.kind)&&/^[a-z0-9-]+\.html$/.test(r.url)).map(r=>'<url><loc>https://dainyelonthemove.com/'+r.url+'</loc></url>').join('')+'</urlset>';
        res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'});res.end(xml);return;
      }
      const detail=path.match(/^\/(?:note|postcard)-([a-z0-9-]{1,80})\.html$/);
      if(req.method==='GET'&&detail){
        const record=store?await store.get('journeyPublic/'+detail[1]):null;
        const rendered=record&&record.url===path.slice(1)?renderPublic(record,shell):null;
        if(!rendered){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'no-store'});res.end('<!doctype html><title>Not available</title><h1>This entry is not publicly available.</h1><a href="/field-notes.html">Explore published Field Notes</a>');return;}
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(rendered);return;
      }
      if(req.method==='GET'&&path==='/api/health')return respond(200,{available:Boolean(service),contact:Boolean(service&&publicWrites),publishing:Boolean(service&&publishing)});
      if(!service)throw new HttpError(503,'This service is not configured. Nothing was sent or published.');
      if(req.method!=='GET'){
        if(!origins?.includes(req.headers.origin))throw new HttpError(403,'This origin is not allowed.');
        if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new HttpError(415,'Use a JSON request.');
        if(path.startsWith('/api/content')?!publishing:!publicWrites)throw new HttpError(503,'This action is not enabled. Nothing was sent or published.');
      }
      let chunks=[],size=0;
      for await(const chunk of req){size+=chunk.length;if(size>16384)throw new HttpError(413,'The request is too large.');chunks.push(chunk);}
      let body={};try{if(size)body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new HttpError(400,'The request could not be read.');}
      const forwarded=String(req.headers['x-forwarded-for']||'').split(',').map(v=>v.trim());
      const ip=proxyHops>0&&forwarded.length>=proxyHops?forwarded.at(-proxyHops):req.socket.remoteAddress;
      const result=await service({method:req.method,path,headers:req.headers,body,ip});respond(result.status,result.body);
    }catch(error){respond(error instanceof HttpError?error.status:503,{error:error instanceof HttpError?error.message:'The service could not complete this request. Please try again later.'});}
  };
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  const enabled=process.env.JOURNEY_SERVICE_ENABLED==='true';
  const adapters=enabled?await productionAdapters():null;
  const service=adapters?createService(adapters):null;
  const shell=enabled?JSON.parse(await readFile(new URL('./public-shell.json',import.meta.url),'utf8')):null;
  const handler=createHttpHandler(service,{store:adapters?.store,shell,origins:(process.env.JOURNEY_ORIGINS||'').split(',').filter(Boolean),publicWrites:process.env.JOURNEY_PUBLIC_WRITES==='true',publishing:process.env.JOURNEY_PUBLISHING==='true',proxyHops:Number(process.env.JOURNEY_PROXY_HOPS||0)});
  const port=Number(process.env.PORT||8787);
  http.createServer(handler).listen(port,enabled?'0.0.0.0':'127.0.0.1',()=>console.log(`Journey service: ${enabled?'configured':'disabled'}; port ${port}. No request bodies or credentials are logged.`));
}
