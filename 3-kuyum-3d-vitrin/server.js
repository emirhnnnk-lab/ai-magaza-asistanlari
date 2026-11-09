// Örnek Kuyum — statik sunucu + Deniz (LLM). Çalıştır: node server.js
const yedekFetch = require("../llm-yedek");
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const PORT = process.env.PORT || 3100;
const MODEL = 'gpt-5.4-mini';

// .env oku (KEY=değer ya da KEY: değer)
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*[=:]\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.GROQ_API_KEY;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
};

/* ---------------- Deniz ---------------- */
let SYSTEM = null, IDS = [];
async function hazirla() {
  if (SYSTEM) return;
  const { URUNLER: U0, MAGAZA, TEZHIP = [] } = await import(pathToFileURL(path.join(ROOT, 'js/urunler.js')).href);
  const URUNLER = [...U0, ...TEZHIP];
  IDS = URUNLER.map((u) => u.id);
  const kart = URUNLER.map(({ render, dosya, vitrin, ...k }) => k);
  SYSTEM = `Sen Deniz'sin: ${MAGAZA.ad}'ın (kuruluş ${MAGAZA.kurulus}) mücevher danışmanı. Lüks bir kuyumcunun deneyimli, zarif tezgâhtarı gibi konuşursun.

ÜSLUP
- "Siz" diye hitap et, yerinde "efendim" de ama abartma. Sıcak, sakin, bilgili; asla ısrarcı ya da satış baskılı değil.
- Kısa konuş: çoğu cevap 2–4 cümle. Paragrafları boş satırla ayır. Madde işareti, başlık, emoji kullanma.
- Ürün adını ilk geçtiği yerde **kalın** yaz (iki yıldız).
- Müşteri belirsizse tek bir nazik soru sor (kime, vesile, bütçe). Sorgu gibi art arda soru sorma.
- Gerçek bir tezgâhtar gibi hikâye, his ve kullanım önerisi kat; ama rakamlar her zaman karttan.

DÜRÜSTLÜK (çok önemli)
- Yalnızca aşağıdaki bilgi kartlarındaki ve mağaza hizmetlerindeki bilgileri kullan. Kartta olmayan rakam, taş, ölçü, kampanya, stok, adres, telefon UYDURMA. Bilmiyorsan "bu bilgi elimde yok, yanlış bir şey söylemek istemem" de.
- Fiyat sorulursa karttaki fiyatı aynen ver (KDV dahil). Pazarlık yapma; yalnızca kartta yazan avantajları (havale %3, çift alyans %10) söyle.
- Altın kuru, yatırım getirisi, değer artışı konusunda tavsiye verme; yatırım danışmanı olmadığını söyle.
- Mağaza adresi/telefonu bu sitede yok; sorulursa nazikçe mağazada ağırlamaktan memnun olacağınızı, pırlantalar için özel görüşme ayarlandığını söyle.
- Sitede sanal deneme ya da AR yok; denemek isteyene mağazada denenebileceğini söyle.

ARAÇ
- Bir ürünü anlattığında, önerdiğinde ya da müşteri bir ürünü görmek istediğinde MUTLAKA goster aracını çağır: ekrandaki 3D vitrin o ürüne döner ve sohbete kartı düşer. Birden çok ürün öneriyorsan hepsini ids'e koy, ilk sıradaki sahnede açılır.
- Müşteri zaten ekrandaki ürünü soruyorsa aracı çağırmana gerek yok.
- "Bu", "bunun", "şu" gibi ifadeler EKRANDAKİ ürünü kasteder.

MAĞAZA HİZMETLERİ
${JSON.stringify(MAGAZA.hizmetler, null, 1)}

BİLGİ KARTLARI (id → kart)
${JSON.stringify(kart, null, 1)}`;
}

const TOOLS = [{
  type: 'function', name: 'goster', strict: true,
  description: 'Ürünleri müşteriye gösterir: ilk ürün 3D vitrinde açılır, hepsi sohbette kart olarak görünür.',
  parameters: {
    type: 'object', additionalProperties: false, required: ['ids'],
    properties: { ids: { type: 'array', items: { type: 'string', enum: [] }, description: 'Ürün id listesi, en önemlisi ilk sırada' } },
  },
}];

async function openai(body) {
  const r = await yedekFetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, reasoning: { effort: 'low' }, ...body }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// Premium'da fiyat ekranda yazmaz (bedesten.js FIYAT_ACIK ile aynı karar)
