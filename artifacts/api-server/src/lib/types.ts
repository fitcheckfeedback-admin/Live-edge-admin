export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl?: string;
  color?: string;
}

export interface Game {
  id: string;
  sport: string;
  status: "scheduled" | "live" | "final";
  startTime?: string;
  awayTeam: Team;
  homeTeam: Team;
  awayScore?: number;
  homeScore?: number;
  period?: string;
  clock?: string;
  isLive: boolean;
}

export interface PlayerProp {
  id: number;
  sport: string;
  playerName: string;
  playerImage?: string;
  teamAbbr: string;
  teamLogo?: string;
  opponentAbbr: string;
  opponentLogo?: string;
  propType: string;
  line: number;
  avg5: number;
  avg10: number;
  hitRate5: number;
  hitRate10: number;
  lineGap: number;
  consistency: number;
  trend: "up" | "down" | "flat";
  edgeScore: number;
  confidence: "High" | "Medium" | "Low";
  recommendation: "Strong Over" | "Lean Over" | "Avoid" | "Lean Under" | "Strong Under";
  action: "Strong Play" | "Lean" | "Avoid" | "Trap Line";
  reasoning: string;
  redFlags: string[];
  riskWarning: string;
  gameId?: string;
  createdAt?: string;
}

export interface LiveEdge {
  id: number;
  propId: number;
  playerName: string;
  playerImage?: string;
  teamAbbr: string;
  propType: string;
  line: number;
  currentStat: number;
  minutesPlayed: number;
  percentComplete: number;
  projectedFinal: number;
  neededRemaining: number;
  liveEdgePercent: number;
  liveRecommendation: "Strong Live Over" | "Lean Live Over" | "Avoid" | "Lean Live Under" | "Strong Live Under";
  sport: string;
  gameStatus: string;
  period?: string;
  clock?: string;
  updatedAt?: string;
}

export interface Alert {
  id: number;
  type: string;
  title: string;
  message: string;
  sport?: string;
  playerName?: string;
  edgeScore?: number;
  isRead: boolean;
  createdAt: string;
  severity: "high" | "medium" | "low";
}

export interface Result {
  id: number;
  date: string;
  sport: string;
  playerName: string;
  teamAbbr: string;
  opponentAbbr: string;
  propType: string;
  line: number;
  recommendation: string;
  edgeScore: number;
  status: "Pending" | "Win" | "Loss" | "Push" | "DNP" | "Line Removed";
  profitLoss?: number;
  closingLine?: number;
  createdAt?: string;
}

export interface ResultsSummary {
  total: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalProfitLoss: number;
  roi: number;
}

export interface ProviderStatus {
  name: string;
  status: "live" | "mock" | "error";
  lastChecked: string;
  description: string;
  mockMode: boolean;
}
