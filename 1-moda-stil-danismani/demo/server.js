// Örnek Moda demo sunucusu — bağımlılıksız Node.
// node demo/server.js  →  http://localhost:3000
const yedekFetch = require("../../llm-yedek");
const http = require("http");
const fs = require("fs");
const path = require("path");
const K = require("./constraints");

const ROOT = path.join(__dirname, "..");
const DATA = path.join(ROOT, "data");
const PUB = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;
const MODEL = "gpt-5.4-mini";

// .env
if (fs.existsSync(path.join(ROOT, ".env"))) for (const l of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m) process.env[m[1]] ??= m[2];
}

// ---- katalog ----
const products = JSON.parse(fs.readFileSync(path.join(DATA, "products/products.json"), "utf8"));
const tags = JSON.parse(fs.readFileSync(path.join(DATA, "products/tags.json"), "utf8"));
const bySlug = {};
for (const p of products) {
  p.tags = tags[p.slug] || {};
  p.model = p.name.replace(/\s+-\s+[^-]+$/, "");
  p.cat = p.category_path[p.category_path.length - 1];
  p.imgs = p.images.map((i) => "/" + i.file);
  bySlug[p.slug] = p;
}

const card = (p) => ({
  slug: p.slug, name: p.name, price: p.price, cat: p.cat, color: p.color,
  img: p.imgs[0], img2: p.imgs[1] || p.imgs[0],
  sizes: p.sizes, tone: p.tags.color_tone, role: p.role,
});

const norm = (s) => (s || "").toLocaleLowerCase("tr").normalize("NFKD").replace(/[̀-ͯ]/g, "");

// Müşterinin kullandığı kelime -> katalogdaki kategori(ler)
const CATS = [...new Set(products.map((p) => p.cat))];
const SYNONYMS = {
  pardesu: ["Trençkot"], ferace: ["Trençkot"], trenckot: ["Trençkot"], trenc: ["Trençkot"], manto: ["Trençkot"], yagmurluk: ["Trençkot"],
  kap: ["Kimono"], kimono: ["Kimono"], abaya: ["Kimono", "Elbise"],
  kaban: ["Kaban"], mont: ["Kaban"], palto: ["Kaban"], ceket: ["Ceket"],
  elbise: ["Elbise"], abiye: ["Elbise"], tunik: ["Gömlek"], bluz: ["Gömlek"], gomlek: ["Gömlek"], sweatshirt: ["Sweatshirt"], sweat: ["Sweatshirt"],
  takim: ["Takım"], pantolon: ["Pantolon"], jean: ["Jean"], kot: ["Jean"], etek: ["Etek"], esofman: ["Alt Eşofman"],
  iclik: ["İçlik"], badi: ["İçlik"], hasema: ["Haşema"], mayo: ["Haşema"], "dis giyim": ["Trençkot", "Kaban", "Kimono", "Ceket"],
};
function resolveCats(text) {
  const t = norm(text);
  if (!t) return null;
  const exact = CATS.filter((c) => norm(c) === t);
  if (exact.length) return exact;
  for (const [k, v] of Object.entries(SYNONYMS)) if (t === k || t.split(/\s+/).includes(k) || (k.includes(" ") && t.includes(k))) return v;
  return null;
}

function search({ query = "", category, colors = [], exclude_colors = [], undertone, style, max_price, exclude_slugs = [], limit = 6 }, hard = null) {
  // kategori: açıkça verilen ya da sorgudaki bir kelimeden çıkarılan; verildiyse katı filtre
  const cats = resolveCats(category) || resolveCats(query) || (category ? [] : null);
  const q = norm(query).split(/\s+/).filter((w) => w.length > 2 && !SYNONYMS[w]);
  const inc = colors.map(norm), exc = exclude_colors.map(norm);
  const colorOk = (p) => { const fam = (p.tags.color_family || []).map(norm).concat(norm(p.color)); return inc.some((c) => fam.some((f) => f.includes(c) || c.includes(f))); };
  const seenModel = new Set();
  const pool = products.filter((p) =>
    !exclude_slugs.includes(p.slug) && (!cats || cats.includes(p.cat)) && (!hard || hard(p)) && (!max_price || p.price <= max_price) &&
    p.sizes.some((s) => s.in_stock) &&
    !exc.some((c) => (p.tags.color_family || []).map(norm).concat(norm(p.color)).some((f) => f.includes(c))));
  // renk istendiyse ve o renkte ürün varsa sadece onları göster
  const colored = inc.length ? pool.filter(colorOk) : pool;
  const base = colored.length ? colored : pool;
  const res = base
    .map((p) => {
      const hay = norm([p.name, p.color, p.tags.color_tone, (p.tags.style || []).join(" "), (p.tags.occasions || []).join(" "), p.tags.silhouette, p.fabric, (p.features || []).join(" ")].join(" "));
      let s = q.reduce((a, w) => a + (hay.includes(w.slice(0, Math.max(4, w.length - 2))) ? 2 : 0), 0);
      if (undertone && p.tags.undertone === undertone) s += 2;
      if (style && (p.tags.style || []).map(norm).includes(norm(style))) s += 2;
      return { p, s };
    })
    .sort((a, b) => b.s - a.s)
    .filter(({ p }) => (seenModel.has(p.model) ? false : seenModel.add(p.model)))
    .slice(0, limit)
    .map(({ p }) => p);
  res.note = [
    cats && category && !resolveCats(category) ? `"${category}" katalogda yok.` : "",
    cats && cats.length ? `Aranan kategori: ${cats.join(", ")}.` : "",
    inc.length && !colored.length ? `İstenen renkte (${colors.join(", ")}) ürün yok; diğer renkler listelendi.` : "",
    !res.length ? `Bu kriterlere uyan ürün yok${hard?.desc ? ` (müşterinin kısıtları: ${hard.desc})` : ""}. Müşteriye dürüstçe söyle, uymayan ürün gösterme; hangi kısıttan vazgeçebileceğini sor.` : "",
  ].filter(Boolean).join(" ");
  return res;
}

