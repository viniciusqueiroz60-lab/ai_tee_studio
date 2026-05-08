import { Router, type IRouter } from "express";
import { db, usersTable, artworksTable, ordersTable, stylesTable, tshirtModelsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { optionalAuth, requireAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import {
  AdminAdjustTokensBody,
  AdminModerateArtworkBody,
  AdminCreateStyleBody,
  AdminUpdateStyleBody,
  AdminCreateModelBody,
  AdminUpdateModelBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Users
router.get("/admin/users", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);

  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset((page - 1) * limit);

  res.json(users.map((u) => ({
    id: u.id,
    firebaseUid: u.firebaseUid,
    email: u.email,
    displayName: u.displayName,
    photoUrl: u.photoUrl,
    role: u.role,
    tokenBalance: u.tokenBalance,
    createdAt: u.createdAt.toISOString(),
  })));
});

router.patch("/admin/users/:userId/tokens", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, 10);
  const parsed = AdminAdjustTokensBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const newBalance = Math.max(0, user.tokenBalance + parsed.data.delta);
  const [updated] = await db.update(usersTable).set({ tokenBalance: newBalance }).where(eq(usersTable.id, userId)).returning();

  logger.info({ userId, delta: parsed.data.delta, reason: parsed.data.reason }, "Admin adjusted tokens");

  res.json({
    id: updated.id,
    firebaseUid: updated.firebaseUid,
    email: updated.email,
    displayName: updated.displayName,
    photoUrl: updated.photoUrl,
    role: updated.role,
    tokenBalance: updated.tokenBalance,
    createdAt: updated.createdAt.toISOString(),
  });
});

