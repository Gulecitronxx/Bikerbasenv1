/* Samlet-Critic P1 (w9): kørekortkortet må aldrig ligge ved siden af sin badge i en smal kolonne, så teksten bliver ét ord
   pr. linje. Testen kører rigtig Chromium mod den statiske annonceside og måler tekstbredden i hver af de tre kolonner. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'css/p-annonce.css'), 'utf8').replace(/\r\n/g, '\n');

test('kørekortkortet stakker badgen under teksten i alle kolonner (smal kolonne = ingen 22 px-tekst)', () => {
  assert.match(css, /\.an-col \.an-kk, \.an-side \.an-kk\{ grid-template-columns: auto minmax\(0,1fr\); \}/);
  assert.match(css, /\.an-col \.an-kk \.an-kk-badge, \.an-side \.an-kk \.an-kk-badge\{ grid-column: 1 \/ -1; max-width:none; \}/);
});

test('rigtig browser: tekstbredden i kørekortkortet er mindst 180 px i hver kolonneplacering ved 1180–1920 px', async (t) => {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { return t.skip('playwright mangler'); }
  let browser;
  try { browser = await chromium.launch(); } catch { return t.skip('Chromium kan ikke starte'); }
  try {
    for (const w of [1180, 1440, 1920]){
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.setContent(`<!doctype html><meta charset=utf-8><style>${css}</style>
        <div class="an-grid"><div class="an-col an-col-a"></div><div class="an-col an-col-b"></div><div class="an-side"></div></div>`);
      const kort = `<section class="card an-kk"><div class="an-kk-ico"><svg viewBox="0 0 24 24"></svg></div><div><h2>Kan du køre denne motorcykel?</h2><p>Mulig A2 ud fra 44 hk og 689 ccm. Tjek registreringsattesten for kW.</p></div><div class="an-kk-badge"><span class="an-kk-pille">Mulig</span><b>A2</b><small>Ikke bekræftet</small></div></section>`;
      for (const sel of ['.an-col-a', '.an-col-b', '.an-side']){
        await page.evaluate(([s, h]) => { document.querySelectorAll('.an-kk').forEach(e => e.remove()); document.querySelector(s).innerHTML = h; }, [sel, kort]);
        const b = await page.evaluate(() => document.querySelector('.an-kk p').getBoundingClientRect().width);
        assert.ok(b >= 180, `${w}px, ${sel}: tekst ${Math.round(b)} px bred`);
      }
      await page.close();
    }
  } finally { await browser.close(); }
});