// ---- kombin: katman (rol) kuralları ----
const ROLE_BY_CAT = { Trençkot: "dis_katman", Kaban: "dis_katman", Kimono: "dis_katman", Ceket: "dis_katman", Gömlek: "ust", Sweatshirt: "ust", Pantolon: "alt", Etek: "alt", Jean: "alt", Elbise: "tek_parca", Takım: "takim", İçlik: "ic_katman", Haşema: "plaj" };
const roleOf = (p) => p.tags.role || ROLE_BY_CAT[p.cat] || (/Eşofman/.test(p.cat) ? "alt" : "ust");
for (const p of products) p.role = roleOf(p);
// ana parçanın rolüne göre kombine girecek parçaların rolleri (sırayla birer tane)
const OUTFIT = {
  dis_katman: ["tek_parca", "takim", "ust", "alt"],
  ust: ["alt", "dis_katman", "alt"],
  alt: ["ust", "dis_katman", "ust"],
  tek_parca: ["dis_katman", "dis_katman", "ic_katman"],
  takim: ["dis_katman", "dis_katman", "ic_katman"],
  ic_katman: ["tek_parca", "takim", "dis_katman"],
  plaj: [],
};
const COMPATIBLE = Object.fromEntries(Object.entries(OUTFIT).map(([k, v]) => [k, new Set(v)]));
const famOf = (x) => (x.tags.color_family || []).map(norm).concat(norm(x.color));

function complete(slug, limit = 4, exclude_colors = [], hard = null, onlyCats = null) {
  const exc = exclude_colors.map(norm);
  const p = bySlug[slug];
  if (!p) return [];
  const pairColors = (p.tags.pairs_with_colors || []).map(norm).concat(["siyah", "ekru", "bej", "krem", "beyaz"].filter(() => (p.tags.pattern || "düz") !== "düz"));
  const pSeason = [].concat(p.tags.season || []);
  const scored = products
    .filter((x) => x.model !== p.model && x.sizes.some((s) => s.in_stock) && COMPATIBLE[p.role]?.has(x.role) && (!hard || hard(x)))
    .filter((x) => !exc.some((c) => famOf(x).concat(norm(x.tags.color_tone)).some((f) => f.includes(c))))
    .map((x) => {
      let s = famOf(x).some((f) => pairColors.some((c) => c.includes(f) || f.includes(c))) ? 4 : 0;
      if (x.tags.undertone === p.tags.undertone || x.tags.undertone === "nötr") s += 1;
      s += (x.tags.style || []).filter((t) => (p.tags.style || []).includes(t)).length;
      if ([].concat(x.tags.season || []).some((t) => pSeason.includes(t))) s += 1;
      if ((p.tags.pattern || "düz") !== "düz" && (x.tags.pattern || "düz") !== "düz") s -= 5; // desen üstüne desen yok
      if (famOf(x).some((f) => famOf(p).includes(f)) && (x.tags.pattern || "düz") === "düz") s += 0.5; // ton-sür-ton da olur
      return { x, s };
    })
    .sort((a, b) => b.s - a.s);
  const out = [], used = new Set();
  if (onlyCats) {
    for (const { x } of scored) if (onlyCats.includes(x.cat) && !used.has(x.model) && out.length < limit) { out.push(x); used.add(x.model); }
    return out.map((x) => ({ ...card(x), role: x.role }));
  }
  for (const role of OUTFIT[p.role] || []) {
    const hit = scored.find(({ x }) => x.role === role && !used.has(x.model) && !out.some((o) => famOf(o).join() === famOf(x).join() && o.role === x.role));
    if (hit) { out.push(hit.x); used.add(hit.x.model); }
    if (out.length >= limit) break;
  }
  return out.map((x) => ({ ...card(x), role: x.role }));
}

