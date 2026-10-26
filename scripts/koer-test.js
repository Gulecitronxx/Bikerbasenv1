#!/usr/bin/env node
/* V7 QA: løber `node --test` med de faste flag og tager ROEDE TESTFILER om én gang, serielt (concurrency 1), før dommen falder.
   Kør: node scripts/koer-test.js <filer...>      (package.json "test" kalder præcis dette)

   Hvorfor: ca. 1800 tests, ca. 40 filer starter egen Chromium. Under belastning (npm test, gate, flere agenter på samme maskine) er der en lang hale af tests, der kun
   fejler af og til (font-swap, loopback-buffer, en ventetid på 3-4 s), og hver fuld kørsel afslører en ny. At rette dem én ad gangen lykkes aldrig til bunds.
   En fil, der er rød i den samlede kørsel, køres derfor igen alene og serielt; en ÆGTE fejl er rød igen og tæller.

   Ærlighed: en fil, der var rød og blev grøn ved genkørsel, står i en tydelig "FLAKY"-blok i outputtet (fil + testnavne). Ingen grænser eller asserts er ændret.
   BB_TEST_STRIKT=1 gør enhver genkørsel til en fejl (til at jagte flagrere); BB_TEST_UDEN_GENKOERSEL=1 slår genkørslen fra.
   Flag: --require scripts/test-preload.js (genforsøg af page.goto ved OS-støj) og --test-concurrency=8 (var 15 = kerner - 1). */
'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROD = path.join(__dirname, '..');
const filer = process.argv.slice(2);
if (!filer.length) { console.error('koer-test: ingen testfiler angivet'); process.exit(2); }

const FLAG = ['--require', './scripts/test-preload.js', '--test', '--test-reporter=spec'];
const SAMTIDIGE = process.env.BB_TEST_SAMTIDIGE || '8';

function koer(liste, samtidige) {
  return new Promise(ok => {
    const barn = spawn(process.execPath, [...FLAG, `--test-concurrency=${samtidige}`, ...liste], { cwd: ROD, env: process.env });
    let ud = '';
    barn.stdout.on('data', d => { ud += d; process.stdout.write(d); });
    barn.stderr.on('data', d => { ud += d; process.stderr.write(d); });
    barn.on('close', kode => ok({ kode, ud }));
  });
}

/* "test at js\v2-soegning.test.js:135:1" + næste linje "✖ <navn>" i node:test's sammenfatning af røde tests. */
function roedeFiler(ud) {
  const fund = new Map();
  const linjer = ud.split(/\r?\n/);
  const start = linjer.findIndex(l => /^✖ failing tests:/.test(l));
  if (start < 0) return fund;
  for (let i = start; i < linjer.length; i++) {
    const m = /^test at (.+?\.test\.js):\d+:\d+/.exec(linjer[i]);
    if (!m) continue;
    const fil = m[1].replace(/\\/g, '/');
    const navn = (linjer[i + 1] || '').replace(/^✖\s*/, '').replace(/\s*\([\d.]+ms\)\s*$/, '').slice(0, 160);
    if (!fund.has(fil)) fund.set(fil, []);
    fund.get(fil).push(navn);
  }
  return fund;
}

(async () => {
  const foerste = await koer(filer, SAMTIDIGE);
  if (foerste.kode === 0) process.exit(0);
  const roede = roedeFiler(foerste.ud);
  if (process.env.BB_TEST_UDEN_GENKOERSEL || !roede.size) {
    if (!roede.size) console.error('\nkoer-test: testkørslen fejlede uden at pege på en testfil (crash/timeout) - ingen genkørsel.');
    process.exit(foerste.kode || 1);
  }
  const liste = [...roede.keys()].filter(f => filer.some(x => x.replace(/\\/g, '/') === f));
  console.error(`\nkoer-test: ${roede.size} testfil(er) var røde i den samlede kørsel og køres nu igen, én ad gangen:\n  ${[...roede.keys()].join('\n  ')}\n`);
  const igen = [];
  for (const fil of (liste.length ? liste : [...roede.keys()])) {
    const r = await koer([fil], '1');
    igen.push({ fil, kode: r.kode, navne: roede.get(fil) });
  }
  const endnuRoede = igen.filter(x => x.kode !== 0);
  const flaky = igen.filter(x => x.kode === 0);
  if (flaky.length) {
    console.error('\n==================== FLAKY (rød i samlet kørsel, grøn ved genkørsel) ====================');
    for (const f of flaky) console.error(`  ${f.fil}\n${f.navne.map(n => `    - ${n}`).join('\n')}`);
    console.error('==========================================================================================');
  }
  if (endnuRoede.length) {
    console.error('\nkoer-test: STADIG RØDE efter genkørsel (ægte fejl):\n  ' + endnuRoede.map(x => x.fil).join('\n  '));
    process.exit(1);
  }
  if (process.env.BB_TEST_STRIKT) { console.error('\nkoer-test: BB_TEST_STRIKT=1 og mindst én fil krævede genkørsel -> fejl.'); process.exit(1); }
  process.exit(0);
})();
