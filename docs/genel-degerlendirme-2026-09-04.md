# Fastate AI — Genel Ürün, Mimari ve Tasarım Değerlendirmesi

**Tarih:** 4 Eylül 2026  
**Kapsam:** Yazılım mimarisi, tasarım sistemi, landing page, prompt ile üretilen siteler ve SaaS dashboard

## Yönetici özeti

Ürün güçlü bir MVP seviyesine gelmiş durumda. Özellikle “bir prompt yaz → kişiselleştirilmiş emlak sitesi oluştur → dashboard’dan yönet” fikri net, pazarlanabilir ve tasarım dili sıradan SaaS ürünlerinden daha karakterli.

Bununla birlikte ürün şu anda üç farklı olgunluk seviyesini aynı anda taşıyor:

- Landing page görsel olarak güçlü ve satışa yakın.
- Üretilen siteler özellik olarak zengin, fakat performans ve içerik tutarlılığı sorunlu.
- Dashboard işlevsel bir yönetim paneli, fakat henüz gerçek bir günlük çalışma aracına dönüşmemiş.
- Teknik altyapı iyi organize edilmiş bir MVP; ölçeklenmeden önce ayrıştırılması gereken kritik alanlar var.

En önemli sorun performans. İnceleme sırasında canlı `portfoyai-yatirim` public API yanıtı yaklaşık **2,04 MB**, JavaScript bundle yaklaşık **1,06 MB** ve site API’sinin ilk cevabı yaklaşık **4 saniye**, toplam yüklemesi yaklaşık **5 saniye** sürdü. Headless tarayıcıda site 15 saniye içinde tamamlanamayarak “Site yükleniyor...” ekranında kaldı.

## 1. Yazılım mimarisi

### Güçlü taraflar

- Frontend, API ve veri katmanları anlaşılır biçimde ayrılmış.
- API yönlendirme merkezi bir route inventory üzerinden yönetiliyor.
- Site, ilan, lead, ekip, tema üretimi ve içerik çevirisi handler’ları tek sorumluluğa yakın.
- Supabase RLS ve kullanıcı sahipliği düşünülmüş.
- Public site endpoint’i ile dashboard endpoint’leri ayrılmış.
- Sekiz tema merkezi bir registry üzerinden seçiliyor.
- Tema içerik ve görsel şemaları ayrı tutuluyor.
- Platform TR/EN çevirileri ile generated-site çevirileri ayrı namespace kullanıyor.
- Tema üretiminde structured Gemini çıktısı kullanılıyor.
- Eski içerikler için tek seferlik çeviri ve cache mekanizması bulunuyor.
- Auth, tema seçimi, üretim, lokasyon, para birimi, i18n, editörler ve dashboard için iyi bir E2E test tabanı var.

### P0 — Taslak sitelerin public erişimi

`loadPublicSite()` siteyi slug ile buluyor ancak sorguda `status = published` kontrolü görünmüyor. Slug biliniyorsa taslak bir site public API üzerinden alınabilir.

Public sorguya yayın durumu eklenmeli:

```ts
.eq("slug", slug)
.eq("status", "published")
```

Dashboard preview için sahiplik doğrulamalı ayrı bir endpoint kullanılmalı.

### P0 — Base64 görsel mimarisi

Görseller `data:image/...;base64` olarak JSON ve veritabanında taşınıyor. Bunun sonuçları:

- Public site API cevabı çok büyüyor.
- JSON parse ve render süresi artıyor.
- Vercel function çıkışı ve Supabase satırları şişiyor.
- CDN resim cache’i ve gerçek görsel optimizasyonu kullanılamıyor.
- Dashboard PATCH gövdeleri megabayt seviyesine çıkıyor.
- Mobil ağlarda açılış ciddi biçimde yavaşlıyor.

Görseller Supabase Storage veya benzeri bir object storage’a taşınmalı. Veritabanında URL, boyut, alt metin ve sıralama tutulmalı. Hero, kart ve thumbnail varyantları WebP/AVIF olarak oluşturulmalı; `srcset` ve lazy loading kullanılmalı.

