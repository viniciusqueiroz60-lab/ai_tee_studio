import { Router, type IRouter } from "express";
import { db, artworksTable, usersTable, guestSessionsTable, stylesTable, artworkLikesTable } from "@workspace/db";
import type { Artwork } from "@workspace/db";
import { eq, desc, and, sql, gt } from "drizzle-orm";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { generateArtworkImage, refineArtworkImage, buildEnrichedPrompt } from "../lib/gemini";
import { GenerateArtworkBody, RefineArtworkBody } from "@workspace/api-zod";

const router: IRouter = Router();

function formatArtwork(artwork: Artwork, authorName?: string | null, userLiked?: boolean) {
  return {
    id: artwork.id,
    userId: artwork.userId,
    guestSessionId: artwork.guestSessionId,
    prompt: artwork.prompt,
    enrichedPrompt: artwork.enrichedPrompt,
    styleSlug: artwork.styleSlug,
    styleLabel: artwork.styleLabel,
    imageUrl: artwork.imageUrl,
    isShared: artwork.isShared,
    moderationStatus: artwork.moderationStatus,
    likes: artwork.likes,
    views: artwork.views,
    upscaled: artwork.upscaled,
    authorName: authorName ?? null,
    userLiked: userLiked ?? false,
    createdAt: artwork.createdAt instanceof Date ? artwork.createdAt.toISOString() : artwork.createdAt,
  };
}

router.get("/me/artworks", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const myArtworks = await db
    .select()
    .from(artworksTable)
    .where(eq(artworksTable.userId, req.user!.id))
    .orderBy(desc(artworksTable.createdAt));

  res.json(myArtworks.map((a) => formatArtwork(a)));
});

router.post("/generate", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = GenerateArtworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prompt, styleSlug, sessionId } = parsed.data;

  let styleLabel: string | null = null;
  let promptParams = "";

  if (styleSlug) {
    const [style] = await db.select().from(stylesTable).where(eq(stylesTable.slug, styleSlug));
    if (style) {
      styleLabel = style.label;
      promptParams = style.promptParams;
    }
  }

  // Token deduction — atomic single-statement to prevent race conditions
  if (req.user) {
    const [deducted] = await db
      .update(usersTable)
      .set({ tokenBalance: sql`${usersTable.tokenBalance} - 1` })
      .where(and(eq(usersTable.id, req.user.id), gt(usersTable.tokenBalance, 0)))
      .returning({ tokenBalance: usersTable.tokenBalance });
    if (!deducted) {
      res.status(402).json({ error: "Insufficient tokens" });
      return;
    }
  } else if (sessionId) {
    const now = new Date();
    const [deducted] = await db
      .update(guestSessionsTable)
      .set({ tokenBalance: sql`${guestSessionsTable.tokenBalance} - 1` })
      .where(
        and(
          eq(guestSessionsTable.sessionId, sessionId),
          gt(guestSessionsTable.tokenBalance, 0),
          gt(guestSessionsTable.expiresAt, now)
        )
      )
      .returning({ sessionId: guestSessionsTable.sessionId });
    if (!deducted) {
      // Check whether the session exists at all to return a clear error
      const [session] = await db.select().from(guestSessionsTable).where(eq(guestSessionsTable.sessionId, sessionId));
      if (!session || session.expiresAt <= now) {
        res.status(401).json({ error: "Sessão de convidado expirada ou inválida" });
      } else {
        res.status(402).json({ error: "Tokens de convidado insuficientes" });
      }
      return;
    }
  } else {
    res.status(402).json({ error: "No session or auth token provided" });
    return;
  }

  const enrichedPrompt = buildEnrichedPrompt(prompt, promptParams);

  let imageUrl: string;
  try {
    imageUrl = await generateArtworkImage(prompt, promptParams);
  } catch (err: unknown) {
    // Refund the token atomically since generation failed
    if (req.user) {
      await db.update(usersTable)
        .set({ tokenBalance: sql`${usersTable.tokenBalance} + 1` })
        .where(eq(usersTable.id, req.user.id));
    } else if (sessionId) {
      await db.update(guestSessionsTable)
        .set({ tokenBalance: sql`${guestSessionsTable.tokenBalance} + 1` })
        .where(eq(guestSessionsTable.sessionId, sessionId));
    }
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      res.status(503).json({ error: "A IA está temporariamente indisponível (cota excedida). Tente novamente mais tarde." });
    } else {
      res.status(503).json({ error: "Falha ao gerar imagem com IA. Tente novamente." });
    }
    return;
  }

  const [artwork] = await db
    .insert(artworksTable)
    .values({
      userId: req.user?.id ?? null,
      // Authenticated users never have artwork linked to a guest session,
      // even if the client passed a sessionId in the body.
      guestSessionId: req.user ? null : (sessionId ?? null),
      prompt,
      enrichedPrompt,
      styleSlug: styleSlug ?? null,
      styleLabel,
      imageUrl,
      isShared: false,
    })
    .returning();

  res.status(201).json(formatArtwork(artwork));
});

