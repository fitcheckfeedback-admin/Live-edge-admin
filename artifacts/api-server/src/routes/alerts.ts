import { Router, type IRouter } from "express";
import { GetAlertsQueryParams, MarkAlertReadParams } from "@workspace/api-zod";
import { db, alertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/alerts", async (req, res) => {
  const query = GetAlertsQueryParams.safeParse(req.query);
  const unreadOnly = query.success ? query.data.unreadOnly : false;

  let rows = await db.select().from(alertsTable).orderBy(desc(alertsTable.createdAt));
  if (unreadOnly) rows = rows.filter((a) => !a.isRead);

  const unreadCount = rows.filter((a) => !a.isRead).length;

  const alerts = rows.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    message: a.message,
    sport: a.sport ?? undefined,
    playerName: a.playerName ?? undefined,
    edgeScore: a.edgeScore ?? undefined,
    isRead: a.isRead,
    createdAt: a.createdAt?.toISOString() ?? new Date().toISOString(),
    severity: (a.severity ?? "medium") as "high" | "medium" | "low",
  }));

  res.json({ alerts, unreadCount });
});

router.post("/alerts/:id/read", async (req, res) => {
  const params = MarkAlertReadParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }

  const [updated] = await db
    .update(alertsTable)
    .set({ isRead: true })
    .where(eq(alertsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }

  res.json({
    id: updated.id,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    sport: updated.sport ?? undefined,
    playerName: updated.playerName ?? undefined,
    edgeScore: updated.edgeScore ?? undefined,
    isRead: updated.isRead,
    createdAt: updated.createdAt?.toISOString() ?? new Date().toISOString(),
    severity: (updated.severity ?? "medium") as "high" | "medium" | "low",
  });
});

export default router;
