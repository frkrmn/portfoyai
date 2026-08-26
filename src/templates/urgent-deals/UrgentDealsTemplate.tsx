import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Clock3, MapPin, Maximize2, Search, Tag, Zap } from "lucide-react";
import type { Listing } from "@/portfoyai/types";
import { formatListingLocation } from "@/portfoyai/listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import { getListingImage } from "../mediaFallbacks";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { ClosedListingsGroups } from "../ClosedListingsGroups";
import { matchesPropertyTaxonomy, PropertyTaxonomyBadge, PropertyTaxonomySelect } from "../PropertyTaxonomy";

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");
const daysOnline = (createdAt: string) => Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
const bedrooms = (listing: Listing) => listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);
const bathrooms = (listing: Listing) => listing.bathroom_count ?? (bedrooms(listing) >= 4 ? 2 : 1);
const hasReduction = (listing: Listing) => Number(listing.price_reduced_from) > Number(listing.price);
const isDeal = (listing: Listing) => listing.urgent_sale === true || hasReduction(listing);
const discountPercent = (listing: Listing) => hasReduction(listing) ? Math.round((1 - Number(listing.price) / Number(listing.price_reduced_from)) * 100) : 0;

const dealStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--ud-bg": config.colors.background,
  "--ud-primary": config.colors.primary,
  "--ud-accent": config.colors.accent,
  "--ud-text": config.colors.text,
  "--ud-soft": `color-mix(in srgb, ${config.colors.text} 5%, ${config.colors.background})`,
  "--ud-alert-soft": `color-mix(in srgb, ${config.colors.accent} 12%, ${config.colors.background})`,
  "--ud-line": `color-mix(in srgb, ${config.colors.text} 14%, transparent)`,
  "--ud-on-primary": config.colors.background,
  "--ud-heading": config.fonts.heading,
  "--ud-body": config.fonts.body,
  backgroundColor: "var(--ud-bg)",
  color: "var(--ud-text)",
  fontFamily: "var(--ud-body)",
}) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="border-b border-[var(--ud-line)] bg-[var(--ud-bg)]"><div className="mx-auto flex h-[74px] max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--ud-heading)] text-xl font-black tracking-[-0.035em]">{c.businessName}</Link><nav className="hidden items-center gap-8 text-xs font-bold md:flex"><a href="#firsatlar">{c.navAbout}</a><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a href="#iletisim">{c.navContact}</a></nav><Link data-site-button to={`/site/${config.slug}/listings`} className="flex items-center gap-2 rounded-full bg-[var(--ud-primary)] px-5 py-3 text-xs font-bold text-[var(--ud-on-primary)]">{c.ctaText}<ArrowRight className="h-4 w-4" /></Link></div></header>;
}

function Footer({ config }: SiteTemplateProps) {
  const c = config.content;
  return <footer className="border-t border-[var(--ud-line)] bg-[var(--ud-primary)] px-5 py-12 text-[var(--ud-on-primary)] sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1380px] gap-8 md:grid-cols-[1fr_auto]"><div><div className="font-[family-name:var(--ud-heading)] text-2xl font-black">{c.businessName}</div><p className="mt-3 max-w-lg text-sm opacity-65">{c.tagline}</p><div className="mt-5 text-xs opacity-45">Fastate AI ile hazırlandı</div></div><address className="space-y-2 text-sm not-italic opacity-70"><div>{c.phone}</div><div>{c.email}</div><div>{c.address}</div></address></div></footer>;
}

function UrgencyBadges({ config, listing, large = false }: { config: TemplateConfig; listing: Listing; large?: boolean }) {
  const c = config.content;
  return <div className="flex flex-wrap gap-2">{listing.urgent_sale ? <span className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--ud-accent)] font-black text-[var(--ud-on-primary)] ${large ? "px-4 py-2 text-xs" : "px-3 py-1.5 text-[10px]"}`}><Zap className="h-3.5 w-3.5" />{c.urgentSaleLabel}</span> : null}{hasReduction(listing) ? <span className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--ud-primary)] font-black text-[var(--ud-on-primary)] ${large ? "px-4 py-2 text-xs" : "px-3 py-1.5 text-[10px]"}`}><Tag className="h-3.5 w-3.5" />{c.priceDroppedLabel} · %{discountPercent(listing)}</span> : null}</div>;
}

