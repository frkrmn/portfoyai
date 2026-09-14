# Workspace rolleri ve ekip davetleri teknik tasarımı

Durum: Uygulamaya hazır tasarım  
Kapsam: Fastate AI çok kullanıcılı workspace yetkilendirmesi  
Kaynak issue: GRM-96

## 1. Kararlar ve sınırlar

- Her kullanıcı bir veya daha fazla workspace üyesidir; bütün siteler, abonelik ve domain kayıtları bir `workspace_id` altında yaşar.
- Bir workspace'in tam olarak bir `owner` üyesi bulunur. Owner değişimi ayrı, yeniden kimlik doğrulama isteyen bir işlemdir.
- Roller workspace seviyesindedir: `owner`, `editor`, `agent`, `viewer`. İlk sürümde site-bazlı rol override yoktur.
- Backend'deki `sites.user_id = auth.uid()` kontrolleri kalıcı yetki modeli değildir. Geçişte `workspace_id` asıl yetki kaynağı olur; `user_id` yalnızca oluşturucu/audit uyumluluğu için tutulur ve daha sonra `created_by` olarak yeniden adlandırılabilir.
- UI görünürlüğü güvenlik sınırı değildir. Her API ve RLS politikası aynı merkezi izin fonksiyonunu kullanır.

## 2. Yetki matrisi

| İşlem | Owner | Editor | Agent | Viewer |
|---|:---:|:---:|:---:|:---:|
| Workspace ayarlarını görme | ✓ | ✓ | — | — |
| Üye/davet listesini görme | ✓ | ✓ | — | — |
| Davet oluşturma/yenileme/iptal | ✓ | — | — | — |
| Üye rolü değiştirme veya çıkarma | ✓ | — | — | — |
| Ownership transferi / workspace silme | ✓ | — | — | — |
| Site oluşturma, düzenleme, tema/içerik/medya | ✓ | ✓ | — | — |
| Site yayınlama, geri alma ve silme | ✓ | ✓ | — | — |
| İlan oluşturma/düzenleme | ✓ | ✓ | ✓ | — |
| Lead ve Mini CRM okuma | ✓ | ✓ | ✓ | ✓ |
| Lead durumu, sorumlu, not, hatırlatma değiştirme | ✓ | ✓ | ✓ | — |
| Lead silme veya duplicate birleştirme | ✓ | ✓ | — | — |
| Analitik ve audit log okuma | ✓ | ✓ | ✓ | ✓ |
| Domain ekleme/doğrulama/çıkarma | ✓ | ✓ | — | — |
| Plan, fatura ve ödeme yöntemi yönetimi | ✓ | — | — | — |

`editor` içerik ve operasyon yöneticisidir fakat kullanıcı/billing yönetemez. `agent` portföy ve lead operasyonu yürütür; site tasarımı, yayın, domain ve destructive lead işlemleri yapamaz. `viewer` salt okunurdur.

## 3. Veri modeli

```sql
workspaces (
  id uuid pk, name text, slug citext unique,
  created_by uuid references auth.users, created_at timestamptz, updated_at timestamptz
)

workspace_memberships (
  workspace_id uuid references workspaces on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role workspace_role, joined_at timestamptz, invited_by uuid,
  primary key (workspace_id, user_id)
)

workspace_invitations (
  id uuid pk, workspace_id uuid, email citext, role workspace_role,
  token_hash text unique, invited_by uuid, expires_at timestamptz,
  accepted_at timestamptz, canceled_at timestamptz, created_at timestamptz,
  check (role <> 'owner')
)

workspace_audit_logs (
  id bigint generated always as identity pk, workspace_id uuid,
  actor_user_id uuid, action text, target_type text, target_id text,
  before jsonb, after jsonb, request_id text, ip_hash text, created_at timestamptz
)
```

`sites`, `subscriptions`, `custom_domains` (eklendiğinde), `lead_notification_preferences` ve workspace kapsamlı diğer tablolara `workspace_id not null` eklenir. `listings`, `leads`, `team_members`, `site_versions` gibi site altı kayıtlar yetkiyi `sites.workspace_id` üzerinden miras alır. Davet tokenının yalnızca SHA-256 özeti saklanır; ham token e-posta linkinde bir kez gönderilir. `(workspace_id, lower(email))` için yalnızca aktif davetleri kapsayan unique index kullanılır. Davet varsayılan 7 günde sona erer.

