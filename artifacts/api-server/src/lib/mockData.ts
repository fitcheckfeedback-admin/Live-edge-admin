import type { Game, PlayerProp, LiveEdge, Alert, Result, ProviderStatus } from "./types";

// ESPN logo helpers
const NBA_LOGO = (id: string) => `https://a.espncdn.com/i/teamlogos/nba/500/${id}.png`;
const MLB_LOGO = (id: string) => `https://a.espncdn.com/i/teamlogos/mlb/500/${id}.png`;

// ESPN player headshot — direct PNG format, no combiner params
const NBA_HEADSHOT = (id: string) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const MLB_HEADSHOT = (id: string) => `https://a.espncdn.com/i/headshots/mlb/players/full/${id}.png`;

// May 2026 — NBA Conference Semifinals + MLB Regular Season. No NFL (off-season).
export const mockGames: Game[] = [
  // ── NBA East Semis: Celtics vs Cavaliers ──────────────────────────────────
  {
    id: "nba-bos-cle-gm3",
    sport: "NBA",
    status: "live",
    startTime: new Date().toISOString(),
    awayTeam: { id: "bos", name: "Boston Celtics",    abbreviation: "BOS", logoUrl: NBA_LOGO("bos"), color: "#007A33" },
    homeTeam: { id: "cle", name: "Cleveland Cavaliers", abbreviation: "CLE", logoUrl: NBA_LOGO("cle"), color: "#860038" },
    awayScore: 74, homeScore: 69, period: "3rd Qtr", clock: "5:41", isLive: true,
  },
  // ── NBA East Semis: Knicks vs Pacers ──────────────────────────────────────
  {
    id: "nba-ny-ind-gm3",
    sport: "NBA",
    status: "live",
    startTime: new Date().toISOString(),
    awayTeam: { id: "ny",  name: "New York Knicks",   abbreviation: "NYK", logoUrl: NBA_LOGO("ny"),  color: "#F58426" },
    homeTeam: { id: "ind", name: "Indiana Pacers",    abbreviation: "IND", logoUrl: NBA_LOGO("ind"), color: "#002D62" },
    awayScore: 58, homeScore: 63, period: "2nd Qtr", clock: "1:12", isLive: true,
  },
  // ── NBA West Semis: OKC vs Nuggets ────────────────────────────────────────
  {
    id: "nba-okc-den-gm3",
    sport: "NBA",
    status: "scheduled",
    startTime: new Date(Date.now() + 2.5 * 3600000).toISOString(),
    awayTeam: { id: "okc", name: "Oklahoma City Thunder", abbreviation: "OKC", logoUrl: NBA_LOGO("okc"), color: "#007AC1" },
    homeTeam: { id: "den", name: "Denver Nuggets",        abbreviation: "DEN", logoUrl: NBA_LOGO("den"), color: "#0E2240" },
    isLive: false,
  },
  // ── NBA West Semis: Warriors vs Timberwolves ──────────────────────────────
  {
    id: "nba-gs-min-gm3",
    sport: "NBA",
    status: "scheduled",
    startTime: new Date(Date.now() + 5 * 3600000).toISOString(),
    awayTeam: { id: "gs",  name: "Golden State Warriors",  abbreviation: "GSW", logoUrl: NBA_LOGO("gs"),  color: "#1D428A" },
    homeTeam: { id: "min", name: "Minnesota Timberwolves", abbreviation: "MIN", logoUrl: NBA_LOGO("min"), color: "#236192" },
    isLive: false,
  },
  // ── MLB: Yankees @ Red Sox ────────────────────────────────────────────────
  {
    id: "mlb-nyy-bos-1",
    sport: "MLB",
    status: "live",
    startTime: new Date().toISOString(),
    awayTeam: { id: "nyy", name: "New York Yankees",  abbreviation: "NYY", logoUrl: MLB_LOGO("nyy"), color: "#003087" },
    homeTeam: { id: "bos", name: "Boston Red Sox",    abbreviation: "BOS", logoUrl: MLB_LOGO("bos"), color: "#BD3039" },
    awayScore: 4, homeScore: 6, period: "Top 7", clock: "", isLive: true,
  },
  // ── MLB: Dodgers @ Giants ─────────────────────────────────────────────────
  {
    id: "mlb-lad-sf-1",
    sport: "MLB",
    status: "live",
    startTime: new Date().toISOString(),
    awayTeam: { id: "lad", name: "Los Angeles Dodgers", abbreviation: "LAD", logoUrl: MLB_LOGO("lad"), color: "#005A9C" },
    homeTeam: { id: "sf",  name: "San Francisco Giants", abbreviation: "SF",  logoUrl: MLB_LOGO("sf"),  color: "#FD5A1E" },
    awayScore: 2, homeScore: 1, period: "Bot 5", clock: "", isLive: true,
  },
  // ── MLB: Braves @ Mets ────────────────────────────────────────────────────
  {
    id: "mlb-atl-nym-1",
    sport: "MLB",
    status: "scheduled",
    startTime: new Date(Date.now() + 3 * 3600000).toISOString(),
    awayTeam: { id: "atl", name: "Atlanta Braves",  abbreviation: "ATL", logoUrl: MLB_LOGO("atl"), color: "#CE1141" },
    homeTeam: { id: "nym", name: "New York Mets",   abbreviation: "NYM", logoUrl: MLB_LOGO("nym"), color: "#002D72" },
    isLive: false,
  },
  // ── MLB: Astros @ Rangers ─────────────────────────────────────────────────
  {
    id: "mlb-hou-tex-1",
    sport: "MLB",
    status: "scheduled",
    startTime: new Date(Date.now() + 4 * 3600000).toISOString(),
    awayTeam: { id: "hou", name: "Houston Astros", abbreviation: "HOU", logoUrl: MLB_LOGO("hou"), color: "#002D62" },
    homeTeam: { id: "tex", name: "Texas Rangers",  abbreviation: "TEX", logoUrl: MLB_LOGO("tex"), color: "#003278" },
    isLive: false,
  },
];

