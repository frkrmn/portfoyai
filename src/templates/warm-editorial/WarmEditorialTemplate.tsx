import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  Maximize2,
  Search,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import type { Listing } from "@/portfoyai/types";
import { fineTuneAttributes, type SiteTemplateProps, type TemplateConfig } from "../types";
import { getHeroImage, getListingImage } from "../mediaFallbacks";

const labels = {
  navListings: "Portföyler",
  navAbout: "Hakkımızda",
  navContact: "İletişim",
  status: "Durum",
  type: "Tür",
  location: "Konum",
  all: "Tümü",
  sale: "Satılık",
  rent: "Kiralık",
  search: "Ara",
  details: "İlanı incele",
  listingsTitle: "Tüm Portföyler",
  listingsDescription: "Güncel portföyleri konum ve ilan türüne göre keşfedin.",
  empty: "Aramanızla eşleşen aktif portföy bulunamadı.",
  previous: "Önceki",
  next: "Sonraki",
  about: "Portföy hakkında",
  features: "Öne çıkan özellikler",
  back: "Tüm portföyler",
  name: "Ad Soyad",
  contact: "E-posta veya telefon",
  message: "Mesajınız",
  submit: "Randevu talebi gönder",
  submitting: "Gönderiliyor...",
  success: "Talebiniz alındı, en kısa sürede sizinle iletişime geçilecek.",
  genericError: "Talebiniz gönderilemedi. Lütfen tekrar deneyin.",
  address: "Adres",
  categoryApartment: "Daire",
  categoryHouse: "Müstakil Ev",
  categoryDuplex: "Dubleks",
  footerCredit: "PortföyAI ile hazırlandı",
} as const;

const formatPrice = (listing: Listing) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: listing.currency || "TRY",
    maximumFractionDigits: 0,
  }).format(Number(listing.price));

const getBedroomCount = (listing: Listing) =>
  listing.bedroom_count ?? (Number.parseInt(listing.room_count, 10) || 1);

const getBathroomCount = (listing: Listing) => listing.bathroom_count ?? (getBedroomCount(listing) >= 4 ? 2 : 1);

const templateStyle = (config: TemplateConfig) =>
  ({
    "--we-bg": config.colors.background,
    "--we-primary": config.colors.primary,
    "--we-accent": config.colors.accent,
    "--we-text": config.colors.text,
    "--we-heading": config.fonts.heading,
    "--we-body": config.fonts.body,
    backgroundColor: "var(--we-bg)",
    color: "var(--we-text)",
    fontFamily: "var(--we-body)",
  }) as CSSProperties;

function Header({ config }: SiteTemplateProps) {
  return (
    <header className="relative z-30 border-b border-[color:color-mix(in_srgb,var(--we-text)_14%,transparent)] bg-[var(--we-bg)]/95">
      <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to={`/site/${config.slug}`} className="font-[family-name:var(--we-heading)] text-2xl font-semibold tracking-[-0.03em]">
          {config.content.businessName}
        </Link>
        <nav className="hidden items-center gap-8 text-[13px] md:flex">
          <Link to={`/site/${config.slug}/listings`}>{labels.navListings}</Link>
          <a href="#hakkimizda">{labels.navAbout}</a>
          <a href="#iletisim">{labels.navContact}</a>
        </nav>
        <a href="#iletisim" className="rounded-full bg-[var(--we-primary)] px-5 py-3 text-xs font-semibold text-white">
          {config.content.ctaText}
        </a>
      </div>
    </header>
  );
}

function Footer({ config }: SiteTemplateProps) {
  return (
    <footer className="border-t border-[color:color-mix(in_srgb,var(--we-text)_14%,transparent)] px-5 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[1380px] gap-8 text-sm md:grid-cols-[1fr_auto_auto] md:items-end">
        <div>
          <div className="font-[family-name:var(--we-heading)] text-2xl font-semibold">{config.content.businessName}</div>
          <p className="mt-3 max-w-md leading-6 opacity-65">{config.content.bio}</p>
        </div>
        <address className="not-italic leading-7 opacity-70">
          <div>{config.content.agentName}</div><div>{config.content.phone}</div><div>{config.content.email}</div><div>{config.content.address}</div>
        </address>
        <div className="text-xs opacity-45">{labels.footerCredit}</div>
      </div>
    </footer>
  );
}

