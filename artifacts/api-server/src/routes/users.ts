import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { guestSessionsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/me", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    role: user.role,
    tokenBalance: user.tokenBalance,
    createdAt: user.createdAt.toISOString(),
  });
});

// Called after auth to migrate guest tokens
router.post("/me/migrate-session", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.json({ migrated: false });
    return;
  }

  const [session] = await db
    .select()
    .from(guestSessionsTable)
    .where(eq(guestSessionsTable.sessionId, sessionId));

  if (!session || session.tokenBalance <= 0) {
    res.json({ migrated: false, tokensAdded: 0 });
    return;
  }

  const tokensToAdd = session.tokenBalance;

  await db
    .update(usersTable)
    .set({ tokenBalance: req.user!.tokenBalance + tokensToAdd })
    .where(eq(usersTable.id, req.user!.id));

  await db
    .update(guestSessionsTable)
    .set({ tokenBalance: 0 })
    .where(eq(guestSessionsTable.sessionId, sessionId));

  res.json({ migrated: true, tokensAdded: tokensToAdd });
});

export default router;
