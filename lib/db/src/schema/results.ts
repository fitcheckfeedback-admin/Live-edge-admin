import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resultsTable = pgTable("results", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  sport: text("sport").notNull(),
  playerName: text("player_name").notNull(),
  teamAbbr: text("team_abbr").notNull(),
  opponentAbbr: text("opponent_abbr").notNull(),
  propType: text("prop_type").notNull(),
  line: real("line").notNull(),
  recommendation: text("recommendation").notNull(),
  edgeScore: real("edge_score").notNull(),
  status: text("status").notNull().default("Pending"),
  profitLoss: real("profit_loss"),
  closingLine: real("closing_line"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertResultSchema = createInsertSchema(resultsTable).omit({ id: true, createdAt: true });
export type InsertResult = z.infer<typeof insertResultSchema>;
export type ResultRow = typeof resultsTable.$inferSelect;
