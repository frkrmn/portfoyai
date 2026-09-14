export type PromptDimension = "region" | "audience" | "expertise" | "visual";
export type PromptLocale = "tr" | "en";

const signals: Record<PromptDimension, RegExp> = {
  region: /istanbul|ankara|izmir|antalya|kadıköy|beşiktaş|moda|london|notting hill|bölge|mahalle|district|region/i,
  audience: /aile|yatırımcı|alıcı|satıcı|expat|müşteri|family|investor|buyer|seller|client|luxury/i,
  expertise: /konut|arsa|ticari|lüks|kiralama|satış|daire|villa|residential|land|commercial|rental|sales|apartment/i,
  visual: /modern|sade|samimi|kurumsal|minimal|cesur|renk|zarif|warm|clean|bold|editorial|corporate|color|elegant/i,
};

export const promptSuggestions: Record<PromptLocale, Record<PromptDimension, string>> = {
  tr: { region: "Kadıköy ve Moda bölgesinde çalışıyorum", audience: "ev arayan ailelere ve yatırımcılara danışmanlık veriyorum", expertise: "konut satışı ve kiralamada uzmanım", visual: "sıcak, modern ve güven veren bir görsel dil istiyorum" },
  en: { region: "I work in Notting Hill and Kensington", audience: "I advise home-seeking families and property investors", expertise: "I specialize in residential sales and rentals", visual: "I want a warm, modern, and trustworthy visual direction" },
};

export function evaluatePrompt(prompt: string) {
  const present = Object.fromEntries(Object.entries(signals).map(([key, pattern]) => [key, pattern.test(prompt)])) as Record<PromptDimension, boolean>;
  return { present, missing: (Object.keys(present) as PromptDimension[]).filter((key) => !present[key]), score: Object.values(present).filter(Boolean).length };
}

export function enrichPrompt(prompt: string, suggestion: string, maxLength = 1000) {
  const clean = suggestion.replace(/[<>]/g, "").trim();
  const current = prompt.trim().replace(/\s+/g, " ");
  if (!clean || current.toLocaleLowerCase().includes(clean.toLocaleLowerCase())) return current;
  return `${current}${current ? ". " : ""}${clean}`.slice(0, maxLength);
}
