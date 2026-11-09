// Resepsiyon / yönetim paneli: günlük takvim, randevu ekle-düzenle, durum, saat kapatma, hatırlatma kuyruğu.
// Aynı tarayıcıda site ile aynı depoyu paylaşır; sitede Ada'dan randevu düşünce takvim anında yenilenir.
import { SALON, HIZMETLER, UZMANLAR, tl } from './veri.js';
import { kayit, kaydet, uzmanBul, bosMu, dk, telSade, ARALIK, ornekYukle } from './kayit.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const gunYaz = (t) => new Date(t + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
const hz = (id) => HIZMETLER.find((h) => h.id === id);
const saatYaz = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const telNo = (t) => { const d = String(t).replace(/\D/g, ''); return d.startsWith('0') ? '9' + d : d.startsWith('90') ? d : '90' + d; };

const BAS = 10 * 60, SON = 21 * 60, PX = 48 / 30; // 30 dk = 48px
const RENK = ['#c9a08c', '#8e7a9c', '#b98872', '#7a5a66'];
let gun = iso(new Date());
let seciliId = null;
let acilanBekleme = new Set(); // iptalle yeri açılan bekleme kayıtları
let sonGorulen = new Set(kayit().randevular.map((r) => r.id));

/* ---------- giriş ---------- */
if (sessionStorage.getItem('lune_personel') === '1') $('#giris').remove();
$('#girisForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  if ($('#pin').value === '1234') { try { sessionStorage.setItem('lune_personel', '1'); } catch {} $('#giris').remove(); }
  else { $('#giris').classList.remove('hata'); void $('#giris').offsetWidth; $('#giris').classList.add('hata'); $('#pin').value = ''; }
});

function bildir(m) { const b = $('#bildirim'); b.textContent = m; b.classList.add('goster'); clearTimeout(bildir.t); bildir.t = setTimeout(() => b.classList.remove('goster'), 2600); }
const pazarMi = (t) => new Date(t + 'T12:00:00').getDay() === 0;

/* ---------- takvim ---------- */
function ciz() {
  const k = kayit();
  $('#gunAd').textContent = gunYaz(gun);
  const yuk = (SON - BAS) * PX;
  const gunun = k.randevular.filter((r) => r.tarih === gun);
  const yeniler = new Set(k.randevular.filter((r) => !sonGorulen.has(r.id)).map((r) => r.id));
  sonGorulen = new Set(k.randevular.map((r) => r.id));

  let html = `<div class="t-bas"></div>` + UZMANLAR.map((u, i) => {
    const say = gunun.filter((r) => r.uzman === u.ad && r.durum !== 'iptal').length;
    return `<div class="t-bas"><i style="background:${RENK[i]}">${u.ad[0]}</i><div><b>${u.ad}</b><small>${u.unvan.split(',')[0]} · ${say} randevu</small></div></div>`;
  }).join('');

  html += `<div class="t-saatler" style="height:${yuk}px">` + Array.from({ length: (SON - BAS) / 60 + 1 }, (_, i) => `<span style="top:${i * 60 * PX}px">${saatYaz(BAS + i * 60)}</span>`).join('') + '</div>';

  const simdi = new Date(), sDk = simdi.getHours() * 60 + simdi.getMinutes();
  for (const u of UZMANLAR) {
    html += `<div class="t-sutun" data-uzman="${u.ad}" style="height:${yuk}px">`;
    for (let m = BAS; m < SON; m += 30) html += `<div class="hucre" data-saat="${saatYaz(m)}" style="top:${(m - BAS) * PX}px"></div>`;
    if (pazarMi(gun)) html += `<div class="kapali" style="top:0;height:${60 * PX}px"></div><div class="kapali" style="top:${(18 * 60 - BAS) * PX}px;bottom:0"></div>`;
    for (const b of k.bloklar.filter((b) => b.tarih === gun && (b.uzman === u.ad || b.uzman === 'hepsi')))
      html += `<div class="blok" data-blok="${b.id}" style="top:${(dk(b.bas) - BAS) * PX}px;height:${(dk(b.bit) - dk(b.bas)) * PX - 2}px">${esc(b.not || 'Kapalı')} · ${b.bas}–${b.bit}<br><small>kaldırmak için tıklayın</small></div>`;
    for (const r of gunun.filter((r) => r.uzman === u.ad)) {
      const sure = hz(r.hid)?.sure || 60;
      html += `<div class="rdv ${r.durum} ${yeniler.has(r.id) ? 'yeni' : ''}" data-id="${r.id}" style="top:${(dk(r.saat) - BAS) * PX + 1}px;height:${sure * PX - 3}px">
        ${r.kaynak === 'Ada' ? '<span class="kaynak">Ada</span>' : ''}<b>${esc(r.ad)}</b><small>${r.saat} · ${esc(r.hizmet)}</small></div>`;
    }
    if (gun === iso(simdi) && sDk > BAS && sDk < SON) html += `<div class="simdi" style="top:${(sDk - BAS) * PX}px"></div>`;
    html += '</div>';
  }
  $('#takvim').innerHTML = html;
  yan(k);
  if (yeniler.size && document.visibilityState === 'visible') bildir(`Ada yeni randevu aldı: ${k.randevular.find((r) => yeniler.has(r.id))?.ad}`);
}

