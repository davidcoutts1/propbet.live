-- ============================================================================
-- propbet.live — initial schema
-- Simulated prop & straight-bet app. Groups, members, bets, parlays, chat.
-- All money mutations go through SECURITY DEFINER functions so the math and
-- authorization are enforced atomically on the server. Reads are guarded by RLS.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  username    text not null unique,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  invite_code       text not null unique,
  starting_balance  numeric(14,2) not null default 1000 check (starting_balance >= 0),
  family_friendly   boolean not null default true,
  admin_id          uuid not null references public.profiles(id),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- group_members: membership + free cash balance + W/L record
-- ---------------------------------------------------------------------------
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  balance    numeric(14,2) not null default 0,
  wins       integer not null default 0,
  losses     integer not null default 0,
  joined_at  timestamptz not null default now(),
  unique (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);
create index if not exists group_members_group_idx on public.group_members(group_id);

-- ---------------------------------------------------------------------------
-- bets: a two-outcome market. over/under is modeled with a numeric line and
-- labels like "Over 210.5" / "Under 210.5".
-- ---------------------------------------------------------------------------
create table if not exists public.bets (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references public.groups(id) on delete cascade,
  created_by      uuid not null references public.profiles(id),
  title           text not null,
  description     text,
  category        text not null default 'straight' check (category in ('straight','prop','over_under')),
  line            numeric(10,2),                         -- only for over_under
  option_a_label  text not null,
  option_a_odds   numeric(8,3) not null default 2.0 check (option_a_odds > 1),  -- decimal odds
  option_b_label  text not null,
  option_b_odds   numeric(8,3) not null default 2.0 check (option_b_odds > 1),
  status          text not null default 'open' check (status in ('open','settled','void')),
  winning_option  text check (winning_option in ('a','b')),
  closes_at       timestamptz,
  created_at      timestamptz not null default now(),
  settled_at      timestamptz
);
create index if not exists bets_group_idx on public.bets(group_id);

-- ---------------------------------------------------------------------------
-- wagers: a placed ticket. is_parlay=false => single leg. combined_odds is the
-- product of leg odds; potential_payout = stake * combined_odds.
-- ---------------------------------------------------------------------------
create table if not exists public.wagers (
  id                uuid primary key default gen_random_uuid(),
  group_id          uuid not null references public.groups(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  stake             numeric(14,2) not null check (stake > 0),
  combined_odds     numeric(14,4) not null,
  potential_payout  numeric(14,2) not null,
  is_parlay         boolean not null default false,
  status            text not null default 'open' check (status in ('open','won','lost','void')),
  created_at        timestamptz not null default now(),
  settled_at        timestamptz
);
create index if not exists wagers_group_idx on public.wagers(group_id);
create index if not exists wagers_user_idx on public.wagers(user_id);

-- ---------------------------------------------------------------------------
-- wager_legs: each selection within a wager (1 for straight, N for parlay)
-- ---------------------------------------------------------------------------
create table if not exists public.wager_legs (
  id         uuid primary key default gen_random_uuid(),
  wager_id   uuid not null references public.wagers(id) on delete cascade,
  bet_id     uuid not null references public.bets(id) on delete cascade,
  selection  text not null check (selection in ('a','b')),
  odds       numeric(8,3) not null,                     -- snapshot at placement
  result     text not null default 'pending' check (result in ('pending','won','lost','void')),
  unique (wager_id, bet_id)
);
create index if not exists wager_legs_wager_idx on public.wager_legs(wager_id);
create index if not exists wager_legs_bet_idx on public.wager_legs(bet_id);

-- ---------------------------------------------------------------------------
-- messages + reactions
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_group_idx on public.messages(group_id, created_at);

create table if not exists public.message_reactions (
  id         uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);
create index if not exists message_reactions_msg_idx on public.message_reactions(message_id);

-- ============================================================================
-- Helper: membership check (SECURITY DEFINER to avoid recursive RLS lookups)
-- ============================================================================
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = uid
  );
$$;

