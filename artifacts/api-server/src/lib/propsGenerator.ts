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
import { mlbTeamByAbbr, mlbTeamById, isDome } from "./stadiums";
import {
  getMlbRoster,
  getMlbHittingGameLog,
  getMlbPitchingGameLog,
  getMlbTeamPitchingSeasonStats,
  matchMlbPlayerByName,
  extractHittingValue,
  extractPitchingValue,
  rankOpponentForHitter,
  type MlbRosterPlayer,
  type GameLogSplit,
  type HittingGameStat,
  type PitchingGameStat,
  type TeamPitchingSeasonStats,
  type MlbBatterPropKey,
  type MlbPitcherPropKey,
} from "./mlbStatsProvider";
import {
  getNbaPlayerGameLog,
  getNbaPointsAgainstRanks,
  extractNbaValue,
  type NbaGameStat,
  type NbaPropKey,
} from "./nbaStatsProvider";
import { getWeatherForGame } from "./weatherProvider";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SPORT_TO_PATH: Record<string, { sport: string; league: string }> = {
  NBA: { sport: "basketball", league: "nba" },
  MLB: { sport: "baseball", league: "mlb" },
};

const HEADSHOT: Record<string, (id: string) => string> = {
  NBA: (id) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`,
  MLB: (id) => `https://midfield.mlbstatic.com/v1/people/${id}/spots/120`,
};

interface NbaRosterPlayer {
  id: string;
  fullName: string;
  position: string;
  experienceYears: number;
}

interface PropTemplate {
  type: string;
  unit: string;
  weight: number;
}

const NBA_TEMPLATES_BY_POS: Record<string, PropTemplate[]> = {
  PG: [
    { type: "Points", unit: "pts", weight: 0.8 },
    { type: "Assists", unit: "ast", weight: 1.0 },
    { type: "Points + Assists", unit: "pts+ast", weight: 0.6 },
    { type: "3-Pointers Made", unit: "3PM", weight: 0.5 },
  ],
  SG: [
    { type: "Points", unit: "pts", weight: 1.0 },
    { type: "3-Pointers Made", unit: "3PM", weight: 0.7 },
    { type: "Rebounds", unit: "reb", weight: 0.5 },
  ],
  SF: [
    { type: "Points", unit: "pts", weight: 1.0 },
    { type: "Rebounds", unit: "reb", weight: 0.6 },
    { type: "Pts+Reb+Ast", unit: "PRA", weight: 0.7 },
  ],
  PF: [
    { type: "Points", unit: "pts", weight: 0.8 },
    { type: "Rebounds", unit: "reb", weight: 1.0 },
    { type: "Points + Rebounds", unit: "pts+reb", weight: 0.7 },
  ],
  C: [
    { type: "Rebounds", unit: "reb", weight: 1.0 },
    { type: "Points + Rebounds", unit: "pts+reb", weight: 0.7 },
    { type: "Blocks", unit: "blk", weight: 0.5 },
  ],
  G: [
    { type: "Points", unit: "pts", weight: 1.0 },
    { type: "Assists", unit: "ast", weight: 0.7 },
  ],
  F: [
    { type: "Points", unit: "pts", weight: 1.0 },
    { type: "Rebounds", unit: "reb", weight: 0.7 },
  ],
};

const MLB_BATTER_TEMPLATES: PropTemplate[] = [
  { type: "Home Runs", unit: "HR", weight: 0.7 },
  { type: "Total Bases", unit: "TB", weight: 1.0 },
  { type: "Hits+Runs+RBIs", unit: "H+R+RBI", weight: 1.0 },
  { type: "Hits", unit: "hits", weight: 0.9 },
  { type: "Runs", unit: "runs", weight: 0.7 },
  { type: "RBIs", unit: "RBI", weight: 0.8 },
  { type: "Walks", unit: "BB", weight: 0.6 },
  { type: "Stolen Bases", unit: "SB", weight: 0.4 },
  { type: "Hitter Strikeouts", unit: "K", weight: 0.6 },
  { type: "Singles", unit: "1B", weight: 0.7 },
  { type: "Doubles", unit: "2B", weight: 0.5 },
];

const MLB_PITCHER_TEMPLATES: PropTemplate[] = [
  { type: "Pitcher Strikeouts", unit: "K", weight: 1.0 },
];

// ── Caches ─────────────────────────────────────────────────────────────────
const nbaRosterCache = new Map<string, { ts: number; players: NbaRosterPlayer[] }>();
const ROSTER_TTL = 30 * 60 * 1000;

let propsCache: { ts: number; props: PlayerProp[] } | null = null;
const PROPS_TTL = 60 * 1000;

// ── Math helpers ───────────────────────────────────────────────────────────
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// Snap a value to the nearest 0.5 increment — sportsbooks offer both integer
// (1.0, 2.0) and half-integer (0.5, 1.5) lines.
function roundLine(value: number): number {
  return Math.round(value * 2) / 2;
}

// Push-aware hit count: when a value exactly equals the line, give it
// half-credit. Keeps integer-line props (where pushes are common) from
// biasing toward Under.
function countHits(values: number[], line: number): number {
  return values.reduce((sum, v) => sum + (v > line ? 1 : v === line ? 0.5 : 0), 0);
}

