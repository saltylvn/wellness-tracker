URL = "wellness-tracker-virid.vercel.app"
def page(cls, body, total=8, n=None):
    foot = "" if n is None else f'''<div class="foot"><span class="brand">DEVELOP</span><span>{URL}</span><span>{n:02d} / {total:02d}</span></div>'''
    return f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="base.css"></head>
<body><div class="slide {cls}">{body}{foot}</div></body></html>'''

def feats(items):
    return '<div class="feat">' + "".join(
        f'<div class="f"><div class="n">{i+1}</div><div><b>{t}</b><span>{d}</span></div></div>' for i,(t,d) in enumerate(items)) + '</div>'

slides = {}

# 1. Hero
slides["01-hero"] = page("p", f'''
<div class="eyebrow">Case study · Full-stack web app</div>
<div class="h1" style="margin-top:22px;font-size:104px;letter-spacing:.06em">DEVELOP</div>
<div class="lede" style="margin-top:18px;max-width:880px;font-size:30px;color:#3a3a40">An iPhone-first wellness tracker for <b style="color:var(--ink)">weight</b>, <b style="color:var(--ink)">workouts</b> and <b style="color:var(--ink)">nutrition</b>, with AI calorie estimates from a photo or a sentence.</div>
<div style="position:absolute;left:0;right:0;top:440px;height:680px">
  <div class="phone" style="position:absolute;width:268px;left:120px;top:56px;transform:rotate(-6deg)"><img src="ph-weight-chart.png"></div>
  <div class="phone" style="position:absolute;width:296px;left:392px;top:0;z-index:2"><img src="ph-fitness-lifts.png"></div>
  <div class="phone" style="position:absolute;width:268px;left:692px;top:56px;transform:rotate(6deg)"><img src="ph-nutrition-top.png"></div>
</div>
<div style="position:absolute;left:72px;right:72px;bottom:118px;display:flex;gap:12px;flex-wrap:wrap">
  {"".join(f'<span class="chip" style="font-size:18px;padding:10px 15px"><span class="dot"></span>{t}</span>' for t in ["Next.js 16","React 19","TypeScript","Supabase · Postgres","Gemini AI","Vercel"])}
</div>''', n=1)

# 2. Weight
slides["02-weight"] = page("p", f'''
<div class="eyebrow">Tab 1 · Weight</div>
<div class="h2" style="margin-top:18px;max-width:900px">Progress you can see, math you can trust.</div>
<div style="display:grid;grid-template-columns:340px 1fr;gap:56px;margin-top:48px;align-items:start">
  <div class="phone" style="width:340px"><img src="ph-weight-chart.png"></div>
  <div style="padding-top:8px">{feats([
    ("Hand-built SVG chart", "No chart library: scales from your start date to today, touch to inspect any weigh-in."),
    ("Goal engine in pure TypeScript", "Pace, weeks to go and projected goal date, clamped to safe limits and unit tested."),
    ("Weekly loss streak", "Mon–Sun weeks computed client-side from the user's local calendar, so midnight never breaks it."),
    ("One-tap logging", "A bottom sheet with iOS-style scroll wheels; one weigh-in per day, enforced in the database."),
  ])}</div>
</div>
<div class="card" style="position:absolute;left:72px;right:72px;bottom:120px;padding:22px 28px;display:flex;gap:16px;align-items:center">
  <span class="tag">data</span><span style="font:500 21px/1.35 Inter;color:#3a3a40">Dates are stored as the user's <b style="color:var(--ink)">local calendar day</b>, with a unique (user, day) constraint: no duplicate weigh-ins, no midnight-UTC bugs.</span>
</div>''', n=2)

# 3. Fitness
slides["03-fitness"] = page("p", f'''
<div class="eyebrow">Tab 2 · Fitness</div>
<div class="h2" style="margin-top:18px;max-width:920px">Plan the week. Log every set. Track every PR.</div>
<div style="display:grid;grid-template-columns:286px 286px 1fr;gap:26px;margin-top:44px;align-items:start">
  <div class="phone" style="width:286px"><img src="ph-fitness-top.png"></div>
  <div class="phone" style="width:286px;margin-top:48px"><img src="ph-fitness-lifts.png"></div>
  <div style="padding-top:4px">{feats([
    ("Weekly planner", "Lift / Cardio toggles autosave via debounced Server Actions."),
    ("Set logging", "Weight, reps or timed sets; supersets, rest cues and PRs."),
    ("Cardio & recovery", "Planned runs, rides, swims and walks convert units to count toward weekly goals."),
    ("Gym barcode", "Decoded in-browser (ZXing), redrawn server-side as SVG (bwip-js)."),
  ])}</div>
