import { Router, type IRouter } from "express";
import { getTrackRecord, gradePendingSnapshots } from "../lib/trackRecord";

const router: IRouter = Router();

router.get("/track-record", async (req, res) => {
  const w = String(req.query.window ?? "30d");
  const window = w === "7d" || w === "all" ? w : "30d";
  try {
    const data = await getTrackRecord(window);
    res.json(data);
  } catch (err) {
    req.log.error({ err: String(err) }, "track-record fetch failed");
    res.status(500).json({ error: "Failed to load track record" });
  }
});

router.post("/track-record/grade", async (req, res) => {
  try {
    const summary = await gradePendingSnapshots();
    const message =
      summary.graded === 0
        ? "Nothing new to grade — slates are still in progress or already graded."
        : `Graded ${summary.graded} pick${summary.graded === 1 ? "" : "s"}: ${summary.hits} hits, ${summary.misses} misses, ${summary.pushes} pushes, ${summary.dnp} DNP.`;
    res.json({ ...summary, message });
  } catch (err) {
    req.log.error({ err: String(err) }, "track-record grade failed");
    res.status(500).json({ error: "Grading failed" });
  }
});

export default router;
