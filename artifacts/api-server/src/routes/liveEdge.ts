import { Router, type IRouter } from "express";
import { getLiveEdges } from "../lib/propsGenerator";

const router: IRouter = Router();

router.get("/live-edge", async (_req, res) => {
  const edges = await getLiveEdges();
  res.json({ edges, lastUpdated: new Date().toISOString() });
});

export default router;
