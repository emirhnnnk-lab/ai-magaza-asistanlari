// Sözleşme testi — SÖZLEŞME.md içindeki S1…S43 (+S37b) kurallarını kontrol eder.
// Ücretsiz: hiçbir API çağrısı yapmaz (fetch kapatılır).  Çalıştır:  node demo/contract-test.js
globalThis.fetch = () => { throw new Error("S43: sözleşme testi ağ çağrısı yapamaz"); };

const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");
const S = require("./server");
const K = require("./constraints");
const { bySlug, products, search, complete, runTool, prepareTurn, unshownNames, cleanReply, lengthTable, SYSTEM, TOOLS } = S;

const ROOT = path.join(__dirname, "..");
const P = products;
const inStock = (p) => p.sizes.some((s) => s.in_stock);
const results = [];
function rule(id, desc, fn) {
  try {
    const r = fn();
    const errs = r === true || r == null ? [] : [].concat(r).filter(Boolean);
    results.push({ id, desc, ok: !errs.length, errs });
  } catch (e) { results.push({ id, desc, ok: false, errs: ["istisna: " + e.message] }); }
}
const first = (arr, n = 5) => (arr.length > n ? arr.slice(0, n).concat(`… (+${arr.length - n})`) : arr);
const actionsFor = (userMsgs, extra = {}) => Object.assign([], { constraints: K.extract(userMsgs), kombin: K.lastIntentKombin(userMsgs), explicit: new Set(), ...extra });
const slugOf = (prefix) => P.find((p) => p.slug.startsWith(prefix))?.slug;
const TRENCH = "ekose-astarli-desenli-kemerli-trenckot-lacivert";

// ---------------- A. Veri ----------------
rule("S1", "354 ürün, zorunlu alanlar, benzersiz slug", () => {
  const e = [];
  if (P.length !== 354) e.push(`ürün sayısı ${P.length}`);
  if (new Set(P.map((p) => p.slug)).size !== P.length) e.push("tekrarlı slug");
  for (const p of P) if (!p.id || !p.slug || !p.name || !(p.price > 0) || !p.category_path?.length || !p.sizes?.length || !p.images?.length) e.push(p.slug);
  return first(e);
});
rule("S2", "her görsel diskte ve boş değil", () => {
  const e = [];
  for (const p of P) for (const im of p.images) { const f = path.join(ROOT, "data", im.file); if (!fs.existsSync(f) || fs.statSync(f).size < 1000) e.push(im.file); }
  const total = P.reduce((a, p) => a + p.images.length, 0);
  if (total !== 2421) e.push(`görsel sayısı ${total}`);
  return first(e);
});
rule("S3", "renk varyantları kendini içerir, slug'lar katalogda", () => {
  const e = [];
  for (const p of P) {
    if (p.color_variants.length && !p.color_variants.some((v) => v.slug === p.slug)) e.push(`${p.slug} kendini içermiyor`);
    for (const v of p.color_variants) if (!bySlug[v.slug]) e.push(`${p.slug} → ${v.slug} yok`);
  }
  return first(e);
});
rule("S4", "tags.json tam, desen izinli, Kiril yok", () => {
  const tags = JSON.parse(fs.readFileSync(path.join(ROOT, "data/products/tags.json"), "utf8"));
  const PAT = new Set(["düz", "ekose", "çizgili", "çiçekli", "desenli", "puantiyeli", "denim", "dokulu"]);
  const e = [];
  for (const p of P) {
    const t = tags[p.slug];
    if (!t) { e.push(`${p.slug} etiketsiz`); continue; }
    for (const k of ["color_family", "undertone", "pattern", "style", "selling_line"]) if (!t[k] || (Array.isArray(t[k]) && !t[k].length)) e.push(`${p.slug}.${k} boş`);
    if (!PAT.has(t.pattern)) e.push(`${p.slug} desen "${t.pattern}"`);
  }
  if (/[Ѐ-ӿ]/.test(JSON.stringify(tags))) e.push("Kiril harf var");
  return first(e);
});
rule("S5", "kategori–rol tutarlı", () => {
  const exp = { Elbise: ["tek_parca"], Takım: ["takim"], Trençkot: ["dis_katman"], Kaban: ["dis_katman"], Kimono: ["dis_katman"], Ceket: ["dis_katman"], Pantolon: ["alt"], Jean: ["alt"], Etek: ["alt"], Gömlek: ["ust", "dis_katman", "tek_parca"] };
  return first(P.filter((p) => exp[p.cat] && !exp[p.cat].includes(p.role)).map((p) => `${p.name}: ${p.cat}→${p.role}`));
});

