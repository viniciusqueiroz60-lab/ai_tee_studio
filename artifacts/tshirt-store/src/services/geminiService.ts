import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export function enrichPrompt(userPrompt: string, enrichment: string, technicalConstraints: string): string {
  return `Artistic T-shirt print design: ${userPrompt}. 
  Style details: ${enrichment}. 
  Technical constraints: ${technicalConstraints}. 
  Avoid: photorealism, blurry edges, complex gradients. Ensure the design has a solid white background for easy processing.`;
}

export async function generateDesignPrompt(userConcept: string, enrichment: string, technicalConstraints: string): Promise<string> {
  const enriched = enrichPrompt(userConcept, enrichment, technicalConstraints);
  
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Translate and refine this T-shirt design concept into a professional technical prompt for an image generator. 
    Maintain the specific design terms provided.
    
    Concept: "${enriched}"
    
    Output only the final prompt in English optimized for image generation. Ensure the design has a solid white background.`,
  });

  return response.text.trim();
}

export async function generateDesignImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: {
      parts: [
        {
          text: `${prompt}. Isolated on a solid white background.`,
        },
      ],
    },
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  let imageUrl = "";
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64Data = part.inlineData.data;
      imageUrl = `data:image/png;base64,${base64Data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("Falha ao gerar imagem.");
  }

  return imageUrl;
}

export async function refineDesignImage(originalImageBase64: string, modificationPrompt: string): Promise<string> {
  const base64Data = originalImageBase64.split(',')[1] || originalImageBase64;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/png",
          },
        },
        {
          text: `Modify this design based on: ${modificationPrompt}. Maintain the same artistic style, composition, and core structure. Ensure clean edges and a solid white background.`,
        },
      ],
    },
    config: {
      responseModalities: ["IMAGE", "TEXT"],
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  let imageUrl = "";
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("Falha ao refinar imagem.");
  }

  return imageUrl;
}
