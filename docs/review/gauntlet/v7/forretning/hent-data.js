/* V7 forretning: GET-only udtraek fra produktions-Supabase (samme laesning som build:
   anon-noeglen fra js/supabase-config.js). Skriver INTET til databasen. Gemmer kun
   aggregater i data-aggregater.json (ingen raa raekker, ingen personoplysninger). */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
async function hent(tabel, select, filter = '') {
  const rows = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(`${url}/rest/v1/${tabel}?select=${encodeURIComponent(select)}${filter}&limit=1000&offset=${fra}`, { headers: { apikey: key } });
    if (!r.ok) return { fejl: r.status + ' ' + (await r.text()).slice(0, 200), rows: [] };
    const s = await r.json(); rows.push(...s); if (s.length < 1000) break;
  }
  return { rows };
}
const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * p; const lo = Math.floor(i); return Math.round(s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo)); };
const bucket = p => p == null ? 'ingen pris' : p <= 30000 ? '<=30k' : p <= 50000 ? '30-50k' : p <= 75000 ? '50-75k' : p <= 100000 ? '75-100k' : p <= 150000 ? '100-150k' : '>150k';
(async () => {
  const ud = { hentet: new Date().toISOString() };
  const own = await hent('listings', 'id,status,price,brand,created_at', '');
  ud.egne = own.fejl ? { fejl: own.fejl } : { antal_synlige_for_anon: own.rows.length, status: own.rows.reduce((m, r) => (m[r.status] = (m[r.status] || 0) + 1, m), {}) };
  const ex = await hent('eksterne_annoncer', 'id,status,pris_dkk,maerke,type,saelgertype,foerst_set,sidst_set,aargang,km,kilde:kilder(navn,domaene)');
  if (ex.fejl) { ud.eksterne = { fejl: ex.fejl }; }
  else {
    const R = ex.rows; const akt = R.filter(r => r.status === 'aktiv');
    const talt = (arr, f) => arr.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
    const medPris = akt.filter(r => r.pris_dkk > 0);
    const over = x => medPris.filter(r => r.pris_dkk > x).length;
    ud.eksterne = {
      alle_raekker: R.length, status: talt(R, r => r.status), aktive: akt.length,
      aktive_pr_kilde: talt(akt, r => r.kilde ? r.kilde.domaene : '?'),
      aktive_pr_saelgertype: talt(akt, r => r.saelgertype || 'ikke oplyst'),
      aktive_med_pris: medPris.length,
      pris_percentiler: { p10: q(medPris.map(r => r.pris_dkk), .1), p25: q(medPris.map(r => r.pris_dkk), .25), median: q(medPris.map(r => r.pris_dkk), .5), p75: q(medPris.map(r => r.pris_dkk), .75), p90: q(medPris.map(r => r.pris_dkk), .9) },
      pris_baand: talt(akt, r => bucket(r.pris_dkk > 0 ? r.pris_dkk : null)),
      andel_over: { '100000': over(100000) / medPris.length, '75000': over(75000) / medPris.length, '150000': over(150000) / medPris.length, '50000': over(50000) / medPris.length },
      antal_over_100k: over(100000),
      pris_baand_pr_saelgertype: {},
      pr_type: {}, pr_maerke: {},
    };
    for (const st of ['privat', 'forhandler', 'ikke oplyst']) {
      const sub = medPris.filter(r => (r.saelgertype || 'ikke oplyst') === st);
      ud.eksterne.pris_baand_pr_saelgertype[st] = { antal: sub.length, over_100k: sub.filter(r => r.pris_dkk > 100000).length, median: q(sub.map(r => r.pris_dkk), .5) };
    }
    const grp = (f, maal) => { const g = {}; medPris.forEach(r => { const k = f(r) || 'ukendt'; (g[k] = g[k] || []).push(r.pris_dkk); }); const o = {}; Object.entries(g).sort((a, b) => b[1].length - a[1].length).slice(0, maal).forEach(([k, v]) => o[k] = { antal: v.length, median: q(v, .5), andel_over_100k: +(v.filter(x => x > 100000).length / v.length).toFixed(3), andel_30_100k: +(v.filter(x => x > 30000 && x <= 100000).length / v.length).toFixed(3) }); return o; };
    ud.eksterne.pris_baand_pr_kilde = {};
    for (const dom of Object.keys(ud.eksterne.aktive_pr_kilde)) {
      const sub = medPris.filter(r => r.kilde && r.kilde.domaene === dom); const b = {};
      sub.forEach(r => { const k = bucket(r.pris_dkk); b[k] = (b[k] || 0) + 1; });
      ud.eksterne.pris_baand_pr_kilde[dom] = { med_pris: sub.length, median: q(sub.map(r => r.pris_dkk), .5), over_100k: sub.filter(r => r.pris_dkk > 100000).length, andel_over_100k: +(sub.filter(r => r.pris_dkk > 100000).length / sub.length).toFixed(3), andel_99_900_til_100k: +(sub.filter(r => r.pris_dkk >= 95000 && r.pris_dkk <= 100000).length / sub.length).toFixed(3), baand: b };
    }
    ud.eksterne.pr_type = grp(r => r.type, 12); ud.eksterne.pr_maerke = grp(r => r.maerke, 15);
    // levetid: foerst_set -> sidst_set for ikke-aktive raekker (proxy: tid fra foerste til sidste crawl-observation)
    const dage = (a, b) => (new Date(b) - new Date(a)) / 864e5;
    const inakt = R.filter(r => r.status !== 'aktiv' && r.foerst_set && r.sidst_set);
    ud.eksterne.levetid_inaktive = { antal: inakt.length, median_dage: inakt.length ? +q(inakt.map(r => dage(r.foerst_set, r.sidst_set)), .5).toFixed(0) : null, p25: inakt.length ? q(inakt.map(r => dage(r.foerst_set, r.sidst_set)), .25) : null, p75: inakt.length ? q(inakt.map(r => dage(r.foerst_set, r.sidst_set)), .75) : null };
    const foerst = R.map(r => r.foerst_set).filter(Boolean).sort();
    ud.eksterne.crawl_spaend = { aeldste_foerst_set: foerst[0], nyeste_foerst_set: foerst[foerst.length - 1] };
    ud.eksterne.alder_aktive_dage = akt.length ? { median: Math.round(q(akt.map(r => dage(r.foerst_set, new Date())), .5)), p75: Math.round(q(akt.map(r => dage(r.foerst_set, new Date())), .75)) } : null;
  }
  const pp = await hent('public_profiles', 'id,is_dealer');
  ud.profiler = pp.fejl ? { fejl: pp.fejl } : { antal: pp.rows.length, forhandlere: pp.rows.filter(r => r.is_dealer).length };
  fs.writeFileSync(path.join(__dirname, 'data-aggregater.json'), JSON.stringify(ud, null, 2));
  console.log(JSON.stringify(ud, null, 2));
})();
