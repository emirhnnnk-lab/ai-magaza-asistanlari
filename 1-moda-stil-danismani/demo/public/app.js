// Örnek Moda demo — tek sayfa uygulama
const $ = (s, el = document) => el.querySelector(s);
const TL = (n) => Math.round(n).toLocaleString("tr-TR") + " TL";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FREE_SHIP = 2500;

const state = { catalog: [], product: null, size: null, cart: [], history: [], page: "home" };
try { state.cart = JSON.parse(localStorage.getItem("moda-cart") || "[]"); } catch {}
// oturum hafızası: bu ziyarette gösterilen/bakılan ürünler (sunucuya slug listesi olarak gider)
state.seen = [];
try { state.seen = JSON.parse(sessionStorage.getItem("moda-seen") || "[]"); } catch {}
function remember(slugs) {
  for (const s of slugs) { state.seen = state.seen.filter((x) => x !== s); state.seen.push(s); }
  state.seen = state.seen.slice(-40);
  try { sessionStorage.setItem("moda-seen", JSON.stringify(state.seen)); } catch {}
}

const ROLE_LABEL = { dis_katman: "Üstüne", ust: "Üst parça", alt: "Altına", tek_parca: "İçine elbise", takim: "İçine takım", ic_katman: "İçine içlik", plaj: "Plaj" };
const MENU = [["Yeni Gelenler", ""], ["Takım", "Takım"], ["Elbise", "Elbise"], ["Gömlek", "Gömlek"], ["Trençkot", "Trençkot"], ["Pantolon", "Pantolon"], ["Dış Giyim", "Dış Giyim"]];

// ---------------- router ----------------
async function route() {
  if (!state.catalog.length) state.catalog = await (await fetch("/api/catalog")).json();
  const h = decodeURIComponent(location.hash.slice(1) || "/");
  document.body.classList.remove("compare", "picks-open");
  $("#nudgeSlot").innerHTML = "";
  clearTimeout(state.nudgeT);
  const [, kind, arg] = h.split("/");
  $("#menu").innerHTML = MENU.map(([t, c]) => `<a href="#/c/${c}" class="${kind === "c" && arg === c ? "on" : ""}">${t}</a>`).join("");
  if (kind === "p") await renderProduct(arg);
  else renderHome(kind === "c" ? arg : "");
  window.scrollTo({ top: 0 });
}
window.addEventListener("hashchange", route);

// ---------------- anasayfa ----------------
function pcard(p, tag) {
  return `<a class="pcard" href="#/p/${p.slug}"><div class="ph">${tag ? `<span class="tag">${tag}</span>` : ""}<img src="${p.img}" loading="lazy" alt="${esc(p.name)}"><img src="${p.img2}" loading="lazy" alt=""></div>
  <div class="nm">${esc(p.name)}</div><div class="pr">${TL(p.price)}</div></a>`;
}

function renderHome(cat) {
  state.page = "home"; state.product = null; state.cat = cat || null;
  const all = state.catalog;
  const list = cat ? all.filter((p) => (cat === "Dış Giyim" ? ["Trençkot", "Kaban", "Kimono", "Ceket"].includes(p.cat) : p.cat === cat)) : all;
  $("#app").innerHTML = `
  ${cat ? "" : `<div class="wrap hero">
    <a href="#/c/Trençkot"><img src="/brand/banners/trenckot-tr-1.webp" alt=""><div class="cap"><span>Yeni sezon</span><b>Trençkot</b></div></a>
    <a href="#/c/Elbise"><img src="/brand/banners/elbise-tr-5.webp" alt=""><div class="cap"><span>Keşfet</span><b>Elbise</b></div></a>
    <a href="#/c/Takım"><img src="/brand/banners/takim-tr-8.webp" alt=""><div class="cap"><span>Keşfet</span><b>Takım</b></div></a></div>`}
  <div class="wrap">
    <div class="section-title"><div><h2>${cat || "Yeni Sezon, Yeni Sen"}</h2><p>${list.length} ürün · Ne arıyorsanız Defne'ye sorabilirsiniz</p></div>
      <div class="chips">${["Davet için elbise", "Ofise uygun takım", "Astarlı trençkot", "1.500 TL altı"].map((q) => `<button class="chip" onclick="openChat(${esc(JSON.stringify(q))})">${q}</button>`).join("")}</div></div>
    <div class="grid">${list.slice(0, cat ? 400 : 48).map((p, i) => pcard(p, !cat && i < 8 ? "Yeni!" : "")).join("")}</div>
  </div>`;
}

