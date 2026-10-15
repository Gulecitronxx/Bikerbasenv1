/* Genererer guide-sidefamilien: guides.html (oversigt) og guide-*.html.

   Køres:  node scripts/build-guides.js
   Skal i byggekæden (scripts/build.js, `trin`) EFTER build-facet-pages.js (så
   sitemap.xml allerede findes) og FØR build-meta.js. Er IKKE koblet på endnu;
   Orchestratoren gør det (se rapporten, DELT-ØNSKE).

   Indholdet står i scripts/guides-data.js (tekst + kilder). Her ligger kun
   skabelonen. Mønstret er det samme som build-facet-pages.js: header, footer og
   CSP trækkes ud af index.html (siteParts), så siderne altid har samme ramme
   som resten af sitet, og al JS ligger i js/ (ingen inline-scripts bortset fra
   den ene temalinje, som scripts/csp-hashes.js allerede kender).

   Intet er opfundet: afsender er "Bikerbasen" (ingen forfatter-person),
   datoerne står i guides-data.js, og læsetiden beregnes af tekstlængden.
   Sidebjælkens annoncekort er beregnet af lageret og udelades helt, hvis der
   ikke findes annoncer med de nødvendige oplysninger. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { siteUrl, fetchListings, fetchExternalListings, siteParts, esc, browserModules, listingSlug } = require('./shared');
const { GUIDES, SRC, PUBLISHED, MODIFIED } = require('./guides-data');
const BASE = siteUrl();

/* Samme cleanUrl() som build-meta.js og build-facet-pages.js. */
function cleanUrl(file){
  return file === 'index.html' ? BASE : `${BASE}/${file.replace(/\.html$/, '')}`;
}

/* Ikoner: samme sæt som resten af sitet (js/icons.js), evalueret her, så de kan
   bages ind i den statiske side. */
const Icon = new Function(fs.readFileSync(path.join(ROOT, 'js/icons.js'), 'utf8') + '\n;return Icon;')();
const BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z"/></svg>';

/* Regler fra js/data.js (A2-grænsen i hk) til sidebjælkens udvalg. Samme
   eval-mønster som build-facet-pages.js. */
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(dataSrc + '\nglobal.__GD_A2HK = A2_MAX_HK; global.__GD_TYPES = TYPES; global.__GD_L = LISTINGS;');
const A2_MAX_HK = global.__GD_A2HK;
const TYPES = global.__GD_TYPES;

