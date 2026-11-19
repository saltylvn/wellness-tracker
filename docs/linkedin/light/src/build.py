#!/usr/bin/env python3
"""DEVELOP showcase images, light theme: one LinkedIn project image (4:3) and one GitHub social preview.

The layout system is the owner's Atlas showcase. DEVELOP shares Atlas's fonts and
neutrals (wellness-tracker app/globals.css) and brings its own orange accent and app icon.
Every number comes from the two repos, checked on 2026-11-18, or is labelled on the image as
sample data.

  python3 build.py            build both
  python3 build.py social     build the pages whose name contains "social"
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SNAP = os.path.join(HERE, "snap")  # the WebKit renderer: swiftc -O snap.swift -o snap
PAGES = {}

# `npx vitest run` on wellness-tracker main (44 files) and `uv run pytest -q` on raspberry-pi-5 main.
APP_TESTS, AGENT_TESTS = 421, 89
# Distinct tables created by the 33 migrations: 16 in public, 2 in coach. Row-level security is on for each.
TABLES = 18
STACK = "Next.js, TypeScript, Supabase Postgres, Gemini, Python, Raspberry Pi 5"

ICON = {
    "arrow": "M5 12h14M13 6l6 6-6 6",
    "cpu": "M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 9h6v6H9z",
}


def icon(name, size=26):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="{ICON[name]}"/></svg>'


# The app's icon (wellness-tracker public/icon-512.png): a rising line with an arrowhead.
MARK = '<span class="mark"><svg viewBox="0 0 512 512" fill="none" stroke="#111111" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"><path d="M112 344 L212 246 L280 306 L400 186 M322 186 H400 V262"/></svg></span>'


REPO = "github.com/saltylvn/wellness-tracker"
DEMO = "wellness-tracker-virid.vercel.app"


def top(pill="Live demo, no sign-up"):
    """The repo sits where Atlas shows a path; the live demo's address sits by the pill."""
    return f'<header class="top"><div class="brand">{MARK}<span class="wm">DEVELOP</span><span class="path">/ {REPO}</span></div><div class="live"><span class="path">{DEMO}</span><span class="pill" style="--pc:var(--c-green)"><i class="dot"></i>{pill}</span></div></header>'


FOOT = f'<footer class="foot"><span><em>Tyler Clark</em>designed, built and run end to end</span><span class="mono">{STACK}</span></footer>'


def plain(title, kind, lines, size=21, lh=38, style=""):
    """A plain-text block. `lines` are HTML strings, one per line."""
    body = "".join(f'<span class="l">{ln or " "}</span>' for ln in lines)
    return f'<div class="plain" style="{style}"><div class="ph"><span>{title}</span><span>{kind}</span></div><pre style="font-size:{size}px;line-height:{lh}px">{body}</pre></div>'


