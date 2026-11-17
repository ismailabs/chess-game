-- ===================== CHESS: single, idempotent migration =====================
-- Two application tables: games, game_moves. All writes go through the `game-action`
-- Edge Function (service_role). Clients may only SELECT their own games/moves.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('online','ai')),
  status text not null default 'waiting' check (status in ('waiting','active','finished','aborted')),
  white_id uuid references auth.users(id) on delete cascade,
  black_id uuid references auth.users(id) on delete cascade,
  white_name text, black_name text, white_avatar text, black_avatar text,
  ai_engine text, ai_level smallint,
  ai_color text check (ai_color in ('w','b')),
  tc text not null,
  initial_ms integer not null check (initial_ms > 0),
  increment_ms integer not null check (increment_ms >= 0),
  white_ms integer not null check (white_ms >= 0),
  black_ms integer not null check (black_ms >= 0),
  turn text not null default 'w' check (turn in ('w','b')),
  turn_started_at timestamptz,
  fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  pgn text not null default '',
  ply integer not null default 0 check (ply >= 0),
  result text check (result in ('1-0','0-1','1/2-1/2')),
  termination text,
  draw_offer_by uuid references auth.users(id) on delete set null,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint games_distinct_players check (white_id is null or black_id is null or white_id <> black_id),
  constraint games_mode_shape check (
    (mode = 'online' and ai_color is null and ai_engine is null
       and (status in ('waiting','aborted') or (white_id is not null and black_id is not null)))
    or
    (mode = 'ai' and ai_engine is not null and ai_level is not null and (
       (ai_color = 'w' and white_id is null and black_id is not null) or
       (ai_color = 'b' and black_id is null and white_id is not null)))
  ),
  constraint games_result_matches_status check ((status = 'finished') = (result is not null))
);

create table if not exists public.game_moves (
  game_id uuid not null references public.games(id) on delete cascade,
  ply integer not null check (ply >= 1),
  player_id uuid references auth.users(id) on delete set null,   -- null = engine move
  san text not null,
  uci text not null check (uci ~ '^[a-h][1-8][a-h][1-8][qrbn]?$'),
  fen text not null,
  white_ms integer not null,
  black_ms integer not null,
  created_at timestamptz not null default now(),
  primary key (game_id, ply)
);

create index if not exists games_white_idx on public.games (white_id, updated_at desc);
create index if not exists games_black_idx on public.games (black_id, updated_at desc);
create index if not exists games_waiting_idx on public.games (tc, created_at)
  where status = 'waiting' and mode = 'online';
-- One queue entry per user, enforced by the database.
create unique index if not exists games_one_queue_per_user on public.games (white_id)
  where status = 'waiting' and mode = 'online';

-- ---------- Row Level Security ----------
alter table public.games enable row level security;
alter table public.game_moves enable row level security;

revoke all on public.games, public.game_moves from anon, authenticated;
grant select on public.games, public.game_moves to authenticated;

drop policy if exists games_select_participants on public.games;
create policy games_select_participants on public.games
  for select to authenticated
  using ((select auth.uid()) in (white_id, black_id));

drop policy if exists moves_select_participants on public.game_moves;
create policy moves_select_participants on public.game_moves
  for select to authenticated
  using (exists (
    select 1 from public.games g
    where g.id = game_moves.game_id and (select auth.uid()) in (g.white_id, g.black_id)
  ));
-- No INSERT/UPDATE/DELETE policies and no grants: clients cannot write. service_role bypasses RLS.

-- ---------- Matchmaking (atomic) ----------
create or replace function public.queue_game(
  p_user uuid, p_name text, p_avatar text, p_tc text, p_initial integer, p_inc integer
) returns public.games
language plpgsql
set search_path = public, pg_temp
as $$
declare
  mine public.games;
  other public.games;
  g public.games;
begin
  if p_user is null then raise exception 'user required'; end if;

  delete from public.games
   where status = 'waiting' and mode = 'online' and updated_at < now() - interval '10 minutes';

  select * into mine from public.games
   where status = 'waiting' and mode = 'online' and white_id = p_user for update;
  if found then
    if mine.tc = p_tc then
      update public.games set updated_at = now() where id = mine.id returning * into g;
      return g;
    end if;
    delete from public.games where id = mine.id;
  end if;

  select * into other from public.games
   where status = 'waiting' and mode = 'online' and tc = p_tc
     and white_id <> p_user and updated_at > now() - interval '2 minutes'
   order by created_at limit 1 for update skip locked;

  if found then
    if random() < 0.5 then
      update public.games set
        black_id = p_user, black_name = p_name, black_avatar = p_avatar,
        status = 'active', started_at = now(), turn_started_at = now(),
        revision = revision + 1, updated_at = now()
       where id = other.id returning * into g;
    else
      update public.games set
        white_id = p_user, white_name = p_name, white_avatar = p_avatar,
        black_id = other.white_id, black_name = other.white_name, black_avatar = other.white_avatar,
        status = 'active', started_at = now(), turn_started_at = now(),
        revision = revision + 1, updated_at = now()
       where id = other.id returning * into g;
    end if;
    return g;
  end if;

  insert into public.games (mode, status, white_id, white_name, white_avatar, tc, initial_ms, increment_ms, white_ms, black_ms)
  values ('online', 'waiting', p_user, p_name, p_avatar, p_tc, p_initial, p_inc, p_initial, p_initial)
  returning * into g;
  return g;
end $$;

-- ---------- Move commit (compare-and-swap, atomic across both tables) ----------
create or replace function public.commit_move(
  p_game uuid, p_expected_rev integer, p_ply integer, p_player uuid,
  p_san text, p_uci text, p_fen text, p_pgn text,
  p_white_ms integer, p_black_ms integer, p_turn text, p_result text, p_termination text
) returns public.games
language plpgsql
set search_path = public, pg_temp
as $$
declare g public.games;
begin
  update public.games set
    fen = p_fen, pgn = p_pgn, ply = p_ply, turn = p_turn,
    white_ms = p_white_ms, black_ms = p_black_ms,
    turn_started_at = now(), draw_offer_by = null,
    revision = revision + 1, updated_at = now(),
    status = case when p_result is null then 'active' else 'finished' end,
    result = p_result, termination = p_termination,
    ended_at = case when p_result is null then null else now() end
   where id = p_game and revision = p_expected_rev and status = 'active' and ply = p_ply - 1
   returning * into g;
  if not found then return null; end if;

  insert into public.game_moves (game_id, ply, player_id, san, uci, fen, white_ms, black_ms)
  values (p_game, p_ply, p_player, p_san, p_uci, p_fen, p_white_ms, p_black_ms);
  return g;
end $$;

-- Only the Edge Function (service_role) may call these. Plain (non-SECURITY DEFINER) functions.
revoke all on function public.queue_game(uuid, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.commit_move(uuid, integer, integer, uuid, text, text, text, text, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.queue_game(uuid, text, text, text, integer, integer) to service_role;
grant execute on function public.commit_move(uuid, integer, integer, uuid, text, text, text, text, integer, integer, text, text, text) to service_role;

-- ---------- Realtime (adds tables to the existing publication; never drops it) ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games') then
    alter publication supabase_realtime add table public.games;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_moves') then
    alter publication supabase_realtime add table public.game_moves;
  end if;
end $$;
