import { Router, type IRouter } from "express";
import { GetAlertsQueryParams, MarkAlertReadParams } from "@workspace/api-zod";
import { db, alertsTable } from "@workspace/db";
import { eq, desc, lt } from "drizzle-orm";
import { getActiveLeagues, getTodayGames } from "../lib/espnProvider";
import { getTodayProps } from "../lib/propsGenerator";

const router: IRouter = Router();

// ── Prop-type allow-list (mirrors props route) ──────────────────────────────
const ALLOWED_PROP_TYPES = new Set([
  "Points", "Rebounds", "Assists", "Pts+Reb+Ast", "3-Pointers Made",
  "Points + Assists", "Points + Rebounds", "Steals", "Blocks",
  "Pitcher Strikeouts", "Earned Runs",
  "Total Bases", "Hits+Runs+RBIs", "Hits", "Runs", "RBIs", "Walks", "Home Runs",
]);

// ── How old an alert can be before it's hidden (8 hours) ───────────────────
const ALERT_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// ── GET /api/alerts ─────────────────────────────────────────────────────────
router.get("/alerts", async (req, res) => {
  const query = GetAlertsQueryParams.safeParse(req.query);
  const unreadOnly = query.success ? query.data.unreadOnly : false;

  // 1. Pull DB alerts, filter by active sport and recency
  const activeLeagues = new Set(getActiveLeagues());
  const cutoff = new Date(Date.now() - ALERT_MAX_AGE_MS);

  let rows = await db
    .select()
    .from(alertsTable)
    .orderBy(desc(alertsTable.createdAt));

  rows = rows.filter((a) => {
    if (a.sport && !activeLeagues.has(a.sport)) return false;
    // Hide alerts older than ALERT_MAX_AGE_MS
    if (a.createdAt && a.createdAt < cutoff) return false;
    return true;
  });

  if (unreadOnly) rows = rows.filter((a) => !a.isRead);

  // 2. Pull today's live game info to enrich alerts with game context
  const { games } = await getTodayGames("ALL");
  const liveMap = new Map(games.map((g) => [g.id, g]));
  const finalGameIds = new Set(
    games.filter((g) => g.status === "final").map((g) => g.id),
  );

  // 3. Pull live props to synthesize "prop alerts" for the frontend
  //    These are NOT DB rows — they're generated fresh from the prop engine.
  //    The frontend can display them alongside DB alerts.
  const allProps = await getTodayProps();
  const propAlerts = allProps
    .filter((p) => {
      // Only allowed prop types
      if (!ALLOWED_PROP_TYPES.has(p.propType)) return false;
      // Skip finished games
      if (p.gameId && finalGameIds.has(p.gameId)) return false;
      // Only bestPick, high confidence
      if (!p.bestPick) return false;
      if ((p.winProbability ?? 0) < 60) return false;
      return true;
    })
    .map((p) => {
      const game = p.gameId ? liveMap.get(p.gameId) : undefined;
      const isOver = String(p.recommendation).includes("Over");
      const severity: "high" | "medium" | "low" =
        (p.winProbability ?? 0) >= 75
          ? "high"
          : (p.winProbability ?? 0) >= 65
          ? "medium"
          : "low";

      return {
        // Use negative IDs so frontend can distinguish from DB alerts
        id: -(p.id),
        type: "prop_edge" as const,
        title: `${p.playerName} — ${p.propType} ${isOver ? "OVER" : "UNDER"} ${p.line}`,
        message: p.reasoning,
        sport: p.sport,
        playerName: p.playerName,
        playerImage: p.playerImage,
        teamAbbr: p.teamAbbr,
        opponentAbbr: p.opponentAbbr,
        propType: p.propType,
        line: p.line,
        recommendation: p.recommendation,
        winProbability: p.winProbability,
        edgeScore: p.edgeScore,
        trend: p.trend,
        action: p.action,
        avg5: p.avg5,
        avg10: p.avg10,
        hitRate5: p.hitRate5,
        factors: p.factors,
        recentGames: p.recentGames,
        gameId: p.gameId,
        gameLabel: p.gameLabel,
        gameStartTime: p.gameStartTime,
        // Live game context
        gamePeriod: game?.period,
        gameClock: game?.clock,
        gameIsLive: game?.isLive ?? false,
        gameStatus: game?.status ?? "scheduled",
        awayTeam: game?.awayTeam,
        homeTeam: game?.homeTeam,
        awayScore: game?.awayScore,
        homeScore: game?.homeScore,
        isRead: false,
        createdAt: p.createdAt ?? new Date().toISOString(),
        severity,
      };
    });

  // 4. Map DB alerts
  const dbAlerts = rows.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    message: a.message,
    sport: a.sport ?? undefined,
    playerName: a.playerName ?? undefined,
    edgeScore: a.edgeScore ?? undefined,
    isRead: a.isRead,
    createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
    severity: (a.severity ?? "medium") as "high" | "medium" | "low",
  }));

  const unreadCount = rows.filter((a) => !a.isRead).length + propAlerts.length;

  res.json({
    alerts: dbAlerts,
    propAlerts,  // ← new: rich prop-level alerts with full game context
    unreadCount,
    lastUpdated: new Date().toISOString(),
  });
});

// ── POST /api/alerts/:id/read ───────────────────────────────────────────────
router.post("/alerts/:id/read", async (req, res) => {
  const params = MarkAlertReadParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }

  // Negative IDs are synthetic prop alerts — nothing to update in DB.
  // Return a full Alert-shaped payload so generated client validators don't reject it.
  if (params.data.id < 0) {
    res.json({
      id: params.data.id,
      type: "prop",
      title: "",
      message: "",
      sport: undefined,
      playerName: undefined,
      edgeScore: undefined,
      isRead: true,
      createdAt: new Date().toISOString(),
      severity: "medium" as const,
    });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json({
    id: updated.id,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    sport: updated.sport ?? undefined,
    playerName: updated.playerName ?? undefined,
    edgeScore: updated.edgeScore ?? undefined,
    isRead: updated.isRead,
    createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
    severity: (updated.severity ?? "medium") as "high" | "medium" | "low",
  });
});

// ── DELETE /api/alerts/stale ────────────────────────────────────────────────
// Housekeeping: remove alerts older than 24h.
// Gated behind an internal token so it can't be triggered by anonymous clients
// (the same cleanup also runs as an in-process cron in app.ts).
router.delete("/alerts/stale", async (req, res) => {
  const required = process.env.ADMIN_TOKEN || process.env.SESSION_SECRET;
  const provided = req.header("x-admin-token");
  if (!required || provided !== required) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(alertsTable).where(lt(alertsTable.createdAt, cutoff));
  res.json({ deleted: true, cutoff: cutoff.toISOString() });
});

export default router;
