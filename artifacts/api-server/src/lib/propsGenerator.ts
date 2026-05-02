import { logger } from "./logger";
import type { Game, PlayerProp, LiveEdge } from "./types";
import { getTodayGames } from "./espnProvider";
import { getStars, matchesAnyStar } from "./starPlayers";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_TO_PATH: Record<string, { sport: string; league: string }> = {
  NBA: { sport: "basketball", league: "nba" },
  MLB: { sport: "baseball", league: "mlb" },
};

const HEADSHOT: Record<string, (id: string) => string> = {
  NBA: (id) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`,
  MLB: (id) => `https://a.espncdn.com/i/headshots/mlb/players/full/${id}.png`,
};

interface RosterPlayer {
  id: string;
  fullName: string;
  position: string;
  experienceYears: number;
  jersey?: string;
  height?: number;
}

interface PropTemplate {
  type: string;
  baseline: number;
  variance: number;
  weight: number;
}

const NBA_TEMPLATES_BY_POS: Record<string, PropTemplate[]> = {
  PG: [
    { type: "Assists", baseline: 6.5, variance: 2.5, weight: 1.0 },
    { type: "Points", baseline: 18.5, variance: 6, weight: 0.8 },
    { type: "Points + Assists", baseline: 26.5, variance: 6, weight: 0.6 },
  ],
  SG: [
    { type: "Points", baseline: 19.5, variance: 6, weight: 1.0 },
    { type: "3-Pointers Made", baseline: 2.5, variance: 1, weight: 0.7 },
  ],
  SF: [
    { type: "Points", baseline: 18.5, variance: 6, weight: 1.0 },
    { type: "Rebounds", baseline: 5.5, variance: 2, weight: 0.6 },
  ],
  PF: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 0.8 },
    { type: "Rebounds", baseline: 7.5, variance: 2, weight: 1.0 },
  ],
  C: [
    { type: "Rebounds", baseline: 9.5, variance: 2.5, weight: 1.0 },
    { type: "Points + Rebounds", baseline: 24.5, variance: 5, weight: 0.7 },
  ],
  G: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 1.0 },
    { type: "Assists", baseline: 5.5, variance: 2, weight: 0.7 },
  ],
  F: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 1.0 },
    { type: "Rebounds", baseline: 6.5, variance: 2, weight: 0.7 },
  ],
};

const MLB_BATTER_TEMPLATES: PropTemplate[] = [
  { type: "Total Bases", baseline: 1.5, variance: 0.5, weight: 1.0 },
  { type: "Hits", baseline: 0.5, variance: 0.5, weight: 0.8 },
];

const MLB_PITCHER_TEMPLATES: PropTemplate[] = [
  { type: "Strikeouts", baseline: 5.5, variance: 2, weight: 1.0 },
];

// ── Caches ─────────────────────────────────────────────────────────────────
const rosterCache = new Map<string, { ts: number; players: RosterPlayer[] }>();
const ROSTER_TTL = 30 * 60 * 1000; // 30 min

let propsCache: { ts: number; props: PlayerProp[] } | null = null;
const PROPS_TTL = 60 * 1000; // 60s

// ── Helpers ────────────────────────────────────────────────────────────────
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

function roundLine(value: number, step = 0.5): number {
  return Math.round(value / step) * step;
}

// ── Roster fetch ───────────────────────────────────────────────────────────
function toPlayer(a: any): RosterPlayer {
  return {
    id: String(a.id ?? ""),
    fullName: a.fullName ?? a.displayName ?? "",
    position: a.position?.abbreviation ?? "",
    experienceYears: Number(a.experience?.years ?? 0),
    jersey: a.jersey,
    height: Number(a.height ?? 0),
  };
}

async function fetchRosterOnce(sport: string, teamId: string, timeoutMs: number): Promise<RosterPlayer[]> {
  const path = SPORT_TO_PATH[sport]!;
  const url = `${ESPN_BASE}/${path.sport}/${path.league}/teams/${teamId}/roster`;
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "LiveEdgeEngine/1.0" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = (await r.json()) as any;

  const players: RosterPlayer[] = [];
  if (Array.isArray(j.athletes)) {
    for (const item of j.athletes) {
      if (Array.isArray(item?.items)) {
        for (const p of item.items) players.push(toPlayer(p));
      } else if (item?.id) {
        players.push(toPlayer(item));
      }
    }
  }
  return players;
}

