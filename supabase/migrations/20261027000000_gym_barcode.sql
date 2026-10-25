-- Gym check-in barcode: shown at the top of the Fitness tab, so you can scan in at the
-- gym without opening the gym's own app. Only the barcode's text and type are saved;
-- the app draws the barcode fresh each time (no screenshot is stored).
-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

alter table public.profiles
  -- What the barcode says (usually your membership number).
  add column gym_barcode_text text
    check (gym_barcode_text is null or char_length(gym_barcode_text) between 1 and 200),
  -- Which kind of striped barcode it is, so it's drawn the same way (keep in step with lib/gymBarcode.ts).
  add column gym_barcode_format text
    check (gym_barcode_format is null or gym_barcode_format in (
      'code128', 'code39', 'code93', 'ean13', 'ean8', 'upca', 'upce', 'itf', 'codabar'
    ));

-- The shared recruiter demo shows a sample barcode. (The app doesn't let the demo
-- account change it, so the demo reset doesn't need to touch it.)
update public.profiles
set gym_barcode_text = 'DEVELOP-0001234', gym_barcode_format = 'code128'
where id in (select id from auth.users where lower(email) = 'demo@example.com');
