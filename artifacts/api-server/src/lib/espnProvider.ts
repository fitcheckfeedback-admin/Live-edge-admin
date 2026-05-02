import { logger } from "./logger";
import type { Game } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

function mapStatus(detail: string): "scheduled" | "live" | "final" {
  const d = detail?.toLowerCase() ?? "";
  if (d.includes("final") || d.includes("game over")) return "final";
  if (d.includes("in progress") || d.includes("halftime") || d.includes("end of")) return "live";
  return "scheduled";
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
    const status = ev.status?.type?.description ?? "";
    const clock = ev.status?.displayClock ?? "";
    const period = ev.status?.period ? String(ev.status.period) : "";
    const isLive = mapStatus(status) === "live";
    return {
      id: ev.id,
      sport: league.toUpperCase(),
      status: mapStatus(status),
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
      awayScore: away?.score ? Number(away.score) : 0,
      homeScore: home?.score ? Number(home.score) : 0,
      period: period ? `${period}` : clock ? "Live" : "",
      clock,
      isLive,
    };
  });
}

export async function getTodayGames(sport?: string): Promise<{ games: Game[]; source: "espn" | "mock" }> {
  const targets: { sport: string; league: string }[] = [];
  const s = sport?.toUpperCase() ?? "ALL";
  if (s === "ALL" || s === "NBA") targets.push({ sport: "basketball", league: "nba" });
  if (s === "ALL" || s === "MLB") targets.push({ sport: "baseball", league: "mlb" });
  if (s === "ALL" || s === "NFL") targets.push({ sport: "football", league: "nfl" });

  try {
    const results = await Promise.all(targets.map((t) => fetchScoreboard(t.sport, t.league)));
    const games = results.flat();
    if (games.length === 0) {
      logger.info("ESPN returned 0 games — falling back to mock");
      return { games: [], source: "espn" };
    }
    return { games, source: "espn" };
  } catch (err) {
    logger.warn({ err }, "ESPN fetch failed — using mock data");
    return { games: [], source: "mock" };
  }
}
