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

### 0003: Profiles Extension, Elo Rating & Bot Game Audit Log (Planned - Phase 3)
- **Planned Version:** `0003_profiles_elo.sql`
- **Target Schema Changes:**
  1. Add columns to `public.profiles`:
     - `bio text not null default ''`
     - `description text not null default ''`
     - `country text`
     - `theme_pref text not null default 'system' check (theme_pref in ('system','light','dark'))`
     - `rating int not null default 800 check (rating >= 100)`
     - `peak_rating int not null default 800`
     - `games_played int not null default 0`
     - `wins int not null default 0`
     - `draws int not null default 0`
     - `losses int not null default 0`
     - `username_changed_at timestamptz`
  2. Create table `public.rating_history`:
     - Tracks per-game Elo changes for online PvP and verified bot games.
  3. Create table `public.bot_games`:
     - Server-side verified bot games with PGN, result, reason, and rating application status.
  4. Create RPC `apply_online_game_rating(game_id uuid)`:
     - Atomic, idempotent calculation and application of pre-game ratings for both sides.
  5. Create RPC `leaderboard(p_limit int default 100)`:
     - Top players with at least 10 games played.
  6. Add column `rating_applied_at timestamptz` to `public.games`.

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
- **Current Version:** 2
- **JWT Verification:** Custom in-function via `auth.getUser(token)` (`verify_jwt: false`).
- **Updates Planned (Phase 3):** Call `apply_online_game_rating` on checkmate, resignation, timeout, and draw agreements.

### `record-bot-game`
- **Status:** NEW (Phase 3)
- **Role:** Replays bot game PGN via `chess.js`, validates plies >= 10, verifies no hints were used, computes rating change with kScale 0.5, enforces daily +100 cap and 60 games/day max, and updates `profiles`, `bot_games`, and `rating_history` atomically using service role.
