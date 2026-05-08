import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stylesTable = pgTable("styles", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  icon: text("icon"),
  promptParams: text("prompt_params").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStyleSchema = createInsertSchema(stylesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStyle = z.infer<typeof insertStyleSchema>;
export type Style = typeof stylesTable.$inferSelect;
