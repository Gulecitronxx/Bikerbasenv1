# Søgeord → side-kort — SEO content builder 2, 20.08.2026

Dansk søgeordskortlægning: hvad findes der en side for i dag, og hvad mangler.
Al inventar-data herunder er TALT — ikke gættet — mod den rigtige
produktionsdatabase (`node scripts/_scratch_facet_counts.js`, 548 aktive
annoncer, 20.08.2026, 0 egne + 548 indekserede). Det er antallet af annoncer,
en klynge rammer i dag — IKKE søgevolumen. Ingen søgevolumen-tal findes noget
sted i dette repo eller i mine værktøjer, så hvert sted, et rigtigt Google-
søgevolumen ville høre hjemme, står der "data mangler" i stedet for et gæt.
Se DECISIONS.md's egen regel: "et gættet felt vejer tungere imod os end et
manglende."

**Afhængighed, ikke afsluttet endnu:** opgaven bad mig læse builder 1's
facet-side-arbejde (type/kørekortklasse-sider) i DECISIONS.md, før jeg skrev
dette kort. Den entry findes IKKE endnu — der ligger kun et undersøgelses-
script uden commit (`scripts/_scratch_facet_counts.js`, ikke en del af
byggekæden), og der er ingen `type-*.html` eller `koerekort-*.html`-filer i
roden i skrivende stund. Kortet herunder er derfor skrevet mod det, der
FAKTISK findes NU (facetter på `soegning.html` via query-string, ingen
dedikerede statiske sider) — hver klynge, der afhænger af builder 1's
kommende sider, er markeret som sådan, og skal revurderes den dag deres
DECISIONS.md-entry lander.

---

## 1. Hovedtermer ("brugt motorcykel", "motorcykel til salg")

| Søgeord | Findes siden? | Status |
|---|---|---|
| "brugt motorcykel", "motorcykler til salg", "køb motorcykel Danmark" | `index.html` (forside) og `soegning.html` (uden filtre) | **Findes.** `index.html` har allerede Organization + WebSite + SearchAction (se afsnit 7) og en H1/hero der taler direkte til termen. `soegning.html` uden query-string er den brede landingsside. |
| "sælg motorcykel" | `opret-annonce.html` | **Findes**, men er en handling (opret annonce), ikke et opslagsværk — ingen ren SEO-tekst om at sælge. Ikke min opgave at ændre. |

Ingen handling nødvendig her — hovedtermerne har allerede en reel, indekserbar
destination. Det eneste jeg har rettet i denne klynge er brødkrummens interne
selvmodsigelse (se DECISIONS.md-entryen for denne runde): et link til
"Forside" i BreadcrumbList pegede på `index.html`, mens forsidens EGEN
canonical (sat af `scripts/build-meta.js` i en tidligere runde) er den bare
rod uden endelse. To adresser for samme side i sitets egen strukturerede
data er en selvmodsigelse, en søgemaskine kan slå ned på — ikke en
indholds-mangel, men den hørte alligevel til her, fordi den ramte netop
denne sidetype.

## 2. Mærke + model-termer ("Honda CB500F brugt", "brugt Yamaha MT-07")

**Mærkeniveau: findes, og dækningen er reel.** 26 `maerke-*.html`-sider
findes i arbejdstræet lige nu (`ls maerke-*.html | wc -l`) — op fra de 20,
seneste dom (`work/SEO-dom-runde3.md`) talte, fordi crawleren i samme runde
har tilføjet Jensens Motorcykler og Rydbergs MC som kilder (se
DECISIONS.md, "Jensens Motorcykler og Rydbergs MC er nu AKTIVE kilder").
Hver side har allerede BreadcrumbList + ItemList (`scripts/build-brand-pages.js`,
ikke min fil), begge med rene URL'er. **Dette tal er et øjebliksbillede af
et arbejdstræ i gang — en anden builders build-script kan have ændret det,
inden denne runde lander.**

**Modelniveau: findes som chips inde på mærkesiden, ikke som egne sider.**
`maerke-<slug>.html` viser op til 12 "Se {mærke} efter model"-chips, hver et
link til `soegning.html?brands=X&q=model` (`scripts/build-brand-pages.js`,
linje ~432-441). Det er en facet, ikke en landingsside: en klikker på
"MT-07" lander på et FILTRERET søgeresultat uden sin egen titel eller H1 for
netop den model (se afsnit 3's fund om, at `soegning.html`s dynamiske H1 kun
reagerer på mærke og region — IKKE på fritekst-modelsøgningen `q`).

