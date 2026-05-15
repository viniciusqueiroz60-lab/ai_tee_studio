import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";
import Stripe from "stripe";

const router: IRouter = Router();

function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

router.post("/ai-studio/generate-prompt", async (req, res): Promise<void> => {
  try {
    const { concept, enrichment, technicalConstraints } = req.body;
    if (!concept) { res.status(400).json({ error: "concept is required" }); return; }

    const ai = getAI();
    const enrichedConcept = `Artistic T-shirt print design: ${concept}. Style details: ${enrichment ?? ""}. Technical constraints: ${technicalConstraints ?? ""}. Avoid: photorealism, blurry edges, complex gradients. Ensure the design has a solid white background.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Translate and refine this T-shirt design concept into a professional technical prompt for an image generator. Output only the final prompt in English optimized for image generation. Ensure the design has a solid white background.\n\nConcept: "${enrichedConcept}"`,
    });

    res.json({ technicalPrompt: (response.text ?? "").trim() });
  } catch (err) {
    logger.error({ err }, "ai-studio generate-prompt failed");
    res.status(500).json({ error: "Failed to generate prompt" });
  }
});

router.post("/ai-studio/generate-image", async (req, res): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: { parts: [{ text: `${prompt}. Isolated on a solid white background.` }] },
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) { res.status(500).json({ error: "Gemini did not return an image" }); return; }
    res.json({ imageUrl });
  } catch (err) {
    logger.error({ err }, "ai-studio generate-image failed");
    res.status(500).json({ error: "Failed to generate image" });
  }
});

router.post("/ai-studio/refine", async (req, res): Promise<void> => {
  try {
    const { imageBase64, modificationPrompt } = req.body;
    if (!imageBase64 || !modificationPrompt) {
      res.status(400).json({ error: "imageBase64 and modificationPrompt are required" }); return;
    }

    const ai = getAI();
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: `Modify this design based on: ${modificationPrompt}. Maintain the same artistic style and core structure. Ensure clean edges and a solid white background.` },
        ],
      },
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) { res.status(500).json({ error: "Gemini did not return a refined image" }); return; }
    res.json({ imageUrl });
  } catch (err) {
    logger.error({ err }, "ai-studio refine failed");
    res.status(500).json({ error: "Failed to refine design" });
  }
});

router.post("/checkout/create-session", async (req, res): Promise<void> => {
  try {
    const { model, size, quantity, color, designUrl, shareInGallery } = req.body;

    const stripe = getStripe();
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = domains ? `https://${domains}` : "http://localhost:80";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: { name: "Camiseta Personalizada AI T-Studio" },
          unit_amount: 14990,
        },
        quantity: quantity ?? 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/`,
      metadata: {
        shirt_model: model ?? "",
        shirt_size: size ?? "",
        shirt_color: color ?? "",
        quantity: String(quantity ?? 1),
        design_preview_url: designUrl ?? "",
        share_in_gallery: shareInGallery ? "true" : "false",
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "checkout/create-session failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
