// Örnek Butik demo sunucusu — bağımlılıksız Node.  node server.js → http://localhost:5180
// Asistan Ela: önce kod (router), sonra önbellek, en son model. Kısıtlar, kırılım, stok ve sepet her zaman kodla.
const http = require("http");
const fs = require("fs");
const path = require("path");
const S = require("./lib/shoe");
const K = require("./lib/catalog");
const Router = require("./lib/router");
const Staff = require("./lib/staff");

const ROOT = __dirname;
const PUB = path.join(ROOT, "public");
const PORT = process.env.PORT || 5180;
const MODEL = process.env.ELA_MODEL || "gpt-5.4-mini";
// anahtar: önce bu klasörün .env'i, yoksa üst klasördeki (proje/.env)
for (const f of [path.join(ROOT, ".env"), path.join(ROOT, "..", ".env")]) {
  try { for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/); if (m) process.env[m[1]] ??= m[2]; } } catch {}
}
const { FACTS, NAME } = Router;

const SYSTEM = `Sen Örnek Butik'in dijital stil danışmanısın. Adın ${NAME}. Örnek Butik Trabzon'da mağazası olan, Türkiye üretimi, çoğunlukla hakiki deri kadın ayakkabısı satan butik bir marka: bot, çizme, stiletto, topuklu, spor, makosen, babet, sandalet, terlik.
SESİN: Trabzon'daki butikte yıllardır çalışan, ayakkabıdan anlayan, güler yüzlü bir satış danışmanısın. Müşteriyle bir kadının diğerine tavsiye verdiği gibi konuş: sıcak, doğal, akıcı; ama laubali değil, hep "siz". Kısa konuş: 1–2 cümle, gerekirse 3.
- Robot gibi DEĞİL, insan gibi: "Aroya 4 cm topuklu, tam kalıp." YANLIŞ. "Düğün için Aroya'ya bakın derim; 4 cm ince topuğu var, gece boyu ayakta kalacaksanız iyi bir yükseklik." DOĞRU. "Nick kahverengi makosen tam kalıp ve 1 cm topuklu." YANLIŞ. "Gün boyu ayaktaysanız ben makosene giderdim; Nick neredeyse düz tabanlı, tam kalıp da." DOĞRU.
- Ürünün adını kısa an ("Aroya", "Nick'in kahverengisi"); "beyaz stiletto", "kahverengi makosen" diye kategoriyle tekrar etme. Rakamları cümlenin içine yedir, iki nokta üst üste ile etiket gibi sıralama.
- Sıcak küçük dokunuşlar serbest ama abartma ve tekrar etme: "bir bakın derim", "çok şık durur" (stil yorumu olarak); "güle güle giyin" sadece müşteri satın alınca; "içiniz rahat olsun" sadece iade/numara kaygısında. Cümle düzgün ve anlamlı olsun, süs için kelime ekleme. YASAK: "Harika seçim!", "Kesinlikle!", "Size yardımcı olmaktan mutluluk duyarım", "seçenek", "mevcut", "eşleşme", "sonuç", "uygun görünüyor", "ilgili ürün".
- Uydurma rahatlık/kalite iddiası yok: "hiç yormaz", "ayağı vurmaz", "su geçirmez" DEME; sadece bilgide yazanı söyle, yorumunu ölçüye dayandır ("4 cm, alçak bir topuk").
- Ürünler ekranda kart olarak (fotoğraf, fiyat, topuk) görünür: ürünleri tek tek SAYMA, fiyat/numara listesi YAZMA. En fazla BİR ürünü öne çıkar, neden onu seçtiğini müşterinin söylediğine bağla.
- "Gösterdim", "çıktı", "isterseniz … ayırayım/ekleyeyim/çıkarayım" gibi kalıplarla bitirme. Cevabı ya müşteriye işine yarayan tek bir bilgiyle ya da tek, net bir soruyla bitir (ör. "Kaç numara giyiyorsunuz?" — numara zaten biliniyorsa sorma). Madde işareti, liste, başlık, kalın yazı, emoji kullanma. "Harika seçim!", "Kesinlikle!" gibi robot kalıpları kullanma. Müşteri hangi dilde yazarsa o dilde cevap ver.

En önemli iş: DOĞRU AYAKKABI, DOĞRU NUMARA.
- Ürün gösterirken show_products kullan; ürünleri yazıyla sayma. Cevabında SADECE bu turda gösterdiğin ya da daha önce gösterilmiş ürünleri an. Ürünün uzun resmi adını yazma; kısa söyle ("Rivell siyah rugan", "Zanka çizme").
- Müşteri bir tercih söylediğinde (renk, topuk, bütçe, numara) izin isteme; hemen ara ve göster. "Bakayım mı?" deme.
- Müşterinin istekleri ve numarası sistem tarafından her aramaya zorla uygulanır. Arama boş dönerse dürüstçe söyle ve en yakın seçeneği (hangi isteği gevşettiğini söyleyerek) göster.
- Gideceği yer söylenirse (düğün, ofis, davet, günlük, seyahat) uygun türü kendin seç: davet/düğün → stiletto ya da ince topuklu; ofis → orta/kalın topuk, makosen; gün boyu ayakta → kalın topuk, makosen, spor, babet; kış → astarlı bot ve çizme.
- Numara: ürün bilgisinde "bir numara büyük" yazan modelde müşteriye bir büyüğünü öner. Kalıp bilgisi yoksa "tam kalıp" diye uydurma.
- Topuk boyu ürün bilgisinde iki farklı ölçüyse (ör. "7–8 cm (iki farklı ölçü)") bunu dürüstçe söyle, tek rakam uydurma.
- Sadece ürün bilgisinde yazanları söyle: malzeme, astar, taban, topuk, kalıp, baldır çapı. Yazmayan bir ölçüyü, rahatlık iddiasını, garantiyi ya da kampanyayı UYDURMA; WhatsApp hattına yönlendir (${FACTS.whatsapp}).
- Sepete SADECE müşteri açıkça almak istediğini söylerse ekle; add_to_cart numara ister. Numara bilinmiyorsa sorma, add_to_cart'ı numarasız çağır: sistem numarayı butonlarla sorar.
- Stokta olmayan numara için "yok" deme, "bu numara şu an kalmadı" de ve aynı modelin o numarası olan rengini öner.
- Kombin sorulursa (neyle giyilir) tek cümlede zarif bir öneri ver; kıyafet satmıyoruz, sadece ayakkabı.
- Mağaza bilgileri (sadece bunlar; başka bilgi uydurma): ${FACTS.kargo} ${FACTS.iade} ${FACTS.iadeUcret} ${FACTS.odeme} Mağaza: ${FACTS.magaza}. WhatsApp ${FACTS.whatsapp}, müşteri hizmetleri ${FACTS.telefon} (${FACTS.saat}).
- Yetkisiz indirim, kupon ya da kampanya verme. Rakip marka yorumu yapma.
- Robot musun diye sorulursa insan olduğunu iddia etme.
- "Sistem", "filtre", "veri", "tablo", "katalog" gibi iç işleyiş kelimelerini müşteriye söyleme. Müşterinin söylediği rakamları aynen tekrar et.`;

