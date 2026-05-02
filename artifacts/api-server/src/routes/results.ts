import { Router, type IRouter } from "express";
import { GetResultsQueryParams, UpdateResultParams, UpdateResultBody } from "@workspace/api-zod";
import { db, resultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function calcSummary(rows: typeof resultsTable.$inferSelect[]) {
  const settled = rows.filter((r) => r.status !== "Pending" && r.status !== "DNP" && r.status !== "Line Removed");
  const wins = settled.filter((r) => r.status === "Win").length;
  const losses = settled.filter((r) => r.status === "Loss").length;
  const pushes = settled.filter((r) => r.status === "Push").length;
  const totalPL = settled.reduce((s, r) => s + (r.profitLoss ?? 0), 0);
  const total = wins + losses + pushes;
  const winRate = total > 0 ? wins / total : 0;
  const roi = total > 0 ? (totalPL / total) * 100 : 0;
  return {
    total: rows.length,
    wins,
    losses,
    pushes,
    winRate: Math.round(winRate * 1000) / 10,
    totalProfitLoss: Math.round(totalPL * 100) / 100,
    roi: Math.round(roi * 10) / 10,
  };
}

router.get("/results", async (req, res) => {
  const query = GetResultsQueryParams.safeParse(req.query);
  const sport = query.success ? query.data.sport : undefined;
  const status = query.success ? query.data.status : undefined;

  let rows = await db.select().from(resultsTable).orderBy(desc(resultsTable.createdAt));
  if (sport) rows = rows.filter((r) => r.sport === sport);
  if (status) rows = rows.filter((r) => r.status === status);

  const summary = calcSummary(rows);
  const results = rows.map((r) => ({
    id: r.id,
    date: r.date,
    sport: r.sport,
    playerName: r.playerName,
    teamAbbr: r.teamAbbr,
    opponentAbbr: r.opponentAbbr,
    propType: r.propType,
    line: r.line,
    recommendation: r.recommendation,
    edgeScore: r.edgeScore,
    status: r.status as "Pending" | "Win" | "Loss" | "Push" | "DNP" | "Line Removed",
    profitLoss: r.profitLoss ?? undefined,
    closingLine: r.closingLine ?? undefined,
    createdAt: r.createdAt?.toISOString(),
  }));

  res.json({ results, summary });
});

router.patch("/results/:id", async (req, res) => {
  const params = UpdateResultParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid result id" });
    return;
  }

  const body = UpdateResultBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body", details: body.error });
    return;
  }

  const [updated] = await db
    .update(resultsTable)
    .set({
      status: body.data.status,
      profitLoss: body.data.profitLoss,
      closingLine: body.data.closingLine,
    })
    .where(eq(resultsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Result not found" });
    return;
  }

  res.json({
    id: updated.id,
    date: updated.date,
    sport: updated.sport,
    playerName: updated.playerName,
    teamAbbr: updated.teamAbbr,
    opponentAbbr: updated.opponentAbbr,
    propType: updated.propType,
    line: updated.line,
    recommendation: updated.recommendation,
    edgeScore: updated.edgeScore,
    status: updated.status as "Pending" | "Win" | "Loss" | "Push" | "DNP" | "Line Removed",
    profitLoss: updated.profitLoss ?? undefined,
    closingLine: updated.closingLine ?? undefined,
    createdAt: updated.createdAt?.toISOString(),
  });
});

router.get("/export/csv", async (_req, res) => {
  const rows = await db.select().from(resultsTable).orderBy(desc(resultsTable.createdAt));
  const headers = ["Date", "Sport", "Player", "Team", "Opponent", "Prop Type", "Line", "Recommendation", "Edge Score", "Status", "P/L", "Closing Line"];
  const csvRows = rows.map((r) => [
    r.date, r.sport, r.playerName, r.teamAbbr, r.opponentAbbr, r.propType,
    r.line, r.recommendation, r.edgeScore, r.status,
    r.profitLoss ?? "", r.closingLine ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...csvRows].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="live-edge-results-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

export default router;
