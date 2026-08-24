import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, MapPin, Maximize2, Search } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Listing } from "@/portfoyai/types";
import { fineTuneAttributes, themeStyleVariables, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getHeroImage, getListingImage } from "../mediaFallbacks";

const formatPrice = (listing: Listing) => new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: listing.currency || "TRY",
  maximumFractionDigits: 0,
}).format(Number(listing.price));

const luxuryStyle = (config: TemplateConfig) => ({
  ...themeStyleVariables(config),
  "--lux-dark": config.colors.background,
  "--lux-primary": config.colors.primary,
  "--lux-accent": config.colors.accent,
  "--lux-text": config.colors.text,
  "--lux-light": `color-mix(in srgb, ${config.colors.text} 96%, ${config.colors.background})`,
  "--lux-ink": `color-mix(in srgb, ${config.colors.background} 92%, ${config.colors.text})`,
  "--lux-heading": config.fonts.heading,
  "--lux-body": config.fonts.body,
  backgroundColor: "var(--lux-dark)",
  color: "var(--lux-text)",
  fontFamily: "var(--lux-body)",
}) as CSSProperties;

function LuxuryHeader({ config }: SiteTemplateProps) {
  const c = config.content;
  return <header className="relative z-30 border-b border-[color:color-mix(in_srgb,var(--lux-text)_14%,transparent)] bg-[var(--lux-dark)]"><div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12"><Link to={`/site/${config.slug}`} className="font-[family-name:var(--lux-heading)] text-2xl font-bold uppercase tracking-[0.08em]">{c.businessName}</Link><nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.14em] md:flex"><Link to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a href="#yaklasim">{c.navAbout}</a><a href="#iletisim">{c.navContact}</a></nav><a data-site-button href="#iletisim" className="bg-[var(--lux-accent)] px-5 py-3 text-xs font-semibold text-[var(--lux-ink)]">{c.formSubmit}</a></div></header>;
}

function LuxuryFooter({ config }: SiteTemplateProps) {
  const c = config.content;
  return <footer className="border-t border-[color:color-mix(in_srgb,var(--lux-text)_14%,transparent)] bg-[var(--lux-dark)] px-5 py-14 sm:px-8 lg:px-12"><div className="mx-auto grid max-w-[1440px] gap-10 md:grid-cols-[1fr_auto_auto]"><div><div className="font-[family-name:var(--lux-heading)] text-3xl font-bold uppercase tracking-[0.06em]">{c.businessName}</div><p className="mt-4 max-w-md text-sm leading-6 opacity-55">{c.tagline}</p></div><nav className="space-y-3 text-sm"><Link className="block" to={`/site/${config.slug}/listings`}>{c.navListings}</Link><a className="block" href="#yaklasim">{c.navAbout}</a><a className="block" href="#iletisim">{c.navContact}</a></nav><address className="space-y-2 text-sm not-italic opacity-65"><div>{c.email}</div><div>{c.phone}</div><div>{c.address}</div></address></div></footer>;
}

