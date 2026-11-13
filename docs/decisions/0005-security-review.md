# 5. Security review: what was fixed, and what is accepted

**Status:** accepted

## Context
A full review of the app code, the database rules and the hosting setup. The starting point: the "publishable" Supabase key is public by design, so anyone can call Supabase's API directly, without the app. Checks that live only in the app's server code are therefore conveniences; the real boundary is what the database allows. And the shared demo account means every visitor holds a real signed-in session.

What held up: row-level security on all 16 tables (nobody can read or change another person's rows), server-only secrets, the nonce Content Security Policy, validated AI replies, uniform login errors, and invite codes that can't be guessed.

## Decision
Fix everything with a realistic path, in code or in SQL (`20261111000000_security_hardening.sql`), with a test for each rule:

| Gap | Fix |
| --- | --- |
| A demo visitor could change the demo account's password or email (locking everyone out, or keeping the account) | A trigger on `auth.users` keeps the demo's password and refuses a new email; Settings refuses it too |
| A code armed for Google sign-in could be used by any password sign-up sent straight to Supabase | Only a sign-up without a password can use an armed code |
| AI request rows could be inserted with a far-future time, blocking the AI limit for good | Only `user_id` can be inserted; the time is the database's clock |
| The demo reset left profile fields untouched and could be forced on every call | The reset restores the profile and runs at most once every 5 minutes |
| The wait-list could be filled in seconds, revealed whether a number was on it, and let anyone rename an entry | 20 new people an hour, the same reply for every number, repeat asks change nothing |
| Login cookies were readable by page scripts | `HttpOnly`, `Secure`, `SameSite=Lax` |
| The AI route trusted the upload's declared type and had no origin check | Type read from the file's bytes; other sites' requests refused |
| Signing out of the demo signed out every demo visitor | Sign-out is for this device only |
| Trigger-only functions were listed as callable through the API | Revoked; a test lists exactly which functions each role may call |
| Development packages with advisories; CI installed with package scripts on | Patched; CI verifies registry signatures and installs with `--ignore-scripts` |

Also: more response headers (HSTS, `Cross-Origin-Resource-Policy`, a wider `Permissions-Policy`), `frame-src 'none'` in the CSP, admin and owner checks in the server actions as a second layer behind row-level security, and size limits on two text columns.

## Accepted risks
- **Armed invite codes for Google.** For up to 10 minutes after someone enters a code and taps "Continue with Google", a different person signing in with Google for the first time would get that seat. Closing it fully means asking for the Google email along with the code; not worth the extra field for a 25-account app.
- **A shared demo is writable.** Visitors can type anything into the demo's data until the next reset (at most an hour), and can use up its 40 AI estimates a day.
- **No per-person row limits.** A signed-in person could insert a very large number of their own rows. Accounts are invite-only; Supabase's own rate limits apply.
- **Sign-in rate limits are Supabase's.** Requests reach Supabase from the app's servers, so its per-address limits are shared between visitors.
- **`style-src 'unsafe-inline'`** stays in the CSP (inline style attributes for progress bars and wheels). Styles can't run code.

## Settings outside the code
These can't be set from the repository; they are checked by hand:
- **Supabase:** leaked-password protection on (where the plan offers it); the allowed redirect addresses list only this app; two-step sign-in on the dashboard account.
- **Vercel:** preview deployments require a Vercel login (they use the live database); `GEMINI_API_KEY` and `DEMO_PASSWORD` are marked Sensitive; two-step sign-in on the account.
- **GitHub:** secret scanning with push protection, CodeQL and Dependabot alerts are on; two-step sign-in on the account.

## Consequences
- One SQL step to run. The app works before and after it.
- To change the demo password, run `set develop.allow_demo_login_change = 'on';` in the same SQL Editor query first.
- Changes to the demo's sample data now go in `reset_demo_rows` (the inner function); `reset_demo_data` wraps it.