</div>
<div class="card" style="position:absolute;left:72px;right:72px;bottom:120px;padding:22px 28px;display:flex;gap:16px;align-items:center">
  <span class="tag">perf</span><span style="font:500 21px/1.35 Inter;color:#3a3a40">Every Fitness page loads in <b style="color:var(--ink)">2 parallel query rounds</b>, guarded by a test that fails the build if a day type needs a third.</span>
</div>''', n=3)

# 4. Nutrition
slides["04-nutrition"] = page("p", f'''
<div class="eyebrow">Tab 3 · Nutrition</div>
<div class="h2" style="margin-top:18px;max-width:920px">Snap a photo. AI estimates the macros.</div>
<div style="display:grid;grid-template-columns:286px 286px 1fr;gap:26px;margin-top:44px;align-items:start">
  <div class="phone" style="width:286px"><img src="ph-nutrition-top.png"></div>
  <div class="phone" style="width:286px;margin-top:48px"><img src="ph-nutrition-meals.png"></div>
  <div style="padding-top:4px">{feats([
    ("Photo or text → macros", "Google Gemini, called only from the server; key never reaches the browser."),
    ("Hedged model racing", "If a model hasn't answered in 1.5 s, a backup starts and the first valid answer wins (~1–2.5 s)."),
    ("Validated, editable output", "AI JSON is schema-checked before use; the user can always correct it."),
    ("Private by design", "Photos are resized to 768 px in the browser and never stored."),
  ])}</div>
</div>
<div class="card" style="position:absolute;left:72px;right:72px;bottom:120px;padding:22px 28px;display:flex;gap:16px;align-items:center">
  <span class="tag">cost control</span><span style="font:500 21px/1.35 Inter;color:#3a3a40"><b style="color:var(--ink)">40 AI requests per user per day</b>, enforced atomically in Postgres with a per-user lock; runs on the free tier.</span>
</div>''', n=4)

# 5. Architecture
def box(title, sub, extra="", accent=False, w=None):
    st = f"width:{w}px;" if w else ""
    bg = "background:var(--ink);color:#fff;" if accent else ""
    sc = "color:#c9c9cf" if accent else "color:var(--muted)"
    return f'<div class="card" style="{st}{bg}padding:20px 22px"><div style="font:700 23px/1.2 Inter">{title}</div><div style="font:400 17px/1.4 Inter;{sc};margin-top:6px">{sub}</div>{extra}</div>'
arrow_d = '<div style="text-align:center;font:700 26px/1 Inter;color:var(--accent);margin:10px 0">↓</div>'
slides["05-architecture"] = page("p", f'''
<div class="eyebrow">Architecture</div>
<div class="h2" style="margin-top:18px">Server-first, secure by default.</div>
<div style="margin-top:44px;display:grid;gap:0">
  {box("📱 iPhone PWA", "Installable from Safari · React 19 client islands · loading skeletons for instant taps")}
  {arrow_d}
  <div style="border:2px dashed #d7d7dc;border-radius:28px;padding:22px;position:relative">
    <div class="mono" style="position:absolute;top:-13px;left:24px;background:var(--bg);padding:0 10px;font-size:16px;color:var(--muted)">Vercel</div>
    {box("proxy.ts · edge of every request", "Per-request CSP nonce · session refresh · sign-in redirects")}
    {arrow_d}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
      {box("Server Components", "Pages read data on the server in parallel rounds")}
      {box("Server Actions", "Every write re-validated server-side")}
      {box("/api/estimate-food", "AI route: rate limit → Gemini → JSON validation")}
    </div>
  </div>
  {arrow_d}
  <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:14px">
    {box("Supabase", "Postgres · 15 tables · Row-Level Security on all · triggers & SECURITY DEFINER functions · 26 versioned SQL migrations<br>Auth · Google OAuth (PKCE) + username/password · invite-only", accent=True)}
    {box("Google Gemini", "Text + vision models, free tier · called only from the server")}
  </div>
