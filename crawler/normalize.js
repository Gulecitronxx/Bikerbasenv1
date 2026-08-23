/* Normalisering af danske annoncedata.

   Det her er stedet, hvor en crawler i praksis går i stykker. Kilderne
   skriver det samme på et dusin måder, og en enkelt forkert parsning giver
   en motorcykel til 125 kr. eller en årgang på 20 i søgeresultatet.

   Alle funktioner returnerer null frem for at gætte. En manglende værdi kan
   vises som "ikke oplyst"; en forkert værdi bliver til en løgn på et kort.
*/

/* ---------- Pris ----------
   Danske kilder skriver: "125.000 kr.", "125.000,-", "kr. 125.000",
   "125000", "Pris: 125.000 DKK", "Ring for pris".

   Punktum er tusindtalsseparator på dansk, komma er decimaltegn — omvendt af
   engelsk. "125.000" er hundredetusinde, ikke hundrede og femogtyve. Den
   fejl er 1000x og fanges ikke af en gennemsnitsberegning. */
function parsePris(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();
  if (/ring|forhandling|efter aftale|byd|tilbud/.test(s)) return null;

  // Fjern alt der ikke er cifre, punktum eller komma. Trim derefter
  // separatorer i enderne: "125.000,50 kr." efterlader et punktum fra "kr.",
  // og så rammer decimal-mønstret nedenfor ikke — hele beløbet blev læst som
  // 12.500.050 og afvist som urealistisk.
  const tal = s.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '');
  if (!tal) return null;

  // Sidste komma med præcis to cifre efter er decimaler; alt andet er støj.
  let n = tal;
  const dec = n.match(/,(\d{2})$/);
  n = dec ? n.slice(0, -3) : n;
  n = n.replace(/[.,]/g, '');
  if (!n) return null;

  const v = Number(n);
  // En brugt motorcykel under 1.000 kr. er en fejlparsning, ikke et fund.
  // Over 2 mio. er det også — dyreste nye i DK ligger langt under.
  if (!Number.isFinite(v) || v < 1000 || v > 2_000_000) return null;
  return v;
}

/* ---------- Kilometer ----------
   "12.500 km", "12500", "12.500 kilometer", "ca. 12.500 km", "12,500 km"
   (nogle skriver engelsk-style). Nul km er gyldigt for en fabriksny. */
function parseKm(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();
  if (/ukendt|ikke oplyst|n\/a/.test(s)) return null;
  const tal = s.replace(/[^\d.,]/g, '').replace(/[.,]/g, '');
  if (!tal) return null;
  const v = Number(tal);
  // Over 500.000 km på en motorcykel er en fejlparsning (fx sammenløbet
  // pris og km), ikke en veteran med mange ture.
  if (!Number.isFinite(v) || v < 0 || v > 500_000) return null;
  return v;
}

/* ---------- Årgang ----------
   "2019", "Årg. 2019", "årgang 2019", "2019-model", "1. reg. 03/2019".
   Ved måned/år tager vi året. */
