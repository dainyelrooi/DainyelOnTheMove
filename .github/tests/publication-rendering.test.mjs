import test from 'node:test';
import assert from 'node:assert/strict';
import {renderEntries} from '../tools/render-public-entries.mjs';
import {entryContentKey,readingBlocks} from '../../assets/publishing-model.js';
import {createHash} from 'node:crypto';
import {countryForPlace,linkPublishedDestinations,atlasHref,photoAlbumFor} from '../../assets/content-destinations.js';
import {nextSharedLocation,removeSharedVisit,removeSharedStop,sharedStops} from '../../assets/visited-model.js';
const id='entry-'+'a'.repeat(32),photo='photo-'+'b'.repeat(32),stamp='2026-11-07T17:00:00Z';
const entry={id,version:1,kind:'blog',title:'A real title <script>',excerpt:'A clear introduction & description.',body:'Opening words. A price of US $15 and literal $&.\n\n## A chapter\nA story with **emphasis** and <script>untrusted</script>.',place:'Curaçao, Caribbean',sources:'',videoUrl:'',photoIds:[photo],photoPlacements:[1],heroPhotoId:photo,heroLayout:'split',heroPosition:'center',storyLabel:'',tripPeriod:'',publishedAt:stamp,updatedAt:stamp,photos:[{id:photo,src:'/assets/public-content/'+'c'.repeat(64)+'.webp',alt:'An owner supplied photo',width:640,height:420}]};
test('short reading paragraphs form bounded blocks without changing words or markup',()=>{
  const parts=[
    'Before leaving home, we agreed that everyone should have the freedom to occasionally go their own way.',
    'No hard feelings, no unnecessary discussions.',
    'Just respecting that everybody experiences travelling differently.',
    'So I decided to put that agreement into practice.',
    'While the others continued with their own plans, I booked an overnight bus to the next city.',
    'A solo detour, with one big adventure waiting at the other end.'
  ];
  const blocks=readingBlocks(parts.join('\n\n'));
  assert.ok(blocks.length<parts.length);
  assert.equal(blocks.join(' '),parts.join(' '));
  assert.ok(blocks.every(block=>block.split(/\s+/).length<=75));
  const long='An already complete paragraph keeps its own comfortable reading rhythm. '.repeat(6).trim();
  assert.deepEqual(readingBlocks(parts[0]+'\n\n'+long+'\n\n'+parts[1]),[parts[0],long,parts[1]]);
});
test('reading reflow preserves structural boundaries and intentional standalone text',()=>{
  for(const boundary of ['## Another chapter','- First item\n- Second item','> A quotation','**A small heading**','First line\nSecond line','— Dainyel','Take the scenic route.','Read the [full story](https://example.com/story).','[A separate link](https://example.com/story)']){
    assert.deepEqual(readingBlocks('Opening words.\n\n'+boundary+'\n\nClosing words.'),['Opening words.',boundary,'Closing words.']);
  }
});
test('compact initial HTML preserves emphasis, links, fact cards and source fingerprints for every entry kind',()=>{
  const body='A small opening.\n\nA **clear detail** with [a useful link](https://example.com/place).\n\n## A chapter\n\nA different moment.\n\n:::fact A sourced detail\nFirst fact sentence.\n\nSecond fact sentence.\nSource: https://example.com/fact\n:::\n\n— Dainyel';
  for(const kind of ['blog','field-note','fact','tip']){
    const value={...entry,body,kind},before=JSON.stringify(value);
    const html=renderEntries({space:'staging',generatedAt:stamp,entries:[value],summaries:[value]},'<html><head></head><body><main></main></body></html>').pages[id];
    assert.match(html,/<p[^>]*>A small opening\. A <strong>clear detail<\/strong> with <a href="https:\/\/example.com\/place"/);
    assert.match(html,/class="island-fact"/);assert.match(html,/Source: example.com/);
    assert.match(html,/<p[^>]*>— Dainyel<\/p>/);
    assert.ok(html.includes(createHash('sha256').update(entryContentKey(value)).digest('hex')));
    assert.equal(JSON.stringify(value),before);
  }
});
test('initial content fingerprint matches SDK timestamps and changes with text, placement or photo IDs',()=>{
  const html=renderEntries({space:'production',generatedAt:stamp,entries:[entry],summaries:[entry]},'<html><head></head><body><main></main></body></html>').pages[id];
  const expected=createHash('sha256').update(entryContentKey({...entry,publishedAt:{toDate:()=>new Date(stamp)},updatedAt:{toDate:()=>new Date(stamp)}})).digest('hex');
  assert.ok(html.includes('data-server-content-hash="'+expected+'"'));
  for(const edit of [{body:entry.body+' Correction.'},{photoPlacements:[0]},{heroPosition:'top'},{photoIds:[]}])assert.notEqual(entryContentKey(entry),entryContentKey({...entry,...edit}));
});
test('published HTML has its own URL, escaped content, chapters, chosen banner and initial sharing metadata',()=>{
  const result=renderEntries({space:'production',generatedAt:stamp,entries:[entry],summaries:[entry]},'<html><head><title>Generic</title><meta name="robots" content="noindex"/><script type="application/ld+json">{"url":"https://dainyelonthemove.com/entry"}</script></head><body><main id="main-content">fallback</main></body></html>');
  const html=result.pages[id];assert.match(html,/A real title &lt;script&gt;/);assert.match(html,/og:image/);assert.match(html,new RegExp('https://dainyelonthemove.com/entry/'+id));assert.match(html,/Approx. 1 min read/);assert.match(html,/A chapter/);assert.match(html,/atlas\?place=curacao#map/);assert.match(html,/data-server-entry/);assert.doesNotMatch(html,/<script>untrusted/);assert.match(html,/index,follow/);assert.doesNotMatch(html,/\"url\":\"https:\/\/dainyelonthemove[.]com\/entry\"/);assert.match(result.cards,/data-cms-card/);assert.doesNotMatch(html,/#undefined|id="undefined/);assert.ok(html.includes('US $15 and literal $&amp;.'));const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const link of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.has(link[1]),'Every chapter/back link must resolve in the actual generated HTML');
});
test('destination linking uses explicit country names and only existing visits; an article never creates a new visit',()=>{
  assert.equal(countryForPlace('Curaçao, Caribbean').code,'CW');assert.equal(countryForPlace('unexpected words containing pe'),null);assert.equal(atlasHref('unknown'),null);
  const places=[{id:'curacao',name:'Curaçao'},{id:'peru',name:'Peru'}],linked=linkPublishedDestinations(places,[entry]);assert.equal(linked.length,2);assert.equal(linked[0].storyHref,'/entry/'+id);assert.equal(linked[1].storyHref,undefined);
});

test('public articles identify their real author and kind without rewriting content or original dates',()=>{
  const before=JSON.stringify(entry),html=renderEntries({space:'production',generatedAt:stamp,entries:[entry],summaries:[entry]},'<html><head></head><body><main></main></body></html>').pages[id];
  assert.match(html,/data-entry-kind="blog"/);assert.match(html,/<a href="\/about" rel="author">Dainyel<\/a>/);
  const metadata=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(metadata.author.url,'https://dainyelonthemove.com/about');assert.equal(metadata.datePublished,stamp);assert.equal(metadata.dateModified,stamp);
  assert.equal(JSON.stringify(entry),before);
});

test('Peru narratives offer one closed on-page notebook with a no-JavaScript album fallback',()=>{
  assert.equal(photoAlbumFor('Lima, Peru').href,'/atlas?place=peru#peru-lima');
  assert.equal(photoAlbumFor('Machu picchu, Peru').href,'/atlas?place=peru#peru-machu-picchu');
  assert.equal(photoAlbumFor('Cusco, Peru').href,'/atlas?place=peru#peru-cusco');
  assert.equal(photoAlbumFor('Peru').href,'/atlas?place=peru#peru-photos-title');
  assert.equal(photoAlbumFor('unknown'),null);assert.equal(photoAlbumFor('Curaçao'),null);
  assert.deepEqual(photoAlbumFor('Cusco & Machu Picchu, Peru').sections,['peru-cusco','peru-inca-trail','peru-machu-picchu']);
  assert.deepEqual(photoAlbumFor('Lima, Peru').sections,['peru-lima']);
  const peru={...entry,place:'Lima, Peru'},before=JSON.stringify(peru);
  const render=value=>renderEntries({space:'staging',generatedAt:stamp,entries:[value],summaries:[value]},'<html><head></head><body><main></main></body></html>').pages[id];
  assert.match(render(peru),/href="\/atlas\?place=peru#peru-lima"/);
  assert.match(render(peru),/<details class="story-photo-notebook" data-story-photo-notebook="peru-lima"/);
  assert.match(render(peru),/<p class="notebook-fallback"><a class="text-link"/);
  assert.doesNotMatch(render(peru),/<details[^>]*\bopen=|More photographs from this journey/);
  assert.doesNotMatch(render({...peru,kind:'fact'}),/More photographs from this journey/);
  assert.doesNotMatch(render({...peru,kind:'fact'}),/data-story-photo-notebook/);
  assert.equal(JSON.stringify(peru),before);
});
test('owner can correct one automatic visit while preserving other years and separate trip updates',()=>{
  const previous=nextSharedLocation(null,{country:'Peru',sharedDate:'2026-10-29'},stamp,2026);previous.visits.CW=[2026];
  const removed=removeSharedVisit(previous,'PE',stamp);assert.deepEqual(removed.visits,{CW:[2026]});assert.equal(removed.country,'');assert.equal(sharedStops(removed).length,1);assert.equal(previous.country,'Peru');
  const hidden=nextSharedLocation(previous,null,stamp,2026);assert.deepEqual(hidden.stops,previous.stops);
  const empty=removeSharedStop(previous,'PE-20261029',stamp);assert.equal(sharedStops(empty).length,0);assert.deepEqual(empty.visits,previous.visits);
  assert.throws(()=>nextSharedLocation(previous,{country:'Peru',sharedDate:'2099-01-01'},stamp,2026));
});