Bu değişiklik tek başına public site performansında en yüksek etkiyi üretir.

### P0 — Public AI backfill maliyet ve kötüye kullanım riski

Public ziyaretçi İngilizceye geçtiğinde Gemini backfill çağrısı tetiklenebiliyor. Cache mekanizması olsa da botlar çağrı başlatabilir; rate limit, maliyet kotası ve background job yok.

Öneri:

- Çevirileri üretim veya yayınlama aşamasında tamamlamak.
- Public request sırasında AI çağrısı yapmamak.
- Eski içerik backfill’ini authenticated dashboard veya background job üzerinden yürütmek.
- Rate limit ve idempotency eklemek.

### P0 — Lead spam koruması

Public lead endpoint’inde CAPTCHA, rate limit, honeypot ve duplicate kontrolü bulunmuyor. Minimum çözüm:

- Cloudflare Turnstile
- IP + site bazlı rate limit
- Honeypot alanı
- Aynı telefon/mesaj için kısa süreli duplicate kontrolü
- Yayında olmayan siteye lead gönderimini engelleme

### P1 — Monolitik frontend bundle

Production JavaScript bundle yaklaşık **1,06 MB**. Landing, dashboard, admin, sekiz template ve editörler aynı bundle’a girebiliyor.

Route-level lazy loading ve template-level dynamic import uygulanmalı. Public site ziyaretçisi dashboard kodunu, landing ziyaretçisi sekiz temanın tamamını indirmemeli.

### P1 — Büyük frontend dosyaları

- `src/portfoyai/views.tsx`: yaklaşık 1.100 satır
- `src/portfoyai/dashboard.tsx`: yaklaşık 847 satır
- `WarmEditorialTemplate.tsx`: yaklaşık 290 satır

Önerilen ayrım:

```text
portfoyai/
  landing/
  auth/
  generation/
  dashboard/
    overview/
    listings/
    leads/
    content/
    media/
    settings/
```

Dashboard veri yönetimi `useSites`, `useListings`, `useLeads`, `useTeamMembers`, `useSiteContent` ve `useSitePublishing` gibi hook’lara bölünmeli.

### P1 — React Query’nin kullanılmaması

TanStack Query dependency’si var fakat dashboard ağırlıklı olarak manuel `fetch`, `useEffect`, loading state’leri ve üç saniyelik polling kullanıyor. Query/mutation modeline geçilmesi cache invalidation, retry, optimistic update, cancellation ve background refresh’i merkezileştirir.

### P1 — JSONB içerik modelinin büyümesi

`theme_config` içinde colors, fonts, content, media, layout, fine tune ve i18n metadata birikiyor. Şunlar eklenmeli:

- `schema_version`
- Zod/Ajv ile server-side validation
- Versiyonlu migration fonksiyonları
- Template-specific schema
- AI çıktısı ve persistence şemasının ortak kaynaktan üretimi

### P1 — Birden fazla veri gerçeği

Headline, business name, tone, colors ve region gibi alanlar hem kolonlarda hem JSONB içinde bulunabiliyor. Tek source of truth belirlenmeli:

- Kimlik ve iletişim: normal kolonlar
- Tema anlatıları: versioned JSONB
- Görseller: storage ve medya tablosu
- Tema ayarları: doğrulanan JSONB

### P2 — Operasyonel kalite

- Public hata cevapları iç sistem detaylarını açığa çıkarmamalı.
- Centralized logging ve error tracking eklenmeli.
- AI maliyeti, gecikmesi ve hata oranı ölçülmeli.
- Build, lint, schema audit, i18n audit ve browser smoke testlerini çalıştıran CI kalite kapısı kurulmalı.

## 2. Tasarım sistemi ve sekiz tema

### Genel değerlendirme

