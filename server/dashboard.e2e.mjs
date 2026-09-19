import { loadEnv } from "vite";
import { createClient } from "@supabase/supabase-js";
import { insertGeneratedSite } from "./site-persistence.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const auth = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const baseUrl = process.env.DASHBOARD_E2E_URL || "http://127.0.0.1:4173";
const suffix = Date.now();
const email = `dashboard-e2e-${suffix}@example.com`;
const password = `Dashboard-${suffix}!`;
let userId;
let siteId;
let photoPath;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const { data: created, error: createError } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (createError) throw createError;
  userId = created.user.id;
  const { error: subscriptionError } = await service.from("subscriptions").insert({ subject_id: userId, user_id: userId, plan: "pro" });
  if (subscriptionError) throw subscriptionError;

  const site = await insertGeneratedSite(service, {
    template_id: "clean-modern",
    business_name: "Dashboard E2E Emlak",
    tone: "Ankara'da şeffaf ve pratik emlak danışmanlığı.",
    primary_color: "#173F32",
    accent_color: "#D86F45",
    headline: "Ankara'da doğru portföyü kolayca bulun",
    region_focus: "Çankaya, Yenimahalle",
  }, userId);
  siteId = site.id;

  const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const headers = { Authorization: `Bearer ${signedIn.session.access_token}` };
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };

  const ownedResponse = await fetch(`${baseUrl}/api/sites`, { headers });
  const owned = await ownedResponse.json();
  assert(ownedResponse.ok && owned.sites.some((item) => item.id === siteId), "Owned site was not returned by dashboard API");

  const starterResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { headers });
  const starter = await starterResponse.json();
  assert(starterResponse.ok && starter.listings.length === 6, "Dashboard did not return six seeded listings");
  assert(starter.listings.filter((item) => item.listing_type === "sale").length === 3, "Seeded sale count is not three");
  assert(starter.listings.filter((item) => item.listing_type === "rent").length === 3, "Seeded rent count is not three");

  photoPath = `${userId}/${siteId}/listing/dashboard-${suffix}.png`;
  const photoBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const uploaded = await service.storage.from("site-media").upload(photoPath, photoBytes, { contentType: "image/png", upsert: false });
  if (uploaded.error) throw uploaded.error;
  const photo = service.storage.from("site-media").getPublicUrl(photoPath).data.publicUrl;
  const listingDraft = {
    title: "Çankaya Dashboard Test İlanı",
    description: "Dashboard üzerinden gerçek listings tablosuna eklenen test ilanı.",
    price: 7_250_000,
    currency: "TRY",
    m2: 105,
    room_count: "2+1",
    listing_type: "sale",
    district: "Çankaya",
    lat: 39.92,
    lng: 32.85,
    media: [{ id: "dashboard-photo", url: photo, thumbUrl: photo, alt: "Dashboard test fotoğrafı" }],
    status: "active",
    features: ["Merkezi konum", "Balkon"],
  };
  const createListingResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(listingDraft) });
  const createdListing = await createListingResponse.json();
  assert(createListingResponse.status === 201, `Listing create failed: ${createdListing.error}`);

  const editedDraft = { ...listingDraft, price: 7_990_000, m2: 112, room_count: "3+1", description: "Fiyat, alan, oda, açıklama ve fotoğraf dashboard üzerinden güncellendi." };
  const editResponse = await fetch(`${baseUrl}/api/listings/${createdListing.listing.id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(editedDraft) });
  const edited = await editResponse.json();
  assert(editResponse.ok && edited.listing.price === 7_990_000 && edited.listing.m2 === 112 && edited.listing.media[0].url === photo, "Listing edit was not persisted");

  const currentSite = owned.sites.find((item) => item.id === siteId);
  const sitePatch = {
    business_name: "Dashboard Canlı Emlak",
    headline: "Dashboard değişiklikleri artık canlı",
    tone: "Gerçek Supabase verisiyle yönetilen danışmanlık.",
    phone: "+90 532 111 22 33",
    email: "canli@example.com",
    address: "Çankaya, Ankara",
    primary_color: "#245B49",
    accent_color: "#C56B42",
    heading_font: "Libre Baskerville, Georgia, serif",
    body_font: "Inter, Arial, sans-serif",
    expected_revision: currentSite.draft_revision,
  };
  const sitePatchResponse = await fetch(`${baseUrl}/api/sites/${siteId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(sitePatch) });
  const patchedSite = await sitePatchResponse.json();
  assert(sitePatchResponse.ok, `Site settings patch failed: ${patchedSite.error}`);
  const publishResponse = await fetch(`${baseUrl}/api/sites/${siteId}/publish`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ expected_revision: patchedSite.site.draft_revision }) });
  const publishedSite = await publishResponse.json();
  assert(publishResponse.ok && publishedSite.site.status === "published", `Publish failed: ${publishedSite.error}`);

  const publicResponse = await fetch(`${baseUrl}/api/public-sites/${site.slug}`);
  const publicSite = await publicResponse.json();
  const publicEdited = publicSite.listings.find((item) => item.id === createdListing.listing.id);
  assert(publicResponse.ok && publicSite.listings.length === 6, "Public site did not immediately receive the added listing");
  assert(publicEdited?.price === 7_990_000 && publicEdited?.room_count === "3+1" && publicEdited?.media[0]?.url === photo, "Public listing did not reflect dashboard edit/photo");
  assert(publicSite.config.business_name === sitePatch.business_name && publicSite.config.primary_color === sitePatch.primary_color, "Public site did not reflect identity/color changes");
  assert(publicSite.config.theme_config.content.phone === sitePatch.phone && publicSite.config.theme_config.fonts.heading === sitePatch.heading_font, "Public theme_config did not reflect contact/font changes");

  const leadResult = await service.from("leads").insert({ site_id: siteId, name: "Dashboard Lead Test", phone: "+90 555 000 00 01", message: "Dashboard inbox testi", source: "e2e" }).select("id").single();
  if (leadResult.error) throw leadResult.error;
  const lead = leadResult.data;
  const inboxResponse = await fetch(`${baseUrl}/api/leads`, { headers });
  const inbox = await inboxResponse.json();
  assert(inboxResponse.ok && inbox.leads.some((item) => item.id === lead.id && item.site_id === siteId), "Lead did not immediately appear in owner inbox API");

  const unpublishResponse = await fetch(`${baseUrl}/api/sites/${siteId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ status: "draft", expected_revision: publishedSite.site.draft_revision }) });
  const unpublished = await unpublishResponse.json();
  assert(unpublishResponse.ok && unpublished.site.status === "draft", "Unpublish failed");
  const draftPublicResponse = await fetch(`${baseUrl}/api/public-sites/${site.slug}`);
  assert(draftPublicResponse.status === 404, "Draft site remained accessible through the public endpoint");

  const deleteResponse = await fetch(`${baseUrl}/api/listings/${createdListing.listing.id}`, { method: "DELETE", headers });
  assert(deleteResponse.ok, "Listing delete failed");
  const afterDeleteResponse = await fetch(`${baseUrl}/api/sites/${siteId}/listings`, { headers });
  const afterDelete = await afterDeleteResponse.json();
  assert(afterDeleteResponse.ok && afterDelete.listings.length === 6 && !afterDelete.listings.some((item) => item.id === createdListing.listing.id), "Deleted listing remained in the dashboard API");

  console.log(JSON.stringify({
    site: site.slug,
    owned_site: true,
    starter_listings: 6,
    sale: 3,
    rent: 3,
    listing_create_edit_photo_public_sync: true,
    theme_contact_font_public_sync: true,
    publish_and_unpublish: true,
    draft_public_access_blocked: true,
    lead_database_to_owner_inbox: true,
    listing_delete_public_sync: true,
  }, null, 2));
} finally {
  if (siteId) await service.from("sites").delete().eq("id", siteId);
  if (photoPath) await service.storage.from("site-media").remove([photoPath]);
  if (userId) await service.auth.admin.deleteUser(userId);
}
