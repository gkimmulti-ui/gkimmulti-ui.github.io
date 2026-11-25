/* No endpoint configured in draft release. Enable only after dedicated Worker QA. */
(()=>{
'use strict';
const raw=window.KENNETH_RELEASE_ALERTS_API;
if(typeof raw!=='string'||!raw)return;
let base;try{base=new URL(raw);if(base.protocol!=='https:'||base.hostname!=='kenneth-release-alerts.gkimmulti.workers.dev'||base.pathname!=='/'||base.search||base.hash)return}catch{return}
const translations={
ko:['출시 알림 받기','알림 신청 취소','이 앱의 Google Play 공개 출시 알림을 한 번 받습니다. 브라우저 알림 허용이 필요하며 언제든 취소할 수 있습니다.','이 환경에서는 웹 알림을 사용할 수 없습니다.','알림 설정에 실패했습니다. 다시 시도해 주세요.','알림 신청 완료','알림 신청 취소 완료','Google Play 다운로드','App Store 다운로드'],
en:['Notify me on release','Cancel alert','Receive one alert when this app is publicly available on Google Play. Browser notification permission is required; cancel anytime.','Web notifications are not supported in this environment.','Could not update your alert. Try again.','Alert subscribed','Alert canceled','Download on Google Play','Download on App Store'],
ja:['公開通知を受け取る','通知を解除','Google Play で一般公開されたとき、一度だけ通知します。ブラウザの通知許可が必要で、いつでも解除できます。','この環境はウェブ通知に対応していません。','通知設定に失敗しました。再試行してください。','通知を登録しました','通知を解除しました','Google Play でダウンロード','App Store でダウンロード'],
'zh-CN':['订阅发布提醒','取消提醒','应用在 Google Play 正式公开时提醒一次。需要浏览器通知权限，可随时取消。','当前环境不支持网页通知。','无法更新提醒，请重试。','已订阅提醒','已取消提醒','在 Google Play 下载','在 App Store 下载'],
ru:['Уведомить о выпуске','Отменить уведомление','Одно уведомление о публичном выпуске в Google Play. Требуется разрешение браузера; отменить можно в любое время.','Веб-уведомления не поддерживаются в этой среде.','Не удалось изменить уведомление. Повторите попытку.','Подписка оформлена','Подписка отменена','Скачать в Google Play','Скачать в App Store'],
fil:['Abisuhan ako sa release','Kanselahin ang abiso','Isang abiso kapag pampublikong available sa Google Play. Kailangan ang pahintulot sa browser; puwedeng kanselahin anumang oras.','Hindi suportado ang web notifications dito.','Hindi na-update ang abiso. Subukan ulit.','Naka-subscribe ang abiso','Nakansela ang abiso','I-download sa Google Play','I-download sa App Store']};
const copy=()=>translations[document.documentElement.lang]||translations.en;
const select=document.getElementById('language');const note=document.getElementById('note');
const cards=[...document.querySelectorAll('.coming-card')];
const stateKey='kenneth.release.alerts.v1';
let local={token:'',apps:[]},config=null,releases=[];
try{const v=JSON.parse(localStorage.getItem(stateKey)||'null');if(v&&typeof v.token==='string'&&Array.isArray(v.apps))local=v}catch{}
const store=()=>localStorage.setItem(stateKey,JSON.stringify(local));
function b64(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decode(s){const v=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(v,c=>c.charCodeAt(0))}
const supported=()=>isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window&&'crypto'in window;
async function api(path,data){
 const url=new URL(path,base);const opt={method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},credentials:'omit',cache:'no-store',redirect:'error',...(data?{body:JSON.stringify(data)}:{})};const response=await fetch(url,opt);if(!response.ok)throw new Error('unavailable');return response.json();
}
function urlFor(value,platform){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
 if(platform==='android'&&u.hostname==='play.google.com'&&u.pathname==='/store/apps/details'&&/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(u.searchParams.get('id')||''))return u.href;
 if(platform==='ios'&&u.hostname==='apps.apple.com'&&/^\/[a-z]{2}\/app\/(?:[a-zA-Z0-9_%.-]+\/)?id[0-9]+$/.test(u.pathname))return u.href;}catch{}return null;
}
function render(){
 const t=copy();note.textContent=supported()?t[2]:t[3];
 cards.forEach(card=>{
 const id=card.dataset.app,btn=card.querySelector('button'),key=id+':android';
 card.querySelectorAll('a.release-download').forEach(a=>a.remove());
 for(const r of releases.filter(x=>x.app===id)){
 const href=urlFor(r.store_url,r.platform);if(!href)continue;
 const link=document.createElement('a');link.className='release-download';link.href=href;link.textContent=t[r.platform==='android'?7:8];link.rel='noopener';card.append(link);
 }
 const released=releases.some(r=>r.app===id&&r.platform==='android'&&urlFor(r.store_url,r.platform));
 btn.hidden=released&&!local.apps.includes(key);btn.disabled=!(supported()&&config?.enabled)&&!local.apps.includes(key);
 btn.textContent=local.apps.includes(key)?t[1]:t[0];
 });
}
async function toggle(card){
 const t=copy(),app=card.dataset.app,platform='android',key=app+':'+platform,button=card.querySelector('button');button.disabled=true;
 try{
  if(local.apps.includes(key)){
    const x=await api('/v1/unsubscribe',{app,platform,token:local.token});if(x.status!=='unsubscribed')throw new Error('not confirmed');
    local.apps=local.apps.filter(x=>x!==key);store();render();note.textContent=t[6];return;
  }
  if(!supported()||!config?.enabled)throw new Error('unsupported');
  // Permission is requested only following the visitor's explicit click.
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('permission');
  const registration=await navigator.serviceWorker.register('/upcoming/sw.js',{scope:'/upcoming/'});
  await navigator.serviceWorker.ready;
  let sub=await registration.pushManager.getSubscription();
  if(!sub)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});
  if(!local.token){local.token=b64(crypto.getRandomValues(new Uint8Array(32)));store()}
  const x=await api('/v1/subscribe',{app,platform,lang:document.documentElement.lang,token:local.token,consent:true,subscription:sub.toJSON()});
  if(x.status==='released'){releases.push({app,platform,store_url:x.url});render();return}
  if(x.status!=='subscribed')throw new Error('not confirmed');
  if(!local.apps.includes(key))local.apps.push(key);store();render();note.textContent=t[5];
 }catch{render();note.textContent=t[4]}
}
for(const card of cards)card.querySelector('button').addEventListener('click',()=>toggle(card));
select?.addEventListener('change',render);
Promise.all([api('/v1/config'),api('/v1/releases')]).then(([c,r])=>{config=c;releases=Array.isArray(r.releases)?r.releases:[];render()}).catch(()=>{note.textContent=copy()[4]});
})();
