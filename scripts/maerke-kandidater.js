#!/usr/bin/env node
/* Mærkekandidater: hvilke mærkenavne i annoncekilderne er IKKE i mærkeregistret (js/brands-registry.js), og hvad skal der ske med dem?

   Et nyt navn fra en kilde bliver ALDRIG et mærke af sig selv (parserfejl, modelnavne og stavefejl ville ellers blive til mærkesider og
   filterpiller). Annoncen står som "Uoplyst mærke", og navnet vurderes her:
       afvist     generisk ord, modelnavn/titel, eller sandsynlig stavefejl af et registreret mærke (løsning: et alias)
       afventer   ser ud som et mærke, men er set < N gange
       kandidat   ser ud som et mærke og er set >= N gange: slå det op, tilføj belæg (kilder) og én post i MAERKER i js/brands-registry.js
   Rapporten er det eneste, scriptet producerer. Det ændrer hverken registret, siderne eller databasen.

   Brug:
     node scripts/maerke-kandidater.js                  analysér snapshot (scripts/fixtures/maerke-lager.json), skriv rapport til stdout
     node scripts/maerke-kandidater.js --live           hent lageret fra produktions-Supabase (KUN læsning, som build gør)
     node scripts/maerke-kandidater.js --live --gem     ... og opdatér snapshotet
     node scripts/maerke-kandidater.js --min 5          kræv 5 forekomster (standard 3)
     node scripts/maerke-kandidater.js --md <fil>       skriv rapporten som markdown til filen

   Afslutter med kode 0 også ved kandidater (det er en rapport, ikke en gate); kode 1 kun ved fejl. */

const fs = require('fs');
const path = require('path');
const R = require('../js/brands-registry.js');

const ROOT = path.join(__dirname, '..');
const SNAPSHOT = path.join(__dirname, 'fixtures', 'maerke-lager.json');

/* rows: rå eksterne_annoncer-rækker ({ maerke, titel, model, url, ... }). `browser` = scripts/shared.js browserModules(). */
function analyser(rows, valg) {
  const o = valg || {};
  const B = o.browser;
  const min = o.min == null ? R.MIN_FOREKOMSTER_KANDIDAT : o.min;
  const raa = new Map();
  for (const r of rows) {
    const k = r.maerke == null || String(r.maerke).trim() === '' ? '(tomt)' : String(r.maerke).trim();
    raa.set(k, (raa.get(k) || 0) + (r.antal || 1));
  }
  const modelNoegler = new Set();
  if (o.modeller) for (const liste of Object.values(o.modeller)) for (const m of liste) modelNoegler.add(R.noegle(m));
  const vurderinger = [...raa].map(([navn, antal]) => R.vurderKandidat(navn === '(tomt)' ? '' : navn, antal, { min, modelNoegler }));
  vurderinger.forEach((v, i) => { v.raa = [...raa.keys()][i]; });

  /* Hvad blev annoncerne til efter bro-normaliseringen? */
  const mapning = new Map();   // rå -> { brand -> antal }
  const uoplyst = [];
  let samlet = 0;
  if (B) {
    for (const r of rows) {
      const l = B.normalizeExternalListing(Object.assign({ kilde: {} }, r));
      const k = r.maerke == null || String(r.maerke).trim() === '' ? '(tomt)' : String(r.maerke).trim();
      const m = mapning.get(k) || {};
      m[l.brand] = (m[l.brand] || 0) + (r.antal || 1);
      mapning.set(k, m);
      samlet += r.antal || 1;
      if (R.erUkendt(l.brand)) uoplyst.push({ titel: r.titel || '', raa: r.maerke == null ? '' : r.maerke, url: r.url || '' });
    }
  }
  const tilstande = {};
  for (const v of vurderinger) tilstande[v.tilstand] = (tilstande[v.tilstand] || 0) + v.antal;
  return {
    antal: samlet || rows.reduce((s, r) => s + (r.antal || 1), 0), raaNavne: raa.size, min, vurderinger,
    mapning: [...mapning].map(([raaNavn, m]) => ({ raa: raaNavn, til: m })),
    kandidater: vurderinger.filter(v => v.tilstand === 'kandidat'),
    afventer: vurderinger.filter(v => v.tilstand === 'afventer'),
    afviste: vurderinger.filter(v => v.tilstand === 'afvist'),
    uoplyst,
  };
}

function rapport(a) {
  const L = [];
  L.push(`Mærkekandidater — ${a.antal} annoncer, ${a.raaNavne} forskellige mærkenavne hos kilderne (kræver ${a.min} forekomster for at blive kandidat)`);
  const aendret = a.mapning.filter(m => Object.keys(m.til).some(b => b !== m.raa));
  if (aendret.length) {
    L.push('', 'Navne, der normaliseres til et registreret mærke (alias/stavemåde):');
    for (const m of aendret) L.push(`  ${m.raa} -> ${Object.entries(m.til).map(([b, n]) => `${b} (${n})`).join(', ')}`);
  }
  L.push('', `KANDIDATER (${a.kandidater.length}):`);
  for (const v of a.kandidater) L.push(`  ${v.navn} (${v.antal}) — ${v.aarsag}`);
  L.push('', `AFVENTER (${a.afventer.length}):`);
  for (const v of a.afventer) L.push(`  ${v.navn} (${v.antal}) — ${v.aarsag}`);
  L.push('', `AFVIST (${a.afviste.length}):`);
  for (const v of a.afviste) L.push(`  ${v.navn} (${v.antal}) — ${v.aarsag}`);
  L.push('', `Annoncer uden registreret mærke ("Uoplyst mærke"): ${a.uoplyst.length}`);
  for (const u of a.uoplyst) L.push(`  "${u.titel}" (kildens mærke: ${u.raa || 'tomt'})`);
  return L.join('\n');
}

