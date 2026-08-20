# SEO-indhold-dom, runde 3 — uafhængig kritikergennemgang

Metode: egen dev-server på port **8577** (unik port, ikke 8532/8541/8549, som andre
buildere/kritikere har brugt denne runde), egne `curl`-kald mod den, egen
`node scripts/build.js`-kørsel, egne Node-scripts der genskaber byggekædens
data-hentning (`fetchListings()`/`fetchExternalListings()`/`browserModules()`
fra `scripts/shared.js`) for selv at regne facit — ikke læst af på siden og
kaldt "verificeret". Egen browserkørsel (JS udført) mod både min server og
de to referencesider (dba.dk, bilbasen.dk — begge hentet live i dag, ikke
gættet). `work/DECISIONS.md` er brugt som liste over PÅSTANDE, ikke som
kilde til konklusioner — hver påstand herunder er efterprøvet uafhængigt, og
hvor den ikke holder, står det med tal.

---

## 0. Det vigtigste: stikprøve på opfundne tal

Opgavens egen prioritet. Jeg har regnet **selv**, ikke læst byggeloggen og
troet på den — et separat Node-script, der importerer `js/data.js` og
`scripts/shared.js` og henter den samme produktionsdata (548 aktive
annoncer: 0 egne, 548 indekserede), og selv beregner min/max/median/optælling.

| Påstand i siden | Sidens tal | Mit eget genberegnede tal | Match |
|---|---|---|---|
| `maerke-honda.html` meta: "262 til salg fra 4.000 kr. til 609.995 kr." | 262 / 4.000 / 609.995 | n=262, min=4000, max=609995 | ✔ |
| Honda-FAQ: "236 af de 262... medianen ligger på 119.995 kr." | 236 med pris, median 119.995 | manglerPris=26 → 236 med pris; median=119995 | ✔ |
| Honda-FAQ kørekort: "31 af 180... heraf 12 også A1... 149 kræver stort kørekort... 82 mangler" | 31/180/12/149/82 | A1=12, A2=19 (12+19=31), A=149, ukendt=82, kendt effekt=262−82=180 | ✔ |
| Honda-intro: "årgange mellem 1963 og 2026" | 1963–2026 | minYear=1963, maxYear=2026 | ✔ |
| Honda top-modeller: GL 1800 Gold Wing 18, CMX 500 Rebel 17, CRF 1100 L Africa 17 | 18/17/17 | samme tre, samme tal | ✔ |
| `maerke-ktm.html`: "13 til salg fra 44.800 kr. til 169.800 kr.", median 137.497 | 13/44800/169800/137497 | n=13, min=44800, max=169800, median=137497 | ✔ |
| KTM-FAQ kørekort: "2 af 12... 10 kræver stort... 1 annonce mangler" (ental korrekt) | 2/10/1 | A2=2, A=10, ukendt=1 | ✔ |
| `maerke-royal-enfield.html`: "7 til salg fra 58.999 kr. til 107.999 kr." | 7/58999/107999 | **Første forsøg gav mig kun 6** — se nedenfor | ✔ (efter rettelse af MIN egen fejl) |
| `type-cruiser.html`: "89 annoncer lige nu" | 89 | 89 rigtige `<article class="card card-external">`-kort talt i den faktiske HTML | ✔ |
| `type-adventure.html`: "67 annoncer lige nu" | 67 | 67 kort talt | ✔ |
| `koerekort-a1.html`: "15 annoncer", "28 annoncer mangler oplyst ccm" | 15/28 | 15 kort, 28 uden ccm | ✔ |
| `koerekort-a2.html`: "47 annoncer", "147 annoncer mangler oplyst hk" | 47/147 | 47 kort, 147 uden hk (og ikke `kanNedsaettesA2`) | ✔ |
| `type-cross.html`/`type-classic.html`/`type-scooter.html` (under tærsklen): 1/6/0 annoncer | 1/6/0 | matcher build-loggen og sidens egen tekst | ✔ |

