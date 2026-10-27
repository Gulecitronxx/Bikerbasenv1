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
  /* FALLBACK_FIX=1: maal skrifttypernes metrik i Chromium (canvas) og indsaet en fallback-face med size-adjust/ascent-/descent-override foer sidens egne stilarker
     (via route paa HTML). Beviser, at en fallback-face fjerner skiftet ved sen font — uden at roere repoets generatorer. Formel som Next.js' font-fallback:
     overstyring = metrik / enheder pr. em / size-adjust. */
  let fixCss = '';
  if (process.env.FALLBACK_FIX) {
    const probe = await (await browser.newContext()).newPage();
    await probe.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await probe.evaluate(() => document.fonts.ready);
    const m = await probe.evaluate(() => {
      const c = document.createElement('canvas').getContext('2d');
      const TEKST = 'Motorcykler til salg i Danmark - Honda CB 1000 R, 124.800 kr. Søg motorcykler efter det kørekort, du har 0123456789';
      const mal = (fam, vaegt) => { c.font = `${vaegt} 100px ${fam}`; const t = c.measureText(TEKST); return { w: t.width, a: t.fontBoundingBoxAscent, d: t.fontBoundingBoxDescent }; };
      return { plex: mal("'IBM Plex Sans'", 400), grot: mal("'Space Grotesk'", 700), arial: mal('Arial', 400), arialB: mal('Arial', 700) };
    });
    const face = (navn, web, fb) => { const sa = web.w / fb.w; return `@font-face{font-family:'${navn}';src:local('Arial');size-adjust:${(sa * 100).toFixed(2)}%;ascent-override:${(web.a / 100 / sa * 100).toFixed(2)}%;descent-override:${(web.d / 100 / sa * 100).toFixed(2)}%;line-gap-override:0%;}`; };
    fixCss = face('BB Plex Fallback', m.plex, m.arial) + face('BB Grotesk Fallback', m.grot, m.arialB)
      + ":root{--font-body:'IBM Plex Sans','BB Plex Fallback',system-ui,sans-serif;--font-display:'Space Grotesk','BB Grotesk Fallback','IBM Plex Sans','BB Plex Fallback',system-ui,sans-serif;}";
    console.log('FALLBACK_FIX metrik:', JSON.stringify(m), fixCss);
    await probe.context().close();
  }
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
        if (process.env.MOCK === 'live') { /* rigtige data (kun laesning) */ } else if (process.env.MOCK === 'fixture') await sb.installerMock(ctx, port, {}, {}); else if (process.env.MOCK === 'smoke') await sb.installerMock(ctx, port, {}, { restSvar: sb.lagerSvar }); else await bak.installer(ctx, { tema: farve });
        if (process.env.FONT_FORSINKELSE) await ctx.route(/\.woff2?($|\?)/, async r => { await new Promise(x => setTimeout(x, Number(process.env.FONT_FORSINKELSE))); await r.fallback(); });
        if (fixCss) await ctx.route(/\.html($|\?)/, async r => { const resp = await r.fetch(); let body = (await resp.text()).replace('</head>', `<style>${fixCss}</style></head>`); if (process.env.FALLBACK_FIX === 'optional') body = body.split('font-display:swap').join('font-display:optional'); await r.fulfill({ response: resp, body }); });
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
