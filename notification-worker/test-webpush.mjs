
import assert from 'node:assert/strict';
import {encryptPayload,vapidAuthorization,generateRequestDetails,validateSubscriptionKeys} from './webpush-native.mjs';
const bytes=s=>new Uint8Array(Buffer.from(s,'base64url'));
const b64=b=>Buffer.from(b).toString('base64url');
// RFC 8291 Section 5 public interoperability example (not production credentials).
const receiver='BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const sender='BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const d='yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const raw=bytes(sender), privateKey=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:b64(raw.slice(1,33)),y:b64(raw.slice(33)),d,ext:true},{name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
const publicKey=await crypto.subtle.importKey('raw',raw,{name:'ECDH',namedCurve:'P-256'},true,[]);
const expected='DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';
const keys={p256dh:receiver,auth:'BTBZMqHH6r4Tts7J_aSIgg'};
assert.equal(b64(await encryptPayload(keys,'When I grow up, I want to be a watermelon',{sender:{privateKey,publicKey},salt:bytes(expected).slice(0,16)})),expected);
assert.equal(await validateSubscriptionKeys(keys),true);
assert.equal(await validateSubscriptionKeys({p256dh:'A'.repeat(87),auth:'B'.repeat(22)}),false);
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const pub=b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),priv=(await crypto.subtle.exportKey('jwk',pair.privateKey)).d;
const details={publicKey:pub,privateKey:priv,subject:'mailto:test@example.invalid'};
const endpoint='https://fcm.googleapis.com/fcm/send/synthetic';
const auth=await vapidAuthorization(endpoint,details);
const token=auth.match(/^vapid t=([^,]+), k=/)[1];const parts=token.split('.');
const claims=JSON.parse(Buffer.from(parts[1],'base64url'));assert.equal(claims.aud,'https://fcm.googleapis.com');assert.equal(claims.sub,details.subject);
assert.ok(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pair.publicKey,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])));
const req=await generateRequestDetails({endpoint,keys},JSON.stringify({test:true}),details);assert.equal(req.headers['Content-Encoding'],'aes128gcm');assert.equal(req.headers.TTL,'86400');assert.ok(req.body.length>100);
await assert.rejects(vapidAuthorization(endpoint,{...details,privateKey:d}));
console.log('PASS: RFC 8291 interoperability vector, key validation, VAPID ES256 signature, mismatch rejection, encrypted request generation (no network).');
