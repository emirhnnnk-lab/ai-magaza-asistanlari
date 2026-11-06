// Ela'nın yedek beyni — LLM'e ulaşılamazsa niyet eşleme ile kartlardan cevap verir. Uydurmaz.
import { SALON, HIZMETLER, PAKETLER, tl, musaitSaatler } from './veri.js';

const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
const has = (t, w) => w.some((x) => t.includes(x));
const isoYerel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ESLE = [
  ['hydrafacial', ['hydra', 'mat', 'yorgun', 'isilti', 'siyah nokta', 'parlak']],
  ['medikal-bakim', ['sivilce', 'akne', 'gozenek', 'yagli']],
  ['dermapen', ['leke', 'iz', 'dermapen', 'mezoterapi', 'cizgi', 'kirisik']],
  ['altin-maske', ['davet', 'nisan', 'altin maske', 'ozel gun']],
  ['lazer-tum-vucut', ['tum vucut', 'lazer', 'epilasyon']],
  ['lazer-bolge', ['koltuk', 'bikini', 'biyik', 'tek bolge']],
  ['ipek-kirpik', ['ipek kirpik', 'kirpik ekle', 'takma kirpik']],
  ['lifting', ['lifting', 'laminasyon', 'kirpik']],
  ['kas-tasarim', ['kas']],
  ['protez-tirnak', ['protez', 'jel']],
  ['kalici-oje', ['oje', 'manikur', 'tirnak']],
  ['spa-pedikur', ['pedikur', 'ayak']],
  ['g5', ['g5', 'selulit', 'incel']],
  ['lenf', ['lenf', 'odem']],
];
const bul = (t) => ESLE.filter(([, w]) => has(t, w)).map(([id]) => id);
const sonHizmet = (gecmis) => { for (let i = gecmis.length - 1; i >= 0; i--) { const b = bul(norm(gecmis[i].metin)); if (b.length) return b[0]; } return null; };

export function yedekYanit(metin, gecmis = []) {
  const t = norm(metin);
  const ids = bul(t);
  const h = HIZMETLER.find((x) => x.id === ids[0]);
  const odak = h || HIZMETLER.find((x) => x.id === sonHizmet(gecmis));

  if (has(t, ['seans kald', 'kac seans', 'seanslarim', 'randevum', 'paketim'])) return { metin: 'Kalan seanslarınızı ve randevularınızı <a href="seanslarim.html" style="border-bottom:1px solid">Seanslarım</a> sayfasından telefon numaranızla anında görebilirsiniz; her seans tarih ve uzmanıyla yazılı.' };
  if (has(t, ['dugun', 'gelin'])) return { metin: `Tebrikler! **Gelin Paketi** tam bu iş için: düğünden 6 hafta önce başlıyoruz, takvimi biz planlıyoruz. Normalde ${tl(13600)}, pakette ${tl(9900)}.`.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'), kartlar: ['gelin'] };
  if (has(t, ['paket', 'uyelik', 'abonelik'])) return { metin: 'Üç seçeneğimiz var: Gelin Paketi, 8 seans tüm vücut lazer ve aylık Işıltı Üyeliği. En çok tercih edilen üyelik; istediğiniz ay dondurabiliyorsunuz.', kartlar: PAKETLER.map((p) => p.id) };
  if (has(t, ['saat', 'randevu', 'bos', 'musait', 'yarin', 'bugun', 'hafta', 'yer var', 'baska bir gun', 'indirim'])) {
    const hid = odak?.id || 'hydrafacial';
    const d = new Date();
    if (has(t, ['yarin', 'baska bir gun']) || d.getHours() >= 17) d.setDate(d.getDate() + 1);
    const ar = has(t, ['aksam']) ? 'aksam' : has(t, ['sabah']) ? 'sabah' : has(t, ['oglen', 'ogle']) ? 'oglen' : 'hepsi';
    let tarih = isoYerel(d), s = musaitSaatler(tarih, hid, ar);
    if (!s.length) { d.setDate(d.getDate() + 1); tarih = isoYerel(d); s = musaitSaatler(tarih, hid, ar); }
    const ind = has(t, ['indirim', 'ilk']) ? ' İlk ziyaretinize %15 indirim formda otomatik tanımlı.' : '';
    return { metin: `${odak ? `<b>${odak.ad}</b> için` : 'Size'} en yakın boş saatler aşağıda, uyan saate dokunmanız yeterli.${ind}`, slot: { hizmet: hid, tarih, saatler: s } };
  }
  if (h && has(t, ['acit', 'agri', 'can yak'])) return { metin: `${h.id.startsWith('lazer') ? 'Buz lazerde başlık soğutmalı, çoğu misafirimiz hafif bir ılıklık hissediyor; acı eşiği kişiden kişiye değişir.' : 'Genellikle konforlu bir uygulamadır.'} ${h.seans}.`, kartlar: [h.id] };
  if (odak && has(t, ['sonra', 'dikkat', 'bakim'])) return { metin: `<b>${odak.ad}</b> sonrası: ${odak.sonra}.`, kartlar: [] };
  if (h) return { metin: `<b>${h.ad}</b>: ${h.ozet} ${h.sure} dakika, ${tl(h.fiyat)}. ${h.seans}. Size uygun bir saat bakalım mı?`, kartlar: ids.slice(0, 2) };
  if (odak && has(t, ['fiyat', 'ucret', 'kac para', 'ne kadar'])) return { metin: `<b>${odak.ad}</b> ${tl(odak.fiyat)}, ilk ziyarette %15 indirimle ${tl(Math.round(odak.fiyat * 0.85))}.`, kartlar: [odak.id] };
  if (has(t, ['fiyat', 'ucret'])) return { metin: 'Tüm fiyatlarımız sitede açık. Hangi hizmete bakıyordunuz? Cilt bakımı, lazer, kirpik ya da tırnak?' };
  if (has(t, ['adres', 'nerede', 'konum'])) return { metin: `${SALON.adres}. Çalışma saatlerimiz: ${SALON.saatler}.` };
  if (has(t, ['cilt', 'ne iyi gelir', 'oneri', 'ne onerir'])) return { metin: 'Cildiniz gün içinde daha çok parlıyor mu, yoksa gergin ve kuru mu hissettiriyor? Bir de sizi en çok ne rahatsız ediyor: matlık, sivilce ya da leke?' };
  if (has(t, ['kahve', 'latte', 'cay'])) return { metin: 'Not aldım, geldiğinizde hazır olacak. Görüşmek üzere!' };
  if (has(t, ['arkadas'])) return { metin: 'Elbette! Arkadaşını getir kampanyasıyla ikinize de 250 TL hediye puan tanımlıyoruz. Aynı saate ikinci bir randevu açayım mı?' };
  if (has(t, ['iptal', 'ertele'])) return { metin: 'Randevudan 12 saat öncesine kadar ücretsiz iptal ya da erteleme yapabilirsiniz; WhatsApp hatırlatma mesajına "ertele" yazmanız yeterli.' };
  if (has(t, ['merhaba', 'selam', 'iyi gunler'])) return { metin: 'Merhaba, hoş geldiniz! Bugün sizin için ne yapabilirim? Randevu, fiyat ya da cilt önerisi?' };
  return { metin: 'Bunu salonla teyit edip size dönmelerini sağlayabilirim. Bu arada randevu, fiyat ya da bakım önerisi konusunda hemen yardımcı olabilirim.' };
}
