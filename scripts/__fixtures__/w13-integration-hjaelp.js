/* Hjælper til W13-integrationstests og skærmbilleder: lokal statisk server på en mappe + Playwright-kontekst med
   syntetiske annoncer (scripts/smoke-fixtures.js). Alt udefra blokeres; intet læser produktion. */
const path = require('path');
const SB = require('../smoke-browser.js');
const fs = require('fs');
const { uuid } = require('../smoke-fixtures.js');
const G = require('../brand-logos-gen.js');

/* Testens EGET logo-data: uafhængigt af, hvilke mærker ejeren har godkendt i det rigtige manifest. Mærkerne i GODKENDT har logo
   (SVG-filerne ligger i img/brands/), alle andre — fx Suzuki, Lauge Jensen, BSA, Cagiva, Kymco — er bevidst uden logo i testen.
   Siderne får fixturen i stedet for js/brand-logos-data.js (Playwright route). */
const GODKENDT = new Set(['honda', 'yamaha', 'bmw', 'kawasaki', 'harley-davidson', 'indian', 'benelli', 'zero']);   // V6: zero = ét AI-udkast med maske (de øvrige er officielle farvede billeder)
function fixtureManifest(){
  const m = JSON.parse(fs.readFileSync(G.MANIFEST, 'utf8'));
  for (const e of m.maerker) e.godkendt = GODKENDT.has(e.slug) && !!e.fil;
  return m;
}
function fixtureData(){ return G.byggData(fixtureManifest()); }
function fixtureDataTekst(){ return G.datafilTekst(fixtureManifest()); }

const ROOT = path.join(__dirname, '..', '..');

async function start(rod){
  const pw = SB.findPlaywright();
  if (!pw) return null;
  let browser;
  try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { return null; }
  const { server, port } = await SB.startServer(rod || ROOT);
  const blokeret = {};
  const anmodninger = [];
  async function side(sti, { w = 1440, h = 900, tema = 'light', forsinkSvg = 0, blokerSvg = false } = {}){
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: tema });
    await ctx.addInitScript(SB.initScript, { tema: tema === 'dark' ? 'dark' : 'light' });
    await SB.installerMock(ctx, port, blokeret);
    if (!rod) await ctx.route('**/js/brand-logos-data.js*', route => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fixtureDataTekst() }));
    if (forsinkSvg || blokerSvg){
      await ctx.route('**/img/brands/*.svg', async route => {
        if (blokerSvg) return route.fulfill({ status: 404, body: 'x' });
        await new Promise(r => setTimeout(r, forsinkSvg));
        return route.continue();
      });
    }
    const page = await ctx.newPage();
    page.on('request', r => { try { const u = new URL(r.url()); if (u.port === String(port)) anmodninger.push(u.pathname); } catch (e) { /* */ } });
    await page.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'load' });
    return { page, ctx };
  }
  return { browser, port, side, anmodninger, annonceId: n => uuid(n), async close(){ await browser.close(); await new Promise(r => server.close(r)); } };
}
module.exports = { start, ROOT, GODKENDT, fixtureData, fixtureDataTekst };
