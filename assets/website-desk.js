import {doc,getDoc,writeBatch,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {db} from '../js/firebase.js';
import {preparePhoto,newId,element} from './publishing-model.js';
import {siteSpace,photoId,safeSiteImage,validateSiteValues,referencedSitePhotos} from './website-model.js';
import {confirmOwnerAction} from './owner-confirm.js';
const host=document.querySelector('[data-website-desk]'),find=name=>host?.querySelector('[data-website-'+name+']');
const ref=(kind,id)=>doc(db,'websiteSpaces',siteSpace,kind,id);
let active;
async function json(url){const response=await fetch(url,{cache:'no-cache'});if(!response.ok)throw Error('The page catalogue could not be opened. Reload the admin to try again.');return response.json();}
export function clearWebsiteDesk(){
  if(active){active.abort.abort();clearTimeout(active.timer);clearTimeout(active.previewTimer);}active=null;
  if(!host)return;find('dialog').close();find('frame').removeAttribute('src');find('form').reset();find('form').dataset.dirty='';find('fields').replaceChildren();find('heading').textContent='Choose your page';find('saved').textContent='';find('state').textContent='Not connected';find('status').textContent='Sign in to open your website editor.';
  host.querySelectorAll('button,input,select,textarea').forEach(e=>e.disabled=true);
}
export async function initWebsiteDesk(){
  clearWebsiteDesk();if(!host)return;
  const s={abort:new AbortController(),ready:false,busy:false,load:0,values:{},media:{},revision:0,publishedRevision:0,dirty:false,reviewed:false,catalogues:new Map()};active=s;
  const options={signal:s.abort.signal},current=()=>active===s;
  const say=(text,error=false)=>{if(current()){find('status').textContent=text;find('status').dataset.state=error?'error':'success';}};
  function controls(){
    if(!current())return;host.querySelectorAll('input,select,textarea,button').forEach(input=>input.disabled=!s.ready||s.busy);
    find('page').disabled=s.busy||!find('page').options[0]?.value||find('page').options[0]?.text==='Loading pages…';find('section').disabled=s.busy||!s.page;
    find('retry').disabled=s.busy;
    find('consent').disabled=!s.ready||s.busy||!s.reviewed;
    find('publish').disabled=!s.ready||s.busy||!s.reviewed||!find('consent').checked;
    find('restore').disabled=!s.ready||s.busy||!s.publishedRevision;
    find('export').disabled=!s.group;
    find('state').textContent=s.busy?'Waiting for confirmation…':s.dirty?'Unsaved changes':s.ready?'Private draft saved or original section':'Opening section…';
  }
  function invalidate(){s.reviewed=false;find('consent').checked=false;clearTimeout(s.previewTimer);find('dialog').close();}
  function dirty(){s.dirty=true;find('form').dataset.dirty='true';invalidate();controls();}
  function setValue(field,value){s.values[field.key]=value;if(value===field.default)delete s.values[field.key];dirty();}
  function imageValue(field){try{return JSON.parse(s.values[field.key]??field.default);}catch{return JSON.parse(field.default);}}
  function savedInfo(){const format=v=>v?.toDate?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(v.toDate()):'';find('saved').textContent=[s.draftTime?'Draft: '+format(s.draftTime):'Using the original website content',s.publicTime?'Published changes: '+format(s.publicTime):'No published changes to this section'].join(' · ');}
  function draw(){
    find('fields').replaceChildren();find('heading').textContent=s.group.label;find('open').href=s.page.url;savedInfo();
    for(const [index,field] of s.group.fields.entries()){
      const card=element('div',undefined,'website-field'),title=element('h4',(index+1)+'. '+field.label),id='site-'+field.key;card.append(title);
      const label=(text,input)=>{const l=element('label',text);l.htmlFor=input.id;card.append(l,input);};
      if(field.kind==='text'){
        const input=element('textarea');input.id=id;input.rows=field.default.length>400?7:3;input.maxLength=8000;input.value=s.values[field.key]??field.default;input.setAttribute('aria-label',field.label);input.addEventListener('input',()=>{setValue(field,input.value);},options);card.append(input);
      }else if(field.kind==='link'){
        const value=JSON.parse(s.values[field.key]??field.default),text=element('input'),url=element('input');text.id=id+'-label';text.maxLength=180;text.value=value.text;url.id=id+'-url';url.maxLength=1200;url.value=value.href;
        const change=()=>setValue(field,JSON.stringify({text:text.value,href:url.value}));text.addEventListener('input',change,options);url.addEventListener('input',change,options);label('Link label',text);label('Website address or local page link',url);
      }else if(field.kind==='image'){
        const value=imageValue(field),image=element('img');image.src=safeSiteImage(value.src)||s.media[value.src]?.dataUrl||JSON.parse(field.default).src;image.alt=value.alt;image.loading='lazy';card.append(image);
        const select=element('select');select.id=id+'-library';const choices=new Map(s.page.groups.flatMap(g=>g.fields.filter(f=>f.kind==='image').map(f=>{const v=JSON.parse(f.default);return[v.src,v.alt||v.src.split('/').at(-1)];})));if(photoId(value.src))choices.set(value.src,'Uploaded photograph');for(const [src,name] of choices)select.add(new Option(name,src));select.value=value.src;
        const description=element('input');description.id=id+'-alt';description.maxLength=180;description.value=value.alt;
        const crop=element('select');crop.id=id+'-crop';for(const [key,name] of [['center','Centre'],['top','Top'],['bottom','Bottom']])crop.add(new Option(name,key));crop.value=value.position;
        const change=()=>{const next={src:select.value,alt:description.value,position:crop.value};setValue(field,JSON.stringify(next));image.src=safeSiteImage(next.src)||s.media[next.src]?.dataUrl||'';image.alt=next.alt;image.style.objectPosition=next.position;};
        select.addEventListener('change',change,options);description.addEventListener('input',change,options);crop.addEventListener('change',change,options);label('Use a photograph already on this page',select);
        const upload=element('input');upload.id=id+'-upload';upload.type='file';upload.accept='image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif';label('Or upload your own photograph',upload);
        upload.addEventListener('change',async()=>{const file=upload.files[0];if(!file)return;const section=s.group.id,run=s.load;s.busy=true;controls();say('Preparing your photo on this device…');try{const photo=await preparePhoto(file);if(!current()||s.load!==run||s.group.id!==section)return;const photoKey=newId('photo');s.media[photoKey]={...photo,sectionId:section,saved:false};select.add(new Option('New uploaded photograph',photoKey));select.value=photoKey;change();say('Photo prepared. Save your draft to keep it on your other devices.');}catch(error){say(error.message,true);}finally{if(current()&&s.load===run){s.busy=false;controls();upload.value='';}}},options);
        card.append(element('p','Photos are resized on this device. The original file and its location metadata are not uploaded. JPEG, PNG and WebP work in most browsers.','field-help'));label('Description of this photograph',description);label('Keep this part visible when cropped',crop);
      }
      const reset=element('button','Restore original field','text-button');reset.type='button';reset.addEventListener('click',()=>{delete s.values[field.key];dirty();draw();controls();},options);card.append(reset);find('fields').append(card);
    }
  }
  async function leave(){return !s.dirty||await confirmOwnerAction('This section has unsaved edits. Download a backup or save your draft before switching. Discard the unsaved edits?',options);}
  async function openSection(id){
    invalidate();const run=++s.load;s.ready=false;s.group=s.page.groups.find(g=>g.id===id);s.values={};s.media={};s.dirty=false;find('form').dataset.dirty='';controls();say('Opening the saved section…');
    try{const [draft,published]=await Promise.all([getDoc(ref('drafts',id)),getDoc(ref('published',id))]);if(!current()||run!==s.load)return;
      s.revision=draft.data()?.revision||0;s.publishedRevision=published.data()?.revision||0;s.draftTime=draft.data()?.updatedAt;s.publicTime=published.data()?.updatedAt;s.values=validateSiteValues(s.group,draft.data()?.values||{});
      for(const photoKey of referencedSitePhotos(s.values)){const photo=await getDoc(ref('media',photoKey));if(!current()||run!==s.load)return;if(photo.exists()&&photo.data().sectionId===id)s.media[photoKey]={...photo.data(),saved:true};}
      s.ready=true;find('retry').hidden=true;try{sessionStorage.setItem('dainyel.website-editor.selection',JSON.stringify({pageId:s.page.id,sectionId:id}));}catch{}draw();say('Connected to '+(siteSpace==='staging'?'the test website':'your website')+'. Drafts are private. Publishing sends no email.');
    }catch(error){if(current()&&run===s.load){find('fields').replaceChildren();find('retry').hidden=false;say('Could not open this section. Check your connection and owner sign-in, then choose Reconnect.',true);}}
    finally{if(current()&&run===s.load)controls();}
  }
  async function openPage(id,preferred){const run=++s.load;s.ready=false;controls();try{if(!s.catalogues.has(id))s.catalogues.set(id,await json('/data/website-editor/'+id+'.json'));if(!current()||run!==s.load)return;s.page=s.catalogues.get(id);find('section').replaceChildren(...s.page.groups.map(g=>new Option(g.label+' · '+g.fields.length+' fields',g.id)));const selected=s.page.groups.some(g=>g.id===preferred)?preferred:s.page.groups[0].id;find('section').value=selected;await openSection(selected);}catch(error){say(error.message,true);if(current())controls();}}
  async function store(action){
    if(!s.ready||s.busy)return;if(!navigator.onLine){say('You are offline. Download a backup, then reconnect before saving.',true);return;}
    let values;try{values=action==='restore'?{}:validateSiteValues(s.group,s.values);}catch(error){say(error.message,true);return;}
    if(action==='publish'&&(!s.reviewed||!find('consent').checked))return;
    if(action==='publish'&&!await confirmOwnerAction('Publish the reviewed '+s.group.label+' section on '+(siteSpace==='staging'?'the test website':'your website')+'? This sends no email.',options))return;
    if(action==='restore'&&!await confirmOwnerAction('Restore the original website section for '+s.group.label+'? Visitors will see its original text and photos. Your private draft remains.',options))return;
    const id=s.group.id,revision=s.revision,publicRevision=s.publishedRevision;s.busy=true;controls();say(action==='restore'?'Restoring the original website section…':action==='publish'?'Publishing this section…':'Saving your private draft…');
    s.timer=setTimeout(()=>say('Storage has not confirmed yet. Keep this page open and download a backup if needed. Do not repeat the change on another device.',true),12000);
    try{
      const photoIds=referencedSitePhotos(values);
      if(action!=='restore'){
        const batch=writeBatch(db);let count=0;for(const key of photoIds){const photo=s.media[key];if(!photo)throw Error('A photograph is missing. Choose the photo again.');if(!photo.saved){batch.set(ref('media',key),{version:1,sectionId:id,dataUrl:photo.dataUrl,alt:photo.alt,width:photo.width,height:photo.height,createdAt:serverTimestamp()});count++;}}
        if(count){await batch.commit();if(!current())return;for(const key of photoIds)s.media[key].saved=true;}
      }
      await runTransaction(db,async tx=>{
        const draft=await tx.get(ref('drafts',id)),published=await tx.get(ref('published',id));if(!current())throw Error('Sign in again before saving.');
        if(action==='restore'){if((published.data()?.revision||0)!==publicRevision)throw Error('This section changed on another device. Reopen the saved section before restoring.');if(published.exists())tx.delete(ref('published',id));tx.delete(ref('search',id));return;}
        if((draft.data()?.revision||0)!==revision)throw Error('This section changed on another device. Download your edits, then reopen the saved section.');
        const content={version:1,pageId:s.page.id,values,photoIds,revision:revision+1,updatedAt:serverTimestamp()};
        tx.set(ref('drafts',id),{...content,createdAt:draft.exists()?draft.data().createdAt:serverTimestamp()});
        if(action==='publish'){
          tx.set(ref('published',id),{...content,publishedAt:published.exists()?published.data().publishedAt:serverTimestamp()});
          const text=s.group.fields.filter(f=>f.kind==='text').map(f=>values[f.key]??f.default).join(' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*#]/g,'').slice(0,12000);
          tx.set(ref('search',id),{version:1,pageId:s.page.id,text,updatedAt:serverTimestamp()});
        }
      });
      if(!current())return;if(action!=='restore'){s.revision++;s.values=values;s.dirty=false;find('form').dataset.dirty='';s.draftTime={toDate:()=>new Date()};}if(action==='publish'){s.publishedRevision=s.revision;s.publicTime={toDate:()=>new Date()};}if(action==='restore'){s.publishedRevision=0;s.publicTime=null;}
      invalidate();savedInfo();say(action==='restore'?'Original website section restored. Your private draft is still available.':action==='publish'?'This section is published on '+(siteSpace==='staging'?'the test website':'your website')+'. No email was sent.':'Private draft saved. Visitors still see the previously published section.');
    }catch(error){say(error.code?'Storage did not confirm this change. Reopen this section before retrying; download your edits first.':error.message,true);}
    finally{if(current()){s.busy=false;clearTimeout(s.timer);controls();}}
  }
  function download(){if(!s.group)return;const media=Object.fromEntries(referencedSitePhotos(s.values).filter(key=>s.media[key]).map(key=>[key,s.media[key]]));const blob=new Blob([JSON.stringify({type:'dainyel-website-section',version:1,pageId:s.page.id,sectionId:s.group.id,values:s.values,media},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=element('a');a.href=url;a.download='website-'+s.group.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  find('page').addEventListener('change',async()=>{const id=find('page').value;if(await leave())openPage(id);else find('page').value=s.page.id;},options);
  find('section').addEventListener('change',async()=>{const id=find('section').value;if(await leave())openSection(id);else find('section').value=s.group.id;},options);
  find('save').addEventListener('click',()=>store('save'),options);find('publish').addEventListener('click',()=>store('publish'),options);find('restore').addEventListener('click',()=>store('restore'),options);find('export').addEventListener('click',download,options);find('consent').addEventListener('change',controls,options);
  find('retry').addEventListener('click',()=>s.group?openSection(s.group.id):openPage(find('page').value),options);
  find('form').addEventListener('submit',event=>{
    event.preventDefault();if(!s.ready||s.busy)return;try{s.previewValues=validateSiteValues(s.group,s.values);}catch(error){say(error.message,true);return;}
    s.reviewed=false;find('consent').checked=false;find('preview-label').textContent=s.page.title+' · '+s.group.label;find('preview-status').textContent='Opening your actual page layout…';find('frame').src=s.page.url+'?website-preview=1';find('dialog').showModal();s.previewTimer=setTimeout(()=>{if(current()&&!s.reviewed)find('preview-status').textContent='Preview has not connected. Close it, check your connection and try again.';},15000);controls();
  },options);
  window.addEventListener('message',event=>{if(!current()||event.origin!==location.origin||event.source!==find('frame').contentWindow||event.data?.type!=='website:preview-ready'||!find('dialog').open)return;find('frame').contentWindow.postMessage({type:'website:preview',id:s.group.id,values:s.previewValues,media:s.media},location.origin);s.reviewed=true;clearTimeout(s.previewTimer);find('preview-status').textContent='Preview only. Links and forms are inactive. Check the section, then close this preview to publish.';controls();},options);
  find('phone').addEventListener('click',()=>{const phone=find('dialog').dataset.phone!=='true';find('dialog').dataset.phone=String(phone);find('phone').setAttribute('aria-pressed',String(phone));find('phone').textContent=phone?'Desktop view':'Phone view';},options);
  find('close').addEventListener('click',()=>find('dialog').close(),options);
  find('import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>3*1024*1024)throw Error('Choose a section backup smaller than 3 MB.');const backup=JSON.parse(await file.text());if(backup.type!=='dainyel-website-section'||backup.version!==1||backup.sectionId!==s.group.id||backup.pageId!==s.page.id)throw Error('Open the page and section named in this backup first.');const values=validateSiteValues(s.group,backup.values),media={};for(const old of referencedSitePhotos(values)){const photo=backup.media?.[old];if(!photo||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo.dataUrl)||photo.dataUrl.length>192000||!Number.isInteger(photo.width)||photo.width<1||photo.width>1600||!Number.isInteger(photo.height)||photo.height<1||photo.height>1600)throw Error('The backup contains an invalid photograph.');const fresh=newId('photo');media[fresh]={...photo,alt:'Photograph from this page',sectionId:s.group.id,saved:false};for(const field of s.group.fields.filter(f=>f.kind==='image'))if(values[field.key]){const value=JSON.parse(values[field.key]);if(value.src===old){value.src=fresh;values[field.key]=JSON.stringify(value);}}}if(!await leave())return;s.values=values;s.media={...s.media,...media};dirty();draw();controls();say('Backup restored as unsaved edits. Review, save and preview before publishing.');}catch(error){say(error.message,true);}finally{event.target.value='';}},options);
  window.addEventListener('beforeunload',event=>{if(s.dirty||s.busy){event.preventDefault();event.returnValue='';}},options);
  try{const index=await json('/data/website-editor/catalog.json');if(!current())return;find('page').replaceChildren(...index.pages.map(page=>new Option(page.title+' · '+page.groups+(page.groups===1?' section':' sections'),page.id)));let last;try{last=JSON.parse(sessionStorage.getItem('dainyel.website-editor.selection'));}catch{}const selected=index.pages.some(page=>page.id===last?.pageId)?last.pageId:index.pages[0].id;find('page').value=selected;await openPage(selected,last?.sectionId);}catch(error){say(error.message,true);}
}