const PREMIUM_FIYAT_GIZLI = true;

// Üç sitede üç ayrı kişilik; bilgi kartları ortak
const KANAL = {
  perakende: 'KANAL: Perakende e-ticaret sitesi. Hızlı, sıcak ve pratik ol; fiyat, taksit, kargo ve iade konusunda net bilgi ver, müşteriyi sepete yönlendir.',
  premium: 'KANAL: Premium butik sitesi. Sen bir concierge gibisin: daha az ve daha zarif konuş, acele ettirme. Pırlantalar ve özel parçalar için mağazada özel randevuyu öner; randevuda müşterinin kahvesini önceden seçebildiğini, parçanın onun için hazırlanacağını söyle. Ziyaretçiye “Size özel tabla”yı öner: üç soruyla onun için üç parça seçip tablayı yeniden kuruyoruz.' + (PREMIUM_FIYAT_GIZLI ? ' Premium’da fiyat ekranda yazmaz: fiyat sorulursa rakam verme; fiyatın özel görüşmede, dilerse davetiyle birlikte kişisel olarak paylaşıldığını nazikçe söyle.' : ''),
  toptan: 'KANAL: Toptan (bayi) paneli. Muhatabın kuyumcu esnafı. Kısa, teknik ve net konuş: ayar, gram, milyem, işçilik. Bu bir demodur; canlı stok ve bayi fiyatı ML Yazılım entegrasyonundan gelecek, stok sorularında bunu belirt ve kesin stok rakamı uydurma. Karttaki fiyat perakende fiyatıdır; fiyat sorulursa bunu söyle ve bayiye özel fiyatın bayi panelinde göründüğünü ekle.',
};

async function deniz({ mesajlar = [], aktif, kanal }) {
  await hazirla();
  TOOLS[0].parameters.properties.ids.items.enum = IDS;
  const input = [
    { role: 'system', content: SYSTEM },
    ...mesajlar.slice(-12).map((m) => ({ role: m.rol === 'u' ? 'user' : 'assistant', content: String(m.metin).slice(0, 2000) })),
  ];
  // ekrandaki ürünü son mesajın hemen öncesine bağlam olarak ekle
  if (KANAL[kanal]) input.splice(1, 0, { role: 'system', content: KANAL[kanal] });
  if (aktif) input.splice(input.length - 1, 0, { role: 'system', content: `Müşteri şu an ekranda "${aktif}" id'li ürüne bakıyor.` });

  let goster = null, kartlar = [];
  for (let tur = 0; tur < 3; tur++) {
    const res = await openai({ input, tools: TOOLS, max_output_tokens: 700 });
    const calls = res.output.filter((o) => o.type === 'function_call');
    if (!calls.length) {
      return { metin: res.output_text ?? res.output.filter((o) => o.type === 'message').flatMap((o) => o.content).map((c) => c.text || '').join(''), goster, kartlar };
    }
    input.push(...res.output);
    for (const c of calls) {
      let ids = [];
      try { ids = JSON.parse(c.arguments).ids.filter((id) => IDS.includes(id)); } catch {}
      if (ids.length) { goster = ids[0]; kartlar = [...new Set([...kartlar, ...ids])]; }
      input.push({ type: 'function_call_output', call_id: c.call_id, output: ids.length ? `Gösterildi: ${ids.join(', ')}` : 'Geçersiz id' });
    }
  }
  return { metin: '', goster, kartlar };
}

/* ---------------- HTTP ---------------- */
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);

  if (p === '/api/deniz' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (!KEY) { res.writeHead(503); return res.end(JSON.stringify({ hata: 'anahtar yok' })); }
      try {
        const out = await deniz(JSON.parse(body || '{}'));
        res.end(JSON.stringify(out));
      } catch (e) {
        console.error('[deniz]', e.message);
        res.writeHead(502); res.end(JSON.stringify({ hata: 'llm' }));
      }
    });
    return;
  }

  if (p.endsWith('/')) p += 'index.html';
  if (p === '/teklif') { res.writeHead(301, { Location: '/teklif/' }); return res.end(); }
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || path.basename(file).startsWith('.')) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
if (require.main === module) server.listen(PORT, () => console.log(`Örnek Kuyum hazır: http://localhost:${PORT}  ·  Deniz: ${KEY ? MODEL : 'anahtar yok, yedek beyin'}`));
module.exports = { server };