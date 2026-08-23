/* ===========================================================================
   sortering.js — ÉT sted, hvor rækkefølgen af annoncer afgøres.

   HVORFOR FILEN FINDES (B4, 23.08.2026)

   scripts/build-srp.js forudtegner søgesidens første side i soegning.html,
   så det første kort — og sidens LCP-foto — står i markuppen, før ét eneste
   script er kørt. Det virker kun, hvis byggetrinnet ordner annoncerne
   NØJAGTIGT som js/search.js gør det bagefter; ellers omrokerer gitteret i
   det øjeblik javascriptet overtager, og det er den CLS, forudtegningen
   skulle fjerne. Sorteringen lå som topniveau-funktioner i js/search.js,
   som kører DOM-kode ved indlæsning og derfor ikke kan evalueres i Node.

   Kæden nedenfor er FLYTTET fra js/search.js, ikke skrevet om: reglerne,
   vægtene og sammenligningerne er ordret dens, så flytningen ikke kan ændre
   rækkefølgen af ét eneste kort. Samme mønster som js/filtrering.js.

   VANILLA MED VILJE: klassisk <script>, ét globalt objekt `Sortering`, IIFE,
   og module.exports til Node (scripts/shared.js browserModules()).

   AFHÆNGER AF js/components.js: `koerekortMaerkat()` (bruges i OPLYSTHED).
   Skal derfor loades EFTER js/components.js — og før js/search.js.
   =========================================================================== */
