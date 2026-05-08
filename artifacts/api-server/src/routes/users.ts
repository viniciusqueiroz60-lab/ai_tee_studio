import { Router, type IRouter } from "express";
import { db, usersTable, guestSessionsTable, artworksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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

  const [session] = await db
    .select()
    .from(guestSessionsTable)
    .where(eq(guestSessionsTable.sessionId, sessionId));

  if (!session) {
    res.json({ migrated: false, tokensAdded: 0, artworksMigrated: 0 });
    return;
  }

  const tokensToAdd = session.tokenBalance;

  // Migrate token balance atomically
  if (tokensToAdd > 0) {
    await db
      .update(usersTable)
      .set({ tokenBalance: sql`${usersTable.tokenBalance} + ${tokensToAdd}` })
      .where(eq(usersTable.id, req.user!.id));
  }

  // Migrate guest artworks to the authenticated user
  const migratedArtworks = await db
    .update(artworksTable)
    .set({ userId: req.user!.id, guestSessionId: null })
    .where(eq(artworksTable.guestSessionId, sessionId))
    .returning({ id: artworksTable.id });

  // Zero out the guest session
  await db
    .update(guestSessionsTable)
    .set({ tokenBalance: 0 })
    .where(eq(guestSessionsTable.sessionId, sessionId));

  res.json({ migrated: true, tokensAdded: tokensToAdd, artworksMigrated: migratedArtworks.length });
});

export default router;
