-- ============================================================================
-- Activity feed + in-app notifications
-- A single append-only feed per group. Rows are written by SECURITY DEFINER
-- functions / triggers as things happen. Each member tracks activity_seen_at
-- so we can show an unread badge.
-- ============================================================================

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  type       text not null,              -- bet_created | bet_settled | wager_won | member_joined | money_granted | admin_transferred
  actor_id   uuid references public.profiles(id) on delete set null,
  message    text not null,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists activity_group_idx on public.activity(group_id, created_at desc);

alter table public.group_members
  add column if not exists activity_seen_at timestamptz not null default now();

alter table public.activity enable row level security;
drop policy if exists activity_read on public.activity;
create policy activity_read on public.activity for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='activity'
  ) then
    execute 'alter publication supabase_realtime add table public.activity';
  end if;
end $$;

-- helpers -------------------------------------------------------------------
create or replace function public.log_activity(
  p_group uuid, p_type text, p_actor uuid, p_message text, p_meta jsonb default '{}'
)
returns void language sql security definer set search_path = public as $$
  insert into public.activity (group_id, type, actor_id, message, meta)
  values (p_group, p_type, p_actor, p_message, coalesce(p_meta, '{}'::jsonb));
$$;

create or replace function public.fmt_money(n numeric)
returns text language sql immutable as $$
  select '$' || trim(to_char(n, 'FM999,999,990.00'));
$$;