function SearchPanel({ config, compact = false }: SiteTemplateProps & { compact?: boolean }) {
  const navigate = useNavigate();
  const [type, setType] = useState("all");
  const [location, setLocation] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (type !== "all") query.set("type", type);
    if (location.trim()) query.set("location", location.trim());
    navigate(`/site/${config.slug}/listings${query.size ? `?${query}` : ""}`);
  };
  const fieldClass = "min-w-0 border-0 bg-transparent px-0 pt-1 text-sm font-medium outline-none placeholder:text-[var(--we-text)]/45";
  return (
    <form onSubmit={submit} className={`grid items-end gap-4 bg-white p-4 shadow-[0_24px_70px_rgba(33,28,20,0.13)] ${compact ? "md:grid-cols-[1fr_1fr_auto]" : "md:grid-cols-[0.8fr_1fr_1.35fr_auto]"}`}>
      {!compact ? <label className="border-b border-black/10 px-3 pb-2"><span className="block text-[10px] uppercase tracking-[0.16em] opacity-50">{labels.status}</span><select className={`${fieldClass} w-full`} defaultValue="active"><option value="active">Aktif</option></select></label> : null}
      <label className="border-b border-black/10 px-3 pb-2"><span className="block text-[10px] uppercase tracking-[0.16em] opacity-50">{labels.type}</span><select className={`${fieldClass} w-full`} value={type} onChange={(event) => setType(event.target.value)}><option value="all">{labels.all}</option><option value="sale">{labels.sale}</option><option value="rent">{labels.rent}</option></select></label>
      <label className="border-b border-black/10 px-3 pb-2"><span className="block text-[10px] uppercase tracking-[0.16em] opacity-50">{labels.location}</span><input className={`${fieldClass} w-full`} value={location} onChange={(event) => setLocation(event.target.value)} placeholder={config.content.address} /></label>
      <button className="grid h-14 w-full place-items-center bg-[var(--we-primary)] px-7 text-white md:w-auto" aria-label={labels.search}><Search className="h-4 w-4" /></button>
    </form>
  );
}

export function WarmListingCard({ config, listing }: { config: TemplateConfig; listing: Listing }) {
  return (
    <article className="group min-w-0">
      <Link to={`/site/${config.slug}/listings/${listing.id}`} className="relative block overflow-hidden bg-black/5">
        <img src={getListingImage(listing)} alt={listing.title} className="aspect-[1.25/1] w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
        <span className="absolute left-4 top-4 bg-[var(--we-primary)] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white">{listing.listing_type === "sale" ? labels.sale : labels.rent}</span>
        <button type="button" aria-label="Favorilere ekle" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90"><Heart className="h-4 w-4" /></button>
      </Link>
      <div className="pt-5">
        <div className="text-[10px] uppercase tracking-[0.15em] opacity-48">{listing.address || `${listing.district}, İstanbul`}</div>
        <Link to={`/site/${config.slug}/listings/${listing.id}`}><h3 className="mt-2 font-[family-name:var(--we-heading)] text-[26px] font-medium leading-tight">{listing.title}</h3></Link>
        <p className="mt-3 line-clamp-2 text-xs leading-6 opacity-58">{listing.description}</p>
        <div className="mt-5 flex items-center gap-4 border-t border-black/10 pt-4 text-xs">
          <span className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" />{listing.m2} m²</span>
          <span className="flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" />{getBedroomCount(listing)}</span>
          <span className="flex items-center gap-1.5"><Bath className="h-3.5 w-3.5" />{getBathroomCount(listing)}</span>
          <strong className="ml-auto whitespace-nowrap font-medium">{formatPrice(listing)}</strong>
        </div>
      </div>
    </article>
  );
}

