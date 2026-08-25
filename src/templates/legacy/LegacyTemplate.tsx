import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bath, BedDouble, Maximize2 } from "lucide-react";
import type { CSSProperties } from "react";
import type { Listing } from "@/portfoyai/types";
import { formatListingLocation } from "@/portfoyai/listing-location";
import { formatListingPrice } from "@/lib/listing-price";
import type { SiteTemplateProps, TemplateConfig } from "../types";

const styleFor = (config: TemplateConfig) => ({
  "--legacy-primary": config.colors.primary,
  "--legacy-accent": config.colors.accent,
  fontFamily: config.fonts.body,
  color: config.colors.text,
  backgroundColor: config.colors.background,
}) as CSSProperties;

function LegacyHeader({ config }: SiteTemplateProps) {
  return <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}`} className="font-bold uppercase tracking-[0.18em] text-[var(--legacy-primary)]">{config.content.businessName}</Link><nav className="flex items-center gap-6 text-sm"><Link to={`/site/${config.slug}/listings`}>Portföyler</Link><a href="#iletisim">İletişim</a></nav></header>;
}

function LegacyCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  const image = listing.media?.[0]?.url || listing.media?.[0]?.thumbUrl;
  return <Link to={`/site/${config.slug}/listings/${listing.id}`} className="group"><div className="relative overflow-hidden rounded-[2rem] bg-black/5">{image ? <img src={image} alt={listing.title} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" /> : null}<span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs">{listing.listing_type === "sale" ? "Satılık" : "Kiralık"}</span></div><div className="pt-5"><div className="text-xs opacity-55">{formatListingLocation(listing)}</div><div className="mt-2 flex justify-between gap-4"><h2 className="text-xl font-semibold">{listing.title}</h2><strong className="whitespace-nowrap">{formatListingPrice(listing)}</strong></div><div className="mt-3 flex gap-4 text-xs opacity-60"><span>{listing.m2} m²</span><span>{listing.room_count}</span></div></div></Link>;
}

function LegacyFooter({ config }: SiteTemplateProps) {
  return <footer className="mt-20 border-t border-black/10 px-5 py-10 text-sm sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 md:flex-row"><strong>{config.content.businessName}</strong><span>{config.content.phone} · {config.content.email}</span><span>{config.content.address}</span><span className="opacity-50">Fastate AI ile hazırlandı</span></div></footer>;
}

export function LegacyHome({ config }: SiteTemplateProps) {
  const featured = config.listings.slice(0, 6);
  const image = featured[0]?.media?.[0]?.url;
  return <div className="min-h-screen" style={styleFor(config)}><LegacyHeader config={config} /><main><section className="mx-auto grid max-w-7xl gap-6 px-5 pb-20 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10"><div className="flex min-h-[520px] flex-col justify-end rounded-[2.5rem] p-9 text-white sm:p-12" style={{ background: `linear-gradient(145deg, ${config.colors.primary}, ${config.colors.accent})` }}><div className="text-xs uppercase tracking-[0.22em] text-white/65">{config.content.eyebrow}</div><h1 className="mt-6 text-5xl font-semibold leading-none sm:text-6xl" style={{ fontFamily: config.fonts.heading }}>{config.content.headline}</h1><p className="mt-5 max-w-xl leading-7 text-white/70">{config.content.bio}</p><Link to={`/site/${config.slug}/listings`} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white px-6 py-3 text-sm text-[var(--legacy-primary)]">{config.content.ctaText}<ArrowRight className="h-4 w-4" /></Link></div><div className="min-h-[520px] overflow-hidden rounded-[2.5rem] bg-black/5">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}</div></section><section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"><h2 className="text-4xl font-semibold" style={{ fontFamily: config.fonts.heading }}>{config.content.featuredTitle}</h2><div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">{featured.map((listing) => <LegacyCard key={listing.id} config={config} listing={listing} />)}</div></section><section id="iletisim" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"><div className="rounded-[2.5rem] p-10 text-white" style={{ backgroundColor: config.colors.primary }}><h2 className="text-4xl" style={{ fontFamily: config.fonts.heading }}>{config.content.tourTitle}</h2><p className="mt-4 opacity-70">{config.content.tourDescription}</p><a className="mt-7 inline-block rounded-full bg-white px-6 py-3 text-sm text-[var(--legacy-primary)]" href={`tel:${config.content.phone}`}>{config.content.phone}</a></div></section></main><LegacyFooter config={config} /></div>;
}

export function LegacyListings({ config }: SiteTemplateProps) {
  return <div className="min-h-screen" style={styleFor(config)}><LegacyHeader config={config} /><main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10"><div className="text-xs uppercase tracking-[0.2em] text-[var(--legacy-accent)]">{config.content.featuredEyebrow}</div><h1 className="mt-4 text-5xl font-semibold" style={{ fontFamily: config.fonts.heading }}>Tüm Portföyler</h1><div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">{config.listings.map((listing) => <LegacyCard key={listing.id} config={config} listing={listing} />)}</div></main><LegacyFooter config={config} /></div>;
}

export function LegacyDetail({ config }: SiteTemplateProps) {
  const listing = config.listing;
  if (!listing) return null;
  const image = listing.media?.[0]?.url;
  return <div className="min-h-screen" style={styleFor(config)}><LegacyHeader config={config} /><main className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" />Tüm portföyler</Link><div className="mt-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><div className="text-xs uppercase tracking-wider opacity-55">{formatListingLocation(listing)}</div><h1 className="mt-4 max-w-4xl text-5xl font-semibold" style={{ fontFamily: config.fonts.heading }}>{listing.title}</h1></div><strong className="text-2xl">{formatListingPrice(listing)}</strong></div>{image ? <img src={image} alt={listing.title} className="mt-10 aspect-[16/8] w-full rounded-[2.5rem] object-cover" /> : null}<div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]"><div><div className="grid grid-cols-3 rounded-2xl border border-black/10 bg-white/50 p-6"><span className="flex items-center gap-2"><Maximize2 className="h-4 w-4" />{listing.m2} m²</span><span className="flex items-center gap-2"><BedDouble className="h-4 w-4" />{listing.room_count}</span><span className="flex items-center gap-2"><Bath className="h-4 w-4" />{listing.bathroom_count || 1}</span></div><p className="mt-10 text-base leading-8 opacity-70">{listing.description}</p></div><aside className="rounded-2xl bg-white p-7"><h2 className="text-2xl font-semibold" style={{ fontFamily: config.fonts.heading }}>{config.content.tourTitle}</h2><p className="mt-3 text-sm leading-6 opacity-60">{config.content.tourDescription}</p><a href={`tel:${config.content.phone}`} className="mt-6 block rounded-full bg-[var(--legacy-primary)] px-5 py-3 text-center text-sm text-white">{config.content.phone}</a></aside></div></main><LegacyFooter config={config} /></div>;
}
