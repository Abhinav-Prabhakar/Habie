// Renders the PWA icons and iPad launch screens from tools/brand.html, and the link-preview
// image from tools/og.html (run tools/mockups.js + tools/frame.py first; it shows docs/images/today.png).
// Run from the repo root:  node tools/build-assets.js   (needs Playwright; PW_CHANNEL=chrome uses installed Chrome)
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const page = (q) => (q === 'og' ? 'file://' + path.join(root, 'tools/og.html') : 'file://' + path.join(root, 'tools/brand.html') + '?' + q);
const jobs = [
  ['assets/icons/icon-192.png', 192, 192, ''],
  ['assets/icons/icon-512.png', 512, 512, ''],
  ['assets/icons/icon-maskable-512.png', 512, 512, '&maskable'],
  ['assets/icons/apple-touch-icon.png', 180, 180, ''],
  ['assets/icons/apple-touch-icon-167.png', 167, 167, ''],
  // iPad (A16): 1180 × 820 points at 2x
  ['assets/splash/splash-2360x1640.png', 1180, 820, '&splash', 2],
  ['assets/splash/splash-1640x2360.png', 820, 1180, '&splash', 2],
  ['assets/og.png', 1200, 630, 'og'],
];
(async () => {
  const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const only = process.env.ONLY;
  for (const [out, w, h, extra, dpr = 1] of jobs) {
    if (only && !out.includes(only)) continue;
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await p.goto(extra === 'og' ? page('og') : page(`w=${w}&h=${h}${extra}`));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(root, out) });
    await p.close();
    console.log('wrote', out);
  }
  await b.close();
})();
