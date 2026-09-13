import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Listing } from "@/portfoyai/types";
import { SharedFooterContact } from "../SharedFooterContact";
import { SharedTeamHeaderLink, SharedTeamSection } from "../SharedTeamPage";
import { SiteLanguageToggle } from "../site-locale";
import { protectedLeadPayload } from "../lead-protection-payload";
import type { TemplateConfig } from "../types";
import { trackPublicAnalytics } from "@/lib/public-analytics";

export function SharedThemeHeader({ config, headerClassName, innerClassName, brandClassName, navClassName, navBeforeTeam, navAfterTeam, actions }: {
  config: TemplateConfig;
  headerClassName?: string;
  innerClassName?: string;
  brandClassName?: string;
  navClassName?: string;
  navBeforeTeam?: ReactNode;
  navAfterTeam?: ReactNode;
  actions?: ReactNode;
}) {
  return <header className={headerClassName}><div className={innerClassName}><Link to={`/site/${config.slug}`} className={brandClassName}>{config.content.businessName}</Link><nav className={navClassName}>{navBeforeTeam}<SharedTeamHeaderLink config={config} />{navAfterTeam}</nav><div className="flex items-center gap-3"><SiteLanguageToggle />{actions}</div></div></header>;
}

export function SharedThemeFooter({ config, footerClassName, children }: {
  config: TemplateConfig;
  footerClassName?: string;
  children: ReactNode;
}) {
  return <><SharedTeamSection config={config} /><footer className={footerClassName}>{children}<SharedFooterContact config={config} /></footer></>;
}

export function SharedListingCollection({ listings, className, emptyClassName, emptyLabel, renderListing }: {
  listings: Listing[];
  className: string;
  emptyClassName: string;
  emptyLabel: string;
  renderListing: (listing: Listing) => ReactNode;
}) {
  if (!listings.length) return <p className={emptyClassName}>{emptyLabel}</p>;
  return <div className={className}>{listings.map((listing) => <div key={listing.id} className="contents">{renderListing(listing)}</div>)}</div>;
}

export type LeadFormState = { name: string; phone: string; message: string };
export type LeadFormStatus = "idle" | "submitting" | "success" | "error";

export function useSharedLeadForm(config: TemplateConfig, listing?: Listing, options?: {
  includeListingId?: boolean;
  message?: (form: LeadFormState) => string;
  onSuccess?: () => void;
}) {
  const [form, setForm] = useState<LeadFormState>({ name: "", phone: "", message: "" });
  const [status, setStatus] = useState<LeadFormStatus>("idle");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(protectedLeadPayload(event, {
          site_id: config.siteId,
          ...(listing && options?.includeListingId !== false ? { listing_id: listing.id } : {}),
          ...form,
          ...(options?.message ? { message: options.message(form) } : {}),
        })),
      });
      if (!response.ok) throw new Error("Lead could not be submitted");
      const payload = await response.json();
      trackPublicAnalytics({ siteId: config.siteId, eventType: "lead_conversion", listingId: listing?.id, leadId: payload.id });
      setForm({ name: "", phone: "", message: "" });
      options?.onSuccess?.();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };
  return { form, setForm, status, submit };
}
