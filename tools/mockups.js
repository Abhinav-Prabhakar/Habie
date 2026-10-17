// Captures the README screenshots and screen recordings from the running app, using the demo garden (?demo).
//   python3 -m http.server 8765 &      (from the repo root)
//   node tools/mockups.js [out-dir] [base-url]
// PW_CHANNEL=chrome uses the installed Google Chrome instead of Playwright's own browser; ONLY=a,b limits the run.
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
  await page.waitForFunction(() => localStorage.getItem('habie.v3'));
  await sleep(300);
  if (setup) {
    await page.evaluate(setup);
    await sleep(300);
    await page.goto(`${BASE}?mockup&demo${hash}`);
  }
  await sleep(1600);
}
// Edits the saved demo state in the page, then reloads so the app picks it up.
const edit = (body) => `(() => { const s = JSON.parse(localStorage.getItem('habie.v3')); ${body}; localStorage.setItem('habie.v3', JSON.stringify(s)); })()`;
const theme = (dark, accent) => edit(`s.settings.dark = ${dark}; s.settings.accent = '${accent}'`);
const today = `(() => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); })()`;
// Everything due today done except the water, so five taps finish a perfect day.
const almostPerfect = edit(`const t = ${today}; Object.assign(s.log[t], { workout: 30, journal: 1, plants: 1 })`);
const scrollTo = (sel) => async (p) => { await p.evaluate((q) => document.querySelector(q).scrollIntoView({ block: 'start' }), sel); await sleep(900); };
// A demo conversation, rendered by the app's own Markdown + LaTeX pipeline.
async function stagedChat(p) {
  await p.evaluate(async () => {
    const { format } = await import('./js/chat.js');
    const reply = await format("Done! I set up **Read** for 20 pages on weekdays at 9 pm and logged tonight's 12 pages.\n\nAbout your sleep:\n- After **7h+** you finish **95%** of your habits\n- After shorter nights it drops to **55%**\n\nThat's a $\\Delta \\approx 40$ point swing, so an earlier bedtime is your best lever.");
    const s = JSON.parse(localStorage.getItem('habie.v3'));
    s.chat = [
      { from: 'me', text: 'Add a reading habit, 20 pages on weekdays at 9pm. I read 12 pages tonight. Also, does sleep affect me?' },
      { from: 'bot', md: true, text: reply, actions: [{ label: 'Open Read', href: '#habits/read' }, { label: 'See sleep', href: '#insights' }] },
    ];
    localStorage.setItem('habie.v3', JSON.stringify(s));
  });
  await p.goto(`${BASE}?mockup&demo#buddy`);
  await sleep(1800);
}

const shots = {
  today: async (p) => open(p, '#home'),
  insights: async (p) => open(p, '#insights'),
  patterns: async (p) => { await open(p, '#insights'); await scrollTo('.sleep-card')(p); },
  habits: async (p) => open(p, '#habits/water'),
  timer: async (p) => {
    await open(p, '#habits/workout');
    await p.evaluate(() => document.querySelector('.timer-go').click()); await sleep(400);
    await p.evaluate(async () => { const { store } = await import('./js/store.js'); store.state.timer.start -= 18.5 * 60000; store.state.timer.cheered = true; });
    await sleep(1600);
  },
  quit: async (p) => { await open(p, '#habits/sugar'); await p.evaluate(() => { document.querySelector('#detail').scrollTop = 0; }); },
  notes: async (p) => { await open(p, '#habits/journal'); await p.evaluate(() => document.querySelector('.d-notes').scrollIntoView({ block: 'center' })); await sleep(900); },
  buddy: async (p) => { await open(p, '#home'); await stagedChat(p); },
  settings: async (p) => open(p, '#settings'),
  editor: async (p) => {
    await open(p, '#habits');
    await p.click('.side-new'); await sleep(600);
    await p.click('[data-idea="4"]'); await p.click('[data-type="timer"]'); await p.click('[data-freq="weekly"]');
    await p.click('[data-step="1"]'); await p.click('[data-step="1"]');
    await p.evaluate(() => { document.querySelector('.editor-body').scrollTop = 0; }); await sleep(900);
  },
  perfect: async (p) => {
    await open(p, '#home', almostPerfect);
    for (let i = 0; i < 5; i++) { await p.click('[data-route=home] .habit [data-step-habit=water]'); await sleep(150); }
    await sleep(1500);
  },
  'today-dark': async (p) => open(p, '#home', theme(true, 'peach')),
  'habits-dark': async (p) => open(p, '#habits/read', theme(true, 'mint')),
  'insights-rose': async (p) => open(p, '#insights', theme(false, 'rose')),
};

const reels = {
  day: async (p) => {
    await open(p, '#home', edit(`const t = ${today}; Object.assign(s.log[t], { plants: 1 })`));
    await p.click('[data-route=home] .habit [data-timer=workout]'); await sleep(1600);
    await p.evaluate(async () => { const { store } = await import('./js/store.js'); store.state.timer.start -= 30 * 60000; });
    await sleep(2400);
    await p.click('[data-route=home] .habit [data-timer=workout]'); await sleep(1400);
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
    await p.click('[data-mood="5"]'); await sleep(1000);
    await p.click('.wday[data-day-pick]:not(.sel):not(.future)'); await sleep(1600);
    await p.click('[data-action=back-today]'); await sleep(1400);
  },
  create: async (p) => {
    await open(p, '#habits');
    await p.click('.side-new'); await sleep(1100);
    await p.click('[data-idea="0"]'); await sleep(700);
    await p.click('[data-type="timer"]'); await sleep(700);
    await p.click('[data-color="3"]'); await sleep(500);
    await p.click('[data-time="evening"]'); await sleep(500);
    await p.click('[data-freq="weekly"]'); await sleep(600);
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
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  for (const [name, run] of Object.entries(shots)) {
    if (only && !only.includes(name)) continue;
    const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 2, colorScheme: 'light', serviceWorkers: 'block' });
    const p = await ctx.newPage();
    await run(p);
    await p.screenshot({ path: path.join(OUT, `${name}.png`) });
    await ctx.close();
    console.log('shot', name);
  }
  for (const [name, run] of Object.entries(reels)) {
    if (only && !only.includes(name)) continue;
    const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: 'light', serviceWorkers: 'block', recordVideo: { dir: OUT, size: VIEW } });
    const p = await ctx.newPage();
    await run(p);
    const video = p.video();
    await ctx.close();
    fs.renameSync(await video.path(), path.join(OUT, `${name}.webm`));
    console.log('reel', name);
  }
  await b.close();
})();
