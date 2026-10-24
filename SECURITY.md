# Security

## Reporting a vulnerability

Please report security problems privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability**. Don't open a public issue.

I'll acknowledge reports within a few days and fix confirmed issues as a priority.

## How this project protects data

- Every table uses Postgres **row-level security**: a signed-in user can only read and change their own rows.
- API keys (Gemini, Supabase secrets) live only on the server, in environment variables; they are never sent to the browser or committed.
- Replies from the AI are treated as untrusted input and validated before use.
- GitHub secret scanning with push protection, CodeQL, Dependabot security updates, and a production dependency audit in CI run on this repository.
