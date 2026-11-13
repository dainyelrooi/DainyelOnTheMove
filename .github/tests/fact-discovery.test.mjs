import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedFacts,factTitle,readingPlan} from '../../assets/fact-discovery-model.js';
import {catalogEntry} from '../../assets/published-catalog.js';
import {linkPublishedDestinations} from '../../assets/content-destinations.js';
import {renderEntries} from '../tools/render-public-entries.mjs';
const now=Date.now(),old=new Date(now-3600000).toISOString(),recent=new Date(now-60000).toISOString();
const entry=(n,kind='fact',place='Lima, Peru',publishedAt=recent)=>({id:'entry-'+n.toString(16).padStart(32,'0'),version:1,kind,title:'Did you know? A sourced discovery '+n,excerpt:'A checked introduction for this isolated fixture.',place,publishedAt,updatedAt:publishedAt});
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
});

