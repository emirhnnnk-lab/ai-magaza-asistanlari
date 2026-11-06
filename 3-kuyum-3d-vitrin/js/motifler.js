// Her ürünün arkasındaki duvar motifi: ürünün dokusundan/tasarımından gelen ince, çizgisel desen.
// Hepsi 1600×1000 bir tuvalde üretilir, ekrana "slice" ile yayılır. Renk/opaklık CSS'te (.motif).

const W = 1600, H = 1000, CX = 800, CY = 500;
const f = (n) => Math.round(n * 10) / 10;
const svg = (body, sw = 1) => `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
const circle = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const line = (x1, y1, x2, y2) => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
const poly = (pts, close = true) => `<path d="M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}${close ? 'Z' : ''}"/>`;
const ring = (n, r, x = CX, y = CY, rot = 0, sy = 1) =>
  Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * Math.PI * 2; return [x + Math.cos(a) * r, y + Math.sin(a) * r * sy]; });

// Brilyant kesimin üstten görünüş şeması (tabla, yıldız, kite, alt kuşak faseteleri)
function brilyant(x, y, r, sy = 1) {
  let s = '';
  const table = ring(8, r * 0.5, x, y, Math.PI / 8, sy);
  const star = ring(8, r * 0.72, x, y, 0, sy);
  const girdle = ring(16, r, x, y, 0, sy);
  s += poly(table);
  s += poly(girdle);
  for (let i = 0; i < 8; i++) {
    const t1 = table[i], t2 = table[(i + 1) % 8], st = star[(i + 1) % 8];
    s += poly([t1, st, t2], false);
    s += line(st[0], st[1], girdle[(i * 2 + 2) % 16][0], girdle[(i * 2 + 2) % 16][1]);
    s += line(t1[0], t1[1], girdle[(i * 2 + 1) % 16][0], girdle[(i * 2 + 1) % 16][1]);
    s += line(st[0], st[1], girdle[(i * 2 + 1) % 16][0], girdle[(i * 2 + 1) % 16][1]);
    s += line(st[0], st[1], girdle[(i * 2 + 3) % 16][0], girdle[(i * 2 + 3) % 16][1]);
  }
  return s;
}

const M = {
  // Üç taş: üç brilyant şeması yan yana + geçmiş/bugün/gelecek için yayılan halkalar
  trilogy() {
    let s = brilyant(CX, CY, 260) + brilyant(CX - 470, CY + 20, 170) + brilyant(CX + 470, CY + 20, 170);
    for (let i = 1; i <= 9; i++) s += circle(CX, CY, 260 + i * 70);
    return svg(s, 0.9);
  },

  // Saat: kadran çentikleri, eş merkezli halkalar, kenarlarda kordon baklaları
  saat() {
    let s = '';
    for (const r of [180, 300, 420, 560, 720]) s += circle(CX, CY, r);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, L = i % 5 ? 22 : 60;
      s += line(CX + Math.cos(a) * 420, CY + Math.sin(a) * 420, CX + Math.cos(a) * (420 + L), CY + Math.sin(a) * (420 + L));
    }
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      s += line(CX + Math.cos(a) * 560, CY + Math.sin(a) * 560, CX + Math.cos(a) * 572, CY + Math.sin(a) * 572);
    }
    // akrep-yelkovan 10:10
    s += line(CX, CY, CX + Math.cos(-2.6) * 200, CY + Math.sin(-2.6) * 200);
    s += line(CX, CY, CX + Math.cos(-0.55) * 300, CY + Math.sin(-0.55) * 300);
    // bakla dizisi (sol ve sağ kenar)
    for (const x0 of [40, 1420]) for (let y = -20; y < H; y += 70) {
      s += `<rect x="${x0}" y="${y}" width="60" height="58" rx="10"/><rect x="${x0 + 70}" y="${y + 35}" width="60" height="58" rx="10"/>`;
    }
    return svg(s, 0.9);
  },

  // Saray çinisi: dört yapraklı (quatrefoil) kafes ve lale motifleri
  mineli() {
    let s = '';
    const step = 160;
    for (let y = -step; y < H + step; y += step) for (let x = -step; x < W + step; x += step) {
      const r = step / 4;
      s += `<path d="M${x} ${y - r * 2}C${x + r * 1.6} ${y - r * 2} ${x + r * 1.6} ${y - r * 0.4} ${x} ${y}C${x - r * 1.6} ${y - r * 0.4} ${x - r * 1.6} ${y - r * 2} ${x} ${y - r * 2}Z"/>`;
      s += `<path d="M${x} ${y + r * 2}C${x + r * 1.6} ${y + r * 2} ${x + r * 1.6} ${y + r * 0.4} ${x} ${y}C${x - r * 1.6} ${y + r * 0.4} ${x - r * 1.6} ${y + r * 2} ${x} ${y + r * 2}Z"/>`;
      s += `<path d="M${x - r * 2} ${y}C${x - r * 2} ${y - r * 1.6} ${x - r * 0.4} ${y - r * 1.6} ${x} ${y}C${x - r * 0.4} ${y + r * 1.6} ${x - r * 2} ${y + r * 1.6} ${x - r * 2} ${y}Z"/>`;
      s += `<path d="M${x + r * 2} ${y}C${x + r * 2} ${y - r * 1.6} ${x + r * 0.4} ${y - r * 1.6} ${x} ${y}C${x + r * 0.4} ${y + r * 1.6} ${x + r * 2} ${y + r * 1.6} ${x + r * 2} ${y}Z"/>`;
      // aralarda küçük lale
      const lx = x + step / 2, ly = y + step / 2;
      s += `<path d="M${lx} ${ly + 22}L${lx} ${ly - 4}M${lx} ${ly - 4}C${lx - 14} ${ly - 8} ${lx - 14} ${ly - 26} ${lx - 8} ${ly - 30}C${lx - 4} ${ly - 20} ${lx} ${ly - 20} ${lx} ${ly - 30}C${lx} ${ly - 20} ${lx + 4} ${ly - 20} ${lx + 8} ${ly - 30}C${lx + 14} ${ly - 26} ${lx + 14} ${ly - 8} ${lx} ${ly - 4}"/>`;
    }
    return svg(s, 0.8);
  },

  // Örgü: birbirine sarılan iki ip — üst üste binen dalgalar
  alyans() {
    let s = '';
    for (let row = 0; row < 9; row++) {
      const y0 = 60 + row * 115;
      for (const ph of [0, Math.PI]) for (const off of [-9, 0, 9]) {
        const pts = [];
        for (let x = -40; x <= W + 40; x += 16) pts.push([x, y0 + off + Math.sin(x / 70 + ph) * 34]);
        s += poly(pts, false);
      }
    }
    return svg(s, 0.8);
  },

  // Tektaş: dev tek bir brilyant şeması, tırnakları ve ışık çizgileri
  tektas() {
    let s = brilyant(CX, CY, 400);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      s += `<path d="M${f(CX + Math.cos(a) * 395)} ${f(CY + Math.sin(a) * 395)}c${f(Math.cos(a) * 30)} ${f(Math.sin(a) * 30)} ${f(Math.cos(a) * 50 - Math.sin(a) * 18)} ${f(Math.sin(a) * 50 + Math.cos(a) * 18)} ${f(Math.cos(a) * 55)} ${f(Math.sin(a) * 55)}"/>`;
    }
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      s += line(CX + Math.cos(a) * 470, CY + Math.sin(a) * 470, CX + Math.cos(a) * (i % 2 ? 620 : 900), CY + Math.sin(a) * (i % 2 ? 620 : 900));
    }
    return svg(s, 0.9);
  },

  // Oniks Gece: kelepçenin ritmi — dikey bantlar, segmentler ve kabaşon noktalar
  kelepce() {
    let s = '';
    const bw = 120;
    for (let x = 0; x < W + bw; x += bw) {
      s += line(x, 0, x, H);
      for (let y = (x / bw) % 2 ? 0 : 60; y < H; y += 120) {
        s += `<rect x="${x + 18}" y="${y + 10}" width="${bw - 36}" height="100" rx="6"/>`;
        s += circle(x + bw / 2, y + 60, 12);
        s += circle(x + bw / 2, y + 60, 5);
      }
    }
    return svg(s, 0.8);
  },

  // Antik Mühür: el oyması arabesk kıvrımlar ve mühür halkaları
  muhur() {
    let s = '';
    const spiral = (x, y, r, dir) => {
      const pts = [];
      for (let t = 0; t < Math.PI * 4; t += 0.15) { const rr = r * (1 - t / (Math.PI * 4.4)); pts.push([x + Math.cos(t * dir) * rr, y + Math.sin(t * dir) * rr]); }
      return poly(pts, false);
    };
    for (let y = 0; y < H + 200; y += 200) for (let x = (y / 200) % 2 ? 100 : 0; x < W + 200; x += 200) {
      s += spiral(x, y, 70, (x / 100 + y / 200) % 2 ? 1 : -1);
      s += `<path d="M${x + 70} ${y}C${x + 100} ${y - 60} ${x + 140} ${y - 60} ${x + 160} ${y - 20}"/>`;
      s += `<path d="M${x + 120} ${y - 45}c10 -20 30 -22 38 -10c-14 4 -26 8 -38 10z"/>`;
    }
    for (const r of [300, 330, 450]) s += circle(CX, CY, r);
    return svg(s, 0.8);
  },

  // Kraliçe: büyük oval brilyant şeması ve dışa doğru eliptik halkalar
  oval() {
    let s = brilyant(CX, CY, 330, 0.72);
    for (let i = 1; i <= 10; i++) s += `<ellipse cx="${CX}" cy="${CY}" rx="${330 + i * 75}" ry="${f((330 + i * 75) * 0.72)}"/>`;
    return svg(s, 0.9);
  },

  // Pavé: sık dizilmiş küçük taşlar — petek düzeninde halkalar ve minik yıldızlar
  pave() {
    let s = '';
    const r = 26, dx = r * 2.1, dy = r * 1.82;
    for (let j = 0, y = 0; y < H + dy; j++, y += dy) for (let x = j % 2 ? dx / 2 : 0; x < W + dx; x += dx) {
      s += circle(x, y, r);
      s += poly(ring(8, r * 0.45, x, y, Math.PI / 8));
    }
    return svg(s, 0.7);
  },

  // Tanzanit: Kilimanjaro eteklerinin yükselti eğrileri (topoğrafik çizgiler)
  tanzanit() {
    let s = '';
    const peaks = [[1250, 260, 1], [380, 720, 0.8], [900, 950, 0.6]];
    for (const [px, py, k] of peaks) for (let i = 1; i <= 16; i++) {
      const R = i * 46 * k, pts = [];
      for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.08) {
        const w = 1 + 0.16 * Math.sin(a * 3 + i * 0.5) + 0.08 * Math.sin(a * 5 - i);
        pts.push([px + Math.cos(a) * R * w * 1.25, py + Math.sin(a) * R * w * 0.85]);
      }
      s += poly(pts, false);
    }
    return svg(s, 0.8);
  },
};

const cache = {};
export const motif = (id) => (cache[id] ??= M[id] ? M[id]() : '');
