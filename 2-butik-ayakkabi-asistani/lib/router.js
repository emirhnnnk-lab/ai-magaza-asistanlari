// Ön sistem: mesajı önce KODLA cevaplamaya çalışır (0 TL). Emin değilse null döner → model.
// Mağaza bilgileri ornekbutik.com'un kendi sayfalarından (İletişim, İade ve Değişim, Ödeme ve Taksit, Mağazalarımız — 06.10.2026).
// "TEYİT" işaretli satırlar sitede çelişkili; Mağaza Sahibi'la netleşince sadece burası değişir (bkz. data/KIRILIM-RAPORU.md).
// Ses: butikteki satış danışmanı. Sıcak, kısa, "siz"; etiket listesi yok ("X: topuk 7 cm, …" gibi değil).
const S = require("./shoe");
const K = require("./catalog");
const Staff = require("./staff");

const FACTS = {
  whatsapp: "0500 000 00 00 (demo)",
  telefon: "0850 000 00 00 (demo)",
  saat: "hafta içi 10.00–18.00, Cumartesi 09.00–15.00 arası; Pazar kapalıyız", // TEYİT: Mağazalarımız sayfası "her gün 10–20" diyor
  magaza: "Trabzon'da, Meydan'dayız: Gazipaşa Mahallesi, Zeytinlik Caddesi No:5, Ortahisar. Her gün 08.30–21.00 arası açığız, telefonumuz 0 462 600 01 01",
  iade: "İçiniz rahat olsun, teslimden sonra 14 gün içinde iade edebilirsiniz. Ayakkabıyı evde deneyip giymeden, etiketi ve kutusuyla geri göndermeniz yeterli: Siparişlerim'den iade talebini açıp DHL'e 770 803 832 koduyla teslim ediyorsunuz. Kartla ödediyseniz 5–10, havaleyle ödediyseniz 1–3 iş gününde geri yatar.",
  iadeUcret: "Yalnız iade sayfamızda, bu kodla gönderilen iadelerde tutardan 70 TL kesildiği yazıyor.", // TEYİT: aynı sayfa "ücretsiz iade gönderimi" de diyor
  degisim: "Olur öyle, hiç dert etmeyin. En hızlısı iade talebini açıp doğru numarayı hemen yeniden sipariş etmek; böylece istediğiniz numara da elinizden kaçmaz. İsterseniz faturanın arkasına istediğiniz numarayı yazıp gönderin, paket bize ulaşınca biz sizi arayalım.",
  mağazaIade: "Trabzon'daki mağazamıza getirip de iade edebilirsiniz.",
  odeme: "Kartla, havaleyle ya da kapıda nakit ödeyebilirsiniz; kapıda kartla ödeme alamıyoruz. Taksit seçenekleri de ödeme adımında kartınıza göre çıkıyor.", // TEYİT: ödeme sayfası 9 taksit, ürün verisi 6 taksit
  kargo: "Kargo bizden, ücretsiz gönderiyoruz. Kargoya verildiği an takip bilgisi size gelir; teslim süresi biraz da şehrinize göre değişiyor.", // TEYİT: SSS "kargo ücreti ödeme adımında görünür" diyor
};
const NAME = "Ela";

