# DB_CHANGELOG.md — Database & Edge Function Change Log

All database schema migrations, RPC definitions, and Edge Function deployments must be logged here with date, author, verification outcome, and complete rollback SQL.

---

## Migration History

### 0001: Initial Chess Multiplayer & Clocks
- **Date:** 2026-11-17
- **Version:** `0001_chess.sql`
- **Tables:** `public.games`, `public.game_moves`
- **Functions:** `queue_game`, `commit_move`
- **Status:** APPLIED (Baseline)

---

### 0002: Friends, Profiles & Match Invites
- **Date:** 2026-11-17
- **Version:** `0002_friends_and_invites.sql`
- **Tables:** `public.profiles`, `public.friendships`, `public.game_invites`
- **Functions:** `handle_user_sync`, `search_players`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `create_game_invite`, `accept_game_invite`, `decline_game_invite`, `cancel_game_invite`
- **Status:** APPLIED (Baseline)

---

### 0003: Profiles Extension, Elo Rating & Bot Game Audit Log
- **Date:** 2026-11-18
- **Version:** `0003_profiles_elo.sql`
- **Tables Modified / Added:**
  - `public.profiles`: Extended with `bio`, `description`, `country`, `theme_pref`, `rating` (default 800), `peak_rating` (800), `games_played` (0), `wins` (0), `draws` (0), `losses` (0), `username_changed_at`.
  - `public.rating_history`: Created with RLS and covering indexes on `(user_id, created_at desc)` and `(game_id)`.
  - `public.bot_games`: Created with RLS and index on `(user_id, created_at desc)`.
  - `public.games`: Added `rating_applied_at timestamptz`.
- **Functions:**
  - `public.protect_profile_rating()`: Trigger function preventing client-side forgery of stats.
  - `public.apply_online_game_rating(uuid)`: Atomic Elo rating RPC with pre-game ratings, K-schedule (40/20/10), 400-point clamp, floor 100, and idempotent guards. Permission restricted to `service_role`.
  - `public.leaderboard(int)`: Global leaderboard query for top rated players.
- **Status:** APPLIED & VERIFIED on project `fhlpgtkftfhqcgppfnud`.

#### Rollback SQL for 0003:
```sql
-- Rollback 0003_profiles_elo
drop function if exists public.leaderboard(int);
drop function if exists public.apply_online_game_rating(uuid);

drop table if exists public.bot_games cascade;
drop table if exists public.rating_history cascade;

alter table public.games drop column if exists rating_applied_at;

alter table public.profiles
  drop column if exists bio,
  drop column if exists description,
  drop column if exists country,
  drop column if exists theme_pref,
  drop column if exists rating,
  drop column if exists peak_rating,
  drop column if exists games_played,
  drop column if exists wins,
  drop column if exists draws,
  drop column if exists losses,
  drop column if exists username_changed_at;
```

---

## Edge Function Deployments

### `game-action`
- **Current Version:** 3 (ACTIVE)
- **JWT Verification:** Custom in-function via `auth.getUser(token)` (`verify_jwt: false`).
- **Updates in v3:** Calls `apply_online_game_rating` on checkmate, flag timeout, resignation, and draw agreements/claims.

### `record-bot-game`
- **Current Version:** 1 (ACTIVE)
- **JWT Verification:** Custom in-function via `auth.getUser(token)` (`verify_jwt: false`).
- **Role:** Replays bot game PGN via `chess.js`, validates plies >= 10, verifies no hints or takebacks were used, computes rating change with kScale 0.5, enforces daily +100 cap and 60 games/day max, and updates `profiles`, `bot_games`, and `rating_history` atomically using service role.
