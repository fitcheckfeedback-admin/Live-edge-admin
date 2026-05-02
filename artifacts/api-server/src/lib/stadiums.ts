// MLB team static table: ESPN abbr → MLB Stats API team id, venue coords,
// dome status. Used for both roster fetching (MLB Stats API) and weather
// lookups (Open-Meteo). Coords are venue lat/lon to the nearest 0.0001°.
export interface MlbTeamMeta {
  abbr: string;
  mlbId: number;
  name: string;
  lat: number;
  lon: number;
  dome: "fixed" | "retractable" | "open";
}

export const MLB_TEAMS: readonly MlbTeamMeta[] = [
  { abbr: "ARI", mlbId: 109, name: "Arizona Diamondbacks", lat: 33.4453, lon: -112.0667, dome: "retractable" },
  { abbr: "ATL", mlbId: 144, name: "Atlanta Braves", lat: 33.8907, lon: -84.4677, dome: "open" },
  { abbr: "BAL", mlbId: 110, name: "Baltimore Orioles", lat: 39.2839, lon: -76.6217, dome: "open" },
  { abbr: "BOS", mlbId: 111, name: "Boston Red Sox", lat: 42.3467, lon: -71.0972, dome: "open" },
  { abbr: "CHC", mlbId: 112, name: "Chicago Cubs", lat: 41.9484, lon: -87.6553, dome: "open" },
  { abbr: "CHW", mlbId: 145, name: "Chicago White Sox", lat: 41.83, lon: -87.6338, dome: "open" },
  { abbr: "CWS", mlbId: 145, name: "Chicago White Sox", lat: 41.83, lon: -87.6338, dome: "open" },
  { abbr: "CIN", mlbId: 113, name: "Cincinnati Reds", lat: 39.0975, lon: -84.5066, dome: "open" },
  { abbr: "CLE", mlbId: 114, name: "Cleveland Guardians", lat: 41.4962, lon: -81.6852, dome: "open" },
  { abbr: "COL", mlbId: 115, name: "Colorado Rockies", lat: 39.7559, lon: -104.9942, dome: "open" },
  { abbr: "DET", mlbId: 116, name: "Detroit Tigers", lat: 42.339, lon: -83.0485, dome: "open" },
  { abbr: "HOU", mlbId: 117, name: "Houston Astros", lat: 29.7573, lon: -95.3555, dome: "retractable" },
  { abbr: "KC", mlbId: 118, name: "Kansas City Royals", lat: 39.0517, lon: -94.4803, dome: "open" },
  { abbr: "KCR", mlbId: 118, name: "Kansas City Royals", lat: 39.0517, lon: -94.4803, dome: "open" },
  { abbr: "LAA", mlbId: 108, name: "Los Angeles Angels", lat: 33.8003, lon: -117.8827, dome: "open" },
  { abbr: "LAD", mlbId: 119, name: "Los Angeles Dodgers", lat: 34.0739, lon: -118.24, dome: "open" },
  { abbr: "MIA", mlbId: 146, name: "Miami Marlins", lat: 25.7781, lon: -80.2197, dome: "retractable" },
  { abbr: "MIL", mlbId: 158, name: "Milwaukee Brewers", lat: 43.0281, lon: -87.971, dome: "retractable" },
  { abbr: "MIN", mlbId: 142, name: "Minnesota Twins", lat: 44.9817, lon: -93.2776, dome: "open" },
  { abbr: "NYM", mlbId: 121, name: "New York Mets", lat: 40.7571, lon: -73.8458, dome: "open" },
  { abbr: "NYY", mlbId: 147, name: "New York Yankees", lat: 40.8296, lon: -73.9262, dome: "open" },
  { abbr: "OAK", mlbId: 133, name: "Athletics", lat: 38.5805, lon: -121.5132, dome: "open" },
  { abbr: "ATH", mlbId: 133, name: "Athletics", lat: 38.5805, lon: -121.5132, dome: "open" },
  { abbr: "PHI", mlbId: 143, name: "Philadelphia Phillies", lat: 39.906, lon: -75.1665, dome: "open" },
  { abbr: "PIT", mlbId: 134, name: "Pittsburgh Pirates", lat: 40.4469, lon: -80.0057, dome: "open" },
  { abbr: "SD", mlbId: 135, name: "San Diego Padres", lat: 32.7073, lon: -117.1566, dome: "open" },
  { abbr: "SDP", mlbId: 135, name: "San Diego Padres", lat: 32.7073, lon: -117.1566, dome: "open" },
  { abbr: "SEA", mlbId: 136, name: "Seattle Mariners", lat: 47.5915, lon: -122.3326, dome: "retractable" },
  { abbr: "SF", mlbId: 137, name: "San Francisco Giants", lat: 37.7786, lon: -122.3893, dome: "open" },
  { abbr: "SFG", mlbId: 137, name: "San Francisco Giants", lat: 37.7786, lon: -122.3893, dome: "open" },
  { abbr: "STL", mlbId: 138, name: "St. Louis Cardinals", lat: 38.6226, lon: -90.1928, dome: "open" },
  { abbr: "TB", mlbId: 139, name: "Tampa Bay Rays", lat: 27.7682, lon: -82.6534, dome: "fixed" },
  { abbr: "TBR", mlbId: 139, name: "Tampa Bay Rays", lat: 27.7682, lon: -82.6534, dome: "fixed" },
  { abbr: "TEX", mlbId: 140, name: "Texas Rangers", lat: 32.7473, lon: -97.0828, dome: "retractable" },
  { abbr: "TOR", mlbId: 141, name: "Toronto Blue Jays", lat: 43.6414, lon: -79.3894, dome: "retractable" },
  { abbr: "WSH", mlbId: 120, name: "Washington Nationals", lat: 38.873, lon: -77.0074, dome: "open" },
] as const;

const BY_ABBR = new Map<string, MlbTeamMeta>();
const BY_MLB_ID = new Map<number, MlbTeamMeta>();
for (const t of MLB_TEAMS) {
  BY_ABBR.set(t.abbr, t);
  if (!BY_MLB_ID.has(t.mlbId)) BY_MLB_ID.set(t.mlbId, t);
}

export function mlbTeamByAbbr(abbr: string): MlbTeamMeta | null {
  return BY_ABBR.get(abbr.toUpperCase()) ?? null;
}

export function mlbTeamById(id: number): MlbTeamMeta | null {
  return BY_MLB_ID.get(id) ?? null;
}

export function isDome(abbr: string): boolean {
  const meta = mlbTeamByAbbr(abbr);
  return meta?.dome === "fixed";
  // Retractable counts as outdoor for weather purposes — many games are
  // played roof-open, and we don't have a way to know roof state.
}