// Season-aware active sports for mock purposes
export const ACTIVE_SPORTS = ["NBA", "MLB"] as const;

export const mockProps: Omit<PlayerProp, "id" | "createdAt">[] = [
  // ── NBA ──────────────────────────────────────────────────────────────────
  {
    sport: "NBA", playerName: "Jayson Tatum",
    playerImage: NBA_HEADSHOT("4065648"),
    teamAbbr: "BOS", teamLogo: NBA_LOGO("bos"),
    opponentAbbr: "CLE", opponentLogo: NBA_LOGO("cle"),
    propType: "Points", line: 27.5,
    avg5: 31.2, avg10: 29.8, hitRate5: 0.8, hitRate10: 0.7, lineGap: 3.7,
    consistency: 0.82, trend: "up", edgeScore: 8.9, confidence: "High",
    recommendation: "Strong Over", action: "Strong Play",
    reasoning: "Tatum averaging 31.2 over last 5, hitting this line in 8 of last 10. CLE ranks 24th in points allowed to SF. Trend is sharply upward over past 3 games.",
    redFlags: [], riskWarning: "", gameId: "nba-bos-cle-gm3",
  },
  {
    sport: "NBA", playerName: "Donovan Mitchell",
    playerImage: NBA_HEADSHOT("3155942"),
    teamAbbr: "CLE", teamLogo: NBA_LOGO("cle"),
    opponentAbbr: "BOS", opponentLogo: NBA_LOGO("bos"),
    propType: "Points", line: 28.5,
    avg5: 30.1, avg10: 27.8, hitRate5: 0.6, hitRate10: 0.55, lineGap: 1.6,
    consistency: 0.70, trend: "flat", edgeScore: 6.8, confidence: "Medium",
    recommendation: "Lean Over", action: "Lean",
    reasoning: "Mitchell scoring 30+ in 3 of last 5 but BOS has held SGs under 26 in back-to-back games. Line gap is positive but slim.",
    redFlags: ["Celtics' elite perimeter defense"], riskWarning: "Moderate — fade if Mitchell is banged up", gameId: "nba-bos-cle-gm3",
  },
  {
    sport: "NBA", playerName: "Jalen Brunson",
    playerImage: NBA_HEADSHOT("3934672"),
    teamAbbr: "NYK", teamLogo: NBA_LOGO("ny"),
    opponentAbbr: "IND", opponentLogo: NBA_LOGO("ind"),
    propType: "Points + Assists", line: 37.5,
    avg5: 41.2, avg10: 38.9, hitRate5: 0.8, hitRate10: 0.7, lineGap: 3.7,
    consistency: 0.80, trend: "up", edgeScore: 8.5, confidence: "High",
    recommendation: "Strong Over", action: "Strong Play",
    reasoning: "Brunson combining for 41+ P+A last 5. Indiana 29th in limiting point guard combo stats. Strong upward trend in playoff setting.",
    redFlags: [], riskWarning: "", gameId: "nba-ny-ind-gm3",
  },
  {
    sport: "NBA", playerName: "Tyrese Haliburton",
    playerImage: NBA_HEADSHOT("4395725"),
    teamAbbr: "IND", teamLogo: NBA_LOGO("ind"),
    opponentAbbr: "NYK", opponentLogo: NBA_LOGO("ny"),
    propType: "Assists", line: 9.5,
    avg5: 11.4, avg10: 10.1, hitRate5: 0.8, hitRate10: 0.7, lineGap: 1.9,
    consistency: 0.76, trend: "up", edgeScore: 7.9, confidence: "High",
    recommendation: "Lean Over", action: "Lean",
    reasoning: "Haliburton dishing 11+ assists in 4 of last 5. NYK allows 10.2 assists per game to opposing PGs. Playoff pace elevates his usage.",
    redFlags: [], riskWarning: "", gameId: "nba-ny-ind-gm3",
  },
  {
    sport: "NBA", playerName: "Shai Gilgeous-Alexander",
    playerImage: NBA_HEADSHOT("4278073"),
    teamAbbr: "OKC", teamLogo: NBA_LOGO("okc"),
    opponentAbbr: "DEN", opponentLogo: NBA_LOGO("den"),
    propType: "Points", line: 30.5,
    avg5: 28.4, avg10: 29.1, hitRate5: 0.4, hitRate10: 0.45, lineGap: -2.1,
    consistency: 0.58, trend: "down", edgeScore: 3.4, confidence: "Low",
    recommendation: "Lean Under", action: "Trap Line",
    reasoning: "SGA under this line in 6 of last 10. Denver's wing defense has been suffocating in the playoffs. Line appears inflated.",
    redFlags: ["Negative line gap", "Downward trend", "Elite defensive matchup"], riskWarning: "High risk — potential trap line, sportsbooks may be fading public over tickets",
    gameId: "nba-okc-den-gm3",
  },
  {
    sport: "NBA", playerName: "Stephen Curry",
    playerImage: NBA_HEADSHOT("3975"),
    teamAbbr: "GSW", teamLogo: NBA_LOGO("gs"),
    opponentAbbr: "MIN", opponentLogo: NBA_LOGO("min"),
    propType: "3-Pointers Made", line: 4.5,
    avg5: 4.8, avg10: 4.2, hitRate5: 0.6, hitRate10: 0.55, lineGap: 0.3,
    consistency: 0.65, trend: "flat", edgeScore: 5.8, confidence: "Medium",
    recommendation: "Avoid", action: "Avoid",
    reasoning: "Curry right at his average on this line — no meaningful edge. MIN ranks 8th in 3-point defense. High variance prop.",
    redFlags: ["Minimal line gap", "Strong defensive matchup", "High variance"], riskWarning: "Skip — not enough edge to justify risk",
    gameId: "nba-gs-min-gm3",
  },
  // ── MLB ──────────────────────────────────────────────────────────────────
  {
    sport: "MLB", playerName: "Aaron Judge",
    playerImage: MLB_HEADSHOT("33192"),
    teamAbbr: "NYY", teamLogo: MLB_LOGO("nyy"),
    opponentAbbr: "BOS", opponentLogo: MLB_LOGO("bos"),
    propType: "Total Bases", line: 1.5,
    avg5: 2.3, avg10: 2.1, hitRate5: 0.8, hitRate10: 0.75, lineGap: 0.8,
    consistency: 0.78, trend: "up", edgeScore: 8.5, confidence: "High",
    recommendation: "Strong Over", action: "Strong Play",
    reasoning: "Judge averaging 2.3 total bases last 5 games with 80% hit rate. BOS starter has 5.8 ERA vs right-handed power bats this season. Favorable ballpark and wind conditions.",
    redFlags: [], riskWarning: "", gameId: "mlb-nyy-bos-1",
  },
  {
    sport: "MLB", playerName: "Freddie Freeman",
    playerImage: MLB_HEADSHOT("30836"),
    teamAbbr: "LAD", teamLogo: MLB_LOGO("lad"),
    opponentAbbr: "SF", opponentLogo: MLB_LOGO("sf"),
    propType: "Hits + RBI", line: 1.5,
    avg5: 2.1, avg10: 1.9, hitRate5: 0.8, hitRate10: 0.7, lineGap: 0.6,
    consistency: 0.74, trend: "up", edgeScore: 7.6, confidence: "High",
    recommendation: "Lean Over", action: "Lean",
    reasoning: "Freeman hitting safely in 9 of last 10. SF starter has allowed 2+ hits to lefty first basemen in 4 straight starts. Oracle Park plays neutral for his profile.",
    redFlags: [], riskWarning: "", gameId: "mlb-lad-sf-1",
  },
];

