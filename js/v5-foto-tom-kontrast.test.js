/* V5 QA (F1): annoncekort uden foto OG uden oplyst type havde hvid "Ingen fotos i denne annonce" på lys baggrund (1,17:1).
   Nu: hvid tekst/mærkat kun når typens foto ligger som baggrund; ellers grå tekst med kontrast >= 4,5:1 i lys og mørk,
   og ingen "Typefoto (illustration)"-mærkat uden et typefoto. Mod lokal mock (smoke-browser + fixtures: "Honda CL 500 A" har ingen type).
   Springes over uden Playwright/Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const KB = require(path.join(REPO, 'scripts', 'v5-krydsbrowser.js'));

async function kort(browser, port, sti, vp, tema) {
  const c = await browser.newContext({ viewport: { width: vp, height: 900 }, colorScheme: tema === 'mørk' ? 'dark' : 'light', locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema: tema === 'mørk' ? 'dark' : 'light' });
  await sb.installerMock(c, port, {});
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${port}/${sti}`, { waitUntil: 'load' });
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
    const rgb = s => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data]; };
    const ud = [];
    for (const t of document.querySelectorAll('.card-rich .foto-tom-titel')) {
      const f = t.closest('.foto-tom'), kortEl = t.closest('.card-rich');
      const bi = getComputedStyle(f).backgroundImage;
      const media = f.closest('.card-media');
      const bg = rgb(getComputedStyle(media).backgroundColor);
      const fg = rgb(getComputedStyle(t).color);
      const l1 = lum(fg), l2 = lum(bg);
      ud.push({ type: kortEl.dataset.type || null, medBillede: bi !== 'none', kontrast: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), mærkat: getComputedStyle(f, '::after').content });
    }
    return ud;
  });
  await c.close();
  return r;
}

test('F1: fotoløse kort uden type har læsbar tekst (>= 4,5:1) og ingen Typefoto-mærkat; kort med typefoto beholder hvid tekst', async (t) => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return t.skip(kan.grund);
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  try {
    let uden = 0, med = 0;
    for (const sti of ['maerke-honda.html', 'type-cruiser.html'])
      for (const vp of [375, 1440]) for (const tema of ['lys', 'mørk']) {
        for (const k of await kort(browser, port, sti, vp, tema)) {
          if (k.medBillede) { med++; assert.ok(/Typefoto/.test(k.mærkat), `${sti} ${vp} ${tema}: typefoto-kort mangler mærkat`); continue; }
          uden++;
          assert.ok(k.kontrast >= 4.5, `${sti} ${vp} ${tema}: kort uden typefoto (type ${k.type}) har kontrast ${k.kontrast.toFixed(2)}:1`);
          assert.ok(!/Typefoto/.test(k.mærkat), `${sti} ${vp} ${tema}: "Typefoto"-mærkat uden typefoto`);
        }
      }
    assert.ok(uden >= 4, 'der skal være fotoløse kort uden typefoto i fixtures: ' + uden);
    assert.ok(med >= 1, 'og mindst ét med typefoto: ' + med);
  } finally { await browser.close(); server.close(); }
});
