const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const f of fs.readdirSync('.').filter((f) => f.endsWith('.html'))) {
    const land = f.startsWith('project-'); const wide = f.startsWith('cover-4x3'); const sp = f.startsWith('social-preview');
    const p = await b.newPage({ viewport: sp ? { width: 1280, height: 640 } : wide ? { width: 1200, height: 900 } : land ? { width: 1200, height: 627 } : { width: 1080, height: 1350 }, deviceScaleFactor: sp ? 1 : 2 });
    await p.goto('file://' + path.resolve(f)); await p.waitForTimeout(300);
    await p.screenshot({ path: 'out-' + f.replace('.html', '.png') }); await p.close();
  }
  await b.close();
})();
