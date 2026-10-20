/* V5: kortets bund — sammenlign-knappen (rund, to pile) må aldrig ligge oven på en chip, stedet, kilde-linket, prisen eller hjertet, og skal være mindst 40 x 40 px
   med hover- og fokustilstand. Ejeren så den klemt mod hk-chippen ("30 hk", "152 hk") og oven på "64 hk" ved ca. 1440 px.
   Måler ALLE kortvarianter i lagerfixturen (scripts/fixtures/v5-soegning-lager.js: med/uden "Bytter gerne", "Kræver A"/"Mulig A2", lange kildenavne, privat sælger,
   egne annoncer med hjerte) i gitter og liste ved 375/430/768/1024/1440/1920, lys og mørk. Intet netværk.
   Kør: node --test js/v5-kort-bund.test.js — springes over uden Playwright. V5_ROD=<mappe> måler en anden kopi af sitet (fx før-versionen). */
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const REPO = path.join(__dirname, '..');
const sb = require(path.join(REPO, 'scripts', 'smoke-browser.js'));

let H = null;
test.before(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.log(`# v5-kort-bund.test: SKIPPER (${kan.grund})`); return; }
  const { server, port } = await sb.startServer(process.env.V5_ROD || REPO);
  H = { server, port, browser: await kan.pw.chromium.launch({ headless: true }) };
});
test.after(async () => { if (H) { await H.browser.close(); H.server.close(); } });

async function aabn(w, url, tema, liste){
  const c = await H.browser.newContext({ viewport: { width: w, height: 1400 }, locale: 'da-DK', colorScheme: tema, serviceWorkers: 'block' });
  await c.addInitScript(sb.initScript, { tema });
  await sb.installerMock(c, H.port, {}, { restSvar: sb.lagerSvar });
  const p = await c.newPage();
  await p.goto(`http://127.0.0.1:${H.port}/${url}`, { waitUntil: 'load' });
  await p.waitForFunction(() => document.documentElement.classList.contains('so-klar'), null, { timeout: 8000 }).catch(() => {});
  if (liste) { await p.click('#view-list'); await p.waitForTimeout(300); }
  await p.waitForTimeout(300);
  return { c, p };
}

/* Kører i siden: for hvert kort, knappens boks mod alt, den ikke må dække. */
function maal(){
  const skær = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const SYNLIG = e => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const ud = { kort: 0, fund: [], smaa: [], udenfor: [], hjerter: 0, bytter: 0, privat: 0, lang: 0, kkA: 0, kkMulig: 0 };
  const MOD = '.rk-chip, .rk-sted, .rk-kilde, .rk-pris, .rk-titel, .rk-linje, .fav-btn, .card-badges .badge, .row-spec, .row-price, .row-when, .row-title, .row-variant, .row-fav, .row-flags .badge, .row-kk';
  for (const k of document.querySelectorAll('#results-grid > .card, #results-grid > .listing-row')) {
    const sam = k.querySelector('.card-compare, .row-tool[data-compare-toggle]');
    if (!sam || !SYNLIG(sam)) continue;
    ud.kort++;
    const navn = (k.querySelector('.rk-titel, .row-title') || {}).textContent;
    const sb = sam.getBoundingClientRect(), kr = k.getBoundingClientRect();
    if (sb.width < 39.5 || sb.height < 39.5) ud.smaa.push(`${navn}: ${Math.round(sb.width)}x${Math.round(sb.height)}`);
    if (sb.right > kr.right + 0.5 || sb.bottom > kr.bottom + 0.5 || sb.left < kr.left - 0.5 || sb.top < kr.top - 0.5) ud.udenfor.push(navn);
    for (const e of k.querySelectorAll(MOD)) {
      if (e === sam || sam.contains(e) || !SYNLIG(e)) continue;
      /* kun selve tekstens/chippens boks: indholdsbredde, ikke den strakte flex-celle */
      if (skær(sb, e.getBoundingClientRect())) ud.fund.push(`${navn}: ${e.className.toString().split(' ')[0]} "${e.textContent.trim().slice(0, 18)}"`);
    }
    if (k.querySelector('.fav-btn')) ud.hjerter++;
    if (/Bytter gerne/i.test(k.textContent)) ud.bytter++;
    if (/Privat/i.test((k.querySelector('.rk-kilde') || {}).textContent || '')) ud.privat++;
    if ((((k.querySelector('.rk-kilde') || {}).textContent || '').trim().length) > 16) ud.lang++;
    if (k.querySelector('.rk-kk.kk-a')) ud.kkA++;
    if (k.querySelector('.rk-kk.kk-a1, .rk-kk.kk-a2')) ud.kkMulig++;
  }
  return ud;
}