const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
function datoDa(iso){
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${MAANEDER[m - 1]} ${y}`;
}

const stripTags = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const antalOrd = html => { const t = stripTags(html); return t ? t.split(' ').length : 0; };
/* 200 ord i minuttet er et almindeligt tal for læsning af dansk brødtekst; vi
   runder op og skriver aldrig under ét minut. */
function laesetid(ord){ return Math.max(1, Math.ceil(ord / 200)); }
const minutterTekst = n => `${n} ${n === 1 ? 'minut' : 'minutter'}`;

/* ---------- Bidder i artiklen ---------- */
const TYPE_TEKST = {
  naked: 'Alsidig og perfekt til både by og landevej.',
  sport: 'Sporty kørestilling og stærk fokus på ydeevne.',
  adventure: 'Høj og alsidig, til både hverdag, ture og grus.',
  touring: 'Bygget til lange ture med komfort og bagage.',
  cruiser: 'Afslappet kørestilling og klassisk stil.',
};
function typeTiles(){
  const items = Object.keys(TYPE_TEKST).map(id => {
    const t = TYPES.find(x => x.id === id);
    if (!t) return '';
    const navn = String(t.label).toLowerCase();
    return `<li class="gd-type">
        <a class="gd-type-link" href="type-${id}.html">
          <span class="gd-type-media"><img src="img/type/${id}.webp" alt="" width="456" height="342" loading="lazy" decoding="async"></span>
          <span class="gd-type-body">
            <strong class="gd-type-name">${esc(t.label).split('/').join('/<wbr>')}</strong>
            <span class="gd-type-text">${TYPE_TEKST[id]}</span>
            <span class="gd-type-go">Se ${esc(navn)} motorcykler ${Icon.arrowRight}</span>
          </span>
        </a>
      </li>`;
  }).join('\n      ');
  return `<ul class="gd-types">\n      ${items}\n    </ul>`;
}
function kkTabel(){
  return `<div class="gd-table-wrap" role="region" aria-label="Kørekortkategorier til motorcykel" tabindex="0">
<table class="gd-table">
<caption>Hovedregler for motorcykelkørekort. Kilde: kørekortbekendtgørelsen §§ 11-13 og 35-37. Trehjulede køretøjer har egne grænser (A1 og A2 op til 15 kW).</caption>
<thead><tr><th scope="col">Kategori</th><th scope="col">Mindstealder</th><th scope="col">Du kan føre</th></tr></thead>
<tbody>
<tr><th scope="row">A1 <span>Lille motorcykel</span></th><td data-label="Mindstealder">18 år</td><td data-label="Du kan føre">Tohjulet motorcykel på højst 125 cm³, 11 kW og 0,1 kW pr. kg.</td></tr>
<tr><th scope="row">A2 <span>Mellemstor motorcykel</span></th><td data-label="Mindstealder">20 år</td><td data-label="Du kan føre">Højst 35 kW og 0,2 kW pr. kg, og ikke afledt af en motorcykel med mere end dobbelt så høj effekt. Ingen grænse for cm³.</td></tr>
<tr><th scope="row">A <span>Stor motorcykel</span></th><td data-label="Mindstealder">24 år, eller 22 år med mindst to års erfaring på A2 og en bestået praktisk prøve</td><td data-label="Du kan føre">Tohjulede motorcykler uden effektgrænse, og trehjulede over 15 kW.</td></tr>
</tbody>
</table>
</div>`;
}
function fyldBidder(html){
  return html.replace('{{TYPE_TILES}}', typeTiles()).replace('{{KK_TABLE}}', kkTabel());
}

/* ---------- Sidebjælkens annoncekort ----------
   Udvalget kommer af lageret: kun annoncer med KENDT effekt under A2-grænsen,
   en pris og et foto. Samme krav som passerKoerekort() stiller (ukendt effekt er
   ikke "ja"). Er der færre end to, udelades modulet. */
/* Trehjulede og scootere er ikke en tohjulet motorcykel i kørekortbekendtgørelsens §12-forstand
   (trehjulet kun op til 15 kW på A2). Vi kan ikke udlede det af alle annoncer, så de
   kendte navne holdes ude, og modulets overskrift lover kun den oplyste effekt. */
const IKKE_TOHJULET = /tricity|niken|\bmp3\b|spyder|ryker|can-?am|trike|trehjul|quadro|\bcv3\b|forza|burgman|\bnss\b|\bc ?(400|650) ?(gt|x)\b|nmax|xmax|t-?max|vespa|\bpcx\b|silver ?wing|\bsh ?\d{3}\b|scooter|\btf ?\d+ ?-?e\b|elektrisk|electric|\bzero\b|energica|\bev\b/i;
function udvalgTilSidebjaelke(alle){
  if (!alle || !alle.length) return [];
  const { Sortering } = browserModules();
  const kandidater = alle.filter(l => {
    const hk = hkEllerNull(l.power);
    const pris = Number(l.price);
    const foto = l.photoUrls && l.photoUrls[0];
    const y = Number(l.year);
    return hk != null && hk <= A2_MAX_HK && Number.isFinite(pris) && pris > 0 && foto && /^https?:\/\//.test(foto)
      && y >= 1900 && y <= 2027 && !IKKE_TOHJULET.test(`${l.brand} ${l.model} ${l.variant || ''}`) && l.type !== 'scooter' && l.type !== 'cross' && String(l.brand || '').trim() && String(l.model || '').trim() && l.brand !== 'Ukendt';
  });
  const sorteret = Sortering.sorter(kandidater.slice(), 'blandet');
  const set = new Set(), ud = [];
  for (const l of sorteret){
    const k = `${l.brand}|${l.model}`.toLowerCase();
    if (set.has(k)) continue;
    set.add(k); ud.push(l);
    if (ud.length === 3) break;
  }
  return ud.length >= 2 ? ud : [];
}
function miniKort(l){
  const eks = !!l.isExternal;
  const href = eks ? sikkerUrl(l.externalUrl) : listingSlug(l);
  if (!href) return '';
  const typ = l.type ? typeLabel(l.type) : '';
  const meta = [l.year, l.km != null ? formatKm(l.km) : null, typ].filter(Boolean).join(' · ');
  const kilde = eks && l.source && l.source.navn ? `<span class="gd-pop-source">Hos ${esc(l.source.navn)}</span>` : '';
  const ext = eks ? ' target="_blank" rel="noopener noreferrer nofollow"' : '';
  return `<li><a class="gd-pop-card" href="${esc(href)}"${ext}>
          <span class="gd-pop-media"><img src="${esc(l.photoUrls[0])}" alt="" width="96" height="72" loading="lazy" decoding="async"></span>
          <span class="gd-pop-body">
            <strong class="gd-pop-title">${esc(l.brand)} ${esc(l.model)}</strong>
            <span class="gd-pop-meta">${esc(meta)}</span>
            ${kilde}
          </span>
          <span class="gd-pop-price">${esc(formatPrice(Number(l.price)))}</span>
          <span class="gd-pop-chev" aria-hidden="true">${Icon.chevronRight}</span>
          ${eks ? '<span class="visually-hidden"> (åbner i en ny fane hos kilden)</span>' : ''}
        </a></li>`;
}
function populaerModul(udvalg, bekraeftet){
  if (!udvalg.length) return '';
  return `<section class="gd-pop" aria-labelledby="gd-pop-h">
      <div class="gd-pop-head">
        <h2 id="gd-pop-h">Oplyst effekt under A2-grænsen</h2>
        <a class="gd-pop-all" href="soegning.html?koerekort=A2">Se alle ${Icon.arrowRight}</a>
      </div>
      <ul class="gd-pop-list">
        ${udvalg.map(miniKort).filter(Boolean).join('\n        ')}
      </ul>
      <p class="gd-pop-note">Udvalg pr. ${bekraeftet ? esc(bekraeftet) : 'seneste build'}, så kortene kan være ændret siden. Vi har kun kildens effekt (ikke vægt eller afledning), så det er ikke en garanti for A2. Tjek altid registreringsattesten.</p>
    </section>`;
}

/* ---------- Head ---------- */
function jsonLd(objs){
  return objs.filter(Boolean).map(o =>
    `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
}
function breadcrumbLd(items){
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: cleanUrl(it.file) })),
  };
}
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const HERO_URL = `${BASE}/img/hero-1600.webp`;

