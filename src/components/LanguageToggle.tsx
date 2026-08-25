import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { setPlatformLanguage, type PlatformLanguage } from "@/i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current: PlatformLanguage = i18n.resolvedLanguage === "en" ? "en" : "tr";

  return (
    <div className={cn("inline-flex rounded-full border border-current/15 bg-white/70 p-1", className)} role="group" aria-label={t("language.label")}>
      {(["tr", "en"] as const).map((language) => (
        <button
          key={language}
          type="button"
          aria-pressed={current === language}
          aria-label={t(`language.switchTo.${language}`)}
          className={cn("rounded-full px-2.5 py-1 text-xs font-semibold transition", current === language ? "bg-[#173f32] text-white" : "text-current hover:bg-black/5")}
          onClick={() => void setPlatformLanguage(language)}
        >
          {language.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
