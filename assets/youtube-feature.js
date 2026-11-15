// An owner-approved public premiere, separate from the latest published upload.
// Passing the planned time never claims the video has actually gone live.
export function premierePhase(now,start,until){
  const at=Date.parse(start),end=Date.parse(until);
  if(!Number.isFinite(now)||!Number.isFinite(at)||!Number.isFinite(end)||end<=at)return 'expired';
  return now<at?'scheduled':now<end?'watch':'expired';
}
export function initYouTubeFeature(root){
  if(!root)return()=>{};
  let timer;
  const refresh=()=>{
    clearTimeout(timer);
    const now=Date.now(),phase=premierePhase(now,root.dataset.premiereAt,root.dataset.featureUntil);
    root.hidden=phase==='expired';
    const label=root.querySelector('[data-premiere-status]'),link=root.querySelector('[data-premiere-link]');
    if(label)label.textContent=phase==='scheduled'?'Premiere on YouTube':'From my YouTube diary';
    if(link)link.textContent=phase==='scheduled'?'Set a reminder on YouTube →':'Open the video on YouTube →';
    if(phase!=='expired'&&!document.hidden){
      const next=Date.parse(phase==='scheduled'?root.dataset.premiereAt:root.dataset.featureUntil);
      timer=setTimeout(refresh,Math.min(Math.max(next-now,1),2147483647));
    }
  };
  const stop=()=>clearTimeout(timer);
  document.addEventListener('visibilitychange',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('pagehide',stop);refresh();
  return()=>{stop();document.removeEventListener('visibilitychange',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('pagehide',stop);};
}
if(typeof document!=='undefined')document.querySelectorAll('[data-youtube-feature]').forEach(initYouTubeFeature);