// ---------------- B. Arama ----------------
rule("S6", "eş anlamlılar doğru türe gider", () => {
  const cases = [["pardesü", "Trençkot"], ["ferace", "Trençkot"], ["manto", "Trençkot"], ["bluz", "Gömlek"], ["tunik", "Gömlek"], ["mont", "Kaban"], ["palto", "Kaban"], ["abiye", "Elbise"], ["mayo", "Haşema"]];
  const e = [];
  for (const [w, cat] of cases) {
    for (const r of [search({ category: w }), search({ query: w + " bakıyorum" })]) {
      if (!r.length) e.push(`${w}: sonuç yok`);
      const bad = r.filter((p) => p.cat !== cat); if (bad.length) e.push(`${w}: ${bad.map((p) => p.cat)}`);
    }
  }
  return e;
});
rule("S7", "arama stoksuz ürün döndürmez", () => {
  const e = [];
  for (const q of ["elbise", "trençkot", "takım", "gömlek", "pantolon", "siyah", ""]) for (const p of search({ query: q, limit: 50 })) if (!inStock(p)) e.push(p.slug);
  return first(e);
});
rule("S8", "aynı modelden tek renk", () => {
  const e = [];
  for (const q of ["elbise", "trençkot", "takım", "gömlek"]) { const r = search({ query: q, limit: 30 }); const m = r.map((p) => p.model); if (new Set(m).size !== m.length) e.push(q); }
  return e;
});
rule("S9", "renk istendiyse o renk", () => {
  const e = [];
  for (const [cat, col] of [["Elbise", "siyah"], ["Trençkot", "bej"], ["Takım", "lacivert"]]) {
    const r = search({ category: cat, colors: [col] });
    if (!r.length) e.push(`${cat}/${col} boş`);
    const bad = r.filter((p) => !(p.tags.color_family || []).concat(p.color.toLocaleLowerCase("tr")).some((f) => K.norm(f).includes(K.norm(col))));
    if (bad.length) e.push(`${cat}/${col}: ${bad.map((p) => p.color)}`);
  }
  return e;
});
rule("S10", "olmayan tür → boş + not", () => {
  const r = search({ category: "ayakkabı" });
  return r.length || !/katalogda yok/.test(r.note) ? `sonuç ${r.length}, not "${r.note}"` : true;
});

