/* Genererer en rigtig HTML-side pr. annonce.

   annonce.html?id=... bygger hele sit indhold med JavaScript. En crawler ser
   115 ord og <!-- filled by JS --> dér hvor motorcyklen skulle stå. Google
   kan godt koere JavaScript, men det sker i en forsinket anden runde, og
   annoncesiderne er praecis dem der skal rangere paa "Yamaha Virago 535 1990".
   123mc serverer deres faerdige fra serveren.

   Her skrives titel, overskrift, specifikationer, beskrivelse, udstyr og
   struktureret data direkte i markup. js/annonce.js overtager bagefter og
   goer siden interaktiv — galleri, favorit, kontakt.

   Koer:  node scripts/build-listing-pages.js
   Forældede sider ryddes automatisk, saa en solgt annonce ikke bliver
   liggende og kan findes via Google. */

const fs = require('fs');
const path = require('path');
const { ROOT, siteUrl, listingSlug, fetchListings, siteParts, esc } = require('./shared');

// data.js giver os formatPrice, typeLabel, equipmentLabel osv.
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(dataSrc + '\nglobal.__L = LISTINGS;');

const BASE = siteUrl();
const { header, footer, csp, contactModal } = siteParts();
const VERSION = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .match(/css\/styles\.css\?v=([a-z0-9]+)/) || [, ''])[1];
const v = VERSION ? `?v=${VERSION}` : '';

function specRow(label, value){
  return value == null || value === '' ? ''
    : `        <div class="spec-item"><span class="spec-icon">${esc(label)}</span><b>${esc(value)}</b></div>`;
}

function jsonLd(l, url){
  const navn = `${l.brand} ${l.model}`;
  const billeder = (l.photoUrls || []).length ? l.photoUrls : [`${BASE}/og-image.png`];
  const vehicle = {
    '@context': 'https://schema.org',
    /* Google lukkede sit eget "Vehicle listing"-rige resultat i september
       2025 og henviser nu til almindelig Product-struktureret data (se
       work/DECISIONS.md, samme begrundelse som js/seo.js seoListingPage()).
       Ren "Product" mangler domæne for kilometertal, motor og årgangsdato
       (de hører til Vehicle/Motorcycle), så typen er BEGGE dele — gyldigt,
       fordi schema.org tillader en liste af typer, og fordi Motorcycle
       alligevel nedarver fra Product (Thing > Product > Vehicle >
       Motorcycle). Skal matche js/seo.js's egen kopi af samme objekt,
       ellers hydrerer runtime-udgaven serversidens JSON-LD væk med en
       anden type. */
    '@type': ['Product', 'Motorcycle'],
    name: navn,
    brand: { '@type': 'Brand', name: l.brand },
    model: l.model,
    vehicleModelDate: String(l.year),
    productionDate: String(l.year),
    itemCondition: 'https://schema.org/UsedCondition',
    url,
    image: billeder,
    description: l.description || '',
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: l.km, unitCode: 'KMT' },
    vehicleEngine: {
      '@type': 'EngineSpecification',
      engineDisplacement: { '@type': 'QuantitativeValue', value: l.ccm, unitCode: 'CMQ' },
    },
  };
  // Samme regel som js/seo.js: "price": null er en ugyldig Offer, ikke en
  // tavs oplysning, og en egen annonce har prisen som obligatorisk felt i
  // opret-annonce.js — men skulle den alligevel mangle, gætter vi den ikke.
  if (l.price != null){
    vehicle.offers = {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'DKK',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
      url,
      areaServed: { '@type': 'Country', name: 'Danmark' },
      // En forhandler er en offentlig virksomhed — navn og adresse må gerne
      // stå i struktureret data. En privat sælger er en privatperson: kun
      // salgsstedets by tages med, aldrig navnet.
      seller: l.seller?.is_dealer
        ? { '@type': 'AutoDealer', name: l.seller.name || 'Forhandler',
            address: { '@type': 'PostalAddress', addressLocality: l.city, postalCode: l.postnr, addressCountry: 'DK' } }
        : { '@type': 'Person',
            address: { '@type': 'PostalAddress', addressLocality: l.city, addressCountry: 'DK' } },
    };
  }
  if (l.power) vehicle.vehicleEngine.enginePower = { '@type': 'QuantitativeValue', value: l.power, unitText: 'hk' };
  if (l.fuel) vehicle.fuelType = l.fuel;
  if (l.color) vehicle.color = l.color;

  /* Forside og søgefacet uden ".html" — samme rettelse som js/seo.js's
     breadcrumb() (SEO-runde 3's kritiker, work/SEO-dom-runde3.md afsnit 9):
     canonical for index.html og soegning.html mistede endelsen i en
     tidligere runde (scripts/build-meta.js's cleanUrl()), men denne fils
     BreadcrumbList blev ikke rettet med. En brødkrumme, der peger på en
     adresse siden selv har opgivet som sin kanoniske, er en selvmodsigelse
     i sitets EGEN strukturerede data. Tredje led (`url`, annoncens egen
     side) beholder ".html" med vilje — det ER dens rigtige adresse. */
  const brød = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Forside', item: `${BASE}` },
      { '@type': 'ListItem', position: 2, name: typeLabel(l.type), item: `${BASE}/soegning?type=${l.type}` },
      { '@type': 'ListItem', position: 3, name: navn, item: url },
    ],
  };
  /* id'erne skal matche dem js/seo.js bruger. Seo.setJsonLd fjerner en
     blok med samme id foer den skriver sin egen, saa hydreringen erstatter
     disse i stedet for at lægge et ekstra saet struktureret data paa siden. */
  return [['jsonld-vehicle', vehicle], ['jsonld-breadcrumb', brød]]
    .map(([id, o]) => `<script type="application/ld+json" id="${id}">\n${JSON.stringify(o).replace(/</g, '\\u003c')}\n</script>`)
    .join('\n');
}

