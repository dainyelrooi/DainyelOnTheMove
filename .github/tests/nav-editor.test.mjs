import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../../assets/website-model.js',import.meta.url),'utf8')).replace(/^export \{space as siteSpace\} from .*;\r?\n/m,'');
const {validateSiteValues,safeAnnouncementLink}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const field={key:'f00',kind:'link',headerAnnouncement:'postcards',labelMaxLength:60,optional:true,websiteOnly:true,default:JSON.stringify({text:'Postcards from the road',href:'/postcards'})},group={fields:[field]};
test('owner can edit, hide and restore a bounded announcement without opening script or email links',()=>{
  const value=JSON.stringify({text:'A shared update',href:'/stories#field-notes'});
  assert.equal(validateSiteValues(group,{f00:value}).f00,value);
  assert.equal(validateSiteValues(group,{f00:JSON.stringify({text:'',href:''})}).f00,JSON.stringify({text:'',href:''}));
  assert.deepEqual(validateSiteValues(group,{f00:field.default}),{});
  for(const link of [{text:'x'.repeat(61),href:'/stories'},{text:'',href:'/stories'},{text:'New\nStory',href:'/stories'},{text:'New\tStory',href:'/stories'},{text:'Read this',href:'javascript:alert(1)'},{text:'Contact',href:'mailto:fixture@example.invalid'},{text:'Wrong',href:'//example.invalid'}])assert.throws(()=>validateSiteValues(group,{f00:JSON.stringify(link)}));
  assert.equal(safeAnnouncementLink('https://example.invalid/update'),'https://example.invalid/update');
  assert.equal(safeAnnouncementLink('/admin'),null);
});
test('ordinary website links retain existing required-label and email behavior',()=>{
  const ordinary={fields:[{key:'f00',kind:'link',default:field.default}]},email=JSON.stringify({text:'Email',href:'mailto:fixture@example.invalid'});
  assert.equal(validateSiteValues(ordinary,{f00:email}).f00,email);
  assert.throws(()=>validateSiteValues(ordinary,{f00:JSON.stringify({text:'',href:''})}));
});