const Sortering = (function(){
  /* ============ Standardsorteringen: "Blandet udbud" ============

     NAVNET ER LAVET OM I RUNDE 2, OG DET ER RETTELSEN.

     Sorteringen hed "Mest relevante". Den regnede allerede på noget rigtigt —
     men navnet lovede en relevansmodel, og det er ikke det, der sker. En
     kritiker målte den som "i praksis nyeste først", og selv om dét ikke er
     præcist (se måltallene nedenfor), var konklusionen rigtig: man kan ikke
     se relevansen arbejde, og et navn, man ikke kan efterprøve, er et løfte,
     vi ikke holder. Så navnet siger nu, hvad rækkefølgen faktisk er: en
     blanding. Hvordan den blandes, står på siden under værktøjslinjen
     (renderSorteringsNote), med tal fra det aktuelle resultat.

     MÅLT PÅ LAGERET 16. AUG. 2026, før rettelsen:

       Oplysthed, alle 383:  11 point: 51 (vores egne) · 8: 1 · 6: 153 ·
                             5: 11 · 4: 159 · 2: 7 · 1: 1
       Side 1, de 24 kort:   3 egne, 21 indekserede · 21 med foto, 3 uden
       Første egne annonce:  plads 7 af 24

     Oplystheden GØR altså noget: de 153 annoncer med 6 point står foran de
     159 med 4, og forskellen er synlig som "Km ikke oplyst" på kortet. Men
     den er usynlig på side 1, hvor alt er 6-pointere, og de tre eneste kort
     med en dato var vores egne — dét var de "3 uger → 4 uger → 1 måned",
     kritikeren læste som en datosortering.

     RÆKKEFØLGEN, I TO REGLER — begge kan efterprøves på skærmen:

     1. OPLYSTHED afgør rækkefølgen inden for hver gruppe. En annonce, der
        svarer på flere af købers spørgsmål, er en bedre annonce end en, der
        svarer på færre. Point gives kun for felter, kilden faktisk har
        oplyst — aldrig for et gæt (kørekort tæller kun, når det kan udledes
        af ccm og hk).

     2. ANNONCER UDEN FOTO FORDELES JÆVNT ud over resultatet i stedet for at
        ligge i én klump. Deres andel af hver side er den samme som deres
        andel af lageret: 57 ud af 383 giver 3-4 pr. side à 24.

     Regel 2 slår regel 1 på plads-niveau, og DET er grunden til, at
     sorteringen ikke må hedde "Mest oplyste først": vores egne 51 annoncer
     har fuldt hus (11 af 11 point) og står alligevel på plads 4, 11, 17 og 24
     — ikke på plads 1-24. Et navn skal kunne holde til at blive målt.

     Hvorfor så ikke bare lade oplystheden bestemme alene? Fordi side 1 så
     bliver 24 kort uden ét eneste billede — 24 gange det samme grå felt. Og
     hvorfor ikke skubbe dem uden foto helt bagest? Fordi side 1 så bliver 24
     kort, der ALLE siger "Hos MC Syd" og alle fører væk fra siden. Begge
     yderpunkter er en side, der ikke ligner det lager, den påstår at vise.

     Og den nyeste annonce er stadig ét klik væk: "Nyeste først" står uændret
     i vælgeren. Inden for gruppen uden foto sorteres der desuden efter dato,
     så de pladser, gruppen får på side 1, går til de nyeste annoncer. */

  const harFoto = l => !!(l.photoUrls && l.photoUrls[0]);

  /* Købers spørgsmål, og hvad det koster ham ikke at få svar.

     Vægtene er ikke stemninger: 2 point er et felt, man ikke kan handle uden
     (må jeg køre den, hvad koster den, hvor meget har den kørt), 1 point er et
     felt, der kvalificerer handlen. Fotoet står IKKE på listen — det afgør
     hvilken af de to grupper annoncen havner i, og ville tælle dobbelt her. */
  const OPLYSTHED = [
    [l => l.price != null, 2],
    [l => l.km != null, 2],
    // Samme ene udregning som maerkatet paa kortet: kan koerekortMaerkat()
    // ikke navngive en kategori, har annoncen ikke svaret paa spoergsmaalet,
    // og saa maa den heller ikke faa point for det.
    [l => koerekortMaerkat(l).kode != null, 2],
    [l => l.year != null, 1],
    [l => l.ccm != null, 1],
    [l => l.power != null, 1],
    [l => l.condition != null, 1],
    [l => String(l.description || '').trim().length > 80, 1],
  ];

  function annonceOplysthed(l){
    let n = 0;
    for (const [svarer, vaegt] of OPLYSTHED) if (svarer(l)) n += vaegt;
    return n;
  }

  function blandetRaekkefoelge(list){
    const tid = l => (l.createdAt ? new Date(l.createdAt).getTime() : null);
    /* Tredje niveau er id og ikke "uændret rækkefølge": annoncerne kommer fra
       to kilder, der flettes i js/backend-bridge.js, og et genbesøg må ikke
       give en anden rækkefølge, end det link man delte. */
    const bedstFoerst = (a, b) => {
      const d = annonceOplysthed(b) - annonceOplysthed(a);
      if (d) return d;
      const ta = tid(a), tb = tid(b);
      if (ta != null && tb != null && ta !== tb) return tb - ta;
      if (ta == null && tb != null) return 1;
      if (tb == null && ta != null) return -1;
      return String(a.id).localeCompare(String(b.id));
    };

    /* KILDE-RUNDGANG (D6-S4, 23.08.2026, godkendt af mennesket).

       Maalt foer: side 1 var 24 af 24 kort fra MC Syd — alle 6-pointere, alle
       med foto, og inden for klassen afgjorde id'et raekkefoelgen. En blind
       dommer laeste side 1 som ét forhandlerkatalog, mens overskriften sagde
       "548 annoncer fra 4 kilder". Begge dele var sande; det var
       raekkefoelgen, der skjulte den ene.

       Reglen: inden for HVER oplysthedsklasse (samme pointtal) skiftes der
       mellem kilderne — én fra hver kilde efter tur, saa laenge kilden har
       annoncer tilbage i klassen. Oplystheden er stadig det, der rangerer:
       ingen 4-pointer kommer foran en 6-pointer, fordi den er fra en anden
       kilde. Inden for kildens egen kø er raekkefoelgen uaendret (dato, id).
       Kildernes tur-orden er deres foerste optraeden i den sorterede klasse —
       altsaa ogsaa deterministisk (js/sortering.test.js laaser det).
       Fordelingen af de billedloese (midtpunktsudtagningen nedenfor) roeres
       ikke: den virker paa gruppernes laengder, ikke deres indhold. */
    const kildeNoegle = l => l.isExternal ? String((l.source && (l.source.domaene || l.source.navn)) || 'ekstern') : 'bikerbasen';
    const kildeRundgang = (sorteret) => {
      const ud = [];
      let i = 0;
      while (i < sorteret.length){
        const p = annonceOplysthed(sorteret[i]);
        let j = i;
        while (j < sorteret.length && annonceOplysthed(sorteret[j]) === p) j++;
        const klasse = sorteret.slice(i, j);
        const koeer = new Map();
        for (const l of klasse){ const k = kildeNoegle(l); if (!koeer.has(k)) koeer.set(k, []); koeer.get(k).push(l); }
        const kilder = [...koeer.keys()];
        let tilbage = klasse.length;
        while (tilbage > 0){
          for (const k of kilder){ const q = koeer.get(k); if (q.length){ ud.push(q.shift()); tilbage--; } }
        }
        i = j;
      }
      return ud;
    };

    const medFoto = kildeRundgang(list.filter(harFoto).sort(bedstFoerst));
    const udenFoto = kildeRundgang(list.filter(l => !harFoto(l)).sort(bedstFoerst));
    if (!medFoto.length || !udenFoto.length) return medFoto.concat(udenFoto);

    /* Fordelingen: hver annonce uden foto lander MIDT i sin egen luns.

       Runde 1 talte op undervejs (`Math.floor((k+1) * andel) > j`), og den
       tælling lægger det første element ved SLUTNINGEN af den første luns.
       Med 57 uden foto ud af 383 er lunsen 6,7 kort lang, så den første kom
       på plads 7 — præcis én plads under de seks kort, der er over folden i
       tre spalter. Kritikeren målte konsekvensen: "hele første skærm er
       tredjeparts MC Syd-annoncer, vores egne 51 er usynlige indtil man
       filtrerer".

       Med midtpunktet — `floor((j + 0,5) * n / m)` — lander de på plads
       4, 11, 17 og 24 i stedet for 7, 14 og 21. Andelen er den SAMME (den er
       lagerets egen, 57/383), afstanden er den samme; det er kun fasen, der
       er rykket en halv luns, så første række også har en af dem. Det er
       samme greb som midtpunktsudtagning i en rasterlinje.

       Indekserne kan ikke støde sammen: n/m er altid ≥ 1, så udtrykket er
       strengt voksende i j, og største værdi er floor(n − 0,5·n/m) ≤ n−1. */
    const n = list.length, m = udenFoto.length;
    const ud = new Array(n);
    for (let j = 0; j < m; j++) ud[Math.floor((j + 0.5) * n / m)] = udenFoto[j];
    let i = 0;
    for (let k = 0; k < n; k++) if (ud[k] === undefined) ud[k] = medFoto[i++];
    return ud;
  }

  /* Sorterer en (allerede filtreret) liste efter `sort` — en af
     SORTERINGER i js/search.js: 'blandet', 'date-desc', 'price-asc',
     'price-desc', 'year-desc', 'km-asc'. Ukendt sort falder tilbage til
     'date-desc', som før. Listen sorteres på stedet OG returneres. */
  function sorter(list, sort){

    /* Ukendt værdi sorteres ALTID bagest — også når retningen er stigende.

       Uden det her blev null til 0 i minusregningen, og så lå de 22
       indekserede annoncer uden pris øverst under "Pris: Lav til høj". En
       annonce uden pris er ikke den billigste; den er uoplyst. Samme fejl
       ramte "Kilometertal: Lavest først", hvor 163 annoncer uden kilometertal
       lagde sig foran en cykel med 500 km på uret.

       Det er samme regel som NULLS LAST i SQL, og den gælder begge retninger:
       det ukendte skal aldrig vinde en sortering, det ikke deltager i. */
    const medUkendtSidst = (vaelg, retning) => (a, b) => {
      const x = vaelg(a), y = vaelg(b);
      const xTom = x == null || Number.isNaN(x);
      const yTom = y == null || Number.isNaN(y);
      if (xTom && yTom) return 0;
      if (xTom) return 1;
      if (yTom) return -1;
      return retning === 'asc' ? x - y : y - x;
    };
    const tid = l => (l.createdAt ? new Date(l.createdAt).getTime() : null);

    const sorters = {
      'date-desc':  medUkendtSidst(tid,        'desc'),
      'price-asc':  medUkendtSidst(l => l.price, 'asc'),
      'price-desc': medUkendtSidst(l => l.price, 'desc'),
      'year-desc':  medUkendtSidst(l => l.year,  'desc'),
      'km-asc':     medUkendtSidst(l => l.km,    'asc'),
    };
    /* "Blandet udbud" er ikke en parvis sammenligning — fordelingen af annoncer
       uden foto er en handling på HELE listen — så den kan ikke ligge i
       `sorters`. */
    if (sort === 'blandet') return blandetRaekkefoelge(list);

    /* "Nyeste først" var en fælde, og det er målt: valget lagde de 51 annoncer
       MED dato øverst og de 332 uden bagefter — og de 51 er præcis dem, der
       ikke har fået uploadet et foto. Side 1 blev derfor 24 grå felter, mens
       overskriften sagde "383 annoncer fundet". Det næst-mest oplagte
       sorteringsvalg på en markedsplads gav en side, der lignede en fejl.

       Datoen er stadig et løfte, og de daterede står stadig først i
       datorækkefølge — det er dét, valget hedder. Rettelsen er, hvad der sker
       med RESTEN: de blev før liggende i lagerets vilkårlige rækkefølge, og nu
       ordnes de af blandetRaekkefoelge(), altså bedst oplyste først med de
       billedløse fordelt jævnt. Det gør side 3 og frem til en brugbar liste i
       stedet for et restlager, og det koster ikke ét gran af datoløftet:
       ingen annonce uden dato kan komme foran en med.

       Den anden halvdel af rettelsen står i renderSorteringsNote(), som
       skriver hvor mange af annoncerne der overhovedet har en dato. */
    if (sort === 'date-desc'){
      const medDato = list.filter(l => l.createdAt).sort(sorters['date-desc']);
      const udenDato = list.filter(l => !l.createdAt);
      return medDato.concat(blandetRaekkefoelge(udenDato));
    }

    list.sort(sorters[sort] || sorters['date-desc']);
    return list;
  }

  return { harFoto, annonceOplysthed, blandetRaekkefoelge, sorter, OPLYSTHED };
  })();
  if (typeof module !== 'undefined' && module.exports) module.exports = Sortering;