## 4. Ürün akışları

### Davet

1. Owner e-posta ve `editor|agent|viewer` rolü seçer.
2. API e-postayı normalize eder; mevcut üyeyi ve aktif daveti kontrol eder.
3. Tek kullanımlık token üretir, hash'ini kaydeder ve audit log yazar.
4. E-posta linki `/invite/:token` adresine gider. Yeniden gönderme eski tokenı iptal edip yenisini üretir.

### Kabul

1. Link anonim açılabilir; yalnız workspace adı, davet edilen e-posta ve rol gösterilir.
2. Kullanıcı giriş yapar/kayıt olur. Auth e-postası davet e-postasıyla case-insensitive aynı olmalıdır.
3. Transaction içinde invitation kilitlenir; iptal, süre ve daha önce kullanım kontrolleri yapılır.
4. Membership upsert edilir, `accepted_at` yazılır ve `member.joined` audit olayı oluşur. Aynı tokenla tekrar kabul idempotent sonuç verir.

### İptal ve süresi dolma

Owner aktif daveti iptal eder; `canceled_at` yazılır ve token hemen geçersiz olur. Süresi dolmuş kayıtlar cron ile arşivlenebilir fakat doğrulama her zaman `expires_at` üzerinden senkron yapılır.

### Rol değiştirme ve üyelikten çıkarma

Yalnız owner işlem yapar. Owner kendisini çıkaramaz veya rolünü düşüremez; önce ownership transferi gerekir. Üye çıkarma oturum tokenını iptal etmek zorunda değildir, çünkü her istek üyeliği yeniden doğrular. İşlemden hemen sonra RLS erişimi kesilir ve audit olayı yazılır. Devam eden görev/lead atamaları korunur fakat “eski üye” etiketiyle gösterilir; yeni sorumlu atama owner/editor tarafından yapılır.

## 5. API ve merkezi yetkilendirme

Önerilen uçlar:

- `GET/POST /api/workspaces/:id/members`
- `PATCH/DELETE /api/workspaces/:id/members/:userId`
- `GET/POST /api/workspaces/:id/invitations`
- `POST /api/workspaces/:id/invitations/:invitationId/resend`
- `DELETE /api/workspaces/:id/invitations/:invitationId`
- `GET/POST /api/invitations/:token` (önizleme/kabul)
- `POST /api/workspaces/:id/transfer-ownership`

Sunucu katmanında `requireWorkspacePermission(userId, workspaceId, permission)` tek giriş noktası olmalıdır. İzin adları (`site.write`, `site.publish`, `listing.write`, `lead.write`, `lead.merge`, `domain.write`, `billing.write`, `member.manage`, `audit.read`) rol matrisine map edilir. Endpointlerde rol isimleriyle doğrudan `if` yazılmaz. Service-role kullanan handlerlar kullanıcı kimliğini doğruladıktan sonra bu fonksiyonu çağırmadan veri değiştiremez.

## 6. RLS tasarımı

