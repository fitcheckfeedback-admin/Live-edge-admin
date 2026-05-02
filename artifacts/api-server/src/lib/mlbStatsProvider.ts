import { logger } from "./logger";
import { mlbTeamByAbbr } from "./stadiums";

// MLB Stats API (statsapi.mlb.com) — fully public, no key required.
// This is the canonical data source MLB.com itself uses.

const BASE = "https://statsapi.mlb.com/api/v1";
const UA = { "User-Agent": "LiveEdgeEngine/1.0" };

// ── Types ──────────────────────────────────────────────────────────────────
export interface MlbRosterPlayer {
  mlbId: number;
  fullName: string;
  position: string; // e.g. "1B" "SS" "OF" "SP" "RP" "P"
  jerseyNumber?: string;
}

export interface HittingGameStat {
  gamesPlayed: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  totalBases: number;
  runs: number;
  rbi: number;
  baseOnBalls: number;
  strikeOuts: number;
  stolenBases: number;
  atBats: number;
}

export interface PitchingGameStat {
  inningsPitched: string;
  strikeOuts: number;
  baseOnBalls: number;
  hits: number;
  earnedRuns: number;
}

export interface GameLogSplit<S> {
  date: string; // YYYY-MM-DD
  isHome: boolean;
  opponentId: number;
  opponentName: string;
  stat: S;
}

export interface TeamPitchingSeasonStats {
  teamId: number;
  teamName: string;
  era: number;
  whip: number;
  battersFaced: number;
  inningsPitched: number;
  hitsAllowed: number;
  homeRunsAllowed: number;
  walks: number;
  strikeOutsBy: number; // higher = harder for batters
  doublesAllowed: number;
  triplesAllowed: number;
  totalBasesAllowed: number;
  stolenBasesAllowed: number;
  baa: number; // batting average against
  oppOPS: number;
}

// ── Caching ────────────────────────────────────────────────────────────────
const rosterCache = new Map<number, { ts: number; players: MlbRosterPlayer[] }>();
const ROSTER_TTL = 6 * 60 * 60 * 1000; // 6h

const hittingLogCache = new Map<string, { ts: number; logs: GameLogSplit<HittingGameStat>[] }>();
const pitchingLogCache = new Map<string, { ts: number; logs: GameLogSplit<PitchingGameStat>[] }>();
const LOG_TTL = 60 * 60 * 1000; // 60min

let teamPitchingCache: { ts: number; data: TeamPitchingSeasonStats[] } | null = null;
const TEAM_STATS_TTL = 6 * 60 * 60 * 1000; // 6h

