import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import tr from "../locales/tr/common.json";
import en from "../locales/en/common.json";

export type PlatformLanguage = "tr" | "en";

export const PLATFORM_LANGUAGE_STORAGE_KEY = "portfoyai_language";

function storedLanguageCookie(): PlatformLanguage | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${PLATFORM_LANGUAGE_STORAGE_KEY}=`))?.split("=")[1];
  return value === "tr" || value === "en" ? value : null;
}

function detectInitialLanguage(): PlatformLanguage {
  if (typeof window === "undefined") return "tr";
  const stored = window.localStorage.getItem(PLATFORM_LANGUAGE_STORAGE_KEY);
  if (stored === "tr" || stored === "en") return stored;
  const cookie = storedLanguageCookie();
  if (cookie) return cookie;
  return window.navigator.language.toLowerCase().startsWith("en") ? "en" : "tr";
}

void i18n.use(initReactI18next).init({
  resources: { tr: { common: tr }, en: { common: en } },
  lng: detectInitialLanguage(),
  fallbackLng: "tr",
  supportedLngs: ["tr", "en"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

function updateDocumentLanguage(language: string) {
  if (typeof document !== "undefined") document.documentElement.lang = language === "en" ? "en" : "tr";
}

updateDocumentLanguage(i18n.language);
i18n.on("languageChanged", updateDocumentLanguage);

export async function setPlatformLanguage(language: PlatformLanguage) {
  window.localStorage.setItem(PLATFORM_LANGUAGE_STORAGE_KEY, language);
  document.cookie = `${PLATFORM_LANGUAGE_STORAGE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  await i18n.changeLanguage(language);
}

export default i18n;
