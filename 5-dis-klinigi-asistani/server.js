// Örnek Güzellik Merkezi — statik sunucu + Ela (LLM). Çalıştır: node server.js
const yedekFetch = require("../llm-yedek");
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = __dirname;
const PORT = process.env.PORT || 3300;
const MODEL = 'gpt-5.4-mini';

try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*[=:]\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.GROQ_API_KEY;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

/* ---------------- Ela ---------------- */
let V = null;
async function veri() { return V || (V = await import(pathToFileURL(path.join(ROOT, 'js/veri.js')).href)); }

const gunAdi = (d) => d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

async function sistem() {
  const { SALON, HIZMETLER, PAKETLER, UZMANLAR } = await veri();
  const bugun = new Date();
  return `Sen Ada'sın: ${SALON.ad}'nin dijital asistanı (kliniğin "dijital ikizi"). Arkanda gerçek bir ekip var: bilmediğin her şeyi ekibe sorar, cevabı onlardan alırsın. Bugün: ${gunAdi(bugun)} (ISO ${bugun.toISOString().slice(0, 10)}).

AMAÇ
- Hastanın sorusunu hızlıca ve doğru çözmek, onu MUAYENEYE ya da randevuya ulaştırmak. İlk muayene ve panoramik röntgen ücretsiz; kararsız olana bunu öner.
- Fiyat sorulursa karttaki fiyatı söyle ve "kesin tutar muayeneden sonra yazılı tedavi planında netleşir" ekle.

ÜSLUP
- "Siz" dili. Sakin, güven veren, kısa: 1–3 cümle. Madde işareti, başlık, emoji yok. Tedavi adını ilk geçtiğinde **kalın** yaz. Tek seferde en fazla bir soru.
- Diş hekiminden korkan hastaya önce anlayış göster, sonra seçenek sun (ör. çocuk hekimi, adım adım anlatım).

SAĞLIK GÜVENLİĞİ (en önemli)
- Teşhis koyma, ilaç/antibiyotik/dozaj önerme, "kesin şu tedavi gerekir" deme. Belirtiyi dinle, olası tedavi kartını bilgi olarak göster, kararı hekimin muayenede vereceğini söyle.
- ACİL belirtiler (şiddetli ağrı, yüzde/boyunda şişlik, ateş, durmayan kanama, diş kırılması/düşmesi, nefes ya da yutkunmada güçlük): önce ${SALON.telefon} numarasından aranmasını ve aynı gün muayene istemesini söyle; nefes alma güçlüğü ya da hızla yayılan şişlikte 112'yi ara de. Sonra ekibe_sor ile aciliyeti ekibe ilet.
- Kişisel sağlık verisi isteme (TC, hastalık geçmişi ayrıntısı). Randevu formunda ad ve telefon zaten isteniyor.
- Sonuç garantisi verme.

ARAÇLAR
- goster: Bir tedaviyi ya da paketi anlattığında MUTLAKA çağır; sohbete kart düşer.
- saatler: Randevu, uygunluk, "yarın var mı" dendiğinde çağır. Tarih yoksa en yakın uygun günü seç (pazar kapalı). Dönen saatleri sayma, ekranda buton çıkıyor; "size uyan saate dokunun" de.
- ekibe_sor: Kartlarda olmayan her soru (sigorta/anlaşmalı kurum, belirli bir malzeme markası, hekimin o gün olup olmadığı, özel indirim, önceki tedavisi, fatura vb.), şikâyet, acil durum ya da hasta insanla konuşmak isterse ÇAĞIR. Uydurmak yerine bunu kullan. Sonra hastaya "ekibimize ilettim, mesai saatinde birkaç dakika içinde size buradan dönecekler" de.
- Mevcut randevuyu görme/iptal: 'Randevularım' sayfasından telefon numarasıyla yapılabildiğini söyle.

SALON
${JSON.stringify(SALON, null, 1)}

UZMANLAR
${JSON.stringify(UZMANLAR)}

HİZMETLER (id → kart, süre dk, fiyat TL)
${JSON.stringify(HIZMETLER)}

PAKETLER
${JSON.stringify(PAKETLER)}`;
}

