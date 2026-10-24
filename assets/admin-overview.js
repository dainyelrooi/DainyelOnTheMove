import {collection,doc,getDocFromServer,query,orderBy,startAfter,limit,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import {db} from '../js/firebase.js';
import {space,element,normaliseEntry,presentationFields} from './publishing-model.js';
import {mailFields} from './postcard-model.js';
const root=document.querySelector('[data-management]'),ui=key=>root?.querySelector('[data-management-'+key+']');let active;
const families={entries:['cmsSpaces','drafts'],pages:['websiteSpaces','drafts'],mail:['cmsSpaces','mailDrafts']};
const when=value=>value?.toDate?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Amsterdam',dateStyle:'medium',timeStyle:'short'}).format(value.toDate()):'Date unavailable';
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function equal(a,b,fields){return fields.every(key=>JSON.stringify(stable(a[key]??null))===JSON.stringify(stable(b[key]??null)));}
export function clearAdminOverview(){if(active){active.stop?.();active.stopBackup?.();active.observer?.disconnect();clearTimeout(active.deadline);active.abort.abort();}active=null;if(!root)return;ui('list').replaceChildren();ui('counts').replaceChildren();ui('status').textContent='Sign in to view your private overview.';document.querySelector('[data-management-backup]').textContent='Sign in to view private backup status.';}
export function initAdminOverview(){
  clearAdminOverview();if(!root)return;const s={abort:new AbortController(),run:0,rows:[],catalogues:new Map()};active=s;const options={signal:s.abort.signal},current=()=>active===s;
  function draw(){
    if(!current())return;ui('list').replaceChildren();ui('counts').replaceChildren();const counts={draft:0,changed:0,published:0,unknown:0};for(const row of s.rows)counts[row.state]=(counts[row.state]||0)+1;
    if(s.kind==='mail')ui('counts').append(element('span',s.rows.length+' email drafts · delivery checked separately'));
    else for(const [key,label] of [['draft','Private'],['original','Original page content'],['changed','Changes to publish'],['published','Published matches'],['unknown','Status unavailable']])if(counts[key])ui('counts').append(element('span',counts[key]+' · '+label));
    const filter=ui('filter').value;let shown=0;
    for(const row of s.rows){if(s.kind!=='mail'&&filter!=='all'&&row.state!==filter)continue;shown++;const card=element('article',undefined,'management-card'),text=element('div'),pill=element('span',row.label,'management-status'),open=element('button','Open & edit','secondary-button');pill.dataset.tone=row.state;open.type='button';
      text.append(element('h4',row.title),pill,element('p','Last saved: '+when(row.data.updatedAt)));
      text.append(element('p',row.detail));card.append(text,open);ui('list').append(card);if(row.missingSection){open.disabled=true;open.textContent=row.state==='unknown'?'Reconnect first':'Section reorganised';if(row.state!=='unknown')text.append(element('p','This section belongs to an earlier page layout. Use the current Website editor; keep its backup for a reviewed migration.'));}
      open.addEventListener('click',()=>{if(s.kind==='entries'){location.hash='admin-create';window.dispatchEvent(new CustomEvent('site:open-entry',{detail:{id:row.id}}));}else if(s.kind==='pages'){location.hash='admin-website';window.dispatchEvent(new CustomEvent('site:open-website-section',{detail:{pageId:row.data.pageId,sectionId:row.id}}));}else{location.hash='admin-postcards';window.dispatchEvent(new CustomEvent('site:open-postcard',{detail:{id:row.id}}));}},options);
    }
    if(!shown)ui('list').append(element('p','No saved items match this view.','field-help'));
  }
  async function pageLabel(data,id){const page=data.pageId;if(!s.catalogues.has(page)){const response=await fetch('/data/website-editor/'+page+'.json',{cache:'no-cache'});if(!response.ok)throw Error('Page catalogue unavailable');s.catalogues.set(page,await response.json());}const catalogue=s.catalogues.get(page),group=catalogue.groups.find(g=>g.id===id);return {title:catalogue.title+' · '+(group?.label||'Earlier page section'),missingSection:!group};}
  function subscribe(){
    s.stop?.();clearTimeout(s.deadline);if(document.getElementById('admin-overview').hidden)return;const kind=ui('kind').value;s.kind=kind;s.rows=[];ui('list').replaceChildren();ui('counts').replaceChildren();ui('older').hidden=true;const run=++s.run;ui('status').textContent='Checking your saved drafts and actual publication status…';ui('filter').disabled=kind==='mail';s.deadline=setTimeout(()=>{if(current()&&run===s.run)ui('status').textContent='Storage has not responded yet. Check your connection and choose Refresh overview.';},12000);
    const [family,collectionId]=families[kind];
    // Owner edits on another device must update the open overview. Limit reads
    // to this workspace/page and stop the live query when it is hidden.
    s.stop=onSnapshot(query(collection(db,family,space,collectionId),orderBy('updatedAt','desc'),...(s.cursor?[startAfter(s.cursor)]:[]),limit(25)),{includeMetadataChanges:true},async snapshot=>{
      if(!current()||run!==s.run||snapshot.metadata.fromCache)return;const snapshotRun=s.snapshotRun=(s.snapshotRun||0)+1;
      const rows=await Promise.all(snapshot.docs.map(async item=>{
        const data=item.data(),row={id:item.id,data,title:data.title||data.subject||'Untitled draft',state:'unknown',label:'Status unavailable',detail:'Reconnect and refresh before acting.',missingSection:kind==='pages'};
        try{
          const target=await getDocFromServer(doc(db,family,space,kind==='mail'?'mailJobs':'published',item.id));
          if(kind==='mail'){
            const job=target.data(),labels={queued:'Queued — not sent',processing:'Processing — check Brevo',scheduled:'Scheduled in Brevo',accepted:'Accepted by Brevo',sent:'Brevo reports sent',cancelled:'Delivery cancelled',review:'Delivery needs review'};
            row.state='draft';row.label=job?(labels[job.status]||'Check delivery in Brevo'):'Private email draft — no delivery requested';row.detail=job?'Saved email edits do not change an existing delivery request. Inbox delivery is not confirmed here.':'Website publication is separate. Campaigns created directly in Brevo are not represented by this draft.';
          }else if(!target.exists()){const original=kind==='pages'&&!Object.keys(data.values||{}).length;row.state=original?'original':'draft';row.label=original?'Original page content · no active overrides':kind==='pages'?'Private edits · original page remains online':'Private draft · not published';row.detail='Email is managed separately in Postcards and Brevo.';}
          else{
            const same=kind==='pages'?equal(data,target.data(),['values','photoIds']):equal(normaliseEntry(data),normaliseEntry(target.data()),['kind','title','excerpt','place','body','sources','videoUrl','photoIds','photoPlacements',...presentationFields]);row.state=same?'published':'changed';row.label=same?'Published version matches saved draft':'Saved changes are not published';row.detail='Published: '+when(target.data().updatedAt)+'. Email is managed separately in Postcards and Brevo.';
          }
          if(kind==='pages')Object.assign(row,await pageLabel(data,item.id));
        }catch{row.state='unknown';row.label='Status unavailable';row.detail='The saved publication or page section could not be verified. Reconnect and refresh before acting.';}
        return row;
      }));
      if(!current()||run!==s.run||snapshotRun!==s.snapshotRun)return;clearTimeout(s.deadline);s.rows=rows;s.last=snapshot.docs.at(-1);ui('older').hidden=snapshot.size<25;ui('latest').hidden=!s.cursor;ui('status').textContent='Current page checked against saved storage. '+rows.length+' '+(rows.length===1?'item':'items')+' shown.';draw();
    },()=>{if(current()&&run===s.run){clearTimeout(s.deadline);ui('status').textContent='The private overview could not connect. Your saved items have not been changed.';ui('list').replaceChildren();ui('counts').replaceChildren();}});
  }
  ui('kind').addEventListener('change',()=>{s.cursor=null;subscribe();},options);ui('refresh').addEventListener('click',subscribe,options);ui('filter').addEventListener('change',draw,options);ui('older').addEventListener('click',()=>{s.cursor=s.last;subscribe();},options);ui('latest').addEventListener('click',()=>{s.cursor=null;subscribe();},options);
  const view=document.getElementById('admin-overview');s.observer=new MutationObserver(()=>{if(view.hidden){s.stop?.();clearTimeout(s.deadline);s.run++;}else subscribe();});s.observer.observe(view,{attributes:true,attributeFilter:['hidden']});
  s.stopBackup=onSnapshot(doc(db,'adminOperations',space,'status','backup'),snapshot=>{if(!current())return;const status=document.querySelector('[data-management-backup]');status.textContent=snapshot.exists()?'Last independent backup: '+when(snapshot.data().completedAt)+' · saved writing and photos in OneDrive. Snapshot: '+when(snapshot.data().snapshotAt)+'.':'No independent backup has been confirmed yet. Automatic saved versions are available in each editor.';},()=>{if(current())document.querySelector('[data-management-backup]').textContent='Independent backup status is unavailable. This does not confirm a backup; use Download backup if needed.';});subscribe();
}
