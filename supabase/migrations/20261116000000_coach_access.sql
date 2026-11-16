-- Read-only access for the weekly fitness + wellness coach on the Raspberry Pi (repo: saltylvn/raspberry-pi-5,
-- decision docs/decisions/0003-coach-data-access.md).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- What it does: creates a login, coach_reader, that can do exactly one thing: call
-- coach.weekly_data(), which returns about 8 weeks of ONE person's workouts, cardio, weight, goals,
-- recovery (sauna/stretch) and daily food, water and sunshine TOTALS. It can't read any table, can't write anything, can't see other users,
-- food names, photos or the gym barcode, and isn't reachable through the app's REST/GraphQL API.
--
-- After running this file:
--   1. Set whose data it is (step 2 below explains how; never the demo account).
--   2. Set the password with the SCRAM verifier the Pi prints (the plaintext never leaves the Pi).
-- Kill switch at any time:  alter role coach_reader nologin;
--
-- Not part of the demo reset: coach.config holds no user data, and the demo account is never configured.
-- Tested in supabase/tests/coach.test.ts.

begin;

-- 1. A private schema. Supabase's REST/GraphQL API only exposes the schemas listed in its API settings
--    (public by default), so nothing here is reachable from the internet API.
create schema if not exists coach;
revoke all on schema coach from public, anon, authenticated;