export const mockLiveEdges: Omit<LiveEdge, "id" | "updatedAt">[] = [
  {
    propId: 1, playerName: "Jayson Tatum", playerImage: NBA_HEADSHOT("4065648"),
    teamAbbr: "BOS", propType: "Points", line: 27.5,
    currentStat: 19, minutesPlayed: 24, percentComplete: 0.58,
    projectedFinal: 32.8, neededRemaining: 8.5, liveEdgePercent: 19.3,
    liveRecommendation: "Strong Live Over",
    sport: "NBA", gameStatus: "live", period: "3rd Qtr", clock: "5:41",
  },
  {
    propId: 3, playerName: "Jalen Brunson", playerImage: NBA_HEADSHOT("3934672"),
    teamAbbr: "NYK", propType: "Points + Assists", line: 37.5,
    currentStat: 24, minutesPlayed: 20, percentComplete: 0.50,
    projectedFinal: 48.0, neededRemaining: 13.5, liveEdgePercent: 28.0,
    liveRecommendation: "Strong Live Over",
    sport: "NBA", gameStatus: "live", period: "2nd Qtr", clock: "1:12",
  },
  {
    propId: 7, playerName: "Aaron Judge", playerImage: MLB_HEADSHOT("33192"),
    teamAbbr: "NYY", propType: "Total Bases", line: 1.5,
    currentStat: 0, minutesPlayed: 0, percentComplete: 0.43,
    projectedFinal: 0, neededRemaining: 1.5, liveEdgePercent: -100,
    liveRecommendation: "Lean Live Under",
    sport: "MLB", gameStatus: "live", period: "Top 7", clock: "",
  },
  {
    propId: 2, playerName: "Donovan Mitchell", playerImage: NBA_HEADSHOT("3155942"),
    teamAbbr: "CLE", propType: "Points", line: 28.5,
    currentStat: 17, minutesPlayed: 24, percentComplete: 0.58,
    projectedFinal: 29.3, neededRemaining: 11.5, liveEdgePercent: 2.8,
    liveRecommendation: "Avoid",
    sport: "NBA", gameStatus: "live", period: "3rd Qtr", clock: "5:41",
  },
];

