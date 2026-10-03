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
  const play = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 3.8c0-.6.7-1 1.2-.7l13.4 8.2a.8.8 0 0 1 0 1.4L5.2 20.9c-.5.3-1.2-.1-1.2-.7V3.8Z"/></svg>';
  const apple = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.4 12.6c0-2.2 1.8-3.3 1.9-3.4-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.7.9-3.4.9-.7 0-1.8-.9-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 7 1.1 9.3.8 1.1 1.7 2.3 2.9 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.6-1-2.6-3.7ZM15.1 5.9c.6-.8 1.1-1.8 1-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.8 1.1.1 2.2-.6 2.8-1.4Z"/></svg>';
  function card(app, lang) {
    const name = escape(local(app.name, lang));
    const shots = app.screenshots;
    const gallery = shots.map((s,i) => `<a class="screen-link" href="${s.src}" data-shot="${i}" data-app="${app.slug}" aria-label="${name} · ${escape(t('gallery.open',lang))} ${i+1} · ${s.platform}"><img src="${s.thumb}" alt="${name} · ${escape(t('gallery.label',lang))} ${i+1} (${s.platform})" width="${s.width}" height="${s.height}" loading="lazy" decoding="async"><span class="screen-zoom" aria-hidden="true">↗</span>${s.platform==='App Store'?'<span class="screen-platform">iPhone</span>':''}</a>`).join('');
    return `<article class="app-card tone-${app.tone}" id="app-${app.slug}" aria-labelledby="name-${app.slug}">
      <div class="app-head"><img class="app-icon" src="${escape(app.icon)}" alt="" width="52" height="52" loading="lazy"><div class="app-name"><h3 id="name-${app.slug}">${name}</h3><p>${escape(local(app.category,lang))}</p></div><span class="platform-badge">${app.appStoreUrl?'Android + iOS':'Android'}</span></div>
      <div class="gallery-wrap"><div class="screenshot-track" id="gallery-${app.slug}" role="group" aria-label="${name} · ${escape(t('gallery.label',lang))}">${gallery}</div>
      <div class="gallery-footer"><span>${escape(t('gallery.hint',lang))}</span><div class="gallery-controls"><button class="icon-btn gallery-prev" type="button" data-gallery="${app.slug}" data-direction="-1" aria-label="${name} · ${escape(t('gallery.prev',lang))}">${arrow}</button><button class="icon-btn" type="button" data-gallery="${app.slug}" data-direction="1" aria-label="${name} · ${escape(t('gallery.next',lang))}">${arrow}</button></div></div></div>
      <div class="app-copy"><h4>${escape(local(app.headline,lang))}</h4><p class="app-desc">${escape(local(app.desc,lang))}</p><ul class="app-tags">${(local(app.tags,lang)||[]).map(tag=>`<li>${escape(tag)}</li>`).join('')}</ul>
      ${app.note?`<details class="app-note"><summary>${escape(t('details',lang))}</summary><p>${escape(local(app.note,lang))}</p></details>`:''}
      <div class="app-links"><a class="store-btn" href="${escape(app.playUrl)}" target="_blank" rel="noopener noreferrer">${play}<span>Google Play</span>${arrow}</a>${app.appStoreUrl?`<a class="store-btn secondary" href="${escape(app.appStoreUrl)}" target="_blank" rel="noopener noreferrer">${apple}<span>App Store</span>${arrow}</a>`:''}</div></div></article>`;
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
    const apps=data.apps.filter(app=> (activeGroup==='all'||app.group===activeGroup) && (platform.value!=='ios'||app.appStoreUrl) && (!query||[local(app.name,lang),local(app.category,lang),local(app.desc,lang),...local(app.tags,lang)].join(' ').toLocaleLowerCase().includes(query)));
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
