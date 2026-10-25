import {preparePhoto,element} from './publishing-model.js';

export function validateCalendarPhoto(photo){
  if(photo==null)return null;
  if(typeof photo!=='object'||Array.isArray(photo)||Object.keys(photo).some(key=>!['dataUrl','width','height','alt'].includes(key))||typeof photo.dataUrl!=='string'||photo.dataUrl.length>192000||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo.dataUrl)||typeof photo.alt!=='string'||!photo.alt.trim()||photo.alt.length>180||![photo.width,photo.height].every(n=>Number.isInteger(n)&&n>0&&n<=1600))throw Error('Choose a valid photograph with a short description.');
  return {dataUrl:photo.dataUrl,width:photo.width,height:photo.height,alt:photo.alt.trim()};
}

// A single private, metadata-free WebP travels atomically with its calendar item.
export function calendarPhotoEditor(target,{id,photo=null,current=()=>true,onChange=()=>{},onBusy=()=>{},signal}={}){
  let value=validateCalendarPhoto(photo),busy=false;
  const label=element('label','Post photograph (optional)'),input=element('input'),image=element('img'),description=element('input'),altLabel=element('label','Photo description'),remove=element('button','Remove photo','secondary-button'),message=element('p',undefined,'field-help');
  input.id=id+'-file';input.type='file';input.accept='image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif';label.htmlFor=input.id;
  description.id=id+'-description';description.maxLength=180;altLabel.htmlFor=description.id;image.className='calendar-upload-preview';remove.type='button';
  target.append(label,input,element('p','Upload or replace a photo here. It is resized on your device; the original file and location metadata are not uploaded.','field-help'),image,altLabel,description,remove,message);
  const options=signal?{signal}:{};
  function draw(){image.hidden=description.hidden=altLabel.hidden=remove.hidden=!value;if(value){image.src=value.dataUrl;image.alt=value.alt;description.value=value.alt;}else{image.removeAttribute('src');description.value='';}}
  input.addEventListener('change',async()=>{const file=input.files[0];input.value='';if(!file||busy)return;busy=true;input.disabled=remove.disabled=true;onBusy(true);message.textContent='Preparing photograph…';try{const prepared=await preparePhoto(file);if(!current())return;value=validateCalendarPhoto({...prepared,alt:'Photo for this post'});draw();onChange();message.textContent='Photo ready. Save this calendar item to keep it.';}catch(error){if(current())message.textContent=error.message;}finally{busy=false;if(current()){input.disabled=remove.disabled=false;onBusy(false);}}},options);
  description.addEventListener('input',()=>{if(value){value.alt=description.value;image.alt=value.alt;onChange();}},options);
  remove.addEventListener('click',()=>{if(busy)return;value=null;draw();message.textContent='Photo removed from this form. Save to confirm.';onChange();},options);
  draw();return {get value(){return validateCalendarPhoto(value);},get busy(){return busy;},reset(photo=null){value=validateCalendarPhoto(photo);draw();message.textContent='';}};
}
