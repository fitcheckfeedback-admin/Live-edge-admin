import { db, pickSnapshotsTable, type PickSnapshotRow } from "@workspace/db";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { logger } from "./logger";
import type { PlayerProp } from "./types";
import {
  getMlbHittingGameLog,
  getMlbPitchingGameLog,
  extractHittingValue,
  extractPitchingValue,
  type MlbBatterPropKey,
  type MlbPitcherPropKey,
} from "./mlbStatsProvider";
import {
  getNbaPlayerGameLog,
  extractNbaValue,
  type NbaPropKey,
  type NbaGameStat,
} from "./nbaStatsProvider";
import { mlbTeamByAbbr } from "./stadiums";

// How many ET days a snapshot must wait without a matching gameLog entry
// before we conclude the player did not play (DNP). Until then we keep the
// row PENDING so a late west-coast game that finishes after midnight ET still
// has a chance to be graded on the next hourly run.
const DNP_GRACE_DAYS = 2;

// ─── ET sports day helpers ───────────────────────────────────────────────────
// Snapshots are bucketed by the ET calendar date the slate belongs to so a
// late west-coast game starting at 1 AM UTC still falls under the right "day".
export function etDate(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}

function daysAgoEt(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return etDate(d);
}

// Whole ET-day distance between two YYYY-MM-DD strings. Positive when
// `dateStr` is in the past relative to `nowDateStr` (today's ET date).
function etDaysSince(dateStr: string, nowDateStr: string = etDate()): number {
  const a = Date.parse(dateStr + "T00:00:00Z");
  const b = Date.parse(nowDateStr + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

// ─── Tier classification (mirrors pickBestProp tier order) ──────────────────
// 1 balanced + volume, 2 balanced, 3 volume, 4 fallback
export function classifyTier(p: { hitRate10: number; line: number }): 1 | 2 | 3 | 4 {
  const balanced = p.hitRate10 >= 0.3 && p.hitRate10 <= 0.7;
  const volume = p.line >= 1;
  if (balanced && volume) return 1;
  if (balanced) return 2;
  if (volume) return 3;
  return 4;
}

function sideFromRecommendation(rec: string): "Over" | "Under" | null {
  if (rec.includes("Over")) return "Over";
  if (rec.includes("Under")) return "Under";
  return null;
}

// ─── Snapshot capture ───────────────────────────────────────────────────────
// Writes one row per recommended pick (one side per prop card the player has).
// Idempotent: ON CONFLICT (date, player_id, prop_type, line, side) DO NOTHING.
export async function snapshotProps(props: PlayerProp[]): Promise<{ inserted: number }> {
  if (!props.length) return { inserted: 0 };
  const date = etDate();
  const rows = props
    .map((p) => {
      const side = sideFromRecommendation(p.recommendation);
      if (!side) return null;
      return {
        date,
        sport: p.sport,
        playerId: p.playerId,
        playerName: p.playerName,
        teamAbbr: p.teamAbbr,
        opponentAbbr: p.opponentAbbr,
        propType: p.propType,
        line: p.line,
        side,
        winProbability: p.winProbability,
        edgeScore: p.edgeScore,
        hitRate10: p.hitRate10,
        avg10: p.avg10,
        isBestPick: !!p.bestPick,
        bestPickTier: p.bestPick ? classifyTier(p) : null,
        gameId: p.gameId ?? null,
        result: "PENDING" as const,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (!rows.length) return { inserted: 0 };

  try {
    const result = await db
      .insert(pickSnapshotsTable)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: pickSnapshotsTable.id });
    return { inserted: result.length };
  } catch (err) {
    logger.warn({ err: String(err) }, "snapshotProps insert failed");
    return { inserted: 0 };
  }
}

// ─── Grading ────────────────────────────────────────────────────────────────
type GradeOutcome = { result: "HIT" | "MISS" | "PUSH" | "DNP" | "PENDING"; actualValue: number | null };

const MLB_HITTER_PROPS: ReadonlySet<string> = new Set<MlbBatterPropKey>([
  "Home Runs", "Total Bases", "Hits+Runs+RBIs", "Hits", "Runs", "RBIs",
  "Walks", "Stolen Bases", "Hitter Strikeouts", "Singles", "Doubles",
]);
const MLB_PITCHER_PROPS: ReadonlySet<string> = new Set<MlbPitcherPropKey>(["Pitcher Strikeouts"]);
const NBA_PROPS: ReadonlySet<string> = new Set<NbaPropKey>([
  "Points", "Rebounds", "Assists", "3-Pointers Made", "Steals", "Blocks",
  "Points + Assists", "Points + Rebounds", "Pts+Reb+Ast",
]);

function comparedSide(side: string, value: number, line: number): "HIT" | "MISS" | "PUSH" {
  if (value === line) return "PUSH";
  if (side === "Over") return value > line ? "HIT" : "MISS";
  return value < line ? "HIT" : "MISS";
}

// Pick the right log entry for this snapshot. We require an EXACT date match
// against the slate date (no ±1 day fuzziness — that produced systematic
// wrong-day mis-grading for players whose log already had today's game). When
// multiple entries share the date (doubleheaders), disambiguate by opponent.
function pickMlbEntry<S>(
  log: { date: string; opponentId: number }[],
  snap: PickSnapshotRow,
): number {
  const sameDay = log
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.date === snap.date);
  if (sameDay.length === 0) return -1;
  if (sameDay.length === 1) return sameDay[0]!.i;
  const oppMeta = mlbTeamByAbbr(snap.opponentAbbr);
  if (oppMeta) {
    const match = sameDay.find(({ g }) => g.opponentId === oppMeta.mlbId);
    if (match) return match.i;
  }
  return sameDay[0]!.i; // fallback — single-team-vs-single-team within a day
}

function pickNbaEntry(log: NbaGameStat[], snap: PickSnapshotRow): number {
  const sameDay = log
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => (g.date || "").slice(0, 10) === snap.date);
  if (sameDay.length === 0) return -1;
  if (sameDay.length === 1) return sameDay[0]!.i;
  const match = sameDay.find(
    ({ g }) => (g.opponentAbbr || "").toUpperCase() === snap.opponentAbbr.toUpperCase(),
  );
  return match ? match.i : sameDay[0]!.i;
}

// missing(): used when no matching entry was found. Defer the DNP verdict
// until the slate is at least DNP_GRACE_DAYS old so late-finishing games and
// next-day stat ingestion delays don't corrupt the record.
function missing(snap: PickSnapshotRow): GradeOutcome {
  const ageDays = etDaysSince(snap.date);
  return ageDays >= DNP_GRACE_DAYS
    ? { result: "DNP", actualValue: null }
    : { result: "PENDING", actualValue: null };
}

async function gradeOne(snap: PickSnapshotRow): Promise<GradeOutcome> {
  const playerId = Number(snap.playerId);

  try {
    if (snap.sport === "MLB") {
      if (MLB_HITTER_PROPS.has(snap.propType)) {
        if (!Number.isFinite(playerId) || playerId <= 0) return { result: "PENDING", actualValue: null };
        const log = await getMlbHittingGameLog(playerId);
        const idx = pickMlbEntry(log, snap);
        if (idx < 0) return missing(snap);
        const value = extractHittingValue(log[idx]!.stat, snap.propType as MlbBatterPropKey);
        return { result: comparedSide(snap.side, value, snap.line), actualValue: value };
      }
      if (MLB_PITCHER_PROPS.has(snap.propType)) {
        if (!Number.isFinite(playerId) || playerId <= 0) return { result: "PENDING", actualValue: null };
        const log = await getMlbPitchingGameLog(playerId);
        const idx = pickMlbEntry(log, snap);
        if (idx < 0) return missing(snap);
        const value = extractPitchingValue(log[idx]!.stat, snap.propType as MlbPitcherPropKey);
        return { result: comparedSide(snap.side, value, snap.line), actualValue: value };
      }
      return { result: "PENDING", actualValue: null };
    }
    if (snap.sport === "NBA") {
      if (!NBA_PROPS.has(snap.propType)) return { result: "PENDING", actualValue: null };
      const log = await getNbaPlayerGameLog(snap.playerId);
      const idx = pickNbaEntry(log, snap);
      if (idx < 0) return missing(snap);
      const value = extractNbaValue(log[idx]!, snap.propType as NbaPropKey);
      return { result: comparedSide(snap.side, value, snap.line), actualValue: value };
    }
  } catch (err) {
    logger.warn({ err: String(err), id: snap.id }, "gradeOne failed");
  }
  return { result: "PENDING", actualValue: null };
}

// Grade everything still pending whose slate date is at least 1 ET-day in the
// past (so the game is finished). Rows with no matching gameLog entry that are
// younger than DNP_GRACE_DAYS stay PENDING for retry on the next hourly run.
export async function gradePendingSnapshots(): Promise<{
  graded: number; hits: number; misses: number; pushes: number; dnp: number; pending: number;
}> {
  const today = etDate();
  const pending = await db
    .select()
    .from(pickSnapshotsTable)
    .where(and(eq(pickSnapshotsTable.result, "PENDING"), lt(pickSnapshotsTable.date, today)))
    .limit(500);

  let hits = 0, misses = 0, pushes = 0, dnp = 0, stillPending = 0, graded = 0;

  // Process per-player to maximize cache reuse (gameLog is cached 60min).
  for (const snap of pending) {
    const outcome = await gradeOne(snap);
    if (outcome.result === "PENDING") { stillPending++; continue; }
    await db
      .update(pickSnapshotsTable)
      .set({ result: outcome.result, actualValue: outcome.actualValue, gradedAt: new Date() })
      .where(eq(pickSnapshotsTable.id, snap.id));
    graded++;
    if (outcome.result === "HIT") hits++;
    else if (outcome.result === "MISS") misses++;
    else if (outcome.result === "PUSH") pushes++;
    else if (outcome.result === "DNP") dnp++;
  }

  if (graded > 0) {
    logger.info(
      { graded, hits, misses, pushes, dnp, today },
      "trackRecord graded snapshots",
    );
  }
  return { graded, hits, misses, pushes, dnp, pending: stillPending };
}

// ─── Aggregation for /api/track-record ──────────────────────────────────────
export type Bucket = {
  label: string;
  graded: number; hits: number; misses: number; pushes: number; dnp: number; pending: number;
  hitRate: number;
};

function emptyBucket(label: string): Bucket {
  return { label, graded: 0, hits: 0, misses: 0, pushes: 0, dnp: 0, pending: 0, hitRate: 0 };
}

function add(b: Bucket, r: string): void {
  if (r === "HIT") { b.hits++; b.graded++; }
  else if (r === "MISS") { b.misses++; b.graded++; }
  else if (r === "PUSH") { b.pushes++; b.graded++; }
  else if (r === "DNP") { b.dnp++; }
  else { b.pending++; }
}

function finalize(b: Bucket): Bucket {
  const settled = b.hits + b.misses; // pushes excluded from rate
  b.hitRate = settled > 0 ? Math.round((b.hits / settled) * 1000) / 10 : 0;
  return b;
}

export async function getTrackRecord(window: "7d" | "30d" | "all" = "30d"): Promise<{
  window: string;
  overall: Bucket;
  bestPicks: Bucket;
  otherPicks: Bucket;
  bySport: Bucket[];
  byTier: Bucket[];
  byPropType: Bucket[];
  recent: PickSnapshotRow[];
}> {
  const conds = [] as ReturnType<typeof eq>[];
  if (window !== "all") {
    const days = window === "7d" ? 7 : 30;
    conds.push(gte(pickSnapshotsTable.date, daysAgoEt(days)) as any);
  }
  const rows = conds.length
    ? await db.select().from(pickSnapshotsTable).where(and(...conds))
    : await db.select().from(pickSnapshotsTable);

  const overall = emptyBucket("Overall");
  const bestPicks = emptyBucket("Best Picks");
  const otherPicks = emptyBucket("Other Picks");
  const sportMap = new Map<string, Bucket>();
  const tierMap = new Map<number, Bucket>();
  const propMap = new Map<string, Bucket>();

  for (const r of rows) {
    add(overall, r.result);
    if (r.isBestPick) add(bestPicks, r.result); else add(otherPicks, r.result);

    if (!sportMap.has(r.sport)) sportMap.set(r.sport, emptyBucket(r.sport));
    add(sportMap.get(r.sport)!, r.result);

    const tier = r.isBestPick ? (r.bestPickTier ?? 4) : 0;
    if (!tierMap.has(tier)) {
      tierMap.set(tier, emptyBucket(tier === 0 ? "Non-Best" : `Tier ${tier}`));
    }
    add(tierMap.get(tier)!, r.result);

    if (!propMap.has(r.propType)) propMap.set(r.propType, emptyBucket(r.propType));
    add(propMap.get(r.propType)!, r.result);
  }

  const recent = rows
    .filter((r) => r.result !== "PENDING")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 50);

  return {
    window,
    overall: finalize(overall),
    bestPicks: finalize(bestPicks),
    otherPicks: finalize(otherPicks),
    bySport: [...sportMap.values()].map(finalize).sort((a, b) => b.graded - a.graded),
    byTier: [...tierMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, v]) => finalize(v)),
    byPropType: [...propMap.values()].map(finalize).sort((a, b) => b.graded - a.graded),
    recent,
  };
}

