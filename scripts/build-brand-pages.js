/* Generates static brand landing pages (one file per brand that has listings).
   Re-run with: node scripts/build-brand-pages.js
   Static HTML carries the SEO-critical parts (title, meta, h1, intro, internal
   links); the listing grid itself hydrates client-side from the same dataset. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { browserModules } = require('./shared');
const { listingCardHTML, normalizeRemoteListing } = browserModules();
const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(src + '\nglobal.__L = LISTINGS; global.__B = BRANDS_BY_MODEL; global.__T = TYPES;');
const BRANDS_BY_MODEL = global.__B;

/* Mærkesider skal afspejle de annoncer, der faktisk er til salg. Demodataene
   er slået fra, så listen hentes fra databasen. Falder tilbage på hvad data.js
   måtte indeholde, hvis databasen ikke kan nås — et build skal ikke fejle
   alene på grund af netværket. Kaldes synkront via deasync-agtig top-level await
   er ikke muligt her, så resultatet hentes før brug nedenfor. */
async function hentAnnoncer(){
  const cfg = fs.readFileSync(path.join(ROOT, 'js/supabase-config.js'), 'utf8');
  const url = (cfg.match(/url:\s*'([^']+)'/) || [])[1];
  const key = (cfg.match(/anonKey:\s*'([^']+)'/) || [])[1];
  if (!url || !key){
    console.warn('Ingen Supabase-konfiguration — bruger annoncer fra js/data.js.');
    return global.__L;
  }
  try {
    // Fotos og saelger skal med: maerkesidens kort tegnes nu i byggeriet, og
    // uden dem ville de vise pladsholder-tegningen og forhandler-badget
    // ville mangle — begge dele ville hoppe, naar js/maerke.js overtog.
    const select = '*,photos:listing_photos(id,storage_path,position),seller:public_profiles!listings_seller_id_fkey(*)';
    const r = await fetch(`${url}/rest/v1/listings?select=${encodeURIComponent(select)}&status=eq.active`, { headers: { apikey: key } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    console.log(`Hentede ${rows.length} annoncer fra databasen.`);
    return rows.map(normalizeRemoteListing);
  } catch (e) {
    console.warn('Kunne ikke hente fra databasen (' + e.message + ') — bruger js/data.js.');
    return global.__L;
  }
}

let LISTINGS = [];

function slugify(name){
  return name.toLowerCase()
    .replace(/ø/g,'oe').replace(/æ/g,'ae').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Reuse the live header/footer so brand pages never drift from the rest of the site.
// Normalise line endings first: git checks these files out as CRLF on Windows,
// and matching on "\n" silently produced pages with no header at all.
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

function slicedBetween(src, startMarker, endMarker, label){
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker);
  if (a === -1 || b === -1 || b <= a){
    throw new Error(`Kunne ikke udtrække ${label} fra index.html — markørerne matchede ikke. `
      + `Sider ville blive genereret uden ${label}, så build afbrydes.`);
  }
  return src.slice(a, b + endMarker.length);
}

const header = slicedBetween(index, '<a class="skip-link"', '</div>\n</div>', 'header');
const footer = slicedBetween(index, '<footer class="site-footer">', '</footer>', 'footer');

// Fail fast hvis resultatet alligevel ser tomt ud.
if (!/site-header/.test(header)) throw new Error('Udtrukket header mangler .site-header — build afbrudt.');
if (!/site-footer/.test(footer)) throw new Error('Udtrukket footer mangler .site-footer — build afbrudt.');

function byg(){
const byBrand = {};
LISTINGS.forEach(l => { (byBrand[l.brand] = byBrand[l.brand] || []).push(l); });
const brands = Object.keys(byBrand).sort((a, b) => a.localeCompare(b, 'da'));

/* Ryd forældede mærkesider. Uden dette bliver en side liggende med gammelt
   indhold, når det sidste eksemplar af et mærke er solgt — og den ville
   stadig kunne findes via Google. */
const forventede = new Set(brands.map(b => `maerke-${slugify(b)}.html`));
let slettet = 0;
for (const f of fs.readdirSync(ROOT)){
  if (/^maerke-.+\.html$/.test(f) && !forventede.has(f)){
    fs.unlinkSync(path.join(ROOT, f));
    slettet++;
  }
}
if (slettet) console.log(`Fjernede ${slettet} forældede mærkesider.`);

const dkk = n => n.toLocaleString('da-DK') + ' kr.';

function introFor(brand, items){
  const prices = items.map(l => l.price).sort((a,b) => a-b);
  const years = items.map(l => l.year);
  const types = [...new Set(items.map(l => l.type))]
    .map(t => (global.__T.find(x => x.id === t) || {}).label).filter(Boolean);
  return `Der er lige nu <strong>${items.length}</strong> brugte ${esc(brand)} ${items.length === 1 ? 'motorcykel' : 'motorcykler'} til salg på Bikerbasen — `
    + `fra ${dkk(prices[0])} til ${dkk(prices[prices.length-1])}, med årgange mellem ${Math.min(...years)} og ${Math.max(...years)}. `
    + `Udvalget dækker ${types.slice(0,3).join(', ')}${types.length > 3 ? ' m.fl.' : ''}. `
    + `Alle annoncer er mærket som enten privat sælger eller forhandler, så du kan se dine rettigheder før du køber.`;
}

let built = 0;
for (const brand of brands){
  // Samme raekkefoelge som js/maerke.js: nyeste foerst.
  const items = byBrand[brand].slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const kort = items.map((l, i) => listingCardHTML(l, i)).join('\n      ');
  const foersteFoto = (items[0] && items[0].photoUrls && items[0].photoUrls[0]) || null;
  const slug = slugify(brand);
  const models = [...new Set(items.map(l => l.model))];
  const allModels = (BRANDS_BY_MODEL[brand] || []).slice(0, 12);

  const html = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://hkcjrwglwurdjnobewzb.supabase.co; connect-src 'self' https://hkcjrwglwurdjnobewzb.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Brugte ${esc(brand)} motorcykler til salg — Bikerbasen</title>
<meta name="description" content="Se ${items.length} brugte ${esc(brand)} motorcykler til salg i Danmark. Sammenlign pris, årgang, km-stand og ccm — fra private sælgere og verificerede forhandlere.">
<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="preconnect" href="https://hkcjrwglwurdjnobewzb.supabase.co" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
${foersteFoto ? `<link rel="preload" as="image" href="${foersteFoto}" fetchpriority="high">
` : ''}<link rel="stylesheet" href="css/styles.css">
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span>
      <a href="maerker.html">Mærker</a><span class="bc-sep"></span>
      <span>${esc(brand)}</span>
    </nav>

    <div class="brand-hero">
      <h1>Brugte ${esc(brand)} motorcykler</h1>
      <p class="brand-intro">${introFor(brand, items)}</p>
      <div class="brand-actions">
        <a href="soegning.html?brands=${encodeURIComponent(brand)}" class="btn btn-primary">Søg i alle ${esc(brand)}</a>
        <a href="opret-annonce.html" class="btn btn-outline">Sælg din ${esc(brand)}</a>
      </div>
    </div>

    ${allModels.length ? `<section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Populære ${esc(brand)}-modeller</h2>
      <div class="popular-row">
        ${allModels.map(m => `<a class="popular-chip" href="soegning.html?brands=${encodeURIComponent(brand)}&amp;q=${encodeURIComponent(m)}">${esc(m)}</a>`).join('\n        ')}
      </div>
    </section>` : ''}

    <section class="section" style="padding-top:var(--space-6);">
      <h2 class="brand-sub">${items.length} ${items.length === 1 ? 'annonce' : 'annoncer'} til salg nu</h2>
      <div class="listings-grid" id="brand-listings" data-brand="${esc(brand)}">${kort}</div>
      <noscript>
        <ul class="brand-noscript">
          ${items.map(l => `<li><a href="${require('./shared').listingSlug(l)}">${esc(l.brand)} ${esc(l.model)}, ${l.year} — ${dkk(l.price)}, ${l.km.toLocaleString('da-DK')} km (${esc(l.city)})</a></li>`).join('\n          ')}
        </ul>
      </noscript>
    </section>

    <section class="section" style="padding-top:0;">
      <h2 class="brand-sub">Andre mærker</h2>
      <div class="popular-row">
        ${brands.filter(b => b !== brand).slice(0, 10).map(b => `<a class="popular-chip" href="maerke-${slugify(b)}.html">${esc(b)}</a>`).join('\n        ')}
        <a class="popular-chip" href="maerker.html">Alle mærker</a>
      </div>
    </section>
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/postnumre.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<script defer src="js/maerke.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, `maerke-${slug}.html`), html, 'utf8');
  built++;
}

/* ---- Brand index ---- */
const indexHtml = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://hkcjrwglwurdjnobewzb.supabase.co; connect-src 'self' https://hkcjrwglwurdjnobewzb.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>Alle motorcykelmærker — Bikerbasen</title>
<meta name="description" content="Find brugte motorcykler efter mærke. Se udvalget fra ${brands.length} mærker med annoncer til salg i Danmark på Bikerbasen.">
<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="preconnect" href="https://hkcjrwglwurdjnobewzb.supabase.co" crossorigin>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span><span>Mærker</span>
    </nav>

    <div class="brand-hero">
      <h1>Motorcykler efter mærke</h1>
      <p class="brand-intro">Gennemse brugte motorcykler efter mærke. Nederst finder du alle mærker — også dem uden annoncer lige nu.</p>
    </div>

    ${brands.length ? `<section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>Mærker med annoncer nu</h2>
        <p>Spring direkte til udvalget hos de mærker, der er til salg lige nu.</p>
      </div></div>
      <div class="brand-grid">
        ${brands.map(b => `<a class="brand-card" href="maerke-${slugify(b)}.html">
          <span class="brand-card-name">${esc(b)}</span>
          <span class="brand-card-count">${byBrand[b].length} ${byBrand[b].length === 1 ? 'annonce' : 'annoncer'}</span>
        </a>`).join('\n        ')}
      </div>
    </section>` : ''}

    <section class="section" style="padding-top:0;">
      <div class="section-head"><div>
        <h2>Alle mærker</h2>
        <p>Vælg et mærke og se, hvad der er til salg — eller opret en søgeagent.</p>
      </div></div>
      <div class="brand-index">
        ${Object.keys(BRANDS_BY_MODEL).sort((a,b)=>a.localeCompare(b,'da')).map(b =>
          `<a class="brand-index-link" href="soegning.html?brands=${encodeURIComponent(b)}">${esc(b)}</a>`
        ).join('\n        ')}
      </div>
    </section>
  </div>
</main>

${footer}

<script defer src="js/security.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/postnumre.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<script>document.addEventListener('DOMContentLoaded', () => {
  renderHeader('maerker.html');
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
});</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'maerker.html'), indexHtml, 'utf8');

