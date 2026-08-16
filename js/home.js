/* stripBikeToLineArt() stod her: den strøg en bikeArtSVG ned til ren
   line-art og var skrevet til den gamle hero og de gamle kategorifliser.
   Begge dele bruger nu rigtige fotos (img/hero-*.webp og img/type/*.webp),
   så funktionen blev aldrig kaldt af nogen. Den er slettet frem for at ligge
   og se ud som om forsiden stadig tegner sine egne motorcykler — en funktion,
   der er defineret men aldrig kaldt, er et forkert kort over koden. */

/* Giver hovedtråden luft mellem to bidder arbejde.

   Forsiden byggede før alt i ét træk inde i DOMContentLoaded — og først
   EFTER `await backendReady()`, altså efter databasen havde svaret. To ting
   fulgte af det: intet blev tegnet før netværket var færdigt, og selve
   opbygningen lå som lange, uafbrydelige opgaver på hovedtråden (målt i
   trace: 131ms og 67ms alene fra home.js, oven i et par styk på 150-230ms
   fra de style/layout-opdateringer hver innerHTML udløste). I den tid kan
   browseren hverken svare på tryk eller male.

   Nu bygges siden i bidder med et yield imellem. Slutresultatet er præcis
   det samme DOM — men hvert stykke arbejde bliver sin egen korte opgave,
   som browseren kan afbryde. Og de dele, der ikke kræver data (headeren,
   hele hero-søgekortet), tegnes med det samme i stedet for at vente på
   Supabase. */
const yieldToMain = () =>
  window.scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0));

/* Sætter kort ind i portioner med et yield imellem.

   Annoncekort er det dyreste på forsiden: et kort uden foto får en komplet
   line-art-SVG med defs og gradienter, og siden ender med 138 svg'er. Skrevet
   ind med ét innerHTML blev det målt som én sammenhængende opgave på 119ms —
   nok til at siden føles død, hvis man rammer den midt i. I portioner à tre
   bliver ingen af dem lange nok til at blokere, og resultatet er det samme DOM.

   Bemærk: det er portioneringen — ikke udskydelse — der gør arbejdet. Et
   forsøg med at vente på IntersectionObserver, så gitrene først blev bygget,
   når man nærmede sig dem, blev målt til nøjagtig det samme (96/97/94 mod
   96/97/97 i performance). Den variant blev droppet igen: den kunne ikke måle
   sig ydelsesmæssigt, men den kunne fejle på en måde denne ikke kan — en
   observer, der aldrig kalder tilbage, efterlader et tomt gitter for evigt.
   Alt indhold tegnes derfor ved indlæsning, bare i mundrette bidder. */
async function saetIndIPortioner(mount, dele, portion = 3){
  mount.innerHTML = '';
  for (let i = 0; i < dele.length; i += portion){
    mount.insertAdjacentHTML('beforeend', dele.slice(i, i + portion).join(''));
    if (i + portion < dele.length) await yieldToMain();
  }
}

document.addEventListener('DOMContentLoaded', () => { buildForside(); });

