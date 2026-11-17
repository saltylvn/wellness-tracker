-- Workout picks from the Raspberry Pi coach (twice a week: Wednesday and Sunday).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Adds a third kind of coach note, 'workouts': a short plan summary and 1-5 recommended workout
-- articles, each with a title, source, link, summary and why it fits. The Pi finds them in the RSS
-- feeds of a fixed list of fitness publishers.
--
-- Links are the one new risk (a note could otherwise point you anywhere), so the database only
-- accepts https links on those publishers' sites (coach.allowed_link), whatever the Pi sends.
-- The app checks the same list again before showing a link.
-- Tested in supabase/tests/coachWorkouts.test.ts.

begin;

-- 1. The link allowlist. Adding a publisher on the Pi also needs it added here.
create or replace function coach.allowed_link(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    char_length(url) <= 500
      and url ~ '^https://(www\.)?(menshealth\.com|mensjournal\.com|muscleandfitness\.com|boxrox\.com|nerdfitness\.com|strongerbyscience\.com|legionathletics\.com)/[A-Za-z0-9._~%/?#=&+:,;@!$()*-]*$',
    false)
$$;
revoke all on function coach.allowed_link(text) from public, anon, authenticated;

-- 2. Allow the new kind (any day of the week, like daily notes).
alter table coach.notes drop constraint if exists notes_kind_check;
alter table coach.notes drop constraint if exists notes_check;
alter table coach.notes add constraint notes_kind_check check (kind in ('daily', 'weekly', 'workouts'));
alter table coach.notes add constraint notes_weekly_monday_check check (kind <> 'weekly' or extract(isodow from for_date) = 1);

-- 3. Shape rules for workouts notes (the daily and weekly rules are unchanged).
create or replace function coach.valid_pick(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_typeof(p) = 'object'
      and not exists (select 1 from jsonb_object_keys(p) k where k <> all (array['title', 'source', 'url', 'summary', 'why']))
      and coach.valid_text(p -> 'title', 1, 200)
      and coach.valid_text(p -> 'source', 1, 60)
      and jsonb_typeof(p -> 'url') = 'string' and coach.allowed_link(p ->> 'url')
      and coach.valid_text(p -> 'summary', 1, 300)
      and coach.valid_text(p -> 'why', 0, 200),
    false)
$$;
revoke all on function coach.valid_pick(jsonb) from public, anon, authenticated;