// ---------------- C. Kombin ----------------
const OUTFIT = { dis_katman: ["tek_parca", "takim", "ust", "alt"], ust: ["alt", "dis_katman"], alt: ["ust", "dis_katman"], tek_parca: ["dis_katman", "ic_katman"], takim: ["dis_katman", "ic_katman"], ic_katman: ["tek_parca", "takim", "dis_katman"], plaj: [] };
rule("S11", "her ürün için kombin katman kuralına uyar", () => {
  const e = [];
  for (const p of P) for (const c of complete(p.slug)) {
    const x = bySlug[c.slug];
    if (!OUTFIT[p.role].includes(x.role)) e.push(`${p.name} (${p.role}) → ${x.name} (${x.role})`);
    if (x.model === p.model) e.push(`${p.name} kendi modelini önerdi`);
    if (!inStock(x)) e.push(`${x.name} stokta yok`);
  }
  return first(e);
});
rule("S12", "desen üstüne desen yok (düz alternatif varken)", () => {
  const e = [];
  for (const p of P) {
    if ((p.tags.pattern || "düz") === "düz") continue;
    for (const c of complete(p.slug)) {
      const x = bySlug[c.slug];
      if ((x.tags.pattern || "düz") === "düz") continue;
      const plainAlt = P.some((y) => y.role === x.role && y.model !== p.model && inStock(y) && (y.tags.pattern || "düz") === "düz");
      if (plainAlt) e.push(`${p.name} (${p.tags.pattern}) → ${x.name} (${x.tags.pattern})`);
    }
  }
  return first(e);
});
rule("S13", "kombin hedefi sadece o tür", () => {
  const e = [];
  for (const s of [TRENCH, slugOf("modal-tek-dugmeli-ceket"), slugOf("calista")].filter(Boolean)) {
    const r = complete(s, 3, [], null, ["Pantolon"]);
    if (!r.length) e.push(`${s}: pantolon yok`);
    if (r.some((c) => bySlug[c.slug].cat !== "Pantolon")) e.push(`${s}: pantolon dışı`);
  }
  return e;
});
rule("S14", "kombinde istenmeyen renk gelmez", () => {
  const e = [];
  for (const p of P.slice(0, 120)) for (const c of complete(p.slug, 4, ["siyah"])) if (/siyah/i.test(bySlug[c.slug].color)) e.push(`${p.name} → ${c.name}`);
  return first(e);
});