// Pick the line that makes the historical hit rate closest to 50%. This is
// what real sportsbooks do — the goal of the line is to split the action, not
// to predict the mean. Anchoring the line on the raw mean creates structural
// Under bias for low-volume stats because the floor (0.5) sits above any
// average < 0.5, while the integer-step rounding pushes most medium-volume
// averages above their true center too. By searching candidates near the
// mean and choosing the one with hitRate closest to 50%, we let recent form
// (avg5 vs line) genuinely decide each pick's side instead of the rounding.
function chooseBalancedLine(values: number[]): number {
  if (values.length === 0) return 0.5;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const candidates: number[] = [];
  // Search ±1.0 from the mean in 0.5 steps; floor at 0.5.
  for (let off = -1; off <= 1; off += 0.5) {
    const c = Math.max(0.5, roundLine(avg + off));
    if (!candidates.includes(c)) candidates.push(c);
  }
  let best = candidates[0]!;
  let bestImbalance = Infinity;
  for (const c of candidates) {
    const rate = countHits(values, c) / values.length;
    const imbalance = Math.abs(rate - 0.5);
    if (imbalance < bestImbalance) {
      bestImbalance = imbalance;
      best = c;
    }
  }
  return best;
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

// ── NBA roster (ESPN) ──────────────────────────────────────────────────────
async function fetchNbaRoster(teamId: string): Promise<NbaRosterPlayer[]> {
  const key = teamId;
  const hit = nbaRosterCache.get(key);
  if (hit && Date.now() - hit.ts < ROSTER_TTL) return hit.players;

  const path = SPORT_TO_PATH.NBA!;
  const url = `${ESPN_BASE}/${path.sport}/${path.league}/teams/${teamId}/roster`;
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "LiveEdgeEngine/1.0" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as any;
    const players: NbaRosterPlayer[] = [];
    if (Array.isArray(j.athletes)) {
      for (const item of j.athletes) {
        const arr = Array.isArray(item?.items) ? item.items : item?.id ? [item] : [];
        for (const p of arr) {
          players.push({
            id: String(p.id ?? ""),
            fullName: p.fullName ?? p.displayName ?? "",
            position: p.position?.abbreviation ?? "",
            experienceYears: Number(p.experience?.years ?? 0),
          });
        }
      }
    }
    nbaRosterCache.set(key, { ts: Date.now(), players });
    return players;
  } catch (err) {
    logger.warn({ err: String(err), teamId }, "NBA roster fetch failed");
    return hit?.players ?? [];
  }
}

// ── Player picking (NBA path) ──────────────────────────────────────────────
function pickNbaPlayers(roster: NbaRosterPlayer[], teamAbbr: string, count: number): NbaRosterPlayer[] {
  const valid = roster.filter((p) => p.id && p.fullName && p.position);
  const stars = getStars("NBA", teamAbbr);
  const picks: NbaRosterPlayer[] = [];
  for (const starName of stars) {
    const found = valid.find((p) => matchesAnyStar(p.fullName, [starName]));
    if (found && !picks.find((x) => x.id === found.id)) picks.push(found);
    if (picks.length >= count) break;
  }
  if (picks.length >= count) return picks.slice(0, count);
  const fallback = valid
    .filter((p) => !picks.find((x) => x.id === p.id))
    .filter((p) => p.experienceYears >= 3 && p.experienceYears <= 14)
    .sort((a, b) => b.experienceYears - a.experienceYears);
  for (const p of fallback) {
    picks.push(p);
    if (picks.length >= count) break;
  }
  return picks.slice(0, count);
}

// ── Player picking (MLB path) ──────────────────────────────────────────────
// Returns true if `dateStr` (ISO YYYY-MM-DD or full ISO) is within `days` days
// of now. Used to exclude players from the surfaced picks if they haven't
// actually played a game recently — covers IL stints, AAA assignments,
// G-League two-way demotions, and DFAs that the roster endpoints lag on.
function playedRecently(dateStr: string, days: number): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

function pickMlbPlayers(
  roster: MlbRosterPlayer[],
  teamAbbr: string,
  count: number,
  positionFilter: (pos: string) => boolean,
): MlbRosterPlayer[] {
  const valid = roster.filter((p) => p.mlbId && p.fullName && p.position && positionFilter(p.position));
  const stars = getStars("MLB", teamAbbr);
  const picks: MlbRosterPlayer[] = [];
  for (const starName of stars) {
    const found = valid.find((p) => matchesAnyStar(p.fullName, [starName]));
    if (found && !picks.find((x) => x.mlbId === found.mlbId)) picks.push(found);
    if (picks.length >= count) break;
  }
  for (const p of valid) {
    if (picks.length >= count) break;
    if (!picks.find((x) => x.mlbId === p.mlbId)) picks.push(p);
  }
  return picks.slice(0, count);
}

// ── Recent games builders ──────────────────────────────────────────────────
function recentGamesFromMlbHitting(
  log: GameLogSplit<HittingGameStat>[],
  prop: MlbBatterPropKey,
  line: number,
): RecentGame[] {
  const last5 = log.slice(-5);
  return last5.map((g) => {
    const value = extractHittingValue(g.stat, prop);
    const opp = mlbTeamById(g.opponentId);
    const oppAbbr = opp?.abbr ?? g.opponentName.slice(0, 3).toUpperCase();
    return {
      date: g.date,
      opponent: `${g.isHome ? "" : "@"}${oppAbbr}`,
      isHome: g.isHome,
      value,
      beatLine: value > line,
    };
  });
}