create or replace function coach.valid_note(p_kind text, p_note jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  allowed text[];
begin
  if p_note is null or jsonb_typeof(p_note) <> 'object' then
    return false;
  end if;
  allowed := case p_kind
    when 'daily'    then array['headline', 'yesterday', 'week_so_far', 'focuses', 'safety']
    when 'weekly'   then array['headline', 'wins', 'trends', 'focuses', 'safety']
    when 'workouts' then array['headline', 'plan_summary', 'picks']
  end;
  if allowed is null or exists (select 1 from jsonb_object_keys(p_note) k where k <> all (allowed)) then
    return false;
  end if;
  if p_note ? 'safety' and not coach.valid_text_list(p_note -> 'safety', 1, 3, 200) then
    return false;
  end if;
  if p_kind = 'workouts' then
    return octet_length(p_note::text) <= 8192
       and coach.valid_text(p_note -> 'headline', 1, 80)
       and coach.valid_text(p_note -> 'plan_summary', 1, 600)
       and jsonb_typeof(p_note -> 'picks') = 'array'
       and jsonb_array_length(p_note -> 'picks') between 1 and 5
       and not exists (select 1 from jsonb_array_elements(p_note -> 'picks') p where coach.valid_pick(p) is not true);
  end if;
  if p_kind = 'daily' then
    return octet_length(p_note::text) <= 2048
       and coach.valid_text(p_note -> 'headline', 1, 80)
       and coach.valid_text(p_note -> 'yesterday', 1, 300)
       and coach.valid_text(p_note -> 'week_so_far', 0, 260)
       and coach.valid_text_list(p_note -> 'focuses', 1, 2, 160);
  end if;
  return octet_length(p_note::text) <= 8192
     and coach.valid_text(p_note -> 'headline', 1, 80)
     and coach.valid_text_list(p_note -> 'wins', 1, 3, 160)
     and coach.valid_text_list(p_note -> 'trends', 1, 3, 160)
     and coach.valid_text_list(p_note -> 'focuses', 2, 3, 160);
end;
$$;
revoke all on function coach.valid_note(text, jsonb) from public, anon, authenticated;

-- 4. Saving: workouts notes are for today (with a day of slack, like daily notes).
create or replace function coach.save_note(
  p_kind text,
  p_for_date date,
  p_note jsonb,
  p_model text,
  p_prompt_version text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid   uuid;
  tz    text;
  today date;
begin
  select c.user_id into uid from coach.config c where c.id;
  if uid is null then
    raise exception 'coach.config has no user';
  end if;
  if exists (select 1 from auth.users u where u.id = uid and lower(u.email) = public.demo_email()) then
    raise exception 'coach.config points at the demo account';
  end if;

  select coalesce(p.timezone, 'UTC') into tz from public.profiles p where p.id = uid;
  today := (now() at time zone coalesce(tz, 'UTC'))::date;

  -- Only today's note or picks (a day of slack for time zones), or this or last week's review.
  if p_kind in ('daily', 'workouts') then
    if p_for_date is null or p_for_date not between today - 1 and today + 1 then
      raise exception '% notes are only for today', p_kind;
    end if;
  elsif p_kind = 'weekly' then
    if p_for_date is null or extract(isodow from p_for_date) <> 1
       or p_for_date not between (today - (extract(isodow from today)::integer - 1)) - 7
                             and (today - (extract(isodow from today)::integer - 1)) then
      raise exception 'weekly reviews are only for this or last week (a Monday)';
    end if;
  else
    raise exception 'kind must be daily, weekly or workouts';
  end if;

  if coach.valid_note(p_kind, p_note) is not true then  -- null (unknown) counts as invalid
    raise exception 'note has the wrong shape or size';
  end if;
  if p_model is null or char_length(p_model) not between 1 and 60
     or (p_prompt_version is not null and char_length(p_prompt_version) > 40) then
    raise exception 'model or prompt version is invalid';
  end if;

  insert into coach.notes (user_id, kind, for_date, note, model, prompt_version)
  values (uid, p_kind, p_for_date, p_note, p_model, p_prompt_version)
  on conflict (user_id, kind, for_date) do update
    set note = excluded.note,
        model = excluded.model,
        prompt_version = excluded.prompt_version,
        updated_at = now(),
        feedback = null,  -- a rewritten note hasn't been rated yet
        feedback_at = null;

  -- Keep daily notes and workout picks for 90 days; weekly reviews are kept.
  delete from coach.notes n
  where n.user_id = uid and n.kind in ('daily', 'workouts') and n.for_date < today - 90;
end;
$$;
revoke all on function coach.save_note(text, date, jsonb, text, text) from public, anon, authenticated;
grant execute on function coach.save_note(text, date, jsonb, text, text) to coach_writer;

-- 5. The app: the day's workout picks alongside the day's note and the week's reviews.
create or replace function public.my_coach_panel(p_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid    uuid := auth.uid();
  monday date;
begin
  if uid is null or p_day is null then
    return null;
  end if;
  monday := p_day - (extract(isodow from p_day)::integer - 1);
  return jsonb_build_object(
    'daily', (select jsonb_build_object('for_date', n.for_date, 'note', n.note, 'feedback', n.feedback)
              from coach.notes n where n.user_id = uid and n.kind = 'daily' and n.for_date = p_day),
    'weekly', (select jsonb_build_object('for_date', n.for_date, 'note', n.note, 'feedback', n.feedback)
               from coach.notes n where n.user_id = uid and n.kind = 'weekly' and n.for_date = monday),
    'last_week', (select jsonb_build_object('for_date', n.for_date, 'note', n.note, 'feedback', n.feedback)
                  from coach.notes n where n.user_id = uid and n.kind = 'weekly' and n.for_date = monday - 7),
    'workouts', (select jsonb_build_object('for_date', n.for_date, 'note', n.note, 'feedback', n.feedback)
                 from coach.notes n where n.user_id = uid and n.kind = 'workouts' and n.for_date = p_day)
  );
end;
$$;
revoke all on function public.my_coach_panel(date) from public, anon;
grant execute on function public.my_coach_panel(date) to authenticated;

-- 6. Thumbs up/down works on workout picks too.
create or replace function public.rate_coach_note(p_kind text, p_for_date date, p_feedback text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_kind not in ('daily', 'weekly', 'workouts') or p_feedback not in ('up', 'down') then
    return false;
  end if;
  update coach.notes n set feedback = p_feedback, feedback_at = now()
  where n.user_id = uid and n.kind = p_kind and n.for_date = p_for_date;
  return found;
end;
$$;
revoke all on function public.rate_coach_note(text, date, text) from public, anon;
grant execute on function public.rate_coach_note(text, date, text) to authenticated;

commit;
