/* ===========================================================================
   filtrering.js — ÉT sted, hvor et filter afgør, hvad der er et træf.

   HVORFOR FILEN FINDES

   Forsidens søgekort og soegning.html stiller det samme spørgsmål til det
   samme lager: "hvor mange annoncer matcher de her filtre, og hvor mange
   blev valgt fra, fordi oplysningen mangler?" Indtil nu svarede de med hver
   sin kode. `heroListe()` i js/home.js var en håndskrevet efterligning af
   `anvendFiltre()` i js/search.js — samme rækkefølge, samme prædikater,
   skrevet af to gange.

   To kopier, der er enige i dag, er ikke det samme som to sider, der ikke
   KAN være uenige. Beviset ligger i historikken: forsiden talte i runde 1
   kun kørekortet med i regnskabet over fravalgte og skrev 53, hvor
   søgesiden skrev 75 for det samme klik. Runde 2 rettede tallet ved at
   skrive søgesidens regnskab af én gang til. Det holdt — men det gjorde
   ikke fejlen umulig, og næste filter, nogen tilføjer ét af stederne, åbner
   den igen. Kritikerens dom i runde 2 var netop den: "lad knappen og
   statuslinjen kalde præcis samme filterberegning som soegning.html, så de
   to sider aldrig kan sige to forskellige tal."

   Så nu er der én beregning. Kæden nedenfor er FLYTTET fra js/search.js,
   ikke skrevet om: rækkefølge, prædikater og feltnavne er ordret dens, så
   flytningen ikke kan ændre et eneste tal på søgesiden.

   VANILLA MED VILJE: ingen bundler, intet framework, ingen ESM (låst i
   work/DECISIONS.md). Filen er et klassisk <script>, der udstiller ét
   globalt objekt, `Filtrering`. Alt ligger inde i en IIFE, så filen kan
   loades på en side, der ALLEREDE har js/search.js' egne `UOPLYST`,
   `anvendFiltre` osv. i topniveau-scope, uden en redeklarationsfejl.

   AFHÆNGER AF js/data.js: `passerKoerekort()` og `hkEllerNull()`. Den skal
   derfor loades EFTER js/data.js.

   TIL DEN, DER EJER js/search.js: se blokken "Ét filterhus" i
   work/DECISIONS.md. Vejen ind er at slette `UOPLYST`,
   `filtrerMedUoplyst()`, `koerekortSvar()` og `anvendFiltre()` derfra og
   lade dem pege herind — signaturen er den samme, bortset fra at `state`
   nu er et argument i stedet for en modulvariabel.
   =========================================================================== */

