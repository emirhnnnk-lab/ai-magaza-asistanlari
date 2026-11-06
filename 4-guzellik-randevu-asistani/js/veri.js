// Örnek Güzellik Merkezi — hizmet kartları. Hem tarayıcı hem sunucu (Ela'nın beyni) buradan okur.
export const SALON = {
  ad: 'Örnek Güzellik Merkezi',
  slogan: 'Cilt · Lazer · Kirpik · Tırnak',
  adres: 'Adres bilgisi eklenecek (demo)',
  saatler: 'Pazartesi–Cumartesi 10:00–21:00, Pazar 11:00–18:00',
  telefon: '0216 000 00 00 (demo)',
  ilkZiyaret: 'İlk ziyarete özel %15 indirim (kod: ORNEK15) ve ücretsiz cilt analizi',
  avantajlar: [
    'Ücretsiz 15 dk cilt analizi (Observ 520 cihazı ile)',
    'Randevudan 24 saat önce WhatsApp hatırlatması',
    'Ücretsiz iptal/erteleme: randevudan 12 saat öncesine kadar',
    'Paket alımlarında taksit: 6 aya kadar',
    'Arkadaşını getir: ikiniz de 250 TL hediye puan',
    'Tek kullanımlık başlıklar, sterilizasyon belgesi her odada',
  ],
};

export const KATEGORILER = [
  { id: 'cilt', ad: 'Cilt Bakımı' },
  { id: 'lazer', ad: 'Lazer Epilasyon' },
  { id: 'kas', ad: 'Kaş & Kirpik' },
  { id: 'tirnak', ad: 'Tırnak' },
  { id: 'vucut', ad: 'Vücut & Bölgesel' },
];

export const HIZMETLER = [
  { id: 'hydrafacial', kat: 'cilt', ad: 'HydraFacial Signature', sure: 60, fiyat: 3200, etiket: 'En çok tercih edilen',
    ozet: 'Derin temizlik, peeling, nem. Aynı gün ışıltı, iz bırakmaz.', kime: 'Mat, yorgun, siyah noktalı, karma ciltler', seans: 'Ayda 1 önerilir', sonra: '24 saat makyaj ve sauna yok' },
  { id: 'medikal-bakim', kat: 'cilt', ad: 'Medikal Cilt Bakımı', sure: 75, fiyat: 2400,
    ozet: 'Sivilce ve gözenek odaklı, sağlık tavsiyesi niteliği taşımayan profesyonel bakım.', kime: 'Akneye eğilimli, yağlı ciltler', seans: '2–3 haftada bir', sonra: '48 saat sıkma yok, güneş kremi şart' },
  { id: 'dermapen', kat: 'cilt', ad: 'Dermapen + Mezoterapi Kokteyli', sure: 60, fiyat: 3800,
    ozet: 'Leke, gözenek ve akne izi görünümünü azaltmaya yardımcı kür.', kime: 'Leke, iz, ince çizgi görünümü', seans: '4 seanslık kür, 3–4 hafta arayla', sonra: '2–3 gün kızarıklık normaldir, 1 hafta güneşten koruyun' },
  { id: 'altin-maske', kat: 'cilt', ad: '24K Altın Maske Bakımı', sure: 50, fiyat: 2100, etiket: 'Özel gün öncesi',
    ozet: 'Düğün, nişan ya da davet öncesi anında parlaklık ve sıkılaşma hissi.', kime: 'Özel gün öncesi herkes', seans: 'Etkinlikten 1–2 gün önce', sonra: 'Hemen makyaj yapılabilir' },

  { id: 'lazer-tum-vucut', kat: 'lazer', ad: 'Buz Lazer — Tüm Vücut', sure: 90, fiyat: 4500, etiket: '8 seans paketinde %30',
    ozet: 'Soprano Ice ile neredeyse acısız lazer epilasyon.', kime: 'Tüm cilt tipleri (bronz hariç)', seans: '6–8 seans, 4–6 hafta arayla', sonra: '48 saat sıcak duş/sauna yok' },
  { id: 'lazer-bolge', kat: 'lazer', ad: 'Buz Lazer — Tek Bölge', sure: 20, fiyat: 900,
    ozet: 'Koltuk altı, bikini, bıyık ya da kol gibi tek bölge.', kime: 'Lazere yeni başlayanlar', seans: '6–8 seans', sonra: 'Bölgeye 48 saat deodorant/peeling yok' },

  { id: 'ipek-kirpik', kat: 'kas', ad: 'İpek Kirpik (Klasik)', sure: 120, fiyat: 1800,
    ozet: 'Teke tek uygulama, doğal görünüm, 3–4 hafta kalıcılık.', kime: 'Doğal ama belirgin bakış isteyenler', seans: '3 haftada bir dolgu (900 TL)', sonra: '24 saat su değmesin' },
  { id: 'lifting', kat: 'kas', ad: 'Kirpik Lifting + Kaş Laminasyonu', sure: 75, fiyat: 1500, etiket: 'Kombin',
    ozet: 'Kendi kirpiğine kıvrım, kaşa dolgun ve taranmış görünüm.', kime: 'Takma kirpik istemeyenler', seans: '6–8 haftada bir', sonra: '24 saat ıslatmayın' },
  { id: 'kas-tasarim', kat: 'kas', ad: 'Kaş Tasarımı (Ölçü + Boya)', sure: 30, fiyat: 600,
    ozet: 'Yüz oranına göre altın oran ölçüsü, iplik ve henna boya.', kime: 'Herkes', seans: '3–4 haftada bir', sonra: '—' },

  { id: 'protez-tirnak', kat: 'tirnak', ad: 'Protez Tırnak (Jel)', sure: 100, fiyat: 1400,
    ozet: 'Uzatma ve şekillendirme, dilediğiniz tasarım.', kime: 'Uzun ve dayanıklı tırnak isteyenler', seans: '3 haftada bir bakım (900 TL)', sonra: '—' },
  { id: 'kalici-oje', kat: 'tirnak', ad: 'Manikür + Kalıcı Oje', sure: 60, fiyat: 750,
    ozet: 'Islak manikür, kütikül bakımı ve 3 hafta dayanan kalıcı oje.', kime: 'Herkes', seans: '2–3 haftada bir', sonra: '—' },
  { id: 'spa-pedikur', kat: 'tirnak', ad: 'Spa Pedikür', sure: 60, fiyat: 850,
    ozet: 'Ayak banyosu, topuk bakımı, masaj ve oje.', kime: 'Herkes', seans: 'Ayda 1', sonra: '—' },

  { id: 'g5', kat: 'vucut', ad: 'G5 Masajı + Bölgesel İncelme', sure: 45, fiyat: 1100, etiket: '10 seans paketi',
    ozet: 'Selülit görünümü ve ödem için titreşimli masaj.', kime: 'Bölgesel incelme hedefleyenler', seans: '10 seans, haftada 2', sonra: 'Bol su için' },
  { id: 'lenf', kat: 'vucut', ad: 'Lenf Drenaj Masajı', sure: 60, fiyat: 1300,
    ozet: 'Ödem atmaya yardımcı, hafifleten manuel masaj.', kime: 'Ödem, şişkinlik hissi', seans: 'Haftada 1', sonra: 'Bol su için' },
];

