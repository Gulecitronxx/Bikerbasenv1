/* V4 annonce: smoke-browser (strikt, CLS 0,05) mod ALLE annoncetyper — ekstern med/uden foto og pris, markedsplads, egen med flere/ét/ingen fotos —
   i 320/375/390/430/768/1024/1440/1920, lys og mørk. smoke-browser.js selv kører kun annonce.html med ét id, så hver variant køres her.
   Kør: node scripts/v4-annonce-smoke.js [--rapport fil.json] [--gentag N] [--kun "ekstern med foto"]
   Hvert fund gemmes med fuld tekst (tjek, detalje, viewport, tema, kørsel), så en sjælden fejl kan fanges og ikke kun tælles. */
const fs = require('fs');
const sb = require('./smoke-browser');
const { uuid } = require('./smoke-fixtures');

const VARIANTER = {
  'ekstern med foto (MC Syd)': uuid(1), 'ekstern 48 hk (Gul og Gratis)': uuid(13), 'ekstern uden foto': uuid(5), 'ekstern uden pris': uuid(12),
  'ekstern uden foto og pris': uuid(17), 'egen, flere fotos': uuid(901), 'egen, ét foto': uuid(902), 'egen uden foto og pris': uuid(903),
};
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
(async () => {
  const kan = await sb.playwrightTilgaengelig();
  if (!kan.ok) { console.error(kan.grund); process.exit(2); }
  const gentag = Number(arg('--gentag', 1)), kun = arg('--kun', '');
  const rapport = { sammenfatning: {}, fund: [] }; let fejl = 0, adv = 0, maalinger = 0;
  for (let k = 1; k <= gentag; k++) for (const [navn, id] of Object.entries(VARIANTER)) {
    if (kun && !navn.includes(kun)) continue;
    const maal = () => sb.koer({ pw: kan.pw, sider: ['annonce'], viewports: [320, 375, 390, 430, 768, 1024, 1440, 1920], temaer: ['lys', 'mørk'], cls: 0.05, stille: true, query: { 'annonce.html': `?id=${id}` } });
    let r = await maal();
    /* Kendt, bevist OS-støj (docs/review/gauntlet/v4/annonce/konsol-ERR_NO_BUFFER_SPACE.json): under belastning kan Windows' loopback løbe tør for
       bufferplads, og Chromium logger 'Failed to load resource: net::ERR_NO_BUFFER_SPACE' for en LOKAL fil (fx logo-mark.png). smoke-browser tæller
       det som konsolfejl. Er det det ENESTE fund, måles varianten igen én gang; fundet gemmes stadig i rapporten som 'transient'. */
    const kunBuffer = x => x.fund.length && x.fund.every(f => f.tjek === 'konsolfejl' && /ERR_NO_BUFFER_SPACE/.test(f.detalje));
    if (kunBuffer(r)){
      for (const f of r.fund) rapport.fund.push({ variant: navn, kørsel: k, transient: true, ...f });
      console.log(`TRANSIENT (ERR_NO_BUFFER_SPACE, OS) — ${navn}: måler igen`);
      r = await maal();
    }
    const s = (rapport.sammenfatning[navn] = rapport.sammenfatning[navn] || { fejl: 0, advarsler: 0, maalinger: 0 });
    s.fejl += r.sammenfatning.fejl; s.advarsler += r.sammenfatning.advarsler; s.maalinger += r.antalMaalinger;
    fejl += r.sammenfatning.fejl; adv += r.sammenfatning.advarsler; maalinger += r.antalMaalinger;
    for (const f of r.fund) rapport.fund.push({ variant: navn, kørsel: k, ...f });
    if (gentag === 1) console.log(`${navn.padEnd(32)} ${r.antalMaalinger} målinger — ${r.sammenfatning.fejl} fejl, ${r.sammenfatning.advarsler} advarsler`);
  }
  for (const f of rapport.fund) console.log(`FUND: ${f.variant} kørsel ${f.kørsel} ${f.viewport}px ${f.tema} [${f.tjek}] ${f.detalje}`);
  if (arg('--rapport')) fs.writeFileSync(arg('--rapport'), JSON.stringify(rapport, null, 2));
  console.log(`I alt: ${maalinger} målinger, ${fejl} fejl, ${adv} advarsler`);
  process.exit(fejl || adv ? 1 : 0);
})();
