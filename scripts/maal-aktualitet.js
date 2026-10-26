#!/usr/bin/env node
/* Måler hvor frisk de indekserede annoncer er (V7, data). Kun læsning, ingen skrivning.

     node scripts/maal-aktualitet.js <snapshot.json>   fra en fil (rækker som PostgREST sender dem)
     node scripts/maal-aktualitet.js --live            henter eksterne_annoncer med den OFFENTLIGE nøgle (GET, som buildet gør)
     ... --json                                        maskinlæsbart

   Rapporterer: percentiler af alderen (dage siden sidst_set), fordeling i trin, pr. kilde, livscyklus-tilstande (crawler/livscyklus.js
   vurderLivscyklus, samme regel som js/data.js) og hvor mange annoncer, der nu får "Bekræftet for N dage siden"-mærkatet.
   Brug det FØR og EFTER en crawler-kørsel (eller efter migration 030) for at se, om aktualiteten faktisk bedres. */

const fs = require('node:fs');
const path = require('node:path');
const lc = require('../crawler/livscyklus');

const DAG = 86_400_000;

function percentil(sorteret, p){
  if (!sorteret.length) return null;
  const i = Math.min(sorteret.length - 1, Math.floor(p / 100 * sorteret.length));
  return sorteret[i];
}

function maal(raekker, nu = new Date()){
  const alder = r => (nu.getTime() - Date.parse(r.sidst_set)) / DAG;
  const gyldige = raekker.filter(r => r.sidst_set && Number.isFinite(Date.parse(r.sidst_set)));
  const dage = gyldige.map(alder).sort((a, b) => a - b);
  const trin = [[0, 7, '0-7 d'], [7, 14, '7-14 d'], [14, 30, '14-30 d'], [30, 60, '30-60 d'], [60, 90, '60-90 d'], [90, Infinity, '90+ d']];
  const fordeling = {};
  for (const [fra, til, navn] of trin) fordeling[navn] = dage.filter(d => d >= fra && d < til).length;
  const tilstande = {};
  const prKilde = {};
  for (const r of gyldige){
    const t = lc.vurderLivscyklus({ ...r, status: r.status || 'aktiv' }, nu);
    tilstande[t] = (tilstande[t] || 0) + 1;
    const k = (r.kilde && r.kilde.domaene) || 'ukendt';
    const o = prKilde[k] = prKilde[k] || { antal: 0, dage: [], over14: 0, seneste: null };
    o.antal++; o.dage.push(alder(r));
    if (alder(r) > lc.TAERSKLER.FRISK_DAGE) o.over14++;
    if (!o.seneste || r.sidst_set > o.seneste) o.seneste = r.sidst_set;
  }
  const kilder = Object.fromEntries(Object.entries(prKilde).map(([k, o]) => {
    const d = o.dage.sort((a, b) => a - b);
    return [k, { antal: o.antal, median_dage: Math.round(percentil(d, 50) * 10) / 10, aeldste_dage: Math.round(d[d.length - 1] * 10) / 10,
      over_14_dage: o.over14, andel_over_14: Math.round(100 * o.over14 / o.antal), seneste_bekraeftelse: o.seneste.slice(0, 10) }];
  }));
  const r1 = x => x == null ? null : Math.round(x * 10) / 10;
  return {
    nu: nu.toISOString(), antal: raekker.length, med_dato: gyldige.length,
    percentiler_dage: { p0: r1(percentil(dage, 0)), p25: r1(percentil(dage, 25)), p50: r1(percentil(dage, 50)), p75: r1(percentil(dage, 75)),
      p90: r1(percentil(dage, 90)), p95: r1(percentil(dage, 95)), max: r1(dage[dage.length - 1]) },
    fordeling,
    over_14_dage: dage.filter(d => d > lc.TAERSKLER.FRISK_DAGE).length,
    over_30_dage: dage.filter(d => d > lc.TAERSKLER.LANG_TID_DAGE).length,
    over_60_dage: dage.filter(d => d > 60).length,
    over_90_dage: dage.filter(d => d > lc.TAERSKLER.UDLOEB_DAGE).length,
    tilstande, kilder,
  };
}

async function hentLive(){
  const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  const sel = 'id,sidst_set,foerst_set,status,kilde:kilder(navn,domaene)';
  let alle = [];
  for (let off = 0; ; off += 1000){
    const r = await fetch(`${url}/rest/v1/eksterne_annoncer?select=${encodeURIComponent(sel)}&status=eq.aktiv&order=sidst_set.desc,id.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${off}-${off + 999}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    alle = alle.concat(d);
    if (d.length < 1000) break;
  }
  return alle;
}

module.exports = { maal, percentil };

if (require.main === module){
  (async () => {
    const arg = process.argv.slice(2);
    const raekker = arg.includes('--live') ? await hentLive() : (() => {
      const f = arg.find(a => !a.startsWith('--'));
      if (!f){ console.error('Brug: node scripts/maal-aktualitet.js <snapshot.json> | --live [--json]'); process.exit(2); }
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      return Array.isArray(j) ? j : j.data;
    })();
    const m = maal(raekker);
    if (arg.includes('--json')){ console.log(JSON.stringify(m, null, 2)); return; }
    console.log(`Annoncer: ${m.antal} (med dato: ${m.med_dato}) — målt ${m.nu.slice(0, 10)}`);
    console.log('Alder i dage, percentiler:', Object.entries(m.percentiler_dage).map(([k, v]) => `${k}=${v}`).join('  '));
    console.log('Fordeling:', Object.entries(m.fordeling).map(([k, v]) => `${k}: ${v}`).join(' · '));
    console.log(`Over 14 d: ${m.over_14_dage} (${Math.round(100 * m.over_14_dage / m.med_dato)} %) · over 30 d: ${m.over_30_dage} · over 60 d: ${m.over_60_dage} · over 90 d: ${m.over_90_dage}`);
    console.log('Tilstande:', Object.entries(m.tilstande).map(([k, v]) => `${k}: ${v}`).join(' · '));
    for (const [k, o] of Object.entries(m.kilder)) console.log(`  ${k.padEnd(16)} ${String(o.antal).padStart(4)} stk, median ${o.median_dage} d, ældste ${o.aeldste_dage} d, ${o.andel_over_14} % over 14 d, seneste ${o.seneste_bekraeftelse}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
