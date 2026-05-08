import { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../lib/firebase-admin";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    firebaseUid: string;
    email: string;
    role: string;
    tokenBalance: number;
  };
  guestSessionId?: string;
}

export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await verifyFirebaseToken(token);
      let [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.firebaseUid, decoded.uid));

      // Role is always derived from the verified Firebase token claim (authoritative)
      const claimRole = decoded.admin === true ? "admin" : "user";

      if (!user) {
        const [newUser] = await db
          .insert(usersTable)
          .values({
            firebaseUid: decoded.uid,
            email: decoded.email ?? "",
            displayName: decoded.name ?? null,
            photoUrl: decoded.picture ?? null,
            role: claimRole,
            tokenBalance: 10,
          })
          .returning();
        user = newUser;
      } else if (user.role !== claimRole) {
        // Sync DB role whenever it diverges from the claim (e.g. claim was granted/revoked)
        await db.update(usersTable).set({ role: claimRole }).where(eq(usersTable.id, user.id));
      }

      req.user = {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: claimRole,
        tokenBalance: user.tokenBalance,
      };
    } catch (_err) {
      // ignore invalid token
    }
  }

  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (sessionId && !req.user) {
    req.guestSessionId = sessionId;
  }

  next();
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