async function araclar() {
  const { HIZMETLER, PAKETLER } = await veri();
  const hIds = HIZMETLER.map((h) => h.id);
  return [
    { type: 'function', name: 'goster', strict: true,
      description: 'Hizmet ya da paket kartlarını sohbette gösterir.',
      parameters: { type: 'object', additionalProperties: false, required: ['ids'],
        properties: { ids: { type: 'array', items: { type: 'string', enum: [...hIds, ...PAKETLER.map((p) => p.id)] } } } } },
    { type: 'function', name: 'saatler', strict: true,
      description: 'Bir hizmet için o günün boş saatlerini getirir ve müşteriye seçilebilir buton olarak gösterir.',
      parameters: { type: 'object', additionalProperties: false, required: ['hizmet', 'tarih', 'aralik'],
        properties: { hizmet: { type: 'string', enum: hIds }, tarih: { type: 'string', description: 'YYYY-MM-DD' }, aralik: { type: 'string', enum: ['sabah', 'oglen', 'aksam', 'hepsi'] } } } },
    { type: 'function', name: 'ekibe_sor', strict: true,
      description: 'Kartlarda olmayan soruyu, şikâyeti ya da acil durumu klinik ekibine (sekreter/hekim) iletir. İnsan devri.',
      parameters: { type: 'object', additionalProperties: false, required: ['ozet', 'oncelik'],
        properties: { ozet: { type: 'string', description: 'Ekibin hızlıca anlayacağı tek cümle' }, oncelik: { type: 'string', enum: ['normal', 'acil'] } } } },
  ];
}

async function openai(body) {
  const r = await yedekFetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, reasoning: { effort: 'low' }, ...body }),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

async function ela({ mesajlar = [], baglam }) {
  const { musaitSaatler } = await veri();
  const input = [
    { role: 'system', content: await sistem() },
    ...mesajlar.slice(-14).map((m) => ({ role: m.rol === 'u' ? 'user' : 'assistant', content: String(m.metin).slice(0, 2000) })),
  ];
  if (baglam) input.splice(input.length - 1, 0, { role: 'system', content: `Ekran bağlamı: ${String(baglam).slice(0, 400)}` });

  const tools = await araclar();
  let kartlar = [], slot = null, ekip = null;
  for (let tur = 0; tur < 4; tur++) {
    const res = await openai({ input, tools, max_output_tokens: 600 });
    const calls = res.output.filter((o) => o.type === 'function_call');
    if (!calls.length) {
      const metin = res.output_text ?? res.output.filter((o) => o.type === 'message').flatMap((o) => o.content).map((c) => c.text || '').join('');
      return { metin, kartlar, slot, ekip };
    }
    input.push(...res.output);
    for (const c of calls) {
      let a = {}, out = 'Hata';
      try { a = JSON.parse(c.arguments); } catch {}
      if (c.name === 'goster' && a.ids) { kartlar = [...new Set([...kartlar, ...a.ids])]; out = 'Gösterildi'; }
      if (c.name === 'saatler' && a.hizmet) {
        let t = /^\d{4}-\d{2}-\d{2}$/.test(a.tarih) ? a.tarih : new Date().toISOString().slice(0, 10);
        let s = musaitSaatler(t, a.hizmet, a.aralik);
        if (!s.length) { const d = new Date(t); d.setDate(d.getDate() + 1); t = d.toISOString().slice(0, 10); s = musaitSaatler(t, a.hizmet, a.aralik); }
        slot = { hizmet: a.hizmet, tarih: t, saatler: s };
        out = s.length ? `${t} için boş saatler: ${s.join(', ')} (ekranda buton olarak gösterildi)` : 'Bu gün dolu';
      }
      if (c.name === 'ekibe_sor' && a.ozet) {
        ekip = { ozet: String(a.ozet).slice(0, 300), oncelik: a.oncelik === 'acil' ? 'acil' : 'normal', zaman: new Date().toISOString() };
        console.log('[ekibe_sor]', ekip.oncelik, ekip.ozet);
        out = 'Ekibe iletildi (demo: gerçek kurulumda sekreterin WhatsApp/Telegram ekranına düşer).';
      }
      input.push({ type: 'function_call_output', call_id: c.call_id, output: out });
    }
  }
  return { metin: '', kartlar, slot, ekip };
}

/* ---------------- HTTP ---------------- */
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/api/ela' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (!KEY) { res.writeHead(503); return res.end(JSON.stringify({ hata: 'anahtar yok' })); }
      try { res.end(JSON.stringify(await ela(JSON.parse(body || '{}')))); }
      catch (e) { console.error('[ela]', e.message); res.writeHead(502); res.end(JSON.stringify({ hata: 'llm' })); }
    });
    return;
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || path.basename(file).startsWith('.')) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});
if (require.main === module) server.listen(PORT, () => console.log(`Örnek Diş Kliniği hazır: http://localhost:${PORT}  ·  Ada: ${KEY ? MODEL : 'anahtar yok, yedek beyin'}`));
module.exports = { server };