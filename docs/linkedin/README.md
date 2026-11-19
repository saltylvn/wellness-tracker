# LinkedIn / showcase images

The scripts that made the DEVELOP LinkedIn images (the 4:3 Projects cover, the 8-slide carousel,
the wide covers). `DEVELOP-project-cover-4x3.png` is the approved final 4:3 image, and
`LinkedIn-copy.md` holds the post and Projects text. The style rules are in CLAUDE.md
("Showcase images").

They're in **dark mode** (the app's own dark palette) and show the Coach window. To remake them
(needs Node with Playwright and Python 3; fonts load from Google Fonts at render time):

1. `node capture.cjs`: signs in to the live app with "Try the demo" on an emulated iPhone 15 Pro
   (393x852 @3x) in dark mode, hides the demo banner, adds room for the status bar, opens the Coach
   window for one shot, and saves `ph-*.png`. It also writes the README screens to `../screens/` (@2x).
   Dates are taken from today, because the demo rebuilds its data around the visitor's date.
2. `python3 make_slides.py`: writes one HTML page per image (uses `base.css` and the `ph-*.png` files).
3. `node render.cjs`: renders each page to `out-*.png` at 2x (`ONLY=cover-4x3,project-architecture,social-preview`
   to render just the README images; `CHROMIUM=/path/to/headless_shell` to use a specific browser) (carousel 1080x1350, wide 1200x627,
   the 4:3 cover 1200x900, so 2400x1800; the architecture diagram 1200x690; the GitHub social preview at exactly 1280x640).
4. Copy `out-cover-4x3.png` to `DEVELOP-project-cover-4x3.png`, `out-project-architecture.png` to
   `DEVELOP-architecture.png`, and `out-social-preview.png` to `../social-preview.png`. Working files are git-ignored.

Update the numbers in `make_slides.py` (tests, tables, migrations) from the repo before re-rendering: count tests without the `.claude/` worktrees (`npx vitest run --exclude '.claude/**'`), and tables with row-level security on a migrated PGlite database.

## The light hero and the social preview

Since 18 November 2026 the README hero (`DEVELOP-project-light-4x3.png`) and the GitHub social
preview (`../social-preview.png`) are light, in the same look as the owner's Atlas showcase.
They are made by a separate, smaller set of files in [`light/`](light/): see its README.
The dark images above (the carousel, the wide covers, the architecture diagram and the earlier
4:3 cover) are still made by the scripts in this folder.
