import { logger } from "./logger";

// ESPN public athlete gamelog and team stats. No API key required.
// Endpoints:
//   site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{id}/gamelog
//   site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{teamId}/statistics

const UA = { "User-Agent": "LiveEdgeEngine/1.0" };

export interface NbaGameStat {
  date: string;
  opponentAbbr: string;
  isHome: boolean;
  pts: number;
  reb: number;
  ast: number;
  threePM: number;
  stl: number;
  blk: number;
  to: number;
  min: number;
}

export interface NbaTeamSeasonStats {
  teamId: number;
  pointsFor: number;
  pointsAgainst: number;
  reboundsAgainst: number;
  assistsAgainst: number;
  threesAgainst: number;
}

const gameLogCache = new Map<string, { ts: number; games: NbaGameStat[] }>();
const teamStatsCache = new Map<number, { ts: number; stats: NbaTeamSeasonStats | null }>();
let standingsCache: { ts: number; rankByTeamId: Map<number, number> } | null = null;
const LOG_TTL = 60 * 60 * 1000; // 60min
const TEAM_TTL = 6 * 60 * 60 * 1000; // 6h
const STANDINGS_TTL = 6 * 60 * 60 * 1000; // 6h

function currentSeason(): number {
  // NBA season label is the year the season ENDS (e.g. 2025-26 → 2026)
  const now = new Date();
  const m = now.getUTCMonth() + 1;
  return m >= 7 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  return r.json();
}

// ── Game log ───────────────────────────────────────────────────────────────
export async function getNbaPlayerGameLog(athleteId: string): Promise<NbaGameStat[]> {
  const key = athleteId;
  const hit = gameLogCache.get(key);
  if (hit && Date.now() - hit.ts < LOG_TTL) return hit.games;

  const season = currentSeason();
  const seasons = [season, season - 1];
  for (const s of seasons) {
    try {
      const url = `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${athleteId}/gamelog?season=${s}`;
      const j = await fetchJson(url);

      // labels[]: column display names like ["MIN","FG","FG%","3PT","3P%","FT","FT%","REB","AST","BLK","STL","PF","TO","PTS"]
      // names[]: machine names matching labels (e.g. "minutes","fieldGoalsMade-fieldGoalsAttempted",...)
      const labels: string[] = j?.labels ?? [];
      const names: string[] = j?.names ?? [];
      const colIdx = (key: string) => {
        let i = labels.indexOf(key);
        if (i === -1) i = names.indexOf(key);
        return i;
      };

      const minIdx = colIdx("MIN");
      const ptsIdx = colIdx("PTS");
      const rebIdx = colIdx("REB");
      const astIdx = colIdx("AST");
      const threeIdx = colIdx("3PT"); // value like "3-7"
      const stlIdx = colIdx("STL");
      const blkIdx = colIdx("BLK");
      const toIdx = colIdx("TO");

      const events: Record<string, any> = j?.events ?? {};

      const games: NbaGameStat[] = [];
      const seasonTypes: any[] = j?.seasonTypes ?? [];
      // Walk all season types to grab all events; categories[].events[].stats
      for (const st of seasonTypes) {
        const cats: any[] = st?.categories ?? [];
        for (const cat of cats) {
          const evList: any[] = cat?.events ?? [];
          for (const ev of evList) {
            const meta = events[ev.eventId];
            if (!meta) continue;
            const stats: string[] = ev.stats ?? [];
            const parseInt0 = (s: string | undefined) => {
              const n = parseInt(s ?? "0", 10);
              return Number.isFinite(n) ? n : 0;
            };
            const parse3pm = (s: string | undefined) => {
              if (!s) return 0;
              const m = /^(\d+)/.exec(s);
              return m ? Number(m[1]) : 0;
            };
            // Opponent abbr lives on event meta
            const oppAbbr: string = meta?.opponent?.abbreviation ?? "";
            const isHome = !!meta?.homeAway && meta.homeAway === "home";
            // Some implementations use atVs="vs" for home, "@" for away
            const atVs: string = meta?.atVs ?? meta?.opponent?.atVs ?? "";
            const homeFlag = atVs === "vs" || (typeof meta?.homeAway === "string" && meta.homeAway === "home") || isHome;
            games.push({
              date: meta?.gameDate ?? meta?.date ?? "",
              opponentAbbr: oppAbbr,
              isHome: homeFlag,
              pts: parseInt0(stats[ptsIdx]),
              reb: parseInt0(stats[rebIdx]),
              ast: parseInt0(stats[astIdx]),
              threePM: parse3pm(stats[threeIdx]),
              stl: parseInt0(stats[stlIdx]),
              blk: parseInt0(stats[blkIdx]),
              to: parseInt0(stats[toIdx]),
              min: parseInt0(stats[minIdx]),
            });
          }
        }
      }

      // Sort ascending by date
      games.sort((a, b) => a.date.localeCompare(b.date));
      // Filter games with 0 minutes (DNP)
      const played = games.filter((g) => g.min > 0);
      if (played.length > 0) {
        gameLogCache.set(key, { ts: Date.now(), games: played });
        return played;
      }
    } catch (err) {
      logger.warn({ err: String(err), athleteId, season: s }, "NBA gameLog fetch failed");
    }
  }
  gameLogCache.set(key, { ts: Date.now(), games: [] });
  return [];
}

