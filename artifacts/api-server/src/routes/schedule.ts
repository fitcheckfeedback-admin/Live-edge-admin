import { Router, type IRouter } from "express";
import { GetScheduleTodayQueryParams } from "@workspace/api-zod";
import { getTodayGames } from "../lib/espnProvider";

const router: IRouter = Router();

router.get("/schedule/today", async (req, res) => {
  const query = GetScheduleTodayQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : "ALL";

  const { games, source } = await getTodayGames(sport);
  const filtered = sport && sport !== "ALL" ? games.filter((g) => g.sport === sport) : games;

  res.json({ games: filtered, lastUpdated: new Date().toISOString(), source });
});

export default router;
