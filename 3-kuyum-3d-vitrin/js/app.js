// Örnek Kuyum — 3D vitrin. Tek tuval, tek merkez noktası, her yönden görünüm.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { URUNLER, fiyatYaz } from './urunler.js';
import { Deniz } from './deniz.js';
import { motif } from './motifler.js';

const $ = (s) => document.querySelector(s);
const isMobile = matchMedia('(max-width: 860px)').matches;
const MODEL_V = 3;
const DEBUG = new URLSearchParams(location.search);

/* ---------------- Sahne ---------------- */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);

// Stüdyo ışığı: oda ortamı + mücevherde parıltı için ince ışık şeritleri
function studioEnv() {
  const env = new RoomEnvironment();
  const strip = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i) }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  strip(1.2, 12, -6, 2, 3, 9);
  strip(1.2, 12, 6, 2, -3, 9);
  strip(10, 1, 0, 9, 0, 7);
  strip(0.6, 8, 0, 0, 8, 5);
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnv(), 0.03).texture;

const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(3, 5, 4);
scene.add(key);

// arkadan kenar ışığı: ürünün rengini taşır
const rim = new THREE.DirectionalLight(0xffffff, 0);
rim.position.set(-4, 2, -5);
scene.add(rim);
// ürün başına ışık ve gölge paleti: halo (zemin ışığı), gölge, motif rengi, ana ışık, kenar ışığı
const ISIK = {
  trilogy:  { halo: '#fff4e0', golge: 'rgba(130, 95, 40, .20)',  motif: '#2a1f10', ana: '#fff0d8', kenar: '#ffd9a0', k: 1.2 },
  saat:     { halo: '#f7f4ec', golge: 'rgba(70, 64, 52, .22)',   motif: '#1c1a16', ana: '#fff8ec', kenar: '#dfe6ef', k: 1.0 },
  mineli:   { halo: '#e4f5f2', golge: 'rgba(20, 95, 95, .20)',   motif: '#0f3b3a', ana: '#f2fffd', kenar: '#ff9a8a', k: 1.6 },
  alyans:   { halo: '#fff1d6', golge: 'rgba(140, 100, 30, .20)', motif: '#2e2108', ana: '#ffeccc', kenar: '#ffcf80', k: 1.2 },
  tektas:   { halo: '#ffffff', golge: 'rgba(60, 62, 75, .16)',   motif: '#16171c', ana: '#ffffff', kenar: '#e8f0ff', k: 1.4 },
  kelepce:  { halo: '#f6ecdc', golge: 'rgba(20, 14, 8, .30)',    motif: '#0b0907', ana: '#fff1dc', kenar: '#ffc670', k: 1.3 },
  muhur:    { halo: '#f9e9d6', golge: 'rgba(115, 70, 35, .22)',  motif: '#3a2414', ana: '#ffe9d2', kenar: '#ffb3c0', k: 1.2 },
  oval:     { halo: '#f3f7ff', golge: 'rgba(70, 85, 120, .18)',  motif: '#141a2a', ana: '#f6f9ff', kenar: '#cfe0ff', k: 1.6 },
  pave:     { halo: '#fff7e8', golge: 'rgba(120, 95, 50, .18)',  motif: '#2a2214', ana: '#fff6e6', kenar: '#ffffff', k: 1.5 },
  tanzanit: { halo: '#f0eaff', golge: 'rgba(85, 60, 160, .20)',  motif: '#22184a', ana: '#f6f2ff', kenar: '#a98bff', k: 1.8 },
};
const isikHedef = { ana: new THREE.Color(0xffffff), kenar: new THREE.Color(0xffffff), k: 0 };
function setIsik(id) {
  const c = ISIK[id]; if (!c) return;
  const st = document.body.style;
  st.setProperty('--halo', c.halo);
  st.setProperty('--golge', c.golge);
  st.setProperty('--motif', c.motif);
  isikHedef.ana.set(c.ana);
  isikHedef.kenar.set(c.kenar);
  isikHedef.k = c.k;
}

const pivot = new THREE.Group();   // merkez noktası — ürünler buna çakılı
scene.add(pivot);

const controls = new OrbitControls(camera, canvas);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.7;
controls.minDistance = 2.6;
controls.maxDistance = 9;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.enabled = false;