// Ürün modellerinin özel adları (Lyon, Noemi, Callen...) — cevapta geçerse ekranda olmalı
const GENERIC_FIRST = new Set("Uzun Kısa Ekose Çizgili Saten Modal Şifon Tencel Kolu Beli Pile Gold Önü Yandan Düğmeli Cep Kemerli Kadife Keten Triko Basic Oversize Kapüşonlu Puantiyeli Çiçekli Desenli Astarlı Fermuarlı Bağcıklı Yakalı Kruvaze Bol Tokalı Şallı Flar Fırfırlı Büzgülü Drapeli Volanlı Katlı Geniş Dar Yırtmaçlı Nakışlı Taşlı Dantelli Pileli Kloş Kolsuz Düz Mini Midi Maxi Dökümlü Kaşe Denim Müslin Penye Krep Scuba Luxe Üçlü İkili Çift Tek".split(" "));
const PROPER_NAMES = (() => {
  const m = {};
  for (const p of products) { const w = p.model.split(/\s+/)[0]; (m[w] ||= new Set()).add(p.model); }
  const inner = new Set(products.flatMap((p) => p.model.split(/\s+/).slice(1)));
  return new Set(Object.entries(m).filter(([w, s]) => s.size <= 2 && /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}$/.test(w) && !GENERIC_FIRST.has(w) && !inner.has(w)).map(([w]) => w));
})();

// Boy hesabı: ürün uzunluğu omuzdan ölçülür; omuz yüksekliği ≈ boy × 0.82.
// Etek ucunun yerden yüksekliğine göre nereye geldiğini sabit kurallarla söyler (model tahmin etmesin).
function lengthTable(p) {
  const m = (p.measurements || []).join(" ").match(/(?:Uzunluk|Boy)\s*:?\s*(\d{2,3})\s*cm/i);
  if (!m) return null;
  const L = +m[1];
  const where = (gap) => gap < 4 ? "yere değer" : gap < 10 ? "bileği kapatır, yere yakın" : gap < 16 ? "bilek hizası" : gap < 28 ? "bileğin biraz üstü" : gap < 40 ? "baldır ortası" : gap < 50 ? "dizin hemen altı" : gap < 60 ? "diz hizası" : gap < 75 ? "diz üstü" : "kalça/üst bacak hizası";
  const rows = [150, 155, 158, 160, 163, 165, 168, 170, 175, 180].map((h) => `${h} cm: ${where(Math.round(h * 0.82 - L))}`);
  return `Ürün uzunluğu ${L} cm. Boya göre etek ucu (bu tabloya BİREBİR uy, kendin hesaplama): ${rows.join("; ")}.`;
}