// ---------------- D. Kısıt katmanı ----------------
let trig = "";
try { trig = execFileSync(process.execPath, [path.join(__dirname, "trigger-test.js")], { encoding: "utf8" }); } catch (e) { trig = e.stdout || e.message; }
rule("S15", "tetikleyici tablosu %100", () => { const m = trig.match(/Tetikleyici: (\d+)\/(\d+)/); return m && m[1] === m[2] ? true : `tetikleyici: ${m ? m[0] : "çalışmadı"}\n${trig.split("\n").filter((l) => l.startsWith("❌")).join("\n")}`; });
rule("S16", "profil çıkarımı %100", () => { const m = trig.match(/Profil: (\d+)\/(\d+)/); return m && m[1] === m[2] ? true : `profil: ${m ? m[0] : "çalışmadı"}`; });
rule("S17", "her ürünün tonu belli; siyah/lacivert koyu, bej/ekru açık", () => {
  const e = [];
  for (const p of P) { const t = K.toneOf(p); if (!["acik", "orta", "koyu"].includes(t)) e.push(p.slug); }
  for (const p of P) {
    if (["Siyah", "Lacivert", "Bordo"].includes(p.color) && K.toneOf(p) !== "koyu") e.push(`${p.name} koyu sayılmadı`);
    if (["Bej", "Ekru", "Krem"].includes(p.color) && K.toneOf(p) !== "acik") e.push(`${p.name} açık sayılmadı`);
  }
  // uçtan uca: "koyu renk" isteyene siyah gelebilmeli, "açık renk" isteyene bej gelebilmeli
  const koyu = K.extract(["koyu renk elbise"]), acik = K.extract(["açık renk trençkot"]);
  if (!P.some((p) => p.color === "Siyah" && p.cat === "Elbise" && !K.violations(p, koyu).length)) e.push("koyu renk elbise isteğinde siyah elbise elendi");
  if (!P.some((p) => p.color === "Bej" && p.cat === "Trençkot" && !K.violations(p, acik).length)) e.push("açık renk trençkot isteğinde bej trençkot elendi");
  return first(e);
});
const SCEN = [
  ["pantolonlara bakalım açık renk bol paça bakıyorum"], ["elbise bakıyorum siyah olmasın"], ["koyu renk bir takım 2000 TL'yi geçmesin"],
  ["trençkot bakıyorum ama kemerli olmasın"], ["takım bakıyorum", "siyah ve lacivert olmasın"], ["elbise", "açık renk olsun", "yok vazgeçtim koyu renk olsun"],
  ["bol paça pantolon ama siyah olsun"], ["astarlı bej trençkot"], ["trençkot bakıyorum açık renk", "pantolonlara bakalım siyah olsun", "trençkota dönelim"],
];
rule("S18", "kısıt varken arama asla ihlal döndürmez", () => {
  const e = [];
  for (const msgs of SCEN) {
    const act = actionsFor(msgs);
    const out = runTool("search_products", { query: msgs[msgs.length - 1], limit: 20 }, act);
    for (const r of out.results) { const v = K.violations(bySlug[r.slug], act.constraints); if (v.length) e.push(`${msgs.at(-1)} → ${r.name}: ${v}`); }
    // model yanlış tür/renk parametresi verse bile
    const out2 = runTool("search_products", { category: "Elbise", colors: ["siyah"], limit: 20 }, act);
    for (const r of out2.results) { const v = K.violations(bySlug[r.slug], act.constraints); if (v.length) e.push(`(yanıltıcı parametre) ${r.name}: ${v}`); }
  }
  return first(e);
});
rule("S19", "show_products ihlali ekrana çıkarmaz", () => {
  const e = [];
  const act = actionsFor(["pantolonlara bakalım açık renk bol paça"]);
  const dark = P.filter((p) => p.cat === "Pantolon" && K.toneOf(p) === "koyu").map((p) => p.slug);
  const ok = P.filter((p) => !K.violations(p, act.constraints).length && inStock(p)).map((p) => p.slug);
  const r = runTool("show_products", { slugs: [...dark.slice(0, 2), ...ok.slice(0, 1)], mode: "oneri" }, act);
  const shown = act.filter((a) => a.type === "show").flatMap((a) => a.items.map((i) => i.slug));
  if (shown.some((s) => dark.includes(s))) e.push("koyu pantolon ekrana çıktı");
  if (ok.length && !shown.includes(ok[0])) e.push("uygun ürün düşürüldü");
  if (!r.gosterilmedi?.length) e.push("modele düşürülenler bildirilmedi");
  const act2 = actionsFor(["pantolonlara bakalım açık renk bol paça"]);
  const r2 = runTool("show_products", { slugs: dark.slice(0, 2), mode: "oneri" }, act2);
  if (!r2.error || act2.some((a) => a.type === "show")) e.push("hepsi ihlalken hata dönmedi");
  return e;
});
rule("S20", "adıyla istenen ürün kısıta takılmaz", () => {
  const cal = slugOf("calista");
  const act = actionsFor(["pantolonlara bakalım siyah olsun"], { explicit: new Set([cal]) });
  runTool("show_products", { slugs: [cal], mode: "oneri" }, act);
  return act.some((a) => a.type === "show" && a.items.some((i) => i.slug === cal)) ? true : "Calista gösterilmedi";
});
rule("S21", "kombinde tür/kalıp serbest, ton/renk/bütçe geçerli", () => {
  const e = [];
  const act = actionsFor(["trençkot bakıyorum", "bununla ne giyebilirim? siyah olmasın"]);
  const r = runTool("complete_the_look", { slug: TRENCH }, act);
  const list = Array.isArray(r) ? r : r.results;
  if (!list.length) e.push("kombin boş");
  if (list.some((x) => /siyah/i.test(bySlug[x.slug].color))) e.push("kombinde siyah");
  if (list.every((x) => bySlug[x.slug].cat === "Trençkot")) e.push("tür kısıtı kombine uygulandı");
  act.lastTool = "complete_the_look";
  runTool("show_products", { slugs: list.map((x) => x.slug), mode: "yan_yana" }, act);
  if (!act.some((a) => a.type === "show" && a.items.length === list.length)) e.push("kombin parçaları ekranda düşürüldü");
  return e;
});

