import { logger } from "./logger";
import type { Game } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

function getActiveSports(): { sport: string; league: string; label: string }[] {
  const month = new Date().getMonth() + 1; // 1-12
  const active: { sport: string; league: string; label: string }[] = [];
  // NBA: October–June (playoffs through June)
  if (month >= 10 || month <= 6) active.push({ sport: "basketball", league: "nba", label: "NBA" });
  // MLB: April–October
  if (month >= 4 && month <= 10) active.push({ sport: "baseball", league: "mlb", label: "MLB" });
  // NFL: September–February
  if (month >= 9 || month <= 2) active.push({ sport: "football", league: "nfl", label: "NFL" });
  return active;
}

export function getActiveLeagues(): string[] {
  return getActiveSports().map((s) => s.label);
}

function mapStatus(detail: string): "scheduled" | "live" | "final" {
  const d = detail?.toLowerCase() ?? "";
  if (d.includes("final") || d.includes("game over")) return "final";
  if (d.includes("in progress") || d.includes("halftime") || d.includes("end of")) return "live";
  return "scheduled";
}

function formatPeriod(sport: string, period: string, status: string): string {
  if (!period) return "";
  const d = status?.toLowerCase() ?? "";
  if (sport === "nba") {
    const n = Number(period);
    if (n === 1) return "1st Qtr";
    if (n === 2) return "2nd Qtr";
    if (n === 3) return "3rd Qtr";
    if (n === 4) return "4th Qtr";
    if (n > 4) return `OT${n - 4}`;
  }
  if (sport === "mlb") {
    const half = d.includes("bottom") ? "Bot" : "Top";
    return `${half} ${period}`;
  }
  if (sport === "nfl") {
    const n = Number(period);
    if (n === 1) return "1st Qtr";
    if (n === 2) return "2nd Qtr";
    if (n === 3) return "3rd Qtr";
    if (n === 4) return "4th Qtr";
  }
  return period;
}

async function fetchScoreboard(sport: string, league: string): Promise<Game[]> {
  const url = `${ESPN_BASE}/${sport}/${league}/scoreboard`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`ESPN ${sport}/${league} returned ${resp.status}`);
  const json = await resp.json() as any;
  const events: any[] = json?.events ?? [];
  return events.map((ev: any): Game => {
    const comp = ev.competitions?.[0];
    const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
    const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
    const statusDesc = ev.status?.type?.description ?? "";
    const rawPeriod = ev.status?.period ? String(ev.status.period) : "";
    const clock = ev.status?.displayClock ?? "";
    const gameStatus = mapStatus(statusDesc);
    const isLive = gameStatus === "live";
    return {
      id: ev.id,
      sport: league.toUpperCase(),
      status: gameStatus,
      startTime: ev.date,
      awayTeam: {
        id: away?.team?.id ?? "",
        name: away?.team?.displayName ?? "",
        abbreviation: away?.team?.abbreviation ?? "",
        logoUrl: away?.team?.logo ?? "",
        color: away?.team?.color ? `#${away.team.color}` : undefined,
      },
      homeTeam: {
        id: home?.team?.id ?? "",
        name: home?.team?.displayName ?? "",
        abbreviation: home?.team?.abbreviation ?? "",
        logoUrl: home?.team?.logo ?? "",
        color: home?.team?.color ? `#${home.team.color}` : undefined,
      },
      awayScore: away?.score !== undefined ? Number(away.score) : undefined,
      homeScore: home?.score !== undefined ? Number(home.score) : undefined,
      period: formatPeriod(league, rawPeriod, statusDesc),
      clock: isLive ? clock : "",
      isLive,
    };
  });
}

export async function getTodayGames(sport?: string): Promise<{ games: Game[]; source: "espn" | "mock" }> {
  const activeSports = getActiveSports();
  const s = sport?.toUpperCase() ?? "ALL";

  const targets = activeSports.filter((t) => s === "ALL" || t.label === s);

  if (targets.length === 0) {
    return { games: [], source: "espn" };
  }

  try {
    const results = await Promise.all(targets.map((t) => fetchScoreboard(t.sport, t.league)));
    const games = results.flat();
    return { games, source: "espn" };
  } catch (err) {
    logger.warn({ err }, "ESPN fetch failed — using mock data");
    return { games: [], source: "mock" };
  }
}
