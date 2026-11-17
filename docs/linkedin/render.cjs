// Renders each *.html page here to out-*.png at 2x (the social preview at exactly 1280x640).
// Optional: CHROMIUM=/path/to/browser; ONLY=cover-4x3,project-architecture to render a subset.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const f of fs.readdirSync('.').filter((f) => f.endsWith('.html'))) {
    if (only && !only.includes(f.replace('.html', ''))) continue;
    const sp = f.startsWith('social-preview'); const wide = f.startsWith('cover-4x3');
    const arch = f === 'project-architecture.html'; const land = f.startsWith('project-');
    const viewport = sp ? { width: 1280, height: 640 } : wide ? { width: 1200, height: 900 }
      : arch ? { width: 1200, height: 690 } : land ? { width: 1200, height: 627 } : { width: 1080, height: 1350 };
    const p = await b.newPage({ viewport, deviceScaleFactor: sp ? 1 : 2 });
    await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: 'out-' + f.replace('.html', '.png') }); await p.close();
  }
  await b.close();
})();
