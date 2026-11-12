import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedPostcard,postcardStatus,postcardCalendarRow,brevoCampaignUrl} from '../../assets/postcard-status.js';
const id='mail-'+'a'.repeat(32),at='2026-11-20T10:00:00+00:00';
const fixture=()=>({status:'scheduled',campaignId:101,payload:{subject:'ISOLATED FIXTURE'},provider:{state:'scheduled',identity:'managed-id',status:'queued',lastSuccessAt:'2026-11-12T16:00:00Z',scheduledAt:at,calendarAt:at,error:''}});
const timestamp=date=>({toDate:()=>date,toMillis:()=>date.getTime()});
test('active list hides only complete provider confirmations',()=>{
  assert.equal(postcardStatus(null),'Draft');
  for(const status of ['queued','processing','accepted','scheduled','sent','review']){assert.equal(confirmedPostcard({status,campaignId:101}),false);}
  assert.equal(confirmedPostcard(fixture()),true);
  for(const change of [{error:'provider-http-503'},{identity:''},{lastSuccessAt:''},{calendarAt:''}])assert.equal(confirmedPostcard({...fixture(),provider:{...fixture().provider,...change}}),false);
});
test('calendar has one stable receipt ID and Amsterdam uses the provider instant',()=>{
  const row=postcardCalendarRow(id,fixture(),timestamp);
  assert.equal(row.id,'mail-'+id);assert.equal(row.publishAt.toDate().toISOString(),'2026-11-20T10:00:00.000Z');
  assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:row.timezone,hour:'2-digit',minute:'2-digit'}).format(row.publishAt.toDate()),'11:00');
  assert.equal(postcardCalendarRow(id,{status:'queued',payload:fixture().payload,scheduledAt:at},timestamp),null);
});
test('scheduled to sent keeps identity and actual send date; uncertainty keeps its calendar date',()=>{
  const scheduled=fixture(),sentAt='2026-11-20T10:02:03Z',sent={...scheduled,status:'sent',provider:{...scheduled.provider,state:'sent',status:'sent',sentAt,calendarAt:sentAt}};
  const first=postcardCalendarRow(id,scheduled,timestamp),second=postcardCalendarRow(id,sent,timestamp);
  assert.equal(first.id,second.id);assert.equal(second.scheduleStatus,'sent');assert.equal(second.publishAt.toDate().toISOString(),'2026-11-20T10:02:03.000Z');
  const uncertain={...sent,provider:{...sent.provider,state:'review',error:'provider-http-503'}};
  assert.equal(postcardStatus(uncertain),'Needs Review');assert.equal(postcardCalendarRow(id,uncertain,timestamp).publishAt.toMillis(),second.publishAt.toMillis());
  assert.equal(brevoCampaignUrl('javascript:1'),'');assert.match(brevoCampaignUrl(101),/^https:\/\/app\.brevo\.com\//);
});
