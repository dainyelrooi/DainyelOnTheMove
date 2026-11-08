// Let the usable document finish before starting optional protected live reads.
// A slow/missing asset must not indefinitely postpone corrections or withdrawals.
let ready;
export function publicLoadReady(){
  if(!ready)ready=new Promise(resolve=>{
    let timer,done=false;
    const finish=()=>{
      if(done)return;done=true;clearTimeout(timer);window.removeEventListener('load',finish);
      if(document.hidden)resolve();else requestAnimationFrame(()=>requestAnimationFrame(resolve));
    };
    if(document.readyState==='complete')finish();
    else{window.addEventListener('load',finish,{once:true});timer=setTimeout(finish,2500);}
  });
  return ready;
}
