/* Static translations stay on this site; other languages explicitly open Google Translate. */
window.kennethLanguage={navigate(code){
 const picker=document.getElementById('lang-picker');
 if(![...picker.options].some(option=>option.value===code))return;
 const slug=document.body.dataset.app;
 if(code.startsWith('translate:')){
  const target=new URL('https://translate.google.com/translate');
  target.searchParams.set('sl','en');
  target.searchParams.set('tl',code.slice(10));
  target.searchParams.set('u','https://gkimmulti-ui.github.io/en/'+(slug?'apps/'+slug+'/':''));
  location.assign(target.href);
 }else{
  location.assign((code==='ko'?'/':'/'+code+'/')+(slug?'apps/'+slug+'/':'')+location.hash);
 }
}};
