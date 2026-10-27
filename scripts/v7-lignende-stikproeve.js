/* V7 QA fase 2: v7-lignende-stikproeve. Kun laesning mod https://bikerbasen.dk (GET af sider; ingen login, ingen formularer). Kør fra repo-roden: node scripts/v7-lignende-stikproeve.js */
const pw = require('playwright');
const fs = require('fs');
(async () => {
  const rows = JSON.parse(fs.readFileSync('docs/review/gauntlet/v7/qa/live-lager-fase2.json'));
  let s = 99; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const ek = rows.filter(r => r.ekstern); const pick = []; 
  const vil = ['Honda','BMW','Harley-Davidson','Yamaha','Suzuki','Kawasaki','Triumph','KTM','Royal Enfield','Aprilia','BSA','Ducati'];
  for (const m of vil) { const c = ek.filter(r => r.brand === m); if (c.length) pick.push(c[Math.floor(rnd() * c.length)]); }
  const b = await pw.chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK' }); const p = await ctx.newPage();
  const ud = [];
  for (const r of pick) {
    await p.goto('https://bikerbasen.dk/annonce.html?id=' + r.id, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const x = await p.evaluate(() => { const st = document.querySelector('.similar-strip'); if (!st || st.hidden) return { skjult: true }; const k = [...document.querySelectorAll('#similar-listings .card')].map(c => (c.querySelector('.rk-titel,h3')||c).innerText.trim().replace(/\s+/g,' ').slice(0,40) + ' | ' + ((c.innerText.match(/(\d{1,3}(?:\.\d{3})* kr)/)||[])[1]||'')); return { h: (st.querySelector('h2')||{}).innerText, note: (st.querySelector('.similar-note')||{}).innerText, k }; });
    ud.push(`${r.brand} ${r.model} ${r.year||'?'} ${r.ccm||'?'}ccm type=${r.type||'-'}  =>  ${x.skjult ? 'SKJULT' : x.h + ' [' + (x.note||'').slice(0,90) + '] ' + x.k.join(' ; ')}`);
  }
  console.log(ud.join('\n'));
  await b.close();
})();
