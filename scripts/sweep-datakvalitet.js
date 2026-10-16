/* Datakvalitets-sweep over et SNAPSHOT af `eksterne_annoncer`. Kør:

     node scripts/sweep-datakvalitet.js <snapshot.json> [--json]

   Snapshot = en JSON-fil med rækkerne som PostgREST sender dem (en liste, eller
   { data: [...] }) — de samme kolonner som EKSTERNE_KOLONNER i js/backend-bridge.js
   (titel, maerke, model, aargang, km, ccm, hk, stand, url, salgsmarkoerer, sidst_set,
   kilde:{navn,domaene} ...). Eksempel: scripts/fixtures/eksterne-raekker-eksempel.json.

   Scriptet gør INGEN netværkskald og skriver intet; det læser kun filen og kører de
   samme normaliseringsfunktioner, browseren bruger (scripts/shared.js browserModules()).
   Ejeren kan eksportere et snapshot fra Supabase-dashboardet og køre det her, så tallene
   i docs/review/gauntlet/builder-w3-data.md kan efterprøves på hele lageret.

   Rapporterer pr. fund: F-002 falsk "ny", F-007 urealistiske tal, F-008 model/mærke fra
   deeplink, F-009 efterspørgsel, F-010 forhandlerjargon, F-011 stavemåder, F-003 alder. */

const fs = require('node:fs');
const { browserModules } = require('./shared.js');

function sweep(raekker, nu = new Date()){
  const M = browserModules();
  const aar = nu.getFullYear();
  const ud = {
    antal: raekker.length,
    ny: { sigerNy: 0, bekraeftet: 0, modsagt: [], ubevist: [] },
    tal: { ccmNulstillet: [], hkNulstillet: [] },
    deeplink: { modelFraStien: [], maerkeFraStien: [], stadigUkendtMaerke: 0, stadigTomModel: 0 },
    efterspoergsel: [],
    jargon: 0,
    stavning: { maerkerRettet: 0, modellerRettet: 0, eksempler: [] },
    friskhed: null,
  };
  const normaliserede = [];
  for (const row of raekker){
    const l = M.normalizeExternalListing(row);
    normaliserede.push(l);
    const navn = `${row.maerke || ''} ${row.model || row.titel || ''}`.trim() + ` ${row.aargang || '?'} (${row.km == null ? 'km ?' : row.km + ' km'})`;

    const sigerNy = /^(ny|new)$/i.test(String(row.stand || '').trim());
    if (sigerNy){
      ud.ny.sigerNy++;
      const s = M.kildeNyStatus({ kildeStand: row.stand, externalUrl: row.url, km: row.km, year: row.aargang }, aar);
      if (s === true) ud.ny.bekraeftet++;
      else if (s === false) ud.ny.modsagt.push(navn);
      else ud.ny.ubevist.push(navn);
    }
    if (row.ccm != null && l.ccm == null) ud.tal.ccmNulstillet.push(`${navn}: ccm ${row.ccm}`);
    if (row.hk != null && l.power == null) ud.tal.hkNulstillet.push(`${navn}: hk ${row.hk}`);
    if (!row.model && l.model) ud.deeplink.modelFraStien.push(`${row.titel} -> ${l.model}`);
    if ((!row.maerke || /^ukendt$/i.test(row.maerke) || /^andet m[aæ]rke$/i.test(row.maerke)) && l.brand !== 'Ukendt') ud.deeplink.maerkeFraStien.push(`${row.titel} -> ${l.brand}`);
    if (l.brand === 'Ukendt') ud.deeplink.stadigUkendtMaerke++;
    if (!l.model) ud.deeplink.stadigTomModel++;
    if ((l.salgsmarkoerer || []).some(m => /engros/i.test(m))) ud.jargon++;
  }

  const foer = new Map(normaliserede.map(l => [l, { brand: l.brand, model: l.model }]));
  const { beholdt, dubletter, efterspoergsler } = M.markerTvaerkildeDubletter(normaliserede);
  ud.efterspoergsel = (efterspoergsler || []).map(l => l.kildeTitel || `${l.brand} ${l.model}`);
  for (const [l, f] of foer){
    if (l.brand !== f.brand){ ud.stavning.maerkerRettet++; ud.stavning.eksempler.push(`mærke ${f.brand} -> ${l.brand}`); }
    if (l.model !== f.model){ ud.stavning.modellerRettet++; ud.stavning.eksempler.push(`model ${f.model} -> ${l.model}`); }
  }
  ud.beholdt = beholdt.length;
  ud.dubletterOgEfterspoergsel = dubletter.length;
  const fr = M.senesteBekraeftet(beholdt, nu);
  ud.friskhed = fr && { seneste: fr.datoTekst, aeldste: fr.aeldsteTekst, dageSiden: fr.dage, gammel: fr.gammel };
  return ud;
}

