import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const artworkLikesTable = pgTable("artwork_likes", {
  userId: integer("user_id").notNull(),
  artworkId: integer("artwork_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.artworkId] }),
]);
