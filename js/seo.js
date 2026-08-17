/* Dynamiske SEO- og delingstags.

   De statiske sider får deres og:-tags af scripts/build-meta.js, men annonce-
   og forhandlersiderne kender først deres indhold når data er hentet. Her
   opdaterer vi titel, description, canonical og Open Graph bagefter, og
   lægger struktureret data (JSON-LD) på siden.

   Struktureret data er det, der giver pris, årgang og km direkte i Googles
   søgeresultat. Både bilbasen.dk og 123mc.dk kører det på deres annoncesider. */

/* Sidens adresse — ÉN kilde til sandhed.

   Den bruges i canonical, og:url og struktureret data, og byggescripterne
   (build-meta.js, build-brand-pages.js) læser linjen herfra i stedet for at
   have deres egen kopi. Skifter du domæne, er det kun denne linje der skal
   rettes; kør derefter:
     node scripts/build-meta.js && node scripts/build-brand-pages.js
     node scripts/stamp-version.js

   Ingen skråstreg til sidst. */
const SITE_URL = 'https://bikerbasen.dk';
const SITE_NAME = 'Bikerbasen';

const Seo = (function(){

  function setMeta(selector, attrName, attrValue, content){
    if (content == null) return;
    let el = document.head.querySelector(selector);
    if (!el){
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setLink(rel, href){
    if (!href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el){
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  /* Titel, description, canonical og delingsbillede i ét kald. */
  function setSocial({ title, description, url, image, type }){
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[property="og:type"]', 'property', 'og:type', type || 'website');
    if (image){
      setMeta('meta[property="og:image"]', 'property', 'og:image', image);
      setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
      // Højde/bredde passer kun på standardbilledet — fjern dem for annoncefotos,
      // så Facebook selv måler i stedet for at tro på forkerte tal.
      document.head.querySelectorAll('meta[property="og:image:width"], meta[property="og:image:height"]')
        .forEach(el => el.remove());
    }
    setLink('canonical', url);
  }

  /* Lægger (eller erstatter) en JSON-LD-blok. id'et gør kaldet idempotent,
     så en gen-render ikke efterlader to sæt struktureret data på siden. */
  function setJsonLd(id, data){
    const domId = 'jsonld-' + id;
    document.getElementById(domId)?.remove();
    if (!data) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = domId;
    // JSON.stringify slipper ikke </script> ud af sig selv.
    el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    document.head.appendChild(el);
  }

  function breadcrumb(items){
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: `${SITE_URL}/${it.path}`,
      })),
    };
  }

  return { setSocial, setJsonLd, breadcrumb, setMeta, setLink };
})();

/* ---- Sidetyper ---- */

/* Annoncesiden: Vehicle med et Offer, så pris og specifikationer kan vises
   direkte i søgeresultatet. */
/* Adressen paa annoncens forrenderede side — eller null, hvis annoncen ikke
   HAR en.

   Filnavnet skal give det samme som scripts/shared.js listingSlug, ellers ville
   canonical fra annonce.html?id= pege paa en side, der ikke findes.

   Og netop derfor null-grenen. Kun VORES egne annoncer bliver forrenderet af
   scripts/build-listing-pages.js. En indekseret annonce faar ingen fil, og den
   er dertil `noindex, follow` (js/annonce.js) — vi ejer ikke indholdet, og en
   kopi skal ikke konkurrere med originalen. Funktionen blev alligevel kaldt for
   dem, og resultatet blev maalt paa produktion: soegesidens ItemList navngav
   https://bikerbasen.dk/annonce-honda-cbr-250-r-2011-72eb6a40.html, som svarer
   404. Google fik en liste, hvor hver enkelt adresse var doed.

   Der er intet at rette i selve slug'en. Fejlen er at spoerge om en adresse,
   der ikke findes — saa den maa kunne svare nej. Kalderne nedenfor haandterer
   null ved at udelade posten; det er ikke en detalje, de kan springe over.
   Adressen, en indekseret annonce faktisk kan naas paa, er annonce.html?id=. */