function Specs({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <div className="flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²<span className="sr-only">{c.areaLabel}</span></span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{bedrooms(listing)}<span className="sr-only">{c.bedLabel}</span></span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{bathrooms(listing)}<span className="sr-only">{c.bathLabel}</span></span></div>;
}

function DealCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <article className="group overflow-hidden rounded-2xl border border-[var(--ud-line)] bg-[var(--ud-bg)]"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-[var(--ud-soft)]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="absolute left-4 top-4"><UrgencyBadges config={config} listing={listing} /></div></Link><div className="p-5"><PropertyTaxonomyBadge config={config} listing={listing} className="mb-3 inline-flex rounded-full bg-[var(--ud-alert-soft)] px-3 py-1.5 text-[10px] font-black text-[var(--ud-accent)]" /><div className="flex items-center justify-between gap-4 text-[11px] opacity-55"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{formatListingLocation(listing)}</span><span className="flex shrink-0 items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{daysOnline(listing.created_at)} {c.daysOnlineLabel}</span></div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-3 font-[family-name:var(--ud-heading)] text-xl font-black leading-tight tracking-[-0.025em]">{listing.title}</h3></Link><div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--ud-line)] pt-4"><div>{hasReduction(listing) ? <div className="text-xs line-through opacity-45">{c.originalPriceLabel}: {formatListingPrice(listing, Number(listing.price_reduced_from))}</div> : null}<strong className="mt-1 block text-xl text-[var(--ud-accent)]">{formatListingPrice(listing)}</strong></div><Specs config={config} listing={listing} /></div></div></article>;
}

function DenseDeal({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <Link to={`/site/${config.slug}/listings/${listing.id}`} className="group grid grid-cols-[116px_1fr] gap-4 rounded-2xl border border-[var(--ud-line)] bg-[var(--ud-bg)] p-3 sm:grid-cols-[150px_1fr]"><img src={getListingImage(listing)} alt={listing.title} className="h-full min-h-[112px] w-full rounded-xl object-cover" /><div className="min-w-0 py-1"><div className="flex flex-wrap items-center gap-2"><UrgencyBadges config={config} listing={listing} /><PropertyTaxonomyBadge config={config} listing={listing} className="rounded-full bg-[var(--ud-alert-soft)] px-3 py-1.5 text-[10px] font-black text-[var(--ud-accent)]" /></div><h3 className="mt-3 line-clamp-1 font-[family-name:var(--ud-heading)] text-lg font-black">{listing.title}</h3><div className="mt-2 flex items-center gap-3 text-[11px] opacity-55"><span>{formatListingLocation(listing)}</span><span>·</span><span>{daysOnline(listing.created_at)} {c.daysOnlineLabel}</span></div><div className="mt-3 flex items-end gap-3"><strong className="text-lg text-[var(--ud-accent)]">{formatListingPrice(listing)}</strong>{hasReduction(listing) ? <span className="text-xs line-through opacity-40">{formatListingPrice(listing, Number(listing.price_reduced_from))}</span> : null}</div></div></Link>;
}

function SearchPanel({ config, hero = false }: { config: TemplateConfig; hero?: boolean }) {
  const c = config.content;
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); const params = new URLSearchParams(); if (location) params.set("location", location); if (price) params.set("maxPrice", price); navigate(`/site/${config.slug}/listings${params.size ? `?${params}` : ""}`); };
  const field = `h-12 w-full bg-transparent px-4 text-sm outline-none ${hero ? "text-[var(--ud-text)]" : ""}`;
  return <form onSubmit={submit} className="grid overflow-hidden rounded-2xl border border-[var(--ud-line)] bg-[var(--ud-bg)] shadow-[0_18px_55px_rgba(0,0,0,.12)] sm:grid-cols-[1fr_1fr_auto]"><label className="flex items-center border-b border-[var(--ud-line)] sm:border-b-0 sm:border-r"><MapPin className="ml-4 h-4 w-4 text-[var(--ud-accent)]" /><input className={field} placeholder={c.locationLabel} value={location} onChange={(event) => setLocation(event.target.value)} /></label><label className="flex items-center border-b border-[var(--ud-line)] sm:border-b-0 sm:border-r"><Tag className="ml-4 h-4 w-4 text-[var(--ud-accent)]" /><input type="number" className={field} placeholder={c.priceRangeLabel} value={price} onChange={(event) => setPrice(event.target.value)} /></label><button data-site-button className="flex h-12 items-center justify-center gap-2 bg-[var(--ud-accent)] px-6 text-xs font-black text-[var(--ud-on-primary)]"><Search className="h-4 w-4" />{c.searchLabel}</button></form>;
}

