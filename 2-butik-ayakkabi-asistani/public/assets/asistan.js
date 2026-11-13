// Ela — dijital stil danışmanı. Sohbet + ürün kartları + kırılım butonları + çanta.
(() => {
  const { esc, tl, store } = Site;
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "/assets/asistan.css"; document.head.appendChild(css);
  document.body.insertAdjacentHTML("beforeend", `
<button class="ela-fab" id="elaFab" aria-label="Stil danışmanı Ela"><span class="dot"></span><span><b>Ela</b><small>Stil danışmanınız</small></span></button>
<aside class="ela" id="ela" aria-hidden="true">
  <header><div><b>Ela</b><small>Örnek Butik · dijital stil danışmanı</small></div><div class="ela-hb"><button id="elaR" title="Sohbeti sıfırla">Yeni sohbet</button><button id="elaX">Kapat</button></div></header>
  <div class="ela-need" id="elaNeed"></div>
  <div class="ela-log" id="elaLog"></div>
  <form id="elaForm"><input id="elaIn" autocomplete="off" placeholder="Numaranızı, aradığınız modeli ya da gideceğiniz yeri yazın…"><button aria-label="Gönder">→</button></form>
</aside>`);
  const el = document.getElementById("ela"), log = document.getElementById("elaLog"), input = document.getElementById("elaIn");
  const S = store.get("ela_state", null) || { history: [], seen: [], lastShown: [], pending: null, pendingKind: null };
  const save = () => store.set("ela_state", { ...S, history: S.history.slice(-30) });
  // konuşma kimliği: ekip (Telegram) cevabı bu kimlikle bu pencereye gelir
  const newConv = () => "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  S.conv ||= newConv();
  const ctx = () => ({ conv: S.conv, page: Site.page, slug: window.ELA_PRODUCT || null, seen: S.seen.slice(-30), lastShown: S.lastShown, pending: S.pending, pendingKind: S.pendingKind, cart: Site.cart, size: store.get("ece_size", null) });

  const starters = {
    home: ["Düğün için çok yüksek olmayan bir topuklu", "38 numara siyah bot", "Gün boyu rahat edeceğim bir şey"],
    koleksiyon: ["Kışlık, sıcak astarlı bir çizme", "3.000 TL altı makosen", "Açık renk, ince topuk olmasın"],
    urun: ["Topuğu kaç cm?", "Kalıbı nasıl, dar mı?", "Başka rengi var mı?"],
  };
  function bubble(role, html) { const d = document.createElement("div"); d.className = "m " + role; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function cardsHTML(a) {
    return `<div class="ela-cards">${a.title ? `<div class="t">${esc(a.title)}</div>` : ""}<div class="row">${a.items.map((p) => `
      <div class="ec" data-slug="${esc(p.slug)}"><a href="/urun?s=${encodeURIComponent(p.slug)}"><img src="${esc(p.img)}" alt="" loading="lazy"></a>
      <b>${esc(p.model)}</b><span>${esc(p.color_label || "")}${p.heel ? " · " + esc(p.heel.replace(/ \(.*/, "")) : ""}</span><span class="p">${tl(p.price)}</span>
      <button data-add="${esc(p.slug)}">Çantaya ekle</button></div>`).join("")}</div></div>`;
  }
  function renderActions(actions = [], box) {
    for (const a of actions) {
      if (a.type === "show" && a.items?.length) {
        box.insertAdjacentHTML("beforeend", cardsHTML(a));
        S.lastShown = a.items.map((i) => i.slug); S.seen.push(...S.lastShown);
      }
      if (a.type === "choices") {
        S.pending = a.slug || null; S.pendingKind = a.kind;
        box.insertAdjacentHTML("beforeend", `<div class="ela-choices">${a.choices.map((c) => `<button data-say="${esc(c)}">${esc(c)}</button>`).join("")}</div>`);
      }
      if (a.type === "cart") { Site.add(a.item); store.set("ece_size", a.item.size); S.pending = null; S.pendingKind = null; box.insertAdjacentHTML("beforeend", `<div class="ela-cart">Çantaya eklendi · <a href="#" data-bag>Çantayı aç</a></div>`); }
    }
    if (!actions.some((a) => a.type === "choices")) { S.pending = null; S.pendingKind = null; }
    log.scrollTop = log.scrollHeight;
  }
  function paintHistory() {
    log.innerHTML = "";
    if (!S.history.length) {
      const p = Site.page === "urun" ? "urun" : Site.page === "koleksiyon" ? "koleksiyon" : "home";
      const b = bubble("bot", Site.page === "urun" ? "Hoş geldiniz! Bu modelin topuğu, kalıbı, numarası; aklınıza ne takılırsa sorun, hemen bakayım." : "Hoş geldiniz, ben Ela! Nereye giyeceğinizi, numaranızı ya da aklınızdaki modeli söyleyin, birlikte bakalım.");
      b.insertAdjacentHTML("beforeend", `<div class="ela-choices soft">${starters[p].map((c) => `<button data-say="${esc(c)}">${esc(c)}</button>`).join("")}</div>`);
      return;
    }
    for (const m of S.history) {
      if (String(m.content).startsWith("[Butik ekibi] ")) { bubble("bot staff", `<span class="who">Örnek Butik ekibi</span>${esc(m.content.slice(14))}`); continue; }
      const b = bubble(m.role === "user" ? "me" : "bot", esc(m.content)); if (m.role === "assistant" && m.actionsView) renderActions(m.actionsView.filter((a) => a.type === "show"), b); }
  }
  let busy = false;
  async function send(text) {
    text = String(text || "").trim(); if (!text || busy) return;
    busy = true; input.value = "";
    bubble("me", esc(text));
    S.history.push({ role: "user", content: text });
    const typing = bubble("bot typing", "<i></i><i></i><i></i>");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ history: S.history.map(({ role, content, shown }) => ({ role, content, shown })), context: ctx() }) }).then((x) => x.json());
      typing.remove();
      if (r.reply != null) { // konuşma ekipteyse Ela susar (reply null), mesaj Telegram'a gitti
        const b = bubble("bot", esc(r.reply || ""));
        renderActions(r.actions, b);
        const shown = (r.actions || []).filter((a) => a.type === "show").flatMap((a) => a.items.map((i) => i.slug));
        S.history.push({ role: "assistant", content: r.reply || "", shown, actionsView: (r.actions || []).filter((a) => a.type === "show") });
        document.getElementById("elaNeed").innerHTML = r.need ? `<span>Aradığınız</span>${esc(r.need)}` : "";
      }
      if ((r.actions || []).some((a) => a.type === "staff" || a.type === "human")) staffWatch();
      save();
    } catch { typing.remove(); bubble("bot", "Bağlantıda küçük bir sorun oldu; tekrar dener misiniz?"); }
    busy = false;
  }
  log.addEventListener("click", (e) => {
    const s = e.target.closest("[data-say]"); if (s) { send(s.dataset.say); return; }
    const a = e.target.closest("[data-add]"); if (a) { send(`${a.closest(".ec").querySelector("b").textContent} ${a.closest(".ec").querySelector("span").textContent.split(" · ")[0]} çantaya ekle`); S.lastShown = [a.dataset.add]; return; }
    if (e.target.closest("[data-bag]")) { e.preventDefault(); Site.openBag(); }
  });
  document.getElementById("elaForm").onsubmit = (e) => { e.preventDefault(); send(input.value); };
  const open = (msg) => { document.getElementById("elaFab").classList.remove("ping"); el.classList.add("open"); el.setAttribute("aria-hidden", "false"); document.body.classList.add("ela-on"); if (!log.children.length) paintHistory(); if (msg) send(msg); else setTimeout(() => input.focus(), 300); };
  const close = () => { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); document.body.classList.remove("ela-on"); };
  document.getElementById("elaFab").onclick = () => open();
  document.getElementById("elaX").onclick = close;
  document.addEventListener("click", (e) => { const t = e.target.closest("[data-ela]"); if (t) { e.preventDefault(); open(t.dataset.ela || ""); } });
  // sıfırla: konuşma, gösterilen ürünler, bekleyen numara sorusu ve hatırlanan numara silinir (çanta kalır)
  // ekipten gelen cevaplar: soru sorulunca 10 dk (devralındıysa süresiz) 2,5 sn'de bir bakılır
  const W = { since: S.staffSince || 0, timer: null, started: 0, got: false, warned: false };
  function staffWatch() {
    if (!W.timer) Object.assign(W, { started: Date.now(), got: false, warned: false });
    clearTimeout(W.timer);
    const conv = S.conv;
    const tick = async () => {
      if (conv !== S.conv) { W.timer = null; return; } // sohbet sıfırlandı
      try {
        const j = await fetch(`/api/staff?conv=${encodeURIComponent(conv)}&since=${W.since}`).then((x) => x.json());
        for (const m of j.msgs) {
          W.since = Math.max(W.since, m.id); S.staffSince = W.since; W.got = true;
          if (m.who === "system") bubble("bot note", esc(m.text));
          else { const d = bubble("bot staff", `<span class="who">Örnek Butik ekibi</span>${esc(m.text)}`); S.history.push({ role: "assistant", content: "[Butik ekibi] " + m.text }); }
          if (!el.classList.contains("open")) document.getElementById("elaFab").classList.add("ping");
        }
        save();
        if (!W.got && !W.warned && Date.now() - W.started > 180000) { W.warned = true; bubble("bot", `Ekibimiz şu an biraz yoğun; cevap gelince burada göreceksiniz. Beklemek istemezseniz WhatsApp'tan da yazabilirsiniz: 0500 000 00 00 (demo).`); }
        W.timer = j.mode === "insan" || Date.now() - W.started < 600000 ? setTimeout(tick, 2500) : null;
      } catch { W.timer = setTimeout(tick, 5000); }
    };
    W.timer = setTimeout(tick, 1500);
  }
  if (S.staffSince != null && S.history.some((m) => String(m.content).startsWith("[Butik ekibi]"))) staffWatch();

  const reset = () => { if (busy) return; Object.assign(S, { history: [], seen: [], lastShown: [], pending: null, pendingKind: null, conv: newConv(), staffSince: 0 }); W.since = 0; store.set("ece_size", null); save(); document.getElementById("elaNeed").innerHTML = ""; paintHistory(); input.value = ""; input.focus(); };
  document.getElementById("elaR").onclick = reset;
  window.Ela = { open, send, reset };
})();
