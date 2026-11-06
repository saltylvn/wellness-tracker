# Wellness Tracker: Project Summary

*A full-stack, iPhone-first web app for nutrition, lifting, and cardio tracking, built end to end with Claude Code. Live on the web and installable on an iPhone home screen.*

> Section 1 is the short pitch. Sections 2 to 9 cover the technical detail: the numbers, features, stack, architecture, database design, integrations, testing, and the problems solved along the way.

---

## 1. The pitch (30 seconds)

I built and shipped a production web app that tracks food, workouts, and cardio, with AI that turns a photo or a sentence into calories and macros. It has Google sign-in, a Postgres database designed with row-level security, a custom iOS-style scroll-wheel input, streaks, goals, and 126 automated tests, and it deploys automatically from GitHub to Vercel. I went from an empty folder to a live, installable app in about two days by directing Claude Code as my AI pair programmer, and I made the product decisions, set up the cloud services, ran the database migrations, tested on a real iPhone, and approved every release.

---

## 2. By the numbers

| | |
|---|---|
| **Build time** | Empty folder to live production app in ~2 days (Oct 4 to 5, 2026, per git history) |
| **Code** | 90 TypeScript/TSX files, ~6,000 lines (≈4,900 application code + ≈1,100 test code) |
| **Automated tests** | **126 unit tests** in 13 files, all passing |
| **Database** | **9 Postgres tables**, **8 SQL migrations** (353 lines), **18 row-level-security policies**, 9 triggers, 7 indexes, dozens of CHECK constraints |
| **App surface** | 15 routes, 23 React components, 26 library modules, 7 server-action modules, 1 protected API endpoint |
| **Workflow** | 27 commits on `main`, **11 pull requests**, each reviewed and merged after automated checks |
| **Integrations** | Google OAuth 2.0, Supabase (Auth + Postgres), Google Gemini (multimodal AI), Vercel (CI/CD), GitHub |

---

## 3. What the app does

- **Nutrition:** log food by **photo** (AI estimates calories and macros), by **typed description** (AI), by **saved foods** library, or manually. Daily calorie ring turns green or red against a goal, optional protein/carb/fat goals with progress bars, and a week calendar.
- **Fitness (one calendar-driven page):**
  - **Lifting days:** a weekly plan with a user-editable exercise list, user-set sets and rep ranges, supersets, rest reminders, and per-set logging with **iOS-style scroll wheels** for weight and reps. Cards show last time's numbers and the heaviest weight ever logged. Sauna and stretch are one-tap checkboxes.
  - **Cardio days:** log run, cycle, or swim with optional distance and time; weekly distance goals with progress bars.
- **Streaks:** a fitness streak and a food-logging streak, with a rest-day-aware algorithm, best-streak tracking, and milestone messages.
- **PWA:** installable to the iPhone home screen, full-screen, safe-area aware, with a custom icon drawn in code.

---

## 4. Tech stack

| Layer | Tools |
|---|---|
| **Frontend** | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS 4 |
| **Backend** | Next.js server components, server actions, and route handlers (Node runtime) |
| **Database / Auth** | Supabase: PostgreSQL, Auth, Row Level Security; `@supabase/supabase-js` and `@supabase/ssr` |
| **Identity** | Google OAuth 2.0 (Google Cloud Console), PKCE code-exchange flow |
| **AI** | Google Gemini API (`@google/genai`), multimodal (image + text) with JSON-schema constrained output |
| **Testing / quality** | Vitest, ESLint, strict TypeScript, production-build gates |
| **DevOps** | GitHub (PR-based workflow, `gh` CLI), Vercel (hosting, preview deployments, env var management), Homebrew, Node.js |
| **AI-assisted development** | **Claude Code** (agentic coding, repo-aware, with a project `CLAUDE.md` guide) |

*Note: Claude Code was my development tool. The AI feature inside the app uses Google's Gemini free tier, chosen deliberately for cost.*

---

## 5. Architecture

```
iPhone (Safari / installed PWA)
   │  HTTPS
   ▼
Vercel ── Next.js 16 app
   │       ├─ proxy.ts ........ refreshes the login session, protects every route
   │       ├─ Server components  read data with the user's own session
   │       ├─ Server actions ... validate input, then write (food, workouts, cardio, goals)
   │       └─ /api/estimate-food  auth check → daily limit → Gemini → validated JSON
   │
   ├────────────► Supabase
   │               ├─ Auth (Google OAuth)
   │               └─ Postgres: 9 tables, every one protected by Row Level Security
   │
   └────────────► Google Gemini API (called ONLY from the server; key never reaches the browser)
```

Key design decisions: server-side validation of everything the browser sends; the database enforces ownership (RLS) so a bug in app code can't leak another user's data; all dates are stored as plain local calendar dates so totals and streaks never shift at UTC midnight; pure logic lives in unit-tested modules separate from UI.

---

## 6. Database design (SQL)

I designed the schema and applied every migration myself in the Supabase SQL Editor, verifying each one afterward with read-only checks against the live database.

**Schema (9 tables):** `profiles`, `food_entries`, `saved_foods`, `ai_requests`, `workout_days`, `workout_exercises`, `workout_sessions`, `workout_sets`, `cardio_logs`.

