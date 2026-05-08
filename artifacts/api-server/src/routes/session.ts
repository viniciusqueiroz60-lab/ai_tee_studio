import { Router, type IRouter } from "express";
import { db, guestSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { InitSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

const GUEST_TOKEN_INITIAL = 3;
const SESSION_TTL_DAYS = 7;

router.post("/session/init", async (req, res): Promise<void> => {
  const parsed = InitSessionBody.safeParse(req.body);
  const existingSessionId = parsed.success ? parsed.data.sessionId : null;

  if (existingSessionId) {
    const [existing] = await db
      .select()
      .from(guestSessionsTable)
      .where(eq(guestSessionsTable.sessionId, existingSessionId));

    if (existing && existing.expiresAt > new Date()) {
      // Return existing nonce (already set), or generate one now for legacy sessions
      let nonce = existing.migrationNonce;
      if (!nonce) {
        nonce = randomUUID();
        await db
          .update(guestSessionsTable)
          .set({ migrationNonce: nonce })
          .where(eq(guestSessionsTable.sessionId, existingSessionId));
      }
      res.json({
        sessionId: existing.sessionId,
        migrationNonce: nonce,
        tokenBalance: existing.tokenBalance,
        expiresAt: existing.expiresAt.toISOString(),
      });
      return;
    }
  }

  const sessionId = randomUUID();
  const migrationNonce = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const [session] = await db
    .insert(guestSessionsTable)
    .values({ sessionId, migrationNonce, tokenBalance: GUEST_TOKEN_INITIAL, expiresAt })
    .returning();

  res.json({
    sessionId: session.sessionId,
    migrationNonce: session.migrationNonce,
    tokenBalance: session.tokenBalance,
    expiresAt: session.expiresAt.toISOString(),
  });
});

export default router;
