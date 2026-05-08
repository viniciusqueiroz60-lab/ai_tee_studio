import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

let genAI: GoogleGenerativeAI;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

const STYLE_SYSTEM_PROMPT = `You are an elite AI design engine for premium custom t-shirt printing.
Generate artwork descriptions and visual concepts for high-quality screen printing.
Key rules:
- Center the main subject, avoid cropped edges
- Professional finish: vector, artistic illustration, or high-fidelity digital painting
- Avoid generic AI look or stock photorealism
- Clean background (solid color or easily removable)
- No frames, random text, or watermarks
- Design must work beautifully on the chest of a t-shirt`;

export async function generateArtworkImage(prompt: string, styleParams: string): Promise<string> {
  const ai = getGenAI();

  const enrichedPrompt = `${STYLE_SYSTEM_PROMPT}

Style parameters: ${styleParams}

User request: ${prompt}

Generate a detailed image generation prompt optimized for t-shirt printing, then create the image.`;

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: enrichedPrompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      } as any,
    });

    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if ((part as any).inlineData?.mimeType?.startsWith("image/")) {
        const base64 = (part as any).inlineData.data;
        return `data:${(part as any).inlineData.mimeType};base64,${base64}`;
      }
    }

    logger.warn("Gemini did not return an image, using placeholder");
    return `https://picsum.photos/seed/${encodeURIComponent(prompt)}/600/600`;
  } catch (err) {
    logger.error({ err }, "Gemini image generation failed, using placeholder");
    return `https://picsum.photos/seed/${encodeURIComponent(prompt + styleParams)}/600/600`;
  }
}

export async function refineArtworkImage(
  originalImageUrl: string,
  refinementPrompt: string
): Promise<string> {
  const ai = getGenAI();

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    let imagePart: any;
    if (originalImageUrl.startsWith("data:")) {
      const [header, data] = originalImageUrl.split(",");
      const mimeType = header.replace("data:", "").replace(";base64", "");
      imagePart = { inlineData: { mimeType, data } };
    } else {
      const res = await fetch(originalImageUrl);
      const buf = await res.arrayBuffer();
      const b64 = Buffer.from(buf).toString("base64");
      imagePart = { inlineData: { mimeType: "image/jpeg", data: b64 } };
    }

    const result = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          imagePart,
          {
            text: `${STYLE_SYSTEM_PROMPT}\n\nRefine this t-shirt artwork: ${refinementPrompt}\n\nMaintain the core design's anchor (character/structure), only change what is requested.`,
          },
        ],
      }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      } as any,
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if ((part as any).inlineData?.mimeType?.startsWith("image/")) {
        const base64 = (part as any).inlineData.data;
        return `data:${(part as any).inlineData.mimeType};base64,${base64}`;
      }
    }

    return originalImageUrl;
  } catch (err) {
    logger.error({ err }, "Gemini refinement failed");
    return originalImageUrl;
  }
}

export function buildEnrichedPrompt(userPrompt: string, styleParams: string): string {
  return `[Style: ${styleParams}] ${userPrompt}`;
}
