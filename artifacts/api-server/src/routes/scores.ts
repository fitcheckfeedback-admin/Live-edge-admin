import { Router, type IRouter } from "express";
import { getTodayGames } from "../lib/espnProvider";
import { mockGames } from "../lib/mockData";

const router: IRouter = Router();

router.get("/scores/live", async (_req, res) => {
  const { games, source } = await getTodayGames("ALL");

  const allGames = games.length > 0 ? games : mockGames;
  const liveGames = allGames.filter((g) => g.isLive);

  res.json({ games: liveGames, lastUpdated: new Date().toISOString(), source });
});

export default router;
