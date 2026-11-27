// Reuse Hosting's public configuration; never duplicate keys in source.
export async function browserFirebaseApp(){
  const sdk=await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js');
  const existing=sdk.getApps().find(app=>app.options.projectId==='dainyelonthemove');if(existing)return existing;
  const response=await fetch('/__/firebase/init.json',{credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Firebase configuration is unavailable.');const value=await response.json();
  if(value.projectId!=='dainyelonthemove'||typeof value.appId!=='string'||!/^1:\d+:web:[a-z0-9]+$/i.test(value.appId)||typeof value.apiKey!=='string')throw Error('Unexpected Firebase application.');
  return sdk.getApps().find(app=>app.options.projectId===value.projectId)||sdk.initializeApp(value);
}