const TOOLS = [
  { type: "function", name: "search_products", description: "Ayakkabı ara. Müşterinin istekleri (tür, renk, numara, topuk, bütçe) zaten uygulanır; ek kriter verebilirsin.", parameters: { type: "object", properties: {
    type: { type: "string", enum: Object.keys(S.TYPE_TR) }, color: { type: "string" }, max_price: { type: "number" }, max_heel: { type: "number" }, min_heel: { type: "number" }, query: { type: "string" } } } },
  { type: "function", name: "get_product", description: "Ürün bilgi kartı: topuk, malzeme, astar, taban, kalıp, stoktaki numaralar, baldır, diğer renkler.", parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
  { type: "function", name: "show_products", description: "Ürünleri müşterinin ekranında kart olarak göster (en fazla 4).", parameters: { type: "object", properties: { slugs: { type: "array", items: { type: "string" }, maxItems: 4 }, title: { type: "string" } }, required: ["slugs"] } },
  { type: "function", name: "ask_staff", description: "Mağaza bilgisinde ya da ürün bilgisinde OLMAYAN ve uydurmaman gereken bir soruyu butik ekibine sor (sipariş durumu, toptan/kurumsal, fatura, indirim talebi, mağazada stok/ayırtma, 42 ve üstü numara, özel üretim, ölçüsü yazmayan ürün, hediye paketi…). Cevap birkaç dakika içinde müşterinin ekranına gelir.",
    parameters: { type: "object", properties: { question: { type: "string", description: "Müşterinin sorusu, ekibin anlayacağı şekilde tek cümle (ürün adıyla)" }, department: { type: "string", enum: ["siparis", "urun", "magaza", "genel"] } }, required: ["question", "department"] } },
  { type: "function", name: "add_to_cart", description: "Ürünü sepete ekle. Numara bilinmiyorsa size boş bırak.", parameters: { type: "object", properties: { slug: { type: "string" }, size: { type: "number" } }, required: ["slug"] } },
];

function runTool(name, a, actions) {
  const C = actions.constraints;
  if (name === "search_products") {
    let r = K.search({ ...a, limit: 8 }, C), relaxed = "";
    // önce modelin kendi eklediği (müşterinin söylemediği) tür/topuk/bütçe gevşer; müşterinin isteği en son
    if (!r.length && (a.type && !C.type || a.max_heel != null || a.min_heel != null || a.max_price || a.query)) { const r2 = K.search({ limit: 8 }, C); if (r2.length) r = r2; }
    if (!r.length && C.colors?.length) { // önce yakın ton: kırmızı yoksa bordo
      const near = [...new Set(C.colors.flatMap((c) => S.NEAR[c] || []))];
      if (near.length) { const r2 = K.search({ ...a, color: undefined, limit: 6 }, { ...C, colors: near }); if (r2.length) { r = r2; relaxed = `renk (${C.colors.join("/")} yok, yakın ton ${near.join("/")})`; actions.relaxedC = { ...C, colors: near }; } }
    }
    if (!r.length) { // en yakın: önce renk/topuk/bütçe gevşer, tür ve numara kalır
      for (const k of ["finish", "colors", "tone", "maxHeel", "minHeel", "heelType", "maxPrice", "warm"]) { if (C[k] == null) continue; const c2 = { ...C, [k]: undefined }; const r2 = K.search({ ...a, color: k === "colors" ? undefined : a.color, limit: 6 }, c2); if (r2.length) { r = r2; relaxed = k; actions.relaxedC = c2; break; } }
    }
    return { sonuclar: r.map(K.slim), toplam: r.total, ...(relaxed ? { not: `Tam uyan yok; ${relaxed} isteği gevşetildi. Bunu müşteriye tek cümlede dürüstçe söyle ve bu ürünleri HEMEN show_products ile göster (izin isteme).` } : {}), ...(!r.length ? { not: "Uygun ürün yok; dürüstçe söyle." } : {}) };
  }
  if (name === "get_product") { const p = K.bySlug[a.slug]; return p ? { ...K.slim(p), aciklama: p.description?.slice(0, 600) } : { error: "bulunamadı" }; }
  if (name === "show_products") {
    const dropped = [];
    const items = (a.slugs || []).filter((s) => K.bySlug[s]).filter((s) => {
      if (actions.explicit?.has(s)) return true;
      const v = S.violations(K.bySlug[s], actions.relaxedC || C, { ignoreType: true }); // gevşetilmiş aramanın sonuçları gösterilebilir
      if (v.length) dropped.push(`${K.short(K.bySlug[s])} (${v.join(", ")})`);
      return !v.length;
    }).filter((s, i, arr) => { // aynı modelin renkleri ekranı doldurmasın (müşteri renkleri istemediyse)
      if (actions.explicit?.has(s) || actions.wantsColors) return true;
      const m = K.bySlug[s].model + K.bySlug[s].type;
      return arr.findIndex((x) => K.bySlug[x].model + K.bySlug[x].type === m) === i;
    }).map((s) => K.card(K.bySlug[s]));
    if (!items.length) return { error: "Bu ürünler müşterinin isteğine uymuyor, GÖSTERİLMEDİ: " + dropped.join("; ") };
    actions.push({ type: "show", title: a.title, items });
    (actions.shown ||= []).push(...items.map((i) => i.slug));
    return { gosterildi: items.map((i) => i.short), not: "Cevabında yalnızca bu ürünlerden bahset.", ...(dropped.length ? { gosterilmedi: dropped } : {}) };
  }
  if (name === "ask_staff") { actions.staffReq = { question: a.question, dept: a.department }; return { ok: true, not: "Soru ekibe iletildi. Müşteriye sıcak ve kısa bir cümleyle butikteki arkadaşlara sorduğunu, cevabın birkaç dakika içinde burada görüneceğini söyle; cevabı UYDURMA." }; }
  if (name === "add_to_cart") {
    const p = K.bySlug[a.slug]; if (!p) return { error: "bulunamadı" };
    const r = Router.addToCart(p, a.size || C.size, C);
    actions.push(...r.actions);
    actions.codeReply = r.reply; // numara sorusu / stok cevabı kodun cümlesiyle gider (butonlar onunla eşleşir)
    return { sonuc: r.reply, not: "Bu cümleyi aynen kullan, ekleme yapma." };
  }
  return { error: "bilinmeyen araç" };
}

const usage = { in: 0, out: 0 };
async function openai(body, attempt = 0) {
  let r;
  try {
    r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
      body: JSON.stringify({ model: MODEL, tools: TOOLS.filter((t) => t.name !== "ask_staff" || Staff.enabled()), reasoning: { effort: "low" }, ...body }) });
  } catch (e) { if (attempt < 3) { await new Promise((z) => setTimeout(z, 800 * 2 ** attempt)); return openai(body, attempt + 1); } throw e; }
  const j = await r.json();
  if ((r.status === 429 || r.status >= 500) && attempt < 4) { await new Promise((z) => setTimeout(z, 1000 * 2 ** attempt)); return openai(body, attempt + 1); }
  if (!r.ok) throw new Error(j.error?.message || r.status);
  usage.in += j.usage?.input_tokens || 0; usage.out += j.usage?.output_tokens || 0;
  return j;
}

