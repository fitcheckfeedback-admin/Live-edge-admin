import { logger } from "./logger";
import type { Game } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

// Sports we actively support for game schedules AND prop generation. We do NOT
// include NFL in May (off-season) and we do NOT include NHL because we lack a
// curated star list — generating "NHL props" for unknown players would violate
// our honesty principle. Add NHL here only after star data exists.
function getActiveSports(): { sport: string; league: string; label: string }[] {
  const month = new Date().getMonth() + 1; // 1-12
  const active: { sport: string; league: string; label: string }[] = [];
  // NBA: October–June (playoffs through June)
  if (month >= 10 || month <= 6) active.push({ sport: "basketball", league: "nba", label: "NBA" });
  // MLB: April–October
  if (month >= 4 && month <= 10) active.push({ sport: "baseball", league: "mlb", label: "MLB" });
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

export async function getTodayGames(
  sport?: string,
): Promise<{ games: Game[]; source: "espn" | "off-season" | "error"; error?: string }> {
  const activeSports = getActiveSports();
  const s = sport?.toUpperCase() ?? "ALL";

  const targets = activeSports.filter((t) => s === "ALL" || t.label === s);

  if (targets.length === 0) {
    // No active leagues for this month/filter — honest off-season signal, not an error
    return { games: [], source: "off-season" };
  }

  // Fetch each league independently so a single failure doesn't kill the whole response.
  // We surface an error source if EVERY league failed; partial success degrades silently
  // but the source still reads "espn" since we got real data.
  const settled = await Promise.allSettled(
    targets.map((t) => fetchScoreboard(t.sport, t.league)),
  );
  const games: Game[] = [];
  const failures: string[] = [];
  settled.forEach((r, i) => {
    const t = targets[i]!;
    if (r.status === "fulfilled") {
      games.push(...r.value);
    } else {
      failures.push(`${t.label}: ${String(r.reason)}`);
      logger.warn({ err: r.reason, league: t.label }, "ESPN scoreboard fetch failed");
    }
  });

  if (failures.length === targets.length) {
    return { games: [], source: "error", error: failures.join("; ") };
  }
  return { games, source: "espn", ...(failures.length ? { error: failures.join("; ") } : {}) };
}
