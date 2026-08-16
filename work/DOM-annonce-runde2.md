# DOM — annoncedetaljesiden, runde 2

Kritiker uden forhistorie. Udlogget, cookievæg klikket væk med "Kun nødvendige".
Ankom via `soegning.html`, klikkede ind på en privat annonce (1021, BMW R 1250 GS
Adventure, 201.000 kr.) og en forhandlerannonce (1017, Suzuki GSX-R750,
Motorcykel Centret ApS). Screenshots ved 1440×900 og 390×844, branding beskåret
af begge sider før dommen. Reference: `bar/03-annonce-detalje-*.png`.

---

## De tre hårde spørgsmål

### Fotos

Nul. Ikke "få" — nul.

- `annonce.html` indeholder **2 `<img>`-elementer**, og begge er sidens eget
  logo (header + footer). Målt på både 1440 og 390, på både 1021 og 1017.
- Stikprøve på 8 native annoncer (1001, 1003, 1006, 1017, 1021, 1044, 1049,
  1050): alle 8 viser "Ingen fotos i denne annonce".
- Søgesidens eget filter afgør sagen: **"Kun annoncer med billeder" → 326
  resultater, hvoraf 0 er på Bikerbasen.** Alle 51 native annoncer er billedløse.
- På side 1 af søgeresultatet: 24 kort, 20 med foto — og **alle 20 med foto
  linker til mcsyd.dk**. De 4 kort der peger på vores egen `annonce.html` har
  ingen. Hvert eneste foto på sitet sidder på et kort, der sender køberen væk.

Lover siden noget den ikke holder? Nej — den tomme tilstand er ærlig og pæn:
"Sælgeren har ikke lagt billeder op. Vi viser ikke en tegning i stedet — bed
sælgeren om fotos af netop den her motorcykel, før du kører efter den."
Men den undskylder for meget: på mobil er den største blok over folden en
tre-liniers forklaring på et fravær, og teksten taler om **vores** designvalg
("Vi viser ikke en tegning i stedet") — det interesserer ikke en køber.
Referencen bruger samme plads på et 1440-bredt billede plus 17 miniaturer.

### Sælgeren

Udlogget kan jeg se, at det er en privat sælger i Esbjerg, medlem siden 2017.
Det er alt. Navn, telefon og enhver kontaktvej er bag login. Siden **siger
hvorfor** ("Det holder telefonnumre væk fra robotter og reklamehenvendelser"),
og det er en reel begrundelse — men det er stadig en blindgyde.

Tre konkrete brud:

1. **Mobilens sticky-bar lover "Vis nummer".** Klikket lander på
   `login.html?redirect=…`. Der er intet nummer. Referencen har "Vis
   telefonnummer" og den virker udlogget.
2. **Forhandleridentiteten modsiger sig selv mellem to klik.** Annonce 1017:
   "Motorcykel Centret ApS · Forhandler · **Frederikshavn**", "Medlem siden
   **2024**", "CVR oplyst af sælger: 37063717". Klik "Se sælgerprofil":
   "Motorcykel Centret ApS · FORHANDLER · **Vejle**", "Medlem siden **2019**",
   og intet CVR overhovedet. Samme sælger, to byer, to årstal.
3. **Ingen adresse, intet website, intet antal annoncer** på annoncen.
   Referencen giver gadeadresse, hjemmeside, CVR, "Se forhandlerens 44
   annoncer" og 4,5 ★ / 50 anmeldelser — uden login.

