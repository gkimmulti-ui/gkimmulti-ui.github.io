/* Detail content, metadata, store links and language links are already static HTML. */
(()=>{
 'use strict';
 const lang=document.documentElement.dataset.locale||'ko';
 const home=code=>code==='ko'?'/':'/'+code+'/';
 document.getElementById('lang-picker').addEventListener('change',event=>{
  const code=event.target.value;
  window.kennethLanguage.navigate(code);
 });
 const shots=[...document.querySelectorAll('[data-shot]')];
 const dialog=document.getElementById('screenshot-dialog');
 const image=document.getElementById('viewer-image');
 let index=0,trigger=null;
 function show(){const shot=shots[index];image.src=shot.href;image.alt=shot.querySelector('img').alt;document.getElementById('viewer-title').textContent=document.getElementById('detail-title').textContent;document.getElementById('viewer-count').textContent=(index+1)+' / '+shots.length;document.getElementById('viewer-source').href=shot.dataset.storeUrl;}
 function step(n){index=(index+n+shots.length)%shots.length;show();}
 document.addEventListener('click',event=>{
  const control=event.target.closest('[data-gallery]');
  if(control){document.getElementById('gallery-'+control.dataset.gallery).scrollBy({left:Number(control.dataset.direction)*350,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});return;}
  const shot=event.target.closest('[data-shot]');
  if(!shot||typeof dialog.showModal!=='function')return;
  event.preventDefault();index=shots.indexOf(shot);trigger=shot;show();dialog.showModal();document.body.classList.add('viewer-open');
 });
 document.getElementById('viewer-prev').addEventListener('click',()=>step(-1));
 document.getElementById('viewer-next').addEventListener('click',()=>step(1));
 document.getElementById('viewer-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');trigger?.focus({preventScroll:true});});
 dialog.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}});
 let touchX=null;
 image.addEventListener('touchstart',event=>{touchX=event.changedTouches[0].clientX;},{passive:true});
 image.addEventListener('touchend',event=>{const delta=event.changedTouches[0].clientX-touchX;if(touchX!==null&&Math.abs(delta)>60)step(delta<0?1:-1);touchX=null;},{passive:true});
})();