function TourForm({ config, listing }: { config: TemplateConfig; listing?: Listing }) {
  const [form, setForm] = useState({ name: "", contact: "", message: "" });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("submitting");
    const message = [listing ? `Portföy: ${listing.title}` : "", form.message].filter(Boolean).join("\n\n");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: config.siteId, name: form.name, phone: form.contact, message }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || labels.genericError);
      setForm({ name: "", contact: "", message: "" });
      setState("success");
    } catch {
      setState("error");
    }
  };
  const inputClass = "w-full border-0 border-b border-black/15 bg-transparent px-0 py-3 text-sm outline-none focus:border-[var(--we-primary)]";
  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={inputClass} placeholder={labels.name} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <input className={inputClass} placeholder={labels.contact} value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} required />
      <textarea className={`${inputClass} min-h-24 resize-none`} placeholder={labels.message} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
      <button disabled={state === "submitting"} className="mt-3 flex h-14 w-full items-center justify-center gap-2 bg-[var(--we-primary)] px-5 text-xs font-semibold text-white disabled:opacity-60">{state === "submitting" ? labels.submitting : labels.submit}<ArrowRight className="h-4 w-4" /></button>
      {state === "success" ? <p role="status" className="text-sm leading-6 text-emerald-800">{labels.success}</p> : null}
      {state === "error" ? <p role="alert" className="text-sm leading-6 text-red-700">{labels.genericError}</p> : null}
    </form>
  );
}