create or replace function public.mark_activity_seen(p_group_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.group_members set activity_seen_at = now()
  where group_id = p_group_id and user_id = auth.uid();
$$;

-- new bet -> activity -------------------------------------------------------
create or replace function public.on_bet_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  select username into uname from public.profiles where id = new.created_by;
  perform public.log_activity(
    new.group_id, 'bet_created', new.created_by,
    coalesce(uname, 'Someone') || ' posted a new bet: “' || new.title || '”',
    jsonb_build_object('bet_id', new.id)
  );
  return new;
end $$;

drop trigger if exists on_bet_created_trg on public.bets;
create trigger on_bet_created_trg
  after insert on public.bets
  for each row execute function public.on_bet_created();

-- ============================================================================
-- settle_bet (adds activity for the settlement + each winning ticket)
-- ============================================================================
create or replace function public.settle_bet(p_bet_id uuid, p_winning_option text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bet public.bets;
  v_wager public.wagers;
  v_pending int; v_lost int; v_won int;
  v_winlabel text;
  v_uname text; v_legs int;
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
    update public.bets set status='void', settled_at=now() where id=p_bet_id;
    update public.wager_legs set result='void' where bet_id=p_bet_id;
    perform public.log_activity(v_bet.group_id, 'bet_settled', v_uid,
      '“' || v_bet.title || '” was voided — stakes refunded',
      jsonb_build_object('bet_id', v_bet.id));
  else
    update public.bets set status='settled', winning_option=p_winning_option, settled_at=now()
      where id=p_bet_id;
    update public.wager_legs set result =
      case when selection = p_winning_option then 'won' else 'lost' end
      where bet_id = p_bet_id;
    v_winlabel := case when p_winning_option='a' then v_bet.option_a_label else v_bet.option_b_label end;
    perform public.log_activity(v_bet.group_id, 'bet_settled', v_uid,
      '“' || v_bet.title || '” settled — ' || v_winlabel || ' won',
      jsonb_build_object('bet_id', v_bet.id, 'winner', p_winning_option));
  end if;

  for v_wager in
    select w.* from public.wagers w
    where w.status = 'open'
      and exists (select 1 from public.wager_legs l where l.wager_id=w.id and l.bet_id=p_bet_id)
    for update
  loop
    select
      count(*) filter (where result='pending'),
      count(*) filter (where result='lost'),
      count(*) filter (where result='won')
      into v_pending, v_lost, v_won
    from public.wager_legs where wager_id = v_wager.id;

    if v_lost > 0 then
      update public.wagers set status='lost', settled_at=now() where id=v_wager.id;
      update public.group_members set losses=losses+1
        where group_id=v_wager.group_id and user_id=v_wager.user_id;
    elsif v_pending = 0 then
      declare
        v_combined numeric(14,4); v_payout numeric(14,2); v_active int;
      begin
        select count(*) filter (where result='won'),
               coalesce(exp(sum(ln(odds)) filter (where result='won')), 1)
          into v_active, v_combined
          from public.wager_legs where wager_id = v_wager.id;

        if v_active = 0 then
          v_payout := v_wager.stake;
          update public.wagers set status='void', potential_payout=v_payout, settled_at=now()
            where id=v_wager.id;
          update public.group_members set balance=balance+v_payout
            where group_id=v_wager.group_id and user_id=v_wager.user_id;
        else
          v_payout := round(v_wager.stake * v_combined, 2);
          update public.wagers set status='won', potential_payout=v_payout, settled_at=now()
            where id=v_wager.id;
          update public.group_members set balance=balance+v_payout, wins=wins+1
            where group_id=v_wager.group_id and user_id=v_wager.user_id;

          select username into v_uname from public.profiles where id = v_wager.user_id;
          select count(*) into v_legs from public.wager_legs where wager_id = v_wager.id;
          perform public.log_activity(v_wager.group_id, 'wager_won', v_wager.user_id,
            coalesce(v_uname,'Someone') || ' won ' || public.fmt_money(v_payout) ||
            case when v_legs > 1 then ' on a ' || v_legs || '-leg parlay 🔥' else ' 💰' end,
            jsonb_build_object('wager_id', v_wager.id, 'payout', v_payout, 'legs', v_legs));
        end if;
      end;
    end if;
  end loop;
end;
$$;

-- ============================================================================
-- join_group (adds member_joined activity)
-- ============================================================================
create or replace function public.join_group(p_invite_code text)
returns public.groups
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_group public.groups;
  v_uname text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_group from public.groups where invite_code = upper(trim(p_invite_code));
  if v_group.id is null then raise exception 'invalid invite code'; end if;
  if exists (select 1 from public.group_members where group_id=v_group.id and user_id=v_uid) then
    return v_group;
  end if;
  insert into public.group_members (group_id, user_id, balance)
  values (v_group.id, v_uid, v_group.starting_balance);
  select username into v_uname from public.profiles where id = v_uid;
  perform public.log_activity(v_group.id, 'member_joined', v_uid,
    coalesce(v_uname,'Someone') || ' joined the group 👋', '{}');
  return v_group;
end;
$$;

-- ============================================================================
-- adjust_all_balances (adds money_granted activity)
-- ============================================================================
create or replace function public.adjust_all_balances(p_group_id uuid, p_amount numeric)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not public.is_group_admin(p_group_id, v_uid) then
    raise exception 'only the group admin can adjust balances';
  end if;
  update public.group_members set balance = greatest(0, balance + p_amount)
    where group_id = p_group_id;
  perform public.log_activity(p_group_id, 'money_granted', v_uid,
    case when p_amount >= 0
      then 'Admin gave everyone ' || public.fmt_money(p_amount) || ' 💵'
      else 'Admin took ' || public.fmt_money(abs(p_amount)) || ' from everyone'
    end,
    jsonb_build_object('amount', p_amount));
end;
$$;

-- ============================================================================
-- transfer_admin (adds admin_transferred activity)
-- ============================================================================
create or replace function public.transfer_admin(p_group_id uuid, p_new_admin uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_uname text;
begin
  if not public.is_group_admin(p_group_id, v_uid) then
    raise exception 'only the current admin can transfer admin';
  end if;
  if not public.is_group_member(p_group_id, p_new_admin) then
    raise exception 'new admin must be a group member';
  end if;
  update public.groups set admin_id = p_new_admin where id = p_group_id;
  select username into v_uname from public.profiles where id = p_new_admin;
  perform public.log_activity(p_group_id, 'admin_transferred', v_uid,
    coalesce(v_uname,'A member') || ' is now the group admin 👑',
    jsonb_build_object('new_admin', p_new_admin));
end;
$$;
