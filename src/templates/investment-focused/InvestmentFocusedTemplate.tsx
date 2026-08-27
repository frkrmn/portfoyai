import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BarChart3, Bath, BedDouble, Building2, Grid2X2, List, MapPin, Maximize2, Search, TrendingUp } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Listing } from "@/portfoyai/types";
import { formatListingLocation } from "@/portfoyai/listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getListingImage } from "../mediaFallbacks";
import { SharedTeamFooterLink, SharedTeamSection } from "../SharedTeamPage";
import { ClosedListingsGroups } from "../ClosedListingsGroups";
import { matchesPropertyTaxonomy, PropertyTaxonomyBadge, propertyTaxonomyLabel, PropertyTaxonomySelect } from "../PropertyTaxonomy";

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");
const bedroomsFor = (listing: Listing) => listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);
const bathroomsFor = (listing: Listing) => listing.bathroom_count ?? (bedroomsFor(listing) > 3 ? 2 : 1);
const formatYield = (value?: number | null) => value == null ? "—" : `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(Number(value))}`;
const pricePerM2 = (listing: Listing) => Number(listing.m2) ? Number(listing.price) / Number(listing.m2) : 0;

const investmentStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--if-bg": config.colors.background,
  "--if-primary": config.colors.primary,
  "--if-accent": config.colors.accent,
  "--if-text": config.colors.text,
  "--if-soft": `color-mix(in srgb, ${config.colors.text} 5%, ${config.colors.background})`,
  "--if-metric": `color-mix(in srgb, ${config.colors.accent} 12%, ${config.colors.background})`,
  "--if-line": `color-mix(in srgb, ${config.colors.text} 14%, transparent)`,
  "--if-on-primary": config.colors.background,
  "--if-heading": config.fonts.heading,
  "--if-body": config.fonts.body,
  backgroundColor: "var(--if-bg)",
  color: "var(--if-text)",
  fontFamily: "var(--if-body)",
}) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="border-b border-[var(--if-line)] bg-[var(--if-bg)]"><div className="mx-auto flex h-[74px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--if-heading)] text-xl font-extrabold tracking-[-0.025em]">{c.businessName}</Link><nav className="hidden items-center gap-8 text-xs font-semibold md:flex"><a href="#yaklasim">{c.navAbout}</a><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a href="#iletisim">{c.navContact}</a></nav><Link data-site-button to={`/site/${config.slug}/listings`} className="flex items-center gap-2 bg-[var(--if-primary)] px-5 py-3 text-xs font-bold text-[var(--if-on-primary)]">{c.ctaText}<ArrowRight className="h-4 w-4" /></Link></div></header>;
}

function Footer({ config }: SiteTemplateProps) {
  const c = config.content;
  return <><SharedTeamSection config={config} /><footer className="border-t border-[var(--if-line)] bg-[var(--if-soft)] px-5 py-12 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-[1fr_auto]"><div><div className="font-[family-name:var(--if-heading)] text-xl font-extrabold">{c.agentName}</div><p className="mt-2 max-w-lg text-sm opacity-60">{c.tagline}</p><div className="mt-5 text-xs opacity-45">Fastate AI ile hazırlandı</div></div><address className="space-y-2 text-sm not-italic opacity-65"><div>{c.phone}</div><div>{c.email}</div><div>{c.address}</div></address></div><SharedTeamFooterLink config={config} /></footer></>;
}