/* Samme markører som scripts/build-meta.js: kører den bagefter, erstatter den
   blokken med sin egen (og skriver da og:type "website"; se rapporten). */
function metaBlok(file, title, description, artikel){
  const url = cleanUrl(file);
  return [
    '<!-- meta:start (genereret af scripts/build-meta.js) -->',
    `<link rel="canonical" href="${url}">`,
    '<meta name="theme-color" content="#C6420E" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0F0D0A" media="(prefers-color-scheme: dark)">',
    `<meta property="og:type" content="${artikel ? 'article' : 'website'}">`,
    '<meta property="og:site_name" content="Bikerbasen">',
    '<meta property="og:locale" content="da_DK">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:image" content="${BASE}/og-image.png">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Bikerbasen — motorcykler til salg i Danmark, samlet fra danske forhandlere og markedspladser">',
    artikel ? `<meta property="article:published_time" content="${PUBLISHED}">` : null,
    artikel ? `<meta property="article:modified_time" content="${MODIFIED}">` : null,
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${attr(title)}">`,
    `<meta name="twitter:description" content="${attr(description)}">`,
    `<meta name="twitter:image" content="${BASE}/og-image.png">`,
    '<!-- meta:end -->',
  ].filter(Boolean).join('\n');
}

function head({ csp, file, title, description, artikel, ld }){
  return `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)} | Bikerbasen</title>
<meta name="description" content="${attr(description)}">
${metaBlok(file, `${title} | Bikerbasen`, description, artikel)}
<link rel="icon" href="favicon.png?v=logo1" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<script>try{var t=localStorage.getItem("bb_theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="preconnect" href="https://hkcjrwglwurdjnobewzb.supabase.co" crossorigin>
<link rel="preload" href="fonts/spacegrotesk.woff2?v=1" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="fonts/ibmplexsans.woff2?v=1" as="font" type="font/woff2" crossorigin>
<style>
@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:500 700;font-display:swap;src:url(fonts/spacegrotesk.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'IBM Plex Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/ibmplexsans.woff2?v=1) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
</style>
<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/p-guides.css">
${ld}
</head>`;
}

const SCRIPTS = `<script defer src="js/security.js"></script>
<script defer src="js/supabase-config.js"></script>
<script defer src="js/supabase-api.js"></script>
<script defer src="js/icons.js"></script>
<script defer src="js/bike-art.js"></script>
<script defer src="js/data.js"></script>
<script defer src="js/store.js"></script>
<script defer src="js/maaling.js"></script>
<script defer src="js/backend-bridge.js"></script>
<script defer src="js/components.js"></script>
<script defer src="js/guides.js"></script>`;

