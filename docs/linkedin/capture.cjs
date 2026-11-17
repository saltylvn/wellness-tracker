// Captures real screenshots of the live app in DARK mode via "Try the demo", on an emulated
// iPhone 15 Pro (393x852 @3x). The demo rebuilds its sample data around the visitor's date, so the
// dates below are taken from today (in the app owner's zone) rather than hard-coded.
// Saves ph-*.png here (for the showcase images) and the README screens in ../screens/ (@2x).
// Optional: CHROMIUM=/path/to/Chromium to use a specific browser binary.
const { chromium, devices } = require('playwright');
const { execFileSync } = require('child_process');

const base = 'https://wellness-tracker-virid.vercel.app';
const BAR = '#141414'; // the app's dark --background, behind the iPhone status bar

function dayKey(offset = 0) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }));
  now.setDate(now.getDate() + offset);
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
const today = dayKey(0);
const dow = (new Date(today + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = Monday
const monday = dayKey(-dow);

(async () => {
  const launch = {};
  if (process.env.CHROMIUM) launch.executablePath = process.env.CHROMIUM;
  if (process.env.HTTPS_PROXY) launch.proxy = { server: process.env.HTTPS_PROXY };
  const b = await chromium.launch(launch);
  const d = devices['iPhone 15 Pro'];
  const ctx = await b.newContext({
    ...d,
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    colorScheme: 'dark',
  });
  const p = await ctx.newPage();
  await p.goto(base + '/login', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const statusBar = async () => {
    await p.evaluate((bar) => {
      document.querySelectorAll('form').forEach((f) => { if (f.textContent.includes('Demo account')) f.remove(); });
      document.querySelector('nextjs-portal')?.remove();
      // Room for the iPhone status bar and home indicator, like the installed app has.
      const st = document.createElement('style');
      st.textContent = `main{padding-top:calc(54px + 1.5rem) !important} nav{padding-bottom:30px !important}
        body::before{content:"";position:fixed;top:0;left:0;right:0;height:54px;background:${bar};z-index:60}`;
      document.head.appendChild(st);
    }, BAR);
    await p.waitForTimeout(300);
  };
  const shots = [];
  const save = async (name) => { await p.screenshot({ path: `ph-${name}.png` }); shots.push(name); };

  await statusBar();
  await save('login');

  await p.locator('text=Try the demo').click();
  await p.waitForURL(/workouts/, { timeout: 30000 });

  const shoot = async (name, path, scrollTo) => {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1200);
    await statusBar();
    if (scrollTo) {
      await p.evaluate((sel) => {
        const el = [...document.querySelectorAll('h2, h3, p, section, figure, button, a, span')]
          .find((e) => e.textContent.trim().startsWith(sel));
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 92);
      }, scrollTo);
      await p.waitForTimeout(500);
    }
    await save(name);
  };

  await shoot('weight-top', `/weight?date=${today}`);
  await shoot('weight-chart', `/weight?date=${today}`, 'Start');
  await shoot('fitness-top', `/workouts?date=${monday}`);
  await shoot('fitness-lifts', `/workouts?date=${monday}`, 'Monday');
  await shoot('nutrition-top', `/food?date=${today}`);
  await shoot('nutrition-meals', `/food?date=${today}`, 'Protein');

  // The coach: tap 🎯 and capture the drop-down window (the demo shows a sample note).
  await p.goto(base + `/workouts?date=${today}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1000);
  await statusBar();
  await p.locator('button[aria-label="Coach"]').first().click();
  // The window sits under the status bar we draw, so give its header the same room.
  await p.addStyleTag({ content: '[role=dialog]{padding-top:calc(54px + 1rem) !important}' });
  await p.getByText('focus', { exact: false }).first().waitFor({ timeout: 15000 });
  await p.waitForTimeout(800);
  await save('coach');

  await b.close();

  // README screens at @2x (786x1704), the size the README tables use.
  const readme = { login: 'login', 'weight-top': 'weight', 'fitness-lifts': 'fitness', 'fitness-top': 'fitness-week',
    'nutrition-top': 'nutrition', 'nutrition-meals': 'nutrition-meals', coach: 'coach' };
  for (const [from, to] of Object.entries(readme)) {
    execFileSync('sips', ['-Z', '1704', `ph-${from}.png`, '--out', `../screens/${to}.png`], { stdio: 'ignore' });
  }
  console.log('captured', shots.join(', '), `(today ${today}, Monday ${monday})`);
})();
