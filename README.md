# AI Mağaza Asistanları

Farklı sektörlerdeki işletmeler için geliştirdiğim **yapay zekâ destekli dijital asistanlı web siteleri**. Her biri gerçek bir işletme için hazırlandı; bu repoda marka adları (Örnek Moda, Örnek Butik, Örnek Kuyum, Örnek Güzellik), adres ve iletişim bilgileri genelleştirilmiştir.

| # | Proje | Sektör | Asistan ne yapıyor |
|---|---|---|---|
| 1 | [Moda Stil Danışmanı](1-moda-stil-danismani) | Kadın giyim e-ticaret | **Defne**: ürünleri görselli kartlarla gösterir, boy/kiloya göre beden önerir, kombin kurar, sohbetten sepete ekler |
| 2 | [Butik Ayakkabı Asistanı](2-butik-ayakkabi-asistani) | Ayakkabı butiği | Katalogdan ürün önerir, stok ve beden sorar, cevaplayamadığı soruyu Telegram ile ekibe aktarır |
| 3 | [Kuyum 3D Vitrin](3-kuyum-3d-vitrin) | Kuyumculuk | Three.js ile 3D ürün vitrini + ürün ve bakım sorularına cevap veren asistan |
| 4 | [Güzellik Randevu Asistanı](4-guzellik-randevu-asistani) | Güzellik merkezi | Hizmet danışmanlığı, randevu önerisi, müşteri ve yönetim panelleri |

## Ortak mimari
- **Sunucu:** Node.js (paket kurulumu gerektirmeyen, sade HTTP sunucusu)
- **LLM:** OpenAI API, tool-calling ile katalog arama, sepete ekleme, randevu gibi gerçek aksiyonlar
- **Güvenlik çerçevesi:** her projede asistanın uyması gereken kurallar ve bunları **API çağırmadan** doğrulayan sözleşme testleri (`contract-test.js`)
- **Önyüz:** Vanilla JS, CSS, Three.js (3D)

## Çalıştırma
Her klasörde:
```bash
# kök klasöre .env dosyası: OPENAI_API_KEY=...
node server.js        # Moda Stil Danışmanı için: node demo/server.js
```

## Notlar
- Ürün görselleri işletmelerin izniyle kullanılmıştır; Moda Stil Danışmanı'nda katalogun 40 ürünlük bir alt kümesi yer alır.
- 3D modeller (.glb) ticari kullanıma açık lisanslı kaynaklardan alınmıştır; telif ve atıf hakları ilgili sahiplerine aittir.

---
Geliştiren: **Emirhan Karaca**