</div>
<div style="margin-top:22px;display:flex;gap:12px;flex-wrap:wrap">
  {"".join(f'<span class="chip" style="font-size:17px;padding:9px 14px"><span class="dot"></span>{t}</span>' for t in ["GitHub → CI → Vercel preview per PR","Protected main → production"])}
</div>
<div class="card" style="margin-top:22px;padding:22px 26px;display:grid;gap:16px">
  <div class="mono" style="font-size:15px;color:var(--accent);text-transform:uppercase;letter-spacing:.08em">Request lifecycles</div>
  <div style="display:grid;grid-template-columns:170px 1fr;gap:14px;align-items:baseline"><b style="font:700 19px/1.3 Inter">Save a set</b><span style="font:400 17px/1.45 Inter;color:#4a4a52">Tap Log → Server Action → validate input → Postgres (RLS checks the owner) → revalidate → fresh page</span></div><div style="display:grid;grid-template-columns:170px 1fr;gap:14px;align-items:baseline"><b style="font:700 19px/1.3 Inter">AI food photo</b><span style="font:400 17px/1.45 Inter;color:#4a4a52">Resize to 768 px in the browser → /api/estimate-food → daily limit (Postgres function) → Gemini race → validate JSON → editable form</span></div>
</div>''', n=5)

# 6. Security
sec = [
 ("Row-Level Security everywhere", "Every table is scoped to the signed-in user in Postgres itself, not just in app code."),
 ("Nonce-based CSP", "A fresh nonce per request with strict-dynamic, frame-ancestors 'none', object-src 'none'; builder is unit tested."),
 ("Hardened headers", "X-Frame-Options DENY, nosniff, COOP same-origin, strict Referrer- and Permissions-Policy."),
 ("Secrets stay server-side", "AI and service keys never ship to the browser; OAuth starts on the server (PKCE)."),
 ("Invite-only sign-up", "A BEFORE INSERT trigger on auth.users rejects any account without a valid, single-use code."),
 ("Least-privilege admin", "Admin role lives in a table with no write policies; only the admin can mint or revoke invites."),
 ("Abuse limits", "25-account cap and 40 AI calls/day, both enforced atomically with Postgres advisory locks."),
 ("Supply chain", "npm audit gate in CI, Actions pinned to commit SHAs, read-only CI token, Dependabot updates."),
]
slides["06-security"] = page("p", f'''
<div class="eyebrow">Security</div>
<div class="h2" style="margin-top:18px">Defense in depth, from the database up.</div>
<div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
  {"".join(f'<div class="card" style="padding:28px 28px;min-height:196px"><div style="display:flex;gap:12px;align-items:center"><span style="width:34px;height:34px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font:800 17px/1 Inter;flex:none">✓</span><b style="font:700 23px/1.2 Inter">{t}</b></div><div style="font:400 19px/1.45 Inter;color:var(--muted);margin-top:12px">{d}</div></div>' for t,d in sec)}
</div>''', n=6)

# 7. Automation & quality
steps = ["Pull request","npm ci","npm audit","ESLint","tsc --noEmit","Vitest · 302 tests","Vercel preview","Merge → prod"]
flow = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' + "".join(
  f'<div class="card" style="padding:22px 16px;text-align:center"><div class="mono" style="font-size:16px;color:var(--accent)">{i+1:02d}</div><div style="font:700 21px/1.25 Inter;margin-top:8px">{s}</div></div>' for i,s in enumerate(steps)) + '</div>'
auto = [
 ("CI on every PR (~30 s)", "Lint, type-check, unit tests and a dependency audit must pass; main is protected and force-push is blocked."),
 ("Preview deploys", "Vercel builds every PR to its own URL before anything reaches production."),
 ("Dependabot", "Weekly grouped updates for packages and GitHub Actions; security fixes open immediately."),
 ("Schema as code", "26 versioned SQL migrations; new columns are read defensively so the app never breaks mid-rollout."),
 ("Self-healing demo", "A Postgres function rebuilds the recruiter demo around each visitor's date, at most hourly."),
 ("Integrations", "Gemini AI · Google OAuth · SMS invite deep links · barcode decode/encode · installable PWA."),
]
slides["07-automation"] = page("p", f'''
<div class="eyebrow">Automation · Integration · Quality</div>
<div class="h2" style="margin-top:18px">Ship small, ship safely, every time.</div>
<div style="margin-top:44px">{flow}</div>
<div style="margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
  {"".join(f'<div class="card" style="padding:28px 28px;min-height:178px"><b style="font:700 23px/1.2 Inter">{t}</b><div style="font:400 19px/1.45 Inter;color:var(--muted);margin-top:10px">{d}</div></div>' for t,d in auto)}
