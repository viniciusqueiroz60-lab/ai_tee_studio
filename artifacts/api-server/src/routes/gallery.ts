import { Router, type IRouter } from "express";
import { db, artworksTable, usersTable, stylesTable } from "@workspace/db";
import { eq, desc, and, asc, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/gallery", async (req, res): Promise<void> => {
  const { style, sort = "recent", page = "1", limit = "20" } = req.query as {
    style?: string; sort?: string; page?: string; limit?: string;
  };

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    eq(artworksTable.isShared, true),
    eq(artworksTable.moderationStatus, "approved"),
  ] as ReturnType<typeof eq>[];

  if (style && style !== "all") {
    conditions.push(eq(artworksTable.styleSlug, style));
  }

  const whereClause = and(...conditions);

  const orderBy = sort === "popular"
    ? desc(artworksTable.likes)
    : desc(artworksTable.createdAt);

  const artworks = await db
    .select()
    .from(artworksTable)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limitNum)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(artworksTable)
    .where(whereClause);

  const userIds = artworks.map((a) => a.userId).filter((id): id is number => id != null);
  const users = userIds.length > 0
    ? await db.select({ id: usersTable.id, displayName: usersTable.displayName, email: usersTable.email }).from(usersTable)
    : [];

  const userMap = new Map(users.map((u) => [u.id, u.displayName ?? u.email ?? null]));

  res.json({
    artworks: artworks.map((a) => ({
      id: a.id,
      userId: a.userId,
      prompt: a.prompt,
      styleSlug: a.styleSlug,
      styleLabel: a.styleLabel,
      imageUrl: a.imageUrl,
      isShared: a.isShared,
      moderationStatus: a.moderationStatus,
      likes: a.likes,
      views: a.views,
      upscaled: a.upscaled,
      authorName: a.userId != null ? (userMap.get(a.userId) ?? null) : null,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
    page: pageNum,
    hasMore: offset + artworks.length < total,
  });
});

// /gallery/styles — per-style public artwork counts
router.get("/gallery/styles", async (_req, res): Promise<void> => {
  const styles = await db
    .select()
    .from(stylesTable)
    .where(eq(stylesTable.active, true))
    .orderBy(asc(stylesTable.sortOrder));

  const stats = await Promise.all(
    styles.map(async (style) => {
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(artworksTable)
        .where(
          and(
            eq(artworksTable.styleSlug, style.slug),
            eq(artworksTable.isShared, true),
            eq(artworksTable.moderationStatus, "approved")
          )
        );
      return {
        styleSlug: style.slug,
        styleLabel: style.label,
        icon: style.icon,
        count: cnt,
      };
    })
  );

  res.json(stats);
});

// /gallery/stats — backward-compat alias for /gallery/styles
router.get("/gallery/stats", async (_req, res): Promise<void> => {
  res.redirect(307, "/api/gallery/styles");
});

export default router;
