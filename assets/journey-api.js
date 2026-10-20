let configuration;
export async function serviceAvailable(){if(!configuration)configuration=fetch('data/services.json',{cache:'no-store'}).then(r=>r.ok?r.json():{}).catch(()=>({}));return (await configuration).journeyApi===true;}
export async function api(path,{method='GET',body,user,key,editKey}={}) {
  if(!await serviceAvailable())throw Error('Direct sending and publishing are not configured yet. Nothing was sent or published.');
  const headers={'Content-Type':'application/json'};
  if(user)headers.Authorization='Bearer '+await user.getIdToken();
  if(method!=='GET'){
    const [{appCheck},{getToken}]=await Promise.all([import('../js/firebase.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js')]);
    headers['X-Firebase-AppCheck']=(await getToken(appCheck)).token;
    if(key)headers['Idempotency-Key']=key;if(editKey)headers['X-Edit-Key']=editKey;
  }
  let response;
  try{response=await fetch(path,{method,headers,cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{body:JSON.stringify(body)}:{})});}
  catch{throw Error('No response was confirmed. Keep this form open and use Retry with the same submission reference.');}
  let result;try{result=await response.json();}catch{throw Error('The service response could not be read. Nothing was confirmed.');}
  if(!response.ok)throw Error(result.error||'The request could not be completed.');return result;
}
