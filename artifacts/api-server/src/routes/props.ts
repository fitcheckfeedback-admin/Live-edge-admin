import { Router, type IRouter } from "express";
import { GetBestPropsQueryParams } from "@workspace/api-zod";
import { db, alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getTodayProps } from "../lib/propsGenerator";
import { getTodayGames } from "../lib/espnProvider";

const router: IRouter = Router();

router.get("/props/best", async (req, res) => {
  const query = GetBestPropsQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : undefined;
  const minEdge = query.success ? query.data.minEdge : undefined;

  let props = await getTodayProps(sport);
  if (minEdge !== undefined) props = props.filter((p) => p.edgeScore >= minEdge);

  res.json({ props, lastUpdated: new Date().toISOString() });
});

router.get("/dashboard/summary", async (_req, res) => {
  const [props, games, unreadAlerts] = await Promise.all([
    getTodayProps(),
    getTodayGames("ALL").then((r) => r.games),
    db.select().from(alertsTable).where(eq(alertsTable.isRead, false)),
  ]);

  const liveGames = games.filter((g) => g.isLive);
  const strongPlays = props.filter((p) => p.action === "Strong Play");
  const avgEdgeScore = props.length > 0 ? props.reduce((s, p) => s + p.edgeScore, 0) / props.length : 0;

  res.json({
    totalGamesToday: games.length,
    liveGames: liveGames.length,
    strongPlays: strongPlays.length,
    totalProps: props.length,
    avgEdgeScore: Math.round(avgEdgeScore * 10) / 10,
    activeAlerts: unreadAlerts.length,
    recentWinRate: 0.65,
    topEdgeProp: props[0],
  });
});

export default router;
