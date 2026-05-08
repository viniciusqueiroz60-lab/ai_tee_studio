import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger";

let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
  }
  return _ai;
}

const SYSTEM_PROMPT = `You are an elite AI design engine for premium custom t-shirt printing.
Create stunning, print-ready artwork optimized for screen printing on t-shirts.
Rules:
- Center the main subject, leave breathing room at edges
- Professional digital art finish — vector-style or illustrated, NOT photorealistic stock imagery
- Clean, printable background (solid color or transparent-friendly)
- No frames, watermarks, or text overlays
- Design must look great printed on the chest of a t-shirt`;

export async function generateArtworkImage(prompt: string, styleParams: string): Promise<string> {
  const ai = getAI();

  const fullPrompt = styleParams
    ? `${SYSTEM_PROMPT}\n\nArtistic style: ${styleParams}\n\nDesign request: ${prompt}`
    : `${SYSTEM_PROMPT}\n\nDesign request: ${prompt}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    config: { responseModalities: ["IMAGE", "TEXT"] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith("image/")) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Gemini did not return an image. Please try again.");
}

export async function refineArtworkImage(
  originalImageUrl: string,
  refinementPrompt: string
): Promise<string> {
  const ai = getAI();

  try {
    let imageData: string;
    let mimeType: string;

    if (originalImageUrl.startsWith("data:")) {
      const [header, data] = originalImageUrl.split(",");
      mimeType = header.replace("data:", "").replace(";base64", "");
      imageData = data;
    } else {
      const res = await fetch(originalImageUrl);
      const buf = await res.arrayBuffer();
      imageData = Buffer.from(buf).toString("base64");
      mimeType = "image/jpeg";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageData } },
          { text: `${SYSTEM_PROMPT}\n\nRefine this t-shirt artwork: ${refinementPrompt}\n\nKeep the core design intact, only modify what was asked.` },
        ],
      }],
      config: { responseModalities: ["IMAGE", "TEXT"] },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith("image/")) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    return originalImageUrl;
  } catch (err) {
    logger.error({ err }, "Gemini refinement failed, returning original");
    return originalImageUrl;
  }
}

export function buildEnrichedPrompt(userPrompt: string, styleParams: string): string {
  return `[Style: ${styleParams}] ${userPrompt}`;
}
