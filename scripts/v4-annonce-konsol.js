/* V4 annonce: jagt på en sjælden konsolfejl (1 af 5 smoke-kørsler på "ekstern med foto").
   Åbner annoncen gentagne gange i samme mock som smoke-browser (installerMock/initScript) og GEMMER for hver fejl: tekst, kilde-URL og
   linje, sidens URL, viewport/tema, samt alle mislykkede forespørgsler og svar >= 400 i samme indlæsning. Ændrer intet i siden.
   Kør: node scripts/v4-annonce-konsol.js [--gange 10] [--id <uuid>] [--vp 320,390,...] [--rapport fil.json] */
const fs = require('fs');
const path = require('path');
const sb = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
(async () => {
  const gange = Number(arg('--gange', 10));
  const id = arg('--id', uuid(1));
  const vps = arg('--vp', '320,375,390,430,768,1024,1440,1920').split(',').map(Number);
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.error(kan.grund); process.exit(2); }
  const { server, port } = await sb.startServer(path.join(__dirname, '..'));
  const browser = await kan.pw.chromium.launch({ headless: true });
  const fund = []; let maalinger = 0;
  try {
    for (let k = 1; k <= gange; k++) for (const vp of vps) for (const tema of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: vp, height: vp >= 1024 ? 900 : 844 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block' });
      await ctx.addInitScript(sb.initScript, { tema });
      await sb.installerMock(ctx, port, {});
      const p = await ctx.newPage();
      const denne = { konsol: [], fejledeKald: [], svar: [], sidefejl: [] };
      p.on('console', m => { if (m.type() === 'error') denne.konsol.push({ tekst: m.text().slice(0, 300), url: (m.location() || {}).url || '', linje: (m.location() || {}).lineNumber }); });
      p.on('pageerror', e => denne.sidefejl.push(String(e.message).slice(0, 300)));
      p.on('requestfailed', r => denne.fejledeKald.push({ url: r.url().slice(0, 200), type: r.resourceType(), fejl: (r.failure() || {}).errorText }));
      p.on('response', r => { if (r.status() >= 400) denne.svar.push({ url: r.url().slice(0, 200), status: r.status() }); });
      await p.goto(`http://127.0.0.1:${port}/annonce.html?id=${id}`, { waitUntil: 'load' });
      await p.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await p.waitForTimeout(350);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600){ window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await p.waitForTimeout(250);
      maalinger++;
      // Fremmede værter blokeres bevidst af mocken (som i smoke-browser): "Failed to load resource" fra dem er ikke en fejl.
      const ægte = denne.konsol.filter(c => !(/Failed to load resource/i.test(c.tekst) && !c.url.startsWith(`http://127.0.0.1:${port}`)));
      if (ægte.length || denne.sidefejl.length) fund.push({ kørsel: k, vp, tema, ...denne, konsol: ægte });
      await ctx.close();
    }
  } finally { await browser.close().catch(() => {}); server.close(); }
  const ud = { id, gange, maalinger, antalMedFejl: fund.length, fund };
  if (arg('--rapport')) fs.writeFileSync(arg('--rapport'), JSON.stringify(ud, null, 2));
  console.log(`${maalinger} indlæsninger, ${fund.length} med konsolfejl/sidefejl`);
  for (const f of fund) console.log(JSON.stringify(f).slice(0, 700));
  process.exit(fund.length ? 1 : 0);
})();
