import { ExternalLink } from "lucide-react";
import type { SiteTemplateProps } from "./types";
import { useSiteLocale } from "./site-locale";

const cleanPhoneHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const titleCase = (value: string, locale: "tr-TR" | "en-US") => value
  .trim()
  .toLocaleLowerCase(locale)
  .replace(/(^|[\s/-])([\p{L}])/gu, (_match, separator: string, letter: string) => `${separator}${letter.toLocaleUpperCase(locale)}`);

const formattedAddress = (address: string, regionFocus: string, english: boolean) => {
  const locale = english ? "en-US" : "tr-TR";
  const locationParts = regionFocus.split(",").map((part) => titleCase(part, locale)).filter(Boolean);
  if (!english && locationParts.length >= 3 && !/(?:mahallesi|mah\.?)$/iu.test(locationParts[0])) locationParts[0] += " Mahallesi";
  return [titleCase(address, locale), ...locationParts].filter(Boolean).join(" / ");
};

export function SharedFooterContact({ config }: SiteTemplateProps) {
  const { address, email, mapUrl, phone, regionFocus } = config.content;
  const { locale, messages } = useSiteLocale();
  const fullAddress = formattedAddress(address, regionFocus, locale === "en");

  return (
    <address data-footer-contact className="mx-auto mt-8 grid max-w-[1400px] gap-6 border-t border-current/15 pt-7 text-sm not-italic sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
      <div className="sm:col-span-2 lg:col-span-1">
        <div className="leading-6"><strong>{messages.ui.address}:</strong> <span className="opacity-80">{fullAddress}</span></div>
        {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 border-b border-current/30 pb-0.5 text-xs font-semibold">{messages.ui.map}<ExternalLink className="h-3 w-3" /></a> : null}
      </div>
      <div>
        <strong>{messages.ui.phone}:</strong> <a href={cleanPhoneHref(phone)} className="font-semibold opacity-80">{phone}</a>
      </div>
      <div>
        <strong>{messages.ui.email}:</strong> <a href={`mailto:${email}`} className="break-all font-semibold opacity-80">{email}</a>
      </div>
    </address>
  );
}
