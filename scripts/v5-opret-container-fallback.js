/* V5 QA (F8): media-query-fallback til opret-annonce's @container opform-regler.
   Safari < 16, Firefox < 110 og Chrome < 105 kender ikke container queries og ignorerer hele @container-blokken; formulargitteret
   (.op-grid-2/3/4), delingerne (.op-split*) og fotosektionen falder så til 1 kolonne (+1162 px ved 1440, +623 px ved 375).
   Containeren er .op-form; dens indholdsbredde er en funktion af viewporten (to kolonner med 340 px sidepanel fra 1024 px,
   derfor ikke monoton). Tærsklerne herunder er MÅLT i Chromium (se js/v5-opret-container-fallback.test.js, som genmåler dem):
     container >= 280 px  <=>  viewport >= 346 px
     container >= 640 px  <=>  viewport 722-1023 px eller >= 1118 px
     container >= 700 px  <=>  viewport 814-1023 px eller >= 1178 px
   Fallbacken indsættes LIGE EFTER hver @container-blok (samme plads i kaskaden) som
   @supports not (container-type:inline-size){ @media <tærskel>{ <samme regler> } }.
   Generatoren er idempotent: `node scripts/v5-opret-container-fallback.js` omskriver css/p-opret.css; testen kræver at filen er i sync. */
const fs = require('fs');
const path = require('path');

const FIL = path.join(__dirname, '..', 'css', 'p-opret.css');
const MAERKE = '/*F8-fallback*/';
const START = `@supports not (container-type:inline-size){ ${MAERKE}`;
const MEDIA = {
  280: '(min-width:346px)',
  640: '(min-width:722px) and (max-width:1023px), (min-width:1118px)',
  700: '(min-width:814px) and (max-width:1023px), (min-width:1178px)',
};

function slutPaaBlok(s, aabenIdx) {   // index af den matchende } for { ved aabenIdx
  let d = 0;
  for (let i = aabenIdx; i < s.length; i++) { if (s[i] === '{') d++; else if (s[i] === '}') { d--; if (d === 0) return i; } }
  return -1;
}

function fjernFallback(css) {
  let ud = css, i;
  while ((i = ud.indexOf(START)) !== -1) {
    const aaben = ud.indexOf('{', i);
    const slut = slutPaaBlok(ud, aaben);
    const eol = ud.slice(0, i).endsWith('\r\n') ? 2 : (ud.slice(0, i).endsWith('\n') ? 1 : 0);
    ud = ud.slice(0, i - eol) + ud.slice(slut + 1);
  }
  return ud;
}

function generer(css) {
  const eol = css.includes('\r\n') ? '\r\n' : '\n';
  const ren = fjernFallback(css);
  let ud = '', pos = 0;
  const re = /@container opform \(min-width:\s*(\d+)px\)\s*\{/g;
  for (let m; (m = re.exec(ren));) {
    const aaben = m.index + m[0].length - 1;
    const slut = slutPaaBlok(ren, aaben);
    const krop = ren.slice(aaben + 1, slut);
    if (!MEDIA[m[1]]) throw new Error('ingen media-tærskel for ' + m[1]);
    ud += ren.slice(pos, slut + 1) + eol + START + eol + '@media ' + MEDIA[m[1]] + '{' + krop + '}' + eol + '}';
    pos = slut + 1;
    re.lastIndex = slut + 1;
  }
  return ud + ren.slice(pos);
}

module.exports = { generer, fjernFallback, MEDIA, FIL, START };

if (require.main === module) {
  const nu = fs.readFileSync(FIL, 'utf8');
  const ny = generer(nu);
  if (ny !== nu) { fs.writeFileSync(FIL, ny); console.log('css/p-opret.css opdateret'); } else console.log('css/p-opret.css er allerede i sync');
}
