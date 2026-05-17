import { Router, type IRouter } from "express";
import { getFirebaseFirestore } from "../lib/firebase-admin";
import { logger } from "../lib/logger";
import { requireFirebaseAdmin, requireStoreAccess, type StoreAccessRequest } from "../lib/store-access";
import crypto from "crypto";

const router: IRouter = Router();

const VALID_PLATFORMS = ["custom", "shopify", "woocommerce", "nuvemshop"] as const;

function isValidPlatform(p: unknown): p is string {
  return typeof p === "string" && (VALID_PLATFORMS as readonly string[]).includes(p);
}

function generateApiKey(): string {
  return `sk_${crypto.randomBytes(32).toString("hex")}`;
}

async function seedDefaultStore(): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const ref = db.collection("stores").doc("tshirt-store");
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        name: "AI T-Studio",
        platform: "custom",
        apiKey: generateApiKey(),
        active: true,
        isAiEnabled: true,
        webhookUrl: null,
        createdAt: new Date().toISOString(),
      });
      logger.info("Seeded default tshirt-store document in Firestore");
    } else {
      // Backfill isAiEnabled if missing (existing installs)
      const data = snap.data()!;
      if (data.isAiEnabled === undefined) {
        await ref.update({ isAiEnabled: true });
        logger.info("Backfilled isAiEnabled=true on tshirt-store");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Failed to seed default store");
  }
}

seedDefaultStore();

// GET /admin/stores — list stores (super-admin: all; store owner: own store only)
router.get("/admin/stores", requireStoreAccess, async (req, res): Promise<void> => {
  const r = req as StoreAccessRequest;
  try {
    const db = getFirebaseFirestore();
    if (r.isSuperAdmin) {
      const snap = await db.collection("stores").orderBy("createdAt", "asc").get();
      const stores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json({ stores });
    } else {
      const storeId = r.ownerStoreId!;
      const snap = await db.collection("stores").doc(storeId).get();
      const stores = snap.exists ? [{ id: storeId, ...snap.data() }] : [];
      res.json({ stores });
    }
  } catch (err) {
    logger.error({ err }, "Failed to list stores");
    res.status(500).json({ error: "Failed to load stores" });
  }
});

// POST /admin/stores — create a store (super-admin only)
router.post("/admin/stores", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const { name, platform, webhookUrl, ownerUid } = req.body as {
    name: string;
    platform: string;
    webhookUrl?: string;
    ownerUid?: string;
  };
  if (!name || !platform) {
    res.status(400).json({ error: "name and platform are required" });
    return;
  }
  if (!isValidPlatform(platform)) {
    res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` });
    return;
  }
  try {
    const db = getFirebaseFirestore();
    const ref = await db.collection("stores").add({
      name,
      platform,
      apiKey: generateApiKey(),
      active: true,
      isAiEnabled: false,
      webhookUrl: webhookUrl ?? null,
      ownerUid: ownerUid ?? null,
      createdAt: new Date().toISOString(),
    });
    const snap = await ref.get();
    res.status(201).json({ id: ref.id, ...snap.data() });
  } catch (err) {
    logger.error({ err }, "Failed to create store");
    res.status(500).json({ error: "Failed to create store" });
  }
});

// PATCH /admin/stores/:storeId — update fields (super-admin only)
router.patch("/admin/stores/:storeId", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const storeId = String(req.params.storeId);
  const { active, webhookUrl, name, platform, isAiEnabled, ownerUid } = req.body as {
    active?: boolean;
    webhookUrl?: string;
    name?: string;
    platform?: string;
    isAiEnabled?: boolean;
    ownerUid?: string;
  };
  const update: Record<string, unknown> = {};
  if (typeof active === "boolean") update.active = active;
  if (webhookUrl !== undefined) update.webhookUrl = webhookUrl;
  if (name !== undefined) update.name = name;
  if (ownerUid !== undefined) update.ownerUid = ownerUid;
  if (typeof isAiEnabled === "boolean") update.isAiEnabled = isAiEnabled;
  if (platform !== undefined) {
    if (!isValidPlatform(platform)) {
      res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` });
      return;
    }
    update.platform = platform;
  }
  try {
    const db = getFirebaseFirestore();
    await db.collection("stores").doc(storeId).update(update);
    const snap = await db.collection("stores").doc(storeId).get();
    res.json({ id: storeId, ...snap.data() });
  } catch (err) {
    logger.error({ err, storeId }, "Failed to update store");
    res.status(500).json({ error: "Failed to update store" });
  }
});

// POST /admin/stores/:storeId/rotate-key — generate a new API key (super-admin only)
router.post("/admin/stores/:storeId/rotate-key", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const storeId = String(req.params.storeId);
  const newKey = generateApiKey();
  try {
    const db = getFirebaseFirestore();
    await db.collection("stores").doc(storeId).update({ apiKey: newKey });
    res.json({ id: storeId, apiKey: newKey });
  } catch (err) {
    logger.error({ err, storeId }, "Failed to rotate API key");
    res.status(500).json({ error: "Failed to rotate key" });
  }
});

// DELETE /admin/stores/:storeId — soft-delete (super-admin only)
router.delete("/admin/stores/:storeId", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const storeId = String(req.params.storeId);
  if (storeId === "tshirt-store") {
    res.status(400).json({ error: "Cannot deactivate the default store" });
    return;
  }
  try {
    const db = getFirebaseFirestore();
    await db.collection("stores").doc(storeId).update({
      active: false,
      deactivatedAt: new Date().toISOString(),
    });
    res.status(200).json({ id: storeId, active: false });
  } catch (err) {
    logger.error({ err, storeId }, "Failed to deactivate store");
    res.status(500).json({ error: "Failed to deactivate store" });
  }
});

// POST /api/ingest/:storeId/orders — external store order ingestion
router.post("/ingest/:storeId/orders", async (req, res): Promise<void> => {
  const { storeId } = req.params;
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({ error: "x-api-key header is required" });
    return;
  }

  try {
    const db = getFirebaseFirestore();
    const storeSnap = await db.collection("stores").doc(storeId).get();
    if (!storeSnap.exists) {
      res.status(404).json({ error: "Store not found" });
      return;
    }
    const store = storeSnap.data()!;
    if (!store.active) {
      res.status(403).json({ error: "Store is inactive" });
      return;
    }
    if (store.apiKey !== apiKey) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    const isAiEnabled = store.isAiEnabled === true;
    const body = req.body as Record<string, unknown>;

    const orderRef = await db.collection("orders").add({
      storeId,
      storeName: store.name,
      sessionId: body.sessionId ?? null,
      uid: body.uid ?? null,
      customerEmail: body.customerEmail ?? body.customer_email ?? null,
      style: body.style ?? null,
      model: body.model ?? null,
      size: body.size ?? null,
      color: body.color ?? null,
      quantity: body.quantity ?? 1,
      amount: body.amount ?? body.total ?? null,
      currency: body.currency ?? "brl",
      artworkUrl: body.artworkUrl ?? body.artwork_url ?? null,
      artworkFilename: body.artworkFilename ?? body.artwork_filename ?? null,
      upscaled: false,
      shareInGallery: false,
      // Non-AI stores skip AI processing entirely
      status: isAiEnabled ? "processing" : "aguardando_producao",
      aiSkipped: !isAiEnabled,
      createdAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
    });

    res.status(201).json({ orderId: orderRef.id });
  } catch (err) {
    logger.error({ err, storeId }, "Failed to ingest order");
    res.status(500).json({ error: "Failed to ingest order" });
  }
});

export default router;
