# Forsiden — runde 3

Frisk dommer. Har hverken læst `work/DECISIONS.md` eller runde 1/2's domme, og har
ikke set kildekoden. Alt herunder er målt i browseren.

**Opsætning.** Egen server på port **8547** (`PORT=8547 python scripts/dev-server.py`).
Udlogget, `localStorage` ryddet før første besøg, cookiemuren afvist med
**"Kun nødvendige"**. `innerWidth` aflæst inde fra siden: **1440** på desktop og
**390** på mobil — begge nøjagtige.

**Tilstand.** Lokalt kører demokataloget: **443 annoncer = 51 egne (demo) + 332 MC Syd +
60 Gul og Gratis**. I produktion er der 0 egne, altså **392**. Hvor det ændrer dommen,
står det eksplicit. Lighthouse er kørt af mig selv, mobilemulering, 4× CPU-throttle,
både mod den lokale ukomprimerede server og mod en brotli/gzip-server (port 8552),
fordi den lokale dev-server ikke komprimerer og derfor straffer LCP kunstigt.

---

## 1. Overlever tallene et tjek? — filterløftet

Jeg satte et filter i hero'en, læste hvad knappen lovede, klikkede, og læste hvad
søgesiden svarede. Alle værdier målt, ikke påstået.

| Filter i hero | Knappen lover | Søgesiden svarer | URL | Enig? |
|---|---|---|---|---|
| (ingen) | Vis 443 motorcykler | 443 annoncer fundet | `soegning.html` | ✅ |
| Type = Sport | Vis 28 motorcykler | 28 | `?types=sport` | ✅ |
| Kørekort A1 | Vis 17 motorcykler | 17 | `?koerekort=A1` | ✅ |
| Kørekort A2 | Vis 47 motorcykler | 47 | `?koerekort=A2` | ✅ |
| Kørekort A | Vis 443 motorcykler | 443 | `?koerekort=A` | ✅ |
| Maks. pris 30.000 | Vis 33 motorcykler | 33 | `?priceMax=30000` | ✅ |
| Maks. pris 60.000 | Vis 96 motorcykler | 96 | `?priceMax=60000` | ✅ |
| Maks. pris 100.000 | Vis 202 motorcykler | 202 | `?priceMax=100000` | ✅ |
| Maks. pris 200.000 | Vis 352 motorcykler | 352 | `?priceMax=200000` | ✅ |
| Chip "A2 under 60.000 kr." | — | 31 | `?koerekort=A2&maxPrice=60000` | ✅ |
| Chip "Under 50.000 kr." | — | 77 | `?maxPrice=50000` | ✅ |
| Chip "Adventure" | — | 72 | `?type=adventure` | ✅ |
| Chip "Cruiser" | — | 93 | `?type=cruiser` | ✅ |
| Chip "Under 10.000 km" | — | 52 | `?kmMax=10000` | ✅ |

Otte typefliser: 28+55+93+65+72+8+14+3 = **338**. Forsiden skriver "105 af 443 annoncer
har ingen type oplyst" — 443−338 = **105**. ✅ Facetterne på søgesiden er de samme otte tal.

Kildelinjen: 51 + 332 + 60 = **443**. ✅
Prisspændene: 33+64+107+83+137 = 424, og de 22 uden pris er nævnt eksplicit. 424+22 = 446;
overlappet ved bucketgrænserne forklarer resten — internt konsistent.

Og når hero'en filtrerer noget fra, siger den det: *"105 annoncer er ikke talt med, fordi
motorcykeltype ikke er oplyst på dem. De vises heller ikke i søgningen."* Det er et
regnskab, ikke en undskyldning. **Det er sidens stærkeste kort, og det holder.**

Til sammenligning står der på Bilbasens egen forside "50.460 annoncer i dag" over en knap
der siger "Vis 40.574 biler" (mobil: 50.459 / 40.572). Et uforklaret hul på **9.886**.
Det ville vi blive hængt for. **Her vinder vi.**

### 1b. …og så det tal, der IKKE overlever

Forsiden, under "Dyrere modeller":

> "Tre tilfældige blandt de **202** annoncer til 105.000 kr. eller derover, der har et foto"

Målt, kort for kort, over alle 10 sider af `soegning.html?priceMin=105000`:

| Måling | Værdi |
|---|---|
| Annoncer ≥ 105.000 kr. | **217** |
| …heraf uden foto (talt manuelt på alle 10 sider) | **9** |
| …altså **med** foto | **208** |
| Forsiden påstår | **202** |
| Afvigelse | **−6** |