function yan(k) {
  const gunun = k.randevular.filter((r) => r.tarih === gun && r.durum !== 'iptal');
  const ciro = gunun.filter((r) => r.durum !== 'gelmedi').reduce((a, r) => a + r.tutar, 0);
  $('#ozet').innerHTML = `
    <div><span>Randevu</span><b>${gunun.length}</b></div>
    <div><span>Beklenen ciro</span><b>${tl(ciro)}</b></div>
    <div><span>Geldi</span><b>${gunun.filter((r) => r.durum === 'geldi').length}</b></div>
    <div><span>Gelmedi</span><b>${gunun.filter((r) => r.durum === 'gelmedi').length}</b></div>`;

  const simdi = new Date(), sDk = simdi.getHours() * 60 + simdi.getMinutes();
  const sira = gunun.filter((r) => r.durum === 'onayli' && (gun !== iso(simdi) || dk(r.saat) >= sDk - 15)).sort((a, b) => dk(a.saat) - dk(b.saat)).slice(0, 5);
  $('#siradaki').innerHTML = sira.map((r) => `<button class="satir" data-id="${r.id}"><span><b>${esc(r.ad)}</b><small>${esc(r.hizmet)} · ${r.uzman}</small></span><span class="s">${r.saat}</span></button>`).join('') || '<p class="bosyaz">Bekleyen randevu yok.</p>';

  const ar = { sabah: 'sabah', oglen: 'öğleden sonra', aksam: 'akşam', hepsi: 'her saat' };
  const bek = k.bekleme.filter((b) => b.tarih >= iso(new Date())).sort((a, b) => a.tarih.localeCompare(b.tarih) || a.olusturma - b.olusturma);
  $('#bekSay').textContent = bek.length ? `(${bek.length})` : '';
  $('#bekleme').innerHTML = bek.map((b) => {
    const msj = `Merhaba ${b.ad.split(' ')[0]}, ${SALON.ad}'dan yazıyoruz. ${gunYaz(b.tarih)} ${hz(b.hid).ad} için yer açıldı! Ayıralım mı?`;
    return `<div class="satir ${acilanBekleme.has(b.id) ? 'acildi' : ''}"><span><b>${esc(b.ad)}</b><small>${esc(hz(b.hid).ad)} · ${gunYaz(b.tarih).split(' ').slice(0, 3).join(' ')} · ${ar[b.aralik]}</small></span>
      <span style="display:flex;gap:4px"><a class="wa" target="_blank" rel="noopener" href="https://wa.me/${telNo(b.tel)}?text=${encodeURIComponent(msj)}">Haber ver</a><button class="wa gitti" data-bek-sil="${b.id}" title="Listeden çıkar">✓</button></span></div>`;
  }).join('') || '<p class="bosyaz">Bekleyen yok.</p>';

  const yarin = new Date(gun + 'T12:00:00'); yarin.setDate(yarin.getDate() + 1);
  const hat = k.randevular.filter((r) => r.tarih === iso(yarin) && r.durum === 'onayli');
  $('#hatSay').textContent = hat.length ? `(${hat.length})` : '';
  $('#hatirlatma').innerHTML = hat.map((r) => {
    const msj = `Merhaba ${r.ad.split(' ')[0]}, yarın ${r.saat}'te ${r.hizmet} randevunuzu hatırlatırız. ${SALON.ad} — gelemeyecekseniz bu mesaja "ertele" yazmanız yeterli.`;
    return `<div class="satir"><span><b>${esc(r.ad)}</b><small>${r.saat} · ${esc(r.hizmet)}</small></span>
      <a class="wa ${r.hatirlatildi ? 'gitti' : ''}" data-hat="${r.id}" target="_blank" rel="noopener" href="https://wa.me/${telNo(r.tel)}?text=${encodeURIComponent(msj)}">${r.hatirlatildi ? 'Gönderildi' : 'WhatsApp'}</a></div>`;
  }).join('') || '<p class="bosyaz">Yarın için randevu yok.</p>';
}

