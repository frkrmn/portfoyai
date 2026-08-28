import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, MapPin, Maximize2, Search } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Listing } from "@/portfoyai/types";
import { formatListingLocation } from "@/portfoyai/listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getHeroImage, getListingImage } from "../mediaFallbacks";
import { SharedTeamFooterLink, SharedTeamSection } from "../SharedTeamPage";
import { ClosedListingsGroups } from "../ClosedListingsGroups";
import { matchesPropertyTaxonomy, PropertyTaxonomyBadge, propertyTaxonomyLabel, PropertyTaxonomySelect } from "../PropertyTaxonomy";
import { contentFields } from "../content-schema";

export const contentSchema = contentFields(["eyebrow", "tagline", "ctaText", "navAbout", "navContact", "navListings", "featuredEyebrow", "findHomeTitle", "findHomeDescription", "keywordLabel", "locationLabel", "roomLabel", "priceRangeLabel", "searchLabel", "saleLabel", "rentLabel", "allLabel", "rentSectionTitle", "saleSectionTitle", "listingsTitle", "listingsDescription", "emptyListings", "detailsLabel", "backLabel", "areaLabel", "bedLabel", "bathLabel", "listingAboutLabel", "listingFeaturesLabel", "tourTitle", "tourDescription", "fullNameLabel", "phoneLabel", "messageLabel", "formSubmit", "formSubmitting", "formSuccess", "formError", "testimonialQuote", "testimonialAuthor", "testimonialRole", "teamDescription"], ["tagline", "findHomeDescription", "listingsDescription", "tourDescription", "formSuccess", "formError", "testimonialQuote", "teamDescription"]);

const bedroomsFor = (listing: Listing) => listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);
const bathroomsFor = (listing: Listing) => listing.bathroom_count ?? (bedroomsFor(listing) > 3 ? 2 : 1);
const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");

const cleanStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--cm-bg": config.colors.background,
  "--cm-primary": config.colors.primary,
  "--cm-accent": config.colors.accent,
  "--cm-text": config.colors.text,
  "--cm-soft": `color-mix(in srgb, ${config.colors.text} 5%, ${config.colors.background})`,
  "--cm-line": `color-mix(in srgb, ${config.colors.text} 14%, transparent)`,
  "--cm-on-primary": config.colors.background,
  "--cm-heading": config.fonts.heading,
  "--cm-body": config.fonts.body,
  backgroundColor: "var(--cm-bg)",
  color: "var(--cm-text)",
  fontFamily: "var(--cm-body)",
}) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="relative z-30 border-b border-[var(--cm-line)] bg-[var(--cm-bg)]"><div className="mx-auto flex h-[74px] max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--cm-heading)] text-xl font-extrabold tracking-[-0.025em]">{c.businessName}</Link><nav className="hidden items-center gap-8 text-[13px] font-medium md:flex"><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a href="#hakkimizda">{c.navAbout}</a><a href="#iletisim">{c.navContact}</a></nav><Link data-site-button to={`/site/${config.slug}/listings`} className="bg-[var(--cm-primary)] px-5 py-3 text-xs font-bold text-[var(--cm-on-primary)]">{c.ctaText}</Link></div></header>;
}

function Footer({ config }: SiteTemplateProps) {
  const c = config.content;
  return <><SharedTeamSection config={config} /><footer className="border-t border-[var(--cm-line)] bg-[var(--cm-soft)] px-5 py-14 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1380px] gap-10 md:grid-cols-[1fr_auto_auto]"><div><div className="font-[family-name:var(--cm-heading)] text-2xl font-extrabold">{c.businessName}</div><p className="mt-3 max-w-md text-sm leading-6 opacity-65">{c.tagline}</p><div className="mt-5 text-xs opacity-45">Fastate AI ile hazırlandı</div></div><nav className="space-y-3 text-sm"><Link className="block" to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a className="block" href="#hakkimizda">{c.navAbout}</a><a className="block" href="#iletisim">{c.navContact}</a></nav><address className="space-y-2 text-sm not-italic opacity-65"><div>{c.address}</div><div>{c.phone}</div><div>{c.email}</div></address></div><SharedTeamFooterLink config={config} /></footer></>;
}

