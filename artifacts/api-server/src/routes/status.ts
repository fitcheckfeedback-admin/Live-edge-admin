import { Router, type IRouter } from "express";
import { db, propsTable, alertsTable, resultsTable } from "@workspace/db";
import { mockProviders, mockProps, mockAlerts, mockResults } from "../lib/mockData";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/api-status", (_req, res) => {
  const mockMode = !process.env["ODDS_API_KEY"];
  res.json({ providers: mockProviders, mockMode });
});

router.post("/refresh", async (_req, res) => {
  try {
    const { getTodayGames } = await import("../lib/espnProvider");
    await getTodayGames("ALL");
    res.json({ success: true, message: "Data refreshed successfully. ESPN scoreboard updated." });
  } catch {
    res.json({ success: false, message: "Refresh failed — running on mock data." });
  }
});

async function seedIfEmpty() {
  const existing = await db.select().from(propsTable).limit(1);
  if (existing.length > 0) return;

  for (const prop of mockProps) {
    await db.insert(propsTable).values({
      ...prop,
      redFlags: JSON.stringify(prop.redFlags),
      riskWarning: prop.riskWarning,
    });
  }

  for (const alert of mockAlerts) {
    await db.insert(alertsTable).values(alert);
  }

  for (const result of mockResults) {
    await db.insert(resultsTable).values(result);
  }
}

export { seedIfEmpty };
export default router;
