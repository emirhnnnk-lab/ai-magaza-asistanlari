// Örnek Diş Kliniği — tedavi kartları. Hem tarayıcı hem sunucu (Ada'nın beyni) buradan okur. Fiyatlar demo amaçlıdır.
export const SALON = {
  ad: 'Örnek Diş Kliniği',
  slogan: 'İmplant · Estetik · Ortodonti · Çocuk',
  adres: 'Adres bilgisi eklenecek (demo)',
  saatler: 'Pazartesi–Cumartesi 09:00–20:00, Pazar kapalı',
  telefon: '0216 000 00 00 (demo)',
  ilkZiyaret: 'İlk muayene ve panoramik röntgen ücretsiz',
  avantajlar: [
    'İlk muayene + panoramik röntgen ücretsiz',
    'Tedavi planı yazılı ve fiyatı baştan belli; sürpriz ek ücret yok',
    'Randevudan 24 saat önce WhatsApp hatırlatması',
    'Kredi kartına 9 aya kadar taksit',
    'Acil ağrıda aynı gün muayene için öncelik',
    'Tek kullanımlık set, otoklav sterilizasyon',
  ],
  acil: 'Şiddetli ağrı, yüzde şişlik, ateş, durmayan kanama ya da travma (diş kırılması/düşmesi) varsa ACİL: aynı gün muayene için klinik aranmalı; nefes almada güçlük ya da hızla yayılan şişlikte 112.',
};

export const KATEGORILER = [
  { id: 'genel', ad: 'Genel Diş Hekimliği' },
  { id: 'implant', ad: 'İmplant & Cerrahi' },
  { id: 'estetik', ad: 'Estetik Diş' },
  { id: 'orto', ad: 'Ortodonti' },
  { id: 'cocuk', ad: 'Çocuk Diş' },
];

export const HIZMETLER = [
  { id: 'muayene', kat: 'genel', ad: 'Muayene + Panoramik Röntgen', sure: 30, fiyat: 0, etiket: 'İlk muayene ücretsiz',
    ozet: 'Hekim muayenesi, panoramik röntgen ve yazılı tedavi planı.', kime: 'Herkes; tedaviden önce ilk adım', seans: 'Yılda 1 kontrol önerilir', sonra: '—' },
  { id: 'temizlik', kat: 'genel', ad: 'Diş Taşı Temizliği + Cila', sure: 45, fiyat: 2500,
    ozet: 'Diş taşı ve lekelerin temizlenmesi, cila.', kime: 'Diş eti kanaması, taş, lekesi olanlar', seans: '6 ayda bir', sonra: '1 saat bir şey yemeyin, 24 saat çay/kahveyi azaltın' },
  { id: 'dolgu', kat: 'genel', ad: 'Kompozit Dolgu (diş rengi)', sure: 45, fiyat: 3500,
    ozet: 'Çürük temizlenir, diş renginde dolguyla kapatılır.', kime: 'Çürük, kırık ya da eski amalgam dolgu', seans: 'Tek seans', sonra: 'Uyuşukluk geçene kadar (1–2 saat) yemek yemeyin' },
  { id: 'kanal', kat: 'genel', ad: 'Kanal Tedavisi', sure: 75, fiyat: 7500,
    ozet: 'İltihaplı ya da ölmüş sinirin temizlenip kanalların doldurulması; diş korunur.', kime: 'Sıcak-soğuğa uzun süren ağrı, gece ağrısı', seans: '1–2 seans', sonra: 'Birkaç gün hassasiyet normaldir; tedavi edilen dişle sert şey ısırmayın' },
  { id: 'implant', kat: 'implant', ad: 'İmplant (tek diş, kron hariç)', sure: 60, fiyat: 28000, etiket: 'Ücretsiz 3D tomografi',
    ozet: 'Eksik dişin yerine çene kemiğine yerleştirilen titanyum kök. Kron iyileşmeden sonra takılır.', kime: 'Eksik dişi olan, köprü istemeyenler', seans: 'Yerleştirme + 2–3 ay iyileşme + kron', sonra: 'İlk gün sıcak ve sert gıda yok, sigara iyileşmeyi bozar' },
  { id: 'cekim', kat: 'implant', ad: '20 Yaş Dişi Çekimi', sure: 45, fiyat: 4500,
    ozet: 'Gömülü ya da yarı gömülü yirmilik dişin cerrahi çekimi.', kime: 'Yirmilik ağrısı, yer darlığı, tekrarlayan iltihap', seans: 'Tek seans', sonra: 'İlk 24 saat tükürmeyin, pipetle içmeyin, soğuk kompres' },
  { id: 'beyazlatma', kat: 'estetik', ad: 'Ofis Tipi Diş Beyazlatma', sure: 60, fiyat: 8000, etiket: 'Tek seansta',
    ozet: 'Klinikte ışık destekli beyazlatma; birkaç ton açılma.', kime: 'Çay/kahve/sigara lekesi, sararmış dişler', seans: 'Tek seans, gerekirse ev tipi destek', sonra: '48 saat renkli yiyecek-içecek yok' },
  { id: 'zirkonyum', kat: 'estetik', ad: 'Zirkonyum Kron (diş başı)', sure: 60, fiyat: 12000,
    ozet: 'Metal içermeyen, doğal görünümlü kaplama.', kime: 'Kırık, renkli ya da şekilsiz dişler', seans: '2–3 seans (ölçü, prova, yapıştırma)', sonra: 'Geçici kaplamayla yapışkan gıdalardan kaçının' },
  { id: 'gulus', kat: 'estetik', ad: 'Gülüş Tasarımı Ön Görüşmesi', sure: 30, fiyat: 0,
    ozet: 'Fotoğraf ve dijital planla size uygun gülüşü birlikte tasarlarız.', kime: 'Lamina, zirkonyum, beyazlatma düşünenler', seans: 'Görüşme', sonra: '—' },
  { id: 'plak', kat: 'orto', ad: 'Şeffaf Plak Tedavisi', sure: 45, fiyat: 90000,
    ozet: 'Tel olmadan, çıkarılabilir şeffaf plaklarla diş düzeltme.', kime: 'Çapraşık ya da aralıklı dişler, yetişkinler', seans: 'Ortalama 6–18 ay, 6–8 haftada bir kontrol', sonra: 'Plaklar günde 22 saat takılır' },
  { id: 'braket', kat: 'orto', ad: 'Ortodonti Ön Muayenesi', sure: 30, fiyat: 0,
    ozet: 'Ortodontistle değerlendirme, röntgen ve tedavi seçenekleri (braket ya da plak).', kime: 'Çocuk ve yetişkin ortodonti adayları', seans: 'Görüşme', sonra: '—' },
  { id: 'flor', kat: 'cocuk', ad: 'Çocuk Flor + Fissür Örtücü', sure: 30, fiyat: 1500, etiket: 'Çürüğü önler',
    ozet: 'Süt ve kalıcı dişleri çürüğe karşı koruyan uygulama.', kime: '3–12 yaş çocuklar', seans: '6 ayda bir', sonra: '30 dk yiyip içmeyin' },
  { id: 'cocuk-muayene', kat: 'cocuk', ad: 'Çocuk İlk Diş Muayenesi', sure: 30, fiyat: 0,
    ozet: 'Pedodontistle oyunla tanışma ve muayene; korkutmadan.', kime: '2 yaş ve üstü', seans: '6 ayda bir', sonra: '—' },
];

