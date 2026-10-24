-- A shared demo account, so anyone (like a recruiter) can try DEVELOP in one click
-- with realistic sample data, without signing in with their own Google account.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- (Then create the demo user: see "Recruiter demo" in README.md.)
--
-- How it works:
--   * The demo account is the one with the email returned by public.demo_email().
--   * "Try the demo" on the login page signs in as it (on the server) and calls
--     public.reset_demo_data(today), which wipes the demo's data and rebuilds it
--     relative to today, so it never looks stale. To keep visitors from wiping each
--     other's clicks, it rebuilds at most once an hour, or when the date changes.
--   * Only the demo account can reset itself; for anyone else the function does nothing.
--   * The AI request log is never cleared, so the demo still has the 40-a-day AI limit.

-- 1. The demo account's email. It's not a secret (the password is, and that lives
--    only in Vercel and .env.local). example.com is reserved, so no one can own it.
create or replace function public.demo_email()
returns text
language sql
immutable
set search_path = ''
as $$ select 'demo@example.com'::text $$;

-- 2. When the demo data was last rebuilt (one row). RLS is on with no policies, so
--    only the security-definer function below can read or change it.
create table if not exists public.demo_state (
  id           boolean primary key default true check (id), -- at most one row
  reset_at     timestamptz not null,
  seeded_for   date not null
);
alter table public.demo_state enable row level security;

-- 3. Email/password sign-in is switched on only for the demo. Refuse any other
--    email/password account, so it can't be used to sign up. (Replaces the
--    25-account trigger function from 20261024000000_user_cap.sql, same limit.)
create or replace function public.enforce_user_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  max_users constant integer := 25;
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email'
     and lower(coalesce(new.email, '')) <> public.demo_email() then
    raise exception 'Email sign-up is only for the demo account'
      using errcode = 'check_violation';
  end if;

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

drop trigger if exists enforce_user_cap on auth.users;
create trigger enforce_user_cap
  before insert on auth.users
  for each row execute function public.enforce_user_cap();