const URLS = ['soegning.html', 'soegning.html?brands=BMW', 'soegning.html?types=cruiser', 'soegning.html?brands=Honda&sort=price-asc', 'soegning.html?q=cf+moto'];

for (const liste of [false, true]) {
  for (const tema of ['light', 'dark']) {
    for (const w of [375, 430, 768, 1024, 1440, 1920]) {
      test(`${liste ? 'liste' : 'gitter'} ${w} px ${tema === 'dark' ? 'mørk' : 'lys'}: sammenlign-knappen dækker intet og er mindst 40 px`, { timeout: 120000 }, async t => {
        if (!H) return t.skip('Playwright mangler');
        const samlet = { kort: 0, fund: [], smaa: [], udenfor: [], hjerter: 0, bytter: 0, privat: 0, lang: 0, kkA: 0, kkMulig: 0 };
        for (const url of URLS) {
          const { c, p } = await aabn(w, url, tema, liste);
          try {
            const m = await p.evaluate(maal);
            for (const k of Object.keys(samlet)) samlet[k] = Array.isArray(samlet[k]) ? samlet[k].concat(m[k].map(x => `${url}: ${x}`)) : samlet[k] + m[k];
          } finally { await c.close(); }
        }
        assert.ok(samlet.kort >= 40, `kort målt: ${samlet.kort}`);
        if (!liste) {
          /* varianterne er med i målingen */
          assert.ok(samlet.bytter >= 1, 'kort med "Bytter gerne"');
          assert.ok(samlet.hjerter >= 1, 'kort med hjerte (egne annoncer)');
          assert.ok(samlet.kkA >= 1 && samlet.kkMulig >= 1, 'både "Kræver A" og "Mulig A1/A2"');
          assert.ok(samlet.lang >= 1, 'langt kildenavn');
        }
        assert.deepStrictEqual(samlet.smaa, [], 'knap under 40 px');
        assert.deepStrictEqual(samlet.udenfor, [], 'knap uden for kortet');
        assert.deepStrictEqual(samlet.fund, [], 'knappen overlapper');
      });
    }
  }
}

test('knappens hover- og fokustilstand er synlige og ændrer ikke kortets mål', { timeout: 60000 }, async t => {
  if (!H) return t.skip('Playwright mangler');
  for (const w of [375, 1440]) {
    const { c, p } = await aabn(w, 'soegning.html', 'light', false);
    try {
      const knap = p.locator('#results-grid .card-compare').first();
      const foer = await p.evaluate(() => { const k = document.querySelector('#results-grid .card'); const r = k.getBoundingClientRect(); return { h: Math.round(r.height), b: getComputedStyle(k.querySelector('.card-compare')).backgroundColor }; });
      await knap.hover(); await p.waitForTimeout(250);
      const hover = await knap.evaluate(e => { const s = getComputedStyle(e); return { t: s.transform, bg: s.backgroundColor, c: s.color }; });
      assert.ok(hover.t !== 'none' || hover.bg !== foer.b, `${w}: hover ændrer knappen (${JSON.stringify(hover)})`);
      await p.mouse.move(0, 0);
      await p.keyboard.press('Tab');   // sørg for tastaturmodus, så :focus-visible gælder
      await knap.focus(); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
      const fokus = await p.evaluate(() => { const e = document.activeElement; if (!e || !e.classList.contains('card-compare')) return { er: false, tag: e && e.className }; const s = getComputedStyle(e); return { er: true, outline: s.outlineStyle, w: parseFloat(s.outlineWidth), shadow: s.boxShadow }; });
      assert.ok(fokus.er, `${w}: fokus nåede knappen (${JSON.stringify(fokus)})`);
      assert.ok((fokus.outline !== 'none' && fokus.w >= 2) || /rgb/.test(fokus.shadow), `${w}: synlig fokusring (${JSON.stringify(fokus)})`);
      const efter = await p.evaluate(() => Math.round(document.querySelector('#results-grid .card').getBoundingClientRect().height));
      assert.strictEqual(efter, foer.h, `${w}: kortets højde uændret`);
    } finally { await c.close(); }
  }
});
