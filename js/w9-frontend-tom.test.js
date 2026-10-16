/* W9 (P1-1/P1-2): forsiden med tomt lager (200 []) og backend-fejl (500) må ikke flytte sig, når svaret kommer.
   Fejlbanneret står i annoncerækkens pladsholder (.kort-raekke har min-height fra første maling), så pladsen er reserveret,
   ikke blot gættet i en streng. Målt i en rigtig browser med forsinket svar. Skippes uden Playwright/Chromium.
   Demolageret (localhost) slås fra ved at omskrive js/data.js i routeren, så lageret virkelig er tomt. */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const sb = require('../scripts/smoke-browser');

const REPO = path.join(__dirname, '..');
const CLS_GRAENSE = 0.05;

async function maal(pw, mode, vp, tema, forsinkelse){
  const { server, port } = await sb.startServer(REPO);
  const browser = await pw.chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: vp, height: vp < 500 ? 844 : vp < 900 ? 1024 : 900 } });
    await ctx.addInitScript(sb.initScript, { tema });
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
    await ctx.route('**/*', async r => {
      const req = r.request(); const u = new URL(req.url());
      if (u.hostname === '127.0.0.1' && Number(u.port) === port){
        if (u.pathname.endsWith('/js/data.js')){
          const f = await r.fetch();
          return r.fulfill({ response: f, body: (await f.text()).replace('SHOW_DEMO_DATA ? buildListings() : []', '[]') });
        }
        return r.continue();
      }
      if (/supabase\.co$/.test(u.hostname)){
        if (req.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
        if (u.pathname.startsWith('/rest/v1/')){
          await new Promise(z => setTimeout(z, forsinkelse));
          return r.fulfill({ status: mode === 'fejl' ? 500 : 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: mode === 'fejl' ? '{"message":"x"}' : '[]' });
        }
        return r.fulfill({ status: 401, headers: cors, body: '{}' });
      }
      return r.abort('blockedbyclient');
    });
    const p = await ctx.newPage();
    await p.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load' });
    await p.waitForSelector('.data-afbrud', { state: 'attached', timeout: 15000 });
    await p.waitForTimeout(1500);
    return await p.evaluate(() => {
      const b = document.querySelector('.data-afbrud');
      const slot = document.getElementById('udvalg-kort');
      const br = b.getBoundingClientRect(), sr = slot.getBoundingClientRect();
      return {
        cls: window.__smoke.cls,
        iSlot: slot.contains(b),
        synlig: br.height > 0,
        inden: br.top >= sr.top - 1 && br.bottom <= sr.bottom + 1,
        slotHoejde: Math.round(sr.height),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        antalTekst: /\b0 annoncer\b/.test(document.body.innerText),
      };
    });
  } finally {
    await browser.close().catch(() => {});
    server.close();
  }
}

let kan;
test.before(async () => { kan = await sb.playwrightTilgaengelig(); });

for (const mode of ['tom', 'fejl']){
  for (const [vp, tema] of [[1440, 'light'], [768, 'dark'], [390, 'light']]){
    test(`W9: tomt/fejlet lager (${mode}) ved ${vp} px ${tema}: banner i den reserverede plads, CLS < ${CLS_GRAENSE}, ingen 0-tal`, async t => {
      if (!kan.ok) return t.skip(kan.grund);
      const r = await maal(kan.pw, mode, vp, tema, 900);
      assert.ok(r.iSlot, 'banneret skal ligge i annoncerækkens pladsholder');
      assert.ok(r.synlig && r.inden, 'banneret skal ligge inden for pladsholderen (ikke uden for den reserverede højde)');
      assert.ok(r.slotHoejde >= 330, `pladsholderen skal bevare mindst 330 px (fik ${r.slotHoejde})`);
      assert.ok(r.cls < CLS_GRAENSE, `CLS ${r.cls}`);
      assert.strictEqual(r.overflow, 0);
      assert.ok(!r.antalTekst, 'ingen "0 annoncer" på siden');
    });
  }
}
