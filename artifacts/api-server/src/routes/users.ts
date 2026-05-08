import { Router, type IRouter } from "express";
import { db, usersTable, guestSessionsTable, artworksTable } from "@workspace/db";
import { eq, sql, and, gt } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

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

// Called after auth to migrate guest tokens and artworks to the authenticated account
router.post("/me/migrate-session", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.json({ migrated: false });
    return;
  }

  // Atomically claim the guest session tokens and migrate everything in one transaction.
  // Zeroing the guest balance first (WHERE tokenBalance > 0) makes this idempotent:
  // concurrent or retried requests will see tokenBalance = 0 and credit nothing.
  let tokensAdded = 0;
  let artworksMigrated = 0;

  await db.transaction(async (tx) => {
    // SELECT FOR UPDATE locks the row so concurrent requests block here.
    // We read the pre-zero balance from the locked row, then zero it.
    // Any subsequent concurrent request will read 0 and skip the credit.
    const [session] = await tx
      .select({ tokenBalance: guestSessionsTable.tokenBalance })
      .from(guestSessionsTable)
      .where(eq(guestSessionsTable.sessionId, sessionId))
      .for("update");

    tokensAdded = session?.tokenBalance ?? 0;

    // Always zero out the guest session (idempotent)
    await tx
      .update(guestSessionsTable)
      .set({ tokenBalance: 0 })
      .where(eq(guestSessionsTable.sessionId, sessionId));

    if (tokensAdded > 0) {
      await tx
        .update(usersTable)
        .set({ tokenBalance: sql`${usersTable.tokenBalance} + ${tokensAdded}` })
        .where(eq(usersTable.id, req.user!.id));
    }

    const migrated = await tx
      .update(artworksTable)
      .set({ userId: req.user!.id, guestSessionId: null })
      .where(eq(artworksTable.guestSessionId, sessionId))
      .returning({ id: artworksTable.id });

    artworksMigrated = migrated.length;
  });

  res.json({ migrated: true, tokensAdded, artworksMigrated });
});

export default router;