Sidens egen linje på søgesiden ("de 9 annoncer uden foto") giver samme resultat.
Der findes ingen prisgrænse der giver 202-med-foto: ≥104.000 → 209, ≥105.000 → 208,
≥105.001 → 198. Tallet **202** er tilfældigvis også antallet af annoncer ≤100.000 kr.
Uanset årsagen: to af vores egne sider er uenige om 6 annoncer, og det er den ene ting
sitet har lovet ikke at gøre.

### 1c. "Tre tilfældige" er ikke tilfældige

> "Rækkefølgen er tilfældig, så det er ikke en anbefaling."

**18 indlæsninger** — 12 i samme kontekst, 6 i helt friske browserkontekster med
`localStorage`/`sessionStorage` ryddet — gav **samme tre motorcykler i samme rækkefølge
hver eneste gang**:

```
1) Gul og Gratis · 189.000 kr. · Ny · Suzuki VZR1800 · 2007 · 53.000 km
2) MC Syd        · 179.995 kr. · Ny · Honda CMX 1100 T Rebel · 2024 · Ikke oplyst
3) MC Syd        · 459.800 kr. ·    · Indian Challenger Dark Horse · 2021 · 14.000 km
```

Det kan være dagsseedet (jeg har kun målt inden for ét døgn), men for brugeren er
adfærden deterministisk, og teksten siger noget andet. Enten skal seedet skiftes pr.
visning, eller også skal sætningen hedde "dagens tre".

---

## 2. Beskriver overskrifterne det, der står under dem?

| Overskrift | Hvad der faktisk står under den | Dom |
|---|---|---|
| "Søg efter type" | 8 fliser med korrekte tal + ærlig note om de 105 uden type | ✅ |
| "Populære mærker" — *"de mærker, danske bikere søger mest"* | Yamaha (27 annoncer), Honda (226), Suzuki (35), Kawasaki (15), BMW (22), Ducati (6), KTM (11), Triumph (25), Aprilia (7), **Husqvarna (2), Vespa (2), Indian (2)** | ❌ Påstand om søgeadfærd vi ikke har data til. Tre af tolv fliser fører til 2 annoncer. |
| "Dyrere modeller" | 3 annoncer ≥105.000 kr. | ⚠️ Komparativ uden referent; tallet 202 er forkert (se 1b) |
| "Nyeste annoncer" | 8 kort, **8 af 8 uden foto**, nyeste er **3 uger gammel**, 0 af 8 fra de 392 indekserede | ❌ Se afsnit 3 |
| "Find brugte motorcykler i hele Danmark" | Syddanmark 356 · Midtjylland 34 · Nordjylland 27 · Hovedstaden 18 · **Sjælland 8** | ⚠️ 80 % af lageret ligger i én region (Rødding). "Hele Danmark" er en tilsnigelse — og i produktion uden de 51 demo-annoncer bliver skævheden værre. |
| Søgesidens `<h1>` "**Brugte** motorcykler til salg" | **184 af 443 (41,5 %)** af annoncerne bærer et "Ny"-mærke; annoncesiden skriver ordret *"Det her er en fabriksny motorcykel … ikke blandt de brugte"* | ❌ Overskriften modsiger 42 % af sit indhold |

---

## 3. Forsiden viser næsten ingen varer

Geometri målt med `getBoundingClientRect`, desktop 1440×900, efter cookieafvisning.

| Element | Vores y (px) | Bilbasen y (px, skaleret til 1440 bred) |
|---|---|---|
| `<h1>` | 164 | ~310 |
| Søgeformular | 419–756 | ~370–620 |
| Primær CTA | 577–629 | ~600 |
| Første fotoflise (ikke en vare) | 1114 | ~720 (Populære søgninger) |
| **Første rigtige motorcykel/bil med pris** | **3.057** | **~1.290** |
| Sidens fulde højde | **6.116** | **4.242** |
| Varer med foto + pris på forsiden | **3** | **28** |

Vores forside er **44 % længere** end Bilbasens og viser **3** motorcykler mod deres **28**
biler. Den første pris ligger **2,4 gange længere nede**.

Og den største varegrid vi har — "Nyeste annoncer", **1.101 px høj** (y 3.459–4.560) —
er otte grå pladsholdere:

| "Nyeste annoncer" | Målt |
|---|---|
| Kort i alt | 8 |
| Kort med foto | **0** |
| Kort fra de 392 indekserede annoncer | **0** |
| Nyeste annonces alder (i dag 19. aug. 2026) | 26. jul. 2026 = **3 uger** |