function Specs({ config, listing, compact = false }: { config: TemplateConfig; listing: Listing; compact?: boolean }) {
  const c = config.content;
  return <div className={`flex flex-wrap items-center ${compact ? "gap-3 text-[11px]" : "gap-5 text-xs"}`}><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²<span className="sr-only">{c.areaLabel}</span></span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{bedroomsFor(listing)}<span className="sr-only">{c.bedLabel}</span></span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{bathroomsFor(listing)}<span className="sr-only">{c.bathLabel}</span></span></div>;
}

function ListingCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const image = getListingImage(listing);
  return <article className="group border border-[var(--cm-line)] bg-[var(--cm-bg)]"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-[var(--cm-soft)]">{image ? <img src={image} alt={listing.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="aspect-[4/3]" />}<span className="absolute left-3 top-3 bg-[var(--cm-primary)] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--cm-on-primary)]">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span></Link><div className="p-5"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cm-accent)]">{propertyTaxonomyLabel(config, listing)}</div><div className="mt-2 flex items-start gap-1.5 text-xs opacity-55"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{formatListingLocation(listing)}</div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-2 line-clamp-1 font-[family-name:var(--cm-heading)] text-lg font-bold">{listing.title}</h3></Link><strong className="mt-4 block text-xl text-[var(--cm-accent)]">{formatListingPrice(listing)}</strong><div className="mt-4 border-t border-[var(--cm-line)] pt-4"><Specs config={config} listing={listing} compact /></div></div></article>;
}

type FilterState = { query: string; location: string; propertyType: string; rooms: string; maxPrice: string };

function SearchPanel({ config, initialType = "all" }: SiteTemplateProps & { initialType?: string }) {
  const c = config.content;
  const navigate = useNavigate();
  const [type, setType] = useState(initialType);
  const [filters, setFilters] = useState<FilterState>({ query: "", location: "", propertyType: "all", rooms: "", maxPrice: "" });
  const set = (key: keyof FilterState, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    Object.entries(filters).forEach(([key, value]) => value.trim() && params.set(key, value.trim()));
    navigate(`/site/${config.slug}/listings${params.size ? `?${params}` : ""}`);
  };
  const field = "h-11 w-full border border-[var(--cm-line)] bg-[var(--cm-bg)] px-3 text-xs outline-none focus:border-[var(--cm-accent)]";
  return <form onSubmit={submit} className="border border-[var(--cm-line)] bg-[var(--cm-bg)] p-5 shadow-[0_18px_50px_color-mix(in_srgb,var(--cm-text)_10%,transparent)] sm:p-7"><div className="flex items-end justify-between gap-6"><div><h2 className="font-[family-name:var(--cm-heading)] text-2xl font-extrabold">{c.findHomeTitle}</h2><p className="mt-1 text-xs opacity-55">{c.findHomeDescription}</p></div><div className="flex border border-[var(--cm-line)] p-1 text-xs font-bold"><button data-site-button type="button" onClick={() => setType("sale")} className={`px-4 py-2 ${type === "sale" ? "bg-[var(--cm-primary)] text-[var(--cm-on-primary)]" : ""}`}>{c.saleLabel}</button><button data-site-button type="button" onClick={() => setType("rent")} className={`px-4 py-2 ${type === "rent" ? "bg-[var(--cm-primary)] text-[var(--cm-on-primary)]" : ""}`}>{c.rentLabel}</button></div></div><div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_.8fr_1fr_auto]"><input className={field} placeholder={c.keywordLabel} value={filters.query} onChange={(event) => set("query", event.target.value)} /><input className={field} placeholder={c.locationLabel} value={filters.location} onChange={(event) => set("location", event.target.value)} /><PropertyTaxonomySelect config={config} value={filters.propertyType} onChange={(value) => set("propertyType", value)} className={field} /><input className={field} placeholder={c.roomLabel} value={filters.rooms} onChange={(event) => set("rooms", event.target.value)} /><input type="number" min="0" className={field} placeholder={c.priceRangeLabel} value={filters.maxPrice} onChange={(event) => set("maxPrice", event.target.value)} /><button data-site-button className="flex h-11 items-center justify-center gap-2 bg-[var(--cm-primary)] px-5 text-xs font-bold text-[var(--cm-on-primary)]"><Search className="h-4 w-4" />{c.searchLabel}</button></div></form>;
}