/* ---- sitemap.xml so crawlers actually find the new pages ---- */
const base = require('./site-url')(ROOT);
/* login.html er sat til noindex af build-meta.js. En noindex-side i
   sitemappet er et modsat signal, så den hører ikke med her. */
const staticPages = ['index.html','soegning.html','maerker.html','opret-annonce.html','sikkerhed.html','vilkaar.html','privatlivspolitik.html'];

/* Annoncerne er sidens egentlige long-tail — uden dem i sitemappet skal
   Google selv gætte sig frem via søgesiden, og den er JavaScript-drevet.
   lastmod følger annoncens updated_at, så en redigeret annonce genbesøges. */
const { listingSlug } = require('./shared');
const listingUrls = LISTINGS.map(l => ({
  loc: listingSlug(l),
  lastmod: String(l.updated_at || l.createdAt || '').slice(0, 10),
}));

const today = new Date().toISOString().slice(0,10);
const entries = [
  ...[...staticPages, ...brands.map(b => `maerke-${slugify(b)}.html`)]
    .map(u => ({ loc: u, lastmod: today })),
  ...listingUrls,
];
const urls = entries;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url><loc>${base}/${esc(e.loc)}</loc><lastmod>${e.lastmod || today}</lastmod></url>`).join('\n')}
</urlset>
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`, 'utf8');

console.log(`Built ${built} brand pages + maerker.html + sitemap.xml (${urls.length} urls) + robots.txt`);
}

(async () => {
  LISTINGS = await hentAnnoncer();
  byg();
})().catch(e => { console.error(e.message); process.exit(1); });
