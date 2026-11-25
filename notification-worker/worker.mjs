import {generateRequestDetails,validateSubscriptionKeys} from './webpush-native.mjs';
const SITE='https://gkimmulti-ui.github.io';
const TEST_ORIGIN='https://kenneth-release-alerts.gkimmulti.workers.dev';
const APPS=new Set(['bracketbud','phrasepip','bagsum','roomnobi','rowmio','dottomint','morsepip','hushmio','zodimi','whalopip','sylvomi','robipip','meowbini','halopip','drakumi','boopiri']);
const PLATFORMS=new Set(['android','ios']);
const LANGS=new Set(['ko','en','ja','zh-CN','ru','fil']);
const APP_NAMES={"bracketbud":"Bracket Bud: Tournament","phrasepip":"PhrasePip: Travel Phrases","bagsum":"Bag Sum: Luggage Weight","roomnobi":"RoomNobi: Room Planner","rowmio":"RowMio: Row Counter","dottomint":"DottoMint: Pixel Art Studio","morsepip":"MorsePip: Learn Morse Code","hushmio":"HushMio: Ambient Sound Mixer","zodimi":"Zodimi","whalopip":"Whalopip","sylvomi":"Sylvomi","robipip":"Robipip","meowbini":"Meowbini","halopip":"Halopip","drakumi":"Drakumi","boopiri":"Boopiri"};
const HOSTS=new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com']);
const encoder=new TextEncoder();
const now=()=>new Date().toISOString();
const day=()=>now().slice(0,10);
const changed=r=>r?.meta?.changes??0;
const CORS={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}})}
function validB64(s,min,max){return typeof s==='string'&&s.length>=min&&s.length<=max&&/^[A-Za-z0-9_-]+$/.test(s)}
function subscriptionInput(v){
  if(!v||!APPS.has(v.app)||!PLATFORMS.has(v.platform)||!LANGS.has(v.lang)||!validB64(v.token,43,43)||v.consent!==true)return null;
  if(!v.subscription||typeof v.subscription.endpoint!=='string'||v.subscription.endpoint.length>2048)return null;
  let u;try{u=new URL(v.subscription.endpoint)}catch{return null}
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!HOSTS.has(u.hostname)||u.pathname.length<2)return null;
  const keys=v.subscription.keys;
  if(!validB64(keys?.p256dh,87,87)||!validB64(keys?.auth,22,22))return null;
  return {app:v.app,platform:v.platform,lang:v.lang,token:v.token,endpoint:u.href,p256dh:keys.p256dh,auth:keys.auth}
}
function storeUrl(raw,platform){
  if(typeof raw!=='string'||raw.length>2048)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
    if(platform==='android'&&u.hostname==='play.google.com'&&u.pathname==='/store/apps/details'){
      const id=u.searchParams.get('id'); if(!id||!/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(id))return null;
      return 'https://play.google.com/store/apps/details?id='+id;
    }
    if(platform==='ios'&&u.hostname==='apps.apple.com'&&/^\/[a-z]{2}\/app\/(?:[a-zA-Z0-9_%.-]+\/)?id[0-9]+$/.test(u.pathname))return 'https://apps.apple.com'+u.pathname;
  }catch{}
  return null;
}
function identityValid(v,env,url){
  let map;try{map=JSON.parse(env.RELEASE_APP_MAP||'{}')}catch{return false}
  const expected=map?.[v.app]?.[v.platform];if(typeof expected!=='string'||!expected)return false;
  const u=new URL(url);return v.platform==='android'?u.searchParams.get('id')===expected:u.pathname.split('/').pop()==='id'+expected;
}
function dateValid(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&Date.parse(s)<=Date.now()}
async function hash(s){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')}
async function secretEqual(a,b){if(typeof a!=='string'||typeof b!=='string'||b.length<32||a.length>512)return false;const x=await hash(a),y=await hash(b);let d=0;for(let i=0;i<x.length;i++)d|=x.charCodeAt(i)^y.charCodeAt(i);return d===0}
async function body(req){
 const ct=req.headers.get('content-type')||'';
 if(!ct.toLowerCase().startsWith('application/json')||Number(req.headers.get('content-length')||0)>6144)return null;
 if(!req.body)return null; const reader=req.body.getReader();let chunks=[],size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>6144){await reader.cancel();return null}chunks.push(value)}
 const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length}
 try{return JSON.parse(new TextDecoder().decode(all))}catch{return null}
}
async function quota(db,kind,max){
 const r=await db.prepare('INSERT INTO quotas(day,kind,used) VALUES(?,?,1) ON CONFLICT(day,kind) DO UPDATE SET used=used+1 WHERE used<?').bind(day(),kind,max).run();
 return changed(r)===1;
}
function enabled(env){return env.ENABLE_ALERTS==='true'&&!!env.DB&&validB64(env.VAPID_PUBLIC_KEY,87,87)&&validB64(env.VAPID_PRIVATE_KEY,43,43)&&typeof env.VAPID_SUBJECT==='string'&&env.VAPID_SUBJECT.startsWith('mailto:')&&typeof env.OWNER_SECRET==='string'&&env.OWNER_SECRET.length>=32}
async function subscribe(v,env){
 const p=subscriptionInput(v);if(!p||!await validateSubscriptionKeys({p256dh:p.p256dh,auth:p.auth}))return json({error:'invalid_subscription'},400);
 const db=env.DB;
 if(!await quota(db,'sub-write',400))return json({error:'quota_paused'},429);
 const release=await db.prepare('SELECT store_url FROM releases WHERE app=? AND platform=?').bind(p.app,p.platform).first();
 if(release)return json({status:'released',url:release.store_url});
 const h=await hash(p.token),id=await hash(p.app+'\n'+p.platform+'\n'+p.endpoint),at=now(),exp=new Date(Date.now()+180*86400000).toISOString();
 // Atomic insert bounded by total active subscriptions and absence of a publication.
 const r=await db.prepare(`INSERT INTO subscriptions(id,app,platform,endpoint,p256dh,auth,token_hash,lang,consent_at,expires_at)
 SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM subscriptions)<5000 AND NOT EXISTS(SELECT 1 FROM releases WHERE app=? AND platform=?)
 ON CONFLICT(app,platform,endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,lang=excluded.lang,expires_at=excluded.expires_at WHERE subscriptions.token_hash=excluded.token_hash AND NOT EXISTS(SELECT 1 FROM releases WHERE app=excluded.app AND platform=excluded.platform)`).bind(id,p.app,p.platform,p.endpoint,p.p256dh,p.auth,h,p.lang,at,exp,p.app,p.platform).run();
 if(!changed(r))return json({error:'registration_unavailable'},409);
 return json({status:'subscribed'});
}
async function unsubscribe(v,env){
 if(!v||!APPS.has(v.app)||!PLATFORMS.has(v.platform)||!validB64(v.token,43,43))return json({error:'invalid_request'},400);
 if(!await quota(env.DB,'cancel-write',1000))return json({error:'quota_paused'},429);
 const h=await hash(v.token);
 await env.DB.prepare('DELETE FROM subscriptions WHERE token_hash=? AND app=? AND platform=?').bind(h,v.app,v.platform).run();
 return json({status:'unsubscribed'});
}
async function release(v,env){
 if(!v||!APPS.has(v.app)||!PLATFORMS.has(v.platform)||v.publicationVerified!==true||!dateValid(v.publishedAt)||!dateValid(v.verifiedAt)||Date.parse(v.verifiedAt)<Date.parse(v.publishedAt))return json({error:'verified_publication_required'},400);
 const url=storeUrl(v.storeUrl,v.platform);if(!url||!identityValid(v,env,url))return json({error:'invalid_store_identity'},400);
 // Owner must verify actual production availability outside this endpoint.
 // Approval, private test links, and any unverified date must never be submitted.
 const r=await env.DB.prepare('INSERT INTO releases(app,platform,store_url,published_at,verified_at) VALUES(?,?,?,?,?) ON CONFLICT(app,platform) DO NOTHING').bind(v.app,v.platform,url,v.publishedAt,v.verifiedAt).run();
 return json({status:changed(r)?'release_registered':'already_registered'});
}
const labels={ko:'앱이 출시되었습니다!',en:'The app is now available!',ja:'アプリが公開されました！','zh-CN':'应用已发布！',ru:'Приложение выпущено!',fil:'Available na ang app!'};
async function purge(env){
 const db=env.DB;if(!await quota(db,'cleanup',2))return json({error:'quota_paused'},429);
 const r=await db.prepare('DELETE FROM subscriptions WHERE id IN (SELECT id FROM subscriptions WHERE expires_at<=? LIMIT 250)').bind(now()).run();
 return json({status:'cleaned',count:changed(r)});
}
async function dispatch(env){
 // Manual owner-only run. One send per invocation and at most 50 claimed sends/day.
 if(env.ENABLE_DISPATCH!=='true')return json({error:'dispatch_disabled'},503);
 const db=env.DB;if(!await quota(db,'dispatch',50))return json({error:'quota_paused'},429);
 const sub=await db.prepare(`SELECT s.id,s.app,s.platform,s.endpoint,s.p256dh,s.auth,s.lang,r.store_url
 FROM subscriptions s JOIN releases r ON r.app=s.app AND r.platform=s.platform LEFT JOIN dispatches d ON d.subscription_id=s.id
 WHERE d.subscription_id IS NULL AND s.expires_at>? AND s.consent_at<=r.verified_at ORDER BY s.consent_at LIMIT 1`).bind(now()).first();
 if(!sub)return json({status:'empty'});
 const claim=await db.prepare(`INSERT INTO dispatches(subscription_id,claimed_at,state)
 SELECT id,?,'claimed' FROM subscriptions WHERE id=? AND expires_at>? ON CONFLICT DO NOTHING`).bind(now(),sub.id,now()).run();
 if(!changed(claim))return json({status:'already_claimed'});
 // Do not retry an ambiguous/failed network request: duplicate delivery is worse.
 let state='failed';
 try{
   const active=await db.prepare('SELECT id FROM subscriptions WHERE id=? AND expires_at>?').bind(sub.id,now()).first();
   if(!active)return json({status:'skip'});
   const valid=subscriptionInput({app:sub.app,platform:sub.platform,lang:sub.lang,token:'A'.repeat(43),consent:true,subscription:{endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}}});
   const finalUrl=storeUrl(sub.store_url,sub.platform);if(!valid||!finalUrl)throw new Error('invalid');
   const details=await generateRequestDetails({endpoint:valid.endpoint,keys:{p256dh:valid.p256dh,auth:valid.auth}},JSON.stringify({title:'Kenneth App',body:APP_NAMES[sub.app]+': '+labels[sub.lang],url:finalUrl,tag:'release-'+sub.app+'-'+sub.platform}),{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
   const result=await fetch(valid.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'manual'});
   if(result.status===404||result.status===410){state='expired';await db.prepare('DELETE FROM subscriptions WHERE id=?').bind(sub.id).run()}
   else if(result.ok){state='sent'}
 }catch{}
 if(state!=='expired')await db.prepare('UPDATE dispatches SET state=? WHERE subscription_id=?').bind(state,sub.id).run();
 return json({status:state});
}

