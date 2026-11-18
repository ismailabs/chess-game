# AUDIT.md — Phase 0 Reconnaissance & Baseline Report

**Project:** Chess by Ismail Studio  
**Date:** 2026-11-18  
**Live Site:** https://chess.ismailstudio.my  
**Supabase Project Ref:** `fhlpgtkftfhqcgppfnud` (ap-northeast-1, ACTIVE_HEALTHY, Production)

---

## 1. Repository Architecture Map

### 1.1 Stack
- **Framework:** React 19.0.0, Vite 6.2.0, TypeScript 5.7.3, Tailwind CSS v4.0.9 (`@tailwindcss/vite`).
- **Chess Engine:** `chess.js` (v1.0.0-beta.9), `react-chessboard` (v5.12.1), `stockfish` (v18.0.0 lite single-threaded WASM in Web Worker).
- **Backend:** Supabase (`@supabase/supabase-js` v2.49.1), Supabase Auth (Google OAuth), Realtime (presence & postgres_changes), Edge Functions (`game-action`).
- **Icons & UI:** `lucide-react` (v0.475.0), custom synthesized Web Audio.
- **Testing:** Vitest 3.0.6 (19 unit tests passing).

### 1.2 Routes & Components (Current State)
- Current routing: Tiny custom history router in `src/lib/router.tsx` handling `online`, `computer`, `history`.
- Pages:
  - `src/pages/Online.tsx`: Matchmaking queue & online PvP.
  - `src/pages/Computer.tsx`: Stockfish bot play (limited levels).
  - `src/pages/History.tsx`: List of recent games with replay viewer.
- Core UI components:
  - `src/components/LoginShowcase.tsx`: Split-screen landing / Google sign-in.
  - `src/components/NavRail.tsx`: Desktop left rail navigation.
  - `src/components/MobileTabBar.tsx`: Mobile frosted bottom tab bar.
  - `src/components/Board.tsx`: `react-chessboard` wrapper.
  - `src/components/GameView.tsx`: In-game 2-column layout (board + action dock).
  - `src/components/FriendsModal.tsx`, `InviteModal.tsx`, `ChallengeToast.tsx`: Social and match invite system.
  - `src/components/BotBubble.tsx`, `CapturedPieces.tsx`, `MovesPanel.tsx`.

### 1.3 State Management
- Auth context via `src/lib/auth.tsx`.
- Realtime presence via `src/hooks/usePresence.ts`.
- Friend invites via `src/hooks/useFriendInvites.ts`.
- Live game state via `src/hooks/useGame.ts`.
- AI game state via `src/hooks/useAiPlayer.ts`.

---

## 2. Supabase Live State (Inspected via Supabase MCP)

### 2.1 Project Configuration
- **Project Ref:** `fhlpgtkftfhqcgppfnud`
- **Region:** `ap-northeast-1`
- **Database Engine:** PostgreSQL 17.12.0.000
- **Environment:** Production (no development branches exist).
- **Safety Directive:** All migrations must be strictly additive and idempotent (`if not exists`, `alter table add column if not exists`). Rollback scripts documented in `docs/DB_CHANGELOG.md`.

### 2.2 Migrations Applied
1. `version: "0001", name: "chess"` (`supabase/migrations/0001_chess.sql`)
   - Tables: `public.games`, `public.game_moves`
   - RPCs: `queue_game`, `commit_move`
   - Realtime publication: `games`, `game_moves` added.
2. `version: "0002", name: "friends_and_invites"` (`supabase/migrations/0002_friends_and_invites.sql`)
   - Tables: `public.profiles` (id, username, display_name, email, avatar_url), `public.friendships`, `public.game_invites`
   - Trigger: `handle_user_sync()` on `auth.users`
   - RPCs: `search_players`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `create_game_invite`, `accept_game_invite`, `decline_game_invite`, `cancel_game_invite`
   - Realtime publication: `profiles`, `friendships`, `game_invites` added.

### 2.3 Edge Functions
- `game-action`: Active, version 2, `verify_jwt: false` (JWT verified via `auth.getUser(token)` inside the function).

### 2.4 Advisors & Lint Status (Baseline)
- **Security:**
  - 10 warnings on `SECURITY DEFINER` functions callable by `anon` or `authenticated` (`accept_game_invite`, `cancel_game_invite`, `create_game_invite`, `decline_game_invite`, `handle_user_sync`, `remove_friend`, `respond_friend_request`, `rls_auto_enable`, `search_players`, `send_friend_request`).
  - 1 warning on `auth_leaked_password_protection`.
- **Performance:**
  - 3 info notices on unindexed foreign keys (`game_invites.game_id`, `game_moves.player_id`, `games.draw_offer_by`).
  - 2 info notices on unused indexes (`profiles_email_idx`, `game_invites_receiver_idx`).

---

## 3. Bundle & Build Baseline

- `npm run typecheck`: **Clean** (0 TypeScript errors).
- `npm test`: **19 passed** (19/19 in `tests/rules.test.ts`, 1.12s).
- `npm run build`:
  - `dist/index.html`: 2.48 kB (gzip: 0.88 kB)
  - `dist/assets/index-CTM7i1mE.css`: 56.03 kB (gzip: 10.19 kB)
  - `dist/assets/index-CicNVFVT.js`: 677.99 kB (gzip: **194.60 kB**)
- **Budget Gap:** Initial JS gzip is currently 194.60 kB vs the 180 kB budget in Phase 8. This will be resolved via dynamic route imports (`React.lazy`) and chunk splitting.

---

## 4. Problem Strings & Anti-Slop Inventory

The following items violate design laws or product copy rules and must be eliminated:

| File | Line | Current Violation | Fix |
|---|---|---|---|
| `src/components/LoginShowcase.tsx` | 45 | `"Next-Generation Chess Arena"` pill | Remove entirely |
| `src/components/LoginShowcase.tsx` | 50 | `"Dark Studio Luxury"` headline | Replace with `"Play chess. Get better."` |
| `src/components/LoginShowcase.tsx` | 54 | `"wrapped in an Apple Liquid Glass design system"` | Replace with `"Challenge friends, beat bots at your level, and climb the ladder."` |
| `src/components/LoginShowcase.tsx` | 160, 163 | `Official domain: chess.ismailstudio.my` | Remove entirely |
| `src/components/GameView.tsx` | 63 | `"Loading arena…"` | Change to `"Loading game…"` |
| `src/components/GameView.tsx` | 82 | `"Matchmaking Arena"` | Change to `"Matchmaking"` |
| `src/components/GameView.tsx` | 499 | `"Done / Back to Arena"` | Change to `"Done / Back to Play"` |
| `src/pages/Online.tsx` | 131 | `"Live Arena"` | Change to `"Play Online"` |
| `src/App.tsx` | 204, 207 | Domain link in footer | Keep copyright, remove domain text link |
| `scripts/generate-assets.mjs` | all | Old knight emblem generation | Replace with original dual-tone pawn logo generator |
