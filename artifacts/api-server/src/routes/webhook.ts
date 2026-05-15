import { Router } from "express";
import Stripe from "stripe";
import { logger } from "../lib/logger";
import { getFirebaseFirestore, getFirebaseStorageBucket } from "../lib/firebase-admin";
import { upscaleImage } from "../lib/upscale";

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

router.post("/webhooks/stripe", async (req, res): Promise<void> => {
  const sig = req.headers["stripe-signature"] as string | undefined;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type !== "checkout.session.completed") {
    res.json({ received: true });
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  res.json({ received: true });

  processCompletedOrder(session).catch(err => {
    logger.error({ err, sessionId: session.id }, "Failed to process completed order");
  });
});

async function processCompletedOrder(session: Stripe.Checkout.Session): Promise<void> {
  const sessionId = session.id;
  const pendingOrderId = session.client_reference_id ?? sessionId;
  const db = getFirebaseFirestore();

  const pendingRef = db.collection("pendingOrders").doc(pendingOrderId);
  const pendingSnap = await pendingRef.get();

  if (!pendingSnap.exists) {
    logger.warn({ sessionId }, "No pending order found for session — skipping artwork processing");
    return;
  }

  const pending = pendingSnap.data()!;
  const {
    tempImagePath,
    style,
    customerEmail: pendingEmail,
    uid,
    model,
    size,
    color,
    quantity,
    shareInGallery,
  } = pending;

  const customerEmail = pendingEmail ?? session.customer_details?.email ?? "unknown";

  const orderRef = await db.collection("orders").add({
    sessionId,
    uid: uid ?? null,
    customerEmail,
    style: style ?? "default",
    model: model ?? null,
    size: size ?? null,
    color: color ?? null,
    quantity: quantity ?? 1,
    shareInGallery: shareInGallery ?? false,
    status: "processing",
    amount: session.amount_total,
    currency: session.currency,
    createdAt: new Date().toISOString(),
  });

  try {
    const bucket = getFirebaseStorageBucket();
    const [tempImageBuffer] = await bucket.file(tempImagePath as string).download();
    const imageBase64 = `data:image/png;base64,${tempImageBuffer.toString("base64")}`;

    logger.info({ sessionId }, "Starting artwork upscaling");
    const upscaledImage = await upscaleImage(imageBase64);

    const emailSlug = customerEmail.replace(/[@.]/g, "_").slice(0, 40);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const styleSlug = (style ?? "default").toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const filename = `artes/${emailSlug}_${dateStr}_${styleSlug}.png`;

    const file = bucket.file(filename);
    const base64Data = upscaledImage.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    await file.save(imageBuffer, {
      metadata: { contentType: "image/png" },
      public: false,
    });

    const [artworkUrl] = await file.getSignedUrl({
      action: "read",
      expires: "2099-01-01",
    });

    await orderRef.update({
      status: "aguardando_producao",
      artworkUrl,
      artworkFilename: filename,
      upscaled: imageBase64 !== upscaledImage,
      completedAt: new Date().toISOString(),
    });

    await pendingRef.delete();
    await bucket.file(tempImagePath as string).delete().catch((delErr: unknown) => {
      logger.warn({ delErr, tempImagePath }, "Failed to delete temp artwork from Storage");
    });

    logger.info({ sessionId, filename }, "Artwork processed and stored successfully");
  } catch (err) {
    logger.error({ err, sessionId }, "Error processing artwork after payment");
    await orderRef.update({ status: "erro_processamento", errorAt: new Date().toISOString() });
  }
}

export default router;