function listingPageUrl(listing){
  if (!listing || listing.isExternal) return null;
  const slug = `${listing.brand} ${listing.model} ${listing.year}`
    .toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${SITE_URL}/annonce-${slug}-${String(listing.id).slice(0, 8)}.html`;
}

/* De poster i et ItemList, der har en adresse, Google kan foelge.

   Bruges af baade soegesiden og forhandlerprofilen, fordi begge lister
   annoncer, og begge kan faa en indekseret annonce med i listen. En ItemList
   er en paastand om, at de adresser findes; posterne uden adresse udelades
   derfor frem for at pege paa en 404 eller paa en noindex-side. Antallet
   taelles af det, listen faktisk indeholder — ellers ville numberOfItems
   modsige itemListElement. */
function itemListElementer(listings){
  const ud = [];
  for (const l of (listings || [])){
    const url = listingPageUrl(l);
    if (!url) continue;
    ud.push({
      '@type': 'ListItem',
      position: ud.length + 1,
      url,
      name: `${l.brand} ${l.model} ${l.year}`,
    });
  }
  return ud;
}

function seoListingPage(listing, photoUrls){
  const navn = `${listing.brand} ${listing.model}`;
  // Canonical peger altid paa den statiske side, saa Google samler
  // signalerne dér i stedet for at se to adresser med samme indhold.
  const url = listingPageUrl(listing);
  /* Ingen adresse => ingen canonical. js/annonce.js sender indekserede
     annoncer til renderExternalListing() og kalder aldrig herind for dem, saa
     det her skal ikke kunne ske. Sker det alligevel, er det bedre at lade
     siden staa uden delingstags end at pege canonical paa en 404 — det er den
     ene fejl, hele findingen handler om. */
  if (!url){
    console.warn('seoListingPage kaldt for en annonce uden forrenderet side — springer over.', listing?.id);
    return;
  }
  /* To billeder, to forskellige påstande — og de blev blandet sammen her.

     og:image er et kort om SIDEN. Har annoncen ingen fotos, er Bikerbasens
     eget delingsbillede det rigtige svar: kortet siger "det her er en side på
     Bikerbasen", og det er sandt.

     Vehicle.image er en påstand om PRODUKTET. Googles retningslinjer for
     køretøjsannoncer forventer, at billedet ER køretøjet. Målt på
     annonce.html?id=1017: siden skrev korrekt "Ingen fotos i denne annonce",
     mens jsonld-vehicle erklærede image: ["https://bikerbasen.dk/og-image.png"]
     — vores logo, udgivet som om det var en Suzuki GSX-R750 (findingen C-016).
     Det er samme fejl, buildPhotoSet() blev rettet for at fjerne fra DOM'en;
     den var bare flyttet ned i <head>.

     Prisen for at udelade feltet er, at annoncen ikke er berettiget til et
     billed-rigt resultat. Den pris er den rigtige: et manglende felt vejer
     lettere imod os end et gættet. */
  const fotos = (photoUrls || []).filter(Boolean);
  const delebillede = fotos[0] || `${SITE_URL}/og-image.png`;

  const dele = [
    `Årgang ${listing.year}`,
    formatKm(listing.km),
    formatCcm(listing.ccm),
    listing.condition,
  ].filter(Boolean);

  Seo.setSocial({
    title: `${navn} ${listing.year} — ${formatPrice(listing.price)} — Bikerbasen`,
    description: `${navn}, ${dele.join(', ')}. Til salg i ${listing.city} på Bikerbasen.`,
    url,
    image: delebillede,
    type: 'product',
  });
  Seo.setMeta('meta[property="product:price:amount"]', 'property', 'product:price:amount', String(listing.price));
  Seo.setMeta('meta[property="product:price:currency"]', 'property', 'product:price:currency', 'DKK');

  const vehicle = {
    '@context': 'https://schema.org',
    '@type': 'Motorcycle',
    name: navn,
    brand: { '@type': 'Brand', name: listing.brand },
    model: listing.model,
    vehicleModelDate: String(listing.year),
    productionDate: String(listing.year),
    itemCondition: 'https://schema.org/UsedCondition',
    url,
    description: listing.description,
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: listing.km, unitCode: 'KMT' },
    vehicleEngine: {
      '@type': 'EngineSpecification',
      engineDisplacement: { '@type': 'QuantitativeValue', value: listing.ccm, unitCode: 'CMQ' },
    },
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'DKK',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
      url,
      // Google anbefaler priceValidUntil på Offer, så prisen ikke fremstår
      // forældet i søgeresultatet. Sat relativt til visningstidspunktet,
      // så den altid ligger i fremtiden — siden har ingen fast "gyldig til"-dato.
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      areaServed: { '@type': 'Country', name: 'Danmark' },
      // Forhandler: offentlig virksomhed, navn og adresse er fint.
      // Privat sælger: kun byen, aldrig navnet i struktureret data.
      seller: listing.isDealer
        ? { '@type': 'AutoDealer', name: listing.seller.name,
            address: { '@type': 'PostalAddress', addressLocality: listing.city, postalCode: listing.postnr, addressCountry: 'DK' } }
        : { '@type': 'Person',
            address: { '@type': 'PostalAddress', addressLocality: listing.city, addressCountry: 'DK' } },
    },
  };
  // image kun når der ER et foto af netop denne motorcykel. Se begrundelsen
  // ovenfor; feltet må ikke falde tilbage på delingsbilledet.
  if (fotos.length) vehicle.image = fotos;
  if (listing.power) {
    vehicle.vehicleEngine.enginePower = { '@type': 'QuantitativeValue', value: listing.power, unitText: 'hk' };
  }
  if (listing.fuel) vehicle.fuelType = listing.fuel;
  if (listing.color) vehicle.color = listing.color;

  Seo.setJsonLd('vehicle', vehicle);
  Seo.setJsonLd('breadcrumb', Seo.breadcrumb([
    { name: 'Forside', path: 'index.html' },
    { name: typeLabel(listing.type), path: `soegning.html?type=${listing.type}` },
    { name: navn, path: listingPageUrl(listing).replace(SITE_URL + '/', '') },
  ]));
}

/* Søgeresultater: ItemList over de annoncer på siden, der HAR en adresse.

   Blokken hed før hele resultatsiden og satte url = listingPageUrl(l) for hver
   post. I drift, hvor 332 af 332 annoncer er indekserede, betød det et ItemList
   hvor hver eneste URL svarede 404 (C-015). Nu bortfalder blokken helt, hvis
   ingen af annoncerne har en side — struktureret data, der ikke kan bakkes op,
   er ikke bedre end ingen struktureret data.

   Annoncerne står stadig på siden og i sitets egne links; det er kun påstanden
   om deres adresser, der er væk. Genindsæt den ikke uden også at bygge de
   sider, den peger på. */
/* Søgesidens EGNE, statiske tags — dem vi falder tilbage på.

   Læses første gang seoSearchResults() kaldes, altså før vi selv har skrevet
   noget i dem. Fallback-strengene er soegning.html's egne værdier skrevet af;
   de bruges kun, hvis tagget mangler helt. */
let soegesidensEgneTags = null;
function egneTags(){
  if (soegesidensEgneTags) return soegesidensEgneTags;
  const desc = document.head.querySelector('meta[name="description"]');
  soegesidensEgneTags = {
    titel: document.title || `Søg motorcykler — ${SITE_NAME}`,
    beskrivelse: (desc && desc.getAttribute('content'))
      || 'Søg og filtrer blandt brugte motorcykler til salg i Danmark på Bikerbasen.',
  };
  return soegesidensEgneTags;
}

/* Titel og description følger H1'en — men KUN når der er noget at vise.

   Målt: ?types=cross&brands=Harley-Davidson&priceMax=1000&koerekort=A1 gav
   <title>Søg motorcykler — Bikerbasen</title> på hver eneste facet, mens H1
   korrekt sagde "Brugte Harley-Davidson til salg" (C-017). Fanebladet og det
   delte link sagde altså ingenting om, hvad man kiggede på.

   To ting bliver med vilje ikke rørt:

   1. canonical og og:url. Hver facet canonical'er til bare soegning.html, og
      det er den rigtige håndtering af duplicate content fra facetter. Derfor
      går det her IKKE gennem Seo.setSocial() — den ville sætte canonical med.
      Rangeringsmæssigt flytter titlen derfor ingenting; den er til brugeren.
   2. Titlen ved nul træf. Overskriften siger stadig "Brugte Harley-Davidson
      til salg" på en side, hvor der ikke er nogen — og en <title> med det i
      ville være en påstand, siden selv modsiger to linjer længere nede.
      Sidens egne, neutrale tags sættes tilbage i stedet. */
function seoSearchResults(listings, heading){
  const egne = egneTags();
  const harTræf = (listings || []).length > 0;
  const titel = (harTræf && heading) ? `${heading} — ${SITE_NAME}` : egne.titel;
  const beskrivelse = (harTræf && heading)
    ? `${heading} på ${SITE_NAME}. Filtrér på pris, årgang, km og kørekort — A1, A2 og A.`
    : egne.beskrivelse;

  document.title = titel;
  Seo.setMeta('meta[name="description"]', 'name', 'description', beskrivelse);
  Seo.setMeta('meta[property="og:title"]', 'property', 'og:title', titel);
  Seo.setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', titel);
  Seo.setMeta('meta[property="og:description"]', 'property', 'og:description', beskrivelse);
  Seo.setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', beskrivelse);

  const poster = itemListElementer(listings);
  Seo.setJsonLd('results', poster.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading,
    numberOfItems: poster.length,
    itemListElement: poster,
  } : null);
}

/* Forhandlerprofil.
   `listings` er valgfri (bagudkompatibel med kald der kun sender antallet) —
   sendes den med, får siden en rigtig ItemList over det sælgeren faktisk har
   til salg, i stedet for en tom makesOffer-stub uden navn eller pris, som
   ikke afspejler noget der reelt står på siden. */
function seoDealerPage(seller, listingCount, listings){
  const url = `${SITE_URL}/forhandler.html?id=${encodeURIComponent(seller.id || "")}`;
  Seo.setSocial({
    title: `${seller.name} — motorcykler til salg — Bikerbasen`,
    description: `Se ${listingCount} ${listingCount === 1 ? 'motorcykel' : 'motorcykler'} til salg fra ${seller.name}${seller.city ? ' i ' + seller.city : ''} på Bikerbasen.`,
    url,
    type: 'profile',
  });
  Seo.setJsonLd('dealer', {
    '@context': 'https://schema.org',
    '@type': seller.isDealer ? 'AutoDealer' : 'Person',
    name: seller.name,
    url,
    address: seller.city ? { '@type': 'PostalAddress', addressLocality: seller.city, addressCountry: 'DK' } : undefined,
    telephone: seller.phone || undefined,
  });
  // Samme regel som på søgesiden: kun annoncer med en adresse, der findes.
  const poster = itemListElementer(listings);
  Seo.setJsonLd('dealer-items', poster.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Motorcykler til salg fra ${seller.name}`,
    numberOfItems: poster.length,
    itemListElement: poster,
  } : null);
}
