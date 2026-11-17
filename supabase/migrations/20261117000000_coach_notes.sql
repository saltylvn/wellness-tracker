-- Coach notes for the pull-up panel on the Fitness tab (Raspberry Pi coach; repo saltylvn/raspberry-pi-5,
-- decision docs/decisions/0004-in-app-delivery.md).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- What it adds:
--   * coach.notes: the daily notes (Mon-Sat) and weekly reviews (Sunday) the Pi writes.
--   * coach_writer: a SECOND login for the Pi (separate from coach_reader) that can do exactly one thing:
--     call coach.save_note(), which saves ONE note for the configured person, only for today (daily) or
--     this/last week (weekly), only in the expected shape and size. It can't read anything.
--   * public.my_coach_panel(day) and public.rate_coach_note(...): how the app shows the signed-in
--     person their own notes and saves their thumbs up/down. Nobody can read anyone else's notes.
-- The password for coach_writer is set separately with a SCRAM verifier generated on the Pi.
-- Kill switch at any time:  alter role coach_writer nologin;
-- Tested in supabase/tests/coachNotes.test.ts. Not part of the demo reset: the demo shows a fixed sample.

begin;

-- 1. The notes.
create table if not exists coach.notes (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('daily', 'weekly')),
  for_date       date not null, -- the day (daily) or that week's Monday (weekly)
  note           jsonb not null check (jsonb_typeof(note) = 'object' and octet_length(note::text) <= 8192),
  model          text not null check (char_length(model) between 1 and 60),
  prompt_version text check (prompt_version is null or char_length(prompt_version) <= 40),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  feedback       text check (feedback is null or feedback in ('up', 'down')),
  feedback_at    timestamptz,
  unique (user_id, kind, for_date),
  check (kind = 'daily' or extract(isodow from for_date) = 1)
);
alter table coach.notes enable row level security; -- no policies: only the functions below touch it
revoke all on coach.notes from public, anon, authenticated;

-- 2. Shape rules, the same ones the Pi's checker uses (with a little headroom).
create or replace function coach.valid_text_list(v jsonb, min_items integer, max_items integer, max_chars integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce: a missing value (null) must count as invalid, never as "unknown".
  select coalesce(
    jsonb_typeof(v) = 'array'
      and jsonb_array_length(v) between min_items and max_items
      and not exists (
        select 1 from jsonb_array_elements(v) e
        where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') not between 1 and max_chars
      ),
    false)
$$;

create or replace function coach.valid_text(v jsonb, min_chars integer, max_chars integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(v) = 'string' and char_length(v #>> '{}') between min_chars and max_chars, false)
$$;

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
    when 'daily'  then array['headline', 'yesterday', 'week_so_far', 'focuses', 'safety']
    when 'weekly' then array['headline', 'wins', 'trends', 'focuses', 'safety']
  end;
  if allowed is null or exists (select 1 from jsonb_object_keys(p_note) k where k <> all (allowed)) then
    return false;
  end if;
  if p_note ? 'safety' and not coach.valid_text_list(p_note -> 'safety', 1, 3, 200) then
    return false;
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

revoke all on function coach.valid_text_list(jsonb, integer, integer, integer) from public, anon, authenticated;
revoke all on function coach.valid_text(jsonb, integer, integer) from public, anon, authenticated;
revoke all on function coach.valid_note(text, jsonb) from public, anon, authenticated;

-- 3. The Pi's one write: save (or replace) one note for the configured person.
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

  -- Only today's note (a day of slack for time zones), or this or last week's review.
  if p_kind = 'daily' then
    if p_for_date is null or p_for_date not between today - 1 and today + 1 then
      raise exception 'daily notes are only for today';
    end if;
  elsif p_kind = 'weekly' then
    if p_for_date is null or extract(isodow from p_for_date) <> 1
       or p_for_date not between (today - (extract(isodow from today)::integer - 1)) - 7
                             and (today - (extract(isodow from today)::integer - 1)) then
      raise exception 'weekly reviews are only for this or last week (a Monday)';
    end if;
  else
    raise exception 'kind must be daily or weekly';
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

  -- Keep daily notes for 90 days; weekly reviews are kept.
  delete from coach.notes n where n.user_id = uid and n.kind = 'daily' and n.for_date < today - 90;
end;
$$;

revoke all on function coach.save_note(text, date, jsonb, text, text) from public, anon, authenticated;

-- 4. The app: your own notes for a day (that day's note, that week's review, and last week's review).
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
                  from coach.notes n where n.user_id = uid and n.kind = 'weekly' and n.for_date = monday - 7)
  );
end;
$$;

revoke all on function public.my_coach_panel(date) from public, anon;
grant execute on function public.my_coach_panel(date) to authenticated;

-- 5. The app: thumbs up/down on one of your own notes. Returns false if there's no such note.
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
  if uid is null or p_kind not in ('daily', 'weekly') or p_feedback not in ('up', 'down') then
    return false;
  end if;
  update coach.notes n set feedback = p_feedback, feedback_at = now()
  where n.user_id = uid and n.kind = p_kind and n.for_date = p_for_date;
  return found;
end;
$$;

revoke all on function public.rate_coach_note(text, date, text) from public, anon;
grant execute on function public.rate_coach_note(text, date, text) to authenticated;

-- 6. The Pi's write login: can use the coach schema and run save_note. Nothing else (no table access).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'coach_writer') then
    create role coach_writer login noinherit nocreatedb nocreaterole noreplication connection limit 2;
  end if;
end $$;

alter role coach_writer set statement_timeout = '10s';
alter role coach_writer set idle_in_transaction_session_timeout = '30s';

grant usage on schema coach to coach_writer;
grant execute on function coach.save_note(text, date, jsonb, text, text) to coach_writer;

commit;

-- Password (run separately, with the verifier generated on the Pi; the plaintext never leaves the Pi):
--   alter role coach_writer password 'SCRAM-SHA-256$4096:<salt>$<StoredKey>:<ServerKey>';
-- Kill switch:
--   alter role coach_writer nologin;
