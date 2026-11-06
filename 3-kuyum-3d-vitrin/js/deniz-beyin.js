// Deniz'in beyni — LLM yok. Niyet eşleme + bilgi kartları + küçük bir oturum hafızası.
// Kural: kartta olmayan bilgiyi asla uydurmaz; bilmediğini kibarca söyler.
// Saf modül: DOM'a dokunmaz, Node'da da test edilebilir (node isilti/test-deniz.mjs).

import { URUNLER, MAGAZA, fiyatYaz } from './urunler.js';

/* ---------------- Yardımcılar ---------------- */
export function norm(s) {
  return (s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9.,%\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// kelime başından eşleşme: "alyans" → "alyansın", "alyansı" da yakalanır
const has = (t, words) => words.some((w) => new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const byId = (id) => URUNLER.find((u) => u.id === id);
const altinYaz = (p) => `${p.maden.ayar} ${p.maden.renk}${/altin/.test(norm(p.maden.renk)) ? '' : ' altın'}`;
const gramYaz = (g) => String(g).replace('.', ',');

/* ---------------- Ürün adları ve takma adlar ---------------- */
const TAKMA = {
  trilogy: ['trilogy', 'trilogi', 'uc tasli', 'uc tas'],
  saat: ['saat', 'bicolor', 'atelier', 'kol saati'],
  mineli: ['mineli', 'mine', 'saray', 'yakut', 'turkuaz'],
  alyans: ['alyans', 'orgu', 'evlilik yuzugu'],
  tektas: ['tektas', 'tek tas', 'solitaire', 'klasik tektas'],
  kelepce: ['kelepce', 'bileklik', 'bilezik', 'oniks'],
  muhur: ['muhur', 'antik', 'serce yuzugu', 'arma'],
  oval: ['oval', 'kralice', 'iki karat', '2 karat', '2,01'],
  pave: ['pave', 'kubbe', 'kokteyl'],
  tanzanit: ['tanzanit', 'lavanta', 'mor tas', 'mor yuzuk'],
};
function urunBul(t) {
  const out = [];
  for (const [id, words] of Object.entries(TAKMA)) if (has(t, words)) out.push(id);
  return out;
}

/* ---------------- Niyet sözlüğü ---------------- */
const N = {
  selam: ['merhaba', 'selam', 'slm', 'iyi gunler', 'iyi aksamlar', 'gunaydin', 'hey', 'mrb', 'selamlar', 'hos bulduk'],
  nasilsin: ['nasilsin', 'naber', 'nasil gidiyor'],
  tesekkur: ['tesekkur', 'sagol', 'sag ol', 'cok iyi', 'harika', 'super', 'mersi', 'eyvallah'],
  veda: ['gorusuruz', 'hosca kal', 'iyi geceler', 'bay bay', 'bye', 'kendine iyi bak'],
  kimsin: ['kimsin', 'sen kim', 'bot mu', 'robot', 'yapay zeka', 'insan misin', 'gercek misin', 'adin ne'],

  fiyat: ['fiyat', 'kac para', 'kaca', 'ne kadar', 'ucret', 'kac tl', 'kac lira', 'tutar', 'pahali', 'maliyet'],
  tas: ['tas', 'pirlanta', 'karat', 'ct', 'berrak', 'kesim', 'sertifika', 'gia', 'hrd', 'elmas', 'kac karat'],
  maden: ['ayar', 'maden', 'kac ayar', 'hangi altin', 'altini ne', 'altin mi'],
  gram: ['gram', 'agirlik', 'agir mi', 'hafif mi', 'kac gr'],
  olcu: ['olcu', 'numara', 'beden', 'parmak', 'bilek', 'genislik', 'mm', 'boyut', 'kac numara'],
  bakim: ['bakim', 'temizle', 'temizlik', 'kararir', 'parlat', 'nasil korur', 'koruma', 'saklama'],
  gravur: ['yazi', 'isim yaz', 'gravur', 'tarih yaz', 'kazi', 'not yaz', 'isim'],
  anlat: ['anlat', 'hikaye', 'bilgi', 'tanit', 'nedir', 'hakkinda', 'ozellik', 'detay', 'neler soyle'],
  kime: ['kime', 'uygun mu', 'yakisir mi', 'hangi gun', 'ne zaman takilir', 'kimler icin'],
  benzer: ['benzer', 'baska', 'alternatif', 'farkli', 'bunun gibi'],
  birlikte: ['yanina', 'kombin', 'birlikte', 'eslik', 'yaninda', 'set'],
  goster: ['goster', 'bakalim', 'acar misin', 'gorebilir', 'gormek', 'ac', 'getir', 'bakayim'],

  garanti: ['garanti'],
  iade: ['iade', 'degisim', 'geri ver', 'begenmezsem', 'olmazsa', 'degistir'],
  kargo: ['kargo', 'teslim', 'gonderi', 'kac gunde', 'ne zaman gelir', 'kurye', 'adrese', 'sehir disi'],
  taksit: ['taksit', 'odeme', 'kredi kart', 'havale', 'eft', 'nakit', 'pesin'],
  kutu: ['kutu', 'paket', 'hediye paketi', 'ambalaj'],
  dene: ['artirilmis', 'denemek', 'deneyebilir', 'parmakta', 'elimde', 'uzerimde', 'sanal deneme'],
  magaza: ['magaza', 'adres', 'nerede', 'telefon', 'iletisim', 'sube', 'randevu', 'ziyaret'],
  satinal: ['almak istiyorum', 'satin al', 'siparis', 'sepete', 'alayim', 'aliyorum', 'karar verdim', 'bunu istiyorum', 'nasil alirim'],
  indirim: ['indirim', 'pazarlik', 'son fiyat', 'ucuzlat', 'kampanya', 'firsat', 'kupon'],
  altinFiyat: ['gram altin', 'altin fiyat', 'has altin', 'ceyrek', 'altin kuru', 'altin ne kadar'],
  dortc: ['4c', 'dort c', 'vs1 ne', 'vs2 ne', 'vvs', 'berraklik ne', 'renk ne demek', 'karat ne demek', 'g renk', 'f renk', 'e renk'],
  ayarFark: ['ayar farki', '14 ile 18', '18 ile 22', 'hangi ayar', 'ayar ne demek', '14 ayar mi 18', 'kac ayar daha'],

  oner: ['oner', 'tavsiye', 'ne alsam', 'ne alabilirim', 'hangisi', 'karar veremedim', 'yardim', 'bakiyorum', 'ariyorum', 'istiyorum', 'dusunuyorum', 'secemedim', 'fikir'],
  liste: ['hepsi', 'neler var', 'koleksiyon', 'urunler', 'ne var', 'tum urun', 'neleriniz var', 'katalog'],
  enUcuz: ['en ucuz', 'en uygun', 'butce dostu', 'ekonomik', 'uygun fiyatli'],
  enPahali: ['en pahali', 'en degerli', 'en luks', 'en ozel', 'en iddiali'],
  karsilastir: ['fark', 'karsilastir', 'hangisi daha', 'mi yoksa', 'arasinda'],
};

const VESILE = {
  'Evlilik teklifi': ['teklif', 'evlenme', 'evlilik teklif', 'evlen'],
  'Nişan': ['nisan'],
  'Söz': ['soz'],
  'Evlilik': ['dugun', 'evlilik', 'alyans'],
  'Yıldönümü': ['yildonum', 'yil donum', 'senemiz', 'yilimiz'],
  'Doğum günü': ['dogum gun', 'dogumgun'],
  'Anneye hediye': ['anneme', 'annem', 'anneler gunu'],
  'Babaya hediye': ['babama', 'babam', 'babalar gunu'],
  'Mezuniyet': ['mezuniyet', 'mezun'],
  'Kendine hediye': ['kendime', 'kendim icin', 'kendimi'],
  'Davet': ['davet', 'dugune gidecegim', 'gece', 'gala', 'parti'],
  'Terfi': ['terfi', 'yeni is'],
};
const ERKEK = ['erkek', 'babama', 'babam', 'kocama', 'esim erkek', 'erkek arkadas', 'nisanlima', 'sevgilime erkek', 'abime', 'kardesime erkek', 'beye'];
const KADIN = ['kadin', 'anneme', 'annem', 'kiz arkadas', 'hanimima', 'karima', 'ablama', 'kizima', 'sevgilime', 'nisanlima kadin', 'bayan'];

/* ---------------- Bütçe ---------------- */
export function butceBul(t) {
  // "50 bin", "50bin", "1,5 milyon", "120.000", "80k", "100 000 tl"
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(milyon|bin|k)\b/);
  let val = null;
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'));
    val = m[2] === 'milyon' ? n * 1e6 : n * 1e3;
  } else {
    m = t.match(/(\d{1,3}(?:[. ]\d{3})+|\d{4,})\s*(tl|lira|₺)?/);
    if (m) val = parseInt(m[1].replace(/[. ]/g, ''), 10);
  }
  if (!val || val < 1000) return null;
  const ust = has(t, ['ustu', 'uzeri', 'fazla', 'yukari', 'en az']);
  return ust ? { min: val } : { max: val * (has(t, ['civari', 'gibi', 'falan', 'aşağı yukarı', 'asagi yukari']) ? 1.15 : 1) };
}

/* ---------------- Cevap kalıpları ---------------- */
const ACILIS = ['', 'Elbette efendim. ', 'Tabii. ', 'Memnuniyetle. '];
const L = (p) => `<b>${p.ad}</b>`;

function fiyatCevap(p) {
  let s = `${L(p)} ${fiyatYaz(p.fiyat)}, KDV dahil.`;
  if (p.fiyatNot) s += ` Bu ${p.fiyatNot}.`;
  if (p.fiyat >= 100000) s += ' Anlaşmalı kartlara 9 taksite kadar seçeneğimiz var.';
  else s += ' Tüm kartlara peşin fiyatına 3 taksit yapabiliyoruz.';
  return s;
}
function tasCevap(p) {
  if (!p.tas) return `${L(p)} taşsız bir model efendim; tamamen ${altinYaz(p)} işçiliği öne çıkıyor.`;
  const t = p.tas;
  const parca = [];
  if (t.tur === 'Pırlanta' && t.adet === 1) parca.push(`${t.karat} ${t.kesim ? t.kesim.split(',')[0].toLowerCase() : ''} bir pırlanta`);
  else parca.push(`${t.adet} adet ${t.tur.toLowerCase()}${t.karat ? `, ${t.karat}` : ''}`);
  let s = `${L(p)} üzerinde ${parca[0]} var.`;
  if (t.renk && t.berraklik && /pirlanta/.test(norm(t.tur))) s += ` Renk ${t.renk}, berraklık ${t.berraklik}.`;
  else if (t.renk) s += ` Rengi ${t.renk.toLowerCase()}.`;
  if (t.sertifika) s += ` ${t.sertifika} ${/rapor/i.test(t.sertifika) ? 'ile' : 'sertifikasıyla'} birlikte teslim ediyoruz.`;
  if (p.secenek) s += ` ${p.secenek}`;
  return s;
}
const madenCevap = (p) => `${L(p)} ${altinYaz(p)}${p.maden.gram ? `, yaklaşık ${gramYaz(p.maden.gram)} gram` : ''}.${p.mekanizma ? ' ' + p.mekanizma + '.' : ''}`;
const gramCevap = (p) => `${L(p)} yaklaşık ${gramYaz(p.maden.gram)} gram ${p.maden.ayar} altın. ${p.maden.gram < 4 ? 'Elde çok hafif, takıldığı hissedilmiyor.' : p.maden.gram > 10 ? 'Dolgun ve tok bir parça; elinize aldığınızda kalitesini hissedersiniz.' : 'Ne çok hafif ne ağır, tam dengesinde.'}`;
function olcuCevap(p) {
  let s = `${L(p)} için ölçü: ${p.olcu}.`;
  if (p.kategori === 'Yüzük') s += ` ${MAGAZA.hizmetler.olcu}`;
  return s;
}
const bakimCevap = (p) => `${p.bakim} Ayrıca ${MAGAZA.hizmetler.bakim.charAt(0).toLowerCase() + MAGAZA.hizmetler.bakim.slice(1)}`;
const gravurCevap = (p) => (p.gravur
  ? `${MAGAZA.hizmetler.gravur}${p.harf ? ' ' + p.harf : ''}`
  : `${L(p)} el işçiliği mine içerdiği için iç yüzeye yazı işlemiyoruz efendim; minenin zarar görmesini istemeyiz.`);
const anlatCevap = (p) => [p.deniz, `<i>${p.hikaye}</i>`];
const kimeCevap = (p) => `${L(p)} en çok ${listele(p.vesile.map((v) => v.toLowerCase()))} için tercih ediliyor. Tarzı ${listele(p.stil.map((v) => v.toLowerCase()))}${p.cinsiyet === 'unisex' ? '; unisex bir model, beylerde de çok güzel duruyor.' : '.'}`;
function listele(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1]; }

