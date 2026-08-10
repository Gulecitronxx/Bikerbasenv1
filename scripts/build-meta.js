/* Skriver deleliste-metatags (canonical, Open Graph, Twitter Card) ind i alle
   HTML-sider ud fra sidens egen <title> og <meta name="description">.

   Uden dem viser Facebook, Messenger og LinkedIn kun en nøgen URL når nogen
   deler en annonce i en MC-gruppe — og det er dér trafikken kommer fra.
   Både bilbasen.dk og 123mc.dk har fuld dækning her.

   Blokken mellem meta:start og meta:end er genereret. Ret titel og
   description i selve siden, og kør scriptet igen:  node scripts/build-meta.js

   Sider med dynamisk indhold (annonce, forhandler) får kun et grundlag her —
   js/seo.js overskriver titel, description og og:-tags når annoncen er hentet. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Adressen står i js/seo.js, så den kun skal rettes ét sted ved domæneskift.
const BASE = require('./site-url')(ROOT);
const OG_IMAGE = `${BASE}/og-image.png`;

/* Sider bag login eller uden selvstændig værdi i et søgeresultat. */
const NOINDEX = new Set(['dashboard.html', 'mine-annoncer.html', 'login.html']);

const START = '<!-- meta:start (genereret af scripts/build-meta.js) -->';
const END = '<!-- meta:end -->';

function attr(s){
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function metaBlock(file, title, description){
  const url = `${BASE}/${file}`;
  const lines = [
    START,
    `<link rel="canonical" href="${url}">`,
    NOINDEX.has(file) ? '<meta name="robots" content="noindex, follow">' : null,
    '<meta name="theme-color" content="#C6420E" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#0F0D0A" media="(prefers-color-scheme: dark)">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Bikerbasen">',
    '<meta property="og:locale" content="da_DK">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(description)}">`,
    `<meta property="og:image" content="${OG_IMAGE}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Bikerbasen — køb og sælg brugte motorcykler i Danmark">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${attr(title)}">`,
    `<meta name="twitter:description" content="${attr(description)}">`,
    `<meta name="twitter:image" content="${OG_IMAGE}">`,
    END,
  ];
  return lines.filter(Boolean).join('\n');
}

/* Forsidens Organization/WebSite-blok. Den lå hårdkodet i index.html med
   domænet skrevet ind seks steder — endnu et sted at glemme ved et
   domæneskift. Nu genereres den her ud fra BASE. */
const JSONLD_START = '<!-- jsonld:start (genereret af scripts/build-meta.js) -->';
const JSONLD_END = '<!-- jsonld:end -->';

function siteJsonLd(){
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: `${BASE}/`,
        name: 'Bikerbasen',
        inLanguage: 'da-DK',
        description: 'Danmarks mødested for køb og salg af brugte motorcykler.',
        publisher: { '@id': `${BASE}/#org` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/soegning.html?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${BASE}/#org`,
        name: 'Bikerbasen',
        url: `${BASE}/`,
        logo: OG_IMAGE,
        areaServed: { '@type': 'Country', name: 'Danmark' },
      },
    ],
  };
  return `${JSONLD_START}\n<script type="application/ld+json">\n${JSON.stringify(graph)}\n</script>\n${JSONLD_END}`;
}

let written = 0;
const skipped = [];

for (const file of fs.readdirSync(ROOT).sort()){
  if (!file.endsWith('.html')) continue;
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1];
  const description = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!title || !description){ skipped.push(file); continue; }

  const block = metaBlock(file, title.trim(), description);

  // Riv den gamle blok ud først, så håndskrevne canonicals udenfor kan fjernes
  // uden at ramme den vi selv er ved at skrive. Blokken er eneste kilde til
  // canonical — ellers ender siden med to og Google vælger selv.
  html = html.replace(new RegExp(`\\n?${START.replace(/[()*]/g, '\\$&')}[\\s\\S]*?${END}`), '');
  html = html.replace(/\n?<link rel="canonical"[^>]*>/g, '');

  html = html.replace(
    /(<meta name="description" content="[^"]*">)/,
    `$1\n${block}`
  );

  // Kun forsiden bærer site-blokken; på undersider ville den være støj.
  if (file === 'index.html'){
    const ld = siteJsonLd();
    if (html.includes(JSONLD_START)){
      html = html.replace(new RegExp(`${JSONLD_START.replace(/[()*]/g, '\\$&')}[\\s\\S]*?${JSONLD_END}`), ld);
    } else {
      // Erstat en tidligere håndskrevet blok, ellers læg den før </head>.
      html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\n?/, '');
      html = html.replace('</head>', `${ld}\n</head>`);
    }
  }

  if (html !== before){ fs.writeFileSync(full, html, 'utf8'); written++; }
}

console.log(`Delemetatags skrevet i ${written} HTML-filer.`);
if (skipped.length) console.log(`Sprunget over (mangler title eller description): ${skipped.join(', ')}`);