async function fetchRoster(sport: string, teamId: string): Promise<RosterPlayer[]> {
  if (!teamId) return [];
  const key = `${sport}:${teamId}`;
  const cached = rosterCache.get(key);
  if (cached && Date.now() - cached.ts < ROSTER_TTL) return cached.players;

  const path = SPORT_TO_PATH[sport];
  if (!path) return [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const players = await fetchRosterOnce(sport, teamId, attempt === 0 ? 6000 : 9000);
      rosterCache.set(key, { ts: Date.now(), players });
      return players;
    } catch (err) {
      if (attempt === 1) {
        logger.warn({ err: String(err), sport, teamId }, "roster fetch failed after retry");
        return [];
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return [];
}

async function batchedMap<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
  }
  return out;
}

// ── Player selection ───────────────────────────────────────────────────────
function pickMarqueePlayers(roster: RosterPlayer[], sport: string, teamAbbr: string, count: number): RosterPlayer[] {
  const valid = roster.filter((p) => p.id && p.fullName && p.position);
  const stars = getStars(sport, teamAbbr);

  // First pass: match curated star list (preserve curated order = priority)
  const starPicks: RosterPlayer[] = [];
  for (const starName of stars) {
    const found = valid.find((p) => matchesAnyStar(p.fullName, [starName]));
    if (found && !starPicks.find((x) => x.id === found.id)) starPicks.push(found);
    if (starPicks.length >= count) break;
  }
  if (starPicks.length >= count) return starPicks.slice(0, count);

  // Second pass: fill from peak-career players (3-12 years exp = prime stars)
  const fallback = valid
    .filter((p) => !starPicks.find((x) => x.id === p.id))
    .filter((p) => p.experienceYears >= 3 && p.experienceYears <= 12)
    .sort((a, b) => b.experienceYears - a.experienceYears);

  for (const p of fallback) {
    starPicks.push(p);
    if (starPicks.length >= count) break;
  }

  // Last resort: any valid player
  if (starPicks.length < count) {
    for (const p of valid) {
      if (!starPicks.find((x) => x.id === p.id)) {
        starPicks.push(p);
        if (starPicks.length >= count) break;
      }
    }
  }

  return starPicks.slice(0, count);
}

// ── Prop synthesis ─────────────────────────────────────────────────────────
function getTemplatesFor(sport: string, position: string): PropTemplate[] {
  if (sport === "NBA") {
    return NBA_TEMPLATES_BY_POS[position] ?? NBA_TEMPLATES_BY_POS["F"]!;
  }
  if (sport === "MLB") {
    const isPitcher = position === "SP" || position === "RP" || position === "P";
    return isPitcher ? MLB_PITCHER_TEMPLATES : MLB_BATTER_TEMPLATES;
  }
  return [{ type: "Points", baseline: 10, variance: 3, weight: 1 }];
}

