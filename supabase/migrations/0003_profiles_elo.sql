-- ===================== CHESS: Profiles Extension, Elo Rating & Bot Audit =====================
-- Migration: 0003_profiles_elo.sql
-- Idempotent and additive. Safe for production.

-- 1. Extend profiles with rating, bio, stats, and preferences
alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists description text not null default '',
  add column if not exists country text,
  add column if not exists theme_pref text not null default 'system',
  add column if not exists rating int not null default 800,
  add column if not exists peak_rating int not null default 800,
  add column if not exists games_played int not null default 0,
  add column if not exists wins int not null default 0,
  add column if not exists draws int not null default 0,
  add column if not exists losses int not null default 0,
  add column if not exists username_changed_at timestamptz;

-- Theme preference constraint
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_theme_pref_check') then
    alter table public.profiles add constraint profiles_theme_pref_check
      check (theme_pref in ('system', 'light', 'dark'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_rating_floor_check') then
    alter table public.profiles add constraint profiles_rating_floor_check
      check (rating >= 100);
  end if;
end $$;

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create index if not exists profiles_rating_idx on public.profiles (rating desc);

-- 2. Rating History Table (Logs every rated match)
create table if not exists public.rating_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  bot_game_id uuid,
  mode text not null check (mode in ('online', 'bot')),
  opponent_label text not null,
  opponent_rating int not null,
  result text not null check (result in ('win', 'draw', 'loss')),
  rating_before int not null,
  rating_after int not null,
  delta int not null,
  time_control text,
  opening text,
  pgn text,
  created_at timestamptz not null default now()
);

create index if not exists rating_history_user_idx on public.rating_history (user_id, created_at desc);
create index if not exists rating_history_game_idx on public.rating_history (game_id);

-- 3. Bot Games Table (Server-side verified)
create table if not exists public.bot_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bot_id text not null,
  bot_elo int not null,
  user_color text not null check (user_color in ('w', 'b')),
  pgn text not null,
  result text not null check (result in ('1-0', '0-1', '1/2-1/2')),
  reason text not null,
  plies int not null,
  rated boolean not null default false,
  rating_applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bot_games_user_idx on public.bot_games (user_id, created_at desc);

-- 4. Add rating_applied_at to games table
alter table public.games
  add column if not exists rating_applied_at timestamptz;

-- 5. Row Level Security Policies
alter table public.rating_history enable row level security;
alter table public.bot_games enable row level security;

-- Rating History: Viewable by authenticated users for profile display
drop policy if exists rating_history_select on public.rating_history;
create policy rating_history_select on public.rating_history
  for select to authenticated
  using (true);

-- Bot Games: Viewable by the player
drop policy if exists bot_games_select on public.bot_games;
create policy bot_games_select on public.bot_games
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Grants
grant select on public.rating_history to authenticated;
grant select on public.bot_games to authenticated;

-- 6. Trigger to prevent clients from directly modifying their own rating/stats
create or replace function public.protect_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- If invoked by authenticated client, enforce that ratings/stats cannot be forged
  if current_user = 'authenticated' then
    new.rating := old.rating;
    new.peak_rating := old.peak_rating;
    new.games_played := old.games_played;
    new.wins := old.wins;
    new.draws := old.draws;
    new.losses := old.losses;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_rating on public.profiles;
create trigger trg_protect_profile_rating
  before update on public.profiles
  for each row execute function public.protect_profile_rating();

-- 7. Atomic Online Game Rating Function (Callable by Edge Function / service_role)
create or replace function public.apply_online_game_rating(p_game_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g public.games;
  w_prof public.profiles;
  b_prof public.profiles;
  w_score numeric;
  b_score numeric;
  w_k int;
  b_k int;
  w_opp_clamped numeric;
  b_opp_clamped numeric;
  w_expected numeric;
  b_expected numeric;
  w_delta int;
  b_delta int;
  w_new_rating int;
  b_new_rating int;
  w_res text;
  b_res text;
begin
  -- Select and lock game
  select * into g from public.games where id = p_game_id for update;
  if not found then
    return json_build_object('success', false, 'error', 'Game not found');
  end if;

  if g.mode <> 'online' then
    return json_build_object('success', false, 'error', 'Not an online game');
  end if;

  if g.status <> 'finished' then
    return json_build_object('success', false, 'error', 'Game is not finished');
  end if;

  if g.rating_applied_at is not null then
    return json_build_object('success', true, 'already_applied', true);
  end if;

  if g.white_id is null or g.black_id is null then
    return json_build_object('success', false, 'error', 'Missing players');
  end if;

  -- Games ending in under 4 plies are unrated
  if g.ply < 4 then
    update public.games set rating_applied_at = now() where id = g.id;
    return json_build_object('success', true, 'unrated_too_short', true);
  end if;

  -- Lock both player profiles
  select * into w_prof from public.profiles where id = g.white_id for update;
  select * into b_prof from public.profiles where id = g.black_id for update;

  if not found then
    return json_build_object('success', false, 'error', 'Player profiles not found');
  end if;

  -- Determine outcome
  if g.result = '1-0' then
    w_score := 1.0; b_score := 0.0;
    w_res := 'win'; b_res := 'loss';
  elsif g.result = '0-1' then
    w_score := 0.0; b_score := 1.0;
    w_res := 'loss'; b_res := 'win';
  elsif g.result = '1/2-1/2' then
    w_score := 0.5; b_score := 0.5;
    w_res := 'draw'; b_res := 'draw';
  else
    return json_build_object('success', false, 'error', 'Invalid game result');
  end if;

  -- K-factor schedule
  w_k := case when w_prof.games_played < 30 then 40 when w_prof.rating >= 2400 then 10 else 20 end;
  b_k := case when b_prof.games_played < 30 then 40 when b_prof.rating >= 2400 then 10 else 20 end;

  -- 400-point clamp
  w_opp_clamped := greatest(w_prof.rating - 400, least(w_prof.rating + 400, b_prof.rating));
  b_opp_clamped := greatest(b_prof.rating - 400, least(b_prof.rating + 400, w_prof.rating));

  -- Expected scores
  w_expected := 1.0 / (1.0 + power(10.0, (w_opp_clamped - w_prof.rating) / 400.0));
  b_expected := 1.0 / (1.0 + power(10.0, (b_opp_clamped - b_prof.rating) / 400.0));

  -- Deltas
  w_delta := round(w_k * (w_score - w_expected));
  b_delta := round(b_k * (b_score - b_expected));

  w_new_rating := greatest(100, w_prof.rating + w_delta);
  b_new_rating := greatest(100, b_prof.rating + b_delta);

  -- Update White profile
  update public.profiles set
    rating = w_new_rating,
    peak_rating = greatest(peak_rating, w_new_rating),
    games_played = games_played + 1,
    wins = wins + (case when w_res = 'win' then 1 else 0 end),
    draws = draws + (case when w_res = 'draw' then 1 else 0 end),
    losses = losses + (case when w_res = 'loss' then 1 else 0 end),
    updated_at = now()
  where id = w_prof.id;

  -- Update Black profile
  update public.profiles set
    rating = b_new_rating,
    peak_rating = greatest(peak_rating, b_new_rating),
    games_played = games_played + 1,
    wins = wins + (case when b_res = 'win' then 1 else 0 end),
    draws = draws + (case when b_res = 'draw' then 1 else 0 end),
    losses = losses + (case when b_res = 'loss' then 1 else 0 end),
    updated_at = now()
  where id = b_prof.id;

  -- Insert White Rating History
  insert into public.rating_history (
    user_id, game_id, mode, opponent_label, opponent_rating, result,
    rating_before, rating_after, delta, time_control, pgn
  ) values (
    w_prof.id, g.id, 'online', coalesce(b_prof.username, 'Opponent'), b_prof.rating, w_res,
    w_prof.rating, w_new_rating, w_delta, g.tc, g.pgn
  );

  -- Insert Black Rating History
  insert into public.rating_history (
    user_id, game_id, mode, opponent_label, opponent_rating, result,
    rating_before, rating_after, delta, time_control, pgn
  ) values (
    b_prof.id, g.id, 'online', coalesce(w_prof.username, 'Opponent'), w_prof.rating, b_res,
    b_prof.rating, b_new_rating, b_delta, g.tc, g.pgn
  );

  -- Mark game rating applied
  update public.games set rating_applied_at = now() where id = g.id;

  return json_build_object(
    'success', true,
    'white_delta', w_delta,
    'white_rating', w_new_rating,
    'black_delta', b_delta,
    'black_rating', b_new_rating
  );
end;
$$;

-- 8. Leaderboard RPC Function
create or replace function public.leaderboard(p_limit int default 100)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  rating int,
  peak_rating int,
  games_played int,
  wins int,
  draws int,
  losses int
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.rating,
    p.peak_rating,
    p.games_played,
    p.wins,
    p.draws,
    p.losses
  from public.profiles p
  where p.games_played >= 1
  order by p.rating desc, p.games_played desc
  limit coalesce(p_limit, 100);
end;
$$;

grant execute on function public.apply_online_game_rating(uuid) to service_role;
revoke execute on function public.apply_online_game_rating(uuid) from public, anon, authenticated;
grant execute on function public.leaderboard(int) to authenticated, anon;

-- 9. Add rating_history to Realtime Publication safely
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rating_history') then
    alter publication supabase_realtime add table public.rating_history;
  end if;
end $$;
