-- Fix: let invited people create username + password accounts.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- The recruiter-demo migration (20261025000000) made the 25-account check also refuse
-- every email/password sign-up except the demo account's, because back then password
-- sign-in existed only for the demo. Username accounts (20261105000000) are stored as
-- email/password accounts, so that check refused every new username sign-up, even with a
-- valid invite ("DEVELOP is full"). Sign-up is now invite-only (the require_invite_code
-- trigger), which is the protection that check was standing in for, so it's removed here.
-- The 25-account cap stays, with its lock.

create or replace function public.enforce_user_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_users constant integer := 25;
begin
  -- One sign-up at a time: without this lock, two people signing up at the same
  -- moment could both see 24 accounts and both get in.
  perform pg_advisory_xact_lock(hashtext('develop.user_cap'));

  if (select count(*) from auth.users) >= max_users then
    raise exception 'DEVELOP is limited to % accounts', max_users
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_user_cap() from public, anon, authenticated;

notify pgrst, 'reload schema';
