/* V7 forretning: oekonomimodel. Alle input er ANTAGELSER (markeret), undtagen
   Stripe-satser (stripe.com/en-dk/pricing, 26.10.2026) og moms (25 %).
   Koer: node model.js  -> skriver scenarier.json + scenarier.csv + tornado.csv og printer tabeller. */
const fs = require('fs');
const MOMS = 1.25;
const stripe = brutto => 0.019 * brutto + 1.8;          // 1,5 % + 1,80 kr (EEA-standard) hævet til 1,9 % for kortmix (ANTAGELSE)
const SUPPORT = 4;                                       // kr pr. betalende transaktion (ANTAGELSE: 0,15 henvendelser x 25 kr)
const FAST = 1500;                                       // kr/md drift (ANTAGELSE, ikke verificeret mod fakturaer)
const LOEN = 25000;                                      // kr/md til en "solo-loen" (ANTAGELSE, kun som referencepunkt)

const scen = {
  pess: { N: 15, s: 0.25, c: 0.25, g: 0.20, per: 1.0, ref: 0.08, boostA: 0.01, dealers: 1,  churn: 0.05, visits: 2000,  ctr: 0.005, lead: 0.10, prov: 40 },
  base: { N: 60, s: 0.36, c: 0.50, g: 0.12, per: 1.2, ref: 0.05, boostA: 0.04, dealers: 6,  churn: 0.03, visits: 10000, ctr: 0.010, lead: 0.15, prov: 75 },
  opt:  { N: 250, s: 0.45, c: 0.70, g: 0.06, per: 1.4, ref: 0.03, boostA: 0.08, dealers: 20, churn: 0.02, visits: 40000, ctr: 0.020, lead: 0.20, prov: 120 },
};
const PRIS_A = 169, PRIS_BOOST = 59, PRIS_DEALER = 199;   // kr inkl. moms (A, B) / ekskl. moms (dealer)

function netto(brutto, ref) { const n = brutto / MOMS; return n * (1 - ref) - stripe(brutto) - SUPPORT; }

// A: gratis <=100k, betaling over. Maanedlig nettoindtaegt i steady state (maaned 12).
function modelA(p, o = {}) {
  const pris = o.pris ?? PRIS_A;
  const betalende = p.N * p.s * (1 - p.g) * p.c;
  const tabt = p.N * p.s * (1 - p.g) * (1 - p.c);        // annoncer over graensen der ikke bliver oprettet
  return { betalende, tabt, md: betalende * p.per * netto(pris, p.ref), N_effektiv: p.N - tabt };
}
function modelB(p, o = {}) { const pris = o.pris ?? PRIS_BOOST; const k = p.N * p.boostA; return { betalende: k, tabt: 0, md: k * netto(pris, p.ref) }; }
function modelC(p) { const a = modelA(p), b = modelB({ ...p, N: a.N_effektiv }); return { betalende: a.betalende + b.betalende, tabt: a.tabt, md: a.md + b.md + a.betalende * 0.10 * netto(PRIS_BOOST, p.ref) }; }
function dealer(p) { const brutto = PRIS_DEALER * MOMS; const per = PRIS_DEALER * (1 - p.ref * 0) - (0.025 * brutto + 1.8) - SUPPORT; return { dealere: p.dealers, md: p.dealers * per }; }
function affiliate(p) { return { leads: p.visits * 0.4 * p.ctr * p.lead, md: p.visits * 0.4 * p.ctr * p.lead * p.prov }; }
const rampAar = md12 => md12 * 6.5;                       // lineaer optrapning 1/12..12/12 over 12 maaneder