**Royal Enfield-episoden er værd at skrive ud, fordi den viser metoden, ikke
kun resultatet:** min første, naive optælling (eksakt strengmatch på
`brand === 'Royal Enfield'`) gav 6, ikke 7 — en reel uoverensstemmelse med
siden. Ved at undersøge fandt jeg, at kildedata indeholder BÅDE
`"Royal Enfield"` og `"Royal-enfield"` som to forskellige strengværdier for
samme mærke (samme slug-kollision som SEO builder B rettede i en tidligere
runde, jf. `work/DECISIONS.md`). Byggekædens egen mærke-gruppering
(slug-baseret, ikke streng-baseret) samler dem korrekt til 7. Da jeg gruppér
på samme måde, får jeg nøjagtig 7, min=58.999, max=107.999 — identisk med
sidens FAQ. **Konklusion: ikke en fejl i siden — en fejl i min første
metode, rettet og dokumenteret, fordi det er præcis den slags fælde,
opgaven bad mig undgå at gå i uden at sige det.**

**Sælgerassistenten (`js/opret-annonce.js`), egen test — IKKE builderens
eksempler:** Login-gaten (`db.enabled && !Store.getUser()?.remote`) kræver
en ægte Supabase-session, og at fabrikere én mod produktionsbasen for en
engangstest er selv forbudt ("opret ikke konti"). Jeg har derfor, som
builder 4 selv gjorde, kørt de rene funktioner direkte i Node
(`serpTitel`, `serpBeskrivelse`, `manglerListe`, `foreslaaedeMaerkater`,
`strukturerBeskrivelse`) — men med **min egen** rodede tekst, en Kawasaki
Z900 jeg selv opdigtede (ikke MT-07/CB750/GSX-R600, builder 4's tre
eksempler):

> "saelges fordi jeg skal have en bil istedet. den koerer super fint ingen
> problemer.\nder er lidt rust ved den ene gaffelrondel, kosmetisk kun.
> skiftede kaede og tandhjul for 3 mdr siden.\nKommer med topboks som
> passer perfekt til pendling. Bytter ikke, kun salg. Seriøse henvendelser
> tak."

Effekt (hk) sat til `null` med vilje. Output:
- `koerekortMaerkat()`: `{kode: null, forklaring: "Over 125 ccm kræver mindst A2. Effekten står ikke i annoncen, så vi kan ikke afgøre, om den også kan køres på A2."}` — INGEN gættet kategori.
- `manglerListe()`: fire korrekte, feltbaserede mangler (billeder, hk, syn, service) — intet opdigtet.
- `strukturerBeskrivelse()`: mine seks sætninger gengivet **ordret** under "Fra din egen beskrivelse", inklusive "passer perfekt til pendling" — men det er MIT eget ord, ikke skabelonens. Fakta-linjen viser kun "Antal ejere: 2" og "Udstyr: Topboks" — begge felter jeg selv satte.
- Kørt en automatisk søgning efter typiske opdigtede sælgerord ("velholdt", "perfekt stand", "som ny", "fejlfri" osv.) i outputtet, der IKKE stod i min egen tekst: **ingen fundet.**

**Samlet: ingen opfundne tal fundet nogen steder i denne runde — hverken i
facet-siderne, mærkesidernes FAQ/bundindhold, eller sælgerassistenten.**
Alt sporer til en reel forespørgsel mod de samme 548 rækker. Det er den
vigtigste enkeltkonklusion i denne dom.

---

## 1. Facet-sider (type/kørekort) — builder 1

Fetchet direkte fra min server, rå HTML (ingen JS nødvendig — siderne er
forudtegnede, ikke klient-renderede):

| Side | `<title>` | `robots` | Annoncer på siden (talt i HTML) |
|---|---|---|---|
| `type-cruiser.html` | "Brugte Cruiser-motorcykler til salg — Bikerbasen" | (ingen — indekserbar) | 89 |
| `type-adventure.html` | "Brugte Adventure/Enduro..." | (ingen) | 67 |
| `type-cross.html` | "Cross/MX-motorcykler — Bikerbasen" | `noindex, follow` | 1 |
| `type-classic.html` | "Classic/Veteran-motorcykler" | `noindex, follow` | 6 |
| `type-scooter.html` | "Scooter-motorcykler" | `noindex, follow` | 0 |
| `koerekort-a1.html` | "Brugte motorcykler til A1-kørekort" | (ingen) | 15 |
| `koerekort-a2.html` | "Brugte motorcykler til A2-kørekort" | (ingen) | 47 |

