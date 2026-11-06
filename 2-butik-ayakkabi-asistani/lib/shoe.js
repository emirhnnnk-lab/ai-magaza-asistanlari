// Ayakkabı dili: müşterinin cümlesinden kısıtları KODLA çıkarır (tür, renk, numara, topuk, bütçe, malzeme, mevsim).
// Model bu kısıtları bilmek zorunda değil; arama ve gösterim her zaman bunlara uyar. Test: contract-test.js
const norm = (s) => String(s || "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase()
  .replace(/[çğıöşüâî]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i" })[c]).replace(/[’']/g, " ").replace(/\s+/g, " ").trim();

// tür eş anlamlıları (en uzun önce eşleşsin diye sıra önemli)
const TYPES = [
  ["cizme", /\b(cizme\w*|diz (boyu|alti|ustu) \w*|uzun bot\w*|uzun konclu|binici)\b/],
  ["stiletto", /\b(stiletto\w*|sivri burun topuklu|pump\w*|abiye ayakkabi\w*)\b/],
  ["bot", /\b(bot|botu|botlar\w*|botlari\w*|bootie|kisa bot\w*|postal\w*|chelsea|bilek bot\w*|bot model\w*|botu?m)\b/],
  ["makosen", /\b(makosen\w*|mokasen\w*|loafer\w*|oxford\w*)\b/],
  ["babet", /\b(babet\w*|balerin\w*|ballerin\w*|flat\w*|mary jane)\b/],
  ["spor", /\b(spor ayakkabi\w*|spor\w*|sneaker\w*|snikir\w*|yuruyus ayakkabi\w*)\b/],
  ["sandalet", /\b(sandalet\w*|sandal\w*)\b/],
  ["terlik", /\b(terlik\w*|sabo\w*|slipper\w*|mule\w*)\b/],
  ["topuklu", /\b(topuklu (ayakkabi\w*|model\w*)|topuklu|topuklular\w*|klasik ayakkabi\w*|ofis ayakkabi\w*|dugun ayakkabi\w*)\b/],
];
const TYPE_TR = { bot: "bot", cizme: "çizme", stiletto: "stiletto", topuklu: "topuklu ayakkabı", spor: "spor ayakkabı", makosen: "makosen", babet: "babet", sandalet: "sandalet", terlik: "terlik" };
// renk eş anlamlıları → katalog rengi
const COLORS = {
  siyah: /\b(siyah\w*|kara|black)\b/, kahve: /\b(kahve\w*|kahverengi\w*|brown|cikolata\w*)\b/, taba: /\b(taba\w*|konyak)\b/, camel: /\b(camel|deve tuyu)\b/,
  bej: /\b(bej\w*|beige)\b/, ekru: /\b(ekru\w*|krem\w*|kirik beyaz\w*)\b/, ten: /\b(ten rengi\w*|ten|nude)\b/, vizon: /\b(vizon\w*|gri kahve)\b/,
  bordo: /\b(bordo\w*|visne\w*|burgundy)\b/, "kırmızı": /\b(kirmizi\w*|red)\b/, beyaz: /\b(beyaz\w*|white)\b/, lacivert: /\b(lacivert\w*|navy)\b/,
  haki: /\b(haki\w*|yesil\w*)\b/, "tütün": /\b(tutun\w*)\b/, kum: /\b(kum rengi\w*|kum)\b/, pudra: /\b(pudra\w*|pembe\w*)\b/, lame: /\b(lame\w*|gumus\w*|simli)\b/, dore: /\b(dore\w*|altin\w*|gold)\b/,
};
// "açık/koyu ton" istekleri
const LIGHT = ["bej", "ekru", "ten", "beyaz", "kum", "pudra", "camel", "vizon"];
const DARK = ["siyah", "kahve", "bordo", "lacivert", "tütün", "haki"];
const NEG = /(olmasin|istemiyorum|istemem|haric|disinda|degil|sevmem|sevmiyorum|olmaz|hic sevmem)/;

// tek mesajdan
function extractOne(raw) {
  const m = " " + norm(raw).replace(/(\d)\.(\d{3})/g, "$1$2").replace(/(\d),(\d)/g, "$1#$2").replace(/[!?.,;:()]+/g, " ").replace(/#/g, ",") + " ";
  const c = {};
  // tür: "bot değil çizme" → son olumlu
  for (const [t, re] of TYPES) {
    const mm = m.match(re);
    if (!mm) continue;
    const after = m.slice(m.indexOf(mm[0]) + mm[0].length, m.indexOf(mm[0]) + mm[0].length + 22);
    if (NEG.test(after.split(/ (ama|ve|da|de) /)[0])) { (c.notTypes ||= []).push(t); continue; }
    if (!c.type) c.type = t;
  }
  if (c.type === "topuklu" && /stiletto/.test(m)) c.type = "stiletto";
  if (c.type === "spor" && /\bspor (sik|kombin|tarz)/.test(m)) delete c.type; // "spor şık bir şey" tür değil
  // renk + olumsuzluk ("siyah olmasın", "kahve hariç")
  for (const [col, re] of Object.entries(COLORS)) {
    const mm = m.match(re);
    if (!mm) continue;
    const i = m.indexOf(mm[0]);
    const after = m.slice(i + mm[0].length, i + mm[0].length + 24).split(/ (ama|ve|ya da|yada|veya) /)[0];
    if (NEG.test(after)) (c.notColors ||= []).push(col);
    else (c.colors ||= []).push(col);
  }
  if (/\bacik (renk|ton)/.test(m)) c.tone = "acik";
  if (/\bkoyu (renk|ton)/.test(m)) c.tone = "koyu";
  // numara: "38 numara", "numaram 38", "38 giyiyorum", "38'im", "38 lik"
  const sz = m.match(/\b(3[4-9]|4[0-3])(?: ?,5)? ?(numara\w*|no\b|beden\w*|giyiyorum|giyerim|ayak|im\b|lik|luk|lu\b|li\b|u\b|unu\b|i\b|ini\b|un\b|in\b|dan\b|den\b)/) || m.match(/(numara\w*|ayak numara\w*|beden\w*|no) ?:? ?(3[4-9]|4[0-3])\b/);
  if (sz) c.size = +(sz[1].match(/\d+/) ? sz[1] : sz[2]);
  // topuk
  const cmM = m.match(/(\d+(?:,\d)?) ?(cm|santim)\w*/);
  const cmV = cmM ? parseFloat(cmM[1].replace(",", ".")) : null;
  if (/topuksuz|duz taban|dumduz|hic topuk|(?<!(ince|kalin|yuksek|uzun|sivri) )topuk (olmasin|istemiyorum)/.test(m)) c.maxHeel = 2;
  else if (cmV && /(alti|altinda|en fazla|max|gecmesin|asmasin|kadar)/.test(m.slice(m.indexOf(cmM[0])))) c.maxHeel = cmV;
  else if (cmV && /(ustu|uzeri|en az|yuksek)/.test(m.slice(m.indexOf(cmM[0])))) c.minHeel = cmV;
  else if (cmV && /topuk/.test(m)) { c.minHeel = cmV - 1; c.maxHeel = cmV + 1; }
  else if (/(alcak|kisa|az|hafif|basik) topuk|topugu (alcak|kisa|az)|cok yuksek (olmasin|olmayan|degil)|yuksek topuk (olmasin|giyemem|istemiyorum)|rahat topuk/.test(m)) c.maxHeel = 5;
  else if (/(yuksek|uzun|ince yuksek) topuk|topugu yuksek/.test(m)) c.minHeel = 7;
  else if (/orta (boy )?topuk/.test(m)) { c.minHeel = 4; c.maxHeel = 7; }
  if (c.minHeel == null && c.maxHeel == null && /topuklu (sandalet|terlik|bot|babet|makosen|spor)/.test(m)) c.minHeel = 3;
  // "gün boyu ayaktayım / rahat olsun": stilist kuralı → alçak topuk (rahatlık iddiası değil, yükseklik sınırı)
  if (c.minHeel == null && c.maxHeel == null && /gun boyu|butun gun|rahat (bir|olsun|ayakkabi|edecegim)|ayakta (kal|duru|cal)|cok yuruy|yuruyecegim/.test(m)) { c.maxHeel = 4; c.comfort = true; }
  if (/kalin topuk|topugu kalin|ince topuk (olmasin|giyemem|istemiyorum|degil)|stiletto (giyemem|olmasin)/.test(m)) c.heelType = "kalin";
  else if (/ince topuk/.test(m)) c.heelType = "ince";
  // bütçe
  const bud = m.match(/(\d[\d.]*)\s?(bin)?\s?(tl|lira|₺)?\s?(alti|altinda|kadar|en fazla|max|gecmesin|butce)/) || m.match(/(butcem|butce|en fazla|max)\s?(\d[\d.]*)\s?(bin)?/);
  if (bud) {
    const n = bud[1].match(/\d/) ? bud[1] : bud[2], k = bud[1].match(/\d/) ? bud[2] : bud[3];
    let v = parseFloat(n.replace(/\./g, "")); if (k === "bin" || v < 20) v *= 1000;
    if (v >= 500 && v < 50000 && !(cmM && cmM[1] === n)) c.maxPrice = v;
  }
  if (/en ucuz|ucuz|uygun fiyat|hesapli/.test(m)) c.cheap = true;
  // malzeme
  if (/\bsuet/.test(m) && !/suet (olmasin|istemiyorum|degil)/.test(m)) c.finish = "süet";
  if (/\brugan/.test(m) && !/rugan (olmasin|istemiyorum|degil)/.test(m)) c.finish = "rugan";
  if (/suet (olmasin|istemiyorum|degil)/.test(m)) c.notFinish = "süet";
  if (/hakiki deri|gercek deri|deri olsun|suni olmasin/.test(m)) c.realLeather = true;
  // baldır: "baldırım 39 cm", "39 cm baldır", "baldır çevrem 40"
  const bi = m.search(/baldir|bacak cevre/);
  const calf = bi >= 0 && [...m.slice(Math.max(0, bi - 30), bi + 45).matchAll(/(\d{2}(?:,\d)?) ?(cm|santim)?(?! ?numara)/g)].map((x) => parseFloat(x[1].replace(",", "."))).find((v) => v >= 28 && v <= 55);
  if (calf) { c.calf = calf; if (c.minHeel === calf - 1) { delete c.minHeel; delete c.maxHeel; } }
  else if (/baldir\w* (genis|kalin|dolgun)|genis baldir|kalin baldir/.test(m)) c.calfWide = true;
  if (/kislik|kis icin|sicak tut|astarli|kurklu|soguk|kar icin|ayazda/.test(m)) c.warm = true;
  return c;
}

// tüm konuşmadan: sonra söylenen önce söyleneni ezer (fikir değiştirme)
function extract(msgs) {
  const c = {};
  for (const raw of msgs) {
    const e = extractOne(raw);
    if (e.type && e.type !== c.type) { delete c.colors; delete c.minHeel; delete c.maxHeel; delete c.heelType; delete c.finish; } // tür değişti: türe bağlı istekler sıfırlanır (numara, bütçe, renk yasağı kalır)
    for (const [k, v] of Object.entries(e)) {
      if (k === "notColors") { c.notColors = [...new Set([...(c.notColors || []), ...v])]; c.colors = (c.colors || []).filter((x) => !v.includes(x)); }
      else if (k === "colors") { c.colors = v; c.notColors = (c.notColors || []).filter((x) => !v.includes(x)); }
      else if (k === "notTypes") { c.notTypes = v; if (v.includes(c.type) && !e.type) delete c.type; }
      else c[k] = v;
    }
    if (e.maxHeel != null && e.minHeel == null) delete c.minHeel;
    if (e.minHeel != null && e.maxHeel == null) delete c.maxHeel;
  }
  for (const k of Object.keys(c)) if (Array.isArray(c[k]) && !c[k].length) delete c[k];
  return c;
}

// ürün bu isteklere uyuyor mu? ihlal listesi döner (boş = uyar)
function violations(p, c = {}, o = {}) {
  const v = [];
  if (c.type && !o.ignoreType && p.type !== c.type && !(c.type === "topuklu" && p.type === "stiletto")) v.push(`tür ${TYPE_TR[p.type]}`);
  if (c.notTypes?.includes(p.type)) v.push(`istenmeyen tür ${TYPE_TR[p.type]}`);
  if (c.colors?.length && !c.colors.includes(p.color)) v.push(`renk ${p.color}`);
  if (c.notColors?.includes(p.color)) v.push(`istenmeyen renk ${p.color}`);
  if (c.tone === "acik" && !LIGHT.includes(p.color)) v.push("açık ton değil");
  if (c.tone === "koyu" && !DARK.includes(p.color)) v.push("koyu ton değil");
  if (c.maxHeel != null && (p.heel_cm ?? 0) > c.maxHeel) v.push(`topuk ${p.heel_cm} cm`);
  if (c.minHeel != null && (p.heel_cm ?? 0) < c.minHeel) v.push(`topuk ${p.heel_cm} cm`);
  if (c.heelType === "kalin" && (p.heel_type === "İnce Topuk" || p.type === "stiletto")) v.push("ince topuk");
  if (c.comfort && (p.heel_type === "İnce Topuk" || p.type === "stiletto")) v.push("gün boyu için ince topuk");
  if (c.heelType === "ince" && p.heel_type !== "İnce Topuk") v.push("ince topuk değil");
  if (c.maxPrice && p.price > c.maxPrice) v.push(`fiyat ${p.price} TL`);
  if (c.finish && p.finish !== c.finish) v.push(`${c.finish} değil`);
  if (c.notFinish && p.finish === c.notFinish) v.push(c.notFinish);
  if (c.realLeather && !p.real_leather) v.push("hakiki deri değil");
  if (c.warm && !p.warm_lining) v.push("sıcak astarlı değil");
  if (c.size && !o.ignoreSize && !hasSize(p, c.size)) v.push(`${c.size} numara stokta yok`);
  if (c.calf && p.type === "cizme") { const cap = calfFit(p); if (cap == null) v.push("baldır ölçüsü belirtilmemiş"); else if (cap < c.calf) v.push(`baldır çapı ${cap} cm`); }
  return v;
}
// kalıp "bir numara büyük" ise müşterinin numarasının bir büyüğü önerilir
// çizmenin alabileceği en geniş baldır: ölçü (çelişkiliyse küçüğü) + esneme payı
const calfFit = (p) => (p.calf_cm == null ? null : Math.min(p.calf_cm, ...(p.calf_conflict || [])) + (p.calf_stretch || 0));
const fitSize = (p, size) => (size && p.fit === "bir numara büyük" ? size + 1 : size);
const hasSize = (p, size) => p.sizes.some((s) => +s.size === fitSize(p, size) && s.stock > 0);
const stockSizes = (p) => p.sizes.filter((s) => s.stock > 0).map((s) => +s.size);

function describe(c = {}) {
  return [
    c.type && TYPE_TR[c.type], c.colors?.length && c.colors.join("/") + " renk", c.notColors?.length && c.notColors.join("/") + " olmasın",
    c.tone && (c.tone === "acik" ? "açık ton" : "koyu ton"), c.size && `${c.size} numara`,
    c.maxHeel != null && (c.maxHeel <= 2 ? "düz/topuksuz" : `topuk en fazla ${c.maxHeel} cm`), c.minHeel != null && `topuk en az ${c.minHeel} cm`,
    c.heelType && (c.heelType === "kalin" ? "kalın topuk" : "ince topuk"), c.maxPrice && `en fazla ${c.maxPrice} TL`, c.finish, c.notFinish && c.notFinish + " olmasın",
    c.comfort && "gün boyu rahat (alçak topuk)", c.realLeather && "hakiki deri", c.calf && `baldır ${c.calf} cm`, c.calfWide && "baldırı geniş", c.warm && "kışlık / sıcak astarlı", c.notTypes?.length && c.notTypes.map((t) => TYPE_TR[t]).join("/") + " istemiyor",
  ].filter(Boolean).join(", ");
}

// yakın tonlar: istenen renk yoksa önce bunlara bakılır (kırmızı → bordo)
const NEAR = { "kırmızı": ["bordo"], bordo: ["kırmızı"], kahve: ["taba", "tütün", "camel"], taba: ["camel", "kahve", "tütün"], camel: ["taba", "bej"], "tütün": ["kahve", "taba"],
  bej: ["ekru", "ten", "kum"], ekru: ["bej", "beyaz"], ten: ["bej", "pudra"], beyaz: ["ekru"], vizon: ["kum", "bej"], kum: ["bej", "vizon"], pudra: ["ten"], lacivert: ["siyah"], haki: ["vizon"], lame: ["dore"], dore: ["lame"], siyah: [] };
module.exports = { norm, extract, extractOne, violations, describe, hasSize, fitSize, calfFit, stockSizes, TYPE_TR, LIGHT, DARK, NEAR };