// ── Helpers ────────────────────────────────────────────────────────────────
function currentSeason(): number {
  return new Date().getUTCFullYear();
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getMlbRoster(mlbTeamId: number): Promise<MlbRosterPlayer[]> {
  const hit = rosterCache.get(mlbTeamId);
  if (hit && Date.now() - hit.ts < ROSTER_TTL) return hit.players;

  try {
    const url = `${BASE}/teams/${mlbTeamId}/roster?rosterType=active`;
    const j = await fetchJson(url);
    const roster: any[] = j?.roster ?? [];
    const players: MlbRosterPlayer[] = roster
      .map((r) => ({
        mlbId: Number(r?.person?.id),
        fullName: r?.person?.fullName ?? "",
        position: r?.position?.abbreviation ?? "",
        jerseyNumber: r?.jerseyNumber,
      }))
      .filter((p) => p.mlbId && p.fullName);
    rosterCache.set(mlbTeamId, { ts: Date.now(), players });
    return players;
  } catch (err) {
    logger.warn({ err: String(err), mlbTeamId }, "MLB roster fetch failed");
    return hit?.players ?? [];
  }
}

function parseHittingStat(s: any): HittingGameStat {
  return {
    gamesPlayed: Number(s?.gamesPlayed ?? 0),
    hits: Number(s?.hits ?? 0),
    doubles: Number(s?.doubles ?? 0),
    triples: Number(s?.triples ?? 0),
    homeRuns: Number(s?.homeRuns ?? 0),
    totalBases: Number(s?.totalBases ?? 0),
    runs: Number(s?.runs ?? 0),
    rbi: Number(s?.rbi ?? 0),
    baseOnBalls: Number(s?.baseOnBalls ?? 0),
    strikeOuts: Number(s?.strikeOuts ?? 0),
    stolenBases: Number(s?.stolenBases ?? 0),
    atBats: Number(s?.atBats ?? 0),
  };
}

function parsePitchingStat(s: any): PitchingGameStat {
  return {
    inningsPitched: String(s?.inningsPitched ?? "0"),
    strikeOuts: Number(s?.strikeOuts ?? 0),
    baseOnBalls: Number(s?.baseOnBalls ?? 0),
    hits: Number(s?.hits ?? 0),
    earnedRuns: Number(s?.earnedRuns ?? 0),
  };
}

async function getGameLog<S>(
  playerId: number,
  group: "hitting" | "pitching",
  parser: (s: any) => S,
): Promise<GameLogSplit<S>[]> {
  const season = currentSeason();
  // Try current season; if empty (early season), fall back to previous season.
  const seasons = [season, season - 1];
  const all: GameLogSplit<S>[] = [];
  for (const s of seasons) {
    try {
      const url = `${BASE}/people/${playerId}/stats?stats=gameLog&season=${s}&group=${group}`;
      const j = await fetchJson(url);
      const splits: any[] = j?.stats?.[0]?.splits ?? [];
      for (const split of splits) {
        all.push({
          date: split?.date ?? "",
          isHome: !!split?.isHome,
          opponentId: Number(split?.opponent?.id ?? 0),
          opponentName: split?.opponent?.name ?? "",
          stat: parser(split?.stat),
        });
      }
      if (all.length >= 5) break; // enough data, don't go further back
    } catch (err) {
      logger.warn({ err: String(err), playerId, season: s, group }, "MLB gameLog fetch failed");
    }
  }
  // Sort ascending by date so caller can take last N
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}

export async function getMlbHittingGameLog(playerId: number): Promise<GameLogSplit<HittingGameStat>[]> {
  const key = String(playerId);
  const hit = hittingLogCache.get(key);
  if (hit && Date.now() - hit.ts < LOG_TTL) return hit.logs;
  const logs = await getGameLog(playerId, "hitting", parseHittingStat);
  hittingLogCache.set(key, { ts: Date.now(), logs });
  return logs;
}

export async function getMlbPitchingGameLog(playerId: number): Promise<GameLogSplit<PitchingGameStat>[]> {
  const key = String(playerId);
  const hit = pitchingLogCache.get(key);
  if (hit && Date.now() - hit.ts < LOG_TTL) return hit.logs;
  const logs = await getGameLog(playerId, "pitching", parsePitchingStat);
  pitchingLogCache.set(key, { ts: Date.now(), logs });
  return logs;
}

export async function getMlbTeamPitchingSeasonStats(): Promise<TeamPitchingSeasonStats[]> {
  if (teamPitchingCache && Date.now() - teamPitchingCache.ts < TEAM_STATS_TTL) {
    return teamPitchingCache.data;
  }
  const season = currentSeason();
  const seasons = [season, season - 1];
  for (const s of seasons) {
    try {
      const url = `${BASE}/teams/stats?season=${s}&group=pitching&stats=season&sportIds=1`;
      const j = await fetchJson(url, 8000);
      const splits: any[] = j?.stats?.[0]?.splits ?? [];
      if (!splits.length) continue;
      const data: TeamPitchingSeasonStats[] = splits.map((sp) => {
        const stat = sp?.stat ?? {};
        const ip = Number(stat?.inningsPitched ?? 0);
        const hits = Number(stat?.hits ?? 0);
        const ab = Number(stat?.atBats ?? 0);
        const obp = Number(stat?.obp ?? 0);
        const slg = Number(stat?.slg ?? 0);
        return {
          teamId: Number(sp?.team?.id ?? 0),
          teamName: sp?.team?.name ?? "",
          era: Number(stat?.era ?? 0),
          whip: Number(stat?.whip ?? 0),
          battersFaced: Number(stat?.battersFaced ?? 0),
          inningsPitched: ip,
          hitsAllowed: hits,
          homeRunsAllowed: Number(stat?.homeRuns ?? 0),
          walks: Number(stat?.baseOnBalls ?? 0),
          strikeOutsBy: Number(stat?.strikeOuts ?? 0),
          doublesAllowed: Number(stat?.doubles ?? 0),
          triplesAllowed: Number(stat?.triples ?? 0),
          totalBasesAllowed: hits + Number(stat?.doubles ?? 0) + 2 * Number(stat?.triples ?? 0) + 3 * Number(stat?.homeRuns ?? 0),
          stolenBasesAllowed: Number(stat?.stolenBases ?? 0),
          baa: ab > 0 ? hits / ab : 0,
          oppOPS: obp + slg,
        };
      });
      teamPitchingCache = { ts: Date.now(), data };
      return data;
    } catch (err) {
      logger.warn({ err: String(err), season: s }, "MLB team pitching stats fetch failed");
    }
  }
  return teamPitchingCache?.data ?? [];
}

// ── Prop category extraction ───────────────────────────────────────────────
export type MlbBatterPropKey =
  | "Home Runs"
  | "Total Bases"
  | "Hits+Runs+RBIs"
  | "Hits"
  | "Runs"
  | "RBIs"
  | "Walks"
  | "Stolen Bases"
  | "Hitter Strikeouts"
  | "Singles"
  | "Doubles";

export type MlbPitcherPropKey = "Pitcher Strikeouts";

export function extractHittingValue(s: HittingGameStat, prop: MlbBatterPropKey): number {
  switch (prop) {
    case "Home Runs": return s.homeRuns;
    case "Total Bases": return s.totalBases;
    case "Hits+Runs+RBIs": return s.hits + s.runs + s.rbi;
    case "Hits": return s.hits;
    case "Runs": return s.runs;
    case "RBIs": return s.rbi;
    case "Walks": return s.baseOnBalls;
    case "Stolen Bases": return s.stolenBases;
    case "Hitter Strikeouts": return s.strikeOuts;
    case "Singles": return Math.max(0, s.hits - s.doubles - s.triples - s.homeRuns);
    case "Doubles": return s.doubles;
  }
}

export function extractPitchingValue(s: PitchingGameStat, prop: MlbPitcherPropKey): number {
  switch (prop) {
    case "Pitcher Strikeouts": return s.strikeOuts;
  }
}

// ── Opponent rank ──────────────────────────────────────────────────────────
// Rank 1 = toughest matchup for hitters (i.e., the prop is hardest to hit Over).
// For "K" props (Hitter Strikeouts), more team Ks = HARDER to go Under.
// We return a 1-30 integer where lower number = friendlier matchup for hitter
// going OVER, *except* for Hitter Strikeouts where lower = harder for hitter
// (more pitcher K's). The propsGenerator handles the directional impact.
export function rankOpponentForHitter(
  prop: MlbBatterPropKey,
  opponentTeamId: number,
  allTeams: TeamPitchingSeasonStats[],
): number {
  if (allTeams.length === 0) return 15;
  // Higher = more allowed = easier for hitter
  const valueOf = (t: TeamPitchingSeasonStats): number => {
    switch (prop) {
      case "Home Runs": return t.homeRunsAllowed / Math.max(1, t.inningsPitched);
      case "Total Bases": return t.totalBasesAllowed / Math.max(1, t.inningsPitched);
      case "Hits+Runs+RBIs":
      case "Hits":
      case "Singles":
        return t.baa;
      case "Runs":
      case "RBIs":
        return t.era;
      case "Walks": return t.walks / Math.max(1, t.inningsPitched);
      case "Stolen Bases": return t.stolenBasesAllowed / Math.max(1, t.inningsPitched);
      case "Hitter Strikeouts":
        // Higher pitcher K rate = MORE Ks for opposing hitters = easier OVER for hitter K
        return t.strikeOutsBy / Math.max(1, t.battersFaced);
      case "Doubles": return t.doublesAllowed / Math.max(1, t.inningsPitched);
    }
  };
  const sorted = [...allTeams].sort((a, b) => valueOf(b) - valueOf(a));
  // sorted[0] = team that ALLOWS the most → easiest matchup. Rank 30.
  // sorted[29] = team that allows the least → toughest. Rank 1.
  const idx = sorted.findIndex((t) => t.teamId === opponentTeamId);
  if (idx === -1) return 15;
  // Map: idx 0 → rank 30 (easiest), idx 29 → rank 1 (toughest)
  return 30 - idx;
}

// ── Player ID matching ─────────────────────────────────────────────────────
// Match an ESPN-roster name to a known MLB roster player. Tolerates
// abbreviations and accents.
function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,'’\-]/g, "").toLowerCase().trim();
}

export function matchMlbPlayerByName(
  fullName: string,
  roster: MlbRosterPlayer[],
): MlbRosterPlayer | null {
  const target = normalize(fullName);
  const exact = roster.find((p) => normalize(p.fullName) === target);
  if (exact) return exact;
  // Last name + first initial fallback
  const parts = target.split(/\s+/);
  if (parts.length >= 2) {
    const fi = parts[0]![0];
    const last = parts[parts.length - 1];
    const partial = roster.find((p) => {
      const pn = normalize(p.fullName).split(/\s+/);
      return pn[pn.length - 1] === last && pn[0]!.startsWith(fi!);
    });
    if (partial) return partial;
  }
  return null;
}

export { mlbTeamByAbbr };