function ContactSection({ config, listing }: { config: TemplateConfig; listing?: Listing }) {
  const contactListing = config.listings[1] || config.listings[0];
  const image = listing
    ? getListingImage(listing, 1)
    : getHeroImage(config.siteId, config.content.heroImage || (contactListing?.media?.length ? getListingImage(contactListing, 1) : undefined));
  return (
    <section id="iletisim" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="relative min-h-[650px] overflow-hidden bg-[color:color-mix(in_srgb,var(--we-accent)_20%,var(--we-bg))] lg:min-h-[690px]">
        {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative mx-5 my-12 ml-auto w-[calc(100%-2.5rem)] max-w-[470px] bg-[var(--we-bg)] p-8 shadow-[0_30px_80px_rgba(25,20,15,0.18)] sm:mx-12 sm:p-12 lg:my-20 lg:mr-20">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--we-accent)]">{config.content.eyebrow}</div>
          <h2 className="mt-4 font-[family-name:var(--we-heading)] text-5xl font-medium leading-none">{config.content.tourTitle}</h2>
          <p className="mt-5 text-sm leading-7 opacity-60">{config.content.tourDescription}</p>
          <div className="mt-7"><TourForm config={config} listing={listing} /></div>
        </div>
      </div>
    </section>
  );
}

function CategoryExplorer({ config }: SiteTemplateProps) {
  const categories = [
    { key: "apartment", label: labels.categoryApartment },
    { key: "house", label: labels.categoryHouse },
    { key: "duplex", label: labels.categoryDuplex },
  ].map((category, index) => ({ ...category, listing: config.listings.find((item) => item.category === category.key) || config.listings[index] }));
  return (
    <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--we-accent)]">{config.content.categoriesEyebrow}</div>
      <h2 className="mt-4 max-w-2xl font-[family-name:var(--we-heading)] text-5xl font-medium leading-[0.96] sm:text-6xl">{config.content.categoriesTitle}</h2>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {categories.filter((category) => category.listing).map(({ key, label, listing }) => <Link key={key} to={`/site/${config.slug}/listings?category=${key}`} className="group relative min-h-[480px] overflow-hidden"><img src={getListingImage(listing!)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-7 text-white"><div className="text-[10px] uppercase tracking-[0.18em] opacity-70">{config.content.categoriesEyebrow}</div><div className="mt-2 font-[family-name:var(--we-heading)] text-4xl italic">{label}</div></div></Link>)}
      </div>
    </section>
  );
}

export function WarmEditorialHome({ config }: SiteTemplateProps) {
  const featured = config.listings.slice(0, 6);
  const heroImage = getHeroImage(config.siteId, config.content.heroImage || (featured[0]?.media?.length ? getListingImage(featured[0]) : undefined));
  return (
    <div {...fineTuneAttributes(config)} style={templateStyle(config)}>
      <Header config={config} />
      <main>
        <section className="relative min-h-[760px] overflow-visible bg-[color:color-mix(in_srgb,var(--we-accent)_24%,var(--we-bg))] lg:min-h-[820px]">
          {heroImage ? <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/22 to-transparent" />
          <div className="relative mx-auto max-w-[1380px] px-5 pb-28 pt-36 text-white sm:px-8 lg:px-12 lg:pt-44">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/75">{config.content.eyebrow}</div>
            <h1 className="mt-6 max-w-4xl font-[family-name:var(--we-heading)] text-6xl font-medium leading-[0.92] tracking-[-0.035em] sm:text-7xl lg:text-[96px]">
              <span className="block">{config.content.headline}</span><em className="block font-normal">{config.content.headlineAccent}</em>
            </h1>
            <div className="mt-16 max-w-5xl text-[var(--we-text)]"><SearchPanel config={config} /></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="text-[10px] uppercase tracking-[0.2em] text-[var(--we-accent)]">{config.content.featuredEyebrow}</div><h2 className="mt-4 max-w-2xl font-[family-name:var(--we-heading)] text-5xl font-medium leading-[0.96] sm:text-6xl">{config.content.featuredTitle}</h2></div><Link to={`/site/${config.slug}/listings`} className="flex items-center gap-2 text-xs font-semibold">{config.content.ctaText}<ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-14 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">{featured.map((listing) => <WarmListingCard key={listing.id} config={config} listing={listing} />)}</div>
        </section>

        {config.layout.showCategories ? <CategoryExplorer config={config} /> : null}
        <section id="hakkimizda" className="border-y border-black/10"><div className="mx-auto grid max-w-[1380px] gap-8 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-28"><div className="text-[10px] uppercase tracking-[0.2em] text-[var(--we-accent)]">{config.content.agentName}</div><p className="font-[family-name:var(--we-heading)] text-4xl leading-tight sm:text-5xl">{config.content.bio}</p></div></section>
        <ContactSection config={config} />
      </main>
      <Footer config={config} />
    </div>
  );
}

export function WarmEditorialListings({ config }: SiteTemplateProps) {
  const [params] = useSearchParams();
  const category = params.get("category") || "";
  const [type, setType] = useState(params.get("type") || "all");
  const [location, setLocation] = useState(params.get("location") || "");
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const filtered = useMemo(() => config.listings.filter((listing) => {
    if (type !== "all" && listing.listing_type !== type) return false;
    if (location && !`${listing.district} ${listing.address || ""}`.toLocaleLowerCase("tr-TR").includes(location.toLocaleLowerCase("tr-TR"))) return false;
    return !category || listing.category === category;
  }), [category, config.listings, location, type]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <div {...fineTuneAttributes(config)} style={templateStyle(config)}><Header config={config} /><main><section className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="text-[10px] uppercase tracking-[0.2em] text-[var(--we-accent)]">{config.content.featuredEyebrow}</div><h1 className="mt-4 font-[family-name:var(--we-heading)] text-6xl font-medium">{labels.listingsTitle}</h1><p className="mt-4 text-sm opacity-60">{labels.listingsDescription}</p><div className="mt-10 max-w-4xl"><div className="grid gap-4 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]"><label className="border-b border-black/10 px-3 pb-2"><span className="block text-[10px] uppercase tracking-wider opacity-50">{labels.type}</span><select className="w-full bg-transparent pt-1 text-sm outline-none" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="all">{labels.all}</option><option value="sale">{labels.sale}</option><option value="rent">{labels.rent}</option></select></label><label className="border-b border-black/10 px-3 pb-2"><span className="block text-[10px] uppercase tracking-wider opacity-50">{labels.location}</span><input className="w-full bg-transparent pt-1 text-sm outline-none" value={location} onChange={(event) => { setLocation(event.target.value); setPage(1); }} /></label><div className="grid h-14 place-items-center bg-[var(--we-primary)] px-7 text-xs text-white">{filtered.length} {labels.navListings.toLocaleLowerCase("tr-TR")}</div></div></div>{visible.length ? <div className="mt-14 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">{visible.map((listing) => <WarmListingCard key={listing.id} config={config} listing={listing} />)}</div> : <div className="mt-16 border border-black/10 p-10 text-sm opacity-60">{labels.empty}</div>}<div className="mt-16 flex items-center justify-center gap-4"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-30"><ChevronLeft className="h-4 w-4" />{labels.previous}</button><span className="text-xs">{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-30">{labels.next}<ChevronRight className="h-4 w-4" /></button></div></section></main><Footer config={config} /></div>
  );
}

export function WarmEditorialDetail({ config }: SiteTemplateProps) {
  const listing = config.listing;
  if (!listing) return null;
  return (
    <div {...fineTuneAttributes(config)} style={templateStyle(config)}><Header config={config} /><main className="mx-auto max-w-[1380px] px-5 py-12 sm:px-8 lg:px-12 lg:py-20"><Link to={`/site/${config.slug}/listings`} className="inline-flex items-center gap-2 text-xs"><ArrowLeft className="h-4 w-4" />{labels.back}</Link><div className="mt-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end"><div><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--we-accent)]">{listing.address || `${listing.district}, İstanbul`}</div><h1 className="mt-4 max-w-4xl font-[family-name:var(--we-heading)] text-6xl font-medium leading-[0.95]">{listing.title}</h1></div><div className="font-[family-name:var(--we-heading)] text-3xl">{formatPrice(listing)}</div></div><div className="mt-12 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]"><img src={getListingImage(listing)} alt={listing.title} className="aspect-[16/10] h-full w-full object-cover" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{[1, 2].map((index) => getListingImage(listing, index) ? <img key={index} src={getListingImage(listing, index)} alt="" className="h-full min-h-[220px] w-full object-cover" /> : <div key={index} className="min-h-[220px] bg-[color:color-mix(in_srgb,var(--we-accent)_22%,var(--we-bg))]" />)}</div></div><div className="mt-14 grid gap-12 lg:grid-cols-[1fr_430px]"><div><div className="grid grid-cols-3 border-y border-black/10 py-7"><div className="flex items-center gap-3"><Maximize2 className="h-5 w-5" /><span>{listing.m2} m²</span></div><div className="flex items-center gap-3"><BedDouble className="h-5 w-5" /><span>{getBedroomCount(listing)}</span></div><div className="flex items-center gap-3"><Bath className="h-5 w-5" /><span>{getBathroomCount(listing)}</span></div></div><section className="py-12"><div className="text-[10px] uppercase tracking-[0.18em] text-[var(--we-accent)]">{labels.about}</div><p className="mt-5 text-base leading-8 opacity-68">{listing.description}</p></section><section className="border-t border-black/10 py-12"><h2 className="font-[family-name:var(--we-heading)] text-4xl">{labels.features}</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{listing.features.map((feature) => <div key={feature} className="border-b border-black/10 py-3 text-sm">{feature}</div>)}</div></section><section className="border-t border-black/10 py-12"><div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-[var(--we-accent)]" /><div><div className="text-[10px] uppercase tracking-wider opacity-45">{labels.address}</div><div className="mt-1">{listing.address || `${listing.district}, İstanbul`}</div></div></div></section></div><aside className="h-fit bg-[color:color-mix(in_srgb,var(--we-bg)_82%,white)] p-8 shadow-[0_24px_60px_rgba(25,20,15,0.10)] lg:sticky lg:top-6"><h2 className="font-[family-name:var(--we-heading)] text-4xl">{config.content.tourTitle}</h2><p className="mt-4 text-sm leading-7 opacity-60">{config.content.tourDescription}</p><div className="mt-6"><TourForm config={config} listing={listing} /></div></aside></div></main><ContactSection config={config} listing={listing} /><Footer config={config} /></div>
  );
}