function LeadForm({ config, listing, hero = false, dark = false }: { config: TemplateConfig; listing?: Listing; hero?: boolean; dark?: boolean }) {
  const c = config.content;
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("submitting");
    const message = [form.email ? `${c.emailLabel}: ${form.email}` : "", listing?.title || "", form.message].filter(Boolean).join("\n\n");
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: config.siteId, name: form.name, phone: form.phone, message }) });
      if (!response.ok) throw new Error();
      setForm({ name: "", email: "", phone: "", message: "" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };
  const inputClass = hero || dark
    ? "h-12 min-w-0 border-0 border-b border-[color:color-mix(in_srgb,var(--lux-text)_24%,transparent)] bg-transparent px-0 text-sm text-[var(--lux-text)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--lux-text)_50%,transparent)]"
    : "h-12 w-full border-0 border-b border-[color:color-mix(in_srgb,var(--lux-ink)_22%,transparent)] bg-transparent px-0 text-sm text-[var(--lux-ink)] outline-none placeholder:text-[color:color-mix(in_srgb,var(--lux-ink)_48%,transparent)]";
  return <form onSubmit={submit} className={hero ? "grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" : "space-y-4"}><input className={inputClass} placeholder={c.fullNameLabel} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><input type="email" className={inputClass} placeholder={c.emailLabel} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input className={inputClass} placeholder={c.phoneLabel} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />{hero ? null : <textarea className={`${inputClass} min-h-24 resize-none pt-4`} placeholder={c.messageLabel} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />}<button data-site-button disabled={status === "submitting"} className="flex h-12 items-center justify-center gap-2 bg-[var(--lux-accent)] px-6 text-xs font-bold uppercase tracking-[0.1em] text-[var(--lux-ink)] disabled:opacity-60">{status === "submitting" ? c.formSubmitting : c.formSubmit}<ArrowRight className="h-4 w-4" /></button>{status === "success" ? <p role="status" className={`${hero ? "lg:col-span-4" : ""} text-sm text-[var(--lux-accent)]`}>{c.formSuccess}</p> : null}{status === "error" ? <p role="alert" className={`${hero ? "lg:col-span-4" : ""} text-sm`}>{c.formError}</p> : null}</form>;
}

function LuxuryListingCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const c = config.content;
  const image = getListingImage(listing);
  return <article className="group"><Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-[color:color-mix(in_srgb,var(--lux-ink)_8%,transparent)]">{image ? <img src={image} alt={listing.title} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="aspect-[4/3]" />}<span className="absolute left-4 top-4 bg-[var(--lux-accent)] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--lux-ink)]">{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span></Link><div className="pt-5"><div className="text-[10px] uppercase tracking-[0.14em] opacity-45">{listing.address || listing.district}</div><Link to={`/site/${config.slug}/listings/${listing.id}`}><h2 className="mt-2 font-[family-name:var(--lux-heading)] text-3xl font-semibold leading-tight">{listing.title}</h2></Link><div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)] pt-4 text-xs"><span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²</span><span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{listing.room_count}</span><span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{listing.bathroom_count || 1}</span><strong className="ml-auto whitespace-nowrap">{formatPrice(listing)}</strong></div></div></article>;
}

function Stats({ config }: SiteTemplateProps) {
  return <section className="border-y border-[color:color-mix(in_srgb,var(--lux-text)_14%,transparent)] bg-[var(--lux-dark)]"><div className="mx-auto grid max-w-[1440px] divide-y divide-[color:color-mix(in_srgb,var(--lux-text)_14%,transparent)] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">{config.content.stats.slice(0, 3).map((stat) => <div key={stat.label} className="py-8 sm:px-8 sm:first:pl-0"><span className="font-[family-name:var(--lux-heading)] text-3xl font-bold text-[var(--lux-accent)]">{stat.value}</span><span className="ml-3 text-xs uppercase tracking-[0.15em] opacity-55">{stat.label}</span></div>)}</div></section>;
}

function Showcase({ config }: SiteTemplateProps) {
  const images = config.listings.slice(0, 4).map((listing, index) => ({ id: listing.id, url: getListingImage(listing, index), alt: listing.title }));
  return <section className="bg-[var(--lux-dark)] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-[1440px]"><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--lux-accent)]">{config.content.showcaseEyebrow}</div><h2 className="mt-5 max-w-4xl font-[family-name:var(--lux-heading)] text-6xl font-bold leading-[0.92] sm:text-7xl">{config.content.showcaseTitle}</h2>{images[0] ? <img src={images[0].url} alt={images[0].alt} className="mt-14 aspect-[16/8] w-full object-cover" /> : <div className="mt-14 aspect-[16/8] bg-[color:color-mix(in_srgb,var(--lux-accent)_12%,var(--lux-dark))]" />}<div className="mt-4 grid grid-cols-3 gap-4">{images.slice(1, 4).map((image) => <img key={image.id} src={image.url} alt={image.alt} className="aspect-[4/3] w-full object-cover" />)}</div></div></section>;
}

