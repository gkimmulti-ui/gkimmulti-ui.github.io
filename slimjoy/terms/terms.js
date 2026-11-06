(() => {
  'use strict';
  const country = document.querySelector('#country');
  const language = document.querySelector('#language');
  const rail = document.querySelector('.countries');
  const links = [...rail.querySelectorAll('a')];
  const panels = [...document.querySelectorAll('.region')];
  const codes = new Set(panels.map(p => p.id));
  let selected = 'kr';
  function select(code, update = true) {
    selected = codes.has(code) ? code : 'kr';
    country.value = selected;
    panels.forEach(p => { p.hidden = p.id !== selected; });
    links.forEach(a => a.setAttribute('aria-current', String(a.dataset.country === selected)));
    const active = links.find(a => a.dataset.country === selected);
    rail.scrollLeft = active.offsetLeft - rail.offsetLeft - 10;
    if (update) {
      const url = new URL(location.href);
      if (codes.has(url.hash.slice(1))) url.hash = '';
      url.searchParams.set('country', selected);
      url.searchParams.set('lang', language.value);
      history.replaceState(null, '', url);
    }
  }
  function setLanguage(value, update = true) {
    const lang = value === 'en' ? 'en' : 'ko';
    document.documentElement.lang = lang;
    language.value = lang;
    [...country.options].forEach(o => { o.textContent = o.dataset[lang]; });
    document.title = lang === 'ko' ? 'SlimJoy 국가별 이용약관' : 'SlimJoy — Terms of Service';
    select(selected, update);
  }
  const query = new URLSearchParams(location.search);
  selected = codes.has(query.get('country')) ? query.get('country') : 'kr';
  setLanguage(query.get('lang'), false);
  const hashCode = location.hash.slice(1);
  if (codes.has(hashCode)) select(hashCode, false);
  country.addEventListener('change', () => select(country.value));
  language.addEventListener('change', () => setLanguage(language.value));
  links.forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    if (!dragged) select(a.dataset.country);
  }));
  window.addEventListener('hashchange', () => {
    if (codes.has(location.hash.slice(1))) select(location.hash.slice(1));
  });
  document.querySelector('#print').addEventListener('click', () => window.print());
  let startX = 0, startScroll = 0, down = false, dragged = false;
  rail.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; dragged = false; startX = e.clientX; startScroll = rail.scrollLeft;
  });
  rail.addEventListener('dragstart', e => e.preventDefault());
  window.addEventListener('pointermove', e => {
    if (!down) return;
    if (Math.abs(e.clientX - startX) > 5) dragged = true;
    if (dragged) { rail.classList.add('dragging'); rail.scrollLeft = startScroll - e.clientX + startX; }
  });
  const finish = () => { down = false; rail.classList.remove('dragging'); };
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  window.addEventListener('blur', finish);
  // Keyboard clicks must work even after a mouse drag.
  rail.addEventListener('keydown', () => { dragged = false; });
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') dragged = false; });
})();
