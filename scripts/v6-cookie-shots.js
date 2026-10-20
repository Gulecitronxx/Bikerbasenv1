/* V6: skærmbilleder af cookie-dialogen uden js/components.js (dokumentation til docs/review/gauntlet/v6/cookie-gate.md). */
const path = require('path');
const smoke = require('./smoke-browser');
const rod = path.join(__dirname, '..');
const ud = path.join(rod, 'docs/review/gauntlet/v6/cookie-gate');
(async () => {
  const kan = await smoke.playwrightTilgaengelig();
  const { server, port } = await smoke.startServer(rod);
  const b = await kan.pw.chromium.launch({ headless: true });
  for (const [navn, w, h, tema] of [['375-lys', 375, 812, 'light'], ['375-moerk', 375, 812, 'dark'], ['1440-lys', 1440, 900, 'light'], ['1440-moerk', 1440, 900, 'dark']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block', colorScheme: tema });
    await smoke.installerMock(ctx, port, {}, {});
    await ctx.addInitScript(t => { try { localStorage.setItem('bb_theme', t); } catch (e) { /* */ } }, tema);
    await ctx.route(/\/js\/(components|data)\.js/, r => r.abort('blockedbyclient'));
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(ud, `uden-components-${navn}-foer-svar.png`) });
    await p.click('#cookie-necessary-only');
    await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(ud, `uden-components-${navn}-efter-svar.png`) });
    await ctx.close();
  }
  await b.close(); server.close();
})();
