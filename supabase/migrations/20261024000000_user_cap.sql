-- Limit DEVELOP to 25 accounts (it's a personal and portfolio app, not built to scale).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- How it works: before Supabase creates a new account (the first Google sign-in of
-- someone new), this trigger counts the existing accounts and refuses the 26th.
-- People who already have an account keep signing in as normal; only brand-new
-- sign-ups are refused. The app then shows "DEVELOP is full" on the login page.
--
-- To see how many accounts exist:  select count(*) from auth.users;
-- To change the limit, edit max_users below and run this file again.

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

-- Nobody needs to call this directly; it only runs as the trigger below.
revoke all on function public.enforce_user_cap() from public, anon, authenticated;

drop trigger if exists enforce_user_cap on auth.users;
create trigger enforce_user_cap
  before insert on auth.users
  for each row execute function public.enforce_user_cap();