// ---------------- E. Hafıza ve tur hazırlığı ----------------
const turn = (userMsgs, context = {}) => prepareTurn({ history: userMsgs.flatMap((m, i) => (i < userMsgs.length - 1 ? [{ role: "user", content: m }, { role: "assistant", content: "Tamam." }] : [{ role: "user", content: m }])), context });
rule("S22", "kategori geçişi", () => {
  const t = turn(["trençkot bakıyorum açık renk", "calistayı beğendim onunla gidecek bir pantolon var mı", "pantolonu bitirdik trençkota geç"]);
  return t.actions.constraints.category?.[0] === "Trençkot" && /tür: Trençkot/.test(t.instructions) ? true : `tür: ${t.actions.constraints.category}`;
});
rule("S23", "konu hafızası: geri dönünce istekler geri gelir", () => {
  const t = turn(["trençkot bakıyorum açık renk", "pantolonlara bakalım siyah olsun", "trençkota dönelim"]);
  const e = [];
  if (t.actions.constraints.tone !== "acik") e.push(`ton ${t.actions.constraints.tone}`);
  if (t.actions.constraints.colors.size) e.push("pantolonun siyahı trençkota taştı");
  if (!/Konuşulan konular/.test(t.instructions)) e.push("konu özeti yok");
  return e;
});
rule("S24", "adıyla çağırma tanınır, aktif istekler gitmez, göster işaretlenir", () => {
  const cal = slugOf("calista"), lyon = slugOf("lyon");
  const e = [];
  const t = turn(["trençkot bakıyorum açık renk", "pantolonlara bakalım siyah olsun", "Calista'yı tekrar gösterir misin"], { seen: [cal, lyon] });
  if (!t.actions.explicit.has(cal)) e.push("Calista tanınmadı");
  if (/MÜŞTERİNİN AKTİF İSTEKLERİ/.test(t.instructions)) e.push("aktif istekler modele gitti");
  if (!t.wantsSee) e.push("göster isteği işaretlenmedi");
  // genel kelimeyle başlayan ama konuşmada tek olan ürün: "Ekose'yi"
  const ek = slugOf("ekose-astarli-desenli-kemerli-trenckot-bej");
  const t2 = turn(["trençkot bakıyorum", "Ekose'yi sepete ekler misin"], { seen: [ek, lyon] });
  if (!t2.actions.explicit.has(ek)) e.push("Ekose (görülen) tanınmadı");
  return e;
});
rule("S25", "kombin hedefi son mesajdan", () => {
  const t = turn(["Lyon ile gidecek bir pantolon var mı"]);
  return t.actions.kombin && t.actions.kombinTarget?.[0] === "Pantolon" ? true : `kombin ${t.actions.kombin}, hedef ${t.actions.kombinTarget}`;
});
rule("S26", "profil hafızaya girer", () => {
  const t = turn(["1.65 boyum 62 kiloyum", "elbiselere bakalım", "bu bana hangi beden olur"]);
  return /Müşteri profili: .*boy 165.*kilo 62/.test(t.instructions) ? true : "profil yok";
});
rule("S27", "modele en fazla 12 mesaj", () => {
  const msgs = Array.from({ length: 30 }, (_, i) => `mesaj ${i}`);
  const t = turn(msgs);
  return t.input.length <= 12 ? true : `giden mesaj ${t.input.length}`;
});
rule("S28", "İngilizce talimatı sadece İngilizce yazana", () => {
  const e = [];
  for (const m of ["hi, do you have black dresses?", "I need a black dress", "what is the price of this", "can you show me trench coats", "do you have size M"]) if (!/DİL: Müşteri İngilizce/.test(turn([m]).instructions)) e.push(`İngilizce algılanmadı: ${m}`);
  for (const m of ["siyah elbise var mı", "merhaba hediye alacağım", "size uygun beden hangisi", "size bir şey sorabilir miyim", "M beden var mı", "hi", "trençkot", "ok", "black olsun", "fiyatı ne kadar"]) if (/DİL: Müşteri İngilizce/.test(turn([m]).instructions)) e.push(`yanlış algı: ${m}`);
  return e;
});
rule("S29", "ürün sayfasında ölçü, manken, boy tablosu", () => {
  const t = turn(["boyum 158 uzun gelir mi"], { slug: TRENCH, page: "product" });
  const e = [];
  for (const k of ["Uzunluk: 120 cm", "Manken", "158 cm: bilek hizası", "measurements"]) if (!t.instructions.includes(k)) e.push(`${k} yok`);
  return e;
});
rule("S30", "yan yana sırası modele gider", () => {
  const t = turn(["soldan ikinciyi ekle"], { slug: TRENCH, shown: [`(baktığı ürün) X [${TRENCH}]`, "Y [y]"] });
  return /soldan ikinci/.test(t.instructions) && /1\. \(baktığı ürün\)/.test(t.instructions) ? true : "sıra yok";
});