Tærsklen (10) holder præcist som beskrevet: de tre noindex-sider (1, 6, 0)
ligger langt under, de fem indekserbare (15–89) langt over — der er intet
grænsetilfælde 7–9, så tærsklens præcise værdi er reelt ligegyldig, hvilket
er en god egenskab ved en tærskel.

**"Kørekort A" ikke bygget — jeg har efterprøvet BEGGE metrikker, ikke kun
den, builder 1 valgte at citere:**

```
koerekortForListing() (mindstekategori, EKSKLUSIV):  A1=15  A2=34  A=354  ukendt=145
passerKoerekort(l,'A') (kumulativ, "kan køres på…"): A1=15  A2=47  A=548 (100 %)
```

Bruges den kumulative funktion — SAMME funktion `soegning.html?koerekort=A`
rent faktisk filtrerer med i dag — er builder 1's tal korrekt: 548 af 548,
100 %, en side der ville være bogstaveligt identisk med `soegning.html`
uden filter. Det er den rigtige sammenligning, fordi det er den, en
`koerekort-a.html`-side FAKTISK ville vise, hvis den brugte samme
filterlogik som A1/A2-siderne allerede gør.

Men opgaven bad mig eksplicit tjekke den ANDEN metrik (`koerekortForListing()
=== 'A'`), og den giver 354 af 548 — **64,6 %, ikke 100 %.** Det er en reel
nuance, ingen af de to buildere har skrevet ned: en side bygget om
"mindste påkrævede kategori er stort kørekort" (parallelt med, ikke det
samme som, A1/A2-siderne) ville faktisk være en differentieret side, ikke
en dublet. Builder 1's begrundelse er ikke forkert — den er konsistent med
hvordan resten af sitets kørekortfilter reelt virker — men den er heller
ikke den eneste mulige indgang til spørgsmålet "kørekort A", og det burde
stå skrevet som et bevidst fravalg af den anden vinkel, ikke som at
spørgsmålet kun har ét svar.

**Fundet: builder 1's eget "efterslæb"-punkt 4 er FAKTISK FORKERT — deres
egen fil modsiger deres egen note.** DECISIONS.md, punkt 4 i
"SEO content builder 1 — teknisk efterslæb": *"Facet-siderne er i dag kun
nåelige via sitemap.xml og hinanden — INGEN indgående links fra
soegning.html, index.html eller maerke-*.html [...] grep'et [...] nul
træf."* Jeg har selv grebet:

```
$ grep 'href="type-\|href="koerekort-a' soegning.html index.html maerke-honda.html
soegning.html:href="type-sport.html" (+6 flere type/kørekort-links)
index.html:href="type-sport.html" (+6 flere)
maerke-honda.html: (0 træf — DENNE del af påstanden holder)
```

Begge filer indeholder en fuld blok — `<!-- facet-links:start (genereret af
scripts/build-facet-pages.js, funktionen skrivFacetLinks) -->` — med
overskrifterne "Søg efter type" og "Søg efter kørekort" og syv rigtige,
klikbare `<a href="type-*.html">`/`<a href="koerekort-a*.html">`-links.
Funktionen `skrivFacetLinks()` findes i `scripts/build-facet-pages.js`
(samme fil som skrev efterslæbs-noten) og skriver blokken ind i BÅDE
`soegning.html` og `index.html` ved hvert byg. Det er **builder 1's egen
kode, i deres egen fil**, der modsiger deres egen dokumenterede
"teknisk gæld". Sandsynlig forklaring: noten er skrevet, før
`skrivFacetLinks()` blev tilføjet, og aldrig fjernet igen — men resultatet
er, at man ikke kan stole på DECISIONS.md's beskrivelse af egen
"uafsluttet arbejde" uden selv at grebe efter det, præcis som opgaven
advarede om. Den gode nyhed: den FAKTISKE funktionalitet er BEDRE end
rapporteret (siderne ER internt linket fra to af sitets vigtigste sider),
så fejlen er i selvrapporteringen, ikke i produktet.