def page(name, kind, body, css=""):
    PAGES[name] = (kind, f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>
{css}</style></head><body class="{kind}"><div class="sheet">{body}</div></body></html>""")


def kv(key, value):
    return f'<span class="k">{key}:</span>{" " * (10 - len(key) - 1)}{value}'


# ------------------------------------------------------------------ 1. LinkedIn project image (1600 x 1200)

# A real screenshot of the live app in its light theme: the Coach window in the demo account, taken by
# ./capture (capture.swift) at iPhone size. Run `./capture shots/coach-light.png` to refresh it.
PHONE = '<div class="phone"><div class="island"></div><div class="screen"><img src="shots/coach-light.png" alt=""></div></div>'

# (title, what happens there, style). In order: this is the agent's run, start to finish.
STEPS = [
    ("Postgres", "a single read-only function", ""),
    ("Raspberry Pi 5", "the math in Python, only totals go out", ""),
    ("Gemini", "writes the words, nothing else", "model"),
    ("Checker", "every number must come from the code", ""),
    ("Coach window", "one write function saves the note", "lit"),
]
ARROW = f'<i class="ar">{icon("arrow", 22)}</i>'

# The eval line is from raspberry-pi-5 docs/evals.md: six scenarios, first-try passes 50% to 100% over four rounds.
SPEC = [
    kv("food", 'a photo or a sentence in, <span class="ai">Gemini</span> estimates, always editable'),
    kv("speed", "models raced, 12.5 s down to about 2 s per estimate"),
    kv("access", "the agent holds two database logins, one function each"),
    kv("links", "7 allowlisted publishers, the model never writes a URL"),
    kv("evals", "6 scenarios, one a prompt injection, 50% to 100% first try"),
]
STATS = [
    (str(APP_TESTS), f"app tests, and {AGENT_TESTS} more on the agent"),
    (f"{TABLES}/{TABLES}", "tables with row-level security"),
    ("~2 s", "per photo estimate, down from 12.5 s"),
    ("$0", "a month to run the coach"),
]

page("develop-project", "li", f"""{top()}
<h1 style="font-size:62px;margin-top:42px">A wellness tracker I use every day,<br>with an AI coach on a Raspberry Pi.</h1>
<p class="sub" style="font-size:26px;margin-top:18px;max-width:1340px">DEVELOP tracks weight, workouts and nutrition on my iPhone. I log a meal with a photo, and an agent at home reads my week, does the math in code and writes a coaching note each morning.</p>
<div class="row grow" style="gap:44px;margin:30px 0 26px">
  <div class="col phonecol">{PHONE}<p class="cap mono">the Coach window, live demo</p></div>
  <div class="col" style="flex:1;min-width:0;gap:22px">
    <div class="card flow">
      <div class="ch"><h2>{icon("cpu")}The coach agent</h2><span class="hint">Python on systemd timers, at home</span></div>
      <div class="steps">{ARROW.join(f'<div class="st {c}"><p>{t}</p><span>{s}</span></div>' for t, s, c in STEPS)}</div>
      <p class="fine mono">6:00 am Mon-Sat · weekly review Sunday · workout picks Wed + Sun · one retry, then a note written by code</p>
    </div>
    {plain("how it is built", "plain text", SPEC, size=21, lh=37, style="flex:1;min-height:0")}
    <div class="card strip">{"".join(f'<div class="stat"><b>{n}</b><span>{t}</span></div>' for n, t in STATS)}</div>
  </div>
</div>
{FOOT}""", css="""
.wm{letter-spacing:0.01em}
.mark svg{width:72%;height:72%}
.plain .ph{height:46px}
.plain pre{padding:14px 0}
.live{display:flex;align-items:center;gap:20px}
.live .path{font-size:20px;margin:0}
.top .path{font-size:20px}
/* The phone is sized to the screenshot's own shape (393 x 852) at this row's height, so almost nothing is cropped. */
.phonecol{width:304px;flex:none;align-items:center}
.phone{width:304px;flex:1;min-height:0;border-radius:50px;background:#161616;padding:9px;position:relative;box-shadow:0 22px 44px -26px rgba(0,0,0,.5)}
.island{position:absolute;top:19px;left:50%;transform:translateX(-50%);width:84px;height:24px;border-radius:13px;background:#161616;z-index:3}
.screen{height:100%;border-radius:42px;overflow:hidden;background:var(--canvas)}
.screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.cap{font-size:15px;color:var(--ink-3);margin-top:13px;flex:none}
.flow{padding:20px 26px 18px;flex:none}
.flow .ch h2{font-size:26px}
.steps{display:flex;align-items:stretch;gap:7px;margin-top:17px}
.st{flex:1;min-width:0;border:1.5px solid var(--line-strong);border-radius:12px;padding:13px 14px 14px;background:var(--surface)}
.st p{font-size:19px;font-weight:450;white-space:nowrap}
.st span{display:block;font-size:15.5px;line-height:1.36;color:var(--ink-2);margin-top:5px}
.st.model{border-style:dashed;border-color:color-mix(in oklab,var(--c-purple) 55%,transparent);background:color-mix(in oklab,var(--c-purple) 6%,var(--surface))}
.st.model p{color:color-mix(in oklab,var(--c-purple) 78%,var(--ink))}
.st.lit{border-color:var(--brand-border);background:var(--brand-soft)}
.ar{flex:none;display:flex;align-items:center;color:var(--ink-4)}
.fine{font-size:15.5px;color:var(--ink-3);margin-top:15px;white-space:nowrap}
.strip{display:flex;padding:0 6px;flex:none}
.strip .stat{flex:1;min-width:0;padding:16px 20px 17px;border-left:1.5px solid var(--line)}
.strip .stat:first-child{border-left:0}
.strip b{display:block;font-family:var(--display);font-weight:500;font-size:40px;letter-spacing:-0.03em;line-height:1}
.strip span{display:block;font-size:16.5px;line-height:1.35;color:var(--ink-2);margin-top:8px}
""")


# ------------------------------------------------------------------ 2. GitHub social preview (1280 x 640)

page("develop-social-preview", "gh", f"""
<div class="row" style="height:100%;gap:56px">
  <div class="col" style="flex:1;min-width:0">
    <div class="brand">{MARK}<span class="wm">DEVELOP</span><span class="pill sm" style="--pc:var(--c-green);margin-left:8px"><i class="dot"></i>Live demo, no sign-up</span></div>
    <h1>A wellness tracker,<br>with an AI coach on<br>a Raspberry Pi.</h1>
    <pre class="facts"><span class="k">quality:</span> {APP_TESTS} + {AGENT_TESTS} tests, row-level security on {TABLES} tables
<span class="k">stack:</span>   Next.js, TypeScript, Supabase, Gemini, Python</pre>
    <div class="who"><em>Tyler Clark</em><span class="mono">github.com/saltylvn</span></div>
  </div>
  <div class="card mini">
    <span class="eyebrow" style="font-size:13.5px;margin-bottom:14px">The coach agent</span>
    <div class="box dash"><p>Postgres</p><span>one read-only function</span></div>
    <div class="stem"></div>
    <div class="box"><p>Raspberry Pi 5</p><span>math in code, only totals go out</span></div>
    <div class="stem"></div>
    <div class="row" style="gap:10px"><div class="box model"><p>Gemini</p><span>writes the words</span></div><div class="box"><p>Checker</p><span>verifies numbers</span></div></div>
    <div class="stem"></div>
    <div class="box app"><p>Coach window</p><span>a note each morning</span></div>
  </div>
</div>""", css="""
.sheet{padding:54px 60px 50px;background:radial-gradient(70% 70% at 100% 0%, var(--glow), transparent 62%)}
.mark{--s:44px}
.wm{font-size:30px;letter-spacing:0.01em}
h1{font-size:56px;margin-top:38px;letter-spacing:-0.025em}
.facts{font:400 18.5px/31px var(--mono);color:var(--ink-2);margin-top:28px}
.who{margin-top:auto;display:flex;align-items:baseline;gap:16px;font-size:22px}
.who em{font-weight:500}
.who .mono{font-size:18px;color:var(--ink-3)}
.mini{width:436px;flex:none;padding:24px;display:flex;flex-direction:column;justify-content:center}
.box{border:1.5px solid var(--line-strong);border-radius:11px;padding:12px 16px;background:var(--surface);flex:none;min-width:0}
.mini .row .box{flex:1}
.box p{font-size:20px;font-weight:450;white-space:nowrap}
.box span{display:block;font:400 14.5px var(--mono);color:var(--ink-3);margin-top:2px;white-space:nowrap}
.box.model{border-style:dashed;border-color:color-mix(in oklab,var(--c-purple) 55%,transparent);background:color-mix(in oklab,var(--c-purple) 6%,var(--surface))}
.box.dash{border-style:dashed}
.box.app{border-color:var(--brand-border);background:var(--brand-soft)}
.stem{height:22px;width:0;border-left:2px solid #c9c9c9;margin:0 auto;flex:none}
""")


if __name__ == "__main__":
    only = sys.argv[1:]
    for name, (kind, html) in PAGES.items():
        if only and not any(o in name for o in only):
            continue
        w, h = (1600, 1200) if kind == "li" else (1280, 640)
        src = os.path.join(HERE, f"{name}.html")
        out = os.path.join(ROOT, "linkedin" if kind == "li" else "github")
        open(src, "w").write(html)
        os.makedirs(out, exist_ok=True)
        r = subprocess.run([SNAP, src, os.path.join(out, f"{name}.png"), str(w), str(h)], capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip())
