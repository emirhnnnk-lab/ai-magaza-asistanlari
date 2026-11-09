const fs = require("fs"), path = require("path");
module.exports = (req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "site=; Path=/; Max-Age=0", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(path.join(__dirname, "..", "vitrin.html")));
};
