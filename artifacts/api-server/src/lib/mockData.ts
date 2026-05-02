import type { Result, ProviderStatus } from "./types";

// ── Historical results (demo seed for tracker) ───────────────────────────
// These are sample historical picks shown in the Results tab to demonstrate
// the tracker UI. Live picks generated from today's actual ESPN games and
// rosters live in propsGenerator.ts and are NOT seeded into the database.
export const mockResults: Omit<Result, "id" | "createdAt">[] = [
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0]!,
    sport: "NBA", playerName: "Jayson Tatum", teamAbbr: "BOS", opponentAbbr: "CLE",
    propType: "Points", line: 26.5, recommendation: "Strong Over", edgeScore: 8.7,
    status: "Win", profitLoss: 0.91, closingLine: 27.0,
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0]!,
    sport: "NBA", playerName: "Donovan Mitchell", teamAbbr: "CLE", opponentAbbr: "BOS",
    propType: "Points", line: 29.5, recommendation: "Lean Under", edgeScore: 6.1,
    status: "Win", profitLoss: 0.91, closingLine: 29.0,
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0]!,
    sport: "NBA", playerName: "Jalen Brunson", teamAbbr: "NYK", opponentAbbr: "IND",
    propType: "Points + Assists", line: 36.5, recommendation: "Strong Over", edgeScore: 8.4,
    status: "Win", profitLoss: 0.91, closingLine: 37.5,
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0]!,
    sport: "NBA", playerName: "Shai Gilgeous-Alexander", teamAbbr: "OKC", opponentAbbr: "DEN",
    propType: "Points", line: 31.5, recommendation: "Lean Over", edgeScore: 5.9,
    status: "Loss", profitLoss: -1.0, closingLine: 30.5,
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0]!,
    sport: "MLB", playerName: "Aaron Judge", teamAbbr: "NYY", opponentAbbr: "TB",
    propType: "Total Bases", line: 1.5, recommendation: "Strong Over", edgeScore: 8.1,
    status: "Win", profitLoss: 0.91, closingLine: 1.5,
  },
  {
    date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]!,
    sport: "NBA", playerName: "Tyrese Haliburton", teamAbbr: "IND", opponentAbbr: "MIL",
    propType: "Assists", line: 9.5, recommendation: "Lean Over", edgeScore: 7.3,
    status: "Push", profitLoss: 0, closingLine: 9.5,
  },
  {
    date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0]!,
    sport: "MLB", playerName: "Freddie Freeman", teamAbbr: "LAD", opponentAbbr: "COL",
    propType: "Hits + RBI", line: 1.5, recommendation: "Lean Over", edgeScore: 7.8,
    status: "Win", profitLoss: 0.91, closingLine: 1.5,
  },
];

export const mockProviders: ProviderStatus[] = [
  {
    name: "ESPN Scoreboard",
    status: "live",
    lastChecked: new Date().toISOString(),
    description: "Public ESPN scoreboard API — real-time games, scores, schedules. Active for in-season leagues only (no NFL during off-season).",
    mockMode: false,
  },
  {
    name: "ESPN Rosters",
    status: "live",
    lastChecked: new Date().toISOString(),
    description: "Public ESPN team roster API — real player IDs, positions, headshots. Used for NBA player selection and MLB game scheduling.",
    mockMode: false,
  },
  {
    name: "MLB Stats API",
    status: "live",
    lastChecked: new Date().toISOString(),
    description: "Public statsapi.mlb.com — the canonical data source MLB.com itself uses. Real team rosters, per-game player stat lines (gameLog), team season pitching stats for opponent matchup ranking, and head-to-head splits. No API key required.",
    mockMode: false,
  },
  {
    name: "ESPN Player Gamelog",
    status: "live",
    lastChecked: new Date().toISOString(),
    description: "Public ESPN athlete gamelog endpoint. Real per-game NBA stats (PTS, REB, AST, 3PM, STL, BLK, TO) used to populate recent-game bar charts and compute averages, hit rates, trends, and head-to-head splits.",
    mockMode: false,
  },
  {
    name: "Open-Meteo Weather",
    status: "live",
    lastChecked: new Date().toISOString(),
    description: "Free public weather forecast API — no key required. Hourly temperature, wind speed, and precipitation probability fetched at each MLB stadium's coordinates for the game start time. Skipped for fixed-roof domes (Tampa Bay).",
    mockMode: false,
  },
  {
    name: "PrizePicks Props",
    status: "mock",
    lastChecked: new Date().toISOString(),
    description: "PrizePicks does not expose a public API. Their projections endpoint requires their app's auth and is rate-limited per device. We do not bypass protected APIs. Prop *lines* shown are derived from each player's real rolling 10-game average — clearly labeled as 'model line' in reasoning.",
    mockMode: true,
  },
  {
    name: "Underdog Fantasy",
    status: "mock",
    lastChecked: new Date().toISOString(),
    description: "Underdog Fantasy has no public API. Pick'em projections are gated behind their mobile app. Same approach as PrizePicks — algorithmic projections only.",
    mockMode: true,
  },
  {
    name: "The Odds API",
    status: "mock",
    lastChecked: new Date().toISOString(),
    description: "Optional commercial integration for real sportsbook odds (DraftKings, FanDuel, etc.). Add ODDS_API_KEY to environment to enable. Free tier available at the-odds-api.com.",
    mockMode: true,
  },
  {
    name: "SportsData.io",
    status: "mock",
    lastChecked: new Date().toISOString(),
    description: "Optional commercial integration for advanced player projections and DFS data. Add SPORTSDATA_API_KEY to enable.",
    mockMode: true,
  },
];
