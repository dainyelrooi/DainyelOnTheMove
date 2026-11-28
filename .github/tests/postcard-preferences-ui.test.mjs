import test from 'node:test';
import assert from 'node:assert/strict';
import {postcardAudienceText,postcardSaveError} from '../../assets/postcard-model.js';

test('a new email names its selected topic instead of promising all subscribers',()=>{
  for(const topic of ['stories','films','tips']){
    const text=postcardAudienceText(topic,{ready:true});
    assert.match(text,/who chose this topic/);
    assert.match(text,/Unsubscribed and blocklisted contacts stay excluded/);
    assert.doesNotMatch(text,/Original active-subscriber audience/);
  }
  assert.match(postcardAudienceText('',{ready:true}),/Choose a topic before requesting delivery/);
  assert.match(postcardAudienceText('',{ready:false}),/new delivery requests are paused/);
});

test('legacy and linked provider requests are never described as newly retargeted',()=>{
  assert.match(postcardAudienceText('',{existing:true,ready:true}),/keeps its approved audience/);
  assert.match(postcardAudienceText('tips',{providerOnly:true}),/existing linked Brevo campaign is unchanged/);
});

test('save feedback distinguishes denied permissions, quota and connectivity without leaking provider messages',()=>{
  const raw='private content or credential must not be echoed';
  for(const [code,expected] of [['permission-denied',/storage permissions/],['firestore/permission-denied',/storage permissions/],['resource-exhausted',/storage limit/],['unavailable',/could not be reached/],['deadline-exceeded',/could not be reached/],['unknown',/not confirmed/]]){
    const text=postcardSaveError({code,message:raw});assert.match(text,expected);assert.ok(!text.includes(raw));
  }
});