// ── Team season stats (for opponent ranking) ───────────────────────────────
export async function getNbaTeamSeasonStats(teamId: string): Promise<NbaTeamSeasonStats | null> {
  const numId = Number(teamId);
  if (!numId) return null;
  const hit = teamStatsCache.get(numId);
  if (hit && Date.now() - hit.ts < TEAM_TTL) return hit.stats;

  try {
    const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/statistics`;
    const j = await fetchJson(url);
    const cats: any[] = j?.results?.stats?.categories ?? j?.stats?.categories ?? [];

    const findStat = (catName: string, statName: string): number => {
      const cat = cats.find((c) => c?.name?.toLowerCase() === catName.toLowerCase());
      if (!cat) return 0;
      const stat = (cat?.stats ?? []).find(
        (s: any) => s?.name?.toLowerCase() === statName.toLowerCase() ||
                    s?.abbreviation?.toLowerCase() === statName.toLowerCase(),
      );
      return Number(stat?.value ?? 0);
    };

    const stats: NbaTeamSeasonStats = {
      teamId: numId,
      pointsFor: findStat("offensive", "avgPoints") || findStat("general", "avgPoints"),
      pointsAgainst: findStat("defensive", "avgPointsAgainst") || findStat("general", "avgPointsAgainst"),
      reboundsAgainst: findStat("defensive", "avgReboundsAgainst") || findStat("general", "avgReboundsAgainst"),
      assistsAgainst: findStat("defensive", "avgAssistsAgainst") || findStat("general", "avgAssistsAgainst"),
      threesAgainst: findStat("defensive", "avg3PointFieldGoalsMadeAgainst") || 0,
    };
    teamStatsCache.set(numId, { ts: Date.now(), stats });
    return stats;
  } catch (err) {
    logger.warn({ err: String(err), teamId }, "NBA team stats fetch failed");
    teamStatsCache.set(numId, { ts: Date.now(), stats: null });
    return null;
  }
}

// ── League-wide points-against ranking (from standings) ───────────────────
// Returns a map of NBA teamId → rank (1 = best/lowest opp PPG, 30 = worst/highest).
// This is the only real NBA defensive metric ESPN exposes publicly.
export async function getNbaPointsAgainstRanks(): Promise<Map<number, number>> {
  if (standingsCache && Date.now() - standingsCache.ts < STANDINGS_TTL) {
    return standingsCache.rankByTeamId;
  }
  try {
    const url = `https://site.web.api.espn.com/apis/v2/sports/basketball/nba/standings?season=${currentSeason()}`;
    const j = await fetchJson(url, 8000);
    const conferences: any[] = j?.children ?? [];
    const teams: { id: number; avgPa: number }[] = [];
    for (const conf of conferences) {
      const entries: any[] = conf?.standings?.entries ?? [];
      for (const e of entries) {
        const id = Number(e?.team?.id ?? 0);
        if (!id) continue;
        const stats: any[] = e?.stats ?? [];
        const pa = stats.find((s) => s?.name === "avgPointsAgainst" || s?.type === "avgpointsagainst");
        const v = Number(pa?.value ?? 0);
        if (v > 0) teams.push({ id, avgPa: v });
      }
    }
    // Sort ascending — lowest opp PPG = rank 1 (toughest defense)
    teams.sort((a, b) => a.avgPa - b.avgPa);
    const rankByTeamId = new Map<number, number>();
    teams.forEach((t, i) => rankByTeamId.set(t.id, i + 1));
    standingsCache = { ts: Date.now(), rankByTeamId };
    return rankByTeamId;
  } catch (err) {
    logger.warn({ err: String(err) }, "NBA standings fetch failed");
    return new Map();
  }
}

// ── Prop key extraction ────────────────────────────────────────────────────
export type NbaPropKey =
  | "Points" | "Rebounds" | "Assists"
  | "3-Pointers Made" | "Steals" | "Blocks"
  | "Points + Assists" | "Points + Rebounds" | "Pts+Reb+Ast";

export function extractNbaValue(g: NbaGameStat, prop: NbaPropKey): number {
  switch (prop) {
    case "Points": return g.pts;
    case "Rebounds": return g.reb;
    case "Assists": return g.ast;
    case "3-Pointers Made": return g.threePM;
    case "Steals": return g.stl;
    case "Blocks": return g.blk;
    case "Points + Assists": return g.pts + g.ast;
    case "Points + Rebounds": return g.pts + g.reb;
    case "Pts+Reb+Ast": return g.pts + g.reb + g.ast;
  }
}
