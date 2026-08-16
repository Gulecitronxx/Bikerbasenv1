# Kritikerdom — søgeresultat + filtre (runde 1)

Kilde: RUBRIC.md + GAPS.md. Ingen kode læst. Blind sammenligning mod
`bar/02-soegeresultat-*.png` og `bar/05-filtre-*.png` (branding beskåret,
rækkefølge blandet). Målt med Lighthouse 12.8.2, mobil-emulering, simuleret
throttling.

---

## Købsopgaven: A2 til under 60.000 kr.

| Trin | Handling | Resultat |
|---|---|---|
| 1 | Klik "A2 (mellem mc)" | 383 → 15, chip + ærlighedsbanner |
| 2 | Klik Maks.-feltet, skriv 60000 | 15 → 14, chip "0 kr. – 60.000 kr." |

To klik. Under baren på tre. Chipsene "Kørekort A2" og "0 kr. – 60.000 kr."
står øverst med ×, URL'en bærer `?priceMax=60000&koerekort=A2`, og den kan
deles. Bilbasen kan ikke stille spørgsmålet overhovedet — der findes ikke et
kørekortfelt i bilverdenen (GAP 1).

Klik ind på en annonce og tryk tilbage: **samme scrollposition, samme filtre,
samme sortering — og kortet jeg kom fra får en orange ring.** Det er bedre end
det, en bruger forventer.

---

## Scanbarhed — talt op

| Visning | Rigtigt foto | Tegning |
|---|---|---|
| Standardsøgning, de 6 første kort | 6 | 0 |
| **A2 + under 60.000 (14 kort)** | **0** | **14** |

Alle fotos på siden kommer fra MC Syd. Alle 51 Bikerbasen-annoncer er uden
foto. De to fakta er omvendt korrelerede: de motorcykler man kan filtrere på
kørekort, er præcis dem uden billede.

Konsekvensen er, at A2-listen er 14 identiske grå piktogrammer, hvor det
eneste, der skiller kortene ad, er pristeksten — og syv af dem koster
**12.000 kr.** (Nimbus 1968, Vespa Primavera 125, Peugeot Django 125, Piaggio
Liberty 125, Yamaha NMAX 125, Vespa GTS 300, Suzuki Burgman 400). Man kan ikke
udelukke noget med øjnene. Bilbasens liste kan skannes på et sekund, fordi
hvert kort er et foto af den faktiske bil.

**Selvmodsigelse:** annoncesiden skriver ordret *"Vi viser ikke en tegning i
stedet"* — men listen, brugeren lige kom fra, tegnede en motorcykel.

(Set én gang: `annonce.html?id=1020` viste et "1 / 7"-galleri af tegninger;
ved genbesøg viste den korrekt "Ingen fotos i denne annonce". Ikke reproducerbar
— sandsynligvis et build, der landede midt i sessionen. Nævnes uden vægt.)

---

## Blandet lager — tydeligt

Stærkeste enkeltdel på siden.

- Resultatlinjen: **"383 annoncer fundet · 51 annoncer på Bikerbasen ·
  332 indekseret hos MC Syd"** med (i).
- (i) åbner "Hvor kommer annoncerne fra?": forklarer hosted vs. indekseret,
  at klik åbner kilden i ny fane, at pris/årgang/km er læst fra forhandlerens
  egen annonce, og *"Står der 'Ikke oplyst', er det fordi feltet ikke fremgår
  hos kilden — vi gætter ikke."*
- Hvert eksternt kort: badge "HOS MC SYD" med ↗, sælgerlinje "MC Syd · mcsyd.dk",
  og CTA "Se hos MC Syd ↗".
- Klik → ny fane direkte på mcsyd.dk's produktside. Man mister ikke sin plads.

Man bliver ikke ført væk uden varsel. Eneste svaghed: mærkningen er asymmetrisk
— eksterne har badge, egne har ingen, så "ingen badge = ligger her" skal læres.

---

## Ærlighed — filtrene skjuler noget, og de siger det

- Kun A2: *"332 annoncer er ikke vist, fordi kørekortkategori ikke er oplyst
  på dem. Fjern filteret for at se dem."*
- A2 + maks. 60.000: *"75 annoncer er ikke vist, fordi pris og
  kørekortkategori ikke er oplyst på dem."* — tallet er beregnet efter de
  øvrige filtre, ikke et rå-tal. Det er præcist.
- Under kørekort-chipsene: *"Vejledende: filtrerer på effekt. Tjek altid
  registreringsattesten — A2 kræver også maks. 0,2 kW/kg, og nogle mc'er
  sælges i begrænset udgave."* En dansk MC-køber ved, at det er det rigtige
  forbehold.
- Facet-tal opdateres mod de aktive filtre, og nul-valg gråtones og deaktiveres.

Bilbasen skriver kun "Viser: 40.476 biler til salg" og fortæller intet om,
hvad et filter har skjult.