Reelle, talte kombinationer med mest indhold at vise (mærke × type, fra
inventaret i dag):

```
Honda / Adventure     52   Harley-Davidson / Cruiser   31
Honda / Cruiser        39   Suzuki / Cruiser             8
Honda / Naked          38   BMW / Touring                 8
Honda / Touring        31   KTM / Adventure                7
```

Status: **optimér, ikke opret.** Mærkesiderne er der allerede (ikke min
fil). Det, der mangler, er at modelchips og mærke+type-kombinationer med
reelt volumen (Honda/Adventure = 52 annoncer, Harley-Davidson/Cruiser = 31)
får en EGEN titel/H1 på søgeresultatet, i stedet for at falde tilbage til
den generiske "Brugte motorcykler til salg" eller kun mærkets egen ("Brugte
Honda til salg"). Det kræver en ændring i `js/search.js`s heading-logik
(linje ~1618-1625), som ligger uden for mine filer denne runde — nævnt her,
så den ikke går tabt.

## 3. Kørekortklasse-termer ("A2 motorcykel", "motorcykel til kørekort A1")

**Facetten findes og virker; siden findes ikke.** `soegning.html?koerekort=A1`
(og `A2`, `A`) er en reel, fungerende URL — `js/search.js` linje 64
(`state.koerekort = p.get('koerekort') || ''`) læser den, og
`koerekortSvar()`/`passerKoerekort()` i `js/data.js` er sitets ene
strukturelle fordel (jf. DECISIONS.md's låste afsnit: "Bilbasen har ingen
motorcykler og kan slet ikke svare på spørgsmålet"). Talt i det reelle
lager i dag:

```
A1:      15 annoncer
A2:      34 annoncer
A:      354 annoncer
ukendt: 145 annoncer (hverken hk eller ccm oplyst nok til at afgøre det)
```

**Men:** `js/search.js`s dynamiske H1 (linje 1618-1625) reagerer KUN på
`state.brands` og `state.regions[0]` — ikke på `state.koerekort`. En bruger,
der lander på `?koerekort=A2` fra et Google-resultat, ser stadig H1'en
"Brugte motorcykler til salg", ikke noget, der nævner A2 — selvom siden
FILTRERER rigtigt (34 reelle annoncer). Samme mangel gælder `<title>` og
`<meta description>`, som er dem, `seoSearchResults()` i `js/seo.js` sætter
UD FRA `heading`-variablen fra `js/search.js`. Fejlen er altså ikke i
`js/seo.js` — den viser ærligt det, den får at vide — men i, hvad den FÅR at
vide.

Status: **afhænger direkte af builder 1.** Findes en dedikeret
`koerekort-a2.html`-side (eller tilsvarende) fra builder 1's facet-arbejde
den dag denne runde lander, er den den rigtige destination for termen, og
den bør have sin egen JSON-LD (ItemList over de 34/15/354 relevante
annoncer). Findes den IKKE, er den billigste reelle forbedring at udvide
`js/search.js`s heading-logik til også at nævne kørekortkategorien —
men det er en ændring i en fil, jeg ikke må røre denne runde
(`js/search.js` står ikke på min filliste). **Flaget her, ikke rettet.**

35 hk/48 hk-nuancen (A2's faktiske grænse er 47,59 hk, jf. DECISIONS.md
"'Maks. 48 hk' stod stadig skrevet i hånden") er allerede løst ét sted
(annoncedetaljesiden) — den hører ikke til i et søgeordskort, men er værd at
vide, hvis en fremtidig facet-side for A2 skal skrive den samme sætning.

## 4. Regionale termer

**Der ER regional infrastruktur — men kun på ét, groft niveau.** `js/data.js`
linje 13: `const REGIONS = ['Hovedstaden', 'Sjælland', 'Syddanmark',
'Midtjylland', 'Nordjylland']` — Danmarks fem landsdele. `soegning.html`
har en fungerende facet (`js/search.js` linje 166-167,
`?regions=Hovedstaden`, kan kombineres med andre filtre), og H1'en
REAGERER faktisk på den ("Brugte {mærke} til salg i {region}",
`js/search.js` linje 1623) — det er den ene facet, der allerede får sin
egen overskrift i dag.

**Men "region" her betyder landsdel, ikke by.** `js/postnumre.js` er de
1.089 danske postnumre fra Dataforsyningen/DAWA (`findPostnr()`,
`searchPostnr()`) — den bruges udelukkende til AT SLÅ OP en by ud fra et
postnummer, når en sælger opretter/redigerer en annonce (`js/annonce.js`,
`js/opret-annonce.js`, jf. DECISIONS.md "Sider uden data henter ikke
Supabase" — `findPostnr()` kaldes KUN derfra). Den er ikke koblet til
søgefacetten, og der findes INGEN by-niveau-søgning: `js/filtrering.js`
linje 157 viser, at fritekstfeltet `q` kun matcher `${l.brand} ${l.model}`
— IKKE `l.city`. En søgning på "motorcykel Aarhus" eller "brugt motorcykel
Odense" rammer altså INGEN eksisterende facet eller side i dag, kun den
brede region "Midtjylland"/"Syddanmark", hvis brugeren selv vælger den i
filterpanelet.

Status, ærligt: **regionale termer på LANDSDELS-niveau (fx "motorcykel til
salg Sjælland") har en reel, fungerende facet at pege på —
`soegning.html?regions=<navn>` — men INGEN dedikeret side/JSON-LD for den.
Regionale termer på BY-niveau (fx "motorcykel København", "brugt
motorcykel Aarhus") har SLET INGEN infrastruktur i dag** — hverken en
facet, et felt der matcher byen i fritekst, eller en side. At anbefale
byspecifikke landingssider ville være at anbefale sider for data, søgesiden
ikke kan filtrere på endnu (se reglen: "sig aldrig, at et felt findes, når
det ikke gør" — samme linje som `js/data.js`s `passerKoerekort()`). Det
kræver enten (a) at koble `l.city`/`l.postnr` ind i søgefacetten — en
ændring i `js/search.js`/`js/filtrering.js`, uden for mine filer — eller
(b) at acceptere landsdels-niveauet som det regionale granularitet, sitet
reelt tilbyder i dag.

## 5. Pris-research-termer ("motorcykel under 30.000 kr.", "hvad koster en brugt MC")

**Facetten findes.** `soegning.html?priceMax=30000` (kanonisk parameter,
`js/search.js` linje 44) virker, og der findes desuden en ældre alias
`?maxPrice=` (linje 59, læses stadig, men skrives ikke længere til URL'en —
brugt af `index.html`s hero-søgning, jf. DECISIONS.md "Forsiden og
søgesiden var uenige om, hvor mange der blev valgt fra"). Der er også
faste pris-chips (`PRIS_INTERVALLER`, `#filter-price-quick`).

**Men samme mangel som kørekort-facetten:** H1/title reagerer ikke på pris.
En bruger, der googler "motorcykel under 30.000 kr." og lander på
`?priceMax=30000`, ser "Brugte motorcykler til salg" — ikke noget, der
bekræfter prisgrænsen, selvom resultatlisten ER filtreret rigtigt. Der
findes desuden ingen research-artikel-agtig side ("Hvad koster en brugt
motorcykel i Danmark?") — kun selve filteret.

Status: **ingen dedikeret side findes; facetten findes.** En prisbånd-side
(fx "Motorcykler under 30.000 kr.") ville være en NY sidetype, jeg ikke har
mandat til at bygge denne runde (min filliste dækker ikke nye statiske
sider), og den ville kræve ægte redaktionelt indhold — ikke bare et filter
— for ikke at blive endnu en tynd facet-side. Vurderingen herfra: lavere
prioritet end kørekort- og type-klyngerne, fordi prisintervaller er
sitets EGET valg af grænser (`PRIS_INTERVALLER`), ikke en term nogen
søger efter ordret ("under 30.000 kr." er sjældnere en Google-forespørgsel
end "brugt motorcykel"-typetermer — men det er en antagelse, IKKE et talt
søgevolumen-tal, og skal behandles som sådan).

## 6. Type-termer ("cruiser motorcykel brugt", "adventure motorcykel til salg")

Ikke eksplicit nævnt i opgaven, men samme mønster som kørekort og pris, og
det ER en del af builder 1's varslede facet-arbejde, så det hører med her
for at give et samlet billede. Talt fordeling (548 annoncer):

```
(ingen type oplyst)  252     Naked        60
Cruiser                89     Touring      53
Adventure/Enduro       67     Sport        20
                              Classic/Veteran  6
                              Cross/MX      1
```

`soegning.html?types=cruiser` virker som facet (`js/filtrering.js` linje
164-165). Samme H1-mangel som afsnit 3 og 5: typen ændrer ikke
overskriften. **252 af 548 annoncer (46 %) har slet ingen type oplyst** —
det er værd at kende, fordi det sætter et loft for, hvor stort et facet-
resultat "Cruiser" osv. nogensinde kan blive uden bedre kildedata, uanset
hvor god en landingsside bliver bygget til dem.

## 7. Strukturerede sider, der allerede findes (ikke en søgeordsklynge, men relevant kontekst)

For fuldstændighedens skyld, fordi opgaven bad om at "navngive" eksisterende
sider frem for at antage huller, der ikke er der:

- **Forsiden** har allerede Organization + WebSite + SearchAction i
  `<!-- jsonld:start -->`-blokken (`scripts/build-meta.js`, `siteJsonLd()`)
  — bekræftet i rå, ikke-JS-eksekveret HTML (`curl` mod egen dev-server,
  se DECISIONS.md-entryen for denne runde). Opgavens formodning
  ("check index.html — likely missing entirely") holder IKKE — den er der,
  og den er valideret mod schema.orgs egne definitioner af `WebSite`,
  `SearchAction` og `Organization` (alle brugte egenskaber er gyldige).
  ÉN reel, dokumenteret svaghed fundet ved efterprøvning: Google FJERNEDE
  selve "Sitelinks search box"-funktionen (den rige resultat-type,
  `SearchAction` var bygget til) i november 2024 — bekræftet via Googles
  egen ændringslog (WebFetch, samme metode som forrige runde brugte til
  "Vehicle listing"-fundet). Markup'en er stadig schema.org-gyldig og
  skader intet ved at blive stående, men den udløser ikke længere nogen
  synlig Google-funktion, og det er en oplysning, den næste, der læser
  koden, bør have. `scripts/build-meta.js` er ikke min fil denne runde.
- **Mærkesider** har BreadcrumbList + ItemList allerede
  (`scripts/build-brand-pages.js`, ikke min fil) — se afsnit 2.
- **Søgeresultater** (`soegning.html`) har allerede en ItemList
  (`seoSearchResults()` i `js/seo.js`, kaldt fra `js/search.js` linje 1716)
  — men den er, med vilje og korrekt, TOM i drift i dag: alle 548 annoncer
  er indekserede (ingen egen forrenderet side), og
  `itemListElementer()` udelader posten, når `listingPageUrl()` er null.
  Det er ikke en fejl — det er samme regel som holder mærkesidernes
  ItemList tom lige nu (se C-015 i DECISIONS.md).

## 8. Opsummering — klynge → side → status

| Klynge | Eksisterende side | Status |
|---|---|---|
| Hovedtermer | `index.html`, `soegning.html` | Findes, ingen handling |
| Mærke (fx "Honda") | `maerke-<slug>.html` × 26 | Findes (ikke min fil) |
| Mærke+model (fx "Yamaha MT-07") | `soegning.html?brands=X&q=model`-chip på mærkesiden | Facet findes, egen titel/H1 mangler — optimér `js/search.js` (uden for scope) |
| Kørekortklasse (A1/A2/A) | `soegning.html?koerekort=X` | Facet findes, side/H1 mangler — **afhænger af builder 1** |
| Type (cruiser/naked/…) | `soegning.html?types=X` | Facet findes, side/H1 mangler — **afhænger af builder 1** |
| Region (landsdel) | `soegning.html?regions=X` | Facet findes OG får egen H1 — mangler kun egen `<title>`/JSON-LD |
| Region (by) | — | **Findes slet ikke** — hverken facet, fritekstmatch eller side |
| Pris ("under X kr.") | `soegning.html?priceMax=X` | Facet findes, ingen side, lavere prioritet (ingen søgevolumen kendt) |

Alt i tabellen, der siger "afhænger af builder 1", skal genvurderes den dag
deres DECISIONS.md-entry lander — den fandtes ikke, da dette blev skrevet.
