// Ortak: üst menü, alt bilgi, çanta. Her sayfa <body data-page="..."> ile gelir.
(() => {
  const page = document.body.dataset.page || "";
  const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const tl = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₺";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  document.body.insertAdjacentHTML("afterbegin", `
<div class="announce">Hakiki deri · Türkiye üretimi · Ücretsiz kargo · 14 gün iade</div>
<header class="top"><div class="wrap nav">
  <ul id="menu">
    <li><a href="/koleksiyon?tur=yeni" class="${page === "koleksiyon" ? "on" : ""}">Yeni Sezon</a></li>
    <li><a href="/koleksiyon">Koleksiyon</a></li>
    <li><a href="/#salon">3D Salon</a></li>
    <li><a href="#" data-ela>Stil Danışmanı</a></li>
  </ul>
  <button class="burger" aria-label="Menü" onclick="document.getElementById('menu').classList.toggle('open')">Menü</button>
  <a href="/" class="logo"><b>Örnek Butik</b><small>Maison de chaussures</small></a>
  <div class="right">
    <a href="/koleksiyon" class="hide-m">Ara</a>
    <button class="bag" id="bagBtn">Çanta <i id="bagN">0</i></button>
  </div>
</div></header>`);

  document.body.insertAdjacentHTML("beforeend", `
<footer><div class="wrap">
  <div class="foot">
    <div><a href="/" class="logo"><b>Örnek Butik</b><small>Maison de chaussures</small></a><p>Türkiye'de üretilen, çoğu hakiki deriden kadın ayakkabıları.</p></div>
    <div><h5>Koleksiyon</h5><ul><li><a href="/koleksiyon?tur=bot">Bot</a></li><li><a href="/koleksiyon?tur=cizme">Çizme</a></li><li><a href="/koleksiyon?tur=stiletto">Stiletto</a></li><li><a href="/koleksiyon?tur=topuklu">Topuklu</a></li><li><a href="/koleksiyon?tur=makosen">Makosen</a></li><li><a href="/koleksiyon?tur=babet">Babet</a></li></ul></div>
    <div><h5>Mağaza</h5><ul><li>Trabzon Meydan Şubesi</li><li>Gazipaşa Mah. Zeytinlik Cad. No:5<br>Ortahisar / Trabzon</li><li>Her gün 08.30 – 21.00</li></ul></div>
    <div><h5>Bize ulaşın</h5><ul><li>WhatsApp 0500 000 00 00 (demo)</li><li>Müşteri hizmetleri 0850 000 00 00 (demo)</li><li><a href="https://instagram.com/ornekmarka" target="_blank" rel="noopener">Instagram @ornekbutik</a></li></ul></div>
  </div>
  <div class="legal"><span>© 2026 Örnek Butik</span><span>İade ve Değişim · Ödeme ve Taksit · Gizlilik</span></div>
</div></footer>
<div class="drawer" id="drawer"><div class="veil"></div><div class="panel">
  <header><b>Çantanız</b><button class="x">Kapat</button></header>
  <div class="bag-items" id="bagItems"></div>
  <div class="bag-foot"><div class="sum"><span>Toplam</span><span id="bagSum">0 ₺</span></div><a class="cta" href="#" onclick="return false">Ödemeye geç</a></div>
</div></div>`);

  let cart = store.get("ece_cart", []);
  const drawer = document.getElementById("drawer");
  function renderBag() {
    document.getElementById("bagN").textContent = cart.length;
    document.getElementById("bagItems").innerHTML = cart.length ? cart.map((c, i) => `<div class="bag-item"><img src="${esc(c.img)}" alt=""><div><b>${esc(c.short)}</b>${c.size} numara · ${tl(c.price)}</div><button data-rm="${i}">Çıkar</button></div>`).join("") : `<div class="empty">Çantanız şimdilik boş.</div>`;
    document.getElementById("bagSum").textContent = tl(cart.reduce((a, c) => a + c.price, 0));
  }
  const openBag = () => drawer.classList.add("open");
  drawer.querySelector(".veil").onclick = drawer.querySelector(".x").onclick = () => drawer.classList.remove("open");
  document.getElementById("bagItems").onclick = (e) => { const b = e.target.closest("[data-rm]"); if (b) { cart.splice(+b.dataset.rm, 1); store.set("ece_cart", cart); renderBag(); } };
  document.getElementById("bagBtn").onclick = openBag;
  renderBag();

  // ürün kartı (koleksiyon, ürün sayfası, asistan)
  const cardHTML = (p, o = {}) => `<a class="pcard" href="/urun?s=${encodeURIComponent(p.slug)}" data-slug="${esc(p.slug)}">
    <div class="ph"><img src="${esc(p.img)}" alt="${esc(p.short)}" ${o.eager ? 'fetchpriority="high"' : 'loading="lazy"'}>${p.img2 && p.img2 !== p.img ? `<img class="b" src="${esc(p.img2)}" alt="" loading="lazy">` : ""}${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ""}</div>
    <h4>${esc(p.model)}</h4><div class="sub">${esc([p.color_label, p.type_tr, p.heel && "topuk " + p.heel.replace(/ \(.*/, "")].filter(Boolean).join(" · "))}</div>
    <div class="pr">${tl(p.price)}</div></a>`;

  function reveal() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  window.Site = {
    page, tl, esc, cardHTML, reveal, store, openBag,
    get cart() { return cart; },
    add(item) { cart.push({ slug: item.slug, short: item.short, img: item.img, price: item.price, size: item.size }); store.set("ece_cart", cart); renderBag(); const n = document.getElementById("bagN"); n.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 500 }); },
  };
  reveal();
})();
