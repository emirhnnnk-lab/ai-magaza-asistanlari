// Örnek Diş Kliniği — sayfa + Ada sohbet paneli. Önce LLM'e (/api/ela) sorar; ulaşılamazsa yedek beyinle cevap verir.
import { SALON, KATEGORILER, HIZMETLER, PAKETLER, UZMANLAR, tl, musaitSaatler } from './veri.js';
import { yedekYanit } from './yedek.js';
import { kayit, kaydet, uzmanBul, bosMu } from './kayit.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = (s) => esc(s.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const hizmet = (id) => HIZMETLER.find((h) => h.id === id);
const paket = (id) => PAKETLER.find((p) => p.id === id);
const isoYerel = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const gunYaz = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

/* ---------------- Reklam ölçümü ---------------- */
// Ziyaretçi Meta reklamından mı geldi? (fbclid ya da utm_source) Oturum boyunca hatırlanır, randevuya yazılır.
const KANAL = (() => {
  const q = new URLSearchParams(location.search);
  let k = null;
  if (q.get('fbclid') || /facebook|instagram|meta|ig|fb/i.test(q.get('utm_source') || '')) k = 'Meta reklam';
  else if (q.get('utm_source')) k = q.get('utm_source');
  try { if (k) sessionStorage.setItem('lotus_kanal', k); return sessionStorage.getItem('lotus_kanal') || 'Organik'; } catch { return k || 'Organik'; }
})();
// Meta Pixel olayı (pixel kuruluysa). Randevu = Schedule, analiz = Lead, Ela ile konuşma = Contact
const piksel = (olay, veri) => { try { window.fbq?.('track', olay, veri); } catch {} };

/* ---------------- Sayfa ---------------- */
$('#fAdres').textContent = SALON.adres;
$('#fSaat').textContent = SALON.saatler;
$('#fTel').textContent = SALON.telefon;

let aktifKat = 'genel';
function sekmeler() {
  $('#sekmeler').innerHTML = KATEGORILER.map((k) => `<button data-k="${k.id}" class="${k.id === aktifKat ? 'on' : ''}">${k.ad}</button>`).join('');
  $('#kartlar').innerHTML = HIZMETLER.filter((h) => h.kat === aktifKat).map((h) => `
    <article class="kart">
      ${h.etiket ? `<span class="etiket">${h.etiket}</span>` : ''}
      <h3>${h.ad}</h3>
      <p>${h.ozet}</p>
      <div class="meta"><span class="fiyat">${tl(h.fiyat)}</span><span class="sure">${h.sure} dk</span></div>
      <button class="btn cizgi kucuk" data-ela="${esc(h.ad)} için randevu almak istiyorum">Saat seç</button>
    </article>`).join('');
}
$('#sekmeler').onclick = (e) => { const b = e.target.closest('button'); if (b) { aktifKat = b.dataset.k; sekmeler(); } };
sekmeler();

$('#paketGrid').innerHTML = PAKETLER.map((p, i) => `
  <div class="paket ${i === 0 ? 'vurgu' : ''}">
    <p class="ust">${p.id === 'aile' ? 'Üyelik' : 'Paket'}</p>
    <h3>${p.ad}</h3>
    <ul>${p.icerik.map((x) => `<li>${x}</li>`).join('')}</ul>
    <div><span class="f">${tl(p.fiyat)}</span><s>${tl(p.normal)}</s></div>
    <small>${p.not}</small>
    <button class="btn koyu" data-ela="${esc(p.ad)} hakkında bilgi almak istiyorum">Ada'ya danış</button>
  </div>`).join('');

const renkler = ['#5fb3bb,#22747d', '#7fa6c9,#2f5f8a', '#8cc7b0,#2f7a63', '#9db0c7,#3c4f6b'];
$('#ekipGrid').innerHTML = UZMANLAR.map((u, i) => `
  <div class="uzman"><div class="foto" style="background:linear-gradient(160deg,${renkler[i]})">${u.ad[0]}</div><h3>${u.ad}</h3><p>${u.unvan}</p></div>`).join('');