// tur hazırlığı (API yok → bedava test edilir)
function prepareTurn({ history = [], context = {} }) {
  const cur = context.slug && K.bySlug[context.slug];
  const userMsgs = history.filter((m) => m.role === "user").map((m) => String(m.content));
  const actions = [];
  actions.constraints = S.extract(userMsgs);
  actions.wantsColors = /renk(ler)?i|hangi renk|renk secenek|diger renk|baska renk/.test(S.norm(userMsgs[userMsgs.length - 1] || ""));
  if (context.size && !actions.constraints.size) actions.constraints.size = +context.size; // arayüzde seçilen numara
  const C = actions.constraints;
  const lastUser = userMsgs[userMsgs.length - 1] || "";
  const seen = (context.seen || []).filter((s) => K.bySlug[s]);
  // adıyla anılan ürün kısıtlara takılmaz ("Rivell'in kahvesini göster")
  actions.explicit = new Set(seen.filter((s) => new RegExp(`\\b${S.norm(K.bySlug[s].model)}\\b`).test(S.norm(lastUser))));
  if (cur) actions.explicit.add(cur.slug);
  const enHits = (lastUser.match(/\b(the|do|you|have|for|my|shoes?|boots?|size|price|want|show|is|are|hi|hello)\b/gi) || []).length;
  const english = enHits >= 2 && !/[çğıöşüÇĞİÖŞÜ]|\b(var|mı|mi|için|bir|ve)\b/i.test(lastUser);
  const cdesc = S.describe(C);
  const memory = [
    cur && `Müşteri şu an bu ürünün sayfasında: ${JSON.stringify(K.slim(cur))}.`,
    !cur && `Müşteri ${context.page === "home" ? "anasayfada" : context.page === "koleksiyon" ? "koleksiyon sayfasında" : "sitede"}.`,
    cdesc && `MÜŞTERİNİN İSTEKLERİ (her aramaya zorla uygulanır; tekrar sorma): ${cdesc}.`,
    K.facts(C),
    seen.length && `Bu konuşmada gösterilen ürünler: ${seen.slice(-12).map((s) => `${K.short(K.bySlug[s])} [${s}] ${K.TL(K.bySlug[s].price)}`).join("; ")}.`,
    Staff.enabled() && "EKİBE SOR AÇIK: Bilmediğin ya da bilgide yazmayan bir şey sorulursa (sipariş durumu, toptan, fatura, indirim talebi, mağazada stok, 42+ numara, yazmayan ölçü…) WhatsApp'a yönlendirme; ask_staff ile butik ekibine sor.",
    context.cart?.length && `Çantada: ${context.cart.map((c) => `${c.short} ${c.size} numara`).join(", ")}.`,
    english && "DİL: Müşteri İngilizce yazdı. Cevabın TAMAMEN İngilizce olmalı.",
  ].filter(Boolean).join("\n");
  const instructions = SYSTEM + "\n\nANLIK DURUM:\n" + memory;
  const input = history.slice(-12).map((m) => {
    if (m.role !== "assistant") return { role: "user", content: String(m.content) };
    const extra = m.shown?.length ? `\n[ekranda gösterildi: ${m.shown.filter((s) => K.bySlug[s]).map((s) => `${K.short(K.bySlug[s])} [${s}]`).join("; ")}]` : "";
    return { role: "assistant", content: String(m.content) + extra };
  });
  const one = S.extractOne(lastUser);
  const searching = !!(one.type || one.colors || one.tone || one.maxHeel != null || one.minHeel != null || one.maxPrice || one.finish || one.warm || one.calf || one.heelType || one.size || one.comfort) && !/(fark|karsilastir|hangisi)/.test(S.norm(lastUser));
  return { instructions, input, actions, cur, english, cdesc, searching };
}

