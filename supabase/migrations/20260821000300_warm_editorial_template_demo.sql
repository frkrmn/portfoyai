-- Data fields used by the warm-editorial template family. Existing listings
-- remain valid; the renderer has conservative fallbacks for nullable values.
alter table public.listings
  add column if not exists address text,
  add column if not exists category text,
  add column if not exists bedroom_count integer,
  add column if not exists bathroom_count integer;

do $$
begin
  alter table public.listings
    add constraint listings_category_check
    check (category is null or category in ('apartment', 'house', 'duplex'));
exception
  when duplicate_object then null;
end $$;

insert into public.sites (
  id, session_id, slug, business_name, tone, primary_color, accent_color,
  headline, theme_config, status
) values (
  '7b223f5e-0c77-4f6e-950a-a97258f33b3a',
  'warm-editorial-demo-session',
  'atolye-gayrimenkul',
  'Sıcak, editoryal ve kişisel bir gayrimenkul danışmanlığı yaklaşımı.',
  '#292923',
  '#9a7455',
  'İstanbul’da yaşamak isteyeceğiniz bir yer bulun.',
  jsonb_build_object(
    'template_id', 'warm-editorial',
    'colors', jsonb_build_object('background', '#f1eadf', 'primary', '#292923', 'accent', '#9a7455', 'text', '#25231f'),
    'fonts', jsonb_build_object('heading', 'Cormorant Garamond, Georgia, serif', 'body', 'Inter, Arial, sans-serif'),
    'content', jsonb_build_object(
      'businessName', 'Atölye Gayrimenkul',
      'eyebrow', 'İstanbul’un iyi yaşam rehberi',
      'headline', 'Yaşamak isteyeceğiniz',
      'headlineAccent', 'bir yer bulun.',
      'bio', 'Kadıköy, Beşiktaş ve Boğaz hattında karakterli evleri; doğru bilgi, sakin bir süreç ve kişisel danışmanlıkla buluşturuyoruz.',
      'ctaText', 'Portföyleri keşfedin',
      'featuredEyebrow', 'Özenle seçilenler',
      'featuredTitle', 'Her ev, kendine ait bir hikâye anlatır.',
      'categoriesEyebrow', 'Yaşam biçiminize göre',
      'categoriesTitle', 'Nasıl yaşamak istediğinizi seçin.',
      'tourTitle', 'Randevu Planla',
      'tourDescription', 'İlgilendiğiniz evi birlikte gezmek için size ulaşabileceğimiz bilgileri bırakın.',
      'agentName', 'Selin Arman',
      'phone', '+90 532 410 24 18',
      'email', 'selin@atolyegayrimenkul.com',
      'address', 'Moda Caddesi No: 42, Kadıköy / İstanbul'
    ),
    'layout', jsonb_build_object('show_categories', true)
  ),
  'published'
)
on conflict (slug) do update set
  theme_config = excluded.theme_config,
  primary_color = excluded.primary_color,
  accent_color = excluded.accent_color,
  headline = excluded.headline,
  status = excluded.status;