export const mockAlerts: Omit<Alert, "id" | "createdAt">[] = [
  {
    type: "strong_pregame", title: "Strong Edge Alert",
    message: "Jayson Tatum Points OVER 27.5 — Edge Score 8.9. Strong Play detected. BOS vs CLE Gm3.",
    sport: "NBA", playerName: "Jayson Tatum", edgeScore: 8.9, isRead: false, severity: "high",
  },
  {
    type: "strong_pregame", title: "Strong Edge Alert",
    message: "Jalen Brunson Pts+Asts OVER 37.5 — Edge Score 8.5. Strong Play detected. NYK vs IND Gm3.",
    sport: "NBA", playerName: "Jalen Brunson", edgeScore: 8.5, isRead: false, severity: "high",
  },
  {
    type: "strong_pregame", title: "Strong Edge Alert",
    message: "Aaron Judge Total Bases OVER 1.5 — Edge Score 8.5. Strong Play detected. NYY @ BOS.",
    sport: "MLB", playerName: "Aaron Judge", edgeScore: 8.5, isRead: false, severity: "high",
  },
  {
    type: "live_surge", title: "Live Surge Detected",
    message: "Jayson Tatum projected 32.8 vs line 27.5 — 19.3% above line with 42% game remaining. Strong Live Over.",
    sport: "NBA", playerName: "Jayson Tatum", edgeScore: 8.9, isRead: false, severity: "high",
  },
  {
    type: "live_surge", title: "Live Surge Detected",
    message: "Jalen Brunson projected 48 vs line 37.5 — 28% above line at halftime. Strong Live Over.",
    sport: "NBA", playerName: "Jalen Brunson", edgeScore: 8.5, isRead: false, severity: "high",
  },
  {
    type: "trap_line", title: "Trap Line Warning",
    message: "SGA Points UNDER 30.5 — Edge Score 3.4. Line appears inflated. Avoid or consider Under.",
    sport: "NBA", playerName: "Shai Gilgeous-Alexander", edgeScore: 3.4, isRead: true, severity: "medium",
  },
];

