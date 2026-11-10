# LinkedIn / showcase images

The scripts that made the DEVELOP LinkedIn images (the 4:3 Projects cover, the 8-slide carousel,
the wide covers). `DEVELOP-project-cover-4x3.png` is the approved final 4:3 image, and
`LinkedIn-copy.md` holds the post and Projects text. The style rules are in CLAUDE.md
("Showcase images").

To remake them (needs Node with Playwright, Python 3 with Pillow, and the Inter, Inter Display
and JetBrains Mono fonts):

1. `node capture.js`: signs in to the live app with "Try the demo" on an emulated iPhone 15 Pro
   (393x852 @3x), hides the demo banner, adds room for the status bar, and saves `ph-*.png`.
2. `python3 make_slides.py`: writes one HTML page per image (uses `base.css` and the `ph-*.png` files).
3. `node render.js`: renders each page to `out-*.png` at 2x (carousel 1080x1350, wide 1200x627,
   the 4:3 cover 1200x900, so 2400x1800).

Update the numbers in `make_slides.py` (tests, tables, migrations) from the repo before re-rendering.