// ---------------- F. Karakter ve dürüstlük ----------------
rule("S31", "sistem promptu kuralları", () => {
  const need = { "siz hitabı": /"siz"/, "kısa": /Kısa konuş/, "emoji/liste yok": /emoji/, "şal yok": /şal ürünü yok/, "yetişkin kadın": /yetişkin kadın/, "kargo 2500": /2500 TL/, "7 gün iade": /7 gün/,
    "robot sorusu": /insan olduğunu iddia etme/, "jargon": /tesettüre uygun/, "laubali yasak": /canım, abla/, "iç işleyiş yasak": /"Filtre"/, "rakam aynen": /rakamları.*aynen/, "uydurma yok": /uydurma/, "adıyla/ekrandakiler": /SADECE bu turda ekranda gösterdiğin/ };
  return Object.entries(need).filter(([, re]) => !re.test(SYSTEM)).map(([k]) => `eksik: ${k}`);
});
rule("S32", "araçlar tam 5", () => {
  const names = TOOLS.map((t) => t.function.name).sort().join(",");
  return names === "add_to_cart,complete_the_look,get_product,search_products,show_products" ? true : names;
});
rule("S33", "emoji temizlenir", () => { const r = cleanReply("Güle güle giyin 😊 ✨ !"); return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(r) ? r : true; });
rule("S34", "görülmemiş ürün adı yakalanır, görülmüş yakalanmaz", () => {
  const lyon = slugOf("lyon");
  const base = { cur: null, actions: Object.assign([], { explicit: new Set() }), context: {} };
  const e = [];
  if (!unshownNames("Lyon trençkot çok yakışır", { ...base, seen: [] }).includes("Lyon")) e.push("görülmemiş Lyon yakalanmadı");
  if (unshownNames("Lyon trençkot çok yakışır", { ...base, seen: [lyon] }).length) e.push("görülmüş Lyon yakalandı");
  if (unshownNames("Saten Çiçek Detaylı elbise", { ...base, seen: [] }).length) e.push("genel kelime ürün adı sanıldı");
  return e;
});
rule("S35", "stoksuz beden eklenmez, stoklu eklenir", () => {
  const e = [];
  const p = P.find((x) => x.sizes.some((s) => s.in_stock) && x.sizes.some((s) => !s.in_stock));
  const out = p.sizes.find((s) => !s.in_stock).size, ins = p.sizes.find((s) => s.in_stock).size;
  const a1 = actionsFor([]); const r1 = runTool("add_to_cart", { slug: p.slug, size: out }, a1);
  if (!r1.error || a1.some((a) => a.type === "cart")) e.push("stoksuz beden eklendi");
  const a2 = actionsFor([]); runTool("add_to_cart", { slug: p.slug, size: ins }, a2);
  if (!a2.some((a) => a.type === "cart")) e.push("stoklu beden eklenmedi");
  return e;
});
rule("S36", "boy tablosu tutarlı", () => {
  const e = [];
  const ORDER = ["yere değer", "bileği kapatır, yere yakın", "bilek hizası", "bileğin biraz üstü", "baldır ortası", "dizin hemen altı", "diz hizası", "diz üstü", "kalça/üst bacak hizası"];
  for (const p of P) {
    const t = lengthTable(p); if (!t) continue;
    const seq = [...t.matchAll(/(\d{3}) cm: ([^;.]+)/g)].map((m) => ORDER.indexOf(m[2].trim()));
    if (seq.some((x) => x < 0)) e.push(`${p.slug}: bilinmeyen ifade`);
    for (let i = 1; i < seq.length; i++) if (seq[i] < seq[i - 1]) { e.push(`${p.slug}: uzun boyda etek aşağı indi`); break; }
  }
  if (!/163 cm: bilek hizası/.test(lengthTable(bySlug[TRENCH]))) e.push("trençkot 163 cm bilek hizası değil");
  return first(e);
});

