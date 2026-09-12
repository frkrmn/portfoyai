# Accessibility ve responsive regresyonları

`npm run test:a11y-responsive`, platform landing sayfasını ve sekiz public tema ailesinin ana sayfa, ilan listesi ve ilan detay route'larını 390×844 (mobil), 768×1024 (tablet) ve 1440×900 (desktop) viewport'larda gerçek Chrome render'ı üzerinde denetler.

Kontrol kapsamı:

- WCAG 2.0/2.1 A ve AA kuralları (`axe-core`); aşağıdaki belgeli istisna dışındaki `serious` ve `critical` ihlaller build'i durdurur.
- Yatay taşma ve `alt` niteliği eksik görseller.
- `prefers-reduced-motion: reduce` altında animasyon ve geçişlerin bastırılması.
- Tab ile ilk etkileşimli öğeye erişim, erişilebilir ad ve görünür focus state.

CI raporu `reports/accessibility/report.json` olarak artifact'e eklenir.

## Bilinen istisnalar

- `color-contrast`: Public temalarda renkler kullanıcı tarafından değiştirilebilir ve mevcut tema bileşenlerindeki bazı vurgu metni/CTA kombinasyonları AA oranını sağlamaz. Bulgular viewport ve DOM hedefleriyle JSON raporunda saklanır, ancak şimdilik CI'ı durdurmaz. Renk seçicide kontrast doğrulaması ve tema token'larının erişilebilir çiftlere dönüştürülmesi ayrı bir tasarım-system çalışmasıdır.
- `moderate` ve `minor` axe bulguları raporda tutulur, fakat CI'ı durdurmaz. Diğer tüm `serious` ve `critical` bulgular bloklayıcıdır.
- Turnstile, harita ve benzeri üçüncü taraf iframe'lerin kendi dokümanları axe tarafından çapraz-origin sınırı nedeniyle taranamaz. Uygulamanın iframe başlığı ve çevresindeki kontrol adı denetlenir.
- Auth gerektiren dashboard veri akışları mevcut browser E2E testlerinde ayrıca kapsanır. Bu suite platform landing ve bütün public tema ailelerinin kritik render/erişim regresyonlarına odaklanır.