function hero({ crumbs, kicker, h1, ingress, meta, lille }){
  const sti = crumbs.map((c, i) => i === crumbs.length - 1
    ? `<span aria-current="page">${esc(c.name)}</span>`
    : `<a href="${c.file}">${esc(c.name)}</a><span class="bc-sep">${Icon.chevronRight}</span>`).join('');
  return `<header class="gd-hero${lille ? ' gd-hero-lille' : ''}">
    <div class="gd-hero-media" aria-hidden="true">
      <img class="gd-hero-photo" src="img/hero-1600.webp" srcset="img/hero-800.webp 800w, img/hero-960.webp 960w, img/hero-1600.webp 1600w, img/hero-2560.webp 2560w" sizes="100vw" alt="" width="1600" height="679" fetchpriority="high" decoding="async">
    </div>
    <div class="container gd-hero-inner">
      <nav class="breadcrumb gd-crumb" aria-label="Brødkrumme">${sti.replace(/<span class="bc-sep">/g, '<span class="bc-sep" aria-hidden="true">')}</nav>
      <p class="gd-kicker">${esc(kicker)}</p>
      <h1>${esc(h1)}</h1>
      <p class="gd-lede">${esc(ingress)}</p>
      ${meta || ''}
    </div>
  </header>`;
}

/* ---------- Guideside ---------- */
function renderGuide(g, ctx){
  const sektioner = g.sections.map(s => ({ ...s, html: fyldBidder(s.html) }));
  const ord = sektioner.reduce((n, s) => n + antalOrd(s.html) + antalOrd(s.title), 0);
  const min = laesetid(ord);
  const kilder = g.sources.map(k => SRC[k]);

  const toc = sektioner.map(s => `<li><a href="#${s.id}">${esc(s.toc || s.title)}</a></li>`).join('\n          ');
  const artikel = sektioner.map(s => `<section class="gd-sec" id="${s.id}" aria-labelledby="${s.id}-h">
        <h2 id="${s.id}-h">${esc(s.title)}</h2>
        ${s.html.trim()}
      </section>`).join('\n      ');

  const meta = `<ul class="gd-meta">
        <li class="gd-meta-by"><img src="logo-mark.png" alt="" width="44" height="44" loading="eager"><span><strong>Af Bikerbasen</strong><span>Redaktionel guide med kilder</span></span></li>
        <li class="gd-meta-item"><span class="gd-meta-ic" aria-hidden="true">${Icon.calendar}</span><span><span class="gd-meta-label">Opdateret</span><time datetime="${MODIFIED}">${datoDa(MODIFIED)}</time></span></li>
        <li class="gd-meta-item"><span class="gd-meta-ic" aria-hidden="true">${Icon.clock}</span><span><span class="gd-meta-label">Læsetid</span>${minutterTekst(min)}</span></li>
      </ul>`;

  const crumbs = [{ name: 'Forside', file: 'index.html' }, { name: 'Artikler & guides', file: 'guides.html' }, { name: g.navn, file: g.file }];
  const ld = jsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.h1,
      description: g.description,
      inLanguage: 'da-DK',
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
      mainEntityOfPage: { '@type': 'WebPage', '@id': cleanUrl(g.file) },
      image: [HERO_URL],
      author: { '@type': 'Organization', name: 'Bikerbasen', url: `${BASE}/` },
      publisher: { '@type': 'Organization', name: 'Bikerbasen', url: `${BASE}/`, logo: { '@type': 'ImageObject', url: `${BASE}/og-image.png` } },
    },
    breadcrumbLd(crumbs),
  ]);

  const tldr = `<section class="gd-tldr" aria-labelledby="gd-tldr-h">
      <h2 id="gd-tldr-h"><span class="gd-tldr-ic">${BULB}</span>Kort fortalt</h2>
      <ul class="gd-checks">
        ${g.tldr.map(t => `<li><span class="gd-check" aria-hidden="true">${Icon.check}</span><span>${esc(t)}</span></li>`).join('\n        ')}
      </ul>
      <a class="btn btn-primary gd-cta" href="soegning.html">Søg motorcykler på Bikerbasen ${Icon.arrowRight}</a>
    </section>`;
  const tvivl = `<section class="gd-dark" aria-labelledby="gd-dark-h">
      <h2 id="gd-dark-h">Er du i tvivl om, hvad du må køre?</h2>
      <p>Se grænserne for effekt og alder, og hvordan kørekortkategorierne hænger sammen.</p>
      <a class="btn btn-outline gd-dark-btn" href="koerekort-a2.html">Læs om kørekort ${Icon.arrowRight}</a>
    </section>`;

  return `${head({ csp: ctx.csp, file: g.file, title: g.title, description: g.description, artikel: true, ld })}
<body class="gd-page">
${ctx.header}

<main id="main-content">
  ${hero({ crumbs, kicker: 'GUIDE', h1: g.h1, ingress: g.ingress, meta })}

  <div class="container gd-layout">
    <div class="gd-main">
      <nav class="gd-toc" aria-labelledby="gd-toc-h">
        <h2 id="gd-toc-h"><span class="gd-toc-ic" aria-hidden="true">${Icon.list}</span>Indholdsfortegnelse</h2>
        <ol style="--gd-toc-rows:${Math.ceil(sektioner.length / 2)}">
          ${toc}
        </ol>
      </nav>

      <article class="gd-article">
      ${artikel}

      <section class="gd-sources" id="kilder" aria-labelledby="kilder-h">
        <h2 id="kilder-h">Kilder</h2>
        <ul>
          ${kilder.map(k => `<li><a href="${esc(k.url)}" rel="noopener noreferrer">${esc(k.label)}</a></li>`).join('\n          ')}
        </ul>
        <p class="gd-sources-note">Reglerne er læst i de officielle tekster den ${datoDa(MODIFIED)}. Regler og beløb kan ændre sig. Tjek altid den aktuelle tekst hos myndighederne, og se din motorcykels registreringsattest, før du køber. Bikerbasen er et indeks over annoncer og giver ikke juridisk rådgivning.</p>
      </section>
      </article>
    </div>

    <aside class="gd-side" aria-label="Kort fortalt og genveje">
      ${tldr}
      ${tvivl}
      ${ctx.populaer}
    </aside>
  </div>
</main>

${ctx.footer}

${SCRIPTS}
</body>
</html>
`;
}