Alle otte er egne demo-annoncer. **I produktion (0 egne annoncer) er sektionen tom.**
Det efterlader forsiden med præcis tre synlige motorcykler ud af 392 — og de tre er
låst fast (se 1c). "Se alle annoncer →" fører i øvrigt til `soegning.html` uden sortering,
altså "Blandet udbud", ikke nyeste først.

**Mobil 390×844.** Over folden: header 0–68, `<h1>` 140–197, søgekort 248–761,
CTA "Vis 443 motorcykler" **632–684**, hurtigchips 696–744, to trygheds­punkter.
Første `<h2>` ("Søg efter type") ligger på **964** — under folden. Første pris på en
motorcykel: **~4.200 px**, altså fem skærme nede. (De 3.016 px hvor "0 kr." står, er
sælgerpitchen, ikke en vare.) Bilbasen viser heller ingen pris over mobilfolden — deres
fold er formular + CTA + toppen af fliserne. **Selve folden er uafgjort; vi har endda
kørekortvælgeren med. Det er alt derunder, vi taber.**

---

## 4. Data siden ikke kan stå inde for

Jeg gennemgik **alle 443 kort** på tværs af søgesidens 19 sider.

### "Ny" på brugte motorcykler

**184 af 443 kort (41,5 %) bærer mærket "Ny".** Seks af dem har et kilometertal over 1.000:

| Kilde | Model | Årgang | Km | Pris | Mærket |
|---|---|---|---|---|---|
| Gul og Gratis | **BMW K 100 RT** | **1985** | **122.000 km** | 39.800 kr. | **Ny** |
| Gul og Gratis | **Suzuki VZR1800** | **2007** | **53.000 km** | 189.000 kr. | **Ny** |
| Gul og Gratis | Triumph Daytona T100R 1971 | 1971 | 1.400 km | 49.000 kr. | Ny |
| Gul og Gratis | Triumph Thruxton 1200 fra 2017 | 2017 | 12.300 km | 120.000 kr. | Ny |
| Gul og Gratis | Honda nt 1100 d | 2024 | 9.000 km | 175.000 kr. | Ny |
| Gul og Gratis | Suzuki Zusuki V-STROM 650 dl | 2023 | 3.100 km | 82.800 kr. | Ny |

26 af de 184 har årgang 2023 eller ældre.

**Suzuki VZR1800 er det første kort på forsiden — på hver eneste indlæsning.** Åbner man den
(`annonce.html?id=966dfe55…`), står der ordret:

> "Det her er en **fabriksny** motorcykel. … og **kilometerstanden er derfor ikke oplyst**."

Og to linjer længere nede i samme tabel: **ÅRGANG 2007 · KILOMETER 53.000 km · Stand: Fabriksny.**

Siden modsiger sig selv på én skærm. Det er ikke et manglende felt — det er et påstået
felt, der er forkert, på det produkt forsiden vælger at føre an med. Sitets egen tekst
lige nedenunder lyder: *"Mangler et tal hos sælgeren, står der 'Ikke oplyst' — vi fylder
ikke hullet ud med et skøn."* Her er hullet fyldt ud med et skøn, der er forkert.

Dertil: "Stand"-facetten på søgesiden har kun **Som ny 12 · God stand 29 · Brugt 188 ·
Defekt/Projekt 2**. Der er ingen "Ny". Man kan altså se mærket på 184 kort og ikke
filtrere på det.

### Dubletter

Grupperet på kilde + model + pris + årgang:

| Måling | Værdi |
|---|---|
| Grupper med dubletter | 44 |
| **Overskydende annoncer** | **113 af 443 (25,5 %)** |
| Værste enkeltgruppe | Honda CMX 1100 D Rebel, 184.995 kr., 2024 — **×13** |
| Næstværste | Royal-enfield Classic 650 Black Chrome, 95.000 kr., 2025, 0 km — **×11** |
| Tredje | "Triumph Tiger Classic Bike", 100.000 kr., 1955 — **×8** |

Alle dubletter kommer fra de indekserede kilder, så i produktion er andelen
**113/392 = 29 %**. Overskriften "443 motorcykler til salg" er derfor ~25 % oppustet
oveni demokataloget. Honda alene fylder **226 af 443 (51 %)**, fordi MC Syd er
Honda-forhandler.

---

## 5. Dansk