const HOME = { hero: new THREE.Vector3(0, 0.55, 6.2), gallery: new THREE.Vector3(0, 0.6, 5.4) };
camera.position.copy(HOME.hero);

/* ---------------- Malzemeler ---------------- */
const METAL = {
  sari:  { color: new THREE.Color(1.0, 0.78, 0.42), roughness: 0.13 },
  beyaz: { color: new THREE.Color(0.93, 0.93, 0.92), roughness: 0.1 },
  rose:  { color: new THREE.Color(0.97, 0.72, 0.6), roughness: 0.13 },
};
function metalMat(tip, normalMap) {
  const t = METAL[tip];
  return new THREE.MeshPhysicalMaterial({
    color: t.color, metalness: 1, roughness: t.roughness, envMapIntensity: 1.25,
    clearcoat: 0.25, clearcoatRoughness: 0.08, normalMap: normalMap || null,
  });
}
function stoneMat(renk = '#ffffff') {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(renk), metalness: 0, roughness: 0,
    transmission: 1, thickness: 0.6, ior: 2.42, dispersion: 4,
    specularIntensity: 1, specularColor: new THREE.Color(1, 1, 1),
    envMapIntensity: 3.2, iridescence: 0.25, iridescenceIOR: 1.6,
    attenuationColor: new THREE.Color(renk), attenuationDistance: 1.5,
  });
}

function tune(root, r) {
  if (r.gizle) {
    const sil = [];
    root.traverse((o) => { if (o.isMesh && r.gizle.includes(o.material.name)) sil.push(o); });
    sil.forEach((o) => o.removeFromParent());
  }
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const out = mats.map((m) => {
      const name = m.name || '';
      if (r.tas && r.tas.includes(name)) return stoneMat(r.tasRenk);
      if (r.siyah && r.siyah.includes(name)) {
        return new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
      }
      if (r.metal && (r.metalHepsi || !m.map)) return metalMat(r.metal, m.normalMap);
      if (r.dokuAyar) Object.assign(m, r.dokuAyar);
      m.envMapIntensity = r.env ?? 1.3;
      return m;
    });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
}

/* ---------------- Yükleme ---------------- */
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();   // id -> Object3D (normalize edilmiş)
const pending = new Map();

function load(p) {
  if (cache.has(p.id)) return Promise.resolve(cache.get(p.id));
  if (pending.has(p.id)) return pending.get(p.id);
  const pr = new Promise((res, rej) => {
    gltfLoader.load(`models/${p.dosya}?v=${MODEL_V}`, (g) => {
      const obj = g.scene;
      tune(obj, p.render);
      // Normalize: merkeze al, en büyük boyutu 2 birime ölçekle, sonra yönlendir
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);
      const wrap = new THREE.Group();
      wrap.add(obj);
      const s = (1.45 * (p.render.olcek ?? 1)) / Math.max(size.x, size.y, size.z);
      wrap.scale.setScalar(s);
      const [rx, ry, rz] = (p.render.rot || [0, 0, 0]).map(THREE.MathUtils.degToRad);
      const holder = new THREE.Group();
      wrap.rotation.set(rx, ry, rz);
      holder.add(wrap);
      // Döndürme sonrası tekrar ortala
      const b2 = new THREE.Box3().setFromObject(holder);
      holder.children[0].position.sub(b2.getCenter(new THREE.Vector3()));
      holder.userData.h = b2.getSize(new THREE.Vector3()).y;
      cache.set(p.id, holder);
      res(holder);
    }, undefined, rej);
  });
  pending.set(p.id, pr);
  return pr;
}

/* ---------------- Küçük resimler ---------------- */
const thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
thumbR.setSize(200, 200); thumbR.setPixelRatio(1);
thumbR.toneMapping = THREE.ACESFilmicToneMapping;
thumbR.outputColorSpace = THREE.SRGBColorSpace;
const thumbScene = new THREE.Scene();
thumbScene.environment = new THREE.PMREMGenerator(thumbR).fromScene(studioEnv(), 0.03).texture;
const thumbCam = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
thumbCam.position.set(0, 1.4, 5.2); thumbCam.lookAt(0, 0, 0);
const thumbs = {};
function snapshot(p, obj) {
  const c = obj.clone();
  c.rotation.y = -0.5;
  thumbScene.add(c);
  thumbR.render(thumbScene, thumbCam);
  thumbs[p.id] = thumbR.domElement.toDataURL('image/png');
  thumbScene.remove(c);
  document.querySelectorAll(`img[data-thumb="${p.id}"]`).forEach((img) => { img.src = thumbs[p.id]; img.classList.add('ok'); });
}