insert into public.listings (
  id, site_id, title, description, price, currency, m2, room_count,
  listing_type, district, lat, lng, media, status, features, address,
  category, bedroom_count, bathroom_count, created_at
) values
  ('e1010000-0000-4000-8000-000000000001', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Caddebostan’da Denizle İç İçe 3+1', 'Gün ışığını gün boyu içeri alan geniş salonu, sakin renkleri ve sahile birkaç adımlık konumuyla zarif bir şehir evi.', 18750000, 'TRY', 168, '3+1', 'sale', 'Kadıköy', 40.9631, 29.0634, '[{"id":"we-1a","url":"/images/listings/caddebostan-sea-view.jpg","thumbUrl":"/images/listings/caddebostan-sea-view.jpg","alt":"Caddebostan deniz manzaralı salon"},{"id":"we-1b","url":"/images/listings/bagdat-residence.jpg","thumbUrl":"/images/listings/bagdat-residence.jpg","alt":"Aydınlık iç mekân"},{"id":"we-1c","url":"/images/listings/moda-character.jpg","thumbUrl":"/images/listings/moda-character.jpg","alt":"Daire detayı"}]'::jsonb, 'active', '["Deniz manzarası","Kapalı otopark","Ebeveyn banyosu","Balkon"]'::jsonb, 'Caddebostan Mah., Bağdat Caddesi', 'apartment', 3, 2, now()),
  ('e1010000-0000-4000-8000-000000000002', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Bebek’te Boğaz Manzaralı Zarif Daire', 'Boğazın değişen ışığına açılan, yenilenmiş detayları ve dingin atmosferiyle özel bir yaşam alanı.', 28500000, 'TRY', 142, '2+1', 'sale', 'Beşiktaş', 41.0761, 29.0431, '[{"id":"we-2a","url":"/images/listings/bagdat-residence.jpg","thumbUrl":"/images/listings/bagdat-residence.jpg","alt":"Bebek daire salonu"},{"id":"we-2b","url":"/images/listings/caddebostan-sea-view.jpg","thumbUrl":"/images/listings/caddebostan-sea-view.jpg","alt":"Boğaz manzarası"}]'::jsonb, 'active', '["Boğaz manzarası","Yenilenmiş iç mimari","Asansör","Merkezi konum"]'::jsonb, 'Bebek Mah., Cevdet Paşa Caddesi', 'apartment', 2, 2, now() - interval '1 day'),
  ('e1010000-0000-4000-8000-000000000003', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Acarkent’te Bahçeli Müstakil Yaşam', 'Olgun ağaçlarla çevrili özel bahçesi, şömineli salonu ve aile yaşamına uygun planıyla huzurlu bir ev.', 46500000, 'TRY', 340, '5+1', 'sale', 'Beykoz', 41.1050, 29.1600, '[{"id":"we-3a","url":"/images/listings/fenerbahce-garden.jpg","thumbUrl":"/images/listings/fenerbahce-garden.jpg","alt":"Bahçeli müstakil ev"},{"id":"we-3b","url":"/images/listings/suadiye-penthouse.jpg","thumbUrl":"/images/listings/suadiye-penthouse.jpg","alt":"Müstakil ev salonu"}]'::jsonb, 'active', '["Özel bahçe","Şömine","Dört araçlık otopark","Güvenlik"]'::jsonb, 'Acarkent Mah., 8. Cadde', 'house', 5, 4, now() - interval '2 days'),
  ('e1010000-0000-4000-8000-000000000004', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Moda’da Karakterli Tarihi Daire', 'Özgün ahşap detayları korunarak yenilenen, yüksek tavanlı ve Moda’nın gündelik hayatına karışan özel bir daire.', 98000, 'TRY', 118, '2+1', 'rent', 'Kadıköy', 40.9850, 29.0250, '[{"id":"we-4a","url":"/images/listings/moda-character.jpg","thumbUrl":"/images/listings/moda-character.jpg","alt":"Moda tarihi daire"},{"id":"we-4b","url":"/images/listings/fenerbahce-garden.jpg","thumbUrl":"/images/listings/fenerbahce-garden.jpg","alt":"Tarihi daire detayı"}]'::jsonb, 'active', '["Yüksek tavan","Özgün ahşap detaylar","Cumbalı salon","Merkezi konum"]'::jsonb, 'Caferağa Mah., Moda Caddesi', 'apartment', 2, 1, now() - interval '3 days'),
  ('e1010000-0000-4000-8000-000000000005', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Suadiye’de Teraslı Dubleks', 'Geniş terası, yalın iç mimarisi ve ferah yaşam alanlarıyla sahil hattında sakin ve çağdaş bir ev.', 23900000, 'TRY', 210, '4+1', 'sale', 'Kadıköy', 40.9570, 29.0830, '[{"id":"we-5a","url":"/images/listings/suadiye-penthouse.jpg","thumbUrl":"/images/listings/suadiye-penthouse.jpg","alt":"Suadiye teraslı dubleks"},{"id":"we-5b","url":"/images/listings/caddebostan-sea-view.jpg","thumbUrl":"/images/listings/caddebostan-sea-view.jpg","alt":"Dubleks iç mekân"}]'::jsonb, 'active', '["Geniş teras","Yerden ısıtma","Akıllı ev sistemi","Kapalı otopark"]'::jsonb, 'Suadiye Mah., Plaj Yolu', 'duplex', 4, 3, now() - interval '4 days'),
  ('e1010000-0000-4000-8000-000000000006', '7b223f5e-0c77-4f6e-950a-a97258f33b3a', 'Arnavutköy’de Boğaza Yakın 2+1', 'Semtin dokusunu yansıtan cephesi, işlevli planı ve Boğaz hattına yakınlığıyla keyifli bir kiralık seçenek.', 115000, 'TRY', 105, '2+1', 'rent', 'Beşiktaş', 41.0670, 29.0430, '[{"id":"we-6a","url":"/images/listings/bagdat-residence.jpg","thumbUrl":"/images/listings/bagdat-residence.jpg","alt":"Arnavutköy daire"},{"id":"we-6b","url":"/images/listings/moda-character.jpg","thumbUrl":"/images/listings/moda-character.jpg","alt":"Daire iç mekân"}]'::jsonb, 'active', '["Boğaza yakın","Yenilenmiş mutfak","Doğal ışık","Sessiz sokak"]'::jsonb, 'Arnavutköy Mah., Bebek Arnavutköy Caddesi', 'apartment', 2, 1, now() - interval '5 days')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  media = excluded.media,
  features = excluded.features,
  address = excluded.address,
  category = excluded.category,
  bedroom_count = excluded.bedroom_count,
  bathroom_count = excluded.bathroom_count;
