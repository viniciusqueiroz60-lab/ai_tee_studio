import { Router, type IRouter } from "express";
import { db, tshirtModelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/models", async (_req, res): Promise<void> => {
  const models = await db
    .select()
    .from(tshirtModelsTable)
    .where(eq(tshirtModelsTable.active, true));

  res.json(models.map((m: typeof models[number]) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    mockupUrl: m.mockupUrl,
    availableColors: m.availableColors,
    active: m.active,
    price: m.price,
  })));
});

export default router;
