/* V6 (P2-4b): diagnose af layout-shift på en facetside under CPU-last. Skriver pr. layout-shift: tid, værdi og kilder (selector, før/efter-rect).
   Brug: node scripts/v6-cls-diagnose.js mc-harley-davidson-cruiser 375 moerk [cpu=6] [gentagelser=6] [fontforsinkelse-ms=0]
   cpu = CDP CPU-throttling (1 = ingen); fontforsinkelse forsinker woff2-svar, så en font-swap sker sent (værste tilfælde for tekstombrydning). */
const path = require('path');
const smoke = require('./smoke-browser');
const rod = path.join(__dirname, '..');
const [side = 'mc-harley-davidson-cruiser', bredde = '375', tema = 'moerk', cpu = '6', n = '6', fontMs = '0'] = process.argv.slice(2);
(async () => {
  const kan = await smoke.playwrightTilgaengelig();
  const { server, port } = await smoke.startServer(rod);
  const b = await kan.pw.chromium.launch({ headless: true });
  const samlet = [];
  for (let i = 0; i < Number(n); i++) {
    const ctx = await b.newContext({ viewport: { width: Number(bredde), height: 812 }, serviceWorkers: 'block', colorScheme: tema === 'moerk' ? 'dark' : 'light' });
    await smoke.installerMock(ctx, port, {}, {});
    await ctx.addInitScript(smoke.initScript, { tema: tema === 'moerk' ? 'dark' : 'light' });
    await ctx.addInitScript(() => {
      window.__ls = [];
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), kilder: (e.sources || []).map(s => {
              const nd0 = s.node; const nd = nd0 && nd0.nodeType === 3 ? nd0.parentElement : nd0; const sel = nd ? (nd.nodeType === 1 ? nd.tagName.toLowerCase() + (nd.id ? '#' + nd.id : '') + (nd.className && typeof nd.className === 'string' ? '.' + nd.className.trim().split(/\s+/).join('.') : '') : '#' + nd.nodeName) : '?';
              return { sel: sel.slice(0, 90), fra: [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round), til: [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) };
            }) });
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* ingen */ }
    });
    if (Number(fontMs) > 0) await ctx.route(/\.woff2?(\?|$)/, async r => { await new Promise(ok => setTimeout(ok, Number(fontMs))); r.fallback(); });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    if (Number(cpu) > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(cpu) });
    await p.goto(`http://127.0.0.1:${port}/${side}.html`, { waitUntil: 'load' });
    await p.waitForTimeout(3500);
    const ls = await p.evaluate(() => window.__ls);
    const sum = ls.reduce((a, x) => a + x.v, 0);
    samlet.push(sum);
    console.log(`#${i + 1} CLS ${sum.toFixed(4)}`);
    if (sum > 0.01) for (const x of ls) console.log('   ', x.t + 'ms', x.v, JSON.stringify(x.kilder));
    await ctx.close();
  }
  samlet.sort((a, c) => a - c);
  console.log(`min ${samlet[0].toFixed(4)} median ${samlet[Math.floor(samlet.length / 2)].toFixed(4)} max ${samlet[samlet.length - 1].toFixed(4)}`);
  await b.close(); server.close();
})();
