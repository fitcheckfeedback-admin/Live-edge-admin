import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propsTable = pgTable("props", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  playerName: text("player_name").notNull(),
  playerImage: text("player_image"),
  teamAbbr: text("team_abbr").notNull(),
  teamLogo: text("team_logo"),
  opponentAbbr: text("opponent_abbr").notNull(),
  opponentLogo: text("opponent_logo"),
  propType: text("prop_type").notNull(),
  line: real("line").notNull(),
  avg5: real("avg5").notNull(),
  avg10: real("avg10").notNull(),
  hitRate5: real("hit_rate5").notNull(),
  hitRate10: real("hit_rate10").notNull(),
  lineGap: real("line_gap").notNull(),
  consistency: real("consistency").notNull(),
  trend: text("trend").notNull(),
  edgeScore: real("edge_score").notNull(),
  confidence: text("confidence").notNull(),
  recommendation: text("recommendation").notNull(),
  action: text("action").notNull(),
  reasoning: text("reasoning").notNull(),
  redFlags: text("red_flags").notNull().default("[]"),
  riskWarning: text("risk_warning").notNull().default(""),
  gameId: text("game_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPropSchema = createInsertSchema(propsTable).omit({ id: true, createdAt: true });
export type InsertProp = z.infer<typeof insertPropSchema>;
export type PropRow = typeof propsTable.$inferSelect;