function sssBul(p, t) {
  let best = null, score = 0;
  for (const q of p.sss || []) {
    const s = q.k.filter((k) => has(t, [k])).length;
    if (s > score) { best = q; score = s; }
  }
  return best;
}

/* ---------------- Beyin ---------------- */
export class DenizBeyin {
  constructor() {
    this.son = null;          // en son konuşulan ürün
    this.profil = {};         // {butce, vesile, cinsiyet, kategori, tasli}
    this.tur = 0;
    this.gosterilen = new Set();
  }

  karsilama(aktif) {
    const p = aktif && byId(aktif);
    const saat = new Date().getHours();
    const selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
    const m = [`${selam}, Örnek Kuyum’a hoş geldiniz. Ben Deniz, mücevher danışmanınızım.`];
    if (p) m.push(`Şu an ${L(p)}’e bakıyorsunuz, çok güzel bir seçim. Dilerseniz size onu anlatayım; ya da aradığınız şeyi söyleyin, birlikte en doğru parçayı bulalım.`);
    else m.push('Kendiniz için mi bakıyorsunuz, yoksa birine hediye mi? Söyleyin, size en uygun parçayı birlikte bulalım.');
    return { metin: m, cipler: this.cipler(p) };
  }

  cipler(p) {
    if (p) {
      const c = ['Fiyatı nedir?', p.tas ? 'Taşı hakkında bilgi' : 'Kaç ayar?', p.kategori === 'Saat' ? 'Suya dayanıklı mı?' : 'Ölçü seçenekleri', 'Benzerlerini göster'];
      return c;
    }
    return ['Bana bir öneride bulunur musunuz?', 'Nişan için ne önerirsiniz?', '100 bin TL altı neler var?', 'Kargo ve iade'];
  }