**Techniques demonstrated:**
- **Row Level Security everywhere:** 18 policies using `(select auth.uid())`, so each user can only read and write their own rows, enforced in the database, not just the app.
- **Integrity in the database:** CHECK constraints for value ranges and enums (e.g. calories 0 to 10,000, meal type in a fixed set, `rep_min <= rep_max`, "a distance always has its unit"), `NOT NULL` and defaults, foreign keys with `ON DELETE CASCADE` / `SET NULL` chosen deliberately (e.g. logged sets keep a copy of the exercise name so history survives renames).
- **Triggers and functions:** a `SECURITY DEFINER` function with a locked `search_path` that creates a profile on sign-up; a reusable `updated_at` trigger.
- **Indexes:** composite indexes for the hot query paths (`user_id, entry_date`), and a **case-insensitive unique index** (`user_id, lower(name)`) to prevent duplicate saved foods.
- **Evolving a live schema safely:** additive `ALTER TABLE ... ADD COLUMN` migrations with defaults (existing profiles received the 5-mile and 10-mile weekly goal defaults automatically), versioned and ordered as 8 migration files in the repo.
- **Idempotent seeding:** a user's starting weekly plan is created with `upsert ... ignoreDuplicates`, so concurrent requests can never duplicate it.
- **Rate limiting in SQL:** an append-only `ai_requests` log with insert-only RLS (no update or delete policy), counted over a rolling 24 hours.
- **Operational diagnosis:** I traced a "can't save" bug to a missing column by querying the live schema, then added error classification (Postgres codes `42703`, `42P01`, PostgREST `PGRST204`, `PGRST205`) so the app now says when the database needs a migration.

---

## 7. Integrations and engineering highlights

**Authentication (Google OAuth + Supabase):** configured the OAuth consent screen and client in Google Cloud Console, wired the redirect URIs and Supabase provider settings, and built the login page, the callback route that exchanges the one-time code for a session, and `proxy.ts` (Next.js 16's replacement for middleware) that refreshes sessions and redirects logged-out users. Verified tokens with `getClaims()` rather than trusting cookies.

**AI estimation (Gemini):** a protected `/api/estimate-food` endpoint that accepts a photo and/or text, validates type and size, enforces a **40-requests-per-user-per-day limit**, calls Gemini with a **JSON schema** so the reply has a fixed shape, then **validates the model's answer again** (types, ranges, "not food" detection, rounding) before the UI sees it. Photos are resized in the browser to a 1,024 px JPEG first (faster, cheaper, avoids HEIC issues) and are never stored. The provider is isolated in one file, so it can be swapped without touching the app. The estimate always lands in an editable form; nothing saves until the user confirms.

**Frontend engineering:**
- Server components for data, client components only where needed; server actions with `useActionState`; **optimistic UI** with `useOptimistic` for one-tap checkboxes.
- **Time-zone-correct rendering** with `useSyncExternalStore` (the server can't know the phone's date, so "today" is resolved in the browser without hydration mismatches).
- A **custom iOS-style scroll-wheel picker** built from CSS scroll-snap (no library), plus a reusable bottom-sheet component. I tested the wheel in a real browser (spinning, in-between snaps, edges, programmatic changes) and fixed a race where the value only updated after the wheel stopped.
- **Mobile/PWA polish:** web app manifest, safe-area insets, 44 px+ tap targets, 16 px inputs to stop iOS zoom, and an app icon generated in code with `next/og` (SVG).

**Algorithms and business logic (all unit-tested):** a streak engine that handles rest days, "today isn't over yet," bonus days, month/year rollovers and duplicate dates; week calculations with a configurable week start; goal-progress and weekly-total aggregation across units; validation layers shared by logged and saved foods.

**Security practices:** RLS on every table, server-side re-validation of every input (browser is never trusted), allow-listed values for anything that selects a column or type, secrets only in server environment variables (marked Sensitive in Vercel), `.env*` git-ignored, and a **full git-history secret scan** confirming no keys were ever committed.

---

## 8. Quality, testing, and delivery

- **126 unit tests (Vitest)** covering streaks, dates and weeks, goal and macro validation, AI-response validation, workout plan parsing, cardio validation, set logging defaults, weekly totals, and database-error classification.
- **Gated releases:** nothing was committed or merged until type-check, lint, tests, **and** a clean production build all passed. After an early lapse (a commit slipped through during a failing local build), I made the build exit code a hard gate.
- **Verification in a real browser** for UI behavior (scroll wheel, bottom sheet, streak badge, icons), plus on-device testing on an iPhone.
- **CI/CD:** every pull request builds a Vercel preview; merging to `main` deploys to production automatically.
- **Git workflow:** feature branches, descriptive commits, **11 pull requests** each with a written description (what, why, reviewer notes, what was and wasn't verified).

---

## 9. Problems I diagnosed

| Problem | Root cause | Fix |
|---|---|---|
| Vercel preview build failed after adding Supabase | A helper threw on missing env vars *before* telling Next.js the page was per-request, so the build tried to pre-render a user-specific page | Read cookies first so pages render at request time; separately fixed env var scope (Preview vs Production) |
| `tsc` and `next build` randomly failed locally | iCloud "Desktop & Documents" sync was creating `"... 2"` duplicate folders inside `node_modules` | Verified duplicates were empty, cleaned them, moved the project out of iCloud-synced storage, reinstalled |
| Icon rendering crashed the image endpoint | `next/og`'s renderer only allows plain SVG tags (no fragments or components) | Restructured the drawing with grouped intrinsic elements |
| A package install conflicted | Test runner required a newer `@types/node` than the starter pinned | Upgraded the one type package instead of forcing the install |
| Saves silently failed after a feature shipped | Code expected a column the live database didn't have yet | Queried the live schema to confirm, then added precise error classification and a clear in-app message |
| Home-screen icon couldn't switch for dark mode | iOS allows only one icon for a web app | Researched platform behavior and made the dark icon the single default |