function LeadForm({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: config.siteId, listing_id: listing.id, name: form.name, phone: form.phone, message: form.message }) });
      if (!response.ok) throw new Error();
      setForm({ name: "", phone: "", message: "" });
      setStatus("success");
    } catch { setStatus("error"); }
  };
  const input = "w-full border border-[var(--cm-line)] bg-[var(--cm-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--cm-accent)]";
  return <form onSubmit={submit} className="space-y-3"><input className={input} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input className={input} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /><textarea className={`${input} min-h-28 resize-none`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><button data-site-button disabled={status === "submitting"} className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--cm-primary)] px-5 text-xs font-bold text-[var(--cm-on-primary)] disabled:opacity-60">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className="text-sm text-[var(--cm-accent)]">{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className="text-sm">{c.formError}</p> : null}</form>;
}

function ListingSection({ config, type, title }: { config: TemplateConfig; type: Listing["listing_type"]; title: string }) {
  const listings = config.listings.filter((listing) => listing.listing_type === type).slice(0, 6);
  return <section className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20"><div className="flex items-end justify-between gap-5"><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cm-accent)]">{config.content.featuredEyebrow}</div><h2 className="mt-2 font-[family-name:var(--cm-heading)] text-3xl font-extrabold tracking-[-0.025em] sm:text-4xl">{title}</h2></div><Link to={`/site/${config.slug}/listings?type=${type}`} className="flex items-center gap-2 text-xs font-bold">{config.content.ctaText}<ArrowRight className="h-4 w-4" /></Link></div>{listings.length ? <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{listings.map((listing) => <ListingCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-9 border border-[var(--cm-line)] p-7 text-sm opacity-55">{config.content.emptyListings}</p>}</section>;
}

export function CleanModernHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const featured = config.listings[0];
  const heroImage = getHeroImage(config.siteId, config.content.heroImage || (featured?.media?.length ? getListingImage(featured) : undefined));
  const testimonialListing = config.listings[2] || featured;
  const testimonialImage = testimonialListing ? getListingImage(testimonialListing, 1) : getHeroImage(config.siteId, config.content.heroImage);
  return <div {...fineTuneAttributes(config)} style={cleanStyle(config)}><Header config={config} /><main><section className="relative min-h-[650px] bg-[var(--cm-soft)]">{heroImage ? <img src={heroImage} alt={featured?.title || c.headline} className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--cm-primary)_32%,transparent),transparent)]" /><div className="relative mx-auto flex min-h-[650px] max-w-[1380px] items-end px-5 pb-14 sm:px-8 lg:px-10">{featured ? <article className="w-full max-w-[500px] border-t-4 border-[var(--cm-accent)] bg-[var(--cm-bg)] p-7 shadow-[0_22px_65px_color-mix(in_srgb,var(--cm-text)_20%,transparent)] sm:p-9"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--cm-accent)]">{featured.listing_type === "sale" ? c.saleLabel : c.rentLabel}</div><strong className="mt-3 block text-3xl text-[var(--cm-accent)]">{formatListingPrice(featured)}</strong><div className="mt-3 flex items-center gap-1.5 text-xs opacity-55"><MapPin className="h-3.5 w-3.5" />{featured.address || featured.district}</div><h1 className="mt-3 font-[family-name:var(--cm-heading)] text-2xl font-extrabold">{featured.title}</h1><p className="mt-3 line-clamp-2 text-sm leading-6 opacity-62">{featured.description}</p><div className="mt-5 border-t border-[var(--cm-line)] pt-5"><Specs config={config} listing={featured} /></div><Link data-site-button to={`/site/${config.slug}/listings/${featured.id}`} className="mt-6 inline-flex items-center gap-2 bg-[var(--cm-primary)] px-5 py-3 text-xs font-bold text-[var(--cm-on-primary)]">{c.detailsLabel}<ArrowRight className="h-4 w-4" /></Link></article> : <div className="max-w-2xl bg-[var(--cm-bg)] p-9"><div className="text-xs font-bold uppercase tracking-wider text-[var(--cm-accent)]">{c.eyebrow}</div><h1 className="mt-4 font-[family-name:var(--cm-heading)] text-5xl font-extrabold">{c.headline}</h1><p className="mt-4 text-sm leading-7 opacity-60">{c.bio}</p></div>}</div></section><section className="relative z-10 mx-auto -mt-1 max-w-[1380px] px-5 sm:px-8 lg:-mt-9 lg:px-10"><SearchPanel config={config} initialType="sale" /></section><ListingSection config={config} type="rent" title={c.rentSectionTitle} /><div className="border-y border-[var(--cm-line)] bg-[var(--cm-soft)]"><ListingSection config={config} type="sale" title={c.saleSectionTitle} /></div>{config.layout.showTestimonial ? <section id="hakkimizda" className="relative min-h-[460px] overflow-hidden">{testimonialImage ? <img src={testimonialImage} alt={c.testimonialAuthor} className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-[color:color-mix(in_srgb,var(--cm-primary)_72%,transparent)]" /><div className="relative mx-auto flex min-h-[460px] max-w-[1380px] items-center px-5 sm:px-8 lg:px-10"><blockquote className="max-w-2xl bg-[var(--cm-bg)] p-8 sm:p-12"><p className="font-[family-name:var(--cm-heading)] text-3xl font-bold leading-tight">“{c.testimonialQuote}”</p><footer className="mt-7 border-t border-[var(--cm-line)] pt-5 text-sm"><strong>{c.testimonialAuthor}</strong><span className="ml-2 opacity-55">{c.testimonialRole}</span></footer></blockquote></div></section> : null}</main><Footer config={config} /></div>;
}

export function CleanModernListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({ query: params.get("query") || "", location: params.get("location") || "", propertyType: params.get("propertyType") || "all", rooms: params.get("rooms") || "", maxPrice: params.get("maxPrice") || "" });
  const [type, setType] = useState(params.get("type") || "all");
  const set = (key: keyof FilterState, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (type !== "all" && listing.listing_type !== type) return false;
    if (filters.query && !normalize(`${listing.title} ${listing.description}`).includes(normalize(filters.query))) return false;
    if (filters.location && !normalize(`${formatListingLocation(listing)} ${listing.address || ""}`).includes(normalize(filters.location))) return false;
    if (!matchesPropertyTaxonomy(listing, filters.propertyType)) return false;
    if (filters.rooms && !normalize(listing.room_count).includes(normalize(filters.rooms))) return false;
    if (filters.maxPrice && Number(listing.price) > Number(filters.maxPrice)) return false;
    return true;
  }), [config.listings, filters, type]);
  const field = "h-11 w-full border border-[var(--cm-line)] bg-[var(--cm-bg)] px-3 text-xs outline-none focus:border-[var(--cm-accent)]";
  return <div {...fineTuneAttributes(config)} style={cleanStyle(config)}><Header config={config} /><main><section className="border-b border-[var(--cm-line)] bg-[var(--cm-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1380px]"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--cm-accent)]">{c.featuredEyebrow}</div><h1 className="mt-3 font-[family-name:var(--cm-heading)] text-5xl font-extrabold tracking-[-0.035em]">{c.listingsTitle}</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-60">{c.listingsDescription}</p></div></section><section className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-3 border border-[var(--cm-line)] p-5 sm:grid-cols-2 lg:grid-cols-6"><input className={field} placeholder={c.keywordLabel} value={filters.query} onChange={(event) => set("query", event.target.value)} /><input className={field} placeholder={c.locationLabel} value={filters.location} onChange={(event) => set("location", event.target.value)} /><PropertyTaxonomySelect config={config} value={filters.propertyType} onChange={(value) => set("propertyType", value)} className={field} /><input className={field} placeholder={c.roomLabel} value={filters.rooms} onChange={(event) => set("rooms", event.target.value)} /><input type="number" className={field} placeholder={c.priceRangeLabel} value={filters.maxPrice} onChange={(event) => set("maxPrice", event.target.value)} /><select className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select></div>{filtered.length ? <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <ListingCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-9 border border-[var(--cm-line)] p-7 text-sm opacity-55">{c.emptyListings}</p>}</section><ClosedListingsGroups config={config} renderListing={(listing) => <ListingCard config={config} listing={listing} />}/></main><Footer config={config} /></div>;
}

