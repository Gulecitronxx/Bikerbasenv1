/* V5 QA (F8): opret-annonce uden container queries (Safari < 16, Firefox < 110, Chrome < 105) må ikke falde til 1 kolonne.
   1. css/p-opret.css er i sync med generatoren (scripts/v5-opret-container-fallback.js).
   2. Tærsklerne i fallbacken er genmålt i Chromium: for hver viewportbredde 300-1600 px er "container >= T" = "media-fallback matcher".
   3. Simulering af en browser uden container queries (@container-blokkene fjernet, fallbacken aktiv): samme gitterkolonner og
      sidehøjde som med container queries ved 375/768/1024/1440; UDEN fallbacken er det ikke tilfældet (beviser at testen kan fejle).
   Springes over uden Playwright/Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const K = require(path.join(REPO, 'scripts', 'v5-kompatibilitet.js'));
const G = require(path.join(REPO, 'scripts', 'v5-opret-container-fallback.js'));

test('F8: css/p-opret.css er i sync med fallback-generatoren, og der er en fallback pr. @container-blok', () => {
  const css = fs.readFileSync(G.FIL, 'utf8');
  assert.strictEqual(G.generer(css), css, 'kør: node scripts/v5-opret-container-fallback.js');
  const blokke = (css.match(/@container opform \(min-width:/g) || []).length;
  const fallbacks = (css.match(/\/\*F8-fallback\*\//g) || []).length;
  assert.ok(blokke >= 8, 'forventede mindst 8 @container-blokke: ' + blokke);
  assert.strictEqual(fallbacks, blokke);
  assert.strictEqual(G.generer(G.generer(css)), G.generer(css), 'idempotent');
  assert.strictEqual(G.fjernFallback(css).includes('F8-fallback'), false);
});

async function medSide(t, fn) {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try { await fn(browser, port); } finally { await browser.close(); server.close(); }
}

test('F8: fallback-tærsklerne svarer til containerens bredde ved ALLE viewportbredder 300-1600 px', async (t) => {
  await medSide(t, async (browser, port) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
    await c.addInitScript(sb.initScript, { tema: 'light' });
    await sb.installerMock(c, port, {});
    const p = await c.newPage();
    await p.goto(`http://127.0.0.1:${port}/opret-annonce.html`, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    const afvigelser = [];
    for (let w = 300; w <= 1600; w += 2) {
      await p.setViewportSize({ width: w, height: 900 });
      const r = await p.evaluate(({ media }) => {
        const f = document.querySelector('.op-form'); const cs = getComputedStyle(f);
        const cw = f.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return Object.entries(media).map(([T, q]) => [T, cw >= Number(T), matchMedia(q).matches, cw]);
      }, { media: G.MEDIA });
      for (const [T, container, media, cw] of r) if (container !== media) afvigelser.push(`${w}px: container ${cw.toFixed(0)} >= ${T}? ${container}, media ${media}`);
    }
    assert.deepStrictEqual(afvigelser.slice(0, 5), []);
    await c.close();
  });
});

/* Måler gitterkolonner og sidehøjde med/uden container queries. */
async function maal(browser, port, vp, variant) {
  const c = await browser.newContext({ viewport: { width: vp, height: 900 }, locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema: 'light' });
  await sb.installerMock(c, port, {});
  if (variant !== 'native') {
    await c.route(`http://127.0.0.1:${port}/**`, async route => {
      const u = new URL(route.request().url());
      if (!/\.css$/.test(u.pathname) && !/\.html$/.test(u.pathname)) return route.fallback();
      const r = await route.fetch(); let body = await r.text();
      /* "uden container queries": @container-blokkene fjernes; med fallback aktiveres @supports not (...) som @media all. */
      const trans = css => { let t = css; if (variant === 'med-fallback') t = t.split('@supports not (container-type:inline-size)').join('@media all'); return K.degrader(t, ['container']); };
      body = /\.css$/.test(u.pathname) ? trans(body) : body.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, x, z) => a + trans(x) + z);
      return route.fulfill({ response: r, body });
    });
  }
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${port}/opret-annonce.html`, { waitUntil: 'load' });
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const kol = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).gridTemplateColumns.split(' ').length : null; };
    return { grid4: kol('.op-grid-4'), grid3: kol('.op-grid-3'), grid2: kol('.op-grid-2'), split: kol('.op-split'), photos: kol('.op-photos'), hoejde: document.documentElement.scrollHeight };
  });
  await c.close();
  return r;
}

test('F8: uden container queries giver opret-annonce samme kolonner og sidehøjde som med dem (375/768/1024/1440); uden fallback gør den ikke', async (t) => {
  await medSide(t, async (browser, port) => {
    for (const vp of [375, 768, 1024, 1440]) {
      const nativ = await maal(browser, port, vp, 'native');
      const med = await maal(browser, port, vp, 'med-fallback');
      const uden = await maal(browser, port, vp, 'uden-fallback');
      assert.deepStrictEqual({ ...med, hoejde: Math.round(med.hoejde / 20) }, { ...nativ, hoejde: Math.round(nativ.hoejde / 20) }, `${vp}px: med fallback ${JSON.stringify(med)} vs container queries ${JSON.stringify(nativ)}`);
      if (vp >= 768) assert.notDeepStrictEqual(uden, nativ, `${vp}px: uden fallback skal afvige (ellers beviser testen intet): ${JSON.stringify(uden)}`);
    }
  });
});
