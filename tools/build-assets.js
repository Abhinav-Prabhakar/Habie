// Renders the PWA icons and iPad launch screens from tools/brand.html.
// Run from the repo root:  node tools/build-assets.js   (needs Playwright)
const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(__dirname, '..');
const page = (q) => 'file://' + path.join(root, 'tools/brand.html') + '?' + q;
const jobs = [
  ['assets/icons/icon-192.png', 192, 192, ''],
  ['assets/icons/icon-512.png', 512, 512, ''],
  ['assets/icons/icon-maskable-512.png', 512, 512, '&maskable'],
  ['assets/icons/apple-touch-icon.png', 180, 180, ''],
  ['assets/icons/apple-touch-icon-167.png', 167, 167, ''],
  // iPad (A16): 1180 × 820 points at 2x
  ['assets/splash/splash-2360x1640.png', 1180, 820, '&splash', 2],
  ['assets/splash/splash-1640x2360.png', 820, 1180, '&splash', 2],
];
(async () => {
  const b = await chromium.launch();
  for (const [out, w, h, extra, dpr = 1] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await p.goto(page(`w=${w}&h=${h}${extra}`));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(root, out) });
    await p.close();
    console.log('wrote', out);
  }
  await b.close();
})();
