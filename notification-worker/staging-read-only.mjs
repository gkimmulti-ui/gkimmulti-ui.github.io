// Deliberately fail-closed staging probe. No subscriptions or pushes accepted.
const SITE='https://gkimmulti-ui.github.io';
const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':SITE,'Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const result=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
export default {async fetch(req,env){
 const u=new URL(req.url),origin=req.headers.get('origin');
 if(origin&&origin!==SITE)return result({error:'forbidden'},403);
 if(req.method==='GET'&&u.pathname==='/v1/config')return result({enabled:false,stage:'database-verification'});
 if(req.method==='GET'&&u.pathname==='/v1/releases'){
  try{const rows=await env.DB.prepare('SELECT app,platform,store_url,published_at FROM releases ORDER BY published_at DESC LIMIT 32').all();return result({releases:rows.results||[]})}catch{return result({error:'temporarily_unavailable'},503)}
 }
 if(req.method==='POST')return result({error:'not_enabled'},503);
 return result({status:'staging_disabled'});
}};
