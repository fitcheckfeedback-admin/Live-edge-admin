import { Router, type IRouter } from "express";
import { getLiveEdges } from "../lib/propsGenerator";

const router: IRouter = Router();

// ── GET /api/live-edge ──────────────────────────────────────────────────────
router.get("/live-edge", async (req, res) => {
  const sport =
    typeof req.query.sport === "string" && req.query.sport !== "ALL"
      ? req.query.sport
      : undefined;

  let edges = await getLiveEdges();

  // Filter by sport if requested
  if (sport) {
    edges = edges.filter((e) => e.sport === sport);
  }

  // Only surface actionable recommendations — drop "Avoid"
  // Users should only see live edges worth acting on
  edges = edges.filter((e) => e.liveRecommendation !== "Avoid");

  res.json({
    edges,
    lastUpdated: new Date().toISOString(),
    count: edges.length,
  });
});

export default router;
