/* Vagthund: forsidens søgeknap og soegning.html skal sige de SAMME to tal.
 *
 * Tre runder i træk har kritikere fundet forsiden og søgesiden uenige om
 * enten antal træf eller antal fravalgte. Runde 3 lagde filterkæden i
 * js/filtrering.js, som begge sider skal kalde. Det her script efterprøver
 * det udefra, med en rigtig browser, ende til ende: sæt filtrene på
 * forsiden, læs knappen og "ikke talt med"-linjen, tryk søg, læs
 * "annoncer fundet" og "ikke vist" på landingssiden.
 *
 * Kør:   PORT=8541 python scripts/dev-server.py     (i én terminal)
 *        node work/forside-vs-soegning.mjs          (i en anden)
 * Ret BASE, hvis din port er en anden.
 *
 * Måling 18.08.2026: 40 kombinationer, 0 uenige.
 */
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:8541';

const KOMBI = [];
for (const t of ['', 'scooter', 'cruiser', 'classic', 'cross', 'adventure'])
  for (const pr of ['', '30000', '60000'])
    for (const kk of ['', 'A2'])
      KOMBI.push({ t, pr, kk });
KOMBI.push({ t:'sport', pr:'200000', kk:'A1' });
KOMBI.push({ t:'touring', pr:'100000', kk:'A' });
KOMBI.push({ t:'', pr:'', kk:'A1', q:'honda' });
KOMBI.push({ t:'naked', pr:'60000', kk:'A2', q:'yamaha' });

const b = await chromium.launch();
const p = await (await b.newContext({ viewport:{ width:1440, height:900 } })).newPage();
p.on('pageerror', e => console.log('PAGEERROR:', e.message));

/* Lageret er 383 på localhost (51 demo + 332 indekserede). Vent på dem alle:
   måler man før, tæller man demolageret alene og får to forskellige tal af
   den helt forkerte grund. */
const dataKlar = () => p.waitForFunction(
  () => typeof Store !== 'undefined' && Store.getAllListings().length >= 383, null, { timeout: 45000 });
const tal = (s) => { const m = String(s||'').match(/([\d.]+)/); return m ? Number(m[1].replace(/\./g,'')) : null; };

let fejl = 0;
for (const k of KOMBI){
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await dataKlar(); await p.waitForTimeout(250);
  if (k.q) await p.fill('#hs-query', k.q);
  await p.selectOption('#hs-type', k.t);
  await p.selectOption('#hs-price', k.pr);
  // Klik på etiketten, ikke på radioknappen: pillerne ligger oven på den.
  await p.click(`label[for="hs-kk-${k.kk || 'alle'}"]`);
  await p.waitForTimeout(150);
  const knap = (await p.locator('#hs-submit').textContent()).trim();
  const hint = (await p.locator('#hs-uoplyst-hint').textContent()).trim();
  // Knappen skriver kun et tal, når der ER et resultat at love.
  const forsideN = knap.startsWith('Vis') ? tal(knap) : null;
  const forsideSkjult = tal(hint) || 0;

  await p.click('#hs-submit');
  await dataKlar();
  await p.waitForFunction(() => /\d/.test(document.querySelector('.results-headline')?.textContent||''), null, { timeout: 45000 });
  await p.waitForTimeout(400);
  const soegN = tal((await p.locator('.results-headline').textContent()).trim());
  const soegSkjult = tal(await p.locator('#uoplyst-note').textContent().catch(()=>'')) || 0;

  const ok = (forsideN === null ? soegN < 10 : forsideN === soegN) && forsideSkjult === soegSkjult;
  if (!ok) fejl++;
  console.log(`${ok?'OK  ':'FEJL'} q=${k.q||'-'} type=${k.t||'-'} pris=${k.pr||'-'} kk=${k.kk||'-'}  forside=${forsideN}/${forsideSkjult}  soeg=${soegN}/${soegSkjult}`);
}
console.log(`\n${KOMBI.length} kombinationer, ${fejl} uenige.`);
await b.close();
process.exit(fejl ? 1 : 0);
