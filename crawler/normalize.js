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

/* Karrosseri-/brugstyper. Nøglen er ordet renset for alt andet end bogstaver,
   værdien er den skrivemåde, vi viser. Samme tanke som MAERKE_ALIAS: kilden
   må gerne råbe "SPORTSTOURING", kortet skal stadig sige "Sportstouring". */
const KARROSSERITYPER = {
  cruiser: 'Cruiser', sportstouring: 'Sportstouring', touring: 'Touring',
  street: 'Street', adventure: 'Adventure', offroader: 'Offroader',
  offroad: 'Offroader', klassiker: 'Klassiker', klassisk: 'Klassiker',
  classic: 'Klassiker', veteran: 'Veteran', sport: 'Sport', naked: 'Naked',
  scooter: 'Scooter', cross: 'Cross', enduro: 'Enduro', supermoto: 'Supermoto',
  custom: 'Custom',
};

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

/* ---------- Uddrag ----------
   Vi gemmer aldrig den fulde annoncetekst. 200 tegn, klippet ved et
   ordskel, så det ikke stopper midt i et ord. */
function uddrag(raa, maks = 200){
  if (!raa) return null;
  const t = String(raa).replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= maks) return t;
  const skaaret = t.slice(0, maks);
  const sidsteMellemrum = skaaret.lastIndexOf(' ');
  return (sidsteMellemrum > maks * 0.6 ? skaaret.slice(0, sidsteMellemrum) : skaaret).trim() + '…';
}

/* ---------- Fingerprint ----------
   Samme motorcykel annonceret tre steder skal være ÉN annonce hos os med tre
   kilde-links. Nøglen er de felter, der ikke ændrer sig mellem kilder.

   Prisen er bevidst afrundet til nærmeste 1.000: samme cykel annonceres tit
   til 124.900 ét sted og 125.000 et andet, og uden afrunding ville de aldrig
   mødes. */
const crypto = require('crypto');

function fingerprint({ maerke, model, aargang, km, pris_dkk, postnr }){
  /* Km indgår IKKE. Afrunding kan ikke samle to tal på hver side af en
     grænse — 12.400 bliver 12, 12.600 bliver 13, og så er samme cykel to
     annoncer. Og kilometerstanden er alligevel målt på hvert sit tidspunkt,
     når den samme motorcykel står to steder. Mærke, model, årgang, prisniveau
     og postnummer er nok til at kende den igen. */
  const dele = [
    (maerke || '').toLowerCase(),
    (model || '').toLowerCase().replace(/[\s-]+/g, ''),
    aargang || '',
    pris_dkk != null ? Math.round(pris_dkk / 1000) : '',
    postnr || '',
  ];
  return crypto.createHash('sha1').update(dele.join('|')).digest('hex');
}

module.exports = {
  parsePris, parseKm, parseAargang, parseCcm, parsePostnr,
  normaliserMaerke, normaliserSaelgertype, uddrag, fingerprint,
  delModelOgVariant,
  // Eksporteres, så crawleren kan GENKENDE et mærke i starten af en titel og
  // dele "Harley-Davidson XL883 Standard" op i mærke og model. Kun opslag —
  // parsningen bliver liggende her.
  MAERKE_ALIAS,
};