/* ---------------- Şikayet testi ---------------- */
const SORULAR = [
  { s: 'Sizi buraya getiren ne?', k: 'dert', c: [['Ağrı / hassasiyet', 'Sıcak-soğuk, ısırınca', 'agri'], ['Eksik diş', 'Çekilmiş ya da kırık', 'eksik'], ['Görünüm', 'Renk, şekil, gülüş', 'estetik'], ['Çapraşık dişler', 'Kendim ya da çocuğum için', 'orto']] },
  { s: 'Ne zamandır böyle?', k: 'sure', c: [['Bugün başladı', 'Şiddetli', 'acil'], ['Birkaç gündür', 'Gelip gidiyor', 'yakin'], ['Uzun zamandır', 'Erteledim', 'uzun'], ['Şikayet yok', 'Kontrol istiyorum', 'kontrol']] },
  { s: 'Kim için bakıyorsunuz?', k: 'kim', c: [['Kendim', '', 'ben'], ['Çocuğum', '2–12 yaş', 'cocuk'], ['Ailem', 'Birkaç kişi', 'aile'], ['Henüz bilmiyorum', '', 'ben']] },
];
const cevaplar = {};
function quiz(i = 0) {
  const q = $('#quiz');
  if (i < SORULAR.length) {
    const s = SORULAR[i];
    q.innerHTML = `<p class="adim">Soru ${i + 1} / ${SORULAR.length}</p><h3>${s.s}</h3>
      <div class="secenek">${s.c.map(([a, b, v]) => `<button data-v="${v}">${a}<small>${b}</small></button>`).join('')}</div>`;
    q.querySelectorAll('button').forEach((b) => (b.onclick = () => { cevaplar[s.k] = b.dataset.v; quiz(i + 1); }));
    return;
  }
  const rota = [hizmet(cevaplar.kim === 'cocuk' ? 'cocuk-muayene' : 'muayene')];
  const ana = { agri: 'kanal', eksik: 'implant', estetik: 'gulus', orto: cevaplar.kim === 'cocuk' ? 'braket' : 'plak' }[cevaplar.dert];
  if (ana) rota.push(hizmet(ana));
  if (cevaplar.kim === 'aile') rota.push(paket('aile'));
  const acil = cevaplar.dert === 'agri' && cevaplar.sure === 'acil';
  const ozet = `Şikayet testim: ${{ agri: 'ağrı/hassasiyet', eksik: 'eksik diş', estetik: 'görünüm', orto: 'çapraşık dişler' }[cevaplar.dert]}, ${{ acil: 'bugün başladı', yakin: 'birkaç gündür', uzun: 'uzun zamandır', kontrol: 'şikayet yok' }[cevaplar.sure]}. ${acil ? 'Ağrım şiddetli, bugün muayene olabilir miyim?' : 'Muayene randevusu almak istiyorum.'}`;
  kaydet((k) => { k.analizler++; });
  piksel('Lead', { content_name: 'Şikayet testi' });
  q.innerHTML = `<div class="sonuc"><p class="adim">${acil ? 'Öncelikli' : 'Size özel yol'}</p><h3>${acil ? '<em>Bugün</em> bakalım' : 'İlk adım: <em>ücretsiz</em> muayene'}</h3>
    ${acil ? '<p style="font-size:14px;color:#f4c9c9;margin:0 0 16px">Şiddetli ağrı, şişlik ya da ateş varsa lütfen kliniği arayın; aynı gün muayene için öncelik veriyoruz.</p>' : ''}
    <div class="rota">${rota.map((r) => `<div><b>${r.ad}</b><span>${r.sure ? r.sure + ' dk · ' : ''}${tl(r.fiyat)}</span></div>`).join('')}</div>
    <p style="font-size:13px;color:#bcd0d4;margin:-10px 0 20px">Kesin tedavi ve fiyat, muayeneden sonra yazılı tedavi planında netleşir. Bu test teşhis değildir.</p>
    <div class="butonlar"><button class="btn acik" id="quizRandevu">Ada ile saat seç</button><button class="btn cizgi" id="quizTekrar">Yeniden başla</button></div></div>`;
  $('#quizRandevu').onclick = () => ela.ac(ozet);
  $('#quizTekrar').onclick = () => quiz(0);
}
quiz();

/* ---------------- Ela ---------------- */
class Ela {
  constructor() {
    this.gecmis = [];
    this.mesgul = false;
    this.log = $('#elaLog');
    $('#elaForm').onsubmit = (e) => { e.preventDefault(); const v = $('#elaInput').value.trim(); if (v) { $('#elaInput').value = ''; this.sor(v); } };
    $('#elaKapat').onclick = () => this.kapat();
    $('#elaFab').onclick = () => this.ac();
    $('#elaCip').onclick = (e) => { const b = e.target.closest('button'); if (b) this.sor(b.textContent); };
    this.log.addEventListener('click', (e) => this.tikla(e));
  }

