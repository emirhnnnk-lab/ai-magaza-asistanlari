// Müşteri kısıtları: mesajlardan tür, ton, renk, istenmeyen renk, bütçe ve kalıp özelliklerini
// kodla çıkarır ve her aramaya/gösterime zorla uygular. Model unutsa da kısıt delinmez.

const norm = (s) => (s || "").toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");

// ---- katalog kelimeleri ----
const CATEGORY_WORDS = [
  [/\b(pardesu|ferace|trenc(kot)?|manto|yagmurluk)/, ["Trençkot"]],
  [/\b(kaban|mont|palto)/, ["Kaban"]], [/\b(kimono|kap)\b/, ["Kimono"]], [/\bceket/, ["Ceket"]],
  [/\b(elbise|abiye)/, ["Elbise"]], [/\b(gomlek|bluz|tunik)/, ["Gömlek"]], [/\bsweat/, ["Sweatshirt"]],
  [/\btakim/, ["Takım"]], [/\b(pantolon|pantalon)/, ["Pantolon"]], [/\b(jean|kot)\b/, ["Jean"]], [/\betek\b|\betekler/, ["Etek"]],
  [/\besofman/, ["Alt Eşofman"]], [/\b(iclik|badi)/, ["İçlik"]], [/\b(hasema|mayo)/, ["Haşema"]],
  [/\bdis giyim/, ["Trençkot", "Kaban", "Kimono", "Ceket"]],
];

// renk kelimesi -> ürün renk adları (ürünün kendi rengi, p.color)
const COLORS = {
  siyah: ["Siyah"], lacivert: ["Lacivert"], kahve: ["Kahverengi", "Acı Kahve"], bej: ["Bej", "Krem", "Vizon", "Camel"], ekru: ["Ekru", "Krem"],
  krem: ["Krem", "Ekru"], beyaz: ["Beyaz", "Ekru", "Krem"], tas: ["Taş Rengi"], lila: ["Lila"], fusya: ["Fuşya"], turuncu: ["Turuncu"], toprak: ["Toprak"], gri: ["Gri", "Antrasit"], antrasit: ["Antrasit"], haki: ["Haki", "Küf Yeşili", "Yağ Yeşili"],
  yesil: ["Yeşil", "Haki", "Su Yeşili", "Mint Yeşili", "Küf Yeşili", "Yağ Yeşili"], mavi: ["Mavi", "İndigo"], bordo: ["Bordo", "Mürdüm"],
  pembe: ["Pembe", "Pudra", "Gül kurusu"], pudra: ["Pudra", "Pembe"], sari: ["Sarı", "Hardal Sarısı"], hardal: ["Hardal Sarısı"], mor: ["Mürdüm"],
  murdum: ["Mürdüm"], vizon: ["Vizon"], camel: ["Camel"], kirmizi: ["Kırmızı"], indigo: ["İndigo"], mint: ["Mint Yeşili"],
};
const LIGHT = new Set(["Bej", "Ekru", "Krem", "Beyaz", "Taş Rengi", "Pudra", "Sarı", "Pembe", "Lila", "Bebe Mavisi", "Açık Mavi", "Su Yeşili", "Mint Yeşili", "Gül kurusu"]);
const DARK = new Set(["Siyah", "Lacivert", "Kahverengi", "Acı Kahve", "Bordo", "Mürdüm", "Antrasit", "Haki", "İndigo", "Yağ Yeşili", "Küf Yeşili"]);
function toneOf(p) {
  const t = norm(p.tags?.color_tone);
  if (LIGHT.has(p.color)) return /\bkoyu\b/.test(t) && !/\bacik\b/.test(t) ? "orta" : "acik";
  if (DARK.has(p.color)) return /\bacik\b/.test(t) && !/\bkoyu\b/.test(t) ? "orta" : "koyu";
  if (/\bacik\b|pastel|buz/.test(t) && !/\bkoyu\b/.test(t)) return "acik";
  if (/\bkoyu\b/.test(t)) return "koyu";
  return "orta"; // mavi, gri, camel, vizon, kırmızı, yeşil...
}