// ---- asistan ----
const SYSTEM = `Sen Örnek Moda'nın online mağaza danışmanısın. Adın Defne. Örnek Moda İstanbul'da bir kadın tesettür giyim markası.
Mağazadaki en iyi satış danışmanı gibi davran: sıcak, samimi, saygılı; "siz" diye hitap et. Kısa konuş (genelde 1-3 cümle), sohbet eder gibi yaz. Müşteri hangi dilde yazarsa o dilde cevap ver (İngilizce yazana İngilizce).
Asla madde işareti, liste, başlık, kalın yazı, emoji kullanma. "Size nasıl yardımcı olabilirim" gibi robot kalıpları kullanma. Yapay zeka olduğunu gereksiz yere vurgulama; ama müşteri robot/yapay zeka/gerçek kişi olup olmadığını sorarsa asla insan olduğunu iddia etme: sıcak bir dille Moda'nin dijital stil danışmanı olduğunu söyle ve gerekirse ekibe (WhatsApp) bağlayabileceğini ekle.

Dil ve jargon (tesettür müşterisinin kendi kelimeleri; dozunda, doğal kullan):
- Kapanış/güven kelimeleri: "tesettüre uygun", "vücut hatlarını belli etmez", "iç göstermez", "tok kumaş", "dökümlü", "salaş/bol kesim", "bilek boyu", "boyu uzun, yerlere kadar değil", "kol ağzı bilekte bitiyor", "içine içlik ile rahat giyilir", "üstüne şal/eşarp".
- Şal/başörtüsü uyumunu tarif et: "vizon ya da ekru bir şalla yüzünüz aydınlanır" gibi.
- Tesettür müşterisinin en çok yaşadığı hayal kırıklıkları: mankende uzun görünüp müşteride kısa kalması, kumaşın yapışması/statik, transparanlık, yıkamada çekme. Beden/boy sorulduğunda manken boyu ile müşterinin boyunu kıyaslayıp boyun nereye geleceğini söyle; veride olmayan konuda (çekme, statik) tahmin yürütme, WhatsApp ekibine sorabileceğini söyle.
- Satış anında (sepete eklenince) bir kez ve sadece bir kalıp: "Güle güle giyin" ya da "Hayırlı olsun". Her mesajda tekrarlama.
- Müşteri "inşallah, maşallah, Allah razı olsun" gibi ifadeler kullanırsa sıcak ve kısa karşılık ver ("Amin, güle güle giyin"); ama dini ifadeleri kendiliğinden başlatma.
- Asla "canım, abla, kuzum, tatlım, güzelim" deme; laubali olma. "Hanımefendi" en fazla bir kez.

Satış yaklaşımın:
- Müşteri bir ürün tipi söylediyse (pardesü, elbise, takım...) SADECE o tipte ürün göster; başka tip ürünü "benzer" diye asla gösterme. Arama sonucu boşsa ya da not "katalogda yok" diyorsa bunu dürüstçe söyle ve en yakın alternatifi sorarak öner. Pardesü/ferace sorulursa katalogda bunlar "trençkot" olarak geçer, bunu doğal şekilde söyle.
- Önce dinle, müşterinin istediğini ciddiye al. İstemediği şeyi (bir renk, bir kalıp) bir daha önerme.
- Ürün önerirken mutlaka show_products aracıyla göster; ürünleri yazıyla uzun uzun sayma, gösterdiğin ürünü bir cümleyle neden yakıştığını söyleyerek tanıt.
- Müşteri bir tercih söylediğinde (renk, ton, fiyat, kullanım yeri) izin isteme; hemen search_products ile ara ve show_products ile göster. "İsterseniz göstereyim" deme, göster.
- Müşteri o an bir ürün sayfasındayken başka bir üründen bahsederse onu mode="yan_yana" ile bakılan ürünün yanına koy.
- Kombin/"ne giyebilirim/yanına ne gider" sorularında MUTLAKA complete_the_look kullan ve SADECE onun döndürdüğü ürünleri göster; kendi aramanla kombin parçası seçme. Bu parçalar katman olarak (dış katman, üst, alt, elbise) doğru seçilmiştir; her birini rolüyle anlat (ör. "içine şu elbise", "altına şu pantolon").
- Cevabında SADECE bu turda ekranda gösterdiğin ürünlerin ya da müşterinin baktığı ürünün adını an. Göstermediğin bir ürünün adını asla söyleme.
- Kombin tamamlarken kibar ol, dayatma: "isterseniz yanına şunu da koyayım" tonu.
- Beden sorulursa boy/kilo iste; ürünün ölçüleri ve manken bilgisiyle (get_product) somut öneri ver. Manken 163 cm boyunda ise ona göre boy farkını söyle.
- Örnek Moda sadece yetişkin kadın giyimi satar. Çocuk, erkek, ayakkabı, çanta, aksesuar, şal sorulursa bunun olmadığını açıkça söyle ve ürün GÖSTERME; sonra kendisi için bir şey bakıyorsa yardımcı olabileceğini söyle.
- Veride yazanla kendi çıkarımını ayır: "ürün bilgisinde yazıyor" demeyi sadece veride gerçekten yazan şey için kullan. Çıkarımı çıkarım olarak söyle ("astarlı olduğu için iç göstermez").
- Tesettür hassasiyetlerini bil: astar, transparanlık, bol kalıp, boy, kol uzunluğu. Bilmediğin bir şeyi uydurma; "ürün bilgisinde yazmıyor, WhatsApp hattımızdan hemen teyit ettirebilirim" de.
- Stoğu biten bedeni önerme. Fiyatı TL olarak söyle (ör. 2.449 TL).
- Mağazada şu an şal ürünü yok; şal sorulursa bunu dürüstçe söyle ve ürünün yanına yakışacak şal rengini tarif et.
- Müşteri karar verince add_to_cart ile sepete ekle ve bir cümleyle onayla. Müşteri "bunu, ortadakini, sağdakini" derse ANLIK DURUM'daki ekrandaki ürün sırasına bak; emin değilsen hangisi olduğunu sor.
- İstenen beden stokta yoksa başka bedeni kendiliğinden ekleme; durumu söyle ve müşteriye sor. Üründe stokta tek beden kaldıysa bunu açıkça söyle ("bu modelde şu an sadece L-XL kaldı, size uygun mu?").
- Müşteri birden fazla ürünü birlikte eklemek isterse her biri için ayrı add_to_cart çağır; bedeni bilinmeyen için tek soruda bedeni sor.
- "Filtre", "sistem", "ekranda görünmüyor", "tablo", "veri" gibi iç işleyişe dair kelimeleri müşteriye asla söyleme. Müşteri konu değiştirmek isterse ("trençkota geç", "pantolonlara bakalım") hemen o konuya geç ve göster.
- 2500 TL üzeri kargo bedava, 7 gün ücretsiz iade var; yeri gelince doğal şekilde hatırlat. 2500 TL altı kargo ücretini bilmiyorsun: "sepette net görünür" de, rakam ya da kural uydurma.
- Sepete ekledikten sonra hangi ürünü hangi bedenle eklediğini tek cümlede söyle, ardından tek bir kapanış kalıbı kullan. Sadece "Hayırlı olsun" deyip bırakma.
- Boy: müşteri boyunu SÖYLEDİYSE boy tablosundaki karşılığını söyle ("1.58'de bilek hizasına gelir"). Boyunu söylemediyse "sizde şuraya gelir" deme; mankenin boyunu ve nereye geldiğini söyleyip boyunu sor. "Tablo", "hesap", "veri" gibi iç kelimeleri müşteriye asla söyleme.
- Müşterinin verdiği rakamları (boy, kilo, bütçe) aynen tekrar et, asla yuvarlama ya da değiştirme.`;

