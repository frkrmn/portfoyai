# Observability

API istekleri newline-delimited JSON olarak stdout/stderr'a yazılır; Vercel bu kayıtları merkezi log akışında indeksler. Her isteğin `X-Request-Id` cevabı vardır ve aynı `request_id` request, hata ve AI metriklerini ilişkilendirir. İstemciden gelen güvenli bir `X-Request-Id` korunur, aksi halde UUID üretilir.

Beklenmeyen sunucu hataları kullanıcıya yalnız `INTERNAL_ERROR`, güvenli mesaj ve `request_id` döndürür. İç hata ayrıntıları sadece redakte edilmiş server logunda kalır. Authorization, cookie, secret/API key, kimlik tokenları, e-posta, telefon, isim, prompt/content/message alanları loglanmaz.

AI kayıtları `ai.call.completed` veya `ai.call.failed` event'iyle operation, provider, model, input/output/total token, tahmini USD maliyeti, latency ve outcome içerir. Varsayılan tahmini fiyatlar `.env.example` içindedir ve model fiyatı değiştiğinde environment üzerinden güncellenmelidir.

Opsiyonel `ERROR_TRACKING_WEBHOOK_URL`, redakte edilmiş error event'lerini harici hata takip sistemine gönderir. `AI_ALERT_LATENCY_MS`, `AI_ALERT_COST_USD` ve `AI_ALERT_ERROR_RATE_PERCENT` eşikleri aşılırsa `ai.alert.threshold_exceeded` üretilir. Error-rate alarmı process içindeki son 100 çağrılık kayan pencereyi ve en az 5 örneği kullanır.
