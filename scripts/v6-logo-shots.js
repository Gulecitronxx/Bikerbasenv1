#!/usr/bin/env node
/* V6 logoer: måler og fotograferer A–Z-listen (maerker.html) og søgefilterets mærkeliste (soegning.html) — før/efter af sm-slotten.

   Kør:  node scripts/v6-logo-shots.js --ud docs/review/gauntlet/v6/logoer/sm-foer [--viewports 375,430,768,1440] [--temaer lys,moerk]
             [--css "<ekstra CSS>"]  (til forsøg: injiceres på begge sider)  [--maal-kun]  (ingen billeder, kun tal)
   Skriver <ud>/maal.json med pr. viewport: listehøjde, rækkehøjde, afskårne navne (ellipsis), vandret overløb, antal logoer/monogrammer, og
   JPEG'er af A–Z-sektionen og filterlisten. Alt er mocket via smoke-browser (intet forlader maskinen). */

const fs = require('fs');
const path = require('path');
const { startServer, playwrightTilgaengelig, installerMock, initScript } = require('./smoke-browser');

const REPO = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const flag = n => process.argv.includes(n);

async function ventLogoer(page){
  await page.waitForTimeout(500);
  await page.waitForFunction(() => !document.querySelector('.bl--logo:not(.bl--img):not(.bl--klar):not(.bl--fejl)'), null, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 8000 }).catch(() => {});
}

(async () => {
  const ud = path.resolve(REPO, arg('--ud', 'docs/review/gauntlet/v6/logoer/sm-efter'));
  const viewports = arg('--viewports', '375,430,768,1440').split(',').map(Number);
  const temaer = arg('--temaer', 'lys,moerk').split(',');
  const css = arg('--css', '');
  const kunMaal = flag('--maal-kun');
  fs.mkdirSync(ud, { recursive: true });
  const kan = await playwrightTilgaengelig();
  if (!kan.ok){ console.error(kan.grund); process.exit(2); }
  const { server, port } = await startServer(REPO);
  const browser = await kan.pw.chromium.launch({ headless: true });
  const maal = {};
  try {
    for (const vp of viewports) for (const t of temaer){
      const tema = /^m/i.test(t) ? 'dark' : 'light';
      const nøgle = `${vp}-${tema === 'dark' ? 'moerk' : 'lys'}`;
      const ctx = await browser.newContext({ viewport: { width: vp, height: vp >= 1000 ? 900 : 844 }, colorScheme: tema, locale: 'da-DK', serviceWorkers: 'block', reducedMotion: 'reduce' });
      await ctx.addInitScript(initScript, { tema });
      await installerMock(ctx, port, {});
      maal[nøgle] = {};

      /* A–Z */
      let page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/maerker.html`, { waitUntil: 'load' });
      if (css) await page.addStyleTag({ content: css });
      await ventLogoer(page);
      maal[nøgle].az = await page.evaluate(() => {
        const rk = [...document.querySelectorAll('.mk-az-gruppe li')];
        const liste = document.querySelector('.mk-az-gruppe') && document.querySelector('.mk-az-gruppe').parentElement;
        const afskaaret = rk.filter(li => { const s = li.querySelector('.mk-az-navn > span:last-child'); return s && s.scrollWidth > s.clientWidth + 1; }).map(li => li.textContent.trim().slice(0, 24));
        const h = rk.map(li => li.getBoundingClientRect().height);
        const sek = document.querySelector('.mk-az') || liste;
        return { raekker: rk.length, logoer: document.querySelectorAll('.mk-az-logo .bl--logo').length, mono: document.querySelectorAll('.mk-az-logo .bl--mono').length,
          raekkeH: Math.round(Math.max(...h) * 10) / 10, sektionH: sek ? Math.round(sek.getBoundingClientRect().height) : null, afskaaret,
          overloeb: document.documentElement.scrollWidth - document.documentElement.clientWidth, spalteW: [...new Set([...document.querySelectorAll('.mk-az-logo')].map(e => Math.round(e.getBoundingClientRect().width)))] };
      });
      if (!kunMaal){
        const el = await page.$('.mk-az');
        const mål = el || (await page.$('.mk-az-gruppe'));
        if (mål) await mål.screenshot({ path: path.join(ud, `az-${nøgle}.jpg`), type: 'jpeg', quality: 80 });
      }
      await page.close();

      /* søgefilter */
      page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${port}/soegning.html`, { waitUntil: 'load' });
      if (css) await page.addStyleTag({ content: css });
      if (await page.isVisible('#open-filters-btn').catch(() => false)){ await page.click('#open-filters-btn'); await page.waitForTimeout(400); }
      await page.waitForSelector('#filter-brands .checkbox-row', { state: 'attached', timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      const mere = await page.$('#so-more-btn'); if (mere && await mere.isVisible()){ await mere.click(); await page.waitForTimeout(500); }
      /* brand-more: "Vis alle N mærker" folder hele listen ud (målt uden og med) */
      const maalFilter = () => page.evaluate(() => {
        const rk = [...document.querySelectorAll('#brand-list .checkbox-row:not([hidden])')].filter(r => r.getBoundingClientRect().height > 0);
        const liste = document.getElementById('brand-list');
        const panel = document.getElementById('filter-brands');
        const afskaaret = rk.filter(r => { const n = r.children[2]; return (n && n.scrollWidth > n.clientWidth + 1) || r.scrollWidth > r.clientWidth + 1 || (n && n.getBoundingClientRect().height > 22); }).map(r => r.dataset.brandRow);
        const trangt = Math.round(Math.min(...rk.map(r => { const n = r.children[2], c = r.querySelector('.facet-n'); return (c ? c.getBoundingClientRect().left : r.getBoundingClientRect().right) - n.getBoundingClientRect().right; })));
        return { raekker: rk.length, logoer: rk.filter(r => r.querySelector('.bl--logo')).length, mono: rk.filter(r => r.querySelector('.bl--mono')).length,
          listeH: liste ? Math.round(liste.getBoundingClientRect().height) : null, panelH: panel ? Math.round(panel.getBoundingClientRect().height) : null,
          panelW: panel ? Math.round(panel.getBoundingClientRect().width) : null, raekkeH: rk.length ? Math.round(Math.max(...rk.map(r => r.getBoundingClientRect().height)) * 10) / 10 : null,
          friPlads: trangt, navnW: rk.length ? Math.round(Math.min(...rk.map(r => r.children[2].getBoundingClientRect().width))) : null, afskaaret,
          overloeb: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      maal[nøgle].filter = await maalFilter();
      const alle = await page.$('#brand-more');
      if (!kunMaal){
        const liste = await page.$('#filter-brands');
        if (liste){ await liste.scrollIntoViewIfNeeded().catch(() => {}); await ventLogoer(page); await liste.screenshot({ path: path.join(ud, `filter-${nøgle}.jpg`), type: 'jpeg', quality: 80 }); }
      }
      if (alle && await alle.isVisible()){
        await alle.click(); await page.waitForTimeout(500); await ventLogoer(page);
        maal[nøgle].filterAlle = await maalFilter();
        if (!kunMaal){ const liste = await page.$('#filter-brands'); if (liste) await liste.screenshot({ path: path.join(ud, `filter-alle-${nøgle}.jpg`), type: 'jpeg', quality: 80 }); }
      }
      await page.close();
      await ctx.close();
    }
  } finally {
    await Promise.race([browser.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);
    server.close();
  }
  fs.writeFileSync(path.join(ud, 'maal.json'), JSON.stringify(maal, null, 1) + '\n');
  console.log(JSON.stringify(maal));
})();
