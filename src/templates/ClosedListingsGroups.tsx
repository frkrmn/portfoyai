import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Listing } from "@/portfoyai/types";
import type { TemplateConfig } from "./types";

export function ClosedListingsGroups({ config, renderListing }: { config: TemplateConfig; renderListing: (listing: Listing) => ReactNode }) {
  const { i18n } = useTranslation();
  if (!config.showClosedListings || !config.closedListings.length) return null;
  const english = i18n.resolvedLanguage === "en";
  const groups = [
    { status: "sold" as const, title: english ? "Sold" : "Satılanlar", badge: english ? "Sold" : "Satıldı" },
    { status: "rented" as const, title: english ? "Rented" : "Kiralananlar", badge: english ? "Rented" : "Kiralandı" },
  ];

  return <section data-closed-listings className="border-t border-current/10 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
    <div className="mx-auto max-w-[1400px] space-y-16">
      {groups.map((group) => {
        const listings = config.closedListings.filter((listing) => listing.listing_status === group.status);
        if (!listings.length) return null;
        return <section key={group.status} data-closed-listing-group={group.status}>
          <div className="flex items-center gap-4"><h2 className="text-4xl font-bold" style={{ fontFamily: config.fonts.heading }}>{group.title}</h2><span className="rounded-full border border-current/15 px-3 py-1 text-xs opacity-60">{listings.length}</span></div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => <div key={listing.id} data-listing-status={listing.listing_status} className="relative opacity-80 grayscale-[18%]">
              <span className="pointer-events-none absolute left-3 top-3 z-[60] rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">{group.badge}</span>
              {renderListing(listing)}
            </div>)}
          </div>
        </section>;
      })}
    </div>
  </section>;
}
