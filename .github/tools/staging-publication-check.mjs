// Disposable headless publication proof. Hard-coded staging namespace, no mail.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {ROOT,pack,data} from '../cloudflare/publication-engine.mjs';
const mode=process.argv[2],kind=process.argv[3]||'blog';if(!['blog','field-note'].includes(kind))throw Error('Only isolated article kinds');if(!['prepare','check','cleanup'].includes(mode))throw Error('prepare/check/cleanup only');
const require=createRequire(process.env.FIREBASE_CLI_PACKAGE),{requireAuth}=require('./lib/requireAuth.js'),{Client}=require('./lib/apiv2.js'),{selectAccount,setActiveAccount}=require('./lib/auth.js');
const options={project:'dainyelonthemove',projectRoot:process.cwd(),nonInteractive:true},account=selectAccount(undefined,process.cwd());if(account)setActiveAccount(options,account);await requireAuth(options);
const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'}),base=ROOT+'/cmsSpaces/staging',receiptPath='.wrangler/publication-check-'+kind+'.json';
async function call(path,method='GET',body){try{return(await client.request({method,path,...(body?{body}:{}),responseType:'json'})).body;}catch(e){if(method==='GET'&&e.status===404)return null;throw e;}}
const fields=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)]));
if(mode==='prepare'){
  if(existsSync(receiptPath))throw Error('Review the existing isolated check before preparing another');
  const id='entry-'+crypto.randomUUID().replaceAll('-',''),photoId='photo-'+crypto.randomUUID().replaceAll('-',''),now=new Date().toISOString(),due=new Date(Date.now()+5*60000).toISOString();
  const payload={version:1,kind,title:'STAGING CHECK — automatic publication',excerpt:'Disposable scheduled check on the separate test website.',body:'This is an isolated test, not a travel story.\n\n## Scheduled chapter\nChecking the same photographs, chapter navigation and story card as a real scheduled entry.',place:'',sources:'',videoUrl:'',photoIds:[photoId],photoPlacements:[1],heroPhotoId:photoId,heroLayout:'split',heroPosition:'center',storyLabel:'ISOLATED STAGING CHECK',tripPeriod:''};
  const draftFields={...fields({...payload,revision:1}),createdAt:{timestampValue:now},updatedAt:{timestampValue:now}};
  const rows=[{name:base+'/drafts/'+id,fields:draftFields},{name:base+'/entrySchedules/'+id,fields:{...fields({version:1,entryId:id,draftRevision:1,payload,status:'queued'}),createdAt:{timestampValue:now},updatedAt:{timestampValue:now},scheduledAt:{timestampValue:due}}},{name:base+'/media/'+photoId,fields:{...fields({version:1,entryId:id,dataUrl:'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA',alt:'One-pixel synthetic test photograph',width:1,height:1}),createdAt:{timestampValue:now}}}];
  await call(ROOT+':commit','POST',{writes:rows.map(update=>({update,currentDocument:{exists:false}}))});
  writeFileSync(receiptPath,JSON.stringify({id,photoId,scheduledAt:due}));console.log(JSON.stringify({id,scheduledAt:due,space:'staging',mail:'forbidden'}));
}else{
  const receipt=JSON.parse(readFileSync(receiptPath,'utf8'));if(!/^entry-[a-f0-9]{32}$/.test(receipt.id)||!/^photo-[a-f0-9]{32}$/.test(receipt.photoId))throw Error('Invalid test receipt');
  const paths=['drafts','entrySchedules','published','summaries'].map(kind=>base+'/'+kind+'/'+receipt.id),rows=await Promise.all(paths.map(path=>call(path)));
  if(mode==='check')console.log(JSON.stringify({id:receipt.id,space:'staging',scheduledAt:receipt.scheduledAt,schedule:data(rows[1]).status||'absent',published:!!rows[2],summary:!!rows[3],operation:data(await call(ROOT+'/adminOperations/staging/publicationJobs/'+receipt.id)).state||'absent'}));
  else{
    if(rows[0]&&data(rows[0]).title!=='STAGING CHECK — automatic publication')throw Error('Test was edited; refuse cleanup');
    const media=await call(base+'/media/'+receipt.photoId);if(media&&data(media).entryId!==receipt.id)throw Error('Mismatched test media');
    const writes=[...rows,media].filter(Boolean).map(row=>({delete:row.name,currentDocument:{updateTime:row.updateTime}}));
    writes.push({update:{name:base+'/siteChanges/current',fields:{version:pack(1)}},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]});
    await call(ROOT+':commit','POST',{writes});console.log('Only the exact disposable staging entry and its photograph were removed. Private technical receipt retained. No email operation.');
  }
}
