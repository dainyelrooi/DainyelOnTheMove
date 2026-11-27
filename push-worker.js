// Separate narrow scope: offline reading keeps its own root worker.
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let message;try{message=event.data?.json();}catch{return;}
  const value=message?.data||{},url=value.url;
  if(typeof url!=='string'||!/^\/entry\/entry-[a-f0-9]{32}$/.test(url)||typeof value.title!=='string'||!value.title.trim()||value.title.length>140)return;
  // A stable tag collapses a duplicate notification rather than adding a stack.
  await self.registration.showNotification('DainyelOnTheMove',{body:value.title,tag:'story-'+url.split('/').at(-1),renotify:false,icon:'/assets/favicon.svg',data:{url}});
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();const path=event.notification.data?.url;if(!/^\/entry\/entry-[a-f0-9]{32}$/.test(path||''))return;event.waitUntil((async()=>{const url=new URL(path,self.location.origin).href;for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))if(client.url===url)return client.focus();return self.clients.openWindow(url);})());});