  yanit(ham, aktifId) {
    this.tur++;
    const t = norm(ham);
    const aktif = aktifId ? byId(aktifId) : null;
    const anilan = urunBul(t);
    const isaret = has(t, ['bu', 'bunun', 'bunu', 'buna', 'su', 'sunun', 'bundaki', 'ekrandaki', 'baktigim']);
    // Referans ürün: açıkça anılan > "bu" + ekrandaki > son konuşulan > ekrandaki
    const ref = anilan.length ? byId(anilan[0]) : isaret ? aktif : (this.son || aktif);
    const r = { metin: [], kartlar: [], goster: null, cipler: null };
    const say = (s) => r.metin.push(s);

    // profil güncelle (öneri ve sonraki turlar için)
    const butce = butceBul(t);
    if (butce) this.profil.butce = butce;
    for (const [v, w] of Object.entries(VESILE)) if (has(t, w)) this.profil.vesile = v;
    if (has(t, ERKEK)) this.profil.cinsiyet = 'erkek';
    else if (has(t, KADIN)) this.profil.cinsiyet = 'kadın';
    if (has(t, ['yuzuk'])) this.profil.kategori = 'Yüzük';
    if (has(t, ['bileklik', 'bilezik', 'kelepce'])) this.profil.kategori = 'Bileklik';
    if (has(t, ['saat'])) this.profil.kategori = 'Saat';
    if (has(t, ['pirlanta', 'tektas', 'tasli', 'elmas'])) this.profil.tasli = 'pırlanta';
    if (has(t, ['renkli tas', 'renkli', 'mor', 'kirmizi', 'yakut', 'tanzanit'])) this.profil.tasli = 'renkli';
    if (has(t, ['tassiz', 'sade', 'duz'])) this.profil.tasli = 'tassiz';

    /* --- 1. Sosyal --- */
    if (has(t, N.kimsin)) {
      say('Ben Deniz, Örnek Kuyum’un dijital mücevher danışmanıyım. Koleksiyondaki her parçanın taşını, ayarını, ölçüsünü ve hikâyesini biliyorum. Bilmediğim bir şey olursa uydurmam, açıkça söylerim.');
      say('Size nasıl yardımcı olabilirim?');
      r.cipler = this.cipler(aktif);
      return r;
    }
    const kisa = t.split(' ').length <= 4;
    if (kisa && has(t, N.tesekkur) && !anilan.length) {
      say(pick(['Rica ederim efendim, ne demek.', 'Ben teşekkür ederim. Başka bakmak istediğiniz bir parça olursa buradayım.', 'Rica ederim. Aklınıza takılan her şeyi sorabilirsiniz.']));
      r.cipler = this.cipler(aktif);
      return r;
    }
    if (kisa && has(t, N.veda)) {
      say(pick(['İyi günler dilerim, yine bekleriz efendim.', 'Bizi ziyaret ettiğiniz için teşekkürler. Görüşmek üzere.']));
      return r;
    }
    if (kisa && has(t, N.nasilsin)) {
      say('Teşekkür ederim, çok iyiyim; vitrin bugün çok güzel parlıyor. Siz nasılsınız? Size bugün ne göstermemi istersiniz?');
      r.cipler = this.cipler(aktif);
      return r;
    }
    if (kisa && has(t, N.selam) && !anilan.length) {
      say(pick(['Merhaba, hoş geldiniz.', 'Merhabalar, hoş geldiniz.']) + ' ' + (aktif ? `Şu an ${L(aktif)}’e bakıyorsunuz. Anlatmamı ister misiniz, yoksa aradığınız başka bir şey mi var?` : 'Size nasıl yardımcı olabilirim?'));
      r.cipler = this.cipler(aktif);
      return r;
    }

    /* --- 2. Karşılaştırma (iki ürün) --- */
    if (anilan.length >= 2 || (has(t, N.karsilastir) && anilan.length === 1 && aktif && aktif.id !== anilan[0])) {
      const a = byId(anilan[0]);
      const b = anilan.length >= 2 ? byId(anilan[1]) : aktif;
      say(this.karsilastir(a, b));
      r.kartlar = [a.id, b.id];
      this.son = a;
      r.cipler = [`${a.kisaAd}’ı göster`, `${b.kisaAd}’ı göster`, 'Hangisini önerirsiniz?'];
      return r;
    }

    /* --- 3. Genel bilgi (ürünsüz) --- */
    if (has(t, N.altinFiyat)) {
      say('Güncel gram ve çeyrek altın kurunu buradan veremiyorum efendim, anlık değiştiği için yanlış bilgi vermek istemem.');
      say('Sitemizdeki fiyatlar işçilik ve taş dahil sabit fiyatlardır; sipariş anındaki fiyat geçerli olur.');
      return r;
    }
    if (has(t, N.dortc)) {
      say('Pırlantanın değeri “4C” ile ölçülür: <b>karat</b> (ağırlık; 1 karat 0,2 gram), <b>renk</b> (D en beyaz, sonra E, F, G… diye iner), <b>berraklık</b> (FL kusursuz; VVS ve VS izlerin büyüteçle bile zor görüldüğü sınıflar) ve <b>kesim</b> (ışığı ne kadar iyi geri yansıttığı).');
      const p = ref && ref.tas && /pirlanta/.test(norm(ref.tas.tur)) ? ref : null;
      if (p) say(`Örneğin ${L(p)}: ${p.tas.karat}, ${p.tas.renk} renk, ${p.tas.berraklik} berraklık. Bu, çıplak gözle tamamen temiz görünen, çok iyi bir sınıf.`);
      return r;
    }
    if (has(t, N.ayarFark)) {
      say('Ayar, altının saflığını gösterir: 24 ayar saf altındır. <b>22 ayar</b> en sıcak sarıdır ama yumuşaktır, el işçiliğine ve mineye çok uygundur. <b>18 ayar</b> pırlantalı parçalarda tercih ettiğimiz, hem değerli hem dayanıklı bir dengedir. <b>14 ayar</b> en serttir; her gün takılan alyanslar için idealdir.');
      if (ref) say(`${L(ref)} ${ref.maden.ayar}.`);
      return r;
    }

    /* --- 4. Mağaza hizmetleri --- */
    const H = MAGAZA.hizmetler;
    const hizmet = [];
    if (has(t, N.garanti)) hizmet.push(H.garanti);
    if (has(t, N.iade)) hizmet.push(H.iade);
    if (has(t, N.kargo)) hizmet.push(H.kargo);
    if (has(t, N.taksit)) hizmet.push(H.taksit);
    if (has(t, N.kutu)) hizmet.push(H.kutu);
    if (has(t, N.dene)) hizmet.push('Sitemizde sanal deneme yok efendim; parçalarımızı mağazamızda dilediğiniz kadar deneyebilirsiniz. Burada her açıdan inceleyip tüm detayları benimle konuşabilirsiniz.');
    if (hizmet.length && !has(t, [...N.fiyat, ...N.tas, ...N.oner])) {
      hizmet.forEach(say);
      r.cipler = ['Taksit seçenekleri', 'Kargo kaç günde gelir?', 'Ölçü tutmazsa?', 'Bana bir öneride bulunun'];
      return r;
    }
    if (has(t, N.magaza)) {
      say('Mağazamızda sizi ağırlamaktan mutluluk duyarız. Özellikle pırlantalı parçalar için özel bir görüşme ayarlıyoruz; taşı loupe ile birlikte inceleyip sertifikasını gösteriyoruz.');
      say('Bu arada buradan da her detayı birlikte inceleyebiliriz. Hangi parçayla ilgileniyorsunuz?');
      return r;
    }
    if (has(t, N.indirim)) {
      say('Fiyatlarımızı her müşterimiz için aynı ve adil tutuyoruz, bu yüzden pazarlık yapmıyoruz efendim.');
      say('Ama iki güzel avantajımız var: havale/EFT ile ödemede %3 indirim, çift alyans alımında da ikinci alyansta %10 indirim.');
      return r;
    }

    /* --- 5. Satın alma niyeti --- */
    if (has(t, N.satinal) && ref) {
      this.son = ref;
      say(`Çok güzel bir seçim efendim, ${L(ref)} sizde çok güzel duracak.`);
      say(`Siparişinizi hazırlamadan önce birkaç küçük detayı netleştirelim: ${ref.kategori === 'Yüzük' ? 'yüzük ölçünüz' : ref.kategori === 'Bileklik' ? 'bilek ölçünüz' : 'bilek ölçünüz'}${ref.gravur ? ' ve iç yüzeye bir yazı isteyip istemediğiniz' : ''}. ${H.kargo.split(';')[0]}.`);
      r.goster = ref.id;
      r.cipler = ['Ölçümü bilmiyorum', 'Gravür yaptırmak istiyorum', 'Taksit seçenekleri'];
      return r;
    }

    /* --- 6. Liste / en ucuz / en pahalı --- */
    if (has(t, N.enUcuz) && !butce) {
      const l = this.filtrele().sort((a, b) => a.fiyat - b.fiyat).slice(0, 3);
      say(`En erişilebilir parçalarımız şunlar efendim; en başta ${L(l[0])}, ${fiyatYaz(l[0].fiyat)}.`);
      r.kartlar = l.map((p) => p.id); r.goster = l[0].id; this.son = l[0];
      return r;
    }
    if (has(t, N.enPahali)) {
      const p = [...URUNLER].sort((a, b) => b.fiyat - a.fiyat)[0];
      say(`Koleksiyonumuzun tacı ${L(p)}. ${p.deniz}`);
      say(`Fiyatı ${fiyatYaz(p.fiyat)}. ${p.ozelHizmet || ''}`);
      r.kartlar = [p.id]; r.goster = p.id; this.son = p;
      return r;
    }
    if (has(t, N.liste) && !anilan.length) {
      say('Koleksiyonumuzda on parça var efendim:');
      say('Pırlantalarda <b>Klasik Tektaş</b>, <b>Trilogy</b>, <b>Pavé Kubbe</b> ve koleksiyonun tacı <b>Kraliçe Oval</b>. Renkli taşlarda <b>Lavanta Tanzanit</b> ile el işçiliği <b>Saray Mineli</b> ve <b>Antik Mühür</b>. Bir de <b>Örgü Desen Alyans</b>, <b>Oniks Gece Kelepçe</b> ve <b>Atelier Bicolor Saat</b>.');
      say('Hangisiyle başlayalım? Ya da ne için baktığınızı söyleyin, ben önereyim.');
      r.cipler = ['Pırlantaları göster', 'Hediye arıyorum', 'Alyans bakıyorum', '100 bin TL altı'];
      return r;
    }

    /* --- 7. Ürüne özel sorular --- */
    const urunSorusu = has(t, [...N.fiyat, ...N.tas, ...N.maden, ...N.gram, ...N.olcu, ...N.bakim, ...N.gravur, ...N.anlat, ...N.kime, ...N.benzer, ...N.birlikte]);
    const onerSorusu = has(t, N.oner) || (butce && !anilan.length) || (this.profil.vesile && has(t, ['icin', 'hediye']) && !anilan.length);

    if (ref && (urunSorusu || anilan.length) && !(onerSorusu && !anilan.length && !isaret)) {
      this.son = ref;
      if (anilan.length && (!aktif || aktif.id !== ref.id)) r.goster = ref.id;

      // önce kartın kendi SSS'i
      const q = sssBul(ref, t);
      const parcalar = [];
      if (q) parcalar.push(q.c);

      if (!q || urunSorusuSayisi(t) > 1) {
        if (has(t, N.fiyat)) parcalar.push(fiyatCevap(ref));
        if (has(t, N.tas)) parcalar.push(tasCevap(ref));
        if (has(t, N.maden) && !has(t, N.tas)) parcalar.push(madenCevap(ref));
        if (has(t, N.gram)) parcalar.push(gramCevap(ref));
        if (has(t, N.olcu)) parcalar.push(olcuCevap(ref));
        if (has(t, N.bakim)) parcalar.push(bakimCevap(ref));
        if (has(t, N.gravur)) parcalar.push(gravurCevap(ref));
        if (has(t, N.kime)) parcalar.push(kimeCevap(ref));
        if (has(t, N.birlikte) && ref.birlikte) {
          const b = byId(ref.birlikte);
          parcalar.push(`${L(ref)}’ın yanına en çok ${L(b)} öneriyorum. Size göstereyim.`);
          r.kartlar.push(b.id); r.goster = b.id;
        }
        if (has(t, N.benzer)) {
          const bz = ref.benzer.map(byId);
          parcalar.push(`${L(ref)}’ı sevdiyseniz şunlara da bakmanızı isterim: ${listele(bz.map(L))}.`);
          r.kartlar.push(...bz.map((p) => p.id)); r.goster = bz[0].id;
          this.son = bz[0];
        }
      }
      // yalnızca ürün adı geçtiyse ya da "anlat" dendiyse tanıtım
      if (!parcalar.length || (has(t, N.anlat) && !q)) {
        const [a, b] = anlatCevap(ref);
        parcalar.unshift(a);
        if (has(t, N.anlat) || anilan.length) parcalar.push(b);
        if (!has(t, N.fiyat)) parcalar.push(`Fiyatı ${fiyatYaz(ref.fiyat)}.`);
      }
      const ilk = parcalar.shift();
      say(pick(ACILIS) + ilk);
      parcalar.forEach(say);
      r.cipler = this.takipCipleri(ref, t);
      return r;
    }

    /* --- 8. Öneri --- */
    if (onerSorusu || this.profil.vesile || butce) {
      return this.oner(r, say);
    }

    /* --- 9. Kart dışı / bilinmeyen --- */
    if (ref && aktif && this.tur > 0) {
      say(`Bu konuda elimdeki bilgi kartında net bir bilgi yok efendim, size yanlış bir şey söylemek istemem.`);
      say(`${L(ref)} hakkında fiyat, taş, ayar, ölçü, bakım ya da gravür gibi her şeyi sorabilirsiniz; isterseniz size uygun başka parçalar da önerebilirim.`);
      r.cipler = this.cipler(ref);
      return r;
    }
    say('Sizi tam anlayamadım efendim, kusura bakmayın. Bir parçanın adını yazabilir, bütçenizi ya da vesileyi söyleyebilirsiniz; örneğin “nişan için 150 bin civarı bir yüzük”.');
    r.cipler = this.cipler(null);
    return r;
  }

