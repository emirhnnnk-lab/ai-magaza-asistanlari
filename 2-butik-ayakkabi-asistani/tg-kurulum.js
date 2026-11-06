// Telegram kurulumu (Ela). 1) @BotFather → /newbot → token'ı .env'ye ELA_TG_TOKEN=... yazın
// 2) Butikte soruları cevaplayacak kişi(ler) Telegram'da bota "Başlat" (/start) desin  3) node tg-kurulum.js
// Bota yazanların sohbet numarasını bulur, .env'ye ELA_TG_CHAT_ID olarak yazar ve onlara deneme mesajı atar.
const fs = require("fs"), path = require("path");
const ENV = path.join(__dirname, ".env");
const env = fs.existsSync(ENV) ? fs.readFileSync(ENV, "utf8") : "";
const token = (env.match(/^ELA_TG_TOKEN=(.+)$/m) || [])[1]?.trim();
if (!token) { console.log("❌ Örnek Butik/.env içinde ELA_TG_TOKEN yok. Telegram'da @BotFather → /newbot → verdiği token'ı .env'ye ELA_TG_TOKEN=... diye ekleyin."); process.exit(1); }
const api = (m, b) => fetch(`https://api.telegram.org/bot${token}/${m}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) }).then((r) => r.json());
(async () => {
  const me = await api("getMe");
  if (!me.ok) { console.log("❌ Token geçersiz:", me.description); process.exit(1); }
  console.log(`✅ Bot: @${me.result.username}`);
  await api("deleteWebhook");
  const up = await api("getUpdates", { timeout: 0 });
  const found = new Map();
  for (const u of up.result || []) { const m = u.message; if (m && /^\/start/.test(m.text || "")) found.set(String(m.chat.id), [m.chat.first_name, m.chat.last_name].filter(Boolean).join(" ") || m.chat.username || "?"); }
  if (!found.size) { console.log(`⏳ Henüz kimse bota /start yazmamış. Telegram'da @${me.result.username} → Başlat, sonra bu komutu tekrar çalıştırın. (Sunucu açıksa önce kapatın.)`); process.exit(1); }
  for (const [id, name] of found) console.log(`   ${name}: ${id}`);
  const ids = [...found.keys()].join(",");
  const next = /^ELA_TG_CHAT_ID=.*$/m.test(env) ? env.replace(/^ELA_TG_CHAT_ID=.*$/m, "ELA_TG_CHAT_ID=" + ids) : env.replace(/\s*$/, "") + "\nELA_TG_CHAT_ID=" + ids + "\n";
  fs.writeFileSync(ENV, next);
  for (const id of found.keys()) await api("sendMessage", { chat_id: id, text: "✅ Kurulum tamam. Ela'nın bilmediği sorular artık buraya gelecek; altındaki butonlarla cevap yazabilir ya da konuşmayı devralabilirsiniz." });
  console.log(`✅ .env güncellendi: ELA_TG_CHAT_ID=${ids}`);
})();
