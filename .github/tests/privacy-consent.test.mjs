import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../../assets/privacy-consent.js',import.meta.url),'utf8');

function fixture({host='dainyelonthemove.com',name='index',path='/',search='',frame=false,published=false,privacyMode}={}) {
  const scripts=[],events={},removed=[],timers=[],imports=[];let tcf,values,reloads=0,choiceCallbacks;
  const button={hidden:true,addEventListener(type,fn){this[type]=fn;}},notice={textContent:''};
  const document={currentScript:{dataset:{consentPage:name,privacyMode},src:'https://'+host+'/assets/privacy-consent.js?v=fixture'},documentElement:{dataset:{}},dispatchEvent:()=>{},readyState:'complete',title:'Travel | Dainyel',referrer:'https://example.invalid/ref?private=query',
    cookie:'_ga=fixture; necessary=keep',head:{append:node=>scripts.push(node)},
    getElementById:()=>null,querySelector:selector=>selector==='[data-privacy-choice-status]'?notice:selector==='[data-published-entry].cms-story'&&published?{}:null,
    querySelectorAll:()=>[button],addEventListener:(event,fn)=>events[event]=fn,
    createElement:tag=>({tag,listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}})};
  const location={hostname:host,pathname:path,search,hash:'#private-unrecognised',origin:'https://'+host,reload:()=>reloads++};
  const window={addEventListener:(event,fn)=>events[event]=fn};window.self=window;window.top=frame?{}:window;
  const context=vm.createContext({window,document,location,localStorage:{removeItem:key=>removed.push(key)},URL,URLSearchParams,Date,
    loadAnalyticsChoice:async url=>{imports.push(url);return {initAnalyticsChoice:callbacks=>{choiceCallbacks=callbacks;callbacks.onPending();return {openSettings:callbacks.onPending};}};},
    setTimeout:fn=>timers.push(fn)});
  // Replace only the module-loading boundary; exercise the actual bootstrap and callbacks.
  vm.runInContext(source.replace('import(new URL(', 'loadAnalyticsChoice(new URL('),context);
  const mode=value=>{values=value;window.googlefc.getGoogleConsentModeValues=()=>values;};
  const ready=()=>{window.__tcfapi=(command,version,fn)=>{assert.equal(command,'addEventListener');assert.equal(version,2);tcf=fn;};window.googlefc.callbackQueue.find(v=>v.CONSENT_API_READY).CONSENT_API_READY();};
  return {window,document,location,scripts,events,removed,button,notice,mode,ready,imports,choice:()=>choiceCallbacks,
    sync:()=>window.googlefc.callbackQueue.find(v=>v.CONSENT_MODE_DATA_READY).CONSENT_MODE_DATA_READY(),
    tcf:data=>tcf(data,true),flush:()=>{while(timers.length)timers.shift()();},reloads:()=>reloads,
    setPublished:value=>published=value};
}
const grant={adStoragePurposeConsentStatus:1,analyticsStoragePurposeConsentStatus:1,adUserDataPurposeConsentStatus:1,adPersonalizationPurposeConsentStatus:1};

