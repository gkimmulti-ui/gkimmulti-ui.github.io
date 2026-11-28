/* Add verified first public Google Play dates to the history JSON, then run this script. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {escape}=require('../assets/home.js');
const apps=require('../data/apps.json');
const history=require('../data/upcoming-release-history.json');
const site=path.join(__dirname,'../upcoming/index.html');
const markers=['<!-- BEGIN RELEASE HISTORY -->','<!-- END RELEASE HISTORY -->'];
const seen=new Set();
const cards=[...history].sort((a,b)=>b.releasedOn.localeCompare(a.releasedOn)||a.slug.localeCompare(b.slug)).map(({slug,releasedOn})=>{
 const app=apps.find(a=>a.slug===slug);
 assert.ok(app && /^[a-z0-9-]+$/.test(slug) && !seen.has(slug), 'Unknown or duplicate history app: '+slug);
 assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(releasedOn) && new Date(releasedOn+'T00:00:00Z').toISOString().slice(0,10)===releasedOn,'Invalid public date: '+slug);
 assert.match(app.playUrl,/^https:\/\/play\.google\.com\/store\/apps\/details\?id=[a-zA-Z0-9_.]+$/);
 assert.ok(fs.existsSync(path.join(__dirname,'..',app.icon)),'Missing icon: '+slug);
 seen.add(slug);
 return `<article class="release-record" data-released-app="${slug}"><img src="/${escape(app.icon)}" alt="" width="48" height="48" loading="lazy"><div class="release-record-main"><h3>${escape(app.name.en)}</h3><p class="release-meta"><span class="release-badge">출시 완료</span><span>Google Play</span><span><span class="release-date-label">출시일</span> <time datetime="${releasedOn}">${releasedOn.replaceAll('-','.')}</time> <span class="release-zone">(KST)</span></span></p><div class="release-links"><a class="release-detail" href="/apps/${slug}/">앱 소개</a><a class="release-store" href="${escape(app.playUrl)}" target="_blank" rel="noopener noreferrer">Google Play에서 다운로드</a></div></div></article>`;
});
let html=fs.readFileSync(site,'utf8').replace(/^<article class="coming-card" data-app="([a-z0-9-]+)"[^\n]*\n/gm,(all,slug)=>seen.has(slug)?'':all);
const start=html.indexOf(markers[0]), end=html.indexOf(markers[1]);
assert.ok(start>=0&&end>start,'History markers missing');
html=html.slice(0,start+markers[0].length)+'\n'+cards.join('\n')+'\n'+html.slice(end);
assert.equal([...html.matchAll(/data-released-app="/g)].length,history.length);
for(const slug of seen)assert.ok(!html.includes('data-app="'+slug+'"'),'Still in upcoming: '+slug);
fs.writeFileSync(site,html);
console.log('Release history:',history.length,'; upcoming:',[...html.matchAll(/class="coming-card" data-app=/g)].length);
