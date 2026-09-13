# Site ve ilan analitiği — gizlilik ve trafik filtreleme

Fastate yalnızca `site_view`, `listing_view` ve `lead_conversion` olaylarını toplar. Kayıtlar siteye; uygun olduğunda ilana ve dönüşümü oluşturan lead'e bağlanır. Tam URL, ham IP adresi, tam referrer, user-agent veya ziyaretçinin iletişim bilgileri analitik tablosuna yazılmaz.

Oturum kimliği günlük, sunucu taraflı ve salt eklenmiş SHA-256 hash'e dönüştürülür. UTM değerleri 120 karakterle sınırlandırılır; referrer yalnızca alan adı olarak tutulur. Raporlar site sahibinin kimliği doğrulandıktan sonra son 30 günlük toplu sayılar halinde sunulur. RLS, ham event erişimini ilgili site sahibine sınırlar.

Tarayıcıda Do Not Track etkinse event gönderilmez. Sunucu ayrıca DNT başlığını ve bilinen bot/crawler/headless/Lighthouse user-agent'larını filtreler. Dashboard içindeki `previewSiteId` önizlemeleri event üretmez; böylece danışmanın kendi düzenleme trafiği rapora karışmaz. Aynı oturumun aynı site/ilanı aynı gün tekrar açması `event_key` ile tekilleştirilir.

`ANALYTICS_HASH_SECRET` production ortamında uzun ve rastgele bir değer olmalıdır. Tanımlı değilse mevcut `LEAD_IP_HASH_SECRET` kullanılır.