test('AdSense bootstraps the certified CMP with all storage denied, paused ads and no Analytics tag',()=>{
  const f=fixture();assert.equal(f.scripts.length,1);assert.equal(f.scripts[0].src,'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9073450763802389');
  assert.equal(f.scripts[0].crossOrigin,'anonymous');assert.equal(f.scripts[0].async,true);assert.equal(f.window.adsbygoogle.pauseAdRequests,1);
  assert.equal(f.window.dataLayer[0][0],'consent');assert.equal(f.window.dataLayer[0][2].analytics_storage,'denied');
  assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);assert.deepEqual(f.removed,['dotm-analytics-choice-v1']);
});
test('staging, unknown hosts, editor preview, embedded pages and wrong routes never contact ad or Analytics services',()=>{
  for(const options of [{host:'dainyelonthemove-staging.web.app'},{host:'localhost'},{host:'evil.invalid'},{search:'?website-preview=1'},
    {frame:true},{path:'/admin'},{path:'/anything-missing'},{name:undefined,path:'/entry/private'}]){
    const f=fixture(options);assert.equal(f.scripts.length,0,JSON.stringify(options));assert.equal(f.window.googlefc,undefined);
  }
});
test('no consent, rejection, API failure, not configured and non-applicable signals cannot start either optional service',()=>{
  for(const value of [undefined,{},...Array.from({length:4},(_,i)=>({adStoragePurposeConsentStatus:i+1,analyticsStoragePurposeConsentStatus:i+1})).filter(v=>v.adStoragePurposeConsentStatus!==1)]){
    const f=fixture();f.mode(value);f.sync();assert.equal(f.scripts.length,1);assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);
  }
  const f=fixture();f.sync();assert.equal(f.scripts.length,1);assert.equal(f.window.adsbygoogle.pauseAdRequests,1);
});
test('a granted CMP decision starts Analytics once and allows ads, with sanitised page and referrer metadata',()=>{
  const f=fixture({search:'?q=private-search'});f.mode(grant);f.sync();f.sync();assert.equal(f.scripts.length,2);assert.equal(f.window.adsbygoogle.pauseAdRequests,0);
  const config=f.window.dataLayer.find(row=>row[0]==='config')[2];assert.equal(config.page_location,'https://dainyelonthemove.com/');assert.equal(config.page_referrer,'https://example.invalid/ref');
  assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);assert.equal(config.cookie_expires,15552000);
});
test('denied personalisation requests non-personalised ads and Analytics permission never grants ad permission',()=>{
  const f=fixture();f.mode({...grant,adStoragePurposeConsentStatus:2,adPersonalizationPurposeConsentStatus:2});f.sync();
  assert.equal(f.scripts.length,2);assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.equal(f.window.adsbygoogle.requestNonPersonalizedAds,1);
});
test('changing consent pauses immediately and reloads after the new choice; declined Analytics clears its cookies',()=>{
  const f=fixture();f.mode(grant);f.ready();f.sync();f.tcf({eventStatus:'cmpuishown',cmpStatus:'loaded'});
  assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);
  f.mode({...grant,adStoragePurposeConsentStatus:2,analyticsStoragePurposeConsentStatus:2});f.tcf({eventStatus:'useractioncomplete',cmpStatus:'loaded'});
  assert.equal(f.reloads(),1);f.sync();assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.match(f.document.cookie,/_ga=; Max-Age=0/);
});
test('the initial native choice resolves without a second local banner or a redundant Analytics prompt',()=>{
  const f=fixture();f.ready();f.tcf({eventStatus:'cmpuishown',cmpStatus:'loaded'});f.mode(grant);f.sync();assert.equal(f.scripts.length,1);
  f.tcf({eventStatus:'useractioncomplete',cmpStatus:'loaded'});f.flush();assert.equal(f.scripts.length,2);assert.equal(f.reloads(),0);
  assert.ok(!source.includes('cookie-choice-title'));assert.ok(!source.includes('localStorage.setItem'));
});
test('settings invoke the same native message, and failed loading never starts measurement',()=>{
  const f=fixture();f.ready();f.window.googlefc.showRevocationMessage=()=>{};f.button.click();
  assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.equal(typeof f.window.googlefc.callbackQueue.at(-1).CONSENT_API_READY,'function');
  f.scripts[0].listeners.error();assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);assert.match(f.notice.textContent,/remain off/);
  const staging=fixture({host:'dainyelonthemove-staging.web.app'});staging.button.click();assert.match(staging.notice.textContent,/test website/);assert.equal(staging.scripts.length,0);
});
test('dynamic entries must actually render a public article before consent services can load',()=>{
  const f=fixture({name:'entry',path:'/entry/entry-'+'a'.repeat(32)});assert.equal(f.scripts.length,0);
  f.setPublished(true);f.events['site:article-rendered']();assert.equal(f.scripts.length,1);f.mode(grant);f.sync();
  assert.equal(f.window.dataLayer.find(row=>row[0]==='config')[2].page_location,'https://dainyelonthemove.com/entry');
  f.setPublished(false);f.events['site:article-rendered']();assert.equal(f.window.adsbygoogle.pauseAdRequests,1);assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);
});

test('Analytics-only production waits for an explicit grant and never imports the ad CMP',async()=>{
  const f=fixture({privacyMode:'analytics-only'});await Promise.resolve();
  assert.equal(f.imports.length,1);assert.match(f.imports[0],/analytics-choice\.js\?v=fixture$/);
  assert.equal(f.scripts.length,0);assert.equal(f.window.googlefc,undefined);
  assert.equal(f.document.documentElement.dataset.privacyChoice,'pending');
  f.choice().onChoice(true);f.choice().onChoice(true);
  assert.equal(f.scripts.length,1);assert.match(f.scripts[0].src,/googletagmanager\.com\/gtag\/js/);
  assert.equal(f.window.adsbygoogle.pauseAdRequests,1);
  const update=f.window.dataLayer.filter(row=>row[0]==='consent'&&row[1]==='update').at(-1)[2];
  assert.equal(update.analytics_storage,'granted');assert.equal(update.ad_storage,'denied');
  assert.equal(update.ad_user_data,'denied');assert.equal(update.ad_personalization,'denied');
  f.choice().onPending();assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);
  f.choice().onChoice(false,{revoked:true});assert.equal(f.reloads(),1);
  assert.equal(f.document.documentElement.dataset.privacyChoice,'resolved');assert.match(f.document.cookie,/_ga=; Max-Age=0/);
});

test('Analytics-only refusal and local/staging acceptance never create a provider tag',async()=>{
  for(const host of ['dainyelonthemove.com','localhost','127.0.0.1','dainyelonthemove-staging.web.app']){
    const f=fixture({host,privacyMode:'analytics-only'});await Promise.resolve();
    f.choice().onChoice(host!=='dainyelonthemove.com');assert.equal(f.scripts.length,0,host);
    assert.equal(f.window['ga-disable-G-EYLP0YYJMJ'],true);assert.equal(f.window.adsbygoogle.pauseAdRequests,1);
    assert.equal(f.document.documentElement.dataset.privacyChoice,'resolved');
  }
});

test('Analytics-only unknown hosts and private/preview routes cannot initialise choices',async()=>{
  for(const options of [{host:'evil.invalid'},{path:'/admin'},{search:'?website-preview=1'},{frame:true},{name:'entry',path:'/entry/entry-'+'a'.repeat(32)}]){
    const f=fixture({...options,privacyMode:'analytics-only'});await Promise.resolve();
    assert.equal(f.imports.length,0);assert.equal(f.scripts.length,0);
  }
});
