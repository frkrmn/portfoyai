import { GoogleGenAI } from "@google/genai";
import { loadEnv } from "vite";
import { ensureLandPlotsContent, siteConfigModel, siteConfigSchema, siteConfigSystemPrompt } from "./handlers/generate-theme.mjs";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required.");

const prompts = {
  "guided-match": "Müşterilerime aceleye getirmeden, ne aradıklarını gerçekten anlayarak yardımcı olan kişisel bir emlak danışmanıyım, standart filtreler yerine onları doğru eve yönlendiren bir deneyim istiyorum.",
  "urgent-deals": "Acil satılık ve fiyatı düşürülmüş fırsat ilanlarına odaklanan bir emlakçıyım, müşterilerim hızlı karar veren fırsat avcıları, enerjik ve aciliyet hissi veren bir site istiyorum.",
  "warm-editorial": "Sıcak, editoryal, butik bir emlak danışmanlığıyım, İstanbul'da butik konut portföyü sunuyorum.",
  "bold-luxury": "İstanbul'da üst segment, prestijli konut portföyüne odaklanan bir emlak danışmanıyım, güçlü ve lüks bir marka izlenimi istiyorum.",
  "clean-modern": "Ankara'da genel amaçlı, orta segment konut ve daire alım-satımı yapan bir emlakçıyım, standart bir web sitesi yeterli, özel bir tarz beklentim yok.",
  "neighborhood-friendly": "Sadece Kadıköy ve Moda'da çalışan, mahallemi çok iyi tanıyan bir emlakçıyım, komşu gibi güvenilir ve samimi bir izlenim istiyorum, büyük bir ajans gibi görünmek istemiyorum.",
  "investment-focused": "Yatırım amaçlı gayrimenkul konusunda uzmanlaşmış bir danışmanım, müşterilerim genelde kira getirisi ve değer artışı potansiyeline bakan yatırımcılar, duygusal değil veri odaklı bir site istiyorum.",
  "land-plots": "Ağırlıklı olarak arsa ve imarlı gayrimenkul üzerine çalışan, 3 kişilik uzman bir ekiple hizmet veren bir danışmanlığız, profesyonel ve güven veren bir site istiyoruz.",
};

const gemini = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const results = await Promise.all(Object.entries(prompts).map(async ([expected, prompt]) => {
  const response = await gemini.models.generateContent({
    model: siteConfigModel,
    contents: `USER BUSINESS DESCRIPTION:\n${prompt}`,
    config: {
      systemInstruction: siteConfigSystemPrompt,
      responseMimeType: "application/json",
      responseSchema: siteConfigSchema,
    },
  });
  const config = ensureLandPlotsContent(JSON.parse(response.text || "{}"));
  return { expected, returned: config.template_id, match: config.template_id === expected };
}));

console.info(JSON.stringify(results, null, 2));
if (results.some((result) => !result.match)) process.exitCode = 1;