</div>''', n=7)

# 8. Stack + CTA
groups = [
 ("Frontend", ["Next.js 16 · App Router","React 19 · Server Components","TypeScript","Tailwind CSS v4","Installable PWA"]),
 ("Backend & data", ["Server Actions","Supabase Postgres","Row-Level Security","Supabase Auth · OAuth"]),
 ("AI", ["Google Gemini (text + vision)","Hedged model racing","Schema-validated output"]),
 ("Delivery", ["Vercel","GitHub Actions CI","Vitest","Dependabot"]),
]
slides["08-stack"] = page("p", f'''
<div class="eyebrow">Tech stack</div>
<div class="h2" style="margin-top:18px">Built to production standards.</div>
<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
  {"".join(f'<div class="card" style="padding:24px"><div class="mono" style="font-size:16px;color:var(--accent);text-transform:uppercase;letter-spacing:.08em">{g}</div><div style="margin-top:14px;display:grid;gap:10px">' + "".join(f'<div style="font:600 21px/1.25 Inter">{x}</div>' for x in xs) + '</div></div>' for g,xs in groups)}
</div>
<div style="margin-top:26px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
  {"".join(f'<div class="card" style="padding:18px;text-align:center"><div style="font:800 40px/1 Inter Display;color:var(--accent)">{v}</div><div style="font:500 16px/1.3 Inter;color:var(--muted);margin-top:8px">{k}</div></div>' for v,k in [("302","unit tests"),("15","Postgres tables"),("26","SQL migrations"),("3","tabs, 1 PWA")])}
</div>
<div class="card" style="margin-top:26px;padding:28px 30px;background:var(--ink);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:20px">
  <div><div style="font:800 32px/1.1 Inter Display">Try the live demo</div><div style="font:400 19px/1.4 Inter;color:#c9c9cf;margin-top:8px">No sign-up: tap <b style="color:#fff">“Try the demo”</b> for a full sample account.</div></div>
  <div class="pill" style="font-size:21px;white-space:nowrap">{URL}</div>
</div>''', n=8)

# Landscape: project cover + architecture
slides["project-cover"] = page("l", f'''
<div style="display:grid;grid-template-columns:1fr 560px;height:100%;align-items:center">
  <div>
    <div class="eyebrow" style="font-size:16px">Full-stack web app</div>
    <div class="h1" style="margin-top:14px;font-size:72px;letter-spacing:.06em">DEVELOP</div>
    <div class="lede" style="margin-top:14px;font-size:21px;max-width:520px;color:#3a3a40">iPhone-first wellness tracker: weight, workouts and nutrition with AI calorie estimates from a photo.</div>
    <div style="margin-top:22px;display:flex;gap:8px;flex-wrap:wrap;max-width:560px">{"".join(f'<span class="chip" style="font-size:15px;padding:8px 12px"><span class="dot" style="width:8px;height:8px"></span>{t}</span>' for t in ["Next.js 16","TypeScript","Supabase","Gemini AI","Vercel"])}</div>
    <div class="pill" style="margin-top:26px;font-size:17px;padding:12px 18px">Live demo · {URL}</div>
  </div>
  <div style="position:relative;height:100%">
    <div class="phone" style="position:absolute;width:190px;left:10px;top:70px;transform:rotate(-6deg);border-radius:32px;padding:7px"><img src="ph-weight-chart.png" style="border-radius:26px"></div>
    <div class="phone" style="position:absolute;width:210px;left:178px;top:18px;z-index:2;border-radius:34px;padding:7px"><img src="ph-fitness-lifts.png" style="border-radius:28px"></div>
    <div class="phone" style="position:absolute;width:190px;left:362px;top:70px;transform:rotate(6deg);border-radius:32px;padding:7px"><img src="ph-nutrition-top.png" style="border-radius:26px"></div>
  </div>