function WhyChoose({ config }: SiteTemplateProps) {
  const image = getListingImage(config.listings[1] || config.listings[0]);
  return <section id="yaklasim" className="bg-[var(--lux-light)] px-5 py-24 text-[var(--lux-ink)] sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch"><div><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--lux-accent)]">{config.content.whyEyebrow}</div><h2 className="mt-5 font-[family-name:var(--lux-heading)] text-6xl font-bold leading-[0.94]">{config.content.whyTitle}</h2><div className="mt-12 divide-y divide-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)]">{config.content.whyItems.slice(0, 4).map((item, index) => <div key={item.title} className="grid grid-cols-[48px_1fr] gap-4 py-6"><span className="font-[family-name:var(--lux-heading)] text-2xl text-[var(--lux-accent)]">{String(index + 1).padStart(2, "0")}</span><div><h3 className="text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 opacity-60">{item.description}</p></div></div>)}</div></div><div className="min-h-[620px] bg-[color:color-mix(in_srgb,var(--lux-ink)_8%,transparent)]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}</div></div></section>;
}

export function BoldLuxuryHome({ config }: SiteTemplateProps) {
  const c = config.content;
  const heroImage = getHeroImage(config.siteId, config.content.heroImage || (config.listings[0]?.media?.length ? getListingImage(config.listings[0]) : undefined));
  return <div {...fineTuneAttributes(config)} style={luxuryStyle(config)}><LuxuryHeader config={config} /><main><section className="relative min-h-[780px] overflow-hidden">{heroImage ? <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}<div className="absolute inset-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--lux-dark)_92%,transparent),color-mix(in_srgb,var(--lux-dark)_36%,transparent))]" /><div className="relative mx-auto flex min-h-[780px] max-w-[1440px] flex-col justify-end px-5 pb-14 pt-28 sm:px-8 lg:px-12"><div className="text-[10px] uppercase tracking-[0.24em] text-[var(--lux-accent)]">{c.eyebrow}</div><h1 className="mt-5 max-w-6xl font-[family-name:var(--lux-heading)] text-7xl font-bold uppercase leading-[0.82] tracking-[-0.045em] sm:text-8xl lg:text-[132px]">{c.businessName}</h1><p className="mt-7 max-w-xl text-base leading-7 opacity-70">{c.tagline}</p><div className="mt-12 border-t border-[color:color-mix(in_srgb,var(--lux-text)_24%,transparent)] pt-6"><LeadForm config={config} hero /></div></div></section><Stats config={config} /><Showcase config={config} /><WhyChoose config={config} />{config.layout.showTestimonial ? <section className="bg-[var(--lux-dark)] px-5 py-24 text-center sm:px-8 lg:py-32"><blockquote className="mx-auto max-w-4xl font-[family-name:var(--lux-heading)] text-5xl font-semibold leading-tight">“{c.testimonialQuote}”</blockquote><div className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[var(--lux-accent)]">{c.testimonialAuthor}</div></section> : null}</main><LuxuryFooter config={config} /></div>;
}

export function BoldLuxuryListings({ config }: SiteTemplateProps) {
  const c = config.content;
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState(params.get("type") || "all");
  const [location, setLocation] = useState(params.get("location") || "");
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (type !== "all" && listing.listing_type !== type) return false;
    if (location && !`${listing.district} ${listing.address || ""}`.toLocaleLowerCase("tr-TR").includes(location.toLocaleLowerCase("tr-TR"))) return false;
    return !query || `${listing.title} ${listing.description}`.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
  }), [config.listings, location, query, type]);
  return <div {...fineTuneAttributes(config)} style={luxuryStyle(config)}><LuxuryHeader config={config} /><main className="bg-[var(--lux-light)] px-5 py-20 text-[var(--lux-ink)] sm:px-8 lg:px-12 lg:py-28"><div className="mx-auto max-w-[1440px]"><div className="text-[10px] uppercase tracking-[0.22em] text-[var(--lux-accent)]">{c.featuredEyebrow}</div><h1 className="mt-5 font-[family-name:var(--lux-heading)] text-7xl font-bold">{c.listingsTitle}</h1><p className="mt-5 max-w-2xl text-sm leading-7 opacity-60">{c.listingsDescription}</p><div className="mt-10 grid gap-4 border-y border-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)] py-5 md:grid-cols-3"><label className="flex items-center gap-3"><Search className="h-4 w-4 opacity-40" /><input className="h-12 w-full bg-transparent outline-none" placeholder={c.searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} /></label><label><span className="block text-[9px] uppercase tracking-wider opacity-45">{c.typeLabel}</span><select className="mt-1 h-8 w-full bg-transparent outline-none" value={type} onChange={(event) => setType(event.target.value)}><option value="all">{c.allLabel}</option><option value="sale">{c.saleLabel}</option><option value="rent">{c.rentLabel}</option></select></label><label><span className="block text-[9px] uppercase tracking-wider opacity-45">{c.locationLabel}</span><input className="mt-1 h-8 w-full bg-transparent outline-none" value={location} onChange={(event) => setLocation(event.target.value)} /></label></div>{filtered.length ? <div className="mt-14 grid gap-x-7 gap-y-14 md:grid-cols-2 lg:grid-cols-3">{filtered.map((listing) => <LuxuryListingCard key={listing.id} config={config} listing={listing} />)}</div> : <p className="mt-14 border border-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)] p-8 text-sm opacity-60">{c.emptyListings}</p>}</div></main><LuxuryFooter config={config} /></div>;
}