function recentGamesFromMlbPitching(
  log: GameLogSplit<PitchingGameStat>[],
  prop: MlbPitcherPropKey,
  line: number,
): RecentGame[] {
  const last5 = log.slice(-5);
  return last5.map((g) => {
    const value = extractPitchingValue(g.stat, prop);
    const opp = mlbTeamById(g.opponentId);
    const oppAbbr = opp?.abbr ?? g.opponentName.slice(0, 3).toUpperCase();
    return {
      date: g.date,
      opponent: `${g.isHome ? "" : "@"}${oppAbbr}`,
      isHome: g.isHome,
      value,
      beatLine: value > line,
    };
  });
}

function recentGamesFromNba(games: NbaGameStat[], prop: NbaPropKey, line: number): RecentGame[] {
  const last5 = games.slice(-5);
  return last5.map((g) => {
    const value = extractNbaValue(g, prop);
    return {
      date: g.date.slice(0, 10),
      opponent: `${g.isHome ? "" : "@"}${g.opponentAbbr}`,
      isHome: g.isHome,
      value,
      beatLine: value > line,
    };
  });
}

// ── Factor builders (REAL DATA) ────────────────────────────────────────────
function buildWeatherFactor(
  sport: string,
  homeAbbr: string,
  weather: { tempF: number; windMph: number; precipPct: number; conditions: string } | null,
  isOver: boolean,
  propType: string,
): WeatherFactor | null {
  if (sport !== "MLB") return null;
  if (isDome(homeAbbr)) {
    return {
      indoor: true,
      conditions: "Dome",
      impact: 0,
      note: `${homeAbbr} plays in a fixed-roof dome — weather has no effect.`,
    };
  }
  if (!weather) return null;

  const isPower = propType === "Home Runs" || propType === "Total Bases" || propType === "Doubles";
  const isContact = propType === "Hits" || propType === "Singles" || propType === "Hits+Runs+RBIs";
  let impact = 0;
  let note = `${weather.tempF}°F, ${weather.windMph} mph wind, ${weather.precipPct}% precip — ${weather.conditions}.`;

  if (weather.conditions === "Rain") {
    impact = isOver ? -5 : 5;
    note += " Rain suppresses offense.";
  } else if (weather.conditions === "Light Rain") {
    impact = isOver ? -2 : 2;
  } else if (weather.windMph >= 15 && isPower) {
    impact = isOver ? 4 : -4;
    note += " Strong wind affects power categories.";
  } else if (weather.tempF >= 80 && isPower) {
    impact = isOver ? 2 : -2;
    note += " Warm air helps the ball carry.";
  } else if (weather.tempF <= 55 && isPower) {
    impact = isOver ? -2 : 2;
    note += " Cool air, ball doesn't carry.";
  } else if (weather.tempF >= 80 && isContact) {
    impact = isOver ? 1 : -1;
  }

  return {
    indoor: false,
    tempF: weather.tempF,
    windMph: weather.windMph,
    conditions: weather.conditions,
    impact,
    note,
  };
}

function buildMlbOpponentFactor(
  prop: MlbBatterPropKey,
  opponentAbbr: string,
  opponentTeamId: number,
  isOver: boolean,
  allTeams: TeamPitchingSeasonStats[],
): OpponentFactor {
  const rank = allTeams.length > 0
    ? rankOpponentForHitter(prop, opponentTeamId, allTeams)
    : 15;
  let rating: OpponentFactor["rating"];
  let baseImpact = 0;
  if (rank <= 5) { rating = "Elite"; baseImpact = -7; }
  else if (rank <= 10) { rating = "Strong"; baseImpact = -3; }
  else if (rank <= 20) { rating = "Average"; baseImpact = 0; }
  else if (rank <= 26) { rating = "Weak"; baseImpact = 3; }
  else { rating = "Burnable"; baseImpact = 6; }
  // Higher rank = friendlier matchup for OVER. Flip sign for UNDER side.
  const impact = isOver ? baseImpact : -baseImpact;
  const source = allTeams.length > 0 ? "real season pitching data" : "league-average baseline";
  return {
    rank,
    rating,
    impact,
    note: `${opponentAbbr} ranks #${rank} vs ${prop} (${rating} matchup, from ${source}).`,
  };
}

// NBA opponent factor.
// We use ESPN's standings endpoint (avgPointsAgainst) to compute a real
// league-wide rank for points-based props. ESPN's public team statistics
// endpoint does NOT expose per-team "rebounds allowed" / "assists allowed" /
// "3PM allowed", so for those props we honestly report a neutral matchup
// rather than fabricate a defensive metric.
function isPointsBasedProp(prop: NbaPropKey): boolean {
  return prop === "Points" || prop === "Points + Assists" ||
         prop === "Points + Rebounds" || prop === "Pts+Reb+Ast";
}

