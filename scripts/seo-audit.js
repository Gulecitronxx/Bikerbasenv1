/* Rapport over title, description, h1 og sitemap for ALLE html-sider i roden.

   Kør:  node scripts/seo-audit.js          (læsbar tabel + fund)
         node scripts/seo-audit.js --json   (maskinlæsbar)

   Rører ingen filer. Samme regler som scripts/seo-krav.test.js, men som en rapport, der viser
   HVOR MEGET der er galt, ikke kun at noget er. Bruges til at rette de værste titler (S-022). */

const fs = require('fs');
const path = require('path');
const { sideFakta } = require('./seo-vagt');

const ROOT = path.join(__dirname, '..');
const TITEL_MAX = 60;       // ca. hvad Google viser, før den afkorter
const BESK_MIN = 70, BESK_MAX = 160;

function analyser(root = ROOT){
  const sider = [];
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html')).sort()){
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    const fakta = sideFakta(html);
    const h1 = (html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    sider.push({ fil: f, ...fakta, h1Tekst: h1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
  }
  const indekserbare = sider.filter(s => !s.noindex);
  const dubletter = felt => {
    const m = new Map();
    for (const s of indekserbare) if (s[felt]) m.set(s[felt], [...(m.get(s[felt]) || []), s.fil]);
    return [...m.values()].filter(v => v.length > 1);
  };
  return {
    sider,
    fund: {
      titelForLang: indekserbare.filter(s => s.titel.length > TITEL_MAX).map(s => [s.fil, s.titel.length]),
      beskForKort: indekserbare.filter(s => s.beskrivelse.length < BESK_MIN).map(s => [s.fil, s.beskrivelse.length]),
      beskForLang: indekserbare.filter(s => s.beskrivelse.length > BESK_MAX).map(s => [s.fil, s.beskrivelse.length]),
      mangler: indekserbare.filter(s => !s.titel || !s.beskrivelse).map(s => s.fil),
      h1Forkert: indekserbare.filter(s => s.h1 !== 1).map(s => [s.fil, s.h1]),
      dubletTitel: dubletter('titel'),
      dubletBeskrivelse: dubletter('beskrivelse'),
      dubletH1: dubletter('h1Tekst'),
    },
  };
}

if (require.main === module){
  const r = analyser();
  if (process.argv.includes('--json')){ console.log(JSON.stringify(r, null, 1)); process.exit(0); }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`${pad('fil', 52)} ${pad('idx', 7)} ${pad('titel', 6)} ${pad('besk', 6)} h1`);
  for (const s of r.sider) console.log(`${pad(s.fil, 52)} ${pad(s.noindex ? 'noindex' : 'index', 7)} ${pad(s.titel.length, 6)} ${pad(s.beskrivelse.length, 6)} ${s.h1}`);
  console.log('\nFund (kun indekserbare sider):');
  for (const [k, v] of Object.entries(r.fund)) console.log(`  ${pad(k, 18)} ${v.length ? JSON.stringify(v) : 'ingen'}`);
  const antal = Object.values(r.fund).reduce((s, v) => s + v.length, 0);
  console.log(`\n${r.sider.length} sider, ${r.sider.filter(s => !s.noindex).length} indekserbare, ${antal} fund.`);
}

module.exports = { analyser, TITEL_MAX, BESK_MIN, BESK_MAX };
