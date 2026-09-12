import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatListingPrice } from "@/lib/listing-price";
import { getListingImage } from "@/templates/mediaFallbacks";
import { formatListingLocation } from "../listing-location";
import type { Listing } from "../types";
import { useTranslation } from "react-i18next";

export function OverviewMetric({ label, value }: { label: string; value: string }) {
  return <Card className="rounded-[1.5rem] border-[#173f32]/10 bg-[#fbfaf7] shadow-none"><CardContent className="p-5"><div className="text-xs text-[#7a857e]">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></CardContent></Card>;
}

export function ListingManagementRow({ listing, selected, updating, onSelect, onToggle }: { listing: Listing; selected: boolean; updating: boolean; onSelect: () => void; onToggle: () => void }) {
  const { t } = useTranslation();
  const isClosed = listing.listing_status !== "active";
  const statusLabel = listing.listing_status === "sold" ? t("dashboard.listings.sold") : listing.listing_status === "rented" ? t("dashboard.listings.rented") : t("dashboard.listings.available");
  return <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border p-3", selected ? "border-[#173f32] bg-[#edf1eb]" : "bg-white")}>
    <button type="button" onClick={onSelect} className="grid min-w-0 grid-cols-[72px_1fr] items-center gap-4 text-left"><img src={getListingImage(listing)} alt="" className={cn("h-16 w-[72px] rounded-xl object-cover", isClosed && "grayscale opacity-70")} /><div className="min-w-0"><div className="truncate font-semibold">{listing.title}</div><div className="mt-1 text-xs text-[#7a857e]">{formatListingLocation(listing)} · {listing.room_count} · {listing.m2} m²</div><div className="mt-2 text-sm font-semibold">{formatListingPrice(listing)}</div></div></button>
    <div className="flex flex-col items-end gap-2"><div className="flex flex-wrap justify-end gap-1.5"><Badge>{t(listing.listing_type === "sale" ? "common.sale" : "common.rent")}</Badge><Badge variant={isClosed ? "secondary" : "outline"}>{statusLabel}</Badge></div><Button type="button" size="sm" variant={isClosed ? "outline" : "secondary"} disabled={updating} onClick={onToggle}>{t(isClosed ? "dashboard.listings.markAvailable" : listing.listing_type === "sale" ? "dashboard.listings.markSold" : "dashboard.listings.markRented")}</Button></div>
  </div>;
}
