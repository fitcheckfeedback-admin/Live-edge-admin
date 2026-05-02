import { Router, type IRouter } from "express";
import { GetBestPropsQueryParams } from "@workspace/api-zod";
import { db, propsTable } from "@workspace/db";
import { desc, eq, gte, and, type SQL } from "drizzle-orm";
import type { PlayerProp } from "../lib/types";

const router: IRouter = Router();

function rowToProp(row: typeof propsTable.$inferSelect): PlayerProp {
  return {
    id: row.id,
    sport: row.sport,
    playerName: row.playerName,
    playerImage: row.playerImage ?? undefined,
    teamAbbr: row.teamAbbr,
    teamLogo: row.teamLogo ?? undefined,
    opponentAbbr: row.opponentAbbr,
    opponentLogo: row.opponentLogo ?? undefined,
    propType: row.propType,
    line: row.line,
    avg5: row.avg5,
    avg10: row.avg10,
    hitRate5: row.hitRate5,
    hitRate10: row.hitRate10,
    lineGap: row.lineGap,
    consistency: row.consistency,
    trend: row.trend as "up" | "down" | "flat",
    edgeScore: row.edgeScore,
    confidence: row.confidence as "High" | "Medium" | "Low",
    recommendation: row.recommendation as PlayerProp["recommendation"],
    action: row.action as PlayerProp["action"],
    reasoning: row.reasoning,
    redFlags: JSON.parse(row.redFlags ?? "[]"),
    riskWarning: row.riskWarning ?? "",
    gameId: row.gameId ?? undefined,
    createdAt: row.createdAt?.toISOString(),
  };
}

router.get("/props/best", async (req, res) => {
  const query = GetBestPropsQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : undefined;
  const minEdge = query.success ? query.data.minEdge : undefined;

  const conditions: SQL[] = [];
  if (sport && sport !== "ALL") conditions.push(eq(propsTable.sport, sport));
  if (minEdge !== undefined) conditions.push(gte(propsTable.edgeScore, minEdge));

  const rows = await db
    .select()
    .from(propsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(propsTable.edgeScore));

  res.json({ props: rows.map(rowToProp), lastUpdated: new Date().toISOString() });
});

router.get("/dashboard/summary", async (_req, res) => {
  const [props, allGames, alerts] = await Promise.all([
    db.select().from(propsTable).orderBy(desc(propsTable.edgeScore)),
    (async () => {
      const { getTodayGames } = await import("../lib/espnProvider");
      const { mockGames } = await import("../lib/mockData");
      const { games } = await getTodayGames("ALL");
      return games.length > 0 ? games : mockGames;
    })(),
    (async () => {
      const { alertsTable } = await import("@workspace/db");
      const { eq: eqFn } = await import("drizzle-orm");
      return db.select().from(alertsTable).where(eqFn(alertsTable.isRead, false));
    })(),
  ]);

  const liveGames = allGames.filter((g) => g.isLive);
  const strongPlays = props.filter((p) => p.action === "Strong Play");
  const avgEdgeScore = props.length > 0 ? props.reduce((s, p) => s + p.edgeScore, 0) / props.length : 0;
  const topEdgeProp = props[0] ? rowToProp(props[0]) : undefined;

  res.json({
    totalGamesToday: allGames.length,
    liveGames: liveGames.length,
    strongPlays: strongPlays.length,
    totalProps: props.length,
    avgEdgeScore: Math.round(avgEdgeScore * 10) / 10,
    activeAlerts: alerts.length,
    recentWinRate: 0.65,
    topEdgeProp,
  });
});

export default router;
