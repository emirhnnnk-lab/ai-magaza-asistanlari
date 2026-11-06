// Deniz arayüzü — sohbet paneli. Önce LLM'e (/api/deniz) sorar; ulaşılamazsa kural tabanlı yedek beyinle cevap verir.
import { DenizBeyin } from './deniz-beyin.js';
import { fiyatYaz } from './urunler.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// LLM metni: **kalın** ve paragraflar; HTML'e güvenli çeviri
const md = (s) => esc(s.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');

export class Deniz {
  constructor({ urunler, aktif, goster, kucukResim }) {
    Object.assign(this, { urunler, aktif, goster, kucukResim });
    this.beyin = new DenizBeyin();
    this.gecmis = [];        // {rol:'u'|'d', metin}
    this.acildi = false;
    this.mesgul = false;
    this.el = {
      root: document.querySelector('#deniz'),
      log: document.querySelector('#denizLog'),
      chips: document.querySelector('#denizChips'),
      form: document.querySelector('#denizForm'),
      input: document.querySelector('#denizInput'),
    };
    this.el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = this.el.input.value.trim();
      if (v) { this.el.input.value = ''; this.sor(v); }
    });
    document.querySelector('#denizClose').onclick = () => this.close();
    this.el.chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.sor(b.textContent); });
    this.el.log.addEventListener('click', (e) => { const c = e.target.closest('[data-goster]'); if (c) this.goster(c.dataset.goster); });
  }

  open(soru) {
    document.body.classList.add('deniz-open');
    this.el.root.setAttribute('aria-hidden', 'false');
    const aktifId = this.aktif()?.id;
    // müşteri henüz yazmadıysa ve ürün değiştiyse karşılamayı yenile
    if (this.acildi && !this.gecmis.some((m) => m.rol === 'u') && this.karsilananUrun !== aktifId) {
      this.acildi = false;
      this.gecmis = [];
      this.el.log.innerHTML = '';
    }
    if (!this.acildi) {
      this.acildi = true;
      this.karsilananUrun = aktifId;
      const k = this.beyin.karsilama(this.aktif()?.id);
      this.yaz(k.metin.map((m) => `<p>${m}</p>`).join(''));
      this.gecmis.push({ rol: 'd', metin: k.metin.join(' ').replace(/<[^>]+>/g, '') });
      if (!soru) this.cipler(k.cipler);
    }
    if (soru) setTimeout(() => this.sor(soru), this.gecmis.length > 1 ? 0 : 500);
    else setTimeout(() => this.el.input.focus({ preventScroll: true }), 500);
  }
  close() {
    document.body.classList.remove('deniz-open');
    this.el.root.setAttribute('aria-hidden', 'true');
  }

  async sor(metin) {
    if (this.mesgul) return;
    this.mesgul = true;
    this.cipler([]);
    this.yaz(esc(metin), 'u');
    this.gecmis.push({ rol: 'u', metin });
    const yaziyor = this.yaz('<div class="typing"><i></i><i></i><i></i></div>');
    const aktif = this.aktif()?.id;
    const t0 = performance.now();

    let cevap;
    try {
      const r = await fetch('api/deniz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesajlar: this.gecmis, aktif }),
      });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (!j.metin) throw new Error('boş');
      cevap = { html: j.metin.split(/\n{2,}/).map((p) => `<p>${md(p)}</p>`).join(''), duz: j.metin, kartlar: j.kartlar || [], goster: j.goster };
    } catch (e) {
      // yedek: kural tabanlı beyin (LLM'siz, kartlardan)
      const b = this.beyin.yanit(metin, aktif);
      await new Promise((r) => setTimeout(r, Math.max(0, 500 + b.metin.join(' ').length * 6 - (performance.now() - t0))));
      cevap = { html: b.metin.map((m) => `<p>${m}</p>`).join(''), duz: b.metin.join(' ').replace(/<[^>]+>/g, ''), kartlar: b.kartlar, goster: b.goster };
    }

    yaziyor.remove();
    const kart = cevap.kartlar.slice(0, 3).map((id) => this.kart(id)).join('');
    this.yaz(cevap.html + kart);
    this.gecmis.push({ rol: 'd', metin: cevap.duz });
    if (cevap.goster && cevap.goster !== aktif) this.goster(cevap.goster);
    const odak = this.urunler.find((u) => u.id === (cevap.goster || aktif));
    this.cipler(this.beyin.cipler(odak));
    this.mesgul = false;
  }

  kart(id) {
    const p = this.urunler.find((u) => u.id === id);
    if (!p) return '';
    return `<button class="card" data-goster="${p.id}"><img src="${this.kucukResim(p.id)}" alt=""><span><b>${p.ad}</b><small>${p.tas ? p.tas.ozet : p.maden.ayar + ' ' + p.maden.renk} · ${fiyatYaz(p.fiyat)}</small></span></button>`;
  }

  yaz(html, kim = 'd') {
    const m = document.createElement('div');
    m.className = `msg ${kim}`;
    m.innerHTML = html;
    this.el.log.appendChild(m);
    this.el.log.scrollTop = this.el.log.scrollHeight;
    return m;
  }

  cipler(list) {
    this.el.chips.innerHTML = (list || []).map((c) => `<button type="button">${esc(c)}</button>`).join('');
  }
}