/* ---------------- Gösterim / geçiş ---------------- */
let current = null;      // {p, obj}
let swapping = null;
const anim = [];         // basit tween listesi
function tween(dur, fn, done) { anim.push({ t0: performance.now(), dur, fn, done }); }
const ease = (t) => 1 - Math.pow(1 - t, 4);
const easeIn = (t) => t * t * t;

async function show(id, { instant = false } = {}) {
  const p = URUNLER.find((u) => u.id === id);
  if (!p || (current && current.p.id === id)) return;
  const token = Symbol();
  swapping = token;
  updateUI(p);
  const obj = await load(p);
  if (swapping !== token) return;

  const prev = current;
  current = { p, obj };
  const enter = () => {
    pivot.clear();
    obj.scale.setScalar(instant ? 1 : 0.001);
    obj.rotation.set(0, instant ? 0 : -Math.PI * 0.9, 0);
    obj.position.y = instant ? 0 : -0.25;
    pivot.add(obj);
    if (!instant) tween(1500, (t) => {
      const e = ease(t);
      obj.scale.setScalar(0.001 + e * 0.999);
      obj.rotation.y = -Math.PI * 0.9 * (1 - e);
      obj.position.y = -0.25 * (1 - e);
    });
  };
  if (prev && !instant) {
    const o = prev.obj, s0 = o.scale.x, r0 = o.rotation.y, y0 = o.position.y;
    tween(520, (t) => {
      const e = easeIn(t);
      o.scale.setScalar(Math.max(0.001, s0 * (1 - e)));
      o.rotation.y = r0 + e * 1.4;
      o.position.y = y0 + e * 0.2;
    }, enter);
  } else enter();
}

/* ---------------- Arayüz ---------------- */
const FILTRELER = [
  { ad: 'Tümü', f: () => true },
  { ad: 'Pırlanta', f: (p) => p.tas && /pırlanta/i.test(p.tas.tur) },
  { ad: 'Yüzük', f: (p) => p.kategori === 'Yüzük' },
  { ad: 'Bileklik & Saat', f: (p) => p.kategori !== 'Yüzük' },
];
let filtre = 0;

function buildUI() {
  $('#pTotal').textContent = String(URUNLER.length).padStart(2, '0');
  $('#filters').innerHTML = FILTRELER.map((f, i) =>
    `<button aria-pressed="${i === 0}" data-i="${i}">${f.ad}<sup>${URUNLER.filter(f.f).length}</sup></button>`).join('');
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    filtre = +b.dataset.i;
    [...$('#filters').children].forEach((x, i) => x.setAttribute('aria-pressed', i === filtre));
    const list = URUNLER.filter(FILTRELER[filtre].f);
    document.querySelectorAll('.thumb').forEach((t) => t.classList.toggle('hidden', !list.some((p) => p.id === t.dataset.id)));
    if (!list.some((p) => p.id === current?.p.id)) show(list[0].id);
  });

  $('#rail').innerHTML = URUNLER.map((p) =>
    `<button class="thumb" data-id="${p.id}" title="${p.ad}"><img data-thumb="${p.id}" alt=""><span>${p.kisaAd}</span></button>`).join('');
  $('#rail').addEventListener('click', (e) => {
    const b = e.target.closest('.thumb'); if (b) { enterGallery(); show(b.dataset.id); }
  });
}

// duvar motifi: iki katman arasında yumuşak geçiş
let motifOn = 'A';
function setMotif(id) {
  const next = motifOn === 'A' ? 'B' : 'A';
  const el = $(`#motif${next}`);
  el.innerHTML = motif(id);
  el.classList.add('on');
  $(`#motif${motifOn}`).classList.remove('on');
  motifOn = next;
}

