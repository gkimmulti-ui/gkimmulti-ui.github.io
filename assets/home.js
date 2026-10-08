/* The same card renderer builds the static HTML and enhances it in the browser. */
(function () {
  'use strict';
  const data = typeof module !== 'undefined' && module.exports ? {
    apps: require('../data/apps.json'), translations: require('../data/translations.json')
  } : KENNETH_DATA;
  const languages = ['ko', 'en', 'ja', 'zh', 'ru', 'fil'];
  const htmlLang = {ko:'ko', en:'en', ja:'ja', zh:'zh-CN', ru:'ru', fil:'fil'};
  const groups = ['all', 'life', 'photo', 'tools', 'play', 'faith'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const local = (value, lang) => typeof value === 'object' && !Array.isArray(value) ? value[lang] ?? value.en ?? value.ko : value;
  const t = (key, lang) => data.translations[lang][key] ?? data.translations.en[key] ?? '';
  const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function storeOption(app, store, lang) {
    const label = escape(t('store.'+store,lang));
    const name = escape(local(app.name,lang));
    const url = store==='play'?app.playUrl:app.appStoreUrl;
    if(!url) return `<div class="store-option store-upcoming"><div class="upcoming-symbol" aria-hidden="true">◷</div><h5>${label}</h5><strong>${escape(t('store.soon',lang))}</strong><p>${escape(t('store.soonDetail',lang))}</p></div>`;
    const qr = `assets/store-qr/${app.slug}-${store}.png`;
    const badge = `assets/store-badges/${store}-${lang}.${store==='play'?'png':'svg'}`;
    return `<div class="store-option"><div class="store-download"><h5>${label}</h5><a class="store-badge-link ${store}" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${name} · ${label} · ${escape(t('store.download',lang))}"><img src="${badge}" alt="${label} · ${escape(t('store.download',lang))}" loading="lazy" decoding="async"></a></div><div class="store-qr"><a class="qr-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer" aria-label="${name} · ${label} · ${escape(t('store.open',lang))}"><img src="${qr}" alt="${name} · ${label} ${escape(t('store.qr',lang))}" width="144" height="144" loading="lazy" decoding="async"></a><a class="qr-save" href="${qr}" download="${app.slug}-${store}-qr.png" aria-label="${name} · ${label} · ${escape(t('store.saveQr',lang))}">${escape(t('store.saveQr',lang))} <span aria-hidden="true">↓</span></a></div></div>`;
  }
  function card(app, lang) {
    const name = escape(local(app.name, lang));
    const shots = app.screenshots;
    const gallery = shots.map((s,i) => `<a class="screen-link" href="${s.src}" data-shot="${i}" data-app="${app.slug}" aria-label="${name} · ${escape(t('gallery.open',lang))} ${i+1} · ${s.platform}"><img src="${s.thumb}" alt="${name} · ${escape(t('gallery.label',lang))} ${i+1} (${s.platform})" width="${s.width}" height="${s.height}" loading="lazy" decoding="async"><span class="screen-zoom" aria-hidden="true">↗</span>${s.platform==='App Store'?'<span class="screen-platform">iPhone</span>':''}</a>`).join('');
    return `<article class="app-card tone-${app.tone}" id="app-${app.slug}" aria-labelledby="name-${app.slug}">
      <div class="app-head"><img class="app-icon" src="${escape(app.icon)}" alt="" width="52" height="52" loading="lazy"><div class="app-name"><h3 id="name-${app.slug}">${name}</h3><p>${escape(local(app.category,lang))}</p></div></div>
      <div class="gallery-wrap"><div class="screenshot-track" id="gallery-${app.slug}" role="group" aria-label="${name} · ${escape(t('gallery.label',lang))}">${gallery}</div>
      <div class="gallery-footer"><span>${escape(t('gallery.hint',lang))}</span><div class="gallery-controls"><button class="icon-btn gallery-prev" type="button" data-gallery="${app.slug}" data-direction="-1" aria-label="${name} · ${escape(t('gallery.prev',lang))}">${arrow}</button><button class="icon-btn" type="button" data-gallery="${app.slug}" data-direction="1" aria-label="${name} · ${escape(t('gallery.next',lang))}">${arrow}</button></div></div></div>
      <div class="app-copy"><h4>${escape(local(app.headline,lang))}</h4><p class="app-desc">${escape(local(app.desc,lang))}</p><ul class="app-tags">${(local(app.tags,lang)||[]).map(tag=>`<li>${escape(tag)}</li>`).join('')}</ul>
      ${app.note?`<details class="app-note"><summary>${escape(t('details',lang))}</summary><p>${escape(local(app.note,lang))}</p></details>`:''}
      <div class="app-downloads"><p class="download-hint">${escape(t('store.hint',lang))}</p><div class="store-options">${app.appStoreUrl?storeOption(app,'appstore',lang)+storeOption(app,'play',lang):storeOption(app,'play',lang)+storeOption(app,'appstore',lang)}</div></div></div></article>`;
  }
  function filters(lang, selected='all') {
    return groups.map(g=>`<button class="filter-chip${g===selected?' active':''}" type="button" data-filter="${g}" aria-pressed="${g===selected}">${escape(t('filter.'+g,lang))}${g==='all'?`<span>${data.apps.length}</span>`:''}</button>`).join('');
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports={card,filters,escape}; return; }

  let lang = new URLSearchParams(location.search).get('lang');
  if (!languages.includes(lang)) { try { lang=localStorage.getItem('kennethapp-lang'); } catch {} }
  if (!languages.includes(lang)) {
    const preferred=(navigator.language||'ko').toLowerCase();
    lang=languages.find(l=>preferred.startsWith(l)) || (preferred.startsWith('tl')?'fil':'en');
  }
  let activeGroup='all';
  const grid=document.getElementById('app-grid');
  const search=document.getElementById('app-search');
  const platform=document.getElementById('platform');
  const dialog=document.getElementById('screenshot-dialog');
  const viewerImage=document.getElementById('viewer-image');
  let currentApp=null, currentShot=0, lastTrigger=null;
  function renderApps() {
    const query=search.value.trim().toLocaleLowerCase();
    const apps=data.apps.filter(app=> (activeGroup==='all'||app.group===activeGroup) && (platform.value!=='appstore'||app.appStoreUrl) && (platform.value!=='play'||app.playUrl) && (!query||[local(app.name,lang),local(app.category,lang),local(app.desc,lang),...local(app.tags,lang)].join(' ').toLocaleLowerCase().includes(query)));
    grid.innerHTML=apps.map(app=>card(app,lang)).join('');
    document.getElementById('result-count').textContent=apps.length+' '+t('results',lang);
    document.getElementById('empty-state').hidden=apps.length!==0;
  }
  function render() {
    document.documentElement.lang=htmlLang[lang];
    document.title=t('meta.title',lang);
    document.querySelector('meta[name="description"]').content=t('meta.desc',lang);
    const locales={ko:'ko_KR',en:'en_US',ja:'ja_JP',zh:'zh_CN',ru:'ru_RU',fil:'fil_PH'};
    const url='https://gkimmulti-ui.github.io/'+(lang==='ko'?'':'?lang='+lang);
    for(const [id,attribute,value] of [['link-canonical','href',url],['og-url','content',url],['og-title','content',document.title],['og-desc','content',t('meta.desc',lang)],['tw-title','content',document.title],['tw-desc','content',t('meta.desc',lang)],['og-locale','content',locales[lang]]]) document.getElementById(id)?.setAttribute(attribute,value);
    document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n,lang));
    document.querySelectorAll('[data-i18n-label]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nLabel,lang)));
    search.placeholder=t('search.label',lang);
    document.getElementById('app-filters').innerHTML=filters(lang,activeGroup);
    document.getElementById('lang-picker').value=lang;
    renderApps();
  }
  function showShot() {
    const shot=currentApp.screenshots[currentShot];
    viewerImage.src=shot.src;
    viewerImage.alt=local(currentApp.name,lang)+' · '+t('gallery.label',lang)+' '+(currentShot+1)+' ('+shot.platform+')';
    document.getElementById('viewer-title').textContent=local(currentApp.name,lang);
    document.getElementById('viewer-count').textContent=shot.platform+' · '+(currentShot+1)+' / '+currentApp.screenshots.length;
    document.getElementById('viewer-source').href=shot.platform==='App Store'?currentApp.appStoreUrl:currentApp.playUrl;
  }
  function step(direction){currentShot=(currentShot+direction+currentApp.screenshots.length)%currentApp.screenshots.length;showShot();}
  grid.addEventListener('click',event=>{
    const gallery=event.target.closest('[data-gallery]');
    if(gallery){const track=document.getElementById('gallery-'+gallery.dataset.gallery);track.scrollBy({left:track.clientWidth*.8*Number(gallery.dataset.direction),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;}
    const link=event.target.closest('[data-shot]');
    if(!link||typeof dialog.showModal!=='function')return;
    event.preventDefault();currentApp=data.apps.find(app=>app.slug===link.dataset.app);currentShot=Number(link.dataset.shot);lastTrigger=link;showShot();dialog.showModal();document.body.classList.add('viewer-open');
  });
  document.getElementById('viewer-prev').addEventListener('click',()=>step(-1));
  document.getElementById('viewer-next').addEventListener('click',()=>step(1));
  document.getElementById('viewer-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');lastTrigger?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}if(event.key==='ArrowRight'){event.preventDefault();step(1);}});
  let touchX=null;
  viewerImage.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;},{passive:true});
  viewerImage.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchX;if(touchX!==null&&Math.abs(delta)>60)step(delta<0?1:-1);touchX=null;},{passive:true});
  document.getElementById('app-filters').addEventListener('click',event=>{
    const button=event.target.closest('[data-filter]');if(!button)return;activeGroup=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===activeGroup);b.setAttribute('aria-pressed',b.dataset.filter===activeGroup);});renderApps();
  });
  search.addEventListener('input',renderApps);
  platform.addEventListener('change',renderApps);
  document.getElementById('reset-filters').addEventListener('click',()=>{activeGroup='all';search.value='';platform.value='all';render();search.focus();});
  document.getElementById('lang-picker').addEventListener('change',event=>{
    lang=event.target.value;try{localStorage.setItem('kennethapp-lang',lang);}catch{}
    const url=new URL(location.href);if(lang==='ko')url.searchParams.delete('lang');else url.searchParams.set('lang',lang);
    history.replaceState(null,'',url);render();
  });
  // Hero links still reach an app when a previous search has hidden its card.
  document.querySelectorAll('a[href^="#app-"]').forEach(link=>link.addEventListener('click',()=>{
    if(!document.getElementById(link.hash.slice(1))){activeGroup='all';search.value='';platform.value='all';render();}
  }));
  render();
})();
