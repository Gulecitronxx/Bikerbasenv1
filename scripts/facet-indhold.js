/* Redaktionelt indhold til facet-siderne (type, kørekort, landsdel, model).

   Her står KUN det, der er sandt uanset lagerets tilstand. Alt, der er et tal
   om lageret, regnes i build-facet-pages.js af de rigtige annoncer.

   KILDE FOR KØREKORTFAKTA (efterprøvet 15.10.2026):
     Færdselsstyrelsen, "Kørekort til motorcykel"
       https://www.fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel
     Færdselsstyrelsen, "Kørekortkategorier"
       https://www.fstyr.dk/privat/koerekort/koerekortkategorier
   A1: højst 125 cm³, højst 11 kW, højst 0,1 kW/kg, 18 år.
   A2: højst 35 kW, højst 0,2 kW/kg, ikke afledt af en motorcykel med mere end
       dobbelt effekt, 20 år (A2 kan tages før efter mindst 2 års A1-erfaring
       og en praktisk prøve).
   A:  ingen effektgrænse, 24 år; 22 år efter mindst 2 års erfaring på A2 og en
       praktisk prøve på en stor motorcykel.
   Aldersgrænserne er de ALMINDELIGE. Der findes undtagelser (værnepligtige,
   mekanikere m.fl.), som vi ikke gengiver — siden henviser til kilden. */

const KILDE_URL = 'https://www.fstyr.dk/privat/koerekort/udvidelse-af-koerekort/koerekort-til-motorcykel';

/* Fakta-rækken øverst på kørekortsiderne: 4-5 ikon + to linjer. */
const KK_FAKTA = {
  A1: [
    { ikon: 'bike',   titel: 'Op til 11 kW',        tekst: 'A1 giver ret til motorcykler på højst 125 cm³ og 11 kW (ca. 15 hk).' },
    { ikon: 'gauge',  titel: 'Effekt/vægt-forhold', tekst: 'Højst 0,1 kW pr. kg. Vægten står sjældent i annoncen.' },
    { ikon: 'doc',    titel: 'Fra 18 år',           tekst: 'Den almindelige mindstealder for kategori A1.' },
    { ikon: 'route',  titel: 'Vejen til A2',        tekst: 'Efter mindst 2 års A1-erfaring og en praktisk prøve.' },
  ],
  A2: [
    { ikon: 'bike',   titel: 'Op til 35 kW',        tekst: 'A2 giver ret til motorcykler med højst 35 kW (ca. 47 hk).' },
    { ikon: 'gauge',  titel: 'Effekt/vægt-forhold', tekst: 'Højst 0,2 kW pr. kg. Vægten står sjældent i annoncen.' },
    { ikon: 'doc',    titel: 'Fra 20 år',           tekst: 'Almindelig mindstealder. Har du haft A1 i 2 år, kan du komme til A2 før.' },
    { ikon: 'shield', titel: 'Ikke afledt',         tekst: 'Må ikke være afledt af en model med mere end dobbelt effekt.' },
    { ikon: 'route',  titel: 'Vejen til A',         tekst: 'Fra 24 år, eller 22 år efter 2 års A2 og en praktisk prøve.' },
  ],
  A: [
    { ikon: 'bike',   titel: 'Ingen effektgrænse',  tekst: 'Kategori A giver ret til alle motorcykler, uanset effekt.' },
    { ikon: 'doc',    titel: 'Fra 24 år',           tekst: 'Almindelig mindstealder for kategori A.' },
    { ikon: 'route',  titel: 'Vejen via A2',        tekst: '22 år efter mindst 2 års erfaring på A2 og en praktisk prøve på en stor motorcykel.' },
    { ikon: 'gauge',  titel: 'Vægten er ligegyldig', tekst: 'Der er hverken kW- eller kW/kg-grænse på kategori A.' },
  ],
};

/* "Hvad må du køre?" / "Hvad kan du ikke se direkte i en annonce?" / "Vores råd" */
const KK_BOKSE = {
  A1: {
    maa: ['Motorcykler på højst 125 cm³ og højst 11 kW (ca. 15 hk)', 'Effekt/vægt-forhold på højst 0,1 kW pr. kg', 'Nye og brugte motorcykler kan være A1'],
    ikkeSe: ['Om effekten er begrænset (nedpropset eller ej)', 'Vægten, og dermed kW pr. kg', 'Om motorcyklen er A1 ifølge registreringsattesten'],
    raad: ['Tjek registreringsattesten og typenummeret', 'Bed om dokumentation for effekten', 'Overvej, hvor længe du vil blive på A1'],
  },
  A2: {
    maa: ['Motorcykler med højst 35 kW (ca. 47 hk)', 'Effekt/vægt-forhold på højst 0,2 kW pr. kg', 'Motorcyklen må ikke være afledt af en model med mere end dobbelt effekt', 'Både nye og brugte motorcykler kan være A2'],
    ikkeSe: ['Om motorcyklen er effektbegrænset, og om det kan ændres tilbage', 'Den oprindelige motoreffekt (hvis den er nedpropset)', 'Vægten, og dermed kW pr. kg', 'Dokumentation for effekten, som du altid bør bede sælger om'],
    raad: ['Tjek typenummer og registreringsattest', 'Få dokumentation for effekten (højst 35 kW)', 'Vær opmærksom på forsikring og udstyr', 'Overvej, om du senere vil op på A'],
  },
  A: {
    maa: ['Alle motorcykler, uanset effekt og slagvolumen', 'Kategori A dækker også A1 og A2', 'Mindstealder 24 år, eller 22 år via 2 års erfaring på A2'],
    ikkeSe: ['Om en kraftig motorcykel passer til din erfaring', 'Forsikringspris, som ofte stiger med effekten', 'Stand og servicehistorik, som sjældent fremgår af annoncen'],
    raad: ['Prøvekør, før du beslutter dig', 'Tjek servicehistorik og dæk', 'Regn forsikring og vægtafgift med', 'Husk udstyr, der passer til motorcyklens ydeevne'],
  },
};