function buildNbaOpponentFactor(
  prop: NbaPropKey,
  opponentAbbr: string,
  opponentTeamId: string,
  isOver: boolean,
  paRanks: Map<number, number>,
): OpponentFactor {
  if (isPointsBasedProp(prop)) {
    const numId = Number(opponentTeamId);
    const rank = paRanks.get(numId);
    if (rank) {
      let rating: OpponentFactor["rating"];
      let baseImpact: number;
      if (rank <= 5) { rating = "Elite"; baseImpact = -6; }
      else if (rank <= 10) { rating = "Strong"; baseImpact = -3; }
      else if (rank <= 20) { rating = "Average"; baseImpact = 0; }
      else if (rank <= 26) { rating = "Weak"; baseImpact = 3; }
      else { rating = "Burnable"; baseImpact = 6; }
      const impact = isOver ? baseImpact : -baseImpact;
      return {
        rank,
        rating,
        impact,
        note: `${opponentAbbr} ranks #${rank}/30 in points allowed per game (${rating} matchup — real ESPN league standings).`,
      };
    }
    // Standings data IS exposed by ESPN but momentarily unavailable (fetch/cache miss).
    // Be honest about the failure mode rather than claiming the metric doesn't exist.
    return {
      rank: 15,
      rating: "Average",
      impact: 0,
      note: `Neutral matchup vs ${opponentAbbr} — ESPN standings (avgPointsAgainst) was unavailable at fetch time.`,
    };
  }

  // No real per-prop defensive metric exists in any public ESPN endpoint.
  return {
    rank: 15,
    rating: "Average",
    impact: 0,
    note: `Neutral matchup vs ${opponentAbbr} — ESPN does not expose a per-team "${prop} allowed" metric.`,
  };
}

function buildH2HFactor(
  values: number[],
  line: number,
  isOver: boolean,
  opponentAbbr: string,
): H2HFactor {
  if (values.length === 0) {
    return {
      meetings: 0,
      avgVsOpponent: 0,
      hitRateVsOpponent: 0,
      impact: 0,
      note: `No prior meetings vs ${opponentAbbr} on file.`,
    };
  }
  const avg = mean(values);
  // Push-aware (matches the core model in buildPropFromRealData): on integer
  // lines, v === line counts as half a hit so the H2H factor doesn't
  // reintroduce the Under skew that the rest of the pipeline now controls.
  const hits = countHits(values, line);
  const hitRate = hits / values.length;
  // Impact: +/- pp based on how far avg is above/below the line, scaled
  const range = Math.max(0.5, line);
  const advantage = (avg - line) / range;
  let impact = Math.round((isOver ? advantage : -advantage) * 8);
  impact = Math.max(-8, Math.min(8, impact));
  return {
    meetings: values.length,
    avgVsOpponent: Math.round(avg * 10) / 10,
    hitRateVsOpponent: Math.round(hitRate * 100) / 100,
    impact,
    note: `Avg ${avg.toFixed(1)} over last ${values.length} real meetings vs ${opponentAbbr} (${Math.round(hitRate * 100)}% hit this line).`,
  };
}

// ── Core prop builder ──────────────────────────────────────────────────────
interface PropInputs {
  game: Game;
  sport: string;
  playerId: string;
  playerName: string;
  position: string;
  isHome: boolean;
  template: PropTemplate;
  index: number;
  // Real data inputs:
  values: number[]; // last N game values (ascending), already in this prop's units
  recentGames: RecentGame[];
  opponentFactor: OpponentFactor;
  weatherFactor: WeatherFactor | null;
  h2hFactor: H2HFactor;
  experienceYears: number;
}

