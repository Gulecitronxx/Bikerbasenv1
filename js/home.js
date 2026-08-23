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
    /* Runde 6 (D6-F9): "Under 10.000 km" fjernet — fem chips ombroed til 4 + 1
       paa desktop (+44 px i hero'en), og 162 af 548 er fabriksnye uden km, saa
       chippen favoriserede ét lager. */
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
  const resetBtn = document.getElementById('hs-reset');
  /* Runde 5 (D5-F4): antal kilder (forhandlere/markedspladser) og egne
     annoncer i lageret — saettes i bid 5, naar data er klar, og skrives ind i
     hero'ens antalslinje, saa den sandhed, der foer kun stod i .lead (skjult
     paa mobil), staar i den linje, der ER synlig. */
  let antalKilder = 0, antalEgne = 0;

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

     TALLET KOMMER NU FRA SØGESIDENS EGEN BEREGNING. Hele filterkæden er
     flyttet til js/filtrering.js, og både forsiden og soegning.html kalder
     `Filtrering.anvendFiltre()`. Det er runde 3's rettelse, og den er en
     anden slags rettelse end runde 2's.

     HVAD DER VAR GALT: der var to kæder. Forsiden havde sin egen
     efterligning af `anvendFiltre()` — samme rækkefølge, samme prædikater,
     skrevet af i hånden. Runde 1 fandt fejlen på TRÆF (`null <= 60000` er
     sandt i JS, så annoncer uden pris slap gennem et maks-prisfilter).
     Runde 2 fandt fejlen på FRAVALGTE (forsiden bogførte kun kørekortet og
     skrev 53, hvor søgesiden skrev 75 for samme klik). Begge blev rettet
     ved at skrive søgesidens kode af én gang til. Begge gange holdt tallene
     bagefter — og begge gange stod muligheden for den tredje uenighed
     tilbage, urørt.

     HVORFOR DET HER ER ANDERLEDES: to kopier, der er enige i dag, er ikke
     det samme som to sider, der ikke KAN være uenige. Nu er der én kæde.
     Tilføjer nogen et filter til søgesiden, får forsiden det samme filter
     med samme prædikat og samme feltnavn i regnskabet — eller også får den
     det slet ikke. Der er ikke længere en tredje mulighed, hvor de to sider
     tæller hver sin vej.

     Forsiden sætter kun fire af felterne; resten falder tilbage til
     `Filtrering.TOMT_FILTER`. Feltnavnene er søgesidens URL-navne (`types`
     som liste, `priceMax`, `koerekort`), så det, hero'en regner på, er
     bogstaveligt talt det samme objekt, som submit-handleren lige nedenfor
     lægger i adressen. */
  const heroFiltre = () => {
    const type = document.getElementById('hs-type').value;
    const maxPrice = Number(document.getElementById('hs-price').value) || null;
    return {
      q: document.getElementById('hs-query').value.trim(),
      types: type ? [type] : [],
      priceMax: maxPrice,
      koerekort: valgtKoerekort(),
    };
  };

  const heroListe = () => {
    const filtre = heroFiltre();
    /* Samme form som js/search.js' `uoplystSkjult`: [{ felt, antal }].
       En annonce fjernes ved det FØRSTE filter, der ikke kan svare for den,
       og tælles derfor kun én gang — det er dét, der gør, at tallene må
       lægges sammen. */
    const skjult = [];
    const list = Filtrering.anvendFiltre(Store.getAllListings(), filtre, null, skjult);
    const harSøgt = !!(filtre.q || filtre.types.length || filtre.priceMax || filtre.koerekort);
    return { list, skjult, kat: filtre.koerekort, harSøgt };
  };

  /* Sætningen om de fravalgte. Optællingen og opremsningen af feltnavne
     kommer fra `Filtrering.uoplystOpgoerelse()` — det er samme funktion, som
     søgesidens note skal bruge, så de to sider ikke kan komme til at nævne
     forskellige felter for det samme klik. Kun slutningen er forsidens egen:
     her er der ikke noget "vist" endnu, der er et tal, man kan tælle med i. */
  const uoplystTekst = (skjult) => {
    const { antal, feltTekst } = Filtrering.uoplystOpgoerelse(skjult);
    if (!antal) return '';
    return antal === 1
      ? `1 annonce er ikke talt med, fordi ${feltTekst} ikke er oplyst på den. Den vises heller ikke i søgningen.`
      : `${daTal(antal)} annoncer er ikke talt med, fordi ${feltTekst} ikke er oplyst på dem. De vises heller ikke i søgningen.`;
  };

  /* skjultAfUvidenhed() STOD HER og er slettet.

     Den var en ordret tvilling til `koerekortSvar()` i js/search.js: begge
     spurgte `passerKoerekort()` en gang til med de manglende felter sat til
     den mindst tænkelige rigtige motorcykel (1 hk, 1 cm³) for at skelne "for
     kraftig" fra "vi ved det ikke". work/DECISIONS.md bar et forslag om at
     slå dem sammen, med den begrundelse at den tavse regression, der udløste
     testene i runde 1 (`proeve.power = 0`), kunne opstå netop fordi reglen
     fandtes to steder. Den bor nu ét sted: `Filtrering.koerekortSvar()`, og
     js/koerekort.test.js dækker dermed også forsiden. */

  /* Én opdatering for hele søgekortet: hjælpelinjen under kørekortvælgeren,
     antalslinjen i hero'en og tallet på knappen. De tre siger noget om samme
     lager og skal aldrig kunne komme ud af trit — derfor ét kald, ikke tre. */
  const opdaterHero = () => {
    const { list, skjult, kat, harSøgt } = heroListe();
    const n = list.length;
    /* Runde 7 (D7-F2): tallet er ANNONCER. Samme motorcykel kan ligge hos to
       kilder (MC Syd laegger egne annoncer paa Gul og Gratis — 7 fundet paa
       maerke+aargang+pris+postnr), saa "548 motorcykler" er for meget, mens
       "548 annoncer" er praecist. Bilbasen skriver ogsaa "annoncer i dag". */
    const mc = n === 1 ? 'annonce' : 'annoncer';

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
      /* "i dag" ER FJERNET, OG DET ER IKKE KOSMETIK.

         Ordet var en friskhedspåstand, vi ikke kan bakke op for 332 af de
         383 annoncer: de er indekseret fra andre danske sider, og det eneste
         datofelt, vi har på dem, er `indekseretFoerste` — hvornår VI så dem
         første gang, ikke hvornår sælgeren satte dem til salg, og ikke at de
         stadig er til salg netop i dag. (Crawleren markerer annoncer som
         'borte', når de forsvinder hos kilden, men det sker ved næste
         kørsel, ikke i dag.)

         Kritikeren satte den mod sektionen to skærme længere nede: hero'en
         sagde "383 motorcykler til salg i dag", og "Nyeste annoncer" viste
         otte kort, hvor det nyeste var tre uger gammelt. To påstande om det
         samme lager, hvor den ene modbeviser den anden på samme side.

         Tallet bliver stående — det er præcist, det er vores, og det er
         Bilbasens eget greb ("50.356 annoncer i dag"). Det er ordet, der
         ikke havde dækning, og en påstand uden dækning er billigere at
         undvære end at forsvare. */
      /* Runde 5 (D5-F4): "… hos 4 danske forhandlere og markedspladser" — tallet
         er antallet af kilder i lageret, regnet i bid 5. Paa desktop staar
         .lead lige under med samme budskab, saa halen vises kun paa mobil
         (css .hero-count-kilder). */
      const kilderHale = antalKilder
        ? `<span class="hero-count-kilder"> hos <b>${daTal(antalKilder)}</b> danske `
          + `${antalKilder === 1 ? 'forhandler eller markedsplads' : 'forhandlere og markedspladser'}`
          + `${antalEgne ? ' — og her på Bikerbasen' : ''}</span>`
        : '';
      countHint.innerHTML = n >= 10
        ? `<b>${daTal(n)}</b> annoncer med motorcykler til salg${kilderHale}`
        : '';
    }
    if (resetBtn) resetBtn.hidden = !harSøgt;
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
  /* Runde 5 (D5-F6): "Nulstil" — reset-haendelsen affyres FOER felterne er
     tomme, saa taellingen koeres i naeste tick. */
  document.getElementById('hero-search-form').addEventListener('reset', () => setTimeout(opdaterHero, 0));
  opdaterHero();

  // hero search submit — bundet her, i første bid, så søgekortet virker
  // fra det øjeblik det kan ses (før lå det til allersidst).
  document.getElementById('hero-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    /* Adressen bygges af PRÆCIS det filtersæt, tallet på knappen blev
       regnet af — samme heroFiltre(). Før læste submit-handleren de fire
       felter op en gang til, og et felt, der blev læst to steder, kunne
       læses forskelligt. Parameternavnene er søgesidens: ?type= i ental
       (readStateFromURL oversætter den til state.types) og ?maxPrice=
       (til state.priceMax). */
    const f = heroFiltre();
    const params = new URLSearchParams();
    if (f.q) params.set('q', f.q);
    if (f.types.length) params.set('type', f.types.join(','));
    if (f.priceMax) params.set('maxPrice', String(f.priceMax));
    if (f.koerekort) params.set('koerekort', f.koerekort);
    window.location.href = 'soegning.html' + (params.toString() ? '?' + params.toString() : '');
  });

  await yieldToMain();

  /* ============ Bid 2: kategorifliserne ============ */
  // category tiles — hver type får sin egen line-art-motorcykel af netop den
  // type. Mere distinkt end ét gentaget ikon, og custom pr. kategori frem for
  // Bilbasens stock-fotos.
  /* width/height er filernes RIGTIGE mål. De stod på 760×570 efter at
     billederne blev skaleret ned til 456×342 — forholdet 4:3 var uændret, så
     pladsreservationen holdt, men tallene passede ikke på filerne længere, og
     et forkert intrinsic-mål er præcis det, en fremtidig srcset ville regne
     galt på.

     INGEN srcset, og det er målt frem, ikke glemt: fliserne står i to spalter
     inden for .container, altså (412 − 32 − 12) / 2 = 184 CSS-px på
     Lighthouses mobil (Moto G Power, 412 px, DPR 1,75) = 322 fysiske px. En
     320w-kandidat er to pixel for lille, så browseren ville vælge 456w
     alligevel, og på DPR 2 (350 px) og DPR 3 (525 px) ligeså. Otte ekstra
     filer, ingen af dem nogensinde valgt. Skal der spares her, er svaret at
     gøre 456w-filen mindre — ikke at lægge en kandidat ved siden af. */
  /* ANTALLET PÅ FLISEN er tomt her og fyldes i bid 5, når lageret har svaret
     (se fyldTypeAntal). Kritikeren i runde 2: "Søg efter type lover otte
     typer, men kortene lige under bruger kildens ordforråd" — Street,
     Offroader, Sportstouring, Klassiker. De ord kommer fra kildens
     `variant`-felt og står som annoncekortets anden linje; de kan ikke
     rettes herfra (crawler/normalize.js har en anden ejer — se
     work/DECISIONS.md). Det, forsiden KAN gøre, er at holde op med at love
     otte lige store døre: med tallet på flisen kan man se, at Cross har 3 og
     Cruiser 93, FØR man klikker — og de otte tal kan holdes op mod totalen.

     Tallet ligger absolut placeret oven på fotoet (`.tile-count`) og ikke i
     etiketlinjen. To grunde: en tekst føjet til etiketten kan brække linjen
     på 390 px og gøre flisen højere, og elementet er tomt indtil
     backendReady() — et absolut placeret, tomt element fylder nul både før og
     efter stilarket lander, så der er ingen CLS at forebygge.

     I MARKUPPEN står det til gengæld SIDST, efter etiketten, selvom det
     tegnes øverst til højre. Absolut placering er ligeglad med
     dokumentrækkefølgen, men en skærmlæser er ikke: lå det først, blev
     flisen læst op som "93 annoncer, Cruiser". Nu er den "Cruiser,
     93 annoncer". */
  const tilesMount = document.getElementById('category-tiles');
  tilesMount.innerHTML = TYPES.map(t => `
    <a href="soegning.html?type=${t.id}" class="tile">
      <span class="tile-media"><img src="img/type/${t.id}.webp" alt="" width="456" height="342" loading="lazy" decoding="async"></span>
      <span class="tile-label">${t.label}<span class="tile-go" aria-hidden="true">${Icon.arrowRight}</span></span>
      <span class="tile-count" data-type="${t.id}"></span>
    </a>`).join('');

  await yieldToMain();

  /* ============ Bid 3: mærkeskyen + SEO-linkbåndet ============ */
  /* Runde 5 (D5-F2): maerkeskyen bygges af LAGERET i bid 5 (tegnMaerker), naar
     data er klar — ikke af en fast liste. Den faste liste (Yamaha, Honda, …,
     Vespa, Indian) var filtreret mod BRANDS_BY_MODEL (kendte maerker), ikke
     mod lageret: Vespa havde 0 annoncer, Husqvarna 1, Indian 2 — og
     Harley-Davidson (72, lagerets nr. 2) var ikke med. Samme blindgyde som
     D-009/D-010 lukkede paa maerker.html. Indtil data er klar er skyen tom;
     .brand-cloud:empty reserverer hoejden. */
  const brandCloud = document.getElementById('brand-cloud');

  // SEO-browse-bånd over footeren — rigtige søge-URL'er, ligesom Bilbasens
  // linkfarm. God for organisk trafik og udfylder siden meningsfuldt.
  const fillSeoCol = (id, links) => {
    const ul = document.querySelector('#' + id + ' ul');
    if (ul) ul.innerHTML = links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
  };
  // seo-brands fyldes i bid 5 af tegnMaerker() — samme liste som maerkeskyen.
  // seo-types fyldes i bid 5 af fyldTypeAntal() — kun typer med annoncer (D6-F3).
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
     Rækkefølge efter køberens faktiske behov: først hvor annoncen kommer fra
     (i dag er hele lageret indekseret fra forhandlere og markedspladser, og
     handlen sker hos kilden), så skjult kontakt på egne annoncer, så
     "ingen gættede felter". Her stod før "Registreringsstatus på hver
     annonce" — det findes ikke for indekserede annoncer, altså ikke for én
     eneste annonce på sitet i dag. Ingen opdigtede tal/anmeldelser. */
  document.getElementById('trust-strip').innerHTML = `
    <div class="trust-card">
      <span class="trust-icon">${Icon.checkCircle}</span>
      <div><h3>Kilden står på hver annonce</h3><p>Er annoncen indekseret fra en forhandler eller markedsplads, står det på kortet, og handlen sker hos kilden. Vi hoster ikke deres annoncer og kopierer ikke deres tekst — vi viser dig vej.</p></div>
    </div>
    <div class="trust-card">
      <span class="trust-icon">${Icon.mail}</span>
      <div><h3>Din kontaktinfo er skjult for udloggede</h3><p>Opretter du en annonce på Bikerbasen, er dit navn og telefonnummer kun synlige for indloggede brugere — ikke for robotter, søgemaskiner eller udloggede besøgende.</p></div>
    </div>
    <!-- Her stod "Verificerede forhandlere — Forhandlere godkendes med CVR og
         MitID". Det passede ikke. verifiedBadgeHTML() i js/components.js
         returnerer tom streng med vilje, login.html siger ordret "Ingen
         profiler på Bikerbasen er identitetsverificerede", og
         sælgerprofilen skriver "Vi slår ikke op i CVR- eller MitID-
         registret". Forsiden lovede altså på første skærm præcis det, de
         tre andre sider bagefter tog tilbage — og det er tillidsløftet,
         køberen dømmer os på. Kortet siger nu det, siden faktisk gør, og
         det kan efterprøves på et hvilket som helst annoncekort. -->
    <div class="trust-card">
      <span class="trust-icon">${Icon.shieldCheck}</span>
      <div><h3>Ingen gættede felter</h3><p>Mangler et tal hos sælgeren, står der "Ikke oplyst" — vi fylder ikke hullet ud med et skøn. Og vi sætter ikke et "Verificeret"-stempel på oplysninger, vi ikke har slået op.</p></div>
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
  /* Runde 5 (D5-F4): kilder og egne annoncer i lageret — til hero-linjen. */
  antalKilder = new Set(ALLE.filter(l => l.isExternal).map(l => l.source?.navn).filter(Boolean)).size;
  antalEgne = ALLE.filter(l => !l.isExternal).length;
  opdaterHero();                         // nu med de rigtige tal fra databasen

  /* Foto og modelnavn — bruges af forslagslisten her og af "Til salg lige nu"
     i bid 7. En annonce uden modelnavn ("Honda" til 609.995 kr.) er ikke et
     forslag, det er et spoergsmaal. */
  const harFoto = (l) => (l.photoUrls || []).length > 0;
  const harModel = (l) => {
    const m = String(l.model || '').trim();
    return !!m && m.toLowerCase() !== String(l.brand || '').trim().toLowerCase();
  };

  /* Runde 5 (D5-F6): forslag i fritekstfeltet — distinct maerke og
     maerke+model fra LAGERET (mindst én annonce bag hvert). Ingen statisk
     liste: BRANDS_BY_MODEL kender hverken "Nightster" eller "XV 1900", og en
     liste med nul-traef-forslag er praecis det, D-009 forbyder. */
  const forslag = document.getElementById('hs-suggest');
  if (forslag){
    const set = new Map();
    for (const l of ALLE){
      const b = String(l.brand || '').trim();
      if (!b || b === 'Ukendt') continue;
      set.set(b.toLowerCase(), b);
      if (harModel(l)){ const bm = `${b} ${String(l.model).trim()}`; set.set(bm.toLowerCase(), bm); }
    }
    forslag.innerHTML = [...set.values()].sort((a, b) => a.localeCompare(b, 'da'))
      .map(v => `<option value="${escapeHTML(v)}"></option>`).join('');
  }

  /* Antallet på hver kategoriflise — og på underrubrikken de annoncer, der
     ikke hører til nogen af de otte.

     Tallet regnes med `Filtrering.anvendFiltre()`, altså den samme kæde som
     søgeknappen og soegning.html. Det er ikke pedanteri: flisen er et løfte
     om, hvad der ligger bag klikket, og et løfte, der regnes et andet sted
     end resultatet, er præcis den fejl, hele runde 3 handler om. Klikker man
     "Cruiser 93", siger resultatsiden 93.

     Underrubrikken siger de uoplyste højt. 48 af 383 annoncer har ingen type
     hos kilden, og uden den sætning ser de otte tal ud til at skulle lægge
     sammen til totalen — det gør de ikke, og en køber, der lægger sammen,
     ville tro, vi tabte annoncer undervejs. Vi gætter ikke en type ud fra
     modelnavnet; se typeFraTitel() i js/backend-bridge.js, der HOLDER OP,
     når kildens kategoriord ikke er der. */
  const fyldTypeAntal = () => {
    let udenType = 0;
    for (const l of ALLE) if (l.type == null) udenType++;
    document.querySelectorAll('#category-tiles .tile-count').forEach(el => {
      const id = el.getAttribute('data-type');
      const n = Filtrering.anvendFiltre(ALLE, { types: [id] }, null, null).length;
      el.textContent = daTal(n);
      /* Skærmlæseren skal ikke bare høre "93" mellem billedet og etiketten.
         Etiketten står i det samme <a>, så det fulde oplæste navn bliver
         fx "93 annoncer Cruiser". */
      el.setAttribute('aria-label', n === 1 ? '1 annonce' : `${daTal(n)} annoncer`);
      /* Runde 5 (D5-F3): en flise med 0 er et link til nul traef — den tegnes
         ikke. Resten ordnes efter antal, flest foerst (css order), saa
         Cruiser 89 staar foerst og Cross 1 sidst. Ingen type gaettes. */
      const flise = el.closest('.tile');
      if (flise){ flise.hidden = n === 0; flise.style.order = String(-n); }
    });
    /* Paa mobil er raekken en vandret rulleliste med snap. Chrome bevarer
       snap-maalet (DOM-foerste flise, Sport) hen over omordningen og rullede
       raekken 664 px til hoejre. Tilbage til start, naar ordenen er sat. */
    const raekke = document.getElementById('category-tiles');
    if (raekke && raekke.scrollLeft) raekke.scrollLeft = 0;
    /* Runde 6 (D6-F3): SEO-kolonnen "Motorcykeltyper" listede Scooter (0) som
       link til nul traef — samme blindgyde, D5-F3 lukkede paa flisen. Samme
       liste, samme filter, tallet i parentes som maerkerne. */
    const typerMedTal = TYPES.map(t => ({ t, n: Filtrering.anvendFiltre(ALLE, { types: [t.id] }, null, null).length }))
      .filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    fillSeoCol('seo-types', typerMedTal.map(x => ({ label: `${x.t.label} (${daTal(x.n)})`, href: `soegning.html?type=${x.t.id}` })));
    const sub = document.getElementById('types-sub');
    if (sub && udenType){
      sub.textContent = `Find hurtigt den type, du leder efter. ${daTal(udenType)} af `
        + `${daTal(ALLE.length)} annoncer har ingen type oplyst hos kilden og ligger `
        + `derfor ikke bag nogen af fliserne — dem finder du i den fulde søgning.`;
    }
  };
  fyldTypeAntal();

  /* Runde 5 (D5-F2): "Maerker med flest annoncer" — bygget af lageret.
     Maerkerne laegges sammen paa slug, praecis som scripts/build-brand-pages.js
     goer ("Royal Enfield"/"Royal-enfield" er ét maerke), saa tallet paa
     chippen er det samme som paa maerkesiden. De 12 stoerste med mindst 2
     annoncer; linket gaar til maerkesiden, hvor den findes (data-maerkesider
     skrives af byggetrinnet), ellers til soegningen. Nul-chips tegnes aldrig. */
  const slugify = (name) => String(name).toLowerCase()
    .replace(/ø/g, 'oe').replace(/æ/g, 'ae').replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const tegnMaerker = () => {
    const pr = new Map();
    for (const l of ALLE){
      const b = String(l.brand || '').trim();
      if (!b || b === 'Ukendt') continue;
      const s = slugify(b); if (!s) continue;
      let e = pr.get(s); if (!e){ e = { slug: s, n: 0, navne: new Map() }; pr.set(s, e); }
      e.n++; e.navne.set(b, (e.navne.get(b) || 0) + 1);
    }
    const top = [...pr.values()].filter(e => e.n >= 2)
      .sort((a, b) => b.n - a.n || a.slug.localeCompare(b.slug)).slice(0, 12)
      .map(e => ({ slug: e.slug, n: e.n, navn: [...e.navne.entries()].sort((a, b) => b[1] - a[1])[0][0] }));
    const sider = new Set(((brandCloud && brandCloud.dataset.maerkesider) || '').split(',').filter(Boolean));
    const href = (m) => sider.has(m.slug) ? `maerke-${m.slug}.html` : `soegning.html?brands=${encodeURIComponent(m.navn)}`;
    if (brandCloud){
      brandCloud.innerHTML = top.map(m =>
        `<a class="brand-chip" href="${href(m)}" aria-label="${escapeHTML(m.navn)}, ${daTal(m.n)} annoncer">
           <span class="brand-chip-name">${escapeHTML(m.navn)}</span>
           <span class="brand-chip-n" aria-hidden="true">${daTal(m.n)}</span>
           <span class="brand-chip-go" aria-hidden="true">${Icon.arrowRight}</span>
         </a>`).join('');
      const sec = brandCloud.closest('section'); if (sec) sec.hidden = top.length === 0;
    }
    fillSeoCol('seo-brands', top.slice(0, 8).map(m => ({ label: `${m.navn} (${daTal(m.n)})`, href: href(m) })));
  };
  tegnMaerker();

  await yieldToMain();

  /* ============ Bid 6: nyeste annoncer ============ */
  // newest listings (by date)
  /* KUN ANNONCER, DER HAR EN DATO. Før sorterede linjen hele lageret på
     `new Date(l.createdAt)`, og for de 332 indekserede er createdAt `null`
     med vilje (crawledatoen er ikke annoncedatoen — se
     normalizeExternalListing i js/backend-bridge.js). `new Date(null)` er
     ikke NaN, det er 1. januar 1970, så de datoløse blev ikke sorteret
     bagest, de blev sorteret som ældst — og på localhost, hvor der er 51
     annoncer med dato, faldt de tilfældigvis uden for de otte.

     I DRIFT gør de ikke. Der er `SHOW_DEMO_DATA` falsk (js/data.js), så
     lageret er 332 indekserede og NUL med dato — og så viste sektionen
     "Nyeste annoncer" otte vilkårlige annoncer, hvis alder vi ikke kender,
     under en overskrift, der lover det modsatte. Underrubrikken kunne ikke
     engang skrive datoen (`newest[0]?.createdAt` var null), så den stod
     tilbage som "De senest oprettede annoncer på Bikerbasen." uden ét tal at
     bakke den op. Det er den dyreste slags fejl på det her site: en
     friskhedspåstand uden dækning.

     Filteret koster ingenting på localhost (samme otte kort som før) og
     redder sektionen i drift, hvor den nu falder i den ærlige tomtilstand
     nedenfor i stedet for at finde på en rækkefølge. */
  const medDato = ALLE.filter(l => l.createdAt && !Number.isNaN(new Date(l.createdAt).getTime()));
  const newest = medDato.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

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
  /* Ingen daterede annoncer = ingen underrubrik. Den statiske tekst ("De
     senest oprettede annoncer på Bikerbasen.") stod ellers tilbage over en
     tomtilstand, der siger det stik modsatte — at vi ikke kender datoen på
     nogen af dem. Det er præcis situationen i drift i dag. Forklaringen står
     i tomtilstanden; to steder ville bare give to formuleringer at holde i
     sync. */
  if (nyesteSub && !newest.length) nyesteSub.hidden = true;
  if (nyesteSub && newest[0]?.createdAt){
    // Samme datoformat som js/annonce.js og js/forhandler.js: "26. jul. 2026".
    const dato = new Date(newest[0].createdAt)
      .toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
    const eksterne = ALLE.length - medDato.length;
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
  /* Runde 5 (D5-F1a): er der annoncer, men ingen med dato (drift: 548 af 548
     indekserede), skjules HELE sektionen. Tomtilstanden brugte ≈670 px paa
     forsidens dyreste plads til at forklare, at den var tom; forklaringen
     hoerer til paa soegesiden ("Nyeste foerst"-noten). Ingen dato opfindes —
     sektionen vender selv tilbage, den dag en annonce har createdAt. Er
     lageret HELT tomt, vises sektionen med "Der er ingen annoncer endnu". */
  const newestSection = document.getElementById('newest-section');
  if (newestSection) newestSection.hidden = ALLE.length > 0 && newest.length === 0;
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
    /* To forskellige tomme tilstande, fordi de har to forskellige årsager —
       og en køber skal kunne se forskel på "der er ikke noget" og "der er
       masser, vi bare ikke kender datoen på". Det andet tilfælde ER
       situationen i drift i dag: 332 indekserede annoncer uden
       oprettelsesdato. Den gamle tekst ("Der er ingen annoncer endnu") ville
       dér modsige hero'ens eget tal to skærme længere oppe. */
    newestMount.innerHTML = ALLE.length ? `
      <div class="empty-state" style="grid-column:1/-1;">
        ${Icon.bike}
        <h3>Vi kender ikke datoen på nogen af annoncerne endnu</h3>
        <p>Alle ${daTal(ALLE.length)} annoncer i lageret er indekseret fra andre danske
           sider, og vi kender ikke deres oprettelsesdato hos kilden. Vi gætter den ikke,
           og derfor kan vi ikke sætte dem i rækkefølge efter alder.
           Annoncer oprettet her på Bikerbasen får en dato og lander i denne sektion.</p>
        <a href="soegning.html" class="btn btn-primary" style="margin-top:16px;">Se alle ${daTal(ALLE.length)} annoncer</a>
      </div>` : `
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
  /* harFoto/harModel er defineret i bid 5 (bruges ogsaa af forslagslisten). */

  /* EN ANNONCE UDEN MODELNAVN ER IKKE ET UDVALG, DET ER EN GÆTTELEG.
     Kritikeren i runde 2 fandt et kort, der bare hed "Honda" — ingen model —
     til 609.995 kr. Målt: der er seks sådanne annoncer i lageret (fem af dem
     er den samme Honda til 609.995 kr., én er en BMW til 139.800 kr.), og
     alle seks har foto, så de vandt let en plads i en række, der kun sorterer
     på pris og billede. På et kort, VI har valgt, er "Honda til 609.995 kr."
     ikke en oplysning, det er et spørgsmål. De er ikke skjult noget sted: de
     tæller i totalen, i søgningen og i alle facetter. De skal bare ikke være
     dem, forsiden peger på. */
  /* "DE DYRERE MODELLER" SKAL VÆRE DE DYRERE MODELLER.
     Grænsen var 60.000 kr., og med den stod der 62.200 kr. på det billigste
     kort under rubrikken "de dyrere modeller" — mens sidens eget prisfacet
     samtidig talte 131 annoncer over 150.000 kr. 60.000 var ikke "dyrere",
     det var "over gennemsnitsprisen for en privat brugtannonce".

     Grænsen er nu medianprisen i lageret, regnet på stedet. Så betyder
     "dyrere" ordret den dyrere halvdel, tallet følger lageret uden at nogen
     skal huske at flytte det, og underrubrikken kan skrive det ud, så
     køberen kan efterprøve rubrikken på kortene. Annoncer uden pris er
     ikke med i medianen — de sorterede før som 0 og trak den ned. */
  /* Runde 5 (D5-F1b): RUBRIKKEN ER "TIL SALG LIGE NU", OG GRAENSEN ER VAEK.
     "Dyrere modeller" (kun over medianen, 119.800 kr.) viste 2 kort af 548
     paa mobil, 4 300 px nede. Nu er kandidaterne alle annoncer MED foto og
     modelnavn, i SAMME raekkefoelge som soegesidens standard
     (Sortering 'blandet' — bedst oplyste foerst, derefter dato, derefter id;
     de billedloese fordeles ikke, for de er frasorteret her). Saa staar der
     paa forsiden det, man ogsaa moeder oeverst i soegningen, og
     underrubrikken kan sige det ordret. Det tilfaeldige froe fra runde 4 er
     vaek — en fast, efterproevelig raekkefoelge slaar "tilfaeldig, saa det er
     ikke en anbefaling". Medianen regnes ikke laengere. */
  const kandidater = Sortering.sorter(ALLE.filter(l => harFoto(l) && harModel(l)), 'blandet');
  /* RÆKKEFØLGEN SKAL VÆRE TILFÆLDIG — IKKE BARE SE SÅDAN UD.
     Stod her før: `seededRandom(7)`. Et FAST tal er ikke et frø, der gør
     blandingen reproducerbar til test — det er en blanding, der ALDRIG
     ændrer sig, fordi den regnes ens hver gang siden indlæses. Kritikeren i
     runde 3 målte det direkte: 18 indlæsninger — 12 i samme fane, 6 i friske
     browserkontekster med tomt localStorage/sessionStorage — gav de samme
     tre kort i den samme rækkefølge hver eneste gang. Sætningen lige
     nedenfor, "Rækkefølgen er tilfældig, så det er ikke en anbefaling", var
     derfor en påstand, koden aldrig kunne indfri.
     Frøet trækkes nu fra Math.random() ved hvert kald af renderFeatured(),
     altså ét nyt, ægte tilfældigt frø pr. sideindlæsning — så blandingen
     rent faktisk skifter fra besøg til besøg, sådan som teksten lover.
     Selve algoritmen (ét kort pr. mærke, egne annoncer før indekserede) er
     urørt: det var aldrig DEN, der var fejlen — det var at frøet stod
     skrevet som et bogstaveligt tal i kildekoden. */
  /* (Runde 5: ingen blanding — se noten ved `kandidater`.) */
  /* ÉT KORT PR. MÆRKE. Uden reglen gav den seedede blanding fire Hondaer,
     hvoraf to var den samme model (CRF 1100 L Africa Twin til 199.995 og
     224.995 kr.). Målt på kandidaterne er 108 af 169 Honda og 36
     Harley-Davidson, så en ren tilfældig blanding vil oftest vise ét mærke
     og kalde det et udvalg — og to kort med samme model ved siden af
     hinanden ligner en fejl i sig selv. Der er elleve mærker at tage af.

     Reglen står i underrubrikken, så den kan efterprøves på kortene.
     Skulle lageret en dag have færre mærker over medianen, end rækken har
     plads til, fyldes der op fra resten (uden dubletter af samme model),
     frem for at vise en halvtom række.

     Vores egne før de indekserede — samme linje som Store.getAllListings():
     en annonce, vi selv hoster, kan køberen handle på her. */
  const raekkefoelge = [
    ...kandidater.filter(l => !l.isExternal),
    ...kandidater.filter(l => l.isExternal),
  ];
  /* Runde 7 (D7-F3): hoejst halvdelen af raekken fra samme kilde, saa laenge
     en anden kilde har et kort tilbage — ellers blev "Til salg lige nu" én
     kildes vaeg (8 af 8 MC Syd), fordi reglen "én pr. maerke" favoriserer den
     kilde med flest maerker. Foerste gennemloeb respekterer loftet; er raekken
     ikke fuld derefter, fyldes den op uden loft. */
  const kildeAf = (l) => l.isExternal ? String((l.source && (l.source.domaene || l.source.navn)) || 'ekstern') : 'bikerbasen';
  const vaelgEfter = (noegle, ud, brugt, antal, kildeLoft) => {
    for (const pas of (kildeLoft ? [true, false] : [false])){
      for (const l of raekkefoelge){
        if (ud.length >= antal) break;
        const k = noegle(l);
        if (brugt.has(k)) continue;
        if (pas && ud.filter(x => kildeAf(x) === kildeAf(l)).length >= Math.ceil(antal / 2)) continue;
        brugt.add(k); ud.push(l);
      }
    }
  };
  let enPrMaerkeHoldt = true;   // kunne raekken fyldes med ét kort pr. maerke?
  const vaelgFeatured = (antal) => {
    const ud = [];
    vaelgEfter(l => String(l.brand || ''), ud, new Set(), antal, true);
    enPrMaerkeHoldt = ud.length >= antal;
    if (ud.length < antal){
      const brugt = new Set(ud.map(l => `${l.brand} ${l.model}`));
      vaelgEfter(l => `${l.brand} ${l.model}`, ud, brugt, antal, true);
    }
    return ud;
  };

  /* Underrubrikken skrives fra data, så rubrikken ikke kan komme ud af trit
     med kortene igen. Tre ting står der, og alle tre kan efterprøves på
     siden:

       1. Hvor mange annoncer udvalget er taget fra, og hvad grænsen er.
       2. At rækkefølgen er tilfældig. "Udvalgte annoncer" lød som en
          redaktionel anbefaling; der er ingen redaktion, der er en
          blanding — og siden runde 4 en, der rent faktisk trækker et nyt
          frø ved hvert besøg (se noten ved `rnd` ovenfor). Overskriften er
          samtidig ændret i index.html.
       3. Hvor de kommer fra. MÅLT: alle kandidater er fra samme forhandler
          i Rødding — ikke fordi vi vælger sådan, men fordi det er den
          eneste kilde i lageret, der leverer billeder med. Kritikeren
          talte det som en fejl i udvalget. Det er en oplysning om lageret,
          og så skal den stå der, ikke skjules bag en tilfældig omrøring.
     (Blokken stod tidligere dubleret to gange i træk — samme tekst ordret.
     Fjernet, fordi to identiske kommentarer er lige så forvirrende som en
     forkert.) */
  const featuredSub = document.getElementById('featured-sub');
  const ANTALSORD = { 1: 'Én', 2: 'To', 3: 'Tre', 4: 'Fire', 5: 'Fem', 6: 'Seks' };
  const skrivFeaturedSub = (antal) => {
    if (!featuredSub || !antal) return;
    const byer = [...new Set(kandidater.map(l => l.city).filter(Boolean))];
    const kilder = [...new Set(kandidater.map(l => l.source?.navn).filter(Boolean))];
    const enKilde = (kilder.length === 1 && byer.length === 1 && kandidater.every(l => l.isExternal))
      ? ` Alle er indekseret hos ${kilder[0]} i ${byer[0]}, den eneste kilde i lageret, der sender billeder med.`
      : '';
    /* Runde 5 (D5-F1b): tre ting, der kan efterproeves paa kortene og paa
       soegesiden: hvor mange der er at tage af, at raekkefoelgen er
       soegningens, og reglen om ét kort pr. maerke (eller pr. model, naar
       der ikke er maerker nok). */
    featuredSub.textContent =
      `${ANTALSORD[antal] || daTal(antal)} af de ${daTal(kandidater.length)} annoncer med foto og modelnavn — `
      + `samme rækkefølge som i søgningen, ${enPrMaerkeHoldt ? 'højst én pr. mærke' : 'højst én pr. model'} og højst halvdelen fra samme kilde.`
      + enKilde;
  };

  // En overskrift uden indhold under ser i stykker ud — skjul hele sektionen.
  // Beslutningen tages NU (den er gratis), så sektionen ikke først står som et
  // tomt bånd og forsvinder, når man scroller ned til den.
  const featuredMount = document.getElementById('featured-listings');
  const featuredSection = featuredMount.closest('section');
  if (featuredSection) featuredSection.hidden = kandidater.length === 0;

  /* ANTALLET AF KORT FØLGER ANTALLET AF SPALTER — ellers står der en enlig
     efternøler.

     Rækken var fast på fire. `.listings-grid` er et auto-fill-gitter, og de
     eksterne kort er bredere end vores egne, så det målte antal spalter er
     3 ved 1440 og 1100 px, 2 ved 768 og 1 ved 390. Fire kort i tre spalter
     er tre kort og så ét alene på næste række med to tomme felter ved siden
     af — på den mest almindelige desktopbredde, i en sektion hvor VI har
     valgt indholdet. Det er ikke et lager, der slap op; det er et tal, ingen
     havde holdt op mod gitteret.

     Reglen fylder hele rækker: største multiplum af spalteantallet, der
     ikke overstiger fire, dog mindst én række. 3 spalter → 3 kort,
     2 → 4, 1 → 4. Samme fremgangsmåde som renderNewest() lige ovenfor, der
     også måler gridTemplateColumns frem for at gætte på brudpunkter, og
     samme rAF-dæmpede resize-lytter — et brudpunkt kan krydses ved en
     rotation, og så skal både kortene og underrubrikkens antalsord følge med.

     SPALTERNE KAN FØRST MÅLES, NÅR KORTENE ER DER. Reglen, der gør gitteret
     tre spalter bredt mellem 1240 og 1559 px, er
     `.listings-grid:has(> .card-external)` (css/styles.css) — den gælder
     altså først, når der ligger et eksternt kort i gitteret. Måler man det
     tomme gitter, svarer det 4, og så tegnede vi fire kort i et gitter, der
     blev tre spalter i samme øjeblik kortene landede: tre kort og én
     efternøler. Derfor tegnes rækken fuld (fire) og trimmes bagefter.
     Det er gratis, fordi vaelgFeatured(n) altid er de n første af den samme
     rækkefølge — de tre, der bliver stående, er de samme tre, en direkte
     udregning ville have valgt. */
  let featured = [];
  const tegnFeatured = async () => {
    featured = vaelgFeatured(8);
    if (!featured.length){ featuredMount.replaceChildren(); skrivFeaturedSub(0); return; }
    /* D2 (23.08.2026): kolonnetallet laeses FOER kortene saettes ind. Foer stod
       laesningen lige efter indsaetningen — en skrivning fulgt af en laesning
       af layout i samme opgave tvinger browseren til at layoute midt i det
       hele (Lighthouse: "forced reflow" paa forsiden). Gitteret har faste
       kolonner pr. brudpunkt (repeat(N,…) i css), saa tallet er det samme
       tomt som fyldt.
       Paa én kolonne (telefon) vises 2 i stedet for 4: fire fuldbredde-kort
       var 2.429 px af en 10.812 px hoej forside (maalt 390x844) — den
       laengste sektion paa siden, og resten af lageret er ét tryk vaek. */
    /* Runde 5 (D5-F1b): 4 paa én og to spalter (mobil/tablet), 6 paa tre,
       8 paa fire — altid hele raekker. Bilbasen viser ≈30 kort; 4 paa mobil er
       ≈1 670 px, og resten af lageret er ét tryk vaek ("Se alle annoncer"). */
    const cols = getComputedStyle(featuredMount).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    /* Runde 6 (D6-F4): paa mobil er gitteret to spalter med kompakte kort (css
       #featured-listings paa ≤620) — 8 kort paa ≈1 000 px, hvor 4 fuldbredde-
       kort var 1 880. Bilbasen: 14 kort i to spalter. */
    const kompakt = cols === 2 && window.matchMedia('(max-width:620px)').matches;
    const maks = cols >= 4 ? 8 : cols === 3 ? 6 : kompakt ? 8 : 4;
    featured = featured.slice(0, Math.min(featured.length, maks));
    await saetIndIPortioner(featuredMount, featured.map(kortHTML));
    /* Runde 6 (D6-F1): foerste raekke ligger nu 170–235 px under folden, og
       fuldsideoptagelser viste graa, utegnede fotofelter dér tre runder i
       traek. Foerste raekke hentes derfor med det samme (lazy → eager udloeser
       hentningen); prioriteten er stadig lav, hero-fotoet er LCP. */
    featuredMount.querySelectorAll('.card').forEach((c, i) => {
      if (i < cols){ const img = c.querySelector('img.card-photo'); if (img){ img.loading = 'eager'; } }
    });
    skrivFeaturedSub(featured.length);
    wireFavoriteButtons(featuredMount);
  };
  if (kandidater.length) await tegnFeatured();
  let _featuredRAF;
  window.addEventListener('resize', () => {
    if (!featuredMount.querySelector('.card')) return;
    cancelAnimationFrame(_featuredRAF);
    _featuredRAF = requestAnimationFrame(tegnFeatured);
  });

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
