import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  artworkId: integer("artwork_id").notNull(),
  modelId: integer("model_id").notNull(),
  color: text("color").notNull(),
  size: text("size").notNull(),
  stripeSessionId: text("stripe_session_id"),
  status: text("status").notNull().default("pending"),
  masterized: boolean("masterized").notNull().default(false),
  totalPrice: doublePrecision("total_price").notNull(),
  mockupPreview: text("mockup_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