const pick = (arr, seed) => arr[[...String(seed)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % arr.length];
const SIZE_Q = "kaç numara giyiyorsunuz?";
const isSizeQ = (t) => String(t || "").toLocaleLowerCase("tr").includes(SIZE_Q);

// Türkçe iyelik eki: "Agent" → "Agent'ın", "Pinya" → "Pinya'nın", "Zerlin" → "Zerlin'in"
function gen(w) {
  if (/y$/i.test(w)) return `${w}'nin`; // Kerry → Kerry'nin (okunuşu "i")
  if (/w$/i.test(w)) return `${w}'un`; // Stew → Stew'un (okunuşu "u")
  const v = (String(w).toLocaleLowerCase("tr").match(/[aeıioöuü]/g) || ["a"]).pop();
  const suf = { a: "ın", ı: "ın", e: "in", i: "in", o: "un", u: "un", ö: "ün", ü: "ün" }[v];
  return `${w}'${/[aeıioöuü]$/i.test(w) ? "n" : ""}${suf}`;
}
const col = (p) => (p.color_label || "").toLocaleLowerCase("tr");
const nick = (p) => `${p.model} ${col(p)}`.trim(); // "Pinya siyah"
const Up = (x) => x[0].toLocaleUpperCase("tr") + x.slice(1);
const and = (arr) => (arr.length > 1 ? arr.slice(0, -1).join(", ") + " ve " + arr[arr.length - 1] : arr[0] || "");
// topuğu insan diliyle anlat (sadece ölçüye dayanır, rahatlık iddiası yok)
const heelWord = (h) => (h <= 2 ? "neredeyse düz" : h <= 4 ? "alçak bir topuk" : h <= 6.5 ? "orta boy bir topuk" : h <= 8 ? "zarif, yüksekçe bir topuk" : "iddialı bir yükseklik");

// sepete ekleme: numara kırılımı kodla (stok + kalıp)
function addToCart(p, size, C) {
  if (!size) {
    const st = S.stockSizes(p);
    return { reply: `${pick(["Hemen ayıralım; ", "Tabii, "], p.slug)}${nick(p)} için ${SIZE_Q}${p.fit === "bir numara büyük" ? " Bu model biraz küçük kalıp, ben size bir büyüğünü ayıracağım." : ""}`,
      actions: [{ type: "choices", kind: "size", slug: p.slug, choices: [...st.map(String), "Emin değilim"] }] };
  }
  const want = S.fitSize(p, size);
  const row = p.sizes.find((s) => +s.size === want);
  if (row && row.stock > 0) {
    const note = want !== size ? ` Kalıbı biraz küçük olduğu için ${size} yerine ${want} koydum.` : "";
    const last = row.stock === 1 ? " Bu numarada son çiftti, iyi ki yetiştiniz." : "";
    return { reply: pick([`Çantanıza koydum: ${nick(p)}, ${want} numara.`, `Ekledim; ${nick(p)} ${want} numara çantanızda.`], p.slug + want) + note + last + " Güle güle giyin.", actions: [{ type: "cart", item: { ...K.card(p), size: want } }] };
  }
  // stok yok → aynı modelin başka rengi ya da yakın numara (kırılım: uydurma yok, sadece stokta olan)
  const alt = K.family(p).filter((q) => q !== p && S.hasSize(q, size));
  const items = alt.slice(0, 3).map(K.card);
  const near = S.stockSizes(p).filter((s) => Math.abs(s - want) === 1);
  const r = `${pick(["Ah, ", "Maalesef "], p.slug)}${col(p)} renginde ${want} numara kalmamış.` +
    (alt.length ? ` Ama ${gen(p.model)} ${and(alt.map(col))} renginde ${want} numara var, bir bakın derim.` : "") +
    (near.length && !alt.length ? ` Bu renkte ${near.join(" ve ")} numara duruyor.` : "") +
    (!alt.length && !near.length ? ` Gelince haber verelim isterseniz WhatsApp'tan (${FACTS.whatsapp}) bize bir mesaj atmanız yeterli.` : "");
  return { reply: r, actions: items.length ? [{ type: "show", title: `${p.model} · ${want} numara var`, items }] : [] };
}

// müşteri bir ürünü/aileyi kastediyor mu? (ürün sayfası, "bunu", model adı, sıra)
function target(m, context, cur) {
  const last = (context.lastShown || []).map((s) => K.bySlug[s]).filter(Boolean);
  const ord = m.match(/\b(ilk|birinci|ikinci|ucuncu|dorduncu|sonuncu|son)(ini|inin|unu|unun|u|i|ki|kini|si|sini|sinin|sinden)?\b/);
  if (ord && last.length) { const i = { ilk: 0, birinci: 0, ikinci: 1, ucuncu: 2, dorduncu: 3, son: last.length - 1, sonuncu: last.length - 1 }[ord[1]]; if (last[i]) return last[i]; }
  const named = [...(context.seen || []), ...(cur ? [cur.slug] : [])].map((s) => K.bySlug[s]).filter(Boolean).filter((p) => new RegExp(`\\b${S.norm(p.model)}\\b`).test(m));
  if (named.length) { const c = S.extractOne(m); return named.find((p) => !c.colors || c.colors.includes(p.color)) || named[0]; }
  // renkle gösterme: "kahve olanı", "siyahını" → ekranda/konuşmada o renkteki ürün
  const cl = S.extractOne(m).colors;
  if (cl) { const pool = [...last, ...[...(context.seen || [])].reverse().map((x) => K.bySlug[x]).filter(Boolean)]; const hit = pool.find((p) => cl.includes(p.color)); if (hit) return hit; }
  if (/\b(bunu|bunu da|bu|onu|sunu|bunlari)\b/.test(m) && last.length === 1) return last[0];
  if (cur) return cur;
  if (last.length === 1) return last[0];
  // son cevapta adı geçen tek ürün ("Aroya tam kalıp." → "ekle")
  const said = last.filter((p) => new RegExp(`\\b${S.norm(p.model)}\\b`).test(S.norm(context.lastBot || "")));
  if (said.length === 1) return said[0];
  return null;
}

function create() {
  return function route({ history = [], context = {}, constraints: C = {}, cur }) {
    const userMsgs = history.filter((x) => x.role === "user").map((x) => String(x.content));
    const raw = (userMsgs[userMsgs.length - 1] || "").trim();
    if (!raw || raw.length > 260) return null;
    const m = " " + S.norm(raw).replace(/[!?.,;:]+/g, " ").replace(/\s+/g, " ").trim() + " ";
    const seed = m + userMsgs.length;
    const lastBot = [...history].reverse().find((x) => x.role === "assistant")?.content || "";
    const reply = (text, actions = []) => (text === lastBot ? null : { reply: text, actions, via: "kod" });
    // bilinmeyen/çelişkili bilgi: ekip Telegram'daysa ona sorulur (cevap birkaç dakikada sohbete düşer), değilse WhatsApp'a yönlendirilir
    const team = (fallback, question, dept = "urun", lead = "") => (Staff.enabled()
      ? { reply: lead + pick(["Bunu tahminle söylemek istemem; hemen butikteki arkadaşlara soruyorum, cevap birkaç dakika içinde burada görünecek.", "Bunu en doğru ekibimiz bilir; şimdi onlara soruyorum, cevap birazdan burada olacak."], seed), actions: [], via: "kod", staffReq: { question, dept } }
      : reply(fallback));
    const en = (raw.match(/\b(the|do|you|have|for|my|shoes?|boots?|size|price|want|show|is|are|hi|hello|what|how)\b/gi) || []).length;
    if (en >= 2 && !/[çğıöşü]/i.test(raw)) return null;
    const one = S.extractOne(raw);

    // --- numara kırılım cevabı (buton ya da "38") → bekleyen ürünü sepete ekle ---
    const pend = context.pending && K.bySlug[context.pending];
    if (pend && (isSizeQ(lastBot) || context.pendingKind === "size")) {
      if (/emin degil|bilmiyorum|bilmem|kararsiz/.test(m)) return reply(`Hiç sorun değil. ${pend.fit === "bir numara büyük" ? "Bu model biraz küçük kalıp, en çok giydiğiniz numaranın bir büyüğünü seçin" : "Kalıplarımız standart, en çok giydiğiniz numarayı seçin"}; olmazsa 14 gün içinde değiştiririz, içiniz rahat olsun.`, [{ type: "choices", kind: "size", slug: pend.slug, choices: S.stockSizes(pend).map(String) }]);
      const sz = one.size || (m.match(/^ ?(3[4-9]|4[0-3]) ?$/) || [])[1];
      if (sz) return { ...addToCart(pend, +sz, C), via: "kod" };
    }

    // --- ürün teknik soruları: ürün sayfasındaysa ya da tek ürün gösterildiyse, kendi verisinden ---
    const t = target(m, { ...context, lastBot }, cur);
    const asks = /\?| (mi|mı|mu|mü|mudur|midir|misiniz|var mi|ne kadar|kac) /.test(" " + raw.toLowerCase() + " ") || / (nedir|nasil|soyler misiniz|ogrenebilir) /.test(m);
    if (t && asks) {
      if (/topu(k|g)/.test(m) && /(kac|ne kadar|yuksek|boy|cm|santim)/.test(m)) {
        if (t.heel_conflict) { const lead = `${Up(gen(t.model))} topuğu için ürün bilgisinde iki ayrı ölçü görünüyor, ${t.heel_conflict.map(K.n).join(" ve ")} cm. `;
          return team(lead + `Size yanlış bilgi vermek istemem; WhatsApp'tan (${FACTS.whatsapp}) yazarsanız ekibimiz ölçüp hemen söyler.`, `${nick(t)} (${t.type_tr}) topuk boyu kaç cm? Sayfada ${t.heel_conflict.map(K.n).join(" ve ")} cm iki farklı ölçü yazıyor.`, "urun", lead); }
        if (t.heel_cm != null) return reply(`${Up(gen(t.model))} topuğu ${K.n(t.heel_cm)} cm, ${heelWord(t.heel_cm)}${t.heel_type && t.heel_cm > 2 ? ` (${t.heel_type.toLocaleLowerCase("tr")})` : ""}${t.platform_cm ? `; önde de ${K.n(t.platform_cm)} cm platformu var` : ""}.`);
      }
      const sz = one.size;
      if (sz && /(var mi|kaldi mi|stok|mevcut|bulunur)/.test(m)) {
        const want = S.fitSize(t, sz), ok = S.hasSize(t, sz);
        if (ok) return reply(want !== sz ? `Var, yalnız bu model biraz küçük kalıp; ${sz} giyiyorsanız ${want} almanızı öneririm, o da stokta. Ayırayım mı?` : `${pick(["Var", "Evet, var"], seed)}; ${gen(t.model)} ${col(t)} renginde ${want} numarası stokta. Ayırayım mı?`);
        return { ...addToCart(t, sz, C), via: "kod" };
      }
      if (/(hangi numara|numaralar|beden(ler)?i? var|numarasi var|stokta hangi)/.test(m)) { const st = S.stockSizes(t); return reply(st.length ? `${Up(gen(t.model))} ${col(t)} renginde şu an ${and(st.map(String))} numaraları var.` : `${Up(gen(t.model))} bu rengi şu an tükenmiş.`); }
      if (/kalip|dar mi|genis mi|kucuk mu|buyuk mu|tam mi|numara (buyuk|kucuk)|vurur mu|sikar mi/.test(m)) {
        if (t.fit === "bir numara büyük") return reply(`Bu model biraz küçük kalıp; her zamanki numaranızın bir büyüğünü alın, 38 giyiyorsanız 39 gibi.`);
        if (t.fit === "tam kalıp") return reply(pick([`Tam kalıp, her zamanki numaranızı gönül rahatlığıyla alabilirsiniz.`, `${Up(t.model)} tam kalıp; hangi numarayı giyiyorsanız onu alın.`], seed));
        return team(`Bu modelin kalıbı sayfada yazmıyor, tahminle söylemek istemem. Kalıplarımız genelde standart ama WhatsApp'tan (${FACTS.whatsapp}) sorarsanız ekibimiz net söyler.`, `${nick(t)} (${t.type_tr}) kalıbı nasıl? Tam kalıp mı, dar mı? Sayfada kalıp bilgisi yok. Müşteri: "${raw}"`, "urun", "Bu modelin kalıbı sayfada yazmıyor. ");
      }
      if (/(deri mi|hakiki mi|gercek deri|malzeme|suni mi|neyden|astar|ic(i)? ne|taban)/.test(m)) {
        const out = (t.outer || "").toLocaleLowerCase("tr"), lin = (t.lining || "").toLocaleLowerCase("tr"), sole = (t.sole || "").toLocaleLowerCase("tr");
        return reply(`${out ? `Dışı ${out}` : "Dış malzemesi sayfada yazmıyor"}${lin ? `, içi ${lin}` : ""}${sole ? `; tabanı ${sole}` : ""}.${t.origin === "Türkiye" ? " Türkiye'de üretiliyor." : ""}`);
      }
      if (/kislik|kis(in)? giy|sicak tutar|soguk|usutur/.test(m)) return reply(t.warm_lining ? `Evet, içi ${S.norm(t.lining || "").includes("kurk") ? "kürklü" : "sıcak astarlı"}; tam kış için.` : `Bunun içi ${t.lining ? t.lining.toLocaleLowerCase("tr") : "astarsız"}, sıcak astarlı değil. Kış için bakıyorsanız astarlı bot ve çizmelerimiz var, onlara geçelim mi?`);
      if (/baldir|cap|konc|bogaz/.test(m)) {
        const bits = [t.shaft_cm && `konç boyu ${K.n(t.shaft_cm)} cm`, t.opening_cm && `boğazı ${K.n(t.opening_cm)} cm`].filter(Boolean);
        if (t.calf_conflict) { const lead = `${bits.length ? Up(and(bits)) + ". " : ""}Baldır çapında ürün bilgisinde iki ayrı ölçü var, ${t.calf_conflict.map(K.n).join(" ve ")} cm. `;
          return team(lead + `Baldır konusunda yanlış söylemek istemem, WhatsApp'tan (${FACTS.whatsapp}) ölçtürüp hemen öğrenebilirsiniz.`, `${nick(t)} çizme baldır çapı kaç cm? Sayfada ${t.calf_conflict.map(K.n).join(" ve ")} cm iki farklı ölçü var. Müşteri: "${raw}"`, "urun", lead); }
        if (t.calf_cm) return reply(`${bits.length ? Up(and(bits)) + ", " : ""}${bits.length ? "baldır" : "Baldır"} çapı ${t.calf_note || K.n(t.calf_cm) + " cm"}. Kendi baldırınızı mezurayla ölçüp yazarsanız olup olmayacağını söylerim.`);
        if (bits.length) return reply(Up(and(bits)) + ".");
        if (["bot", "cizme"].includes(t.type)) return team(`Bu modelin ölçüleri sayfada yazmıyor; WhatsApp'tan (${FACTS.whatsapp}) sorarsanız ekibimiz ölçüp söyler.`, `${nick(t)} (${t.type_tr}) ölçüsü: müşteri soruyor: "${raw}". Sayfada konç/baldır ölçüsü yok.`, "urun", "Bu modelin ölçüleri sayfada yazmıyor. ");
      }
      if (/(baska|diger) renk|renkleri|rengi var mi|renk secenek/.test(m)) {
        const fam = K.family(t).filter((q) => q.in_stock);
        if (fam.length <= 1) return reply(`${Up(t.model)} şimdilik tek renk, sadece ${col(t)}.`);
        return reply(`${Up(t.model)} ${fam.length} renkte var: ${and(fam.map(col))}.`, [{ type: "show", title: `${t.model} · renkler`, items: fam.slice(0, 4).map(K.card) }]);
      }
      if (/(fiyat|kac (tl|para|lira)|ne kadar)/.test(m) && !/topuk|kargo|iade/.test(m)) return reply(`${Up(nick(t))} ${K.TL(t.price)}; kargosu da bizden.`);
    }

    // --- ekrandaki birden çok ürün için "38 var mı?": hangisinde var, kodla ---
    const shownNow = (context.lastShown || []).map((x) => K.bySlug[x]).filter(Boolean);
    if (!t && one.size && shownNow.length > 1 && /(var mi|kaldi mi|stok|bulunur|olur mu)/.test(m)) {
      const has = shownNow.filter((p) => S.hasSize(p, one.size)), no = shownNow.filter((p) => !S.hasSize(p, one.size));
      if (!has.length) return reply(`Ekrandakilerin hiçbirinde ${one.size} numara kalmamış maalesef. Size ${one.size} numarası olan benzerlerini getireyim mi?`);
      const names = has.map((p) => p.model);
      return reply(`${and(names)} ${has.length > 1 ? "modellerinde" : "modelinde"} ${one.size} numara var${no.length ? `; ${and(no.map((p) => p.model))} ${no.length > 1 ? "modellerinde" : "modelinde"} kalmamış` : ""}.${has.some((p) => p.fit === "bir numara büyük") ? " Yalnız küçük kalıp olanın bir büyüğüne baktım." : ""}`, [{ type: "show", title: `${one.size} numara stokta`, items: has.slice(0, 4).map(K.card) }]);
    }

    // --- sepete ekleme ---
    if (/sepete (ekle|at)|cantaya (ekle|at)|\bekle(r misin|yin|yebilir| lutfen)?\b|alayim|aliyorum|bunu al|satin al(?!d|mis)|siparis (ver|olustur)/.test(m) && !/nasil|ne zaman|aldim|almistim/.test(m)) {
      if (t) return { ...addToCart(t, one.size || C.size, C), via: "kod" };
      const last = (context.lastShown || []).filter((s) => K.bySlug[s]);
      if (last.length > 1) return reply(`Hangisini ayırayım?`, [{ type: "choices", kind: "pick", choices: last.slice(0, 4).map((s) => nick(K.bySlug[s])) }]);
      return null;
    }

    // --- selamlaşma / teşekkür ---
    const bare = m.replace(/\b(merhaba|merhabalar|selam|selamlar|slm|mrb|iyi gunler|iyi aksamlar|gunaydin|hey|sa|selamun aleykum|kolay gelsin|ela)\b/g, "").trim();
    if (!bare) {
      const al = /selamun aleykum|\bsa\b/.test(m) ? "Aleykümselam, hoş geldiniz! " : pick(["Merhaba, hoş geldiniz! ", "Hoş geldiniz! "], seed);
      if (cur) return reply(al + `${gen(cur.model)} topuğunu, kalıbını, numarasını; aklınıza ne takılırsa sorun.`);
      return reply(al + pick(["Bugün neye bakıyoruz? Yeni sezon botlar mı, yoksa özel bir gün için bir şey mi?", "Ben Ela. Aklınızda bir model mi var, yoksa birlikte mi bakalım?"], seed));
    }
    if (/^ ?(tesekkur(ler|ederim)?|sagol(un)?|eyvallah|cok sagol|tamam tesekkurler|super|harika tesekkurler|iyi gunler|gorusuruz) ?$/.test(m))
      return reply(pick(["Ne demek, güle güle giyin!", "Rica ederim. Aklınıza bir şey takılırsa ben buradayım."], seed));
    if (/robot|yapay zeka|bot musun|gercek (bir )?(insan|kisi)|insan misin|kimsin/.test(m) && !one.type)
      return reply(`Ben ${NAME}, butiğin dijital stil danışmanıyım; yani gerçek bir insan değilim. Ama numara, stok, topuk, ne sorarsanız anında bakarım. Ekipten biriyle konuşmak isterseniz WhatsApp'ımız ${FACTS.whatsapp}.`);

    // --- mağaza bilgileri (ürün aranmıyorsa) ---
    const saysProduct = !!(one.type || one.colors || one.size || one.maxPrice || one.maxHeel != null || one.minHeel != null);
    if (!saysProduct) {
      if (/\biade|geri gonder|cayma|begenmezsem|para(m)? (iade|geri)/.test(m)) return reply(FACTS.iade + (/(ucret|para|kesinti|ucretsiz|kargo)/.test(m) ? " " + FACTS.iadeUcret : "") + (/magaza/.test(m) ? " " + FACTS.mağazaIade : ""));
      if (/degisim|degistir|numara (uymadi|olmadi|kucuk geldi|buyuk geldi)|kucuk geldi|buyuk geldi|olmadi/.test(m)) return reply(FACTS.degisim);
      // ekip açıkken ticari/bilinmeyen sorular modele gider, model ekibe sorar (toptan, indirim, fatura, sipariş…)
      if (Staff.enabled() && /toptan|kurumsal|fatura|indirim|kupon|kampanya|siparis(im|imi| no| numara)|kargom|nerede kaldi|gelmedi|ozel uretim|\b4[2-4] ?numara|magazada (var|stok)|rezerv|ayirt|hediye paket|yurt ?disi/.test(m)) return null;
      if (/siparis(im|imi| no| numara)|kargom|takip|nerede kaldi|gelmedi/.test(m)) return reply(`Siparişinizi hesabınızda Siparişlerim'den takip edebilirsiniz. Bir terslik varsa sipariş numaranızla WhatsApp'tan (${FACTS.whatsapp}) yazın, ekibimiz hemen ilgilensin.`);
      // Tek mesajda birden çok bilgi sorusu olabilir ("kapıda ödeme var mı, şubeniz var mı?"): hepsini topla, ilkinde durma.
      const parts = [];
      if (/kapida/.test(m)) parts.push("Kapıda nakit ödeyebilirsiniz. Yalnız kapıda kart geçmiyor; kartla ödemek isterseniz sitede yapmanız gerekiyor.");
      else if (/taksit|odeme|havale|eft|kredi kart/.test(m)) parts.push(FACTS.odeme);
      if (/kargo|ne zaman gelir|kac gunde|teslimat|gonderim/.test(m)) parts.push(FACTS.kargo);
      if (/magaza|adres|nerede(siniz)?|sube|trabzon|gelip deneyebilir|yerinde deneme/.test(m)) parts.push(`${FACTS.magaza}. Gelirseniz numarasını da rengini de deneyerek seçersiniz, bekleriz.`);
      if (/whatsapp|telefon|iletisim|ulasabilirim|musteri hizmet|yetkili|calisma saat|kacta (aciliyor|kapaniyor)/.test(m)) parts.push(`En hızlısı WhatsApp: ${FACTS.whatsapp}. Telefonla da ${FACTS.telefon} numarasından ulaşabilirsiniz; ${FACTS.saat}.`);
      if (parts.length) return reply((/kapida/.test(m) ? "Var. " : "") + parts.join(" "));
    }
    // karşılaştırma, kombin, tavsiye, kararsızlık, pazarlık → model
    return null;
  };
}

module.exports = { create, FACTS, NAME, addToCart, isSizeQ, SIZE_Q, gen };
