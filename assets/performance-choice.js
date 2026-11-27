// Collection is entirely optional. Automatic network instrumentation stays off.
export function measurementPage({hostname,pathname,search,hash,preview=false}){
  return !preview&&!search&&!hash&&['dainyelonthemove.com','www.dainyelonthemove.com'].includes(hostname)&&(/^\/(?:stories|videos|atlas|about|postcards|travel-tips|did-you-know|thailand|thailand-solo|philippines|bali)?\/?$/.test(pathname)||/^\/entry\/entry-[a-f0-9]{32}\/?$/.test(pathname));
}
export function metricValue(value,max=3600000){return Number.isFinite(value)&&value>=0&&value<=max?Math.round(value):null;}
export async function initSpeedMeasurements({load=async()=>{
  const [{browserFirebaseApp},sdk]=await Promise.all([import('./firebase-browser-app.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-performance.js')]);
  return {sdk,app:await browserFirebaseApp()};
}}={}){
  if(!measurementPage({...location,hostname:location.hostname,pathname:location.pathname,search:location.search,hash:location.hash,preview:window.top!==window.self}))return;
  let allowed=false,instance,loading,flushed=false,observers=[],timer,metrics={};
  function pause(){allowed=false;clearTimeout(timer);for(const observer of observers)observer.disconnect();observers=[];if(instance)instance.dataCollectionEnabled=false;}
  function put(name,value,max){const number=metricValue(value,max);if(number!==null)metrics[name]=number;}
  async function start(){if(loading||flushed)return;loading=true;
    try{const {sdk,app}=await load();if(!allowed||!measurementPage(location))return;instance=sdk.initializePerformance(app,{instrumentationEnabled:false,dataCollectionEnabled:false});instance.instrumentationEnabled=false;instance.dataCollectionEnabled=true;metrics={};
      const navigation=performance.getEntriesByType('navigation')[0];if(navigation){put('response_ms',navigation.responseStart);put('dom_ready_ms',navigation.domContentLoadedEventEnd);}
      for(const entry of performance.getEntriesByType('paint'))if(entry.name==='first-contentful-paint')put('first_content_ms',entry.startTime);
      function observe(type,receive){try{const observer=new PerformanceObserver(list=>{if(allowed)receive(list.getEntries());});observer.observe({type,buffered:true});observers.push(observer);}catch{}}
      observe('largest-contentful-paint',entries=>{const last=entries.at(-1);if(last)put('largest_content_ms',last.startTime);});
      let shift=0;observe('layout-shift',entries=>{for(const entry of entries)if(!entry.hadRecentInput)shift+=entry.value;put('layout_shift_milli',shift*1000,100000);});
      // This is a bounded interaction duration sample, not a claimed INP score.
      observe('event',entries=>{for(const entry of entries)if(entry.interactionId)put('longest_interaction_ms',Math.max(metrics.longest_interaction_ms||0,entry.duration));});
      function flush(){if(!allowed||flushed||!instance||!measurementPage(location))return;flushed=true;const measurement=sdk.trace(instance,'public_page_speed');measurement.start();measurement.putAttribute('page_group',location.pathname.startsWith('/entry/')?'article':location.pathname==='/'?'home':location.pathname.slice(1));for(const [key,value] of Object.entries(metrics))measurement.putMetric(key,value);measurement.stop();for(const observer of observers)observer.disconnect();observers=[];}
      timer=setTimeout(flush,30000);window.addEventListener('pagehide',flush,{once:true});
    }catch{if(instance)instance.dataCollectionEnabled=false;}finally{loading=false;}
  }
  function change(value){if(!value){pause();return;}if(allowed)return;allowed=true;if(!loading&&!flushed){clearTimeout(timer);timer=setTimeout(()=>{if(allowed)start();},2500);}}
  document.addEventListener('site:measurement-choice',event=>change(event.detail?.allowed===true));
  change(document.documentElement.dataset.measurementChoice==='allowed');
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!instance)clearTimeout(timer);else if(!document.hidden&&allowed&&!instance)change(true);});
  return pause;
}
if(typeof document!=='undefined')initSpeedMeasurements();