// kalıp/özellik kelimeleri -> üründe aranacak desen
const ATTRS = {
  genis_paca: { say: "bol/geniş paça", ask: /\b(bol|genis) paca|palazzo|plazzo|salas paca/, has: (h) => /genis paca|bol paca|plazzo|palazzo|genis pacali|bol pacali/.test(h) },
  dar_kesim: { say: "dar/kalem kesim", ask: /\bkalem\b|dar paca|dar kesim|skinny/, has: (h) => /kalem|dar paca|daralan/.test(h) },
  astarli: { say: "astarlı", ask: /\bastarli|\bastari olan|\bastarli olsun/, has: (h, p) => p.lined === true || /astar/.test(h) },
  kemerli: { say: "kemerli", ask: /\bkemerli|\bkemeri olan/, has: (h) => /kemer/.test(h) },
  kapusonlu: { say: "kapüşonlu", ask: /\bkapusonlu/, has: (h) => /kapuson/.test(h) },
  cepli: { say: "cepli", ask: /\bcepli|\bcebi olan/, has: (h) => /\bcep/.test(h) },
  salas: { say: "bol/salaş kesim", ask: /\bsalas\b|oversize|bol kesim|bol kalip|rahat kalip|vucudu (belli etmeyen|sarmayan)/, has: (h) => /oversize|salas|bol|rahat kalip|rahat kesim|genis kesim|dokumlu/.test(h) },
  uzun: { say: "uzun boy", ask: /\b(uzun boy|uzun olsun|bilek boy|yere kadar|maksi|maxi)\b/, has: (h, p) => p.tags?.length === "uzun" || /uzun|maxi|maksi|bilek boy/.test(h) },
};
const NEG = "(olmasin|olmayan|istemiyorum|istemem|haric|disinda|baska|degil|sevmiyorum|olmaz|hic sevmem|yok)";

function hay(p) {
  return norm([p.name, p.tags?.silhouette, p.fit, (p.features || []).join(" "), p.description].join(" "));
}

// ---- çıkarım ----
// Mesajdaki kategori kelimeleri, mesajdaki konumlarına göre sıralı
function categoryHits(m) {
  const hits = [];
  for (const [re, cats] of CATEGORY_WORDS) {
    const g = new RegExp(re.source, "g");
    let mm; while ((mm = g.exec(m))) hits.push({ i: mm.index, cats });
  }
  return hits.sort((a, b) => a.i - b.i);
}
const blank = () => ({ tone: null, colors: new Set(), exclude: new Set(), attrs: new Set(), notAttrs: new Set() });

// Konu hafızası: her kategori kendi isteklerini saklar; kategoriye geri dönülünce istekler geri gelir.
// Bütçe tüm konuşma için geçerlidir.
function extract(userMsgs) {
  const topics = new Map(); // "Trençkot" -> kısıtlar
  const state = { current: null, maxPrice: null };
  const topicOf = (cats) => { const k = cats.join("/"); if (!topics.has(k)) topics.set(k, { cats, ...blank() }); return topics.get(k); };
  const general = { cats: null, ...blank() };
  for (const raw of userMsgs) {
    const m = norm(raw);
    const hits = categoryHits(m);
    if (!hits.length) { apply(m, state.current ? topicOf(state.current) : general, state); continue; }
    // mesajı kategori kelimelerinden böl: her parça kendi kategorisine yazılır
    hits.forEach((h, j) => {
      const seg = m.slice(j === 0 ? 0 : h.i, j + 1 < hits.length ? hits[j + 1].i : m.length);
      apply(seg, topicOf(h.cats), state);
    });
    state.current = hits[hits.length - 1].cats;
  }
  const t = state.current ? topicOf(state.current) : general;
  const c = { category: state.current, tone: t.tone, colors: t.colors, exclude: t.exclude, attrs: t.attrs, notAttrs: t.notAttrs, maxPrice: state.maxPrice };
  c.topics = [...topics.values()].map((x) => ({ cats: x.cats, desc: describe({ ...x, category: x.cats, maxPrice: null }) }));
  return c;
}

