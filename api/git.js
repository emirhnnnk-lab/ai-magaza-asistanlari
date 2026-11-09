// /git/<site> → çerezi yaz, sitenin anasayfasına git. Siteler kendi mutlak yollarını (/api, /img…) kullanmaya devam eder.
const OK = ["moda", "butik", "kuyum", "guzellik", "dis"];
module.exports = (req, res) => {
  const s = (/\/git\/(\w+)/.exec(req.url) || [])[1];
  if (!OK.includes(s)) { res.writeHead(302, { Location: "/" }); return res.end(); }
  res.writeHead(302, { Location: "/", "Set-Cookie": `site=${s}; Path=/; SameSite=Lax; Max-Age=86400`, "Cache-Control": "no-store" });
  res.end();
};
