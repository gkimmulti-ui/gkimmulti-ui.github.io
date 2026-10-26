const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const apps=require('../data/apps.json');
const translations=require('../data/translations.json');
const hero=require('../data/hero.json');
const sources=require('../data/store-sources.json');
const {site}=require('../data/search-config.json');
const {card,filters,escape,heroEntries,heroSlides,homePath,appPath}=require('../assets/home.js');
const languages=['ko','en','ja','zh','ru','fil'];
const languageNames={ko:'한국어',en:'English',ja:'日本語',zh:'中文',ru:'Русский',fil:'Filipino'};
const htmlLang={ko:'ko',en:'en',ja:'ja',zh:'zh-CN',ru:'ru',fil:'fil'};
// hreflang uses ISO 639-1; Filipino pages use the supported Tagalog code.
const hreflang={...htmlLang,fil:'tl'};
const locales={ko:'ko_KR',en:'en_US',ja:'ja_JP',zh:'zh_CN',ru:'ru_RU',fil:'fil_PH'};
const today=process.env.BUILD_DATE||new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(today))throw Error('BUILD_DATE must be YYYY-MM-DD');
const local=(value,lang)=>typeof value==='object'&&!Array.isArray(value)?value[lang]??value.en??value.ko:value;
const t=(key,lang)=>translations[lang][key]??translations.en[key]??'';
const rootAssets=html=>html.replace(/(src|href)="((?:assets|images)\/[^\"]*)"/g,'$1="/$2"');
const abs=pathname=>site+pathname;
const json=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const qrManifest=require('../data/store-qr.json');
for(const app of apps)for(const [store,key]of[['play','playUrl'],['appstore','appStoreUrl']]){
 const qr=qrManifest.find(entry=>entry.app===app.slug&&entry.store===store);
 if(app[key]?(!qr||qr.url!==app[key]||!fs.existsSync(path.join(root,qr.image))):qr)throw Error(`QR code out of date: ${app.slug}/${store}`);
}
const template=fs.readFileSync(path.join(root,'src/index.template.html'),'utf8');
const oldManifestPath=path.join(root,'data/page-manifest.json');
const previous=fs.existsSync(oldManifestPath)?JSON.parse(fs.readFileSync(oldManifestPath,'utf8')):[];
const pages=[];
function alternateLinks(lang,app){return [...languages,'x-default'].map(code=>`<link rel="alternate" hreflang="${code==='x-default'?code:hreflang[code]}" href="${abs(app?appPath(app,code==='x-default'?'ko':code):homePath(code==='x-default'?'ko':code))}" />`).join('\n  ');}
function languageLinks(lang,app){return languages.map(code=>`<a href="${app?appPath(app,code):homePath(code)}" lang="${htmlLang[code]}" hreflang="${hreflang[code]}"${code===lang?' aria-current="page"':''}>${languageNames[code]}</a>`).join('');}
const categories={savecity:'FinanceApplication',howlong:'UtilitiesApplication',starstock:'GameApplication',deepdig:'GameApplication',quizaura:'EntertainmentApplication',snapclean:'UtilitiesApplication',lumiday:'LifestyleApplication',maeum:'FinanceApplication',snaplog:'MultimediaApplication',lightwall:'LifestyleApplication',holyground:'LifestyleApplication',chaengkim:'LifestyleApplication',slimjoy:'MultimediaApplication',lightled:'UtilitiesApplication',lotto:'UtilitiesApplication',kingdom:'GameApplication','16mode':'LifestyleApplication'};
function schema(lang,app,title,description,url){
 const publisher={'@type':'Organization','@id':site+'/#publisher',name:'Kenneth App',alternateName:'케네스앱',url:site+'/',logo:site+'/images/kenneth-logo.png',email:'gkimmulti@gmail.com'};
 const website={'@type':'WebSite','@id':site+'/#website',url:site+'/',name:'Kenneth App',alternateName:'케네스앱',publisher:{'@id':publisher['@id']},inLanguage:languages.map(l=>htmlLang[l])};
 const page={'@type':app?'WebPage':'CollectionPage','@id':url+'#page',url,name:title,description,inLanguage:htmlLang[lang],isPartOf:{'@id':website['@id']},publisher:{'@id':publisher['@id']}};
 const graph=[publisher,website,page];
 if(app){
  const storeName=sources.find(s=>s.slug===app.slug)?.storeTitle;
  const software={'@type':'MobileApplication','@id':url+'#app',name:local(app.name,lang),url,description:local(app.desc,lang),image:site+'/'+app.icon,screenshot:app.screenshots.map(s=>site+'/'+s.src),applicationCategory:categories[app.slug]||'UtilitiesApplication',operatingSystem:app.appStoreUrl?'Android, iOS':'Android',installUrl:[app.playUrl,app.appStoreUrl].filter(Boolean),sameAs:[app.playUrl,app.appStoreUrl].filter(Boolean),author:{'@id':publisher['@id']},mainEntityOfPage:{'@id':page['@id']}};
  if(storeName&&storeName!==software.name)software.alternateName=storeName;
  // Ratings and prices are intentionally omitted without current verified evidence.
  page.mainEntity={'@id':software['@id']};
  const breadcrumb={'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[{'@type':'ListItem',position:1,name:'Kenneth App',item:abs(homePath(lang))},{'@type':'ListItem',position:2,name:software.name,item:url}]};
  page.breadcrumb={'@id':breadcrumb['@id']};graph.push(software,breadcrumb);
 }else{
  const list={'@type':'ItemList','@id':url+'#apps',name:t('nav.apps',lang),numberOfItems:apps.length,itemListElement:apps.map((a,i)=>({'@type':'ListItem',position:i+1,name:local(a.name,lang),url:abs(appPath(a,lang))}))};
  page.mainEntity={'@id':list['@id']};graph.push(list);
 }
 return {'@context':'https://schema.org','@graph':graph};
}
function detailContent(app,lang){
 const name=escape(local(app.name,lang));
 let appCard=card(app,lang).replace(/<div class="app-head">[\s\S]*?<\/div><\/div>\s*(?=<div class="gallery-wrap">)/,'').replace(/<a class="app-detail-link"[\s\S]*?<\/a>/,'').replace(/<h4>(.*?)<\/h4>/,'<h2>$1</h2>').replace('aria-labelledby="name-'+app.slug+'"','aria-labelledby="detail-title"');
 const storeName=sources.find(s=>s.slug===app.slug)?.storeTitle;
 if(lang==='ko'&&storeName&&storeName!==local(app.name,lang))appCard=appCard.replace('<div class="app-downloads">',`<p class="store-listing-name">${escape(t('seo.storeName',lang))}: ${escape(storeName)}</p><div class="app-downloads">`);
 const related=[...apps.filter(a=>a.slug!==app.slug&&a.group===app.group),...apps.filter(a=>a.slug!==app.slug&&a.group!==app.group)].slice(0,3);
 return `<main id="main" class="container detail-main app-detail"><nav aria-label="${escape(t('seo.home',lang))}"><ol class="breadcrumbs"><li><a href="${homePath(lang)}">Kenneth App</a></li><li><a href="${homePath(lang)}#apps">${escape(t('nav.apps',lang))}</a></li><li aria-current="page">${name}</li></ol></nav><div class="detail-heading"><img src="/${app.icon}" alt="" width="84" height="84"><div><p class="eyebrow">${escape(local(app.category,lang))}</p><h1 id="detail-title">${name}</h1><p>${escape(local(app.headline,lang))}</p></div></div>${appCard}<section class="related-apps" aria-labelledby="related-title"><h2 id="related-title">${escape(t('seo.related',lang))}</h2><div class="related-grid">${related.map(a=>`<a class="related-app" href="${appPath(a,lang)}"><img src="/${a.icon}" alt="" width="40" height="40" loading="lazy"><span><strong>${escape(local(a.name,lang))}</strong><small>${escape(local(a.category,lang))}</small></span></a>`).join('')}</div></section></main>`;
}
function render(lang,app){
 const pathname=app?appPath(app,lang):homePath(lang),url=abs(pathname);
 const title=app?`${local(app.name,lang)} - ${local(app.category,lang)} | Kenneth App`:t('meta.title',lang);
 const fullDescription=app?`${local(app.name,lang)}. ${local(app.desc,lang)}`:t('meta.desc',lang);
 const description=Array.from(fullDescription).length>180?Array.from(fullDescription).slice(0,177).join('')+'…':fullDescription;
 let html=template;
 if(app){
  html=html.replace(/<main id="main">[\s\S]*?<\/main>/,detailContent(app,lang));
  html=html.replace(/  <script src="assets\/catalog\.js[^\n]*\n/,'').replace('assets/home.js?','assets/detail.js?');
  html=html.replace(/  <link rel="preload" as="image"[^\n]*\n/,'');
  html=html.replace('<body data-homepage-version="2026-10-redesign">',`<body data-app="${app.slug}">`);
  html=html.replace(/href="#(apps|about|contact)"/g,`href="${homePath(lang)}#$1"`);
 }else{
  html=html.replace('{{CARDS}}',apps.map(a=>card(a,lang)).join('\n')).replace('{{FILTERS}}',filters(lang));
  html=html.replace('{{HERO_SLIDES}}',heroSlides(lang)).replace('{{HERO_PRELOAD}}',heroEntries()[0].shot.thumb);
  html=html.replace('{{ICONS}}',apps.map(a=>`<a href="#app-${a.slug}" aria-label="${escape(local(a.name,lang))}"><img src="/${a.icon}" alt="${escape(local(a.name,lang))}" width="38" height="38" loading="lazy"></a>`).join(''));
 }
 html=html.replaceAll('{{HOME_PATH}}',homePath(lang)).replace('{{ALTERNATES}}',alternateLinks(lang,app)).replace('{{LANGUAGE_LINKS}}',languageLinks(lang,app));
 html=html.replaceAll('{{APP_COUNT}}',String(apps.length)).replaceAll('{{APP_RANGE}}','01—'+String(apps.length).padStart(2,'0'));
 html=html.replace(/<html[^>]*>/,`<html lang="${htmlLang[lang]}" data-locale="${lang}">`);
 html=html.replace(/<title>[^<]*<\/title>/,`<title>${escape(title)}</title>`);
 for(const [attribute,key,value]of[['name','description',description],['property','og:title',title],['property','og:description',description],['property','og:url',url],['property','og:locale',locales[lang]],['name','twitter:title',title],['name','twitter:description',description]]){
  const pattern=new RegExp('(<meta '+attribute+'="'+key+'"[^>]*content=")[^"]*');html=html.replace(pattern,(_m,start)=>start+escape(value));
 }
 html=html.replace(/(<link rel="canonical" href=")[^"]*/,(_m,start)=>start+url);
 html=html.replace(/  <meta property="og:locale:alternate"[^\n]*\n/g,'');
 html=html.replace('  <meta name="twitter:card"',languages.filter(code=>code!==lang).map(code=>'  <meta property="og:locale:alternate" content="'+locales[code]+'" />\n').join('')+'  <meta name="twitter:card"');
 if(app){html=html.replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*/g,(_m,start)=>start+site+'/'+app.icon).replace(/  <meta property="og:image:(width|height)"[^\n]*\n/g,'');}
 html=html.replace(/  <meta name="keywords"[^\n]*\n/,'');
 html=html.replace(/(<script type="application\/ld\+json" id="ld-json">)[\s\S]*?(<\/script>)/,(_m,a,b)=>a+json(schema(lang,app,title,description,url))+b);
 html=html.replace(/(<([a-z0-9]+)\b[^>]*data-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/g,(_m,start,tag,key,_old,end)=>start+escape(t(key,lang))+end);
 html=html.replace(/<[^>]+data-i18n-label="([^"]+)"[^>]*>/g,(tag,key)=>tag.replace(/aria-label="[^"]*"/,'aria-label="'+escape(t(key,lang))+'"'));
 html=html.replace('placeholder="앱 이름이나 기능 검색"','placeholder="'+escape(t('search.label',lang))+'"').replace(/(<span id="result-count"[^>]*>)[^<]*/,(_m,start)=>start+apps.length+' '+escape(t('results',lang)));
 html=html.replace(`<option value="${lang}">`,`<option value="${lang}" selected>`);
 return {html:rootAssets(html).replace(/[ \t]+$/gm,''),pathname,url,lang,app};
}
function writePage(record){
 if(/\{\{[A-Z_]+\}\}/.test(record.html))throw Error('Unresolved template placeholder '+record.url);
 const file=record.pathname.slice(1)+'index.html';
 const sha256=crypto.createHash('sha256').update(record.html).digest('hex');
 const old=previous.find(p=>p.url===record.url);
 const lastmod=old?.sha256===sha256?old.lastmod:today;
 fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),record.html);
 pages.push({url:record.url,path:file,lang:record.lang,app:record.app?.slug||null,lastmod,sha256});
}
for(const lang of languages){writePage(render(lang));for(const app of apps)writePage(render(lang,app));}
fs.writeFileSync(path.join(root,'assets/catalog.js'),'/* Generated by node scripts/build.cjs */\nconst KENNETH_DATA = '+json({apps,translations,hero})+';\n');
fs.writeFileSync(oldManifestPath,JSON.stringify(pages,null,2)+'\n');
// Only content changes advance lastmod; a no-op rebuild leaves dates intact.
const sitemapEntries=pages.map(page=>{
 const app=apps.find(a=>a.slug===page.app);
 const alternates=[...languages,'x-default'].map(code=>`    <xhtml:link rel="alternate" hreflang="${code==='x-default'?code:hreflang[code]}" href="${abs(app?appPath(app,code==='x-default'?'ko':code):homePath(code==='x-default'?'ko':code))}" />`).join('\n');
 const images=app?app.screenshots.map(s=>`    <image:image><image:loc>${site}/${escape(s.src)}</image:loc></image:image>`).join('\n'):'';
 return `  <url>\n    <loc>${escape(page.url)}</loc>\n    <lastmod>${page.lastmod}</lastmod>\n${alternates}\n${images}\n  </url>`;
});
// Existing app privacy/terms documents retain their paths and actual git dates.
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')&&!['index.html','404.html'].includes(f)&&!/^google|^naver/.test(f))){
 let date;try{date=execFileSync('git',['log','-1','--format=%cs','--',file],{cwd:root,encoding:'utf8'}).trim();}catch{}
 sitemapEntries.push(`  <url><loc>${site}/${escape(file)}</loc>${date?'<lastmod>'+date+'</lastmod>':''}</url>`);
}
fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+sitemapEntries.join('\n')+'\n</urlset>\n');
const feedItems=apps.map(app=>{
 const page=pages.find(p=>p.app===app.slug&&p.lang==='ko');
 const body=[app.headline.ko,app.desc.ko,...app.tags.ko,app.note?.ko,app.storeNotice?.ko].filter(Boolean).join('\n\n');
 return `<item><title>${escape(app.name)}</title><link>${escape(page.url)}</link><guid isPermaLink="true">${escape(page.url)}</guid><description>${escape(body)}</description><pubDate>${new Date(page.lastmod+'T00:00:00+09:00').toUTCString()}</pubDate></item>`;
}).join('\n');
fs.writeFileSync(path.join(root,'feed.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>케네스앱 · Kenneth App</title><link>${site}/</link><description>${escape(t('meta.desc','ko'))}</description><language>ko</language><atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>${feedItems}</channel></rss>\n`);
console.log(`Built ${pages.length} indexable pages (${languages.length} languages × ${apps.length} apps + homepages), sitemap and RSS.`);
