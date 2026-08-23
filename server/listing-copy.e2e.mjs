import { loadEnv } from "vite";
import { generateListingCopy, listingFactsFromBody } from "../api/listings/generate-copy.js";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required.");

const facts = listingFactsFromBody({
  title: "Kadıköy'de deniz manzaralı geniş daire",
  room_count: "3+1",
  m2: 140,
  listing_type: "sale",
  district: "Kadıköy",
  price: 14_750_000,
  currency: "TRY",
  features: ["Deniz manzaralı", "Site içi", "Asansörlü", "Otopark"],
  category: "apartment",
  bedroom_count: 3,
  bathroom_count: 2,
});

const copy = await generateListingCopy(facts, env.GEMINI_API_KEY);
const platformWords = copy.platform_style.split(/\s+/).length;
const seoWords = copy.seo_style.split(/\s+/).length;
const platformSentences = copy.platform_style.split(/[.!?]+/).filter((item) => item.trim()).length;
const seoSentences = copy.seo_style.split(/[.!?]+/).filter((item) => item.trim()).length;
const requiredSpecs = ["3+1", "140", "Kadıköy"];
const result = {
  facts,
  platform_style: copy.platform_style,
  seo_style: copy.seo_style,
  metrics: {
    platformWords,
    seoWords,
    exactMatch: copy.platform_style === copy.seo_style,
    seoIsSubstantiallyLonger: seoWords >= platformWords * 1.35,
    platformAverageSentenceWords: Number((platformWords / platformSentences).toFixed(1)),
    seoAverageSentenceWords: Number((seoWords / seoSentences).toFixed(1)),
    platformHasRequiredSpecs: requiredSpecs.every((spec) => copy.platform_style.includes(spec)),
    seoHasRequiredSpecs: requiredSpecs.every((spec) => copy.seo_style.includes(spec)),
  },
};

console.info(JSON.stringify(result, null, 2));
if (
  result.metrics.exactMatch
  || !result.metrics.seoIsSubstantiallyLonger
  || result.metrics.platformAverageSentenceWords >= result.metrics.seoAverageSentenceWords
  || !result.metrics.platformHasRequiredSpecs
  || !result.metrics.seoHasRequiredSpecs
) process.exitCode = 1;
