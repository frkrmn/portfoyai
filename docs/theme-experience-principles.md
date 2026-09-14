# Fastate AI tema deneyimi ilkeleri

Bu belge sekiz aktif temanın yalnız renk/font tokenlarıyla değil, kompozisyon ve etkileşim modeliyle nasıl ayrıştığını tanımlar. Warm Editorial içerik ritmi, okunabilirlik, eksik görsel fallback'i ve responsive kalite için tabandır; diğer temalar onu kopyalamaz.

| Tema | Kompozisyon | Bilgi yoğunluğu ve tipografi | Birincil etkileşim | Görsel/fallback karakteri |
|---|---|---|---|---|
| Warm Editorial | Dergi akışı, asimetrik hikâye blokları | Havadar, serif ve uzun okuma | Hikâye içinde gezinme, sayfalama | Editoryal kırpma, sakin renk yüzeyi |
| Bold Luxury | Tam ekran sinematik sahne | Büyük uppercase başlık, odaklı az bilgi | Hero içinde doğrudan talep | Düşük doygunluk/yüksek kontrast, koyu placeholder |
| Clean Modern | Düzenli katalog grid'i | Yoğun, sans-serif, hızlı tarama | Önce filtreleme | Tutarlı 4:3 katalog kırpması, nötr yüzey |
| Neighborhood Friendly | Yerel rehber ve insan odaklı bölümler | Havadar, sıcak ve konuşkan | Mahalle keşfi, doğrudan iletişim | Portrede üst odak, baş harfli fallback |
| Investment Focused | Veri terminali ve metrik bantları | Yoğun, tabular sayılar | Kart/karşılaştırma görünümü | Analitik grid yüzeyi, veri odaklı placeholder |
| Urgent Deals | Akış/feed ve fırsat şeritleri | Yoğun, güçlü ağırlık/hızlı tarama | Aciliyet ve fiyat düşüşü tarama | Enerjik hareket, fırsat rozetleri |
| Guided Match | Adımlı danışmanlık yolculuğu | Odaklı, soru-cevap ritmi | İhtiyacı yanıtla ve eşleş | Yumuşak yüzeyler, seçim durumları |
| Land Plots | Parsel/ölçüm kompozisyonu | Odaklı teknik bilgi, serif vurgu | Alt tipe göre inceleme, modal talep | Topografik çizgi dokusu, kare geometri |

## Kontrollü ortak sözleşme

`fineTuneAttributes` her tema köküne `data-template`, `data-composition`, `data-interaction`, `data-density`, `data-geometry` ve `data-media-treatment` verir. Ortak lead, ekip, footer ve erişilebilirlik davranışları değişmez. Yeni varyantlar yalnız bu sınırlı sözlük üzerinden eklenir; tema dosyalarında serbest biçimli global override oluşturulmaz.

Uzun metinler bütün temalarda `overflow-wrap` ve sınırlandırılmış genişlikle korunur. Görseller yüklenirken veya eksikken tema yüzeyi görünür kalır; insan odaklı temada portre odağı, sinematik temada kontrast, katalog temasında oran tutarlılığı sürer. Hover/scale hareketleri `prefers-reduced-motion` kuralına tabidir.