- `is_workspace_member(workspace_id)` ve `has_workspace_role(workspace_id, allowed_roles[])` SQL yardımcıları `security definer`, sabit `search_path`, `stable` ve kullanıcıdan execute revoke edilmiş olarak tanımlanır.
- Workspace kapsamlı SELECT politikaları üyeliğe; INSERT/UPDATE/DELETE politikaları matristeki rollere bağlanır.
- Site-altı tablolarda policy, `exists (select 1 from sites s join workspace_memberships m ... where s.id = row.site_id and m.user_id = auth.uid())` kullanır.
- `workspace_memberships`, invitations, billing ve domains tablolarında owner-only write uygulanır (domain write editor'a da açıktır).
- Public lead INSERT yine doğrudan RLS ile açılmaz; captcha/rate-limit içeren API üzerinden service-role ile yürür.
- Rol değişimi, davet kabulü, owner transferi ve duplicate lead merge gibi çok-adımlı işlemler transaction/RPC içinde yapılır.
- RLS testleri her kaynak × rol × CRUD kombinasyonunu, üyelik kaldırıldıktan sonraki erişimi ve farklı workspace izolasyonunu kapsar.

## 7. Audit ve güvenlik gereksinimleri

- Audit kapsamı: davet create/resend/cancel/accept, member role/remove, ownership transfer, site publish/delete, domain mutation, billing mutation, lead merge/delete ve export.
- Audit kayıtları append-only'dir; authenticated roller doğrudan insert/update/delete yapamaz. Yalnız güvenilir API/RPC yazar.
- `before/after` içinde token, erişim anahtarı, tam ödeme verisi veya lead mesajı tutulmaz. E-posta/telefon gerekli olduğunda maskelenir; IP yalnız salt'lı hash olarak yazılır.
- Her mutasyonda `request_id`, actor, workspace, target ve sonuç bulunur. Başarısız yetki denemeleri merkezi log sistemine security event olarak gider.
- Davet oluşturma/kabul uçlarına IP ve hesap bazlı rate limit; owner işlemlerine yakın zamanda yeniden doğrulama; ownership transferine ikinci onay uygulanır.

## 8. Geçiş planı

1. **Hazırlık:** Yeni tabloları/enumları ve permission helperlarını ekle; mevcut kullanıcı başına bir workspace oluştur, owner membership backfill et.
2. **Çift okuma:** `sites.workspace_id` nullable ekle ve backfill et. API önce workspace üyeliğini, geçiş kaydı yoksa geçici olarak `sites.user_id` kontrolünü kullanır. Eksik backfill metriği tutulur.
3. **Çift yazma:** Yeni site/subscription/domain kayıtlarında `workspace_id` zorunlu yazılır. Davet UI/API feature flag altında açılır.
4. **Yetki kesimi:** Tüm handlerlardaki `.eq("user_id", user.id)` kontrollerini merkezi permission helperına geçir; rol/RLS entegrasyon testlerini required CI check yap.
5. **Sıkılaştırma:** `workspace_id not null`, foreign key ve indexleri validate et; legacy fallback'i kaldır. `sites.user_id` alanını yalnız creator semantiğine geçir.
6. **Yayılım:** Önce internal/admin workspace, sonra yeni hesaplar, sonra mevcut hesaplar. Audit, RLS denial, davet teslim/kabul ve authorization latency dashboardları izlenir.

Rollback, davet özelliğini kapatıp membership verisini korur; geçişin 4. adımına kadar owner erişimi legacy `user_id` fallback ile devam eder. Yetki kesiminden sonra rollback yalnız önceki uygulama + uyumlu RLS policy paketi birlikte deploy edilerek yapılır.

## 9. Test ve kabul planı

- Unit: permission matrisi, davet durum makinesi, e-posta normalizasyonu, token hash/süre kontrolü.
- API integration: invite/accept/cancel/resend, idempotent kabul, owner korumaları, rol değişikliği.
- RLS: dört rol, anonim kullanıcı ve başka workspace üyesi için site/listing/lead/domain/billing CRUD matrisi.
- E2E: owner davet eder → yeni kullanıcı kabul eder → rolüne uygun menü/aksiyon görür → owner rolü değiştirir/üyeyi çıkarır → erişim anında kesilir.
- Security: token replay, farklı e-postayla kabul, expired/canceled token, enumeration-safe yanıt, rate limit ve audit redaction.
- Migration: her mevcut `sites.user_id` için owner membership ve doğru `workspace_id`; orphan ve birden çok owner sayısı sıfır olmalıdır.

## 10. Açık ürün kararları

- Plan başına koltuk limiti ve ücretli ek koltuk modeli ayrı billing kararıdır; yetki modelini değiştirmez.
- Bir kullanıcının birden çok workspace arasında geçişi ilk veri modelinde desteklenir; workspace switcher davet özelliğiyle aynı anda açılmayabilir.
- Site-bazlı özel roller, harici müşteri/viewer paylaşımı ve geçici erişim bu sürümün dışındadır.