router.post("/refine", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = RefineArtworkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { artworkId, refinementPrompt } = parsed.data;

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, artworkId));
  if (!artwork) {
    res.status(404).json({ error: "Artwork not found" });
    return;
  }

  if (artwork.userId !== req.user!.id) {
    res.status(403).json({ error: "Not your artwork" });
    return;
  }

  // Atomic token debit for refine
  const [deducted] = await db
    .update(usersTable)
    .set({ tokenBalance: sql`${usersTable.tokenBalance} - 1` })
    .where(and(eq(usersTable.id, req.user!.id), gt(usersTable.tokenBalance, 0)))
    .returning({ tokenBalance: usersTable.tokenBalance });
  if (!deducted) {
    res.status(402).json({ error: "Insufficient tokens" });
    return;
  }

  let newImageUrl: string;
  try {
    newImageUrl = await refineArtworkImage(artwork.imageUrl, refinementPrompt);
  } catch (err: unknown) {
    // Refund token since refinement failed
    await db
      .update(usersTable)
      .set({ tokenBalance: sql`${usersTable.tokenBalance} + 1` })
      .where(eq(usersTable.id, req.user!.id));
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
      res.status(503).json({ error: "A IA está temporariamente indisponível (cota excedida). Tente novamente mais tarde." });
    } else {
      res.status(503).json({ error: "Falha ao refinar imagem com IA. Tente novamente." });
    }
    return;
  }

  const [updated] = await db
    .update(artworksTable)
    .set({ imageUrl: newImageUrl, enrichedPrompt: `${artwork.enrichedPrompt ?? ""} | Refinement: ${refinementPrompt}` })
    .where(eq(artworksTable.id, artworkId))
    .returning();

  res.json(formatArtwork(updated));
});

router.get("/artworks/:artworkId", optionalAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, id));
  if (!artwork) { res.status(404).json({ error: "Not found" }); return; }

  // Access control: requester must be the owner OR artwork must be public+approved
  const isOwner = req.user != null && req.user.id === artwork.userId;
  const isPublic = artwork.isShared && artwork.moderationStatus === "approved";
  if (!isOwner && !isPublic) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.update(artworksTable).set({ views: artwork.views + 1 }).where(eq(artworksTable.id, id));

  let authorName: string | null = null;
  if (artwork.userId) {
    const [user] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, artwork.userId));
    authorName = user?.displayName ?? null;
  }

  // Hydrate per-user like status so the frontend can initialize UI correctly
  let userLiked = false;
  if (req.user) {
    const [like] = await db
      .select({ artworkId: artworkLikesTable.artworkId })
      .from(artworkLikesTable)
      .where(and(eq(artworkLikesTable.userId, req.user.id), eq(artworkLikesTable.artworkId, id)));
    userLiked = like != null;
  }

  res.json(formatArtwork({ ...artwork, views: artwork.views + 1 }, authorName, userLiked));
});

router.post("/artworks/:artworkId/share", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, id));
  if (!artwork) { res.status(404).json({ error: "Not found" }); return; }
  if (artwork.userId !== req.user!.id) { res.status(403).json({ error: "Not your artwork" }); return; }

  const [updated] = await db
    .update(artworksTable)
    .set({ isShared: true, moderationStatus: "pending" })
    .where(eq(artworksTable.id, id))
    .returning();

  res.json(formatArtwork(updated));
});

router.post("/artworks/:artworkId/like", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const artworkId = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);
  if (isNaN(artworkId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, artworkId));
  if (!artwork) { res.status(404).json({ error: "Not found" }); return; }

  // Access control: only the owner or a public+approved artwork can be liked
  const isOwner = req.user!.id === artwork.userId;
  const isPublicApproved = artwork.isShared && artwork.moderationStatus === "approved";
  if (!isOwner && !isPublicApproved) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await db.insert(artworkLikesTable).values({ userId: req.user!.id, artworkId });
    await db.update(artworksTable).set({ likes: sql`${artworksTable.likes} + 1` }).where(eq(artworksTable.id, artworkId));
  } catch (_e) {
    // Already liked, ignore duplicate key
  }

  const [art] = await db.select({ likes: artworksTable.likes }).from(artworksTable).where(eq(artworksTable.id, artworkId));
  res.json({ likes: art?.likes ?? 0, liked: true });
});

router.delete("/artworks/:artworkId/like", optionalAuth, requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const artworkId = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);
  if (isNaN(artworkId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, artworkId));
  if (!artwork) { res.status(404).json({ error: "Not found" }); return; }

  // Access control: only the owner or a public+approved artwork can be unliked
  const isOwner = req.user!.id === artwork.userId;
  const isPublicApproved = artwork.isShared && artwork.moderationStatus === "approved";
  if (!isOwner && !isPublicApproved) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Only decrement likes if the like row actually existed (transactionally)
  await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(artworkLikesTable)
      .where(and(eq(artworkLikesTable.userId, req.user!.id), eq(artworkLikesTable.artworkId, artworkId)))
      .returning({ artworkId: artworkLikesTable.artworkId });
    if (deleted.length > 0) {
      await tx
        .update(artworksTable)
        .set({ likes: sql`GREATEST(${artworksTable.likes} - 1, 0)` })
        .where(eq(artworksTable.id, artworkId));
    }
  });

  const [art] = await db.select({ likes: artworksTable.likes }).from(artworksTable).where(eq(artworksTable.id, artworkId));
  res.json({ likes: art?.likes ?? 0, liked: false });
});

export default router;