/* ---------- Oversigt ---------- */
const OVERSIGT = {
  file: 'guides.html',
  title: 'Artikler & guides om motorcykler',
  description: 'Redaktionelle guides fra Bikerbasen: din første motorcykel, motorcykler til A2-kørekort og tjekliste til køb af brugt motorcykel. Med kilder.',
  h1: 'Artikler & guides',
  ingress: 'Jordnære guides til dig, der skal vælge, købe eller køre motorcykel. Reglerne er læst i officielle danske kilder, og kilderne står nederst i hver guide.',
};
function guideMinutter(g){
  const ord = g.sections.reduce((n, s) => n + antalOrd(fyldBidder(s.html)) + antalOrd(s.title), 0);
  return laesetid(ord);
}
function renderOversigt(ctx){
  const crumbs = [{ name: 'Forside', file: 'index.html' }, { name: 'Artikler & guides', file: OVERSIGT.file }];
  const kort = GUIDES.map(g => `<li class="gd-card">
        <a class="gd-card-link" href="${g.file}">
          <span class="gd-card-media"><img src="${g.cardImage}" alt="" style="object-position:${g.cardPos}" width="480" height="360" loading="lazy" decoding="async"></span>
          <span class="gd-card-body">
            <span class="gd-card-kicker">Guide</span>
            <h2 class="gd-card-title">${esc(g.navn)}</h2>
            <span class="gd-card-text">${esc(g.ingress)}</span>
            <span class="gd-card-foot"><span class="gd-card-time"><span class="gd-meta-ic" aria-hidden="true">${Icon.clock}</span>Læsetid ${minutterTekst(guideMinutter(g))}</span><span class="gd-card-go">Læs guiden ${Icon.arrowRight}</span></span>
          </span>
        </a>
      </li>`).join('\n      ');
  const ld = jsonLd([
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: OVERSIGT.h1,
      description: OVERSIGT.description,
      inLanguage: 'da-DK',
      url: cleanUrl(OVERSIGT.file),
      isPartOf: { '@type': 'WebSite', name: 'Bikerbasen', url: `${BASE}/` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: GUIDES.length,
        itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: cleanUrl(g.file), name: g.navn })),
      },
    },
    breadcrumbLd(crumbs),
  ]);
  return `${head({ csp: ctx.csp, file: OVERSIGT.file, title: OVERSIGT.title, description: OVERSIGT.description, artikel: false, ld })}
<body class="gd-page">
${ctx.header}

<main id="main-content">
  ${hero({ crumbs, kicker: 'ARTIKLER & GUIDES', h1: OVERSIGT.h1, ingress: OVERSIGT.ingress, lille: true })}

  <div class="container gd-overview">
    <ul class="gd-cards">
      ${kort}
    </ul>

    <section class="gd-more" aria-labelledby="gd-more-h">
      <h2 id="gd-more-h">Mere hjælp til købet</h2>
      <div class="popular-row">
        <a class="popular-chip" href="koerekort-a1.html">Kørekort A1</a>
        <a class="popular-chip" href="koerekort-a2.html">Kørekort A2</a>
        <a class="popular-chip" href="maerker.html">Alle mærker</a>
        <a class="popular-chip" href="sikkerhed.html">Sikkerhed &amp; gode råd</a>
        <a class="popular-chip" href="soegning.html">Søg motorcykler</a>
      </div>
    </section>
  </div>
</main>

${ctx.footer}

${SCRIPTS}
</body>
</html>
`;
}

