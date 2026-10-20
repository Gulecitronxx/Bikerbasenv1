/* V5 QA (F2): iOS/iPadOS Safari zoomer ind, når et tekstfelt/en select får fokus med skriftstørrelse < 16 px.
   Alle tekstfelter, selects og textareas (også skjulte, fx filterpanelets prisfelter) skal være >= 16 px ved
   smal skærm (375, 768) og på touch (iPad liggende 1180, pointer:coarse). Mod lokal mock; springes over uden Playwright. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

const SIDER = ['index.html', 'soegning.html', 'maerker.html', 'maerke-honda.html', 'type-cruiser.html', 'koerekort-a2.html', 'mc-honda-cruiser.html', 'budget-under-50000.html', 'by-horsens.html', 'region-hovedstaden.html',
  'opret-annonce.html', 'login.html', 'forhandler.html', 'guides.html', 'annonce.html?id=00000000-0000-4000-8000-000000000001'];
const MAAL = [{ navn: '375', width: 375, height: 812 }, { navn: '768', width: 768, height: 1024 }, { navn: 'iPad liggende (touch)', width: 1180, height: 820, isMobile: true, hasTouch: true }];

test('F2: ingen tekstfelt/select/textarea under 16 px på smal skærm og touch', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    for (const m of MAAL) {
      const c = await browser.newContext({ viewport: { width: m.width, height: m.height }, isMobile: !!m.isMobile, hasTouch: !!m.hasTouch, locale: 'da-DK', serviceWorkers: 'block' });
      await c.addInitScript(sb.initScript, { tema: 'light' });
      await sb.installerMock(c, port, {});
      for (const sti of SIDER) {
        const p = await c.newPage();
        await p.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'load' });
        await p.waitForTimeout(900);
        const smaa = await p.evaluate(() => [...document.querySelectorAll('input,select,textarea')]
          .filter(e => !/^(hidden|checkbox|radio|range|file|submit|button|image|reset|color)$/.test(e.type))
          .filter(e => parseFloat(getComputedStyle(e).fontSize) < 16).map(e => `${e.id || e.name || e.className.split(' ')[0]} ${getComputedStyle(e).fontSize}`));
        assert.deepStrictEqual(smaa, [], `${m.navn}: ${sti}`);
        await p.close();
      }
      await c.close();
    }
  } finally { await browser.close(); server.close(); }
});
