// Demo kayıt deposu: tarayıcıda tutulur; site, Klinik Paneli ve Yönetim Paneli buradan okur.
// Gerçek kurulumda bu katman sunucudaki veritabanına / klinik yazılımına bağlanır.
import { HIZMETLER, UZMANLAR } from './veri.js';

const ANAHTAR = 'lune_kayit_v1-dis';
const bos = () => ({ ziyaret: 0, sohbetler: 0, mesajlar: 0, analizler: 0, randevular: [], sorular: [], bloklar: [], paketler: [], bekleme: [] });

export function kayit() {
  let k;
  try { k = { ...bos(), ...JSON.parse(localStorage.getItem(ANAHTAR) || '{}') }; } catch { k = bos(); }
  k.randevular.forEach((r) => { r.uzman ||= uzmanBul(r.hid); r.durum ||= 'onayli'; r.kaynak ||= 'Ada'; });
  return k;
}
export function kaydet(fn) {
  const k = kayit();
  fn(k);
  try { localStorage.setItem(ANAHTAR, JSON.stringify(k)); } catch {}
  return k;
}
export function sifirla() { try { localStorage.removeItem(ANAHTAR); } catch {} }

// Hizmetin kategorisine göre uzman
export const uzmanBul = (hid) => {
  const h = HIZMETLER.find((x) => x.id === hid);
  return (UZMANLAR.find((u) => u.alan === h?.kat) || UZMANLAR[0]).ad;
};
export const dk = (saat) => { const [h, m] = saat.split(':').map(Number); return h * 60 + m; };

// Bu uzman bu aralıkta boş mu? (iptal edilenler saati boşaltır)
export function bosMu(k, { tarih, saat, sure, uzman, haric }) {
  const a = dk(saat), b = a + sure;
  const cakisir = (x, y) => a < y && x < b;
  const r = k.randevular.some((r) => r.id !== haric && r.tarih === tarih && r.uzman === uzman && r.durum !== 'iptal'
    && cakisir(dk(r.saat), dk(r.saat) + (HIZMETLER.find((h) => h.id === r.hid)?.sure || 60)));
  const bl = k.bloklar.some((x) => x.tarih === tarih && (x.uzman === uzman || x.uzman === 'hepsi') && cakisir(dk(x.bas), dk(x.bit)));
  return !r && !bl;
}

export const telSade = (t) => String(t || '').replace(/\D/g, '').replace(/^90/, '').replace(/^0/, '');

// Hizmetin önerilen tekrar aralığı (gün) — "bir sonraki seans" önerisi için
export const ARALIK = { muayene: 180, temizlik: 180, dolgu: 180, kanal: 14, implant: 90, cekim: 7, beyazlatma: 180, zirkonyum: 14, gulus: 14, plak: 49, braket: 30, flor: 180, 'cocuk-muayene': 180 };

