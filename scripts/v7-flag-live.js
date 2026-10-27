/* V7 QA fase 2: v7-flag-live. Kun laesning mod https://bikerbasen.dk (GET af sider; ingen login, ingen formularer). Kør fra repo-roden: node scripts/v7-flag-live.js */
const pw = require('playwright');
(async () => {
  const b = await pw.chromium.launch();
  for (const sti of ['', 'index.html', 'soegning.html', 'annonce-bmw-r45-1979-59d3a9a1.html', 'annonce.html?id=0098fee2-be9d-49aa-8956-4a732ed50bf3', 'opret-annonce.html', 'mine-annoncer.html', 'login.html', 'dashboard.html']) {
    for (const w of [1440, 375]) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'da-DK' });
      const p = await ctx.newPage();
      const reqs = []; p.on('request', r => reqs.push(r.url()));
      await p.goto('https://bikerbasen.dk/' + sti, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
      const hit = reqs.filter(u => /beskeder|p-beskeder|rpc\/(send|hent|laes).*besked|messages|threads/i.test(u));
      const txt = await p.evaluate(() => /Send besked|Skriv til sælger|Din besked|indbakke/i.test(document.body.innerText));
      console.log((sti || '/').padEnd(60), w, 'besked-requests:', hit.length, hit.slice(0,2), 'besked-UI i tekst:', txt, '->', new URL(p.url()).pathname);
      await ctx.close();
    }
  }
  await b.close();
})();
