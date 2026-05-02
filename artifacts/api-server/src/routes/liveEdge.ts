import { Router, type IRouter } from "express";
import { mockLiveEdges } from "../lib/mockData";
import type { LiveEdge } from "../lib/types";

const router: IRouter = Router();

function calcRecommendation(liveEdgePct: number): LiveEdge["liveRecommendation"] {
  if (liveEdgePct >= 15) return "Strong Live Over";
  if (liveEdgePct >= 5) return "Lean Live Over";
  if (liveEdgePct <= -15) return "Strong Live Under";
  if (liveEdgePct <= -5) return "Lean Live Under";
  return "Avoid";
}

router.get("/live-edge", (_req, res) => {
  const now = new Date().toISOString();
  const edges: LiveEdge[] = mockLiveEdges.map((e, i) => {
    const pct = e.percentComplete > 0
      ? ((e.projectedFinal - e.line) / e.line) * 100
      : e.liveEdgePercent;
    return {
      id: i + 1,
      updatedAt: now,
      ...e,
      liveEdgePercent: Math.round(pct * 10) / 10,
      liveRecommendation: calcRecommendation(pct),
    };
  });

  res.json({ edges, lastUpdated: now });
});

export default router;
