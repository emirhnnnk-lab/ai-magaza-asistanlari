// Katalog: arama, kart, aile (aynı modelin renkleri), ürün bilgi kartı. Kısıtlar burada zorla uygulanır.
const fs = require("fs");
const path = require("path");
const S = require("./shoe");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/products/products.json"), "utf8"));
const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
const TL = (n) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
const short = (p) => `${p.model} ${p.color_label ? p.color_label.toLowerCase() : ""} ${S.TYPE_TR[p.type]}`.replace(/\s+/g, " ").trim(); // "Rivell siyah rugan topuklu ayakkabı"
const n = (x) => String(x).replace(".", ","); // 3.5 → "3,5"
const heelTxt = (p) => (p.heel_conflict ? `${n(Math.min(...p.heel_conflict))}–${n(Math.max(...p.heel_conflict))} cm (ürün bilgisinde iki farklı ölçü)` : p.heel_cm != null ? `${n(p.heel_cm)} cm` : null);

// Ticimax orijinalleri ~5 MB: CDN'in boyutlandırma adresi kullanılır
const rs = (u) => String(u || "");  // görseller yerel: public/img/urun/
const card = (p) => ({ slug: p.slug, name: p.name, short: short(p), model: p.model, price: p.price, img: rs(p.images[0]), img2: rs(p.images[1] || p.images[0]), type: p.type, type_tr: p.type_tr,
  color: p.color, color_label: p.color_label, heel: heelTxt(p), heel_cm: p.heel_cm, sizes: p.sizes, in_stock: p.in_stock, fit: p.fit, url: p.url, yeni: p.lists.includes("Yeni Sezon"), warm: p.warm_lining });

// modele gidecek kısa bilgi (token tasarrufu)
const slim = (p) => ({ slug: p.slug, ad: short(p), fiyat: p.price, renk: p.color_label, topuk: heelTxt(p), topuk_tipi: p.heel_type, malzeme: p.outer, astar: p.lining, taban: p.sole,
  kalip: p.fit || "bilgi yok", stoktaki_numaralar: S.stockSizes(p).join(", ") || "yok", ...(p.calf_cm ? { baldir_cap_cm: p.calf_cm, baldir_not: p.calf_note } : {}),
  ...(p.shaft_cm ? { konc_cm: p.shaft_cm } : {}), ...(p.siblings.length ? { diger_renkler: p.siblings.map((s) => bySlug[s]?.color_label).filter(Boolean).join(", ") } : {}) });

const family = (p) => [p, ...p.siblings.map((s) => bySlug[s]).filter(Boolean)];

function search(a = {}, C = {}) {
  const c = { ...C };
  if (a.type) c.type = a.type;
  if (a.color) c.colors = [a.color];
  if (a.max_price) c.maxPrice = Math.min(a.max_price, c.maxPrice || Infinity);
  if (a.max_heel != null) c.maxHeel = a.max_heel;
  if (a.min_heel != null) c.minHeel = a.min_heel;
  const q = S.norm(a.query || "").split(/\s+/).filter((w) => w.length > 2);
  let pool = products.filter((p) => p.in_stock && !S.violations(p, c).length);
  // aynı modelin birden çok rengi sonucu doldurmasın: önce her aileden bir ürün
  const seenModel = new Set(), first = [], rest = [];
  const scored = pool.map((p) => ({ p, s: q.reduce((s, w) => s + (S.norm(p.name).includes(w) ? 1 : 0), 0) + (p.lists.includes("Yeni Sezon") ? 0.3 : 0) - (c.cheap ? p.price / 10000 : 0) }))
    .sort((x, y) => y.s - x.s);
  for (const { p } of scored) (seenModel.has(p.model + p.type) ? rest : (seenModel.add(p.model + p.type), first)).push(p);
  const res = [...first, ...rest].slice(0, a.limit || 6);
  res.total = pool.length;
  return res;
}

// müşterinin istediği tür için katalogda gerçekte ne var (model uydurmasın diye)
function facts(C = {}) {
  if (!C.type) return "";
  const all = products.filter((p) => p.type === C.type || (C.type === "topuklu" && p.type === "stiletto"));
  if (!all.length) return `KATALOG: ${S.TYPE_TR[C.type]} şu an katalogda yok.`;
  const inS = all.filter((p) => p.in_stock);
  const colors = [...new Set(inS.map((p) => p.color).filter(Boolean))];
  const heels = inS.map((p) => p.heel_cm).filter((x) => x != null);
  const prices = inS.map((p) => p.price);
  const fit = C.size ? inS.filter((p) => S.hasSize(p, C.size)).length : null;
  return `KATALOG (${S.TYPE_TR[C.type]}): stokta ${inS.length} ürün; renkler: ${colors.join(", ")}; topuk ${Math.min(...heels)}–${Math.max(...heels)} cm; fiyat ${TL(Math.min(...prices))} – ${TL(Math.max(...prices))}.${fit != null ? ` ${C.size} numarası stokta olan: ${fit}.` : ""} Burada olmayan renk/ölçü YOKTUR.`;
}

module.exports = { n, rs, products, bySlug, card, slim, short, family, search, facts, heelTxt, TL };