export const PAKETLER = [
  { id: 'implant-paket', ad: 'İmplant + Zirkonyum Kron', icerik: ['3D tomografi', 'İmplant (tek diş)', 'Zirkonyum kron', '1 yıl ücretsiz kontrol'], fiyat: 36000, normal: 40000, not: '9 aya kadar taksit' },
  { id: 'gulus-paket', ad: 'Gülüş Paketi', icerik: ['Diş taşı temizliği', 'Ofis tipi beyazlatma', 'Ev tipi destek plağı'], fiyat: 9500, normal: 12500, not: 'Düğün, mezuniyet öncesi çok tercih edilir' },
  { id: 'aile', ad: 'Aile Bakım Üyeliği (yıllık)', icerik: ['4 kişiye kadar yılda 2 kontrol + temizlik', 'Çocuklara flor', 'Tüm tedavilerde %10'], fiyat: 7900, normal: 11000, not: 'Taksitli ödenebilir' },
];

export const UZMANLAR = [
  { ad: 'Dr. Dt. Mert', unvan: 'Ağız, diş ve çene cerrahisi · implant', alan: 'implant' },
  { ad: 'Dt. Selin', unvan: 'Estetik diş hekimliği', alan: 'estetik' },
  { ad: 'Dr. Dt. Ece', unvan: 'Ortodonti uzmanı', alan: 'orto' },
  { ad: 'Dt. Can', unvan: 'Çocuk diş hekimi (pedodonti)', alan: 'cocuk' },
];

export const tl = (n) => (n ? n.toLocaleString('tr-TR') + ' TL' : 'Ücretsiz');

// Demo müsaitlik: gün + hizmetten deterministik boş saatler
export function musaitSaatler(tarihISO, hizmetId, aralik = 'hepsi') {
  const h = HIZMETLER.find((x) => x.id === hizmetId) || HIZMETLER[0];
  const d = new Date(tarihISO + 'T12:00:00');
  const pazar = d.getDay() === 0;
  if (pazar) return [];
  const bas = 9, son = 20;
  const out = [];
  let seed = [...(tarihISO + h.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  const [a0, a1] = { sabah: [0, 12], oglen: [12, 17], aksam: [17, 24] }[aralik] || [0, 24];
  for (let s = bas; s * 60 + h.sure <= son * 60; s += 0.5) {
    seed = (seed * 17 + 11) % 97;
    if (seed % 3 !== 0 || s < a0 || s >= a1) continue; // dolu ya da aralık dışı
    const hh = Math.floor(s), mm = s % 1 ? '30' : '00';
    out.push(`${String(hh).padStart(2, '0')}:${mm}`);
  }
  return out.slice(0, 6);
}
