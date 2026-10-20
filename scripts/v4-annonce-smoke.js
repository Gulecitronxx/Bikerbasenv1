/* V4 annonce: smoke-browser (strikt, CLS 0,05) mod ALLE annoncetyper — ekstern med/uden foto og pris, markedsplads, egen med flere/ét/ingen fotos —
   i 320/375/390/430/768/1024/1440/1920, lys og mørk. smoke-browser.js selv kører kun annonce.html med ét id, så hver variant køres her.
   Kør: node scripts/v4-annonce-smoke.js [--rapport fil.json] */
const fs = require('fs');
const sb = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');

const VARIANTER = {
  'ekstern med foto (MC Syd)': uuid(1), 'ekstern 48 hk (Gul og Gratis)': uuid(13), 'ekstern uden foto': uuid(5), 'ekstern uden pris': uuid(12),
  'ekstern uden foto og pris': uuid(17), 'egen, flere fotos': uuid(901), 'egen, ét foto': uuid(902), 'egen uden foto og pris': uuid(903),
};
(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.error(kan.grund); process.exit(2); }
  const rapport = {}; let fejl = 0, adv = 0;
  for (const [navn, id] of Object.entries(VARIANTER)) {
    const r = await sb.koer({ pw: kan.pw, sider: ['annonce'], viewports: [320, 375, 390, 430, 768, 1024, 1440, 1920], temaer: ['lys', 'mørk'], cls: 0.05, stille: true, query: { 'annonce.html': `?id=${id}` } });
    rapport[navn] = r.sammenfatning; fejl += r.sammenfatning.fejl; adv += r.sammenfatning.advarsler;
    console.log(`${navn.padEnd(32)} ${r.antalMaalinger} målinger — ${r.sammenfatning.fejl} fejl, ${r.sammenfatning.advarsler} advarsler`);
    if (r.fund.length) console.log(sb.tabel(r));
  }
  const i = process.argv.indexOf('--rapport'); if (i > -1) fs.writeFileSync(process.argv[i + 1], JSON.stringify(rapport, null, 2));
  console.log(`I alt: ${fejl} fejl, ${adv} advarsler`);
  process.exit(fejl || adv ? 1 : 0);
})();
