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
const BASE = ['Design tokens', 'Reset', 'Buttons', 'Formularfelter', 'Pladsreservation', 'Sektionslayout', 'Header', 'Footer', 'Cookie consent', 'Sammenlign'];

/* Sektioner der skal PILLES UD igen for enkelte sider, selvom de står i BASE.
   Forsiden har ingen annoncekort over folden — hverken sammenlign-knappen på
   kortene eller sammenlign-baren/-modalen kan ses ved første maling (begge er
   [hidden], og Reset skjuler dem allerede). De 2.7KB flyttes derfor over i det
   asynkrone ark, så selve dokumentet bliver mindre. Det er ikke pynt: hero-
   billedet kan først hentes, når dokumentet er hentet, så hver sparet KB i
   HTML'en flytter LCP'ens "load delay". */
const UDEN = [
  [/^index\.html$/, ['Sammenlign']],
];

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
  // NB: 'annoncedetalje' SKAL med. Sektionen indeholder
  // `#listing-detail:empty{min-height:100vh}`, som reserverer pladsen til
  // annoncen, før js/annonce.js har fyldt den. Ligger reglen kun i det
  // asynkrone ark, findes den ikke ved første maling — altså præcis i det
  // øjeblik den skal virke — og "Lignende annoncer" plus footeren står
  // øverst i vinduet og bliver skubbet en hel side ned bagefter (målt CLS
  // 0,49). Samme sektion har også .avatar svg-størrelsen, uden hvilken
  // ikon-avataren folder sig ud i 300×150.
  [/^annonce(-.+)?\.html$/, ['Utility', 'Breadcrumb', 'Listing detail', 'annoncedetalje',
    'Bike art', 'Trust & safety', 'Reviews', 'Modal', 'Forms', 'Touch-mål']],
  // Mærkesider (genererede) + mærkeoversigten.
  [/^maerke(r|-.+)?\.html$/, ['Utility', 'Breadcrumb', 'Cards / listings grid', 'Bike art',
    'Brand landing pages', 'Popular searches']],
  [/^forhandler\.html$/, ['Utility', 'Breadcrumb', 'Profile / dealer page', 'Cards / listings grid',
    'Bike art', 'Trust & safety', 'Reviews', 'Verification steps', 'Touch-mål']],
  [/^login\.html$/, ['Utility', 'Forms', 'Auth', 'Verification steps', 'Auth-fejlbesked', 'Trust & safety']],
  [/^opret-annonce\.html$/, ['Utility', 'Forms', 'Stepper']],
  [/^mine-annoncer\.html$/, ['Utility', 'Cards / listings grid', 'Bike art', 'Mine annoncer']],
  [/^dashboard\.html$/, ['Utility', 'Forms', 'Dealer dashboard']],
  [/^(vilkaar|privatlivspolitik|sikkerhed|om-indeksering|404)\.html$/, ['Utility', 'Legal / static content', 'Trust & safety']],
];

/* Sider hvor det kritiske udsnit ikke er bevist at give SAMME geometri som
   det fulde ark over folden. De beholder det render-blokerende <link>: en
   langsommere første maling er bedre end et layouthop (CLS).

   Listen er tom nu — alle 14 sider er målt stabile ved 390px bredde. Kommer
   der en ny side (eller en ny sektion i styles.css), så mål den samme vej:
   sammenlign hvert elements top/højde med og uden det asynkrone ark, og sæt
   siden herind, indtil forskellen over folden er 0. */
const IKKE_UDSKUDT = [];

