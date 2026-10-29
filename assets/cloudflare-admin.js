import {getCloudflareConfig,cloudflareRequest} from './cloudflare-inbox.js';

let session=0,controller;
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const knownItem=item=>item&&/^cf-[a-f0-9]{32}$/.test(item.id)&&['question','thread','reply'].includes(item.kind)&&['pending','published','archived'].includes(item.status)&&Number.isInteger(item.revision)&&item.revision>0;
export function clearCloudflareInbox(){
  ++session;controller?.abort();controller=null;
  const section=document.querySelector('[data-cloudflare-desk]');if(!section)return;section.hidden=true;
  section.querySelector('[data-cloudflare-items]')?.replaceChildren();
}
export async function initCloudflareInbox(user){
  clearCloudflareInbox();const run=session,section=document.querySelector('[data-cloudflare-desk]');if(!section)return;
  const list=section.querySelector('[data-cloudflare-items]'),status=section.querySelector('[data-cloudflare-status]'),filter=section.querySelector('[data-cloudflare-filter]'),refresh=section.querySelector('[data-cloudflare-refresh]'),more=section.querySelector('[data-cloudflare-more]');
  const current=()=>session===run;
  try{if(!await getCloudflareConfig()||!current())return;}catch{if(current()){section.hidden=false;status.textContent='This inbox could not connect. Your existing questions remain in their usual sections below.';}return;}
  section.hidden=false;controller=new AbortController();const signal=controller.signal;
  let cursor=null,loading=false,request=0;const shown=new Set();
  function feedback(message,error=false){status.textContent=message;status.dataset.state=error?'error':'success';}
  async function change(item,next,answer,button){
    if(!current())return;
    if(item.kind==='question'&&next==='published'&&(answer.value.trim().length<2||answer.value.trim().length>3000)){
      answer.setCustomValidity('Write an answer of 2 to 3,000 characters before publishing.');answer.reportValidity();answer.addEventListener('input',()=>answer.setCustomValidity(''),{once:true});return;
    }
    button.disabled=true;feedback('Saving your review…');
    try{
      const body={revision:item.revision,status:next,...(item.kind==='question'&&next==='published'?{answer:answer.value.trim()}:{})};
      const result=await cloudflareRequest('/admin/submissions/'+item.id,{method:'PATCH',body,user,signal});
      if(!current())return;if(!knownItem(result?.item)||result.item.id!==item.id)throw Error();
      feedback(next==='published'?'Published. Visitors can now read this contribution.':next==='archived'?'Archived privately. Choose Archived to bring it back for review.':'Returned to the private review queue.');
      await load(false,true);
    }catch(error){if(!current())return;feedback(error?.code==='cloudflare-http-409'?'This contribution changed in another tab. Refresh before trying again.':'The review could not be confirmed. Refresh to check its saved status before trying again.',true);button.disabled=false;}
  }
  async function remove(item,button){
    if(!current()||item.status!=='archived'||!window.confirm('Permanently delete this archived contribution? Its text cannot be restored. Reference: '+item.id))return;
    button.disabled=true;feedback('Removing the archived contribution…');
    try{
      const result=await cloudflareRequest('/admin/submissions/'+item.id,{method:'DELETE',body:{revision:item.revision},user,signal});
      if(!current())return;if(result?.removed!==true||result.id!==item.id)throw Error();
      feedback('Permanently removed.');await load(false,true);
    }catch{if(current()){feedback('Removal could not be confirmed. Refresh to check before trying again.',true);button.disabled=false;}}
  }
  function card(item){
    const node=make('article',undefined,'pending-card');
    const label=item.kind==='question'?'Ask Dainyel':item.kind==='thread'?'Community question':'Community reply';
    node.append(make('p',label+' · '+item.status.replaceAll('-',' '),'question-meta'),make('h4',item.question||item.message||'Contribution'),make('p',[item.topic?.replaceAll('-',' '),item.displayName].filter(Boolean).join(' · ')));
    if(item.kind==='reply'&&item.parentId)node.append(make('p','Conversation reference: '+item.parentId,'auth-help'));
    if(typeof item.createdAt==='string'&&Number.isFinite(Date.parse(item.createdAt)))node.append(make('p','Received '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Amsterdam'}).format(new Date(item.createdAt))+' · Netherlands time','auth-help'));
    let answer;
    if(item.kind==='question'){
      const field=make('label','Your public answer','field-label');answer=make('textarea');answer.id='cf-answer-'+item.id;answer.className='answer-input';answer.maxLength=3000;answer.value=item.answer||'';field.htmlFor=answer.id;node.append(field,answer);
    }
    const actions=make('div',undefined,'pending-actions');
    function action(text,next,primary=false){const button=make('button',text,primary?'primary-button':'secondary-button');button.type='button';button.addEventListener('click',()=>change(item,next,answer,button),{signal});actions.append(button);}
    if(item.status==='archived'){
      action('Return to review','pending');
      const deletion=make('button','Delete permanently','secondary-button');deletion.type='button';deletion.addEventListener('click',()=>remove(item,deletion),{signal});actions.append(deletion);
    }
    else{
      action(item.status==='published'&&item.kind==='question'?'Save answer changes':item.status==='published'?'Keep published':item.kind==='question'?'Publish answer':'Approve contribution','published',true);
      if(item.status==='published')action('Hide and review','pending');
      action('Archive privately','archived');
    }
    node.append(actions);return node;
  }
  async function load(append=false,keepFeedback=false){
    if(!current())return;const attempt=++request;loading=true;refresh.disabled=true;more.disabled=true;
    if(!keepFeedback)feedback('Loading your independent review inbox…');
    if(!append){cursor=null;shown.clear();list.replaceChildren();more.hidden=true;}
    const query=new URLSearchParams({status:filter.value});if(append&&cursor)query.set('cursor',cursor);
    try{
      const result=await cloudflareRequest('/admin/submissions?'+query,{user,signal});
      if(!current()||attempt!==request)return;
      if(!result||!Array.isArray(result.items)||result.items.length>25||!result.items.every(knownItem)||(result.nextCursor!==null&&(typeof result.nextCursor!=='string'||!/^[A-Za-z0-9_-]{1,2048}$/.test(result.nextCursor))))throw Error();
      for(const item of result.items)if(!shown.has(item.id)){shown.add(item.id);list.append(card(item));}
      cursor=result.nextCursor;more.hidden=!cursor;
      if(!keepFeedback)feedback(shown.size?shown.size+' contributions shown. All new submissions stay private until you approve them.':'No '+filter.value+' contributions in this inbox.');
    }catch{if(current()&&attempt===request)feedback('This inbox could not load. Use Refresh to try again. No contribution has been changed.',true);}
    finally{if(current()&&attempt===request){loading=false;refresh.disabled=false;more.disabled=false;}}
  }
  refresh.addEventListener('click',()=>load(),{signal});filter.addEventListener('change',()=>load(),{signal});more.addEventListener('click',()=>{if(!loading&&cursor)load(true);},{signal});
  await load();
}
