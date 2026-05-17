import type { Request, Response, NextFunction } from "express";
import { getFirebaseFirestore, verifyFirebaseToken } from "./firebase-admin";
import { logger } from "./logger";

export interface StoreAccessRequest extends Request {
  callerUid: string;
  isSuperAdmin: boolean;
  ownerStoreId: string | null;
}

async function isSuperAdminUid(uid: string): Promise<boolean> {
  const adminUids = (process.env.ADMIN_UIDS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (adminUids.includes(uid)) return true;
  try {
    const db = getFirebaseFirestore();
    const doc = await db.collection("admins").doc(uid).get();
    return doc.exists;
  } catch (err) {
    logger.error({ err, uid }, "Failed to check admin status in Firestore");
    return false;
  }
}

export async function requireStoreAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  if (await isSuperAdminUid(uid)) {
    const r = req as StoreAccessRequest;
    r.callerUid = uid;
    r.isSuperAdmin = true;
    r.ownerStoreId = null;
    next();
    return;
  }

  try {
    const db = getFirebaseFirestore();
    const snap = await db
      .collection("stores")
      .where("ownerUid", "==", uid)
      .where("active", "==", true)
      .limit(1)
      .get();
    if (!snap.empty) {
      const r = req as StoreAccessRequest;
      r.callerUid = uid;
      r.isSuperAdmin = false;
      r.ownerStoreId = snap.docs[0].id;
      next();
      return;
    }
  } catch (err) {
    logger.error({ err, uid }, "Failed to check store ownership");
  }

  res.status(403).json({ error: "Access denied" });
}

export async function requireFirebaseAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  if (await isSuperAdminUid(uid)) {
    const r = req as StoreAccessRequest;
    r.callerUid = uid;
    r.isSuperAdmin = true;
    r.ownerStoreId = null;
    next();
    return;
  }

  res.status(403).json({ error: "Admin access required" });
}
