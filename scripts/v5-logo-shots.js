/* V5 logoer: skærmbilleder af mærkeoversigten og udvalgte mærkesider (før/efter), lys + mørk.

   Kør:  node scripts/v5-logo-shots.js --ud docs/review/gauntlet/v5/logoer/foer
             [--sider maerker,maerke-honda,maerke-harley-davidson,maerke-yamaha] [--viewports 375,768,1440] [--temaer lys,moerk]
             [--top]  (kun første skærm)  [--klip 2400]  (hele siden, men kun de første N px)

   Alt er mocket via smoke-browser (ingen forespørgsel forlader maskinen). Læser kun repoets filer og skriver kun JPEG'er i --ud. */

const fs = require('fs');
const path = require('path');
const { startServer, playwrightTilgaengelig, installerMock, initScript } = require('./smoke-browser');

const REPO = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const flag = n => process.argv.includes(n);

(async () => {
  const ud = path.resolve(REPO, arg('--ud', 'docs/review/gauntlet/v5/logoer/efter'));
  const sider = arg('--sider', 'maerker,maerke-honda,maerke-harley-davidson,maerke-yamaha').split(',');
  const viewports = arg('--viewports', '375,768,1440').split(',').map(Number);
  const temaer = arg('--temaer', 'lys,moerk').split(',');
  const klip = Number(arg('--klip', 0));
  fs.mkdirSync(ud, { recursive: true });
  const kan = await playwrightTilgaengelig();
  if (!kan.ok){ console.error(kan.grund); process.exit(2); }
  const { server, port } = await startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    for (const vp of viewports) for (const t of temaer){
      const tema = /^m/i.test(t) ? 'dark' : 'light';
      const ctx = await browser.newContext({ viewport: { width: vp, height: vp >= 1000 ? 900 : 844 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block', reducedMotion: 'reduce' });
      await ctx.addInitScript(initScript, { tema });
      await installerMock(ctx, port, {});
      for (const s of sider){
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}/${s}.html`, { waitUntil: 'load' });
        await page.waitForTimeout(600);
        await page.waitForFunction(() => !document.querySelector('.bl--logo:not(.bl--img):not(.bl--klar):not(.bl--fejl)'), null, { timeout: 8000 }).catch(() => {});
        await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 8000 }).catch(() => {});
        const fil = path.join(ud, `${s}-${vp}-${tema === 'dark' ? 'moerk' : 'lys'}.jpg`);
        const opt = { path: fil, type: 'jpeg', quality: 80 };
        if (flag('--top')) opt.fullPage = false;
        else if (klip) Object.assign(opt, { fullPage: true, clip: { x: 0, y: 0, width: vp, height: klip } });
        else opt.fullPage = true;
        await page.screenshot(opt);
        await page.close();
      }
      await ctx.close();
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  console.log(`v5-logo-shots: skrev ${sider.length * viewports.length * temaer.length} billeder i ${path.relative(REPO, ud)}`);
})();