Ét minus: **"UNDER MARKEDSPRIS"** sidder på flere af 12.000-kr.-annoncerne.
Annoncesiden kvalificerer den ordentligt som en *advarsel* ("Prisen er
væsentligt under markedsniveau for denne type — vær ekstra opmærksom"), men
grundlaget er data, der tydeligvis ikke er færdigt.

---

## Sorteringen

Standard er **"Mest relevante"**. Rækkefølgen er i praksis nyeste først
(3 uger → 4 uger → 1 måned). Det er forudsigeligt, men navnet lover en
relevansmodel, der ikke findes — "Nyeste først" ligger som separat valg lige
under. `Pris: Lav til høj` / `Høj til lav` / `Årgang` / `Kilometertal`
sorterer korrekt og skriver sig i URL'en.

Reel konsekvens: på den ufiltrerede standardsøgning er **alle** kort over
folden fra MC Syd. Vores egne 51 annoncer er usynlige, indtil man filtrerer.

(Bilbasens tilsvarende hedder "Standard" og forklarer endnu mindre.)

---

## Filtrene, side mod side

| | Vores | Bilbasen |
|---|---|---|
| Desktop | Fast venstre rail, altid synlig | Alt bag "Alle filtre"-modal |
| Antal pr. valg | Ja, på hver chip | Nej |
| Tomme valg | Gråtonet + deaktiveret | Ikke vist |
| MC-felter | Kørekort A1/A2/A, ccm, MC-typer | Findes ikke |
| Typer | Sport, Touring, Cruiser, Naked, Adventure/Enduro, Scooter, Classic/Veteran, Cross/MX | Karrosseri-ikoner (bil) |
| Mobil | Ark med klæbende "Vis 383 annoncer" + levende tal | Ark med "Vis 40.474 biler" |

Mobil 390 px, to konkrete skavanker:
1. Resultatlinjen brækker til fire linjer, og (i)-ikonet falder ned på sin egen
   linje ved siden af de fire visnings-knapper. Rodet blok over folden.
2. Mærkeafsnittet har en **checkbox-liste med sit eget scrollvindue på ca. to
   rækker** inde i arkets scroll inde i sidens scroll. Tre lag scroll på en
   telefon for at vælge et mærke uden for de syv chips.

---

## Målt gulv

| | Standardsøgning | A2 + 60.000 | Gulv |
|---|---|---|---|
| Ydelse | **68** | **68** | ≥ 95 |
| Tilgængelighed | **100** | **100** | 100 ✔ |
| FCP | 3,5 s | 3,6 s | — |
| LCP | **7,5 s** | **7,1 s** | ≤ 2,5 s |
| CLS | 0,003 | 0,036 | grøn ✔ |
| TBT | 0 ms | 0 ms | grøn ✔ |

Tilgængelighed er 100 uden en eneste fejlet audit — det er reelt. CLS og TBT
er fremragende: intet hopper, intet blokerer.

Men i 3,5 sekunder er skærmen tom, og hovedindholdet lander først efter
7,5 s. Årsagen ligger i opstartskæden, ikke i billederne — den filtrerede side
uden eksterne fotos måler det samme:

- 12 uminificerede JS-filer (~310 kB) + `styles.css` på 175 kB ukomprimeret
- Supabase-SDK'et hentes fra jsdelivr
- to Supabase-REST-kald (`listings`, `eksterne_annoncer`) skal begge hjem,
  før første kort kan tegnes
- LCP-elementet er `div#results-grid > article.card > img.card-photo` —
  et hotlinket foto fra `images.danbase.dk`, som vi hverken kan komprimere,
  konvertere eller preloade tidligt

Siden falder 27 point under gulvet og taber hastighedskategorien, uanset hvor
pæn den er.

---

VINDER: findbarhed=os tillid=os hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=68 a11y=100 LCP=7.5s CLS=0.00
STØRSTE HUL: A2-søgningen — vores eneste strukturelle fordel — returnerer 14 ud af 14 kort uden foto, tegnet som identiske grå piktogrammer, selv om annoncesiden lover "Vi viser ikke en tegning i stedet": giv de 51 Bikerbasen-annoncer rigtige billeder, og lad listekortet bruge samme "Ingen fotos i denne annonce"-felt som detaljesiden i stedet for at tegne en motorcykel.

### Én sætning pr. kategori

- **Findbarhed (os):** to klik fra "A2 til under 60.000" til en delbar
  URL med chips, facet-tal og en ærlighedsbanner — mens Bilbasen gemmer hvert
  eneste filter bag en modal uden ét antal og slet ikke kan spørge om kørekort.
- **Tillid (os):** forhandler/privat, CVR med link til CVR-registret,
  reklamationsret-noten, "vi gætter ikke" og "Ingen fotos i denne annonce"
  står side om side på ét blik — det gør Bilbasens resultatside intet af.
- **Hastighed (Bilbasen):** vi rammer 68 i ydelse og 7,5 s LCP mod et
  ikke-forhandlingsbart gulv på 95 og 2,5 s, og et absolut gulv gælder uanset
  hvad modparten måler.
- **Dansk følelse (os):** `129.500 kr.`, `28. jun. 2026`, A1/A2/A, Touring/
  Cruiser/Naked/Adventure/Enduro/Classic/Veteran/Cross/MX, "Se annonce",
  "Ikke oplyst" og forbeholdet om 0,2 kW/kg — skrevet af en, der selv kører.
