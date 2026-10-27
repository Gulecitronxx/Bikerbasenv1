/* V7 QA fase 2: v7-type-stikproeve. Kun laesning mod https://bikerbasen.dk (GET af sider; ingen login, ingen formularer). Kør fra repo-roden: node scripts/v7-type-stikproeve.js */
const pw = require('playwright');
const fs = require('fs');
(async () => {
  const b = await pw.chromium.launch();
  const p = await (await b.newContext({ locale: 'da-DK' })).newPage();
  await p.goto('https://bikerbasen.dk/soegning.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  const rows = await p.evaluate(() => Store.getAllListings().map(l => ({ id: l.id, brand: l.brand, model: l.model, title: l.title || '', year: l.year, ccm: l.ccm, hk: l.power || l.hk || null, type: l.type || null, afledt: !!l.typeAfledt, ekstern: !!l.isExternal })));
  fs.writeFileSync('docs/review/gauntlet/v7/qa/live-lager-fase2.json', JSON.stringify(rows));
  const afl = rows.filter(r => r.afledt);
  console.log('total', rows.length, 'afledt', afl.length, 'kilde-type', rows.filter(r => r.type && !r.afledt).length, 'uden', rows.filter(r => !r.type).length);
  // eget frø (mulberry32) != 20261026
  let s = 7311; const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const kopi = afl.slice(); for (let i = kopi.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [kopi[i], kopi[j]] = [kopi[j], kopi[i]]; }
  const sam = kopi.slice(0, 50);
  fs.writeFileSync('docs/review/gauntlet/v7/qa/type-stikproeve-50.json', JSON.stringify(sam, null, 1));
  sam.forEach((r, i) => console.log(String(i + 1).padStart(2), r.type.padEnd(9), (r.brand + ' | ' + r.model).padEnd(46), r.year || '?', (r.ccm || '?') + 'ccm', '|', r.title.slice(0, 55)));
  const dist = {}; afl.forEach(r => dist[r.type] = (dist[r.type] || 0) + 1); console.log(dist);
  await b.close();
})();