const cleanReply = (t) => t.replace(/\s*(İsterseniz|Dilerseniz|Eğer isterseniz)[^.?!]*[.?!]?\s*$/u, "").replace(/,?\s*(isterseniz|dilerseniz) (onu|bunu|onları|bunları)? ?(göstereyim|çıkarayım|önereyim|ayırayım|ekleyeyim)[.!]?\s*$/iu, ".").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\*\*/g, "").replace(/^\s*[-•]\s*/gm, "").replace(/\s*\n+\s*/g, " ").replace(/\s+([.,!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
// uzun resmi adı kısa adla değiştir
const NAMES = K.products.map((p) => [p.name, K.short(p)]).sort((a, b) => b[0].length - a[0].length);
const shortNames = (t) => NAMES.reduce((s, [l, sh]) => s.split(l).join(sh), t);
// model rakam uydurmasın: bir ürünün adından sonra gelen "N cm topuk" gerçek topukla değiştirilir
function fixNumbers(text, slugs) {
  const ps = [...new Set(slugs)].map((s) => K.bySlug[s]).filter((p) => p && p.heel_cm != null && !p.heel_conflict);
  for (const p of ps) {
    const re = new RegExp(`(${p.model}[^.]{0,80}?)(\\d+(?:[.,]\\d)?)( ?cm(?:'?l?[iı]?k)? (?:topu|ince topu|kalın topu|düz|taban))`, "g");
    text = text.replace(re, (all, pre, num, post) => (Math.abs(parseFloat(num.replace(",", ".")) - p.heel_cm) < 0.3 ? all : pre + K.n(p.heel_cm) + post));
  }
  return text;
}
// göstermeden ürün anma → kod o ürünü kendisi gösterir (müşteri adı geçen ürünü görmeden kalmasın)
function showMentioned(text, actions, seen) {
  const shown = new Set(actions.shown || []); // bu turda gösterilmeyen ama adı geçen ürün (daha önce görülmüş olsa da) tekrar gösterilir
  const n = S.norm(text);
  const seenFirst = (p) => (seen.includes(p.slug) ? 0 : 1); // adı geçen modelin daha önce görülen rengi öncelikli
  const miss = K.products.filter((p) => p.in_stock && !shown.has(p.slug) && ![...shown].some((s) => K.bySlug[s]?.model === p.model) && new RegExp(`\\b${S.norm(p.model)}\\b`).test(n) && p.model.length > 3)
    .filter((p) => { const col = S.extractOne(n.slice(n.indexOf(S.norm(p.model)), n.indexOf(S.norm(p.model)) + 40)).colors; return !col || col.includes(p.color) || !K.family(p).some((q) => col.includes(q.color)); })
    .sort((a, b) => seenFirst(a) - seenFirst(b));
  const ok = miss.filter((p) => !S.violations(p, actions.constraints, { ignoreType: true }).length);
  const uniq = ok.filter((p, i) => ok.findIndex((q) => q.model === p.model) === i).slice(0, 4); // her modelden ilk uyan renk
  if (uniq.length) { actions.push({ type: "show", items: uniq.map(K.card) }); (actions.shown ||= []).push(...uniq.map((p) => p.slug)); }
}

async function chatLLM(turn, context) {
  const { instructions, input, actions } = turn;
  let resp = await openai({ instructions, input });
  for (let i = 0; i < 6; i++) {
    const calls = resp.output.filter((o) => o.type === "function_call");
    if (!calls.length) {
      const text = resp.output.filter((o) => o.type === "message").flatMap((o) => o.content).filter((c) => c.type === "output_text").map((c) => c.text).join("\n");
      let reply = actions.codeReply && actions.some((a) => a.type === "choices" || a.type === "cart") ? actions.codeReply : shortNames(cleanReply(text));
      showMentioned(reply, actions, context.seen || []);
      reply = fixNumbers(reply, [...(actions.shown || []), ...(context.seen || []), ...(context.slug ? [context.slug] : [])]);
      // ürün arayan turda ekran boş kalmaz: model göstermediyse kod en uygunları (gerekirse yakın tonla) gösterir
      if (turn.searching && !actions.some((a) => a.type === "show" || a.type === "choices" || a.type === "cart")) {
        const r = runTool("search_products", {}, actions);
        const slugs = r.sonuclar.map((x) => x.slug);
        if (slugs.length) runTool("show_products", { slugs: slugs.slice(0, 4) }, actions);
      }
      return { reply, actions, via: "llm" };
    }
    const outs = calls.map((c) => { let a = {}; try { a = JSON.parse(c.arguments || "{}"); } catch {} return { type: "function_call_output", call_id: c.call_id, output: JSON.stringify(runTool(c.name, a, actions)) }; });
    resp = await openai({ instructions, previous_response_id: resp.id, input: outs });
  }
  return { reply: "Bir saniye, sizin için tekrar bakıyorum.", actions };
}

const route = Router.create();
const cache = new Map();
const stats = { kod: 0, llm: 0, onbellek: 0 };
// ekip katmanı: konuşma ekipteyse Ela susar; Ela (kod ya da model) ekibe sormak isterse Telegram'a gider
async function chat({ history = [], context = {} }) {
  const conv = String(context.conv || "").slice(0, 64);
  const last = [...history].reverse().find((m) => m.role === "user")?.content || "";
  if (conv && Staff.enabled() && (await Staff.customerMessage(conv, last))) return { reply: null, actions: [{ type: "human" }], via: "ekip" };
  const out = await answer({ history, context });
  const req = out.staffReq || out.actions?.staffReq;
  if (req && conv && Staff.enabled()) {
    const cur = context.slug && K.bySlug[context.slug];
    const summary = history.slice(-6).map((m) => `${m.role === "user" ? "Müşteri" : "Ela"}: ${String(m.content).slice(0, 160)}`).join("\n");
    await Staff.escalate({ conv, question: req.question, dept: req.dept, summary, product: cur ? `${K.short(cur)} · ${cur.url}` : "" });
    (out.actions ||= []).push({ type: "staff" });
  }
  delete out.staffReq;
  return out;
}
async function answer({ history = [], context = {} }) {
  const turn = prepareTurn({ history, context });
  const r = route({ history, context, constraints: turn.actions.constraints, cur: turn.cur });
  if (r) { stats.kod++; return { ...r, need: S.describe(turn.actions.constraints) }; }
  const userMsgs = history.filter((m) => m.role === "user");
  const key = userMsgs.length === 1 ? S.norm(userMsgs[0].content).replace(/[^a-z0-9 ]/g, "").trim() + "|" + (context.slug || "") + "|" + (context.size || "") : null;
  if (key && cache.has(key)) { stats.onbellek++; return { ...cache.get(key), via: "onbellek" }; }
  if (!process.env.OPENAI_API_KEY) return { reply: `Şu an bu soruyu yanıtlayamıyorum; WhatsApp hattımızdan (${FACTS.whatsapp}) hemen yardımcı olurlar.`, actions: [], via: "anahtar-yok" };
  stats.llm++;
  const out = await chatLLM(turn, context);
  out.need = turn.cdesc;
  if (key && out.reply && !out.actions.staffReq && !out.actions.some((a) => a.type === "cart")) { if (cache.size > 500) cache.delete(cache.keys().next().value); cache.set(key, { reply: out.reply, actions: out.actions.filter((a) => a.type === "show") }); }
  return out;
}

// ---- http ----
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".glb": "model/gltf-binary" };
const send = (res, code, body, type = "application/json; charset=utf-8") => { res.writeHead(code, { "Content-Type": type }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
function safeJoin(base, rel) { const full = path.resolve(base, "." + path.sep + rel.replace(/^[\\/]+/, "")); const r = path.relative(base, full); return r && !r.startsWith("..") && !path.isAbsolute(r) ? full : null; }
const hits = new Map();
function allow(ip) { const now = Date.now(), a = (hits.get(ip) || []).filter((t) => now - t < 60000); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length <= 20; }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  let p;
  try { p = decodeURIComponent(u.pathname); } catch { return send(res, 400, "hatalı", "text/plain"); }
  try {
    if (p === "/api/catalog") return send(res, 200, K.products.filter((x) => x.in_stock).map(K.card));
    if (p === "/api/product") {
      const x = K.bySlug[u.searchParams.get("slug")]; if (!x) return send(res, 404, {});
      return send(res, 200, { ...x, images: x.images.map((i) => K.rs(i, 1200)), card: K.card(x), heel: K.heelTxt(x), family: K.family(x).map(K.card), similar: K.search({ limit: 4 }, { type: x.type }).filter((q) => q.model !== x.model).slice(0, 4).map(K.card) });
    }
    if (p === "/api/staff") return send(res, 200, Staff.poll(String(u.searchParams.get("conv") || "").slice(0, 64), u.searchParams.get("since")));
    if (p === "/api/stats") return send(res, 200, { ...stats, usage, kod_orani: Math.round((100 * (stats.kod + stats.onbellek)) / Math.max(1, stats.kod + stats.llm + stats.onbellek)) + "%" });
    if (p === "/api/chat" && req.method === "POST") {
      if (!allow(String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress)) return send(res, 200, { reply: "Çok hızlı yazdınız; birkaç saniye sonra tekrar dener misiniz?", actions: [] });
      let b = ""; for await (const c of req) { b += c; if (b.length > 50000) return send(res, 413, {}); }
      return send(res, 200, await chat(JSON.parse(b)));
    }
    if (p.includes("..") || p.includes("\\") || p.includes("\0")) return send(res, 404, "yok", "text/plain");
    let f = safeJoin(PUB, p === "/" ? "index.html" : p);
    if (f && !path.extname(f) && fs.existsSync(f + ".html")) f += ".html"; // /koleksiyon → koleksiyon.html
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": path.extname(f) === ".glb" || path.extname(f) === ".jpg" ? "max-age=86400" : "no-cache" });
      return fs.createReadStream(f).pipe(res);
    }
    return send(res, 404, "Sayfa bulunamadı", "text/plain; charset=utf-8");
  } catch (e) { console.error(e); send(res, 500, { reply: "Kusura bakmayın, küçük bir aksaklık oldu. Tekrar yazar mısınız?", actions: [] }); }
});
if (require.main === module) server.listen(PORT, () => {
  // aynı Wi-Fi'daki telefon için yerel adres(ler)
  const lan = Object.values(require("os").networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => `http://${i.address}:${PORT}`);
  console.log(`Örnek Butik → http://localhost:${PORT}  (anahtar ${process.env.OPENAI_API_KEY ? "var" : "YOK"})`);
  if (lan.length) console.log(`Telefondan (aynı Wi-Fi): ${lan.join("  ")}`);
  console.log(`Ekibe sor (Telegram): ${Staff.enabled() ? "AÇIK" : process.env.ELA_TG_TOKEN ? "token var, ELA_TG_CHAT_ID yok → node tg-kurulum.js" : "kapalı (.env: ELA_TG_TOKEN + ELA_TG_CHAT_ID)"}`);
  if (process.env.ELA_TG_TOKEN) Staff.startPolling();
});
module.exports = { answer, fixNumbers, chat, route, prepareTurn, runTool, cleanReply, showMentioned, stats, cache, SYSTEM, TOOLS, server, usage };
