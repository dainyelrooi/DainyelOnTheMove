import {normaliseEntry} from './publishing-model.js';
const fields=['version','kind','title','excerpt','body','place','sources','videoUrl','photoIds','photoPlacements','heroPhotoId','heroLayout','heroPosition','storyLabel','tripPeriod'];
export function samePublication(left,right){
  if(!left||!right)return false;
  const a=normaliseEntry(left),b=normaliseEntry(right);
  return fields.every(key=>JSON.stringify(a[key])===JSON.stringify(b[key]));
}
export function manualScheduleStatus(action,plan,payload){
  if(!plan||plan.status!=='queued')return null;
  return action==='publish'&&samePublication(plan.payload,payload)?'published':action!=='save'?'cancelled':null;
}
