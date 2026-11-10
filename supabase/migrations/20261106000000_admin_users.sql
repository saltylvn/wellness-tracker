-- Two admin tools in Settings (only for the admin), and invite codes for Google sign-ups:
--   1. Revoke an invite nobody has used yet ("Invite someone", Revoke).
--   2. "Users": everyone with an account, and when they last logged in.
--   3. A new person who taps "Continue with Google" is asked for their invite code first.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1. Revoking deletes the invite, so its code stops working at once. Used invites can't be
--    deleted (that person already has an account, and the list keeps showing who joined).
drop policy if exists "The admin can revoke unused invites" on public.invite_codes;
create policy "The admin can revoke unused invites"
  on public.invite_codes for delete
  to authenticated
  using ((select auth.uid()) = created_by and (select public.is_admin()) and used_at is null);

-- 2. The list of accounts. Account details live in Supabase's own auth.users table, which
--    the app can't read; this function reads just what the list needs, and only for the
--    admin (anyone else gets an error). last_sign_in_at is the last time they logged in
--    (staying logged in on their phone doesn't count as a new login).
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the admin can see the list of users' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
           u.created_at,
           u.last_sign_in_at,
           exists (select 1 from public.app_admins a where a.user_id = u.id)
      from auth.users u
     order by u.last_sign_in_at desc nulls last;
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- 3. Google can't carry an invite code to the database, so the login page "arms" the code
--    first (after checking it), then starts Google. When Google creates the new account a
--    moment later, the check below uses that armed code. An armed code only waits 10 minutes,
--    and it's still used up once, by one account.
alter table public.invite_codes add column if not exists armed_at timestamptz;

create or replace function public.arm_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invite_codes
     set armed_at = now()
   where code = upper(p_code) and used_at is null and created_at > now() - interval '14 days';
  return found;
end;
$$;
revoke all on function public.arm_invite_code(text) from public;
grant execute on function public.arm_invite_code(text) to anon, authenticated;

create or replace function public.require_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(coalesce(new.raw_user_meta_data ->> 'invite_code', ''));
begin
  -- No code with the new account (a Google sign-up): use the code armed most recently.
  if v_code = '' then
    select code into v_code
      from public.invite_codes
     where used_at is null
       and armed_at > now() - interval '10 minutes'
       and created_at > now() - interval '14 days'
     order by armed_at desc
     limit 1
       for update skip locked;
    v_code := coalesce(v_code, '');
  end if;

  update public.invite_codes
     set used_at = now(),
         used_by = new.id,
         used_username = split_part(new.email, '@', 1)
   where code = v_code
     and used_at is null
     and created_at > now() - interval '14 days';

  if not found then
    raise exception 'DEVELOP is invite-only: a valid invite code is needed'
      using errcode = 'check_violation';
  end if;

  -- The code has done its job; don't keep it on the account.
  new.raw_user_meta_data := new.raw_user_meta_data - 'invite_code';
  return new;
end;
$$;
revoke all on function public.require_invite_code() from public, anon, authenticated;

notify pgrst, 'reload schema';
