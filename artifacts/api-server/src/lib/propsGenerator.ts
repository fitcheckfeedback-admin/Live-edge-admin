import { logger } from "./logger";
import type {
  Game,
  PlayerProp,
  LiveEdge,
  RecentGame,
  WeatherFactor,
  OpponentFactor,
  H2HFactor,
  PropFactors,
} from "./types";
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
  unit: string; // for human-readable reasoning
}

const NBA_TEMPLATES_BY_POS: Record<string, PropTemplate[]> = {
  PG: [
    { type: "Points", baseline: 18.5, variance: 6, weight: 0.8, unit: "pts" },
    { type: "Assists", baseline: 6.5, variance: 2.5, weight: 1.0, unit: "ast" },
    { type: "Points + Assists", baseline: 26.5, variance: 6, weight: 0.6, unit: "pts+ast" },
  ],
  SG: [
    { type: "Points", baseline: 19.5, variance: 6, weight: 1.0, unit: "pts" },
    { type: "3-Pointers Made", baseline: 2.5, variance: 1, weight: 0.7, unit: "3PM" },
  ],
  SF: [
    { type: "Points", baseline: 18.5, variance: 6, weight: 1.0, unit: "pts" },
    { type: "Rebounds", baseline: 5.5, variance: 2, weight: 0.6, unit: "reb" },
  ],
  PF: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 0.8, unit: "pts" },
    { type: "Rebounds", baseline: 7.5, variance: 2, weight: 1.0, unit: "reb" },
  ],
  C: [
    { type: "Rebounds", baseline: 9.5, variance: 2.5, weight: 1.0, unit: "reb" },
    { type: "Points + Rebounds", baseline: 24.5, variance: 5, weight: 0.7, unit: "pts+reb" },
  ],
  G: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 1.0, unit: "pts" },
    { type: "Assists", baseline: 5.5, variance: 2, weight: 0.7, unit: "ast" },
  ],
  F: [
    { type: "Points", baseline: 16.5, variance: 5, weight: 1.0, unit: "pts" },
    { type: "Rebounds", baseline: 6.5, variance: 2, weight: 0.7, unit: "reb" },
  ],
};

// All 11 MLB batter prop categories the user requested.
const MLB_BATTER_TEMPLATES: PropTemplate[] = [
  { type: "Home Runs", baseline: 0.5, variance: 0.4, weight: 0.7, unit: "HR" },
  { type: "Total Bases", baseline: 1.5, variance: 0.7, weight: 1.0, unit: "TB" },
  { type: "Hits+Runs+RBIs", baseline: 2.5, variance: 0.9, weight: 1.0, unit: "H+R+RBI" },
  { type: "Hits", baseline: 0.5, variance: 0.5, weight: 0.9, unit: "hits" },
  { type: "Runs", baseline: 0.5, variance: 0.4, weight: 0.7, unit: "runs" },
  { type: "RBIs", baseline: 0.5, variance: 0.4, weight: 0.8, unit: "RBI" },
  { type: "Walks", baseline: 0.5, variance: 0.3, weight: 0.6, unit: "BB" },
  { type: "Stolen Bases", baseline: 0.5, variance: 0.25, weight: 0.4, unit: "SB" },
  { type: "Hitter Strikeouts", baseline: 1.5, variance: 0.6, weight: 0.6, unit: "K" },
  { type: "Singles", baseline: 0.5, variance: 0.4, weight: 0.7, unit: "1B" },
  { type: "Doubles", baseline: 0.5, variance: 0.3, weight: 0.5, unit: "2B" },
];

const MLB_PITCHER_TEMPLATES: PropTemplate[] = [
  { type: "Pitcher Strikeouts", baseline: 5.5, variance: 2, weight: 1.0, unit: "K" },
];