// ─── Auto-tune: tier weights from rolling 30d performance ───────────────────
// Returns a multiplier per tier (1-4) reflecting recent hit-rate vs. baseline.
// We only deviate from 1.0 when a tier has at least 10 graded picks; otherwise
// trust the heuristic ordering. A higher multiplier means pickBestProp will
// prefer that tier more strongly.
let tierWeightCache: { ts: number; weights: Record<1 | 2 | 3 | 4, number> } | null = null;
const TIER_WEIGHT_TTL = 60 * 60 * 1000;

export async function getTierWeights(): Promise<Record<1 | 2 | 3 | 4, number>> {
  if (tierWeightCache && Date.now() - tierWeightCache.ts < TIER_WEIGHT_TTL) {
    return tierWeightCache.weights;
  }
  const since = daysAgoEt(30);
  const rows = await db
    .select()
    .from(pickSnapshotsTable)
    .where(
      and(
        gte(pickSnapshotsTable.date, since),
        eq(pickSnapshotsTable.isBestPick, true),
        inArray(pickSnapshotsTable.result, ["HIT", "MISS"]),
      ),
    );

  const tierStats: Record<1 | 2 | 3 | 4, { hits: number; total: number }> = {
    1: { hits: 0, total: 0 }, 2: { hits: 0, total: 0 },
    3: { hits: 0, total: 0 }, 4: { hits: 0, total: 0 },
  };
  for (const r of rows) {
    const t = (r.bestPickTier ?? 4) as 1 | 2 | 3 | 4;
    tierStats[t].total++;
    if (r.result === "HIT") tierStats[t].hits++;
  }

  const weights: Record<1 | 2 | 3 | 4, number> = { 1: 1, 2: 1, 3: 1, 4: 1 };
  for (const t of [1, 2, 3, 4] as const) {
    const { hits, total } = tierStats[t];
    if (total < 10) continue;
    const rate = hits / total;
    // Map 0.40 → 0.85, 0.50 → 1.00, 0.60 → 1.15 (clamped 0.7-1.3)
    const w = 1 + (rate - 0.5) * 1.5;
    weights[t] = Math.max(0.7, Math.min(1.3, Math.round(w * 100) / 100));
  }

  tierWeightCache = { ts: Date.now(), weights };
  return weights;
}

export function clearTierWeightCache(): void {
  tierWeightCache = null;
}