const TOOLS = [
  { type: "function", function: { name: "search_products", description: "Katalogda ürün ara. Renk, kategori, ton ve stil ile filtrele.", parameters: { type: "object", properties: {
    query: { type: "string", description: "serbest arama: ör. 'davet elbise', 'kemerli trençkot'" },
    category: { type: "string", description: "Ürün tipi. Müşterinin söylediği kelimeyi yaz (pardesü, ferace, bluz, abiye...) ya da katalog kategorisi: " + CATS.join(", ") + ". Ürün tipi belliyse MUTLAKA doldur." },
    colors: { type: "array", items: { type: "string" } },
    exclude_colors: { type: "array", items: { type: "string" }, description: "müşterinin istemediği renkler" },
    undertone: { type: "string", enum: ["sıcak", "soğuk", "nötr"] },
    style: { type: "string" }, max_price: { type: "number" },
    exclude_slugs: { type: "array", items: { type: "string" } } } } } },
  { type: "function", function: { name: "get_product", description: "Bir ürünün tüm detayları: ölçüler, kumaş, astar, manken, stoktaki bedenler, stil etiketleri, diğer renkleri.", parameters: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } } },
  { type: "function", function: { name: "complete_the_look", description: "Verilen ürünle kombinlenecek, farklı kategoriden renk uyumlu parçalar.", parameters: { type: "object", properties: { slug: { type: "string" }, exclude_colors: { type: "array", items: { type: "string" }, description: "müşterinin istemediği renkler" } }, required: ["slug"] } } },
  { type: "function", function: { name: "show_products", description: "Ürünleri müşterinin ekranında görsel olarak göster. yan_yana: bakılan ürünün yanına koyar; oneri: sohbet içinde kart olarak gösterir.", parameters: { type: "object", properties: {
    slugs: { type: "array", items: { type: "string" }, maxItems: 4 }, mode: { type: "string", enum: ["yan_yana", "oneri"] }, title: { type: "string", description: "kısa başlık, ör. 'Bu trençkotla çok güzel olur'" } }, required: ["slugs", "mode"] } } },
  { type: "function", function: { name: "add_to_cart", description: "Ürünü seçilen bedenle sepete ekle. Müşteri beden söylemediyse ve üründe birden fazla stoklu beden varsa önce bedeni sor.", parameters: { type: "object", properties: { slug: { type: "string" }, size: { type: "string" } }, required: ["slug", "size"] } } },
];

function slim(p) {
  return { slug: p.slug, name: p.name, price: p.price, role: p.role, category: p.category_path.join(" > "), color: p.color, tone: p.tags.color_tone, undertone: p.tags.undertone, style: p.tags.style, in_stock_sizes: p.sizes.filter((s) => s.in_stock).map((s) => s.size) };
}

function runTool(name, a, actions) {
  const C = actions.constraints, kombin = actions.kombin;
  // aramada: tüm kısıtlar (kombin isteğinde tür hariç); kombinde: ton/renk/bütçe (tür ve kalıp hariç)
  const hardSearch = C && Object.assign((p) => !K.violations(p, C, { skipCategory: kombin }).length, { desc: K.describe(C, { skipCategory: kombin }) });
  const kombinC = C && { ...C, category: null, attrs: new Set(), notAttrs: new Set() };
  const hardKombin = kombinC && Object.assign((p) => !K.violations(p, kombinC).length, { desc: K.describe(kombinC) });
  if (name === "search_products") { const r = search(a, hardSearch); return { results: r.map(slim), note: r.note || undefined }; }
  if (name === "get_product") {
    const p = bySlug[a.slug]; if (!p) return { error: "bulunamadı" };
    return { ...slim(p), description: p.description, fabric: p.fabric, fit: p.fit, measurements: p.measurements, lined: p.lined, model_info: p.model_info, features: p.features, sizes: p.sizes,
      other_colors: p.color_variants.filter((v) => v.slug !== p.slug).map((v) => ({ color: v.color, slug: v.slug })), stylist: p.tags };
  }
  if (name === "complete_the_look") {
    // "onunla gidecek bir pantolon": kombin hedefi belli bir türse sadece o türden getir
    const r = complete(a.slug, actions.kombinTarget ? 3 : 4, a.exclude_colors || [], hardKombin, actions.kombinTarget);
    return r.length ? r.map((c) => slim(bySlug[c.slug])) : { results: [], note: `Müşterinin kısıtlarına (${hardKombin?.desc}) uyan kombin parçası yok; dürüstçe söyle.` };
  }
  if (name === "show_products") {
    // son güvenlik: kısıtı ihlal eden ürün ekrana çıkamaz (kombinde tür/kalıp serbest)
    const dropped = [];
    const items = (a.slugs || []).filter((s) => bySlug[s]).filter((s) => {
      if (actions.explicit?.has(s)) return true; // müşteri adıyla istedi: filtre uygulanmaz
      const v = C ? K.violations(bySlug[s], actions.lastTool === "complete_the_look" ? kombinC : C, { skipCategory: kombin }) : [];
      if (v.length) dropped.push(`${bySlug[s].name} (${v.join(", ")})`);
      return !v.length;
    }).map((s) => card(bySlug[s]));
    if (!items.length) return { error: "Bu ürünlerin hiçbiri müşterinin kısıtlarına uymuyor, GÖSTERİLMEDİ: " + dropped.join("; ") + ". Uygun ürün ara ya da uygun ürün olmadığını dürüstçe söyle." };
    actions.push({ type: "show", mode: actions.onProduct ? "yan_yana" : a.mode, title: a.title, items });
    return { shown: items.map((i) => i.name), not: "Cevabında yalnızca bu ürünlerden bahset.", ...(dropped.length ? { gosterilmedi: dropped, uyari: "Bunlar kısıtlara uymadığı için ekrandan çıkarıldı; adlarını anma." } : {}) };
  }
  if (name === "add_to_cart") {
    const p = bySlug[a.slug]; if (!p) return { error: "bulunamadı" };
    const s = p.sizes.find((x) => norm(x.size) === norm(a.size));
    if (s && !s.in_stock) return { error: "bu beden stokta yok", in_stock: p.sizes.filter((x) => x.in_stock).map((x) => x.size) };
    actions.push({ type: "cart", item: { ...card(p), size: a.size } });
    return { ok: true };
  }
  return { error: "bilinmeyen araç" };
}

