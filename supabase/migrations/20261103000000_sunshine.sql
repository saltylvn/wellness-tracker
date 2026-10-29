-- Sunshine (was tanning): logged every day now, 5 to 60 minutes, with an optional daily
-- target in Settings. The table keeps its old name (tanning_logs), so earlier entries stay.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

-- Allow 5 to 60 minutes (it was 5 to 15). The old rule is found by what it checks, not its name.
do $$
declare
  rule record;
begin
  for rule in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.tanning_logs'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%minutes%'
  loop
    execute format('alter table public.tanning_logs drop constraint %I', rule.conname);
  end loop;
end $$;

alter table public.tanning_logs
  add constraint tanning_logs_minutes_check check (minutes between 5 and 60);

-- Your daily sunshine target in minutes (blank = no target).
alter table public.profiles
  add column if not exists daily_sunshine_minutes smallint
    check (daily_sunshine_minutes is null or daily_sunshine_minutes between 1 and 240);

-- Let the app see the new column straight away.
notify pgrst, 'reload schema';
