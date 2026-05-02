import { pgTable, serial, text, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  sport: text("sport"),
  playerName: text("player_name"),
  edgeScore: real("edge_score"),
  isRead: boolean("is_read").notNull().default(false),
  severity: text("severity").notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, createdAt: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type AlertRow = typeof alertsTable.$inferSelect;
