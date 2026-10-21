/* V6 (P2-4b): hvad adskiller første maling (kun indlejret kritisk CSS) fra den færdige side? Sammenligner alle elementers rect med og uden de
   eksterne stylesheets. Elementer, der flytter sig mellem de to, er dem, en sen stylesheet-indlæsning (CPU-last) kan få til at rykke.
   Brug: node scripts/v6-cls-diff.js <side> <bredde> [tema=dark|light] */
const path = require('path');
const smoke = require('./smoke-browser');
const rod = path.join(__dirname, '..');
const [side = 'mc-harley-davidson-cruiser', bredde = '375', tema = 'dark'] = process.argv.slice(2);
async function maal(b, port, uden, js) {
  const ctx = await b.newContext({ viewport: { width: Number(bredde), height: 812 }, serviceWorkers: 'block', colorScheme: tema });
  await smoke.installerMock(ctx, port, {}, {});
  await ctx.addInitScript(smoke.initScript, { tema });
  if (uden) await ctx.route(/\/css\/[^/]+\.css/, r => r.abort('blockedbyclient'));
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/${side}.html`, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const ud = await p.evaluate(() => {
    const m = {};
    for (const e of document.querySelectorAll('main *, header *')) {
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
      let k = ''; for (let n = e; n && n !== document.body; n = n.parentElement) k = n.tagName.toLowerCase() + ':' + (1 + [...n.parentElement.children].indexOf(n)) + '>' + k;
      m[k] = { r: [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)], c: (typeof e.className === 'string' ? e.className : '').slice(0, 50), t: (e.children.length ? '' : e.textContent.trim().slice(0, 30)) };
    }
    return m;
  });
  await ctx.close();
  return ud;
}
(async () => {
  const kan = await smoke.playwrightTilgaengelig();
  const { server, port } = await smoke.startServer(rod);
  const b = await kan.pw.chromium.launch({ headless: true });
  const js = process.env.JS === '1';
  const a = await maal(b, port, true, js), z = await maal(b, port, false, js);
  let n = 0;
  for (const k of Object.keys(a)) {
    if (!z[k]) continue;
    const [ax, ay, aw, ah] = a[k].r, [zx, zy, zw, zh] = z[k].r;
    if (ay < 812 * 1.5 && (ay !== zy || ah !== zh || aw !== zw)) { console.log(`${z[k].c || k.slice(-40)} "${z[k].t}": ${a[k].r.join(',')} -> ${z[k].r.join(',')}`); if (++n > 60) break; }
  }
  console.log('ændrede (i de første 1,2 skærme):', n);
  await b.close(); server.close();
})();