// Responses API: araç çağırma + düşük akıl yürütme birlikte çalışıyor
const RTOOLS = TOOLS.map((t) => ({ type: "function", ...t.function }));
async function openai(body, attempt = 0) {
  const r = await yedekFetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({ model: MODEL, tools: RTOOLS, reasoning: { effort: "low" }, ...body }),
  });
  const j = await r.json();
  // hız limiti / geçici hata: bekleyip tekrar dene
  if ((r.status === 429 || r.status >= 500) && attempt < 5) {
    const ms = +(j.error?.message?.match(/try again in ([\d.]+)ms/)?.[1] || 0) || +(j.error?.message?.match(/try again in ([\d.]+)s/)?.[1] || 0) * 1000 || 1000 * 2 ** attempt;
    await new Promise((res) => setTimeout(res, ms + 400));
    return openai(body, attempt + 1);
  }
  if (!r.ok) throw new Error(j.error?.message || r.status);
  usage.in += j.usage?.input_tokens || 0; usage.out += j.usage?.output_tokens || 0;
  return j;
}
const usage = { in: 0, out: 0 };

// Bir tur için modele gidecek her şeyi hazırlar (API çağırmaz → sözleşme testiyle bedava test edilir)
function prepareTurn({ history = [], context = {} }) {
  const cur = context.slug && bySlug[context.slug];
  const ctx = cur
    ? `Müşteri şu an bu ürünün sayfasında (tüm veri burada, get_product çağırmana gerek yok): ${lengthTable(cur) || ""} ${JSON.stringify({ ...slim(cur), fabric: cur.fabric, fit: cur.fit, lined: cur.lined, measurements: cur.measurements, model_info: cur.model_info, features: cur.features, sizes: cur.sizes, description: cur.description, other_colors: cur.color_variants.filter((v) => v.slug !== cur.slug).map((v) => v.color) })}.`
    : `Müşteri şu an ${context.page === "home" ? "anasayfada" : "sitede"} geziniyor.`;
  const shown = context.shown?.length ? `
EKRANDA YAN YANA DURANLAR (soldan sağa; "soldan ikinci" = 2 numara, "en sağdaki" = son numara):
${context.shown.map((x, i) => `${i + 1}. ${x}`).join("\n")}
Müşteri bu sıralamayla bir ürüne atıf yaparsa add_to_cart/get_product için o numaradaki slug'ı kullan, baktığı ürünü değil.` : "";
  context.shownSlugs = (context.shown || []).map((x) => (x.match(/\[([^\]]+)\]$/) || [])[1]).filter(Boolean);
  const cart = context.cart?.length ? ` Sepette: ${context.cart.map((c) => c.name + " (" + c.size + ")").join(", ")}.` : "";
  const actions = [];
  actions.onProduct = !!cur;
  const userMsgs = history.filter((m) => m.role === "user").map((m) => m.content);
  actions.constraints = K.extract(userMsgs);
  actions.kombin = K.lastIntentKombin(userMsgs);
  const cdesc = K.describe(actions.constraints, { skipCategory: actions.kombin });
  const lastUser = [...history].reverse().find((m) => m.role === "user")?.content || "";

  // ---- oturum hafızası (kodla tutulur, ek model çağrısı yok) ----
  const seen = (context.seen || []).filter((s) => bySlug[s]);
  // müşteri bir ürünü adıyla anıyor mu? (Calista, Gwen...) önce bu konuşmada görülenlerde ara, sonra katalogda
  const lu = K.norm(lastUser);
  const named = [...PROPER_NAMES].filter((w) => new RegExp(`(^|[^a-z])${K.norm(w)}`).test(lu));
  actions.explicit = new Set();
  for (const w of named) {
    const hit = seen.filter((s) => bySlug[s].model.startsWith(w + " "));
    (hit.length ? hit : products.filter((p) => p.model.startsWith(w + " ")).map((p) => p.slug).slice(0, 3)).forEach((s) => actions.explicit.add(s));
  }
  // konuşmada gösterilmiş ürünler: adının ilk iki ya da ilk kelimesi geçiyorsa ve tek bir modele işaret ediyorsa
  const seenModels = [...new Set(seen.map((s) => bySlug[s].model))];
  for (const model of seenModels) {
    const words = K.norm(model).split(/\s+/);
    for (const key of [words.slice(0, 2).join(" "), words[0]]) {
      if (key.length < 4 || !new RegExp(`(^|[^a-z])${key}`).test(lu)) continue;
      const same = seenModels.filter((m) => K.norm(m).startsWith(key));
      if (same.length === 1) { seen.filter((s) => bySlug[s].model === model).forEach((s) => actions.explicit.add(s)); break; }
    }
  }
  // kombin hedefi: "onunla gidecek bir pantolon" -> sadece pantolon
  const lastHits = K.categoryHits(lu);
  actions.kombinTarget = lastHits.length ? lastHits[lastHits.length - 1].cats : null; // kombin aracı çağrılırsa sadece bu tür
  const prof = K.profile(userMsgs);
  const memory = [
    actions.constraints.topics.length > 1 ? `Konuşulan konular: ${actions.constraints.topics.map((t) => t.desc || t.cats.join("/")).join(" | ")}. Müşteri bunlar arasında serbestçe geçebilir; geri dönülen konunun istekleri geçerlidir.` : "",
    seen.length ? `Bu konuşmada gösterilen ürünler (müşteri adıyla anarsa bunlardan biridir): ${seen.slice(-24).map((s) => `${bySlug[s].name} [${s}]`).join("; ")}.` : "",
    actions.explicit.size ? `Müşteri son mesajında adıyla şu ürün(ler)i kastediyor: ${[...actions.explicit].map((s) => `${bySlug[s].name} [${s}]`).join("; ")}. Bu ürün(ler) için filtre uygulanmaz; gösterebilir, sepete ekleyebilir, kombin kurabilirsin. "Ekranda görünmüyor" deme.` : "",
    actions.kombin && actions.kombinTarget ? `Kombin hedefi: müşteri yanına sadece ${actions.kombinTarget.join("/")} istiyor; complete_the_look kullan.` : "",
    Object.keys(prof).length ? `Müşteri profili: ${Object.entries(prof).map(([k, v]) => `${k} ${v}`).join(", ")} (tekrar sorma, bunu kullan).` : "",
  ].filter(Boolean).join("\n");
  // İngilizce: en az 2 İngilizce kelime, Türkçe harf/kelime yok ("size uygun beden" Türkçedir)
  const enHits = (lastUser.match(/\b(the|do|you|have|has|dress|dresses|looking|for|hi|hello|please|price|what|can|is|are|any|black|white|want|need|show|me|my|i'm|size)\b/gi) || []).length;
  const trWord = /\b(var|mı|mi|mu|bir|ve|için|icin|uygun|beden|hangisi|bakıyorum|bakiyorum|olsun|nasıl|nasil|merhaba|elbise|lütfen|lutfen|teşekkür|tesekkur|misin|musunuz|miyim|bana|bunu|şunu)\b/i.test(lastUser);
  const english = enHits >= 2 && !trWord && !/[çğıöşüÇĞİÖŞÜ]/.test(lastUser);
  // adıyla ürün istendi ve yeni tür yok: bu tur o ürünle ilgili, aktif istekler modeli yanıltmasın
  const namedOnly = actions.explicit.size > 0 && !lastHits.length;
  const wantsSee = namedOnly && /goster|gor(ebilir|eyim|mek)|ac(ar|abilir)|tekrar|bakayim|bakalim/.test(lu);
  if (process.env.DEFNE_DEBUG) console.log("[debug]", { lu, explicit: [...actions.explicit], namedOnly, wantsSee, cdesc, kombin: actions.kombin });
  const instructions = SYSTEM + "\n\nANLIK DURUM: " + ctx + shown + cart + (cdesc && !namedOnly ? `\nMÜŞTERİNİN AKTİF İSTEKLERİ (sistem her aramaya zorla uygular; cevabın da bunlarla tutarlı olsun): ${cdesc}` : "") + (english ? "\nDİL: Müşteri İngilizce yazdı. Cevabın TAMAMEN İngilizce olmalı." : "") + (memory ? "\n\nOTURUM HAFIZASI:\n" + memory : "");
  // son 12 mesaj + hafıza özeti: konuşma uzasa da maliyet sabit kalır
  return { instructions, input: history.slice(-12), actions, cur, seen, wantsSee, memory, cdesc, english, namedOnly };
}

// Cevapta geçen ama ekranda/hafızada olmayan ürün özel adları
function unshownNames(text, { cur, actions, seen, context }) {
  const onScreen = new Set([cur?.model, ...actions.filter((a) => a.type === "show").flatMap((a) => a.items.map((x) => bySlug[x.slug].model)), ...(context.shownSlugs || []).map((s) => bySlug[s]?.model), ...seen.map((s) => bySlug[s].model), ...[...actions.explicit].map((s) => bySlug[s].model)].filter(Boolean).map((m) => m.split(/\s+/)[0]));
  return [...PROPER_NAMES].filter((w) => !onScreen.has(w) && new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "u").test(text));
}
const cleanReply = (text) => text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/\s+([.,!?])/g, "$1").trim();

