// Captures the README screenshots and screen recordings from the running app.
//   python3 -m http.server 8765 &      (from the repo root)
//   node tools/mockups.js [out-dir] [base-url]
// Then frame them with: python3 tools/frame.py [out-dir]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.resolve(process.argv[2] || 'docs/raw');
const BASE = process.argv[3] || 'http://127.0.0.1:8765/';
const VIEW = { width: 1180, height: 820 };                     // iPad (A16) landscape, in points
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(page, hash, setup) {
  await page.goto(`${BASE}?mockup&reset&demo${hash}`);
  await sleep(600);
  if (setup) {
    await page.evaluate(setup);
    await page.goto(`${BASE}?mockup&demo${hash}`);
  }
  await sleep(1600);
}
const theme = (dark, accent) => `(() => { const s = JSON.parse(localStorage.getItem('habie.v3')); s.settings.dark = ${dark}; s.settings.accent = '${accent}'; localStorage.setItem('habie.v3', JSON.stringify(s)); })()`;

const shots = {
  today: async (p) => open(p, '#home'),
  insights: async (p) => open(p, '#insights'),
  habits: async (p) => open(p, '#habits/water'),
  buddy: async (p) => {
    await open(p, '#buddy');
    await p.click('.sug[data-say=schedule]'); await sleep(1800);
    await p.fill('#ask-input', 'How much water have I had today?'); await p.keyboard.press('Enter'); await sleep(1900);
  },
  settings: async (p) => open(p, '#settings'),
  editor: async (p) => {
    await open(p, '#habits');
    await p.keyboard.press('Meta+n'); await sleep(500);
    await p.click('[data-idea="4"]'); await p.click('[data-step="1"]'); await sleep(900);
  },
  perfect: async (p) => {
    await open(p, '#home');
    for (let i = 0; i < 3; i++) { await p.click('[data-route=home] .habit [data-step-habit=workout]'); await sleep(200); }
    await p.click('[data-route=home] .habit [data-step-habit=journal]'); await sleep(200);
    for (let i = 0; i < 5; i++) { await p.click('[data-route=home] .habit [data-step-habit=water]'); await sleep(150); }
    await sleep(1500);
  },
  'today-dark': async (p) => open(p, '#home', theme(true, 'peach')),
  'habits-dark': async (p) => open(p, '#habits/read', theme(true, 'mint')),
  'insights-rose': async (p) => open(p, '#insights', theme(false, 'rose')),
};

const reels = {
  day: async (p) => {
    await open(p, '#home');
    for (let i = 0; i < 3; i++) { await p.click('[data-route=home] .habit [data-step-habit=workout]'); await sleep(550); }
    await sleep(900);
    await p.click('[data-route=home] .habit [data-step-habit=journal]'); await sleep(1200);
    for (let i = 0; i < 5; i++) { await p.click('[data-route=home] .habit [data-step-habit=water]'); await sleep(380); }
    await sleep(3200);
    await p.click('#modal .sh-btn'); await sleep(900);
    if (await p.$eval('#modal', (e) => e.classList.contains('open'))) { await sleep(1800); await p.click('#modal .sh-btn'); await sleep(700); }
    await p.click('.nav[data-nav=insights]'); await sleep(2600);
    await p.click('.nav[data-nav=habits]'); await sleep(2200);
  },
  water: async (p) => {
    await open(p, '#habits/water');
    for (const a of ['0.25', '0.5', '0.1']) { await p.click(`[data-amount="${a}"]`); await sleep(1100); }
    await sleep(1400);
    await p.click('#habit-list .li[href="#habits/read"]'); await sleep(1300);
    await p.click('[data-unit="3"]'); await sleep(900);
    await p.click('[data-unit="3"]'); await sleep(900);
    await p.click('.wday[data-day-pick]:not(.sel):not(.future)'); await sleep(1600);
    await p.click('[data-action=back-today]'); await sleep(1400);
  },
  create: async (p) => {
    await open(p, '#habits');
    await p.keyboard.press('Meta+n'); await sleep(1100);
    await p.click('[data-idea="0"]'); await sleep(700);
    await p.click('[data-color="3"]'); await sleep(500);
    await p.click('[data-time="evening"]'); await sleep(500);
    await p.click('[data-dayi="5"]'); await sleep(250); await p.click('[data-dayi="6"]'); await sleep(500);
    await p.click('[data-step="1"]'); await sleep(350); await p.click('[data-step="1"]'); await sleep(700);
    await p.click('#n-save'); await sleep(3000);
  },
  themes: async (p) => {
    await open(p, '#settings');
    await p.click('[data-setting=dark]'); await sleep(1500);
    for (const a of ['peach', 'mint', 'rose']) { await p.click(`[data-accent-pick=${a}]`); await sleep(1300); }
    await p.click('.buddy[data-buddy=unicorn]'); await sleep(1400);
    await p.click('.nav[data-nav=home]'); await sleep(1800);
    await p.click('.nav[data-nav=settings]'); await sleep(1000);
    await p.click('[data-accent-pick=lavender]'); await sleep(1000);
    await p.click('.buddy[data-buddy=bear-orange]'); await sleep(800);
    await p.click('[data-setting=dark]'); await sleep(1500);
  },
};

(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const b = await chromium.launch();
  for (const [name, run] of Object.entries(shots)) {
    if (only && !only.includes(name)) continue;
    const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    await run(p);
    await p.screenshot({ path: path.join(OUT, `${name}.png`) });
    await ctx.close();
    console.log('shot', name);
  }
  for (const [name, run] of Object.entries(reels)) {
    if (only && !only.includes(name)) continue;
    const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: VIEW } });
    const p = await ctx.newPage();
    await run(p);
    const video = p.video();
    await ctx.close();
    fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
    console.log('reel', name);
  }
  await b.close();
})();
