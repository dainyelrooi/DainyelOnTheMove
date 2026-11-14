// Uses the same safe renderer as the editor/website, without a browser or deps.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {renderArticle,kinds,entryContentKey} from '../../assets/publishing-model.js';
import {publishedFacts} from '../../assets/fact-discovery-model.js';
import {factCard} from '../../assets/fact-discovery-view.js';
import {latestTravelStory} from '../../assets/home-latest-model.js';
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const voids=new Set(['img','br','hr','input','meta','link']);
class Node{
  constructor(tag,text){this.tag=tag;this.attrs={};this.children=[];this.value=text;this.style=new Proxy({},{set:(o,k,v)=>{o[k]=v;return true;}});this.dataset=new Proxy({},{set:(o,k,v)=>{this.attrs['data-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())]=v;return true;}});this.classList={add:(...names)=>{this.attrs.class=[this.attrs.class||'',...names].filter(Boolean).join(' ');}};
    return new Proxy(this,{set:(o,k,v)=>{if(['className','id','src','alt','width','height','loading','decoding','href','target','rel','tabIndex'].includes(k))o.attrs[k==='className'?'class':k.toLowerCase()]=v;else o[k]=v;return true;},get:(o,k)=>k==='className'?o.attrs.class:['id','src','alt','width','height','loading','decoding','href','target','rel','tabIndex'].includes(k)?o.attrs[k.toLowerCase()]:o[k]});}
  set textContent(value){this.children=[];this.value=value;}
  append(...nodes){this.value=undefined;this.children.push(...nodes);}
  replaceChildren(...nodes){this.value=undefined;this.children=nodes;}
  setAttribute(key,value){this.attrs[key]=value;}
  toString(){if(!this.tag)return escape(this.value||'');const style=Object.entries(this.style).map(([k,v])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+v).join(';');const attrs={...this.attrs,...(style?{style}:{})};return '<'+this.tag+Object.entries(attrs).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('')+'>'+ (voids.has(this.tag)?'':(this.value===undefined?this.children.map(n=>String(n)).join(''):escape(this.value))+'</'+this.tag+'>');}
}
globalThis.document={createElement:tag=>new Node(tag),createTextNode:text=>new Node(null,text)};
export function renderEntries(cms,template){
  const pages={},cards=[];
  for(const entry of cms.entries){
    if(!/^entry-[a-f0-9]{32}$/.test(entry.id))throw Error('invalid-entry-id');
    const photos=entry.photos.map(p=>({...p,dataUrl:p.src})),root=new Node('div');root.setAttribute('data-published-entry','');root.setAttribute('data-server-entry','');root.setAttribute('data-server-generated-at',cms.generatedAt);
    root.setAttribute('data-server-content-hash',createHash('sha256').update(entryContentKey(entry)).digest('hex'));
    renderArticle(root,entry,photos,{prefix:entry.id});
    const canonical='https://dainyelonthemove.com/entry/'+entry.id,hero=photos.find(p=>p.id===entry.heroPhotoId)||photos[0],image=hero?'https://dainyelonthemove.com'+hero.src:'https://dainyelonthemove.com/assets/optimized/hero-bay-1280.webp';
    let html=template.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,'').replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(entry.title)+' | Dainyel on the Move</title>')
      .replace(/<main\b([^>]*)>[\s\S]*?<\/main>/,(_,attributes)=>'<main'+attributes+'>'+root+'</main>')
      .replace(/<noscript>[\s\S]*?<\/noscript>/g,'')
      .replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g,'')
      .replace(/<link\b[^>]*rel="canonical"[^>]*>/g,'');
    const tags=[['name','description',entry.excerpt],['name','robots',cms.space==='production'?'index,follow,max-image-preview:large':'noindex,nofollow'],['property','og:type','article'],['property','og:title',entry.title],['property','og:description',entry.excerpt],['property','og:url',canonical],['property','og:image',image],['name','twitter:card','summary_large_image'],['name','twitter:title',entry.title],['name','twitter:description',entry.excerpt],['name','twitter:image',image]].map(([a,k,v])=>'<meta '+a+'="'+k+'" content="'+escape(v)+'"/>').join('');
    const json=JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting','@id':canonical,mainEntityOfPage:{'@type':'WebPage','@id':canonical},headline:entry.title,description:entry.excerpt,url:canonical,image,datePublished:entry.publishedAt,dateModified:entry.updatedAt,author:{'@type':'Person',name:'Dainyel'}}).replaceAll('<','\\u003c');
    html=html.replace('</head>',()=>tags+'<link rel="canonical" href="'+canonical+'"/><script type="application/ld+json">'+json+'</script></head>');
    pages[entry.id]='<!-- dotm:public-entry -->\n'+html;
    cards.push('<a class="publishing-card" data-cms-card'+(entry.kind==='fact'?' hidden':'')+' data-reading-kind="'+entry.kind+'" data-published-time="'+Date.parse(entry.publishedAt)+'" href="/entry/'+entry.id+'">'+(hero?'<img loading="lazy" width="640" height="420" src="'+hero.src+'" alt="'+escape(hero.alt)+'"/>':'')+'<small>'+escape([kinds[entry.kind],entry.place].filter(Boolean).join(' · '))+'</small><h3>'+escape(entry.title)+'</h3><p>'+escape(entry.excerpt)+'</p><span>Read the entry →</span></a>');
  }
  const facts=publishedFacts(cms.summaries);
  const story=latestTravelStory(cms.summaries),homeStory=story?'<a class="text-link" href="/entry/'+story.id+'">'+escape(story.title)+' →</a>':'';
  return{pages,cards:cards.join(''),facts:facts.map(e=>String(factCard(e))).join(''),homeFact:facts.slice(0,1).map(e=>String(factCard(e,{compact:true}))).join(''),factCount:facts.length,homeStory,storyCount:story?1:0,catalog:{version:1,space:cms.space,generatedAt:cms.generatedAt,entries:cms.summaries.map(({id,kind,title,excerpt,place,publishedAt,updatedAt,coverPhoto})=>({id,kind,title,excerpt,place,publishedAt,updatedAt,coverPhoto}))}};
}
if(process.argv[1]?.endsWith('render-public-entries.mjs')){const input=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(renderEntries(input.cms,input.template)));}