function Specs({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <div className="flex flex-wrap gap-4 text-xs"><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²<span className="sr-only">{c.areaLabel}</span></span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{bedroomsFor(listing)}<span className="sr-only">{c.bedLabel}</span></span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{bathroomsFor(listing)}<span className="sr-only">{c.bathLabel}</span></span></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="border-l-2 border-[var(--if-accent)] bg-[var(--if-metric)] px-5 py-4 text-[var(--if-text)]"><div className="text-[10px] font-bold uppercase tracking-[0.13em] opacity-70">{label}</div><div className="mt-1 font-[family-name:var(--if-heading)] text-2xl font-extrabold text-[var(--if-accent)]">{value}</div></div>;
}

function InvestmentCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <article className="group border border-[var(--if-line)] bg-[var(--if-bg)]"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-[var(--if-soft)]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.025]" />{listing.rental_yield_percent != null ? <span className="absolute left-4 top-4 bg-[var(--if-accent)] px-3 py-2 text-[10px] font-bold text-[var(--if-on-primary)]">{c.rentalYieldLabel} {formatYield(listing.rental_yield_percent)}</span> : null}</Link><div className="p-5"><PropertyTaxonomyBadge config={config} listing={listing} className="inline-flex bg-[var(--if-metric)] px-3 py-1.5 text-[10px] font-bold text-[var(--if-accent)]" /><div className="mt-3 flex items-center gap-1.5 text-xs opacity-55"><MapPin className="h-3.5 w-3.5" />{formatListingLocation(listing)}</div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-2 font-[family-name:var(--if-heading)] text-xl font-extrabold leading-tight">{listing.title}</h3></Link><div className="mt-5 grid grid-cols-2 gap-3"><Metric label={c.pricePerM2Label} value={formatListingPrice(listing, pricePerM2(listing))} /><Metric label={c.rentalYieldLabel} value={formatYield(listing.rental_yield_percent)} /></div>{listing.roi_notes ? <p className="mt-4 border-l-2 border-[var(--if-accent)] pl-3 text-xs leading-5 opacity-65">{listing.roi_notes}</p> : null}<div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--if-line)] pt-4"><div><strong className="block text-lg">{formatListingPrice(listing)}</strong><div className="mt-2"><Specs config={config} listing={listing} /></div></div><ArrowRight className="h-4 w-4 text-[var(--if-accent)]" /></div></div></article>;
}

function ComparisonTable({ config, listings }: { config: TemplateConfig; listings: Listing[] }) {
  const c = config.content;
  return <div className="overflow-x-auto border border-[var(--if-line)]"><table className="w-full min-w-[900px] border-collapse text-left text-sm"><thead className="bg-[var(--if-soft)] text-[10px] uppercase tracking-[0.12em]"><tr><th className="px-5 py-4">{c.listingsTitle}</th><th className="px-5 py-4">{c.priceRangeLabel}</th><th className="px-5 py-4">{c.areaLabel}</th><th className="px-5 py-4">{c.pricePerM2Label}</th><th className="px-5 py-4">{c.rentalYieldLabel}</th><th className="px-5 py-4">{c.detailsLabel}</th></tr></thead><tbody className="divide-y divide-[var(--if-line)]">{listings.map((listing) => <tr key={listing.id} className="hover:bg-[var(--if-soft)]"><td className="px-5 py-5"><div className="font-semibold">{listing.title}</div><div className="mt-1 text-xs opacity-50">{formatListingLocation(listing)} · {propertyTaxonomyLabel(config, listing)}</div></td><td className="whitespace-nowrap px-5 py-5 font-semibold">{formatListingPrice(listing)}</td><td className="px-5 py-5">{listing.m2} m²</td><td className="whitespace-nowrap px-5 py-5">{formatListingPrice(listing, pricePerM2(listing))}</td><td className="px-5 py-5"><span className="bg-[var(--if-metric)] px-3 py-2 font-bold text-[var(--if-accent)]">{formatYield(listing.rental_yield_percent)}</span></td><td className="px-5 py-5"><Link className="inline-flex items-center gap-2 font-bold text-[var(--if-accent)]" to={`/site/${config.slug}/listings/${listing.id}`}>{c.detailsLabel}<ArrowRight className="h-3.5 w-3.5" /></Link></td></tr>)}</tbody></table></div>;
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
  const field = "w-full border border-[var(--if-line)] bg-[var(--if-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--if-accent)]";
  return <form onSubmit={submit} className="space-y-3"><input className={field} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input className={field} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /><textarea className={`${field} min-h-28 resize-none`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><button data-site-button disabled={status === "submitting"} className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--if-primary)] px-5 text-xs font-bold text-[var(--if-on-primary)]">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className="text-sm text-[var(--if-accent)]">{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className="text-sm">{c.formError}</p> : null}</form>;
}

