import { logger } from "./logger";
import type { Game } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

// Sports we actively support for game schedules AND prop generation. We do NOT
// include NFL in May (off-season) and we do NOT include NHL because we lack a
// curated star list — generating "NHL props" for unknown players would violate
// our honesty principle. Add NHL here only after star data exists.
// Returns YYYYMMDD in America/New_York. US pro sports use ET as the canonical
// "game day" boundary, so we anchor today's slate to ET regardless of where the
// server runs. ESPN's scoreboard endpoint accepts ?dates=YYYYMMDD and returns
// games scheduled for that calendar day, which is what we want — without a date
// param, ESPN returns whatever it considers "current", which at 7 AM ET still
// shows yesterday's finals because today's slate hasn't loaded yet.
function dateInET(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${y}${m}${day}`;
}
function monthInET(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" })
      .format(d),
  );
}

function getActiveSports(): { sport: string; league: string; label: string }[] {
  const month = monthInET(new Date());
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

async function fetchScoreboard(sport: string, league: string, date?: string): Promise<Game[]> {
  const url = `${ESPN_BASE}/${sport}/${league}/scoreboard${date ? `?dates=${date}` : ""}`;
  // 12s timeout — production cold starts have higher network latency to ESPN
  // than the dev container (was 5s, which caused empty seeds in deployment).
  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
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

  // Anchor "today" to the ET sports-day. We also fetch tomorrow (ET) so very-
  // late West Coast games that start before midnight ET but cross over are
  // still surfaced as upcoming. We dedupe by event id afterwards.
  const now = new Date();
  const todayEt = dateInET(now);
  const tomorrowEt = dateInET(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  // Fetch each league × {today, tomorrow} independently so any single failure
  // doesn't kill the whole response. We surface an error source only if EVERY
  // league completely failed.
  const jobs = targets.flatMap((t) =>
    [todayEt, tomorrowEt].map((date) => ({ t, date })),
  );
  const settled = await Promise.allSettled(
    jobs.map((j) => fetchScoreboard(j.t.sport, j.t.league, j.date)),
  );
  const seen = new Set<string>();
  const games: Game[] = [];
  const failures = new Map<string, string>(); // league → last error
  settled.forEach((r, i) => {
    const job = jobs[i]!;
    if (r.status === "fulfilled") {
      for (const g of r.value) {
        if (g.id && !seen.has(g.id)) {
          seen.add(g.id);
          games.push(g);
        }
      }
    } else {
      failures.set(job.t.label, String(r.reason));
      logger.warn({ err: r.reason, league: job.t.label, date: job.date }, "ESPN scoreboard fetch failed");
    }
  });

  // Hide games that finished more than 6 hours ago — they're truly stale and
  // never useful to a user opening the app. Live and upcoming games always pass.
  const cutoffMs = now.getTime() - 6 * 60 * 60 * 1000;
  const filtered = games.filter((g) => {
    if (g.isLive) return true;
    if (g.status !== "final") return true;
    const t = g.startTime ? new Date(g.startTime).getTime() : 0;
    return t >= cutoffMs;
  });

  // Sort: live first, then by start time ascending (earliest upcoming first,
  // then most-recent finals last).
  filtered.sort((a, b) => {
    if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
    const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
    const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
    return ta - tb;
  });

  if (failures.size === targets.length) {
    return { games: [], source: "error", error: Array.from(failures.values()).join("; ") };
  }
  return {
    games: filtered,
    source: "espn",
    ...(failures.size ? { error: Array.from(failures.values()).join("; ") } : {}),
  };
}