Platformun koyu yeşil, kırık beyaz ve terracotta üzerine kurulu ana görsel dili güçlü. Büyük serif başlıklar, editoryal boşluk ve yuvarlatılmış kartlar premium fakat ulaşılabilir bir marka algısı oluşturuyor. Landing, login ve pricing aynı tasarım ailesinden geliyor.

Ancak dashboard ve temalarda aynı reçete sık tekrarlanıyor: büyük radius, pill buton, krem arka plan, koyu yeşil CTA ve serif/sans eşleşmesi. Tema farklılıkları yalnızca renk ve içerik değil, kompozisyon ve etkileşim seviyesine de taşınmalı.

### Warm Editorial

En zengin ve olgun tema. Hikâye anlatımı ve yaşam tarzı emlakçılığına uygun. Diğer temalarla kalite farkı oluşmaması için ortak kalite çıtası belirlenmeli. Uzun içerik ve büyük mobil başlıklar ayrıca test edilmeli.

### Bold Luxury

Koyu zemin ve premium tipografi doğru. Küçük altın/krem metinlerde kontrast kontrol edilmeli. Fotoğraf kalitesi düşük olduğunda lüks algısı hızlı bozulacağı için görsel kalite standardı zorunlu olmalı.

### Clean Modern

En güvenli genel amaçlı tema. Geniş kullanıcı kitlesine uygun fakat marka karakteri en zayıf tema olma riski taşıyor. Kullanıcının rengi ve görselleri dışında jenerik portal görünümünde kalmamalı.

### Neighborhood Friendly

Ürünün güçlü farklılaşma alanlarından biri. Mahalle kartlarına ulaşım, okul, park/sahil, fiyat aralığı ve yaşam tarzı gibi göstergeler eklenebilir. Harita entegrasyonu bu tema için özellikle değerlidir.

### Investment Focused

Stratejik olarak en değerli temalardan biri. Kira getirisi, değer artışı ve ROI metriklerinin kaynağı, tarihi ve tahmini olduğu açıkça gösterilmeli. Aksi halde güven ve hukuki risk oluşabilir.

### Urgent Deals

Dönüşüm odaklı yapı işlevli. Fazla aciliyet ve kırmızı/turuncu kullanımı güveni azaltabilir. “Acil” ve “fiyat düştü” durumları kullanıcı tarafından doğrulanmalı; indirim oranı veriden otomatik hesaplanmalı.

### Guided Match

En özgün deneyim. Gerçek ürün değerine dönüşmesi için cevaplar lead kaydına bağlanmalı; eşleşme skoru, eşleşme nedeni, danışman özeti ve paylaşılabilir sonuç eklenmeli.

### Land Plots

Hizmet, süreç ve ekip yapısıyla diğer temalardan farklı. Ada/parsel, imar, tapu, cephe, altyapı, koordinat, eğim, kullanım amacı ve belge alanları daha görünür hale getirilmeli.

### Tüm temalarda ortak ihtiyaçlar

- Uzun İngilizce başlık ve menü dayanıklılığı
- Tek ilan, çok ilan ve boş portföy senaryoları
- Eksik iletişim/görsel senaryoları
- 1–10 ekip üyesi senaryoları
- Ortak Header, Footer, ListingCard, Filters, ContactForm ve TeamSection altyapısı
- Klavye erişimi, focus state, kontrast, alt metin ve reduced-motion kontrolü

Tema dosyaları davranışı değil kompozisyonu tanımlamalı; ortak davranış shared component’lerde, görünüm theme token’larında tutulmalı.

## 3. Landing page ve prompt ile üretim

### Landing’in güçlü tarafları

- Değer önerisi ilk bakışta anlaşılıyor.
- Prompt kutusu ürünün merkezinde.
- Sağdaki önizleme kaliteli.
- Premium ve tutarlı marka dili var.
- TR/EN geçişi görünür.
- Ana CTA net.

### Landing’de eksikler

#### Gerçek ürün kanıtı

Landing’e gerçek müşteri siteleri, yayınlanan site sayısı, önce/sonra örnekleri, müşteri yorumları ve sekiz temalık canlı galeri eklenmeli.

