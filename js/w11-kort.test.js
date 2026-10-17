/* w11-kort: browsertest af annoncekortets fod (delt komponent) og annoncesidens tablet-/mobillayout.
   Mod lokal mock (scripts/smoke-browser.js + smoke-fixtures.js) - intet netvaerk, ingen produktion.
   Springes over uden Playwright/Chromium. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));
const { uuid } = require(path.join(REPO, 'scripts', 'smoke-fixtures.js'));

let H = null;   // { browser, base, port, server }
const blok = {};
async function start() {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) return null;
  const { server, port } = await sb.startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  return { browser, server, port, base: `http://127.0.0.1:${port}` };
}
async function side(vp, tema, url, fn) {
  const c = await H.browser.newContext({ viewport: { width: vp, height: vp >= 1024 ? 900 : 844 }, colorScheme: tema === 'mørk' ? 'dark' : 'light', locale: 'da-DK', serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema: tema === 'mørk' ? 'dark' : 'light' });
  await sb.installerMock(c, H.port, blok);
  const p = await c.newPage();
  try {
    await p.goto(H.base + '/' + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(500);
    return await fn(p);
  } finally { await c.close(); }
}

test.before(async () => { H = await start(); });
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

for (const vp of [320, 360, 390]) {
  test(`kortfod ved ${vp} px: sted og kilde afkortes aldrig til "Ro...", ens fodhoejde, fuld tekst i aria-label`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    const r = await side(vp, 'lys', 'soegning.html', p => p.evaluate(() => {
      const kort = Array.from(document.querySelectorAll('#results-grid .card-rich')).slice(0, 12);
      const dele = [];
      kort.forEach(k => k.querySelectorAll('.rk-sted > span, .rk-kilde > span').forEach(s => {
        dele.push({ klippet: s.scrollWidth > s.clientWidth + 1, bredde: s.clientWidth, tekst: s.textContent });
      }));
      const fod = kort.map(k => Math.round(k.querySelector('.rk-fod').getBoundingClientRect().height));
      const aria = kort.every(k => /^Sted: .+/.test(k.querySelector('.rk-sted').getAttribute('aria-label') || '') && /^Kilde: .+/.test(k.querySelector('.rk-kilde').getAttribute('aria-label') || ''));
      const stedForst = kort.every(k => { const a = k.querySelector('.rk-sted').getBoundingClientRect(), b = k.querySelector('.rk-kilde').getBoundingClientRect(); return a.top < b.top || a.left < b.left; });
      return { n: kort.length, dele, fod, aria, stedForst, tekst: document.querySelector('#results-grid').innerText };
    }));
    assert.ok(r.n >= 8, 'kortene er tegnet');
    for (const d of r.dele) assert.ok(!d.klippet || d.bredde >= 60, `afkortet tekst "${d.tekst}" (${d.bredde}px)`);
    assert.ok(r.dele.filter(d => !d.klippet).length >= r.dele.length * 0.7, 'hovedparten af fodtekster staar i fuld laengde');
    assert.strictEqual(new Set(r.fod).size, 1, 'alle foedder samme hoejde: ' + JSON.stringify([...new Set(r.fod)]));
    assert.ok(r.aria && r.stedForst, 'aria-label (Sted/Kilde) findes og sted staar foerst');
    assert.ok(!/\b(null|undefined|NaN)\b/.test(r.tekst), 'ingen null/undefined/NaN');
  });
}

test('spec-chips: kun oplyste tal (ingen "ikke oplyst"-chip, ingen null)', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  const r = await side(390, 'lys', 'soegning.html', p => p.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('#results-grid .rk-chip')).map(c => c.textContent.trim());
    return { chips, ikke: chips.filter(c => /ikke oplyst/i.test(c) && !/^Kørekort/i.test(c)), farlige: chips.filter(c => /null|undefined|NaN/.test(c)) };
  }));
  assert.ok(r.chips.length > 10);
  assert.deepStrictEqual(r.ikke, []);
  assert.deepStrictEqual(r.farlige, []);
});

for (const [vp, tema] of [[768, 'lys'], [1024, 'lys'], [768, 'mørk']]) {
  test(`annonce ved ${vp} px (${tema}): to kolonner, galleri og pris side om side, sidebjaelke med koerekort og kilde`, async (t) => {
    if (!H) return t.skip('Playwright mangler');
    for (const id of [uuid(1), uuid(901)]) {
      const r = await side(vp, tema, `annonce.html?id=${id}`, p => p.evaluate(() => {
        const rc = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
        const bar = document.getElementById('listing-actionbar') || document.getElementById('ekstern-actionbar');
        return {
          g: rc('.an-gallery'), pris: rc('.an-price'), kk: rc('.an-kk'), sel: rc('.an-seller-wrap'), fakta: rc('.an-fakta'), tjek: rc('.an-tjek'), trygt: rc('.an-trygt-wrap'),
          cols: getComputedStyle(document.querySelector('.an-grid')).gridTemplateColumns.split(' ').length,
          over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          bar: bar ? getComputedStyle(bar).display : 'ingen',
        };
      }));
      assert.strictEqual(r.cols, 2, 'to grid-kolonner');
      assert.ok(r.pris.left > r.g.right - 2 && r.pris.top < r.g.bottom, 'pris staar til hoejre for galleriet');
      assert.ok(r.kk.left > r.g.right - 2 && r.sel.left > r.g.right - 2, 'koerekort og kilde i sidebjaelken');
      assert.ok(r.fakta.left < r.g.right && r.fakta.top > r.g.bottom, 'faktatabel under galleriet i venstre kolonne');
      const raekke1 = Math.max(r.fakta.bottom, r.sel.bottom);
      assert.ok(r.tjek.top >= raekke1 - 2 && r.trygt.top >= raekke1 - 2, 'tjekliste og Handl trygt i raekke 2');
      assert.ok(r.tjek.left < r.trygt.left, 'tjekliste til venstre, Handl trygt til hoejre');
      assert.ok(Math.abs(r.fakta.bottom - r.sel.bottom) < 48, 'kolonnerne flugter i bunden (hul < 48 px)');
      assert.strictEqual(r.over, 0, 'ingen vandret overflow');
      assert.ok(r.bar === 'none' || r.bar === 'ingen', 'mobilbjaelken er skjult paa tablet');
    }
  });
}

test('annonce paa mobil: raekkefoelge (titel+pris, koerekort, beskrivelse, fakta, kilde, tjek) og sticky bjaelke med pris', async (t) => {
  if (!H) return t.skip('Playwright mangler');
  for (const id of [uuid(1), uuid(901)]) {
    const r = await side(390, 'lys', `annonce.html?id=${id}`, p => p.evaluate(() => {
      const top = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : null; };
      const bar = document.querySelector('.listing-actionbar:not([hidden])');
      const b = bar && bar.getBoundingClientRect();
      return {
        ordre: ['.an-gallery, .an-photo, .an-photo-tom', '.an-head', '.an-kk', '.an-desc', '.an-fakta', '.an-seller-wrap', '.an-trygt-wrap', '.an-tjek'].map(top),
        bar: !!bar, barBund: b ? Math.round(innerHeight - b.bottom) : null, barH: b ? Math.round(b.height) : 0, barPris: !!(bar && bar.querySelector('.listing-actionbar-pris')),
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }));
    assert.ok(r.ordre.every(v => v != null), 'alle sektioner findes');
    for (let i = 1; i < r.ordre.length; i++) assert.ok(r.ordre[i] > r.ordre[i - 1], `sektion ${i} efter ${i - 1}: ${r.ordre}`);
    assert.ok(r.bar && r.barBund === 0 && r.barH >= 56, 'sticky bjaelke i bunden');
    assert.ok(r.barPris, 'bjaelken viser prisen');
    assert.strictEqual(r.over, 0);
  }
});
