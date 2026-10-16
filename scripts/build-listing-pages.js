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
const { tjekAntal, tjekSletninger, taelAnnonceSider } = require('./seo-vagt');

// data.js giver os formatPrice, typeLabel, equipmentLabel osv.
const dataSrc = fs.readFileSync(path.join(ROOT, 'js/data.js'), 'utf8');
eval(dataSrc + '\nglobal.__L = LISTINGS;');

const BASE = siteUrl();
const { header, footer, csp, contactModal } = siteParts();
const VERSION = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .match(/css\/styles\.css\?v=([a-z0-9]+)/) || [, ''])[1];
const v = VERSION ? `?v=${VERSION}` : '';

/* Ikonerne er de samme som js/annonce.js bruger (js/icons.js), så markup før JS = markup efter JS. */
const Icon = (() => { const src = fs.readFileSync(path.join(ROOT, 'js/icons.js'), 'utf8'); return new Function(src + ';return Icon;')(); })();

/* Brødkrumme og handlingsrække skrives her med PRÆCIS samme markup som anBrodkrumme()/anAktioner() i
   js/annonce.js, så siden ikke skifter udseende eller flytter sig, når scriptet hydrerer. "Ukendt" er
   ikke et mærke man kan søge på, så leddet udelades (samme regel som i js/annonce.js). */
function brodkrumme(l){
  const maerkeOK = l.brand && l.brand !== 'Ukendt';
  const enc = encodeURIComponent;
  const led = [['index.html', 'Forside'], ['soegning.html', 'Motorcykler']];
  if (maerkeOK) led.push([`soegning.html?brands=${enc(l.brand)}`, l.brand]);
  if (maerkeOK && l.model) led.push([`soegning.html?brands=${enc(l.brand)}&model=${enc(l.model)}`, l.model]);
  const sidste = [maerkeOK ? l.brand : '', l.model].filter(Boolean).join(' ') || 'Annonce';
  return led.map(([h, t]) => `<a href="${esc(h)}">${esc(t)}</a><span class="bc-sep">${Icon.chevronRight}</span>`).join('')
    + `<span id="bc-current" aria-current="page">${esc(sidste)}${l.year ? ` (${esc(String(l.year))})` : ''}</span>`;
}

function aktioner(l){
  const id = esc(String(l.id));
  return `
    <button type="button" class="an-act" id="share-listing-btn">${Icon.share}<span>Del annonce</span></button>
    <button type="button" class="an-act" data-compare-toggle="${id}" aria-pressed="false">${Icon.compare}<span>Sammenlign</span></button>
    ${l.isExternal ? '' : `<button type="button" class="an-act an-fav " aria-pressed="false" data-fav-toggle="${id}">${Icon.heart}<span class="an-fav-off">Gem som favorit</span><span class="an-fav-on">Gemt som favorit</span></button>`}`;
}

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
      { '@type': 'ListItem', position: 2, name: 'Motorcykler', item: `${BASE}/soegning` },
      { '@type': 'ListItem', position: 3, name: l.brand, item: `${BASE}/soegning?brands=${encodeURIComponent(l.brand)}` },
      { '@type': 'ListItem', position: 4, name: l.model, item: `${BASE}/soegning?brands=${encodeURIComponent(l.brand)}&model=${encodeURIComponent(l.model)}` },
      { '@type': 'ListItem', position: 5, name: `${navn} (${l.year})`, item: url },
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
  /* W7: description 120-160 tegn. Felterne er annoncens egne; den faste slutning tilføjer kun, hvad siden faktisk viser. */
  const grundBeskr = `${navn}, ${dele.join(', ')}. Til salg i ${l.city} på Bikerbasen.`;
  const beskr = grundBeskr.length < 120 && (grundBeskr + ' Se pris, billeder og sælgers oplysninger.').length <= 160 ? grundBeskr + ' Se pris, billeder og sælgers oplysninger.' : grundBeskr;
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
<link rel="stylesheet" href="css/p-annonce.css">
${jsonLd(l, url)}
</head>
<body>
${header}

<main id="main-content">
  <div class="container">
    <div class="an-crumbrow">
      <nav class="breadcrumb" id="bc-nav" aria-label="Brødkrumme">
        ${brodkrumme(l)}
      </nav>
      <div class="an-actions" id="an-actions">${aktioner(l)}</div>
    </div>

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
  specRow('Kilometer', formatKm(l.km)),
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
      <div class="section-head"><div><h2>Lignende motorcykler</h2></div><a class="an-link" id="similar-all" href="soegning.html" hidden>Se alle lignende motorcykler</a></div>
      <div class="listings-grid compact" id="similar-listings"></div>
    </section>
    <nav class="an-videre" id="an-videre" aria-label="Søg videre" hidden></nav>
  </div>
</main>

<!-- Kontaktbjaelke (mobil). Staar i markuppen, saa den er der ved foerste
     maling; js/annonce.js kobler knapperne paa de samme handlinger som
     kortet i sidebjaelken. position:fixed => skubber intet (ingen CLS). -->
<div class="listing-actionbar" id="listing-actionbar" hidden>
  <button type="button" class="btn btn-outline" id="bar-phone">Vis nummer</button>
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
<script defer src="js/filtrering.js${v}"></script>
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

if (require.main === module) (async () => {
  /* S-005: kraevDatabase => en fejlet hentning kaster i stedet for at give js/data.js'
     tomme liste, og tjekAntal() nedenfor stopper et drastisk fald (< 50 % af de
     committede annonce-*.html) FØR en eneste fil slettes. */
  const listings = await fetchListings(global.__L, { kraevDatabase: true });
  // nulErFejl: 0 egne annoncer med committede sider er signaturen på en tom hentning (gulvet på 20 gælder
  // ellers ikke for så få sider) — så slettes intet.
  tjekAntal('Egne annoncesider', listings.length, taelAnnonceSider(ROOT), { nulErFejl: true });

  const forventede = new Set(listings.map(listingSlug));
  const tilSletning = fs.readdirSync(ROOT).filter(f => /^annonce-.+\.html$/.test(f) && !forventede.has(f));
  tjekSletninger('Annoncesider', tilSletning.length, taelAnnonceSider(ROOT));
  /* Kaldes den fra scripts/build.js, SLETTES intet her: listen skrives til BB_SLETTELISTE, og build.js sletter
     først, når ALLE datatrin er lykkedes. Springes et senere trin over, gendannes det gamle sitemap — og
     det (samt de ikke-opdaterede mærke-/budgetsider) ville ellers pege på sider, der var slettet (404). */
  if (process.env.BB_SLETTELISTE){
    fs.writeFileSync(process.env.BB_SLETTELISTE, JSON.stringify(tilSletning));
    if (tilSletning.length) console.log(`Udskyder sletning af ${tilSletning.length} annoncesider til alle datatrin er lykkedes: ${tilSletning.join(', ')}.`);
  }
  let slettet = 0;
  if (!process.env.BB_SLETTELISTE) for (const f of tilSletning){ fs.unlinkSync(path.join(ROOT, f)); slettet++; }
  if (slettet) console.log(`Fjernede ${slettet} foraeldede annoncesider: ${tilSletning.join(', ')}.\n::warning title=Sider fjernet::${slettet} annonceside(r) slettet (${tilSletning.join(', ')}).`);

  let bygget = 0;
  for (const l of listings){
    fs.writeFileSync(path.join(ROOT, listingSlug(l)), side(l), 'utf8');
    bygget++;
  }
  console.log(`Byggede ${bygget} annoncesider.`);
})().catch(e => require('./seo-vagt').afslut(e));

module.exports = { side, brodkrumme, aktioner };
