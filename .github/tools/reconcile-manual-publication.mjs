// Narrow recovery only. Official CLI handles its own login; no token is read,
// exported, logged or persisted by this tool. There is no mail/provider call.
import {createRequire} from 'node:module';
import {ROOT,data,exactManualCompletion,reconcileManual} from '../cloudflare/publication-engine.mjs';
const [space,id,mode='check']=process.argv.slice(2);
if(!['production','staging'].includes(space)||!/^entry-[a-f0-9]{32}$/.test(id||'')||!['check','repair'].includes(mode))throw Error('Use exact space, entry ID and check/repair');
const require=createRequire(process.env.FIREBASE_CLI_PACKAGE);
const {requireAuth}=require('./lib/requireAuth.js'),{Client}=require('./lib/apiv2.js');
const {selectAccount,setActiveAccount}=require('./lib/auth.js');
const options={project:'dainyelonthemove',projectRoot:process.cwd(),nonInteractive:true};
const account=selectAccount(undefined,process.cwd());if(account)setActiveAccount(options,account);
await requireAuth(options);
const client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const call=async(path,method='GET',body)=>{const response=await client.request({method,path,...(body?{body}:{}),responseType:'json'});return response.body;};
const adapter={get:async path=>{try{return await call(path);}catch(e){if(e.status===404)return null;throw e;}},commit:writes=>call(ROOT+':commit','POST',{writes})};
const base=ROOT+'/cmsSpaces/'+space;
const [plan,publication]=await Promise.all([adapter.get(base+'/entrySchedules/'+id),adapter.get(base+'/published/'+id)]);
if(!exactManualCompletion(plan,publication)){console.log('No matching manual completion: no changes made.');process.exitCode=2;}
else if(mode==='check')console.log('Exact manual completion verified. Existing ID, URL, scheduled date and approved revision can be retained; no changes or email.');
else{
  await reconcileManual(adapter,plan,publication);
  const saved=data(await adapter.get(plan.name));
  if(saved.status!=='published'||saved.draftRevision!==data(plan).draftRevision||saved.scheduledAt!==data(plan).scheduledAt)throw Error('Reconciliation readback failed');
  console.log('Existing schedule reconciled with its exact manual publication. Date, revision, content, URL and mail request unchanged. No email/provider operation.');
}