  takipCipleri(p, t) {
    const c = [];
    if (!has(t, N.fiyat)) c.push('Fiyatı nedir?');
    if (p.tas && !has(t, N.tas)) c.push('Taşı hakkında bilgi');
    if (!has(t, N.olcu)) c.push(p.kategori === 'Saat' ? 'Bilek ölçüsü' : 'Ölçü seçenekleri');
    if (p.birlikte && !has(t, N.birlikte)) c.push('Yanına ne yakışır?');
    if (!has(t, N.benzer)) c.push('Benzerlerini göster');
    if (!has(t, N.bakim)) c.push('Bakımı nasıl?');
    return c.slice(0, 4);
  }

  filtrele() {
    const pr = this.profil;
    return URUNLER.filter((p) => {
      if (pr.kategori && p.kategori !== pr.kategori) return false;
      if (pr.cinsiyet === 'erkek' && p.cinsiyet === 'kadın') return false;
      if (pr.butce?.max && p.fiyat > pr.butce.max) return false;
      if (pr.butce?.min && p.fiyat < pr.butce.min) return false;
      if (pr.tasli === 'pırlanta' && !(p.tas && /pirlanta/.test(norm(p.tas.tur)))) return false;
      if (pr.tasli === 'renkli' && !(p.tas && !/^pirlanta$/.test(norm(p.tas.tur)) && p.tas.tur !== 'Oniks')) return false;
      if (pr.tasli === 'tassiz' && p.tas && p.tas.tur !== 'Oniks') return false;
      return true;
    });
  }

