import { Router, type IRouter } from "express";
import { db, ordersTable, artworksTable, tshirtModelsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import Stripe from "stripe";
import { logger } from "../lib/logger";
import { CreateCheckoutBody } from "@workspace/api-zod";

const router: IRouter = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function formatOrder(order: any, artwork: any) {
  return {
    id: order.id,
    userId: order.userId,
    artworkId: order.artworkId,
    modelId: order.modelId,
    color: order.color,
    size: order.size,
    stripeSessionId: order.stripeSessionId,
    status: order.status,
    masterized: order.masterized,
    totalPrice: order.totalPrice,
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    artwork: {
      id: artwork.id,
      userId: artwork.userId,
      guestSessionId: artwork.guestSessionId,
      prompt: artwork.prompt,
      enrichedPrompt: artwork.enrichedPrompt,
      styleSlug: artwork.styleSlug,
      styleLabel: artwork.styleLabel,
      imageUrl: artwork.imageUrl,
      isShared: artwork.isShared,
      moderationStatus: artwork.moderationStatus,
      likes: artwork.likes,
      views: artwork.views,
      upscaled: artwork.upscaled,
      authorName: null,
      createdAt: artwork.createdAt instanceof Date ? artwork.createdAt.toISOString() : artwork.createdAt,
    },
  };
}

router.post("/checkout", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { artworkId, modelId, color, size } = parsed.data;

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, artworkId));
  if (!artwork) { res.status(404).json({ error: "Artwork not found" }); return; }

  const [model] = await db.select().from(tshirtModelsTable).where(eq(tshirtModelsTable.id, modelId));
  if (!model) { res.status(404).json({ error: "Model not found" }); return; }

  const stripe = getStripe();

  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domains ? `https://${domains}` : "http://localhost:80";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "brl",
        product_data: {
          name: `Camiseta Personalizada - ${model.name}`,
          description: `Cor: ${color} | Tamanho: ${size} | Design: ${artwork.prompt.slice(0, 100)}`,
          images: artwork.imageUrl.startsWith("http") ? [artwork.imageUrl] : [],
        },
        unit_amount: Math.round(model.price * 100),
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${baseUrl}/orders?success=true`,
    cancel_url: `${baseUrl}/product/${artworkId}`,
    metadata: {
      userId: String(req.user!.id),
      artworkId: String(artworkId),
      modelId: String(modelId),
      color,
      size,
      totalPrice: String(model.price),
    },
  });

  // Create pending order
  await db.insert(ordersTable).values({
    userId: req.user!.id,
    artworkId,
    modelId,
    color,
    size,
    stripeSessionId: session.id,
    status: "pending",
    totalPrice: model.price,
  });

  res.json({ url: session.url, sessionId: session.id });
});

router.get("/orders", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.user!.id))
    .orderBy(desc(ordersTable.createdAt));

  const result = await Promise.all(
    orders.map(async (o) => {
      const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, o.artworkId));
      return formatOrder(o, artwork);
    })
  );

  res.json(result);
});

// Stripe webhook - must use raw body
router.post("/webhooks/stripe", async (req, res): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body as Stripe.Event;
    }
  } catch (err) {
    req.log.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    await db
      .update(ordersTable)
      .set({ status: "paid" })
      .where(eq(ordersTable.stripeSessionId, session.id));

    // Masterization placeholder
    logger.info(
      { sessionId: session.id, metadata: session.metadata },
      "MASTERIZATION_PLACEHOLDER: Would call upscaling API (Replicate/Cloudinary) for artwork after payment confirmed"
    );
  }

  res.json({ received: true });
});

export default router;