function updateUI(p) {
  setMotif(p.id);
  setIsik(p.id);
  const i = URUNLER.indexOf(p);
  $('#pIndex').textContent = String(i + 1).padStart(2, '0');
  $('#pCat').textContent = p.koleksiyon;
  $('#pName').textContent = p.ad;
  $('#pLine').textContent = p.kisa;
  const specs = [['Maden', `${p.maden.ayar} ${p.maden.renk}`]];
  if (p.tas) specs.push(['Taş', p.tas.ozet]);
  specs.push(['Ağırlık', `${p.maden.gram} gr`]);
  $('#pSpecs').innerHTML = specs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $('#pPrice').innerHTML = `${fiyatYaz(p.fiyat)}<small>KDV dahil</small>`;
  const info = $('#info');
  info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap');
  document.querySelectorAll('.thumb').forEach((t) => t.setAttribute('aria-current', t.dataset.id === p.id));
  document.querySelector(`.thumb[data-id="${p.id}"]`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  if ($('#sheet').classList.contains('open')) fillSheet(p);
  try { history.replaceState(null, '', `#${p.id}`); } catch {}
}

function fillSheet(p) {
  const rows = [
    ['Maden', `${p.maden.ayar} ${p.maden.renk} altın`],
    ['Ağırlık', `${p.maden.gram} gr`],
    ...(p.tas ? [
      ['Taş', p.tas.tur],
      ...(p.tas.karat ? [['Karat', p.tas.karat]] : []),
      ...(p.tas.renk ? [['Renk / Berraklık', `${p.tas.renk} · ${p.tas.berraklik}`]] : []),
      ...(p.tas.kesim ? [['Kesim', p.tas.kesim]] : []),
      ...(p.tas.sertifika ? [['Sertifika', p.tas.sertifika]] : []),
    ] : []),
    ['Ölçü', p.olcu],
    ['Ürün kodu', p.kod],
  ];
  $('#sheetBody').innerHTML = `
    <p class="eyebrow">${p.koleksiyon}</p>
    <h3>${p.ad}</h3>
    <p class="story">${p.hikaye}</p>
    <h4>Teknik bilgiler</h4>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    <h4>Kimler için</h4>
    <div class="tags">${[...p.vesile, ...p.stil].map((t) => `<span>${t}</span>`).join('')}</div>
    <h4>Bakım</h4>
    <p class="txt">${p.bakim}</p>
    <h4>Hizmetlerimiz</h4>
    <p class="txt">Ömür boyu ücretsiz temizlik ve parlatma · ${p.gravur ? 'İç yüzeye ücretsiz isim/tarih yazımı · ' : ''}14 gün koşulsuz iade · Sigortalı, özel kutuda teslim</p>
    <div class="sheet-cta"><span class="btn-primary">${fiyatYaz(p.fiyat)}</span><button class="btn-ghost" data-ask>Deniz'e sorun</button></div>`;
  $('#sheetBody [data-ask]').onclick = () => { closeSheet(); deniz.open(`${p.ad} hakkında bilgi alabilir miyim?`); };
}
const openSheet = () => { fillSheet(current.p); $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false'); };
const closeSheet = () => { $('#sheet').classList.remove('open'); $('#sheet').setAttribute('aria-hidden', 'true'); };

/* ---------------- Açılış → vitrin ---------------- */
let inGallery = false;
function enterGallery() {
  if (inGallery) return;
  inGallery = true;
  document.body.classList.add('in-gallery');
  controls.enabled = true;
  flyCamera(HOME.gallery, 1600);
}
function flyCamera(to, dur = 1200) {
  const from = camera.position.clone();
  // küresel ara değerleme: kamera merkezden ayrılmadan süzülür
  const r0 = from.length(), r1 = to.length();
  const a = from.clone().normalize(), b = to.clone().normalize();
  tween(dur, (t) => {
    const e = ease(t);
    const dir = a.clone().lerp(b, e).normalize();
    camera.position.copy(dir.multiplyScalar(r0 + (r1 - r0) * e));
  });
}

/* ---------------- Döngü ---------------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // dar ekranda ürün çerçeveden taşmasın
  camera.fov = w / h < 0.8 ? 38 : 28;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let lastInteract = 0;
controls.addEventListener('start', () => {
  lastInteract = performance.now();
  controls.autoRotate = false;
  $('#hint').classList.add('gone');
});
controls.addEventListener('end', () => { lastInteract = performance.now(); });

let autoWanted = true;
const clock = new THREE.Clock();
function loop(now) {
  const dt = clock.getDelta();
  for (let i = anim.length - 1; i >= 0; i--) {
    const a = anim[i];
    const t = Math.min(1, (now - a.t0) / a.dur);
    a.fn(t);
    if (t >= 1) { anim.splice(i, 1); a.done && a.done(); }
  }
  // açılışta ürün kendi ekseninde yavaşça döner ve hafifçe süzülür
  if (!inGallery && current) {
    current.obj.rotation.y += dt * 0.35;
    pivot.position.y = 0.28 + Math.sin(now / 1400) * 0.04;
  } else {
    pivot.position.y += (0 - pivot.position.y) * 0.05;
  }
  // 4 sn dokunulmazsa tekrar kendi kendine dönmeye başlar
  if (inGallery && autoWanted && !controls.autoRotate && now - lastInteract > 4000) controls.autoRotate = true;
  // ışık rengi yumuşakça hedefe kayar
  key.color.lerp(isikHedef.ana, 0.04);
  rim.color.lerp(isikHedef.kenar, 0.04);
  rim.intensity += (isikHedef.k - rim.intensity) * 0.04;
  controls.update();
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

/* ---------------- Olaylar ---------------- */
$('#enter').onclick = enterGallery;
$('#navCollection').onclick = enterGallery;
addEventListener('wheel', (e) => { if (!inGallery && e.deltaY > 0) enterGallery(); }, { passive: true });
let touchY = null;
addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
addEventListener('touchmove', (e) => { if (!inGallery && touchY !== null && touchY - e.touches[0].clientY > 40) enterGallery(); }, { passive: true });
$('#brandHome').onclick = (e) => {
  e.preventDefault();
  inGallery = false;
  document.body.classList.remove('in-gallery');
  controls.enabled = false;
  flyCamera(HOME.hero, 1400);
};
$('#openDetail').onclick = openSheet;
$('#sheetClose').onclick = closeSheet;
$('#toolAuto').onclick = () => {
  autoWanted = !autoWanted;
  controls.autoRotate = autoWanted;
  $('#toolAuto').setAttribute('aria-pressed', autoWanted);
};
$('#toolReset').onclick = () => { flyCamera(HOME.gallery, 1000); };
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { closeSheet(); deniz.close(); }
  if (!inGallery) return;
  const list = URUNLER.filter(FILTRELER[filtre].f);
  const i = list.findIndex((p) => p.id === current?.p.id);
  if (e.key === 'ArrowRight') show(list[(i + 1) % list.length].id);
  if (e.key === 'ArrowLeft') show(list[(i - 1 + list.length) % list.length].id);
});