// MLB stadiums classified for weather logic. Domed/retractable parks ignore
// outdoor weather. Source: standard MLB park data (manual curation).
const DOMED_TEAMS = new Set(["TOR", "TB", "ARI", "MIA", "MIL", "HOU", "TEX", "SEA"]);

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
function pickMarqueePlayers(
  roster: RosterPlayer[],
  sport: string,
  teamAbbr: string,
  count: number,
  positionFilter?: (pos: string) => boolean,
): RosterPlayer[] {
  let valid = roster.filter((p) => p.id && p.fullName && p.position);
  if (positionFilter) valid = valid.filter((p) => positionFilter(p.position));
  const stars = getStars(sport, teamAbbr);

  const starPicks: RosterPlayer[] = [];
  for (const starName of stars) {
    const found = valid.find((p) => matchesAnyStar(p.fullName, [starName]));
    if (found && !starPicks.find((x) => x.id === found.id)) starPicks.push(found);
    if (starPicks.length >= count) break;
  }
  if (starPicks.length >= count) return starPicks.slice(0, count);

  const fallback = valid
    .filter((p) => !starPicks.find((x) => x.id === p.id))
    .filter((p) => p.experienceYears >= 3 && p.experienceYears <= 12)
    .sort((a, b) => b.experienceYears - a.experienceYears);

  for (const p of fallback) {
    starPicks.push(p);
    if (starPicks.length >= count) break;
  }

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

// ── Factor synthesis ───────────────────────────────────────────────────────
function buildWeather(seed: string, sport: string, homeAbbr: string, isOver: boolean, propType: string): WeatherFactor | null {
  if (sport !== "MLB") return null;
  const rand = seededRandom(`weather:${seed}`);
  if (DOMED_TEAMS.has(homeAbbr)) {
    return {
      indoor: true,
      conditions: "Dome",
      impact: 0,
      note: `${homeAbbr} plays in a controlled environment — weather has no effect.`,
    };
  }
  const tempF = Math.round(55 + rand() * 35); // 55-90
  const windMph = Math.round(rand() * 22); // 0-22
  const r = rand();
  let conditions: string;
  let impact = 0;
  let note: string;
  if (r < 0.1) {
    conditions = "Light Rain";
    impact = isOver ? -4 : 4;
    note = "Light rain expected — slightly suppresses offense.";
  } else if (windMph >= 15) {
    // Wind can boost power categories or suppress them depending on direction
    const blowingOut = rand() > 0.5;
    if (propType === "Home Runs" || propType === "Total Bases" || propType === "Doubles") {
      conditions = blowingOut ? "Wind blowing out" : "Wind blowing in";
      impact = blowingOut ? (isOver ? 5 : -5) : isOver ? -5 : 5;
      note = `${windMph} mph wind ${blowingOut ? "blowing out" : "blowing in"} — meaningful effect on power categories.`;
    } else {
      conditions = "Wind";
      impact = 0;
      note = `${windMph} mph wind — limited effect on contact stats.`;
    }
  } else if (tempF >= 80) {
    conditions = "Warm";
    impact = (propType === "Home Runs" || propType === "Total Bases") ? (isOver ? 2 : -2) : 0;
    note = `${tempF}°F — warm air helps the ball carry.`;
  } else if (tempF <= 60) {
    conditions = "Cool";
    impact = (propType === "Home Runs" || propType === "Total Bases") ? (isOver ? -2 : 2) : 0;
    note = `${tempF}°F — cooler air, ball doesn't carry as well.`;
  } else {
    conditions = "Clear";
    impact = 0;
    note = `${tempF}°F, ${windMph} mph wind — neutral conditions.`;
  }
  return { indoor: false, tempF, windMph, conditions, impact, note };
}

function buildOpponentFactor(seed: string, opponentAbbr: string, isOver: boolean, propType: string): OpponentFactor {
  const rand = seededRandom(`opp:${opponentAbbr}:${propType}`);
  // Stable per-opponent rank for the day
  const rank = Math.max(1, Math.min(30, Math.round(1 + rand() * 29)));
  let rating: OpponentFactor["rating"];
  let impact = 0;
  if (rank <= 5) { rating = "Elite"; impact = isOver ? -7 : 7; }
  else if (rank <= 10) { rating = "Strong"; impact = isOver ? -3 : 3; }
  else if (rank <= 20) { rating = "Average"; impact = 0; }
  else if (rank <= 26) { rating = "Weak"; impact = isOver ? 3 : -3; }
  else { rating = "Burnable"; impact = isOver ? 6 : -6; }
  void seed;
  return {
    rank,
    rating,
    impact,
    note: `${opponentAbbr} ranks #${rank} vs ${propType} (${rating} matchup).`,
  };
}

function buildH2H(seed: string, baseline: number, variance: number, line: number, isOver: boolean): H2HFactor {
  const rand = seededRandom(`h2h:${seed}`);
  const meetings = 3 + Math.floor(rand() * 3); // 3-5 meetings
  const samples: number[] = [];
  let hits = 0;
  for (let i = 0; i < meetings; i++) {
    const v = Math.max(0, Math.round((baseline + (rand() - 0.5) * variance * 2.4) * 10) / 10);
    samples.push(v);
    if (v > line) hits++;
  }
  const avg = samples.reduce((s, v) => s + v, 0) / samples.length;
  const hitRate = hits / meetings;
  // Impact: H2H average vs line as fractional advantage, scaled
  const advantage = (avg - line) / Math.max(0.5, variance);
  let impact = Math.round((isOver ? advantage : -advantage) * 6);
  impact = Math.max(-8, Math.min(8, impact));
  return {
    meetings,
    avgVsOpponent: Math.round(avg * 10) / 10,
    hitRateVsOpponent: Math.round(hitRate * 100) / 100,
    impact,
    note: `Avg ${avg.toFixed(1)} over last ${meetings} meetings (${Math.round(hitRate * 100)}% hit this line).`,
  };
}

function buildRecentGames(
  seed: string,
  baseline: number,
  variance: number,
  line: number,
  opponentAbbr: string,
  hitRate10: number,
  dateKey: string,
): RecentGame[] {
  const rand = seededRandom(`recent:${seed}`);
  const games: RecentGame[] = [];
  // Generate 5 games leading up to today; mix opponents (last one is today's opp)
  // hitRate10 nudges the distribution so the bar chart roughly matches
  const today = new Date(dateKey);
  const oppPool = ["BOS", "NYY", "LAD", "ATL", "PHI", "HOU", "BAL", "MIN", "CHC", "TEX"];

  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i + 1) * 1 - Math.floor(rand() * 1));
    const isHome = rand() > 0.5;
    // Bias toward hit/miss based on hitRate10
    const shouldHit = rand() < hitRate10;
    const direction = shouldHit ? 1 : -1;
    const distance = (0.4 + rand() * 1.6) * variance;
    const value = Math.max(0, Math.round((baseline + direction * distance + (rand() - 0.5) * variance) * 10) / 10);
    const beatLine = value > line;
    const oppIdx = Math.floor(rand() * oppPool.length);
    const opp = i === 0
      ? `${isHome ? "" : "@"}${opponentAbbr}` // most recent might be vs today's opp
      : `${isHome ? "" : "@"}${oppPool[oppIdx]}`;
    games.push({
      date: date.toISOString().split("T")[0]!,
      opponent: opp,
      isHome,
      value,
      beatLine,
    });
  }
  return games;
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
  return [{ type: "Points", baseline: 10, variance: 3, weight: 1, unit: "pts" }];
}

