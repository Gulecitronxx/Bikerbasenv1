/* Samler det, der skal ud på bikerbasen.dk, i _site/ — og NÆGTER at gøre det,
   hvis noget mangler. Kør: node scripts/udgiv.js  (npm run udgiv)

   HVORFOR DEN FINDES
   ------------------
   `.github/workflows/deploy.yml` uploadede hele repoet med `path: .`. Det er
   efterprøvet i drift, ikke gættet: `supabase/schema.sql`,
   `supabase/016_luk_skrivehul.sql`, `sources/guloggratis.yaml`,
   `crawler/config.js` og `work/DECISIONS.md` svarede alle HTTP 200 på
   handelsdomænet. 016 er gennemgangen af hvilke sikkerhedshuller der blev
   lukket OG hvilke der står åbne med vilje. `work/DECISIONS.md` er den interne
   log. `sources/*.yaml` er crawlerens selectors og aftalegrundlag. Og `docs/`
   — auditrapporterne med linjenumre på hver enkelt svaghed — var på vej ud
   ved næste push, fordi mappen ikke er i .gitignore.

   Sikkerheden hviler ikke på, at filerne er hemmelige. RLS holder; det er
   efterprøvet tolv gange. Men et RLS-regelsæt og en intern beslutningslog
   hører ikke på et domæne, folk handler motorcykler på.

   HVORFOR EN ALLOWLIST OG IKKE EN DENYLIST
   ----------------------------------------
   En denylist (`rm -rf crawler supabase sources ...`) fejler stille den dag
   nogen tilføjer en mappe. En allowlist fejler stille den anden vej: den dag
   nogen tilføjer en fil, siderne skal bruge, mangler den i drift. Derfor er
   allowlisten ikke alene her — trin 3 nedenfor følger HVER lokal reference i
   hver udgivet HTML-fil og afbryder, hvis målet ikke er kopieret med. Det
   bytter "sitet gik ned uden at nogen så det" for "buildet fejlede med en
   liste over hvad der manglede", og det er den rigtige byttehandel.

   Mapperne kopieres HELE. Det er med vilje: `css/`, `fonts/`, `img/` og `js/`
   er browserens filer og intet andet. En fil-for-fil-liste over dem ville
   skulle vedligeholdes hver gang en side får et nyt billede, og `srcset` er
   præcis det sted, hvor en glemt fil ikke ses før produktionen. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const UD = path.join(ROOT, '_site');

/* Hele mapper — men kun de filtyper, mappen findes for. `tillad` er ikke
   pedanteri: første gang jeg prøvede en manglende fil af, lå der et
   `sport.webp.bak` i img/, og det blev udgivet. En mappe, der er åben for
   alt, er en allowlist der kun ser sådan ud. `undtag` fanger *.test.js —
   nodetests, der læser filsystemet og intet har at gøre i en browser. */
const MAPPER = [
  { fra: 'css',   tillad: /\.css$/ },
  { fra: 'fonts', tillad: /\.(woff2?|ttf|otf)$/ },
  { fra: 'img',   tillad: /\.(webp|avif|png|jpe?g|gif|svg)$/ },
  { fra: 'js',    tillad: /\.js$/, undtag: /\.test\.js$/ },
];

/* Rodfiler. Mønstre frem for navne dér, hvor byggekæden selv laver filerne:
   annonce-*.html (build-listing-pages) og maerke-*.html (build-brand-pages)
   findes ikke, når nogen læser den her liste, men de skal med. */
const RODMOENSTRE = [
  /\.html$/,                       // alle sider, statiske som genererede
  /^CNAME$/,                       // domænet — uden den falder Pages tilbage til github.io
  /^\.nojekyll$/,                  // ellers spiser Jekyll filer der starter med _
  /^robots\.txt$/,
  /^sitemap\.xml$/,
  /^favicon\.(png|svg|ico)$/,
  /^apple-touch-icon\.png$/,
  /^logo\.png$/, /^logo-mark\.png$/,
  /^og-image\.png$/,               // kun refereret som absolut URL i <meta>
];

/* Filtyper, der ALDRIG må ud, uanset hvor de dukker op. Dobbelt bund under
   allowlisten: skriver nogen en .sql eller en .md ind i js/ eller img/,
   stopper udgivelsen her i stedet for at lægge den på domænet. */
const FORBUDTE_TYPER = /\.(sql|ya?ml|md|env|pem|key)$/i;

