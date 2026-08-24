import { useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, HeartHandshake, MapPin, Maximize2, Sparkles } from "lucide-react";
import type { Listing } from "@/portfoyai/types";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getAgentImage, getHeroImage, getListingImage } from "../mediaFallbacks";

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR");
const formatPrice = (listing: Listing) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: listing.currency || "TRY",
  maximumFractionDigits: 0,
}).format(Number(listing.price));
const bedroomsFor = (listing: Listing) => listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);
const bathroomsFor = (listing: Listing) => listing.bathroom_count ?? (bedroomsFor(listing) > 3 ? 2 : 1);

const guidedStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--gm-bg": config.colors.background,
  "--gm-primary": config.colors.primary,
  "--gm-accent": config.colors.accent,
  "--gm-text": config.colors.text,
  "--gm-soft": `color-mix(in srgb, ${config.colors.accent} 9%, ${config.colors.background})`,
  "--gm-line": `color-mix(in srgb, ${config.colors.text} 13%, transparent)`,
  "--gm-on-primary": config.colors.background,
  "--gm-heading": config.fonts.heading,
  "--gm-body": config.fonts.body,
  backgroundColor: "var(--gm-bg)",
  color: "var(--gm-text)",
  fontFamily: "var(--gm-body)",
}) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="relative z-30 border-b border-[var(--gm-line)] bg-[var(--gm-bg)]/95 backdrop-blur"><div className="mx-auto flex h-20 max-w-[1360px] items-center justify-between px-5 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--gm-heading)] text-2xl font-semibold italic">{c.businessName}</Link><nav className="hidden items-center gap-8 text-sm md:flex"><a href="#eslesme">{c.matchTitle}</a><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a href="#rehber">{c.navAbout}</a></nav><a data-site-button href="#eslesme" className="rounded-full bg-[var(--gm-primary)] px-5 py-3 text-xs font-bold text-[var(--gm-on-primary)]">{c.ctaText}</a></div></header>;
}

function Footer({ config }: SiteTemplateProps) {
  const c = config.content;
  return <footer id="iletisim" className="border-t border-[var(--gm-line)] bg-[var(--gm-soft)] px-5 py-12 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1360px] gap-8 md:grid-cols-[1fr_auto]"><div><div className="font-[family-name:var(--gm-heading)] text-3xl italic">{c.agentName}</div><p className="mt-3 max-w-lg text-sm leading-6 opacity-65">{c.tagline}</p></div><address className="space-y-2 text-sm not-italic opacity-70"><div>{c.phone}</div><div>{c.email}</div><div>{c.address}</div></address></div></footer>;
}

function Specs({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <div className="flex flex-wrap gap-4 text-xs opacity-65"><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²<span className="sr-only">{c.areaLabel}</span></span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{bedroomsFor(listing)}<span className="sr-only">{c.bedLabel}</span></span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{bathroomsFor(listing)}<span className="sr-only">{c.bathLabel}</span></span></div>;
}

function ListingCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  return <article className="group overflow-hidden rounded-[1.5rem] border border-[var(--gm-line)] bg-[var(--gm-bg)]"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.035]" /><span className="absolute left-4 top-4 rounded-full bg-[var(--gm-bg)] px-3 py-1.5 text-[10px] font-bold">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span></Link><div className="p-5"><div className="flex items-center gap-1.5 text-xs text-[var(--gm-accent)]"><MapPin className="h-3.5 w-3.5" />{listing.address || listing.district}</div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-2 line-clamp-2 font-[family-name:var(--gm-heading)] text-2xl leading-tight">{listing.title}</h3></Link><div className="mt-5 flex items-end justify-between gap-4 border-t border-[var(--gm-line)] pt-4"><Specs config={config} listing={listing} /><strong className="shrink-0 text-lg text-[var(--gm-accent)]">{formatPrice(listing)}</strong></div></div></article>;
}