async function chat({ history = [], context = {} }) {
  const turn = prepareTurn({ history, context });
  const { instructions, actions, cur, seen, wantsSee } = turn;
  let resp = await openai({ instructions, input: turn.input });
  let repaired = false;
  for (let i = 0; i < 7; i++) {
    const calls = resp.output.filter((o) => o.type === "function_call");
    if (!calls.length) {
      const text = resp.output.filter((o) => o.type === "message").flatMap((o) => o.content).filter((c) => c.type === "output_text").map((c) => c.text).join("\n");
      // güvenlik ağı: ekranda olmayan bir ürünü adıyla andıysa bir kez düzelttir
      const unshown = unshownNames(text, { cur, actions, seen, context });
      // müşteri adıyla bir ürünü görmek istedi ama gösterilmedi: bir kez düzelttir
      if (wantsSee && !actions.some((x) => x.type === "show") && !repaired) {
        repaired = true;
        resp = await openai({ instructions, previous_response_id: resp.id, input: [{ role: "user", content: `[İÇ KONTROL – müşteri bu mesajı görmedi] Müşteri şu ürünü görmek istiyor: ${[...actions.explicit].map((x) => bySlug[x].name + " [" + x + "]").join("; ")}. Hiçbir kısıt bu ürün için geçerli değil. show_products ile göster ve cevabı müşteriye ilk kez yazıyormuş gibi yaz; özür dileme, "gösteremiyorum" deme.` }] });
        continue;
      }
      if (unshown.length && !repaired) {
        repaired = true;
        const hint = unshown.map((w) => products.filter((p) => p.model.startsWith(w + " ")).slice(0, 3).map((p) => p.slug).join(", ")).join(" | ");
        resp = await openai({ instructions, previous_response_id: resp.id, input: [{ role: "user", content: `[İÇ KONTROL – müşteri bu mesajı görmedi] Taslak cevabında ekranda olmayan ürün(ler) geçiyor: ${unshown.join(", ")} (slug: ${hint}). Ya show_products ile göster ya da cevabı bu ürünler olmadan yaz. Cevabı müşteriye İLK KEZ yazıyormuş gibi yaz: özür dileme, "haklısınız", "karıştırdım", "düzelttim" gibi hiçbir ifade kullanma.` }] });
        continue;
      }
      return { reply: cleanReply(text), actions };
    }
    const outs = calls.map((c) => {
      let args = {}; try { args = JSON.parse(c.arguments || "{}"); } catch {}
      const out = JSON.stringify(runTool(c.name, args, actions));
      actions.lastTool = c.name;
      return { type: "function_call_output", call_id: c.call_id, output: out };
    });
    resp = await openai({ instructions, previous_response_id: resp.id, input: outs });
  }
  return { reply: "Bir saniye, sizin için tekrar bakıyorum.", actions };
}

