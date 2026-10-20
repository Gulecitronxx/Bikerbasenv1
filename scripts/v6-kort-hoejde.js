/* V6 marked: måler søgekortenes højde (gitter) på søge-lagerets mock (735 rækker, scripts/fixtures/v5-soegning-lager.js), uden netværk.
   Kør: node scripts/v6-kort-hoejde.js [--rod <mappe>] [--viewports 375,768,1440] [--json]
   Skriver pr. bredde: antal kort, gennemsnitshøjde, median, min/maks, foto/krop/fod-gennemsnit, andel med titel på to linjer, rækkehøjde (grid), og
   samlet højde for de første 24 kort (som en side). --rod peger på en anden kopi af sitet (fx før-versionen) til sammenligning. */
const path = require('path');
const sb = require(path.join(__dirname, 'smoke-browser.js'));

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

async function maal(rod, viewports){
  const kan = await sb.playwrightTilgaengelig();
  const { server, port } = await sb.startServer(rod);
  const browser = await kan.pw.chromium.launch({ headless: true });
  const ud = {};
  try {
    for (const w of viewports){
      const c = await browser.newContext({ viewport: { width: w, height: 1400 }, locale: 'da-DK', colorScheme: 'light', serviceWorkers: 'block' });
      await c.addInitScript(sb.initScript, { tema: 'light' });
      await sb.installerMock(c, port, {}, { restSvar: sb.lagerSvar });
      const p = await c.newPage();
      await p.goto(`http://127.0.0.1:${port}/soegning.html`, { waitUntil: 'load' });
      await p.waitForFunction(() => document.documentElement.classList.contains('so-klar'), null, { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(700);
      ud[w] = await p.evaluate(() => {
        const kort = [...document.querySelectorAll('#results-grid > .card')];
        const h = e => e ? e.getBoundingClientRect().height : 0;
        const gem = kort.map(k => ({
          h: h(k), foto: h(k.querySelector('.card-media')), krop: h(k.querySelector('.rk-body')), fod: h(k.querySelector('.rk-fod')),
          titelLinjer: (() => { const t = k.querySelector('.rk-titel'); if (!t) return 0; const lh = parseFloat(getComputedStyle(t).lineHeight) || 18; return Math.round(h(t) / lh); })(),
          top: Math.round(k.getBoundingClientRect().top + window.scrollY),
        }));
        const snit = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
        const sorteret = gem.map(g => g.h).sort((a, b) => a - b);
        const raekker = new Map(); for (const g of gem) raekker.set(g.top, g.h);
        const foerste24 = gem.slice(0, 24); const t0 = foerste24[0] ? foerste24[0].top : 0;
        const sidste = foerste24[foerste24.length - 1];
        return {
          kort: gem.length, snit: +snit(gem.map(g => g.h)).toFixed(1), median: sorteret[Math.floor(sorteret.length / 2)] || 0, min: sorteret[0] || 0, maks: sorteret[sorteret.length - 1] || 0,
          foto: +snit(gem.map(g => g.foto)).toFixed(1), krop: +snit(gem.map(g => g.krop)).toFixed(1), fod: +snit(gem.map(g => g.fod)).toFixed(1),
          tolinjet: +(gem.filter(g => g.titelLinjer >= 2).length / (gem.length || 1)).toFixed(2),
          raekker: raekker.size, side24: sidste ? Math.round(sidste.top + sidste.h - t0) : 0,
        };
      });
      await c.close();
    }
  } finally { await browser.close(); server.close(); }
  return ud;
}

if (require.main === module) {
  (async () => {
    const rod = path.resolve(arg('--rod', path.join(__dirname, '..')));
    const vps = arg('--viewports', '375,768,1440').split(',').map(Number);
    const r = await maal(rod, vps);
    if (process.argv.includes('--json')) console.log(JSON.stringify(r));
    else for (const w of vps) console.log(w, JSON.stringify(r[w]));
  })().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { maal };
