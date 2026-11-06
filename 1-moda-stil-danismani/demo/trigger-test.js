// Tetikleyici testi (API yok, bedava):  node demo/trigger-test.js
// Müşterinin farklı söyleyişleri doğru kısıta dönüşüyor mu + katalogda bu kısıtlara uyan ürün var mı?
const { extract, violations, describe } = require("./constraints");
const { bySlug } = require("./server");
const P = Object.values(bySlug);

// [mesajlar, beklenen]  beklenen: cat, tone, colors[], exclude[], max, attrs[], notAttrs[]  (verilmeyen alan boş olmalı)
const T = [
  // tür eş anlamlıları
  [["pardesü bakıyorum"], { cat: "Trençkot" }], [["ferace var mı"], { cat: "Trençkot" }], [["trenç lazım"], { cat: "Trençkot" }],
  [["kışlık mont"], { cat: "Kaban" }], [["palto bakıyorum"], { cat: "Kaban" }], [["bluz arıyorum"], { cat: "Gömlek" }], [["tunik var mı"], { cat: "Gömlek" }],
  [["abiye bakıyorum"], { cat: "Elbise" }], [["elbiselere bakalım"], { cat: "Elbise" }], [["pantolonlara bakalım"], { cat: "Pantolon" }],
  [["takım lazım"], { cat: "Takım" }], [["haşema"], { cat: "Haşema" }], [["mayo lazım tatil için"], { cat: "Haşema" }],
  // ton
  [["pantolon açık renk olsun"], { cat: "Pantolon", tone: "acik" }], [["açık tonlarda elbise"], { cat: "Elbise", tone: "acik" }],
  [["daha açık bir şey olsun", "elbise"], { cat: "Elbise" }], // tür sonradan geldi: pencere türle başlar
  [["elbise bakıyorum", "daha açık bir şey olsun"], { cat: "Elbise", tone: "acik" }],
  [["koyu renk pardesü"], { cat: "Trençkot", tone: "koyu" }], [["trençkot", "koyu renk olabilir"], { cat: "Trençkot", tone: "koyu" }],
  [["pastel bir elbise"], { cat: "Elbise", tone: "acik" }], [["elbise, koyu olmasın"], { cat: "Elbise", tone: "acik" }],
  [["elbise", "açık renk olsun", "yok yok koyu renk olsun"], { cat: "Elbise", tone: "koyu" }],
  // renk
  [["siyah elbise"], { cat: "Elbise", colors: ["siyah"] }], [["siyh elbse"], {}], // ağır yazım hatası: yakalanmıyor, model çözer
  [["bej trençkot istiyorum"], { cat: "Trençkot", colors: ["bej"] }], [["lacivert ya da siyah takım"], { cat: "Takım", colors: ["lacivert", "siyah"] }],
  [["açık mavi gömlek"], { cat: "Gömlek", colors: ["mavi"] }], [["koyu yeşil elbise"], { cat: "Elbise", colors: ["yesil"] }],
  [["kahverengi pantolon"], { cat: "Pantolon", colors: ["kahve"] }],
  // olumsuzlama
  [["elbise bakıyorum siyah olmasın"], { cat: "Elbise", exclude: ["siyah"] }], [["siyah istemiyorum elbise"], { cat: "Elbise", exclude: ["siyah"] }],
  [["elbise ama siyahtan başka"], { cat: "Elbise", exclude: ["siyah"] }],
  [["bebe mavisi gömlek"], { cat: "Gömlek", colors: ["mavi"] }], [["taş rengi pantolon"], { cat: "Pantolon", colors: ["tas"] }],
  [["siyahı sevmiyorum, elbise bakıyorum"], { cat: "Elbise", exclude: ["siyah"] }],
  [["siyah veya lacivert olmasın, takım"], { cat: "Takım", exclude: ["siyah", "lacivert"] }],
  [["siyah dışında bir elbise"], { cat: "Elbise", exclude: ["siyah"] }], [["siyah hariç elbise"], { cat: "Elbise", exclude: ["siyah"] }],
  [["elbise", "siyah ve lacivert olmasın"], { cat: "Elbise", exclude: ["siyah", "lacivert"] }],
  [["elbise", "siyah olmasın", "aslında siyah da olur"], { cat: "Elbise", colors: ["siyah"] }],
  // bütçe
  [["2000 TL altı takım"], { cat: "Takım", max: 2000 }], [["ofis için takım 2000 tl'yi geçmesin"], { cat: "Takım", max: 2000 }],
  [["1500 liraya kadar elbise"], { cat: "Elbise", max: 1500 }], [["bütçem 1000 gömlek bakıyorum"], { cat: "Gömlek", max: 1000 }],
  [["en fazla 800 pantolon"], { cat: "Pantolon", max: 800 }],
  // kalıp
  [["bol paça pantolon"], { cat: "Pantolon", attrs: ["genis_paca"] }], [["açık renk bol paça pantolon"], { cat: "Pantolon", tone: "acik", attrs: ["genis_paca"] }],
  [["pantolonlara bakalım açık renk bol paça bakıyorum"], { cat: "Pantolon", tone: "acik", attrs: ["genis_paca"] }],
  [["geniş paça pantolon"], { cat: "Pantolon", attrs: ["genis_paca"] }], [["palazzo pantolon"], { cat: "Pantolon", attrs: ["genis_paca"] }],
  [["kalem pantolon"], { cat: "Pantolon", attrs: ["dar_kesim"] }], [["astarlı trençkot"], { cat: "Trençkot", attrs: ["astarli"] }],
  [["kemerli pardesü"], { cat: "Trençkot", attrs: ["kemerli"] }], [["pardesü bakıyorum", "kemerli olabilir"], { cat: "Trençkot", attrs: ["kemerli"] }],
  [["trençkot kemerli olmasın"], { cat: "Trençkot", notAttrs: ["kemerli"] }], [["kapüşonlu trençkot"], { cat: "Trençkot", attrs: ["kapusonlu"] }],
  [["vücudu belli etmeyen elbise"], { cat: "Elbise", attrs: ["salas"] }], [["salaş bir takım"], { cat: "Takım", attrs: ["salas"] }],
  // konu değişimi: yeni tür eski kısıtları sıfırlar
  [["elbise siyah olmasın", "pantolonlara bakalım"], { cat: "Pantolon" }],
  [["trençkot koyu renk", "şimdi de elbise bakalım açık renk"], { cat: "Elbise", tone: "acik" }],
  // konu hafızası: kategoriler arası geçiş, geri dönünce istekler geri gelir
  [["trençkot bakıyorum açık renk", "calistayı beğendim onunla gidecek bir pantolon var mı", "pantolonu bitirdik trençkota geç"], { cat: "Trençkot", tone: "acik" }],
  [["trençkot bakıyorum açık renk", "pantolonlara bakalım siyah olsun", "trençkota dönelim"], { cat: "Trençkot", tone: "acik" }],
  [["trençkot bakıyorum açık renk", "pantolonlara bakalım siyah olsun", "trençkota dönelim", "pantolona geri dön"], { cat: "Pantolon", colors: ["siyah"] }],
  [["koyu renk trençkot, pantolon da açık olsun"], { cat: "Pantolon", tone: "acik" }],
  [["pantolon açık olsun, trençkot da koyu olsun"], { cat: "Trençkot", tone: "koyu" }],
  [["elbise 1500 tl altı", "trençkota bakalım"], { cat: "Trençkot", max: 1500 }], // bütçe konuşma boyunca geçerli
  // birleşik
  [["2000 TL altı, siyah olmayan, bol kesim bir takım"], { cat: "Takım", exclude: ["siyah"], max: 2000, attrs: ["salas"] }],
];

