// Sözleşme testi — API çağırmaz, ücretsiz.  node contract-test.js
// Her kural SÖZLEŞME.md'de numaralı. Kırmızı çıkan kural ya düzeltilir ya da belgede bilerek güncellenir.
global.fetch = () => { throw new Error("ağ çağrısı yasak"); };
delete process.env.OPENAI_API_KEY;
const fs = require("fs");
const path = require("path");
const http = require("http");
const S = require("./lib/shoe");
const K = require("./lib/catalog");
const R = require("./lib/router");
const srv = require("./server");

let pass = 0, fail = 0;
const ok = (id, cond, msg) => { if (cond) pass++; else { fail++; console.log(`✗ ${id} ${msg}`); } };
const route = R.create();
const say = (msgs, context = {}) => route({ history: msgs.map((c, i) => ({ role: i % 2 ? "assistant" : "user", content: c })), context, constraints: S.extract(msgs.filter((_, i) => i % 2 === 0)), cur: context.slug && K.bySlug[context.slug] });

(async () => {
  // A · veri
  ok("E1", K.products.length >= 100 && K.products.every((p) => p.slug && p.price > 0 && p.images.length && p.type && p.sizes.length), "katalog eksik alan");
  ok("E2", new Set(K.products.map((p) => p.slug)).size === K.products.length, "slug tekrarı");
  ok("E3", K.products.every((p) => p.siblings.every((s) => K.bySlug[s] && K.bySlug[s].model === p.model)), "aile bağlantısı bozuk");
  ok("E4", K.products.every((p) => !/[̇]/.test(p.color_label)), "renk adında bozuk Türkçe harf (İ)");
  ok("E5", K.products.filter((p) => p.heel_conflict).every((p) => K.heelTxt(p).includes("iki farklı")), "çelişkili topuk tek rakam gösteriliyor");

  // B · kısıt çıkarımı (tetikleyiciler)
  const T = [
    ["38 numara siyah bot", { type: "bot", colors: ["siyah"], size: 38 }],
    ["kahverengi çizme ama ince topuk olmasın", { type: "cizme", colors: ["kahve"], heelType: "kalin" }],
    ["düğün için topuklu, 5 cm altı", { type: "topuklu", maxHeel: 5 }],
    ["yüksek topuk stiletto 2.500 tl kadar", { type: "stiletto", minHeel: 7, maxPrice: 2500 }],
    ["siyah olmasın, açık renk sandalet", { type: "sandalet", notColors: ["siyah"], tone: "acik" }],
    ["loafer var mı", { type: "makosen" }], ["balerin arıyorum", { type: "babet" }], ["sneaker", { type: "spor" }],
    ["topuk olmasın", { maxHeel: 2 }], ["2 bin lira bütçem var spor ayakkabı", { type: "spor", maxPrice: 2000 }],
    ["numaram 37, kışlık bir şey", { size: 37, warm: true }], ["Kışlık çizme, baldırım biraz geniş 39 cm", { type: "cizme", calf: 39, warm: true }],
    ["bot değil çizme istiyorum", { type: "cizme", notTypes: ["bot"] }], ["topuklu sandalet", { type: "sandalet", minHeel: 3 }],
    ["süet olmasın", { notFinish: "süet" }], ["4,5 cm topuk", { minHeel: 3.5, maxHeel: 5.5 }],
  ];
  for (const [t, want] of T) { const got = S.extractOne(t); ok("K1", Object.entries(want).every(([k, v]) => JSON.stringify(got[k]) === JSON.stringify(v)), `"${t}" → ${JSON.stringify(got)}`); }
  ok("K2", S.extract(["siyah bot", "çizmeye bakalım", "kahve olsun"]).colors[0] === "kahve" && S.extract(["siyah bot", "çizmeye bakalım"]).type === "cizme", "fikir değiştirme");

  // C · arama hiçbir zaman kısıtı ihlal etmez
  const combos = [{ type: "bot", colors: ["siyah"] }, { type: "cizme", calf: 39 }, { type: "topuklu", maxHeel: 5, size: 38 }, { maxPrice: 2500 }, { type: "stiletto", heelType: "kalin" }, { warm: true, size: 37 }, { tone: "acik", type: "sandalet" }];
  for (const c of combos) { const r = K.search({ limit: 50 }, c); ok("A1", r.every((p) => !S.violations(p, c).length && p.in_stock), `arama ihlal: ${JSON.stringify(c)}`); }
  ok("A2", (() => { const r = K.search({ limit: 6 }, { type: "bot" }); const m = r.map((p) => p.model); return new Set(m).size === m.length || r.length > new Set(K.products.filter((p) => p.type === "bot").map((p) => p.model)).size; })(), "aynı modelin renkleri öne çıkıyor");
  ok("A3", K.products.filter((p) => p.type === "cizme" && p.calf_cm).every((p) => S.violations(p, { calf: S.calfFit(p) + 1 }).length) , "baldır kuralı");

  // D · numara kırılımı
  const big = K.products.find((p) => p.fit === "bir numara büyük" && S.stockSizes(p).length >= 2);
  if (big) { const n = S.stockSizes(big)[0] - 1; const r = R.addToCart(big, n, {}); ok("N1", r.actions[0]?.item?.size === n + 1, "kalıbı küçük modelde bir büyük eklenmeli"); }
  const p0 = K.products.find((p) => p.sizes.some((s) => s.stock <= 0) && K.family(p).some((q) => q !== p && q.in_stock));
  const out = p0.sizes.find((s) => s.stock <= 0).size;
  const r0 = R.addToCart(p0, +out, {});
  ok("N2", !r0.actions.some((a) => a.type === "cart") && /kalmamış/.test(r0.reply), "stokta olmayan numara sepete eklenmemeli");
  ok("N3", (r0.actions.find((a) => a.type === "show")?.items || []).every((i) => K.bySlug[i.slug].model === p0.model && S.hasSize(K.bySlug[i.slug], +out)), "alternatif renk o numarada stokta olmalı");
  const r1 = R.addToCart(p0, null, {});
  ok("N4", r1.actions[0]?.type === "choices" && r1.actions[0].choices.slice(0, -1).every((c) => S.stockSizes(p0).includes(+c)) && R.isSizeQ(r1.reply), "numara sorusu sadece stoktaki numaraları sunmalı");

  // E · ön sistem (kodla cevaplar)
  ok("R1", /DHL/.test(say(["iade nasıl oluyor"])?.reply || ""), "iade");
  ok("R2", /kapıda kart geçmiyor/.test(say(["kapıda ödeme var mı"])?.reply || ""), "kapıda ödeme");
  ok("R3", /Trabzon/.test(say(["mağazanız nerede"])?.reply || ""), "mağaza");
  ok("R4", /dijital stil danışmanı/.test(say(["robot musun"])?.reply || ""), "robot");
  ok("R5", say(["38 numara siyah bot"]) === null, "ürün araması modele gitmeli");
  ok("R6", say(["ikisinin farkı ne"]) === null, "karşılaştırma modele gitmeli");
  const st = K.products.find((p) => p.heel_cm && !p.heel_conflict);
  ok("R7", (say(["topuğu kaç cm?"], { slug: st.slug })?.reply || "").includes(K.n(st.heel_cm)), "ürün sayfasında topuk");
  const cf = K.products.find((p) => p.heel_conflict);
  ok("R8", /iki ayrı ölçü/.test(say(["topuğu kaç cm?"], { slug: cf.slug })?.reply || ""), "çelişkili topuk dürüst söylenmeli");
  const shown = K.search({ limit: 3 }, { type: "bot" }).map((p) => p.slug);
  const r2 = say(["siyah bot", "x", "ikincisini sepete ekle"], { seen: shown, lastShown: shown });
  ok("R9", r2?.actions?.[0]?.slug === shown[1] || r2?.actions?.[0]?.item?.slug === shown[1], "sıra ile seçme (ikincisini)");
  const r3 = say(["38"], { pending: p0.slug, pendingKind: "size" });
  ok("R10", !!r3, "bekleyen numara sorusuna cevap kodla");
  ok("R11", !say(["merhaba"])?.reply.match(/nereye giyeceksiniz|çok sevilen/), "sorgulayıcı/iddialı açılış yok");

  // V · ses: butik danışmanı gibi (etiket listesi, robot kalıbı yok; Türkçe ek doğru)
  ok("V1", ["Agent'in", "Pinya'nın", "Zerlin'in", "Aroya'nın", "Kerry'nin", "Stew'un", "Rivell'in"].join() === ["Agent", "Pinya", "Zerlin", "Aroya", "Kerry", "Stew", "Rivell"].map(R.gen).join(), "iyelik eki: " + ["Agent", "Pinya", "Zerlin", "Aroya", "Kerry", "Stew", "Rivell"].map(R.gen).join());
  const voice = [];
  for (const p of K.products.slice(0, 40)) for (const q of ["topuğu kaç cm?", "kalıbı dar mı?", "deri mi?", "kışın giyilir mi?", "başka rengi var mı?", "fiyatı ne kadar?", "baldır çapı kaç?"]) { const r = say([q], { slug: p.slug }); if (r) voice.push(r.reply); }
  for (const q of ["iade nasıl oluyor", "kapıda ödeme var mı", "kargo ücretli mi", "mağazanız nerede", "merhaba", "teşekkürler", "robot musun", "numara küçük geldi"]) voice.push(say([q])?.reply || "");
  voice.push(R.addToCart(p0, null, {}).reply, r0.reply, ...K.products.slice(0, 20).map((p) => R.addToCart(p, S.stockSizes(p)[0], {}).reply));
  ok("V2", voice.every((v) => !/^[^.]{3,60}: (topuk|dış|konç)/i.test(v)), "etiket gibi cevap: " + voice.find((v) => /^[^.]{3,60}: (topuk|dış|konç)/i.test(v)));
  ok("V3", voice.every((v) => !/(seçenek|mevcut|eşleşme|ilgili ürün|harika seçim|kesinlikle!|yardımcı olmaktan mutluluk)/i.test(v)), "robot kalıbı: " + voice.find((v) => /(seçenek|mevcut|eşleşme|ilgili ürün|harika seçim|kesinlikle!|yardımcı olmaktan)/i.test(v)));
  ok("V4", voice.filter((v) => /güle güle giyin/i.test(v)).every((v) => /çanta|giyin!$|güle güle giyin!/i.test(v)), "‘güle güle giyin’ yalnız satın alma/veda");
  ok("V5", srv.SYSTEM.includes("YANLIŞ") && srv.SYSTEM.includes("DOĞRU"), "promptta ses örnekleri");

  // F · model katmanı güvenlik ağları
  const turn = srv.prepareTurn({ history: [{ role: "user", content: "38 numara siyah bot" }], context: {} });
  const acts = turn.actions;
  const bad = K.products.find((p) => p.type === "bot" && p.color !== "siyah");
  const res = srv.runTool("show_products", { slugs: [bad.slug] }, acts);
  ok("G1", !!res.error && !acts.some((a) => a.type === "show"), "kısıtı ihlal eden ürün ekrana çıkmamalı");
  ok("G2", srv.cleanReply("Harika 😊 **seçim**") === "Harika seçim", "emoji/kalın temizliği");
  ok("G3", srv.cleanReply("Patsy bordo. İsterseniz başka renkleri de göstereyim.") === "Patsy bordo.", "'İsterseniz…' kuyruğu temizlenmeli");
  const a2 = []; a2.constraints = {}; srv.showMentioned("Zanka çizme çok şık.", a2, []);
  ok("G4", a2.some((a) => a.type === "show" && a.items.some((i) => i.model === "Zanka")), "adı geçen ama gösterilmeyen ürün gösterilmeli");
  ok("G5", srv.TOOLS.map((t) => t.name).join() === "search_products,get_product,show_products,ask_staff,add_to_cart", "araç listesi");

  // T · ekibe sor (Telegram) — sahte Telegram ile, ağ yok
  {
    const Staff = require("./lib/staff");
    const sent = [];
    const realFetch = global.fetch;
    let mid = 100;
    global.fetch = async (url, o) => { const method = String(url).split("/").pop(); const body = o?.body ? JSON.parse(o.body) : {}; sent.push({ method, body }); return { json: async () => ({ ok: true, result: { message_id: ++mid } }) }; };
    ok("T0", !Staff.enabled() && say(["toptan alım yapıyor musunuz"]) !== undefined, "anahtar yokken ekip kapalı");
    process.env.ELA_TG_TOKEN = "test"; process.env.ELA_TG_CHAT_ID = "777";
    const cf = K.products.find((p) => p.heel_conflict);
    const conv = "test-conv";
    const out = await srv.chat({ history: [{ role: "user", content: "topuğu kaç cm?" }], context: { conv, slug: cf.slug } });
    const note = sent.find((x) => x.method === "sendMessage" && /Ela bir soru soruyor/.test(x.body.text));
    ok("T1", out.actions.some((a) => a.type === "staff") && note && note.body.chat_id === "777" && note.body.text.includes(cf.model), "çelişkili bilgi ekibe sorulmalı");
    ok("T2", /soruyorum|soruyor/.test(out.reply) && /iki ayrı ölçü/.test(out.reply), "müşteriye 'soruyorum' denmeli, çelişki de söylenmeli");
    const tid = Staff._db.tickets.at(-1).id, nMsg = mid;
    await Staff.handleUpdate({ callback_query: { id: "q", data: "c:" + tid, message: { chat: { id: 777 }, message_id: nMsg } } });
    const ask = mid;
    await Staff.handleUpdate({ message: { chat: { id: 777 }, text: "Topuğu 7 cm, sayfayı düzelttik.", reply_to_message: { message_id: ask } } });
    ok("T3", Staff.poll(conv).msgs.some((m) => m.who === "staff" && /7 cm/.test(m.text)), "ekibin cevabı müşterinin ekranına gitmeli");
    await Staff.handleUpdate({ message: { chat: { id: 999 }, text: "yetkisiz", reply_to_message: { message_id: ask } } });
    ok("T4", !Staff.poll(conv).msgs.some((m) => m.text === "yetkisiz"), "listede olmayan kişi cevap yazamamalı");
    await Staff.handleUpdate({ callback_query: { id: "q2", data: "d:" + tid, message: { chat: { id: 777 }, message_id: nMsg } } });
    const h = await srv.chat({ history: [{ role: "user", content: "teşekkürler, kahverengisi de var mı" }], context: { conv } });
    ok("T5", h.reply === null && h.actions[0].type === "human" && sent.some((x) => /Müşteri:<\/b> teşekkürler/.test(x.body.text || "")), "devralınan konuşmada Ela susmalı, mesaj ekibe gitmeli");
    await Staff.handleUpdate({ message: { chat: { id: 777 }, text: "/bitir" } });
    ok("T6", Staff.poll(conv).mode === "bot", "/bitir ile Ela'ya dönmeli");
    ok("T7", say(["toptan alım yapıyor musunuz"]) === null, "ekip açıkken ticari soru modele (ask_staff) gitmeli");
    delete process.env.ELA_TG_TOKEN; delete process.env.ELA_TG_CHAT_ID;
    global.fetch = realFetch;
  }
  ok("G6", /uydurma|UYDURMA/.test(srv.SYSTEM) && /siz/.test(srv.SYSTEM) && /emoji/.test(srv.SYSTEM), "prompt kuralları");
  const t13 = srv.prepareTurn({ history: Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i })), context: {} });
  ok("G7", t13.input.length <= 12, "modele en fazla 12 mesaj");

  // H · içerik ve güvenlik
  const pub = fs.readdirSync(path.join(__dirname, "public")).filter((f) => f.endsWith(".html")).map((f) => fs.readFileSync(path.join(__dirname, "public", f), "utf8")).join("\n");
  ok("H1", !/Denizli/i.test(pub), "sayfalarda 'Denizli' geçmemeli (mağaza Trabzon'da)");
  const files = ["server.js", "lib/shoe.js", "lib/catalog.js", "lib/router.js", "public/assets/site.js", "public/assets/asistan.js", ...fs.readdirSync(path.join(__dirname, "public")).filter((f) => f.endsWith(".html")).map((f) => "public/" + f)];
  ok("H2", files.every((f) => !/sk-[A-Za-z0-9_-]{20,}/.test(fs.readFileSync(path.join(__dirname, f), "utf8"))), "API anahtarı kodda geçmemeli");
  ok("H3", files.every((f) => !/\/s\+\/|\[s\/\]|\(d\{|s\*:\?s\*/.test(fs.readFileSync(path.join(__dirname, f), "utf8"))), "kayıp ters eğik çizgi izi");
  await new Promise((done) => srv.server.listen(0, done));
  const port = srv.server.address().port;
  const get = (p) => new Promise((res) => http.get({ host: "127.0.0.1", port, path: p }, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => res({ code: r.statusCode, body: b })); }).on("error", () => res({ code: 0, body: "" })));
  const leaks = [];
  for (const pre of ["/", "/assets/", "/img/", "/models/"]) for (let n = 1; n <= 4; n++) for (const enc of ["../", "..%2F", "..%2f", "%2e%2e/", "..\\", "%2e%2e%5c"]) for (const tgt of [".env", "server.js", "data/products/raw.json"]) {
    const r = await get(pre + enc.repeat(n) + tgt); if (r.code === 200 && (/OPENAI|require\(|stock_code/.test(r.body))) leaks.push(pre + enc.repeat(n) + tgt);
  }
  ok("H4", !leaks.length, "dizin dışına çıkma: " + leaks.slice(0, 3).join(", "));
  ok("H5", (await get("/koleksiyon")).code === 200 && (await get("/urun")).code === 200 && (await get("/models/pointy_stiletto.glb")).code === 200, "sayfalar ve modeller sunuluyor");
  const cat = JSON.parse((await get("/api/catalog")).body);
  ok("H6", cat.length === K.products.filter((p) => p.in_stock).length && cat.every((c) => c.slug && c.img), "katalog uç noktası");
  srv.server.close();

  console.log(`\n${pass}/${pass + fail} kural yeşil · 0 API çağrısı`);
  process.exit(fail ? 1 : 0);
})();