Den del af samme punkt, der gælder `maerke-*.html`, holder derimod: `grep`
mod alle 26 mærkesider gav reelt nul træf på `type-`/`koerekort-a`. Og
builder 1's efterslæbspunkt 2 (facet-siderne mangler i
`ANNONCER_OVER_FOLDEN` i `scripts/inline-boot.js`, så de ikke får samme
LCP-prefetch som `maerke-*.html`) er efterprøvet og **holder** — regex-listen
har fire mønstre, ingen matcher `type-*.html`/`koerekort-*.html`.

---

## 2. Struktureret data + brødkrumme-fix — builder 2

**Brødkrumme-fixet er bekræftet live**, egen browserkørsel mod
`annonce.html?id=1017` (demo, kun tilgængelig lokalt):

```json
{"@type":"BreadcrumbList","itemListElement":[
  {"position":1,"name":"Forside","item":"https://bikerbasen.dk"},
  {"position":2,"name":"Sport","item":"https://bikerbasen.dk/soegning?type=sport"},
  {"position":3,"name":"Suzuki GSX-R750","item":"https://bikerbasen.dk/annonce-suzuki-gsx-r750-2017-1017.html"}
]}
```

Ingen ".html" på de to første led, ".html" bevaret med vilje på det tredje
(egen annonces kanoniske adresse) — nøjagtig som `js/seo.js` linje ~292
skriver, og nøjagtig den fordeling, DECISIONS.md hævder.

**Google fjernede FAQ-rige resultater for almindelige sider i september
2023 — et fund INGEN af rundens fire buildere har nævnt.** WebFetch mod
Googles egen dokumentation (`developers.google.com/search/docs/appearance/
structured-data/faqpage`), citeret ordret: *"the feature is only shown for
well-known, authoritative government and health websites"* (opdateret
14. september 2023). Bikerbasen er hverken en offentlig myndighed eller en
sundhedsside — så de ti FAQPage-blokke, builder 3 har bygget denne runde
(tre spørgsmål × ti mærker), er **teknisk gyldig schema.org**, men vil ikke
udløse noget rigt FAQ-resultat i Google Search, uanset hvor korrekte
tallene er. Det er præcis samme mønster som den FORRIGE kritikers fund om
`SearchAction`/"Sitelinks search box" (fjernet november 2024) — endnu et
tilfælde af gyldig, men værdiløs strukturerede data, fordi Google har
lukket den rige resultattype for netop denne sidetype. Markup'en skader
intet ved at blive stående (den synlige `<details>/<summary>`-tekst er
værdifuld i sig selv, uafhængigt af Google), men effortet bag den tekniske
JSON-LD-del af FAQ-arbejdet leverer mindre SEO-værdi, end en læser af
DECISIONS.md ville tro.

**Non-JS-crawler-hullet** (forrige kritikers hovedfund: en rå `curl` mod en
indekseret annonce viser hverken robots-tag, canonical til kilden eller
JSON-LD — kun generisk, selv-refererende markup) er reproduceret igen af
builder 2 i denne runde, ærligt dokumenteret som IKKE rettet (kræver enten
individuelle statiske sider for 548 tredjeparts-annoncer eller et
hosting-skifte væk fra ren GitHub Pages — begge for store til én runde).
Jeg har genbekræftet med egen `curl` mod `annonce.html?id=<ekstern-uuid>`:
stadig 0 `<meta name="robots">`, 0 JSON-LD i rå HTML. Uændret risiko,
ærligt rapporteret som uændret.

---

## 3. Mærkesidernes fulde tekstpakke — builder 3

Alle stikprøvetal i afsnit 0 er herfra. Ud over dem: noindex-grænsen
(`MIN_LISTINGS_FULD_TEKST = 5`) holder — `maerke-ducati.html` (3 annoncer)
er `noindex, follow`, `maerke-honda.html` (262) er det ikke. "Andet Mærke"
(en placeholder-værdi fra kildedata, ikke et rigtigt mærke) er korrekt
`noindex` med titlen "Brugte Andet Mærke motorcykler til salg" — builder 3
har ret i, at det ER en kilde-placeholder og ikke et rigtigt mærke, men har
ikke selv rettet visningsnavnet (stadig `noindex`, så ikke en akut fejl,
men en lille skønhedsplet, der overlever ved denne dom).

**Skrivekvalitet — vurderet efter at have set alt kildedata bag hver
sætning:** "Hvad du skal tjekke"-afsnittet er type-informeret og
FAKTISK forskelligt mellem mærker, ikke skabelon-udskiftning af navnet:

