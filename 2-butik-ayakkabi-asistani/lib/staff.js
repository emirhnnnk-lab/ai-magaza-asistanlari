// EKİBE SOR (Telegram): Ela bilmediği bir şeyi butik ekibine sorar (Sahler'deki Deniz mekanizmasının aynısı).
// Ekibin Telegram'ına soru + 2 buton düşer: "✍️ Cevap yaz" (cevap müşterinin ekranına gider) | "🙋 Konuşmayı devral" (canlı sohbet, /bitir ile Ela'ya döner).
// Yerel demo: webhook yok, uzun polling. Telegram internet üzerinden çalışır; aynı Wi-Fi sadece telefonun siteyi açması için gerekir.
// Ayarlar (.env) — Sahler'in botu KULLANILMAZ (polling onun webhook'unu siler, canlı Sahler bozulur):
//   ELA_TG_TOKEN=…        @BotFather → /newbot
//   ELA_TG_CHAT_ID=123,456 sorunun gideceği kişi(ler); node tg-kurulum.js bulur
const token = () => process.env.ELA_TG_TOKEN;
const enabled = () => !!(token() && process.env.ELA_TG_CHAT_ID);
const chats = () => String(process.env.ELA_TG_CHAT_ID || "").split(",").map((s) => s.trim()).filter(Boolean);
const allowed = (id) => chats().includes(String(id));
const DEPTS = { siparis: "Sipariş / Kargo", urun: "Ürün / Ölçü", magaza: "Mağaza", genel: "Genel" };

// bellek deposu (demo; sunucu yeniden başlarsa sıfırlanır)
const db = { tickets: [], msgs: [], convs: new Map(), notif: new Map(), waiting: new Map(), active: new Map() };
let seq = 1;

async function tg(method, body) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token()}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!j.ok) console.error("telegram", method, j.description);
    return j.result;
  } catch (e) { console.error("telegram", method, e.message); return null; }
}
const esc = (s) => String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

