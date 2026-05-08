import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestSessionsTable = pgTable("guest_sessions", {
  sessionId: text("session_id").primaryKey(),
  tokenBalance: integer("token_balance").notNull().default(3),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGuestSessionSchema = createInsertSchema(guestSessionsTable).omit({ createdAt: true });
export type InsertGuestSession = z.infer<typeof insertGuestSessionSchema>;
export type GuestSession = typeof guestSessionsTable.$inferSelect;