-- 2. Which user the coach is for. One row, readable only by the function's owner.
create table if not exists coach.config (
  id      boolean primary key default true check (id),
  user_id uuid not null references auth.users (id) on delete cascade
);
alter table coach.config enable row level security;  -- no policies: no role but the owner can read it
revoke all on coach.config from public, anon, authenticated;
-- Then, once, set it to YOUR account (DEVELOP's one admin). Inserts nothing unless there is exactly
-- one admin and it isn't the demo account:
--   insert into coach.config (user_id)
--   select a.user_id from public.app_admins a
--   join auth.users u on u.id = a.user_id
--   where lower(u.email) <> public.demo_email()
--     and (select count(*) from public.app_admins) = 1;
--   select count(*) from coach.config;   -- check: 1

-- 3. The one function. Takes no user id, so a caller can't ask for anyone else.
create or replace function coach.weekly_data(p_weeks integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid   uuid;
  tz    text;
  w     integer := least(greatest(coalesce(p_weeks, 8), 1), 12);
  since date;
begin
  select c.user_id into uid from coach.config c where c.id;
  if uid is null then
    raise exception 'coach.config has no user';
  end if;
  -- Belt and braces: never serve the shared recruiter demo account.
  if exists (select 1 from auth.users u where u.id = uid and lower(u.email) = public.demo_email()) then
    raise exception 'coach.config points at the demo account';
  end if;

  select coalesce(p.timezone, 'UTC') into tz from public.profiles p where p.id = uid;
  since := (now() at time zone tz)::date - (w * 7);

  return jsonb_build_object(
    'generated_at', now(),
    'timezone', tz,
    'since', since,
    'weeks', w,

    'goals', (
      select jsonb_build_object(
        'calorie_goal', p.calorie_goal, 'protein_goal_g', p.protein_goal_g,
        'carb_goal_g', p.carb_goal_g, 'fat_goal_g', p.fat_goal_g,
        'weekly_run_miles', p.weekly_run_miles, 'weekly_cycle_miles', p.weekly_cycle_miles,
        'weekly_swim_yards', p.weekly_swim_yards, 'weekly_walk_miles', p.weekly_walk_miles,
        'start_weight_lb', p.start_weight_lb, 'target_weight_lb', p.target_weight_lb,
        'weight_pace_lb_week', p.weight_pace_lb_week, 'start_date', p.start_date,
        'daily_sunshine_minutes', p.daily_sunshine_minutes,
        'priority_lifts', jsonb_build_array(p.priority_lift_1, p.priority_lift_2, p.priority_lift_3))
      from public.profiles p where p.id = uid),

    'plan', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', d.weekday, 'kind', d.kind,
        'cardio_plan_kind', d.cardio_plan_kind, 'cardio_plan_distance', d.cardio_plan_distance,
        'cardio_plan_unit', d.cardio_plan_unit,
        'rest_plan_activity', d.rest_plan_activity, 'rest_plan_target', d.rest_plan_target)
        order by d.weekday), '[]'::jsonb)
      from public.workout_days d where d.user_id = uid),

    'exercises', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'weekday', d.weekday, 'name', e.name,
        'target_sets', e.target_sets, 'rep_min', e.rep_min, 'rep_max', e.rep_max)
        order by d.weekday, e.position), '[]'::jsonb)
      from public.workout_exercises e
      join public.workout_days d on d.id = e.day_id
      where e.user_id = uid),

    'sessions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', s.session_date, 'sauna', s.sauna_done, 'stretch', s.stretch_done)
        order by s.session_date), '[]'::jsonb)
      from public.workout_sessions s
      where s.user_id = uid and s.session_date >= since),

    'sets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', s.session_date, 'exercise_id', ws.exercise_id, 'exercise', ws.exercise_name,
        'set', ws.set_number, 'weight', ws.weight, 'reps', ws.reps, 'seconds', ws.duration_seconds)
        order by s.session_date, ws.position, ws.set_number), '[]'::jsonb)
      from public.workout_sets ws
      join public.workout_sessions s on s.id = ws.session_id
      where ws.user_id = uid and s.session_date >= since),

    'cardio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', c.log_date, 'kind', c.kind, 'distance', c.distance,
        'unit', c.distance_unit, 'minutes', c.duration_minutes)
        order by c.log_date), '[]'::jsonb)
      from public.cardio_logs c
      where c.user_id = uid and c.log_date >= since),

    'weight', (
      select coalesce(jsonb_agg(jsonb_build_object('date', wl.log_date, 'lb', wl.weight_lb)
        order by wl.log_date), '[]'::jsonb)
      from public.weight_logs wl
      where wl.user_id = uid and wl.log_date >= since),

    -- Daily TOTALS only: no food names, meal details or photo paths ever leave the database.
    'nutrition_daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', t.entry_date, 'calories', t.calories, 'protein_g', t.protein_g,
        'carbs_g', t.carbs_g, 'fat_g', t.fat_g, 'entries', t.entries)
        order by t.entry_date), '[]'::jsonb)
      from (
        select f.entry_date, sum(f.calories) as calories, sum(f.protein_g) as protein_g,
               sum(f.carbs_g) as carbs_g, sum(f.fat_g) as fat_g, count(*) as entries
        from public.food_entries f
        where f.user_id = uid and f.entry_date >= since
        group by f.entry_date) t),

    'water_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', t.log_date, 'ounces', t.ounces)
        order by t.log_date), '[]'::jsonb)
      from (
        select wa.log_date, sum(wa.ounces) as ounces
        from public.water_logs wa
        where wa.user_id = uid and wa.log_date >= since
        group by wa.log_date) t),

    -- Sunshine minutes (stored in tanning_logs, DEVELOP's old name for it).
    'sunshine_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', t.log_date, 'minutes', t.minutes)
        order by t.log_date), '[]'::jsonb)
      from (
        select tl.log_date, sum(tl.minutes) as minutes
        from public.tanning_logs tl
        where tl.user_id = uid and tl.log_date >= since
        group by tl.log_date) t)
  );
end;
$$;

revoke all on function coach.weekly_data(integer) from public, anon, authenticated;

-- 4. The Pi's login: can use the coach schema and run the one function. Nothing else.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'coach_reader') then
    create role coach_reader login noinherit nocreatedb nocreaterole noreplication connection limit 2;
  end if;
end $$;

alter role coach_reader set default_transaction_read_only = on;
alter role coach_reader set statement_timeout = '10s';
alter role coach_reader set idle_in_transaction_session_timeout = '30s';

grant usage on schema coach to coach_reader;
grant execute on function coach.weekly_data(integer) to coach_reader;

commit;

-- Password (run separately, with the verifier generated on the Pi; the plaintext never leaves the Pi):
--   alter role coach_reader password 'SCRAM-SHA-256$4096:<salt>$<StoredKey>:<ServerKey>';
-- Kill switch:
--   alter role coach_reader nologin;