const same = (a = [], b) => a.length === b.size && a.every((x) => b.has(x));
let ok = 0; const fails = [], empty = [];
for (const [msgs, e] of T) {
  const c = extract(msgs);
  const errs = [];
  if ((e.cat || null) !== (c.category ? c.category[0] : null)) errs.push(`tür ${c.category} ≠ ${e.cat}`);
  if ((e.tone || null) !== c.tone) errs.push(`ton ${c.tone} ≠ ${e.tone}`);
  if (!same(e.colors, c.colors)) errs.push(`renk [${[...c.colors]}] ≠ [${e.colors || []}]`);
  if (!same(e.exclude, c.exclude)) errs.push(`hariç [${[...c.exclude]}] ≠ [${e.exclude || []}]`);
  if ((e.max || null) !== c.maxPrice) errs.push(`bütçe ${c.maxPrice} ≠ ${e.max}`);
  if (!same(e.attrs, c.attrs)) errs.push(`özellik [${[...c.attrs]}] ≠ [${e.attrs || []}]`);
  if (!same(e.notAttrs, c.notAttrs)) errs.push(`istenmeyen [${[...c.notAttrs]}] ≠ [${e.notAttrs || []}]`);
  if (errs.length) fails.push(`❌ ${JSON.stringify(msgs)} → ${errs.join("; ")}`); else ok++;
  // katalog kapsaması: bu kısıtlarla gösterilecek ürün kalıyor mu?
  const n = P.filter((p) => p.sizes.some((s) => s.in_stock) && !violations(p, c).length).length;
  if (!errs.length && n === 0) empty.push(`⚠️  ${JSON.stringify(msgs)} → 0 ürün (${describe(c)})`);
}
console.log(`Tetikleyici: ${ok}/${T.length} doğru`);
fails.forEach((f) => console.log(f));
empty.forEach((f) => console.log(f));

// müşteri profili (boy/kilo/beden)
const { profile } = require("./constraints");
const PT = [
  [["1.65 boyum 62 kiloyum"], { boy: 165, kilo: 62 }], [["boyum 158"], { boy: 158 }], [["160 cm boyum, 55 kg"], { boy: 160, kilo: 55 }],
  [["M beden giyiyorum"], { beden: "M" }], [["bedenim 38"], { beden: "38" }], [["1,70 boy 70 kilo", "trençkot bakıyorum"], { boy: 170, kilo: 70 }],
];
let pok = 0;
for (const [m, e] of PT) { const p = profile(m); const bad = Object.entries(e).filter(([k, v]) => p[k] !== v); if (bad.length) console.log(`❌ profil ${JSON.stringify(m)} → ${JSON.stringify(p)}`); else pok++; }
console.log(`Profil: ${pok}/${PT.length} doğru`);

// ton sınıflandırması özeti
const tones = {}; for (const p of P) { const t = require("./constraints").toneOf(p); (tones[t] ||= new Set()).add(p.color); }
console.log("\nTon sınıfları:"); for (const [t, s] of Object.entries(tones)) console.log(`  ${t}: ${[...s].join(", ")}`);