/* ---------- detay çekmecesi ---------- */
function detay(id) {
  const k = kayit(), r = k.randevular.find((x) => x.id == id);
  if (!r) return;
  seciliId = r.id;
  const gecmis = k.randevular.filter((x) => x.tel.replace(/\D/g, '') === r.tel.replace(/\D/g, '') && x.id !== r.id);
  const gelmedi = gecmis.filter((x) => x.durum === 'gelmedi').length;
  const h = hz(r.hid);
  $('#cekmece').innerHTML = `
    <button class="kapat" data-kapat>×</button>
    <span class="etiket-kucuk">${esc(r.kaynak)}</span>${gecmis.length ? `<span class="etiket-kucuk">${gecmis.length + 1}. ziyaret</span>` : '<span class="etiket-kucuk">Yeni müşteri</span>'}${gelmedi ? `<span class="etiket-kucuk" style="background:#f7e1e1;color:#c0504f">${gelmedi} kez gelmedi</span>` : ''}
    <h2>${esc(r.ad)}</h2><p class="tel">${esc(r.tel)}</p>
    <dl>
      <dt>Hizmet</dt><dd>${esc(r.hizmet)}${h ? ` · ${h.sure} dk` : ''}</dd>
      <dt>Tarih</dt><dd>${gunYaz(r.tarih)} ${r.saat}</dd>
      <dt>Uzman</dt><dd>${esc(r.uzman)}</dd>
      <dt>Tutar</dt><dd>${tl(r.tutar)}</dd>
      ${r.not ? `<dt>Not</dt><dd>${esc(r.not)}</dd>` : ''}
      ${h?.sonra && h.sonra !== '—' ? `<dt>Sonrası</dt><dd>${esc(h.sonra)}</dd>` : ''}
    </dl>
    ${paketHtml(k, r)}
    ${r.durum === 'geldi' ? sonrakiHtml(k, r) : ''}
    <div class="durum-btn">
      ${['geldi', 'gelmedi', 'iptal'].map((d) => `<button data-d="${d}" class="${r.durum === d ? 'on' : ''}">${{ geldi: 'Geldi', gelmedi: 'Gelmedi', iptal: 'İptal' }[d]}</button>`).join('')}
    </div>
    <button class="btn koyu" data-duzenle>Ertele / düzenle</button>
    <a class="btn cizgi" target="_blank" rel="noopener" href="https://wa.me/${telNo(r.tel)}?text=${encodeURIComponent(`Merhaba ${r.ad.split(' ')[0]}, ${SALON.ad}'dan yazıyoruz.`)}">WhatsApp'tan yaz</a>
    ${gecmis.length ? `<div class="gecmis"><h4 style="font-size:11px;letter-spacing:.15em;color:var(--soluk);font-weight:500">GEÇMİŞ</h4>${gecmis.map((x) => `<div><span>${esc(x.hizmet)}</span><small>${x.tarih.split('-').reverse().join('.')} · ${{ onayli: 'planlı', geldi: 'geldi', gelmedi: 'gelmedi', iptal: 'iptal' }[x.durum]}</small></div>`).join('')}</div>` : ''}`;
  $('#cekmece').classList.add('acik');
}
$('#cekmece').addEventListener('click', (e) => {
  if (e.target.closest('[data-kapat]')) { $('#cekmece').classList.remove('acik'); seciliId = null; return; }
  const d = e.target.closest('[data-d]');
  if (d) {
    let mesaj = '';
    kaydet((k) => {
      const r = k.randevular.find((x) => x.id === seciliId);
      r.durum = r.durum === d.dataset.d ? 'onayli' : d.dataset.d;
      const p = paketBul(k, r);
      if (p && r.durum === 'geldi' && !r.paketSayildi && p.kullanilan < p.toplam) { p.kullanilan++; r.paketSayildi = true; mesaj = ` · paket ${p.kullanilan}/${p.toplam}, müşteriye bildirim gitti`; }
      if (p && r.durum !== 'geldi' && r.paketSayildi) { p.kullanilan--; r.paketSayildi = false; }
      if (r.durum === 'iptal') {
        const kat = hz(r.hid)?.kat;
        const es = k.bekleme.filter((b) => b.tarih === r.tarih && hz(b.hid)?.kat === kat);
        es.forEach((b) => acilanBekleme.add(b.id));
        if (es.length) mesaj = ` · bekleme listesinde ${es.length} kişi var, haber verin`;
      }
    });
    ciz(); detay(seciliId);
    bildir({ geldi: 'Geldi işaretlendi', gelmedi: 'Gelmedi olarak işaretlendi', iptal: 'Randevu iptal edildi, saat boşaldı', onayli: 'Durum geri alındı' }[kayit().randevular.find((x) => x.id === seciliId).durum] + mesaj);
  }
  if (e.target.closest('[data-duzenle]')) form(kayit().randevular.find((x) => x.id === seciliId));
  const sn = e.target.closest('[data-sonraki]');
  if (sn) { const r = kayit().randevular.find((x) => x.id === seciliId); form({}, { hid: r.hid, uzman: r.uzman, saat: r.saat, tarih: sn.dataset.sonraki, ad: r.ad, tel: r.tel }); }
});

function paketBul(k, r) { return k.paketler.find((p) => telSade(p.tel) === telSade(r.tel) && p.hid === r.hid); }
function paketHtml(k, r) {
  const p = paketBul(k, r);
  if (!p) return '';
  return `<div class="pkt"><small>${esc(p.paket)}</small><div class="sayac">${Array.from({ length: p.toplam }, (_, i) => `<i class="${i < p.kullanilan ? 'ok' : ''}"></i>`).join('')}</div>
    <small>${p.kullanilan}/${p.toplam} kullanıldı · ${p.toplam - p.kullanilan} kaldı${p.kalan ? ` · kalan borç ${tl(p.kalan)}` : ''}</small></div>`;
}
function sonrakiHtml(k, r) {
  const ilerde = k.randevular.find((x) => telSade(x.tel) === telSade(r.tel) && x.hid === r.hid && x.tarih > r.tarih && x.durum === 'onayli');
  if (ilerde) return `<div class="sonraki ok">Sonraki seans ayarlı: <b>${gunYaz(ilerde.tarih)} ${ilerde.saat}</b></div>`;
  const d = new Date(r.tarih + 'T12:00:00'); d.setDate(d.getDate() + (ARALIK[r.hid] || 30));
  return `<div class="sonraki"><span>Müşteri daha buradayken bir sonraki seansı ayarlayın. Önerilen tarih: <b>${gunYaz(iso(d))}</b></span>
    <button class="btn koyu kucuk" data-sonraki="${iso(d)}">Sonraki seansı ayarla</button></div>`;
}

/* ---------- randevu formu ---------- */
const saatSec = (sec) => Array.from({ length: (SON - BAS) / 30 }, (_, i) => saatYaz(BAS + i * 30)).map((s) => `<option ${s === sec ? 'selected' : ''}>${s}</option>`).join('');

function form(r = {}, on = {}) {
  const yeni = !r.id;
  const hid = r.hid || on.hid || HIZMETLER[0].id;
  $('#pForm').innerHTML = `
    <h3>${yeni ? 'Yeni randevu' : 'Randevuyu düzenle'}</h3>
    <label class="tam">Müşteri adı<input name="ad" required value="${esc(r.ad || on.ad)}"></label>
    <label>Telefon<input name="tel" required inputmode="tel" value="${esc(r.tel || on.tel)}"></label>
    <label>Kaynak<select name="kaynak">${['Telefon', 'Kapıdan', 'Instagram', 'Ada'].map((x) => `<option ${x === (r.kaynak || 'Telefon') ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
    <label class="tam">Hizmet<select name="hid">${HIZMETLER.map((h) => `<option value="${h.id}" ${h.id === hid ? 'selected' : ''}>${h.ad} · ${h.sure} dk · ${tl(h.fiyat)}</option>`).join('')}</select></label>
    <label>Uzman<select name="uzman">${UZMANLAR.map((u) => `<option ${u.ad === (r.uzman || on.uzman || uzmanBul(hid)) ? 'selected' : ''}>${u.ad}</option>`).join('')}</select></label>
    <label>Tarih<input type="date" name="tarih" required value="${r.tarih || on.tarih || gun}"></label>
    <label>Saat<select name="saat">${saatSec(r.saat || on.saat || '10:00')}</select></label>
    <label>Tutar (TL)<input name="tutar" inputmode="numeric" value="${r.tutar ?? hz(hid).fiyat}"></label>
    <label class="tam">Not<input name="not" placeholder="Alerji, tercih, kahve…" value="${esc(r.not)}"></label>
    <p class="hata"></p>
    <div class="alt"><button type="button" class="btn cizgi kucuk" data-vazgec>Vazgeç</button><button class="btn koyu kucuk">${yeni ? 'Kaydet' : 'Güncelle'}</button></div>`;
  const f = $('#pForm');
  f.hid.onchange = () => { f.uzman.value = uzmanBul(f.hid.value); f.tutar.value = hz(f.hid.value).fiyat; };
  f.onsubmit = (e) => {
    e.preventDefault();
    const h = hz(f.hid.value);
    const v = { ad: f.ad.value.trim(), tel: f.tel.value.trim(), kaynak: f.kaynak.value, hid: h.id, hizmet: h.ad, uzman: f.uzman.value, tarih: f.tarih.value, saat: f.saat.value, tutar: Number(f.tutar.value) || h.fiyat, not: f.not.value.trim() };
    if (dk(v.saat) + h.sure > SON) return (f.querySelector('.hata').textContent = 'Hizmet kapanış saatini aşıyor.');
    if (!bosMu(kayit(), { tarih: v.tarih, saat: v.saat, sure: h.sure, uzman: v.uzman, haric: r.id }))
      return (f.querySelector('.hata').textContent = `${v.uzman} bu saatte dolu ya da saat kapalı.`);
    kaydet((k) => {
      if (yeni) k.randevular.unshift({ id: Date.now(), ...v, durum: 'onayli', wa: true, olusturma: Date.now() });
      else Object.assign(k.randevular.find((x) => x.id === r.id), v);
    });
    sonGorulen = new Set(kayit().randevular.map((x) => x.id));
    $('#pencere').hidden = true;
    gun = v.tarih; ciz();
    if (!yeni) detay(r.id);
    bildir(yeni ? 'Randevu eklendi, müşteriye onay mesajı hazır' : 'Randevu güncellendi');
  };
  $('#pencere').hidden = false;
  setTimeout(() => f.ad.focus(), 50);
}

function blokForm(on = {}) {
  $('#pForm').innerHTML = `
    <h3>Saat kapat</h3>
    <label class="tam">Kim için<select name="uzman"><option value="hepsi">Tüm klinik</option>${UZMANLAR.map((u) => `<option ${u.ad === on.uzman ? 'selected' : ''}>${u.ad}</option>`).join('')}</select></label>
    <label class="tam">Tarih<input type="date" name="tarih" value="${gun}"></label>
    <label>Başlangıç<select name="bas">${saatSec(on.saat || '13:00')}</select></label>
    <label>Bitiş<select name="bit">${saatSec('14:00')}<option>21:00</option></select></label>
    <label class="tam">Sebep<input name="not" placeholder="Öğle arası, izin, cihaz bakımı…" value="Öğle arası"></label>
    <p class="hata"></p>
    <div class="alt"><button type="button" class="btn cizgi kucuk" data-vazgec>Vazgeç</button><button class="btn koyu kucuk">Kapat</button></div>`;
  const f = $('#pForm');
  f.onsubmit = (e) => {
    e.preventDefault();
    if (dk(f.bit.value) <= dk(f.bas.value)) return (f.querySelector('.hata').textContent = 'Bitiş başlangıçtan sonra olmalı.');
    kaydet((k) => k.bloklar.push({ id: Date.now(), uzman: f.uzman.value, tarih: f.tarih.value, bas: f.bas.value, bit: f.bit.value, not: f.not.value.trim() }));
    $('#pencere').hidden = true; gun = f.tarih.value; ciz();
    bildir('Saat kapatıldı, Ada artık bu saati müşteriye önermeyecek');
  };
  $('#pencere').hidden = false;
}
$('#pencere').addEventListener('click', (e) => { if (e.target.id === 'pencere' || e.target.closest('[data-vazgec]')) $('#pencere').hidden = true; });

/* ---------- olaylar ---------- */
$('#takvim').addEventListener('click', (e) => {
  const r = e.target.closest('.rdv'); if (r) return detay(r.dataset.id);
  const b = e.target.closest('.blok');
  if (b) { if (confirm('Bu kapalı saati kaldırmak istiyor musunuz?')) { kaydet((k) => { k.bloklar = k.bloklar.filter((x) => x.id != b.dataset.blok); }); ciz(); } return; }
  const h = e.target.closest('.hucre');
  if (h) form({}, { uzman: h.parentElement.dataset.uzman, saat: h.dataset.saat, hid: HIZMETLER.find((x) => uzmanBul(x.id) === h.parentElement.dataset.uzman)?.id });
});
document.addEventListener('click', (e) => {
  const s = e.target.closest('.satir[data-id]'); if (s) { const r = kayit().randevular.find((x) => x.id == s.dataset.id); gun = r.tarih; ciz(); detay(r.id); }
  const bs = e.target.closest('[data-bek-sil]');
  if (bs) { kaydet((k) => { k.bekleme = k.bekleme.filter((x) => x.id != bs.dataset.bekSil); }); ciz(); return; }
  const w = e.target.closest('[data-hat]'); if (w) { kaydet((k) => { k.randevular.find((x) => x.id == w.dataset.hat).hatirlatildi = true; }); setTimeout(ciz, 300); }
});
const kaydir = (n) => { const d = new Date(gun + 'T12:00:00'); d.setDate(d.getDate() + n); gun = iso(d); ciz(); };
$('#geri').onclick = () => kaydir(-1);
$('#ileri').onclick = () => kaydir(1);
$('#bugun').onclick = () => { gun = iso(new Date()); ciz(); };
$('#yeniBtn').onclick = () => form();
$('#demoBtn').onclick = () => { if (confirm('Demo senaryosu yüklensin mi? Mevcut demo kayıtları silinir.')) { ornekYukle(); sonGorulen = new Set(kayit().randevular.map((r) => r.id)); gun = iso(new Date()); ciz(); bildir('Demo klinik günü yüklendi'); } };
$('#blokBtn').onclick = () => blokForm();
$('#ara').oninput = (e) => {
  const q = e.target.value.trim().toLocaleLowerCase('tr');
  $('#araSonuc').innerHTML = q.length < 2 ? '' : kayit().randevular.filter((r) => r.ad.toLocaleLowerCase('tr').includes(q) || r.tel.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'))
    .slice(0, 6).map((r) => `<button class="satir" data-id="${r.id}"><span><b>${esc(r.ad)}</b><small>${esc(r.hizmet)}</small></span><span class="s">${r.tarih.split('-').reverse().slice(0, 2).join('.')}</span></button>`).join('') || '<p class="bosyaz">Bulunamadı.</p>';
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#pencere').hidden = true; $('#cekmece').classList.remove('acik'); } });

// Site başka sekmede randevu alınca canlı yenile
window.addEventListener('storage', (e) => { if (e.key === 'lune_kayit_v1') { ciz(); if (seciliId) detay(seciliId); } });
setInterval(ciz, 60000);
ciz();
