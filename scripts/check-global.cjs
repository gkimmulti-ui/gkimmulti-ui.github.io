const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const apps=read('data/apps.json'),langs=read('data/languages.json'),translations=read('data/translations.json');
assert.equal(apps.length,23);assert.equal(langs.length,12);
for(const {code} of langs){
 for(const key of Object.keys(translations.en))assert.ok(translations[code][key],code+'/'+key);
 for(const app of apps)assert.ok(app.desc[code],app.slug+'/'+code);
 const html=fs.readFileSync(path.join(root,code==='ko'?'index.html':code+'/index.html'),'utf8');
 assert.ok(html.includes('id="translation-notice"'));
 assert.ok(html.includes('value="translate:bn"'));
 assert.ok(html.includes('value="translate:ta"'));
 assert.ok(!html.includes('[object Object]'));
 assert.ok(!html.includes('101동 809호'));
 assert.ok(html.includes('gkimmulti@gmail.com'));
}
// Exercise actual language navigation with URL construction and a constrained fake DOM.
let destination='';
const options=[...langs.map(l=>({value:l.code})),...Object.keys(read('data/extra-languages.json')).map(l=>({value:'translate:'+l}))];
const context={URL,window:{},document:{body:{dataset:{app:'littleheroes'}},getElementById:()=>({options})},location:{hash:'',assign:url=>{destination=url;}}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'assets/languages.js'),'utf8'),context);
context.window.kennethLanguage.navigate('hi');assert.equal(destination,'/hi/apps/littleheroes/');
context.window.kennethLanguage.navigate('ko');assert.equal(destination,'/apps/littleheroes/');
context.window.kennethLanguage.navigate('translate:bn');
let url=new URL(destination);assert.equal(url.hostname,'translate.google.com');assert.equal(url.searchParams.get('tl'),'bn');assert.equal(url.searchParams.get('u'),'https://gkimmulti-ui.github.io/en/apps/littleheroes/');
context.document.body.dataset={};context.window.kennethLanguage.navigate('es');assert.equal(destination,'/es/');
context.window.kennethLanguage.navigate('javascript:alert(1)');assert.equal(destination,'/es/');
const {card,heroEntries}=require('../assets/home.js');
assert.equal(heroEntries().length,23);
for(const app of apps)for(const {code} of langs){
 const html=card(app,code);assert.ok(html.includes(app.playUrl));assert.ok(!html.includes('[object Object]'));
 if(!['ko','en','ja','zh','ru','fil'].includes(code))assert.ok(html.includes('play-en.png'));
}
console.log('PASS: 23 apps, 12 complete UI/description locales, safe language navigation, 23 hero images and existing store badges.');