const testEnabled=env=>env.ENABLE_OWNER_TEST==='true'&&env.ENABLE_ALERTS!=='true'&&env.ENABLE_DISPATCH!=='true'&&!!env.DB&&validB64(env.VAPID_PUBLIC_KEY,87,87)&&validB64(env.VAPID_PRIVATE_KEY,43,43)&&typeof env.VAPID_SUBJECT==='string'&&env.VAPID_SUBJECT.startsWith('mailto:')&&typeof env.OWNER_SECRET==='string'&&env.OWNER_SECRET.length>=32;
const testHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; worker-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"};
const testHtml='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kenneth App private alert test</title><h1>출시 알림 1회 검증</h1><p>실제 출시 알림이 아닙니다. 이 브라우저에만 테스트 알림을 한 번 보냅니다. 공개 알림 가입은 꺼져 있습니다.</p><label>관리용 비밀값 <input id="secret" type="password" autocomplete="off"></label><button id="synthetic" type="button">합성 검증 (알림 안 보냄)</button><button id="send" type="button" disabled>이 브라우저에 테스트 알림 1회 보내기</button><button id="cleanup" type="button">테스트 알림 확인 후 구독 정리</button><p id="result" role="status"></p><script src="/owner-test/test.js"></script></html>';
const testScript="\n(()=>{'use strict';const $=id=>document.getElementById(id);let passed=false;\nconst output=s=>{$('result').textContent=s;};\nasync function api(path,body){const v=$('secret').value;if(!v)return {error:'secret_required'};const r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+v},body:JSON.stringify(body||{})});return r.json();}\n$('synthetic').addEventListener('click',async()=>{try{$('synthetic').disabled=true;const x=await api('/owner-test/selftest');passed=x.status==='passed';$('send').disabled=!passed;output(passed?'합성 암호화·서명 검사 통과. 실제 알림은 아직 보내지 않았습니다.':'검사 실패: '+(x.error||'미확인'));}catch{output('검사 실패');}finally{$('synthetic').disabled=false}});\n$('send').addEventListener('click',async()=>{if(!passed)return; $('send').disabled=true;try{if(!('Notification'in window)||!('serviceWorker'in navigator)||!('PushManager'in window))throw Error('unsupported');\nif(await Notification.requestPermission()!=='granted')throw Error('permission');\nconst reg=await navigator.serviceWorker.register('/owner-test/sw.js',{scope:'/owner-test/'});await navigator.serviceWorker.ready;\nconst cfg=await(await fetch('/owner-test/config',{cache:'no-store'})).json();if(!cfg.enabled)throw Error('disabled');\nconst k=Uint8Array.from(atob(cfg.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));\nlet sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:k});\nconst out=await api('/owner-test/send',{consent:true,subscription:sub.toJSON()});\noutput(out.status==='sent'?'푸시 서버 접수 성공. 이 브라우저의 실제 테스트 알림을 확인해 주세요.':'전송 결과: '+(out.error||out.status||'미확인'));\n}catch{output('테스트 알림을 전송하지 못했습니다.');}finally{$('secret').value='';}});\n$('cleanup').addEventListener('click',async()=>{try{const reg=await navigator.serviceWorker.getRegistration('/owner-test/');if(reg){const sub=await reg.pushManager.getSubscription();if(sub)await sub.unsubscribe();await reg.unregister();}output('테스트 구독을 정리했습니다.');}catch{output('정리 실패');}});\n})();\n"; 
const testSW="\nself.addEventListener('push',event=>{let x;try{x=event.data?.json();}catch{return;}if(x?.tag!=='kenneth-owner-test')return;event.waitUntil(self.registration.showNotification('Kenneth App 테스트',{body:'출시 알림 기능 테스트입니다. 실제 앱 출시는 아닙니다.',tag:'kenneth-owner-test'}));});\n";
async function ownerTest(req,env,url,origin){
 if(!testEnabled(env)||url.origin!==TEST_ORIGIN)return json({error:'not_enabled'},503);
 if(req.method==='GET'){
  if(url.pathname==='/owner-test/')return new Response(testHtml,{headers:{...testHeaders,'Content-Type':'text/html; charset=utf-8'}});
  if(url.pathname==='/owner-test/test.js'||url.pathname==='/owner-test/sw.js')return new Response(url.pathname.endsWith('sw.js')?testSW:testScript,{headers:{...testHeaders,'Content-Type':'text/javascript; charset=utf-8'}});
  if(url.pathname==='/owner-test/config')return json({enabled:true,publicKey:env.VAPID_PUBLIC_KEY});
 }
 if(req.method!=='POST'||origin!==TEST_ORIGIN||!await secretEqual(req.headers.get('authorization')?.replace(/^Bearer /,''),env.OWNER_SECRET))return json({error:'forbidden'},403);
 if(url.pathname==='/owner-test/selftest'){
  if(!await quota(env.DB,'owner-selftest',5))return json({error:'quota_paused'},429);
  try{const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
   const raw=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
   const to64=x=>btoa(String.fromCharCode(...x)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
   const keys={p256dh:to64(raw),auth:to64(crypto.getRandomValues(new Uint8Array(16)))};
   if(!await validateSubscriptionKeys(keys))throw Error('invalid');
   const r=await generateRequestDetails({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic-no-network',keys},'{"synthetic":true}',{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
   if(r.headers['Content-Encoding']!=='aes128gcm'||r.body.length<100)throw Error('invalid');
   await env.DB.prepare('INSERT INTO quotas(day,kind,used) VALUES(?,?,1) ON CONFLICT(day,kind) DO UPDATE SET used=1').bind(day(),'owner-selftest-passed').run();return json({status:'passed'});
  }catch{return json({error:'selftest_failed'},503);}
 }
 if(url.pathname==='/owner-test/send'){
  const v=await body(req);const p=subscriptionInput({...v,app:'bracketbud',platform:'android',lang:'ko',token:'A'.repeat(43)});
  if(!p||!await validateSubscriptionKeys({p256dh:p.p256dh,auth:p.auth}))return json({error:'invalid_subscription'},400);
  const verified=await env.DB.prepare('SELECT used FROM quotas WHERE day=? AND kind=?').bind(day(),'owner-selftest-passed').first();if(verified?.used!==1)return json({error:'synthetic_verification_required'},403);
  if(!await quota(env.DB,'owner-test-send',1))return json({error:'quota_paused'},429);
  try{const details=await generateRequestDetails({endpoint:p.endpoint,keys:{p256dh:p.p256dh,auth:p.auth}},JSON.stringify({tag:'kenneth-owner-test'}),{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY});
  const r=await fetch(p.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'manual'});if(r.ok)return json({status:'sent'});if(r.status>=300&&r.status<400)return json({error:'push_redirect_rejected'},502);return json({error:[400,401,403,404,410,429].includes(r.status)?'push_http_'+r.status:'push_not_accepted'},502);}catch{return json({error:'send_failed'},503);}
 }
 return json({error:'not_found'},404);
}
export default {
 async fetch(req,env){
  try{
   const u=new URL(req.url),origin=req.headers.get('origin');
   if(u.pathname.startsWith('/owner-test/'))return await ownerTest(req,env,u,origin);
   if(req.method==='OPTIONS')return origin===SITE?new Response(null,{status:204,headers:CORS}):new Response(null,{status:403});
   if(origin&&origin!==SITE)return json({error:'forbidden'},403);
   if(req.method==='GET'&&u.pathname==='/v1/config')return json(enabled(env)?{enabled:true,publicKey:env.VAPID_PUBLIC_KEY}:{enabled:false});
   if(req.method==='GET'&&u.pathname==='/v1/releases'&&env.DB){
     const cache=typeof caches!=='undefined'?caches.default:null;
     const key=new Request(u.origin+'/v1/releases');
     if(cache){const cached=await cache.match(key);if(cached)return cached}
     const list=await env.DB.prepare('SELECT app,platform,store_url,published_at FROM releases ORDER BY published_at DESC LIMIT 32').all();
     const response=new Response(JSON.stringify({releases:list.results||[]}),{headers:{...CORS,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60'}});
     if(cache){try{await cache.put(key,response.clone())}catch{}}
     return response;
   }
   if(req.method!=='POST')return json({error:'not_found'},404);
   if(u.pathname==='/v1/unsubscribe'&&origin===SITE&&env.DB){const v=await body(req);return unsubscribe(v,env)}
   if(!enabled(env))return json({error:'not_enabled'},503);
   if(u.pathname==='/v1/subscribe'){if(origin!==SITE)return json({error:'forbidden'},403);return subscribe(await body(req),env)}
   if(u.pathname==='/owner/release'||u.pathname==='/owner/dispatch'||u.pathname==='/owner/purge'){
     // Owner endpoints are deliberately not available to browser-origin requests.
     if(origin||!await secretEqual(req.headers.get('authorization')?.replace(/^Bearer /,''),env.OWNER_SECRET))return json({error:'forbidden'},403);
     if(u.pathname==='/owner/release')return release(await body(req),env);
     if(u.pathname==='/owner/purge')return purge(env);
     return dispatch(env);
   }
   return json({error:'not_found'},404);
  }catch{return json({error:'temporarily_unavailable'},503)}
 }
};
export {subscriptionInput,storeUrl,identityValid,dateValid,enabled,quota,secretEqual,body};
