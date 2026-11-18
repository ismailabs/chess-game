# AGENTS.md — Chess by Ismail Studio v2 Rules & Laws

Single source of truth for all agents working on Chess by Ismail Studio. Keep under 250 lines.

## 1. Operating Rules
1. **Plan, then act.** Every phase begins with a clear written plan and ends with verified gate checks.
2. **Small steps, small commits.** Conventional commits (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`). One logical change per commit. Push to `v2/<phase>` branches and merge to `main` only after gates pass.
3. **Verify by running.** UI work: screenshot at 390x844, 768x1024, 1440x900 in both Light and Dark themes. Logic work: `npm run typecheck && npm test && npm run build`.
4. **Context hygiene.** Do not load the whole repo. Read only relevant files; reload this file before each phase.
5. **Never break what works.** Auth, Realtime presence, friends, invites, matchmaking, clocks, and Edge Functions are production features. Keep existing tests green.
6. **No secrets in repo.** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the browser. Service-role keys belong strictly in Edge Functions.
7. **No placeholder content.** No lorem ipsum, no fake stats, no emoji icons. Use `lucide-react` with consistent 1.75/2px stroke width.
8. **Ask only when blocked.** Make the best decision, document it in `docs/PLAN.md` under Decisions, and proceed.
9. **Self-critique loop.** Score screenshots 1 to 10 against the §5.9 rubric. Minimum 9 on every line before closing a UI phase.
10. **Be honest in reports.** Never mark "PASSED" without running the command. Paste real command outputs.
11. **Supabase MCP safety.**
    - Read schemas and inspect tables/functions before modifying.
    - Schema changes MUST be additive, idempotent migrations (e.g. `0003_profiles_elo.sql`). Never run ad-hoc destructive DDL.
    - Write rollback SQL in `docs/DB_CHANGELOG.md` before applying changes.
    - Run security and performance advisors after every schema change and fix any new warnings.
    - Degrade gracefully if DB tables are absent (e.g., local dev or preview environments).

## 2. Design Laws (Material 3 Expressive + Apple Liquid Glass)
1. **Liquid Glass belongs only to the functional layer**: navigation bars, bottom tab bars, toolbars, floating action docks, sheets, popovers, dialogs, toasts.
2. **Never put glass on content**: board bezels, move lists, profile stat cards, bot cards, and friends rows use solid or lightly tinted standard surfaces.
3. **Never stack glass on glass.** At most 3 glass surfaces on screen simultaneously. No animated blur radius.
4. **Glass fallback**: `@supports not (backdrop-filter: blur(1px))`, `prefers-reduced-transparency`, and `prefers-contrast: more` must fall back to opaque surfaces with borders.
5. **Colors & Roles**:
   - Dark: `--bg`: `#1d1c1a`, `--surface`: `#262522`, `--surface-container`: `#302e2b`, `--on-surface`: `#eef0ea`, `--primary`: `#81b64c`, `--tertiary`: `#e5b84b`.
   - Light: `--bg`: `#f3f5f0`, `--surface`: `#ffffff`, `--surface-container`: `#e9ede4`, `--on-surface`: `#1b1f17`, `--primary`: `#5d9a30`, `--tertiary`: `#a9760a`.
   - Board: Light `#eeeed2`, Dark `#769656`. Optional Slate and Walnut in settings.
   - All text/background pairs MUST meet WCAG AA (4.5:1 text, 3:1 UI). Light theme must be cool/fresh, not sepia or yellowed.
6. **Theme system**: System / Light / Dark. Zero theme flash via pre-paint inline script in `index.html`. Persisted in `localStorage` and `profiles.theme_pref`.
7. **Game feel**:
   - Pieces lift on drag (scale 1.1, drop shadow), smooth spring on release. Click-click and drag-and-drop both work.
   - Legal-move dots on empty squares, rings on capturable squares. Radial red glow for check.
   - Isolated clock components: clocks never trigger board re-renders. Clocks turn red and pulse under 10s.
   - Result sheet: Glass bottom sheet (mobile) / modal (desktop) with animated Elo count-up (`1243 → 1258 +15`).
   - Rich Web Audio synthesis with wood tap noise transient and master volume slider. Haptics via `navigator.vibrate`.
8. **Copy rules**: Friendly, plain English. Never mention "Dark Studio", "Luxury", "Liquid Glass", "Next-Generation", or "Arena". All buttons start with a verb. No ALL-CAPS buttons. Centralize strings in `src/lib/copy.ts`.
9. **Anti-slop list**: Reject gradient-text headlines, purple-blue AI gradients, emoji icons, oversized shadows, layout shift during data load, and spinners where skeletons belong.

## 3. Engineering Laws
1. **Strict TypeScript**: No `any` without an explanatory comment. Database types in `src/types/db.ts`.
2. **Feature-based architecture**: `src/features/*`, shared components in `src/components/ui/*`, pure logic in `src/lib/*`.
3. **Routing**: Lightweight router supporting lazy routes (`/`, `/play`, `/bots`, `/game/:id`, `/history`, `/leaderboard`, `/profile`, `/u/:username`, `/settings`).
4. **Server is authority**: Ratings, clock timeouts, game outcomes, and move legality are verified by Supabase / Edge Functions, never trusted from client.
5. **Elo Rating Spec**: Start 800, floor 100. K=40 (<30 games), K=20 (>=30 games), K=10 (>=2400). Opponent rating clamped to 400 pts. Bots use kScale 0.5, daily cap +100 gain, max 60 rated bot games/day. Replayed and verified via `record-bot-game` Edge Function.
6. **Bot weakening layer**: Stockfish native Elo only down to 1320. Sub-1300 bots use depth throttling, MultiPV candidate selection, softmax over centipawn loss with temperature, and blunder probability injection. Pebble (250) uses weighted random moves.
7. **Bundle budget**: Initial JS under 180 KB gzip. Stockfish worker and WASM are strictly lazy-loaded on demand.
