# PROGRESS.md — Append-Only Execution Log

## 2026-11-18 — Phase 0: Recon & Project Memory
- **Status:** COMPLETED
- **Actions Completed:**
  - Complete codebase mapping: components, hooks, engine integration, routing, audio.
  - Inspected live Supabase database via Supabase MCP (`fhlpgtkftfhqcgppfnud` on PostgreSQL 17): verified tables `games`, `game_moves`, `profiles`, `friendships`, `game_invites`; migrations `0001` and `0002`; active Edge Function `game-action`.
  - Cataloged anti-slop and forbidden strings (`Dark Studio Luxury`, `Next-Generation`, `Liquid Glass`, domain URLs).
  - Measured build baseline: Typecheck clean, 19/19 Vitest tests passing, Vite build successful (677.99 kB raw / 194.60 kB gzip).
  - Created initial project memory files: `AGENTS.md`, `.agents/rules/chess-v2.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DESIGN.md`, `docs/OWNER_ACTIONS.md`, `docs/DB_CHANGELOG.md`, `docs/RATING.md`.
- **Gates:**
  - Build health: PASSED (`npm run typecheck && npm test && npm run build`)
  - Project memory files: PASSED
- **Next Up:** Phase 1 (Foundation: tokens, theme, shared UI primitives, `/dev/kit`).

## 2026-11-18 — Phase 1: Foundation (Track A)
- **Status:** COMPLETED
- **Actions Completed:**
  - Implemented Material 3 Expressive color roles & Apple Liquid Glass utility with accessibility fallbacks in `src/index.css`.
  - Added zero-flash pre-paint inline theme script to `index.html`.
  - Built unified theme manager `src/lib/theme.ts` supporting System, Light, and Dark modes with automatic `meta[name=theme-color]` updating.
  - Centralized user-facing copy strings in `src/lib/copy.ts`.
  - Built comprehensive shared UI primitives in `src/components/ui/` (`Button`, `Card`, `GlassCard`, `Chip`, `Segmented`, `TimeControlPicker`, `Dialog`, `BottomSheet`, `Toast`, `Skeleton`, `Avatar`, `RatingBadge`, `ThemeToggle`, `Tabs`, `Input`, `Switch`).
  - Upgraded router in `src/lib/router.tsx` to handle parameter matching and developer routes.
  - Built interactive `/dev/kit` component showcase in `src/pages/DevKit.tsx`.
  - Verified live component rendering, theme switching, dialog, and bottom sheet via browser subagent.
- **Gates:**
  - Build health: PASSED (`npm run typecheck && npm test && npm run build`)
  - DevKit verification: PASSED (all 8 sections, theme switching, dialog modal, bottom sheet)
  - Contrast table: PASSED (recorded in `docs/DESIGN.md`)
- **Next Up:** Merge `v2/foundation` into `main`, then start parallel tracks (Track B: Brand, Track C: Backend, Track D: Bots).

## 2026-11-18 — Phase 2: Brand and Share Assets (Track B)
- **Status:** COMPLETED
- **Actions Completed:**
  - Designed original geometric pawn mark (`public/logo-mark.svg`, `public/logo.svg`) with distinctive dual-tone emerald faceted split.
  - Delivered vector brand exports: `logo-wordmark.svg`, `logo-mono.svg`, `safari-pinned-tab.svg`, and adaptive `favicon.svg` with dark/light `prefers-color-scheme` support.
  - Generated crisp multi-resolution icons via `scripts/generate-icons.mjs` (`favicon.ico` 32x32, `apple-touch-icon.png` 180x180, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`).
  - Added modern PWA web app manifest in `public/manifest.webmanifest`.
  - Built reproducible OpenGraph share card generator `scripts/og/render.mjs`, producing `public/og-preview.png` (1200x630, 21.9 KB, well within the 300 KB WhatsApp limit).
  - Deleted obsolete knight script (`scripts/generate-assets.mjs`).
  - Added GPL-3.0 `LICENSE` file for full Stockfish compliance.
- **Gates:**
  - Build health: PASSED (`npm run typecheck && npm test && npm run build`)
  - Image size: PASSED (`og-preview.png` is 21.9 KB < 300 KB)
  - Icons and Manifest: PASSED
- **Next Up:** Merge `v2/brand` into `main`, then proceed to Phase 3 (Backend, Rating & Profile Data).

## 2026-11-18 — Phase 3: Backend, Rating System & Database Architecture (Track C)
- **Status:** COMPLETED
- **Actions Completed:**
  - Authored pure Elo rating module `src/lib/rating.ts` with 400-point clamp, K schedule (40/20/10), floor 100, anti-farming caps, and unit tests in `tests/rating.test.ts` (10/10 passing).
  - Authored additive, idempotent migration `supabase/migrations/0003_profiles_elo.sql`:
    - Extended `profiles` with `rating`, `peak_rating`, `games_played`, `wins`, `draws`, `losses`, `bio`, `description`, `country`, `theme_pref`, `username_changed_at`.
    - Added tamper-proof trigger `protect_profile_rating` to prevent client-side stat forgery.
    - Created `public.rating_history` with RLS and covering indexes for `(user_id, created_at desc)` and `(game_id)`.
    - Created `public.bot_games` table with RLS and index on `(user_id, created_at desc)`.
    - Created atomic `apply_online_game_rating(uuid)` RPC function restricted to `service_role`.
    - Created `leaderboard(int)` RPC function.
    - Successfully applied migration to Supabase production database `fhlpgtkftfhqcgppfnud`.
  - Built and deployed `record-bot-game` Edge Function (version 1, ACTIVE):
    - Replays PGN with `chess.js`, checks plies >= 10, ensures no hints or takebacks were used.
    - Enforces 24-hour rolling anti-farming (+100 max positive gain, 60 games/day cap, +400 rating threshold clamp).
    - Updates `profiles`, `bot_games`, and `rating_history` via service role.
  - Updated and deployed `game-action` Edge Function (version 3, ACTIVE):
    - Automatically invokes `apply_online_game_rating` on game finishes (checkmate, flag timeout, resignation, draw agreements).
  - Generated TypeScript database definitions to `src/types/db.ts` via Supabase MCP.
  - Ran security and performance advisors via Supabase MCP; added covering foreign key index and restricted execution privileges.
- **Gates:**
  - Build health: PASSED (`npm run typecheck && npm test && npm run build`)
  - Live DB verification: PASSED (`0003_profiles_elo.sql` applied, tables and functions active)
  - Edge Functions: PASSED (`record-bot-game` v1 ACTIVE, `game-action` v3 ACTIVE)
- **Next Up:** Merge `v2/backend` into `main`, then proceed to Phase 4 (Track D: Bots Ladder & Human-Like Engine Weakening).
