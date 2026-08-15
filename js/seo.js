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
/* Adressen paa annoncens forrenderede side. Skal give samme filnavn som
   scripts/shared.js listingSlug — ellers ville canonical fra
   annonce.html?id= pege paa en side der ikke findes. */
function listingPageUrl(listing){
  const slug = `${listing.brand} ${listing.model} ${listing.year}`
    .toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${SITE_URL}/annonce-${slug}-${String(listing.id).slice(0, 8)}.html`;
}

function seoListingPage(listing, photoUrls){
  const navn = `${listing.brand} ${listing.model}`;
  // Canonical peger altid paa den statiske side, saa Google samler
  // signalerne dér i stedet for at se to adresser med samme indhold.
  const url = listingPageUrl(listing);
  const image = (photoUrls && photoUrls[0]) || `${SITE_URL}/og-image.png`;

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
    image,
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
    image: (photoUrls && photoUrls.length) ? photoUrls : [image],
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

/* Søgeresultater: ItemList over de annoncer der faktisk vises. */
function seoSearchResults(listings, heading){
  Seo.setJsonLd('results', listings.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading,
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: listingPageUrl(l),
      name: `${l.brand} ${l.model} ${l.year}`,
    })),
  } : null);
}

/* Forhandlerprofil. */
function seoDealerPage(seller, listingCount){
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
    makesOffer: { '@type': 'Offer', itemOffered: { '@type': 'Motorcycle' } },
  });
}
