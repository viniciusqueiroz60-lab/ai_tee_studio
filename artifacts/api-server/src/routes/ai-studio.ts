import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../lib/logger";
import Stripe from "stripe";
import { randomUUID } from "crypto";

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

const rateLimitWindows = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 1000;

function ipRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const entry = rateLimitWindows.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitWindows.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    res.status(429).json({ error: "Muitas requisições. Tente novamente em breve." });
    return;
  }
  next();
}

router.post("/ai-studio/generate-prompt", ipRateLimit, async (req, res): Promise<void> => {
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

router.post("/ai-studio/generate-image", ipRateLimit, async (req, res): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt) { res.status(400).json({ error: "prompt is required" }); return; }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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

router.post("/ai-studio/refine", ipRateLimit, async (req, res): Promise<void> => {
  try {
    const { imageBase64, modificationPrompt } = req.body;
    if (!imageBase64 || !modificationPrompt) {
      res.status(400).json({ error: "imageBase64 and modificationPrompt are required" }); return;
    }

    const ai = getAI();
    const base64Data = imageBase64.split(",")[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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

router.post("/checkout/create-session", ipRateLimit, async (req, res): Promise<void> => {
  try {
    const {
      model, size, quantity, color, shareInGallery, imageBase64, style,
      customerEmail, uid, sourceOrderId, sourceOwnerUid, usePoints,
    } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const { getFirebaseFirestore, getFirebaseStorageBucket } = await import("../lib/firebase-admin");
    const firestoreDb = getFirebaseFirestore();

    // Resolve points discount if requested
    let pointsToRedeem = 0;
    let discountCents = 0;
    if (usePoints && uid) {
      const userDoc = await firestoreDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userPoints: number = (userDoc.data()?.points ?? 0) as number;
        if (userPoints >= 50) {
          pointsToRedeem = userPoints;
          discountCents = Math.floor(userPoints / 10) * 100; // 10 pts = R$1 = 100 cents
        }
      }
    }

    const baseUnitAmount = 14990; // R$149.90
    const finalUnitAmount = Math.max(1000, baseUnitAmount - discountCents); // min R$10

    const pendingOrderId = randomUUID();

    const bucket = getFirebaseStorageBucket();
    const tempImagePath = `pendingArtwork/${pendingOrderId}.png`;
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    await bucket.file(tempImagePath).save(Buffer.from(base64Data, "base64"), {
      metadata: { contentType: "image/png" },
      public: false,
    });

    const pendingOrderData = {
      tempImagePath,
      style: style ?? "default",
      customerEmail: customerEmail ?? null,
      uid: uid ?? null,
      model: model ?? null,
      size: size ?? null,
      color: color ?? null,
      quantity: quantity ?? 1,
      shareInGallery: shareInGallery ?? false,
      sourceOrderId: sourceOrderId ?? null,
      sourceOwnerUid: sourceOwnerUid ?? null,
      pointsToRedeem,
      createdAt: new Date().toISOString(),
    };

    await firestoreDb.collection("pendingOrders").doc(pendingOrderId).set(pendingOrderData);

    let session: Stripe.Checkout.Session;
    try {
      const stripe = getStripe();
      const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
      const baseUrl = domains ? `https://${domains}` : "http://localhost:80";

      const productName = sourceOwnerUid
        ? `Camiseta AI T-Studio — ${style ?? "Arte Exclusiva"} (Remix da Galeria)`
        : `Camiseta AI T-Studio — ${style ?? "Arte Exclusiva"}`;

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: customerEmail ?? undefined,
        client_reference_id: pendingOrderId,
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: { name: productName },
            unit_amount: finalUnitAmount,
          },
          quantity: quantity ?? 1,
        }],
        mode: "payment",
        success_url: `${baseUrl}/?success=true`,
        cancel_url: `${baseUrl}/`,
        metadata: {
          shirt_model: (model ?? "").slice(0, 100),
          shirt_size: (size ?? "").slice(0, 20),
          shirt_color: (color ?? "").slice(0, 50),
          shirt_style: (style ?? "").slice(0, 100),
          quantity: String(quantity ?? 1),
          share_in_gallery: shareInGallery ? "true" : "false",
          source_order_id: (sourceOrderId ?? "").slice(0, 100),
          source_owner_uid: (sourceOwnerUid ?? "").slice(0, 100),
          points_redeemed: String(pointsToRedeem),
        },
      });
    } catch (stripeErr) {
      await firestoreDb.collection("pendingOrders").doc(pendingOrderId).delete().catch((delErr: unknown) => {
        logger.error({ delErr }, "Failed to clean up pending order after Stripe error");
      });
      throw stripeErr;
    }

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "checkout/create-session failed");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
