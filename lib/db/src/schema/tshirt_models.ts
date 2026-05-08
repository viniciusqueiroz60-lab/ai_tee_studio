import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tshirtModelsTable = pgTable("tshirt_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mockupUrl: text("mockup_url"),
  availableColors: text("available_colors").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  price: doublePrecision("price").notNull().default(49.90),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTshirtModelSchema = createInsertSchema(tshirtModelsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTshirtModel = z.infer<typeof insertTshirtModelSchema>;
export type TshirtModel = typeof tshirtModelsTable.$inferSelect;
