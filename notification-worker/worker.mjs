import webpush from 'web-push';
const SITE='https://gkimmulti-ui.github.io';
const APPS=new Set(['bracketbud','phrasepip','bagsum','roomnobi','rowmio','dottomint','morsepip','hushmio','zodimi','whalopip','sylvomi','robipip','meowbini','halopip','drakumi','boopiri']);
const LANGS=new Set(['ko','en','ja','zh-CN','ru','fil']);
const HOSTS=new Set(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com']);
const encoder=new TextEncoder();
const now=()=>new Date().toISOString();
const day=()=>now().slice(0,10);
const changed=r=>r?.meta?.changes??0;
const CORS={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{...CORS,'Content-Type':'application/json; charset=utf-8'}})}
function validB64(s,min,max){return typeof s==='string'&&s.length>=min&&s.length<=max&&/^[A-Za-z0-9_-]+$/.test(s)}
function subscriptionInput(v){
  if(!v||!APPS.has(v.app)||!LANGS.has(v.lang)||!validB64(v.token,43,43)||v.consent!==true)return null;
  if(!v.subscription||typeof v.subscription.endpoint!=='string'||v.subscription.endpoint.length>2048)return null;
  let u;try{u=new URL(v.subscription.endpoint)}catch{return null}
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!HOSTS.has(u.hostname)||u.pathname.length<2)return null;
  const keys=v.subscription.keys;
  if(!validB64(keys?.p256dh,87,87)||!validB64(keys?.auth,22,22))return null;
  return {app:v.app,lang:v.lang,token:v.token,endpoint:u.href,p256dh:keys.p256dh,auth:keys.auth}
}
function storeUrl(raw){
  if(typeof raw!=='string'||raw.length>2048)return null;
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
    if(u.hostname==='play.google.com'&&u.pathname==='/store/apps/details'){
      const id=u.searchParams.get('id'); if(!id||!/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(id))return null;
      return 'https://play.google.com/store/apps/details?id='+id;
    }
    if(u.hostname==='apps.apple.com'&&/^\/[a-z]{2}\/app\/(?:[a-zA-Z0-9_%.-]+\/)?id[0-9]+$/.test(u.pathname))return 'https://apps.apple.com'+u.pathname;
  }catch{}
  return null;
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
 const p=subscriptionInput(v);if(!p)return json({error:'invalid_subscription'},400);
 const db=env.DB;
 if(!await quota(db,'sub-write',400))return json({error:'quota_paused'},429);
 const release=await db.prepare('SELECT store_url FROM releases WHERE app=?').bind(p.app).first();
 if(release)return json({status:'released',url:release.store_url});
 const h=await hash(p.token),id=await hash(p.app+'\n'+p.endpoint),at=now(),exp=new Date(Date.now()+180*86400000).toISOString();
 // Atomic insert bounded by total active subscriptions and absence of a publication.
 const r=await db.prepare(`INSERT INTO subscriptions(id,app,endpoint,p256dh,auth,token_hash,lang,consent_at,expires_at)
 SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM subscriptions)<5000 AND NOT EXISTS(SELECT 1 FROM releases WHERE app=?)
 ON CONFLICT(app,endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,lang=excluded.lang,expires_at=excluded.expires_at WHERE subscriptions.token_hash=excluded.token_hash AND NOT EXISTS(SELECT 1 FROM releases WHERE app=excluded.app)`).bind(id,p.app,p.endpoint,p.p256dh,p.auth,h,p.lang,at,exp,p.app).run();
 if(!changed(r))return json({error:'registration_unavailable'},409);
 return json({status:'subscribed'});
}
async function unsubscribe(v,env){
 if(!v||!APPS.has(v.app)||!validB64(v.token,43,43))return json({error:'invalid_request'},400);
 const h=await hash(v.token);
 await env.DB.prepare('DELETE FROM subscriptions WHERE token_hash=? AND app=?').bind(h,v.app).run();
 return json({status:'unsubscribed'});
}
async function release(v,env){
 if(!v||!APPS.has(v.app)||v.publicationVerified!==true||!dateValid(v.publishedAt)||!dateValid(v.verifiedAt)||Date.parse(v.verifiedAt)<Date.parse(v.publishedAt))return json({error:'verified_publication_required'},400);
 const url=storeUrl(v.storeUrl);if(!url)return json({error:'invalid_store_url'},400);
 // Owner must verify actual production availability outside this endpoint.
 // Approval, private test links, and any unverified date must never be submitted.
 const r=await env.DB.prepare('INSERT INTO releases(app,store_url,published_at,verified_at) VALUES(?,?,?,?) ON CONFLICT(app) DO NOTHING').bind(v.app,url,v.publishedAt,v.verifiedAt).run();
 return json({status:changed(r)?'release_registered':'already_registered'});
}
const labels={ko:'앱이 출시되었습니다!',en:'The app is now available!',ja:'アプリが公開されました！','zh-CN':'应用已发布！',ru:'Приложение выпущено!',fil:'Available na ang app!'};
async function dispatch(env){
 // Manual owner-only run. One send per invocation and at most 50 claimed sends/day.
 if(env.ENABLE_DISPATCH!=='true')return json({error:'dispatch_disabled'},503);
 const db=env.DB;if(!await quota(db,'dispatch',50))return json({error:'quota_paused'},429);
 const sub=await db.prepare(`SELECT s.id,s.app,s.endpoint,s.p256dh,s.auth,s.lang,r.store_url
 FROM subscriptions s JOIN releases r ON r.app=s.app LEFT JOIN dispatches d ON d.subscription_id=s.id
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
   const valid=subscriptionInput({app:sub.app,lang:sub.lang,token:'A'.repeat(43),consent:true,subscription:{endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}}});
   const finalUrl=storeUrl(sub.store_url);if(!valid||!finalUrl)throw new Error('invalid');
   const details=webpush.generateRequestDetails({endpoint:valid.endpoint,keys:{p256dh:valid.p256dh,auth:valid.auth}},JSON.stringify({title:'Kenneth App',body:sub.app+': '+labels[sub.lang],url:finalUrl,tag:'release-'+sub.app}),{TTL:86400,urgency:'normal',contentEncoding:'aes128gcm',vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}});
   const result=await fetch(valid.endpoint,{method:'POST',headers:details.headers,body:details.body,redirect:'error'});
   if(result.status===404||result.status===410){state='expired';await db.prepare('DELETE FROM subscriptions WHERE id=?').bind(sub.id).run()}
   else if(result.ok){state='sent'}
 }catch{}
 if(state!=='expired')await db.prepare('UPDATE dispatches SET state=? WHERE subscription_id=?').bind(state,sub.id).run();
 return json({status:state});
}
export default {
 async fetch(req,env){
  try{
   const u=new URL(req.url),origin=req.headers.get('origin');
   if(req.method==='OPTIONS')return origin===SITE?new Response(null,{status:204,headers:CORS}):new Response(null,{status:403});
   if(origin&&origin!==SITE)return json({error:'forbidden'},403);
   if(req.method==='GET'&&u.pathname==='/v1/config')return json(enabled(env)?{enabled:true,publicKey:env.VAPID_PUBLIC_KEY}:{enabled:false});
   if(req.method==='GET'&&u.pathname==='/v1/releases'&&env.DB){
     const list=await env.DB.prepare('SELECT app,store_url,published_at FROM releases ORDER BY published_at DESC LIMIT 16').all();
     return json({releases:list.results||[]});
   }
   if(req.method!=='POST')return json({error:'not_found'},404);
   if(u.pathname==='/v1/unsubscribe'&&origin===SITE&&env.DB){const v=await body(req);return unsubscribe(v,env)}
   if(!enabled(env))return json({error:'not_enabled'},503);
   if(u.pathname==='/v1/subscribe'){if(origin!==SITE)return json({error:'forbidden'},403);return subscribe(await body(req),env)}
   if(u.pathname==='/owner/release'||u.pathname==='/owner/dispatch'){
     // Owner endpoints are deliberately not available to browser-origin requests.
     if(origin||!await secretEqual(req.headers.get('authorization')?.replace(/^Bearer /,''),env.OWNER_SECRET))return json({error:'forbidden'},403);
     if(u.pathname==='/owner/release')return release(await body(req),env);
     return dispatch(env);
   }
   return json({error:'not_found'},404);
  }catch{return json({error:'temporarily_unavailable'},503)}
 }
};
export {subscriptionInput,storeUrl,dateValid,enabled,quota,secretEqual,body};
