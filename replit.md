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
- Automated game scores via ESPN public API (falls back to mock data)
- Player prop analysis with edge scoring (1-10 scale)
- Live in-game projections refreshing every 15 seconds
- Alerts for strong edges (8.0+) and live surges
- Results tracker with CSV export
- Data source status / mock mode indicator

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