function GuidedIntake({ config }: SiteTemplateProps) {
  const c = config.content;
  const navigate = useNavigate();
  const [form, setForm] = useState({ location: "", feeling: "", minPrice: "", maxPrice: "", timing: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams({ guided: "1" });
    Object.entries(form).forEach(([key, value]) => { if (value) params.set(key, value); });
    navigate(`/site/${config.slug}/listings?${params}`);
  };
  const field = "h-12 w-full rounded-xl border border-[var(--gm-line)] bg-[var(--gm-bg)] px-4 text-sm outline-none focus:border-[var(--gm-accent)]";
  return <section id="eslesme" className="relative z-20 mx-auto -mt-12 max-w-[1120px] px-5 sm:px-8"><form onSubmit={submit} className="rounded-[2rem] border border-[var(--gm-line)] bg-[var(--gm-bg)] p-6 shadow-[0_28px_80px_rgba(55,35,25,.16)] lg:p-9"><div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gm-accent)]"><Sparkles className="h-4 w-4" />{c.matchEyebrow}</div><h2 className="mt-3 font-[family-name:var(--gm-heading)] text-5xl italic leading-none">{c.matchTitle}</h2><p className="mt-4 text-sm leading-7 opacity-65">{c.matchDescription}</p></div><div className="grid gap-3 sm:grid-cols-2"><input className={field} placeholder={c.locationLabel} value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /><select aria-label={c.feelingLabel} className={field} value={form.feeling} onChange={(event) => setForm({ ...form, feeling: event.target.value })}><option value="">{c.feelingLabel}</option>{c.feelings.map((feeling) => <option key={feeling} value={feeling}>{feeling}</option>)}</select><input type="number" min="0" className={field} placeholder={c.budgetMinLabel} value={form.minPrice} onChange={(event) => setForm({ ...form, minPrice: event.target.value })} /><input type="number" min="0" className={field} placeholder={c.budgetMaxLabel} value={form.maxPrice} onChange={(event) => setForm({ ...form, maxPrice: event.target.value })} /><select aria-label={c.timingLabel} className={field} value={form.timing} onChange={(event) => setForm({ ...form, timing: event.target.value })}><option value="">{c.timingLabel}</option>{c.timings.map((timing) => <option key={timing} value={timing}>{timing}</option>)}</select><button data-site-button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gm-accent)] px-5 text-xs font-bold text-[var(--gm-on-primary)]">{c.matchSubmitLabel}<ArrowRight className="h-4 w-4" /></button></div></div></form></section>;
}

function LeadForm({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setStatus("submitting");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: config.siteId, listing_id: listing.id, ...form }) });
      if (!response.ok) throw new Error();
      setForm({ name: "", phone: "", message: "" }); setStatus("success");
    } catch { setStatus("error"); }
  };
  const field = "w-full rounded-xl border border-[var(--gm-line)] bg-[var(--gm-bg)] px-4 py-3 text-sm outline-none focus:border-[var(--gm-accent)]";
  return <form onSubmit={submit} className="space-y-3"><input required className={field} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input required className={field} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><textarea className={`${field} min-h-28 resize-none`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /><button data-site-button disabled={status === "submitting"} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--gm-accent)] px-5 text-xs font-bold text-[var(--gm-on-primary)]">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className="text-sm text-[var(--gm-accent)]">{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className="text-sm">{c.formError}</p> : null}</form>;
}

