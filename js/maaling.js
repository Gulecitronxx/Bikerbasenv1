/* ===========================================================================
   maaling.js — GA4-hændelser for tragten, bag samtykke, uden persondata.

   HVORFOR FILEN FINDES (C3, 23.08.2026)

   GA4 var installeret (scripts/inline-analytics.js) og målte sidevisninger,
   men ingen af de handlinger, man træffer en beslutning på: hvad folk
   søger efter, hvilke annoncer de åbner, hvor de forlader os til en kilde,
   om nogen gemmer en søgning, opretter en annonce eller skriver til en
   sælger. Uden dem er "hvilket filter konverterer" og "hvilken kilde tager
   trafikken" gæt.

   REGLER, som alle kald her overholder:
   - Bag samtykke. window.gtag findes KUN, når brugeren har sagt "Accepter
     alle" (inline-analytics.js / initCookieConsent). Er den der ikke, bliver
     hændelsen smidt væk — ikke køet, ikke gemt. Ingen skygge-sporing.
   - Ingen persondata. Ingen mails, telefonnumre, navne, fritekstbeskeder.
     Søgeord sendes kun som det, brugeren selv tastede i mærke/model-feltet,
     klippet til 80 tegn — det er et produktnavn, ikke en person.
   - Kun det, GA4 selv anbefaler, hvor der findes et anbefalet navn
     (search, view_item, add_to_wishlist, generate_lead, sign_up, login), og
     vores egne navne, hvor der ikke gør (kilde_klik, save_search,
     publish_listing). Parametre er korte og stabile, så rapporter kan
     bygges én gang.
   - Fejler gtag, fejler siden ikke: alt er pakket ind.

   VANILLA MED VILJE: klassisk <script>, ét globalt objekt `Maaling`, IIFE,
   module.exports til tests. Skal loades FØR de scripts, der kalder den
   (search.js, annonce.js, login.js, opret-annonce.js, components.js).
   =========================================================================== */
const Maaling = (function(){
  function klip(s, n){ return String(s == null ? '' : s).trim().slice(0, n); }

  /* Rå send. Returnerer true, når hændelsen faktisk blev givet videre. */
  function send(navn, params){
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false;
    try { window.gtag('event', navn, params || {}); return true; }
    catch (e) { return false; }
  }

  /* Et kort, stabilt uddrag af en annonce — aldrig sælgeroplysninger. */
  function annonceParams(l){
    if (!l) return {};
    return {
      item_id: klip(l.id, 40),
      item_name: klip(`${l.brand || ''} ${l.model || ''}`.trim(), 80),
      item_brand: klip(l.brand, 40),
      item_category: klip(l.type, 30),
      price: typeof l.price === 'number' ? l.price : undefined,
      currency: typeof l.price === 'number' ? 'DKK' : undefined,
      kilde: l.isExternal ? klip(l.source && l.source.domaene, 60) || 'ekstern' : 'bikerbasen',
    };
  }

  /* search — sendes af js/search.js, når et filtersæt er tegnet færdigt.
     Kun filtrenes VÆRDIER, ikke hele lageret. */
  function soegning(state, antal){
    return send('search', {
      search_term: klip(state.q, 80) || undefined,
      brands: (state.brands || []).slice(0, 5).join(',') || undefined,
      types: (state.types || []).slice(0, 5).join(',') || undefined,
      koerekort: state.koerekort || undefined,
      price_max: state.priceMax != null ? state.priceMax : undefined,
      price_min: state.priceMin != null ? state.priceMin : undefined,
      sort: state.sort || undefined,
      results: typeof antal === 'number' ? antal : undefined,
    });
  }

  function visAnnonce(l){ return send('view_item', { items: [annonceParams(l)], kilde: annonceParams(l).kilde }); }

  /* Klik videre til kilden — det er DER, handlen sker for indekserede
     annoncer, så det er tragtens vigtigste udgang. */
  function kildeKlik(l, href){
    let domaene = '';
    try { domaene = new URL(href, 'https://bikerbasen.dk').hostname; } catch (e) { /* ingen */ }
    return send('kilde_klik', { link_domain: klip(domaene, 60), ...annonceParams(l) });
  }

  function gemSoegning(state, antal){ return send('save_search', { results: antal, brands: (state.brands || []).slice(0, 5).join(',') || undefined, koerekort: state.koerekort || undefined }); }
  function favorit(l, tilfoejet){ return send(tilfoejet ? 'add_to_wishlist' : 'remove_from_wishlist', { items: [annonceParams(l)] }); }
  function kontakt(l){ return send('generate_lead', { ...annonceParams(l) }); }
  function opretAnnonce(l, redigering){ return send(redigering ? 'edit_listing' : 'publish_listing', { item_brand: klip(l && l.brand, 40), item_category: klip(l && l.type, 30) }); }
  function login(metode){ return send('login', { method: metode || 'email' }); }
  function oprettet(metode, forhandler){ return send('sign_up', { method: metode || 'email', dealer: !!forhandler }); }

  return { send, soegning, visAnnonce, kildeKlik, gemSoegning, favorit, kontakt, opretAnnonce, login, oprettet, annonceParams };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Maaling;
