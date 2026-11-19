# DEVELOP

**A wellness tracker for weight, workouts and nutrition.** An iPhone-first, installable web app (PWA) I designed, built and use every day: log meals by photo or description with AI-estimated calories and macros, plan and log lifting and cardio, and track weight against a goal with a projected goal date.

> **Live demo:** [wellness-tracker-virid.vercel.app](https://wellness-tracker-virid.vercel.app). Tap **Try the demo** for a full sample account, no sign-up needed · **Status:** v2.0, in daily use

[![CI](https://github.com/saltylvn/wellness-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/saltylvn/wellness-tracker/actions/workflows/ci.yml)

![DEVELOP: the Coach window in the live demo on an iPhone, the coach agent's run from Postgres to the Raspberry Pi, Gemini, a checker and the Coach window, a plain-text summary of how it is built (food logging, speed, database access, link safety, evals), and four numbers: 421 app tests plus 89 on the agent, 18/18 tables with row-level security, about 2 s per photo estimate and $0 a month to run the coach](docs/linkedin/DEVELOP-project-light-4x3.png)

## What it does

- **Weight:** daily weigh-ins on scroll wheels, start / current / target with a progress bar, a hand-built SVG chart from your starting date to today, weekly pace, weeks to go and a projected goal date, and a weekly weight-loss streak.
- **Fitness:** a week calendar drives the page. Toggle which days are for lifting, cardio, both or rest.
  - **Lifting:** your own exercises with sets and rep ranges, supersets, rest reminders, weight / reps or timed sets on scroll wheels, and your PR on every card. Up to three "priority lifts" sit at the top with their PRs.
  - **Cardio and recovery:** plan a run, ride, swim or walk (or a walk, bike ride or yoga on rest days) with a target, then tick **Completed**; distances convert to count toward weekly goals.
  - A gym check-in barcode, read from a screenshot in the browser and redrawn on the server.
- **Nutrition:** add food by **photo** or **description** and Google Gemini estimates calories, protein, carbs and fat (always editable before saving); a calorie ring, macro goals, water tracking and a saved-foods library.
- **Streaks** for workouts and food, plus a daily sunshine log.
- **Coach:** a **Coach** button at the top of every tab drops down a short coaching note each morning (yesterday vs plan, the week so far, today's focus) and a weekly review every Sunday, with 👍/👎. On **Wednesdays and Sundays** it also recommends workouts: 2 to 5 articles from fitness publishers, with links, a summary of each and how they'd fit your plan, and the Coach window opens on them by itself the first time you open the app after 5 am. Everything is written by an AI agent on a Raspberry Pi 5 at home (see [The coach](#the-coach)).
- **Accounts:** Google sign-in or username and password, invite-only sign-up, a wait-list offered only when a login is refused, and an admin view to text invites (to wait-list people directly) and see users.

## Screens

Real screenshots from the live demo on an iPhone 15 Pro, in dark mode (the app follows the phone's light or dark setting).

| Weight | Fitness | Coach | Nutrition |
| :---: | :---: | :---: | :---: |
| <img src="docs/screens/weight.png" width="200" alt="Weight tab: weigh-in status, start / current / target with a progress bar, a chart of weigh-ins and the projected goal date"> | <img src="docs/screens/fitness.png" width="200" alt="Fitness tab on a lifting day: two priority lifts with PRs and the day's exercises with today's logged sets"> | <img src="docs/screens/coach.png" width="200" alt="The Coach window dropped down from the Coach button: today's note with yesterday vs plan, the week so far, today's focus and thumbs up or down"> | <img src="docs/screens/nutrition.png" width="200" alt="Nutrition tab: food streak, week strip, calorie ring and macro goals"> |
| <img src="docs/screens/login.png" width="200" alt="Login: Continue with Google, Log in with password, and Try the demo"> | <img src="docs/screens/fitness-week.png" width="200" alt="Fitness tab: workout streak, the week calendar with each day's icon, the Lift / Cardio planner and the gym barcode"> | | <img src="docs/screens/nutrition-meals.png" width="200" alt="Nutrition tab: macros, water tracker, Log food button and the day's meals"> |

## Progress: v1.0 → v2.0

DEVELOP v1.0 shipped in October 2026; v2.0 is what's live now.

| | v1.0 | v2.0 |
| --- | --- | --- |
| Design | Dark theme with green accents | Light orange-and-white redesign, consistent layout across all three tabs, new app icon |
| Weight | Weigh-ins, chart and an AI coaching note | A chart from your chosen starting date to today, a weekly loss streak, and bold progress; the AI note was removed as low value |
| Fitness | Weekly plan, set logging, cardio | Plus priority lifts with PRs, planned cardio and recovery days you tick off, timed sets, weekly walking goals and a gym barcode |
| Accounts | Google sign-in and a demo | Plus username and password, invite-only sign-up enforced in the database, and an admin view to text invites and see users |
| Engineering | 232 tests, 13 tables, 21 RLS policies | 359 tests (including the database rules on a real Postgres), 16 tables, 28 RLS policies, decision records, MIT license |

<details>
<summary>v1.0 screenshots</summary>

![DEVELOP v1.0: the Fitness tab and the Log sheet in the original dark-and-green design](docs/history/v1.0-fitness.png)

![DEVELOP v1.0 overview card](docs/history/v1.0-overview.png)

</details>

## How it's built

![Architecture: the app (iPhone PWA → Next.js on Vercel with a per-request CSP nonce, Server Components, Server Actions and an AI route → Supabase Postgres and Auth, and Gemini) and the coach agent (a Raspberry Pi 5 running Python on systemd timers → stats in code, Gemini and a checker → two single-function database logins); CI on both](docs/linkedin/DEVELOP-architecture.png)

| Layer             | Choice                                                                             | Why                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| UI and server     | Next.js 16 (App Router), React 19 Server Components and Server Actions, TypeScript | One codebase; data access and secrets stay on the server                    |
| Styling           | Tailwind CSS v4 with named color tokens                                            | Consistent theme; mobile-first with 44px+ tap targets and safe-area insets  |
| Database and auth | Supabase: Postgres with row-level security, Google OAuth and password sign-in       | Real relational data; the database itself enforces who can see what        |
| AI                | Google Gemini (server-side only), JSON-schema output, raced model chain            | Photo and text nutrition estimates on the free tier                         |
| Hosting and CI    | Vercel (Node 24), GitHub Actions, Dependabot                                       | Every pull request is checked and previewed; every merge to `main` deploys  |
| Coach agent       | Raspberry Pi 5: Python 3.13, systemd timers, `psycopg`, Gemini REST, RSS feeds, pytest and mypy | Runs on its own at home, for $0; holds only two single-function database logins |

**Data model:** 18 tables (profiles, food entries, saved foods, water, weigh-ins, workout days / exercises / sessions / sets, cardio, sunshine, AI request log, demo state, invite codes, admins, the wait-list, and the coach's config and notes), created by 33 versioned SQL migrations in [`supabase/migrations/`](supabase/migrations/), written so the app keeps working before and after each one runs.

## AI features

| Feature           | How                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Food from a photo | The photo is shrunk to 768px on the phone as soon as it's picked (never stored), sent to Gemini with a JSON schema, validated and range-checked, and fills an editable form            |
| Food from text    | The same pipeline from a plain description ("2 eggs and buttered toast")                                                                                                                |
| Speed             | Fastest free models first; if one hasn't answered in 1.5 s a backup starts alongside it and the first valid answer wins (`raceModels`). Measured: **12.5 s → 1.3–2.5 s**               |
| Reliability       | Overloaded or retired models fall through to the next, a bad key stops at once, per-model timeouts and a total time budget; every in-flight request is cancelled once there's an answer |
| Cost control      | A 40-a-day limit per person, taken atomically in Postgres before the AI is called                                                                                                       |
| Coach notes       | Written off-site by the Raspberry Pi agent below (daily, weekly, and workout picks with links); the app only reads and displays them, as plain text plus allowlisted links                                                                                  |

## The coach

An always-on **Raspberry Pi 5** at home writes the coaching notes. The agent's code lives in a separate private repository; the app side is here.

```
 Supabase                         Raspberry Pi 5                         Gemini (free tier)
 coach.weekly_data()  ──read──▶   compute stats in Python                 writes the words
                                  filter: totals only, no dates or ids ──▶ from the numbers
 coach.save_note()   ◀──save──    check every number, then save        ◀── only
        │                         Wed + Sun: 7 fitness RSS feeds ──▶ picks by number,
        │                         code inserts the real links       summaries
        ▼
 Coach window in the app  (my_coach_panel, rate_coach_note)
```

- **Code does the math; the model only writes the words.** Every number is computed and tested in Python, and a checker rejects any note with a number the code didn't produce, medical or diet advice, links or markup. One retry, then a plain-stats note written by code.
- **Two locked-down database logins.** `coach_reader` can call one function that returns one configured person's data (food and water as daily totals only: no food names, photos or barcode) in read-only transactions. `coach_writer` can call one function that saves one note for today or this week, re-checked for shape and size. Neither can read a table, neither can see other users, both refuse the demo account, and neither is exposed through the REST API ([`20261116000000_coach_access.sql`](supabase/migrations/20261116000000_coach_access.sql), [`20261117000000_coach_notes.sql`](supabase/migrations/20261117000000_coach_notes.sql)).
- **Workout picks without risky links.** On Wednesdays and Sundays the Pi reads the RSS feeds of 7 fitness publishers (Men's Health, Men's Journal, Muscle & Fitness, BOXROX, Nerd Fitness, Stronger By Science, Legion), keeps articles about training, and ranks them against the plan. The model picks articles **by number** and code inserts each real link, so it never writes a URL. The database (`coach.allowed_link`) and the app (`allowedLink`) both accept only https links on those 7 sites, rejecting look-alike domains, `http`, `javascript:` and quotes ([`20261118000000_coach_workouts.sql`](supabase/migrations/20261118000000_coach_workouts.sql)).
- **In the app,** people see and rate only their own notes, which are rendered as plain text, never HTML. A note loads only when Coach is tapped, so no page waits on it.
- **On the Pi:** a sandboxed systemd service on a dedicated user, timers at 6 am Mon–Sat, 6 pm Sunday and 4:30 am Wednesday and Sunday, secrets in a root-only store, key-only SSH and a LAN-only firewall.

## Security

- **Row-level security on all 16 tables** (28 policies): every row belongs to one signed-in user, enforced by Postgres.
- **Invite-only accounts:** a `BEFORE INSERT` trigger on `auth.users` refuses any new account without an unused, unexpired invite code, including Google sign-ups. Only the admin can create or revoke codes; the admin role lives in a table with no write policies.
- **The coach's database logins** can each call one function and nothing else, and workout links must be on an allowlist enforced in the database (see [The coach](#the-coach)); all tested on Postgres.
- **Server-side secrets only:** the Gemini key never reaches the browser; AI replies are treated as untrusted input and validated before use. Google sign-in starts on the server (PKCE).
- **Strict Content Security Policy** with a fresh nonce per request (`strict-dynamic`, `frame-ancestors 'none'`, `object-src 'none'`), plus a Permissions-Policy, cross-origin window isolation, nosniff, no framing and a strict referrer policy. HTTPS everywhere (HSTS on Vercel).
- **Limits under concurrency:** the 25-account cap and the AI daily limit use Postgres advisory locks, so two requests at once can't both slip past.
- **GitHub:** a protected `main` (pull requests only, required checks, no force-push), secret scanning with push protection, CodeQL, Dependabot, and Actions pinned to commit SHAs with a read-only token. See [`SECURITY.md`](SECURITY.md) to report a problem.

## Quality

- **421 automated tests** (Vitest). Most cover the pure logic: streaks, goal and weight-plan math, chart ranges, AI reply validation, the model race (slow model gets a backup, failures hand off, time budget), the Content Security Policy, account and invite rules, cardio unit conversion, the database helpers (against a shared fake Supabase client), and more.
- **The database rules are tested on a real Postgres.** Every migration is applied in order to an in-memory Postgres ([PGlite](https://pglite.dev)) with a small stand-in for Supabase's auth schema, then tests check that row-level security is on for every table and keeps each person's rows private, that sign-up refuses missing, used and expired invite codes (and accepts an armed one for Google), that only the admin can list users or create invites, the 25-account cap, the wait-list (visitors can join but never read it or flood it), the AI daily limit, that the shared demo login can't be changed, that the coach's two logins can't reach anything beyond their one function each, that workout links off the allowlist are refused, and exactly which functions each API role may call ([`supabase/tests/`](supabase/tests/)). They run in about a second on every pull request.
- **A performance test** times the Fitness page's data loading against a simulated 50 ms database and fails if a day takes more than 2 round trips.
- **CI on every pull request** (about 30 seconds): package signature check, dependency audit, ESLint, TypeScript type check and all tests, plus Vercel's preview build. Both must pass before anything merges.

## Engineering decisions

- **Dates are local calendar days, not UTC timestamps.** A meal logged at 11 pm counts for that day, so daily totals and streaks don't break at midnight.
- **Pure logic lives in `lib/` with tests;** pages and components stay thin.
- **Rules live in the database.** Permissions (RLS), invite-only sign-up (a trigger), the account cap and the AI limit (functions under a lock) can't be bypassed by a bug in a route.
- **Race, don't wait.** Free AI models are sometimes overloaded, so a slow request gets a backup instead of a long timeout. The race is a small generic function with its own tests, separate from the Google SDK, and the provider sits behind one file (`lib/ai/gemini.ts`).
- **The Fitness page loads in two database round trips, enforced by a test.**
- **Migrations that don't break the live app.** New columns are read defensively, so each deploy works before its SQL step has run.
- **Free tiers by design.** Supabase, Gemini and Vercel free tiers, with per-person limits so one user can't use up the shared quota.
- **A one-click demo, safely.** "Try the demo" signs in to a shared account on the server (the password never reaches the browser), and a Postgres function rebuilds its sample data around the visitor's date, at most hourly.

Longer write-ups of these choices are in [`docs/decisions/`](docs/decisions/).

## Skills

| Area | What this project uses |
| --- | --- |
| Frontend | Next.js App Router, React Server Components and Server Actions, TypeScript, Tailwind CSS v4, PWA, mobile-first UI in light and dark themes |
| Backend and data | Postgres schema design, row-level security, triggers, `SECURITY DEFINER` functions, dedicated login roles, versioned migrations, Supabase Auth (OAuth with PKCE) |
| AI | Gemini text and vision with JSON-schema output, hedged model racing, prompt design, output validation, evals with a prompt-injection scenario, a privacy filter for model inputs |
| AI agent | A Python agent on a Raspberry Pi: scheduled jobs, deterministic stats with the model limited to writing, RSS ingestion with link safety (the model picks by id, code inserts links), retries and fallbacks, a sandboxed systemd service |
| Security | Content Security Policy with nonces, least-privilege database access, secrets handling, host hardening (key-only SSH, firewall), threat modeling |
| Quality and delivery | Vitest, tests against a real Postgres (PGlite), pytest, mypy, ESLint, GitHub Actions, CodeQL, Dependabot, Vercel preview deploys |

## How I built it

I built DEVELOP with a coding agent (Claude Code), run as an engineering process: a versioned [`CLAUDE.md`](CLAUDE.md) is the project's living spec (architecture, conventions, constraints) and is updated in the same pull request as the code it describes; work ships as small pull requests with clear acceptance criteria; bugs are reproduced before they're fixed, UI changes are checked at phone size and database changes against a local Postgres; and CI plus preview deploys gate every merge. I made the product, architecture and security decisions, and reviewed and tested every change on my own phone.

## Running locally

Requires Node.js 24 (see [`.nvmrc`](.nvmrc)) and a free [Supabase](https://supabase.com) project.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `GEMINI_API_KEY` (a free key from Google AI Studio).
3. Run the SQL files in `supabase/migrations/` in order in the Supabase SQL Editor. Enable Google sign-in, and the Email provider with **Confirm email** off (usernames are stored as app-only addresses and never emailed).
4. Make yourself the admin: `insert into public.app_admins (user_id) select id from auth.users where email = 'YOUR_EMAIL';` (after signing in once; see the end of `20261105000000_username_invites.sql`). Sign-up is invite-only, so create the very first account with the trigger briefly off: `alter table auth.users disable trigger require_invite_code;` then sign in, then `enable` it again.
5. `npm run dev` and open http://localhost:3000

`npm test` runs the unit tests; `npm run build` makes a production build.

### Recruiter demo (optional)

1. Run `supabase/migrations/20261025000000_recruiter_demo.sql` (after the earlier migrations).
2. Create `demo@example.com` in **Authentication → Users → Add user** with a strong password and **Auto Confirm User** on. Because sign-up is invite-only, turn the `require_invite_code` trigger off for that step (step 4 above) or create an invite code for it.
3. Set `DEMO_EMAIL=demo@example.com` and `DEMO_PASSWORD=…` in `.env.local` and in Vercel (mark the password **Sensitive**), then redeploy. The **Try the demo** button appears once both are set.

## Roadmap

Shipped: PWA shell and deploy, sign-in (Google, username and password, invite-only), food log with macro goals, AI text and photo estimates, streaks, workouts with PRs and priority lifts, planned cardio and recovery days, water and sunshine logs, the Weight tab with a chart and goal date, an admin view, and the coach with daily notes, weekly reviews and twice-weekly workout picks from a Raspberry Pi agent.

Next: real-iPhone testing of photo logging and the scroll wheels, integration tests for the server actions, and a "last note is N days old" warning in the coach window when a scheduled run fails.

## License

[MIT](LICENSE)
