import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const base=new URL('../../',import.meta.url),[tracker,clarity,coreSource,mapSource]=await Promise.all(['js/journey-tracker.js','assets/site-clarity.js','assets/journey-core.js','assets/map-enhancements.js'].map(path=>readFile(new URL(path,base),'utf8')));
const {sharedPlaceLabel,tripState}=await import('data:text/javascript;base64,'+Buffer.from(coreSource).toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Node{
  constructor(tag,text=''){this.tagName=tag.toUpperCase();this.text=text;this.children=[];this.attrs=new Map();this.hidden=false;this.dataset={};this.style={};this.events=new Map();const classes=new Set();this.classList={add:(...names)=>names.forEach(name=>classes.add(name)),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name)};}
  get textContent(){return this.text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this.text=String(value);this.children=[];}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  prepend(...nodes){for(const node of nodes)node.parent=this;this.children.unshift(...nodes);}
  before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  replaceChildren(...nodes){this.text='';this.children=[];this.append(...nodes);}
  insertBefore(node,before){node.parent=this;const index=this.children.indexOf(before);this.children.splice(index<0?this.children.length:index,0,node);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
  setAttribute(key,value){this.attrs.set(key,value);}
  removeAttribute(key){this.attrs.delete(key);}
  hasAttribute(key){return this.attrs.has(key);}
  addEventListener(type,callback){this.events.set(type,callback);}
  querySelectorAll(selector){return selector==='button'?this.descendants().filter(node=>node.tagName==='BUTTON'):[];}
  descendants(){return this.children.flatMap(node=>[node,...node.descendants()]);}
}
async function render(trip,{late=false,readyState='complete'}={}){
  const section=new Node('section'),heading=new Node('h3','Revealed along the way.'),empty=new Node('p','The route stays secret until I get there.'),list=new Node('div');empty.setAttribute('data-trip-secret','');section.append(heading,empty,list);
  const events=new Map(),window=late?{}:{publicTripReady:Promise.resolve(trip)},document={readyState,getElementById:id=>({'journey-stops':list,'trip-reveal-empty':empty}[id]||null),createElement:tag=>new Node(tag),querySelector:selector=>selector==='#trip-reveals > h3'?heading:null,addEventListener:(type,callback,options)=>events.set(type,{callback,options})};
  runInNewContext(tracker.replace(/^import .*;\r?\n/m,''),{sharedPlaceLabel,document,window,Date,Intl});await settle();
  if(late){assert.equal(section.children.filter(node=>node.className==='trip-location-note').length,0);assert.equal(events.get('DOMContentLoaded')?.options?.once,true);window.publicTripReady=Promise.resolve(trip);events.get('DOMContentLoaded').callback();await settle();}
  return {section,heading,empty,list,notes:section.children.filter(node=>node.className==='trip-location-note')};
}

test('an owner-approved country is visible before any revealed stops without inventing a card, city or date',async()=>{
  const trip={revealedStops:[],currentLocation:{country:'Curaçao'}},before=JSON.stringify(trip),f=await render(trip);
  assert.equal(f.notes.length,1);assert.equal(f.notes[0].textContent,'First shared place: Curaçao.');assert.equal(f.empty.textContent,'The rest of the route will be revealed along the way.');
  assert.equal(f.empty.hasAttribute('data-trip-secret'),false);assert.equal(f.list.children.length,0);assert.equal(f.section.descendants().filter(node=>['ARTICLE','TIME','IMG','A'].includes(node.tagName)).length,0);assert.equal(JSON.stringify(trip),before);
});

test('Atlas tracker waits for the later classic defer trip bootstrap during parsing and defer execution',async()=>{
  for(const readyState of ['loading','interactive']){
    const f=await render({revealedStops:[],currentLocation:{country:'Curaçao'}},{late:true,readyState});
    assert.equal(f.notes.length,1);assert.equal(f.notes[0].textContent,'First shared place: Curaçao.');assert.equal(f.empty.hasAttribute('data-trip-secret'),false);assert.equal(f.list.children.length,0);
  }
});

test('unknown or invalid broad locations preserve the original unrevealed-place fallback',async()=>{
  for(const currentLocation of [undefined,null,{},[],{country:''},{country:42},{city:'Fixture city'},{country:'Fixture country',city:''}]){
    const f=await render({revealedStops:[],currentLocation});assert.equal(f.notes.length,0);assert.equal(f.empty.textContent,'The route stays secret until I get there.');assert.equal(f.empty.hasAttribute('data-trip-secret'),true);assert.equal(f.list.children.length,0);
  }
});

test('previously revealed stop cards retain dates, text, image and story controls',async()=>{
  const stop={id:'fixture-stop',city:'Fixture city',country:'Fixture country',date:'2020-01-02',text:'Isolated fixture text.',photos:[{src:'/assets/fixture.webp',alt:'Fixture photograph'}],storyUrl:'/fixture-story#fixture'},trip={revealedStops:[stop],currentLocation:{city:'Shared city',country:'Shared country'}},f=await render(trip),card=f.list.children[0];
  assert.equal(f.notes[0].textContent,'Last shared location: Shared city, Shared country');assert.equal(f.heading.textContent,'The journey, as it unfolds.');assert.equal(f.section.children.includes(f.empty),false);assert.equal(f.list.children.length,1);
  assert.equal(card.id,'reveal-fixture-stop');assert.equal(card.children.find(node=>node.tagName==='H3').textContent,'Fixture city, Fixture country');assert.equal(card.children.find(node=>node.tagName==='TIME').textContent,'2 January 2020');assert.equal(card.children.find(node=>node.tagName==='TIME').dateTime,'2020-01-02');assert.equal(card.children.find(node=>node.tagName==='P').textContent,'Isolated fixture text.');
  const image=card.children.find(node=>node.tagName==='IMG'),link=card.children.find(node=>node.tagName==='A');assert.equal(image.src,'/assets/fixture.webp');assert.equal(image.alt,'Fixture photograph');assert.equal(image.loading,'lazy');assert.equal(link.href,'/fixture-story#fixture');assert.equal(link.textContent,'Read the story →');
});

async function latestTeaser(trip){
  const latest=new Node('aside'),window={publicTripReady:Promise.resolve(trip),IntersectionObserver:true,addEventListener(){}},document={body:{dataset:{publicPage:'atlas'}},hidden:false,getElementById:()=>null,querySelector:selector=>selector==='[data-atlas-latest]'?latest:null,querySelectorAll:()=>[],addEventListener(){}};
  const source=clarity.replace(/^import .*;\r?\n/gm,'');
  runInNewContext(source,{window,document,sharedPlaceLabel,initReadingCollections(){},initCarousels(){},initSearch(){},Date,clearTimeout(){},setTimeout(){throw Error('No timer is expected without a coffee link');},IntersectionObserver:class{observe(){}},fetch(){throw Error('No remote request is expected in this offline fixture');}});await settle();return latest;
}

test('the unrevealed-destination latest-story teaser hides as soon as a valid country is shared',async()=>{
  for(const trip of [{revealedStops:[],currentLocation:{country:'Curaçao'}},{revealedStops:[],currentLocation:{city:'Fixture city',country:'Fixture country'}},{revealedStops:[{country:'Fixture country'}]}])assert.equal((await latestTeaser(trip)).hidden,true);
});

test('the latest-story teaser remains available when no place has been validly shared',async()=>{
  for(const trip of [null,{revealedStops:[]},{revealedStops:[],currentLocation:{city:'Fixture city'}},{revealedStops:[],currentLocation:{country:''}}])assert.equal((await latestTeaser(trip)).hidden,false);
});

async function mapFixture(trip,{late=false,readyState='complete'}={}){
  const map=new Node('svg'),markers=new Node('g'),visits=new Node('div'),tools=new Node('div'),legend=new Node('div'),events=new Map();map.viewBox={baseVal:{width:1000}};
  const selected=Object.fromEntries(['status-text','name','description','year','story','story-status','story-description','story-link'].map(key=>[key,new Node('p')]));
  const ids={'world-map':map,'marker-layer':markers,'visit-list':visits,...Object.fromEntries(Object.entries(selected).map(([key,value])=>['place-'+key,value]))};
  const document={readyState,getElementById:id=>ids[id]||null,createElement:tag=>new Node(tag),createElementNS:(_,tag)=>new Node(tag),createTextNode:text=>new Node('text',text),querySelector:selector=>({'.map-tools':tools,'.map-legend':legend}[selector]||null),querySelectorAll:()=>[],addEventListener:(type,callback,options)=>events.set(type,{callback,options})};
  const window={location:{href:'https://fixture.invalid/atlas',origin:'https://fixture.invalid'},...(late?{}:{publicTripReady:Promise.resolve(trip)})};
  runInNewContext(mapSource.replace(/^import .*;\r?\n/gm,''),{tripState,sharedPlaceLabel,document,window,URL,Date,Promise,renderAtlasPhoto(){},MutationObserver:class{observe(){}},setTimeout(){throw Error('No timer is expected');}});await settle();
  const note=visits.descendants().find(node=>node.className==='map-reveal-note'),filters=tools.children[0];
  if(late){assert.equal(note.textContent,'The route stays secret until I get there.');assert.equal(events.get('DOMContentLoaded')?.options?.once,true);window.publicTripReady=Promise.resolve(trip);events.get('DOMContentLoaded').callback();await settle();}
  return {note,markers,selected,filter(value){filters.events.get('click')({target:{closest:()=>({dataset:{filter:value}})}});}};
}

const underway={departureAt:'2026-10-28T00:00:00+01:00',departureConfirmed:true,confirmedDepartureAt:null,timeZone:'Europe/Amsterdam',revealedStops:[],currentLocation:{country:'Curaçao'}};
test('map note and Revealed selection show the shared country and confirmed underway state without a day or date',async()=>{
  const before=JSON.stringify(underway),f=await mapFixture(underway);assert.equal(f.note.textContent,'On the move. Last shared location: Curaçao. The rest of the route will be revealed along the way.');
  f.filter('revealed');assert.equal(f.selected['status-text'].textContent,'Last shared location');assert.equal(f.selected.name.textContent,'Curaçao');assert.equal(f.selected.description.textContent,f.note.textContent);assert.equal(f.selected.year.hidden,true);assert.equal(f.markers.children.length,0);assert.equal(JSON.stringify(underway),before);
});

test('map enhancement also waits for the existing deferred trip promise without fetching a second copy',async()=>{
  for(const readyState of ['loading','interactive'])assert.match((await mapFixture(underway,{late:true,readyState})).note.textContent,/^On the move\. Last shared location: Curaçao\./);
});

test('a passed plan alone does not confirm departure, and a missing feed preserves the visited-map fallback',async()=>{
  const unconfirmed={...underway,departureConfirmed:false,currentLocation:null},f=await mapFixture(unconfirmed);assert.equal(f.note.textContent,'The planned departure date has arrived. The next update will confirm the journey.');
  f.filter('revealed');assert.equal(f.selected.name.textContent,'A journey waiting to unfold.');assert.equal(f.selected.description.textContent,f.note.textContent);
  const missing=await mapFixture(null);assert.equal(missing.note.textContent,'The route stays secret until I get there.');
});