function tekst(r){
  const lst = (a, maks = 10) => a.slice(0, maks).map(x => '    - ' + x).join('\n') + (a.length > maks ? `\n    ... og ${a.length - maks} flere` : '');
  return [
    `Rækker: ${r.antal} (beholdt efter dedupe/efterspørgsel: ${r.beholdt})`,
    `F-002  siger "ny": ${r.ny.sigerNy} | bekræftet ny: ${r.ny.bekraeftet} | modsagt (bliver Brugt): ${r.ny.modsagt.length} | ubevist (intet mærke): ${r.ny.ubevist.length}`,
    r.ny.modsagt.length ? '  modsagt:\n' + lst(r.ny.modsagt) : '',
    r.ny.ubevist.length ? '  ubevist:\n' + lst(r.ny.ubevist) : '',
    `F-007  ccm nulstillet: ${r.tal.ccmNulstillet.length} | hk nulstillet: ${r.tal.hkNulstillet.length}`,
    r.tal.ccmNulstillet.length ? lst(r.tal.ccmNulstillet) : '',
    r.tal.hkNulstillet.length ? lst(r.tal.hkNulstillet) : '',
    `F-008  model udledt uden modelfelt (titel eller deeplink): ${r.deeplink.modelFraStien.length} | mærke fra deeplink: ${r.deeplink.maerkeFraStien.length} | stadig "Ukendt": ${r.deeplink.stadigUkendtMaerke} | stadig uden model: ${r.deeplink.stadigTomModel}`,
    `F-009  efterspørgsel udeladt: ${r.efterspoergsel.length}`,
    r.efterspoergsel.length ? lst(r.efterspoergsel) : '',
    `F-010  rækker med ENGROS: ${r.jargon}`,
    `F-011  mærker rettet: ${r.stavning.maerkerRettet} | modeller rettet: ${r.stavning.modellerRettet}`,
    r.stavning.eksempler.length ? lst(r.stavning.eksempler) : '',
    r.friskhed ? `F-003  median-bekræftelse ${r.friskhed.seneste}, ældste ${r.friskhed.aeldste}, ${r.friskhed.dageSiden} dage siden${r.friskhed.gammel ? ' (over 14 dage: "kan være ændret siden")' : ''}` : 'F-003  ingen sidst_set i snapshottet',
  ].filter(Boolean).join('\n');
}

function laes(sti){
  const raa = JSON.parse(fs.readFileSync(sti, 'utf8'));
  return Array.isArray(raa) ? raa : (raa && Array.isArray(raa.data) ? raa.data : null);
}

if (require.main === module){
  const args = process.argv.slice(2);
  const sti = args.find(a => !a.startsWith('--'));
  if (!sti){
    console.error('Brug: node scripts/sweep-datakvalitet.js <snapshot.json> [--json]\n(ingen netværkskald; se scripts/fixtures/eksterne-raekker-eksempel.json)');
    process.exit(2);
  }
  const raekker = laes(sti);
  if (!raekker){ console.error('Snapshottet skal være en liste af rækker eller { data: [...] }'); process.exit(2); }
  const r = sweep(raekker);
  console.log(args.includes('--json') ? JSON.stringify(r, null, 2) : tekst(r));
}

module.exports = { sweep, tekst, laes };
