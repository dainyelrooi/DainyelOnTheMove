export const mailFields=['subject','previewText','headline','body','ctaText','ctaUrl','imageUrl'];
export const blankMail=()=>({subject:'',previewText:'',headline:'',body:'',ctaText:'Read the story →',ctaUrl:'https://dainyelonthemove.com/stories',imageUrl:''});
export function publicMailUrl(value){try{const url=new URL(value);return url.origin==='https://dainyelonthemove.com'&&!url.search&&!url.hash&&!url.username&&!url.password&&/^\/(?:entry\/entry-[a-f0-9]{32}|[a-z0-9-]*)$/.test(url.pathname)&&!/^\/(?:admin|studio|search|postcards-form)(?:$|\/)/.test(url.pathname);}catch{return false;}}
export function postcardImageUrl(value,space){
  if(/^https:\/\/dainyelonthemove[.]com\/assets\/[a-zA-Z0-9/_-]+[.](?:webp|jpg|jpeg|png)$/.test(value))return true;
  const match=/^https:\/\/dotm-inbox-(staging|production)[.]dainyelr[.]workers[.]dev\/postcard-images\/[a-f0-9]{64}[.]jpg$/.exec(value);
  return !!match&&(!space||match[1]===space);
}

// Convert share links to the single video URL accepted by the mail queue.
function youtubeVideoUrl(value){
  let url;
  try{url=new URL(value);}catch{return '';}
  if(url.protocol!=='https:'||url.port||url.username||url.password)return '';
  let id;
  if(url.hostname==='youtu.be')id=/^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  else if(['www.youtube.com','youtube.com','m.youtube.com'].includes(url.hostname)){
    if(url.pathname==='/watch'&&url.searchParams.getAll('v').length===1)id=url.searchParams.get('v');
    else id=/^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1];
  }
  if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))return '';
  const time=url.searchParams.get('t')||'';
  return 'https://www.youtube.com/watch?v='+id+(/^[0-9hms]{1,24}$/.test(time)?'&t='+time:'');
}

export function validateMail(value,{complete=true}={}){
  for(const [key,min,max] of [['subject',1,140],['previewText',0,200],['headline',1,160],['body',10,12000],['ctaText',1,80],['ctaUrl',1,250],['imageUrl',0,500]]){
    if(typeof value[key]!=='string'||value[key].length>max||value[key].trim().length<(complete?min:0))throw Error('Check the '+key+' field.');
  }
  const youtube=youtubeVideoUrl(value.ctaUrl);
  if(complete&&!youtube&&!publicMailUrl(value.ctaUrl))throw Error('Use a public page on dainyelonthemove.com or a direct YouTube video link.');
  if(value.imageUrl&&!postcardImageUrl(value.imageUrl))throw Error('Upload a photo here, use an existing public website image URL or leave the field empty.');
  return youtube?{...value,ctaUrl:youtube}:value;
}
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// Keep the supported syntax in sync with postcard-delivery.py. Escape all
// input, then add only the markup produced by these two supported forms.
const inlineFormat=/(?<!\*)\*\*([^*\r\n]+)\*\*(?!\*)|\[([^\[\]\r\n]+)\]\((https:\/\/[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+(?:[/?#][^\s<>"'()[\]\\{}]*)?)\)/g;
function formatParagraph(text){
  let output='',offset=0;
  for(const match of text.matchAll(inlineFormat)){
    const [raw,bold,label,url]=match;
    output+=escape(text.slice(offset,match.index)).replaceAll('\n','<br>');
    if(bold?.trim())output+='<strong>'+escape(bold.trim())+'</strong>';
    else if(url&&label.trim())output+='<a href="'+escape(url)+'" style="color:#133c43;text-decoration:underline">'+escape(label)+'</a>';
    else output+=escape(raw);
    offset=match.index+raw.length;
  }
  return output+escape(text.slice(offset)).replaceAll('\n','<br>');
}
let source;
export async function mailHtml(value){value=validateMail(value);source??=fetch('/assets/postcard-email-template.html').then(r=>{if(!r.ok)throw Error('Email template unavailable');return r.text();});const template=await source,parts={SUBJECT:escape(value.subject),PREVIEW:escape(value.previewText),HEADLINE:escape(value.headline),BODY:value.body.split(/\n\s*\n/).map(p=>'<p style="margin:0 0 18px">'+formatParagraph(p)+'</p>').join(''),URL:escape(value.ctaUrl),CTA:escape(value.ctaText),IMAGE:value.imageUrl?'<tr><td><img src="'+escape(value.imageUrl)+'" alt="" width="600" style="width:100%;max-width:600px;height:auto;display:block"></td></tr>':''};return template.replace(/%%(SUBJECT|PREVIEW|HEADLINE|BODY|URL|CTA|IMAGE)%%/g,(_,key)=>parts[key]);}
