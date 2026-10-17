/* Sidefamilierne for indlejret kritisk CSS (w12). En familie er en gruppe sider, der deler skabelon og
   stilark, og derfor deler kritisk udsnit. Navnene er noeglerne i scripts/kritisk-manifest.json.

   `AKTIV` er hvilke familier der FAAR indlejret kritisk CSS. Resten beholder det render-blokerende
   <link> og er byte-identiske med foer w12. En familie skal staa her af een grund: maalingen (Slow 4G,
   4x CPU, median af 5, mock) viste CLS < 0,05 OG mindst 10 % bedre mobil-FCP. Tallene staar i
   docs/review/gauntlet/builder-w12-kritisk.md. Tilfoej ikke en familie uden en ny maaling. */

const FAMILIER = [
  { navn: 'forside',      re: /^index\.html$/ },
  { navn: 'soegning',     re: /^soegning\.html$/ },
  { navn: 'annonce',      re: /^annonce(-.+)?\.html$/ },
  { navn: 'maerke',       re: /^maerke(r|-.+)?\.html$/ },
  { navn: 'type',         re: /^type-.+\.html$/ },
  { navn: 'region',       re: /^region-.+\.html$/ },
  { navn: 'koerekort',    re: /^koerekort(-.+)?\.html$/ },
  { navn: 'budget',       re: /^budget-.+\.html$/ },
  { navn: 'by',           re: /^by-.+\.html$/ },
  { navn: 'model',        re: /^model-.+\.html$/ },
  { navn: 'mc',           re: /^mc-.+\.html$/ },
  { navn: 'guide',        re: /^guides?(-.+)?\.html$/ },
  { navn: 'opret-annonce', re: /^opret-annonce\.html$/ },
  { navn: 'login',        re: /^login\.html$/ },
  { navn: 'dashboard',    re: /^dashboard\.html$/ },
];

/* Familier med indlejret kritisk CSS. Fyldes ud efter maalingen (se dokumentet). */
const AKTIV = new Set([]);

function familieFor(fil){
  const f = FAMILIER.find(x => x.re.test(fil));
  return f ? f.navn : null;
}

module.exports = { FAMILIER, AKTIV, familieFor };