function parseAargang(raa){
  if (raa == null) return null;
  const s = String(raa);
  // Find et firecifret år i et realistisk interval
  const m = s.match(/\b(18[89]\d|19\d{2}|20[0-4]\d)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  const naeste = new Date().getFullYear() + 1;
  if (v < 1885 || v > naeste) return null;   // 1885 = verdens første MC
  return v;
}

/* ---------- Kubik ----------
   "649 ccm", "649cc", "0,6 l", "649 cm³". */
function parseCcm(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();

  // Liter-angivelse: "0,6 l" eller "1.2 liter"
  const liter = s.match(/(\d+[.,]\d+)\s*l(?:iter)?\b/);
  if (liter){
    const v = Math.round(Number(liter[1].replace(',', '.')) * 1000);
    return v >= 25 && v <= 2500 ? v : null;
  }
  const tal = s.replace(/[^\d]/g, '');
  if (!tal) return null;
  const v = Number(tal);
  // Under 25 ccm findes ikke; over 2500 er en bilmotor eller en fejl.
  if (!Number.isFinite(v) || v < 25 || v > 2500) return null;
  return v;
}

/* ---------- Kubik udledt af modelnavnet ----------
   109 af MC Syds 332 annoncer har ingen ccm i kortet. Konsekvensen er ikke et
   tomt felt: koerekortForListing() i js/data.js svarer null, når både hk og
   ccm mangler, og så forsvinder A1/A2/A-mærkatet fra kortet. Det er det ene
   felt, vi har, som Bilbasen ikke har brug for og en dansk MC-køber ikke kan
   undvære — og på 109 kort stod det tomt, selv om "125" stod i titlen.

   Motorcykler navngives efter slagvolumen. "CBR 1000 F", "XV 750",
   "MSX 125" — tallet ER kubikken, med den afvigelse at navnet er rundt og
   motoren ikke er (en CBR 1000 er 998 ccm). Målt mod de 229 annoncer, hvor
   kilden SELV oplyser ccm: 176 gæt, 175 inden for 10 %, ét forkert.

   DET ER ET GÆT, OG DET SKAL KUNNE SES. Værdien skrives i ccm, så filtre og
   kørekortmærkat virker, men feltet noteres i udledte_felter på rækken.
   Et gæt, der udgiver sig for at være en måling, er værre end et tomt felt —
   så hellere fortælle hvor tallet kommer fra.

   Faldgruberne er ikke teoretiske. Alle disse skal give NULL:
     "ZR-7"        Kawasaki ZR-7 er 738 ccm, ikke 7.
     "CB 72"       Honda CB72 er 247 ccm. To cifre lyver.
     "MT-07"       689 ccm.
     "V7 Stone"    744 ccm.
     "FLSTC Heritage Softail"   Harley navngiver med bogstaver.
   Og alle disse skal ramme:
     "Tre-K 1130", "CMX 1100 D", "K 1200 GT", "ST 1100 Pan", "XJ 900 S",
     "MSX 125 Street", "ST 125 DAX", "XL883 Standard" (tallet klistrer til
     bogstaverne — derfor ikke \b omkring cifrene). */
const MINDSTE_UDLEDTE_CCM = 100;

function udledCcmFraModel(model, { aargang = null } = {}){
  const s = String(model || '');
  const kandidater = [];

  for (const m of s.matchAll(/\d{2,4}/g)){
    /* Årstallet i et modelnavn er ikke kubik. "Softail 2007" på en 2007'er
       er årgangen, skrevet en gang til. Uden det her tjek ville den blive
       til en 2007 ccm motorcykel — inden for parseCcm's lovlige interval og
       dermed usynlig som fejl. */
    if (aargang && Number(m[0]) === Number(aargang)) continue;

    // Selve talkonverteringen ligger ét sted: parseCcm. Den kender intervallet
    // og afviser 7 og 11705 uden at vi skal gentage grænserne her.
    const v = parseCcm(m[0]);
    /* Egen bund på 100 oveni. parseCcm slipper 25 igennem, fordi "25 ccm"
       er en gyldig OPLYST kubik — men et tocifret tal i et MODELNAVN er
       næsten altid noget andet (CB 72, ZR-7, MT-07). Der findes ingen
       motorcykel i kataloget under 110 ccm, så vi taber intet. */
    if (v != null && v >= MINDSTE_UDLEDTE_CCM) kandidater.push(v);
  }

  if (!kandidater.length) return null;
  /* Største tal vinder. "Tre-K 1130" har både 1130 og ingenting andet, men
     "GSX-R 1000 K5" har 1000 og 5 — og 5 er allerede sorteret fra. Målt på
     hele kataloget optræder der aldrig to gyldige kandidater i samme navn,
     så reglen er et sikkerhedsnet, ikke en afgørelse. */
  return Math.max(...kandidater);
}

/* ---------- Hestekræfter ----------
   "53", "53 HK", "101 hk". MC Syd skriver "-" i feltet, når tallet mangler
   (Danbase renderer det med class="showempty"), og "-" må blive til null —
   ikke til nul hestekræfter.

   Hk er ikke pynt på et dansk MC-katalog. Sammen med ccm afgør det, om
   motorcyklen må køres på A1- eller A2-kørekort, og det er det første en
   køber under 24 år filtrerer på. En annonce uden hk kan ikke besvare
   spørgsmålet, og derfor er et forkert tal værre end intet tal. */
function parseHk(raa){
  if (raa == null) return null;
  const s = String(raa).toLowerCase();
  if (/ukendt|ikke oplyst|n\/a/.test(s)) return null;
  const tal = s.replace(/[^\d.,]/g, '').replace(/[.,]/g, '');
  if (!tal) return null;
  const v = Number(tal);
  // 0 hk findes ikke, og over 400 gør det heller ikke: verdens kraftigste
  // serie-motorcykel ligger omkring 310. Et tal over loftet er et
  // sammenløbet felt (fx ccm læst som hk), ikke et fund.
  if (!Number.isFinite(v) || v < 1 || v > 400) return null;
  return v;
}

/* ---------- Motorcykeltype ----------
   Cruiser, Touring, Adventure, Sport … Typen er ikke et frit tekstfelt hos
   kilden, men et opslag fra en fast liste, og listen står i kildens egen
   YAML. Derfor tager funktionen vokabularet ind som argument: en anden
   forhandler kan have andre ord, og så skal der rettes i en YAML-fil, ikke
   her.

   Længste træf vinder. "Sportstouring" indeholder "Sport", og uden
   sorteringen ville hver eneste sportstourer blive til en sportscykel.

   Vi matcher på hele ord. Ellers ville "Street" i "Streetfighter" tælle med,
   og — værre — enhver model med et bogstavsammenfald blive kategoriseret.

   RETURVÆRDIEN ER MED VILJE KILDENS EGET ORD, ikke vores.
   Funktionen svarer på ét spørgsmål: "hvad kaldte kilden den?" Det svar
   gemmes råt i kolonnen `type`, så vi altid kan se, hvad der stod hos dem —
   og så en rettelse i vores taksonomi ikke kræver en ny crawl af 332
   annoncer. Oversættelsen til vores otte kasser er det NÆSTE trin og ligger
   i typeIdFraKildeord()/typeLabelFraKildeord() lige nedenunder. To trin,
   fordi de kan gå galt hver for sig: et forkert træf i titlen er en
   parserfejl, en forkert kasse er en taksonomifejl. */
function normaliserType(raa, vokabular){
  if (!raa || !Array.isArray(vokabular) || !vokabular.length) return null;
  const t = String(raa);
  for (const ord of [...vokabular].sort((a, b) => String(b).length - String(a).length)){
    const m = String(ord).trim();
    if (!m) continue;
    // \p{L} frem for \w: æ, ø, å og accenter er bogstaver, og et ordskel må
    // ikke ligge midt i "Klassiker" eller "Motard".
    const re = new RegExp(`(^|[^\\p{L}])${m.replace(/\s+/g, '\\s+')}([^\\p{L}]|$)`, 'iu');
    if (re.test(t)) return m;
  }
  return null;
}

/* ---------- Stand: ny eller brugt ----------
   Et halvt katalog hos en forhandler er fabriksnye motorcykler, og forskellen
   er ikke kosmetisk: den afgør garanti, reklamationsret og hvad et bud er
   værd. "0 km" er ikke svaret — en brugt udstillingsmodel kan også have 0. */
function normaliserStand(raa){
  if (!raa) return null;
  const s = String(raa).toLowerCase();
  if (/\bbrugt|brugte|used\b/.test(s)) return 'brugt';
  if (/\bny\b|\bnye\b|\bnew\b|fabriksny/.test(s)) return 'ny';
  return null;
}

/* ---------- Postnummer ----------
   Danske postnumre er 1000-9999. "8000 Aarhus C", "DK-8000", "8000". */
function parsePostnr(raa){
  if (raa == null) return null;
  const m = String(raa).match(/\b([1-9]\d{3})\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return v >= 1000 && v <= 9999 ? m[1] : null;
}

/* ---------- Mærke ----------
   Samme mærke skrives på mange måder. Uden det her bliver "Harley Davidson"
   og "Harley-Davidson" til to mærker i filteret, og begge ser tomme ud. */
const MAERKE_ALIAS = {
  'harley davidson': 'Harley-Davidson', 'harley': 'Harley-Davidson', 'hd': 'Harley-Davidson',
  'harley-davidson': 'Harley-Davidson', 'h-d': 'Harley-Davidson',
  'bmw motorrad': 'BMW', 'bmw': 'BMW',
  'moto guzzi': 'Moto Guzzi', 'motoguzzi': 'Moto Guzzi',
  'royal enfield': 'Royal Enfield', 'royalenfield': 'Royal Enfield',
  'ktm': 'KTM', 'mv agusta': 'MV Agusta', 'mvagusta': 'MV Agusta',
  'can am': 'Can-Am', 'can-am': 'Can-Am',
  'yamaha': 'Yamaha', 'honda': 'Honda', 'suzuki': 'Suzuki', 'kawasaki': 'Kawasaki',
  'ducati': 'Ducati', 'triumph': 'Triumph', 'aprilia': 'Aprilia', 'husqvarna': 'Husqvarna',
  'vespa': 'Vespa', 'piaggio': 'Piaggio', 'indian': 'Indian', 'benelli': 'Benelli',
  'nimbus': 'Nimbus', 'mz': 'MZ', 'jawa': 'Jawa', 'cf moto': 'CFMoto', 'cfmoto': 'CFMoto',
  // Runde 6 (D6-F7): akronymer, der ellers fik "stort forbogstav" ("Bsa").
  'bsa': 'BSA', 'ajs': 'AJS', 'gas gas': 'GasGas', 'gasgas': 'GasGas',
};

function normaliserMaerke(raa){
  if (!raa) return null;
  const n = String(raa).trim().toLowerCase().replace(/\s+/g, ' ');
  if (MAERKE_ALIAS[n]) return MAERKE_ALIAS[n];
  // Ukendt mærke: behold det, men med stort begyndelsesbogstav.
  return n.split(' ').map(o => o.charAt(0).toUpperCase() + o.slice(1)).join(' ');
}

/* ---------- Model, variant og salgsmarkører ----------
   Bilbasen deler titlen i to linjer: modellen fed, det der præciserer den
   dæmpet nedenunder. Vi har én lang streng fra MC Syd og skal finde det
   samme skel. Princippet kopieres, ikke formen — Bilbasens anden linje er
   bil-trim med karrosserikode ("54 Altitude 5d"), og det findes ikke på en
   motorcykel.

   MC Syd bygger titlen sådan her, og rækkefølgen af de sidste to led er
   IKKE fast:

     mærke + modelkode + [karrosseritype] + [modelnavn] + [salgsmarkør]

     "Yamaha  XV 750    Cruiser        Virago     ENGROS/UDEN KLARGØRING"
     "Honda   CMX 1100 D  Rebel        Cruiser"      <- omvendt rækkefølge

   Derfor kan skellet ikke findes på position. Det eneste, der kan afgøres
   uden at gætte, er ORDFORRÅDET: karrosserityperne er en lukket, kendt liste
   (det er vores egen typetaksonomi, den samme som img/type/), mens
   modelnavne — Virago, Diversion, Rebel, Pan, GT — er uendeligt mange og
   umulige at kende uden en modeldatabase pr. mærke.

   Så: kendte typeord bliver til varianten, ALT andet bliver i modellen.
   Det er den sikre retning. Kender vi et ord, flyttes det; kender vi det
   ikke, bliver det liggende hos modellen, og modellen er det felt, vi ikke
   må tabe. Resultatet læser rigtigt for et menneske:

     "Yamaha XV 750 Virago"   / "Cruiser"
     "Honda CMX 1100 D Rebel" / "Cruiser"
     "BMW K 1200 GT"          / "Touring"

   Bemærk, at det også løser rækkefølgen i "K 1200 Touring GT": GT er ikke et
   typeord, så den bliver hos modellen, hvor den hører til. */

/* Salgsmarkører er forhandlerens vilkår, ikke motorcyklen. De skal ud af
   modelnavnet — ellers er "Honda ST 1100 Pan BYTTER GERNE" en anden model end
   "Honda ST 1100 Pan", både for øjet og for fingerprint().

   Listen er lukket med vilje. ENGROS, UDEN KLARGØRING og BYTTER GERNE står i
   MC Syds egne titler; SOLGT og RESERVERET er tilstande, som intet mærke
   kalder en model. Et ord, vi ikke har set i rigtige data, hører ikke til
   her: rammer det forkert, æder det et modelnavn i stilhed. */
const SALGSMARKOERER = [
  { udtryk: /\b(?:uden|ingen)\s+klarg(?:ø|oe)ring\b/giu, maerkat: 'UDEN KLARGØRING' },
  { udtryk: /\bbytter(?:\s+gerne)?\b/giu,                maerkat: 'BYTTER GERNE' },
  { udtryk: /\bengros\b/giu,                             maerkat: 'ENGROS' },
  { udtryk: /\breserveret\b/giu,                         maerkat: 'RESERVERET' },
  { udtryk: /\bsolgt\b/giu,                              maerkat: 'SOLGT' },
];

/* ---------- Vores egen typetaksonomi ----------

   HER STOD KILDENS ORDFORRÅD, OG DET VAR DET FORKERTE SVAR.

   KARROSSERITYPER skrev tidligere kildens eget ord tilbage: "Street",
   "Sportstouring", "Offroader", "Klassiker". Ordene er ikke opdigtede — MC
   Syd bruger dem selv — men de findes ikke i vores Type-filter, og det er
   filteret, køberen bruger. Målt på lageret stod ti af fireogtyve kort på
   forsiden med en type, man ikke kunne klikke sig frem til, og et klik på
   "Naked 64" gav en side fuld af kort mærket "Street". Etiket og filter
   pegede altså på hver sin taksonomi.

   Vores otte typer er dem i `TYPES` i js/data.js — de samme otte, der står
   i filterpanelet og i img/type/. Kortet skal sige et af de otte ord eller
   ingenting. Ingenting er et gyldigt svar: en type, vi ikke kan kortlægge,
   er en oplysning, vi ikke har, og en påtvunget naboklasse ("Motard" →
   Sport?) er et forkert mærkat, køberen ikke kan gennemskue.

   BEMÆRK om de tre ord, der ER væk fra listen:
     motard/supermoto  har ingen kasse hos os. Ordet bliver liggende i
                       modelnavnet, hvor det kom fra, og der står ingen type.
     custom            "Custom" er lige så tit en modelbetegnelse (XV 535
                       Custom) som en kategori. Vi gætter ikke.
     classic (engelsk) står i MC Syds 332 titler UDELUKKENDE som modelnavn —
                       Softail Classic, Road King Classic, Electra Glide
                       Ultra Classic. Alle er cruisere og tourere. Kildens
                       eget ord for kategorien er det danske "Klassiker".
                       Samme måling og samme konklusion som i
                       js/backend-bridge.js, hvor "classic" af præcis den
                       grund heller ikke står i MCSYD_KATEGORI. */
const VORES_TYPER = {
  sport: 'Sport',
  touring: 'Touring',
  cruiser: 'Cruiser',
  naked: 'Naked',
  adventure: 'Adventure/Enduro',
  scooter: 'Scooter',
  classic: 'Classic/Veteran',
  cross: 'Cross/MX',
};

/* Kildens ord -> vores type-id. Nøglen er ordet renset for alt andet end
   bogstaver, så kilden gerne må råbe "SPORTSTOURING" og skrive
   "Classic Cruiser" med mellemrum. Samme tanke som MAERKE_ALIAS.

   Oversættelserne er ikke smagsdomme:
     street         den danske forhandlerbetegnelse for en naked bike
     sportstouring  en sportstourer er en tourer med kåbe, ikke en supersport
     offroader      MC Syds "Offroader" er CRF 300 L, V-Strom, Transalp
     enduro         vores kasse hedder "Adventure/Enduro" — samme kasse
     veteran        vores kasse hedder "Classic/Veteran" — samme kasse
   De fire første er ordret de samme oversættelser som MCSYD_KATEGORI i
   js/backend-bridge.js. Rettes den ene, skal den anden med. */
const TYPE_ALIAS = {
  cruiser: 'cruiser', classiccruiser: 'cruiser', chopper: 'cruiser',
  street: 'naked', naked: 'naked', roadster: 'naked',
  adventure: 'adventure', offroader: 'adventure', offroad: 'adventure',
  enduro: 'adventure', trail: 'adventure',
  touring: 'touring', sportstouring: 'touring', tourer: 'touring',
  klassiker: 'classic', klassisk: 'classic', veteran: 'classic',
  scooter: 'scooter', maxiscooter: 'scooter',
  cross: 'cross', motocross: 'cross', mx: 'cross',
  sport: 'sport', supersport: 'sport',
};

// Ordet, som det står i en titel, renset til en opslagsnøgle.
function typeNoegle(raa){
  return String(raa == null ? '' : raa).toLowerCase().replace(/[^\p{L}]/gu, '');
}

/* Kildens ord -> vores type-id, eller null. Null er svaret, når ordet ikke
   findes i vores otte kasser — ikke den nærmeste nabo. */
function typeIdFraKildeord(raa){
  return TYPE_ALIAS[typeNoegle(raa)] || null;
}

/* Kildens ord -> den etiket, køberen ser og kan klikke på i filteret. */
function typeLabelFraKildeord(raa){
  const id = typeIdFraKildeord(raa);
  return id ? VORES_TYPER[id] : null;
}

/* Opslagstabellen, delModelOgVariant() bruger til at kende et typeord i en
   titel. Nøglerne er kildens ord, værdierne ER vores etiketter — så det, der
   lander i `variant` og dermed på kortets anden linje, altid er et ord fra
   vores eget filter. */
const KARROSSERITYPER = Object.fromEntries(
  Object.keys(TYPE_ALIAS).map(ord => [ord, VORES_TYPER[TYPE_ALIAS[ord]]])
);

function traekSalgsmarkoerer(raa){
  const original = String(raa == null ? '' : raa);
  let tekst = original;
  const fundne = [];
  for (const m of SALGSMARKOERER){
    const efter = tekst.replace(m.udtryk, ' ');
    if (efter === tekst) continue;
    tekst = efter;
    /* Positionen i den OPRINDELIGE titel gemmes, så mærkaterne kommer ud i
       den rækkefølge, kilden skrev dem — "ENGROS/UDEN KLARGØRING", ikke
       omvendt. Ellers bestemte rækkefølgen i listen herover, hvordan et
       mærkat så ud på kortet, og den rækkefølge betyder ingenting. */
    fundne.push({ maerkat: m.maerkat, ved: original.search(m.udtryk) });
  }
  fundne.sort((a, b) => a.ved - b.ved);
  /* "ENGROS/UDEN KLARGØRING" efterlader en enlig skråstreg, når begge dele er
     fjernet. Alt uden bogstav eller ciffer er tegnsætning, der har mistet sit
     ord, og må ikke ende midt i modelnavnet. */
  const ord = tekst.split(/\s+/).filter(o => /[\p{L}\d]/u.test(o));
  // Ingen markører er null, ikke en tom liste — samme kontrakt som resten af
  // filen, hvor en manglende værdi er null og aldrig noget, der ligner data.
  return { ord, salgsmarkoerer: fundne.length ? fundne.map(f => f.maerkat) : null };
}

function delModelOgVariant(raa){
  const { ord, salgsmarkoerer } = traekSalgsmarkoerer(raa);
  // Seks MC Syd-annoncer har kun mærket som titel. Der er ingen model at
  // finde, og en gættet model ville stå som en kendsgerning på kortet.
  if (!ord.length) return { model: null, variant: null, salgsmarkoerer };

  const type = ord.map(o => KARROSSERITYPER[o.toLowerCase().replace(/[^\p{L}]/gu, '')] || null);

  /* Et typeord som FØRSTE ord er en del af modelnavnet, ikke en type: MC Syd
     sætter altid typen EFTER modellen. Uden den regel ville "Ducati Sport
     1000" blive til modellen "1000" og "Triumph Street Triple 765" til
     "Triple 765" — begge er navne, ingen af dem er typer.
     Undtagelsen: består resten udelukkende af typeord, er der ingen model at
     beskytte, og ordet ER typen. */
  const kunTyper = type.every(Boolean);
  const foersteTilladt = kunTyper ? 0 : 1;

  const modelOrd = [];
  const variantOrd = [];
  ord.forEach((o, i) => {
    if (type[i] && i >= foersteTilladt){
      // Samme type nævnt to gange ("Touring ... Touring") skal stå én gang.
      if (!variantOrd.includes(type[i])) variantOrd.push(type[i]);
    } else {
      modelOrd.push(o);
    }
  });

  return {
    model: modelOrd.join(' ') || null,
    variant: variantOrd.join(' ') || null,
    salgsmarkoerer,
  };
}

/* ---------- Sælgertype ---------- */
function normaliserSaelgertype(raa){
  if (!raa) return null;
  const s = String(raa).toLowerCase();
  if (/forhandler|dealer|erhverv|firma|aps|a\/s/.test(s)) return 'forhandler';
  if (/privat|private/.test(s)) return 'privat';
  return null;
}

/* ---------- Personoplysninger i fritekst ----------
   HVORFOR DEN HER FINDES.

   MC Syd er én forhandler. Alt derfra er virksomhedsdata, og en
   modelbetegnelse indeholder ikke et telefonnummer.

   Gul og Gratis er en markedsplads, hvor annoncerne er skrevet af
   privatpersoner. Overskriften er sælgerens EGEN sætning, og på et dansk
   annoncesite er "Sælges for min far, ring 12 34 56 78" eller
   "BMW R1150RT — kontakt anders@eksempel.dk" helt almindelige overskrifter.

   Vi henter ikke annoncens brødtekst (uddrag står som null i parse.js netop
   derfor), men titlen GEMMER vi — den er kortets overskrift. Uden rensning
   ville vores database indeholde telefonnumre og mailadresser på private,
   som vi hverken har spurgt om lov til at gemme eller har brug for.

   Vi linker til Gul og Gratis. Køberen skal kontakte sælgeren HOS KILDEN,
   hvor sælgeren selv har valgt at lægge sine oplysninger — ikke gennem en
   kopi, vi har taget uden at spørge. Derfor er et telefonnummer i vores
   database ikke bare en risiko; det er også et felt, vi ikke skal bruge.

   Hvad der fjernes, og hvorfor netop det:
     · Danske telefonnumre — 8 cifre, med eller uden mellemrum, punktum,
       bindestreg eller +45 foran. Skrevet på alle de måder folk skriver dem.
     · Mailadresser.
     · Web- og profiladresser, som kan pege på en person.

   Hvad der IKKE fjernes: postnummer og by. De står i deres egne felter, de
   er kildens egen strukturerede oplysning, og en køber kan ikke lede efter
   en motorcykel uden at vide hvor den står. Fire cifre plus en by peger ikke
   på en person.

   FORSIGTIGHEDSPRINCIPPET: et årstal eller en ccm-værdi må aldrig forveksles
   med et telefonnummer, for så ødelægger vi titlen på en ærlig annonce.
   Derfor kræver mønstret enten en adskiller (12 34 56 78), et +45, eller at
   de otte cifre står helt for sig selv — "1150" og "2005" rammes ikke, og
   det er der en test på. */
const TELEFON = new RegExp([
  // Med landekode: +45 foran gør det utvetydigt, uanset hvordan resten står.
  /\+?\s*45[\s.\-]*\d{2}[\s.\-]*\d{2}[\s.\-]*\d{2}[\s.\-]*\d{2}/.source,
  // Grupperet: 12 34 56 78 og 1234 5678. Adskilleren er beviset.
  /(?<!\d)\d{2}[\s.\-]+\d{2}[\s.\-]+\d{2}[\s.\-]+\d{2}(?!\d)/.source,
  /(?<!\d)\d{4}[\s.\-]+\d{4}(?!\d)/.source,
  // Otte cifre helt for sig selv. Lookaround i begge ender, så 1150 og 2005
  // aldrig kan blive en del af et træf.
  /(?<!\d)\d{8}(?!\d)/.source,
].join('|'), 'g');
const MAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g;
const ADRESSE = /\b(?:https?:\/\/|www\.)\S+/gi;

/* Ordene, der kun står der for at introducere nummeret. Fjernes nummeret og
   ikke ordet, ender titlen på "Sælges for min far, ring" — og så ligner det
   en fejl hos os frem for en oplysning, sælgeren selv har lagt hos kilden. */
/* ORDGRÆNSEN MÅ IKKE VÆRE \b.

   I JavaScript er \w kun [A-Za-z0-9_]. Æ, Ø og Å tæller altså IKKE som
   ordtegn, og \b matcher derfor midt inde i et dansk ord. Skrev vi \bring\b,
   ramte den "RING" inde i "KLARGØRING" — fordi der står et Ø lige før, og \b
   ser en grænse dér. En MC Syd-titel som
   "Yamaha XV 750 Cruiser Virago ENGROS/UDEN KLARGØRING" fik dermed ædt sin
   sidste stavelse af en rensning, der skulle fjerne telefonnumre.

   Derfor eksplicitte grænser, der kender de danske bogstaver. */
const DA = 'A-Za-zÆØÅæøå0-9_';
const OPTAKT = new RegExp(
  `[\\s,;:\\-–—]*(?<![${DA}])(?:ring(?:\\s+til)?|kontakt|tlf\\.?|telefon|mobil?|sms|skriv(?:\\s+til)?|kontaktes?\\s+p[åa])(?![${DA}])[\\s,;:.\\-–—]*$`,
  'i');

function fjernPersonoplysninger(raa){
  if (!raa) return raa;
  return String(raa)
    .replace(MAIL, '')
    .replace(ADRESSE, '')
    .replace(TELEFON, '')
    // Efterlader vi "Sælges af Anders,  ,  ring" ser det i stedet ud som en
    // fejl på vores side. Ryd op i den tegnsætning, fjernelsen efterlader.
    .replace(/\s*[,;–—-]\s*(?=[,;–—-]|$)/g, '')
    // Parenteser, der efter fjernelsen kun rummer optaktsordet: "(ring )".
    // Klammen skal væk sammen med sit indhold, ellers står der en tom parentes
    // midt i titlen, som ligner en fejl hos os.
    .replace(/[(\[]\s*(?:ring(?:\s+til)?|kontakt|tlf\.?|telefon|mobil?|sms|skriv(?:\s+til)?)?\s*[)\]]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(OPTAKT, '')
    .replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, '')
    .trim();
}

/* ---------- Uddrag ----------
   Vi gemmer aldrig den fulde annoncetekst. 200 tegn, klippet ved et
   ordskel, så det ikke stopper midt i et ord.

   Personoplysninger fjernes FØR klipningen. Ellers kunne et telefonnummer
   overleve, fordi det stod efter tegn 200 i kildeteksten og først dukkede op
   i databasen, når nogen senere hævede grænsen. */
function uddrag(raa, maks = 200){
  if (!raa) return null;
  const renset = fjernPersonoplysninger(raa);
  const t = String(renset).replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= maks) return t;
  const skaaret = t.slice(0, maks);
  const sidsteMellemrum = skaaret.lastIndexOf(' ');
  return (sidsteMellemrum > maks * 0.6 ? skaaret.slice(0, sidsteMellemrum) : skaaret).trim() + '…';
}

/* ---------- Fingerprint ----------
   En KANDIDATNØGLE til at finde annoncer, der KUNNE være samme motorcykel.
   Ikke et bevis på, at de er det, og ikke noget, der må slås sammen på egen
   hånd. Hvad hashen kan bruges til, står nedenfor; hvorfor den ikke må mere
   end det, er målt.

   HER STOD DER NOGET ANDET, OG DET VAR FORKERT.
   ------------------------------------------------------------------
   Kommentaren lovede: "Samme motorcykel annonceret tre steder skal være ÉN
   annonce hos os med tre kilde-links." Løftet havde en kolonne
   (014_aggregator.sql:53) og et indeks (:65) bag sig og ingen logik nogen
   steder — hverken i js/, i crawler/db.js's læse- eller skrivesti eller i et
   view. En regel, der er skrevet ned uden at være håndhævet, får den næste
   læser til at tro, at sagen er lukket. Derfor er den skrevet om til det,
   koden gør, i stedet for at koden blev bygget til at gøre det, der stod.

   Grunden er målt på driftlageret 17.08.2026, 332 aktive annoncer fra ÉN
   kilde: 238 unikke fingerprints. 41 grupper deler nøgle, og de dækker 135
   rækker — 40,7 % af lageret. Den største gruppe er 13 rækker. Alle 41
   grupper har forskellige `kilde_annonce_id`, altså 41 grupper af annoncer,
   kilden selv holder adskilt. 128 af de 135 har `stand: 'ny'`.

   Det er ikke en fejl i hashen. Det er syv ens nye Honda CMX 500 Rebel 2024
   på lager hos samme forhandler til samme listepris — syv forskellige
   motorcykler med hver sit stelnummer. En sammenlægning på fingerprint ville
   gøre 332 annoncer til 238 og skjule 94 motorcykler, en forhandler faktisk
   har til salg, bag et kort der påstod "13 kilde-links" til 13 forskellige
   maskiner.

   Km i nøglen løser det ikke: 128 af de 135 er nye og har ingen
   kilometerstand. Målt med km i nøglen falder det til 37 grupper og 126
   rækker — stadig 38 % af lageret.

   HVAD DER SKULLE TIL FOR AT KUNNE SLÅ SAMMEN
   Et felt, der adskiller to ens maskiner fra den samme maskine to steder:
   stelnummer, registreringsnummer, eller et billedmatch. Ingen af dem
   findes i felt-whitelisten i crawler/db.js, og ingen kilde giver os dem i
   dag. Indtil da er sammenlægning et gæt på en forhandlers vegne, og
   "Ærlighed slår fuldstændighed" i work/DECISIONS.md gælder også her: at
   skjule en rigtig annonce vejer tungere imod os end at vise to.

   HVAD HASHEN SÅ ER TIL
   En stabil nøgle over de felter, der IKKE flytter sig mellem kilder eller
   mellem kørsler. To ting, den kan bære, uden at påstå identitet:
   genkendelse af, at en annonce er lagt op igen under et nyt lagernummer,
   og en KANDIDATLISTE til et menneske eller til en senere
   discriminator-regel. Kolonnen og indekset bliver liggende af den grund —
   de koster et sha1 pr. annonce, og de er den rigtige halvdel af et
   opslag, der mangler sin anden halvdel.

   Prisen er afrundet til nærmeste 1.000: samme cykel annonceres tit til
   124.900 ét sted og 125.000 et andet, og uden afrunding ville de aldrig
   mødes. Det er stadig rigtigt for det, nøglen NU er — en kandidatnøgle
   skal favne bredt; det er dommen bagefter, der skal være streng.

   Se docs/review/DECISIONS.md, C-010. */
const crypto = require('crypto');

function fingerprint({ maerke, model, aargang, km, pris_dkk, postnr }){
  /* Km indgår IKKE. Afrunding kan ikke samle to tal på hver side af en
     grænse — 12.400 bliver 12, 12.600 bliver 13, og så er samme cykel to
     annoncer. Og kilometerstanden er alligevel målt på hvert sit tidspunkt,
     når den samme motorcykel står to steder.

     Det er præcis den udeladelse, der gør nøglen bred nok til at finde en
     KANDIDAT og for bred til at afgøre identitet. Se blokken ovenfor: uden
     km deler 135 af 332 annoncer nøgle med en anden, og 128 af dem er nye
     maskiner på samme lager. Argumentet holder for det, nøglen skal — det
     holdt ikke for det, den lovede. */
  const dele = [
    (maerke || '').toLowerCase(),
    (model || '').toLowerCase().replace(/[\s-]+/g, ''),
    aargang || '',
    pris_dkk != null ? Math.round(pris_dkk / 1000) : '',
    postnr || '',
  ];
  return crypto.createHash('sha1').update(dele.join('|')).digest('hex');
}

/* Kildens EGET "intet foto"-grafik er ikke et foto af motorcyklen.

   Fundet 23.08.2026 (B3): Gul og Gratis leverer
   /assets/files/default-listing.<hash>.svg som <figure img>, naar saelgeren
   ikke har lagt et billede op. Crawleren gemte det som thumbnail_url, og
   kortet viste saa kildens pladsholder, som om det var annoncens foto — det
   er praecis det, "Kilden ejer sine billeder" forbyder: vi viser ikke en
   tegning som om den var annoncens. Uden thumbnail faar kortet i stedet det
   aerlige "Ingen fotos i denne annonce"-felt (js/components.js).

   Moenstrene er bevidst snaevre: et filnavn, der SIGER at det er en
   standardgrafik, og SVG i en thumbnail-position (ingen kilde leverer
   fotos som SVG). Et rigtigt foto i JPEG/WebP rammes aldrig. */
const PLADSHOLDER_MOENSTRE = [
  /\/default-listing[^/]*\.svg(\?|$)/i,   // Gul og Gratis
  /\/(?:no|missing|default)[-_]?(?:image|photo|foto|billede)[^/]*\.(?:svg|png|gif|jpe?g|webp)(\?|$)/i,
  /\.svg(\?|$)/i,
];
function erKildensPladsholder(url){
  const u = String(url || '').trim();
  if (!u) return false;
  return PLADSHOLDER_MOENSTRE.some(re => re.test(u));
}

module.exports = {
  parsePris, parseKm, parseAargang, parseCcm, parsePostnr, parseHk,
  erKildensPladsholder,
  udledCcmFraModel, MINDSTE_UDLEDTE_CCM,
  normaliserMaerke, normaliserSaelgertype, normaliserType, normaliserStand,
  uddrag, fjernPersonoplysninger, fingerprint,
  delModelOgVariant,
  /* Oversættelsen fra kildens ordforråd til vores otte typer. Eksporteres,
     så pipelinen kan gemme vores type-id ved siden af kildens ord — og så
     der kun findes ÉN tabel at rette i, den dag en kilde bruger et nyt ord. */
  typeIdFraKildeord, typeLabelFraKildeord, VORES_TYPER, TYPE_ALIAS,
  // Eksporteres, så crawleren kan GENKENDE et mærke i starten af en titel og
  // dele "Harley-Davidson XL883 Standard" op i mærke og model. Kun opslag —
  // parsningen bliver liggende her.
  MAERKE_ALIAS,
};
