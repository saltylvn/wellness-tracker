-- Security hardening, after a full review of the app and the database rules.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- (Safe to run again.) Nothing here changes what the app looks like; it closes gaps
-- that someone calling Supabase directly (not through the app) could have used.
--
--   1. The shared demo account's login can't be changed by a visitor.
--   2. An invite code armed for Google sign-in can't be taken by a password sign-up.
--   3. The AI limit can't be jammed with made-up dates.
--   4. The demo reset also restores the demo's profile, and can't be forced over and over.
--   5. The wait-list can't be flooded in one go, and doesn't reveal who is on it.
--   6. Internal functions aren't callable through the API; two text columns get a size limit.

-- 1. The demo login. Every visitor is signed in to the same demo account, so any of them
--    could have asked Supabase to change its password or email: locking everyone else out,
--    or keeping the account for themselves. Now the email and phone can't change, and a new
--    password is quietly ignored (the old one stays).
--    To change the demo password yourself, run this in the SQL Editor first, in the same query:
--      set develop.allow_demo_login_change = 'on';
create or replace function public.protect_demo_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(old.email, '')) = public.demo_email()
     and coalesce(current_setting('develop.allow_demo_login_change', true), '') <> 'on' then
    if new.email is distinct from old.email
       or (to_jsonb(new) ->> 'phone') is distinct from (to_jsonb(old) ->> 'phone')
       or coalesce(to_jsonb(new) ->> 'email_change', '') <> coalesce(to_jsonb(old) ->> 'email_change', '') then
      raise exception 'The demo login cannot be changed' using errcode = 'check_violation';
    end if;
    new.encrypted_password := old.encrypted_password;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_demo_login() from public, anon, authenticated;

drop trigger if exists protect_demo_login on auth.users;
create trigger protect_demo_login
  before update on auth.users
  for each row execute function public.protect_demo_login();

-- 2. Invite codes. A code "armed" for a first Google sign-in waits up to 10 minutes for the
--    new account. Before, ANY new account made in that window with no code of its own used
--    it, including a plain email + password sign-up sent straight to Supabase. Now only a
--    sign-up without a password (Google) can use an armed code; password sign-ups must carry
--    their own code, as the app's "Create account" always does.
create or replace function public.require_invite_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(coalesce(new.raw_user_meta_data ->> 'invite_code', ''));
begin
  -- No code with the new account, and no password (a Google sign-up): use the code armed
  -- most recently.
  if v_code = ''
     and coalesce(to_jsonb(new) ->> 'encrypted_password', '') = ''
     and coalesce(new.raw_app_meta_data ->> 'provider', '') <> 'email' then
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
     and v_code <> ''
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

-- 3. The AI limit counts your rows in ai_requests from the last 24 hours. A row's time could
--    be set by whoever inserted it, so 40 rows dated far in the future would have blocked AI
--    estimates for that account for good (for the shared demo: for every visitor). Now only
--    user_id can be supplied; the time is always the database's own clock.
revoke insert on public.ai_requests from anon, authenticated;
grant insert (user_id) on public.ai_requests to authenticated;
delete from public.ai_requests where created_at > now();

-- 4. The demo reset. The big rebuild keeps its code but moves to an inner name that only
--    this new outer function may call. The outer one adds two things:
--      * no more than one rebuild every 5 minutes (before, sending a different date each
--        time forced a rebuild on every call, wiping what other visitors were trying), and
--      * after a rebuild, the demo's profile goes back to its sample values too (priority
--        lifts, gym barcode and the optional goals), so nothing a visitor types there stays.
--    (A later change to the sample data should "create or replace" reset_demo_rows.)
do $$
begin
  if to_regprocedure('public.reset_demo_rows(date)') is null then
    alter function public.reset_demo_data(date) rename to reset_demo_rows;
  end if;
end;
$$;
revoke all on function public.reset_demo_rows(date) from public, anon, authenticated;

create or replace function public.reset_demo_data(p_today date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  rebuilt boolean;
begin
  if exists (select 1 from public.demo_state where id and reset_at > now() - interval '5 minutes') then
    return false;
  end if;

  rebuilt := public.reset_demo_rows(p_today); -- false unless you're the demo account
  if rebuilt then
    update public.profiles set
      priority_lift_1 = 'Squats', priority_lift_2 = 'Deadlift', priority_lift_3 = 'Incline press',
      gym_barcode_text = 'DEVELOP-0001234', gym_barcode_format = 'code128',
      timezone = 'UTC', start_date = null, weight_pace_lb_week = null,
      daily_sunshine_minutes = null, weekly_walk_miles = null
    where id = auth.uid();
  end if;
  return rebuilt;
end;
$$;
revoke all on function public.reset_demo_data(date) from public, anon;
grant execute on function public.reset_demo_data(date) to authenticated;

-- 5. The wait-list. Three changes:
--      * at most 20 new people an hour, so the 200 places can't be filled in seconds;
--      * the "full" and "busy" checks come first and answer the same way for every number,
--        so the reply never shows whether a phone number is already on the list;
--      * asking again with a number that's already there changes nothing (before, anyone
--        who knew a number could overwrite the name next to it).
create or replace function public.request_access(p_name text, p_phone text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
begin
  -- Keep a + only at the start; a 10-digit number is taken as a US number.
  v_phone := left(v_phone, 1) || replace(substr(v_phone, 2), '+', '');
  if v_phone ~ '^[0-9]{10}$' then
    v_phone := '+1' || v_phone;
  end if;

  if char_length(v_name) not between 1 and 60
     or v_phone !~ '^\+?[0-9]{10,15}$' then
    raise exception 'Please check your name and phone number' using errcode = 'check_violation';
  end if;

  -- One request at a time, so two at the same moment can't both slip under a limit.
  perform pg_advisory_xact_lock(hashtext('develop.waitlist'));
  if (select count(*) from public.access_requests where invited_at is null) >= 200
     or (select count(*) from public.access_requests where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'The wait-list is full right now' using errcode = 'check_violation';
  end if;

  insert into public.access_requests (name, phone)
  values (v_name, v_phone)
  on conflict (phone) do nothing;
  return true;
end;
$$;
revoke all on function public.request_access(text, text) from public;
grant execute on function public.request_access(text, text) to anon, authenticated;

-- 6. Tidy-ups.
--    These run only as triggers or inside other functions; Supabase's defaults had left
--    them listed as callable through the API (they did nothing useful there).
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.demo_email() from public, anon, authenticated;

--    Two text columns had no size limit, so a single row could hold megabytes.
--    ("not valid" = checked for new and changed rows; existing rows aren't re-checked.)
alter table public.profiles drop constraint if exists profiles_timezone_len;
alter table public.profiles
  add constraint profiles_timezone_len check (char_length(timezone) <= 64) not valid;
alter table public.food_entries drop constraint if exists food_entries_image_path_len;
alter table public.food_entries
  add constraint food_entries_image_path_len check (image_path is null or char_length(image_path) <= 300) not valid;

notify pgrst, 'reload schema';