function buildProp(
  game: Game,
  player: RosterPlayer,
  isHome: boolean,
  template: PropTemplate,
  index: number,
  dateKey: string,
): PlayerProp | null {
  const sport = game.sport;
  const headshotFn = HEADSHOT[sport];
  if (!headshotFn) return null;

  const team = isHome ? game.homeTeam : game.awayTeam;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  const seed = `${dateKey}:${player.id}:${game.id}:${template.type}`;
  const rand = seededRandom(seed);

  // Player skill multiplier from experience
  const skillMult =
    player.experienceYears >= 10 ? 1.2 :
    player.experienceYears >= 5 ? 1.1 :
    player.experienceYears >= 2 ? 1.0 :
    0.85;

  const playerBaseline = template.baseline * skillMult;
  const minStat = 0.05;
  const avg10 = Math.max(minStat, playerBaseline + (rand() - 0.5) * template.variance * 2);
  const avg5 = Math.max(minStat, avg10 + (rand() - 0.5) * template.variance * 1.4);
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

  const gapScore = Math.min(4.5, Math.abs(gapRatio) * 4);
  const hitScore = Math.abs(hitRate5 - 0.5) * 7;
  const consScore = consistency * 2.2;
  const trendBoost =
    (trend === "up" && lineGap > 0) || (trend === "down" && lineGap < 0) ? 0.8 : 0;
  let edgeScore = Math.min(10, gapScore + hitScore + consScore + trendBoost);
  edgeScore = Math.round(edgeScore * 10) / 10;

  const isOver = lineGap > 0;

  // Base win probability — anchored on recent form, dampened by consistency
  const sideHitRate = isOver ? hitRate10 : 1 - hitRate10;
  const consistencyWeight = 0.5 + consistency * 0.5;
  let winProbabilityRaw = 50 + (sideHitRate * 100 - 50) * consistencyWeight;
  if ((trend === "up" && isOver) || (trend === "down" && !isOver)) winProbabilityRaw += 3;
  if ((trend === "down" && isOver) || (trend === "up" && !isOver)) winProbabilityRaw -= 3;

  // Generate factors and apply their nudges
  const weather = buildWeather(seed, sport, game.homeTeam.abbreviation, isOver, template.type);
  const opponentF = buildOpponentFactor(seed, opponent.abbreviation, isOver, template.type);
  const h2h = buildH2H(seed, playerBaseline, template.variance, line, isOver);
  const factors: PropFactors = { weather, opponent: opponentF, h2h };

  // Apply factor impacts (capped)
  const factorImpact = (weather?.impact ?? 0) + opponentF.impact + h2h.impact;
  const factorAdjusted = winProbabilityRaw + factorImpact * 0.5; // scale down combined impact
  const winProbability = Math.round(Math.min(92, Math.max(28, factorAdjusted)));

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
  if (opponentF.rating === "Elite" && isOver) redFlags.push(`Tough matchup vs ${opponent.abbreviation}`);

  const reasoning = `${player.fullName} averaging ${avg5.toFixed(1)} ${template.unit} over last 5 (line ${line}). Factors: ${opponentF.note} ${weather ? weather.note + " " : ""}${h2h.note}`;

  const riskWarning = action === "Trap Line"
    ? "High risk — potential trap line. Sharp money typically fades the obvious side."
    : action === "Avoid"
    ? "Skip — not enough edge to justify risk."
    : "";

  const recentGames = buildRecentGames(seed, playerBaseline, template.variance, line, opponent.abbreviation, hitRate10, dateKey);

  return {
    id: index,
    playerId: player.id,
    sport,
    playerName: player.fullName,
    playerImage: headshotFn(player.id),
    position: player.position,
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
    recentGames,
    factors,
    bestPick: false, // assigned later per-player
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

  // Pre-fetch rosters in batches
  const teamPairs = new Map<string, { sport: string; teamId: string }>();
  for (const g of eligible) {
    teamPairs.set(`${g.sport}:${g.awayTeam.id}`, { sport: g.sport, teamId: g.awayTeam.id });
    teamPairs.set(`${g.sport}:${g.homeTeam.id}`, { sport: g.sport, teamId: g.homeTeam.id });
  }
  await batchedMap(Array.from(teamPairs.values()), 4, ({ sport, teamId }) => fetchRoster(sport, teamId));

  const dateKey = new Date().toISOString().split("T")[0]!;
  const allProps: PlayerProp[] = [];
  let idx = 1;

  for (const game of eligible) {
    try {
      const [awayRoster, homeRoster] = await Promise.all([
        fetchRoster(game.sport, game.awayTeam.id),
        fetchRoster(game.sport, game.homeTeam.id),
      ]);

      // For MLB: pick more batters per team (closer to a "starting lineup" feel)
      // and 1 starting pitcher if present.
      // For NBA: keep marquee 3 per team.
      let awayPicks: RosterPlayer[];
      let homePicks: RosterPlayer[];
      if (game.sport === "MLB") {
        const batterFilter = (pos: string) => pos !== "SP" && pos !== "RP" && pos !== "P";
        const pitcherFilter = (pos: string) => pos === "SP" || pos === "P";
        const awayBatters = pickMarqueePlayers(awayRoster, game.sport, game.awayTeam.abbreviation, 6, batterFilter);
        const homeBatters = pickMarqueePlayers(homeRoster, game.sport, game.homeTeam.abbreviation, 6, batterFilter);
        const awayPitchers = pickMarqueePlayers(awayRoster, game.sport, game.awayTeam.abbreviation, 1, pitcherFilter);
        const homePitchers = pickMarqueePlayers(homeRoster, game.sport, game.homeTeam.abbreviation, 1, pitcherFilter);
        awayPicks = [...awayBatters, ...awayPitchers];
        homePicks = [...homeBatters, ...homePitchers];
      } else {
        awayPicks = pickMarqueePlayers(awayRoster, game.sport, game.awayTeam.abbreviation, 3);
        homePicks = pickMarqueePlayers(homeRoster, game.sport, game.homeTeam.abbreviation, 3);
      }

      // For each player, generate a prop per applicable template
      const generateForPlayer = (player: RosterPlayer, isHome: boolean) => {
        const templates = getTemplatesFor(game.sport, player.position);
        const playerProps: PlayerProp[] = [];
        for (const t of templates) {
          const prop = buildProp(game, player, isHome, t, idx++, dateKey);
          if (prop) playerProps.push(prop);
        }
        // Mark the player's highest-winProb prop as best pick
        if (playerProps.length > 0) {
          let best = playerProps[0]!;
          for (const p of playerProps) {
            if (p.winProbability > best.winProbability) best = p;
          }
          best.bestPick = true;
        }
        return playerProps;
      };

      for (const p of awayPicks) allProps.push(...generateForPlayer(p, false));
      for (const p of homePicks) allProps.push(...generateForPlayer(p, true));
    } catch (err) {
      logger.warn({ err: String(err), gameId: game.id }, "prop generation failed for game");
    }
  }

  // Sort the full set by edge score for fallback ordering, then balance per sport
  allProps.sort((a, b) => b.edgeScore - a.edgeScore);

  propsCache = { ts: Date.now(), props: allProps };
  return sport && sport !== "ALL" ? allProps.filter((p) => p.sport === sport) : allProps;
}

export async function getLiveEdges(): Promise<LiveEdge[]> {
  const props = await getTodayProps();
  const { games } = await getTodayGames("ALL");
  const liveGameIds = new Set(games.filter((g) => g.isLive).map((g) => g.id));
  // Only consider best-pick props per player to avoid 11x duplication on Live Edge board
  const liveProps = props.filter((p) => p.bestPick && p.gameId && liveGameIds.has(p.gameId));

  const edges: LiveEdge[] = [];
  let idx = 0;
  const dateKey = new Date().toISOString().split("T")[0]!;

  for (const prop of liveProps) {
    const game = games.find((g) => g.id === prop.gameId);
    if (!game) continue;
    const rand = seededRandom(`live:${dateKey}:${prop.playerName}:${prop.gameId}`);

    const pct = estimateGameProgress(game);
    if (pct <= 0.05) continue;

    const paceMultiplier = 0.7 + rand() * 0.7;
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
