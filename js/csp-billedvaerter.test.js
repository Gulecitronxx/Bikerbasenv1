/* HVER SIDE, DER TEGNER ET ANNONCEKORT, SKAL TILLADE ALLE KILDERS BILLEDER.

   Fejlen er opstaaet to gange. Foerste gang (runde 12) manglede soegning.html
   og annonce.html tre af de fem billedvaerter, saa thumbnails fra Rydbergs MC
   (www.123mc.dk) og Jensens MC (www.jensensmc.dk) blev blokeret af CSP'en paa
   sitets vigtigste side — konsollen sagde "violates the following
   Content-Security-Policy directive", og brugeren saa et tomt billedfelt.
   Anden gang (runde 13) viste det sig, at forhandler.html, dashboard.html,
   mine-annoncer.html og opret-annonce.html havde praecis samme mangel.

   Aarsagen er, at CSP'en er HAANDSKREVET pr. side. Saa laenge den er det, kan
   en ny side eller en ny kilde falde ved siden af igen. Den her test er
   spaerren: den finder selv de sider, der tegner kort, og kraever, at de
   tillader hver eneste vaert, forsiden tillader.

   FAELDE FOR DEN NAESTE: tilfoejer du en kilde i sources/ med en ny billedvaert,
   skal vaerten IND i img-src paa alle sider herunder — ikke kun paa den, du
   lige testede i browseren. */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const laes = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

function imgSrcVaerter(html){
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  const dir = (csp.split(';').find(d => d.trim().startsWith('img-src')) || '');
  return new Set(dir.match(/https:\/\/[^\s;"]+/g) || []);
}

/* Forsiden er facit: den har hele listen, og den er den mest gennemgaaede side
   paa sitet. Ingen haardkodet liste her — saa kan testen ikke blive uenig med
   virkeligheden, den dag en kilde kommer til. */
const FACIT = imgSrcVaerter(laes('index.html'));

/* En side "tegner kort", hvis dens egen markup eller et af dens scripts kan
   producere et annoncekort. Vi leder efter de markoerer, kortene faktisk
   efterlader. */
const KORTMARKOERER = /listings-grid|card-external|listingCardHTML/;

function siderDerTegnerKort(){
  return fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.html'))
    .filter(f => {
      const html = laes(f);
      if (!/Content-Security-Policy/.test(html)) return false;   // uden CSP: intet at teste
      if (KORTMARKOERER.test(html)) return true;
      // scripts, siden selv indlaeser, kan ogsaa tegne kort
      const scripts = [...html.matchAll(/src="(js\/[^"]+)\.js"/g)].map(m => m[1] + '.js');
      return scripts.some(s => {
        const p = path.join(ROOT, s.replace(/\?.*$/, ''));
        return fs.existsSync(p) && /listingCardHTML|eksterntKortHTML/.test(fs.readFileSync(p, 'utf8'));
      });
    });
}

test('forsiden har overhovedet nogen billedvaerter (ellers er facit tomt og testen intetsigende)', () => {
  assert.ok(FACIT.size >= 3, `index.html img-src har kun ${FACIT.size} vaerter — facit ser forkert ud`);
});

test('hver side, der kan tegne et annoncekort, tillader alle kilders billedvaerter', () => {
  const sider = siderDerTegnerKort();
  assert.ok(sider.length >= 5, `fandt kun ${sider.length} kort-tegnende sider — soegemoensteret ser forkert ud`);
  const fejl = [];
  for (const f of sider){
    const har = imgSrcVaerter(laes(f));
    const mangler = [...FACIT].filter(v => !har.has(v));
    if (mangler.length) fejl.push(`${f} mangler: ${mangler.join(', ')}`);
  }
  assert.deepEqual(fejl, [], 'CSP blokerer kildernes thumbnails paa:\n  ' + fejl.join('\n  '));
});