#### Prompt rehberliği

Kullanıcıya bölge, uzmanlık, hedef müşteri ve istenen görünüm hakkında tıklanabilir örnekler sunulmalı. Prompt kalite göstergesi düşünülebilir.

#### Süreç beklentisi

Kullanıcı oluşturma öncesinde üyeliğin ne zaman gerektiğini, sürenin yaklaşık ne olduğunu, yayının otomatik olup olmadığını ve sonradan neleri değiştirebileceğini bilmeli.

Örnek mikro metin:

> Önizlemenizi ücretsiz oluşturun. Yayınlamadan önce tüm metin ve görselleri düzenleyebilirsiniz.

#### Pricing güveni

Pricing şu anda deneysel/fake-door seviyesinde. Gerçek checkout yoksa “Yakında”, “Erken erişim” veya “Bekleme listesine katıl” denmeli. Hazırmış gibi görünen fakat ödeme yapmayan upgrade akışı güven kaybettirir.

#### Marka tutarlılığı

Repo ve URL `portfoyai`, ürün ekranları “Fastate AI” kullanıyor. Domain, metadata, e-posta, generated-site branding ve destek kanalları tek marka stratejisine bağlanmalı.

### Prompt ile site oluşturma akışı

AI’ın template seçmesi sürtünmeyi azaltıyor. Ancak kullanıcı seçimin nedenini bilmiyor ve yanlış seçimde hızlı alternatif sunulmuyor.

Önerilen akış:

1. Prompt doğrulama
2. “Sizi şöyle anladık” özeti
3. Tema, hedef kitle ve bölge doğrulaması
4. Site üretimi
5. Kalite checklist’i
6. Önizleme
7. İletişim bilgileri doğrulama
8. Yayınlama

Üretim sonrasında “Investment Focused temasını şu nedenle seçtik” açıklaması gösterilmeli. “Başka tasarım dene”, “Daha sade yap”, “Daha premium yap” ve “Aynı içerikle tema değiştir” aksiyonları eklenmeli.

## 4. SaaS dashboard

### Güçlü taraflar

Dashboard ilan, içerik, görsel, lead, yayın, renk/font, ekip, AI ilan metni, sosyal medya görseli, AI ince ayar ve TR/EN içerik yönetimini kapsıyor. MVP kapsamı güçlü.

### Navigasyon

Desktop’ta sol sidebar ve üst yatay tab listesi aynı bölümleri tekrar ediyor. Desktop’ta sidebar ana navigasyon olmalı; yatay alan yalnızca modül alt navigasyonu olarak kullanılmalı.

Mobilde sidebar tamamen gizleniyor ve kullanıcı yatay scroll edilen pill butonlara kalıyor. Drawer, hamburger veya alt navigasyon eklenmeli.

### Overview

Ana ekran yalnızca sayısal özet değil, yapılacak işi göstermeli:

- Profil tamamlanma oranı
- Fotoğrafı eksik ilanlar
- Eksik İngilizce içerikler
- Son yedi gün lead sayısı
- Aranmamış lead’ler
- Yayın/domain/Maps eksikleri

### Lead yönetimi

Lead ekranı tablodan mini CRM’e dönüşmeli:

- Yeni / iletişime geçildi / randevu / kazanıldı / kaybedildi
- Sorumlu ekip üyesi
- Not ve hatırlatma
- WhatsApp, telefon ve e-posta aksiyonları
- İlgili ilan ve kaynak
- Filtreleme ve arama
- Gerçek CSV export
- Duplicate birleştirme

Üç saniyelik polling yerine Supabase Realtime veya daha kontrollü React Query refresh modeli kullanılmalı.

### Ayarlar bilgi mimarisi

Uzun tek sayfa şu gruplara ayrılmalı:

- Genel
- İletişim ve lokasyon
- Tasarım
- Ekip
- Yayın ve domain
- Dil ve SEO
- Gelişmiş

