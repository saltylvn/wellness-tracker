const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {});
  const d = devices['iPhone 15 Pro']; const ctx = await b.newContext({ ...d, viewport: { width: 393, height: 852 }, screen: { width: 393, height: 852 } });
  const p = await ctx.newPage();
  await p.goto('https://wellness-tracker-virid.vercel.app/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'ph-login.png' });
  await p.locator('text=Try the demo').click();
  await p.waitForURL(/workouts/, { timeout: 30000 });
  const base = 'https://wellness-tracker-virid.vercel.app';
  const clean = async () => {
    await p.evaluate(() => {
      document.querySelectorAll('form').forEach((f) => { if (f.textContent.includes('Demo account')) f.remove(); });
      document.querySelector('nextjs-portal')?.remove();
      // Room for the iPhone status bar and home indicator, like the installed app has.
      const st = document.createElement('style');
      st.textContent = 'main{padding-top:calc(54px + 1.5rem) !important} nav{padding-bottom:30px !important} body::before{content:"";position:fixed;top:0;left:0;right:0;height:54px;background:#f4f4f5;z-index:60}';
      document.head.appendChild(st);
    });
    await p.waitForTimeout(300);
  };
  const shoot = async (name, path, scrollTo) => {
    await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await clean();
    if (scrollTo) {
      await p.evaluate((sel) => {
        const el = [...document.querySelectorAll('h2, p, section, figure, button, a')].find((e) => e.textContent.trim().startsWith(sel));
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 92);
      }, scrollTo);
      await p.waitForTimeout(500);
    }
    await p.screenshot({ path: `ph-${name}.png` });
  };
  await shoot('weight-top', '/weight?date=2026-11-10');
  await shoot('weight-chart', '/weight?date=2026-11-10', 'Start');
  await shoot('fitness-top', '/workouts?date=2026-11-09');
  await shoot('fitness-lifts', '/workouts?date=2026-11-09', 'Nov 9, 2026');
  await shoot('fitness-cardio', '/workouts?date=2026-11-10', 'Nov 10, 2026');
  await shoot('nutrition-top', '/food?date=2026-11-09');
  await shoot('nutrition-meals', '/food?date=2026-11-09', 'Protein');
  await b.close();
})();
