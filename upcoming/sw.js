/* Scope: /upcoming/ only. No install prompt, tracking or network requests. */
function safeUrl(value){
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash)return null;
  if(u.hostname==='play.google.com'&&u.pathname==='/store/apps/details'&&/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(u.searchParams.get('id')||''))return u.href;
  if(u.hostname==='apps.apple.com'&&/^\/[a-z]{2}\/app\/(?:[a-zA-Z0-9_%.-]+\/)?id[0-9]+$/.test(u.pathname))return u.href;
 }catch{}
 return null;
}
self.addEventListener('push',event=>{
 let msg;try{msg=event.data?.json()}catch{return}
 if(msg?.tag==='kenneth-owner-site-test'&&msg.url==='https://play.google.com/store/apps/details?id=com.kennethapp.snapclean'&&msg.title==='Kenneth App TEST'){event.waitUntil(self.registration.showNotification('Kenneth App TEST',{body:'This is a release-alert test, not a real release.',tag:'kenneth-owner-site-test',data:{url:msg.url}}));return;}
 const url=safeUrl(msg?.url);if(!url||typeof msg.body!=='string'||msg.body.length>180||typeof msg.tag!=='string'||!/^release-[a-z]+-(android|ios)$/.test(msg.tag))return;
 event.waitUntil(self.registration.showNotification('Kenneth App',{body:msg.body,icon:'/images/kenneth-logo.png',tag:msg.tag,renotify:false,data:{url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=safeUrl(event.notification.data?.url);
 if(url)event.waitUntil(self.clients.openWindow(url));
});