/* ---------------- Deniz ---------------- */
const deniz = new Deniz({
  urunler: URUNLER,
  aktif: () => current?.p,
  goster: (id) => { enterGallery(); show(id); },
  kucukResim: (id) => thumbs[id] || '',
});
$('#navDeniz').onclick = () => deniz.open();
$('#denizFab').onclick = () => deniz.open();
$('#askDeniz').onclick = () => deniz.open(`${current.p.ad} hakkında bilgi alabilir miyim?`);

/* ---------------- Başlat ---------------- */
async function start() {
  buildUI();
  const fromHash = URUNLER.find((p) => p.id === location.hash.slice(1));
  const heroId = fromHash?.id || URUNLER.find((p) => p.vitrin)?.id || URUNLER[0].id;
  const bar = $('#loaderBar');
  bar.style.width = '30%';
  const first = URUNLER.find((p) => p.id === heroId);
  await load(first);
  bar.style.width = '100%';
  await show(heroId, { instant: true });
  current.obj.scale.setScalar(0.001);
  requestAnimationFrame(loop);
  setTimeout(() => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('ready');
    // açılış: ürün ışığın içinden yavaşça belirir
    const o = current.obj;
    tween(2200, (t) => { const e = ease(t); o.scale.setScalar(0.001 + e * 0.999); o.rotation.y = -2.2 * (1 - e); });
  }, 350);
  if (fromHash || DEBUG.has('vitrin')) setTimeout(enterGallery, 900);

  // kalan modelleri sırayla arka planda yükle, küçük resimlerini çek
  snapshot(first, cache.get(first.id));
  for (const p of URUNLER) {
    try { const o = await load(p); snapshot(p, o); } catch (e) { console.warn('Model yüklenemedi', p.dosya, e); }
  }
}
start();

// Hata ayıklama ve Deniz için dışa açık küçük API
window.Isilti = { show, get current() { return current?.p; }, camera, controls, pivot };
