/* Henter alle danske postnumre fra Dataforsyningen (DAWA) og skriver dem til
   js/postnumre.js som en kompakt tabel.

   Kør igen hvis postnummer-listen ændrer sig: node scripts/build-postnumre.js
   Kilde: https://api.dataforsyningen.dk (offentlige data, Danmarks Adresseregister) */

const fs = require('fs');
const path = require('path');

const REGION_NAVN = {
  '1081': 'Nordjylland',
  '1082': 'Midtjylland',
  '1083': 'Syddanmark',
  '1084': 'Hovedstaden',
  '1085': 'Sjælland',
};

async function main(){
  const [pn, km] = await Promise.all([
    fetch('https://api.dataforsyningen.dk/postnumre').then(r => r.json()),
    fetch('https://api.dataforsyningen.dk/kommuner').then(r => r.json()),
  ]);

  const kommuneRegion = {};
  km.forEach(k => { kommuneRegion[k.kode] = REGION_NAVN[k.regionskode] || null; });

  const rows = [];
  for (const p of pn){
    // Postbokse o.l. har ingen kommune og hører ikke hjemme i en by-vælger.
    if (!p.kommuner || !p.kommuner.length) continue;
    // Et postnummer kan strække sig over flere kommuner; første er repræsentativ.
    const region = kommuneRegion[p.kommuner[0].kode];
    if (!region) continue;
    rows.push([p.nr, p.navn, region]);
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]));

  const out = `/* Alle danske postnumre — genereret af scripts/build-postnumre.js
   Kilde: Dataforsyningen (DAWA), Danmarks Adresseregister. ${rows.length} postnumre.
   Format: [postnr, bynavn, region] */

const POSTNUMRE = ${JSON.stringify(rows)};

function findPostnr(nr){
  const hit = POSTNUMRE.find(p => p[0] === String(nr).trim());
  return hit ? { postnr: hit[0], city: hit[1], region: hit[2] } : null;
}

/* Søg på postnummer ELLER bynavn. Postnumre der starter med input rangerer
   højest, så "2100" rammer plet i stedet for at drukne i delvise træf. */
function searchPostnr(term, limit = 8){
  const q = String(term || '').trim().toLowerCase();
  if (!q) return [];
  const starts = [], contains = [];
  for (const [nr, by, region] of POSTNUMRE){
    const inNr = nr.startsWith(q);
    const inBy = by.toLowerCase().startsWith(q);
    if (inNr || inBy) starts.push({ postnr: nr, city: by, region });
    else if (by.toLowerCase().includes(q)) contains.push({ postnr: nr, city: by, region });
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
`;
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'postnumre.js'), out, 'utf8');

  const perRegion = {};
  rows.forEach(r => { perRegion[r[2]] = (perRegion[r[2]] || 0) + 1; });
  console.log(`Skrev ${rows.length} postnumre til js/postnumre.js`);
  console.log(perRegion);
}
main().catch(e => { console.error('Fejl:', e.message); process.exit(1); });