const ud = { antagelser: { MOMS, stripe: '1,9 % + 1,80 kr', SUPPORT, FAST, LOEN, PRIS_A, PRIS_BOOST, PRIS_DEALER }, scenarier: {} };
const rows = [['scenarie', 'model', 'betalende_pr_md', 'tabte_annoncer_pr_md', 'netto_md_steady_kr', 'netto_aar1_med_optrapning_kr', 'netto_aar_steady_kr']];
for (const [navn, p] of Object.entries(scen)) {
  const A = modelA(p), B = modelB(p), C = modelC(p), E = dealer(p), F = affiliate(p);
  // D: gratis de foerste 6 maaneder, derefter A. Aar 1 = kun maaned 7-12 (optrapning 7..12 /12 af steady). 24 mdr = maaned 7-24.
  const aar1D = A.md * (7 + 8 + 9 + 10 + 11 + 12) / 12;
  const mdr24D = aar1D + A.md * 12;
  ud.scenarier[navn] = { input: p, A, B, C, D: { aar1: aar1D, mdr24: mdr24D, tabt_pr_md: A.tabt }, dealer: E, affiliate: F,
    break_even_A_fast: FAST / (A.md / Math.max(p.N, 1)) , };
  rows.push([navn, 'A freemium', A.betalende.toFixed(1), A.tabt.toFixed(1), A.md.toFixed(0), rampAar(A.md).toFixed(0), (A.md * 12).toFixed(0)]);
  rows.push([navn, 'B gratis+synlighed', B.betalende.toFixed(1), 0, B.md.toFixed(0), rampAar(B.md).toFixed(0), (B.md * 12).toFixed(0)]);
  rows.push([navn, 'C hybrid', C.betalende.toFixed(1), C.tabt.toFixed(1), C.md.toFixed(0), rampAar(C.md).toFixed(0), (C.md * 12).toFixed(0)]);
  rows.push([navn, 'D intro 6 md', A.betalende.toFixed(1), A.tabt.toFixed(1), A.md.toFixed(0), aar1D.toFixed(0), (A.md * 12).toFixed(0)]);
  rows.push([navn, 'E forhandler 199/md', E.dealere, 0, E.md.toFixed(0), rampAar(E.md).toFixed(0), (E.md * 12).toFixed(0)]);
  rows.push([navn, 'F affiliate', F.leads.toFixed(1), 0, F.md.toFixed(0), rampAar(F.md).toFixed(0), (F.md * 12).toFixed(0)]);
}
fs.writeFileSync('scenarier.csv', rows.map(r => r.join(';')).join('\n'));

// Tornado paa model A, base. Aarlig steady-state netto (kr) naar en parameter flyttes til pess/opt-vaerdi.
const base = scen.base, baseA = modelA(base).md * 12;
const par = [['Nye egne annoncer/md (N)', 'N', 15, 250], ['Andel over 100k (s)', 's', 0.25, 0.45], ['Betalingskonvertering (c)', 'c', 0.25, 0.70], ['Graense-gaming (g)', 'g', 0.20, 0.06], ['Betalte perioder pr. annonce', 'per', 1.0, 1.4], ['Refusion', 'ref', 0.08, 0.03]];
const tor = [['parameter', 'lav_vaerdi', 'hoej_vaerdi', 'aarlig_netto_lav', 'aarlig_netto_hoej', 'spaend']];
for (const [lbl, k, lo, hi] of par) { const l = modelA({ ...base, [k]: lo }).md * 12, h = modelA({ ...base, [k]: hi }).md * 12; tor.push([lbl, lo, hi, l.toFixed(0), h.toFixed(0), (h - l).toFixed(0)]); }
{ const l = modelA(base, { pris: 129 }).md * 12, h = modelA(base, { pris: 219 }).md * 12; tor.push(['Pris (129 / 219 kr)', 129, 219, l.toFixed(0), h.toFixed(0), (h - l).toFixed(0)]); }
fs.writeFileSync('tornado.csv', tor.map(r => r.join(';')).join('\n'));

// Break-even (model A, base-parametre undtagen N): nye egne annoncer/md for at daekke FAST resp. LOEN
const perAnn = modelA({ ...base, N: 1 }).md; // netto kr pr. ny egen annonce
ud.break_even = { netto_kr_pr_ny_egen_annonce: perAnn, nye_annoncer_md_for_FAST: FAST / perAnn, nye_annoncer_md_for_LOEN: LOEN / perAnn, forhandlere_for_FAST: FAST / dealer({ ...base, dealers: 1 }).md, forhandlere_for_LOEN: LOEN / dealer({ ...base, dealers: 1 }).md };
ud.baseA_aar = baseA;
fs.writeFileSync('scenarier.json', JSON.stringify(ud, null, 2));
console.log(rows.map(r => r.join(' | ')).join('\n'));
console.log('\nTORNADO (A base, aarlig netto', baseA.toFixed(0), 'kr)'); console.log(tor.map(r => r.join(' | ')).join('\n'));
console.log('\nBREAK-EVEN', JSON.stringify(ud.break_even, null, 1));
console.log('netto pr. betalende annonce A:', netto(PRIS_A, 0.05).toFixed(1), ' stripe:', stripe(PRIS_A).toFixed(1));