</div>''')

slides["cover-4x3"] = page("w grid-bg", f'''
<div style="display:grid;grid-template-columns:1fr 600px;height:610px;align-items:center;gap:10px">
  <div style="padding-top:40px">
    <div style="display:flex;align-items:center;gap:14px">
      <div class="eyebrow" style="font:600 18px/1 'JetBrains Mono';letter-spacing:.12em">Web Application</div>
      <span style="display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--accent);color:var(--accent);border-radius:999px;padding:6px 11px;font:700 13px/1 Inter;letter-spacing:.02em"><span style="width:7px;height:7px;border-radius:50%;background:var(--accent)"></span>Live · in daily use</span>
    </div>
    <div class="h1" style="margin-top:16px;font-size:84px;letter-spacing:.06em">DEVELOP</div>
    <div style="margin-top:8px;font:700 28px/1.1 'Inter Display';letter-spacing:.01em;color:var(--accent)">Wellness Tracker</div>
    <div class="lede" style="margin-top:16px;font-size:24px;max-width:480px;color:#3a3a40">An iPhone-first wellness tracker for <b style="color:var(--ink)">weight</b>, <b style="color:var(--ink)">workouts</b> and <b style="color:var(--ink)">nutrition</b>, with calorie estimates from a photo.</div>
    <div class="pill" style="margin-top:30px;font:600 15px/1 'JetBrains Mono';padding:15px 18px;white-space:nowrap">Live demo · {URL}</div>
    <div style="margin-top:12px;display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:#fff;border-radius:999px;padding:13px 20px;font:600 16px/1 'JetBrains Mono';white-space:nowrap"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>github.com/saltylvn/wellness-tracker</div>
  </div>
  <div style="position:relative;height:100%">
    <div class="phone" style="position:absolute;width:220px;left:6px;top:92px;transform:rotate(-6deg);border-radius:37px;padding:8px"><img src="ph-weight-chart.png" style="border-radius:30px"></div>
    <div class="phone" style="position:absolute;width:246px;left:180px;top:30px;z-index:2;border-radius:39px;padding:9px"><img src="ph-fitness-lifts.png" style="border-radius:31px"></div>
    <div class="phone" style="position:absolute;width:220px;left:384px;top:92px;transform:rotate(6deg);border-radius:37px;padding:8px"><img src="ph-nutrition-top.png" style="border-radius:30px"></div>
  </div>
</div>
<div style="position:absolute;left:64px;right:64px;bottom:214px;display:grid;grid-template-columns:1fr 1.45fr 1fr;gap:12px">
  {"".join(f'<div style="display:flex;align-items:baseline;gap:10px;justify-content:center;border-top:1.5px dashed #d4d4da;padding-top:16px"><span style="font:800 34px/1 \'Inter Display\';color:var(--accent);white-space:nowrap">{v}</span><span class="mono" style="font-size:14px;font-weight:500;color:#3a3a40;white-space:nowrap">{k}</span></div>' for v,k in [("359","automated tests"),("16/16","tables with row-level security"),("~2 s","AI photo estimates")])}
</div>
<div style="position:absolute;left:64px;right:64px;bottom:44px;display:grid;grid-template-columns:repeat(5,1fr);gap:10px">
  {"".join(f'<div class="card" style="padding:16px 16px;border:1px solid var(--line)"><div class="mono" style="font-size:13px;color:var(--accent)">// {g.lower()}</div><div class="mono" style="font-size:13px;line-height:1.65;font-weight:500;margin-top:8px;color:var(--ink)">{x}</div></div>' for g,x in [
    ("Frontend","Next.js 16 · React 19<br>TypeScript · Tailwind<br>Server Actions · PWA"),
    ("Backend & data","Supabase Postgres<br>Supabase Auth<br>Row-Level Security"),
    ("AI","Google Gemini<br>text + vision<br>server-side only"),
    ("Security","Nonce-based CSP<br>Invite-only auth<br>Per-user rate limits"),
    ("Delivery","Vercel<br>GitHub Actions CI<br>Vitest · Dependabot")])}