function apply(m, c, state) {
  const colorAlt = Object.keys(COLORS).join("|");
  {
    // "açık mavi", "koyu yeşil": renk niteleyicisi, ayrı bir ton isteği değil
    m = m.replace(new RegExp(`\\b(acik|koyu)\\s+(?=(${colorAlt}))`, "g"), "");
    // ton
    if (/\b(acik|pastel)\b.{0,12}\b(renk|ton|bir sey|olsun|renkli|tonlu)|daha acik|acik renk|acik ton|pastel/.test(m)) c.tone = "acik";
    if (/\bkoyu\b.{0,12}\b(renk|ton|bir sey|olsun|renkli|tonlu)|daha koyu|koyu renk|koyu ton/.test(m)) c.tone = "koyu";
    if (/(acik|koyu).{0,10}\b(olmasin|istemiyorum)/.test(m)) { const neg = m.match(/(acik|koyu).{0,10}\b(olmasin|istemiyorum)/)[1]; c.tone = neg === "acik" ? "koyu" : "acik"; }
    // renkler
    for (const w of Object.keys(COLORS)) {
      const re = new RegExp(`\\b${w}[a-z]*`, "g");
      let mm;
      while ((mm = re.exec(m))) {
        const after = m.slice(mm.index, mm.index + w.length + 26), before = m.slice(Math.max(0, mm.index - 14), mm.index);
        const negated = new RegExp(`^${w}[a-z]*\\s*(ve|,|ya da|veya)?\\s*([a-z]+\\s*)?${NEG}`).test(after) || /\b(haric|disinda|olmayan)\s*$/.test(before) || new RegExp(`^${w}[a-z]*\\s+(disinda|haric)`).test(after);
        if (negated) { c.exclude.add(w); c.colors.delete(w); } else { c.colors.add(w); c.exclude.delete(w); }
      }
    }
    // bütçe
    const pm = m.match(/(\d{3,5})\s*(tl|lira|₺)?\s*('?(ye|ya|e|a|u|i|yi|yu|den|dan)\b)?\s*(alti|altinda|altina|gecmesin|kadar|dek|civari|max|maksimum)/) || m.match(/(en fazla|butcem|butce|max|maksimum)\s*(\d{3,5})/);
    if (pm) state.maxPrice = +(pm[1].match(/\d/) ? pm[1] : pm[2]);
    // kalıp / özellik
    for (const [k, a] of Object.entries(ATTRS)) {
      const mm = m.match(a.ask);
      if (!mm) continue;
      const after = m.slice(mm.index, mm.index + mm[0].length + 16);
      if (new RegExp(NEG).test(after.slice(mm[0].length))) { c.notAttrs.add(k); c.attrs.delete(k); } else { c.attrs.add(k); c.notAttrs.delete(k); }
    }
  }
}

// Müşteri profili: boy, kilo, beden — bir kez söylenince konuşma boyunca hatırlanır
function profile(userMsgs) {
  const p = {};
  for (const raw of userMsgs) {
    const m = norm(raw);
    const h = m.match(/\b1[.,]\s?(\d{2})\b/) || m.match(/\b(1\d{2})\s*(cm|boy)/) || m.match(/boy(um)?\s*(1\d{2})\b/);
    if (h) p.boy = +(h[0].match(/1[.,]\s?\d{2}/) ? "1" + h[1] : (h[2] && /^\d+$/.test(h[2]) ? h[2] : h[1]));
    const k = m.match(/\b(\d{2,3})\s*(kilo|kg)/) || m.match(/kilom\s*(\d{2,3})/);
    if (k) p.kilo = +k[1];
    const b = m.match(/\b(xs|s|m|l|xl|xxl|s-m|l-xl|s\/m|l\/xl|3[4-9]|4[0-8])\s*beden/) || m.match(/bedenim\s*(xs|s|m|l|xl|xxl|s-m|l-xl|3[4-9]|4[0-8])\b/);
    if (b) p.beden = b[1].toUpperCase();
  }
  return p;
}

const lastIntentKombin = (userMsgs) => /\b(ne giy|yanina|kombin|altina|ustune|icine|ile ne|nasil giy|ne gider|ne yakisir|tamamla|gidecek|giden|gider mi|uyan|uyumlu|yakisan|yakisir mi|onunla|bununla|beraber giy|birlikte giy)/.test(norm(userMsgs[userMsgs.length - 1] || ""));

// ---- uygulama ----
const colorHit = (w, p) => COLORS[w].includes(p.color) || norm(p.color).split(/[\s/]+/).some((x) => x.startsWith(w));
function violations(p, c, { skipCategory = false } = {}) {
  const v = [];
  if (!skipCategory && c.category && !c.category.includes(p.cat)) v.push(`tür (${c.category.join("/")} istendi)`);
  if (c.tone && toneOf(p) !== c.tone) v.push(`ton (${c.tone === "acik" ? "açık" : "koyu"} istendi)`);
  if (c.colors.size && ![...c.colors].some((w) => colorHit(w, p))) v.push(`renk (${[...c.colors].join("/")} istendi)`);
  if ([...c.exclude].some((w) => colorHit(w, p))) v.push(`istenmeyen renk`);
  if (c.maxPrice && p.price > c.maxPrice) v.push(`bütçe (${c.maxPrice} TL)`);
  const h = hay(p);
  for (const k of c.attrs) if (!ATTRS[k].has(h, p)) v.push(ATTRS[k].say);
  for (const k of c.notAttrs) if (ATTRS[k].has(h, p)) v.push(`istenmeyen: ${ATTRS[k].say}`);
  return v;
}

function describe(c, { skipCategory = false } = {}) {
  const parts = [];
  if (c.category && !skipCategory) parts.push(`tür: ${c.category.join("/")}`);
  if (c.tone) parts.push(`ton: ${c.tone === "acik" ? "açık renk" : "koyu renk"}`);
  if (c.colors.size) parts.push(`renk: ${[...c.colors].join(", ")}`);
  if (c.exclude.size) parts.push(`istemediği renk: ${[...c.exclude].join(", ")}`);
  if (c.maxPrice) parts.push(`bütçe: en fazla ${c.maxPrice} TL`);
  if (c.attrs.size) parts.push(`istenen: ${[...c.attrs].map((k) => ATTRS[k].say).join(", ")}`);
  if (c.notAttrs.size) parts.push(`istenmeyen: ${[...c.notAttrs].map((k) => ATTRS[k].say).join(", ")}`);
  return parts.join(" · ");
}

module.exports = { extract, profile, violations, describe, toneOf, lastIntentKombin, categoryHits, norm, COLORS, ATTRS };