// ---------------- ürün sayfası ----------------
const ICONS = {
  lining: '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v6c0 4 3.5 7 8 8 4.5-1 8-4 8-8V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
  fit: '<svg viewBox="0 0 24 24"><path d="M8 3h8l3 5-3 2v11H8V10L5 8l3-5Z"/></svg>',
  len: '<svg viewBox="0 0 24 24"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
  fabric: '<svg viewBox="0 0 24 24"><path d="M4 6c3-2 5 2 8 0s5-2 8 0v12c-3-2-5 2-8 0s-5-2-8 0V6Z"/></svg>',
};

async function renderProduct(slug) {
  const p = await (await fetch("/api/product?slug=" + encodeURIComponent(slug))).json();
  state.product = p; state.page = "product"; state.imgIdx = 0;
  remember([p.slug]);
  state.size = (p.sizes.find((s) => s.in_stock) || {}).size;
  const t = p.tags || {};
  const len = (p.measurements || []).find((m) => /uzunluk|boy/i.test(m));
  const guide = [
    ["lining", p.lined ? "Astarlı" : "Astar bilgisi", p.lined ? "İç göstermez, tek başına rahatça giyilir" : "Ürün bilgisinde belirtilmemiş, Defne'ye sorun"],
    ["fit", p.fit ? p.fit + " kalıp" : "Kalıp", t.silhouette || "Rahat kesim"],
    ["len", len ? len.replace(/\s+/g, " ") : "Boy", p.model_info ? "Manken " + (p.model_info.match(/Boy:\s*\d+\s*cm/) || [""])[0].replace("Boy:", "").trim() + " boyunda" : "Ölçüleri Defne'den öğrenin"],
    ["fabric", p.fabric ? p.fabric.split(",")[0] : "Kumaş", t.season ? [].concat(t.season).join(", ") + " için" : ""],
  ];
  const remain = FREE_SHIP - cartTotal() - p.price;
  $("#app").innerHTML = `
  <div class="wrap">
    <div class="crumb">Anasayfa / ${esc(p.category_path.join(" / "))}</div>
    <div class="product">
      <div class="gallery">
        <div class="thumbs">${p.imgs.map((s, i) => `<img src="${s}" class="${i ? "" : "on"}" onclick="setImg(${i})" alt="">`).join("")}</div>
        <div class="tilt-wrap"><div class="tilt" id="tilt" onclick="openLb()"><img id="mainImg" src="${p.imgs[0]}" alt="${esc(p.name)}"><div class="glare"></div><span class="hint3d">⤢ Yakından bakın</span></div></div>
      </div>
      <div class="stage" id="stage"></div>
      <div class="info">
        <span class="new">Yeni sezon</span>
        <h1>${esc(p.name)}</h1>
        <div class="price">${TL(p.price)}</div>
        <span class="live"><i></i>Şu an ${14 + (p.slug.length % 40)} kişi bu ürüne bakıyor</span>

        <div class="label">Renk: ${esc(p.color || "")}</div>
        <div class="variants">${p.variants.map((v) => `<a href="#/p/${v.slug}" class="${v.slug === p.slug ? "on" : ""}" title="${esc(v.color)}"><img src="${v.img || ""}" alt="${esc(v.color)}"></a>`).join("")}</div>

        <div class="label">Beden <a onclick="askSize()">Bedenimi bul</a></div>
        <div class="sizes">${p.sizes.map((s) => `<button class="size ${s.size === state.size ? "on" : ""}" ${s.in_stock ? "" : "disabled"} onclick="pickSize('${esc(s.size)}')">${esc(s.size)}</button>`).join("")}</div>

        <div class="buy"><button class="btn" onclick="addCurrent()">Sepete Ekle</button><button class="btn ghost" onclick="openChat('Bu ürünle ne giyebilirim?')">Kombin öner</button></div>

        <div class="guide">${guide.map(([i, b, s]) => `<div class="g">${ICONS[i]}<div><b>${esc(b)}</b><span>${esc(s)}</span></div></div>`).join("")}</div>
        ${t.selling_line ? `<div class="stylist"><span class="av">D</span><div><b style="font-weight:500">Stilist notu</b><br>${esc(t.selling_line)} ${t.hijab_suggestion ? esc(t.hijab_suggestion) : ""}</div></div>` : ""}
        <div class="trust">
          <div><b>${remain > 0 ? TL(remain) + " kaldı" : "Kargo bedava"}</b>${remain > 0 ? "ücretsiz kargoya" : "bu siparişte"}</div>
          <div><b>7 gün</b>ücretsiz iade</div>
          <div><b>WhatsApp</b>anında destek</div>
        </div>
        <details class="acc" open><summary>Ürün açıklaması</summary><div>${esc(p.description)}</div></details>
        <details class="acc"><summary>Ölçüler & manken</summary><div>${esc([...(p.measurements || []), p.model_info || ""].join("\n"))}</div></details>
        ${p.features?.length ? `<details class="acc"><summary>Özellikler</summary><div>${esc(p.features.join("\n"))}</div></details>` : ""}
      </div>
    </div>

    ${p.complete.length ? `<div class="look"><div class="section-title"><div><h2>Kombini tamamlayın</h2><p>Bu parçayla renk ve stil olarak uyumlu seçtik</p></div><button class="chip" onclick="showBeside(state.product.complete, 'Kombini tamamlayın')">Yan yana gör</button></div>
      <div class="rail">${p.complete.map((x) => pcard(x)).join("")}</div></div>` : ""}
    <div class="section-title"><div><h2>Benzer ürünler</h2></div></div>
    <div class="rail">${p.similar.slice(0, 4).map((x) => pcard(x)).join("")}</div>
  </div>
  <div class="sticky-buy"><b>${TL(p.price)}</b><button class="btn" onclick="addCurrent()">Sepete Ekle</button></div>`;
  bindTilt();
  scheduleNudge(p);
}

