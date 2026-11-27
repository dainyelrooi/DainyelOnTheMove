import {readingUrl,OFFLINE_LIFETIME} from './travel-tools-model.js';
export const OFFLINE_CACHE='dotm-offline-reading-v1',OFFLINE_META='dotm-offline-index-v1',OFFLINE_LIMIT=8;
export const OFFLINE_CSP="default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; script-src 'none'; connect-src 'none'";
export function offlineRecord(value,now=Date.now()){
  return !!(value&&readingUrl(value.url)===value.url&&typeof value.title==='string'&&value.title.length>0&&value.title.length<=180&&Number.isSafeInteger(value.savedAt)&&value.savedAt<=now+60000&&Number.isSafeInteger(value.expiresAt)&&value.expiresAt>now&&value.expiresAt<=value.savedAt+OFFLINE_LIFETIME&&value.expiresAt>value.savedAt&&Array.isArray(value.images)&&value.images.length<=3&&value.images.every(path=>/^\/assets\/[a-zA-Z0-9_./-]+\.(?:webp|jpg|jpeg|png)$/.test(path)&&!path.includes('..')));
}
export function privateNavigation(path){return /^\/(?:admin|studio|__|data|js|postcards-form|search)(?:[/.]|$)/.test(path);}
