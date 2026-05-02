import { Router, type IRouter } from "express";
import { db, alertsTable, resultsTable } from "@workspace/db";
import { mockProviders, mockResults } from "../lib/mockData";
import { getTodayProps } from "../lib/propsGenerator";

const router: IRouter = Router();

router.get("/api-status", (_req, res) => {
  const mockMode = !process.env["ODDS_API_KEY"];
  res.json({ providers: mockProviders, mockMode });
});

router.post("/refresh", async (_req, res) => {
  try {
    const { clearPropsCache } = await import("../lib/propsGenerator");
    clearPropsCache();
    const { getTodayGames, getActiveLeagues } = await import("../lib/espnProvider");
    const { games, source, error } = await getTodayGames("ALL");
    const props = await getTodayProps();
    await syncAlerts();

    // Honesty: distinguish off-season silence from upstream failure
    const activeLeagues = getActiveLeagues();
    if (source === "error") {
      res.status(502).json({
        success: false,
        message: `Refresh failed — ESPN unreachable for active leagues (${activeLeagues.join(", ")}). ${error ?? ""}`.trim(),
      });
    } else if (source === "off-season") {
      res.json({
        success: true,
        message: `No active leagues this month. Refreshed 0 games, 0 props.`,
      });
    } else if (games.length === 0) {
      res.json({
        success: true,
        message: `Refreshed. ESPN returned 0 games for active leagues (${activeLeagues.join(", ")}) — likely a quiet day.`,
      });
    } else {
      res.json({
        success: true,
        message:
          `Refreshed. ${games.length} games, ${props.length} props, ${games.filter((g) => g.isLive).length} live.` +
          (error ? ` (Partial: ${error})` : ""),
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: `Refresh failed: ${String(err)}` });
  }
});

// Build alerts from current props — only Strong Plays and Trap Lines surface
async function syncAlerts() {
  const props = await getTodayProps();
  const existing = await db.select().from(alertsTable);
  const existingKeys = new Set(existing.map((a) => `${a.type}:${a.playerName}:${a.edgeScore}`));

  const newAlerts: typeof alertsTable.$inferInsert[] = [];
  for (const p of props) {
    if (p.action === "Strong Play") {
      const key = `strong_pregame:${p.playerName}:${p.edgeScore}`;
      if (existingKeys.has(key)) continue;
      newAlerts.push({
        type: "strong_pregame",
        title: "Strong Edge Alert",
        message: `${p.playerName} ${p.propType} ${p.recommendation.includes("Over") ? "OVER" : "UNDER"} ${p.line} — ${p.winProbability}% win probability. ${p.teamAbbr} vs ${p.opponentAbbr}.`,
        sport: p.sport,
        playerName: p.playerName,
        edgeScore: p.edgeScore,
        isRead: false,
        severity: "high",
      });
    } else if (p.action === "Trap Line") {
      const key = `trap_line:${p.playerName}:${p.edgeScore}`;
      if (existingKeys.has(key)) continue;
      newAlerts.push({
        type: "trap_line",
        title: "Trap Line Warning",
        message: `${p.playerName} ${p.propType} line at ${p.line} appears inflated. Avoid or fade.`,
        sport: p.sport,
        playerName: p.playerName,
        edgeScore: p.edgeScore,
        isRead: false,
        severity: "medium",
      });
    }
  }

  if (newAlerts.length > 0) {
    await db.insert(alertsTable).values(newAlerts);
  }
}

async function seedIfEmpty() {
  // Only seed historical results to demo the tracker
  const existingResults = await db.select().from(resultsTable).limit(1);
  if (existingResults.length === 0) {
    for (const r of mockResults) {
      await db.insert(resultsTable).values(r);
    }
  }

  // Generate alerts on startup based on real props (best effort)
  try {
    await syncAlerts();
  } catch {
    // Non-fatal — alerts will populate on next refresh
  }
}

export { seedIfEmpty, syncAlerts };
export default router;
