import { Router, type IRouter } from "express";
import { getFirebaseFirestore } from "../lib/firebase-admin";
import { logger } from "../lib/logger";
import { requireStoreAccess, requireFirebaseAdmin, type StoreAccessRequest } from "../lib/store-access";

const router: IRouter = Router();

const VALID_STATUSES = [
  "processing",
  "aguardando_producao",
  "em_producao",
  "enviado",
  "entregue",
  "erro_processamento",
];

// GET all orders (super-admin: all; store owner: own store only)
router.get("/admin/forders", requireStoreAccess, async (req, res): Promise<void> => {
  const r = req as StoreAccessRequest;
  const status = req.query.status as string | undefined;
  // Super-admins may filter by storeId; owners always see only their store
  const storeIdFilter = r.isSuperAdmin
    ? (req.query.storeId as string | undefined)
    : r.ownerStoreId ?? undefined;

  try {
    const db = getFirebaseFirestore();
    let ref: FirebaseFirestore.Query = db.collection("orders").limit(200);
    if (status && status !== "all") {
      ref = ref.where("status", "==", status);
    }
    if (storeIdFilter && storeIdFilter !== "all") {
      ref = ref.where("storeId", "==", storeIdFilter);
    }
    const snap = await ref.get();
    const orders = snap.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          status: data.status ?? "processing",
          sessionId: data.sessionId ?? null,
          uid: data.uid ?? null,
          customerEmail: data.customerEmail ?? null,
          style: data.style ?? null,
          model: data.model ?? null,
          size: data.size ?? null,
          color: data.color ?? null,
          quantity: data.quantity ?? 1,
          amount: data.amount ?? null,
          currency: data.currency ?? null,
          artworkUrl: data.artworkUrl ?? null,
          artworkFilename: data.artworkFilename ?? null,
          upscaled: data.upscaled ?? false,
          aiSkipped: data.aiSkipped ?? false,
          storeId: data.storeId ?? null,
          createdAt: data.createdAt ?? null,
          completedAt: data.completedAt ?? null,
          errorAt: data.errorAt ?? null,
        };
      })
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to list admin orders");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// PATCH order status (super-admin: any order; store owner: own store orders only)
router.patch("/admin/forders/:id/status", requireStoreAccess, async (req, res): Promise<void> => {
  const r = req as StoreAccessRequest;
  const id = String(req.params.id);
  const { status } = req.body as { status: string };

  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  try {
    const db = getFirebaseFirestore();

    // Store owners may only update orders that belong to their store
    if (!r.isSuperAdmin) {
      const orderSnap = await db.collection("orders").doc(id).get();
      if (!orderSnap.exists) {
        res.status(404).json({ error: "Order not found" });
        return;
      }
      const orderData = orderSnap.data()!;
      if (orderData.storeId !== r.ownerStoreId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
    }

    await db
      .collection("orders")
      .doc(id)
      .update({ status, updatedAt: new Date().toISOString() });
    res.json({ id, status });
  } catch (err) {
    logger.error({ err, id }, "Failed to update order status");
    res.status(500).json({ error: "Failed to update order" });
  }
});

// GET Replicate account info + recent predictions (super-admin only)
router.get("/admin/replicate/account", requireFirebaseAdmin, async (_req, res): Promise<void> => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });
    return;
  }
  try {
    const [accountRes, predictionsRes] = await Promise.all([
      fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Token ${token}` },
      }),
      fetch("https://api.replicate.com/v1/predictions?limit=10", {
        headers: { Authorization: `Token ${token}` },
      }),
    ]);
    const account = await accountRes.json();
    const predictionsData = await predictionsRes.json() as { results?: unknown[] };
    res.json({ account, predictions: predictionsData.results ?? [] });
  } catch (err) {
    logger.error({ err }, "Failed to fetch Replicate data");
    res.status(500).json({ error: "Failed to fetch Replicate data" });
  }
});

export default router;