Godt: sælgerprofilens ærlighed er stærkere end referencens tavse forhandlerboks
("Ingen af oplysningerne er kontrolleret af Bikerbasen … læs dem som en
oplysning — ikke som en godkendelse", og den tomme anmeldelsestilstand: "En
profil uden anmeldelser er ikke en advarsel — den er bare ubeskrevet").
Det er den bedste tekst på hele sitet. Den er bare skrevet under en annonce,
man ikke kan se og ikke kan svare på.

### Tomme felter — og gættede

Specifikationsgitteret: **11 felter, 11 udfyldte, 0 tomme.** Kørekort, Mærke,
Model, Årgang, Kilometer, Kubik, Effekt, Type, Stand, Registrering, Afgift.
Identisk på alle 8 stikprøver. Ingen "Ikke oplyst" nogen steder.

At intet mangler er ikke et kvalitetstegn — det er tællesignalet. Rigtige
brugtannoncer har huller. Her er hullerne fyldt op:

| Felt | Siden siger | Virkeligheden |
|---|---|---|
| Royal Enfield Himalayan 411 (1044) | 46 hk | ~24 hk — næsten det dobbelte |
| Suzuki GSX-R750 2017 (1017) | 113 hk | ~148 hk |
| BMW R 1250 GS Adv. (1021) | 140 hk | 136 hk |
| Yamaha MT-09 2022 (1001) | 116 hk | 119 hk |

Otte forskellige motorcykler koster nøjagtig **12.000 kr.** (NMAX 125, Vespa
Primavera, Vespa GTS 300, Piaggio Liberty, Peugeot Django, Burgman 400, MZ ETZ
251 — og en **Nimbus Type C fra 1968**, som reelt handles til det fem- til
seksdobbelte). Prisen er læsbar; den er bare ikke troværdig.

**Og det værste: beskrivelsen er en skabelon, der udgiver sig for at være
sælgerens egne ord.** Ordret ens på alle 8 stikprøver, kun mærke/model/årgang/
stand/type substitueret:

> "Motorcyklen har været velholdt og serviceeftervist gennem hele ejerperioden.
> Nye dæk og bremseklodser inden for de sidste par tusinde km. *[Type]*-modellen
> er kendt for sin pålidelighed og køreglæde – perfekt til både dagligt brug og
> længere ture. Ingen kendte fejl eller mangler."

Det er en opdigtet servicehistorik på 100 % af annoncerne. På annonce 1050 (MZ
ETZ 251) står feltet **STAND: Defekt/Projekt** ti centimeter over sætningen
"Ingen kendte fejl eller mangler". På 1049 er en Nimbus fra 1968 "perfekt til
dagligt brug". På 1006 gælder det samme om en 125 ccm scooter og "længere ture".
Rubrikkens regel — et gættet felt vejer tungere end et manglende — rammer her
med fuld vægt: siden nægter omhyggeligt at tegne et falsk foto, og skriver så en
falsk serviceattest under det. ("Serviceeftervist" er i øvrigt ikke et dansk ord.)

Modsat: filtrene lover felter, annoncen aldrig leverer — Servicehistorik,
Ejere & syn, Udstyr, Brændstof, Cylindre, Farve står i filterpanelet, men ingen
af dem findes på detaljesiden.

---

## Hastighed

Lighthouse, mobil-emulering, simuleret throttling, to sider:

| | annonce 1021 | annonce 1017 |
|---|---|---|
| Ydelse | **62** | **62** |
| Tilgængelighed | **100** | **100** |
| Best practices / SEO | 100 / 100 | — |
| FCP | 4,9 s | 4,9 s |
| LCP | 7,1 s | 7,2 s |
| TBT | 20 ms | 20 ms |
| CLS | **0,001** | **0** |

Gulvet er ydelse ≥ 95. 62 er ikke i nærheden, og kategorien er dermed tabt
uanset resten. Opfattet: ved 1.000 ms og 2.000 ms på en mellemklassetelefon
(4× CPU, 1,6 Mbit) står der en tom grå kasse, en generisk brødkrumme
"Forside / Søgeresultater / Annonce" og en cookiebanner — titel, pris og
motorcykel dukker først op mellem 2 og 3,5 sekunder. På en side helt uden
billeder.

Det der er godt, er reelt godt: CLS ~0 (intet hopper efter tegning), TBT 20 ms,
a11y 100 uden en eneste fejl. Problemet er ren leveringsvægt — ukomprimeret
tekst (346 KiB at hente), uminificeret CSS/JS (144 KiB), 177 KiB ubrugt CSS —
plus at hele annoncen tegnes af JavaScript efter hentning. Bemærk at GAP 5 gør
tallet absolut: vi måler os ikke mod referencens reklamebelastede side.

---

## Findbarhed og dansk

"A2'er til under 60.000" tager **2 klik**, URL'en bærer tilstanden
(`?priceMin=30000&priceMax=60000&koerekort=A2`), og tilbage-knappen genskaber
både filtre og resultatlinje. Resultatlinjen er den bedste tekst på siden:
"383 annoncer fundet — 51 annoncer på Bikerbasen, 332 indekseret hos MC Syd".
Sorteringen skifter selv navn til "Blandet udbud", når resultatet er blandet.
Kørekortfiltret bærer et ærligt forbehold om, at det kun filtrerer på effekt.
Referencen har ingen motorcykler overhovedet (GAP 1).

Men bemærk hvad det ærlige filter afslører: A2 + 30–60.000 giver **5 annoncer,
alle interne, alle uden foto.** Vores eneste strukturelle fordel fører til fem
rygter.

Dansk: `201.000 kr.`, `18.400 km`, `1.254 ccm`, `140 hk`, `23. jul. 2026`,
`3 uger siden`, A1/A2/A, Sport/Touring/Cruiser/Naked/Adventure/Enduro/Scooter/
Classic/Veteran/Cross/MX, "Forbrugerkøbelovens reklamationsret", "Mød op
personligt", Nimbus Type C "Kakkelovnsrøret". Nul oversættervendinger, nul
`DKK 129.500`, nul `08/16/2026`. Referencen er også dansk, men taler bilsprog
(Kontantpris, Månedlig ydelse, Book en prøvetur) og kan ikke sige et ord om
kørekort. Eneste plet hos os er skabelonteksten og "serviceeftervist".

---

VINDER: findbarhed=os tillid=Bilbasen hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=62 a11y=100 LCP=7.1s CLS=0.001
STØRSTE HUL: Alle 20 fotoforsynede kort på søgesidens første side linker ud til mcsyd.dk, mens alle 51 annoncer der faktisk åbner vores `annonce.html` har nul billeder — importér MC Syd-annoncernes billeder og vis dem på vores egen detaljeside i stedet for at sende køberen væk, så detaljesiden overhovedet kan vise en motorcykel.

### Én sætning pr. kategori

- **Findbarhed = os:** to klik fra "A2 til under 60.000" til en liste, tilstand i
  URL'en, tilbage-knappen holder — og referencen kan slet ikke finde en
  motorcykel.
- **Tillid = Bilbasen:** referencen giver mig udlogget forhandlerens adresse,
  CVR, hjemmeside, 44 andre annoncer og et telefonnummer, mens vores side viser
  nul fotos, en opdigtet servicehistorik på hver eneste annonce (inklusive
  "Ingen kendte fejl eller mangler" over feltet "Defekt/Projekt"), hk-tal der
  ikke passer, en forhandler der bor i to byer på to sider, og en "Vis
  nummer"-knap der fører til en login-formular.
- **Hastighed = Bilbasen:** ydelse 62 mod et ufravigeligt gulv på 95, og en tom
  grå kasse i to sekunder på en side uden billeder — CLS 0,001 og a11y 100
  redder den ikke.
- **Dansk = os:** tal, datoer, kørekortklasser og MC-kategorier er skrevet af en
  dansk motorcyklist, ikke oversat — kun skabelonbeskrivelsen og ordet
  "serviceeftervist" røber en maskine.