export function GuidedMatchHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const featured = config.listings.slice(0, 3);
  const heroImage = getHeroImage(config.siteId, c.heroImage || (featured[0]?.media?.length ? getListingImage(featured[0]) : undefined));
  return <div {...fineTuneAttributes(config)} style={guidedStyle(config)}><Header config={config} /><main><section className="relative min-h-[650px] overflow-hidden"><img src={heroImage} alt={c.businessName} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[var(--gm-text)]/80 via-[var(--gm-text)]/35 to-transparent" /><div className="relative mx-auto flex min-h-[650px] max-w-[1360px] items-center px-5 pb-28 pt-20 text-[var(--gm-bg)] sm:px-8 lg:px-10"><div className="max-w-3xl"><div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gm-accent)]">{c.eyebrow}</div><h1 className="mt-5 font-[family-name:var(--gm-heading)] text-6xl leading-[.92] sm:text-7xl lg:text-[88px]">{c.headline}<em className="mt-2 block font-normal">{c.headlineAccent}</em></h1><p className="mt-7 max-w-xl text-base leading-8 opacity-80">{c.bio}</p>{c.stats.length ? <div className="mt-9 flex flex-wrap gap-7">{c.stats.slice(0, 3).map((stat) => <div key={`${stat.value}-${stat.label}`}><strong className="block text-xl">{stat.value}</strong><span className="text-xs opacity-65">{stat.label}</span></div>)}</div> : null}</div></div></section><GuidedIntake config={config} /><section className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="flex items-end justify-between gap-5"><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gm-accent)]">{c.featuredEyebrow}</div><h2 className="mt-3 font-[family-name:var(--gm-heading)] text-5xl italic">{c.featuredTitle}</h2></div><Link to={`/site/${config.slug}/listings`} className="hidden items-center gap-2 text-xs font-bold sm:flex">{c.navListings}<ArrowRight className="h-4 w-4" /></Link></div><div className="mt-9 grid gap-6 md:grid-cols-3">{featured.map((listing) => <ListingCard key={listing.id} config={config} listing={listing} />)}</div></section><section id="rehber" className="bg-[var(--gm-soft)] px-5 py-20 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1100px] items-center gap-10 md:grid-cols-[.75fr_1.25fr]"><img src={getAgentImage(config.siteId, c.agentImage)} alt={c.agentName} className="aspect-[4/5] w-full rounded-[2rem] object-cover" /><div><HeartHandshake className="h-8 w-8 text-[var(--gm-accent)]" /><div className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gm-accent)]">{c.aboutTitle}</div><h2 className="mt-3 font-[family-name:var(--gm-heading)] text-5xl italic">{c.guideTitle}</h2><blockquote className="mt-6 max-w-2xl font-[family-name:var(--gm-heading)] text-3xl italic leading-snug">“{c.guideQuote}”</blockquote><div className="mt-7"><strong>{c.agentName}</strong><p className="mt-2 max-w-xl text-sm leading-7 opacity-65">{c.aboutDescription}</p><a data-site-button href={`tel:${c.phone}`} className="mt-6 inline-flex rounded-full bg-[var(--gm-primary)] px-5 py-3 text-xs font-bold text-[var(--gm-on-primary)]">{c.directContactLabel}</a></div></div></div></section></main><Footer config={config} /></div>;
}