/* "Det skal du vide om <type>" — 4 sande, generelle bokse pr. type. Ingen
   tal, ingen løfter om enkelte modeller. */
const TYPE_VIDEN = {
  sport: [
    { ikon: 'gauge',  titel: 'Ydeevne og teknologi', tekst: 'Sportsmotorcykler er bygget til acceleration, bremser og kurver. Kørestillingen er forudbøjet og kræver en vis smidighed.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Mange sportsmodeller har høj effekt og kræver kategori A. Der findes lettere modeller til A2, så tjek altid effekten.' },
    { ikon: 'tag',    titel: 'Pris og værditab',     tekst: 'Prisen afhænger af årgang, km og stand. Tjek om motorcyklen har været på bane, og se efter tegn på tidligere skader.' },
    { ikon: 'shield', titel: 'Sikkerhed og udstyr',  tekst: 'Høj hastighed kræver godt udstyr: hjelm, handsker, jakke og bukser med beskyttere og støvler.' },
  ],
  naked: [
    { ikon: 'bike',   titel: 'Åben og rolig kørestilling', tekst: 'Naked-motorcykler har ingen stor kåbe. Kørestillingen er oprejst, og de er populære i byen og på landevejen.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Der findes naked-modeller i alle klasser, fra A2 til kraftige maskiner på kategori A. Tjek effekten i annoncen.' },
    { ikon: 'tag',    titel: 'Pris og værditab',     tekst: 'Udbuddet er bredt. Sammenlign årgang, km og stand, og spørg til servicehistorikken.' },
    { ikon: 'shield', titel: 'Vind og udstyr',       tekst: 'Uden kåbe får du mere vind på motorvej. Tænk på nakkestøtte, jakke og eventuel vindskærm.' },
  ],
  cruiser: [
    { ikon: 'bike',   titel: 'Komfort og stil',      tekst: 'Cruisere har lavt sæde og afslappet kørestilling med fødderne fremme. De er bygget til rolige ture frem for fart.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Mange cruisere har stor motor og kræver kategori A, men der findes også mindre modeller til A2. Tjek effekten.' },
    { ikon: 'tag',    titel: 'Pris og vedligehold',  tekst: 'Cruisere holder ofte prisen godt. Se efter rust på krom, olielækager og slid på rem eller kæde.' },
    { ikon: 'shield', titel: 'Vægt og kørsel',       tekst: 'Mange cruisere er tunge. Prøv at rangere og vende motorcyklen, før du beslutter dig.' },
  ],
  touring: [
    { ikon: 'route',  titel: 'Bygget til lange ture', tekst: 'Touringmotorcykler har kåbe, komfortabelt sæde og plads til bagage. De er til dig, der kører langt.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'De fleste er store og kraftige og kræver kategori A. Tjek altid effekten i annoncen.' },
    { ikon: 'tag',    titel: 'Pris og udstyr',       tekst: 'Kufferter, varme i håndtag og cruise control kan indgå. Se efter hvad der følger med i prisen.' },
    { ikon: 'shield', titel: 'Vægt og vedligehold',  tekst: 'Tunge maskiner med meget elektronik. Spørg til servicehistorik og om alt udstyr virker.' },
  ],
  adventure: [
    { ikon: 'route',  titel: 'På og af asfalt',      tekst: 'Adventure-motorcykler har lang affjedring, høj sidde-position og god plads til bagage. De bruges til både landevej og grusveje.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Der findes adventure-modeller fra A2 til store maskiner på kategori A. Tjek effekten i annoncen.' },
    { ikon: 'tag',    titel: 'Pris og stand',        tekst: 'Se efter tegn på hård brug i terræn: dæmpere, hjul og beskyttelsesplader. Spørg til servicehistorikken.' },
    { ikon: 'shield', titel: 'Højde og vægt',        tekst: 'Sædet er højt, og maskinen kan være tung. Sæt dig op på den, før du køber.' },
  ],
  classic: [
    { ikon: 'clock',  titel: 'Stil og historie',     tekst: 'Classic-motorcykler dækker både ældre veteranmaskiner og nyere retromodeller i klassisk stil.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Effekten varierer meget. Mange ældre modeller kan køres på A2, men tjek altid effekten og registreringsattesten.' },
    { ikon: 'tag',    titel: 'Pris og originalitet', tekst: 'For ældre maskiner betyder originalitet og dokumentation meget for prisen. Se efter rust og eftermonterede dele.' },
    { ikon: 'shield', titel: 'Reservedele og vedligehold', tekst: 'Undersøg, om der findes reservedele, og hvem der kan servicere netop den model.' },
  ],
  cross: [
    { ikon: 'route',  titel: 'Til terræn og bane',   tekst: 'Crossmotorcykler er bygget til terræn og kan ofte ikke bruges på offentlig vej uden godkendelse.' },
    { ikon: 'doc',    titel: 'Registrering og regler', tekst: 'Tjek, om motorcyklen er registreret og godkendt til vej, eller kun må bruges på bane og i terræn.' },
    { ikon: 'tag',    titel: 'Pris og slid',         tekst: 'Crossmotorcykler slides hårdt. Spørg til driftstimer, sidste serviceeftersyn og motorens stand.' },
    { ikon: 'shield', titel: 'Sikkerhed og udstyr',  tekst: 'Kør kun med crosshjelm, briller, nakkebeskytter og støvler med beskyttelse.' },
  ],
  scooter: [
    { ikon: 'bike',   titel: 'Praktisk i hverdagen', tekst: 'Scootere har lavt sæde, gearfrit drev og ofte plads under sædet. Mange bruges til pendling.' },
    { ikon: 'doc',    titel: 'Kørekort og regler',   tekst: 'Reglerne afhænger af størrelsen. Tjek effekt og slagvolumen i annoncen og registreringsattesten.' },
    { ikon: 'tag',    titel: 'Pris og stand',        tekst: 'Se efter slid på remmen, bremser og dæk, og spørg til servicehistorikken.' },
    { ikon: 'shield', titel: 'Sikkerhed og udstyr',  tekst: 'Også på en lille scooter er hjelm, handsker og jakke med beskyttere en god idé.' },
  ],
};

/* Landsdelssider: generelle, sande bokse om at købe fra annoncer i en landsdel. */
const REGION_VIDEN = [
  { ikon: 'pin',    titel: 'Landsdelen kommer fra postnummeret', tekst: 'Vi placerer annoncer ud fra postnummeret. Annoncer uden postnummer kan ikke placeres i en landsdel og står ikke her.' },
  { ikon: 'tag',    titel: 'Handlen sker hos sælger',   tekst: 'Bikerbasen indekserer annoncer fra danske forhandlere og markedspladser. Prisen aftaler du med sælgeren.' },
  { ikon: 'route',  titel: 'Regn med afstanden',        tekst: 'Står motorcyklen langt væk, så aftal besigtigelse og papirer på forhånd, før du kører efter den.' },
  { ikon: 'shield', titel: 'Tjek før du køber',         tekst: 'Se efter stelnummer mod papirerne, servicehistorik og stand på dæk, kæde og bremser. Prøvekør, hvis du kan.' },
];

/* Rød tråd til guide-siderne (adresserne er reserveret, siderne ejes af en anden strøm). */
const GUIDE = {
  foerste: 'guide-foerste-motorcykel.html',
  a2: 'guide-a2-koerekort.html',
  brugt: 'guide-brugt-motorcykel.html',
  typer: 'guide-mc-typer.html',
  ordliste: 'guide-mc-ordliste.html',
  alle: 'guides.html',
};

/* Små linjeikoner, der ikke findes i js/icons.js. Samme stil (24x24, streg 1.75). */
const SVG = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const EGNE_IKONER = {
  arrow:  SVG('<path d="M4 12h16M14 6l6 6-6 6"/>'),
  doc:    SVG('<path d="M7 3.5h7.5L19 8v12.5H7z"/><path d="M14.5 3.5V8H19M9.5 12.5h6M9.5 16h6"/>'),
  route:  SVG('<path d="M4 8h13M13 4l4 4-4 4"/><path d="M20 16H7M11 12l-4 4 4 4"/>'),
  tag:    SVG('<path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z"/><circle cx="8" cy="9" r="1.2"/>'),
  book:   SVG('<path d="M4 5.5C6.5 4.5 9.5 4.6 12 6c2.5-1.4 5.5-1.5 8-.5v13c-2.5-1-5.5-.9-8 .5-2.5-1.4-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>'),
  shield: SVG('<path d="M12 3.2 5 5.8v5.4c0 4.7 3 8 7 9.6 4-1.6 7-4.9 7-9.6V5.8z"/>'),
  pin:    SVG('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/>'),
};

module.exports = { KILDE_URL, KK_FAKTA, KK_BOKSE, TYPE_VIDEN, REGION_VIDEN, GUIDE, EGNE_IKONER };
