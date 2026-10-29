import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const base=new URL('../../',import.meta.url),[tracker,clarity,coreSource]=await Promise.all(['js/journey-tracker.js','assets/site-clarity.js','assets/journey-core.js'].map(path=>readFile(new URL(path,base),'utf8')));
const {sharedPlaceLabel}=await import('data:text/javascript;base64,'+Buffer.from(coreSource).toString('base64'));
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Node{
  constructor(tag,text=''){this.tagName=tag.toUpperCase();this.text=text;this.children=[];this.attrs=new Map();this.hidden=false;}
  get textContent(){return this.text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this.text=String(value);this.children=[];}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  prepend(...nodes){for(const node of nodes)node.parent=this;this.children.unshift(...nodes);}
  before(node){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this),0,node);}
  replaceChildren(...nodes){this.text='';this.children=[];this.append(...nodes);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(node=>node!==this);}
  setAttribute(key,value){this.attrs.set(key,value);}
  removeAttribute(key){this.attrs.delete(key);}
  hasAttribute(key){return this.attrs.has(key);}
  descendants(){return this.children.flatMap(node=>[node,...node.descendants()]);}
}
async function render(trip){
  const section=new Node('section'),heading=new Node('h3','Revealed along the way.'),empty=new Node('p','The route stays secret until I get there.'),list=new Node('div');empty.setAttribute('data-trip-secret','');section.append(heading,empty,list);
  const document={getElementById:id=>({'journey-stops':list,'trip-reveal-empty':empty}[id]||null),createElement:tag=>new Node(tag),querySelector:selector=>selector==='#trip-reveals > h3'?heading:null};
  runInNewContext(tracker.replace(/^import .*;\r?\n/m,''),{sharedPlaceLabel,document,window:{publicTripReady:Promise.resolve(trip)},Date,Intl});await settle();
  return {section,heading,empty,list,notes:section.children.filter(node=>node.className==='trip-location-note')};
}

test('an owner-approved country is visible before any revealed stops without inventing a card, city or date',async()=>{
  const trip={revealedStops:[],currentLocation:{country:'Curaçao'}},before=JSON.stringify(trip),f=await render(trip);
  assert.equal(f.notes.length,1);assert.equal(f.notes[0].textContent,'First shared place: Curaçao.');assert.equal(f.empty.textContent,'The rest of the route will be revealed along the way.');
  assert.equal(f.empty.hasAttribute('data-trip-secret'),false);assert.equal(f.list.children.length,0);assert.equal(f.section.descendants().filter(node=>['ARTICLE','TIME','IMG','A'].includes(node.tagName)).length,0);assert.equal(JSON.stringify(trip),before);
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