function side(l){
  const fil = listingSlug(l);
  const url = `${BASE}/${fil}`;
  const navn = `${l.brand} ${l.model}`;
  const billeder = l.photoUrls || [];
  const udstyr = l.equipment || [];

  const dele = [`Årgang ${l.year}`, formatKm(l.km), formatCcm(l.ccm), l.condition].filter(Boolean);
  const titel = `${navn} ${l.year} — ${formatPrice(l.price)} — Bikerbasen`;
  const beskr = `${navn}, ${dele.join(', ')}. Til salg i ${l.city} på Bikerbasen.`;
  const ogBillede = billeder[0] || `${BASE}/og-image.png`;

  return `<!doctype html>
<html lang="da">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${csp}
<meta name="referrer" content="strict-origin-when-cross-origin">
<title id="page-title">${esc(titel)}</title>
<meta name="description" content="${esc(beskr)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#C6420E" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F0D0A" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Bikerbasen">
<meta property="og:locale" content="da_DK">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beskr)}">
<meta property="og:image" content="${esc(ogBillede)}">
<meta property="product:price:amount" content="${l.price}">
<meta property="product:price:currency" content="DKK">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titel)}">
<meta name="twitter:description" content="${esc(beskr)}">
<meta name="twitter:image" content="${esc(ogBillede)}">
<!-- js/annonce.js henter id herfra naar siden ikke er kaldt med ?id= -->
<meta name="listing-id" content="${esc(l.id)}">
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
${billeder.length ? `<link rel="preload" as="image" href="${esc(billeder[0])}" fetchpriority="high">
` : ''}<link rel="stylesheet" href="css/styles.css${v}">
${jsonLd(l, url)}
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <nav class="breadcrumb" aria-label="Brødkrumme">
      <a href="index.html">Forside</a><span class="bc-sep"></span>
      <a href="soegning.html?type=${esc(l.type)}" id="bc-type">${esc(typeLabel(l.type))}</a><span class="bc-sep"></span>
      <span id="bc-current">${esc(navn)}</span>
    </nav>

    <h1 id="listing-h1">${esc(navn)}</h1>

    <!-- Indholdet herunder er skrevet ved build, saa crawlere og browsere
         uden JavaScript ser hele annoncen. js/annonce.js erstatter det med
         den interaktive udgave naar siden er indlaest. -->
    <div class="listing-detail" id="listing-detail">
      <div>
${billeder.length ? `        <div class="prerender-gallery">
${billeder.map((u, i) => `          <img src="${esc(u)}" alt="${esc(navn)} — billede ${i + 1} af ${billeder.length}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async" width="800" height="600">`).join('\n')}
        </div>` : ''}

        <div class="listing-header">
          <div>
            <p class="listing-title">${esc(navn)}</p>
            <div class="listing-loc">${esc(l.city)}, ${esc(l.postnr)} · ${esc(l.region)}</div>
          </div>
          <div class="listing-price-block">
            <div class="listing-price-label">Pris</div>
            <div class="listing-price">${formatPrice(l.price)}</div>
          </div>
        </div>

        <div class="spec-grid" style="margin-top:var(--space-4);">
${[
  specRow('Mærke', l.brand),
  specRow('Model', l.model),
  specRow('Årgang', l.year),
  specRow('Km-stand', formatKm(l.km)),
  specRow('Motorstørrelse', formatCcm(l.ccm)),
  l.power ? specRow('Effekt', formatPower(l.power)) : '',
  specRow('Type', typeLabel(l.type)),
  specRow('Stand', l.condition),
  specRow('Registrering', l.registration),
  specRow('Afgift', l.afgift),
  specRow('Brændstof', l.fuel),
  specRow('Træktype', l.drive),
  specRow('Cylindre', l.cylinders),
  specRow('Farve', l.color),
].filter(Boolean).join('\n')}
        </div>

        <div class="detail-section">
          <h2>Beskrivelse</h2>
          <p class="desc">${esc(l.description || '')}</p>
        </div>

${udstyr.length ? `        <div class="detail-section" style="margin-top:var(--space-5);">
          <h2>Udstyr</h2>
          <ul class="equipment-list">
${udstyr.map(e => `            <li>${esc(equipmentLabel(e))}</li>`).join('\n')}
          </ul>
        </div>` : ''}
      </div>

      <!-- Sælgeren udelades bevidst af den statiske markup: navn og kontakt
           er kun for indloggede brugere, og skal derfor heller ikke ligge i
           kilden, hvor en crawler kunne samle det op. js/annonce.js bygger
           enten login-kortet eller det fulde sælgerkort, alt efter session. -->
      <div>
        <div class="sidebar-card">
          <div class="seller-sub">${l.seller?.is_dealer ? 'Forhandler' : 'Privat sælger'} · ${esc(l.city)}</div>
          <p style="margin-top:12px; font-size:14px; color:var(--color-fg-muted);">
            Log ind for at se sælger og kontaktoplysninger.
          </p>
          <a href="soegning.html?type=${esc(l.type)}" class="btn btn-outline btn-block" style="margin-top:12px;">Se lignende ${esc(typeLabel(l.type))}</a>
        </div>
      </div>
    </div>

    <section class="similar-strip">
      <div class="section-head"><div><h2>Lignende annoncer</h2></div></div>
      <div class="listings-grid compact" id="similar-listings"></div>
    </section>
  </div>
</main>

<!-- Kontaktbjaelke (mobil). Staar i markuppen, saa den er der ved foerste
     maling; js/annonce.js kobler knapperne paa de samme handlinger som
     kortet i sidebjaelken. position:fixed => skubber intet (ingen CLS). -->
<div class="listing-actionbar" id="listing-actionbar" hidden>
  <button type="button" class="btn btn-primary" id="bar-contact">Skriv til sælger</button>
  <button type="button" class="btn btn-outline" id="bar-phone" aria-label="Vis telefonnummer">Ring op</button>
</div>

${footer}

${contactModal}

<script defer src="js/security.js${v}"></script>
<script defer src="js/vendor/supabase.js"></script>
<script defer src="js/supabase-config.js${v}"></script>
<script defer src="js/supabase-api.js${v}"></script>
<script defer src="js/icons.js${v}"></script>
<script defer src="js/bike-art.js${v}"></script>
<script defer src="js/postnumre.js${v}"></script>
<script defer src="js/data.js${v}"></script>
<script defer src="js/store.js${v}"></script>
<script defer src="js/maaling.js${v}"></script>
<script defer src="js/backend-bridge.js${v}"></script>
<script defer src="js/components.js${v}"></script>
<script defer src="js/seo.js${v}"></script>
<script defer src="js/annonce.js${v}"></script>
</body>
</html>
`;
}

(async () => {
  const listings = await fetchListings(global.__L);

  const forventede = new Set(listings.map(listingSlug));
  let slettet = 0;
  for (const f of fs.readdirSync(ROOT)){
    if (/^annonce-.+\.html$/.test(f) && !forventede.has(f)){
      fs.unlinkSync(path.join(ROOT, f));
      slettet++;
    }
  }
  if (slettet) console.log(`Fjernede ${slettet} foraeldede annoncesider.`);

  let bygget = 0;
  for (const l of listings){
    fs.writeFileSync(path.join(ROOT, listingSlug(l)), side(l), 'utf8');
    bygget++;
  }
  console.log(`Byggede ${bygget} annoncesider.`);
})().catch(e => { console.error(e.message); process.exit(1); });
