# The light hero and the social preview

Two images in a light look, the same one as the owner's Atlas showcase: Manrope, Inter and Source Code Pro (the app's own fonts), the app's light palette with its orange accent, cards, pills and a plain-text block. Light weights, no bold.

| File in the repo | Size | Shows |
| --- | --- | --- |
| `../DEVELOP-project-light-4x3.png` | 1600 x 1200 (4:3) | The README hero: the Coach window in the live demo, the coach agent's run in five steps, how it is built, four numbers |
| `../../social-preview.png` | 1280 x 640 | The GitHub social preview, uploaded by hand in the repo Settings |

The full-size renders (3200 x 2400 and 2560 x 1280) are what goes to LinkedIn; they are git-ignored here.

## Remake them (macOS)

The tools use WebKit, so they need a Mac with the Swift compiler. No Node or Playwright.

1. `cd src && swiftc -O snap.swift -o snap && swiftc -O capture.swift -o capture`
2. `./capture shots/coach-light.png`: a real screenshot of the live app. It opens the demo at iPhone size in light mode, taps "Try the demo", hides the demo banner, leaves room for the status bar and opens the Coach window. It mirrors `../capture.cjs`, which shoots dark mode.
3. `python3 build.py`: writes one HTML page per image and renders each at 2x into `../linkedin/` and `../github/`.
4. Copy them into place at the sizes above:
   `sips -Z 1600 ../linkedin/develop-project.png --out ../../DEVELOP-project-light-4x3.png` and
   `sips -Z 1280 ../github/develop-social-preview.png --out ../../../social-preview.png`.

All text and numbers are in `src/build.py`; the look is in `src/style.css`.

## Where the numbers come from

Recount before reusing them. As of 18 November 2026:

- **421 app tests:** `npx vitest run --exclude '.claude/**'` (44 files). Without the exclude, vitest also counts any worktrees under `.claude/worktrees`.
- **89 agent tests:** `uv run pytest -q` in the coach agent's repository.
- **18/18 tables with row-level security:** 18 distinct tables across the 33 migrations (16 in `public`, 2 in `coach`). `supabase/tests/database.test.ts` fails if a public table lacks it, and the two coach tables enable it in their migrations.
- **12.5 s down to about 2 s:** the measured figure in the main README (12.5 s to 1.3-2.5 s) for a photo estimate after racing models.
- **$0 a month, two database logins with one function each, 7 allowlisted publishers, the schedule, one retry then a note written by code:** the main README's "The coach" section.
- **Evals, 6 scenarios, 50% to 100% first try:** the coach agent's eval log.

The coach agent's code is in a separate private repository. The images describe what it does and name no host, address or file from it.

## Fonts

`src/fonts/` holds the three font files the pages load, with their licenses in `LICENSES.txt`.
