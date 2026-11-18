# PLAN.md — Chess by Ismail Studio v2 Implementation Task List

## Decisions Log
- **D1 (Made):** One Elo rating for all modes (online and bots). Start 800, floor 100.
- **D2 (Made):** Brand direction: green identity, original minimal pawn mark.
- **D3 (Made):** Guest bot play (signed out, unrated) is in scope for instant onboarding.
- **D4 (Made):** No new UI framework. Tailwind 4 + tokens + small primitives.
- **D5 (Delegated):** Router: Enhanced lightweight history router in `src/lib/router.tsx` with regex parameter matching (`/game/:id`, `/u/:username`) and `React.lazy`.
- **D6 (Delegated):** Data Caching: Hand-rolled optimistic SWR cache hook to preserve bundle size under 180 KB.
- **D7 (Delegated):** Charts: Pure inline SVG chart component (`RatingChart.tsx`) with zero external bundle overhead.
- **D8 (Delegated):** Avatars: Geometric dual-tone SVG piece tiles + Google photo fallback.

---

## Phase Breakdown & Ownership

### Phase 0: Recon & Project Memory
- [x] Map repository architecture, routes, state, and dependencies.
- [x] Inspect live Supabase project via MCP (tables, migrations, advisors, edge functions).
- [x] Catalog problem strings and anti-slop inventory.
- [x] Measure build baseline (`typecheck`, `test`, `build`).
- [x] Create project memory files (`AGENTS.md`, `docs/AUDIT.md`, `docs/PLAN.md`, `docs/PROGRESS.md`, `docs/DESIGN.md`, `docs/OWNER_ACTIONS.md`, `docs/DB_CHANGELOG.md`, `docs/RATING.md`).

### Phase 1: Foundation (Track A)
- [ ] Implement design tokens in `src/index.css` (M3 color roles, typography, motion, glass utilities with fallbacks).
- [ ] Add zero-flash pre-paint inline theme script to `index.html`.
- [ ] Build `src/lib/theme.ts` (System / Light / Dark manager with persistence).
- [ ] Build shared UI primitives in `src/components/ui/` (`Button`, `Card`, `Chip`, `Segmented`, `Dialog`, `BottomSheet`, `Toast`, `Skeleton`, `Avatar`, `RatingBadge`, `ThemeToggle`, `Tabs`, `Input`, `Switch`).
- [ ] Create hidden `/dev/kit` component showcase route.
- [ ] Compute WCAG AA contrast matrix and record in `docs/DESIGN.md`.
- [ ] Gate check: Typecheck, test, build, contrast table, zero flash on reload.

### Phase 2: Brand & Share Assets (Track B)
- [ ] Design original geometric pawn mark (`public/logo-mark.svg`, `logo-wordmark.svg`, `logo-mono.svg`, `favicon.svg`).
- [ ] Generate modern multi-size favicons and touch icons (`scripts/generate-icons.mjs`).
- [ ] Generate 1200x630 OG image under 300 KB (`scripts/og/render.mjs`, `public/og-preview.png`).
- [ ] Configure `public/manifest.webmanifest` and update `index.html` meta tags.
- [ ] Delete old knight emblem files and scripts.
- [ ] Commit GPL-3.0 `LICENSE` file.
- [ ] Gate check: Icons, OG preview, manifest validation.

### Phase 3: Backend, Rating & Profile Data (Track C)
- [ ] Author idempotent migration `supabase/migrations/0003_profiles_elo.sql`.
- [ ] Implement pure Elo calculation engine in `src/lib/rating.ts`.
- [ ] Author comprehensive Elo unit tests in `tests/rating.test.ts`.
- [ ] Implement and deploy `record-bot-game` Edge Function.
- [ ] Update `game-action` Edge Function to trigger `apply_online_game_rating`.
- [ ] Apply migration via Supabase MCP and verify with read-only queries.
- [ ] Regenerate TypeScript definitions in `src/types/db.ts`.
- [ ] Verify advisors report zero new warnings.
- [ ] Gate check: Rating math unit tests pass, migration verified, edge functions active.

### Phase 4: Bots & Engine Weakening (Track D)
- [ ] Define 14 bots in `src/lib/bots.ts` with ascending Elo, styles, personalities, and avatars.
- [ ] Implement humanized weakening layer in `src/lib/botEngine.ts` (MultiPV softmax, centipawn loss temperature, blunder injection).
- [ ] Write headless calibration runner `scripts/calibrate-bots.mjs`.
- [ ] Calibrate adjacent bots and record results in `docs/RATING.md`.
- [ ] Write bot engine unit tests in `tests/bots.test.ts`.
- [ ] Gate check: All 14 bots play legal chess to completion; Pebble/Mochi lose to club level.

### Phase 5: Game Screen & Board Feel (Track F)
- [ ] Re-engineer `src/components/Board.tsx` (lift on pickup, spring snap, click & drag, legal move indicators, red check glow, premoves, promotion).
- [ ] Redesign `src/components/GameView.tsx` (mobile edge-to-edge, floating glass dock, isolated clocks under 10s red pulse, result sheet with Elo count-up).
- [ ] Upgrade Web Audio synthesis in `src/lib/sounds.ts` (tactile wood tap, master volume slider).
- [ ] Implement `src/lib/haptics.ts` (`navigator.vibrate` for moves, captures, checks).
- [ ] Gate check: Mobile playability at 390x844 without scroll, 60fps drag, Elo count-up animation.

### Phase 6: Landing, Home & Play Hubs (Track E)
- [ ] Overhaul `src/components/LoginShowcase.tsx` (remove all forbidden strings, new copy, live demonstration board).
- [ ] Build signed-in hub `src/pages/Home.tsx` (rating card, sparkline, quick actions, recent matches).
- [ ] Build `src/pages/Bots.tsx` (bot level ladder, difficulty chips, untimed & timed play).
- [ ] Restyle navigation (`NavRail.tsx`, `MobileTabBar.tsx`) with new branding and theme toggle.
- [ ] Gate check: No forbidden strings in `dist/`, mobile LCP < 2.0s.

### Phase 7: Profile, History, Leaderboard & Settings (Track E)
- [ ] Build `src/pages/Profile.tsx` (editable profile, SVG rating history chart, stats grid, game log).
- [ ] Build public profile view `/u/:username`.
- [ ] Build `src/pages/Leaderboard.tsx` (top 100 with pinned user rank).
- [ ] Build `src/pages/Settings.tsx` (theme, board squares, audio, haptics, move hints).
- [ ] Gate check: Profile editing with validation, public view, leaderboard RPC.

### Phase 8: Performance, PWA & Accessibility (Track G)
- [ ] Optimize chunk splitting in `vite.config.ts` (lazy Stockfish, route code splitting).
- [ ] Add service worker for offline bot play via `vite-plugin-pwa`.
- [ ] Set security headers & immutable asset caching in `vercel.json`.
- [ ] Full keyboard navigation & ARIA live game announcements.
- [ ] Gate check: Initial JS < 180 KB gz, zero critical `axe` violations.

### Phase 9: QA, Docs & Release
- [ ] Playwright e2e test suite (`tests/e2e/chess.spec.ts`).
- [ ] Visual regression verification across 3 viewports and 2 themes.
- [ ] Update `README.md` and complete `docs/WALKTHROUGH.md`.
- [ ] Complete owner checklist in `docs/OWNER_ACTIONS.md`.
- [ ] Gate check: All 16 gates in MASTER_PROMPT §16 green.