### Kaydetme ve yayınlama modeli

Kaydetme davranışı tutarlı değil. Otomatik taslak kaydı, “Kaydediliyor/Kaydedildi” durumu ve ayrı “Değişiklikleri yayınla” aksiyonu kullanılmalı.

Profesyonel modelde draft config, published config, preview, publish, rollback ve version history bulunmalı. Mevcut refine undo tüm site sürümleme ihtiyacını karşılamıyor.

### Eksik SaaS katmanları

- Stripe/Paddle abonelik, trial, upgrade/downgrade, fatura ve webhook sistemi
- Custom domain, DNS doğrulama ve SSL durumu
- SEO başlıkları, favicon, OG image, canonical, sitemap, robots ve structured data
- Site/ilan görüntülenmesi, dönüşüm ve trafik kaynağı analitiği
- Yeni lead için e-posta, WhatsApp ve browser bildirimleri
- Owner/editor/agent/viewer workspace rolleri
- İlk kullanım checklist’i, yardım merkezi ve destek

## Önceliklendirilmiş yapılacaklar

### P0 — Yayın öncesi

1. Taslak sitelerin public endpoint’ten erişimini kapat.
2. Base64 görselleri Supabase Storage’a taşı.
3. Public site API payload’ını küçült.
4. Route-level code splitting yap.
5. Lead endpoint’ine CAPTCHA ve rate limit ekle.
6. Public Gemini backfill çağrılarını dashboard/background job’a taşı.
7. Pricing’i gerçek ödeme sistemine bağla veya açıkça erken erişim yap.
8. Production performans testini CI’a ekle.

### P1 — Satılabilir SaaS

9. Draft/publish/version modeli kur.
10. Dashboard navigasyonunu sadeleştir ve mobil menü ekle.
11. Overview’a tamamlanma checklist’i ekle.
12. Lead modülünü mini CRM’e dönüştür.
13. Gerçek abonelik altyapısını tamamla.
14. Custom domain akışını ekle.
15. SEO yönetimi ekle.
16. Site ve ilan analitiği ekle.
17. Lead bildirimleri ekle.
18. Aynı içerikle tema değiştirme özelliği ekle.
19. AI’ın tema seçme nedenini göster.
20. Yayın öncesi kalite kontrolü ekle.

### P2 — Ölçek ve kalite

21. `views.tsx` ve `dashboard.tsx` dosyalarını modüllere ayır.
22. Veri yönetimini React Query’ye taşı.
23. Lead polling yerine Realtime kullan.
24. Tema ortak bileşenlerini merkezileştir.
25. `theme_config` için versioning ve runtime validation ekle.
26. Yinelenen kolon/JSONB alanlarını tek source of truth’a indir.
27. Responsive ve accessibility regression testleri yaz.
28. Uzun İngilizce içerik testleri ekle.
29. Logging, error tracking ve AI maliyet takibi ekle.
30. CI/CD kalite kapısı oluştur.
31. Landing’e gerçek müşteri kanıtı ve site galerisi ekle.
32. Workspace rolleri ve ekip davetlerini planla.

## Önerilen uygulama sırası

### Sprint 1 — Hız ve güvenlik

1. Public draft açığını kapatma
2. Storage migration
3. API payload küçültme
4. Code splitting
5. Lead spam koruması

### Sprint 2 — Ürün deneyimi

1. Draft/publish modeli
2. Dashboard navigasyonu
3. Onboarding checklist
4. Lead pipeline
5. Tema değiştirme

### Sprint 3 — Gelir

1. Gerçek billing
2. Custom domain
3. Analytics
4. SEO
5. Bildirimler

## Sonuç

Ürünün tasarım kalitesi satışa yakın ve özellik kapsamı güçlü. Yeni özellik eklemeden önce public site performansı, storage mimarisi, taslak site güvenliği ve gerçek yayınlama modeli çözülmeli. En yüksek kaldıraçlı teknik çalışma base64 görsel sisteminin kaldırılmasıdır.
