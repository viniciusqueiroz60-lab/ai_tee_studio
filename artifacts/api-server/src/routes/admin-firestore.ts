import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getFirebaseFirestore, verifyFirebaseToken } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function requireFirebaseAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let uid: string;
  try {
    const decoded = await verifyFirebaseToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  // Check ADMIN_UIDS env var (comma-separated list)
  const adminUids = (process.env.ADMIN_UIDS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (adminUids.includes(uid)) {
    (req as Request & { adminUid: string }).adminUid = uid;
    next();
    return;
  }

  // Fallback: check Firestore `admins/{uid}` collection
  try {
    const db = getFirebaseFirestore();
    const doc = await db.collection("admins").doc(uid).get();
    if (doc.exists) {
      (req as Request & { adminUid: string }).adminUid = uid;
      next();
      return;
    }
  } catch (err) {
    logger.error({ err, uid }, "Failed to check admin status in Firestore");
  }

  res.status(403).json({ error: "Admin access required" });
}

const VALID_STATUSES = [
  "processing",
  "aguardando_producao",
  "em_producao",
  "enviado",
  "entregue",
  "erro_processamento",
];

// GET all orders (optional ?status= filter)
router.get("/admin/forders", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  try {
    const db = getFirebaseFirestore();
    let ref: FirebaseFirestore.Query = db.collection("orders").limit(200);
    if (status && status !== "all") {
      ref = ref.where("status", "==", status);
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

// PATCH order status
router.patch("/admin/forders/:id/status", requireFirebaseAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  try {
    const db = getFirebaseFirestore();
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

// GET Replicate account info + recent predictions
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
    const predictionsData = await predictionsRes.json();
    res.json({ account, predictions: predictionsData.results ?? [] });
  } catch (err) {
    logger.error({ err }, "Failed to fetch Replicate data");
    res.status(500).json({ error: "Failed to fetch Replicate data" });
  }
});

export default router;
