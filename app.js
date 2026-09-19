// ==================== حالت کلی و ناوبری ====================
const state = {
  coords: null,
  cityName: "اهواز",
  timings: null,
  qiblaBearing: null,
  activeDhikr: DHIKR_SETS[0].key
};

function goTo(id){
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.target === id));
}
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> goTo(btn.dataset.target));
});

function showMore(which){
  document.getElementById('moreAzkar').style.display = which === 'azkar' ? '' : 'none';
  document.getElementById('moreQibla').style.display = which === 'qibla' ? '' : 'none';
  document.getElementById('moreTitle').textContent = which === 'azkar' ? 'اذکار و تسبیح دیجیتال' : 'قبله‌نما';
}

function showCalTab(which){
  document.getElementById('calTabCal').style.display = which === 'cal' ? '' : 'none';
  document.getElementById('calTabOcc').style.display = which === 'occ' ? '' : 'none';
  document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.cal === which));
}

// ==================== ابزار تبدیل تقویم ====================
function hijriOf(date){
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {day:'numeric', month:'numeric', year:'numeric'}).formatToParts(date);
  return {
    day: Number(parts.find(p=>p.type==='day').value),
    month: Number(parts.find(p=>p.type==='month').value),
    year: Number(parts.find(p=>p.type==='year').value)
  };
}
function persianOf(date){
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {day:'numeric', month:'numeric', year:'numeric'}).formatToParts(date);
  return {
    day: Number(parts.find(p=>p.type==='day').value),
    month: Number(parts.find(p=>p.type==='month').value),
    year: Number(parts.find(p=>p.type==='year').value)
  };
}
const PERSIAN_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const HIJRI_MONTHS = ["محرم","صفر","ربیع‌الاول","ربیع‌الثانی","جمادی‌الاول","جمادی‌الثانی","رجب","شعبان","رمضان","شوال","ذی‌القعده","ذی‌الحجه"];