create or replace function public.is_group_admin(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.groups g where g.id = gid and g.admin_id = uid
  );
$$;

-- ============================================================================
-- New-user trigger: create a profile with a unique username
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  candidate text;
  suffix int := 0;
begin
  base_name := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    split_part(new.email, '@', 1)
  );
  base_name := regexp_replace(base_name, '\s+', '', 'g');
  candidate := base_name;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := base_name || suffix::text;
  end loop;

  insert into public.profiles (id, email, username)
  values (new.id, new.email, candidate)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- create_group: creates group, seeds creator as admin member
-- ============================================================================
create or replace function public.create_group(
  p_name text,
  p_starting_balance numeric,
  p_family_friendly boolean
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_group public.groups;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'group name required'; end if;
  if p_starting_balance is null or p_starting_balance < 0 then raise exception 'invalid starting balance'; end if;

  -- unique 6-char invite code
  loop
    v_code := upper(substr(replace(encode(gen_random_bytes(6),'base64'),'/','A'), 1, 6));
    v_code := regexp_replace(v_code, '[^A-Z0-9]', 'X', 'g');
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;

  insert into public.groups (name, invite_code, starting_balance, family_friendly, admin_id)
  values (trim(p_name), v_code, p_starting_balance, coalesce(p_family_friendly,true), v_uid)
  returning * into v_group;

  insert into public.group_members (group_id, user_id, balance)
  values (v_group.id, v_uid, p_starting_balance);

  return v_group;
end;
$$;

-- ============================================================================
-- join_group: join by invite code, seeded with the group's starting balance
-- ============================================================================
create or replace function public.join_group(p_invite_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_group from public.groups
  where invite_code = upper(trim(p_invite_code));
  if v_group.id is null then raise exception 'invalid invite code'; end if;

  if exists (select 1 from public.group_members where group_id = v_group.id and user_id = v_uid) then
    return v_group; -- already a member; idempotent
  end if;

  insert into public.group_members (group_id, user_id, balance)
  values (v_group.id, v_uid, v_group.starting_balance);

  return v_group;
end;
$$;

-- ============================================================================
-- place_wager: atomically validate, price, deduct stake, and record a ticket.
-- p_legs is jsonb array: [{"bet_id":"uuid","selection":"a"}, ...]
-- ============================================================================
create or replace function public.place_wager(
  p_group_id uuid,
  p_stake numeric,
  p_legs jsonb
)
returns public.wagers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_member public.group_members;
  v_leg jsonb;
  v_bet public.bets;
  v_sel text;
  v_odds numeric(8,3);
  v_combined numeric(14,4) := 1;
  v_count int := 0;
  v_payout numeric(14,2);
  v_wager public.wagers;
  v_seen uuid[] := '{}';
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_stake is null or p_stake <= 0 then raise exception 'stake must be positive'; end if;
  if jsonb_typeof(p_legs) <> 'array' or jsonb_array_length(p_legs) = 0 then
    raise exception 'at least one leg required';
  end if;

  select * into v_member from public.group_members
  where group_id = p_group_id and user_id = v_uid for update;
  if v_member.id is null then raise exception 'not a member of this group'; end if;
  if v_member.balance < p_stake then raise exception 'insufficient balance'; end if;

  for v_leg in select * from jsonb_array_elements(p_legs) loop
    v_sel := v_leg->>'selection';
    if v_sel not in ('a','b') then raise exception 'invalid selection'; end if;

    select * into v_bet from public.bets
    where id = (v_leg->>'bet_id')::uuid and group_id = p_group_id;
    if v_bet.id is null then raise exception 'bet not found in this group'; end if;
    if v_bet.status <> 'open' then raise exception 'bet "%" is not open', v_bet.title; end if;
    if v_bet.closes_at is not null and v_bet.closes_at < now() then
      raise exception 'bet "%" is closed', v_bet.title;
    end if;
    if v_bet.id = any(v_seen) then raise exception 'duplicate bet in parlay'; end if;
    v_seen := array_append(v_seen, v_bet.id);

    v_odds := case when v_sel = 'a' then v_bet.option_a_odds else v_bet.option_b_odds end;
    v_combined := v_combined * v_odds;
    v_count := v_count + 1;
  end loop;

  v_payout := round(p_stake * v_combined, 2);

  insert into public.wagers (group_id, user_id, stake, combined_odds, potential_payout, is_parlay)
  values (p_group_id, v_uid, p_stake, round(v_combined,4), v_payout, v_count > 1)
  returning * into v_wager;

  for v_leg in select * from jsonb_array_elements(p_legs) loop
    v_sel := v_leg->>'selection';
    select * into v_bet from public.bets where id = (v_leg->>'bet_id')::uuid;
    v_odds := case when v_sel = 'a' then v_bet.option_a_odds else v_bet.option_b_odds end;
    insert into public.wager_legs (wager_id, bet_id, selection, odds)
    values (v_wager.id, v_bet.id, v_sel, v_odds);
  end loop;

  update public.group_members set balance = balance - p_stake where id = v_member.id;
  return v_wager;
end;
$$;

-- ============================================================================
-- settle_bet: admin marks a winner; cascade-settle every affected wager.
-- ============================================================================
create or replace function public.settle_bet(
  p_bet_id uuid,
  p_winning_option text  -- 'a' | 'b' | 'void'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bet public.bets;
  v_wager public.wagers;
  v_pending int;
  v_lost int;
  v_won int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  select * into v_bet from public.bets where id = p_bet_id for update;
  if v_bet.id is null then raise exception 'bet not found'; end if;
  if not public.is_group_admin(v_bet.group_id, v_uid) then
    raise exception 'only the group admin can settle bets';
  end if;
  if v_bet.status = 'settled' then raise exception 'bet already settled'; end if;
  if p_winning_option not in ('a','b','void') then raise exception 'invalid outcome'; end if;

  if p_winning_option = 'void' then
    update public.bets set status = 'void', settled_at = now() where id = p_bet_id;
    update public.wager_legs set result = 'void' where bet_id = p_bet_id;
  else
    update public.bets
      set status = 'settled', winning_option = p_winning_option, settled_at = now()
      where id = p_bet_id;
    update public.wager_legs set result =
      case when selection = p_winning_option then 'won' else 'lost' end
      where bet_id = p_bet_id;
  end if;

  -- re-evaluate every open wager that includes this bet
  for v_wager in
    select w.* from public.wagers w
    where w.status = 'open'
      and exists (select 1 from public.wager_legs l where l.wager_id = w.id and l.bet_id = p_bet_id)
    for update
  loop
    select
      count(*) filter (where result = 'pending'),
      count(*) filter (where result = 'lost'),
      count(*) filter (where result = 'won')
    into v_pending, v_lost, v_won
    from public.wager_legs where wager_id = v_wager.id;

    if v_lost > 0 then
      -- any losing leg loses the ticket; stake already gone
      update public.wagers set status = 'lost', settled_at = now() where id = v_wager.id;
      update public.group_members set losses = losses + 1
        where group_id = v_wager.group_id and user_id = v_wager.user_id;
    elsif v_pending = 0 then
      -- all legs decided and none lost. Recompute payout from non-void legs only.
      declare
        v_combined numeric(14,4);
        v_payout numeric(14,2);
        v_active int;
      begin
        select count(*) filter (where result = 'won'),
               coalesce(exp(sum(ln(odds)) filter (where result = 'won')), 1)
          into v_active, v_combined
          from public.wager_legs where wager_id = v_wager.id;

        if v_active = 0 then
          -- entire ticket voided: refund stake, no W/L
          v_payout := v_wager.stake;
          update public.wagers set status = 'void', potential_payout = v_payout, settled_at = now()
            where id = v_wager.id;
          update public.group_members set balance = balance + v_payout
            where group_id = v_wager.group_id and user_id = v_wager.user_id;
        else
          v_payout := round(v_wager.stake * v_combined, 2);
          update public.wagers set status = 'won', potential_payout = v_payout, settled_at = now()
            where id = v_wager.id;
          update public.group_members
            set balance = balance + v_payout, wins = wins + 1
            where group_id = v_wager.group_id and user_id = v_wager.user_id;
        end if;
      end;
    end if;
    -- else: still has pending legs, leave open
  end loop;
end;
$$;

-- ============================================================================
-- adjust_all_balances: admin grants (or removes) money for every member
-- ============================================================================
create or replace function public.adjust_all_balances(p_group_id uuid, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_group_admin(p_group_id, v_uid) then
    raise exception 'only the group admin can adjust balances';
  end if;
  update public.group_members set balance = greatest(0, balance + p_amount)
    where group_id = p_group_id;
end;
$$;

-- ============================================================================
-- transfer_admin: hand off admin to another member
-- ============================================================================
create or replace function public.transfer_admin(p_group_id uuid, p_new_admin uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_group_admin(p_group_id, v_uid) then
    raise exception 'only the current admin can transfer admin';
  end if;
  if not public.is_group_member(p_group_id, p_new_admin) then
    raise exception 'new admin must be a group member';
  end if;
  update public.groups set admin_id = p_new_admin where id = p_group_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles          enable row level security;
alter table public.groups            enable row level security;
alter table public.group_members     enable row level security;
alter table public.bets              enable row level security;
alter table public.wagers            enable row level security;
alter table public.wager_legs        enable row level security;
alter table public.messages          enable row level security;
alter table public.message_reactions enable row level security;

-- profiles: readable by any authenticated user (needed to show usernames);
-- writable only by the owner.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- groups: visible to members (or via code lookup handled by SECURITY DEFINER fns)
drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select to authenticated
  using (public.is_group_member(id, auth.uid()));

-- group_members: members can see co-members
drop policy if exists members_read on public.group_members;
create policy members_read on public.group_members for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- bets: members read; members create; nobody edits directly (settle via fn)
drop policy if exists bets_read on public.bets;
create policy bets_read on public.bets for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
drop policy if exists bets_insert on public.bets;
create policy bets_insert on public.bets for insert to authenticated
  with check (public.is_group_member(group_id, auth.uid()) and created_by = auth.uid());

-- wagers / legs: owner reads own; members read within group (for transparency)
drop policy if exists wagers_read on public.wagers;
create policy wagers_read on public.wagers for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
drop policy if exists wager_legs_read on public.wager_legs;
create policy wager_legs_read on public.wager_legs for select to authenticated
  using (exists (select 1 from public.wagers w
    where w.id = wager_id and public.is_group_member(w.group_id, auth.uid())));

-- messages: members read + insert own
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_group_member(group_id, auth.uid()) and user_id = auth.uid());

-- reactions: members read; owner insert/delete own
drop policy if exists reactions_read on public.message_reactions;
create policy reactions_read on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages m
    where m.id = message_id and public.is_group_member(m.group_id, auth.uid())));
drop policy if exists reactions_insert on public.message_reactions;
create policy reactions_insert on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.messages m
    where m.id = message_id and public.is_group_member(m.group_id, auth.uid())));
drop policy if exists reactions_delete on public.message_reactions;
create policy reactions_delete on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Realtime: publish chat + reactions (+ bets/members for live updates)
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array['messages','message_reactions','bets','group_members'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ============================================================================
-- Leaderboard view: free cash + money staked in still-open wagers.
-- security_invoker => RLS of the querying user applies through the view.
-- ============================================================================
create or replace view public.leaderboard
with (security_invoker = true) as
select
  m.group_id,
  m.user_id,
  p.username,
  m.balance,
  coalesce(o.at_stake, 0) as at_stake,
  m.balance + coalesce(o.at_stake, 0) as total_worth,
  m.wins,
  m.losses
from public.group_members m
join public.profiles p on p.id = m.user_id
left join (
  select group_id, user_id, sum(stake) as at_stake
  from public.wagers where status = 'open'
  group by group_id, user_id
) o on o.group_id = m.group_id and o.user_id = m.user_id;
