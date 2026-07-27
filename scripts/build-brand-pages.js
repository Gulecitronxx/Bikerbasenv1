/* Generates static brand landing pages (one file per brand that has listings).
   Re-run with: node scripts/build-brand-pages.js
   Static HTML carries the SEO-critical parts (title, meta, h1, intro, internal
   links); the listing grid itself hydrates client-side from the same dataset. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(src + '\nglobal.__L = LISTINGS; global.__B = BRANDS_BY_MODEL; global.__T = TYPES;');
const LISTINGS = global.__L, BRANDS_BY_MODEL = global.__B;

function slugify(name){
  return name.toLowerCase()
    .replace(/ø/g,'oe').replace(/æ/g,'ae').replace(/å/g,'aa')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Reuse the live header/footer so brand pages never drift from the rest of the site.
const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const header = index.slice(index.indexOf('<a class="skip-link"'), index.indexOf('</div>\n</div>\n\n<main') + '</div>\n</div>'.length);
const footer = index.slice(index.indexOf('<footer class="site-footer">'), index.indexOf('</footer>') + '</footer>'.length);

const byBrand = {};
LISTINGS.forEach(l => { (byBrand[l.brand] = byBrand[l.brand] || []).push(l); });
const brands = Object.keys(byBrand).sort((a, b) => a.localeCompare(b, 'da'));

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
  const items = byBrand[brand];
  const slug = slugify(brand);
  const models = [...new Set(items.map(l => l.model))];
  const allModels = (BRANDS_BY_MODEL[brand] || []).slice(0, 12);

  const html = `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brugte ${esc(brand)} motorcykler til salg — Bikerbasen</title>
<meta name="description" content="Se ${items.length} brugte ${esc(brand)} motorcykler til salg i Danmark. Sammenlign pris, årgang, km-stand og ccm — fra private sælgere og verificerede forhandlere.">
<link rel="canonical" href="https://gulecitronxx.github.io/Bikerbasenv1/maerke-${slug}.html">
<link rel="stylesheet" href="css/styles.css">
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
      <div class="listings-grid" id="brand-listings" data-brand="${esc(brand)}"></div>
      <noscript>
        <ul class="brand-noscript">
          ${items.map(l => `<li><a href="annonce.html?id=${l.id}">${esc(l.brand)} ${esc(l.model)}, ${l.year} — ${dkk(l.price)}, ${l.km.toLocaleString('da-DK')} km (${esc(l.city)})</a></li>`).join('\n          ')}
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

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script src="js/supabase-api.js"></script>
<script src="js/icons.js"></script>
<script src="js/bike-art.js"></script>
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/backend-bridge.js"></script>
<script src="js/components.js"></script>
<script src="js/maerke.js"></script>
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
<title>Alle motorcykelmærker — Bikerbasen</title>
<meta name="description" content="Find brugte motorcykler efter mærke. Se udvalget fra ${brands.length} mærker med annoncer til salg i Danmark på Bikerbasen.">
<link rel="canonical" href="https://gulecitronxx.github.io/Bikerbasenv1/maerker.html">
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
      <p class="brand-intro">Vælg et mærke for at se alle brugte modeller til salg lige nu. Vi viser kun mærker, hvor der aktuelt er annoncer.</p>
    </div>

    <section class="section" style="padding-top:0;">
      <div class="brand-grid">
        ${brands.map(b => `<a class="brand-card" href="maerke-${slugify(b)}.html">
          <span class="brand-card-name">${esc(b)}</span>
          <span class="brand-card-count">${byBrand[b].length} ${byBrand[b].length === 1 ? 'annonce' : 'annoncer'}</span>
        </a>`).join('\n        ')}
      </div>
    </section>
  </div>
</main>

${footer}

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
<script src="js/supabase-api.js"></script>
<script src="js/icons.js"></script>
<script src="js/bike-art.js"></script>
<script src="js/data.js"></script>
<script src="js/store.js"></script>
<script src="js/backend-bridge.js"></script>
<script src="js/components.js"></script>
<script>document.addEventListener('DOMContentLoaded', () => {
  renderHeader('maerker.html');
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
});</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, 'maerker.html'), indexHtml, 'utf8');

/* ---- sitemap.xml so crawlers actually find the new pages ---- */
const base = 'https://gulecitronxx.github.io/Bikerbasenv1';
const staticPages = ['index.html','soegning.html','maerker.html','opret-annonce.html','sikkerhed.html','vilkaar.html','privatlivspolitik.html','login.html'];
const urls = [...staticPages, ...brands.map(b => `maerke-${slugify(b)}.html`)];
const today = new Date().toISOString().slice(0,10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${base}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`, 'utf8');

fs.writeFileSync(path.join(ROOT, 'robots.txt'),
`User-agent: *
Allow: /
Sitemap: ${base}/sitemap.xml
`, 'utf8');

console.log(`Built ${built} brand pages + maerker.html + sitemap.xml (${urls.length} urls) + robots.txt`);