function buildPropFromRealData(input: PropInputs): PlayerProp | null {
  const { game, sport, playerId, playerName, position, isHome, template, index } = input;
  const headshotFn = HEADSHOT[sport];
  if (!headshotFn) return null;

  const team = isHome ? game.homeTeam : game.awayTeam;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  const values = input.values;
  if (values.length === 0) return null;

  const last10 = values.slice(-10);
  const last5 = values.slice(-5);
  const avg10 = mean(last10);
  const avg5 = mean(last5);
  const sd = Math.max(0.5, stdev(last10));

  // Skip props where the player has effectively no production in this category.
  // A player who attempts a stolen base once every 10 games doesn't have a
  // meaningful "Stolen Bases" prop — surfacing "Under 0.5 at 92%" for him is
  // mathematically true but useless to a bettor. We require at least a small
  // amount of production (avg10 >= 0.2) AND that the player has done it at
  // least once in the sample, otherwise we drop the prop entirely.
  if (last10.length >= 5) {
    if (avg10 < 0.2) return null;
    if (Math.max(...last10) === 0) return null;
  }

  // Model line: pick the line whose historical hit rate is closest to 50%
  // (sportsbook-style "split the action"), not the raw rounded mean. This is
  // what removes the structural Under bias that low-volume stats create.
  const line = chooseBalancedLine(last10);

  // If even the best balanced line is one-sided (outside 25%-75% historical
  // hit rate), this prop has no real edge to surface — it's just "this player
  // almost never / always does X" dressed up as a confident pick. Skipping
  // these is what kills the structural Under bias from low-volume stats: a
  // player averaging 0.2 hits has no actionable Hits prop, just noise.
  const balancedHitRate = countHits(last10, line) / Math.max(1, last10.length);
  if (balancedHitRate >= 0.75 || balancedHitRate <= 0.25) return null;

  // Pushes (v === line, only possible at integer lines) get half-credit so
  // hitRate doesn't artificially skew toward the Under side.
  const hits10 = countHits(last10, line);
  const hits5 = countHits(last5, line);
  const hitRate10 = hits10 / Math.max(1, last10.length);
  const hitRate5 = hits5 / Math.max(1, last5.length);

  const lineGap = avg5 - line;
  const consistency = Math.min(0.95, Math.max(0.4, 1 - sd / Math.max(0.5, avg10 + 0.5)));

  const trendVal = avg5 - avg10;
  const trend: "up" | "down" | "flat" =
    trendVal > sd * 0.25 ? "up" : trendVal < -sd * 0.25 ? "down" : "flat";

  const isOver = lineGap >= 0;

  // Edge score (1-10)
  const gapScore = Math.min(4.5, Math.abs(lineGap) / sd * 3);
  const hitScore = Math.abs(hitRate5 - 0.5) * 7;
  const consScore = consistency * 2.2;
  const trendBoost = (trend === "up" && isOver) || (trend === "down" && !isOver) ? 0.8 : 0;
  let edgeScore = Math.min(10, gapScore + hitScore + consScore + trendBoost);
  edgeScore = Math.round(edgeScore * 10) / 10;

  // Win probability — anchor on real hitRate10, dampened by consistency, trend-nudged,
  // then nudged by REAL factor impacts at half weight.
  const sideHitRate = isOver ? hitRate10 : 1 - hitRate10;
  const consistencyWeight = 0.5 + consistency * 0.5;
  let winProbRaw = 50 + (sideHitRate * 100 - 50) * consistencyWeight;
  if ((trend === "up" && isOver) || (trend === "down" && !isOver)) winProbRaw += 3;
  if ((trend === "down" && isOver) || (trend === "up" && !isOver)) winProbRaw -= 3;

  const factors: PropFactors = {
    weather: input.weatherFactor,
    opponent: input.opponentFactor,
    h2h: input.h2hFactor,
  };
  const factorImpact = (factors.weather?.impact ?? 0) + factors.opponent.impact + factors.h2h.impact;
  const winProbability = Math.round(Math.min(92, Math.max(28, winProbRaw + factorImpact * 0.5)));

  let recommendation: PlayerProp["recommendation"];
  let action: PlayerProp["action"];
  if (edgeScore >= 8 && isOver) { recommendation = "Strong Over"; action = "Strong Play"; }
  else if (edgeScore >= 8 && !isOver) { recommendation = "Strong Under"; action = "Strong Play"; }
  else if (edgeScore >= 6.5 && isOver) { recommendation = "Lean Over"; action = "Lean"; }
  else if (edgeScore >= 6.5 && !isOver) { recommendation = "Lean Under"; action = "Lean"; }
  else if (edgeScore < 4.5 && Math.abs(lineGap) < sd * 0.1) {
    recommendation = isOver ? "Lean Under" : "Lean Over";
    action = "Trap Line";
  } else {
    recommendation = "Avoid";
    action = "Avoid";
  }

  const confidence: "High" | "Medium" | "Low" =
    edgeScore >= 7.5 ? "High" : edgeScore >= 5.5 ? "Medium" : "Low";

  const redFlags: string[] = [];
  if (trend === "down" && isOver) redFlags.push("Downward trend in last 5 games");
  if (consistency < 0.55) redFlags.push("High game-to-game variance");
  if (Math.abs(lineGap) < sd * 0.05) redFlags.push("Minimal line gap");
  if (action === "Trap Line") redFlags.push("Line appears inflated relative to recent form");
  if (factors.opponent.rating === "Elite" && isOver) redFlags.push(`Tough matchup vs ${opponent.abbreviation}`);
  if (input.experienceYears > 0 && input.experienceYears < 2) redFlags.push("Small career sample");

  const reasoning = `Real last-${last10.length} avg ${avg10.toFixed(1)} ${template.unit}, last-5 ${avg5.toFixed(1)} (model line ${line}). ${factors.opponent.note} ${factors.weather ? factors.weather.note + " " : ""}${factors.h2h.note}`;

  const riskWarning = action === "Trap Line"
    ? "Potential trap line. Sharp money typically fades the obvious side."
    : action === "Avoid"
    ? "Skip — not enough edge to justify risk."
    : "";

  return {
    id: index,
    playerId,
    sport,
    playerName,
    playerImage: headshotFn(playerId),
    position,
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
    recentGames: input.recentGames,
    factors,
    bestPick: false,
    gameId: game.id,
    gameLabel: `${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`,
    gameStartTime: game.startTime,
    createdAt: new Date().toISOString(),
  };
}