function LeadForm({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => { event.preventDefault(); setStatus("submitting"); try { const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: config.siteId, listing_id: listing.id, name: form.name, phone: form.phone, message: form.message }) }); if (!response.ok) throw new Error(); setForm({ name: "", phone: "", message: "" }); setStatus("success"); } catch { setStatus("error"); } };
  const field = "w-full rounded-xl border border-[var(--ud-line)] bg-[var(--ud-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--ud-accent)]";
  return <form onSubmit={submit} className="space-y-3"><input className={field} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input className={field} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /><textarea className={`${field} min-h-28 resize-none`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><button data-site-button disabled={status === "submitting"} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ud-accent)] px-5 text-xs font-black text-[var(--ud-on-primary)]">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className="text-sm text-[var(--ud-accent)]">{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className="text-sm">{c.formError}</p> : null}</form>;
}

export function UrgentDealsHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const deals = useMemo(() => { const qualifying = config.listings.filter(isDeal); const source = qualifying.length ? qualifying : config.listings; return [...source].sort((a, b) => Number(b.urgent_sale) - Number(a.urgent_sale) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4); }, [config.listings]);
  return <div {...fineTuneAttributes(config)} style={dealStyle(config)}><Header config={config} /><main><section className="relative overflow-hidden bg-[var(--ud-primary)] px-5 py-20 text-[var(--ud-on-primary)] sm:px-8 lg:px-10 lg:py-28"><div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:24px_24px]" /><div className="relative mx-auto max-w-[1380px]"><div className="inline-flex items-center gap-2 rounded-full bg-[var(--ud-accent)] px-4 py-2 text-xs font-black"><Zap className="h-4 w-4" />{c.eyebrow}</div><h1 className="mt-7 max-w-5xl font-[family-name:var(--ud-heading)] text-6xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-[88px]">{c.headline}</h1><p className="mt-7 max-w-2xl text-base leading-8 opacity-72">{c.bio}</p><div className="mt-10 max-w-4xl"><SearchPanel config={config} hero /></div></div></section><section id="firsatlar" className="border-b border-[var(--ud-line)] bg-[var(--ud-soft)] px-5 py-16 sm:px-8 lg:px-10 lg:py-20"><div className="mx-auto max-w-[1380px]"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ud-accent)]">{c.featuredEyebrow}</div><h2 className="mt-3 font-[family-name:var(--ud-heading)] text-4xl font-black tracking-[-0.04em]">{c.dealsSectionTitle}</h2><p className="mt-3 text-sm opacity-60">{c.dealsSectionDescription}</p></div><Link className="flex items-center gap-2 text-xs font-black" to={`/site/${config.slug}/listings`}>{c.ctaText}<ArrowRight className="h-4 w-4" /></Link></div><div className="mt-9 grid gap-4 lg:grid-cols-2">{deals.map((listing) => <DenseDeal key={listing.id} config={config} listing={listing} />)}</div></div></section><section className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24"><div className="flex items-end justify-between gap-5"><div><div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ud-accent)]">{c.opportunityLabel}</div><h2 className="mt-3 font-[family-name:var(--ud-heading)] text-4xl font-black tracking-[-0.04em]">{c.listingsTitle}</h2></div></div><div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{config.listings.slice(0, 6).map((listing) => <DealCard key={listing.id} config={config} listing={listing} />)}</div></section></main><Footer config={config} /></div>;
}