export const mockResults: Omit<Result, "id" | "createdAt">[] = [
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    sport: "NBA", playerName: "Jayson Tatum", teamAbbr: "BOS", opponentAbbr: "CLE",
    propType: "Points", line: 26.5, recommendation: "Strong Over", edgeScore: 8.7,
    status: "Win", profitLoss: 0.91, closingLine: 27.0,
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    sport: "NBA", playerName: "Donovan Mitchell", teamAbbr: "CLE", opponentAbbr: "BOS",
    propType: "Points", line: 29.5, recommendation: "Lean Under", edgeScore: 6.1,
    status: "Win", profitLoss: 0.91, closingLine: 29.0,
  },
  {
    date: new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0],
    sport: "NBA", playerName: "Jalen Brunson", teamAbbr: "NYK", opponentAbbr: "IND",
    propType: "Points + Assists", line: 36.5, recommendation: "Strong Over", edgeScore: 8.4,
    status: "Win", profitLoss: 0.91, closingLine: 37.5,
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
    sport: "NBA", playerName: "Shai Gilgeous-Alexander", teamAbbr: "OKC", opponentAbbr: "DEN",
    propType: "Points", line: 31.5, recommendation: "Lean Over", edgeScore: 5.9,
    status: "Loss", profitLoss: -1.0, closingLine: 30.5,
  },
  {
    date: new Date(Date.now() - 4 * 86400000).toISOString().split("T")[0],
    sport: "MLB", playerName: "Aaron Judge", teamAbbr: "NYY", opponentAbbr: "TB",
    propType: "Total Bases", line: 1.5, recommendation: "Strong Over", edgeScore: 8.1,
    status: "Win", profitLoss: 0.91, closingLine: 1.5,
  },
  {
    date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
    sport: "NBA", playerName: "Tyrese Haliburton", teamAbbr: "IND", opponentAbbr: "MIL",
    propType: "Assists", line: 9.5, recommendation: "Lean Over", edgeScore: 7.3,
    status: "Push", profitLoss: 0, closingLine: 9.5,
  },
  {
    date: new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0],
    sport: "MLB", playerName: "Freddie Freeman", teamAbbr: "LAD", opponentAbbr: "COL",
    propType: "Hits + RBI", line: 1.5, recommendation: "Lean Over", edgeScore: 7.8,
    status: "Win", profitLoss: 0.91, closingLine: 1.5,
  },
];

export const mockProviders: ProviderStatus[] = [
  { name: "ESPN Scoreboard",   status: "live",  lastChecked: new Date().toISOString(), description: "Public ESPN scoreboard API — no key required", mockMode: false },
  { name: "The Odds API",      status: "mock",  lastChecked: new Date().toISOString(), description: "Set ODDS_API_KEY in environment to enable live odds", mockMode: true },
  { name: "SportsData.io",     status: "mock",  lastChecked: new Date().toISOString(), description: "Set SPORTSDATA_API_KEY in environment to enable", mockMode: true },
  { name: "PrizePicks Props",  status: "mock",  lastChecked: new Date().toISOString(), description: "Legal API key required — currently using mock props", mockMode: true },
  { name: "Underdog Fantasy",  status: "mock",  lastChecked: new Date().toISOString(), description: "Legal API key required — currently using mock props", mockMode: true },
  { name: "Injury Reports",    status: "mock",  lastChecked: new Date().toISOString(), description: "Set RAPIDAPI_KEY in environment to enable injury feeds", mockMode: true },
  { name: "Weather Data",      status: "mock",  lastChecked: new Date().toISOString(), description: "Weather data for outdoor games — mock mode active", mockMode: true },
];