Den redaktionelle tekst er **skrevet dansk, ikke oversat**, og den er bedre end barens:
*"Vi gætter aldrig: er effekten ikke oplyst, siger vi det."* · *"handl med ro i maven"* ·
*"Bygget til entusiaster, af entusiaster."* Formaterne er korrekte hele vejen:
priser **"189.000 kr."**, km **"53.000 km"**, datoer **"26. jul. 2026"** og
**"19. aug. 2026"**, kørekort **A1/A2/A**. Typenavnene (Sport, Touring, Cruiser, Naked,
Adventure/Enduro, Scooter, Classic/Veteran, Cross/MX) er markedets egne danske betegnelser,
ikke oversættelsesfejl.

**Bilbasen har en decideret formatfejl på sine forsidekort:** "modelår 2023, **29,000 km**",
"**3,600 km**", "**77,500 km**" — engelsk tusindtalskomma, i samme kort som prisen skrives
korrekt med punktum ("269.250 kr."). Blandede separatorer på ét kort. Det gør vi ikke.

**Men vores skrabede kildesprog lækker.** Ikke på forsiden i den nuværende faste
udvælgelse, men ét klik væk — og "Dyrere modeller" trækker fra præcis den pulje:

- `Honda nt 1100 d` (kildens småt-skrevne modelnavn)
- `Royal-enfield` (skal være Royal Enfield) · `Fb Mondial` (skal være FB Mondial)
- `Suzuki Zusuki V-STROM 650 dl` (sælgerens stavefejl står i vores modelfelt)
- `Triumph Thruxton 1200 fra 2017` og `Triumph Daytona T100R 1971` (annonceoverskrift i modelfeltet)
- `Honda NT 1100 A 5 ÅRS FABRIKS GARANTI` (forhandlerens salgstekst som modelnavn)
- `BYTTER GERNE` som badge · en annonce hvis model bare er `Honda`, til 609.995 kr.
- `Black Chrome`, `Hornet 2025` som selvstændige modellinjer

Bilbasens korttitler er normaliserede ("Ford Transit 350 L3 Van, modelår 2023"). Vores er
ikke. **Vi vinder alligevel på dansk** — deres km-komma er en fejl i deres eget hovedformat,
og vores redaktionelle sprog er i en anden liga — men lækagen er en tikkende bombe, der
lander på forsiden i det øjeblik "Dyrere modeller" reseeder.

Sproglig nit: **"Dyrere modeller"** er en komparativ uden sammenligningsgrundlag. Dyrere end hvad?

---

## 6. Hastighed og tilgængelighed — målt, ikke citeret

Lighthouse 12.8.2, mobilemulering, `--throttling.cpuSlowdownMultiplier=4`, headless,
tre kørsler hver.

| | Ydelse | A11y | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| Os, lokal server **uden** komprimering (8547) | 80 / 78 / 80 | 100 | 2,0 s | **5,1 / 5,6 / 5,1 s** | 0 | 0 ms |
| Os, **brotli/gzip** som i produktion (8552) | **83 / 83 / 83** | **100** | 2,1 s | **3,9 / 3,8 / 3,9 s** | **0** | 30–60 ms |
| **bilbasen.dk, samme opsætning** | **36** | **79** | 5,5 s | **17,0 s** | 0,019 | **1.130 ms** |

Vi slår baren sønder og sammen: **83 mod 36**, LCP **3,9 s mod 17,0 s**, TBT **40 ms mod
1.130 ms**, a11y **100 mod 79**, CLS **0 mod 0,019**. (Forbehold: vores side blev målt over
localhost, deres over internettet; LH's simulerede throttling udligner båndbredden, men ikke
DNS/TLS. Forskellen er for stor til at være en artefakt.)

**Vi rammer stadig ikke vores eget gulv** (ydelse ≥95, LCP <2,5 s). Årsagen er målt:
**87 % af LCP er render delay** (3,34 s af 3,84 s). Det renderblokerende `css/styles.css`
er **217 KB ukomprimeret / 57 KB brotli**, og **84 % (179 KB) af reglerne bruges ikke på
forsiden**. Dertil `supabase-js` fra jsDelivr, 55 KB, 83 % ubrugt. LCP-elementet er
`<h1>` — ren tekst, der venter på stilarket.

Uden JavaScript findes hele lageret ikke: ingen tal, ingen "Dyrere modeller", ingen
"Nyeste annoncer" — kun skallen.

