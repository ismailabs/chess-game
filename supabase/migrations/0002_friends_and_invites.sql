-- ===================== CHESS: Friends, Profiles & Match Invites =====================
-- Migration: 0002_friends_and_invites.sql

-- 1. PROFILES TABLE (synchronized from auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_email_idx on public.profiles (email);

-- Automatic profile sync trigger from auth.users
create or replace function public.handle_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  u_name text;
  u_avatar text;
  u_username text;
  base_username text;
begin
  u_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Player');
  u_avatar := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
  base_username := lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'player'), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'player_' || substr(new.id::text, 1, 6);
  end if;

  u_username := base_username;
  if exists (select 1 from public.profiles where username = u_username and id <> new.id) then
    u_username := base_username || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into public.profiles (id, username, display_name, email, avatar_url, updated_at)
  values (new.id, u_username, u_name, new.email, u_avatar, now())
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
  after insert or update of raw_user_meta_data, email on auth.users
  for each row execute function public.handle_user_sync();

-- Backfill any existing users from auth.users
insert into public.profiles (id, username, display_name, email, avatar_url)
select
  u.id,
  case
    when length(lower(regexp_replace(coalesce(split_part(u.email, '@', 1), 'player'), '[^a-z0-9_]', '', 'g'))) >= 3
    then lower(regexp_replace(coalesce(split_part(u.email, '@', 1), 'player'), '[^a-z0-9_]', '', 'g')) || '_' || substr(u.id::text, 1, 4)
    else 'player_' || substr(u.id::text, 1, 8)
  end,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Player'),
  u.email,
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;

-- 2. FRIENDSHIPS TABLE
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,     -- sender
  friend_id uuid not null references auth.users(id) on delete cascade,   -- receiver
  status text not null check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

create index if not exists friendships_user_idx on public.friendships (user_id, status);
create index if not exists friendships_friend_idx on public.friendships (friend_id, status);

-- 3. GAME INVITES TABLE
create table if not exists public.game_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  tc text not null,
  initial_ms integer not null,
  increment_ms integer not null,
  color_preference text not null default 'random' check (color_preference in ('w', 'b', 'random')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  game_id uuid references public.games(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  constraint game_invites_no_self check (sender_id <> receiver_id)
);

create index if not exists game_invites_receiver_idx on public.game_invites (receiver_id, status);
create index if not exists game_invites_sender_idx on public.game_invites (sender_id, status);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.game_invites enable row level security;

-- Profiles: All authenticated users can search/view profiles; users can update their own
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Friendships: users can see rows where they are either side
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (user_id, friend_id));

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships
  for update to authenticated
  using ((select auth.uid()) in (user_id, friend_id));

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships
  for delete to authenticated
  using ((select auth.uid()) in (user_id, friend_id));

-- Game Invites:
drop policy if exists game_invites_select on public.game_invites;
create policy game_invites_select on public.game_invites
  for select to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

drop policy if exists game_invites_insert on public.game_invites;
create policy game_invites_insert on public.game_invites
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists game_invites_update on public.game_invites;
create policy game_invites_update on public.game_invites
  for update to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

drop policy if exists game_invites_delete on public.game_invites;
create policy game_invites_delete on public.game_invites
  for delete to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

-- Grants
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.game_invites to authenticated;

-- ---------- HELPER RPC FUNCTIONS ----------

