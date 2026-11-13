# Security

## Reporting a vulnerability

Please report security problems privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Don't open a public issue.

I'll acknowledge reports within a few days and fix confirmed issues as a priority.

## How this project protects data

- Every table uses Postgres **row-level security**: a signed-in user can only read and change their own rows. The rules are tested against a real Postgres on every pull request, including exactly which database functions each API role may call.
- API keys (Gemini, Supabase secrets) live only on the server, in environment variables; they are never sent to the browser or committed.
- Login cookies are `HttpOnly`, `Secure` and `SameSite=Lax`; pages are served with a per-request nonce Content Security Policy, HSTS and other protective headers.
- Replies from the AI are treated as untrusted input and validated before use; uploaded photos are identified by their bytes, not by the type the browser claims.
- New accounts are invite-only, enforced by a database trigger. The shared demo account's login can't be changed by visitors.
- GitHub secret scanning with push protection, CodeQL, Dependabot security updates, and package signature and dependency audits in CI run on this repository.

The last full review, with what was fixed and which risks are accepted, is written up in [`docs/decisions/0005-security-review.md`](docs/decisions/0005-security-review.md).
