-- The 40-a-day AI limit in one step. Run this once in Supabase: Dashboard -> SQL Editor
-- -> New query -> paste -> Run. (Until then the app uses the older two-step check.)
--
-- Before: the app counted your AI requests, then logged a new one: two trips to the
-- database, and two requests at the same moment could both see 39 and both get in.
-- Now: one call does both, under a per-person lock, so it's faster and exact.

create or replace function public.take_ai_request(max_per_day integer)
returns boolean
language plpgsql
security invoker -- runs as you, so the ai_requests row-level security still applies
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  -- One check at a time per person (other people aren't held up).
  perform pg_advisory_xact_lock(hashtext('develop.ai_limit:' || uid::text));

  if (select count(*) from public.ai_requests
      where user_id = uid and created_at >= now() - interval '24 hours') >= max_per_day then
    return false;
  end if;

  insert into public.ai_requests (user_id) values (uid);
  return true;
end;
$$;

revoke all on function public.take_ai_request(integer) from public, anon;
grant execute on function public.take_ai_request(integer) to authenticated;
