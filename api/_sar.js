// Site sunucusunu Vercel fonksiyonuna sarar; HTML sayfalara "← Vitrin" düğmesi ekler.
const BTN = '<a href="/vitrin" style="position:fixed;left:0;top:42%;z-index:2147483647;background:#111;color:#fff;font:600 12px system-ui;padding:8px 10px 8px 8px;border-radius:0 14px 14px 0;text-decoration:none;opacity:.8">← Vitrin</a>';
module.exports = (server) => (req, res) => {
  let tur = ""; const wh = res.writeHead.bind(res);
  res.writeHead = (code, ...a) => { const h = a.find((x) => x && typeof x === "object"); if (h) { tur = String(h["Content-Type"] || h["content-type"] || ""); if (tur.includes("text/html")) { delete h["Content-Length"]; delete h["content-length"]; } } return wh(code, ...a); };
  const end = res.end.bind(res), write = res.write.bind(res), parca = [];
  const html = () => (tur || String(res.getHeader("content-type") || "")).includes("text/html");
  res.write = (c, ...a) => (html() ? (parca.push(Buffer.from(c)), true) : write(c, ...a));
  res.end = (c, ...a) => {
    if (!html()) return end(c, ...a);
    if (c && typeof c !== "function") parca.push(Buffer.from(c));
    let b = Buffer.concat(parca).toString("utf8");
    b = b.includes("</body>") ? b.replace("</body>", BTN + "</body>") : b + BTN;
    if (!res.headersSent) res.removeHeader("content-length");
    return end(b);
  };
  server.emit("request", req, res);
};
