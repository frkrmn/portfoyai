# Site alanları source of truth

`sites` kayıtlarında aynı değerin hem kolonda hem `theme_config` içinde saklanması sona ermiştir. API geçiş uyumluluğu için eski alanları response sırasında türetebilir; bu alanlar kalıcı ikinci bir kaynak değildir.

| Alan | Kalıcı kaynak | Not |
| --- | --- | --- |
| `business_name` | `sites.business_name` | Site/marka kimliği |
| `phone`, `email`, `address`, `map_url` | `sites` normal kolonları | İletişim kimliği |
| `region_focus` ve id tabanlı lokasyon | `sites` normal kolonları | Aranabilir/yapısal konum |
| `headline`, `bio`/`tone`, diğer metinler | `theme_config.content` | Dil varyantlarını koruyan versioned anlatı |
| Renk, font ve layout | `theme_config.colors/fonts/layout` | Uygulama katmanında doğrulanan tema ayarları |
| Görseller | Supabase Storage | `theme_config.media` yalnız URL/reference saklar |

## Geçiş sözleşmesi

- `theme_config.schema_version = 3` kanonik şemayı belirtir.
- Eski `tone`, `primary_color`, `accent_color`, `headline` kolonları migration sırasında JSONB’ye kayıpsız taşınır ve sonra kaldırılır.
- JSONB içindeki `businessName`, iletişim ve region kopyaları normal kolonlara taşınır ve JSONB’den kaldırılır.
- Dashboard ve public API eski response alanlarını kanonik kaynaktan türetmeye devam eder; eski PATCH alanları kabul edilir ama yalnız yeni kaynağa yazılır.
