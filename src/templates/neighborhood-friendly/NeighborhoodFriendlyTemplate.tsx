import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, MapPin, Maximize2, MessageCircle, Search } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Listing } from "@/portfoyai/types";
import { formatListingLocation } from "@/portfoyai/listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getAgentImage, getHeroImage, getListingImage } from "../mediaFallbacks";
import { SharedTeamFooterLink, SharedTeamHeaderLink, SharedTeamSection } from "../SharedTeamPage";
import { ClosedListingsGroups } from "../ClosedListingsGroups";
import { matchesPropertyTaxonomy, PropertyTaxonomyBadge, PropertyTaxonomySelect } from "../PropertyTaxonomy";
import { contentFields, objectArrayField } from "../content-schema";
import { imageSlots } from "../image-schema";

export const imageSchema = imageSlots([
  { key: "media.heroImage", label: "Ana Görsel (Hero)", type: "single", recommendedSize: "1920x1080" },
  { key: "media.agentPortrait", label: "Danışman Portresi", type: "single", recommendedSize: "1200x1500" },
]);

export const contentSchema = [
  ...contentFields(["agentName", "eyebrow", "tagline", "ctaText", "navAbout", "navContact", "navListings", "searchLabel", "locationLabel", "propertyTypeLabel", "typeLabel", "saleLabel", "rentLabel", "allLabel", "neighborhoodsTitle", "neighborhoodsDescription", "neighborhoodListingLabel", "featuredEyebrow", "featuredStripTitle", "aboutTitle", "aboutDescription", "directContactLabel", "listingsTitle", "listingsDescription", "emptyListings", "backLabel", "areaLabel", "bedLabel", "bathLabel", "listingAboutLabel", "listingFeaturesLabel", "tourTitle", "tourDescription", "fullNameLabel", "phoneLabel", "messageLabel", "formSubmit", "formSubmitting", "formSuccess", "formError", "teamDescription"], ["tagline", "neighborhoodsDescription", "aboutDescription", "listingsDescription", "tourDescription", "formSuccess", "formError", "teamDescription"]),
  objectArrayField("neighborhoods", "Mahalleler", [["name", "Mahalle adı"], ["description", "Kısa açıklama", "textarea"]]),
];

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");
const locationText = (listing: Listing) => `${formatListingLocation(listing)} ${listing.address || ""} ${listing.title}`;
const matchesNeighborhood = (listing: Listing, name: string) => normalize(locationText(listing)).includes(normalize(name));
const bedroomsFor = (listing: Listing) => listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);
const bathroomsFor = (listing: Listing) => listing.bathroom_count ?? (bedroomsFor(listing) > 3 ? 2 : 1);
const friendlyStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--nf-bg": config.colors.background,
  "--nf-primary": config.colors.primary,
  "--nf-accent": config.colors.accent,
  "--nf-text": config.colors.text,
  "--nf-soft": `color-mix(in srgb, ${config.colors.accent} 10%, ${config.colors.background})`,
  "--nf-line": `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
  "--nf-on-primary": config.colors.background,
  "--nf-heading": config.fonts.heading,
  "--nf-body": config.fonts.body,
  backgroundColor: "var(--nf-bg)",
  color: "var(--nf-text)",
  fontFamily: "var(--nf-body)",
}) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="relative z-30 bg-[var(--nf-bg)]"><div className="mx-auto flex h-20 max-w-[1360px] items-center justify-between px-5 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--nf-heading)] text-xl font-extrabold tracking-[-0.025em]">{c.businessName}</Link><nav className="hidden items-center gap-8 text-sm font-semibold md:flex"><a href="#mahalleler">{c.navAbout}</a><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><SharedTeamHeaderLink config={config} /><a href="#iletisim">{c.navContact}</a></nav><a data-site-button href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} className="flex items-center gap-2 rounded-full bg-[var(--nf-primary)] px-5 py-3 text-xs font-bold text-[var(--nf-on-primary)]"><MessageCircle className="h-4 w-4" />{c.directContactLabel}</a></div></header>;
}

function Footer({ config }: SiteTemplateProps) {
  const c = config.content;
  return <><SharedTeamSection config={config} /><footer className="border-t border-[var(--nf-line)] bg-[var(--nf-soft)] px-5 py-12 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1360px] gap-8 md:grid-cols-[1fr_auto]"><div><div className="font-[family-name:var(--nf-heading)] text-2xl font-extrabold">{c.agentName}</div><p className="mt-2 max-w-md text-sm opacity-65">{c.tagline}</p><div className="mt-5 text-xs opacity-45">Fastate AI ile hazırlandı</div></div><address className="space-y-2 text-sm not-italic opacity-70"><div>{c.address}</div><div>{c.phone}</div><div>{c.email}</div></address></div><SharedTeamFooterLink config={config} /></footer></>;
}

function Specs({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <div className="flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²<span className="sr-only">{c.areaLabel}</span></span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{bedroomsFor(listing)}<span className="sr-only">{c.bedLabel}</span></span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{bathroomsFor(listing)}<span className="sr-only">{c.bathLabel}</span></span></div>;
}

function FriendlyCard({ config, listing, compact = false }: { config: TemplateConfig; listing: Listing; compact?: boolean }) {
  const c = config.content;
  return <article className="group min-w-0 overflow-hidden rounded-[1.75rem] border border-[var(--nf-line)] bg-[var(--nf-bg)]"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-[var(--nf-soft)]"><img src={getListingImage(listing)} alt={listing.title} className={`${compact ? "aspect-[5/4]" : "aspect-[4/3]"} w-full object-cover transition duration-500 group-hover:scale-[1.035]`} /><span className="absolute left-4 top-4 rounded-full bg-[var(--nf-accent)] px-3 py-1.5 text-[10px] font-bold text-[var(--nf-on-primary)]">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span><PropertyTaxonomyBadge config={config} listing={listing} className="absolute bottom-4 left-4 rounded-full bg-[var(--nf-bg)] px-3 py-1.5 text-[10px] font-bold text-[var(--nf-text)]" /></Link><div className="p-5"><div className="flex items-center gap-1.5 text-xs text-[var(--nf-accent)]"><MapPin className="h-3.5 w-3.5" />{formatListingLocation(listing)}</div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-2 line-clamp-2 font-[family-name:var(--nf-heading)] text-xl font-extrabold leading-tight">{listing.title}</h3></Link><strong className="mt-4 block text-lg">{formatListingPrice(listing)}</strong><div className="mt-4 border-t border-[var(--nf-line)] pt-4"><Specs config={config} listing={listing} /></div></div></article>;
}

function SimpleSearch({ config }: SiteTemplateProps) {
  const c = config.content;
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [type, setType] = useState("all");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (type !== "all") params.set("type", type);
    navigate(`/site/${config.slug}/listings${params.size ? `?${params}` : ""}`);
  };
  const field = "h-12 min-w-0 rounded-full border border-[var(--nf-line)] bg-[var(--nf-bg)] px-5 text-sm outline-none focus:border-[var(--nf-accent)]";
  return <form onSubmit={submit} className="grid gap-3 rounded-[2rem] bg-[var(--nf-bg)] p-3 shadow-[0_22px_70px_color-mix(in_srgb,var(--nf-text)_13%,transparent)] sm:grid-cols-[1fr_1fr_auto]"><select aria-label={c.locationLabel} className={field} value={location} onChange={(event) => setLocation(event.target.value)}><option value="">{c.locationLabel}</option>{c.neighborhoods.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select><select aria-label={c.typeLabel} className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.propertyTypeLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select><button data-site-button className="flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--nf-primary)] px-6 text-xs font-bold text-[var(--nf-on-primary)]"><Search className="h-4 w-4" />{c.searchLabel}</button></form>;
}

function NeighborhoodMap() {
  return <div aria-hidden="true" className="relative min-h-[340px] overflow-hidden rounded-[2.25rem] bg-[var(--nf-soft)]"><svg viewBox="0 0 600 420" className="absolute inset-0 h-full w-full"><path d="M-20 315C85 253 130 282 216 220S345 170 414 104 526 55 630 72" fill="none" stroke="var(--nf-bg)" strokeWidth="54" strokeLinecap="round" /><path d="M36 40C144 112 188 93 266 153s140 68 300 35" fill="none" stroke="var(--nf-bg)" strokeWidth="24" strokeLinecap="round" /><path d="M78 385c70-96 88-134 103-218M330 420c-12-91 17-168 93-267M522 420c-21-111-6-201 63-292" fill="none" stroke="var(--nf-bg)" strokeWidth="16" strokeLinecap="round" />{[[168,232],[348,174],[469,102],[425,304]].map(([x,y], index) => <g key={index}><circle cx={x} cy={y} r="24" fill="var(--nf-accent)" opacity=".18" /><circle cx={x} cy={y} r="8" fill="var(--nf-accent)" /></g>)}</svg></div>;
}

function NeighborhoodSection({ config }: SiteTemplateProps) {
  const c = config.content;
  return <section id="mahalleler" className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--nf-accent)]">{c.navAbout}</div><h2 className="mt-4 font-[family-name:var(--nf-heading)] text-5xl font-extrabold leading-[0.95] tracking-[-0.04em]">{c.neighborhoodsTitle}</h2><p className="mt-5 max-w-lg text-sm leading-7 opacity-65">{c.neighborhoodsDescription}</p><div className="mt-9"><NeighborhoodMap /></div></div><div className="grid gap-5 sm:grid-cols-2">{c.neighborhoods.map((neighborhood, index) => {
    const matching = config.listings.filter((listing) => matchesNeighborhood(listing, neighborhood.name));
    const representative = matching[0] || config.listings[index];
    return <Link key={neighborhood.name} to={`/site/${config.slug}/listings?location=${encodeURIComponent(neighborhood.name)}`} className="group relative min-h-[340px] overflow-hidden rounded-[2.25rem] bg-[var(--nf-soft)]"><img src={getListingImage(representative)} alt={neighborhood.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--nf-primary)_80%,transparent),transparent_72%)]" /><div className="absolute inset-x-0 bottom-0 p-6 text-[var(--nf-on-primary)]"><div className="flex items-center justify-between gap-4"><h3 className="font-[family-name:var(--nf-heading)] text-3xl font-extrabold">{neighborhood.name}</h3><span className="rounded-full bg-[var(--nf-bg)] px-3 py-1.5 text-xs font-bold text-[var(--nf-text)]">{matching.length} {c.neighborhoodListingLabel}</span></div><p className="mt-3 text-sm leading-6 opacity-80">{neighborhood.description}</p></div></Link>;
  })}</div></div></section>;
}

function LeadForm({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setStatus("submitting");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: config.siteId, listing_id: listing.id, name: form.name, phone: form.phone, message: form.message }) });
      if (!response.ok) throw new Error();
      setForm({ name: "", phone: "", message: "" }); setStatus("success");
    } catch { setStatus("error"); }
  };
  const field = "w-full rounded-2xl border border-[var(--nf-line)] bg-[var(--nf-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--nf-accent)]";
  return <form onSubmit={submit} className="space-y-3"><input className={field} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input className={field} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /><textarea className={`${field} min-h-28 resize-none`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><button data-site-button disabled={status === "submitting"} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--nf-primary)] px-5 text-xs font-bold text-[var(--nf-on-primary)]">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className="text-sm text-[var(--nf-accent)]">{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className="text-sm">{c.formError}</p> : null}</form>;
}

export function NeighborhoodFriendlyHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const hero = config.listings.find((listing) => c.neighborhoods.some((item) => matchesNeighborhood(listing, item.name))) || config.listings[0];
  const heroImage = getHeroImage(config.siteId, String(config.media.heroImage || c.heroImage || (hero?.media?.length ? getListingImage(hero) : undefined)));
  const aboutImage = getAgentImage(config.siteId, String(config.media.agentPortrait || c.agentImage || ""));
  return <div {...fineTuneAttributes(config)} style={friendlyStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1360px] px-5 pb-16 sm:px-8 lg:px-10"><div className="relative min-h-[680px] overflow-hidden rounded-[2.75rem] bg-[var(--nf-soft)]">{heroImage ? <img src={heroImage} alt={c.headline} className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--nf-primary)_82%,transparent),color-mix(in_srgb,var(--nf-primary)_8%,transparent))]" /><div className="relative flex min-h-[680px] max-w-3xl flex-col justify-center px-7 py-20 text-[var(--nf-on-primary)] sm:px-12 lg:px-16"><div className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{c.eyebrow}</div><h1 className="mt-5 font-[family-name:var(--nf-heading)] text-6xl font-extrabold leading-[0.92] tracking-[-0.05em] sm:text-7xl">{c.headline}</h1><p className="mt-6 max-w-xl text-base leading-7 opacity-78">{c.bio}</p><div className="mt-10 text-[var(--nf-text)]"><SimpleSearch config={config} /></div></div></div></section><NeighborhoodSection config={config} /><section className="border-y border-[var(--nf-line)] bg-[var(--nf-soft)] px-5 py-20 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1360px]"><div className="flex items-end justify-between gap-5"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--nf-accent)]">{c.featuredEyebrow}</div><h2 className="mt-3 font-[family-name:var(--nf-heading)] text-4xl font-extrabold tracking-[-0.035em]">{c.featuredStripTitle}</h2></div><Link to={`/site/${config.slug}/listings`} className="flex items-center gap-2 text-xs font-bold">{c.ctaText}<ArrowRight className="h-4 w-4" /></Link></div><div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{config.listings.slice(0, 4).map((listing) => <FriendlyCard key={listing.id} config={config} listing={listing} compact />)}</div></div></section><section id="iletisim" className="mx-auto grid max-w-[1360px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-10 lg:py-28"><div className="min-h-[520px] overflow-hidden rounded-[2.75rem] bg-[var(--nf-soft)]">{aboutImage ? <img src={aboutImage} alt={c.agentName} className="h-full min-h-[520px] w-full object-cover" /> : <div className="grid min-h-[520px] place-items-center font-[family-name:var(--nf-heading)] text-7xl font-extrabold text-[var(--nf-accent)]">{c.agentName.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>}</div><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--nf-accent)]">{c.agentName}</div><h2 className="mt-4 font-[family-name:var(--nf-heading)] text-5xl font-extrabold leading-[0.96] tracking-[-0.04em]">{c.aboutTitle}</h2><p className="mt-6 max-w-xl text-base leading-8 opacity-68">{c.aboutDescription}</p><p className="mt-4 max-w-xl text-sm leading-7 opacity-58">{c.bio}</p><div className="mt-8 flex flex-wrap gap-3"><a data-site-button href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} className="flex items-center gap-2 rounded-full bg-[var(--nf-primary)] px-6 py-4 text-xs font-bold text-[var(--nf-on-primary)]"><MessageCircle className="h-4 w-4" />{c.directContactLabel}</a><a href={`tel:${c.phone}`} className="rounded-full border border-[var(--nf-line)] px-6 py-4 text-xs font-bold">{c.phone}</a></div></div></section></main><Footer config={config} /></div>;
}

export function NeighborhoodFriendlyListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get("location") || "");
  const [type, setType] = useState(params.get("type") || "all");
  const [propertyType, setPropertyType] = useState(params.get("property") || "all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (location && !matchesNeighborhood(listing, location)) return false;
    if (type !== "all" && listing.listing_type !== type) return false;
    if (!matchesPropertyTaxonomy(listing, propertyType)) return false;
    return !query || normalize(`${listing.title} ${listing.description}`).includes(normalize(query));
  }), [config.listings, location, propertyType, query, type]);
  const field = "h-12 w-full rounded-full border border-[var(--nf-line)] bg-[var(--nf-bg)] px-5 text-sm outline-none focus:border-[var(--nf-accent)]";
  return <div {...fineTuneAttributes(config)} style={friendlyStyle(config)}><Header config={config} /><main><section className="bg-[var(--nf-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1360px]"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--nf-accent)]">{location || c.eyebrow}</div><h1 className="mt-4 font-[family-name:var(--nf-heading)] text-5xl font-extrabold tracking-[-0.04em]">{c.listingsTitle}</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-65">{c.listingsDescription}</p></div></section><section className="mx-auto max-w-[1360px] px-5 py-12 sm:px-8 lg:px-10"><div className="grid gap-3 rounded-[2rem] border border-[var(--nf-line)] p-4 sm:grid-cols-2 lg:grid-cols-4"><input className={field} placeholder={c.searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} /><select className={field} value={location} onChange={(event) => setLocation(event.target.value)}><option value="">{c.locationLabel}</option>{c.neighborhoods.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select><select className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select><PropertyTaxonomySelect config={config} value={propertyType} onChange={setPropertyType} className={field} /></div>{filtered.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <FriendlyCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-10 rounded-[2rem] border border-[var(--nf-line)] p-8 text-sm opacity-60">{c.emptyListings}</p>}</section><ClosedListingsGroups config={config} renderListing={(listing) => <FriendlyCard config={config} listing={listing} />}/></main><Footer config={config} /></div>;
}

export function NeighborhoodFriendlyDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={friendlyStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-sm text-[var(--nf-accent)]"><MapPin className="h-4 w-4" />{formatListingLocation(listing)}</div><h1 className="mt-3 max-w-4xl font-[family-name:var(--nf-heading)] text-5xl font-extrabold leading-[0.96] tracking-[-0.04em]">{listing.title}</h1></div><strong className="text-3xl">{formatListingPrice(listing)}</strong></div><div className="mt-9 grid gap-4 lg:grid-cols-[1.4fr_.6fr]"><div className="overflow-hidden rounded-[2.75rem] bg-[var(--nf-soft)]">{getListingImage(listing) ? <img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/10] h-full w-full object-cover" /> : null}</div><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => getListingImage(listing, index) ? <img key={index} src={getListingImage(listing, index)} alt={listing.title} className="h-full min-h-[190px] w-full rounded-[2rem] object-cover" /> : <div key={index} className="min-h-[190px] rounded-[2rem] bg-[var(--nf-soft)]" />)}</div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-[var(--nf-soft)] p-5"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[var(--nf-accent)] px-4 py-2 text-xs font-bold text-[var(--nf-on-primary)]">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span><PropertyTaxonomyBadge config={config} listing={listing} className="rounded-full border border-[var(--nf-line)] bg-[var(--nf-bg)] px-4 py-2 text-xs font-bold" /></div><Specs config={config} listing={listing} /></div></section><section className="border-t border-[var(--nf-line)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[1fr_420px]"><div><h2 className="font-[family-name:var(--nf-heading)] text-3xl font-extrabold">{c.listingAboutLabel}</h2><p className="mt-5 text-base leading-8 opacity-68">{listing.description}</p><h2 className="mt-12 border-t border-[var(--nf-line)] pt-10 font-[family-name:var(--nf-heading)] text-3xl font-extrabold">{c.listingFeaturesLabel}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="rounded-2xl bg-[var(--nf-soft)] p-4 text-sm">{feature}</div>)}</div></div><aside id="iletisim" className="h-fit rounded-[2.5rem] bg-[var(--nf-soft)] p-7 lg:sticky lg:top-6"><h2 className="font-[family-name:var(--nf-heading)] text-3xl font-extrabold">{c.tourTitle}</h2><p className="mt-3 text-sm leading-6 opacity-65">{c.tourDescription}</p><div className="mt-6"><LeadForm config={config} listing={listing} /></div></aside></div></section></main><Footer config={config} /></div>;
}
