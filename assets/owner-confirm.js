// Accessible in-page confirmation: no browser-native alert that can hide
// behind the embedded editor. Abort/sign-out always cancels the action.
export function confirmOwnerAction(message,{signal}={}){
  if(signal?.aborted)return Promise.resolve(false);
  return new Promise(resolve=>{
    const previous=document.activeElement,dialog=document.createElement('dialog'),text=document.createElement('p'),actions=document.createElement('div'),cancel=document.createElement('button'),accept=document.createElement('button');
    dialog.className='owner-confirm';dialog.setAttribute('aria-label','Confirm owner action');text.textContent=message;actions.className='pending-actions';cancel.type=accept.type='button';cancel.className='secondary-button';accept.className='primary-button';cancel.textContent='Cancel';accept.textContent='Confirm';actions.append(cancel,accept);dialog.append(text,actions);document.body.append(dialog);
    let finished=false;const done=value=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);dialog.close();dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});resolve(value);};const abort=()=>done(false);
    cancel.addEventListener('click',()=>done(false));accept.addEventListener('click',()=>done(true));dialog.addEventListener('cancel',event=>{event.preventDefault();done(false);});signal?.addEventListener('abort',abort,{once:true});dialog.showModal();cancel.focus();
  });
}
