import { Router, type IRouter } from "express";
import { GetScheduleTodayQueryParams } from "@workspace/api-zod";
import { getTodayGames } from "../lib/espnProvider";
import { mockGames } from "../lib/mockData";

const router: IRouter = Router();

router.get("/schedule/today", async (req, res) => {
  const query = GetScheduleTodayQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : "ALL";

  const { games, source } = await getTodayGames(sport);

  let filtered = games.length > 0 ? games : mockGames;
  if (sport && sport !== "ALL") {
    filtered = filtered.filter((g) => g.sport === sport);
  }

  res.json({ games: filtered, lastUpdated: new Date().toISOString(), source });
});

export default router;
