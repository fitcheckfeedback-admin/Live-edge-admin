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
- Real-time game data fetched directly from ESPN public APIs (scoreboard + rosters), season-aware (no NFL during off-season)
- Player props algorithmically generated for actual rostered players using a curated star list (`lib/starPlayers.ts`) + line-bias model — see Honesty section below
- Edge scoring (1-10 scale) drives Strong Play / Lean / Avoid / Trap Line classification
- **Win Probability (%):** primary user-facing metric — model's belief that the recommended side hits, anchored on `hitRate10`, dampened by consistency, trend-nudged ±3, then nudged by factor impacts (weather + opponent + H2H) at half weight, clamped 28–92
- **PrizePicks-style player cards:** the Board now lists one card per player per game (not one card per prop). Each MLB batter generates all 11 stat categories (Home Runs, Total Bases, Hits+Runs+RBIs, Hits, Runs, RBIs, Walks, Stolen Bases, Hitter Strikeouts, Singles, Doubles); MLB pitchers get Pitcher Strikeouts; NBA players get position-specific templates. The player's highest-winProb prop is marked `bestPick=true` and shown prominently with a gold star.
- **Player Detail Sheet:** clicking a player card opens a bottom sheet (`PlayerDetailSheet.tsx`) with hero header + game card + accordion `CategoryRow` per prop. Each row expands to show a `Last5Chart` bar chart, factor chips (opponent rank, H2H avg, weather), reasoning, and side-aware Over/Under buttons.
- **Per-prop factors** (`PropFactors`): every prop carries `weather` (null for non-MLB and domed parks: TOR, TB, ARI, MIA, MIL, HOU, TEX, SEA), `opponent` (rank 1-30 → Elite/Strong/Average/Weak/Burnable, ±7pp impact), and `h2h` (3-5 synthesized prior meetings, ±8pp impact). Each factor's `impact` is a percentage-point nudge to the over win probability.
- **My Picks bet slip:** client-side only, persisted in `localStorage` (key `live-edge-bet-slip-v1`) via `BetSlipProvider` in `src/lib/betSlip.tsx`. Each `SlipPick` stores `side` ("Over"|"Under"). The Detail Sheet's pick buttons are side-aware: tapping the same side removes; tapping the opposite side replaces (count stays at 1, not 2).
- Live Edge board filters props to `bestPick && live` to avoid 11x duplication when a single player has many open categories
- Live in-game projections (only populates when games are actually live)
- Alerts auto-generated from Strong Plays + Trap Lines
- Results tracker with CSV export
- Data Sources tab shows provider status with full transparency
- **Active sports gating:** `getActiveLeagues()` (espnProvider) is the single source of truth for which sports are in season — props/results/alerts routes all filter by it, so stale rows in prod from out-of-season sports (e.g. NFL in May) are hidden from the UI without destructive DB ops

### Honesty / data-source policy
**PrizePicks and Underdog do NOT publish public APIs.** Their projection endpoints
are gated behind mobile app authentication and rate-limited per device. We do
not bypass those protections. Props shown in the app are *model-generated* for
the actual players on tonight's real ESPN rosters — never for fake players or
fake games. The Data Sources tab and provider descriptions in `lib/mockData.ts`
make this explicit to users. To wire up real sportsbook odds, set the optional
`ODDS_API_KEY` env var.

ESPN failures are surfaced honestly: `getTodayGames()` returns
`{ source: "espn" | "off-season" | "error", error?: string }` — endpoints no
longer silently fall back to mock games on upstream failures.

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
