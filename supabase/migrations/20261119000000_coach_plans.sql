-- The Plan tab: your coach's recent workout picks, newest first.
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Until now the app could only read the picks saved for one exact day (my_coach_panel), so they
-- showed only on the Wednesday or Sunday they arrived. The Plan tab shows the latest picks on any
-- day, with the earlier ones under them, so this adds one read-only function:
-- public.my_coach_plans(limit).
--
-- It returns only the signed-in person's own picks (auth.uid()), like my_coach_panel. Nothing new
-- is stored, and the Pi's coach_reader / coach_writer logins are unchanged.
-- Tested in supabase/tests/coachWorkouts.test.ts.

begin;

create or replace function public.my_coach_plans(p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  -- Newest first; an empty list (never null) when there are none, or when nobody is signed in.
  select coalesce(
    jsonb_agg(
      jsonb_build_object('for_date', p.for_date, 'note', p.note, 'feedback', p.feedback)
      order by p.for_date desc),
    '[]'::jsonb)
  from (
    select n.for_date, n.note, n.feedback
    from coach.notes n
    where n.user_id = auth.uid() and n.kind = 'workouts'
    order by n.for_date desc
    -- Between 1 and 30 sets of picks, whatever is asked for (they're kept 90 days: about 26).
    limit least(greatest(coalesce(p_limit, 10), 1), 30)
  ) p
$$;
revoke all on function public.my_coach_plans(integer) from public, anon;
grant execute on function public.my_coach_plans(integer) to authenticated;

commit;