-- 4. Rebuild the demo's sample data, relative to p_today (the visitor's date).
--    Returns true if it rebuilt, false if it skipped (not the demo, or fresh enough).
create or replace function public.reset_demo_data(p_today date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid        uuid := auth.uid();
  state      public.demo_state%rowtype;
  d          date;
  n          integer;
  w          integer;
  monday_id  uuid;
  wed_id     uuid;
  friday_id  uuid;
  session_id uuid;
  ex         record;
begin
  -- Only the demo account, and only with a sensible date.
  if uid is null or p_today is null
     or abs(p_today - (now() at time zone 'utc')::date) > 1
     or not exists (select 1 from auth.users where id = uid and lower(email) = public.demo_email()) then
    return false;
  end if;

  -- One reset at a time, and skip it if the data is from today and under an hour old.
  perform pg_advisory_xact_lock(hashtext('develop.demo_reset'));
  select * into state from public.demo_state where id;
  if found and state.seeded_for = p_today and state.reset_at > now() - interval '1 hour' then
    return false;
  end if;

  -- Wipe (not ai_requests: the AI limit must survive a reset).
  delete from public.food_entries      where user_id = uid;
  delete from public.saved_foods       where user_id = uid;
  delete from public.water_logs        where user_id = uid;
  delete from public.weight_logs       where user_id = uid;
  delete from public.cardio_logs       where user_id = uid;
  delete from public.tanning_logs      where user_id = uid;
  delete from public.workout_sets      where user_id = uid;
  delete from public.workout_sessions  where user_id = uid;
  delete from public.workout_exercises where user_id = uid;
  delete from public.workout_days      where user_id = uid;

  -- Goals. (The weight coaching note is cleared; the app writes a fresh one.)
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  update public.profiles set
    calorie_goal = 2200, protein_goal_g = 180, carb_goal_g = 200, fat_goal_g = 70,
    weekly_run_miles = 6, weekly_cycle_miles = 15, weekly_swim_yards = null,
    start_weight_lb = 196.0, target_weight_lb = 180.0,
    weight_coach_note = null, weight_coach_source = null, weight_coach_key = null
  where id = uid;

  -- Weekly plan: Mon / Wed / Fri lifting, Tue / Thu / Sat cardio, Sunday recovery.
  insert into public.workout_days (user_id, weekday, kind, title) values
    (uid, 1, 'lift', 'Chest & Back'), (uid, 2, 'cardio', 'Cardio'),
    (uid, 3, 'lift', 'Legs'),         (uid, 4, 'cardio', 'Cardio'),
    (uid, 5, 'lift', 'Delts & Arms'), (uid, 6, 'cardio', 'Cardio'),
    (uid, 7, 'rest', 'Recovery Day');
  select id into monday_id from public.workout_days where user_id = uid and weekday = 1;
  select id into wed_id    from public.workout_days where user_id = uid and weekday = 3;
  select id into friday_id from public.workout_days where user_id = uid and weekday = 5;

  insert into public.workout_exercises (user_id, day_id, position, name, target_sets, rep_min, rep_max, superset_with_next) values
    (uid, monday_id, 0, 'Pec deck',                          3, 10, 12, true),
    (uid, monday_id, 1, 'Incline press',                     3,  5,  8, false),
    (uid, monday_id, 2, 'Pull downs (close grip, palms up)', 3,  8, 12, false),
    (uid, monday_id, 3, 'Deadlift',                          3,  3,  5, false),
    (uid, wed_id,    0, 'Leg extensions',                    3, 10, 12, true),
    (uid, wed_id,    1, 'Leg press',                         3,  8, 12, false),
    (uid, wed_id,    2, 'Squats',                            3,  3,  5, false),
    (uid, wed_id,    3, 'Calf raises',                       3, 12, 15, false),
    (uid, friday_id, 0, 'Lateral raises (dumbbell)',         3, 12, 15, false),
    (uid, friday_id, 1, 'Reverse pec deck',                  3, 12, 15, false),
    (uid, friday_id, 2, 'Curls (barbell)',                   3,  8, 12, false),
    (uid, friday_id, 3, 'Tricep pressdown',                  3, 10, 12, false);

  -- Lifting history: the last 4 weeks of Mon / Wed / Fri before today, getting a
  -- little heavier each week (w = 0 is the oldest week).
  for d in select g::date from generate_series(p_today - 27, p_today - 1, interval '1 day') g
           where extract(isodow from g) in (1, 3, 5) loop
    w := 3 - ((p_today - d) / 7);
    insert into public.workout_sessions (user_id, session_date, day_id, title, sauna_done, stretch_done)
    select uid, d, wd.id, wd.title, true, (p_today - d) % 2 = 0
    from public.workout_days wd where wd.user_id = uid and wd.weekday = extract(isodow from d)
    returning id into session_id;

    for ex in
      select e.id, e.name, e.position, e.rep_max,
             case e.name
               when 'Pec deck' then 130 when 'Incline press' then 165
               when 'Pull downs (close grip, palms up)' then 140 when 'Deadlift' then 255
               when 'Leg extensions' then 110 when 'Leg press' then 270 when 'Squats' then 205
               when 'Calf raises' then 160 when 'Lateral raises (dumbbell)' then 20
               when 'Reverse pec deck' then 90 when 'Curls (barbell)' then 70
               else 60 end as base
      from public.workout_exercises e
      join public.workout_days wd on wd.id = e.day_id
      where e.user_id = uid and wd.weekday = extract(isodow from d)
    loop
      for n in 1..3 loop
        insert into public.workout_sets (user_id, session_id, exercise_id, exercise_name, position, set_number, weight, reps)
        values (uid, session_id, ex.id, ex.name, ex.position, n,
                ex.base + w * (case when ex.base >= 150 then 10 else 5 end),
                case when ex.rep_max <= 5 then 3 + (n % 2) else ex.rep_max - n + 1 end);
      end loop;
    end loop;
  end loop;

  -- Cardio: Tue / Thu / Sat for the last 3 weeks, plus anything earlier this week.
  insert into public.cardio_logs (user_id, log_date, kind, distance, distance_unit, duration_minutes)
  select uid, g::date,
         case extract(isodow from g) when 2 then 'run' when 4 then 'cycle' else 'run' end,
         case extract(isodow from g) when 2 then 2.1 + ((p_today - g::date) % 3) * 0.2 when 4 then 7.5 else 3.0 end,
         'mi',
         case extract(isodow from g) when 2 then 21 when 4 then 32 else 30 end
  from generate_series(p_today - 21, p_today - 1, interval '1 day') g
  where extract(isodow from g) in (2, 4, 6);

  -- Weigh-ins: about 8 weeks, every few days, trending from 196 toward 180.
  insert into public.weight_logs (user_id, log_date, weight_lb)
  select uid, p_today - k, round((196.0 - (56 - k) * 0.19 + sin(k) * 0.6)::numeric, 1)
  from generate_series(0, 56, 3) k;

  -- Saved foods (the "Saved foods" library).
  insert into public.saved_foods (user_id, name, calories, protein_g, carbs_g, fat_g) values
    (uid, 'Greek yogurt with berries',            220, 20, 28,  4),
    (uid, 'Protein shake (2 scoops)',             240, 48,  6,  3),
    (uid, 'Chicken rice bowl',                    610, 52, 70, 12),
    (uid, 'Overnight oats with peanut butter',    420, 18, 54, 15),
    (uid, 'Turkey sandwich on whole wheat',       430, 32, 44, 12);

  -- Meals: the last 3 weeks (a 21-day food streak), plus breakfast and lunch today.
  insert into public.food_entries (user_id, entry_date, meal_type, name, calories, protein_g, carbs_g, fat_g, source)
  select uid, p_today - k, m.meal_type, m.name, m.calories, m.protein_g, m.carbs_g, m.fat_g, m.source
  from generate_series(0, 21) k
  cross join lateral (values
    ('breakfast', case k % 3 when 0 then 'Overnight oats with peanut butter' when 1 then 'Greek yogurt with berries' else '3 scrambled eggs and toast' end,
                  case k % 3 when 0 then 420 when 1 then 220 else 380 end,
                  case k % 3 when 0 then 18  when 1 then 20  else 24  end,
                  case k % 3 when 0 then 54  when 1 then 28  else 26  end,
                  case k % 3 when 0 then 15  when 1 then 4   else 18  end, 'manual'),
    ('lunch',     case k % 2 when 0 then 'Chicken rice bowl' else 'Turkey sandwich on whole wheat' end,
                  case k % 2 when 0 then 610 else 430 end, case k % 2 when 0 then 52 else 32 end,
                  case k % 2 when 0 then 70 else 44 end,  case k % 2 when 0 then 12 else 12 end, 'text'),
    ('snack',     'Protein shake (2 scoops)', 240, 48, 6, 3, 'manual'),
    ('dinner',    case k % 4 when 0 then 'Salmon, roasted potatoes and broccoli' when 1 then 'Lean beef tacos (3)'
                             when 2 then 'Grilled chicken pasta' else 'Burrito bowl with steak' end,
                  case k % 4 when 0 then 640 when 1 then 690 when 2 then 720 else 760 end,
                  case k % 4 when 0 then 44  when 1 then 46  when 2 then 50  else 48  end,
                  case k % 4 when 0 then 52  when 1 then 60  when 2 then 82  else 78  end,
                  case k % 4 when 0 then 26  when 1 then 28  when 2 then 18  else 26  end, 'photo')
  ) as m(meal_type, name, calories, protein_g, carbs_g, fat_g, source)
  where k > 0 or m.meal_type in ('breakfast', 'lunch');

  -- Water: three 20 oz bottles a day in the past, one so far today.
  insert into public.water_logs (user_id, log_date, ounces)
  select uid, p_today - k, 20 from generate_series(1, 21) k cross join generate_series(1, 3)
  union all select uid, p_today, 20;

  insert into public.demo_state (id, reset_at, seeded_for) values (true, now(), p_today)
  on conflict (id) do update set reset_at = excluded.reset_at, seeded_for = excluded.seeded_for;
  return true;
end;
$$;

-- Signed-in users may call it (it does nothing unless you're the demo account).
revoke all on function public.reset_demo_data(date) from public, anon;
grant execute on function public.reset_demo_data(date) to authenticated;
