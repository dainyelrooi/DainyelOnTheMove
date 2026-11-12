// Pure presentation of private provider receipts. No provider/write API here.
const instant=value=>typeof value==='string'&&/[zZ]|[+-]\d\d:\d\d$/.test(value)&&Number.isFinite(Date.parse(value));
export function confirmedPostcard(job){
  const p=job?.provider;
  return !!(['scheduled','sent'].includes(job?.status)&&Number.isSafeInteger(job?.campaignId)&&job.campaignId>0&&p?.identity&&instant(p.lastSuccessAt)&&!p.error&&
    (p.state==='sent'&&instant(p.sentAt)&&p.calendarAt===p.sentAt||p.state==='scheduled'&&instant(p.scheduledAt)&&p.calendarAt===p.scheduledAt));
}
export function postcardStatus(job){
  if(!job)return 'Draft';
  const p=job.provider;
  if(p?.state==='failed')return 'Failed';
  if(p?.error||p?.state==='review'||job.status==='review')return 'Needs Review';
  if(confirmedPostcard(job))return p.state==='sent'?'Sent':'Scheduled';
  if(job.status==='cancelled')return 'Cancelled';
  return 'Pending Confirmation';
}
export function postcardCalendarRow(id,job,timestamp){
  const p=job?.provider;
  // A queued request/action success never invents a calendar confirmation.
  const at=p?.calendarAt||(p?.state==='failed'&&(p.scheduledAt||job.approvedScheduledAt));
  if(!instant(at)||!job.payload?.subject||job.status==='cancelled')return null;
  const label=postcardStatus(job),sent=!!p.sentAt;
  return {id:'mail-'+id,originalId:id,source:'mail',kind:'postcard',title:job.payload.subject,
    caption:'',publishAt:timestamp(new Date(at)),timezone:'Europe/Amsterdam',scheduled:label==='Scheduled',published:sent,
    remindersEnabled:false,scheduleStatus:label==='Sent'?'sent':label==='Scheduled'?'scheduled':label==='Failed'?'failed':'review',
    campaignId:job.campaignId,provider:p,mailJob:job};
}
export function brevoCampaignUrl(id){return Number.isSafeInteger(id)&&id>0?'https://app.brevo.com/campaigns/email/'+id+'/report':'';}
export function postcardMonthBounds(month,parseLocal){
  if(!/^(20\d\d|2100)-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a calendar month.');
  const [year,number]=month.split('-').map(Number),next=new Date(Date.UTC(year,number,1)).toISOString().slice(0,7);
  return [month,next].map(value=>parseLocal(value+'-01T00:00').toISOString().replace('.000Z','+00:00'));
}