export function BoldLuxuryDetail({ config }: SiteTemplateProps) {
  const c = config.content;
  const listing = config.listing;
  if (!listing) return null;
  return <div {...fineTuneAttributes(config)} style={luxuryStyle(config)}><LuxuryHeader config={config} /><main><section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs uppercase tracking-wider"><ArrowLeft className="h-4 w-4" />{c.backLabel}</Link><div className="mt-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--lux-accent)]"><MapPin className="h-3.5 w-3.5" />{listing.address || listing.district}</div><h1 className="mt-5 max-w-5xl font-[family-name:var(--lux-heading)] text-6xl font-bold leading-[0.9] sm:text-7xl">{listing.title}</h1></div><div className="text-3xl font-semibold">{formatPrice(listing)}</div></div><div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/10] h-full w-full object-cover" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => getListingImage(listing, index) ? <img key={index} src={getListingImage(listing, index)} alt="" className="h-full min-h-[220px] w-full object-cover" /> : <div key={index} className="min-h-[220px] bg-[color:color-mix(in_srgb,var(--lux-accent)_12%,var(--lux-dark))]" />)}</div></div></section><section className="bg-[var(--lux-light)] px-5 py-20 text-[var(--lux-ink)] sm:px-8 lg:px-12"><div className="mx-auto grid max-w-[1440px] gap-14 lg:grid-cols-[1fr_430px]"><div><div className="grid grid-cols-4 border-y border-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)] py-7 text-sm"><span>{listing.listing_type === "sale" ? c.saleLabel : c.rentLabel}</span><span>{listing.m2} m²</span><span>{listing.room_count}</span><span>{listing.bathroom_count || 1}</span></div><section className="py-12"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--lux-accent)]">{c.listingAboutLabel}</div><p className="mt-6 text-base leading-8 opacity-68">{listing.description}</p></section><section className="border-t border-[color:color-mix(in_srgb,var(--lux-ink)_16%,transparent)] py-12"><h2 className="font-[family-name:var(--lux-heading)] text-4xl font-bold">{c.listingFeaturesLabel}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="border-b border-[color:color-mix(in_srgb,var(--lux-ink)_14%,transparent)] py-3 text-sm">{feature}</div>)}</div></section></div><aside id="iletisim" className="h-fit bg-[var(--lux-dark)] p-8 text-[var(--lux-text)] lg:sticky lg:top-6"><h2 className="font-[family-name:var(--lux-heading)] text-4xl font-bold">{c.tourTitle}</h2><p className="mt-4 text-sm leading-7 opacity-60">{c.tourDescription}</p><div className="mt-7"><LeadForm config={config} listing={listing} dark /></div></aside></div></section></main><LuxuryFooter config={config} /></div>;
}
