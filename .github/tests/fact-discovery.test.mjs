import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedFacts,publishedTips,factTitle,readingPlan} from '../../assets/fact-discovery-model.js';
import {catalogEntry} from '../../assets/published-catalog.js';
import {linkPublishedDestinations} from '../../assets/content-destinations.js';
import {renderEntries} from '../tools/render-public-entries.mjs';
import {initFactList} from '../../assets/fact-list.js';
import {readingAction} from '../../assets/reading-labels.js';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const now=Date.now(),old=new Date(now-3600000).toISOString(),recent=new Date(now-60000).toISOString();
const entry=(n,kind='fact',place='Lima, Peru',publishedAt=recent)=>({id:'entry-'+n.toString(16).padStart(32,'0'),version:1,kind,title:'Did you know? A sourced discovery '+n,excerpt:'A checked introduction for this isolated fixture.',place,publishedAt,updatedAt:publishedAt});

test('tips have their own public discovery and never replace facts, Field Notes or country narratives',()=>{
 const tip=entry(21,'tip'),future=entry(22,'tip','Peru',new Date(now+60000).toISOString()),fact=entry(23),story=entry(24,'blog','Lima, Peru',old);
 const rows=[tip,tip,future,fact,story];
 assert.deepEqual(publishedTips(rows,{now}).map(e=>e.id),[tip.id]);
 assert.deepEqual(publishedFacts(rows,{now}).map(e=>e.id),[fact.id]);
 assert.equal(publishedTips(rows,{country:'CW',now}).length,0);
 assert.equal(publishedTips([entry(25,'tip','')],{now})[0].country,'');
 const places=linkPublishedDestinations([{id:'peru',name:'Peru'},{id:'spain',name:'Spain'}],rows);
 assert.equal(places[0].tips.length,2); // Caller catalogues are normally unique; no destination is added.
 assert.equal(places[0].storyHref,'/entry/'+story.id);assert.equal(places[0].facts[0].id,fact.id);assert.equal(places[1].tips.length,0);
 assert.equal(readingPlan([{kind:'tip',id:'tip'}, {kind:'field-note',id:'note'}],'notes').visible[0].id,'note');
 const e={...tip,title:'An actual travel tip',body:'A practical **packing lesson**.',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],photos:[]};
 const result=renderEntries({space:'staging',generatedAt:recent,entries:[e],summaries:[e]},'<html><head></head><body><main></main></body></html>');
 assert.match(result.tips,/Read tip/);assert.equal(result.tipCount,1);assert.match(result.homeTip,/fact-card--compact/);
 assert.equal(result.cards,'');assert.equal(result.facts,'');assert.match(result.pages[e.id],/Explore all travel tips/);assert.match(result.pages[e.id],/\/travel-tips/);
});
test('facts are published-only, newest-first, unique and grouped by explicit country',()=>{
 const pe=entry(1),cw=entry(2,'fact','Curaçao, Caribbean',old);
 const rows=[cw,pe,pe,entry(3,'field-note'),entry(4,'fact','Cusco, Peru',new Date(now+60000).toISOString()),{...entry(5),id:'draft-private'}];
 assert.deepEqual(publishedFacts(rows,{now}).map(e=>e.id),[pe.id,cw.id]);
 assert.deepEqual(publishedFacts(rows,{country:'PE',now}).map(e=>e.id),[pe.id]);
 assert.equal(publishedFacts(rows,{country:'unknown',now}).length,0);
 assert.equal(factTitle(pe.title),'A sourced discovery 1');
});
test('public card images cannot carry external or private media paths',()=>{
 const e=entry(1);
 for(const src of ['https://example.invalid/photo.webp','/private/photo.webp','javascript:alert(1)'])assert.equal(catalogEntry({...e,coverPhoto:{src,alt:'Image'}}).coverPhoto,undefined);
 assert.deepEqual(catalogEntry({...e,secret:'private',coverPhoto:{src:'/assets/public-content/'+'a'.repeat(64)+'.webp',alt:'A real scene'}}).coverPhoto,{src:'/assets/public-content/'+'a'.repeat(64)+'.webp',alt:'A real scene'});
 assert.equal('secret'in catalogEntry({...e,secret:'private'}),false);
});
test('Field Notes stay separate and one discovery sits after two newest travel stories',()=>{
 const rows=[{kind:'fact',time:8,id:'f1'},{kind:'blog',time:3,id:'b1'},{kind:'blog',time:7,id:'b2'},{kind:'blog',time:4,id:'b3'},{kind:'fact',time:2,id:'f2'},{kind:'field-note',time:9,id:'n1'}];
 assert.deepEqual(readingPlan(rows,'blog').visible.map(r=>r.id),['b2','b3','f1','b1']);
 assert.deepEqual(readingPlan(rows,'notes').visible.map(r=>r.id),['n1']);
 assert.equal(new Set(readingPlan(rows,'blog').ordered).size,rows.length);
 assert.equal(readingPlan([{kind:'fact',id:'f'}],'blog').visible.length,1);
});
test('country facts supplement their narrative and never replace it or add a destination',()=>{
 const story=entry(1,'blog','Curaçao, Caribbean',old),fact=entry(2,'fact','Curaçao, Caribbean'),pe=entry(3);
 const result=linkPublishedDestinations([{name:'Curaçao',id:'curacao'},{name:'Spain',id:'spain',storyHref:'/existing'}],[fact,story,pe]);
 assert.equal(result.length,2);assert.equal(result[0].storyHref,'/entry/'+story.id);assert.equal(result[0].facts[0].id,fact.id);assert.equal(result[0].countryCode,'CW');assert.equal(result[1].facts.length,0);assert.equal(result[1].storyHref,'/existing');
 assert.equal(linkPublishedDestinations([{name:'Peru',id:'peru'}],[pe])[0].storyHref,undefined);
});
test('facts retain their canonical article and get separate crawlable hub/home cards',()=>{
 const e={...entry(1),body:'Opening with **a detail**.\n\n## A closer look\nSource-backed context.',sources:'https://example.invalid/source',videoUrl:'',photoIds:[],photoPlacements:[],heroPhotoId:'',heroLayout:'split',heroPosition:'center',storyLabel:'Did you know?',tripPeriod:'',photos:[]};
 const output=renderEntries({space:'staging',generatedAt:recent,entries:[e],summaries:[e]},'<html><head></head><body><main></main></body></html>');
 assert.match(output.facts,new RegExp('/entry/'+e.id));assert.match(output.homeFact,/fact-card--compact/);assert.equal(output.factCount,1);
 assert.match(output.cards,/data-cms-card hidden data-reading-kind="fact"/);
 assert.match(output.pages[e.id],/Explore all travel facts/);assert.match(output.pages[e.id],/\/did-you-know/);assert.match(output.pages[e.id],/\/atlas\?place=peru#map/);
 assert.equal(renderEntries({space:'staging',generatedAt:recent,entries:[],summaries:[]},'').factCount,0);
 const story={...e,id:'entry-'+'b'.repeat(32),kind:'blog',title:'A full journey',publishedAt:old};
 const independent=renderEntries({space:'staging',generatedAt:recent,entries:[e,story],summaries:[e,story]},'');
 assert.match(independent.homeStory,new RegExp('/entry/'+story.id));assert.equal(independent.storyCount,1);
 assert.match(independent.homeFact,new RegExp('/entry/'+e.id));
});

function factListFixture(){
 const control=()=>({hidden:false,listeners:{},children:[],addEventListener(type,fn){this.listeners[type]=fn;},replaceChildren(...items){this.children=items;}});
 const select=control(),list=control(),status=control(),more=control(),filters=control();
 list.children=Array.from({length:13},(_,i)=>({dataset:{factCountry:i<8?'PE':'CW',factCountryName:i<8?'Peru':'Curaçao'},focus(){this.focused=true;}}));
 const root={querySelector:selector=>({'[data-fact-filter]':select,'[data-facts-list]':list,'[data-facts-status]':status,'[data-facts-more]':more,'[data-fact-filters]':filters})[selector]};
 let url=new URL('https://example.invalid/did-you-know?utm_source=fixture#facts-title');
 const api=initFactList(root,{getUrl:()=>new URL(url),replaceUrl:next=>url=next});return {api,select,list,status,more,filters,url:()=>url,setUrl:href=>url=new URL(href)};
}
test('six-card batches reveal every fact once and move keyboard focus to the newly exposed cards',()=>{
 const previous=globalThis.Option;globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
 try{const f=factListFixture();f.api.refresh();assert.equal(f.list.children.filter(c=>!c.hidden).length,6);assert.match(f.status.textContent,/6 of 13/);assert.equal(f.more.hidden,false);
 f.more.listeners.click();assert.equal(f.list.children.filter(c=>!c.hidden).length,12);assert.equal(f.list.children[6].focused,true);
 f.more.listeners.click();assert.equal(f.list.children.filter(c=>!c.hidden).length,13);assert.equal(f.more.hidden,true);assert.equal(f.list.children[12].focused,true);
 }finally{globalThis.Option=previous;}
});
test('country changes reset the batch, preserve the rest of the URL, and browser-back restores its filter',()=>{
 const previous=globalThis.Option;globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
 try{const f=factListFixture();f.api.refresh();f.more.listeners.click();f.select.value='CW';f.select.listeners.change();assert.equal(f.list.children.filter(c=>!c.hidden).length,5);assert.match(f.status.textContent,/5 of 5 discoveries from Curaçao/);assert.equal(f.more.hidden,true);assert.equal(f.url().searchParams.get('country'),'CW');assert.equal(f.url().searchParams.get('utm_source'),'fixture');assert.equal(f.url().hash,'#facts-title');
 f.setUrl('https://example.invalid/did-you-know?country=PE');f.api.refresh({reset:true,fromUrl:true});assert.equal(f.list.children.filter(c=>!c.hidden).length,6);assert.match(f.status.textContent,/6 of 8 discoveries from Peru/);assert.equal(f.more.hidden,false);
 f.list.replaceChildren();f.api.refresh({reset:true});assert.equal(f.more.hidden,true);assert.equal(f.filters.hidden,true);assert.match(f.status.textContent,/when published/);
 }finally{globalThis.Option=previous;}
});
test('server and live reading actions use the content type without changing the publication or URL',()=>{
 for(const [kind,label] of [['blog','Read story →'],['field-note','Read Field Note →'],['fact','Read fact →']]){
  const e={...entry(1,kind),body:'An isolated public fixture.',sources:'',videoUrl:'',photoIds:[],photoPlacements:[],photos:[]};const output=renderEntries({space:'staging',generatedAt:recent,entries:[e],summaries:[e]},'');
  assert.equal(readingAction(kind),label);assert.ok(output.cards.includes('<span>'+label+'</span>'));assert.ok(output.cards.includes('/entry/'+e.id));
 }
});
test('fact expiration clears pagination too, and a late request cannot revive a page after leaving it',async()=>{
 const source=await readFile(new URL('../../assets/fact-discovery.js',import.meta.url),'utf8');let now=Date.now(),resolve,rendered=0,cleared=0;
 const initial=new Date(now-1000).toISOString(),events={},windowEvents={},status={textContent:''},list={replaceChildren(){rendered++;}},root={dataset:{factGeneratedAt:initial},querySelector:selector=>selector==='[data-facts-list]'?list:status};
 const pending=new Promise(done=>resolve=done);class Clock extends Date{static now(){return now;}}
 const context={Date:Clock,document:{querySelector:selector=>selector==='[data-facts-hub]'?root:null,addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>windowEvents[name]=fn},readPublishedCatalog:()=>pending,catalogFresh:v=>now-Date.parse(v.generatedAt)<86400000,initFactList:()=>({refresh(){},clear(){cleared++;}}),publishedFacts:()=>[],factCard:()=>{},setTimeout:()=>1,clearTimeout:()=>{}};
 vm.createContext(context);vm.runInContext(source.replace(/^import .*;\r?\n/gm,''),context);now+=86400000;events.visibilitychange();assert.equal(cleared,1);assert.match(status.textContent,/temporarily unavailable/);
 windowEvents.pagehide();resolve({generatedAt:new Date(now).toISOString(),entries:[]});for(let i=0;i<8;i++)await Promise.resolve();assert.equal(rendered,0);
});