function markdown(a) {
  const tabel = (liste) => liste.length ? ['| Navn hos kilden | Antal | Vurdering |', '|---|---|---|', ...liste.map(v => `| ${v.navn} | ${v.antal} | ${v.aarsag} |`)].join('\n') : '_Ingen._';
  return [`# Mærkekandidater`, '',
    `${a.antal} annoncer, ${a.raaNavne} forskellige mærkenavne hos kilderne. Et nyt navn bliver kun kandidat ved mindst ${a.min} forekomster og forbliver en rapportlinje, til en menneskelig registerpost gør det til et mærke.`, '',
    `## Kandidater (${a.kandidater.length})`, '', tabel(a.kandidater), '',
    `## Afventer (${a.afventer.length})`, '', tabel(a.afventer), '',
    `## Afvist (${a.afviste.length})`, '', tabel(a.afviste), '',
    `## Annoncer uden registreret mærke (${a.uoplyst.length})`, '',
    a.uoplyst.length ? a.uoplyst.map(u => `- "${u.titel}" (kildens mærke: ${u.raa || 'tomt'})`).join('\n') : '_Ingen._', ''].join('\n');
}

function laesSnapshot() {
  return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
}
/* Snapshot: kun det, analysen behøver — de rå mærkenavne med antal, samt de annoncer, hvor mærket ikke kan læses af registret. */
function bygSnapshot(rows, B) {
  const tael = new Map();
  for (const r of rows) {
    const k = r.maerke == null ? '' : String(r.maerke);
    tael.set(k, (tael.get(k) || 0) + 1);
  }
  const eksempler = [];
  for (const r of rows) {
    const l = B.normalizeExternalListing(Object.assign({ kilde: {} }, r));
    if (R.erUkendt(l.brand) || !R.erKendt(r.maerke)) {
      eksempler.push({ maerke: r.maerke == null ? null : r.maerke, titel: r.titel || '', model: r.model || null, url: r.url || '' });
    }
  }
  // et eksempel pr. rå mærkenavn, så en test kan afprøve hver stavemåde mod den rigtige bro
  const pr = new Map();
  for (const r of rows) {
    const k = r.maerke == null ? '' : String(r.maerke);
    if (!pr.has(k)) pr.set(k, { maerke: r.maerke == null ? null : r.maerke, titel: r.titel || '', model: r.model || null, url: r.url || '' });
  }
  return { dato: new Date().toISOString().slice(0, 10), antal: rows.length, raa: [...tael].map(([maerke, antal]) => ({ maerke, antal })).sort((a, b) => b.antal - a.antal),
    proever: [...pr.values()], uoplyst: eksempler };
}
/* Snapshot -> rækker (hver rå post gentaget `antal` gange, med den ægte prøve for hver stavemåde). */
function snapshotRaekker(snap) {
  const prove = new Map(snap.proever.map(p => [p.maerke == null ? '' : p.maerke, p]));
  const gruppe = new Map();
  for (const u of snap.uoplyst || []) { const k = u.maerke == null ? '' : u.maerke; (gruppe.get(k) || gruppe.set(k, []).get(k)).push(u); }
  const raekker = [];
  for (const { maerke, antal } of snap.raa) {
    const egne = gruppe.get(maerke) || [];
    for (const u of egne) raekker.push(Object.assign({}, u, { antal: 1 }));
    if (antal > egne.length) { const p = prove.get(maerke) || { maerke }; raekker.push(Object.assign({}, p, { antal: antal - egne.length })); }
  }
  return raekker;
}

async function main(argv) {
  const live = argv.includes('--live');
  const mi = argv.indexOf('--min');
  const min = mi >= 0 ? Number(argv[mi + 1]) : undefined;
  const mdi = argv.indexOf('--md');
  const { browserModules, fetchExternalListings } = require('./shared');
  const B = browserModules();
  const data = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
  const modeller = new Function(data + '\n;return MODELLER_PR_MAERKE;')();
  let rows;
  if (live) {
    rows = await fetchExternalListings();
    if (argv.includes('--gem')) { fs.writeFileSync(SNAPSHOT, JSON.stringify(bygSnapshot(rows, B), null, 1) + '\n'); console.log('Snapshot opdateret: ' + path.relative(ROOT, SNAPSHOT)); }
  } else rows = snapshotRaekker(laesSnapshot());
  const a = analyser(rows, { browser: B, modeller, min });
  console.log(rapport(a));
  if (mdi >= 0 && argv[mdi + 1]) fs.writeFileSync(path.resolve(argv[mdi + 1]), markdown(a));
  return 0;
}

if (require.main === module) main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e.message || e); process.exit(1); });
module.exports = { analyser, rapport, markdown, bygSnapshot, snapshotRaekker, SNAPSHOT };
