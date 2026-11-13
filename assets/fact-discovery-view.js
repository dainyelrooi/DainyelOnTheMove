import {element} from './publishing-model.js';
import {factTitle} from './fact-discovery-model.js';
export function factCard(entry,{compact=false}={}){
  const card=element('a',undefined,'fact-card'+(compact?' fact-card--compact':''));card.href='/entry/'+entry.id;card.dataset.factCard='';card.dataset.factCountry=entry.country||'';
  if(entry.coverPhoto){const image=element('img');image.src=entry.coverPhoto.src;image.alt=entry.coverPhoto.alt;image.loading='lazy';image.decoding='async';image.width=640;image.height=420;card.append(image);}
  const copy=element('div',undefined,'fact-card-copy');copy.append(element('span','Did you know?'+(entry.place?' · '+entry.place:''),'eyebrow'),element('h3',factTitle(entry.title)),element('p',entry.excerpt),element('span','Read the discovery →','fact-card-link'));card.append(copy);return card;
}
export function renderCountryFacts(root,place){
  if(!root)return;root.replaceChildren();const facts=place.facts||[];root.hidden=!facts.length;if(!facts.length)return;
  const title=element('h4','Did you know?','fact-country-title'),list=element('ul',undefined,'fact-country-list');
  for(const entry of facts.slice(0,3)){const li=element('li'),a=element('a',factTitle(entry.title));a.href='/entry/'+entry.id;li.append(a);list.append(li);}
  const more=element('a','All facts about '+place.name+' →','text-link');more.href='/did-you-know?country='+encodeURIComponent(place.countryCode||'');root.append(title,list,more);
}

