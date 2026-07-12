-- Fix: create_group used extensions.gen_random_bytes, which isn't on the
-- function's (public) search_path. Generate the invite code from md5(random())
-- instead — no pgcrypto dependency.

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

  -- unique 6-char invite code from hex of a random md5 (A-F0-9)
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
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
