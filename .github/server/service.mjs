import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new HttpError(status,message);};
const hash=value=>createHash('sha256').update(value).digest('hex');
const text=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(400,'Check the text fields and their lengths.');return value.trim();};
const keys=(value,allowed)=>{if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).some(k=>!allowed.includes(k)))fail(400,'Unsupported fields.');};
const slug=value=>{if(typeof value!=='string'||!/^[a-z0-9-]{1,80}$/.test(value))fail(400,'Use a short lowercase ID.');return value;};
const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'Use a valid calendar date.');return value;};
const instant=value=>{if(typeof value!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))fail(400,'Include the date, time and timezone.');return new Date(value).toISOString();};
const url=value=>{if(typeof value!=='string'||!/^[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$/.test(value))fail(400,'Use a public story link on this website.');return value;};
const photo=value=>{keys(value,['src','alt']);if(!/^assets\/[a-zA-Z0-9_./-]+\.(webp|avif|jpe?g|png)$/.test(value.src)||value.src.includes('..'))fail(400,'Choose a local website photograph.');return{src:value.src,alt:text(value.alt,3,300)};};
export function validateContent(kind,input) {
  switch(kind){
    case 'journal': keys(input,['title','text','eventDate','destinationId','tripId','storyUrl','photo']);return {title:text(input.title,3,120),text:text(input.text,10,5000),eventDate:date(input.eventDate),eventYear:Number(input.eventDate.slice(0,4)),eventLabel:input.eventDate,destinationId:slug(input.destinationId),tripId:slug(input.tripId),...(input.storyUrl?{storyUrl:url(input.storyUrl)}:{}),...(input.photo?{photo:photo(input.photo)}:{})};
    case 'checkin':keys(input,['city','country','eventDate','tripId']);return {city:text(input.city,1,60),country:text(input.country,1,60),eventDate:date(input.eventDate),tripId:slug(input.tripId)};
    case 'reveal':keys(input,['city','country','date','text','storyUrl','photos','coordinates']);if(input.coordinates&&(!Array.isArray(input.coordinates)||input.coordinates.length!==2||input.coordinates.some((v,i)=>!Number.isFinite(v)||Math.abs(v)>(i?90:180)||Math.abs(v*10-Math.round(v*10))>0.000001)))fail(400,'Only manually approved broad centres rounded to one decimal are allowed.');if(input.photos&&(!Array.isArray(input.photos)||input.photos.length>6))fail(400,'Choose at most six local photographs.');return{city:text(input.city,1,60),country:text(input.country,1,60),date:date(input.date),text:text(input.text,10,600),...(input.storyUrl?{storyUrl:url(input.storyUrl)}:{}),...(input.photos?{photos:input.photos.map(photo)}:{}),...(input.coordinates?{coordinates:input.coordinates}:{})};
    case 'trip':{keys(input,['confirmedDepartureAt','endedAt']);const actual=input.confirmedDepartureAt?instant(input.confirmedDepartureAt):null,end=input.endedAt?instant(input.endedAt):null;if(end&&(!actual||Date.parse(end)<Date.parse(actual)))fail(400,'A journey end requires an earlier confirmed departure.');return {confirmedDepartureAt:actual,endedAt:end};}
    case 'postcard':keys(input,['title','subtitle','sentDate','paragraphs','destinationIds','storyUrls','photo']);if(!Array.isArray(input.paragraphs)||input.paragraphs.length>30||!Array.isArray(input.destinationIds)||input.destinationIds.length>10||!Array.isArray(input.storyUrls)||input.storyUrls.length>10)fail(400,'Check Postcard paragraphs and relationships.');return {title:text(input.title,3,120),subtitle:text(input.subtitle,3,250),sentDate:date(input.sentDate),paragraphs:input.paragraphs.map(p=>text(p,1,1500)),destinationIds:input.destinationIds.map(slug),storyUrls:input.storyUrls.map(url),...(input.photo?{photo:photo(input.photo)}:{})};
    case 'expense':keys(input,['date','tripId','destinationId','category','currency','amountMinor','personalMinor','coverageNote']);if(!Number.isSafeInteger(input.amountMinor)||!Number.isSafeInteger(input.personalMinor)||input.personalMinor<0||input.personalMinor>input.amountMinor||input.amountMinor>100000000000||!/^[A-Z]{3}$/.test(input.currency))fail(400,'Amounts must use integer currency units, with a valid personal share.');try{new Intl.NumberFormat('en',{style:'currency',currency:input.currency});}catch{fail(400,'Unknown currency.');}return {date:date(input.date),tripId:slug(input.tripId),destinationId:slug(input.destinationId),category:text(input.category,1,60),currency:input.currency,amountMinor:input.amountMinor,personalMinor:input.personalMinor,coverageNote:text(input.coverageNote,3,300)};
    case 'challenge':keys(input,['title','text','displayName']);return {title:text(input.title,3,80),text:text(input.text,10,1000),displayName:input.displayName?text(input.displayName,1,40):'A fellow traveller'};
    default:fail(400,'Unknown content type.');
  }
}
export function publicProjection(record) {
  if(record.moderation!=='published')return null;
  const raw={...record.content};
  if(record.kind==='journal'){delete raw.eventYear;delete raw.eventLabel;}
  const content=validateContent(record.kind,raw);
  return {id:record.id,kind:record.kind,...content,status:'published',publishedAt:record.publishedAt,updatedAt:record.updatedAt,...(record.kind==='challenge'?{lifecycle:record.lifecycle||'proposed',result:record.result||null}:{}),...(record.kind==='journal'?{url:`note-${record.id}.html`}:record.kind==='postcard'?{url:`postcard-${record.id}.html`}:{})};
}
export function createService({store,verifyOwner,verifyApp,mail,config,now=()=>Date.now(),random=()=>randomBytes(24).toString('hex')}) {
  async function owner(headers){const auth=headers.authorization||'';if(!auth.startsWith('Bearer '))fail(401,'Sign in as the verified owner.');try{await verifyOwner(auth.slice(7));}catch{fail(403,'Owner access is required.');}}
  async function app(headers){try{await verifyApp(headers['x-firebase-appcheck']||'');}catch{fail(403,'The website verification could not be completed. Please reload and try again.');}}
  function ipKey(ip){if(!config.rateSalt)fail(503,'The service is not configured.');return createHmac('sha256',config.rateSalt).update(ip||'unknown').digest('hex');}
  async function limit(tx,ip){const bucket=`journeyRate/${ipKey(ip)}-${Math.floor(now()/3600000)}`,old=await tx.get(bucket);if((old?.count||0)>=5)fail(429,'Too many submissions. Please try again in an hour.');tx.set(bucket,{count:(old?.count||0)+1,expiresAt:new Date(now()+7200000).toISOString()});}
  async function publish(tx,record){const projection=publicProjection(record);if(projection)tx.set(`journeyPublic/${record.id}`,projection);else tx.delete(`journeyPublic/${record.id}`);}
  return async function request({method,path,headers={},body={},ip=''}) {
    const stamp=()=>new Date(now()).toISOString();
    const reportingDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now()));
    if(method==='GET'&&path==='/api/public'){
      const records=(await store.list('journeyPublic',200)).map(r=>{const summary={...r};if(r.kind==='journal')summary.text=r.text.slice(0,320);if(r.kind==='postcard')delete summary.paragraphs;return summary;});
      return {status:200,body:{records,questions:store.publicAnswers?await store.publicAnswers():[]}};
    }
    if(method==='POST'&&path==='/api/contact') {
      if(!mail?.configured)fail(503,'Direct sending is not available yet. Nothing was sent. Please use email or Instagram.');
      await app(headers);keys(body,['name','email','brand','format','message','consent','website']);
      if(body.website)fail(400,'The message could not be submitted.');if(body.consent!==true)fail(400,'Consent to the contact handling is required.');
      const content={name:text(body.name,1,80),email:text(body.email,3,254),brand:body.brand?text(body.brand,1,120):'',format:text(body.format,1,80),message:text(body.message,10,2500)};
      if(!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(content.email))fail(400,'Use a valid reply email address.');
      const key=headers['idempotency-key'];if(typeof key!=='string'||!/^[a-zA-Z0-9-]{20,80}$/.test(key))fail(400,'Please reload the form and try again.');
      const id=hash(key).slice(0,40),fingerprint=hash(JSON.stringify(content));
      const created=await store.atomic(async tx=>{const old=await tx.get(`journeyMessages/${id}`);if(old){if(old.fingerprint!==fingerprint)fail(409,'The form changed. Start a new submission.');return false;}await limit(tx,ip);tx.set(`journeyMessages/${id}`,{id,content,fingerprint,state:'attempted',createdAt:stamp(),expiresAt:new Date(now()+90*86400000).toISOString()});return true;});
      if(created){
        let result;
        try{result=await mail.send(content,id);}catch{await store.set(`journeyMessageState/${id}`,{state:'held-for-review',updatedAt:stamp(),expiresAt:new Date(now()+90*86400000).toISOString()});return{status:202,body:{reference:id,state:'received',message:'Your message was stored. Mail delivery needs review; please keep this reference. Do not resubmit.'}};}
        await store.set(`journeyMessageState/${id}`,{state:'provider-accepted',providerId:result,updatedAt:stamp(),expiresAt:new Date(now()+90*86400000).toISOString()});
      }
      return{status:202,body:{reference:id,state:'received',message:'Your message was received. Mailbox delivery is pending; keep this reference.'}};
    }
    if(method==='POST'&&path==='/api/challenges') {
      await app(headers);keys(body,['title','text','displayName','consent','website']);if(body.website||body.consent!==true)fail(400,'Check the submission and publication consent.');
      const content=validateContent('challenge',{title:body.title,text:body.text,displayName:body.displayName});
      const key=headers['idempotency-key'];if(typeof key!=='string'||!/^[a-zA-Z0-9-]{20,80}$/.test(key))fail(400,'Please reload the form.');
      const id=hash(key).slice(0,40),editKey=random();
      const created=await store.atomic(async tx=>{if(await tx.get(`journeyDrafts/${id}`))return false;await limit(tx,ip);tx.set(`journeyDrafts/${id}`,{id,kind:'challenge',content,moderation:'pending',lifecycle:'proposed',editHash:hash(editKey),createdAt:stamp(),updatedAt:stamp(),revision:1});return true;});
      return{status:202,body:{id,moderation:'pending',...(created?{editKey}:{}),message:'Received for private review. It will appear only after Dainyel approves it.'}};
    }
    const edit=path.match(/^\/api\/challenges\/([a-f0-9]{40})$/);
    if(method==='PATCH'&&edit){await app(headers);const content=validateContent('challenge',body),id=edit[1];await store.atomic(async tx=>{const old=await tx.get(`journeyDrafts/${id}`),key=headers['x-edit-key'];if(!old?.editHash||typeof key!=='string'||!timingSafeEqual(Buffer.from(old.editHash),Buffer.from(hash(key))))fail(403,'The private edit key is not valid.');await limit(tx,ip);const record={...old,content,moderation:'pending',revision:old.revision+1,updatedAt:stamp()};tx.set(`journeyDrafts/${id}`,record);tx.delete(`journeyPublic/${id}`);});return{status:200,body:{moderation:'pending',message:'Edited and returned to private review.'}};}
    if(path==='/api/content'&&method==='GET'){await owner(headers);return{status:200,body:{records:await store.list('journeyDrafts',200)}};}
    if(path==='/api/content'&&method==='POST') {
      await owner(headers);keys(body,['id','kind','content','revision','action','lifecycle','result']);
      const id=slug(body.id),content=validateContent(body.kind,body.content),action=body.action||'save';
      if(!['save','publish','unpublish','reject'].includes(action))fail(400,'Unsupported publication action.');
      await store.atomic(async tx=>{
        const old=await tx.get(`journeyDrafts/${id}`);
        if(old&&old.revision!==body.revision)fail(409,'This entry changed in another window. Reload it before saving.');
        if(old&&old.kind!==body.kind)fail(409,'The content type cannot change.');
        if(action==='publish'&&body.kind==='trip'&&content.confirmedDepartureAt&&Date.parse(content.confirmedDepartureAt)>now())fail(400,'A future date cannot confirm departure.');
        if(action==='publish'&&body.kind==='postcard'&&content.sentDate>reportingDate())fail(400,'Only already sent editions can be published.');
        if(action==='publish'&&(content.eventDate||content.date)>reportingDate())fail(400,'An event or expense date cannot be in the future.');
        const lifecycle=body.lifecycle||old?.lifecycle||'proposed';if(!['proposed','accepted','completed','declined'].includes(lifecycle))fail(400,'Unknown challenge lifecycle.');
        const result=body.result===undefined?(old?.result||null):body.result?text(body.result,10,2000):null;if(action==='publish'&&body.kind==='challenge'&&lifecycle==='completed'&&!result)fail(400,'A completed challenge needs a genuine result.');
        const record={...(old||{}),id,kind:body.kind,content,moderation:action==='publish'?'published':action==='reject'?'rejected':'draft',lifecycle,result,createdAt:old?.createdAt||stamp(),updatedAt:stamp(),revision:(old?.revision||0)+1};
        if(action==='publish')record.publishedAt=old?.publishedAt||stamp();
        tx.set(`journeyDrafts/${id}`,record);await publish(tx,record);
      });
      return{status:200,body:{id,message:action==='publish'?'Published. Public projection updated.':'Saved privately. Public projection removed.'}};
    }
    fail(404,'This service route does not exist.');
  };
}