// Demo senaryosu: bugünü ve geçmişi dolu, gerçekçi bir klinik
export function ornekVeri() {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const gun = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const H = (id) => HIZMETLER.find((h) => h.id === id);
  const simdi = Date.now();
  let id = simdi;
  const R = [];
  const ekle = (ad, tel, hid, g, saat, o = {}) => {
    const h = H(hid);
    R.push({ id: id++, ad, tel, hid, hizmet: h.ad, uzman: uzmanBul(hid), tarih: gun(g), saat, tutar: o.tutar ?? h.fiyat, kaynak: o.kaynak || 'Ada', kanal: o.kanal || ((o.kaynak || 'Ada') === 'Ada' && (id % 5 < 3) ? 'Meta reklam' : 'Organik'),
      durum: o.durum || (g < 0 ? 'geldi' : 'onayli'), wa: true, olusturma: o.olusturma ?? (() => { const d = new Date(); d.setDate(d.getDate() - Math.abs(g) - 2); d.setHours(o.gece ? 23 : 14, o.gece ? 40 : 10, 0, 0); return d.getTime(); })(), not: o.not || '' });
  };
  const saatSimdi = new Date().getHours();
  const gecti = (s) => Number(s.slice(0, 2)) < saatSimdi;
  // Bugün
  [['Zeynep Kaya', '0500 000 00 00', 'implant', '11:00', { not: 'İmplant 2. kontrol' }],
   ['Elif Demir', '0500 000 00 00', 'temizlik', '10:30', { kaynak: 'Telefon' }],
   ['Melis Arslan', '0500 000 00 00', 'kanal', '14:00', { not: 'Diş hekimi korkusu var, sakin anlatın' }],
   ['Ceren Yıldız', '0500 000 00 00', 'dolgu', '12:00', { kaynak: 'Instagram' }],
   ['Aslı Şahin', '0500 000 00 00', 'plak', '15:00', { gece: true, not: 'Şeffaf plak 3. set' }],
   ['Derya Koç', '0500 000 00 00', 'zirkonyum', '16:00', { gece: true }],
   ['Büşra Tekin', '0500 000 00 00', 'beyazlatma', '18:30', { not: 'Cumartesi düğünü var' }],
   ['Nazlı Er', '0500 000 00 00', 'muayene', '17:00', {}],
   ['Seda Aydın', '0500 000 00 00', 'cekim', '19:00', { gece: true }],
   ['İrem Çelik', '0500 000 00 00', 'flor', '14:00', { kaynak: 'Kapıdan' }],
  ].forEach(([a, t, h, s, o]) => ekle(a, t, h, 0, s, { ...o, durum: gecti(s) ? (a === 'Ceren Yıldız' ? 'gelmedi' : 'geldi') : 'onayli' }));
  // Yarın ve sonrası
  ekle('Gizem Kurt', '0500 000 00 00', 'temizlik', 1, '11:30', { gece: true });
  ekle('Ebru Polat', '0500 000 00 00', 'kanal', 1, '14:00');
  ekle('Zeynep Kaya', '0500 000 00 00', 'gulus', 1, '17:30');
  ekle('Pınar Öz', '0500 000 00 00', 'implant', 1, '19:00', { kaynak: 'Telefon' });
  ekle('Tuğba Şen', '0500 000 00 00', 'cocuk-muayene', 2, '12:00');
  ekle('Damla Uçar', '0500 000 00 00', 'braket', 2, '18:00', { gece: true });
  // Geçmiş (müşteri geçmişi + geri kazanım listesi)
  ekle('Zeynep Kaya', '0500 000 00 00', 'implant', -42, '11:00');
  ekle('Zeynep Kaya', '0500 000 00 00', 'implant', -84, '11:00');
  ekle('Zeynep Kaya', '0500 000 00 00', 'implant', -126, '10:30');
  ekle('Melis Arslan', '0500 000 00 00', 'kanal', -21, '13:00');
  ekle('Ceren Yıldız', '0500 000 00 00', 'dolgu', -30, '12:00', { durum: 'gelmedi' });
  ekle('Aslı Şahin', '0500 000 00 00', 'plak', -25, '15:00');
  ekle('Hande Yurt', '0500 000 00 00', 'temizlik', -64, '15:00');
  ekle('Sibel Ateş', '0500 000 00 00', 'kanal', -52, '16:30');
  ekle('Gamze Er', '0500 000 00 00', 'zirkonyum', -47, '12:30');
  ekle('Oya Tan', '0500 000 00 00', 'cekim', -71, '18:00');
  const paketler = [
    { id: id++, ad: 'Zeynep Kaya', tel: '0500 000 00 00', paket: 'İmplant + Zirkonyum Kron', hid: 'implant', toplam: 3, alim: gun(-126), odenen: 36000, kalan: 0 },
    { id: id++, ad: 'Aslı Şahin', tel: '0500 000 00 00', paket: 'Şeffaf Plak (12 ay)', hid: 'plak', toplam: 8, alim: gun(-25), odenen: 90000, kalan: 0 },
  ];
  // sayaç = gerçekten gelinen seanslar (şeffaflık: elle değil kayıttan)
  for (const p of paketler) {
    const s = R.filter((r) => telSade(r.tel) === telSade(p.tel) && r.hid === p.hid && r.durum === 'geldi' && r.tarih >= p.alim);
    s.forEach((r) => (r.paketSayildi = true));
    p.kullanilan = s.length;
  }
  return {
    reklam: { harcama: 7500, donem: 'Son 30 gün' },
    ziyaret: 412, sohbetler: 64, mesajlar: 281, analizler: 27, randevular: R, bloklar: [
      { id: id++, uzman: 'hepsi', tarih: gun(0), bas: '13:30', bit: '14:00', not: 'Öğle arası' }],
    paketler,
    bekleme: [
      { id: id++, ad: 'Merve Aksoy', tel: '0500 000 00 00', hid: 'kanal', tarih: gun(0), aralik: 'aksam', olusturma: simdi - 5 * 36e5 },
      { id: id++, ad: 'Ayça Bulut', tel: '0500 000 00 00', hid: 'temizlik', tarih: gun(1), aralik: 'hepsi', olusturma: simdi - 26 * 36e5 },
    ],
    sorular: [
      'Gece dişim zonkluyor, ne yapmalıyım?', 'İmplant acıtır mı, kaç seans?', 'Özel sigortam geçiyor mu?',
      'Çocuğum diş hekiminden korkuyor', 'Pazar günü açık mısınız?', 'Beyazlatma sonrası kahve içebilir miyim?', 'Şeffaf plak kaç ay sürer?',
    ].map((metin, i) => ({ t: simdi - i * 5400e3, metin })),
  };
}
export function ornekYukle() { try { localStorage.setItem(ANAHTAR, JSON.stringify(ornekVeri())); } catch {} }
