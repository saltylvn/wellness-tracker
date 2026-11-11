-- The Wait-list: people without an invite can join it from the login page with their name and
-- phone number, and only the admin sees the list in Settings (and texts each person an invite).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- Visitors aren't signed in, so they never touch the table directly: they call
-- request_access(), which checks the input and adds (or refreshes) one row per phone
-- number. Row-level security lets only the admin read, update or remove rows.

create table if not exists public.access_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 60),
  phone       text not null unique check (phone ~ '^\+?[0-9]{10,15}$'),
  created_at  timestamptz not null default now(),
  invited_at  timestamptz
);
alter table public.access_requests enable row level security;

drop policy if exists "The admin can see the wait-list" on public.access_requests;
create policy "The admin can see the wait-list"
  on public.access_requests for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "The admin can mark wait-list invites" on public.access_requests;
create policy "The admin can mark wait-list invites"
  on public.access_requests for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "The admin can remove wait-list entries" on public.access_requests;
create policy "The admin can remove wait-list entries"
  on public.access_requests for delete
  to authenticated
  using ((select public.is_admin()));

-- Ask for access. Phone numbers are stored as digits (with a leading + kept). Asking again
-- with the same number updates the name instead of adding a second row. At most
-- 200 people can wait at once, so the list can't be flooded.
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

  if not exists (select 1 from public.access_requests where phone = v_phone)
     and (select count(*) from public.access_requests where invited_at is null) >= 200 then
    raise exception 'The wait-list is full right now' using errcode = 'check_violation';
  end if;

  insert into public.access_requests (name, phone)
  values (v_name, v_phone)
  on conflict (phone) do update set name = excluded.name;
  return true;
end;
$$;
revoke all on function public.request_access(text, text) from public;
grant execute on function public.request_access(text, text) to anon, authenticated;

notify pgrst, 'reload schema';