**Til gengæld er fejltilstanden forbilledlig.** Med Supabase blokeret vises et banner:
*"Vi kunne ikke hente annoncerne fra databasen. Du ser derfor ikke hele lageret, og hverken
antallet af annoncer eller tallene ved filtrene dækker det, der faktisk er til salg."* —
og tallet falder ærligt fra 443 til 51, og "Dyrere modeller" forsvinder helt frem for at
lyve. Det er bedre end noget dansk site jeg kender, og bedre end baren.

---

## 7. Blind A/B, desktop

Toppen 1.700 px af begge sider, logoet beskåret væk, venstre/højre blandet af scriptet
(nøglen skrevet til fil og først læst bagefter).

**Min dom før nøglen blev læst:** side **2** er den bedre lavede side — typografien er
sikker, søgekortet er stort og læsbart, kørekortvælgeren er et ægte særkende, typefliserne
er rene og bærer tal. Side **1** er rodet, åbner med en reklame for en ladeboks og har en
lille grå formular som hero.

**Men som sted at købe en motorcykel valgte jeg side 1.** Inden for de samme 1.700 px giver
side 1 mig **24 rigtige køretøjer med foto, pris og kilometertal**. Side 2 giver mig **nul**:
et hero-foto af en motorcykel der ikke er til salg, otte generiske kategorifliser (heller
ikke til salg) og en tretrins-forklaring på hvordan man køber. Jeg kan efter to skærme ikke
afgøre, om side 2 overhovedet *har* nogen motorcykler.

Nøglen: **1 = Bilbasen, 2 = os.** Deres grimme grid af hvide varevogne gør arbejdet.
Vores smukke tomme udstillingslokale gør det ikke.

---

## 8. Hvad der fortjener ros (målt)

- **Hero → søgeside: 14 af 14 filterløfter holder præcist.** Ingen af dem er runde tal, og
  ingen af dem afviger med 1.
- **Uoplyst-regnskabet.** Hvert filter fortæller hvor mange annoncer det sorterede fra, og
  hvorfor. A-forklaringen ("A har ingen effektgrænse, så den dækker også de annoncer, hvor
  effekten ikke er oplyst") er præcis det, en 22-årig køber har brug for, og som ingen
  bilside kan give.
- **Fejltilstanden** (afsnit 6).
- **A11y 100, CLS 0, TBT ≤60 ms** — ingen af delene er gratis, og baren har ingen af dem.
- **Kildeangivelse på hver indekseret annonce** ("Annonce fra MC Syd", "Privat sælger ·
  guloggratis.dk") plus "Annoncen blev hentet hos Gul og Gratis 19. aug. 2026".

## 9. Hvad der skal laves om, i rækkefølge

1. **Drop "Ny"-mærket, indtil det kan efterprøves.** Et 1985-BMW med 122.000 km må aldrig
   stå som "Ny", og en annonceside må ikke skrive "kilometerstanden er ikke oplyst" over
   "53.000 km". Vis kun stand når kilde-årgang og km ikke modsiger den — ellers ingenting.
2. **Ret eller fjern "202".** Rigtigt tal er 208.
3. **Flyt varer op.** Erstat "Nyeste annoncer" (0 fotos, tom i produktion) med et
   grid af 12–24 *indekserede* annoncer med foto, placeret over 1.500 px. I dag skal en
   køber 3.057 px ned for at se sin første motorcykel.
4. **Afdublér.** 113 af 443 annoncer er gengangere; overskriften "443 motorcykler til salg"
   er tilsvarende oppustet.
5. **Gør "tre tilfældige" tilfældige** — eller kald dem "dagens tre".
6. **Normalisér modelnavne fra kilderne**, før "Dyrere modeller" reseeder og sætter
   "Suzuki Zusuki V-STROM 650 dl" på forsiden.
7. **Skær stilarket.** 84 % ubrugt CSS blokerer renderingen og koster 87 % af LCP.

---

VINDER: findbarhed=Bilbasen tillid=Bilbasen hastighed=os dansk=os
LIGHTHOUSE: ydelse=83 a11y=100 LCP=3.9s CLS=0
STØRSTE HUL: Forsidens første og eneste faste vare er en Suzuki VZR1800 fra 2007 med 53.000 km, som vi mærker "Ny" og hvis annonceside skriver "fabriksny … kilometerstanden er derfor ikke oplyst" direkte over "53.000 km" — fjern "Ny"-mærket overalt hvor kildens årgang eller kilometertal modsiger det, og lad feltet stå tomt i stedet, for et site hvis hele løfte er "vi gætter aldrig" har ikke råd til at kalde en 19 år gammel motorcykel ny.