export function UrgentDealsListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params] = useSearchParams();
  const [location, setLocation] = useState(params.get("location") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");
  const [type, setType] = useState(params.get("type") || "all");
  const [propertyType, setPropertyType] = useState(params.get("property") || "all");
  const [dealsOnly, setDealsOnly] = useState(false);
  const filtered = useMemo(() => config.listings.filter((listing) => { if (type !== "all" && listing.listing_type !== type) return false; if (!matchesPropertyTaxonomy(listing, propertyType)) return false; if (dealsOnly && !isDeal(listing)) return false; if (location && !normalize(`${formatListingLocation(listing)} ${listing.address || ""}`).includes(normalize(location))) return false; return !maxPrice || listing.price <= Number(maxPrice); }), [config.listings, dealsOnly, location, maxPrice, propertyType, type]);
  const field = "h-12 w-full rounded-xl border border-[var(--ud-line)] bg-[var(--ud-bg)] px-4 text-sm outline-none focus:border-[var(--ud-accent)]";
  return <div {...fineTuneAttributes(config)} style={dealStyle(config)}><Header config={config} /><main><section className="border-b border-[var(--ud-line)] bg-[var(--ud-primary)] px-5 py-16 text-[var(--ud-on-primary)] sm:px-8 lg:px-10"><div className="mx-auto max-w-[1380px]"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--ud-accent)]"><Zap className="h-4 w-4" />{c.eyebrow}</div><h1 className="mt-4 font-[family-name:var(--ud-heading)] text-5xl font-black tracking-[-0.05em]">{c.listingsTitle}</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-65">{c.listingsDescription}</p></div></section><section className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-3 rounded-2xl border border-[var(--ud-line)] bg-[var(--ud-soft)] p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"><input className={field} placeholder={c.locationLabel} value={location} onChange={(event) => setLocation(event.target.value)} /><input type="number" className={field} placeholder={c.priceRangeLabel} value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /><select className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select><PropertyTaxonomySelect config={config} value={propertyType} onChange={setPropertyType} className={field} /><button data-site-button aria-pressed={dealsOnly} onClick={() => setDealsOnly((value) => !value)} className={`flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-xs font-black ${dealsOnly ? "bg-[var(--ud-accent)] text-[var(--ud-on-primary)]" : "border border-[var(--ud-line)] bg-[var(--ud-bg)]"}`}><Zap className="h-4 w-4" />{c.opportunityLabel}</button></div>{filtered.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <DealCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-10 rounded-2xl border border-[var(--ud-line)] p-8 text-sm opacity-60">{c.emptyListings}</p>}</section><ClosedListingsGroups config={config} renderListing={(listing) => <DealCard config={config} listing={listing} />}/></main><Footer config={config} /></div>;
}

export function UrgentDealsDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={dealStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs font-black"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><UrgencyBadges config={config} listing={listing} large /><div className="mt-4 flex flex-wrap items-center gap-4 text-xs opacity-55"><PropertyTaxonomyBadge config={config} listing={listing} className="rounded-full border border-[var(--ud-line)] bg-[var(--ud-soft)] px-3 py-1.5 font-black text-[var(--ud-accent)]" /><span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{formatListingLocation(listing)}</span><span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{daysOnline(listing.created_at)} {c.daysOnlineLabel}</span></div><h1 className="mt-4 max-w-4xl font-[family-name:var(--ud-heading)] text-5xl font-black leading-[0.95] tracking-[-0.05em]">{listing.title}</h1></div><div className="lg:text-right">{hasReduction(listing) ? <div className="text-sm line-through opacity-45">{c.originalPriceLabel}: {formatListingPrice(listing, Number(listing.price_reduced_from))}</div> : null}<strong className="mt-1 block text-4xl text-[var(--ud-accent)]">{formatListingPrice(listing)}</strong></div></div><div className="mt-9 grid gap-4 lg:grid-cols-[1.45fr_.55fr]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/9] h-full w-full rounded-2xl object-cover" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => <img key={index} src={getListingImage(listing, index)} alt={listing.title} className="h-full min-h-[180px] w-full rounded-2xl object-cover" />)}</div></div><div className="mt-5 rounded-2xl border border-[var(--ud-line)] bg-[var(--ud-soft)] p-5"><Specs config={config} listing={listing} /></div></section><section className="border-t border-[var(--ud-line)] bg-[var(--ud-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[1fr_420px]"><div><h2 className="font-[family-name:var(--ud-heading)] text-3xl font-black">{c.listingAboutLabel}</h2><p className="mt-5 text-base leading-8 opacity-68">{listing.description}</p><section className="mt-10 border-t border-[var(--ud-line)] pt-10"><h2 className="font-[family-name:var(--ud-heading)] text-3xl font-black">{c.listingFeaturesLabel}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="rounded-xl border border-[var(--ud-line)] bg-[var(--ud-bg)] p-4 text-sm">{feature}</div>)}</div></section></div><aside id="iletisim" className="h-fit rounded-2xl border-t-4 border-[var(--ud-accent)] bg-[var(--ud-bg)] p-7 lg:sticky lg:top-6"><h2 className="font-[family-name:var(--ud-heading)] text-3xl font-black">{c.tourTitle}</h2><p className="mt-3 text-sm leading-7 opacity-62">{c.tourDescription}</p><div className="mt-6"><LeadForm config={config} listing={listing} /></div></aside></div></section></main><Footer config={config} /></div>;
}