</div>''')

slides["social-preview"] = page("sp grid-bg", f'''
<div style="display:grid;grid-template-columns:1fr 520px;height:100%;align-items:center">
  <div>
    <div style="display:flex;align-items:center;gap:12px">
      <div class="eyebrow" style="font:600 16px/1 'JetBrains Mono';letter-spacing:.12em">Web Application</div>
      <span style="display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--accent);color:var(--accent);border-radius:999px;padding:5px 10px;font:700 12px/1 Inter"><span style="width:6px;height:6px;border-radius:50%;background:var(--accent)"></span>v2.0 · live</span>
    </div>
    <div class="h1" style="margin-top:14px;font-size:92px;letter-spacing:.06em">DEVELOP</div>
    <div style="margin-top:6px;font:700 30px/1.1 'Inter Display';color:var(--accent)">Wellness Tracker</div>
    <div class="lede" style="margin-top:14px;font-size:21px;max-width:520px;color:#3a3a40">Weight, workouts and nutrition on iPhone, with calorie estimates from a photo.</div>
    <div class="mono" style="margin-top:20px;font-size:15px;font-weight:500;color:#3a3a40">Next.js · TypeScript · Supabase · Gemini · Vercel</div>
    <div style="margin-top:20px;display:inline-flex;align-items:center;gap:9px;background:var(--ink);color:#fff;border-radius:999px;padding:12px 18px;font:600 15px/1 'JetBrains Mono';white-space:nowrap"><svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>github.com/saltylvn/wellness-tracker</div>
  </div>
  <div style="position:relative;height:100%">
    <div class="phone" style="position:absolute;width:196px;left:10px;top:118px;transform:rotate(-6deg);border-radius:33px;padding:7px"><img src="ph-weight-chart.png" style="border-radius:27px"></div>
    <div class="phone" style="position:absolute;width:216px;left:158px;top:66px;z-index:2;border-radius:35px;padding:8px"><img src="ph-fitness-lifts.png" style="border-radius:28px"></div>
    <div class="phone" style="position:absolute;width:196px;left:326px;top:118px;transform:rotate(6deg);border-radius:33px;padding:7px"><img src="ph-nutrition-top.png" style="border-radius:27px"></div>
  </div>
</div>''')

def lbox(t, s, dark=False):
    bg = "background:var(--ink);color:#fff;" if dark else ""
    sc = "#c9c9cf" if dark else "var(--muted)"
    return f'<div class="card" style="{bg}padding:14px 16px"><div style="font:700 17px/1.2 Inter">{t}</div><div style="font:400 13px/1.35 Inter;color:{sc};margin-top:4px">{s}</div></div>'
arr = '<div style="display:grid;place-items:center;font:800 22px/1 Inter;color:var(--accent)">→</div>'
slides["project-architecture"] = page("l", f'''
<div class="eyebrow" style="font-size:15px">DEVELOP · Architecture</div>
<div class="h2" style="font-size:38px;margin-top:10px">Server-first Next.js on Vercel, Postgres with RLS, server-only AI.</div>
<div style="margin-top:30px;display:grid;grid-template-columns:1fr 26px 1.2fr 26px 1.25fr;gap:10px;align-items:center">
  {lbox("📱 iPhone PWA","React 19 client islands")}
  {arr}
  <div style="display:grid;gap:10px">{lbox("proxy.ts","Nonce CSP · session refresh")}{lbox("RSC pages + Server Actions","Parallel reads · validated writes")}{lbox("/api/estimate-food","Rate limit → Gemini → validate")}</div>
  {arr}
  <div style="display:grid;gap:10px">{lbox("Supabase Postgres","15 tables · RLS on all · triggers",True)}{lbox("Supabase Auth","Google OAuth (PKCE) · password · invites",True)}{lbox("Google Gemini","Hedged text + vision models")}</div>
</div>
<div style="margin-top:22px;display:flex;gap:8px;flex-wrap:wrap">{"".join(f'<span class="chip" style="font-size:14px;padding:7px 12px"><span class="dot" style="width:8px;height:8px"></span>{t}</span>' for t in ["GitHub Actions CI: audit · lint · tsc · 302 tests","Vercel preview per PR","Protected main","Dependabot"])}</div>''')

for name, html in slides.items():
    open(f"{name}.html","w").write(html)
print(list(slides))