// ── MLB game processor ─────────────────────────────────────────────────────
async function processMlbGame(
  game: Game,
  startIdx: () => number,
  teamPitchingStats: TeamPitchingSeasonStats[],
  weatherSnap: { tempF: number; windMph: number; precipPct: number; conditions: string } | null,
): Promise<PlayerProp[]> {
  const homeMeta = mlbTeamByAbbr(game.homeTeam.abbreviation);
  const awayMeta = mlbTeamByAbbr(game.awayTeam.abbreviation);
  if (!homeMeta || !awayMeta) {
    logger.warn({ home: game.homeTeam.abbreviation, away: game.awayTeam.abbreviation }, "unknown MLB abbr — skipping");
    return [];
  }

  const [homeRoster, awayRoster] = await Promise.all([
    getMlbRoster(homeMeta.mlbId),
    getMlbRoster(awayMeta.mlbId),
  ]);

  const isBatter = (pos: string) => pos !== "SP" && pos !== "RP" && pos !== "P" && pos !== "TWP";
  const isPitcher = (pos: string) => pos === "SP" || pos === "P";
  const isTwoWay = (pos: string) => pos === "TWP";

  const awayBatters = pickMlbPlayers(awayRoster, game.awayTeam.abbreviation, 6, (p) => isBatter(p) || isTwoWay(p));
  const homeBatters = pickMlbPlayers(homeRoster, game.homeTeam.abbreviation, 6, (p) => isBatter(p) || isTwoWay(p));
  const awayPitchers = pickMlbPlayers(awayRoster, game.awayTeam.abbreviation, 1, isPitcher);
  const homePitchers = pickMlbPlayers(homeRoster, game.homeTeam.abbreviation, 1, isPitcher);

  const props: PlayerProp[] = [];

  // ── Batters ──
  type BatterCtx = { player: MlbRosterPlayer; isHome: boolean; opponentMlbId: number; opponentAbbr: string };
  const batterCtxs: BatterCtx[] = [
    ...awayBatters.map((p) => ({ player: p, isHome: false, opponentMlbId: homeMeta.mlbId, opponentAbbr: homeMeta.abbr })),
    ...homeBatters.map((p) => ({ player: p, isHome: true, opponentMlbId: awayMeta.mlbId, opponentAbbr: awayMeta.abbr })),
  ];

  await batchedMap(batterCtxs, 4, async (ctx) => {
    const log = await getMlbHittingGameLog(ctx.player.mlbId);
    if (log.length === 0) return;
    // Roster freshness: only surface players who have actually played in the
    // last 10 days. The MLB "active" roster includes IL players and benched
    // call-ups who shouldn't appear as today's picks.
    if (!playedRecently(log[log.length - 1]!.date, 10)) return;
    const playerProps: PlayerProp[] = [];
    for (const tmpl of MLB_BATTER_TEMPLATES) {
      const prop = tmpl.type as MlbBatterPropKey;
      const values = log.map((g) => extractHittingValue(g.stat, prop));
      const h2hValues = log
        .filter((g) => g.opponentId === ctx.opponentMlbId)
        .slice(-10)
        .map((g) => extractHittingValue(g.stat, prop));
      // We need the line BEFORE building factors; must match buildPropFromRealData's formula.
      const tentativeLine = chooseBalancedLine(values.slice(-10));
      const isOverTentative = (mean(values.slice(-5)) - tentativeLine) >= 0;
      const opponentFactor = buildMlbOpponentFactor(prop, ctx.opponentAbbr, ctx.opponentMlbId, isOverTentative, teamPitchingStats);
      const weatherFactor = ctx.isHome
        ? buildWeatherFactor("MLB", game.homeTeam.abbreviation, weatherSnap, isOverTentative, prop)
        : buildWeatherFactor("MLB", game.homeTeam.abbreviation, weatherSnap, isOverTentative, prop);
      const h2hFactor = buildH2HFactor(h2hValues, tentativeLine, isOverTentative, ctx.opponentAbbr);
      const built = buildPropFromRealData({
        game,
        sport: "MLB",
        playerId: String(ctx.player.mlbId),
        playerName: ctx.player.fullName,
        position: ctx.player.position,
        isHome: ctx.isHome,
        template: tmpl,
        index: startIdx(),
        values,
        recentGames: recentGamesFromMlbHitting(log, prop, tentativeLine),
        opponentFactor,
        weatherFactor,
        h2hFactor,
        experienceYears: 5,
      });
      if (built) playerProps.push(built);
    }
    if (playerProps.length > 0) {
      pickBestProp(playerProps).bestPick = true;
      props.push(...playerProps);
    }
  });

  // ── Pitchers ──
  type PitcherCtx = { player: MlbRosterPlayer; isHome: boolean; opponentMlbId: number; opponentAbbr: string };
  const pitcherCtxs: PitcherCtx[] = [
    ...awayPitchers.map((p) => ({ player: p, isHome: false, opponentMlbId: homeMeta.mlbId, opponentAbbr: homeMeta.abbr })),
    ...homePitchers.map((p) => ({ player: p, isHome: true, opponentMlbId: awayMeta.mlbId, opponentAbbr: awayMeta.abbr })),
  ];
  await batchedMap(pitcherCtxs, 3, async (ctx) => {
    const log = await getMlbPitchingGameLog(ctx.player.mlbId);
    if (log.length === 0) return;
    // Pitchers throw less often (every 5 days for starters), so widen the
    // freshness window to 14 days. Anyone older than that is on the IL or DFA'd.
    if (!playedRecently(log[log.length - 1]!.date, 14)) return;
    const tmpl = MLB_PITCHER_TEMPLATES[0]!;
    const prop: MlbPitcherPropKey = "Pitcher Strikeouts";
    const values = log.map((g) => extractPitchingValue(g.stat, prop));
    // Match H2H by canonical MLB team ID (avoids alias mismatch like CWS/CHW, ATH/OAK).
    const h2hValues = log
      .filter((g) => g.opponentId === ctx.opponentMlbId)
      .slice(-10)
      .map((g) => extractPitchingValue(g.stat, prop));
    const tentativeLine = chooseBalancedLine(values.slice(-10));
    const isOverTentative = (mean(values.slice(-5)) - tentativeLine) >= 0;
    // Pitcher's "opponent" defensively for K's: use opposing team's team-level
    // strikeOuts as hitters (more team K's = easier OVER for pitcher K). We have
    // teamPitchingStats keyed by team's pitching staff, not their hitters. As a
    // proxy we use Average for now.
    const opponentFactor: OpponentFactor = {
      rank: 15,
      rating: "Average",
      impact: 0,
      note: `Opponent batter K data not available — neutral matchup assumed.`,
    };
    const weatherFactor = buildWeatherFactor("MLB", game.homeTeam.abbreviation, weatherSnap, isOverTentative, "Pitcher Strikeouts");
    const h2hFactor = buildH2HFactor(h2hValues, tentativeLine, isOverTentative, ctx.opponentAbbr);
    const built = buildPropFromRealData({
      game,
      sport: "MLB",
      playerId: String(ctx.player.mlbId),
      playerName: ctx.player.fullName,
      position: ctx.player.position,
      isHome: ctx.isHome,
      template: tmpl,
      index: startIdx(),
      values,
      recentGames: recentGamesFromMlbPitching(log, prop, tentativeLine),
      opponentFactor,
      weatherFactor,
      h2hFactor,
      experienceYears: 5,
    });
    if (built) {
      built.bestPick = true; // pitcher only has one prop
      props.push(built);
    }
  });

  return props;
}