// Ela → ekip
async function escalate({ conv, question, dept = "genel", summary = "", product = "" }) {
  const t = { id: seq++, conv, dept, question, status: "bekliyor" };
  db.tickets.push(t);
  const text = `🟤 <b>Ela bir soru soruyor</b> · ${esc(DEPTS[dept] || dept)} · #${t.id}\n\n<b>Müşteri:</b> ${esc(question)}${product ? `\n<b>Ürün:</b> ${esc(product)}` : ""}${summary ? `\n\n<i>Sohbetten:</i>\n${esc(summary)}` : ""}`;
  for (const chat of chats()) {
    const m = await tg("sendMessage", { chat_id: chat, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✍️ Cevap yaz", callback_data: "c:" + t.id }, { text: "🙋 Konuşmayı devral", callback_data: "d:" + t.id }]] } });
    if (m) db.notif.set(`${chat}:${m.message_id}`, t.id);
  }
  return t;
}
const toCustomer = (conv, text, who = "staff") => db.msgs.push({ id: db.msgs.length + 1, conv, who, text });

// müşteri yazdı: konuşma ekipteyse Telegram'a gider, Ela susar
async function customerMessage(conv, text) {
  const c = db.convs.get(conv);
  if (!c || c.mode !== "insan") return false;
  await tg("sendMessage", { chat_id: c.chat, text: `💬 <b>Müşteri:</b> ${esc(text)}`, parse_mode: "HTML" });
  return true;
}
// sohbet penceresi ekipten gelenleri çeker
function poll(conv, since = 0) {
  return { msgs: db.msgs.filter((m) => m.conv === conv && m.id > (+since || 0)).map(({ id, who, text }) => ({ id, who, text })), mode: db.convs.get(conv)?.mode || "bot" };
}

async function handleUpdate(u) {
  if (u.callback_query) {
    const q = u.callback_query, chat = q.message.chat.id;
    if (!allowed(chat)) return tg("answerCallbackQuery", { callback_query_id: q.id, text: "Yetkiniz yok" });
    const [kind, id] = q.data.split(":");
    const t = db.tickets.find((x) => x.id === +id);
    if (!t || db.notif.get(`${chat}:${q.message.message_id}`) !== t.id) return tg("answerCallbackQuery", { callback_query_id: q.id, text: "Bu eski bir bildirim, işlem yapılamaz.", show_alert: true });
    if (kind === "d" && t.status === "devralindi") return tg("answerCallbackQuery", { callback_query_id: q.id, text: "Bu konuşmayı başka bir arkadaşınız devraldı.", show_alert: true });
    if (kind === "c") {
      await tg("answerCallbackQuery", { callback_query_id: q.id });
      const m = await tg("sendMessage", { chat_id: chat, text: `#${t.id} için cevabınızı <b>bu mesajı yanıtlayarak</b> yazın, müşterinin ekranına gidecek.`, parse_mode: "HTML", reply_markup: { force_reply: true, input_field_placeholder: "Müşteriye cevabınız…" } });
      if (m) db.waiting.set(`${chat}:${m.message_id}`, t.id);
    }
    if (kind === "d") {
      await tg("answerCallbackQuery", { callback_query_id: q.id, text: "Konuşma sizde" });
      db.convs.set(t.conv, { mode: "insan", chat: String(chat) });
      db.active.set(String(chat), t.conv);
      t.status = "devralindi";
      toCustomer(t.conv, "Butikten bir arkadaşımız sohbete katıldı, sorunuzu şimdi kendisi yanıtlayacak.", "system");
      await tg("sendMessage", { chat_id: chat, text: `🙋 #${t.id} konuşması sizde. Buraya yazdıklarınız müşterinin ekranına gider.\nEla'ya geri vermek için /bitir yazın.` });
    }
    return;
  }
  const m = u.message;
  if (!m || !m.text) return;
  const chat = m.chat.id;
  if (m.text.startsWith("/start")) return tg("sendMessage", { chat_id: chat, text: `Merhaba! Ben Örnek Butik'in dijital stil danışmanı Ela'nın bildirim botuyum.\nSohbet numaranız: ${chat}\n(Kurulumu yapan kişiye bu numarayı iletin.)` });
  if (!allowed(chat)) return;
  const activeConv = db.active.get(String(chat));
  if (m.text.startsWith("/bitir")) {
    if (!activeConv) return tg("sendMessage", { chat_id: chat, text: "Şu an devraldığınız bir konuşma yok." });
    db.convs.set(activeConv, { mode: "bot" }); db.active.delete(String(chat));
    toCustomer(activeConv, "Teşekkürler, ben Ela olarak devam ediyorum. Başka neye bakalım?", "system");
    return tg("sendMessage", { chat_id: chat, text: "✅ Konuşma Ela'ya geri verildi." });
  }
  if (m.reply_to_message) {
    const key = `${chat}:${m.reply_to_message.message_id}`;
    const tid = db.waiting.get(key) || db.notif.get(key);
    const t = tid && db.tickets.find((x) => x.id === tid);
    if (t) { toCustomer(t.conv, m.text); t.status = "cevaplandi"; return tg("sendMessage", { chat_id: chat, text: `✅ #${t.id} cevabınız müşteriye iletildi.` }); }
  }
  if (activeConv) toCustomer(activeConv, m.text);
}

let polling = false;
async function startPolling() {
  if (!token() || polling) return;
  polling = true;
  await tg("deleteWebhook", {});
  let offset = 0;
  console.log("Telegram: Ela'nın bildirim botu dinleniyor" + (enabled() ? "" : " (ELA_TG_CHAT_ID yok: sadece /start cevaplanır)"));
  for (;;) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token()}/getUpdates?timeout=25&offset=${offset}`).then((x) => x.json());
      for (const u of r.result || []) { offset = u.update_id + 1; handleUpdate(u).catch((e) => console.error("tg", e.message)); }
    } catch { await new Promise((z) => setTimeout(z, 3000)); }
  }
}
module.exports = { enabled, escalate, customerMessage, poll, handleUpdate, startPolling, DEPTS, _db: db };