async function buildForside(){
  /* ============ Bid 1: alt over folden — kræver ingen data ============
     renderHeader læser Store.getUser(), som allerede ligger i localStorage
     fra sidste besøg. backendReady() opdaterer den bagefter, hvis sessionen
     er udløbet — derfor køres de tre auth-afhængige opdateringer igen
     nedenfor (men ikke hele renderHeader: wireHeader ville binde
     lytterne to gange). */
  renderHeader('index.html');

  // Gennemsigtig hero-header: massiv baggrund så snart man scroller forbi toppen.
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader){
    const onScroll = () => siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  document.querySelectorAll('.section-link').forEach(a => {
    const span = a.querySelector('span[aria-hidden]');
    if (span) span.innerHTML = Icon.arrowRight;
  });

  // search icon into hero input
  const wrap = document.getElementById('hs-query-wrap');
  if (wrap) wrap.insertAdjacentHTML('afterbegin', Icon.search);

  // populate type select
  const typeSelect = document.getElementById('hs-type');
  TYPES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id; opt.textContent = t.label;
    typeSelect.appendChild(opt);
  });

  // Hero'ens tillidslinje er nu statiske, ærlige pointer (ingen tal der afslører
  // et tyndt lager) — se .hero-trust i markup.

  // Curated entry points tailored to motorcycle buyers. Holdt kort (5) — flere
  // chips druknede søgekortet og skubbede folden ned.
  //
  // A1/A2 stod her som to selvstændige chips. De er flyttet ind i søgekortet
  // som et rigtigt felt, og den ene chip der er tilbage er den sammensatte:
  // "A2 til under 60.000 kr." rammer hele købsscenariet i ét klik i stedet
  // for tre. De øvrige er type og kilometer — det chips er gode til.
  const POPULAR = [
    { label: 'A2 under 60.000 kr.', icon: 'bike', params: { koerekort: 'A2', maxPrice: 60000 } },
    { label: 'Under 50.000 kr.', icon: 'medal', params: { maxPrice: 50000 } },
    { label: 'Adventure', icon: 'mapPin', params: { type: 'adventure' } },
    { label: 'Cruiser', icon: 'mapPin', params: { type: 'cruiser' } },
    { label: 'Under 10.000 km', icon: 'gauge', params: { kmMax: 10000 } },
  ];
  // Egne seneste søgninger først (Bilbasen-mønster), derefter de kuraterede.
  const recent = Store.getRecentSearches().slice(0, 2).map(r =>
    `<a class="popular-chip" href="soegning.html?${r.query}">${Icon.clock}${escapeHTML(r.label)}</a>`);
  document.getElementById('popular-searches').innerHTML = recent.join('') + POPULAR.map(p => {
    const qs = new URLSearchParams(p.params).toString();
    return `<a class="popular-chip" href="soegning.html?${qs}">${Icon[p.icon]}${p.label}</a>`;
  }).join('');

  /* Hvilket kørekort er valgt i hero'ens segmentvælger. */
  const valgtKoerekort = () =>
    document.querySelector('input[name="koerekort"]:checked')?.value || '';

  /* Tal med dansk tusindtalsseparator, samme regel som formatPrice/formatKm i
     js/data.js. Med 383 annoncer ses forskellen ikke; den dag lageret rammer
     fire cifre, står der ellers "1400 motorcykler" på forsidens mest læste
     linje — og det er ikke skrevet af en dansker. */
  const daTal = (n) => n.toLocaleString('da-DK');

  const countHint = document.getElementById('hero-count-hint');
  const kkHint = document.getElementById('hs-kk-hint');
  const uoplystHint = document.getElementById('hs-uoplyst-hint');
  const submitBtn = document.getElementById('hs-submit');

  /* Har lageret svaret? Indtil da er der ikke noget at udtale sig om.

     Hero'en talte før det, der tilfældigvis lå i JS'en, mens netværket stadig
     kørte. På localhost er demolageret (51) synkront tilgængeligt, mens de
     indekserede (332) først kommer med backendReady() — så forsiden skrev
     "51 motorcykler til salg i dag" og knappen "Vis 51 motorcykler" i cirka
     et sekund, og rettede sig så til 383. Et tal, der retter sig selv, er
     værre end intet tal: køberen når at se begge, og så tror han på ingen af
     dem. Linjens højde er reserveret i CSS (.hero-count), så den korte
     ventetid ikke koster et layouthop. */
  let dataKlar = false;

  /* Live-tælling der reagerer på hero-filtrene, før man trykker søg.
     Tallene SKAL stemme med det, søgesiden viser bagefter — et hero-tal på 15
     og en resultatside med 12 er en løgn, køberen opdager med det samme.
     Derfor de samme tre regler som js/search.js anvendFiltre():
       - pris: en annonce UDEN pris matcher ikke et maks-prisfilter
         (`null <= 60000` er sandt i JS — det var den gamle fejl her),
       - type: ukendt type tælles ikke med,
       - kørekort: passerKoerekort() er det ene sted, reglen bor.
     Efterprøvet: hero'en og soegning.html?koerekort=A2 siger begge 15.

     RUNDE 2, FUND 1: og de skal ikke bare vise samme ANTAL TRÆF — de skal
     også være enige om, hvor mange annoncer der blev valgt fra, fordi vi
     ikke kender svaret. Det var de ikke:

       forsiden   (A2 + maks. 60.000 kr.):  "53 annoncer mangler den oplysning"
       søgesiden  (samme klik):             "75 annoncer er ikke vist"

     Begge tal var rigtige svar — på hvert sit spørgsmål. 53 er de annoncer,
     kørekortfilteret skjulte uden at kende hk. 75 er 53 + de 22 annoncer,
     der slet ikke har en pris, og som prisfilteret derfor smed ud. Forsiden
     talte KUN kørekortet; de 22 forsvandt her i linjen
     `l.price != null && l.price <= maxPrice` uden at nogen sagde det.
     Søgesiden bogfører hvert filter for sig (filtrerMedUoplyst) og lagde
     dem sammen. Det rigtige tal er altså 75, og forsiden var den, der
     underdrev — med præcis den slags tavse fravalg, hele ærlighedsreglen i
     work/DECISIONS.md er skrevet imod.

     Nu bogfører hero'en på samme måde: ét regnskab over alle filtre, samme
     feltnavne og samme rækkefølge som i js/search.js anvendFiltre(), så de
     to sider kommer frem til samme tal ved konstruktion og ikke ved held.

     BEMÆRK: en annonce fjernes ved det FØRSTE filter, der ikke kan svare
     for den, og kan derfor kun tælles én gang — ligesom på søgesiden. Det
     er dét, der gør, at tallene må lægges sammen. */
  const heroListe = () => {
    const q = document.getElementById('hs-query').value.trim().toLowerCase();
    const type = document.getElementById('hs-type').value;
    const maxPrice = Number(document.getElementById('hs-price').value) || null;
    const kat = valgtKoerekort();
    let list = Store.getAllListings();
    // Samme form som js/search.js' `uoplystSkjult`: [{ felt, antal }].
    const skjult = [];

    /* Søgesidens filtrerMedUoplyst() i hero-udgave: tre svar i stedet for to.
       `kendt` afgør, om annoncen overhovedet kan svare på spørgsmålet —
       kan den ikke, tælles den og ryger ud, uden at prædikatet bliver spurgt. */
    const medUoplyst = (felt, kendt, praedikat) => {
      const beholdt = [];
      let antal = 0;
      for (const l of list){
        if (!kendt(l)) { antal++; continue; }
        if (praedikat(l)) beholdt.push(l);
      }
      if (antal) skjult.push({ felt, antal });
      list = beholdt;
    };

    // Mærke og model kender vi altid — de kommer med annoncen fra kilden.
    if (q) list = list.filter(l => `${l.brand} ${l.model}`.toLowerCase().includes(q));
    // Rækkefølgen er søgesidens: type før pris før kørekort.
    if (type) medUoplyst('motorcykeltype', l => l.type != null, l => l.type === type);
    if (maxPrice) medUoplyst('pris', l => l.price != null, l => l.price <= maxPrice);
    if (kat){
      /* Kørekortet kan ikke afgøres på ét felt — se skjultAfUvidenhed()
         nedenfor. Derfor sin egen gren i stedet for `kendt`/`praedikat`. */
      const beholdt = [];
      let antal = 0;
      for (const l of list){
        if (passerKoerekort(l, kat)) beholdt.push(l);
        else if (skjultAfUvidenhed(l, kat)) antal++;
      }
      if (antal) skjult.push({ felt: 'kørekortkategori', antal });
      list = beholdt;
    }
    return { list, skjult, kat, harSøgt: !!(q || type || maxPrice || kat) };
  };

  /* Sætningen om de fravalgte. Feltnavnene og opremsningen er ordret dem,
     js/search.js renderUoplystNote() bruger, så de to sider siger det samme
     om det samme klik. Kun slutningen er forsidens egen: her er der ikke
     noget "vist" endnu, der er et tal, man kan tælle med i. */
  const uoplystTekst = (skjult) => {
    const antal = skjult.reduce((sum, x) => sum + x.antal, 0);
    if (!antal) return '';
    // Samme felt kan skjule i to omgange — nævn det kun én gang.
    const felter = [...new Set(skjult.map(x => x.felt))];
    const feltTekst = felter.length === 1
      ? felter[0]
      : felter.slice(0, -1).join(', ') + ' og ' + felter[felter.length - 1];
    return antal === 1
      ? `1 annonce er ikke talt med, fordi ${feltTekst} ikke er oplyst på den. Den vises heller ikke i søgningen.`
      : `${daTal(antal)} annoncer er ikke talt med, fordi ${feltTekst} ikke er oplyst på dem. De vises heller ikke i søgningen.`;
  };

  /* Hvor mange blev valgt fra, fordi vi ikke VED svaret?

     passerKoerekort() kan kun sige ja eller nej, og et nej dækker over to vidt
     forskellige ting: "motorcyklen er for kraftig" og "hk er ikke oplyst, så
     vi nægter at gætte" (se kommentaren over passerKoerekort i js/data.js —
     eksterne_annoncer har ingen hk-kolonne). For en 22-årig, der trykker A2 og
     ser tallet falde fra 383 til 15, er forskellen alt: er markedspladsen tom,
     eller mangler kilden bare et felt? Uden den oplysning ligner vores ene
     strukturelle fordel en tom hylde.

     Udledt uden at gentage en eneste grænse: vi spørger passerKoerekort() igen
     med de manglende felter sat til den mindst tænkelige rigtige motorcykel
     (1 hk, 1 cm³). Skifter svaret fra nej til ja, hang nejet på noget, vi ikke
     ved. Flyttes A2-grænsen i js/data.js, følger tallet her med af sig selv.

     Spørgsmålet er kategori for kategori — ikke "kender vi kategorien".
     Et første forsøg brugte koerekortForListing() === null, og det var forkert
     for A1: en 650 cm³ uden hk har ingen kendt kategori, men den er helt
     sikkert ikke A1, for A1 HAR en ccm-grænse. Den blev talt med som "oplyser
     ikke effekten", og linjen påstod 321, hvor det rigtige tal var 12.

     Bemærk: 1 er ikke en grænse, men den gunstigste tænkelige værdi, og det
     virker kun fordi ccm og hk begge er ØVRE grænser i A1/A2. Kommer der en
     kategori med en nedre grænse, holder antagelsen ikke. Vagtposten er
     js/koerekort.test.js — samme forudsætning er beskrevet ved
     koerekortSvar() i js/search.js.

     Og "A" dækker alt, så tallet dér altid bliver 0: A skjuler ingen, og så
     skal linjen heller ikke påstå det.

     DENNE FUNKTION ER EN TVILLING til koerekortSvar() i js/search.js, som er
     den kanoniske udgave (og den, der har tests i js/koerekort.test.js).
     Prøven er skrevet ordret som dens, så to sider ikke kan komme til at
     svare forskelligt på samme spørgsmål: `!(Number(l.ccm) > 0)` og ikke
     `!Number(l.ccm)`, og manglende hk afgøres af js/data.js' egen
     hkEllerNull() — ukendt effekt staves null, "", "-" og 0, og `== null`
     alene fanger kun de to første. De to bør slås sammen til én delt
     funktion i js/data.js; se forslaget i work/DECISIONS.md. */
  const skjultAfUvidenhed = (l, kat) => {
    if (passerKoerekort(l, kat)) return false;
    const proeve = { ...l };
    let mangler = false;
    if (hkEllerNull(l.power) == null){ proeve.power = 1; mangler = true; }
    if (!(Number(l.ccm) > 0)){ proeve.ccm = 1; mangler = true; }
    return mangler && passerKoerekort(proeve, kat);
  };

  /* Én opdatering for hele søgekortet: hjælpelinjen under kørekortvælgeren,
     antalslinjen i hero'en og tallet på knappen. De tre siger noget om samme
     lager og skal aldrig kunne komme ud af trit — derfor ét kald, ikke tre. */
  const opdaterHero = () => {
    const { list, skjult, kat, harSøgt } = heroListe();
    const n = list.length;
    const mc = n === 1 ? 'motorcykel' : 'motorcykler';

    /* Hjælpelinjen under kørekortvælgeren. Grænserne hentes fra KOEREKORT i
       js/data.js — de må kun stå ét sted, ellers driver de fra hinanden.
       Etiketten trimmes for parentesen ("A2 (mellem mc)" → "A2"), fordi
       pillen lige over den allerede siger A2.

       Linjen bar før også ANTALLET af fravalgte ("332 annoncer mangler den
       oplysning, der afgør det"). Det tal er flyttet ned i
       #hs-uoplyst-hint, fordi kørekortet ikke er det eneste filter, der kan
       være i tvivl — prisfilteret smider annoncer uden pris ud på præcis
       samme måde. Ét regnskab ét sted kan stemme med søgesiden; to
       halve regnskaber to steder kunne ikke, og det var netop fejlen. */
    const meta = KOEREKORT.find(k => k.id === kat);
    kkHint.textContent = !meta
      ? 'Vi gætter aldrig: er effekten ikke oplyst, siger vi det.'
      /* "oplysningen, der afgør det" og ikke "effekten": for A2 er det hk,
         men for A1 er det slagvolumen — en annonce uden ccm kan ikke afvises
         som A1, mens en på 650 cm³ kan, også uden hk. Én formulering, der er
         sand for begge, slår to, hvor den ene kan komme til at lyve. */
      : `${meta.label.replace(/\s*\(.*\)/, '')}: ${meta.hint.toLowerCase()}. `
        + `Vi viser kun mc'er, vi kan svare for.`;

    // Før databasen har svaret, siger vi ingenting frem for noget forkert.
    // Det gælder også regnskabet over de fravalgte: et tal udregnet på
    // demolageret ville rette sig selv, når de indekserede lander.
    if (uoplystHint){
      const tekst = dataKlar ? uoplystTekst(skjult) : '';
      uoplystHint.textContent = tekst;
      uoplystHint.hidden = !tekst;
    }

    if (!dataKlar){
      countHint.textContent = '';
      submitBtn.textContent = 'Søg motorcykler';
      return;
    }

    if (harSøgt){
      countHint.innerHTML = n
        ? `Din søgning matcher <b>${daTal(n)}</b> ${mc} lige nu.`
        : `Ingen motorcykler matcher lige nu — prøv at udvide søgningen.`;
    } else {
      /* Uden filtre: det præcise tal, ikke et afrundet "380+".
         Vi HAR tallet, og Bilbasen tør skrive deres ("50.356 annoncer i dag").
         Et rundet tal ligner et skøn og køber os intet.
         Under 10 annoncer skriver vi det stadig ikke — så reklamerer vi for
         en tom markedsplads i stedet for at åbne en søgning. */
      countHint.innerHTML = n >= 10
        ? `<b>${daTal(n)}</b> motorcykler til salg i dag`
        : '';
    }
    /* Knappen bærer tallet, ligesom Bilbasens "Vis 40.476 biler". Har man
       filtreret, vises tallet altid — også et lille, for man har selv bedt om
       det. Uden filtre kun når totalen er stærk nok (≥10) til at være et
       argument frem for en advarsel. */
    submitBtn.textContent =
      (n && (harSøgt || n >= 10)) ? `Vis ${daTal(n)} ${mc}` : 'Søg motorcykler';
  };
  ['hs-query','hs-type','hs-price'].forEach(id =>
    document.getElementById(id).addEventListener('input', opdaterHero));
  document.querySelectorAll('input[name="koerekort"]').forEach(r =>
    r.addEventListener('change', opdaterHero));
  opdaterHero();

  // hero search submit — bundet her, i første bid, så søgekortet virker
  // fra det øjeblik det kan ses (før lå det til allersidst).
  document.getElementById('hero-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('hs-query').value.trim();
    const type = document.getElementById('hs-type').value;
    const maxPrice = document.getElementById('hs-price').value;
    const kat = valgtKoerekort();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (kat) params.set('koerekort', kat);
    window.location.href = 'soegning.html' + (params.toString() ? '?' + params.toString() : '');
  });

  await yieldToMain();

  /* ============ Bid 2: kategorifliserne ============ */
  // category tiles — hver type får sin egen line-art-motorcykel af netop den
  // type. Mere distinkt end ét gentaget ikon, og custom pr. kategori frem for
  // Bilbasens stock-fotos.
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-media"><img src="img/type/${t.id}.webp" alt="" width="760" height="570" loading="lazy" decoding="async"></span>
      <span class="tile-label">${t.label}<span class="tile-go" aria-hidden="true">${Icon.arrowRight}</span></span>
    </a>`).join('');

  await yieldToMain();

  /* ============ Bid 3: mærkeskyen + SEO-linkbåndet ============ */
  // Populære mærker — rigtige links til filtrerede søgninger (Bilbasens
  // vigtigste scent/SEO-aktiv). Ingen opdigtede annoncetal.
  const POPULAR_BRANDS = ['Yamaha','Honda','Suzuki','Kawasaki','BMW','Ducati','KTM','Triumph','Aprilia','Husqvarna','Vespa','Indian'];
  // Kun mærker der faktisk findes i mærkeuniverset (undgå døde links).
  const KNOWN = new Set(Object.keys(BRANDS_BY_MODEL));
  const brands = POPULAR_BRANDS.filter(b => KNOWN.has(b));
  const brandCloud = document.getElementById('brand-cloud');
  if (brandCloud){
    brandCloud.innerHTML = brands.map(b =>
      `<a class="brand-chip" href="soegning.html?brands=${encodeURIComponent(b)}">
         <span class="brand-chip-name">${b}</span>
         <span class="brand-chip-go" aria-hidden="true">${Icon.arrowRight}</span>
       </a>`).join('');
  }

  // SEO-browse-bånd over footeren — rigtige søge-URL'er, ligesom Bilbasens
  // linkfarm. God for organisk trafik og udfylder siden meningsfuldt.
  const fillSeoCol = (id, links) => {
    const ul = document.querySelector('#' + id + ' ul');
    if (ul) ul.innerHTML = links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  };
  fillSeoCol('seo-brands', brands.slice(0, 8).map(b => ({ label: b, href: `soegning.html?brands=${encodeURIComponent(b)}` })));
  fillSeoCol('seo-types', TYPES.map(t => ({ label: t.label, href: `soegning.html?type=${t.id}` })));
  fillSeoCol('seo-regions', (typeof REGIONS !== 'undefined' ? REGIONS : []).map(r => ({ label: r, href: `soegning.html?regions=${encodeURIComponent(r)}` })));
  fillSeoCol('seo-price', [
    { label: 'Under 30.000 kr.', href: 'soegning.html?maxPrice=30000' },
    { label: 'Under 60.000 kr.', href: 'soegning.html?maxPrice=60000' },
    { label: 'Under 100.000 kr.', href: 'soegning.html?maxPrice=100000' },
    { label: 'Kan køres på A1', href: 'soegning.html?koerekort=A1' },
    { label: 'Kan køres på A2', href: 'soegning.html?koerekort=A2' },
    { label: 'Kun forhandlere', href: 'soegning.html?dealer=1' },
  ]);

  await yieldToMain();

  /* ============ Bid 4: tryghedsbåndet ============
     Rækkefølge efter køberens faktiske behov på en privatsælger-markedsplads:
     registrering/gennemsigtighed først, så skjult kontakt, så forhandler-
     verificering. Ingen opdigtede tal/anmeldelser. */
  document.getElementById('trust-strip').innerHTML = `
    <div class="trust-card">
      <span class="trust-icon">${Icon.checkCircle}</span>
      <div><h3>Registreringsstatus på hver annonce</h3><p>Se om motorcyklen er indregistreret og afgiftsberigtiget, sammen med ærlige specifikationer — så du ved, hvad du køber, før du handler.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.mail}</span>
      <div><h3>Din kontaktinfo er skjult</h3><p>Skriv til sælger direkte på Bikerbasen. Dit telefonnummer og din e-mail deles først, når du selv vælger det.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.shieldCheck}</span>
      <div><h3>Verificerede forhandlere</h3><p>Forhandlere godkendes med CVR og MitID, så du ved præcis, hvem der står bag annoncen.</p></div>
    </div>`;

  /* ============ Bid 5: annoncerne — først HER venter vi på databasen ============
     Alt ovenfor er tegnet uden at røre netværket. */
  await backendReady();

  // Sessionen kan være udløbet, siden localStorage sidst blev skrevet.
  // Kun de rene opdateringer køres igen — wireHeader/initCookieConsent ville
  // binde deres lyttere en gang til.
  if (typeof updateAuthVisibility === 'function') updateAuthVisibility();
  if (typeof updateAuthSlot === 'function') updateAuthSlot();
  if (typeof updateFavCount === 'function') updateFavCount();

  const ALLE = Store.getAllListings();   // databasen (+ demodata hvis slået til)
  dataKlar = true;                       // først NU må forsiden nævne et antal
  opdaterHero();                         // nu med de rigtige tal fra databasen

  await yieldToMain();

  /* ============ Bid 6: nyeste annoncer ============ */
  // newest listings (by date)
  const newest = [...ALLE].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

  /* Underrubrikken skal sige det, kortene siger.

     Den lød "Lige landet på Bikerbasen", og alle otte kort stod med
     "3 uger siden" under sig. Rubrikken lovede noget, indholdet modbeviste
     et øjeblik senere — nøjagtig samme fejl som "Kuraterede fund fra hele
     landet" i bid 7, og den er værre her, fordi "lige landet" er en påstand
     om friskhed, køberen bruger til at vurdere hele markedspladsen.

     To ting mangler at blive sagt, og begge er sande om lageret:
       1. Hvor ny "nyeste" faktisk er. Datoen skrives ind fra annoncen selv,
          så linjen ikke kan blive forældet igen den dag lageret står stille.
       2. At kun de annoncer, vi selv hoster, overhovedet er med i kapløbet.
          332 af 383 er indekserede og har med vilje ingen createdAt (se
          normalizeExternalListing i js/backend-bridge.js — crawledatoen er
          ikke annoncedatoen). De sorteres derfor altid bagest, og "Nyeste
          annoncer" er i praksis "nyeste af vores egne". Uden den sætning
          ville en køber tro, at hele markedspladsen har stået stille i tre
          uger.

     Rækkefølgen røres ikke: den er et løfte om dato, og et løfte om dato
     holdes ved at sortere efter dato. Se work/DECISIONS.md. */
  const nyesteSub = document.getElementById('newest-sub');
  if (nyesteSub && newest[0]?.createdAt){
    // Samme datoformat som js/annonce.js og js/forhandler.js: "26. jul. 2026".
    const dato = new Date(newest[0].createdAt)
      .toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
    const eksterne = ALLE.length - ALLE.filter(l => l.createdAt).length;
    nyesteSub.textContent = `De senest oprettede annoncer på Bikerbasen — den nyeste er fra ${dato}.`
      + (eksterne ? ` De ${daTal(eksterne)} indekserede annoncer er ikke med: vi kender ikke deres dato hos kilden.` : '');
  }
  // Mens databasen er ny, kan en enkelt annonce stå alene i et 4-kolonners
  // gitter med tre tomme felter ved siden af. I stedet for at opdigte
  // annoncer fylder vi rækken ud med ærlige "opret din annonce"-kort, så
  // forsiden ser levende og intentionel ud — og skubber samtidig udbud.
  // Tynd lagerbeholdning: i stedet for at stable tomme dublet-kort med line-art
  // fylder vi resten af rækken med ÉT roligt, intentionelt CTA-kort, der spænder
  // over de ledige kolonner. Læses som "her lander nye annoncer" — ikke "tomt".
  const newestMount = document.getElementById('newest-listings');
  /* Indeks forskudt med 1 — med vilje.

     listingCardHTML() giver kort nr. 0 loading="eager" fetchpriority="high",
     fordi det på en resultatliste er det eneste kort, der kan ligge over
     folden på mobil (se kommentaren i js/components.js). På FORSIDEN passer
     den antagelse ikke: hero'en fylder hele første skærm, og det første kort
     ligger målt 2.679 px nede ved 1440×900 — endnu længere nede på 390×844.
     Et fetchpriority="high"-billede så langt under folden konkurrerer kun med
     én ting, og det er hero-fotoet, som ER forsidens LCP. Derfor får intet
     kort på forsiden hastebehandling; de er alle lazy. Samme greb i
     "Udvalgte" og "Senest sete" nedenfor. */
  const kortHTML = (l, i) => listingCardHTML(l, i + 1);
  const realCards = newest.map(kortHTML);
  const wideCtaHTML = (span) => `
    <a class="newest-cta" href="opret-annonce.html" style="grid-column: span ${span};"
       aria-label="Opret en gratis annonce">
      <span class="newest-cta-plus">${Icon.plus}</span>
      <span class="newest-cta-copy">
        <span class="newest-cta-title">Din motorcykel kunne stå her</span>
        <span class="newest-cta-text">Opret en gratis annonce og bliv set af købere i hele Danmark — på under 5 minutter.</span>
      </span>
      <span class="newest-cta-link">Opret annonce${Icon.arrowRight}</span>
    </a>`;
  const renderNewest = async () => {
    const cols = getComputedStyle(newestMount).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    // Meget tyndt lager (1-2 annoncer): vis dem som fuldbredde-liste-kort, så den
    // ene rigtige motorcykel får vægt — det slår ét lille kort ved siden af et
    // tomt bånd, der bare reklamerer "næsten intet lager". Ingen udfylder.
    if (newest.length > 0 && newest.length < 3){
      newestMount.classList.add('list-view');
      await saetIndIPortioner(newestMount, realCards);
      return;
    }
    newestMount.classList.remove('list-view');
    // Fyld en delvis række ud med ÉT solidt bånd, der spænder de ledige kolonner.
    const span = (newest.length < cols) ? cols - newest.length : 0;
    await saetIndIPortioner(newestMount, span ? realCards.concat(wideCtaHTML(span)) : realCards);
    newestMount.querySelector('.newest-cta')?.classList.toggle('is-wide', span >= 2);
  };
  const tegnNyeste = () => renderNewest().then(() => wireFavoriteButtons(newestMount));
  // Er databasen helt tom, tegnes tom-tilstanden med det samme: den er
  // billig, og den bestemmer sektionens højde.
  if (newest.length === 0){
    newestMount.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icon.bike}
        <h3>Der er ingen annoncer endnu</h3>
        <p>Bliv den første til at sætte en motorcykel til salg.</p>
        <a href="opret-annonce.html" class="btn btn-primary" style="margin-top:16px;">Opret annonce</a>
      </div>`;
  } else {
    await tegnNyeste();
  }
  // Tilpas udfylderkort, når man krydser et brudpunkt (fx rotation), og
  // gen-wire de nye kort. Kun hvis gitteret allerede er tegnet — ellers ville
  // en rotation nå at bygge det, før man er i nærheden af det.
  let _newestRAF;
  window.addEventListener('resize', () => {
    if (!newestMount.querySelector('.card, .newest-cta')) return;
    cancelAnimationFrame(_newestRAF);
    _newestRAF = requestAnimationFrame(tegnNyeste);
  });

  /* ============ Bid 7: udvalgte + senest sete ============ */
  /* "Udvalgte annoncer — kuraterede fund fra hele landet".

     Kurateringen var ren tilfældighed blandt alt over 60.000 kr., og to af de
     fire kort landede på annoncer helt uden foto: en grå stregtegning med
     "Intet foto" under overskriften "kuraterede fund". Det er ikke et fund,
     det er et hul — og lige præcis her, hvor vi selv har valgt, hvad der skal
     vises, er der ingen undskyldning for det.

     Lageret har 256 annoncer over 60.000 kr. MED foto, så fotoet kan uden
     videre være et kriterium i kurateringen. Det er ikke at skjule noget:
     annoncerne uden foto tæller stadig med i totalen, i søgningen og i
     "Nyeste annoncer", hvor rækkefølgen er et løfte om dato og derfor ikke må
     pyntes. Her lover overskriften kun, at nogen har valgt dem.

     Er der ikke fire med foto (nyt lager), fyldes der op med de billedløse
     frem for at vise en halvtom række.

     Rækkefølgen inden for "har foto" er vores egne før de indekserede — samme
     linje som Store.getAllListings(): en annonce, vi selv hoster, kan køberen
     handle på her, og den skal ikke skubbes ned af annoncer, vi kun linker
     videre til. På localhost har demolageret ingen fotos, så rækken bliver i
     praksis indekseret; i drift er demoannoncerne slået fra (SHOW_DEMO_DATA i
     js/data.js), og vores egne kommer først.

     Underrubrikken i index.html blev rettet samtidig: den lovede "fra hele
     landet", men udvalget vælges på pris og foto, ikke på geografi. */
  const dyre = [...ALLE].filter(l => l.price > 60000);
  const harFoto = (l) => (l.photoUrls || []).length > 0;
  const rnd = seededRandom(7);
  const bland = (arr) => arr.map(l => ({ l, k: rnd() })).sort((a,b) => a.k - b.k).map(x => x.l);
  const lag = [
    dyre.filter(l => harFoto(l) && !l.isExternal),
    dyre.filter(l => harFoto(l) && l.isExternal),
    dyre.filter(l => !harFoto(l)),
  ];
  const featured = lag.flatMap(bland).slice(0, 4);
  // En overskrift uden indhold under ser i stykker ud — skjul hele sektionen.
  // Beslutningen tages NU (den er gratis), så sektionen ikke først står som et
  // tomt bånd og forsvinder, når man scroller ned til den.
  const featuredMount = document.getElementById('featured-listings');
  const featuredSection = featuredMount.closest('section');
  if (featuredSection) featuredSection.hidden = featured.length === 0;
  if (featured.length){
    await saetIndIPortioner(featuredMount, featured.map(kortHTML));
    wireFavoriteButtons(featuredMount);
  }

  // Senest sete — kun annoncer der stadig findes/er aktive; skjul sektionen
  // helt for nye brugere (og når intet er set endnu).
  const seenIds = Store.getRecentlyViewed();
  const seen = seenIds.map(id => Store.getListingById(id))
    .filter(l => l && (l.status ? l.status === 'active' : true))
    .slice(0, 8);
  const seenSection = document.getElementById('recently-viewed-section');
  const seenMount = document.getElementById('recently-viewed');
  if (seenSection && seenMount){
    seenSection.hidden = !seen.length;
    if (seen.length){
      await saetIndIPortioner(seenMount, seen.map(kortHTML));
      wireFavoriteButtons(seenMount);
    }
  }

  // Kort, der allerede står i dokumentet (fx tom-tilstandens knap), samt alt
  // andet klikbart uden for gitrene. Gitrene wirer sig selv, når de tegnes.
  wireFavoriteButtons(document);
}