// ---------------- G/H. Dosya kontrolleri ----------------
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
rule("S38", "arayüz bileşenleri ve kaydırma düzeltmeleri", () => {
  const html = read("demo/public/index.html"), js = read("demo/public/app.js"), css = read("demo/public/style.css");
  const e = [];
  for (const id of ['id="picks"', 'class="chat"', 'id="lb"', 'class="drawer"', "Playfair+Display", "Outfit"]) if (!html.includes(id)) e.push(`html: ${id}`);
  for (const f of ["function showPicks", "function showBeside", "function remember", "function bindTilt", "function quickAdd", "seen: state.seen"]) if (!js.includes(f)) e.push(`js: ${f}`);
  for (const c of [".msgs > * { flex-shrink: 0; }", "overscroll-behavior: contain", ".picks {", "@media (max-width: 900px)", "body.chat-open { overflow: hidden; }", ".sticky-buy"]) if (!css.includes(c)) e.push(`css: ${c}`);
  return e;
});
rule("S39", "karşılama cümleleri", () => {
  const js = read("demo/public/app.js");
  const e = [];
  if (/[Nn]ereye giyeceğiniz/.test(js)) e.push("sorgulayıcı açılış var");
  if (/çok sevilen/.test(js)) e.push("doğrulanmamış iddia var");
  for (const s of ["Rahat rahat bakının", "Elbiselere", "için bedeninizi"]) if (!js.includes(s)) e.push(`eksik: ${s}`);
  return e;
});
rule("S40", "başlatma dosyası", () => {
  const f = path.join(ROOT, "DEMO BASLAT.bat");
  if (!fs.existsSync(f)) return "yok";
  const b = fs.readFileSync(f, "utf8"); const e = [];
  if (!b.includes("\r\n") || /[^\r]\n/.test(b)) e.push("CRLF değil");
  for (const k of ["node demo\\server.js", "start \"\" http://localhost:3000", "api/catalog", ".env"]) if (!b.includes(k)) e.push(`eksik: ${k}`);
  return e;
});
rule("S41", "kayıp ters eğik çizgi izi yok", () => {
  const e = [];
  const BAD = [/split\(\/s\+\//, /\[s\/\]/, /\(d\{\d/, /s\*:\?s\*/, /\/\[\(\[\^\]\]\+\)\]/, /\\\\s\+\/\)/];
  for (const f of ["demo/server.js", "demo/constraints.js", "demo/eval.js", "demo/trigger-test.js", "demo/public/app.js"]) {
    const src = read(f);
    BAD.forEach((re) => { if (re.test(src)) e.push(`${f}: ${re}`); });
  }
  return e;
});
rule("S42", "API anahtarı sadece .env'de", () => {
  const key = (read(".env").match(/OPENAI_API_KEY=(\S+)/) || [])[1];
  if (!key) return ".env'de anahtar yok";
  const e = [];
  const walk = (d) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); if (n.isDirectory()) { if (!["images", "node_modules", ".git", "_raw"].includes(n.name)) walk(p); } else if (/\.(js|json|md|html|css|bat|py|txt|csv)$/.test(n.name) && fs.statSync(p).size < 5e6 && fs.readFileSync(p, "utf8").includes(key.slice(0, 24))) e.push(path.relative(ROOT, p)); } };
  walk(ROOT);
  return e;
});

