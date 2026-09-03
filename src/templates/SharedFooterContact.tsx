import { ExternalLink } from "lucide-react";
import type { SiteTemplateProps } from "./types";

const cleanPhoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export function SharedFooterContact({ config }: SiteTemplateProps) {
  const { address, email, emailLabel, mapUrl, phone, phoneLabel, regionFocus } = config.content;
  const english = /phone|e-?mail/i.test(`${phoneLabel} ${emailLabel}`);
  const addressLabel = english ? "Address" : "Adres";
  const locationLabel = english ? "Province / District / Neighborhood" : "İl / İlçe / Mahalle";
  const mapLabel = english ? "Show on Google Maps" : "Haritada Göster";

  return (
    <address data-footer-contact className="mx-auto mt-8 grid max-w-[1400px] gap-6 border-t border-current/15 pt-7 text-sm not-italic sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-50">{addressLabel}</div>
        <div className="mt-2 leading-6 opacity-80">{address}</div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-50">{locationLabel}</div>
        <div className="mt-2 leading-6 opacity-80">{regionFocus}</div>
        {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 border-b border-current/30 pb-0.5 text-xs font-semibold">{mapLabel}<ExternalLink className="h-3 w-3" /></a> : null}
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-50">{phoneLabel || (english ? "Phone" : "Telefon")}</div>
        <a href={cleanPhoneHref(phone)} className="mt-2 inline-block font-semibold">{phone}</a>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-50">{emailLabel || "E-posta"}</div>
        <a href={`mailto:${email}`} className="mt-2 inline-block break-all font-semibold">{email}</a>
      </div>
    </address>
  );
}
