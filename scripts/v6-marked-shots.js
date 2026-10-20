/* V6 marked: skærmbilleder af annonce-, søge- og favoritsider (mocket, ingen netværk).
   Kør: node scripts/v6-marked-shots.js --ud <mappe> --navn efter --sider ann-honda,ann-re,soeg --viewports 375,1440 [--temaer lys,moerk] [--klip 900] [--v6-rod <mappe>]
   Sider (nøgler): ann-honda, ann-re (Royal Enfield), ann-husq (Husqvarna), ann-bmw, ann-egen, soeg, soeg-liste, fav-anon. Fuld side, med mindre --klip N. */
const fs = require('fs');
const path = require('path');
const { startServer, playwrightTilgaengelig, installerMock, initScript, lagerSvar } = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');
const { installer } = require('./v4-annonce-shots');

const REPO = path.join(__dirname, '..');
const SIDER = {
  'ann-honda': `annonce.html?id=${uuid(1)}`, 'ann-re': `annonce.html?id=${uuid(34)}`, 'ann-husq': `annonce.html?id=${uuid(38)}`,
  'ann-bmw': `annonce.html?id=${uuid(25)}`, 'ann-egen': `annonce.html?id=${uuid(901)}`,
  soeg: 'soegning.html', 'soeg-liste': 'soegning.html', 'fav-anon': 'mine-annoncer.html?fane=favoritter',
};
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

async function main(){
  const rod = path.resolve(arg('--v6-rod', REPO));
  const ud = path.resolve(arg('--ud', 'docs/review/gauntlet/v6/marked/shots'));
  const navn = arg('--navn', 'efter');
  const sider = arg('--sider', 'ann-honda').split(',');
  const vps = arg('--viewports', '375,1440').split(',').map(Number);
  const temaer = arg('--temaer', 'lys').split(',');
  const klip = Number(arg('--klip', 0));
  fs.mkdirSync(ud, { recursive: true });
  const kan = await playwrightTilgaengelig();
  const { server, port } = await startServer(rod);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    for (const vp of vps) for (const t of temaer){
      const tema = /^(m|d)/i.test(t) ? 'dark' : 'light';
      for (const s of sider){
        const ctx = await browser.newContext({ viewport: { width: vp, height: vp >= 1024 ? 900 : 844 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block' });
        await ctx.addInitScript(initScript, { tema });
        if (s.startsWith('ann-')) await installer(ctx, port);
        else await installerMock(ctx, port, {}, { restSvar: lagerSvar });
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}/${SIDER[s]}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(600);
        if (s === 'soeg-liste') { await page.click('#view-list').catch(() => {}); await page.waitForTimeout(300); }
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 200)); });
        const fil = path.join(ud, `${navn}-${s}-${vp}-${tema === 'dark' ? 'moerk' : 'lys'}.png`);
        await page.screenshot({ path: fil, fullPage: !klip, ...(klip ? { clip: { x: 0, y: 0, width: vp, height: klip } } : {}) });
        await ctx.close();
      }
    }
  } finally { await browser.close().catch(() => {}); server.close(); }
  console.log('Skærmbilleder i ' + ud);
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