export const PAKETLER = [
  { id: 'gelin', ad: 'Gelin Paketi', icerik: ['HydraFacial', '24K Altın Maske', 'Kirpik Lifting + Kaş', 'Manikür + Pedikür', 'Tüm vücut lazer 1 seans'], fiyat: 9900, normal: 13600, not: 'Düğünden 6 hafta önce başlanır, takvimi biz planlarız' },
  { id: 'lazer8', ad: 'Tüm Vücut Lazer 8 Seans', icerik: ['8 seans Buz Lazer tüm vücut', 'Ücretsiz rötuş seansı'], fiyat: 25200, normal: 36000, not: '6 taksit seçeneği' },
  { id: 'isilti', ad: 'Işıltı Üyeliği (aylık)', icerik: ['Ayda 1 HydraFacial', 'Ayda 1 Manikür + Kalıcı Oje', 'Tüm hizmetlerde %10'], fiyat: 3490, normal: 3950, not: 'İstediğiniz ay dondurabilirsiniz' },
];

export const UZMANLAR = [
  { ad: 'Selin', unvan: 'Cilt bakım uzmanı, 9 yıl', alan: 'cilt' },
  { ad: 'Merve', unvan: 'Lazer uzmanı (sertifikalı)', alan: 'lazer' },
  { ad: 'Ece', unvan: 'Kirpik & kaş sanatçısı', alan: 'kas' },
  { ad: 'Duygu', unvan: 'Nail artist', alan: 'tirnak' },
];

export const tl = (n) => n.toLocaleString('tr-TR') + ' TL';

// Demo müsaitlik: gün + hizmetten deterministik boş saatler
export function musaitSaatler(tarihISO, hizmetId, aralik = 'hepsi') {
  const h = HIZMETLER.find((x) => x.id === hizmetId) || HIZMETLER[0];
  const d = new Date(tarihISO + 'T12:00:00');
  const pazar = d.getDay() === 0;
  const bas = pazar ? 11 : 10, son = pazar ? 18 : 21;
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