- Honda (Adventure-domineret): *"Tjek styrtbøjler og fodhviler for tegn på
  et tidligere fald, kæde- og dækslitage (mange har kørt offroad), og om
  det oprindelige udstyr — bagagesystem, styrtsikring — følger med."*
- Harley-Davidson (Cruiser-domineret): *"Tjek krom og udstødning for rust,
  slitage på primærkæde eller -rem, og om sadelhøjden passer dig — en tung
  cruiser er svær at rejse op alene, hvis den vælter på stativet."*

Det er ægte, korrekt, type-specifik købsviden — ikke fyld. Det læser som
skrevet af nogen, der ved noget om motorcykler, ikke af en, der har fyldt
et {mærke}-token ind i en skabelon. Prisafsnittets sprog er også
regnestykke-ærligt uden at være kedeligt: *"den dyreste annonce koster 152
gange så meget som den billigste, så udvalget dækker både billige
startmotorcykler og dyrere modeller"* — jeg har efterprøvet: 609.995 /
4.000 = 152,5, så "152 gange" er korrekt afrundet.

De tre selvfundne fejl (dobbelt punktum efter `dkk()`, engelsk
decimalpunktum, "1 annoncer") er efterprøvet RETTET i den faktisk byggede
output — jeg har grebet efter alle tre fejlmønstre i alle ti mærkesiders
FAQ/bundindhold og fundet nul forekomster.

---

## 4. Orkestratorens CSP-fix — verificeret live med `naturalWidth`, ikke kun "ingen fejl"

Før denne runde (bekræftet mod commit `0f06f09`, sidste committede stand):
`img-src` i `index.html`s CSP havde KUN `images.danbase.dk` og
`assets.guloggratis.dk`. Arbejdstræet i dag har tilføjet
`https://www.jensensmc.dk`, `https://www.123mc.dk` og
`https://www.guloggratis.dk` (uden commit endnu).

Egen browserkørsel (`type-adventure.html`, ægte kørende Chrome, ikke curl):

| Billede | Kilde-domæne | `naturalWidth`×`naturalHeight` | CSP-brud (`securitypolicyviolation`) |
|---|---|---|---|
| `.../large-mcimgs-400_311634_...jpeg` | `www.123mc.dk` | 400×300 | ingen |
| `.../cachewebp/.../large-mcimgs-2400_...webp` | `www.jensensmc.dk` | 768×540 | ingen |
| `.../assets/files/default-listing.JA5KSJHG.svg` | `www.guloggratis.dk` | 174×150 | ingen |

Det tredje billede er selve "Gul og Gratis placeholder-image gap": deres
egen pladsholder-SVG for annoncer uden foto ligger på HOVED-domænet
(`www.guloggratis.dk`), ikke på billed-CDN'et (`assets.guloggratis.dk`),
som allerede var tilladt. Fundet ved at grebe `maerke-honda.html`s HTML
efter `guloggratis` og se, at én `<img src>` pegede på hoveddomænet mens
resten pegede på `assets.`. Alle tre er testet med en RIGTIG `new Image()`
mod CSP'en fra siden selv (ikke en antagelse) — `naturalWidth`/`Height` er
reelle pixelmål, ikke `complete:true` med et brudt billede. Fixet holder.

---

## 5. Forældet-annonce-politikken (builder 1's anbefaling) mod den faktiske kode

`scripts/build-listing-pages.js`, linje 292–300, læst direkte:

```js
const forventede = new Set(listings.map(listingSlug));
let slettet = 0;
for (const f of fs.readdirSync(ROOT)){
  if (/^annonce-.+\.html$/.test(f) && !forventede.has(f)){
    fs.unlinkSync(path.join(ROOT, f));
    slettet++;
  }
}
```

