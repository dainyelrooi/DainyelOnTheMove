import {samePublication} from '../../assets/publication-state.js';
export const ROOT='projects/dainyelonthemove/databases/dainyel-content/documents';
const ID=/^entry-[a-f0-9]{32}$/;
export const timestamp=value=>({timestampValue:new Date(value).toISOString()});
export function pack(value){
  if(Array.isArray(value))return{arrayValue:{values:value.map(pack)}};
  if(value&&typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)]))}};
  if(typeof value==='string')return{stringValue:value};if(typeof value==='boolean')return{booleanValue:value};
  if(Number.isSafeInteger(value))return{integerValue:String(value)};throw Error('invalid-server-value');
}
export function unpack(value){
  if(!value||typeof value!=='object')throw Error('invalid-server-value');
  if('stringValue'in value)return value.stringValue;if('timestampValue'in value)return value.timestampValue;
  if('integerValue'in value)return Number(value.integerValue);if('booleanValue'in value)return value.booleanValue;
  if('arrayValue'in value)return(value.arrayValue.values||[]).map(unpack);
  if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,unpack(v)]));
  throw Error('invalid-server-value');
}
export const data=doc=>Object.fromEntries(Object.entries(doc?.fields||{}).map(([k,v])=>[k,unpack(v)]));
export function update(doc,changes,transforms=[]){return{update:{name:doc.name,fields:{...doc.fields,...Object.fromEntries(Object.entries(changes).map(([k,v])=>[k,pack(v)]))}},currentDocument:{updateTime:doc.updateTime},...(transforms.length?{updateTransforms:transforms}:{})};}
const serverTime=fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'});
export function exactManualCompletion(plan,publication){
  const p=data(plan),live=data(publication);
  return p.status==='cancelled'&&ID.test(p.entryId||'')&&publication?.name===plan.name.replace('/entrySchedules/','/published/')&&live.publishedAt&&p.updatedAt===live.publishedAt&&samePublication(p.payload,live);
}
export async function reconcileManual(adapter,plan,publication){
  if(!exactManualCompletion(plan,publication))return false;
  // Compare both versions in one atomic commit; never requeue or edit text.
  await adapter.commit([update(plan,{status:'published'},[serverTime('updatedAt')]),update(publication,{})]);
  return true;
}