function setImg(i) {
  state.imgIdx = i;
  $("#mainImg").src = state.product.imgs[i];
  document.querySelectorAll(".thumbs img").forEach((el, j) => el.classList.toggle("on", i === j));
}
function pickSize(s) { state.size = s; document.querySelectorAll(".size").forEach((b) => b.classList.toggle("on", b.textContent === s)); }
function addCurrent() {
  const p = state.product;
  if (!state.size) return openChat("Bu ürünün stokta hangi bedenleri var?");
  addToCart({ slug: p.slug, name: p.name, price: p.price, img: p.imgs[0], size: state.size });
}
function askSize() { openChat("Bu ürün için bedenimi bulur musunuz?"); }

// ---------------- 3D: tilt + yakın bakış ----------------
function bindTilt() {
  const el = $("#tilt"); if (!el || matchMedia("(hover: none)").matches) return;
  const img = el.querySelector("img");
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    img.style.transform = `scale(1.06) translate(${-x * 10}px, ${-y * 10}px)`;
    el.style.setProperty("--gx", (x + 0.5) * 100 + "%"); el.style.setProperty("--gy", (y + 0.5) * 100 + "%");
  });
  el.addEventListener("mouseleave", () => { el.style.transform = ""; img.style.transform = ""; });
}
function openLb() { $("#lb").classList.add("on"); lbShow(); }
function closeLb() { $("#lb").classList.remove("on"); }
function lbStep(d) { const n = state.product.imgs.length; setImg((state.imgIdx + d + n) % n); lbShow(); }
function lbShow() { const s = `url(${state.product.imgs[state.imgIdx]})`; document.querySelectorAll("#lbBox .layer").forEach((l) => (l.style.backgroundImage = s)); }
$("#lb").addEventListener("mousemove", (e) => {
  const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
  $("#lbBox").style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 10}deg)`;
});
document.addEventListener("keydown", (e) => {
  if (!$("#lb").classList.contains("on")) return;
  if (e.key === "Escape") closeLb(); if (e.key === "ArrowRight") lbStep(1); if (e.key === "ArrowLeft") lbStep(-1);
});

// ---------------- yan yana (ayna) ----------------
function showBeside(items, title) {
  const p = state.product;
  if (!p) return;
  const main = { slug: p.slug, name: p.name, price: p.price, img: p.imgs[state.imgIdx || 0], sizes: p.sizes };
  const m = (x, isMain) => `<div class="m ${isMain ? "main" : ""}"><div class="ph"><span class="lbl ${isMain ? "" : "s"}">${isMain ? "Baktığınız" : ROLE_LABEL[x.role] ? "Defne · " + ROLE_LABEL[x.role] : "Defne'nin önerisi"}</span><img src="${x.img}" alt=""></div>
    <div class="nm">${esc(x.name)}</div><div class="row"><b>${TL(x.price)}</b>${isMain ? `<button class="mini-btn light" onclick="closeStage()">Detaya dön</button>` : `<span><a class="mini-btn light" href="#/p/${x.slug}">İncele</a> <button class="mini-btn" onclick='quickAdd(${JSON.stringify(x.slug)})'>Ekle</button></span>`}</div></div>`;
  $("#stage").innerHTML = `<div class="stage-head"><h3><small>Yan yana bakın</small>${esc(title || "Birlikte nasıl durur?")}</h3><button class="chip" onclick="closeStage()">Kapat ×</button></div>
    <div class="mirror">${m(main, true)}${items.slice(0, 3).map((x) => m(x)).join("")}</div>`;
  state.stageItems = items;
  document.body.classList.add("compare");
  $("#stage").scrollIntoView({ behavior: "smooth", block: "start" });
}
function closeStage() { document.body.classList.remove("compare"); }
function quickAdd(slug) {
  const x = [...(state.stageItems || []), ...(state.picks || []), ...state.catalog].find((i) => i.slug === slug);
  const s = (x.sizes || []).find((z) => z.in_stock);
  addToCart({ slug: x.slug, name: x.name, price: x.price, img: x.img, size: s ? s.size : "Standart" });
}

// ---------------- sepet ----------------
const cartTotal = () => state.cart.reduce((a, c) => a + c.price, 0);
function addToCart(item, silent) {
  state.cart.push(item);
  try { localStorage.setItem("moda-cart", JSON.stringify(state.cart)); } catch {}
  renderCart();
  const b = $("#cartCount"); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  if (!silent) toast(`${item.name.split(" - ")[0]} (${item.size}) sepete eklendi`);
}
function removeItem(i) { state.cart.splice(i, 1); try { localStorage.setItem("moda-cart", JSON.stringify(state.cart)); } catch {} renderCart(); }
function renderCart() {
  const t = cartTotal(), rem = FREE_SHIP - t;
  $("#cartCount").textContent = state.cart.length;
  $("#total").textContent = TL(t);
  $("#ship").innerHTML = (rem > 0 ? `Ücretsiz kargoya <b>${TL(rem)}</b> kaldı` : "Kargonuz <b>bedava</b> 🎉".replace(" 🎉", "")) + `<div class="bar"><i style="width:${Math.min(100, (t / FREE_SHIP) * 100)}%"></i></div>`;
  $("#items").innerHTML = state.cart.length ? state.cart.map((c, i) => `<div class="item"><img src="${c.img}" alt=""><div style="flex:1">${esc(c.name)}<br><span style="color:var(--muted)">Beden: ${esc(c.size)}</span><b>${TL(c.price)}</b></div><button onclick="removeItem(${i})" style="color:var(--muted)">×</button></div>`).join("")
    : `<p style="padding:30px 0;color:var(--muted);text-align:center">Sepetiniz boş.</p>`;
}
function toggleCart(on) { document.body.classList.toggle("cart-open", on); }
function toast(t) { const d = document.createElement("div"); d.className = "toast"; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }

// ---------------- asistan ----------------
function scheduleNudge(p) {
  if (sessionStorage.getItem("nudged-" + p.slug) || document.body.classList.contains("chat-open")) return;
  state.nudgeT = setTimeout(() => {
    const kind = p.name.split(" - ")[0];
    const txt = `${kind} için bedeninizden emin değilseniz boyunuzu söyleyin, hemen bakayım. Yanına ne gider onu da gösterebilirim.`;
    $("#nudgeSlot").innerHTML = `<div class="nudge" onclick="openChat(); this.remove()">${esc(txt)}<button onclick="event.stopPropagation(); this.parentNode.remove()">×</button></div>`;
    try { sessionStorage.setItem("nudged-" + p.slug, 1); } catch {}
  }, 7000);
}

// Karşılama: mağazadaki iyi danışman gibi — önce hoş geldin, rahat bıraksın, bulunduğu yere göre ne yapabileceğini söylesin
const KIND = { Trençkot: "trençkot", Elbise: "elbise", Takım: "takım", Gömlek: "gömlek", Pantolon: "pantolon", Kaban: "kaban", Kimono: "kimono", Ceket: "ceket" };
function greet() {
  const p = state.product;
  if (p) {
    const kind = KIND[p.cat] || "parça";
    return `Hoş geldiniz, ben Defne. Bu ${kind} için bedeninizi, boyunun size nereye geleceğini ya da yanına ne yakışacağını sorabilirsiniz, hemen bakarım.`;
  }
  const CAT_PHRASE = { Trençkot: "Trençkotlara", Elbise: "Elbiselere", Takım: "Takımlara", Gömlek: "Gömleklere", Pantolon: "Pantolonlara", "Dış Giyim": "Dış giyime" };
  if (state.cat && CAT_PHRASE[state.cat]) return `Hoş geldiniz, ben Defne. ${CAT_PHRASE[state.cat]} bakıyorsunuz; renk, kalıp ya da beden konusunda kararsız kalırsanız buradayım.`;
  return "Hoş geldiniz, ben Defne. Rahat rahat bakının; aklınızdaki bir parçayı tarif ederseniz bulayım, beden ya da kombin konusunda da yardımcı olurum.";
}
function quickReplies() {
  const q = state.product
    ? ["Bedenimi bulur musunuz?", "Bununla ne giyebilirim?", "Astarlı mı, gösterir mi?", "Başka rengi var mı?"]
    : ["Yeni gelenlere bakayım", "Davete uygun bir şey", "Bedenimi bilmiyorum", "Kombin önerir misiniz?"];
  $("#quick").innerHTML = q.map((t) => `<button onclick="openChat(${esc(JSON.stringify(t))})">${t}</button>`).join("");
}

function openChat(text) {
  $("#nudgeSlot").innerHTML = "";
  document.body.classList.add("chat-open");
  if (!$("#msgs").children.length) {
    const g = greet();
    bubble("bot", g);
    state.history.push({ role: "assistant", content: g });
  }
  quickReplies();
  if (text) ask(text); else setTimeout(() => $("#inp").focus(), 300);
}
function closeChat() { document.body.classList.remove("chat-open", "picks-open"); }

function bubble(who, text) {
  const d = document.createElement("div"); d.className = "msg " + who; d.textContent = text;
  $("#msgs").appendChild(d); scrollMsgs(); return d;
}
function sys(text) { const d = document.createElement("div"); d.className = "sys"; d.textContent = text; $("#msgs").appendChild(d); scrollMsgs(); }
function scrollMsgs() { const m = $("#msgs"); m.scrollTop = m.scrollHeight; }
// Defne'nin seçkisi: sohbetin solunda açılan panel + sohbette küçük hatırlatma çipi
function showPicks(items, title, silent) {
  state.picks = items;
  $("#picksTitle").textContent = title || "Sizin için seçtiklerim";
  $("#picksList").innerHTML = items.map((x) => `<div class="pick"><a href="#/p/${x.slug}"><img src="${x.img}" alt=""></a><div>
    <div class="r">${esc(ROLE_LABEL[x.role] || x.cat || "")}</div><div class="n">${esc(x.name)}</div><div class="p">${TL(x.price)}</div>
    <div class="a"><a class="mini-btn light" href="#/p/${x.slug}">İncele</a><button class="mini-btn" onclick='quickAdd(${JSON.stringify(x.slug)})'>Ekle</button></div></div></div>`).join("");
  document.body.classList.add("picks-open");
  if (silent) return;
  const c = document.createElement("button"); c.className = "pick-chip";
  c.innerHTML = `<span>${items.slice(0, 4).map((x) => `<img src="${x.img}" alt="">`).join("")}</span>${items.length} ürün · seçkide ›`;
  c.onclick = () => showPicks(items, title, true);
  $("#msgs").appendChild(c); scrollMsgs();
}
function closePicks() { document.body.classList.remove("picks-open"); }

function sendMsg(e) { e.preventDefault(); const v = $("#inp").value.trim(); if (!v) return; $("#inp").value = ""; ask(v); }

async function ask(text) {
  if (state.busy) return;
  state.busy = true;
  bubble("me", text);
  state.history.push({ role: "user", content: text });
  $("#quick").innerHTML = "";
  const typing = document.createElement("div"); typing.className = "msg bot typing"; typing.innerHTML = "<i></i><i></i><i></i>";
  $("#msgs").appendChild(typing); scrollMsgs();
  try {
    const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: state.history, context: { page: state.page, slug: state.product?.slug, cart: state.cart, seen: state.seen, shown: document.body.classList.contains("compare") ? [...document.querySelectorAll(".mirror .m")].map((m, i) => (i ? "" : "(baktığı ürün) ") + m.querySelector(".nm").textContent + " [" + (i ? state.stageItems[i - 1].slug : state.product.slug) + "]") : [] } }) });
    const j = await r.json();
    typing.remove();
    if (j.reply) { bubble("bot", j.reply); state.history.push({ role: "assistant", content: j.reply }); }
    for (const a of j.actions || []) {
      if (a.type === "show") remember(a.items.map((x) => x.slug));
      if (a.type === "show" && a.items.length) {
        if (a.mode === "yan_yana" && state.product) { showBeside(a.items, a.title); sys("Önerileri ürünün yanına koydum"); }
        else showPicks(a.items, a.title);
      }
      if (a.type === "cart") { addToCart(a.item, true); sys(`Sepete eklendi · ${a.item.name.split(" - ")[0]} (${a.item.size})`); }
    }
  } catch {
    typing.remove();
    bubble("bot", "Kusura bakmayın, bağlantıda küçük bir sorun oldu. Tekrar yazar mısınız?");
  }
  state.busy = false;
  if (state.history.filter((m) => m.role === "user").length < 2) quickReplies();
}

renderCart();
route();