const Filtrering = (() => {

  /* Det tredje svar. Et prædikat kan sige ja, nej — og "det ved vi ikke".

     Begrundelse (flyttet ordret fra js/search.js). Et filter er et løfte.
     Sætter man "Brugt", er løftet "alt herunder er brugt". En annonce uden
     stand kan ikke holde det løfte, så den hører ikke med i resultatet — at
     tage den med ville gøre løftet værdiløst for alle de andre træf, og på
     kørekortfilteret ville det være direkte farligt. Men at fjerne den UDEN
     at sige det er den fejl, vi kom fra: brugeren kan ikke se forskel på
     "der findes ikke flere" og "der er flere, vi bare ikke ved nok om".
     Derfor det tredje svar: udeluk, og sig det højt.

     Og vi gætter ikke. Stand kunne sættes til "Brugt", for det er et
     brugtmarked. Det er en påstand, vi selv har fundet på, som ville stå på
     kortet som en oplysning fra sælgeren. Et tal, der mangler, er bedre end
     et tal, der lyver. */
  const UOPLYST = Symbol('uoplyst');

  /* Nulpunktet. Et filtersæt behøver kun nævne de felter, det bruger —
     resten falder tilbage hertil, så forsidens fire felter kan køre gennem
     nøjagtig den samme kæde som søgesidens fyrre uden at kende dem alle.

     Felterne er ordret EMPTY_STATE i js/search.js. `sort` og `page` er IKKE
     med: de hører til visningen, ikke til hvad der er et træf. */
  const TOMT_FILTER = {
    q: '', types: [], brands: [], models: [], priceMin: null, priceMax: null,
    yearMin: null, yearMax: null, kmMax: null, ccmMin: null, ccmMax: null,
    hkMin: null, hkMax: null,
    regions: [], conditions: [], equipment: [], fuels: [], drives: [],
    service: [],
    cylinders: [], colors: [], maxAgeDays: null, photosOnly: false,
    ejereMax: null, nysynet: false, vinterklar: false,
    dealerOnly: false, koerekort: '',
    kilde: '',   // Runde 6 (D6-A2): kildens domæne, fx "mcsyd.dk" — fra annoncesidens "Alle annoncer fra MC Syd · 332"
  };

  /* opsamler: hvor de skjulte bogføres, eller null. Facettællingen på
     søgesiden kører den samme filterkæde seks gange for at finde ud af, hvor
     mange træf hvert enkelt valg ville give — de kørsler må ikke lægge deres
     tal oven i brugerens. Uden parameteren stod der pludselig "2.298
     annoncer er ikke vist" under et filter, der havde skjult 383. */
  function filtrerMedUoplyst(list, felt, praedikat, opsamler){
    const beholdt = [];
    let skjult = 0;
    for (const l of list){
      const svar = praedikat(l);
      if (svar === UOPLYST) skjult++;
      else if (svar) beholdt.push(l);
    }
    if (skjult && opsamler) opsamler.push({ felt, antal: skjult });
    return beholdt;
  }

  /* Kørekort med tre svar — UDEN at gentage reglerne.

     passerKoerekort() i js/data.js er og bliver det ene sted, der afgør,
     hvad A1 og A2 betyder. Her spørger vi den bare to gange.

     Den kan kun svare ja eller nej, og et nej dækker over to forskellige
     ting: "motorcyklen er for kraftig" og "vi mangler den oplysning, der
     skulle afgøre det". Siden har brug for at skelne — ikke for at kende
     grænserne. Så vi spørger igen med de manglende felter sat til den
     gunstigst mulige værdi. Skifter svaret fra nej til ja, afhang nejet af
     noget, vi ikke ved, og det rigtige svar er UOPLYST.

     1 OG IKKE 0 — begge steder, og det er ikke pedanteri. hkEllerNull() i
     js/data.js læser 0 som UKENDT (`v > 0 ? v : null`). Den regel lukkede et
     falsk A2-stempel på 1200-kubiks maskiner uden oplyst effekt, og den er
     rigtig — men den gjorde `proeve.power = 0` selvmodsigende: prøven skulle
     netop sætte en KENDT, gunstigst mulig værdi ind. Konsekvensen ramte
     præcis dét, funktionen blev skrevet for at forhindre: ét klik på A2
     skjulte 332 annoncer og rapporterede 0 skjulte. Forenkler nogen dem til
     0, fordi "det er jo det laveste", er fejlen tilbage — og den er tavs.
     Vagtposten er js/koerekort.test.js.

     Forudsætning: for A1 og A2 er både ccm og hk ØVRE grænser, så lavest
     muligt er altid det gunstigste. Kommer der en kategori med en NEDRE
     grænse, holder den antagelse ikke, og prøven skal skrives om. */
  function koerekortSvar(l, kat){
    if (passerKoerekort(l, kat)) return true;
    const proeve = { ...l };
    let manglerNoget = false;
    if (hkEllerNull(l.power) == null){ proeve.power = 1; manglerNoget = true; }
    if (!(Number(l.ccm) > 0)){ proeve.ccm = 1; manglerNoget = true; }
    if (manglerNoget && passerKoerekort(proeve, kat)) return UOPLYST;
    return false;
  }

  /* Filterkæden. Ét sted, to sider.

       alle       lageret, typisk Store.getAllListings()
       filtre     et delvist filtersæt; resten falder tilbage til TOMT_FILTER
       spring     navnet på ét filter, der skal springes over (facettælling)
       opsamler   array, hvor de uoplyste bogføres (null = tæl ikke med)

     `spring` er det, der gør søgesidens facettælling mulig og rigtig. Tallet
     ved siden af "Yamaha" skal svare på: hvor mange træf får jeg, hvis jeg
     vælger Yamaha HER, med alt det andet, jeg allerede har sat, i behold. Så
     skal mærkefilteret selv være slået fra i den udregning — ellers tæller
     man kun inden for det mærke, der allerede er valgt, og alle andre mærker
     viser nul.

     RÆKKEFØLGEN ER EN DEL AF SVARET, ikke en tilfældighed. En annonce
     fjernes ved det FØRSTE filter, der ikke kan svare for den, og tælles
     derfor kun én gang. Det er dét, der gør, at tallene i `opsamler` må
     lægges sammen uden dobbelttælling. Byt om på to led, og totalen står
     stadig, men fordelingen på feltnavne skifter — og feltnavnene er
     præcis dét, begge sider skriver ud i deres forklaringslinje. */
  function anvendFiltre(alle, filtre, spring, opsamler){
    const state = { ...TOMT_FILTER, ...(filtre || {}) };
    let list = alle;
    const brug = (navn) => navn !== spring;

    const q = state.q.trim().toLowerCase();
    if (brug('q') && q) list = list.filter(l => `${l.brand} ${l.model}`.toLowerCase().includes(q));

    // Mærke, model og titel kender vi altid — de kommer med annoncen fra kilden.
    if (brug('brands') && state.brands.length) list = list.filter(l => state.brands.includes(l.brand));
    if (brug('models') && state.models.length) list = list.filter(l => state.models.includes(l.model));

    // Kategorifiltre: værdien er enten oplyst, eller også er den det ikke.
    if (brug('types') && state.types.length)
      list = filtrerMedUoplyst(list, 'motorcykeltype', l => l.type == null ? UOPLYST : state.types.includes(l.type), opsamler);
    if (brug('regions') && state.regions.length)
      list = filtrerMedUoplyst(list, 'landsdel', l => l.region == null ? UOPLYST : state.regions.includes(l.region), opsamler);
    if (brug('conditions') && state.conditions.length)
      list = filtrerMedUoplyst(list, 'stand', l => l.condition == null ? UOPLYST : state.conditions.includes(l.condition), opsamler);
    if (state.service.length)
      list = filtrerMedUoplyst(list, 'servicehistorik', l => l.serviceHistorik == null ? UOPLYST : state.service.includes(l.serviceHistorik), opsamler);

    /* Talfiltre. Bemærk at BEGGE ender skal spørge om værdien overhovedet er
       kendt. Før gjorde kun den nedre ende det — ved et tilfælde, fordi
       `null >= 5000` er falsk, mens `null <= 5000` er sandt. Den asymmetri
       var hele grunden til, at "maks."-filtrene løj, mens "min."-filtrene
       bare skjulte. Det var også præcis dén fælde, forsidens egen kopi faldt
       i, dengang den havde en. */
    if (brug('price') && state.priceMin != null)
      list = filtrerMedUoplyst(list, 'pris', l => l.price == null ? UOPLYST : l.price >= state.priceMin, opsamler);
    if (brug('price') && state.priceMax != null)
      list = filtrerMedUoplyst(list, 'pris', l => l.price == null ? UOPLYST : l.price <= state.priceMax, opsamler);
    if (state.yearMin != null)
      list = filtrerMedUoplyst(list, 'årgang', l => l.year == null ? UOPLYST : l.year >= state.yearMin, opsamler);
    if (state.yearMax != null)
      list = filtrerMedUoplyst(list, 'årgang', l => l.year == null ? UOPLYST : l.year <= state.yearMax, opsamler);
    if (state.kmMax != null)
      list = filtrerMedUoplyst(list, 'kilometertal', l => l.km == null ? UOPLYST : l.km <= state.kmMax, opsamler);
    if (state.ccmMin != null)
      list = filtrerMedUoplyst(list, 'ccm', l => l.ccm == null ? UOPLYST : l.ccm >= state.ccmMin, opsamler);
    if (state.ccmMax != null)
      list = filtrerMedUoplyst(list, 'ccm', l => l.ccm == null ? UOPLYST : l.ccm <= state.ccmMax, opsamler);
    if (state.hkMin != null)
      list = filtrerMedUoplyst(list, 'hestekræfter', l => l.power == null ? UOPLYST : l.power >= state.hkMin, opsamler);
    if (state.hkMax != null)
      list = filtrerMedUoplyst(list, 'hestekræfter', l => l.power == null ? UOPLYST : l.power <= state.hkMax, opsamler);

    /* Udstyr er et OG-filter: vælger man ABS og varmehåndtag, vil man have
       begge dele. Brændstof, træktype, farve og cylindre er ELLER inden for
       hver gruppe — dér leder man efter én af flere acceptable værdier.

       equipment: null betyder "ikke oplyst"; equipment: [] betyder "vi har
       spurgt sælgeren, og der er intet ekstraudstyr". De to skal ikke
       behandles ens — den tomme liste er et rigtigt nej. */
    if (state.equipment.length){
      list = filtrerMedUoplyst(list, 'udstyr', l =>
        l.equipment == null ? UOPLYST : state.equipment.every(e => l.equipment.includes(e)), opsamler);
    }
    if (state.fuels.length)
      list = filtrerMedUoplyst(list, 'brændstof', l => l.fuel == null ? UOPLYST : state.fuels.includes(l.fuel), opsamler);
    if (state.drives.length)
      list = filtrerMedUoplyst(list, 'træktype', l => l.drive == null ? UOPLYST : state.drives.includes(l.drive), opsamler);
    if (state.colors.length)
      list = filtrerMedUoplyst(list, 'farve', l => l.color == null ? UOPLYST : state.colors.includes(l.color), opsamler);
    if (state.cylinders.length)
      list = filtrerMedUoplyst(list, 'cylinderantal', l => l.cylinders == null ? UOPLYST : state.cylinders.includes(Number(l.cylinders)), opsamler);

    /* "Oprettet inden for" spørger til annoncens alder. De indekserede har
       med vilje ingen createdAt (se normalizeExternalListing i
       js/backend-bridge.js: crawledatoen er ikke annoncedatoen). Det er også
       et uoplyst felt. */
    if (state.maxAgeDays != null){
      const cutoff = Date.now() - state.maxAgeDays * 86400000;
      list = filtrerMedUoplyst(list, 'oprettelsesdato', l => {
        if (!l.createdAt) return UOPLYST;
        const t = new Date(l.createdAt).getTime();
        return Number.isNaN(t) ? UOPLYST : t >= cutoff;
      }, opsamler);
    }

    /* Billeder og sælgertype er IKKE uoplyste. Vi kan selv se, om der fulgte
       et billede med, og kilden oplyser sælgertypen. Her er et nej et
       rigtigt nej. */
    if (state.photosOnly) list = list.filter(l => (l.photoUrls || []).length > 0);
    if (state.dealerOnly) list = list.filter(l => l.isDealer);
    /* Kilden er ikke uoplyst: enhver indekseret annonce bærer sit domæne, og
       egne annoncer har ingen — de falder fra med et rigtigt nej. */
    if (brug('kilde') && state.kilde) list = list.filter(l => (l.source && l.source.domaene) === state.kilde);

    if (state.ejereMax != null)
      list = filtrerMedUoplyst(list, 'antal ejere', l => l.antalEjere == null ? UOPLYST : l.antalEjere <= state.ejereMax, opsamler);
    if (state.nysynet){
      const y = new Date().getFullYear();
      list = filtrerMedUoplyst(list, 'seneste syn', l => l.sidsteSyn == null ? UOPLYST : l.sidsteSyn >= y - 1, opsamler);
    }
    if (state.vinterklar)
      list = filtrerMedUoplyst(list, 'vinterklargøring', l => l.vinterklar == null ? UOPLYST : !!l.vinterklar, opsamler);
    if (brug('koerekort') && state.koerekort)
      list = filtrerMedUoplyst(list, 'kørekortkategori', l => koerekortSvar(l, state.koerekort), opsamler);

    return list;
  }

  /* Regnskabet over de fravalgte, gjort op ét sted.

     Begge sider skriver den samme sætning med hver sin slutning ("Fjern
     filteret for at se dem" på søgesiden, "De vises heller ikke i søgningen"
     på forsiden). Selve opgørelsen — hvor mange, og hvilke feltnavne i
     hvilken opremsning — er den samme, og den hører derfor til her. Samme
     felt kan skjule i to omgange (fx både pris-min og pris-maks); det nævnes
     kun én gang. */
  function uoplystOpgoerelse(skjult){
    const antal = (skjult || []).reduce((sum, x) => sum + x.antal, 0);
    const felter = [...new Set((skjult || []).map(x => x.felt))];
    const feltTekst = felter.length === 0 ? ''
      : felter.length === 1 ? felter[0]
      : felter.slice(0, -1).join(', ') + ' og ' + felter[felter.length - 1];
    return { antal, felter, feltTekst };
  }

  return { UOPLYST, TOMT_FILTER, filtrerMedUoplyst, koerekortSvar, anvendFiltre, uoplystOpgoerelse };
})();

/* Node-siden af huset (tests). I browseren findes `module` ikke, og linjen
   springes over. Samme mønster som js/data.js. */
if (typeof module !== 'undefined' && module.exports) module.exports = Filtrering;