export function InvestmentFocusedHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const yields = config.listings.map((listing) => listing.rental_yield_percent).filter((value): value is number => value != null);
  const averageYield = yields.length ? yields.reduce((total, value) => total + Number(value), 0) / yields.length : null;
  return <div {...fineTuneAttributes(config)} style={investmentStyle(config)}><Header config={config} /><main><section className="relative overflow-hidden border-b border-[var(--if-line)] bg-[var(--if-primary)] px-5 py-24 text-[var(--if-on-primary)] sm:px-8 lg:px-10 lg:py-32"><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(var(--if-line)_1px,transparent_1px),linear-gradient(90deg,var(--if-line)_1px,transparent_1px)] [background-size:48px_48px]" /><div className="relative mx-auto max-w-[1400px]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--if-accent)]"><TrendingUp className="h-4 w-4" />{c.eyebrow}</div><h1 className="mt-6 max-w-5xl font-[family-name:var(--if-heading)] text-6xl font-extrabold leading-[0.92] tracking-[-0.05em] sm:text-7xl lg:text-[88px]">{c.headline}</h1><p className="mt-7 max-w-2xl text-base leading-8 opacity-68">{c.bio}</p><div className="mt-12 grid gap-3 sm:grid-cols-3"><Metric label={c.averageYieldLabel} value={averageYield == null ? c.stats[0].value : formatYield(averageYield)} /><Metric label={c.regionalGrowthLabel} value={c.stats[1].value} /><Metric label={c.activePortfolioLabel} value={String(config.listings.length)} /></div></div></section><section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--if-accent)]">{c.featuredEyebrow}</div><h2 className="mt-3 font-[family-name:var(--if-heading)] text-4xl font-extrabold tracking-[-0.035em]">{c.featuredTitle}</h2></div><Link to={`/site/${config.slug}/listings`} className="flex items-center gap-2 text-xs font-bold">{c.ctaText}<ArrowRight className="h-4 w-4" /></Link></div><div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{config.listings.slice(0, 3).map((listing) => <InvestmentCard key={listing.id} config={config} listing={listing} />)}</div></section><section id="yaklasim" className="border-y border-[var(--if-line)] bg-[var(--if-soft)] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-[1400px]"><div className="max-w-3xl"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--if-accent)]">{c.navAbout}</div><h2 className="mt-4 font-[family-name:var(--if-heading)] text-4xl font-extrabold leading-tight">{c.investmentWhyTitle}</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{c.whyItems.slice(0, 3).map((item, index) => { const Icon = index === 0 ? Building2 : index === 1 ? BarChart3 : TrendingUp; return <article key={item.title} className="border border-[var(--if-line)] bg-[var(--if-bg)] p-7"><div className="grid h-11 w-11 place-items-center bg-[var(--if-metric)] text-[var(--if-accent)]"><Icon className="h-5 w-5" /></div><h3 className="mt-6 font-[family-name:var(--if-heading)] text-xl font-extrabold">{item.title}</h3><p className="mt-3 text-sm leading-7 opacity-62">{item.description}</p></article>; })}</div></div></section></main><Footer config={config} /></div>;
}

export function InvestmentFocusedListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState(params.get("location") || "");
  const [type, setType] = useState(params.get("type") || "all");
  const [propertyType, setPropertyType] = useState(params.get("property") || "all");
  const [view, setView] = useState<"cards" | "comparison">("cards");
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (type !== "all" && listing.listing_type !== type) return false;
    if (!matchesPropertyTaxonomy(listing, propertyType)) return false;
    if (location && !normalize(`${formatListingLocation(listing)} ${listing.address || ""}`).includes(normalize(location))) return false;
    return !query || normalize(`${listing.title} ${listing.description}`).includes(normalize(query));
  }), [config.listings, location, propertyType, query, type]);
  const field = "h-12 w-full border border-[var(--if-line)] bg-[var(--if-bg)] px-4 text-sm outline-none focus:border-[var(--if-accent)]";
  return <div {...fineTuneAttributes(config)} style={investmentStyle(config)}><Header config={config} /><main><section className="border-b border-[var(--if-line)] bg-[var(--if-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1400px]"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--if-accent)]">{c.featuredEyebrow}</div><h1 className="mt-4 font-[family-name:var(--if-heading)] text-5xl font-extrabold tracking-[-0.04em]">{c.listingsTitle}</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-62">{c.listingsDescription}</p></div></section><section className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-3 border border-[var(--if-line)] p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"><label className="relative"><Search className="absolute left-4 top-4 h-4 w-4 opacity-40" /><input className={`${field} pl-11`} placeholder={c.searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} /></label><input className={field} placeholder={c.locationLabel} value={location} onChange={(event) => setLocation(event.target.value)} /><select className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select><PropertyTaxonomySelect config={config} value={propertyType} onChange={setPropertyType} className={field} /><div className="flex border border-[var(--if-line)] p-1"><button data-site-button aria-pressed={view === "cards"} onClick={() => setView("cards")} className={`flex items-center gap-2 px-4 text-xs font-bold ${view === "cards" ? "bg-[var(--if-primary)] text-[var(--if-on-primary)]" : ""}`}><Grid2X2 className="h-4 w-4" />{c.cardViewLabel}</button><button data-site-button aria-pressed={view === "comparison"} onClick={() => setView("comparison")} className={`flex items-center gap-2 px-4 text-xs font-bold ${view === "comparison" ? "bg-[var(--if-primary)] text-[var(--if-on-primary)]" : ""}`}><List className="h-4 w-4" />{c.comparisonViewLabel}</button></div></div>{filtered.length ? view === "cards" ? <div data-view="cards" className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <InvestmentCard key={listing.id} config={config} listing={listing} />)}</div> : <div data-view="comparison" className="mt-10"><ComparisonTable config={config} listings={filtered} /></div> : <p className="mt-10 border border-[var(--if-line)] p-8 text-sm opacity-60">{c.emptyListings}</p>}</section><ClosedListingsGroups config={config} renderListing={(listing) => <InvestmentCard config={config} listing={listing} />}/></main><Footer config={config} /></div>;
}

