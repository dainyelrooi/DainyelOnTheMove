import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEntries} from '../tools/render-public-entries.mjs';
import {countryForPlace,linkPublishedDestinations,atlasHref} from '../../assets/content-destinations.js';
import {nextSharedLocation,removeSharedVisit,removeSharedStop,sharedStops} from '../../assets/visited-model.js';
const id='entry-'+'a'.repeat(32),photo='photo-'+'b'.repeat(32),stamp='2026-11-07T17:00:00Z';
const entry={id,version:1,kind:'blog',title:'A real title <script>',excerpt:'A clear introduction & description.',body:'Opening words.\n\n## A chapter\nA story with **emphasis** and <script>untrusted</script>.',place:'Curaçao, Caribbean',sources:'',videoUrl:'',photoIds:[photo],photoPlacements:[1],heroPhotoId:photo,heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:'',publishedAt:stamp,updatedAt:stamp,photos:[{id:photo,src:'/assets/public-content/'+'c'.repeat(64)+'.webp',alt:'An owner supplied photo',width:640,height:420}]};
test('published HTML has its own URL, escaped content, chapters, chosen banner and initial sharing metadata',()=>{
  const result=renderEntries({space:'production',generatedAt:stamp,entries:[entry],summaries:[entry]},'<html><head><title>Generic</title><meta name="robots" content="noindex"/><script type="application/ld+json">{"url":"https://dainyelonthemove.com/entry"}</script></head><body><main id="main-content">fallback</main></body></html>');
  const html=result.pages[id];assert.match(html,/A real title &lt;script&gt;/);assert.match(html,/og:image/);assert.match(html,new RegExp('https://dainyelonthemove.com/entry/'+id));assert.match(html,/Approx. 1 min read/);assert.match(html,/A chapter/);assert.match(html,/atlas\?place=curacao#map/);assert.match(html,/data-server-entry/);assert.doesNotMatch(html,/<script>untrusted/);assert.match(html,/index,follow/);assert.doesNotMatch(html,/\"url\":\"https:\/\/dainyelonthemove[.]com\/entry\"/);assert.match(result.cards,/data-cms-card/);assert.doesNotMatch(html,/#undefined|id="undefined/);const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(link[1]),'Every chapter/back link must resolve in the actual generated HTML');
});
test('destination linking uses explicit country names and only existing visits; an article never creates a new visit',()=>{
  assert.equal(countryForPlace('Curaçao, Caribbean').code,'CW');assert.equal(countryForPlace('unexpected words containing pe'),null);assert.equal(atlasHref('unknown'),null);
  const places=[{id:'curacao',name:'Curaçao'},{id:'peru',name:'Peru'}],linked=linkPublishedDestinations(places,[entry]);assert.equal(linked.length,2);assert.equal(linked[0].storyHref,'/entry/'+id);assert.equal(linked[1].storyHref,undefined);
});
test('owner can correct one automatic visit while preserving other years and separate trip updates',()=>{
  const previous=nextSharedLocation(null,{country:'Peru',sharedDate:'2026-10-29'},stamp,2026);previous.visits.CW=[2026];
  const removed=removeSharedVisit(previous,'PE',stamp);assert.deepEqual(removed.visits,{CW:[2026]});assert.equal(removed.country,'');assert.equal(sharedStops(removed).length,1);assert.equal(previous.country,'Peru');
  const hidden=nextSharedLocation(previous,null,stamp,2026);assert.deepEqual(hidden.stops,previous.stops);
  const empty=removeSharedStop(previous,'PE-20261029',stamp);assert.equal(sharedStops(empty).length,0);assert.deepEqual(empty.visits,previous.visits);
  assert.throws(()=>nextSharedLocation(previous,{country:'Peru',sharedDate:'2099-01-01'},stamp,2026));
});
