/* Hjælper til W13-integrationstests og skærmbilleder: lokal statisk server på en mappe + Playwright-kontekst med
   syntetiske annoncer (scripts/smoke-fixtures.js). Alt udefra blokeres; intet læser produktion. */
const path = require('path');
const SB = require('../smoke-browser.js');
const { uuid } = require('../smoke-fixtures.js');

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
module.exports = { start, ROOT };