function ryd(dir){
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function kopierMappe(fra, til, regler){
  const filer = [];
  for (const post of fs.readdirSync(fra, { withFileTypes: true })){
    const kilde = path.join(fra, post.name), maal = path.join(til, post.name);
    if (post.isDirectory()){
      filer.push(...kopierMappe(kilde, maal, regler));
      continue;
    }
    if (regler.tillad && !regler.tillad.test(post.name)) continue;
    if (regler.undtag && regler.undtag.test(post.name)) continue;
    fs.mkdirSync(til, { recursive: true });
    fs.copyFileSync(kilde, maal);
    filer.push(path.relative(UD, maal).replace(/\\/g, '/'));
  }
  return filer;
}

/* ---- Trin 1+2: byg _site ---- */

ryd(UD);
fs.mkdirSync(UD, { recursive: true });

const udgivet = [];

for (const m of MAPPER){
  const fra = path.join(ROOT, m.fra);
  if (!fs.existsSync(fra)) throw new Error(`allowlisten peger på mappen ${m.fra}, som ikke findes`);
  udgivet.push(...kopierMappe(fra, path.join(UD, m.fra), m));
}

for (const navn of fs.readdirSync(ROOT)){
  if (navn === '_site') continue;
  if (!fs.statSync(path.join(ROOT, navn)).isFile()) continue;
  if (!RODMOENSTRE.some(re => re.test(navn))) continue;
  fs.copyFileSync(path.join(ROOT, navn), path.join(UD, navn));
  udgivet.push(navn);
}

const forbudte = udgivet.filter(f => FORBUDTE_TYPER.test(f));

/* ---- Trin 3: følg hver reference ---- */

const SITE = require('./site-url')(ROOT).replace(/\/$/, '');

/* Attributter der peger på en fil. `content` er med vilje UDE: den bærer
   metatekst ("width=device-width", en beskrivelse på 140 tegn), og en
   scanner, der tager den med, rapporterer 30 falske mangler og bliver
   ignoreret. Absolutte URL'er til vores eget domæne fanges neden for
   i stedet — det er dér, og-image.png står. */
const ATTR = /\b(?:href|src|srcset|imagesrcset)\s*=\s*"([^"]*)"/gi;
const CSS_URL = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

function referencer(html){
  const ud = new Set();
  const tilfoej = raa => {
    let v = String(raa || '').trim();
    if (!v) return;
    if (v.startsWith(`${SITE}/`)) v = v.slice(SITE.length + 1);
    else if (/^(?:https?:|data:|mailto:|tel:|javascript:|#|\/\/)/i.test(v)) return;
    v = v.split('#')[0].split('?')[0].replace(/^\//, '');
    if (v) ud.add(decodeURIComponent(v));
  };
  for (const m of html.matchAll(ATTR)){
    // srcset er "fil 800w, fil 1600w" — hvert led har en URL og et deskriptor.
    for (const led of m[1].split(',')) tilfoej(led.trim().split(/\s+/)[0]);
  }
  for (const m of html.matchAll(CSS_URL)) tilfoej(m[1]);
  return ud;
}

const mangler = [];
const htmlFiler = fs.readdirSync(UD).filter(f => f.endsWith('.html'));

for (const fil of htmlFiler){
  for (const ref of referencer(fs.readFileSync(path.join(UD, fil), 'utf8'))){
    if (!fs.existsSync(path.join(UD, ref))) mangler.push(`${fil} → ${ref}`);
  }
}

// css/*.css har sine egne url() (fonte, baggrunde). De er relative til css/.
for (const fil of fs.readdirSync(path.join(UD, 'css'))){
  if (!fil.endsWith('.css')) continue;
  const css = fs.readFileSync(path.join(UD, 'css', fil), 'utf8');
  for (const m of css.matchAll(CSS_URL)){
    const raa = m[1].trim();
    if (/^(?:https?:|data:|\/\/)/i.test(raa)) continue;
    const maal = raa.startsWith('/')
      ? path.join(UD, raa.slice(1))
      : path.join(UD, 'css', raa.split('#')[0].split('?')[0]);
    if (!fs.existsSync(maal)) mangler.push(`css/${fil} → ${raa}`);
  }
}

/* ---- Regnskab ---- */

console.log(`_site: ${udgivet.length} filer, ${htmlFiler.length} HTML-sider`);
const efterMappe = {};
for (const f of udgivet){
  const nøgle = f.includes('/') ? f.split('/')[0] + '/' : '(rod)';
  efterMappe[nøgle] = (efterMappe[nøgle] || 0) + 1;
}
for (const k of Object.keys(efterMappe).sort()) console.log(`  ${k.padEnd(10)} ${efterMappe[k]}`);

if (forbudte.length){
  console.error('\nAFBRUDT: filtyper, der ikke maa udgives, er havnet i _site:');
  forbudte.forEach(f => console.error('  ' + f));
  process.exit(1);
}

if (mangler.length){
  console.error(`\nAFBRUDT: ${mangler.length} reference(r) peger paa filer, der IKKE er med i udgivelsen.`);
  console.error('Enten mangler filen i allowlisten i scripts/udgiv.js, eller siden peger forkert.');
  mangler.forEach(m => console.error('  ' + m));
  process.exit(1);
}

console.log('\nAlle referencer i de udgivne sider peger paa filer, der er med. _site er klar.');
