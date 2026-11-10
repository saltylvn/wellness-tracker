# DEVELOP: LinkedIn copy

Live demo (no sign-up, tap "Try the demo"): https://wellness-tracker-virid.vercel.app

---

## 1. LinkedIn post

I built DEVELOP, an iPhone-first wellness tracker for weight, workouts and nutrition, and took it from idea to production. 🔥

Try it yourself (no sign-up, tap "Try the demo"):
👉 https://wellness-tracker-virid.vercel.app

What it does
⚖️ Weight: weigh-in logging, a hand-built progress chart, goal pace and projected goal date
🏋️ Fitness: weekly lift/cardio planner, set-by-set logging, supersets, PR tracking, planned cardio and recovery days
🍎 Nutrition: snap a photo or type a meal, and AI estimates calories and macros (always editable)

How it's built
• Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS v4
• Supabase Postgres + Auth, with Row-Level Security on every table
• Google Gemini for text and vision estimates, called only from the server, with hedged model racing: if a model hasn't answered in 1.5 s, a backup starts and the first valid answer wins
• Deployed on Vercel as an installable PWA

Security
• Nonce-based Content Security Policy generated per request, plus hardened headers
• Invite-only sign-up enforced by a database trigger, with a least-privilege admin role
• Per-user AI limits and an account cap, enforced atomically in Postgres
• Food photos are resized in the browser and never stored

Automation & quality
• CI on every pull request: dependency audit, lint, type-check and 302 unit tests
• A Vercel preview deploy for every PR, and a protected main branch
• Dependabot updates, GitHub Actions pinned to commit SHAs, and 26 versioned SQL migrations
• A self-resetting demo account, so anyone can explore real sample data

I built it with Claude Code as my AI pair programmer, while owning the architecture, security model and product decisions myself.

Swipe through for the screens, architecture and security model 👇

#SoftwareEngineering #NextJS #TypeScript #Supabase #AI #GenerativeAI #FullStack #WebDevelopment #PWA

---

## 2. LinkedIn "Projects" section

**Project name:** DEVELOP: AI-Powered Wellness Tracker (Full-Stack PWA)

**Project URL:** https://wellness-tracker-virid.vercel.app

**Description** (paste as-is; about 1,600 characters, under LinkedIn's 2,000 limit):

DEVELOP is an iPhone-first, installable web app for tracking weight, workouts and nutrition, with AI calorie and macro estimates from a photo or a text description. Live demo, no sign-up needed: tap "Try the demo".

Features
• Weight: daily weigh-ins, a custom SVG progress chart, goal pace, weeks to go and projected goal date, and weekly loss streaks
• Fitness: weekly lift/cardio planner with autosave, set logging (weight, reps or time), supersets, PR tracking, planned cardio and recovery days with weekly distance goals, and an in-app gym check-in barcode
• Nutrition: AI food estimates from a photo or text, a calorie ring and macro goals, water tracking and a saved-foods library

Architecture
• Next.js 16 App Router on Vercel: Server Components for reads, Server Actions for validated writes, and a request proxy for per-request security headers
• Supabase Postgres with Row-Level Security on all 15 tables, triggers and SECURITY DEFINER functions, and 26 versioned SQL migrations
• Google Gemini (text + vision), server-side only, with hedged model racing and schema-validated JSON output

Security
• Nonce-based CSP and hardened HTTP headers; secrets never reach the browser
• Google OAuth (PKCE) and username/password sign-in; invite-only sign-up enforced in the database; least-privilege admin role
• Per-user AI rate limits and an account cap, enforced atomically with Postgres advisory locks

Engineering practices
• GitHub Actions CI on every PR (npm audit, ESLint, TypeScript, 302 Vitest tests), Vercel preview deploys and a protected main branch
• Dependabot and SHA-pinned Actions; a self-resetting demo account for recruiters

Built with Claude Code as an AI pair programmer.

**Skills to tag:** Next.js · React · TypeScript · PostgreSQL · Supabase · Generative AI · Google Gemini · Web Application Security · CI/CD · GitHub Actions · Vercel · Progressive Web Apps · Software Architecture · Tailwind CSS

**Media to attach:** `project-section/DEVELOP-project-cover.png` (first), `DEVELOP-project-architecture.png`, then the three `screen-*.png` phone screenshots.

---

## 3. Short description (for a resume or portfolio card)

DEVELOP: an AI-powered wellness tracker PWA (Next.js 16, TypeScript, Supabase, Gemini). It covers weight, workout and nutrition tracking, with photo-to-macros AI estimates. Row-Level Security on every table, nonce-based CSP, invite-only auth, per-user AI rate limiting, and CI with 302 unit tests and preview deploys. Live demo: wellness-tracker-virid.vercel.app

---

## How to post

**Post**
- Option A, the best reach: create a post, choose **Add a document**, upload `DEVELOP-carousel.pdf` and title it "DEVELOP: architecture & build". This makes a swipeable carousel.
- Option B: add the 8 images in `post-images/` in order, 01 to 08.
- Paste the post text from section 1. The demo link is near the top so people see it before "…see more".

**Projects section**
Go to Profile → Add profile section → Projects. Paste the name, URL and description from section 2, then add the media files.