// Artworks
router.get("/admin/artworks", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const status = req.query.status as string | undefined;

  const artworks = await db.select().from(artworksTable)
    .where(status && status !== "null" ? eq(artworksTable.moderationStatus, status) : undefined)
    .orderBy(desc(artworksTable.createdAt))
    .limit(20)
    .offset((page - 1) * 20);

  res.json(artworks.map((a) => ({
    id: a.id, userId: a.userId, guestSessionId: a.guestSessionId,
    prompt: a.prompt, enrichedPrompt: a.enrichedPrompt, styleSlug: a.styleSlug,
    styleLabel: a.styleLabel, imageUrl: a.imageUrl, isShared: a.isShared,
    moderationStatus: a.moderationStatus, likes: a.likes, views: a.views,
    upscaled: a.upscaled, authorName: null,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.patch("/admin/artworks/:artworkId/moderation", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const artworkId = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);
  const parsed = AdminModerateArtworkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(artworksTable)
    .set({ moderationStatus: parsed.data.status })
    .where(eq(artworksTable.id, artworkId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: updated.id, userId: updated.userId, guestSessionId: updated.guestSessionId,
    prompt: updated.prompt, enrichedPrompt: updated.enrichedPrompt, styleSlug: updated.styleSlug,
    styleLabel: updated.styleLabel, imageUrl: updated.imageUrl, isShared: updated.isShared,
    moderationStatus: updated.moderationStatus, likes: updated.likes, views: updated.views,
    upscaled: updated.upscaled, authorName: null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/admin/artworks/:artworkId", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const artworkId = parseInt(Array.isArray(req.params.artworkId) ? req.params.artworkId[0] : req.params.artworkId, 10);
  await db.delete(artworksTable).where(eq(artworksTable.id, artworkId));
  res.sendStatus(204);
});

// Orders
router.get("/admin/orders", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const page = parseInt((req.query.page as string) || "1", 10);
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(20).offset((page - 1) * 20);

  const result = await Promise.all(orders.map(async (o) => {
    const [artwork] = await db.select().from(artworksTable).where(eq(artworksTable.id, o.artworkId));
    return {
      id: o.id, userId: o.userId, artworkId: o.artworkId, modelId: o.modelId,
      color: o.color, size: o.size, stripeSessionId: o.stripeSessionId,
      status: o.status, masterized: o.masterized, totalPrice: o.totalPrice,
      createdAt: o.createdAt.toISOString(),
      artwork: artwork ? {
        id: artwork.id, userId: artwork.userId, guestSessionId: artwork.guestSessionId,
        prompt: artwork.prompt, enrichedPrompt: artwork.enrichedPrompt, styleSlug: artwork.styleSlug,
        styleLabel: artwork.styleLabel, imageUrl: artwork.imageUrl, isShared: artwork.isShared,
        moderationStatus: artwork.moderationStatus, likes: artwork.likes, views: artwork.views,
        upscaled: artwork.upscaled, authorName: null,
        createdAt: artwork.createdAt.toISOString(),
      } : null,
    };
  }));

  res.json(result);
});

// Admin list — all styles including inactive
router.get("/admin/styles", optionalAuth, requireAdmin, async (_req, res): Promise<void> => {
  const styles = await db.select().from(stylesTable).orderBy(stylesTable.sortOrder);
  res.json(styles.map((s) => ({
    id: s.id, slug: s.slug, label: s.label, description: s.description,
    icon: s.icon, promptParams: s.promptParams, active: s.active, sortOrder: s.sortOrder,
  })));
});

// Admin list — all models including inactive
router.get("/admin/models", optionalAuth, requireAdmin, async (_req, res): Promise<void> => {
  const models = await db.select().from(tshirtModelsTable).orderBy(tshirtModelsTable.name);
  res.json(models.map((m) => ({
    id: m.id, name: m.name, description: m.description,
    mockupUrl: m.mockupUrl, availableColors: m.availableColors,
    active: m.active, price: m.price,
  })));
});

// Styles CRUD
router.post("/admin/styles", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = AdminCreateStyleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [style] = await db.insert(stylesTable).values(parsed.data).returning();
  res.status(201).json({
    id: style.id, slug: style.slug, label: style.label, description: style.description,
    icon: style.icon, promptParams: style.promptParams, active: style.active, sortOrder: style.sortOrder,
  });
});

router.patch("/admin/styles/:styleId", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const styleId = parseInt(Array.isArray(req.params.styleId) ? req.params.styleId[0] : req.params.styleId, 10);
  const parsed = AdminUpdateStyleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(stylesTable).set(parsed.data).where(eq(stylesTable.id, styleId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: updated.id, slug: updated.slug, label: updated.label, description: updated.description,
    icon: updated.icon, promptParams: updated.promptParams, active: updated.active, sortOrder: updated.sortOrder,
  });
});

router.delete("/admin/styles/:styleId", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const styleId = parseInt(Array.isArray(req.params.styleId) ? req.params.styleId[0] : req.params.styleId, 10);
  await db.delete(stylesTable).where(eq(stylesTable.id, styleId));
  res.sendStatus(204);
});

// Models CRUD
router.post("/admin/models", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = AdminCreateModelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [model] = await db.insert(tshirtModelsTable).values(parsed.data).returning();
  res.status(201).json({
    id: model.id, name: model.name, description: model.description,
    mockupUrl: model.mockupUrl, availableColors: model.availableColors,
    active: model.active, price: model.price,
  });
});

router.patch("/admin/models/:modelId", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const modelId = parseInt(Array.isArray(req.params.modelId) ? req.params.modelId[0] : req.params.modelId, 10);
  const parsed = AdminUpdateModelBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(tshirtModelsTable).set(parsed.data).where(eq(tshirtModelsTable.id, modelId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: updated.id, name: updated.name, description: updated.description,
    mockupUrl: updated.mockupUrl, availableColors: updated.availableColors,
    active: updated.active, price: updated.price,
  });
});

router.delete("/admin/models/:modelId", optionalAuth, requireAdmin, async (req: AuthenticatedRequest, res): Promise<void> => {
  const modelId = parseInt(Array.isArray(req.params.modelId) ? req.params.modelId[0] : req.params.modelId, 10);
  await db.delete(tshirtModelsTable).where(eq(tshirtModelsTable.id, modelId));
  res.sendStatus(204);
});

export default router;