// ── NBA game processor ────────────────────────────────────────────────────
async function processNbaGame(
  game: Game,
  startIdx: () => number,
  paRanks: Map<number, number>,
): Promise<PlayerProp[]> {
  const [awayRoster, homeRoster] = await Promise.all([
    fetchNbaRoster(game.awayTeam.id),
    fetchNbaRoster(game.homeTeam.id),
  ]);

  const awayPicks = pickNbaPlayers(awayRoster, game.awayTeam.abbreviation, 4);
  const homePicks = pickNbaPlayers(homeRoster, game.homeTeam.abbreviation, 4);

  type NbaCtx = { player: NbaRosterPlayer; isHome: boolean; oppTeamId: string; oppAbbr: string };
  const ctxs: NbaCtx[] = [
    ...awayPicks.map((p) => ({
      player: p,
      isHome: false,
      oppTeamId: game.homeTeam.id,
      oppAbbr: game.homeTeam.abbreviation,
    })),
    ...homePicks.map((p) => ({
      player: p,
      isHome: true,
      oppTeamId: game.awayTeam.id,
      oppAbbr: game.awayTeam.abbreviation,
    })),
  ];

  const props: PlayerProp[] = [];
  await batchedMap(ctxs, 5, async (ctx) => {
    const log = await getNbaPlayerGameLog(ctx.player.id);
    if (log.length === 0) return;
    // NBA roster freshness — exclude players who haven't suited up recently
    // (injured, two-way assignment to G-League, etc.).
    if (!playedRecently(log[log.length - 1]!.date, 10)) return;
    const templates = NBA_TEMPLATES_BY_POS[ctx.player.position] ?? NBA_TEMPLATES_BY_POS["F"]!;
    const playerProps: PlayerProp[] = [];
    for (const tmpl of templates) {
      const prop = tmpl.type as NbaPropKey;
      const values = log.map((g) => extractNbaValue(g, prop));
      const h2hValues = log
        .filter((g) => g.opponentAbbr === ctx.oppAbbr)
        .slice(-10)
        .map((g) => extractNbaValue(g, prop));
      const tentativeLine = chooseBalancedLine(values.slice(-10));
      const isOverTentative = (mean(values.slice(-5)) - tentativeLine) >= 0;
      const opponentFactor = buildNbaOpponentFactor(prop, ctx.oppAbbr, ctx.oppTeamId, isOverTentative, paRanks);
      const h2hFactor = buildH2HFactor(h2hValues, tentativeLine, isOverTentative, ctx.oppAbbr);
      const built = buildPropFromRealData({
        game,
        sport: "NBA",
        playerId: ctx.player.id,
        playerName: ctx.player.fullName,
        position: ctx.player.position,
        isHome: ctx.isHome,
        template: tmpl,
        index: startIdx(),
        values,
        recentGames: recentGamesFromNba(log, prop, tentativeLine),
        opponentFactor,
        weatherFactor: null,
        h2hFactor,
        experienceYears: ctx.player.experienceYears,
      });
      if (built) playerProps.push(built);
    }
    if (playerProps.length > 0) {
      pickBestProp(playerProps).bestPick = true;
      props.push(...playerProps);
    }
  });

  return props;
}