export function InvestmentFocusedDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={investmentStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex flex-wrap items-center gap-3 text-xs text-[var(--if-accent)]"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{formatListingLocation(listing)}</span><PropertyTaxonomyBadge config={config} listing={listing} className="border border-[var(--if-line)] px-3 py-1.5 font-bold" /></div><h1 className="mt-3 max-w-4xl font-[family-name:var(--if-heading)] text-5xl font-extrabold leading-[0.96] tracking-[-0.04em]">{listing.title}</h1></div><strong className="text-3xl">{formatListingPrice(listing)}</strong></div><div className="mt-9 grid gap-4 lg:grid-cols-[1.45fr_.55fr]"><div className="bg-[var(--if-soft)]">{getListingImage(listing) ? <img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/9] h-full w-full object-cover" /> : null}</div><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => getListingImage(listing, index) ? <img key={index} src={getListingImage(listing, index)} alt={listing.title} className="h-full min-h-[180px] w-full object-cover" /> : <div key={index} className="min-h-[180px] bg-[var(--if-soft)]" />)}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={c.priceRangeLabel} value={formatListingPrice(listing)} /><Metric label={c.pricePerM2Label} value={formatListingPrice(listing, pricePerM2(listing))} /><Metric label={c.rentalYieldLabel} value={formatYield(listing.rental_yield_percent)} /><Metric label={c.areaLabel} value={`${listing.m2} m²`} /></div></section><section className="border-t border-[var(--if-line)] bg-[var(--if-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1fr_420px]"><div><section><h2 className="font-[family-name:var(--if-heading)] text-3xl font-extrabold">{c.roiLabel}</h2><p className="mt-5 border-l-2 border-[var(--if-accent)] bg-[var(--if-bg)] p-5 text-sm leading-7">{listing.roi_notes || c.listingsDescription}</p></section><section className="mt-10 border-t border-[var(--if-line)] pt-10"><h2 className="font-[family-name:var(--if-heading)] text-3xl font-extrabold">{c.listingAboutLabel}</h2><p className="mt-5 text-base leading-8 opacity-68">{listing.description}</p></section><section className="mt-10 border-t border-[var(--if-line)] pt-10"><h2 className="font-[family-name:var(--if-heading)] text-3xl font-extrabold">{c.listingFeaturesLabel}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="border border-[var(--if-line)] bg-[var(--if-bg)] p-4 text-sm">{feature}</div>)}</div></section></div><aside id="iletisim" className="h-fit border-t-4 border-[var(--if-accent)] bg-[var(--if-bg)] p-7 lg:sticky lg:top-6"><h2 className="font-[family-name:var(--if-heading)] text-3xl font-extrabold">{c.tourTitle}</h2><p className="mt-3 text-sm leading-7 opacity-62">{c.tourDescription}</p><div className="mt-6"><LeadForm config={config} listing={listing} /></div></aside></div></section></main><Footer config={config} /></div>;
}
