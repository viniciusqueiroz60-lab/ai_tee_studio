import { Router, type IRouter } from "express";
import { getFirebaseFirestore, verifyFirebaseToken } from "../lib/firebase-admin";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/orders/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let uid: string;
  try {
    const decoded = await verifyFirebaseToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch (err) {
    logger.warn({ err }, "Failed to verify Firebase token on /orders/me");
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    const db = getFirebaseFirestore();
    const snap = await db
      .collection("orders")
      .where("uid", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const orders = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        status: data.status,
        sessionId: data.sessionId,
        style: data.style,
        model: data.model,
        size: data.size,
        color: data.color,
        quantity: data.quantity,
        amount: data.amount,
        currency: data.currency,
        artworkUrl: data.artworkUrl ?? null,
        upscaled: data.upscaled ?? false,
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? null,
      };
    });

    res.json({ orders });
  } catch (err) {
    logger.error({ err, uid }, "Failed to list orders for user");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

export default router;