export function CleanModernDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={cleanStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="flex items-center gap-1.5 text-xs text-[var(--cm-accent)]"><MapPin className="h-4 w-4" />{formatListingLocation(listing)}</div><h1 className="mt-3 max-w-4xl font-[family-name:var(--cm-heading)] text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{listing.title}</h1></div><strong className="text-3xl text-[var(--cm-accent)]">{formatListingPrice(listing)}</strong></div><div className="mt-9 grid gap-4 lg:grid-cols-[1.5fr_.5fr]"><div className="bg-[var(--cm-soft)]">{getListingImage(listing) ? <img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/9] h-full w-full object-cover" /> : null}</div><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => getListingImage(listing, index) ? <img key={index} src={getListingImage(listing, index)} alt={listing.title} className="h-full min-h-[180px] w-full object-cover" /> : <div key={index} className="min-h-[180px] bg-[var(--cm-soft)]" />)}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-5 border border-[var(--cm-line)] p-5"><div className="flex flex-wrap gap-2"><span className="bg-[var(--cm-primary)] px-3 py-2 text-[10px] font-bold uppercase text-[var(--cm-on-primary)]">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span><PropertyTaxonomyBadge config={config} listing={listing} className="border border-[var(--cm-line)] px-3 py-2 text-[10px] font-bold uppercase" /></div><Specs config={config} listing={listing} /></div></section><section className="border-t border-[var(--cm-line)] bg-[var(--cm-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[1fr_420px]"><div><h2 className="font-[family-name:var(--cm-heading)] text-3xl font-extrabold">{c.listingAboutLabel}</h2><p className="mt-5 text-sm leading-8 opacity-68">{listing.description}</p><h2 className="mt-12 border-t border-[var(--cm-line)] pt-10 font-[family-name:var(--cm-heading)] text-3xl font-extrabold">{c.listingFeaturesLabel}</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="border border-[var(--cm-line)] bg-[var(--cm-bg)] p-4 text-sm">{feature}</div>)}</div></div><aside id="iletisim" className="h-fit border-t-4 border-[var(--cm-accent)] bg-[var(--cm-bg)] p-7 shadow-[0_18px_55px_color-mix(in_srgb,var(--cm-text)_10%,transparent)] lg:sticky lg:top-5"><h2 className="font-[family-name:var(--cm-heading)] text-2xl font-extrabold">{c.tourTitle}</h2><p className="mt-3 text-sm leading-6 opacity-60">{c.tourDescription}</p><div className="mt-6"><LeadForm config={config} listing={listing} /></div></aside></div></section></main><Footer config={config} /></div>;
}
