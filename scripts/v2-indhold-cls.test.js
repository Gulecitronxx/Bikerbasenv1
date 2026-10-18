/* v2-indhold: "Udvalgte ..."-sektionen (.fa-h2-raekke: overskrift + "Se alle") skal have et layout, der ikke afhænger af
   tekstbredden i fallback- vs. webfont. Fejlen (CLS 0,116 på mc-honda-adventure @768 ved varm cache): "Se alle" lå under
   overskriften, indtil webfonten kom, og sprang så op på samme linje (flex-wrap afhang af skriftbredden).
   Statisk test (altid) + browsertest (skippes pænt uden Chromium): flere sider i rækkefølge i SAMME kontekst. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');

const REPO = path.join(__dirname, '..');

test('p-facet.css: .fa-h2-raekke staar i en kolonne under 1100 px (ingen wrap-beslutning)', () => {
  const css = fs.readFileSync(path.join(REPO, 'css', 'p-facet.css'), 'utf8');
  const m = css.match(/@media \(max-width:1099px\)\{\s*\.fa-h2-raekke\{([^}]*)\}/);
  assert.ok(m, 'regel for .fa-h2-raekke under 1100 px mangler');
  assert.match(m[1], /flex-direction:\s*column/);
  assert.match(m[1], /flex-wrap:\s*nowrap/);
});

test('browser: ingen layout-shift i Udvalgte-sektionen ved 768 (lys+moerk) efter andre sider i samme kontekst', async (t) => {
  const pw = await sb.playwrightTilgaengelig();
  if (!pw.ok) return t.skip(pw.grund);
  const sider = ['mc-bmw-touring.html', 'mc-harley-davidson-cruiser.html', 'mc-honda-adventure.html', 'type-adventure.html', 'region-hovedstaden.html'];
  const { server, port } = await sb.startServer(REPO);
  const browser = await pw.pw.chromium.launch({ headless: true });
  try {
    for (const tema of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block' });
      await ctx.addInitScript(sb.initScript, { tema });
      await sb.installerMock(ctx, port, {});
      for (const side of sider) {
        const page = await ctx.newPage();
        await page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(350);
        const cls = await page.evaluate(() => window.__smoke.cls);
        await page.close();
        assert.ok(cls < 0.05, `${side} @768 ${tema}: CLS ${cls.toFixed(3)}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
});