function buildProp(
  game: Game,
  player: RosterPlayer,
  isHome: boolean,
  index: number,
  dateKey: string,
): PlayerProp | null {
  const sport = game.sport;
  const headshotFn = HEADSHOT[sport];
  if (!headshotFn) return null;

  const team = isHome ? game.homeTeam : game.awayTeam;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  const seed = `${dateKey}:${player.id}:${game.id}`;
  const rand = seededRandom(seed);

  const templates = getTemplatesFor(sport, player.position);
  const template = pickWeighted(templates, rand);

  // Player skill multiplier from experience (2 yrs = 0.85x, 5+ yrs = 1.1x, 10+ yrs = 1.2x)
  const skillMult =
    player.experienceYears >= 10 ? 1.2 :
    player.experienceYears >= 5 ? 1.1 :
    player.experienceYears >= 2 ? 1.0 :
    0.85;

  const playerBaseline = template.baseline * skillMult;
  // Stat counts can never be negative — clamp to a small positive floor.
  const minStat = 0.1;
  const avg10 = Math.max(minStat, playerBaseline + (rand() - 0.5) * template.variance * 2);
  const avg5 = Math.max(minStat, avg10 + (rand() - 0.5) * template.variance * 1.4);
  // Sportsbook line is set near avg10 with bias — sometimes off by a lot, creating edge
  const lineBias = (rand() - 0.5) * template.variance * 1.2;
  const line = roundLine(Math.max(0.5, avg10 + lineBias));

  const lineGap = avg5 - line;
  const gapRatio = lineGap / Math.max(0.5, template.variance);
  const hitRate10 = Math.min(0.95, Math.max(0.15, 0.5 + gapRatio * 0.35 + (rand() - 0.5) * 0.12));
  const hitRate5 = Math.min(0.95, Math.max(0.15, hitRate10 + (rand() - 0.5) * 0.2));
  const consistency = Math.min(0.95, Math.max(0.45, 0.6 + (player.experienceYears / 20) + (rand() - 0.5) * 0.15));

  const trendVal = avg5 - avg10;
  const trend: "up" | "down" | "flat" =
    trendVal > template.variance * 0.2 ? "up" :
    trendVal < -template.variance * 0.2 ? "down" : "flat";

  // Edge score 0-10
  const gapScore = Math.min(4.5, Math.abs(gapRatio) * 4);
  const hitScore = Math.abs(hitRate5 - 0.5) * 7;
  const consScore = consistency * 2.2;
  const trendBoost =
    (trend === "up" && lineGap > 0) || (trend === "down" && lineGap < 0) ? 0.8 : 0;
  let edgeScore = Math.min(10, gapScore + hitScore + consScore + trendBoost);
  edgeScore = Math.round(edgeScore * 10) / 10;

  const isOver = lineGap > 0;

  // Win probability — model's belief that the recommended side hits.
  // Anchored on hitRate10 (already factors in lineGap), then dampened toward
  // 50% when consistency is low (less trustworthy signal). Stays inside a
  // realistic 30–88% band so we never imply certainty we don't have.
  const sideHitRate = isOver ? hitRate10 : 1 - hitRate10;
  const consistencyWeight = 0.5 + consistency * 0.5; // 0.7 → 0.975
  let winProbabilityRaw = 50 + (sideHitRate * 100 - 50) * consistencyWeight;
  // Trend agreement nudges ±3 pts
  if ((trend === "up" && isOver) || (trend === "down" && !isOver)) winProbabilityRaw += 3;
  if ((trend === "down" && isOver) || (trend === "up" && !isOver)) winProbabilityRaw -= 3;
  const winProbability = Math.round(Math.min(88, Math.max(30, winProbabilityRaw)));
  let recommendation: PlayerProp["recommendation"];
  let action: PlayerProp["action"];
  if (edgeScore >= 8 && isOver) { recommendation = "Strong Over"; action = "Strong Play"; }
  else if (edgeScore >= 8 && !isOver) { recommendation = "Strong Under"; action = "Strong Play"; }
  else if (edgeScore >= 6.5 && isOver) { recommendation = "Lean Over"; action = "Lean"; }
  else if (edgeScore >= 6.5 && !isOver) { recommendation = "Lean Under"; action = "Lean"; }
  else if (edgeScore < 4.5 && Math.abs(lineGap) < template.variance * 0.1) {
    recommendation = isOver ? "Lean Under" : "Lean Over";
    action = "Trap Line";
  } else {
    recommendation = "Avoid";
    action = "Avoid";
  }

  const confidence: "High" | "Medium" | "Low" =
    edgeScore >= 7.5 ? "High" : edgeScore >= 5.5 ? "Medium" : "Low";

  const redFlags: string[] = [];
  if (trend === "down" && isOver) redFlags.push("Downward trend");
  if (consistency < 0.55) redFlags.push("High game-to-game variance");
  if (Math.abs(lineGap) < template.variance * 0.05) redFlags.push("Minimal line gap");
  if (action === "Trap Line") redFlags.push("Line appears inflated relative to recent form");

  const reasoning = action === "Strong Play"
    ? `${player.fullName} averaging ${avg5.toFixed(1)} ${template.type.toLowerCase()} over last 5, hitting this line ${Math.round(hitRate10 * 10)} of last 10. Line gap of ${lineGap.toFixed(1)} ${isOver ? "favors over" : "favors under"}. ${trend === "up" ? "Sharp upward trend" : trend === "down" ? "Recent dip noted" : "Steady production"}.`
    : action === "Lean"
    ? `${player.fullName}'s recent average (${avg5.toFixed(1)}) sits ${Math.abs(lineGap).toFixed(1)} ${isOver ? "above" : "below"} the line. Hit rate at ${Math.round(hitRate10 * 100)}% over 10 games. Moderate edge — size accordingly.`
    : action === "Trap Line"
    ? `Line set close to ${player.fullName}'s baseline but recent form suggests fade. Variance is high — sportsbooks may be inviting public action on this line.`
    : `No meaningful edge detected. ${player.fullName} averaging ${avg5.toFixed(1)} vs line ${line}. Skip or wait for line movement.`;

  const riskWarning = action === "Trap Line"
    ? "High risk — potential trap line. Sharp money typically fades the obvious side."
    : action === "Avoid"
    ? "Skip — not enough edge to justify risk."
    : "";

  return {
    id: index + 1,
    sport,
    playerName: player.fullName,
    playerImage: headshotFn(player.id),
    teamAbbr: team.abbreviation,
    teamLogo: team.logoUrl,
    opponentAbbr: opponent.abbreviation,
    opponentLogo: opponent.logoUrl,
    propType: template.type,
    line,
    avg5: Math.round(avg5 * 10) / 10,
    avg10: Math.round(avg10 * 10) / 10,
    hitRate5: Math.round(hitRate5 * 100) / 100,
    hitRate10: Math.round(hitRate10 * 100) / 100,
    lineGap: Math.round(lineGap * 10) / 10,
    consistency: Math.round(consistency * 100) / 100,
    trend,
    edgeScore,
    winProbability,
    confidence,
    recommendation,
    action,
    reasoning,
    redFlags,
    riskWarning,
    gameId: game.id,
    gameLabel: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`,
    gameStartTime: game.startTime,
    createdAt: new Date().toISOString(),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getTodayProps(sport?: string): Promise<PlayerProp[]> {
  if (propsCache && Date.now() - propsCache.ts < PROPS_TTL) {
    const all = propsCache.props;
    return sport && sport !== "ALL" ? all.filter((p) => p.sport === sport) : all;
  }

  const { games } = await getTodayGames("ALL");
  const eligible = games.filter((g) => g.homeTeam.id && g.awayTeam.id);

  // Pre-fetch all unique team rosters in small concurrent batches so we don't
  // hammer ESPN with 30+ simultaneous requests (which causes silent failures).
  const teamPairs = new Map<string, { sport: string; teamId: string }>();
  for (const g of eligible) {
    teamPairs.set(`${g.sport}:${g.awayTeam.id}`, { sport: g.sport, teamId: g.awayTeam.id });
    teamPairs.set(`${g.sport}:${g.homeTeam.id}`, { sport: g.sport, teamId: g.homeTeam.id });
  }
  await batchedMap(Array.from(teamPairs.values()), 4, ({ sport, teamId }) => fetchRoster(sport, teamId));

  const dateKey = new Date().toISOString().split("T")[0]!;
  const props: PlayerProp[] = [];
  let idx = 0;

  for (const game of eligible) {
    try {
      const playersPerTeam = 2;
      const [awayRoster, homeRoster] = await Promise.all([
        fetchRoster(game.sport, game.awayTeam.id),
        fetchRoster(game.sport, game.homeTeam.id),
      ]);
      const awayPicks = pickMarqueePlayers(awayRoster, game.sport, game.awayTeam.abbreviation, playersPerTeam);
      const homePicks = pickMarqueePlayers(homeRoster, game.sport, game.homeTeam.abbreviation, playersPerTeam);

      for (const p of awayPicks) {
        const prop = buildProp(game, p, false, idx++, dateKey);
        if (prop) props.push(prop);
      }
      for (const p of homePicks) {
        const prop = buildProp(game, p, true, idx++, dateKey);
        if (prop) props.push(prop);
      }
    } catch (err) {
      logger.warn({ err: String(err), gameId: game.id }, "prop generation failed for game");
    }
  }

  // Sort by edge score, then balance representation across sports via round-robin
  // so a high-volume sport (MLB has more games) doesn't squeeze out NBA entirely.
  props.sort((a, b) => b.edgeScore - a.edgeScore);
  const bySport = new Map<string, PlayerProp[]>();
  for (const p of props) {
    if (!bySport.has(p.sport)) bySport.set(p.sport, []);
    bySport.get(p.sport)!.push(p);
  }
  const TARGET = 30;
  const top: PlayerProp[] = [];
  const queues = Array.from(bySport.values());
  while (top.length < TARGET && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      if (top.length >= TARGET) break;
      const next = q.shift();
      if (next) top.push(next);
    }
  }
  // Final sort by edge score so the dashboard shows best edges first
  top.sort((a, b) => b.edgeScore - a.edgeScore);

  propsCache = { ts: Date.now(), props: top };
  return sport && sport !== "ALL" ? top.filter((p) => p.sport === sport) : top;
}

export async function getLiveEdges(): Promise<LiveEdge[]> {
  const props = await getTodayProps();
  const { games } = await getTodayGames("ALL");
  const liveGameIds = new Set(games.filter((g) => g.isLive).map((g) => g.id));
  const liveProps = props.filter((p) => p.gameId && liveGameIds.has(p.gameId));

  const edges: LiveEdge[] = [];
  let idx = 0;
  const dateKey = new Date().toISOString().split("T")[0]!;

  for (const prop of liveProps) {
    const game = games.find((g) => g.id === prop.gameId);
    if (!game) continue;
    const rand = seededRandom(`live:${dateKey}:${prop.playerName}:${prop.gameId}`);

    // Estimate game progress from period/clock
    const pct = estimateGameProgress(game);
    if (pct <= 0.05) continue;

    // Project current pace based on player's hit rate + some variance
    const paceMultiplier = 0.7 + rand() * 0.7; // 0.7 → 1.4 of expected
    const expectedAtThisPoint = prop.avg10 * pct;
    const currentStat = Math.max(0, Math.round(expectedAtThisPoint * paceMultiplier * 10) / 10);
    const projectedFinal = pct > 0 ? Math.round((currentStat / pct) * 10) / 10 : 0;
    const liveEdgePercent = ((projectedFinal - prop.line) / prop.line) * 100;
    const neededRemaining = Math.max(0, prop.line - currentStat);

    let liveRecommendation: LiveEdge["liveRecommendation"];
    if (liveEdgePercent >= 15) liveRecommendation = "Strong Live Over";
    else if (liveEdgePercent >= 5) liveRecommendation = "Lean Live Over";
    else if (liveEdgePercent <= -15) liveRecommendation = "Strong Live Under";
    else if (liveEdgePercent <= -5) liveRecommendation = "Lean Live Under";
    else liveRecommendation = "Avoid";

    edges.push({
      id: ++idx,
      propId: prop.id,
      playerName: prop.playerName,
      playerImage: prop.playerImage,
      teamAbbr: prop.teamAbbr,
      propType: prop.propType,
      line: prop.line,
      currentStat,
      minutesPlayed: Math.round(48 * pct),
      percentComplete: Math.round(pct * 100) / 100,
      projectedFinal,
      neededRemaining: Math.round(neededRemaining * 10) / 10,
      liveEdgePercent: Math.round(liveEdgePercent * 10) / 10,
      liveRecommendation,
      sport: prop.sport,
      gameStatus: "live",
      period: game.period,
      clock: game.clock,
      updatedAt: new Date().toISOString(),
    });
  }

  edges.sort((a, b) => Math.abs(b.liveEdgePercent) - Math.abs(a.liveEdgePercent));
  return edges.slice(0, 12);
}

function estimateGameProgress(game: Game): number {
  if (game.status === "final") return 1;
  if (!game.isLive) return 0;

  const period = game.period ?? "";
  if (game.sport === "NBA") {
    if (period.includes("1st")) return 0.15;
    if (period.includes("2nd")) return 0.4;
    if (period.includes("Half")) return 0.5;
    if (period.includes("3rd")) return 0.65;
    if (period.includes("4th")) return 0.9;
    if (period.includes("OT")) return 1;
  }
  if (game.sport === "MLB") {
    const innMatch = period.match(/(\d+)/);
    if (innMatch?.[1]) {
      const inn = Number(innMatch[1]);
      const half = period.startsWith("Bot") ? 0.5 : 0;
      return Math.min(1, (inn - 1 + half) / 9);
    }
  }
  return 0.5;
}

export function clearPropsCache(): void {
  propsCache = null;
}