// ---- http ----
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const send = (res, code, body, type = "application/json; charset=utf-8") => { res.writeHead(code, { "Content-Type": type }); res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };

// base klasörünün dışına çıkan her yol reddedilir
function safeJoin(base, rel) {
  const full = path.resolve(base, "." + path.sep + rel.replace(/^[\\/]+/, ""));
  const r = path.relative(base, full);
  return r && !r.startsWith("..") && !path.isAbsolute(r) ? full : null;
}
function serveSafe(res, base, rel) {
  const f = safeJoin(base, rel);
  return f ? serveFile(res, f) : send(res, 404, "yok", "text/plain");
}

function serveFile(res, file) {
  fs.readFile(file, (e, b) => (e ? send(res, 404, "yok", "text/plain") : (res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": file.includes("images") ? "max-age=86400" : "no-cache" }), res.end(b))));
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const p = decodeURIComponent(u.pathname);
  try {
    if (p === "/api/catalog") return send(res, 200, products.map(card));
    if (p === "/api/product") {
      const x = bySlug[u.searchParams.get("slug")]; if (!x) return send(res, 404, {});
      return send(res, 200, { ...x, variants: x.color_variants.map((v) => ({ ...v, img: bySlug[v.slug]?.imgs[0] })), complete: complete(x.slug), similar: search({ category: x.cat, exclude_slugs: [x.slug], limit: 8 }).filter((s) => s.model !== x.model).map(card) });
    }
    if (p === "/api/chat" && req.method === "POST") {
      let b = ""; for await (const c of req) b += c;
      const out = await chat(JSON.parse(b));
      console.log(`tokens toplam in=${usage.in} out=${usage.out}`);
      return send(res, 200, out);
    }
    // statik dosyalar: yol ancak izin verilen klasörün İÇİNDEyse sunulur (.env / kaynak kod sızmaz)
    if (p.includes("..") || p.includes("\\") || p.includes("\0")) return send(res, 404, "yok", "text/plain");
    if (p.startsWith("/images/")) return serveSafe(res, path.join(DATA, "images"), p.slice(8));
    if (p.startsWith("/brand/")) return serveSafe(res, path.join(DATA, "design"), p.slice(7));
    const f = safeJoin(PUB, p === "/" ? "index.html" : p);
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) return serveFile(res, f);
    return serveFile(res, path.join(PUB, "index.html"));
  } catch (e) {
    console.error(e);
    send(res, 500, { reply: "Kusura bakmayın, bağlantıda küçük bir aksaklık oldu. Tekrar yazar mısınız?", actions: [] });
  }
});
if (require.main === module) server.listen(PORT, () => console.log("Moda demo → http://localhost:" + PORT));
module.exports = { chat, prepareTurn, runTool, unshownNames, cleanReply, bySlug, products, usage, complete, search, lengthTable, PROPER_NAMES, SYSTEM, TOOLS, server };
