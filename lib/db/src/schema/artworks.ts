import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const artworksTable = pgTable("artworks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  guestSessionId: text("guest_session_id"),
  prompt: text("prompt").notNull(),
  enrichedPrompt: text("enriched_prompt"),
  styleSlug: text("style_slug"),
  styleLabel: text("style_label"),
  imageUrl: text("image_url").notNull(),
  isShared: boolean("is_shared").notNull().default(false),
  moderationStatus: text("moderation_status").default("pending"),
  likes: integer("likes").notNull().default(0),
  views: integer("views").notNull().default(0),
  upscaled: boolean("upscaled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertArtworkSchema = createInsertSchema(artworksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworksTable.$inferSelect;
