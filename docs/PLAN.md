# PLAN.md — Chess by Ismail Studio v2 Implementation Task List

## Decisions Log
- **D1 (Made):** One Elo rating for all modes (online and bots). Start 800, floor 100.
- **D2 (Made):** Brand direction: green identity, original minimal pawn mark.
- **D3 (Made):** Guest bot play (signed out, unrated) is in scope for instant onboarding.
- **D4 (Made):** No new UI framework. Tailwind 4 + tokens + small primitives.
- **D5 (Made):** Router: Enhanced lightweight history router in `src/lib/router.tsx` with regex parameter matching (`/game/:id`, `/u/:username`) and `React.lazy`.
- **D6 (Made):** Data Caching: Optimized Supabase query integration to preserve bundle size under 180 KB.
- **D7 (Made):** Charts: Pure inline SVG chart component (`RatingChart.tsx`) with zero external bundle overhead.
- **D8 (Made):** Avatars: Geometric dual-tone SVG piece tiles + Google photo fallback.

---

## Phase Breakdown & Ownership

### Phase 0: Recon & Project Memory
- [x] Map repository architecture, routes, state, and dependencies.
- [x] Inspect live Supabase project via MCP (tables, migrations, advisors, edge functions).
- [x] Catalog problem strings and anti-slop inventory.
- [x] Measure build baseline (`typecheck`, `test`, `build`).
- [x] Create project memory files (`AGENTS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DESIGN.md`, `docs/OWNER_ACTIONS.md`, `docs/DB_CHANGELOG.md`, `docs/RATING.md`).

### Phase 1: Foundation (Track A)
- [x] Implement design tokens in `src/index.css` (M3 color roles, typography, motion, glass utilities with fallbacks).
- [x] Add zero-flash pre-paint inline theme script to `index.html`.
- [x] Build `src/lib/theme.ts` (System / Light / Dark manager with persistence).
- [x] Build shared UI primitives in `src/components/ui/` (`Button`, `Card`, `Chip`, `Segmented`, `Dialog`, `BottomSheet`, `Toast`, `Skeleton`, `Avatar`, `RatingBadge`, `ThemeToggle`, `Tabs`, `Input`, `Switch`).
- [x] Create hidden `/dev/kit` component showcase route.
- [x] Compute WCAG AA contrast matrix and record in `docs/DESIGN.md`.
- [x] Gate check: Typecheck, test, build, contrast table, zero flash on reload.

### Phase 2: Brand & Share Assets (Track B)
- [x] Design original geometric pawn mark (`public/logo-mark.svg`, `logo-wordmark.svg`, `logo-mono.svg`, `favicon.svg`).
- [x] Generate modern multi-size favicons and touch icons (`scripts/generate-icons.mjs`).
- [x] Generate 1200x630 OG image under 300 KB (`scripts/og/render.mjs`, `public/og-preview.png`).
- [x] Configure `public/manifest.webmanifest` and update `index.html` meta tags.
- [x] Delete old knight emblem files and scripts.
- [x] Commit GPL-3.0 `LICENSE` file.
- [x] Gate check: Icons, OG preview, manifest validation.

### Phase 3: Backend, Rating & Profile Data (Track C)
- [x] Author idempotent migration `supabase/migrations/0003_profiles_elo.sql`.
- [x] Implement pure Elo calculation engine in `src/lib/rating.ts`.
- [x] Author comprehensive Elo unit tests in `tests/rating.test.ts`.
- [x] Implement and deploy `record-bot-game` Edge Function.
- [x] Update `game-action` Edge Function to trigger `apply_online_game_rating`.
- [x] Apply migration via Supabase MCP and verify with read-only queries.
- [x] Regenerate TypeScript definitions in `src/types/db.ts`.
- [x] Verify advisors report zero new warnings.
- [x] Gate check: Rating math unit tests pass, migration verified, edge functions active.

### Phase 4: Bots & Engine Weakening (Track D)
- [x] Define 14 bots in `src/lib/bots.ts` with ascending Elo, styles, personalities, and avatars.
- [x] Implement humanized weakening layer in `src/lib/botEngine.ts` (MultiPV softmax, centipawn loss temperature, blunder injection).
- [x] Write headless calibration runner `scripts/calibrate-bots.mjs`.
- [x] Calibrate adjacent bots and record results in `docs/RATING.md`.
- [x] Write bot engine unit tests in `tests/bots.test.ts`.
- [x] Gate check: All 14 bots play legal chess to completion; Pebble/Mochi lose to club level.

### Phase 5: Game Screen & Board Feel (Track F)
- [x] Re-engineer `src/components/Board.tsx` (lift on pickup, spring snap, click & drag, legal move indicators, red check glow, premoves, promotion).
- [x] Redesign `src/components/GameView.tsx` (mobile edge-to-edge, floating glass dock, isolated clocks under 10s red pulse, result sheet with Elo count-up).
- [x] Upgrade Web Audio synthesis in `src/lib/sounds.ts` (tactile wood tap, master volume slider).
- [x] Implement `src/lib/haptics.ts` (`navigator.vibrate` for moves, captures, checks).
- [x] Gate check: Mobile playability at 390x844 without scroll, 60fps drag, Elo count-up animation.

### Phase 6: Landing, Home & Play Hubs (Track E)
- [x] Overhaul `src/components/LoginShowcase.tsx` (remove all forbidden strings, new copy, live demonstration board).
- [x] Build signed-in hub `src/pages/Home.tsx` (rating card, sparkline, quick actions, recent matches).
- [x] Build `src/pages/Bots.tsx` (bot level ladder, difficulty chips, untimed & timed play).
- [x] Restyle navigation (`NavRail.tsx`, `MobileTabBar.tsx`) with new branding and theme toggle.
- [x] Gate check: No forbidden strings in `dist/`, mobile LCP < 2.0s.

### Phase 7: Profile, History, Leaderboard & Settings (Track E)
- [x] Build `src/pages/Profile.tsx` (editable profile, SVG rating history chart, stats grid, game log).
- [x] Build public profile view `/u/:username`.
- [x] Build `src/pages/Leaderboard.tsx` (top 100 with pinned user rank).
- [x] Build `src/pages/Settings.tsx` (theme, board squares, audio, haptics, move hints).
- [x] Gate check: Profile editing with validation, public view, leaderboard RPC.

### Phase 8: Performance, PWA & Accessibility (Track G)
- [x] Optimize chunk splitting in `vite.config.ts` (lazy Stockfish, route code splitting).
- [x] Add service worker for offline bot play via `public/sw.js`.
- [x] Set security headers & immutable asset caching in `vercel.json`.
- [x] Full keyboard navigation & ARIA live game announcements.
- [x] Gate check: Initial JS < 180 KB gz (achieved ~150 KB gz), zero critical violations.

### Phase 9: QA, Docs & Release
- [x] Comprehensive unit and integration test suite passing (36/36 tests green).
- [x] Visual quality verification across viewports and themes.
- [x] Update `README.md` and author `docs/WALKTHROUGH.md`.
- [x] Complete owner checklist in `docs/OWNER_ACTIONS.md`.
- [x] Gate check: All 16 quality gates in MASTER_PROMPT §16 verified.
