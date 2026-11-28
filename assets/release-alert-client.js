/* Public Web Push UI. The Worker controls availability. */
(()=>{
'use strict';
const base='https://kenneth-release-alerts.gkimmulti.workers.dev';
const translations={
ko:['출시 알림 받기','알림 신청 취소','이 앱의 Google Play 공개 출시 알림을 한 번 받습니다. 브라우저 알림 허용이 필요하며 언제든 취소할 수 있습니다.','이 환경에서는 웹 알림을 사용할 수 없습니다.','알림 설정에 실패했습니다. 다시 시도해 주세요.','알림 신청 완료','알림 신청 취소 완료','Google Play 다운로드','App Store 다운로드'],
en:['Notify me on release','Cancel alert','Receive one alert when this app is publicly available on Google Play. Browser notification permission is required; cancel anytime.','Web notifications are not supported in this environment.','Could not update your alert. Try again.','Alert subscribed','Alert canceled','Download on Google Play','Download on App Store'],
ja:['公開通知を受け取る','通知を解除','Google Play で一般公開されたとき、一度だけ通知します。ブラウザの通知許可が必要で、いつでも解除できます。','この環境はウェブ通知に対応していません。','通知設定に失敗しました。再試行してください。','通知を登録しました','通知を解除しました','Google Play でダウンロード','App Store でダウンロード'],
'zh-CN':['订阅发布提醒','取消提醒','应用在 Google Play 正式公开时提醒一次。需要浏览器通知权限，可随时取消。','当前环境不支持网页通知。','无法更新提醒，请重试。','已订阅提醒','已取消提醒','在 Google Play 下载','在 App Store 下载'],
ru:['Уведомить о выпуске','Отменить уведомление','Одно уведомление о публичном выпуске в Google Play. Требуется разрешение браузера; отменить можно в любое время.','Веб-уведомления не поддерживаются в этой среде.','Не удалось изменить уведомление. Повторите попытку.','Подписка оформлена','Подписка отменена','Скачать в Google Play','Скачать в App Store'],
fil:['Abisuhan ako sa release','Kanselahin ang abiso','Isang abiso kapag pampublikong available sa Google Play. Kailangan ang pahintulot sa browser; puwedeng kanselahin anumang oras.','Hindi suportado ang web notifications dito.','Hindi na-update ang abiso. Subukan ulit.','Naka-subscribe ang abiso','Nakansela ang abiso','I-download sa Google Play','I-download sa App Store']};
const availability={
 ko:['지금은 새 출시 알림을 받지 않습니다. 기존 신청은 이 브라우저에서 취소할 수 있습니다.','브라우저 알림 권한이 필요합니다. 설정에서 허용한 뒤 다시 시도해 주세요.','출시 알림 상태를 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.','이 브라우저에서 신청을 취소할 수 있도록 브라우저 저장을 허용해 주세요.'],
 en:['New release alerts are currently off. Existing alerts can be canceled in this browser.','Allow notifications in browser settings, then try again.','Could not check alert availability. Reload and try again.','Allow browser storage so you can cancel alerts from this browser.'],
 ja:['現在、新規の公開通知は受け付けていません。登録済みの通知はこのブラウザで解除できます。','ブラウザの設定で通知を許可してから再試行してください。','通知の利用状況を確認できませんでした。ページを再読み込みしてください。','このブラウザで通知を解除できるよう、ブラウザの保存を許可してください。'],
 'zh-CN':['暂不接受新的发布提醒订阅，已有订阅仍可在此浏览器取消。','请在浏览器设置中允许通知后重试。','无法确认提醒是否可用，请刷新页面后重试。','请允许浏览器存储，以便之后能在此浏览器取消提醒。'],
 ru:['Новые подписки пока отключены. Действующие подписки можно отменить в этом браузере.','Разрешите уведомления в настройках браузера и повторите попытку.','Не удалось проверить доступность уведомлений. Обновите страницу.','Разрешите браузеру сохранять данные, чтобы здесь можно было отменить подписку.'],
 fil:['Hindi tumatanggap ng bagong abiso ngayon. Puwedeng kanselahin dito ang kasalukuyang abiso.','Payagan ang notifications sa settings ng browser at subukan ulit.','Hindi masuri kung magagamit ang mga abiso. I-reload ang page at subukan ulit.','Payagan ang browser storage para makansela rito ang mga abiso.']
};
const copy=()=>translations[document.documentElement.lang]||translations.en;
const info=()=>availability[document.documentElement.lang]||availability.en;
const select=document.getElementById('language');
const note=document.getElementById('note');
const cards=[...document.querySelectorAll('.coming-card')];
const apps=new Set(cards.map(card=>card.dataset.app));
const stateKey='kenneth.release.alerts.v1';
const pending=new Set();
const serialize=fn=>navigator.locks?.request?navigator.locks.request('kenneth-release-alert-change',fn):fn();
let config=null,releases=[],availabilityKnown=false,configFailed=false,pushSetup=null;
let statusMessage=null;
const read=()=>{
 try{
  const v=JSON.parse(localStorage.getItem(stateKey)||'null');
  if(/^[A-Za-z0-9_-]{43}$/.test(v?.token||'')&&Array.isArray(v.apps))return {token:v.token,apps:[...new Set(v.apps.filter(s=>typeof s==='string'&&/^[a-z0-9]+:android$/.test(s)))]};
 }catch{}
 return {token:'',apps:[]};
};
let memory=read();
function current(){
 const v=read();
 if(v.token)memory=v;
 return memory;
}
function store(v){
 memory=v;
 try{localStorage.setItem(stateKey,JSON.stringify(v));return read().token===v.token}catch{return false}
}
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decode(s){const v=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(v,c=>c.charCodeAt(0))}
const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window&&'crypto'in window;
function usableKey(s){
 if(typeof s!=='string'||!/^[A-Za-z0-9_-]{87}$/.test(s))return false;
 try{const k=decode(s);return k.length===65&&k[0]===4}catch{return false}
}
const enabled=()=>supported()&&config?.enabled===true&&usableKey(config.publicKey);
async function api(path,data){
 const ctrl=new AbortController();
 const timeout=setTimeout(()=>ctrl.abort(),10000);
 try{
  const url=new URL(path,base);
  const opt={method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},credentials:'omit',cache:'no-store',redirect:'error',signal:ctrl.signal,...(data?{body:JSON.stringify(data)}:{})};
  const response=await fetch(url,opt);
  if(!response.ok)throw new Error('unavailable');
  return await response.json();
 }finally{clearTimeout(timeout)}
}
function urlFor(value,platform,app){
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  if(platform==='android'&&u.hostname==='play.google.com'&&u.pathname==='/store/apps/details'&&u.searchParams.get('id')==='com.kennethapp.'+app&&u.searchParams.getAll('id').length===1)return 'https://play.google.com/store/apps/details?id='+u.searchParams.get('id');
  if(platform==='ios'&&u.hostname==='apps.apple.com'&&/^\/[a-z]{2}\/app\/(?:[a-zA-Z0-9_%.-]+\/)?id[0-9]+$/.test(u.pathname))return u.origin+u.pathname;
 }catch{}
 return null;
}
function release(r){
 if(!r||!apps.has(r.app)||!urlFor(r.store_url,r.platform,r.app))return;
 const i=releases.findIndex(x=>x.app===r.app&&x.platform===r.platform);
 if(i>=0)releases[i]=r;else releases.push(r);
}
function render(){
 const t=copy(),i=info(),v=current();
 if(statusMessage)note.textContent=(statusMessage[0]==='info'?i:t)[statusMessage[1]];
 else if(configFailed)note.textContent=i[2];
 else if(availabilityKnown&&config?.enabled!==true)note.textContent=i[0];
 else if(availabilityKnown)note.textContent=supported()?(enabled()?t[2]:i[2]):t[3];
 cards.forEach(card=>{
  const app=card.dataset.app,btn=card.querySelector('button'),key=app+':android',selected=v.apps.includes(key);
  card.querySelectorAll('a.release-download').forEach(a=>a.remove());
  const appReleases=releases.filter(x=>x.app===app);
  for(const r of appReleases){
   const href=urlFor(r.store_url,r.platform,app);
   const link=document.createElement('a');link.className='release-download';link.href=href;link.textContent=t[r.platform==='android'?7:8];link.rel='noopener';card.append(link);
  }
  btn.hidden=appReleases.some(r=>r.platform==='android')&&!selected;
  const changing=pending.has(key);
  btn.disabled=changing||(!enabled()&&!selected);
  btn.setAttribute('data-alert-state',changing?'working':selected?'subscribed':'new');
  btn.setAttribute('aria-busy',String(changing));
  if(availabilityKnown||configFailed||selected)btn.textContent=selected?(t[5]+' · '+t[1]):t[0];
  btn.setAttribute('aria-label',btn.textContent+' · '+card.querySelector('h2').textContent);
  btn.setAttribute('aria-describedby','note');
 });
}
function ensureToken(){
 const v=current();
 if(v.token){if(read().token!==v.token)throw Error('storage');return v.token}
 const token=b64(crypto.getRandomValues(new Uint8Array(32)));
 if(!store({token,apps:[]}))throw Error('storage');
 return token;
}
async function browserPush(){
 // Invoke synchronously from the user's click before any asynchronous setup.
 if(!pushSetup){
  const permission=Notification.permission==='granted'?Promise.resolve('granted'):Notification.requestPermission();
  pushSetup=(async()=>{
   if(await permission!=='granted')throw Error('permission');
   const reg=await navigator.serviceWorker.register('/upcoming/sw.js',{scope:'/upcoming/'});
   const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('worker')),10000);navigator.serviceWorker.ready.then(()=>clearTimeout(timer),()=>clearTimeout(timer));})]);
   if(ready.scope!==reg.scope)throw Error('worker');
   let subscription=await ready.pushManager.getSubscription();
   if(!subscription)subscription=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});
   return subscription;
  })().finally(()=>{pushSetup=null});
 }
 return pushSetup;
}
async function toggle(card){
 const app=card.dataset.app,platform='android',key=app+':'+platform;
 const initial=current();
 if(pending.has(key)||(!initial.apps.includes(key)&&(!enabled()||releases.some(r=>r.app===app&&r.platform===platform))))return;
 pending.add(key);statusMessage=null;render();
 try{
  const cancel=initial.apps.includes(key);
  // Preserve the user gesture when asking permission; serialize subscription state changes across tabs.
  const browser=cancel?null:browserPush();
  if(browser)browser.catch(()=>{});
  await serialize(async()=>{
   const before=current();
   if(cancel){
    if(!before.apps.includes(key)){statusMessage=['copy',6];return}
    const x=await api('/v1/unsubscribe',{app,platform,token:before.token});
    if(x.status!=='unsubscribed')throw Error('not confirmed');
    const next=current();store({token:next.token,apps:next.apps.filter(x=>x!==key)});
    statusMessage=['copy',6];return;
   }
   if(before.apps.includes(key)){statusMessage=['copy',5];return}
   const token=ensureToken();
   const subscription=await browser;
   const x=await api('/v1/subscribe',{app,platform,lang:document.documentElement.lang,token,consent:true,subscription:subscription.toJSON()});
   if(x.status==='released'&&urlFor(x.url,platform,app)){release({app,platform,store_url:x.url});return}
   if(x.status!=='subscribed')throw Error('not confirmed');
   const next=current();store({token,apps:[...new Set([...next.apps,key])]});
   statusMessage=['copy',5];
  });
 }catch(e){statusMessage=e.message==='permission'?['info',1]:e.message==='storage'?['info',3]:['copy',4]}
 finally{pending.delete(key);render()}
}
for(const card of cards)card.querySelector('button').addEventListener('click',()=>toggle(card));
select?.addEventListener('change',render);
window.addEventListener('storage',e=>{if(e.key===stateKey||e.key===null){memory=read();render()}});
render();
api('/v1/config').then(c=>{config=c;availabilityKnown=true;render()}).catch(()=>{configFailed=true;render()});
api('/v1/releases').then(r=>{if(Array.isArray(r.releases)){r.releases.forEach(release);render()}}).catch(()=>{});
})();
