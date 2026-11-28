/* Upcoming app catalog; release alerts are not available. */
(()=>{'use strict';
const rows=[["bracketbud","Bracket Bud: Tournament","대진표와 경기 일정, 결과를 편리하게 관리하세요.","Manage tournament brackets, match schedules and results.","対戦表、試合日程、結果を管理。","管理赛事对阵表、赛程和结果。","Управляйте турнирными сетками, расписанием и результатами.","Pamahalaan ang bracket, iskedyul at resulta ng mga laban."],["phrasepip","PhrasePip: Travel Phrases","여행 상황별 문장을 오프라인 음성으로 연습하세요.","Practice travel phrases with offline audio.","旅行フレーズをオフライン音声で練習。","用离线音频练习旅行常用语。","Изучайте фразы для путешествий с офлайн-аудио.","Magsanay ng mga parirala sa paglalakbay gamit ang offline na audio."],["bagsum","Bag Sum: Luggage Weight","여행 가방과 짐의 무게를 기록하고 배분하세요.","Track luggage weight and plan how to distribute it.","荷物の重さを記録し、配分を計画。","记录行李重量并规划分配。","Учитывайте вес багажа и планируйте распределение.","Itala ang bigat ng bagahe at planuhin ang pamamahagi nito."],["roomnobi","RoomNobi: Room Planner","가구 배치를 비교하고 방 꾸미기를 계획하세요.","Compare furniture layouts and plan your room.","家具の配置を比較して部屋を計画。","比较家具布局并规划房间。","Сравнивайте расстановку мебели и планируйте комнату.","Ihambing ang ayos ng muwebles at planuhin ang silid."],["rowmio","RowMio: Row Counter","뜨개질 프로젝트의 단수와 작업 메모를 기록하세요.","Track knitting rows and project notes.","編み物の段数と作業メモを記録。","记录编织行数和项目笔记。","Отмечайте ряды вязания и заметки о проектах.","Itala ang mga hanay ng pagniniting at mga tala ng proyekto."],["dottomint","DottoMint: Pixel Art Studio","픽셀 그림을 만들고 색상 팔레트와 작품을 관리하세요.","Create pixel art and manage palettes and artwork.","ドット絵を描き、パレットと作品を管理。","创作像素画并管理调色板和作品。","Создавайте пиксель-арт, управляйте палитрами и работами.","Gumawa ng pixel art at pamahalaan ang mga palette at likhang-sining."],["morsepip","MorsePip: Learn Morse Code","모스 부호를 단계별 문자와 소리 연습으로 익히세요.","Learn Morse code through staged character and audio practice.","文字と音声の段階練習でモールス信号を学ぶ。","通过分阶段字符和音频练习学习摩斯密码。","Изучайте азбуку Морзе поэтапно с символами и звуком.","Matuto ng Morse code sa sunod-sunod na pagsasanay sa karakter at tunog."],["hushmio","HushMio: Ambient Sound Mixer","집중과 휴식을 위한 배경음을 조합하고 타이머를 설정하세요.","Mix ambient sounds for focus and relaxation, with a timer.","集中や休息のために環境音を組み合わせ、タイマーを設定。","混合专注与放松环境音并设置计时器。","Сочетайте фоновые звуки для концентрации и отдыха с таймером.","Pagsamahin ang mga tunog para sa pokus at pahinga, kasama ang timer."],["zodimi","Zodimi","별자리 선을 따라 그리고 열두 별자리 친구를 만나세요.","Trace constellations and meet twelve zodiac companions.","星座をなぞり、十二星座の仲間と出会う。","描绘星座，认识十二位星座伙伴。","Обводите созвездия и знакомьтесь с двенадцатью друзьями зодиака.","Bakasán ang mga konstelasyon at kilalanin ang labindalawang zodiac na kaibigan."],["whalopip","Whalopip","다섯 바다 친구와 나만의 수족관을 꾸미세요.","Decorate your aquarium with five sea companions.","五種類の海の仲間と水族館を飾る。","与五位海洋伙伴装饰水族馆。","Украшайте аквариум с пятью морскими друзьями.","Palamutian ang aquarium kasama ang limang kaibigang dagat."],["sylvomi","Sylvomi","숲을 꾸미고 동물 친구들의 행동을 관찰하세요.","Decorate a forest and observe animal companions.","森を飾り、動物の仲間の行動を観察。","装饰森林并观察动物伙伴的行为。","Украшайте лес и наблюдайте за животными.","Palamutian ang gubat at obserbahan ang kilos ng mga hayop."],["robipip","Robipip","로봇 친구와 집중 타이머, 할 일 목록을 활용하세요.","Use a focus timer and checklist with robot companions.","ロボットの仲間と集中タイマーやチェックリストを活用。","与机器人伙伴使用专注计时器和清单。","Используйте таймер концентрации и список дел с роботами.","Gumamit ng focus timer at checklist kasama ang mga robot."],["meowbini","Meowbini","다섯 고양이 친구의 귀여운 움직임을 즐기세요.","Enjoy the playful movements of five cat companions.","五匹の猫のかわいい動きを楽しむ。","享受五只猫咪伙伴的可爱动作。","Наслаждайтесь игривыми движениями пяти котиков.","Tangkilikin ang masayang kilos ng limang pusang kaibigan."],["halopip","Halopip","천사 친구와 하루의 기분과 감사한 일을 기록하세요.","Record moods and gratitude with angel companions.","天使の仲間と気分や感謝を記録。","与天使伙伴记录心情和感恩。","Записывайте настроение и благодарности с ангелами.","Itala ang damdamin at pasasalamat kasama ang mga anghel."],["drakumi","Drakumi","알에서 자라는 다섯 드래곤 친구를 돌보세요.","Care for five dragon companions as they grow from eggs.","卵から育つ五匹のドラゴンをお世話。","照顾从蛋开始成长的五位龙伙伴。","Заботьтесь о пяти драконах, растущих из яиц.","Alagaan ang limang dragon habang lumalaki mula sa itlog."],["boopiri","Boopiri","귀여운 유령 친구들과 숨바꼭질을 즐기세요.","Enjoy cozy hide-and-seek with ghost companions.","かわいいおばけたちとかくれんぼを楽しむ。","与可爱的幽灵伙伴玩捉迷藏。","Играйте в уютные прятки с привидениями.","Maglaro ng taguan kasama ang mga kaibigang multo."]];
const languageCopy=[["출시 예정 앱","Kenneth App의 새로운 앱들을 만나보세요. 출시 일정과 다운로드 주소는 공개 출시가 확인되면 안내합니다.","언어","출시 앱 보기","출시 알림 기능은 준비 중입니다. 현재 신청이나 개인 정보 수집은 이루어지지 않습니다.","출시 준비 중","알림 준비 중","ko","/"],["Upcoming apps","Discover new apps from Kenneth App. Release dates and download links will appear only once public release has been confirmed.","Language","Browse released apps","Release alerts are being prepared. No subscription or personal data collection is active.","Coming soon","Alerts coming soon","en","/en/"],["リリース予定アプリ","Kenneth App の新しいアプリ。一般公開が確認され次第、公開日とダウンロードリンクをご案内します。","言語","公開済みアプリ","リリース通知を準備中です。現在、登録や個人情報の収集は行いません。","公開準備中","通知準備中","ja","/ja/"],["即将推出的应用","探索 Kenneth App 的新应用。确认正式公开后，将公布发布日期及下载链接。","语言","查看已发布应用","发布提醒功能正在准备中。目前不接受订阅，也不收集个人信息。","准备发布","提醒功能准备中","zh-CN","/zh/"],["Скоро в продаже","Знакомьтесь с новыми приложениями Kenneth App. Даты и ссылки появятся после подтверждения публичного выпуска.","Язык","Выпущенные приложения","Уведомления о выпуске готовятся. Подписка и сбор персональных данных пока не действуют.","Готовится к выпуску","Уведомления готовятся","ru","/ru/"],["Mga paparating na app","Tuklasin ang mga bagong app ng Kenneth App. Lalabas ang petsa at link ng download kapag nakumpirma ang pampublikong release.","Wika","Mga inilabas na app","Inihahanda pa ang mga abiso. Wala pang aktibong subscription o pagkolekta ng personal na datos.","Paparating na","Inihahanda ang mga abiso","fil","/fil/"]];
const releaseCopy=[
 ['출시 완료','출시 예정 목록에서 공개된 앱을 여기에서 다시 확인할 수 있어요. 최신 출시일순입니다.','출시 완료 기록 보기','출시일','앱 소개','Google Play에서 다운로드'],
 ['Released','Apps previously listed as upcoming, newest release first.','View release history','Release date','App details','Get it on Google Play'],
 ['公開済み','公開予定の一覧に掲載されていたアプリを、公開日の新しい順に表示します。','公開履歴を見る','公開日','アプリの詳細','Google Play で入手'],
 ['已发布','曾列为即将推出的应用，按发布日期从新到旧排列。','查看发布记录','发布日期','应用详情','在 Google Play 下载'],
 ['Выпущено','Приложения из списка ожидаемых выпусков, сначала самые новые.','История выпусков','Дата выпуска','Об приложении','Скачать в Google Play'],
 ['Inilabas na','Mga dating nasa listahan ng paparating na app, pinakabago muna.','Tingnan ang mga inilabas','Petsa ng paglabas','Detalye ng app','I-download sa Google Play']
];
const fieldIds=['title','intro','langlabel','back','note'];
const select=document.querySelector('#language');
const q=new URLSearchParams(location.search).get('lang');
const requested=q==="zh"?"zh-CN":q;const initial=q?(languageCopy.findIndex(row=>row[7]===requested)<0?1:languageCopy.findIndex(row=>row[7]===requested)):0;
const knownHomeLocales=new Set(["ko","en","ja","zh","ru","fil","hi","es","pt","fr","de","id"]);
const originalHomeLocale=knownHomeLocales.has(q)?q:q==="zh-CN"?"zh":null;
function render(index, preserveHome=false){
  if(!Number.isInteger(index)||index<0||index>=languageCopy.length)index=0;
  const copy=languageCopy[index];
  document.documentElement.lang=copy[7];
  document.title=copy[0]+' | Kenneth App';
  fieldIds.forEach((id,i)=>{document.getElementById(id).textContent=copy[i];});
  document.getElementById('back').href=preserveHome&&originalHomeLocale?(originalHomeLocale==='ko'?'/':'/'+originalHomeLocale+'/'):copy[8];
  document.querySelectorAll('.coming-card').forEach((card)=>{
    const app=rows.find(row=>row[0]===card.dataset.app);
    if(!app)return;
    card.querySelector('p').textContent=app[index+2];
    card.querySelector('.coming-badge').textContent=copy[5];
    card.querySelector('button').textContent=copy[6];
  });
  const archive=releaseCopy[index];
  ['released-title','released-intro','history-jump'].forEach((id,i)=>{document.getElementById(id).textContent=archive[i];});
  document.querySelectorAll('.release-record').forEach(card=>{
    card.querySelector('.release-badge').textContent=archive[0];
    card.querySelector('.release-date-label').textContent=archive[3];
    const detail=card.querySelector('.release-detail');
    const home=preserveHome&&originalHomeLocale?(originalHomeLocale==='ko'?'/':'/'+originalHomeLocale+'/'):copy[8];
    detail.href=home+'apps/'+card.dataset.releasedApp+'/';
    detail.textContent=archive[4];
    card.querySelector('.release-store').textContent=archive[5];
  });
  select.value=String(index);
}
select.addEventListener('change',()=>render(Number(select.value)));
render(initial,true);
})();