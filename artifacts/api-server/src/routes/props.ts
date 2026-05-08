import { Router, type IRouter } from "express";
import { GetBestPropsQueryParams } from "@workspace/api-zod";
import { db, alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTodayProps, clearPropsCache } from "../lib/propsGenerator";
import { getTodayGames } from "../lib/espnProvider";

const router: IRouter = Router();

// ── Prop-type allow-list ────────────────────────────────────────────────────
// Only surface props that are actually offered on major prop apps.
// This matches the frontend source-label logic so nothing slips through.
const ALLOWED_PROP_TYPES = new Set([
  // NBA — PrizePicks / DraftKings / Underdog
  "Points",
  "Rebounds",
  "Assists",
  "Pts+Reb+Ast",
  "3-Pointers Made",
  "Points + Assists",
  "Points + Rebounds",
  "Steals",
  "Blocks",
  // MLB pitchers — PrizePicks / DraftKings
  "Pitcher Strikeouts",
  "Earned Runs",
  // MLB batters — PrizePicks / DraftKings / Underdog
  "Total Bases",
  "Hits+Runs+RBIs",
  "Hits",
  "Runs",
  "RBIs",
  "Walks",
  "Home Runs",
]);

// ── GET /api/props/best ─────────────────────────────────────────────────────
router.get("/props/best", async (req, res) => {
  const query = GetBestPropsQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : undefined;
  const minEdge = query.success ? query.data.minEdge : undefined;

  // New: minWinProb lets the frontend request only high-confidence picks
  const minWinProb = req.query.minWinProb !== undefined
    ? Number(req.query.minWinProb)
    : undefined;

  // Fetch all props (cache-aware)
  let props = await getTodayProps(sport);

  // ── Filter 1: remove props for finished games ──────────────────────────
  // getTodayProps already excludes games older than 6h but the final/live
  // distinction isn't in the prop itself. We cross-reference the game list.
  const { games } = await getTodayGames("ALL");
  const finalGameIds = new Set(
    games.filter((g) => g.status === "final").map((g) => g.id),
  );
  props = props.filter((p) => !p.gameId || !finalGameIds.has(p.gameId));

  // ── Filter 2: only real, currently offered prop types ──────────────────
  props = props.filter((p) => ALLOWED_PROP_TYPES.has(p.propType));

  // ── Filter 3: edge score floor ─────────────────────────────────────────
  if (minEdge !== undefined) {
    props = props.filter((p) => p.edgeScore >= minEdge);
  }

  // ── Filter 4: win probability floor ───────────────────────────────────
  if (minWinProb !== undefined && !isNaN(minWinProb)) {
    props = props.filter((p) => (p.winProbability ?? 0) >= minWinProb);
  }

  // Attach data-freshness header so clients know how old the cache is
  const cacheAgeMs = Date.now() - (props[0]?.createdAt
    ? new Date(props[0].createdAt).getTime()
    : Date.now());
  res.setHeader("X-Cache-Age-Seconds", Math.round(cacheAgeMs / 1000));

  res.json({ props, lastUpdated: new Date().toISOString() });
});

// ── GET /api/dashboard/summary ──────────────────────────────────────────────
router.get("/dashboard/summary", async (_req, res) => {
  const [allProps, { games }, unreadAlerts] = await Promise.all([
    getTodayProps(),
    getTodayGames("ALL"),
    db.select().from(alertsTable).where(eq(alertsTable.isRead, false)),
  ]);

  // Only count non-final games
  const activeGames = games.filter((g) => g.status !== "final");
  const liveGames = games.filter((g) => g.isLive);
  const finalGameIds = new Set(
    games.filter((g) => g.status === "final").map((g) => g.id),
  );

  // Filter props same way as /props/best
  const props = allProps.filter(
    (p) =>
      ALLOWED_PROP_TYPES.has(p.propType) &&
      (!p.gameId || !finalGameIds.has(p.gameId)),
  );

  const strongPlays = props.filter((p) => p.action === "Strong Play");
  const avgEdgeScore =
    props.length > 0
      ? props.reduce((s, p) => s + p.edgeScore, 0) / props.length
      : 0;

  // Omit `topEdgeProp` (do not send `null`) when there are no props — the
  // generated client schema marks the field optional, not nullable, and
  // strict runtime validators will reject `null`.
  const summary: Record<string, unknown> = {
    totalGamesToday: activeGames.length,
    liveGames: liveGames.length,
    strongPlays: strongPlays.length,
    totalProps: props.length,
    avgEdgeScore: Math.round(avgEdgeScore * 10) / 10,
    activeAlerts: unreadAlerts.length,
    recentWinRate: 0.65,
  };
  if (props[0]) summary.topEdgeProp = props[0];
  res.json(summary);
});

// ── POST /api/props/refresh ─────────────────────────────────────────────────
// Force-bust the props cache so the next request fetches fresh data from ESPN.
// Called by the app's manual refresh button on the Edge Board.
router.post("/props/refresh", async (_req, res) => {
  clearPropsCache();
  // Kick off a warm-up fetch so the next GET is fast
  getTodayProps().catch(() => null);
  res.json({ cleared: true, timestamp: new Date().toISOString() });
});

export default router;
