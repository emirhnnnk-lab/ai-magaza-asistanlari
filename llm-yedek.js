// OpenAI Responses çağrısı; bakiye/anahtar/servis hatasında Groq'a (ücretsiz, gpt-oss-120b) düşer. Asistan susmasın.
// Groq previous_response_id desteklemez → geçmişi burada tutup tam girdi olarak gönderiyoruz.
const OAI = 'https://api.openai.com/v1/responses', GROQ = 'https://api.groq.com/openai/v1/responses';
let groqUntil = 0; // anahtar/bakiye sorunu varsa 10 dk boyunca direkt Groq
const gecmis = new Map(); // response id → o ana kadarki tüm girdi+çıktı
const liste = (x) => (x == null ? [] : typeof x === 'string' ? [{ role: 'user', content: x }] : x);
const bosOlabilir = (o) => {
  if (!o || typeof o !== 'object') return;
  if (o.type && o.type !== 'object' && o.type !== 'null' && !o.enum) o.type = [].concat(o.type).includes('null') ? o.type : [].concat(o.type, 'null');
  if (o.enum && !o.enum.includes(null)) { o.enum = [...o.enum, null]; if (o.type && ![].concat(o.type).includes('null')) o.type = [].concat(o.type, 'null'); }
  Object.values(o.properties || {}).forEach(bosOlabilir); if (o.items) bosOlabilir(o.items);
};
async function groq(opts) {
  const b = JSON.parse(opts.body);
  (b.tools || []).forEach((t) => { delete t.strict; Object.values(t.parameters?.properties || {}).forEach(bosOlabilir); });
  let girdi = liste(b.input);
  if (b.previous_response_id) { girdi = [...(gecmis.get(b.previous_response_id) || []), ...girdi]; delete b.previous_response_id; }
  if (b.instructions && !girdi.some((m) => m.role === 'system')) girdi = [{ role: 'system', content: b.instructions }, ...girdi];
  delete b.instructions; delete b.store; delete b.prompt_cache_key;
  b.input = girdi.map(({ id, status, ...m }) => m); // Groq çıktı öğelerindeki id/status alanlarını istemiyor
  console.log('[llm] Groq yedeği kullanılıyor');
  const modeller = (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b').split(',');
  let r;
  for (const m of modeller) { // ücretsiz katmanda dakikalık token sınırı var: takılırsa sıradaki model
    b.model = m;
    r = await fetch(GROQ, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.GROQ_API_KEY }, body: JSON.stringify(b) });
    if (r.ok || ![413, 429, 400].includes(r.status)) break;
    console.log('[llm]', m, r.status, '→ sıradaki model');
  }
  if (!r.ok) return r;
  const j = await r.json();
  gecmis.set(j.id, [...b.input, ...(j.output || []).filter((o) => o.type !== 'reasoning')]);
  if (gecmis.size > 500) gecmis.delete(gecmis.keys().next().value);
  return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
module.exports = async function yedekFetch(url, opts) {
  if (url !== OAI || !process.env.GROQ_API_KEY) return fetch(url, opts);
  if (Date.now() < groqUntil || !(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY)) return groq(opts);
  let r;
  try { r = await fetch(url, opts); } catch { return groq(opts); }
  if (r.ok) return r;
  const t = await r.clone().text();
  const kota = /quota|billing|insufficient|expired|invalid_api_key/i.test(t);
  if (kota || [401, 402, 403].includes(r.status) || r.status >= 500) { if (kota || r.status !== 500) groqUntil = Date.now() + 600000; return groq(opts); }
  return r; // normal 429 hız limiti: sunucunun kendi tekrar denemesi
};
