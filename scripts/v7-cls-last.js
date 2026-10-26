#!/usr/bin/env node
/* V7 QA: CLS under kunstig CPU-belastning (CDP Emulation.setCPUThrottlingRate). Viser om et layoutskift kun optraeder naar hovedtraaden er
   langsom (= saadan som en mellemklasse-telefon oplever siden). Brug: node scripts/v7-cls-last.js side[,side] vp[,vp] tema rate [gange]
   Eksempel: node scripts/v7-cls-last.js "opret-annonce.html?rediger=ID" 768 moerk 6 5 */
'use strict';
const sb = require('./smoke-browser');
const { lavKontoBackend, ID } = require('./fixtures/v6-konto-lager');
const [, , sideArg = 'opret-annonce.html', vpArg = '768', tema = 'lys', rate = '4', gange = '3'] = process.argv;
const HOEJDE = { 375: 812, 430: 932, 768: 1024, 1024: 768, 1440: 900, 1920: 1080 };
(async () => {
  const kan = await sb.playwrightTilgaengelig();
  const { server, port } = await sb.startServer(process.cwd());
  const browser = await kan.pw.chromium.launch();
  for (const side0 of sideArg.split(',')) {
    const side = side0.replace('{ID1}', ID(1));
    for (const vp of vpArg.split(',').map(Number)) {
      const res = [];
      for (let i = 0; i < Number(gange); i++) {
        const bak = lavKontoBackend({});
        const farve = tema === 'moerk' ? 'dark' : 'light';
        const ctx = await browser.newContext({ viewport: { width: vp, height: HOEJDE[vp] }, colorScheme: farve });
        await ctx.addInitScript(sb.initScript, { tema: farve });
        await ctx.addInitScript(() => { window.__skift = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__skift.push(`${Math.round(e.startTime)}ms ${e.value.toFixed(4)} ` + e.sources.map(s => s.node && (s.node.tagName + (typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '')) + ' ' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y)).join(', ')); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {} });
        if (process.env.MOCK === 'smoke') await sb.installerMock(ctx, port, {}, { restSvar: sb.lagerSvar }); else await bak.installer(ctx, { tema: farve });
        if (process.env.FONT_FORSINKELSE) await ctx.route(/\.woff2?($|\?)/, async r => { await new Promise(x => setTimeout(x, Number(process.env.FONT_FORSINKELSE))); await r.fallback(); });
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
        await page.goto(`http://127.0.0.1:${port}/${side}`, { waitUntil: 'load' });
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1200);
        res.push({ cls: await page.evaluate(() => window.__smoke.cls), skift: await page.evaluate(() => window.__skift) });
        await ctx.close();
      }
      console.log(`${side} ${vp} ${tema} cpu x${rate}: CLS ` + res.map(r => r.cls.toFixed(4)).join(' ') + (res.some(r => r.cls >= 0.02) ? '\n   ' + res.filter(r => r.cls >= 0.02).map(r => r.skift.join(' | ')).join('\n   ') : ''));
    }
  }
  await browser.close(); server.close();
})();