function renderDates(){
  const now = new Date();
  try{
    document.getElementById('hijriShort') && (document.getElementById('hijriShort').textContent =
      new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', {day:'numeric', month:'long'}).format(now));
  }catch(e){}
}
renderDates();

// ==================== حدیث روز ====================
function dayOfYear(d){ const start = new Date(d.getFullYear(),0,0); return Math.floor((d - start) / 86400000); }
(function renderHadith(){
  const idx = dayOfYear(new Date()) % HADITHS.length;
  const h = HADITHS[idx];
  document.getElementById('hadithText').textContent = "«" + h.text + "»";
  document.getElementById('hadithSrc').textContent = "— " + h.src;
})();

// ==================== موقعیت مکانی ====================
const AHVAZ = { lat: 31.3183, lon: 48.6706 };
function setCoords(lat, lon){
  state.coords = { lat, lon };
  computeQibla();
  loadPrayerTimes();
  reverseGeocode(lat, lon);
}
function reverseGeocode(lat, lon){
  fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fa`)
    .then(r=>r.json()).then(d=>{
      const city = d.city || d.locality || d.principalSubdivision;
      if(city){ state.cityName = city; document.getElementById('locLabel').textContent = city; }
    }).catch(()=>{});
}
document.getElementById('locBtn').addEventListener('click', () => {
  if(!navigator.geolocation) return;
  document.getElementById('locLabel').textContent = "در حال یافتن…";
  navigator.geolocation.getCurrentPosition(
    pos => setCoords(pos.coords.latitude, pos.coords.longitude),
    () => { document.getElementById('locLabel').textContent = state.cityName; },
    { enableHighAccuracy:true, timeout:8000 }
  );
});
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(
    pos => setCoords(pos.coords.latitude, pos.coords.longitude),
    () => setCoords(AHVAZ.lat, AHVAZ.lon),
    { timeout: 6000 }
  );
} else { setCoords(AHVAZ.lat, AHVAZ.lon); }

// ==================== اوقات شرعی ====================
const PRAYER_LABELS = [
  {key:'Fajr', fa:'اذان صبح'}, {key:'Dhuhr', fa:'اذان ظهر'}, {key:'Asr', fa:'اذان عصر'},
  {key:'Maghrib', fa:'اذان مغرب'}, {key:'Isha', fa:'اذان عشا'}
];
function loadPrayerTimes(){
  const { lat, lon } = state.coords;
  fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=7`)
    .then(r=>r.json()).then(d=>{ state.timings = d.data.timings; tickCountdown(); })
    .catch(()=>{ document.getElementById('prayerTimeLabel').textContent = "اتصال اینترنت را بررسی کنید"; });
}
function toMinutes(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
function tickCountdown(){
  if(!state.timings) return;
  const now = new Date();
  const nowMin = now.getHours()*60 + now.getMinutes() + now.getSeconds()/60;
  let next = null;
  for(const p of PRAYER_LABELS){ if(toMinutes(state.timings[p.key]) > nowMin){ next = p; break; } }
  if(!next) next = PRAYER_LABELS[0];
  const targetMin = toMinutes(state.timings[next.key]);
  let diffMin = targetMin - nowMin; if(diffMin < 0) diffMin += 24*60;
  const h = Math.floor(diffMin/60), m = Math.floor(diffMin%60), s = 59 - now.getSeconds();
  document.getElementById('nextPrayerName').textContent = next.fa;
  document.getElementById('countdown').textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  document.getElementById('prayerTimeLabel').textContent = `ساعت ${state.timings[next.key]} به وقت ${state.cityName}`;
}
setInterval(()=>{ if(state.timings) tickCountdown(); }, 1000);

// ==================== قرآن کریم ====================
function surahRowHTML(s){
  return `<div class="row" onclick="openSurah(${s.number})">
    <div class="num">${s.number}</div>
    <div class="mid"><div class="fa">${s.fa}</div><div class="en">${s.en} · ${s.ayahs} آیه · ${s.type}</div></div>
    <div class="ar">${s.ar}</div>
  </div>`;
}
function renderSurahList(filter=''){
  const f = filter.trim();
  const filtered = SURAHS.filter(s => !f || s.fa.includes(f) || s.en.toLowerCase().includes(f.toLowerCase()));
  document.getElementById('surahList').innerHTML = filtered.map(surahRowHTML).join('');
  document.getElementById('surahListHome').innerHTML = (f ? filtered : SURAHS.slice(0,10)).map(surahRowHTML).join('');
}
renderSurahList();
document.getElementById('globalSearch').addEventListener('input', e => renderSurahList(e.target.value));

function openSurah(number){
  const s = SURAHS.find(x=>x.number===number);
  goTo('sec-quran');
  document.querySelector('.quran-list').style.display = 'none';
  const reader = document.getElementById('quranReader');
  reader.classList.add('active');
  document.getElementById('readerTitle').textContent = `سوره ${s.fa}`;
  const ayahList = document.getElementById('ayahList');
  ayahList.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:30px 0;">در حال بارگذاری آیات…</p>';
  fetch(`https://api.alquran.cloud/v1/surah/${s.number}/editions/quran-uthmani,fa.makarem`)
    .then(r=>r.json()).then(d=>{
      const [arabic, translation] = d.data;
      ayahList.innerHTML = arabic.ayahs.map((a,i)=>`
        <div class="ayah">
          <div class="arabic"><span class="num">${a.numberInSurah}</span>${a.text}</div>
          <div class="translate">${translation.ayahs[i] ? translation.ayahs[i].text : ''}</div>
        </div>`).join('');
    }).catch(()=>{ ayahList.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:30px 0;">خطا در دریافت آیات. اتصال اینترنت را بررسی کنید.</p>'; });
}
function closeReader(){
  document.getElementById('quranReader').classList.remove('active');
  document.querySelector('.quran-list').style.display = '';
}

// ==================== استخاره آنلاین ====================
function doIstikhara(){
  const btn = document.getElementById('istikharaBtn');
  const result = document.getElementById('istikharaResult');
  btn.disabled = true; btn.textContent = "در حال گشودن آیه…";
  const surahNum = 1 + Math.floor(Math.random()*114);
  const surah = SURAHS.find(s=>s.number===surahNum);
  const ayahNum = 1 + Math.floor(Math.random()*surah.ayahs);
  fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/editions/quran-uthmani,fa.makarem`)
    .then(r=>r.json()).then(d=>{
      const [arabic, translation] = d.data;
      result.innerHTML = `
        <div class="tag">سوره ${surah.fa} — آیه ${ayahNum}</div>
        <div class="ayah" style="border:none; padding-top:6px;">
          <div class="arabic">${arabic.text}</div>
          <div class="translate">${translation.text}</div>
        </div>
        <div class="istikhara-note">
          طبق باور رایج، اگر آیه لحن امیدبخش، بشارت یا امر به کاری داشته باشد، نشانه‌ی تشویق‌کننده و اگر لحن هشدار یا نهی داشته باشد، نشانه‌ی احتیاط دانسته می‌شود. با این حال، استخاره جایگزین تفکر، مشورت با افراد آگاه و تصمیم‌گیری آزادانه‌ی خودتان نیست؛ آن را صرفاً یک کمک برای آرامش دل بدانید.
        </div>`;
      result.classList.add('show');
      btn.disabled = false; btn.textContent = "استخاره‌ی دوباره";
    }).catch(()=>{
      result.innerHTML = '<p style="color:var(--text-dim); text-align:center;">خطا در دریافت آیه. اتصال اینترنت را بررسی کنید.</p>';
      result.classList.add('show');
      btn.disabled = false; btn.textContent = "تلاش دوباره";
    });
}

// ==================== تقویم ====================
function renderToday(){
  const now = new Date();
  const p = persianOf(now);
  const h = hijriOf(now);
  document.getElementById('todayShamsi').textContent = `${p.day} ${PERSIAN_MONTHS[p.month-1]} ${p.year}`;
  document.getElementById('todayHijri').textContent = `${h.day} ${HIJRI_MONTHS[h.month-1]} ${h.year}`;
  document.getElementById('todayGregorian').textContent = now.toLocaleDateString('en-GB');
}
function renderCalendarGrid(){
  const now = new Date();
  const p = persianOf(now);
  const startDate = new Date(now); startDate.setDate(startDate.getDate() - (p.day - 1));
  // طول ماه شمسی جاری را با پیشروی روز به روز پیدا می‌کنیم
  let length = 0;
  for(let i=0;i<32;i++){
    const d = new Date(startDate); d.setDate(d.getDate()+i);
    if(persianOf(d).month !== p.month) break;
    length = i+1;
  }
  const firstWeekday = (startDate.getDay() + 1) % 7; // شنبه=۰
  const cells = [];
  for(let i=0;i<firstWeekday;i++) cells.push('<div class="cal-cell empty"></div>');
  for(let day=1; day<=length; day++){
    const d = new Date(startDate); d.setDate(d.getDate() + (day-1));
    const isToday = d.toDateString() === now.toDateString();
    const h = hijriOf(d);
    const hasEvent = OCCASIONS.some(o=>o.month===h.month && o.day===h.day);
    cells.push(`<div class="cal-cell${isToday?' today':''}${hasEvent?' event':''}">
      <div>${day.toLocaleString('fa-IR')}</div>
      <div class="hj">${h.day}</div>
    </div>`);
  }
  document.getElementById('calDays').innerHTML = cells.join('');
}
function renderOccasions(){
  const now = new Date();
  const withDays = OCCASIONS.map(o=>{
    let daysLeft = null;
    for(let i=0;i<380;i++){
      const d = new Date(now); d.setDate(d.getDate()+i);
      const h = hijriOf(d);
      if(h.month === o.month && h.day === o.day){ daysLeft = i; break; }
    }
    return { ...o, daysLeft };
  }).sort((a,b)=> a.daysLeft - b.daysLeft);

  document.getElementById('occList').innerHTML = withDays.map(o=>`
    <div class="occ-row">
      <div class="dot ${o.type}"></div>
      <div class="info">
        <div class="t">${o.title}</div>
        <div class="d">${o.day} ${HIJRI_MONTHS[o.month-1]}</div>
      </div>
      <div class="left">${o.daysLeft === 0 ? 'امروز' : o.daysLeft + ' روز دیگر'}</div>
    </div>`).join('');
}
renderToday();
renderCalendarGrid();
renderOccasions();

// ==================== اذکار و تسبیح دیجیتال ====================
const chipsWrap = document.getElementById('dhikrChips');
DHIKR_SETS.forEach(d=>{
  const chip = document.createElement('div');
  chip.className = 'chip' + (d.key === state.activeDhikr ? ' active' : '');
  chip.textContent = d.label; chip.dataset.key = d.key;
  chip.addEventListener('click', ()=>{
    state.activeDhikr = d.key;
    document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c.dataset.key === d.key));
    renderTasbih();
  });
  chipsWrap.appendChild(chip);
});
function getTasbihCount(key){ return Number(localStorage.getItem('tasbih_'+key) || 0); }
function setTasbihCount(key, val){ localStorage.setItem('tasbih_'+key, val); }
function renderTasbih(){
  const set = DHIKR_SETS.find(d=>d.key===state.activeDhikr);
  document.getElementById('tasbihCount').textContent = getTasbihCount(set.key);
  document.getElementById('tasbihGoal').textContent = `${set.text} — هدف: ${set.goal}`;
}
renderTasbih();
document.getElementById('tapCircle').addEventListener('click', ()=>{
  const set = DHIKR_SETS.find(d=>d.key===state.activeDhikr);
  let val = getTasbihCount(set.key) + 1;
  setTasbihCount(set.key, val);
  document.getElementById('tasbihCount').textContent = val;
  if(navigator.vibrate) navigator.vibrate(val % set.goal === 0 ? 60 : 12);
});
function resetTasbih(){ const set = DHIKR_SETS.find(d=>d.key===state.activeDhikr); setTasbihCount(set.key, 0); renderTasbih(); }
function changeGoal(){
  const set = DHIKR_SETS.find(d=>d.key===state.activeDhikr);
  const val = prompt('هدف جدید را وارد کنید:', set.goal);
  if(val && !isNaN(val)){ set.goal = Number(val); renderTasbih(); }
}

// ==================== قبله‌نما ====================
const KAABA = { lat: 21.4225, lon: 39.8262 };
function toRad(d){ return d*Math.PI/180; }
function toDeg(r){ return r*180/Math.PI; }
function computeQibla(){
  const { lat, lon } = state.coords;
  const φ1 = toRad(lat), φ2 = toRad(KAABA.lat), Δλ = toRad(KAABA.lon - lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  state.qiblaBearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
  document.getElementById('qiblaDeg').textContent = Math.round(state.qiblaBearing) + '°';
  positionNeedle(0);
}
function positionNeedle(heading){
  if(state.qiblaBearing === null) return;
  document.getElementById('needle').style.transform = `translate(-50%,-100%) rotate(${state.qiblaBearing - heading}deg)`;
}
function handleOrientation(e){
  let heading;
  if(typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading;
  else if(e.alpha !== null) heading = 360 - e.alpha;
  else return;
  positionNeedle(heading);
  document.getElementById('qiblaHint').textContent = 'قطب‌نما فعال است — گوشی را صاف روبه‌روی خود نگه دارید.';
}
document.getElementById('qiblaPermBtn').addEventListener('click', async ()=>{
  try{
    if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
      const res = await DeviceOrientationEvent.requestPermission();
      if(res !== 'granted'){ document.getElementById('qiblaHint').textContent = 'اجازه دسترسی به حسگرها داده نشد.'; return; }
    }
    window.addEventListener('deviceorientation', handleOrientation, true);
    document.getElementById('qiblaPermBtn').style.display = 'none';
  }catch(err){
    document.getElementById('qiblaHint').textContent = 'دستگاه شما از قطب‌نما پشتیبانی نمی‌کند. عدد بالا زاویه‌ی قبله نسبت به شمال جغرافیایی است.';
  }
});