  oner(r, say) {
    const pr = this.profil;
    // vesile yoksa ve bütçe de yoksa: önce nazikçe soru sor
    if (!pr.vesile && !pr.butce && !pr.kategori && !pr.tasli && !pr.cinsiyet) {
      say('Memnuniyetle yardımcı olurum. Size en doğru parçayı önerebilmem için kısaca sorayım:');
      say('Kendiniz için mi bakıyorsunuz, yoksa bir hediye mi? Özel bir vesile var mı, nişan, yıldönümü, doğum günü gibi?');
      r.cipler = ['Nişan için', 'Yıldönümü hediyesi', 'Kendime', 'Erkek için hediye'];
      return r;
    }
    let liste = this.filtrele();
    let gevsetildi = false;
    if (!liste.length && pr.butce?.max) {
      // bütçeye sığan yoksa: en yakın olanı dürüstçe söyle
      const yakin = URUNLER.filter((p) => (!pr.cinsiyet || pr.cinsiyet !== 'erkek' || p.cinsiyet !== 'kadın')).sort((a, b) => a.fiyat - b.fiyat)[0];
      say(`Açık konuşayım efendim, ${fiyatYaz(Math.round(pr.butce.max))} bütçeye tam uyan bir parçamız şu an koleksiyonda yok.`);
      say(`Bütçenize en yakın parçamız ${L(yakin)}, ${fiyatYaz(yakin.fiyat)}. Taksit seçenekleriyle birlikte düşünmek isterseniz yardımcı olabilirim.`);
      r.kartlar = [yakin.id]; r.goster = yakin.id; this.son = yakin;
      return r;
    }
    if (!liste.length) { liste = URUNLER.slice(); gevsetildi = true; }
    const skor = (p) => {
      let s = 0;
      if (pr.vesile && p.vesile.includes(pr.vesile)) s += 5;
      if (pr.vesile === 'Evlilik' && p.id === 'alyans') s += 6;
      if (pr.vesile === 'Evlilik teklifi' && p.id === 'tektas') s += 3;
      if (pr.cinsiyet === 'erkek' && p.cinsiyet === 'unisex') s += 3;
      if (pr.butce?.max) s += (p.fiyat / pr.butce.max) * 2; // bütçeyi iyi kullananı öne al
      return s;
    };
    liste.sort((a, b) => skor(b) - skor(a));
    const top = liste.slice(0, 3);
    const p = top[0];
    const neden = [];
    if (pr.vesile && p.vesile.includes(pr.vesile)) neden.push(`${pr.vesile.toLowerCase()} için en çok tercih edilen parçalarımızdan`);
    if (pr.butce?.max) neden.push('bütçenize de rahatça uyuyor');
    if (pr.cinsiyet === 'erkek' && p.cinsiyet === 'unisex') neden.push('beylerde de çok yakışan unisex bir model');
    const giris = gevsetildi ? 'Tam aradığınız kriterlerde bir parça bulamadım ama size en yakın olanı göstereyim:' : pick(['Size özellikle şunu önermek isterim:', 'Anlattıklarınıza göre ilk aklıma gelen:', 'Sizin için en doğru parça bence şu:']);
    say(`${giris} ${L(p)}. ${neden.length ? listele(neden).charAt(0).toUpperCase() + listele(neden).slice(1) + '.' : ''}`);
    say(`${p.deniz} Fiyatı ${fiyatYaz(p.fiyat)}.`);
    if (top.length > 1) say(`Bakmak isterseniz ${listele(top.slice(1).map(L))} da aynı kriterlere uyuyor.`);
    r.kartlar = top.map((x) => x.id);
    r.goster = p.id;
    this.son = p;
    r.cipler = ['Taşı hakkında bilgi', 'Başka seçenek', 'Bütçem farklı', 'Yanına ne yakışır?'];
    return r;
  }

  karsilastir(a, b) {
    const sat = (p) => `${L(p)}: ${altinYaz(p)}, ${p.tas ? p.tas.ozet : 'taşsız'}, ${fiyatYaz(p.fiyat)}`;
    let s = `İkisini yan yana koyalım efendim. ${sat(a)}. ${sat(b)}.`;
    const fark = Math.abs(a.fiyat - b.fiyat);
    const ucuz = a.fiyat < b.fiyat ? a : b;
    s += ` Aralarında ${fiyatYaz(fark)} fark var; ${L(ucuz)} daha erişilebilir.`;
    s += ` ${L(a)} daha çok ${a.stil.slice(0, 2).join(' ve ').toLowerCase()}, ${L(b)} ise ${b.stil.slice(0, 2).join(' ve ').toLowerCase()} bir tarz.`;
    return s;
  }
}

function urunSorusuSayisi(t) {
  return [N.fiyat, N.tas, N.maden, N.gram, N.olcu, N.bakim, N.gravur, N.kime, N.benzer, N.birlikte].filter((w) => has(t, w)).length;
}
