import { Router, type IRouter } from "express";
import { getTodayGames } from "../lib/espnProvider";

const router: IRouter = Router();

router.get("/scores/live", async (_req, res) => {
  const { games } = await getTodayGames("ALL");
  const live = games.filter((g) => g.isLive || g.status === "live");
  res.json({ games: live, lastUpdated: new Date().toISOString() });
});

export default router;
