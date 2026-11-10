-- Username + password accounts, invite-only sign-up, and the app's one admin.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- 1. app_admins: who the admin is (only the admin can make invite codes). Nobody can
--    add themselves: there's no rule that lets the app write to this table; the admin
--    is set once by hand in the SQL Editor (step 5).
-- 2. invite_codes: one row per invite the admin texts out. Only the admin can make
--    them or see them.
-- 3. A check before every new account: it must carry an unused invite code (from the
--    "Create account" form), which is then marked used. Google sign-ups don't carry
--    one, so brand-new people can't get in that way; existing accounts sign in as normal.

-- 1. The admin -----------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_admins enable row level security;

drop policy if exists "Admins can see that they are admins" on public.app_admins;
create policy "Admins can see that they are admins"
  on public.app_admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Invite codes --------------------------------------------------------------------
create table if not exists public.invite_codes (
  code text primary key check (code ~ '^[A-HJKMNP-Z2-9]{8}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid,            -- the new account (no link to auth.users: it's filled in
  used_username text       -- just before that account exists)
);
alter table public.invite_codes enable row level security;

drop policy if exists "The admin can see their invites" on public.invite_codes;
create policy "The admin can see their invites"
  on public.invite_codes for select
  to authenticated
  using ((select auth.uid()) = created_by and (select public.is_admin()));

drop policy if exists "Only the admin can make invites" on public.invite_codes;
create policy "Only the admin can make invites"
  on public.invite_codes for insert
  to authenticated
  with check ((select auth.uid()) = created_by and (select public.is_admin()) and used_at is null);

-- The "Create account" form asks this first, so a wrong code gets a clear message.
-- It only says yes or no (codes are 8 random characters, far too many to guess).
create or replace function public.invite_code_ok(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.invite_codes
    where code = upper(p_code) and used_at is null and created_at > now() - interval '14 days'
  );
$$;
revoke all on function public.invite_code_ok(text) from public;
grant execute on function public.invite_code_ok(text) to anon, authenticated;

-- 3. Every new account needs an invite ------------------------------------------------
create or replace function public.require_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(coalesce(new.raw_user_meta_data ->> 'invite_code', ''));
begin
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

drop trigger if exists require_invite_code on auth.users;
create trigger require_invite_code
  before insert on auth.users
  for each row execute function public.require_invite_code();

-- 4. Reload the app's view of the database ---------------------------------------------
notify pgrst, 'reload schema';

-- 5. Make yourself the admin with the username "tylerpclark" (run once, by hand) ---------
-- Put the email of your Google account in place of YOUR_GOOGLE_EMAIL. This keeps all
-- your data, makes your username "tylerpclark" (your sign-in address becomes
-- tylerpclark@wellness-tracker-virid.vercel.app, which only the app uses), and lists you
-- as the admin. "Continue with Google" keeps working for you too. Then sign in, open
-- Settings, and set your password there.
--
-- update auth.users
--    set email = 'tylerpclark@wellness-tracker-virid.vercel.app'
--  where email = 'YOUR_GOOGLE_EMAIL';
-- insert into public.app_admins (user_id)
--   select id from auth.users where email = 'tylerpclark@wellness-tracker-virid.vercel.app'
--   on conflict do nothing;