  ac(soru) {
    document.body.classList.add('ela-acik');
    $('#ela').setAttribute('aria-hidden', 'false');
    $('#elaDurt').hidden = true;
    if (!this.gecmis.length) {
      kaydet((k) => { k.sohbetler++; });
      piksel('Contact');
      const saat = new Date().getHours();
      const selam = saat < 12 ? 'Günaydın' : saat < 18 ? 'İyi günler' : 'İyi akşamlar';
      const m = `${selam}, ben Ada. Randevu, fiyat ya da hangi tedavinin ne olduğu… ne merak ediyorsanız buradayım.`;
      this.yaz(`<p>${m}</p>`);
      this.gecmis.push({ rol: 'd', metin: m });
      if (!soru) this.cipler(['Ücretsiz muayene saati', 'Dişim ağrıyor', 'İmplant fiyatı', 'Sigorta geçiyor mu?']);
    }
    if (soru) setTimeout(() => this.sor(soru), this.gecmis.length > 1 ? 0 : 450);
    else setTimeout(() => $('#elaInput').focus({ preventScroll: true }), 300);
  }
  kapat() { document.body.classList.remove('ela-acik'); $('#ela').setAttribute('aria-hidden', 'true'); }

  async sor(metin) {
    if (this.mesgul) return;
    this.mesgul = true;
    this.cipler([]);
    this.yaz(esc(metin), 'u');
    this.gecmis.push({ rol: 'u', metin });
    kaydet((k) => { k.mesajlar++; k.sorular.unshift({ t: Date.now(), metin: metin.slice(0, 140) }); k.sorular = k.sorular.slice(0, 30); });
    const yaziyor = this.yaz('<div class="typing"><i></i><i></i><i></i></div>');
    const t0 = performance.now();
    let c;
    try {
      const r = await fetch('api/ela', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesajlar: this.gecmis, baglam: `Bugün yerel tarih ${isoYerel(new Date())}, saat ${new Date().toTimeString().slice(0, 5)}` }) });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (!j.metin && !j.slot) throw new Error('boş');
      c = { html: (j.metin || 'Size uyan saate dokunmanız yeterli.').split(/\n{2,}/).map((p) => `<p>${md(p)}</p>`).join(''), duz: j.metin, kartlar: j.kartlar || [], slot: j.slot, ekip: j.ekip };
    } catch {
      const b = yedekYanit(metin, this.gecmis);
      await new Promise((r) => setTimeout(r, Math.max(0, 600 - (performance.now() - t0))));
      c = { html: `<p>${b.metin}</p>`, duz: b.metin.replace(/<[^>]+>/g, ''), kartlar: b.kartlar || [], slot: b.slot };
    }
    yaziyor.remove();
    const ekipHtml = c.ekip ? `<div style="margin-top:10px;padding:10px 12px;border-radius:12px;font-size:12.5px;line-height:1.4;background:${c.ekip.oncelik === 'acil' ? '#fdecec' : '#e6f3f4'};color:${c.ekip.oncelik === 'acil' ? '#9b1c1c' : '#1f5662'}"><b>${c.ekip.oncelik === 'acil' ? '⚠ ACİL · ' : ''}Ekibe iletildi</b><br>“${esc(c.ekip.ozet)}”<br><span style="opacity:.75">Gerçek kurulumda sekreterin WhatsApp/Telegram ekranına düşer; cevap buraya gelir.</span></div>` : '';
    this.yaz(c.html + ekipHtml + c.kartlar.slice(0, 3).map((id) => this.kart(id)).join('') + (c.slot ? this.slotHtml(c.slot) : ''));
    this.gecmis.push({ rol: 'd', metin: c.duz || '' });
    this.cipler(c.slot ? ['Başka bir gün', 'Fiyatı ne kadar?'] : c.kartlar.length ? ['Boş saatleri göster', 'Tedavi sonrası ne yapmalıyım?'] : ['Ücretsiz muayene saati', 'Sigorta geçiyor mu?']);
    this.mesgul = false;
  }

  kart(id) {
    const h = hizmet(id), p = paket(id);
    if (h) return `<button class="mkart" data-saat="${h.id}"><span><b>${h.ad}</b><small>${h.sure} dk · ${tl(h.fiyat)}</small></span><span class="ok">Saat seç →</span></button>`;
    if (p) return `<button class="mkart" data-paket="${p.id}"><span><b>${p.ad}</b><small>${tl(p.fiyat)} <s>${tl(p.normal)}</s></small></span><span class="ok">İncele →</span></button>`;
    return '';
  }

  slotHtml({ hizmet: hid, tarih, saatler }) {
    const h = hizmet(hid), k = kayit(), uzman = uzmanBul(hid);
    // kliniğin girdiği randevular ve kapatılan saatler düşülür
    saatler = saatler.filter((saat) => bosMu(k, { tarih, saat, sure: h.sure, uzman }));
    const bekle = `<button class="bekle-btn" data-bekle="${hid}|${tarih}">Uymadı mı? Yer açılırsa haber verelim</button>`;
    if (!saatler.length) return `<div class="slotlar"><small>${gunYaz(tarih)} dolu görünüyor.</small>${bekle}</div>`;
    return `<div class="slotlar" data-h="${hid}" data-t="${tarih}"><small>${h.ad} · ${gunYaz(tarih)}</small>
      <div>${saatler.map((s) => `<button data-slot="${s}">${s}</button>`).join('')}</div>${bekle}</div>`;
  }

  tikla(e) {
    const t = e.target;
    const s = t.closest('[data-saat]');
    if (s) {
      const yarin = new Date(); if (new Date().getHours() >= 17) yarin.setDate(yarin.getDate() + 1);
      const tarih = isoYerel(yarin);
      this.yaz(`<p>${hizmet(s.dataset.saat).ad} için en yakın boş saatler:</p>` + this.slotHtml({ hizmet: s.dataset.saat, tarih, saatler: musaitSaatler(tarih, s.dataset.saat) }));
      return;
    }
    const pk = t.closest('[data-paket]');
    if (pk) { this.kapat(); location.hash = 'paketler'; return; }
    const bk = t.closest('[data-bekle]');
    if (bk) return this.bekleForm(...bk.dataset.bekle.split('|'));
    const sl = t.closest('[data-slot]');
    if (sl) {
      const kap = sl.closest('.slotlar');
      kap.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sl));
      this.form(kap.dataset.h, kap.dataset.t, sl.dataset.slot);
    }
  }

  form(hid, tarih, saat) {
    this.log.querySelector('.rform')?.closest('.msg')?.remove();
    const h = hizmet(hid);
    const m = this.yaz(`<p><b>${h.ad}</b>, ${gunYaz(tarih)} ${saat}. Sadece adınız ve telefonunuz kaldı:</p>
      <form class="rform">
        <input name="ad" placeholder="Adınız soyadınız" required autocomplete="name">
        <input name="tel" placeholder="05xx xxx xx xx" required inputmode="tel" autocomplete="tel">
        <input name="kod" placeholder="İndirim kodu (opsiyonel)" value="">
        <label><input type="checkbox" name="wa" checked> WhatsApp'tan hatırlatma ve kampanya bildirimi almak istiyorum</label>
        <button class="btn koyu kucuk">Randevuyu onayla</button>
      </form>`);
    const f = m.querySelector('form');
    f.ad.focus({ preventScroll: true });
    f.onsubmit = (e) => {
      e.preventDefault();
      if (f.tel.value.replace(/\D/g, '').length < 10) { f.tel.setCustomValidity('Lütfen 10 haneli telefon numaranızı yazın'); f.tel.reportValidity(); f.tel.oninput = () => f.tel.setCustomValidity(''); return; }
      const ilk = f.kod.value.trim().toUpperCase() === 'ILKMUAYENE';
      const tutar = Math.round(h.fiyat * (ilk ? 0.85 : 1));
      const r = { id: Date.now(), ad: f.ad.value.trim(), tel: f.tel.value.trim(), hizmet: h.ad, hid, tarih, saat, tutar, wa: f.wa.checked, kaynak: 'Ada', kanal: KANAL, uzman: uzmanBul(hid), durum: 'onayli', olusturma: Date.now() };
      if (!bosMu(kayit(), { tarih, saat, sure: h.sure, uzman: r.uzman })) { m.remove(); this.yaz('<p>Çok üzgünüm, bu saat az önce doldu. Başka bir saat seçebilir misiniz?</p>'); return; }
      kaydet((k) => { k.randevular.unshift(r); });
      piksel('Schedule', { value: tutar, currency: 'TRY', content_name: h.ad });
      m.remove();
      this.yaz(`<div class="onay"><b>Randevunuz hazır, ${esc(r.ad.split(" ")[0])}!</b>
        <p>${h.ad} · ${gunYaz(tarih)} ${saat}<br>${ilk ? `İndirimli tutar: <b>${tl(tutar)}</b> <s style="opacity:.6">${tl(h.fiyat)}</s>` : tl(tutar)}</p>
        <small>${r.wa ? 'Randevudan 24 saat önce WhatsApp hatırlatması gelecek. ' : ''}12 saat öncesine kadar ücretsiz iptal.</small>
        <a href="${this.ics(r, h)}" download="lotus-randevu.ics">Takvime ekle</a></div>`);
      const not = h.sonra && h.sonra !== '—' ? ` Küçük bir not: ${h.sonra.toLowerCase()}.` : '';
      const m2 = `Sizi ağırlamak için sabırsızlanıyoruz.${not} Gelirken kahvenizi nasıl içtiğinizi söylerseniz hazır olur.`;
      this.yaz(`<p>${m2}</p>`);
      this.gecmis.push({ rol: 'd', metin: `Randevu oluşturuldu: ${h.ad} ${tarih} ${saat}. ${m2}` });
      this.cipler(['Sade Türk kahvesi', 'Oat latte', 'Bir arkadaşımı da getirebilir miyim?']);
    };
  }

  // Bekleme listesi: iptal olunca resepsiyon panelinde ilk sırada bu müşteri görünür
  bekleForm(hid, tarih) {
    const h = hizmet(hid);
    const m = this.yaz(`<p>${gunYaz(tarih)} için <b>${h.ad}</b> bekleme listesine yazayım; bir iptal olduğunda WhatsApp'tan ilk size haber verilir.</p>
      <form class="rform">
        <input name="ad" placeholder="Adınız soyadınız" required autocomplete="name">
        <input name="tel" placeholder="05xx xxx xx xx" required inputmode="tel" autocomplete="tel">
        <select name="aralik"><option value="hepsi">Günün herhangi bir saati</option><option value="sabah">Sabah</option><option value="oglen">Öğleden sonra</option><option value="aksam">Akşam (17:00 sonrası)</option></select>
        <button class="btn koyu kucuk">Listeye yaz</button>
      </form>`);
    const f = m.querySelector('form');
    f.onsubmit = (e) => {
      e.preventDefault();
      kaydet((k) => k.bekleme.push({ id: Date.now(), ad: f.ad.value.trim(), tel: f.tel.value.trim(), hid, tarih, aralik: f.aralik.value, olusturma: Date.now() }));
      m.remove();
      const ad = esc(f.ad.value.trim().split(' ')[0]);
      this.yaz(`<p>Listeye yazdım, ${ad}. Yer açılınca size haber vereceğiz. O gün için şu an ${kayit().bekleme.filter((b) => b.tarih === tarih).length}. sıradasınız.</p>`);
      this.gecmis.push({ rol: 'd', metin: `Müşteri ${tarih} ${h.ad} için bekleme listesine yazıldı.` });
    };
  }

  ics(r, h) {
    const [y, mo, d] = r.tarih.split('-'), [hh, mm] = r.saat.split(':');
    const bas = `${y}${mo}${d}T${hh}${mm}00`;
    const bit = new Date(+y, mo - 1, +d, +hh, +mm + h.sure);
    const son = `${bit.getFullYear()}${String(bit.getMonth() + 1).padStart(2, '0')}${String(bit.getDate()).padStart(2, '0')}T${String(bit.getHours()).padStart(2, '0')}${String(bit.getMinutes()).padStart(2, '0')}00`;
    const txt = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${bas}\nDTEND:${son}\nSUMMARY:Örnek Diş Kliniği · ${h.ad}\nLOCATION:${SALON.adres}\nEND:VEVENT\nEND:VCALENDAR`;
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(txt);
  }

  yaz(html, kim = 'd') {
    const m = document.createElement('div');
    m.className = `msg ${kim}`;
    m.innerHTML = html;
    this.log.appendChild(m);
    this.log.scrollTop = this.log.scrollHeight;
    return m;
  }
  cipler(l) { $('#elaCip').innerHTML = l.map((c) => `<button type="button">${esc(c)}</button>`).join(''); }
}

const ela = new Ela();
document.addEventListener('click', (e) => { const b = e.target.closest('[data-ela]'); if (b) ela.ac(b.dataset.ela); });
$('#heroSor').onsubmit = (e) => { e.preventDefault(); const v = $('#heroInput').value.trim(); ela.ac(v || undefined); $('#heroInput').value = ''; };

// Kararsız ziyaretçiye nazik dürtme (20 sn sonra, bir kez)
setTimeout(() => { if (!ela.gecmis.length) $('#elaDurt').hidden = false; }, 20000);
$('#elaDurt .x').onclick = () => ($('#elaDurt').hidden = true);
kaydet((k) => { k.ziyaret++; });
// Seanslarım sayfasından gelen istek: index.html#ela=...
if (location.hash.startsWith('#ela=')) { const q = decodeURIComponent(location.hash.slice(5)); history.replaceState(null, '', location.pathname); setTimeout(() => ela.ac(q), 300); }
