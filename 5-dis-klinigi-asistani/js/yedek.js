// Ada'nın yedek beyni — LLM'e ulaşılamazsa niyet eşleme ile kartlardan cevap verir. Uydurmaz.
import { SALON, HIZMETLER, PAKETLER, tl, musaitSaatler } from './veri.js';

const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
const has = (t, w) => w.some((x) => t.includes(x));
const isoYerel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ESLE = [
  ['kanal', ['kanal', 'agri', 'sizla', 'zonkl', 'gece', 'sicak soguk', 'hassas']],
  ['dolgu', ['dolgu', 'curuk', 'delik']],
  ['temizlik', ['tas', 'temizl', 'kanam', 'diseti']],
  ['implant', ['implant', 'eksik dis', 'dis cekildi', 'vida']],
  ['cekim', ['yirmilik', '20 yas', 'cekim', 'cektir']],
  ['beyazlatma', ['beyaz', 'sari', 'leke', 'renk']],
  ['zirkonyum', ['zirkon', 'kaplama', 'kron']],
  ['gulus', ['gulus', 'lamina', 'estetik']],
  ['plak', ['seffaf', 'plak', 'invisalign', 'capras', 'carpik']],
  ['braket', ['tel', 'braket', 'ortodonti']],
  ['flor', ['flor', 'fissur']],
  ['cocuk-muayene', ['cocug', 'cocuk', 'kizim', 'oglum']],
  ['muayene', ['muayene', 'kontrol', 'rontgen']],
];
const bul = (t) => ESLE.filter(([, w]) => has(t, w)).map(([id]) => id);
const sonHizmet = (gecmis) => { for (let i = gecmis.length - 1; i >= 0; i--) { const b = bul(norm(gecmis[i].metin)); if (b.length) return b[0]; } return null; };

export function yedekYanit(metin, gecmis = []) {
  const t = norm(metin);
  const ids = bul(t);
  const h = HIZMETLER.find((x) => x.id === ids[0]);
  const odak = h || HIZMETLER.find((x) => x.id === sonHizmet(gecmis));
  if (has(t, ['sislik', 'sisti', 'ates', 'kanama durmuyor', 'kirildi', 'dustu', 'cok agri', 'dayanam', 'nefes'])) return { metin: `Geçmiş olsun. Şiddetli ağrı, şişlik, ateş ya da kanama varsa lütfen hemen ${SALON.telefon} numarasını arayın; aynı gün muayene için öncelik veriyoruz. Nefes almada güçlük ya da hızla yayılan şişlik varsa 112'yi arayın.` };
  if (has(t, ['sigorta', 'anlasma', 'sgk', 'fatura', 'hekim burada', 'kampanya'])) return { metin: 'Bunu ekibimize ilettim; mesai saatinde birkaç dakika içinde size buradan dönecekler. Bu arada ücretsiz muayene için uygun bir saat bakalım mı?' };
  if (has(t, ['randevum', 'iptal', 'ertele'])) return { metin: 'Randevunuzu <a href="seanslarim.html" style="border-bottom:1px solid">Randevularım</a> sayfasından telefon numaranızla görebilir, iptal ya da erteleme yapabilirsiniz.' };
  if (has(t, ['paket', 'uyelik', 'aile'])) return { metin: 'Üç seçeneğimiz var: İmplant + Zirkonyum Kron, Gülüş Paketi ve yıllık Aile Bakım Üyeliği.', kartlar: PAKETLER.map((p) => p.id) };
  if (has(t, ['saat', 'randevu', 'bos', 'musait', 'yarin', 'bugun', 'hafta', 'yer var'])) {
    const hid = odak?.id || 'muayene';
    const d = new Date();
    if (has(t, ['yarin']) || d.getHours() >= 17) d.setDate(d.getDate() + 1);
    const ar = has(t, ['aksam']) ? 'aksam' : has(t, ['sabah']) ? 'sabah' : has(t, ['oglen', 'ogle']) ? 'oglen' : 'hepsi';
    let tarih = isoYerel(d), s = musaitSaatler(tarih, hid, ar);
    for (let i = 0; !s.length && i < 3; i++) { d.setDate(d.getDate() + 1); tarih = isoYerel(d); s = musaitSaatler(tarih, hid, ar); }
    return { metin: `${odak ? `<b>${odak.ad}</b> için` : 'Ücretsiz muayene için'} en yakın boş saatler aşağıda, uyan saate dokunmanız yeterli.`, slot: { hizmet: hid, tarih, saatler: s } };
  }
  if (odak && has(t, ['sonra', 'dikkat'])) return { metin: `<b>${odak.ad}</b> sonrası: ${odak.sonra}.`, kartlar: [] };
  if (h) return { metin: `<b>${h.ad}</b>: ${h.ozet} ${h.fiyat ? 'Başlangıç fiyatı ' + tl(h.fiyat) + '; kesin tutar muayeneden sonra yazılı planda netleşir.' : 'Ücretsizdir.'} Size uygun bir saat bakalım mı?`, kartlar: ids.slice(0, 2) };
  if (has(t, ['fiyat', 'ucret', 'kac para', 'ne kadar'])) return { metin: 'Fiyatlarımız sitede açık; kesin tutar ücretsiz muayeneden sonra yazılı tedavi planında netleşir. Hangi tedaviye bakıyordunuz?' };
  if (has(t, ['korku', 'korkuyor', 'kork'])) return { metin: 'Çok normal, hastalarımızın çoğu öyle başlıyor. Önce sadece tanışma ve muayene yapalım; her adımı yapmadan önce anlatıyoruz, istediğiniz an durabiliriz.' };
  if (has(t, ['merhaba', 'selam', 'iyi gunler'])) return { metin: 'Merhaba, hoş geldiniz! Randevu, fiyat ya da bir şikayetiniz için buradayım.' };
  return { metin: 'Bunu ekibimize iletebilirim; birkaç dakika içinde size dönerler. Bu arada ücretsiz muayene için saat bakmamı ister misiniz?' };
}