/* ---- 2b. Ekstra regler der KUN hører hjemme i den kritiske blok ----
   Til rene ydelsesregler bundet til én sides dokumentstruktur — altså noget,
   der ikke er design og derfor ikke hører hjemme i styles.css.

   Listen er tom. To kandidater er prøvet på forsiden og forkastet — de står
   her med tallene, så de ikke bliver "opfundet" igen:

   1) `main > .section{ content-visibility: auto; contain-intrinsic-size:
      auto 640px }`. Så tidligt ud som den store gevinst (TBT 570ms -> 410ms),
      men den måling var forurenet: i samme omgang blev en ubrugt
      postnumre.js på 40KB fjernet fra forsiden. Målt alene bagefter — med
      alt andet på plads — gav den 88 mod 87 i performance, altså inden for
      støjen, fordi annoncegitrene på det tidspunkt allerede blev tegnet
      dovent og der derfor knap var noget tilbage at springe over.
      Prisen var derimod målbar og reproducerbar: sprunget-over indhold har
      ingen layoutbokse, så axe måler hvert trykmål til 0x0. target-size
      fejlede på 6 elementer, og tilgængeligheden gik fra 100 til 97.
      1 point performance for 3 points tilgængelighed er en dårlig handel.

      (En mistanke om, at reglen også forhindrede kategorifliserne i at hente
      deres billeder, blev efterprøvet og AFVIST: Lighthouse henter alle 8
      med og uden reglen. Den observation stammede fra en browser med skjult
      rude, hvor viewporten er 0px bred — dér arver alt nul bredde, og både
      lazy-billeder og IntersectionObserver holder op med at virke. Mål aldrig
      layout eller dovent indhold i en fane, hvor document.hidden er true.)

   2) `main > .section{ contain: layout }`. Uden de problemer, men også uden
      gevinst: 82 mod 83 i udgangspunktet. Den koster en ny stacking context
      og et nyt containing block pr. sektion — risiko uden modydelse.

   Den rigtige vej viste sig at ligge i js/home.js: kortene sættes ind i
   portioner med et yield imellem, så det samme arbejde bliver til mange korte
   opgaver i stedet for én lang. Det giver hele gevinsten uden at bede
   browseren om at springe noget over, den har fået at vide skal males. */
const EKSTRA = [];

/* Skærer luften ud af den kritiske blok. Bevidst konservativ: mellemrum
   omkring +, -, * og / røres ALDRIG, fordi calc() kræver dem
   (`calc(var(--header-h) + var(--space-5))` bliver ugyldig uden). Kun
   mellemrum omkring de tegn, hvor CSS aldrig kan tillægge dem betydning. */
function minify(css){
  return css
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/:\s+/g, ':')
    .replace(/,\s+/g, ',')
    .replace(/;\}/g, '}')
    .trim();
}

function criticalFor(file){
  const extra = (PAGES.find(([re]) => re.test(file)) || [null, []])[1];
  const drop = (UDEN.find(([re]) => re.test(file)) || [null, []])[1];
  const want = BASE.concat(extra).filter(w => !drop.includes(w));
  const base = minify(sections
    .filter(s => want.some(w => s.name.startsWith(w)))
    .map(s => cssLines.slice(s.start, s.end).join('\n'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // fjern kommentarer
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim());
  const ekstra = (EKSTRA.find(([re]) => re.test(file)) || [null, ''])[1];
  return ekstra ? base + '\n' + ekstra : base;
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
  {
    // Fjern altid en tidligere blok først, så placeringen kan rettes på
    // sider der blev bygget dengang den lå sidst i head.
    html = html.replace(/<style id="critical">[\s\S]*?<\/style>\n?/, '');

    /* FØR stylesheet-linket, ikke sidst i head.

       Lå den kritiske blok efter linket, vandt den over det fulde ark for
       enhver regel der stod begge steder — kaskaden blev vendt om. Det tog
       et konkret offer: `.field{display:flex}` (i den kritiske blok siden
       runde 12) slog `.kyc-fields{display:none}` fra arket ihjel, så
       virksomhedsnavn og CVR stod fremme med røde stjerner for alle, der
       oprettede en privat profil.

       Med blokken før linket er rollerne rigtige: det indlejrede maler
       hurtigt, og det fulde ark har sidste ord — præcis som hvis den
       kritiske CSS ikke fandtes. */
    // Første <link> der peger på arket — preload-varianten står før
    // <noscript>-fallbacken, så "første match" er den rigtige. Match ikke på
    // rel-værdien: gør man det, rammer man let linket INDE i <noscript> og
    // splitter fallbacken.
    html = html.replace(
      /(<link\b[^>]*href="css\/styles\.css)/,
      `${block}\n$1`
    );
    // Sikkerhedsnet: matchede formen ikke, så hellere sidst i head end slet ikke.
    if (!html.includes('<style id="critical">')) html = html.replace('</head>', block + '\n</head>');
  }

  fs.writeFileSync(htmlPath, html);
  console.log(`  ${file.padEnd(46)} ${(critical.length / 1024).toFixed(1)}KB kritisk`);
  touched++;
}

console.log(`inline-critical: ${touched} sider fik indlejret kritisk CSS.`);