/* ---------- Sitemap: samme mekanisme som build-facet-pages.js ---------- */
function udvidSitemap(filer){
  const p = path.join(ROOT, 'sitemap.xml');
  if (!fs.existsSync(p)) throw new Error('build-guides: sitemap.xml findes ikke. Kør efter build-brand-pages.js (se scripts/build.js).');
  let xml = fs.readFileSync(p, 'utf8');
  if (!/<\/urlset>/.test(xml)) throw new Error('build-guides: sitemap.xml har ikke </urlset>.');
  // Idempotent: fjern tidligere guide-linjer, før de skrives igen.
  xml = xml.split('\n').filter(l => !/<loc>[^<]*\/(guides|guide-[^<]*)<\/loc>/.test(l)).join('\n');
  const nye = filer.map(f => `  <url><loc>${cleanUrl(f)}</loc><lastmod>${MODIFIED}</lastmod></url>`);
  xml = xml.replace(/\n*<\/urlset>\s*$/, '\n' + nye.join('\n') + '\n</urlset>\n');
  fs.writeFileSync(p, xml, 'utf8');
  return nye.length;
}

/* ---------- Data ---------- */
async function hentAlt(){
  const { normalizeRemoteListing, normalizeExternalListing, markerTvaerkildeDubletter } = browserModules();
  const egne = (await fetchListings(global.__GD_L)).map(normalizeRemoteListing);
  const eksterne = markerTvaerkildeDubletter((await fetchExternalListings()).map(normalizeExternalListing)).beholdt;
  return [...egne, ...eksterne];
}
function senest(items){
  const d = items.map(l => l.sidstSet || l.sidst_set).filter(Boolean).sort();
  if (!d.length) return null;
  const x = new Date(d[d.length - 1]);
  return Number.isFinite(x.getTime()) ? x.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

function byg(alle){
  const { header, footer, csp } = siteParts();
  const udvalg = udvalgTilSidebjaelke(alle);
  const ctx = { header, footer, csp, populaer: populaerModul(udvalg, alle && alle.length ? senest(alle) : null) };
  const skrevet = [];
  for (const g of GUIDES){
    fs.writeFileSync(path.join(ROOT, g.file), renderGuide(g, ctx), 'utf8');
    skrevet.push(g.file);
  }
  fs.writeFileSync(path.join(ROOT, OVERSIGT.file), renderOversigt(ctx), 'utf8');
  skrevet.unshift(OVERSIGT.file);
  return { skrevet, udvalg: udvalg.length };
}

if (require.main === module){
  (async () => {
    let alle = [];
    try { alle = await hentAlt(); }
    catch (e){ console.warn(`build-guides: lageret kunne ikke hentes (${e.message}). Sidebjælkens annoncekort udelades.`); }
    const { skrevet, udvalg } = byg(alle);
    console.log(`Byggede ${skrevet.length} guidesider: ${skrevet.join(', ')} (sidebjælkens annoncekort: ${udvalg}).`);
    if (fs.existsSync(path.join(ROOT, 'sitemap.xml'))){
      console.log(`Tilføjede ${udvidSitemap(skrevet)} guide-URL'er til sitemap.xml.`);
    }
  })().catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { populaerModul, byg, renderGuide, renderOversigt, udvalgTilSidebjaelke, laesetid, antalOrd, guideMinutter, OVERSIGT, cleanUrl, udvidSitemap };
