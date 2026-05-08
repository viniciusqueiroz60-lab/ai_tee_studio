import { Router, type IRouter } from "express";
import { db, stylesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/styles", optionalAuth, async (_req, res): Promise<void> => {
  const styles = await db
    .select()
    .from(stylesTable)
    .where(eq(stylesTable.active, true))
    .orderBy(asc(stylesTable.sortOrder));

  res.json(styles.map((s) => ({
    id: s.id,
    slug: s.slug,
    label: s.label,
    description: s.description,
    icon: s.icon,
    promptParams: s.promptParams,
    active: s.active,
    sortOrder: s.sortOrder,
  })));
});

export default router;