export function GuidedMatchListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params, setParams] = useSearchParams();
  const [location, setLocation] = useState(params.get("location") || "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");
  const [type, setType] = useState(params.get("type") || "all");
  const feeling = params.get("feeling") || "";
  const timing = params.get("timing") || "";
  const guided = params.get("guided") === "1";
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (location && !normalize(`${listing.district} ${listing.address || ""} ${listing.title}`).includes(normalize(location))) return false;
    if (minPrice && Number(listing.price) < Number(minPrice)) return false;
    if (maxPrice && Number(listing.price) > Number(maxPrice)) return false;
    return type === "all" || listing.listing_type === type;
  }), [config.listings, location, minPrice, maxPrice, type]);
  const update = (next: { location: string; minPrice: string; maxPrice: string; type: string }) => {
    const updated = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => value && value !== "all" ? updated.set(key, value) : updated.delete(key));
    setParams(updated, { replace: true });
  };
  const field = "h-12 w-full rounded-xl border border-[var(--gm-line)] bg-[var(--gm-bg)] px-4 text-sm outline-none focus:border-[var(--gm-accent)]";
  return <div {...fineTuneAttributes(config)} style={guidedStyle(config)}><Header config={config} /><main><section className="bg-[var(--gm-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto max-w-[1360px]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gm-accent)]"><Sparkles className="h-4 w-4" />{guided ? c.matchEyebrow : c.featuredEyebrow}</div><h1 className="mt-4 font-[family-name:var(--gm-heading)] text-6xl italic">{guided ? c.matchResultsTitle : c.listingsTitle}</h1><p className="mt-4 max-w-2xl text-sm leading-7 opacity-65">{guided ? c.matchResultsDescription : c.listingsDescription}</p>{guided && (feeling || timing) ? <div className="mt-6 flex flex-wrap gap-2">{feeling ? <span className="rounded-full bg-[var(--gm-bg)] px-4 py-2 text-xs">{c.feelingLabel}: {feeling}</span> : null}{timing ? <span className="rounded-full bg-[var(--gm-bg)] px-4 py-2 text-xs">{c.timingLabel}: {timing}</span> : null}</div> : null}</div></section><section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 lg:px-10"><div className="grid gap-3 rounded-2xl border border-[var(--gm-line)] p-4 md:grid-cols-4"><input className={field} placeholder={c.locationLabel} value={location} onChange={(event) => { setLocation(event.target.value); update({ location: event.target.value, minPrice, maxPrice, type }); }} /><input type="number" min="0" className={field} placeholder={c.budgetMinLabel} value={minPrice} onChange={(event) => { setMinPrice(event.target.value); update({ location, minPrice: event.target.value, maxPrice, type }); }} /><input type="number" min="0" className={field} placeholder={c.budgetMaxLabel} value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); update({ location, minPrice, maxPrice: event.target.value, type }); }} /><select className={field} value={type} onChange={(event) => { setType(event.target.value); update({ location, minPrice, maxPrice, type: event.target.value }); }}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select></div>{filtered.length ? <div data-guided-results-count={filtered.length} className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <ListingCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-10 rounded-2xl border border-[var(--gm-line)] p-8 text-sm opacity-65">{c.emptyListings}</p>}</section></main><Footer config={config} /></div>;
}

export function GuidedMatchDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={guidedStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1360px] px-5 py-10 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs font-bold"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-xs text-[var(--gm-accent)]"><MapPin className="h-4 w-4" />{listing.address || listing.district}</div><h1 className="mt-3 max-w-4xl font-[family-name:var(--gm-heading)] text-6xl leading-none">{listing.title}</h1></div><strong className="text-3xl text-[var(--gm-accent)]">{formatPrice(listing)}</strong></div><div className="mt-9 grid gap-4 lg:grid-cols-[1.45fr_.55fr]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/9] h-full w-full rounded-[1.75rem] object-cover" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => <img key={index} src={getListingImage(listing, index)} alt={listing.title} className="h-full min-h-[180px] w-full rounded-[1.5rem] object-cover" />)}</div></div><div className="mt-5 rounded-2xl border border-[var(--gm-line)] p-5"><Specs config={config} listing={listing} /></div></section><section className="bg-[var(--gm-soft)] px-5 py-16 sm:px-8 lg:px-10"><div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[1fr_410px]"><div><h2 className="font-[family-name:var(--gm-heading)] text-4xl italic">{c.listingAboutLabel}</h2><p className="mt-5 text-base leading-8 opacity-70">{listing.description}</p><h2 className="mt-10 border-t border-[var(--gm-line)] pt-10 font-[family-name:var(--gm-heading)] text-4xl italic">{c.listingFeaturesLabel}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="rounded-xl border border-[var(--gm-line)] bg-[var(--gm-bg)] p-4 text-sm">{feature}</div>)}</div></div><aside className="h-fit rounded-[1.75rem] bg-[var(--gm-bg)] p-7 lg:sticky lg:top-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--gm-accent)]"><HeartHandshake className="h-4 w-4" />{c.matchEyebrow}</div><h2 className="mt-4 font-[family-name:var(--gm-heading)] text-4xl italic">{c.tourTitle}</h2><p className="mt-3 text-sm leading-7 opacity-65">{c.tourDescription}</p><div className="mt-6"><LeadForm config={config} listing={listing} /></div></aside></div></section></main><Footer config={config} /></div>;
}
