/* Author-reviewed UI and concise app translations; no runtime translation API. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const write=(file,data)=>fs.writeFileSync(path.join(root,file),JSON.stringify(data,null,2)+'\n');
const added=['hi','es','pt','fr','de','id'];
const original=['ko','en','ja','zh','ru','fil'];
function table(file,langs){
 return fs.readFileSync(path.join(root,file),'utf8').trim().split(/\r?\n/).map(line=>{
  const [key,...values]=line.split('\t');
  if(values.length!==langs.length||values.some(v=>!v.trim()))throw Error('Invalid translation row: '+key);
  return [key,Object.fromEntries(langs.map((l,i)=>[l,values[i]]))];
 });
}
const translations=read('data/translations.json');
for(const l of added)translations[l]={};
for(const [key,values] of table('data/global-ui.tsv',added))for(const l of added)translations[l][key]=values[l];
const extraCopy={
 ko:['다른 언어 — Google 번역','외부 번역 서비스로 이동합니다. 텍스트는 자동 번역되며 스크린샷 속 글자는 바뀌지 않습니다.'],
 en:['More languages — Google Translate','Opens an external translation service. Text is translated automatically; screenshot artwork stays unchanged.'],
 ja:['他の言語 — Google翻訳','外部の翻訳サービスを開きます。テキストは自動翻訳されますが、画像内の文字は変わりません。'],
 zh:['更多语言 — Google翻译','打开外部翻译服务。文字将自动翻译，截图中的文字不会改变。'],
 ru:['Другие языки — Google Переводчик','Откроется внешний сервис перевода. Текст переводится автоматически; изображения не меняются.'],
 fil:['Iba pang wika — Google Translate','Magbubukas ng panlabas na serbisyo ng pagsasalin. Awtomatikong isasalin ang teksto; hindi magbabago ang mga screenshot.']
};
for(const [l,[more,notice]] of Object.entries(extraCopy)){translations[l]['languages.more']=more;translations[l]['languages.notice']=notice;}
for(const l of added)for(const key of Object.keys(translations.en))if(!translations[l][key])throw Error('Missing UI translation: '+l+'/'+key);
const apps=read('data/apps.json');
const sources=read('data/store-sources.json');
// Public contact on the homepage remains the developer's chosen brand/email/URL.
const clean=text=>text.replace(/\r\n/g,'\n').split(/\n-{3,}\s*\n/)[0].trim();
for(const source of sources)for(const listing of Object.values(source.localized||{}))listing.description=clean(listing.description);
for(const app of apps){
 const source=sources.find(s=>s.slug===app.slug);
 for(const l of original){
  const listing=source.localized[l];
  app.playDescription[l]=clean(listing.description);
  const paragraph=app.playDescription[l].split(/\n\s*\n/)[0];
  app.desc[l]=paragraph.length>500?listing.summary:paragraph;
  if(l!=='en'&&app.playDescription[l]===clean(source.localized.en.description))delete app.playDescription[l];
 }
 // The store does not provide Korean-only app descriptions in every language.
 // Retain previously authored translations if a store response is still Korean.
 if(app.slug==='maeum')for(const l of original.filter(l=>l!=='ko')){
  const copy={en:'Record cash gifts given or received at weddings and other family events, and review your history by person.',ja:'結婚式や家族の行事で贈った・受け取ったお祝い金などを記録し、相手ごとに履歴を確認できます。',zh:'记录婚礼及其他家庭活动中送出或收到的礼金，并按联系人查看记录。',ru:'Записывайте денежные подарки на свадьбах и семейных событиях и просматривайте историю по людям.',fil:'Itala ang perang regalo na ibinigay o natanggap sa kasal at iba pang okasyon, at tingnan ang tala bawat tao.'};
  app.desc[l]=copy[l];app.headline[l]=copy[l];delete app.playDescription[l];
 }
}
for(const [slug,values] of table('data/release-copy.tsv',original)){
 const app=apps.find(a=>a.slug===slug);if(!app)throw Error('Missing release '+slug);
 for(const l of original){app.desc[l]=values[l];app.headline[l]=app.name[l]||app.name.en;}
}
for(const [slug,values] of table('data/global-app-copy.tsv',added)){
 const app=apps.find(a=>a.slug===slug);if(!app)throw Error('Unknown app '+slug);
 for(const l of added){
  app.desc[l]=values[l];app.headline[l]=app.name.en||app.name;
  app.category[l]=translations[l]['filter.'+app.group];app.tags[l]=[];
 }
}
for(const app of apps)for(const l of [...original,...added])if(!app.desc[l])throw Error('Missing app translation: '+app.slug+'/'+l);
write('data/translations.json',translations);write('data/apps.json',apps);write('data/store-sources.json',sources);
write('data/hero.json',[...['levelday','littleheroes','nightmarket','pocketdino','pocketjesus','rateshift'].map(slug=>({slug,platform:'Google Play',index:0}))]);
console.log('Prepared '+apps.length+' apps in '+Object.keys(translations).length+' static languages.');
