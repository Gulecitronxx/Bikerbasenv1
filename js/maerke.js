/* Mærkesider (maerke-*.html) og mærkeoversigten (maerker.html).

   Siderne er forrenderet af scripts/build-brand-pages.js; her hydreres de.

   Runde 7 (D7-M2): SAMME rækkefølge som byggetrinnet og søgesiden
   (Sortering 'blandet'), og samme antal kort (data-viste = 24). Før sorterede
   den på createdAt (null på 548 af 548 — en no-op) og tegnede ALLE 262 Honda
   igen oven i de 262, byggetrinnet allerede havde skrevet. Nu røres DOM'en
   kun, hvis lageret har ændret sig siden bygget (andre id'er).

   Billede 9: siden har to kortlister — en fremhævet række (op til 5, annoncer
   med foto først) og resten under. Begge vælges her med SAMME regel som i
   byggetrinnet (vaelgFremhaevede), ellers ville siden omrokere ved hydrering.

   V-012: siden har ÉT antal. Alle tal, der står som [data-mk-n], er antallet
   af annoncer for mærket, og de skrives samlet — aldrig kun ét af dem. */

const MK_FREMHAEVET = 5;

/* Mærkenavne sammenlignes uden versaler og tegnsætning: byggetrinnet slår
   "Royal Enfield" og "Royal-enfield" sammen på slug, så siden gør det også. */
/* Samme foldning som scripts/slug.js (generatoren slår Zündapp/Zundapp sammen til én side, så klientens mærkefilter
   skal gøre det samme): ø/æ/å -> oe/ae/aa først, så accenter og ß/ł/þ/œ/ı, til sidst kun bogstaver og tal.
   Låst mod slugify i scripts/slug.test.js. */
function mkNorm(s){
  return String(s || '').normalize('NFC').toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/ß/g, 'ss').replace(/ł/g, 'l').replace(/þ/g, 'th').replace(/œ/g, 'oe').replace(/ı/g, 'i')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
function mkHarFoto(l){ return !!(l.photoUrls && l.photoUrls.length); }
/* Skal være identisk med vaelgFremhaevede() i scripts/build-brand-pages.js. */
function mkVaelgFremhaevede(sorteret, n){
  return sorteret.filter(mkHarFoto).concat(sorteret.filter(l => !mkHarFoto(l))).slice(0, n);
}

/* Søgekortet sender kun de felter, der er udfyldt — ellers ender man på
   soegning.html?brands=Yamaha&q=&type=&maxPrice=&koerekort=. */
function mkRydSoegekort(){
  const form = document.getElementById('mk-search');
  if (!form) return;
  form.addEventListener('submit', () => {
    form.querySelectorAll('input[name], select[name]').forEach(el => {
      if (el.type === 'radio' ? (!el.checked || el.value === '') : el.value === '') el.disabled = true;
    });
  });
  // Tilbage-knappen genindlæser fra bfcache med deaktiverede felter.
  window.addEventListener('pageshow', () => {
    form.querySelectorAll('[disabled]').forEach(el => { el.disabled = false; });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const brand = document.body.dataset.mkBrand;

  /* Mærkeoversigten er ren statisk markup: ingen data, ingen annoncekort. */
  if (!brand){
    renderHeader('maerker.html');
    document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
    return;
  }

  await backendReady();
  renderHeader(null);
  /* Facetfolden styres udelukkende af CSS (checkbox + label) — se
     scripts/build-brand-pages.js. Den JS, der stod her, flyttede første kort
     efter load og var selve CLS-problemet. */
  document.querySelectorAll('.bc-sep').forEach(s => s.innerHTML = Icon.chevronRight);
  mkRydSoegekort();

  const fremMount = document.getElementById('mk-featured-kort');
  const gridMount = document.getElementById('brand-listings');
  const viste = Number(gridMount && gridMount.dataset.viste) || 24;
  const maerke = mkNorm(brand);

  /* Har hentningen ikke ramt hele lageret, er den statiske side det bedste
     svar — en halv liste ville se ud som en sandhed (D-013). */
  const komplet = typeof Store.harHeleLageret !== 'function' || Store.harHeleLageret();
  if (komplet){
    /* Lokalt (SHOW_DEMO_DATA) ligger der demoannoncer i lageret; de findes
       ikke i drift og tæller ikke med — byggetrinnet kender dem heller ikke. */
    const demoIder = new Set((typeof LISTINGS !== 'undefined' ? LISTINGS : []).map(l => String(l.id)));
    const ikkeDemo = Store.getAllListings().filter(l => !demoIder.has(String(l.id)));
    const alle = ikkeDemo.filter(l => mkNorm(l.brand) === maerke);
    /* W6: er HELE lageret tomt (databasen svarede, men uden en eneste annonce), ved vi ikke, om der er nogen
       <mærket> — "Ingen <mærket> til salg lige nu" ville være en påstand om noget, vi ikke har set. Den
       forudtegnede side står urørt, og backend-broen skriver den ærlige fejl med "Prøv igen" øverst
       (meldDataafbrud i js/backend-bridge.js). */
    const lagerTomt = ikkeDemo.length === 0;
    const sorteret = typeof Sortering !== 'undefined' ? Sortering.sorter(alle.slice(), 'blandet') : alle;
    const frem = mkVaelgFremhaevede(sorteret, MK_FREMHAEVET);
    const fremIder = new Set(frem.map(l => String(l.id)));
    const resten = sorteret.filter(l => !fremIder.has(String(l.id))).slice(0, viste);

    const ider = mount => [...mount.querySelectorAll('.card[data-listing-id]')].map(c => c.dataset.listingId).join('|');
    const nyeIder = liste => liste.map(l => String(l.id)).join('|');

    if (alle.length && fremMount && ider(fremMount) !== nyeIder(frem)){
      fremMount.innerHTML = frem.map((l, i) => listingCardHTML(l, i)).join('');
      /* w14: gitterets skabelon (1-2 annoncer har egne kolonner) følger det antal kort, der nu står i rækken - ellers ombrydes 5 kort i en 2-kolonne-skabelon fra et ældre byg. */
      const fm = fremMount.closest('.mk-featured');
      if (fm) fm.dataset.n = String(frem.length);
    }
    if (alle.length && gridMount && ider(gridMount) !== nyeIder(resten)){
      gridMount.innerHTML = resten.map((l, i) => listingCardHTML(l, i + frem.length)).join('');
      gridMount.hidden = !resten.length;
    }
    if (!alle.length && !lagerTomt && fremMount){
      fremMount.innerHTML = `<div class="empty-state">${Icon.search}<h3>Ingen ${escapeHTML(brand)} til salg lige nu</h3>
        <p>Gem en søgning på ${escapeHTML(brand)}, så tæller den nye annoncer, næste gang du kigger.</p>
        <a href="soegning.html?brands=${encodeURIComponent(brand)}" class="btn btn-primary" style="margin-top:16px;">Søg motorcykler</a></div>`;
    }
    /* Ét tal, overalt (V-012). */
    if (alle.length){
      document.querySelectorAll('[data-mk-n]').forEach(el => { el.textContent = alle.length.toLocaleString('da-DK'); });
    }
  }
  if (fremMount) wireFavoriteButtons(fremMount);
  if (gridMount) wireFavoriteButtons(gridMount);
});
