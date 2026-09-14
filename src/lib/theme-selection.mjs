export const selectableTemplateIds = ["warm-editorial", "clean-modern", "neighborhood-friendly", "investment-focused", "urgent-deals", "guided-match", "land-plots", "bold-luxury"];
const places = ["Kadıköy", "Ataşehir", "Beşiktaş", "Şişli", "Sarıyer", "Üsküdar", "Bakırköy", "Beylikdüzü", "Bodrum", "İzmir", "Ankara", "İstanbul", "Antalya", "Muğla"];
const has = (text, terms) => terms.some((term) => text.includes(term));

export function understandThemePrompt(prompt = "") {
  const lower = prompt.toLocaleLowerCase("tr-TR");
  const region = places.find((name) => lower.includes(name.toLocaleLowerCase("tr-TR"))) || "Belirtilmedi";
  let templateId = "clean-modern";
  let audience = "Genel konut alıcıları";
  if (has(lower, ["arsa", "tarla", "imar", "arazi"])) { templateId = "land-plots"; audience = "Arsa ve arazi yatırımcıları"; }
  else if (has(lower, ["yatırım", "kira getirisi", "roi", "investor"])) { templateId = "investment-focused"; audience = "Gayrimenkul yatırımcıları"; }
  else if (has(lower, ["acil", "fırsat", "kelepir", "indirimli"])) { templateId = "urgent-deals"; audience = "Fırsat odaklı alıcılar"; }
  else if (has(lower, ["lüks", "prestij", "üst segment", "luxury"])) { templateId = "bold-luxury"; audience = "Üst segment konut alıcıları"; }
  else if (has(lower, ["mahalle", "yerel", "semt", "komşu"])) { templateId = "neighborhood-friendly"; audience = "Yerel konut arayanlar"; }
  else if (has(lower, ["rehber", "eşleştir", "kişisel danışman", "dinleyen"])) { templateId = "guided-match"; audience = "Kişisel yönlendirme arayanlar"; }
  else if (has(lower, ["butik", "editoryal", "hikaye", "yaşam tarzı"])) { templateId = "warm-editorial"; audience = "Yaşam tarzı odaklı konut alıcıları"; }
  return { templateId, audience, region };
}

export function buildThemeSelectionContext(prompt, selectedTemplateId, preferences = {}) {
  const understood = understandThemePrompt(prompt);
  const templateId = selectableTemplateIds.includes(preferences?.templateId) ? preferences.templateId : selectedTemplateId || understood.templateId;
  const audience = String(preferences?.audience || understood.audience).trim() || "Genel konut alıcıları";
  const region = String(preferences?.region || understood.region).trim() || "Belirtilmedi";
  return { template_id: templateId, audience, region, reason: {
    tr: `${audience} kitlesine ve ${region === "Belirtilmedi" ? "genel bölge odağına" : `${region} bölgesine`} uygun olduğu için bu tasarım seçildi.`,
    en: `This design was selected for ${audience} with ${region === "Belirtilmedi" ? "a general regional focus" : `a focus on ${region}`}.`,
  } };
}
