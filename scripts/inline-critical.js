/* Indlejrer den kritiske (above-the-fold) CSS på HVER side og gør resten af
   styles.css ikke-render-blokerende. Kører sidst i byggekæden (efter
   stamp-version), så den arbejder på den friske ?v=.

   Hvorfor: styles.css er 110KB og render-blokerende. Forsiden fik det fikset
   i runde 3-4 (LCP 3.5s → 2.1s); søgesiden ventede stadig ~1.4s på hele arket
   før første maling. Nu får alle sider samme behandling.

   Hvordan: styles.css er allerede opdelt i navngivne sektionsoverskrifter
   (kommentarlinjer med lighedstegn omkring navnet). Hver side får kun de
   sektioner, der tegner dens above-the-fold — resten kommer med det
   asynkrone ark. Sektioner
   udskrives altid i filens egen rækkefølge, så kaskaden er uændret.

   Idempotent: markøren <style id="critical"> genskrives, og stylesheet-linket
   skiftes kun til preload-swap, hvis det stadig er et almindeligt stylesheet. */

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

/* ---- 1. Opdel styles.css i navngivne sektioner ---- */
const cssLines = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8').split(/\r?\n/);
const sections = [];
cssLines.forEach((line, i) => {
  const m = line.match(/^\/\*\s*=+\s*(.+?)\s*=+/);
  if (m) sections.push({ name: m[1], start: i });
});
sections.forEach((s, i) => { s.end = i + 1 < sections.length ? sections[i + 1].start : cssLines.length; });
if (!sections.length) throw new Error('inline-critical: fandt ingen sektionsmarkører i styles.css');

/* ---- 2. Hvad er above-the-fold hvor? ----
   Navnene matches på præfiks, så de lange sektionsoverskrifter kan forkortes. */
/* Footeren er sjældent above-the-fold, men den er billig (1.4KB) og holder
   dokumenthøjden stabil, når det fulde ark lander — ellers hopper alt under
   folden, så snart brugeren scroller. */
const BASE = ['Design tokens', 'Reset', 'Buttons', 'Formularfelter', 'Sektionslayout', 'Header', 'Footer'];

const PAGES = [
  // Forsiden: uændret fra runde 4 (headeren hen over hero-fotoet + footeren,
  // som ligger mellem dem i arket). Rør den ikke — dens LCP er målt grøn.
  [/^index\.html$/, ['Hero']],
  // Søgesiden: filterlayout + første række kort er det man ser.
  // NB: 'Swipe-visning' skal med — .view-toggle og .mobile-filter-btn står
  // i den sektion, og uden dem er værktøjslinjen 137px højere ved første
  // maling end bagefter (målt CLS 0.31).
  [/^soegning\.html$/, ['Utility', 'Cards / listings grid', 'Search / filter layout',
    'Breadcrumb', 'Bike art', 'Swipe-visning', 'Search enhancements',
    'Mobil: værktøjslinje', 'Touch-mål']],
  // Annoncesider (incl. de genererede annonce-<slug>.html): galleri + specs.
  [/^annonce(-.+)?\.html$/, ['Utility', 'Breadcrumb', 'Listing detail', 'Bike art',
    'Trust & safety', 'Reviews', 'Modal', 'Forms', 'Touch-mål']],
  // Mærkesider (genererede) + mærkeoversigten.
  [/^maerke(r|-.+)?\.html$/, ['Utility', 'Breadcrumb', 'Cards / listings grid', 'Bike art',
    'Brand landing pages', 'Popular searches']],
  [/^forhandler\.html$/, ['Utility', 'Breadcrumb', 'Profile / dealer page', 'Cards / listings grid',
    'Bike art', 'Trust & safety', 'Reviews', 'Verification steps', 'Touch-mål']],
  [/^login\.html$/, ['Utility', 'Forms', 'Auth', 'Verification steps', 'Auth-fejlbesked', 'Trust & safety']],
  [/^opret-annonce\.html$/, ['Utility', 'Forms', 'Stepper']],
  [/^mine-annoncer\.html$/, ['Utility', 'Cards / listings grid', 'Bike art', 'Mine annoncer']],
  [/^dashboard\.html$/, ['Utility', 'Forms', 'Dealer dashboard']],
  [/^(vilkaar|privatlivspolitik|sikkerhed|404)\.html$/, ['Utility', 'Legal / static content', 'Trust & safety']],
];

/* Sider hvor det kritiske udsnit endnu ikke er bevist at give SAMME geometri
   som det fulde ark over folden. De beholder det render-blokerende <link>:
   en langsommere første maling er bedre end et layouthop (CLS). Mål siden
   (kritisk vs fuldt ark, 390px bred) og flyt den herfra, når den er stabil. */
const IKKE_UDSKUDT = [
  /^annonce\.html$/,      // tom indtil JS; footeren hopper 362px
  /^forhandler\.html$/,   // samme mønster
  /^login\.html$/,        // auth-kortet starter 30px for lavt
];

function criticalFor(file){
  const extra = (PAGES.find(([re]) => re.test(file)) || [null, []])[1];
  const want = BASE.concat(extra);
  return sections
    .filter(s => want.some(w => s.name.startsWith(w)))
    .map(s => cssLines.slice(s.start, s.end).join('\n'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // fjern kommentarer
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* ---- 3. Skriv det ind i hver HTML-side, der bruger arket ---- */
const files = fs.readdirSync(root).filter(f => f.endsWith('.html'));
let touched = 0;

for (const file of files){
  const htmlPath = path.join(root, file);
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (!/<link[^>]+css\/styles\.css/.test(html)) continue;

  if (IKKE_UDSKUDT.some(re => re.test(file))){
    // Rul tilbage til et almindeligt stylesheet, hvis siden tidligere blev
    // udskudt — og fjern den kritiske blok, så der ikke ligger død CSS.
    const før = html;
    html = html
      .replace(/<link rel="preload" as="style" href="(css\/styles\.css[^"]*)" onload="[^"]*">\s*\n?<noscript><link rel="stylesheet" href="css\/styles\.css[^"]*"><\/noscript>/,
        '<link rel="stylesheet" href="$1">')
      .replace(/<style id="critical">[\s\S]*?<\/style>\n?/, '');
    if (html !== før){
      fs.writeFileSync(htmlPath, html);
      console.log(`  ${file.padEnd(46)} render-blokerende (ikke bevist stabil)`);
    }
    continue;
  }

  // Gør det fulde ark ikke-render-blokerende — KUN hvis det ikke allerede er
  // skiftet. (Ellers rammer regex'en <link> inde i <noscript> og laver
  // indlejrede noscripts.) stamp-version har opdateret ?v= forinden.
  const alreadyAsync = /<link rel="preload" as="style" href="css\/styles\.css[^"]*" onload=/.test(html);
  if (!alreadyAsync){
    html = html.replace(
      /<link rel="stylesheet" href="(css\/styles\.css[^"]*)">/,
      '<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel=\'stylesheet\'">\n<noscript><link rel="stylesheet" href="$1"></noscript>'
    );
  }

  const critical = criticalFor(file);
  const block = `<style id="critical">${critical}</style>`;
  html = /<style id="critical">[\s\S]*?<\/style>/.test(html)
    ? html.replace(/<style id="critical">[\s\S]*?<\/style>/, block)
    : html.replace('</head>', block + '\n</head>');

  fs.writeFileSync(htmlPath, html);
  console.log(`  ${file.padEnd(46)} ${(critical.length / 1024).toFixed(1)}KB kritisk`);
  touched++;
}

console.log(`inline-critical: ${touched} sider fik indlejret kritisk CSS.`);
