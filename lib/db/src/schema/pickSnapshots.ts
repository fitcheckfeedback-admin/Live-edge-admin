import { pgTable, serial, text, real, integer, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

// Daily snapshot of every recommended pick the model surfaced. Powers the
// self-grading Track Record + auto-tune of pickBestProp tier weights.
//
// One row per (date, player, propType, line, side). Inserted by snapshotter
// after each successful getTodayProps run; graded later by the grader job
// once the game is final and a gameLog entry exists for the player+date.
export const pickSnapshotsTable = pgTable(
  "pick_snapshots",
  {
    id: serial("id").primaryKey(),
    date: text("date").notNull(),                 // YYYY-MM-DD (ET sports day)
    sport: text("sport").notNull(),               // MLB | NBA
    playerId: text("player_id").notNull(),        // mlbId or ESPN athleteId, stringified
    playerName: text("player_name").notNull(),
    teamAbbr: text("team_abbr").notNull(),
    opponentAbbr: text("opponent_abbr").notNull(),
    propType: text("prop_type").notNull(),
    line: real("line").notNull(),
    side: text("side").notNull(),                 // "Over" | "Under"  (recommended side)
    winProbability: real("win_probability").notNull(),
    edgeScore: real("edge_score").notNull(),
    hitRate10: real("hit_rate10").notNull(),
    avg10: real("avg10").notNull(),
    isBestPick: boolean("is_best_pick").notNull().default(false),
    bestPickTier: integer("best_pick_tier"),      // 1-4 if isBestPick, else null
    gameId: text("game_id"),
    actualValue: real("actual_value"),            // null until graded
    result: text("result").notNull().default("PENDING"), // PENDING | HIT | MISS | PUSH | DNP
    gradedAt: timestamp("graded_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // Include gameId so MLB doubleheaders / split-DH games don't collapse into
    // one row. NULLs are distinct in PostgreSQL unique indexes by default —
    // gameId is always populated by buildPropFromRealData in practice.
    uniq: uniqueIndex("pick_snapshots_uniq")
      .on(t.date, t.playerId, t.propType, t.line, t.side, t.gameId),
    byDate: index("pick_snapshots_date_idx").on(t.date),
    byResult: index("pick_snapshots_result_idx").on(t.result),
  }),
);

export type PickSnapshotRow = typeof pickSnapshotsTable.$inferSelect;
export type InsertPickSnapshot = typeof pickSnapshotsTable.$inferInsert;
