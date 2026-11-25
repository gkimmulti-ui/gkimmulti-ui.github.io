
/* Standard Web Push: RFC 8291 / 8188 payload encryption, RFC 8292 VAPID.
   No external dependencies. All private operations use Web Crypto. */
const enc=new TextEncoder();
const concat=(...parts)=>{const out=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let at=0;for(const x of parts){out.set(x,at);at+=x.length}return out};
const b64=x=>btoa(String.fromCharCode(...x)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
function dec(s,len){if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid key');const b=Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));if(b.length!==len||b64(b)!==s)throw Error('invalid key');return b;}
async function hkdf(value,salt,info,length){const key=await crypto.subtle.importKey('raw',value,'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));}
async function publicKey(raw,algorithm){if(raw.length!==65||raw[0]!==4)throw Error('invalid public key');return crypto.subtle.importKey('raw',raw,{name:algorithm,namedCurve:'P-256'},false,algorithm==='ECDSA'?['verify']:[]);}
function jwk(q,d){if(q.length!==65||q[0]!==4||d.length!==32)throw Error('invalid key');return {kty:'EC',crv:'P-256',x:b64(q.slice(1,33)),y:b64(q.slice(33)),d:b64(d),ext:false};}
async function validateSubscriptionKeys(keys){try{await publicKey(dec(keys.p256dh,65),'ECDH');dec(keys.auth,16);return true}catch{return false}}
async function encryptPayload(keys,payload,{sender,salt}={}){
 const ua=dec(keys.p256dh,65),auth=dec(keys.auth,16),receiver=await publicKey(ua,'ECDH');
 const pair=sender||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
 const own=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:receiver},pair.privateKey,256));
 const initial=await hkdf(shared,auth,concat(enc.encode('WebPush: info'),Uint8Array.of(0),ua,own),32);
 const ivSalt=salt||crypto.getRandomValues(new Uint8Array(16));if(ivSalt.length!==16)throw Error('invalid salt');
 const [cek,nonce]=await Promise.all([hkdf(initial,ivSalt,enc.encode('Content-Encoding: aes128gcm\0'),16),hkdf(initial,ivSalt,enc.encode('Content-Encoding: nonce\0'),12)]);
 const plain=enc.encode(payload);if(plain.length>3993)throw Error('payload too large');
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce,tagLength:128},key,concat(plain,Uint8Array.of(2))));
 // RFC 8188: salt (16), big-endian record size (4), key ID size (1), key ID, encrypted record.
 return concat(ivSalt,Uint8Array.of(0,0,16,0,65),own,ciphertext);
}
async function vapidAuthorization(endpoint,details){
 const pub=dec(details.publicKey,65),d=dec(details.privateKey,32);
 const key=await crypto.subtle.importKey('jwk',jwk(pub,d),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 const verifier=await publicKey(pub,'ECDSA');
 const token=b64(enc.encode(JSON.stringify({typ:'JWT',alg:'ES256'})))+'.'+b64(enc.encode(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:details.subject})));
 const sig=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(token)));
 if(sig.length!==64||!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verifier,sig,enc.encode(token)))throw Error('invalid VAPID key pair');
 return 'vapid t='+token+'.'+b64(sig)+', k='+details.publicKey;
}
async function generateRequestDetails(subscription,payload,details){
 if(typeof payload!=='string'||typeof details?.subject!=='string'||!details.subject.startsWith('mailto:'))throw Error('invalid push');
 const [body,authorization]=await Promise.all([encryptPayload(subscription.keys,payload),vapidAuthorization(subscription.endpoint,details)]);
 return {headers:{'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream','TTL':'86400','Urgency':'normal','Authorization':authorization},body};
}
export {encryptPayload,vapidAuthorization,generateRequestDetails,validateSubscriptionKeys};
