# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind CSS, shadcn/ui, Wouter routing)

## Artifacts

### Live Edge Engine (`/`)
A sports betting research dashboard with:
- Real-time game data fetched directly from ESPN public APIs (scoreboard + rosters), season-aware (no NFL during off-season). Schedule is anchored to the **ET sports-day** (not server UTC) and explicitly fetches today + tomorrow with `?dates=YYYYMMDD` so morning requests return today's actual upcoming slate instead of yesterday's finals. Games finished more than 6h ago are dropped server-side; the rest are sorted live → upcoming → recent finals. Game/score times render in the **user's local browser timezone** via `toLocaleTimeString([])`. Live scores poll every **15 seconds** in both the Games tab and the Picks tab.
- **Player stats are 100% real public data** — see Honesty section below for sources and exact mappings
- Edge scoring (1-10 scale) drives Strong Play / Lean / Avoid / Trap Line classification
- **Win Probability (%):** primary user-facing metric — model's belief that the recommended side hits, anchored on real `hitRate10`, dampened by consistency, trend-nudged ±3, then nudged by real factor impacts (weather + opponent + H2H) at half weight, clamped 28–92
- **PrizePicks-style player cards:** the Board lists one card per player per game (not one card per prop). Each MLB batter generates all 11 stat categories (Home Runs, Total Bases, Hits+Runs+RBIs, Hits, Runs, RBIs, Walks, Stolen Bases, Hitter Strikeouts, Singles, Doubles); MLB pitchers get Pitcher Strikeouts; NBA players get position-specific templates. The player's highest-winProb prop is marked `bestPick=true` and shown prominently with a gold star.
- **Player Detail Sheet:** clicking a player card opens a bottom sheet (`PlayerDetailSheet.tsx`) with hero header + game card + accordion `CategoryRow` per prop. Each row expands to show a real-data `Last5Chart` bar chart, factor chips (opponent rank, H2H avg, weather), reasoning prefixed with "Real last-N avg…", and side-aware Over/Under buttons.
- **My Picks bet slip:** client-side only, persisted in `localStorage` (key `live-edge-bet-slip-v1`) via `BetSlipProvider` in `src/lib/betSlip.tsx`. Each `SlipPick` stores `side` ("Over"|"Under"). The Detail Sheet's pick buttons are side-aware: tapping the same side removes; tapping the opposite side replaces (count stays at 1, not 2).
- Live Edge board filters props to `bestPick && live` to avoid 11x duplication when a single player has many open categories
- Live in-game projections use real season `avg10` × game-progress, leaned by real `hitRate10` (only populates when games are actually live)
- Alerts auto-generated from Strong Plays + Trap Lines
- Results tracker with CSV export
- Data Sources tab shows provider status with full transparency
- **Active sports gating:** `getActiveLeagues()` (espnProvider) is the single source of truth for which sports are in season — props/results/alerts routes all filter by it, so stale rows in prod from out-of-season sports (e.g. NFL in May) are hidden from the UI without destructive DB ops

### Honesty / data-source policy

**Real public data sources used by the prop generator** (no API keys required):

| Field | Source | What it is |
|---|---|---|
| MLB rosters | `statsapi.mlb.com/v1/teams/{teamId}/roster` | Real MLB team rosters (40-man) |
| MLB per-game stats | `statsapi.mlb.com/v1/people/{mlbId}/stats?stats=gameLog` | Real per-game hitting/pitching stat lines for current season |
| MLB opponent rank | `statsapi.mlb.com/v1/teams/stats?stats=season&group=pitching` | Real all-30-team pitching stats, ranked per category |
| NBA rosters | `site.api.espn.com/.../teams/{teamId}/roster` | Real ESPN NBA team rosters |
| NBA per-game stats | `site.web.api.espn.com/.../athletes/{id}/gamelog` | Real per-game NBA stat lines (PTS/REB/AST/3PM/STL/BLK/TO/MIN) |
| NBA opponent rank | `site.web.api.espn.com/.../basketball/nba/standings` | Real `avgPointsAgainst` per team, sorted to a 1–30 rank (points-based props only — ESPN does not expose per-team REB/AST/3PM allowed) |
| Weather | `api.open-meteo.com/v1/forecast` | Hourly forecast at each MLB stadium's lat/lon for game start (skipped for fixed-roof domes) |
| Recent games (chart) | Same gameLog endpoints above | Last 5 real games with real opponents and dates — never synthesized |
| H2H meetings | Same gameLog endpoints filtered by opponent team ID | Real prior meetings — when none exist, the factor honestly says "No prior meetings on file" |

**What's still model-generated** (because there is no truthful public source):
- The **prop line itself** — derived as `roundToHalf(real_avg10 × 0.95 + 0.25)` and explicitly labeled "model line" in every prop's `reasoning` text. PrizePicks and Underdog do NOT publish public APIs, and we do not bypass their authenticated mobile endpoints. To pull real sportsbook lines instead, set the optional `ODDS_API_KEY` env var.
- The **win probability** — computed from the real `hitRate10`, real consistency, real trend, and real factor impacts. The model is transparent and auditable in `propsGenerator.ts`.

**Edge cases handled honestly (no fake fallbacks):**
- Player with no career data on file → that player is skipped, not faked.
- Open-Meteo unreachable → weather factor is null, not made up.
- Fixed-roof dome (Tampa Bay) → weather marked as "Dome — no effect".
- NBA per-team REB/AST/3PM allowed → factor reads "Neutral matchup vs X — ESPN does not expose a per-team '{prop} allowed' metric" rather than inventing one.
- ESPN scoreboard failure → `getTodayGames()` returns `{ source: "error", error: ... }` instead of silently falling back to mock games.

ESPN, MLB Stats API, and Open-Meteo all have their live status surfaced in the Data Sources tab. The PrizePicks/Underdog/Odds API entries remain explicitly marked `mock` so users see what is and isn't real at a glance.

### API Server (`/api`)
Express backend serving all API routes:
- `GET /api/schedule/today` — today's games (ESPN + mock fallback)
- `GET /api/scores/live` — live game scores
- `GET /api/props/best` — player props sorted by edge score
- `GET /api/live-edge` — live in-game prop projections
- `GET /api/alerts` — alert feed
- `POST /api/alerts/:id/read` — mark alert as read
- `GET /api/results` — results tracker
- `PATCH /api/results/:id` — update result status
- `GET /api/export/csv` — download results CSV
- `POST /api/refresh` — trigger data refresh
- `GET /api/api-status` — provider status
- `GET /api/dashboard/summary` — overview stats

## Data Providers
- **ESPN**: Free public scoreboard API (no key required)
- **Odds/Props/Injury/Weather**: Mock mode until API keys are set in environment

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Environment Variables (Optional — enables live data)
- `ODDS_API_KEY` — The Odds API for live odds
- `SPORTSDATA_API_KEY` — SportsData.io player stats
- `RAPIDAPI_KEY` — Injury reports feed

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