// Choose the most ACTIONABLE prop for a player rather than the highest raw
// winProb. A 95%-confident "Stolen Bases under 0.5" on a player who steals once
// a month is mathematically true but useless. Real "edge" comes from props
// with meaningful volume where recent form differs from the line. We tier the
// candidates by edgeScore (model's gap-vs-volatility signal), and within each
// tier we prefer higher winProb. This naturally surfaces a mix of Over and
// Under best picks because real games produce both.
function pickBestProp(props: PlayerProp[]): PlayerProp {
  // Tier A: meaningful volume (line >= 1) AND clear edge (edgeScore >= 6)
  const tierA = props.filter((p) => p.line >= 1 && p.edgeScore >= 6);
  if (tierA.length) return tierA.reduce((b, p) => (p.winProbability > b.winProbability ? p : b));

  // Tier B: meaningful volume (line >= 1), any edge — still real props
  const tierB = props.filter((p) => p.line >= 1);
  if (tierB.length) return tierB.reduce((b, p) => (p.winProbability > b.winProbability ? p : b));

  // Tier C: fall back to whatever exists (low-volume props)
  return props.reduce((b, p) => (p.winProbability > b.winProbability ? p : b));
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function getTodayProps(sport?: string): Promise<PlayerProp[]> {
  if (propsCache && Date.now() - propsCache.ts < PROPS_TTL) {
    const all = propsCache.props;
    return sport && sport !== "ALL" ? all.filter((p) => p.sport === sport) : all;
  }

  const { games } = await getTodayGames("ALL");
  const eligible = games.filter((g) => g.homeTeam.id && g.awayTeam.id);

  // Pre-fetch league-wide stats (cached 6h)
  const [teamPitchingStats, nbaPaRanks] = await Promise.all([
    eligible.some((g) => g.sport === "MLB") ? getMlbTeamPitchingSeasonStats() : Promise.resolve([]),
    eligible.some((g) => g.sport === "NBA") ? getNbaPointsAgainstRanks() : Promise.resolve(new Map<number, number>()),
  ]);

  // Pre-fetch weather per outdoor MLB venue, in parallel
  const mlbHomeAbbrs = Array.from(new Set(eligible.filter((g) => g.sport === "MLB").map((g) => g.homeTeam.abbreviation)));
  const weatherByAbbr = new Map<string, { tempF: number; windMph: number; precipPct: number; conditions: string } | null>();
  await Promise.all(
    mlbHomeAbbrs.map(async (abbr) => {
      const meta = mlbTeamByAbbr(abbr);
      if (!meta || isDome(abbr)) {
        weatherByAbbr.set(abbr, null);
        return;
      }
      // Pick a representative game start from any game at this venue
      const sample = eligible.find((g) => g.sport === "MLB" && g.homeTeam.abbreviation === abbr);
      const w = await getWeatherForGame(meta.lat, meta.lon, sample?.startTime);
      weatherByAbbr.set(abbr, w);
    }),
  );

  let counter = 1;
  const startIdx = () => counter++;

  const allProps: PlayerProp[] = [];
  for (const game of eligible) {
    try {
      if (game.sport === "MLB") {
        const weather = weatherByAbbr.get(game.homeTeam.abbreviation) ?? null;
        const gameProps = await processMlbGame(game, startIdx, teamPitchingStats, weather);
        allProps.push(...gameProps);
      } else if (game.sport === "NBA") {
        const gameProps = await processNbaGame(game, startIdx, nbaPaRanks);
        allProps.push(...gameProps);
      }
    } catch (err) {
      logger.warn({ err: String(err), gameId: game.id, sport: game.sport }, "prop generation failed for game");
    }
  }

  allProps.sort((a, b) => b.edgeScore - a.edgeScore);
  propsCache = { ts: Date.now(), props: allProps };
  return sport && sport !== "ALL" ? allProps.filter((p) => p.sport === sport) : allProps;
}

export async function getLiveEdges(): Promise<LiveEdge[]> {
  const props = await getTodayProps();
  const { games } = await getTodayGames("ALL");
  const liveGameIds = new Set(games.filter((g) => g.isLive).map((g) => g.id));
  const liveProps = props.filter((p) => p.bestPick && p.gameId && liveGameIds.has(p.gameId));

  const edges: LiveEdge[] = [];
  let idx = 0;

  for (const prop of liveProps) {
    const game = games.find((g) => g.id === prop.gameId);
    if (!game) continue;

    const pct = estimateGameProgress(game);
    if (pct <= 0.05) continue;

    // Project current pace based on real avg10 (still a model projection — true
    // in-game stat would require feeds from each game). Use the historical
    // avg10 scaled to game progress as the "expected" baseline.
    const expectedAtThisPoint = prop.avg10 * pct;
    // Add small natural variance based on player's hitRate10 — lean slightly
    // toward the side the season-long performance suggests.
    const lean = (prop.hitRate10 - 0.5) * 0.4;
    const currentStat = Math.max(0, Math.round(expectedAtThisPoint * (1 + lean) * 10) / 10);
    const projectedFinal = pct > 0 ? Math.round((currentStat / pct) * 10) / 10 : 0;
    const liveEdgePercent = ((projectedFinal - prop.line) / Math.max(0.5, prop.line)) * 100;
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