// ---------------- S37 (HTTP, yerel) + S43 ve rapor ----------------
function get(port, p) {
  return new Promise((res) => http.get({ host: "127.0.0.1", port, path: p }, (r) => { let b = ""; r.setEncoding("utf8"); r.on("data", (c) => (b += c)); r.on("end", () => res({ status: r.statusCode, body: b, type: r.headers["content-type"] })); }).on("error", (e) => res({ status: 0, body: e.message })));
}
(async () => {
  const srv = S.server.listen(0);
  await new Promise((r) => srv.once("listening", r));
  const port = srv.address().port;
  const e = [];
  const cat = await get(port, "/api/catalog");
  let cards = []; try { cards = JSON.parse(cat.body); } catch {}
  if (cards.length !== 354 || cards.some((c) => !c.img || !c.slug)) e.push(`katalog ${cards.length}`);
  const pr = JSON.parse((await get(port, "/api/product?slug=" + TRENCH)).body);
  if (!pr.variants?.length || !pr.complete?.length || !pr.similar?.length) e.push("ürün uç noktası eksik");
  if ((await get(port, cards[0]?.img || "/x")).status !== 200) e.push("görsel sunulmuyor");
  if ((await get(port, "/brand/banners/trenckot-tr-1.webp")).status !== 200) e.push("banner sunulmuyor");
  if ((await get(port, "/")).status !== 200) e.push("anasayfa yok");
  const envKey = (read(".env").match(/OPENAI_API_KEY=(\S+)/) || [])[1] || "@@@";
  // dizin dışına çıkma denemeleri: her ön ek × 1–5 seviye × 6 kodlama × 3 hedef
  const attacks = ["/.env", "/demo/server.js", "/data/../.env"];
  for (const pre of ["/", "/images/", "/brand/", "/images/x/", "/brand/banners/", "/api/"])
    for (let d = 1; d <= 5; d++)
      for (const sep of ["../", "..%2F", "..%5C", "%2e%2e%2f", "%2e%2e/", "..%252F"])
        for (const tgt of [".env", "demo/server.js", "demo/constraints.js"]) attacks.push(pre + sep.repeat(d) + tgt);
  let leaks = 0;
  for (const bad of attacks) {
    const r = await get(port, bad);
    if (r.body.includes(envKey.slice(0, 20)) || r.body.includes("OPENAI_API_KEY") || r.body.includes("require(\"http\")") || r.body.includes("module.exports")) { leaks++; if (leaks <= 5) e.push(`SIZINTI: ${bad}`); }
  }
  if (leaks > 5) e.push(`… toplam ${leaks} sızıntı`);
  e.push(...[]); // bilgi: denenen saldırı sayısı
  results.push({ id: "S37b", desc: `dizin dışına çıkma denemesi: ${attacks.length} yol denendi`, ok: leaks === 0, errs: leaks ? [`${leaks} sızıntı`] : [] });
  srv.close();
  results.push({ id: "S37", desc: "HTTP uç noktaları, .env ve kaynak kod sızmaz", ok: !e.length, errs: e });
  results.push({ id: "S43", desc: "test ağ çağrısı yapmadı", ok: true, errs: [] }); // fetch kapalı; çağrılsaydı ilgili kural istisna verirdi

  results.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
  const ok = results.filter((r) => r.ok).length;
  for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.id.padEnd(4)} ${r.desc}${r.ok ? "" : "\n     " + r.errs.join("\n     ")}`);
  console.log(`\nSözleşme: ${ok}/${results.length} kural geçti · API çağrısı: 0 · maliyet: 0`);
  process.exit(ok === results.length ? 0 : 1);
})();