Bekræftet: **hård, øjeblikkelig sletning** (`fs.unlinkSync`), ingen
mellemtilstand, ingen "solgt"-version bevaret. Builder 1's egen beskrivelse
i DECISIONS.md ("scriptet sletter ENHVER annonce-*.html-fil, der ikke er i
mængden — ikke efterladt forældet, men fysisk fjernet") er **hverken
overdrevet eller underdrevet — den er præcis**. Anbefalingen (behold
URL'en, skift indholdet til en "ikke længere til salg"-visning, IKKE 410)
er ikke implementeret, hvilket er ærligt angivet som "ikke gjort" med en
konkret begrundelse (0 rigtige annoncer i produktion i dag, intet at teste
politikken imod). Det er en rimelig prioritering — der er reelt intet at
bryde endnu — men det betyder, at den dag den første rigtige annonce sælges
eller fjernes, forsvinder dens side tavst og uden varsel, medmindre nogen
implementerer forslaget først.

---

## 6. Blindsammenligning: DBA.dk og Bilbasen.dk, hentet live i dag

**DBA.dk (`dba.dk/mobility/browse/mc`, "MC"-kategorien):** meta description
er generisk og fælles for hele kategorien — *"Køb og salg af motorcykler på
DBA. Find det du drømmer om på DBA."* — ingen tal, ingen mærke, ingen pris.
Typefacetter (Touring, Sport, Classic/Nøgen …) findes, men er
**query-parameter-URL'er ind i samme søgemaskine**
(`dba.dk/mobility/search/mc?type=12`), ikke egne, statiske, redaktionelle
sider — nøjagtigt den arkitektur, Bikerbasen HAVDE før denne runde
(`soegning.html?type=`), og som builder 1's facet-sider netop var bygget
for at overgå. DBA har ingen FAQ, intet prisniveau-afsnit, ingen
kørekort-vejledning nogen steder på kategorisiden — DBA kan i øvrigt slet
ikke besvare kørekortspørgsmålet, samme strukturelle hul DECISIONS.md
allerede har identificeret hos Bilbasen.

**Bilbasen.dk (`bilbasen.dk/brugt/bil/bmw`, som proxy for
mærkeside-arkitektur — Bilbasen har ingen motorcykler):** titlen
("BMW - 2692 brugte til salg på Bilbasen") følger samme opskrift som
Bikerbasens ("Honda brugt – 262 til salg | Bikerbasen"), men
**meta-beskrivelsen er IKKE mærkespecifik** — den er sidens generelle,
site-wide beskrivelse ("Se alle brugte biler til salg på Bilbasen..."),
uden ét ord om BMW. Ingen synlig FAQ, intet prisniveau-afsnit, ingen
købsråd. **Men strukturerede data er reelt stærkere på ét punkt, jeg ikke
havde ventet:** Bilbasens `ItemList` på samme side har 30 rigtige
`Product`-objekter (side 1 af 2.692), hver med billeder OG en gyldig
`offers`-blok (pris + valuta) — altså et REELT, udfyldt Product-per-kort i
strukturerede data for en aggregeret listeside. Bikerbasens tilsvarende
sider (mærke- og facetsider) viser lige så mange rigtige kort visuelt (89
på `type-cruiser.html`), men har **ingen** per-kort strukturerede data på
listesiden — kun `BreadcrumbList` (og på mærkesider, `FAQPage`). Det er en
reel, målt asymmetri, ikke en formodning: Bilbasen strukturerer sine
listesiders indhold rigere end Bikerbasen gør sine, selv om Bikerbasens
side har mere REDAKTIONEL tekst omkring listen.

**Tekstkvalitet, blindt:** ingen af de to referencer har noget, der ligner
Bikerbasens FAQ eller "hvad du skal tjekke"-afsnit på disse sidetyper. Hvis
en læser fik de tre uden branding og skulle gætte, hvilken er skrevet af
nogen med domæneviden om køretøjer, er Bikerbasens den eneste af de tre,
der nævner konkrete, mekanisk relevante tjek-punkter frem for kun pris og
antal.

---

## 7. Regression og build

`npm test`, egen kørsel: **278/278 grønne**, ingen fejl, ingen ændring i
testantal fra forrige dom. `node scripts/build.js`, egen kørsel, komplet
kæde: kørte rent igennem alle otte trin (listing-pages → brand-pages →
facet-pages → srp → meta → stamp-version → inline-boot → inline-cookie →
inline-analytics → inline-critical), byggede 26 mærkesider + 10 facetsider
(7 indekserbare) + sitemap.xml med 40 URL'er (33 mærke/facet + resten
statiske), ingen fejl, ingen advarsel ud over den forventede ("ingen CSP at
udvide på: 404.html", som er korrekt — 404-siden har ingen billeder).

---

## 8. Modsigelser mellem byggerne — samlet

1. **Keyword-kort (`work/SOEGEORD-kort.md`, builder 2) er reelt forældet i
   den endelige leverance.** Filens egen mtime (18:52:19) ligger FØR
   `scripts/build-facet-pages.js` (19:19:58) og de faktisk byggede
   `type-*.html`-filer (19:21:48) — bekræftet med `ls -la`, ikke gættet.
   Dokumentet skriver selv gentagne gange "afhænger af builder 1 [...]
   findes IKKE endnu [...] skal genvurderes den dag deres DECISIONS.md-entry
   lander" — og den entry LANDEDE (samme dag, 20.08.2026), men kortet blev
   aldrig opdateret til at afspejle det. Konkret: afsnit 3 og 6 i kortet
   siger stadig "facet findes, side/H1 mangler — afhænger af builder 1",
   mens der nu FAKTISK findes syv indekserbare, egne titler/H1'er for
   præcis disse klynger. Det er ærligt varslet risiko fra forfatteren selv,
   men det betyder, at et menneske, der læser kortet i dag uden at
   krydstjekke, får et forkert billede af sitets reelle dækning.
2. **Builder 1 vs. egen fil:** se afsnit 1 — "efterslæb"-punkt 4 om
   manglende indgående links er direkte modsagt af samme builders egen
   `skrivFacetLinks()`-funktion.
3. **Builder 1 vs. builder 3, koordinationshul, STADIG åbent:** builder 3's
   `bundIndholdFor()`-kørekortafsnit (`scripts/build-brand-pages.js` linje
   ~510) linker ikke til `koerekort-a1.html`/`koerekort-a2.html`, fordi
   filerne ikke fandtes, da builder 3 skrev linket. Builder 1 bekræfter
   selv, at siderne nu findes og er "klar til at blive linket" — men ingen
   af de to har rettet `build-brand-pages.js` i denne runde (uden for
   builder 1's filliste, og builder 3's kørsel skete tidligere). Efterprøvet:
   `grep -n "koerekort-a" scripts/build-brand-pages.js` giver **0 træf** i
   dag. Et reelt, ubesat hul mellem to buildere, korrekt beskrevet af begge
   parter hver for sig, men ikke lukket af nogen.

---

## 9. Kørekort A-siden — konklusion på det specifikke spørgsmål

Bekræftet med egen beregning (afsnit 1): fravalget af en dedikeret
`koerekort-a.html` er velbegrundet UD FRA den funktion (`passerKoerekort`),
sitets øvrige A1/A2-facetter allerede bruger — 100 % af lageret ville
kvalificere, og siden ville være en bogstavelig dublet af `soegning.html`.
Det er ikke et gæt eller en bekvem afrunding: forskellen mellem 100 % og
64,6 % (den alternative, minimumskategori-baserede måling) er reel og
værd at kende, men ændrer ikke selve konklusionen — den funktion, en
`koerekort=A`-side faktisk ville bruge (fordi det er den, resten af
sitets kørekortfacet bruger), giver 548 af 548.

---

VINDER: indeksarkitektur=os tekstkvalitet=os struktureret-data=os aerlighed=holdt
STØRSTE HUL: builder 3's `bundIndholdFor()`-kørekortafsnit på alle 26 mærkesider (fx `maerke-honda.html`) linker stadig ikke til `koerekort-a1.html`/`koerekort-a2.html`, selvom begge sider nu findes og er indekserbare — et konkret, navngivet, stadig ubesat koordinationshul mellem to buildere i samme runde (rettes med to linjer i `scripts/build-brand-pages.js`s kørekortafsnit, samme mønster som prisafsnittets krydslink allerede bruger).
FANDT OPFUNDET DATA: nej, stikprøver holdt — hver tal jeg selv genberegnede (facet-sidernes annoncetal, mærkesidernes pris/median/kørekort/model-tal, sælgerassistentens output på min egen opdigtede sælgertekst) matchede en reel forespørgsel mod de samme 548 rækker; den ene uoverensstemmelse jeg fandt (Royal Enfield: 6 vs. 7) var min egen metodefejl, ikke sidens.