-- Search players
create or replace function public.search_players(p_query text, p_limit int default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  clean_q text;
  me uuid;
begin
  me := auth.uid();
  clean_q := trim(coalesce(p_query, ''));
  if length(clean_q) = 0 then
    return;
  end if;

  return query
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where p.id <> me
    and (
      p.username ilike '%' || clean_q || '%'
      or p.display_name ilike '%' || clean_q || '%'
      or (p.email ilike clean_q || '%' and me is not null)
    )
  order by
    case when p.username ilike clean_q || '%' then 0 else 1 end,
    p.display_name
  limit coalesce(p_limit, 10);
end;
$$;

-- Send friend request
create or replace function public.send_friend_request(p_target_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
  existing record;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;
  if me = p_target_id then raise exception 'Cannot friend yourself'; end if;

  -- Check if other user exists
  if not exists (select 1 from public.profiles where id = p_target_id) then
    raise exception 'User not found';
  end if;

  -- Check existing friendship in either direction
  select * into existing from public.friendships
  where (user_id = me and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = me)
  limit 1;

  if found then
    if existing.status = 'blocked' then
      raise exception 'Unable to send friend request';
    elsif existing.status = 'accepted' then
      raise exception 'Already friends';
    elsif existing.user_id = me then
      raise exception 'Friend request already sent';
    elsif existing.friend_id = me then
      -- Target already sent request to me! Automatically accept.
      update public.friendships set status = 'accepted', updated_at = now() where id = existing.id;
      return json_build_object('success', true, 'status', 'accepted', 'friendship_id', existing.id);
    end if;
  end if;

  insert into public.friendships (user_id, friend_id, status)
  values (me, p_target_id, 'pending')
  returning id into existing.id;

  return json_build_object('success', true, 'status', 'pending', 'friendship_id', existing.id);
end;
$$;

-- Respond to friend request (accept/decline/block)
create or replace function public.respond_friend_request(p_friendship_id uuid, p_action text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
  f public.friendships;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;

  select * into f from public.friendships where id = p_friendship_id;
  if not found then raise exception 'Friendship not found'; end if;

  if p_action = 'accept' then
    if f.friend_id <> me then raise exception 'Not authorized to accept'; end if;
    update public.friendships set status = 'accepted', updated_at = now() where id = f.id;
    return json_build_object('success', true, 'status', 'accepted');
  elsif p_action = 'decline' or p_action = 'cancel' then
    if f.user_id <> me and f.friend_id <> me then raise exception 'Not authorized'; end if;
    delete from public.friendships where id = f.id;
    return json_build_object('success', true, 'status', 'removed');
  elsif p_action = 'block' then
    if f.user_id <> me and f.friend_id <> me then raise exception 'Not authorized'; end if;
    update public.friendships set status = 'blocked', updated_at = now() where id = f.id;
    return json_build_object('success', true, 'status', 'blocked');
  else
    raise exception 'Invalid action';
  end if;
end;
$$;

-- Remove friend
create or replace function public.remove_friend(p_target_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;

  delete from public.friendships
  where (user_id = me and friend_id = p_target_id)
     or (user_id = p_target_id and friend_id = me);

  return json_build_object('success', true);
end;
$$;

-- Create game invite
create or replace function public.create_game_invite(
  p_receiver_id uuid,
  p_tc text,
  p_color text default 'random'
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
  tc_row record;
  inv_id uuid;
  init_ms int;
  inc_ms int;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;
  if me = p_receiver_id then raise exception 'Cannot challenge yourself'; end if;

  -- Time control mapping
  if p_tc = '1+0' then init_ms := 60000; inc_ms := 0;
  elsif p_tc = '2+1' then init_ms := 120000; inc_ms := 1000;
  elsif p_tc = '3+2' then init_ms := 180000; inc_ms := 2000;
  elsif p_tc = '5+0' then init_ms := 300000; inc_ms := 0;
  elsif p_tc = '10+0' then init_ms := 600000; inc_ms := 0;
  elsif p_tc = '10+5' then init_ms := 600000; inc_ms := 5000;
  elsif p_tc = 'unlimited' then init_ms := 86400000; inc_ms := 0; -- 24h / casual
  else init_ms := 300000; inc_ms := 0;
  end if;

  -- Expire older pending invites between these users
  update public.game_invites
     set status = 'expired'
   where (sender_id = me and receiver_id = p_receiver_id and status = 'pending')
      or (sender_id = p_receiver_id and receiver_id = me and status = 'pending');

  insert into public.game_invites (
    sender_id, receiver_id, tc, initial_ms, increment_ms, color_preference, expires_at
  ) values (
    me, p_receiver_id, p_tc, init_ms, inc_ms, coalesce(p_color, 'random'), now() + interval '2 minutes'
  ) returning id into inv_id;

  return json_build_object('success', true, 'invite_id', inv_id);
end;
$$;

-- Accept game invite (atomic game creation)
create or replace function public.accept_game_invite(p_invite_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
  inv public.game_invites;
  sender_p public.profiles;
  receiver_p public.profiles;
  new_game public.games;
  w_id uuid; b_id uuid;
  w_name text; b_name text;
  w_avatar text; b_avatar text;
  now_iso timestamptz;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;

  select * into inv from public.game_invites where id = p_invite_id for update;
  if not found then raise exception 'Invite not found'; end if;
  if inv.receiver_id <> me then raise exception 'Not authorized to accept this invite'; end if;
  if inv.status <> 'pending' then raise exception 'Invite is no longer pending'; end if;
  if inv.expires_at < now() then
    update public.game_invites set status = 'expired' where id = inv.id;
    raise exception 'Invite has expired';
  end if;

  select * into sender_p from public.profiles where id = inv.sender_id;
  select * into receiver_p from public.profiles where id = inv.receiver_id;

  -- Determine colors
  if inv.color_preference = 'w' then
    w_id := sender_p.id; w_name := sender_p.display_name; w_avatar := sender_p.avatar_url;
    b_id := receiver_p.id; b_name := receiver_p.display_name; b_avatar := receiver_p.avatar_url;
  elsif inv.color_preference = 'b' then
    b_id := sender_p.id; b_name := sender_p.display_name; b_avatar := sender_p.avatar_url;
    w_id := receiver_p.id; w_name := receiver_p.display_name; w_avatar := receiver_p.avatar_url;
  else
    if random() < 0.5 then
      w_id := sender_p.id; w_name := sender_p.display_name; w_avatar := sender_p.avatar_url;
      b_id := receiver_p.id; b_name := receiver_p.display_name; b_avatar := receiver_p.avatar_url;
    else
      b_id := sender_p.id; b_name := sender_p.display_name; b_avatar := sender_p.avatar_url;
      w_id := receiver_p.id; w_name := receiver_p.display_name; w_avatar := receiver_p.avatar_url;
    end if;
  end if;

  now_iso := now();

  insert into public.games (
    mode, status, white_id, black_id, white_name, black_name, white_avatar, black_avatar,
    tc, initial_ms, increment_ms, white_ms, black_ms, started_at, turn_started_at
  ) values (
    'online', 'active', w_id, b_id, w_name, b_name, w_avatar, b_avatar,
    inv.tc, inv.initial_ms, inv.increment_ms, inv.initial_ms, inv.initial_ms, now_iso, now_iso
  ) returning * into new_game;

  update public.game_invites
     set status = 'accepted', game_id = new_game.id
   where id = inv.id;

  return json_build_object('success', true, 'game_id', new_game.id);
end;
$$;

-- Decline game invite
create or replace function public.decline_game_invite(p_invite_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;

  update public.game_invites
     set status = 'declined'
   where id = p_invite_id and receiver_id = me and status = 'pending';

  return json_build_object('success', true);
end;
$$;

-- Cancel game invite
create or replace function public.cancel_game_invite(p_invite_id uuid)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid;
begin
  me := auth.uid();
  if me is null then raise exception 'Not authenticated'; end if;

  update public.game_invites
     set status = 'cancelled'
   where id = p_invite_id and sender_id = me and status = 'pending';

  return json_build_object('success', true);
end;
$$;

-- Grant execution to authenticated users
grant execute on function public.search_players(text, int) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.create_game_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_game_invite(uuid) to authenticated;
grant execute on function public.decline_game_invite(uuid) to authenticated;
grant execute on function public.cancel_game_invite(uuid) to authenticated;

-- ---------- REALTIME PUBLICATION ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships') then
    alter publication supabase_realtime add table public.friendships;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_invites') then
    alter publication supabase_realtime add table public.game_invites;
  end if;
end $$;
