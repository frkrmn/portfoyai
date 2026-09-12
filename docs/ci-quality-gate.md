# CI/CD kalite kapısı

`.github/workflows/quality-gate.yml`, pull request'lerde ve `main` push'larında zorunlu kalite denetimlerini çalıştırır. Build/lint, schema, i18n ve iki tarayıcı regresyonu mümkün olduğunca paralel yürür. Tarayıcı işleri aynı production bundle artifact'ını kullanır; npm indirmeleri GitHub Actions cache'inden gelir.

## Zorunlu kontrol

GitHub repository ayarlarında `main` branch protection/ruleset için **Require status checks to pass** seçeneğini açın ve şu tek kontrolü zorunlu yapın:

`Quality Gate / required`

Bu aggregate iş, alt işlerden biri başarısız veya iptal edilmişse başarısız olur. Böylece başarısız PR `main` dalına merge edilemez ve production deploy'a ulaşamaz. Vercel production deploy'u `main` dalından yapmalıdır; doğrudan production branch deploy yetkisi yalnızca CI kullanıcısında olmalıdır.

## Yerel kullanım

Tarayıcı gerektirmeyen kapıyı çalıştırmak için:

```sh
npm run test:quality-gate
```

CI'daki tarayıcı işleri sabit fixture ile dış servis ve production verisine ihtiyaç duymadan çalışır. Hata ayrıntıları ilgili job logunda görünür; performans ve accessibility raporları 14 gün artifact olarak saklanır. `required` işi ayrıca bütün alt işlerin sonucunu job summary'ye yazar.
