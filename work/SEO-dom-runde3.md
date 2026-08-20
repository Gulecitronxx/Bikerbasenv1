# SEO-dom, runde 3 — uafhængig kritikergennemgang

Metode: egen dev-server på port 8532 (`.claude/launch.json`, `scripts/dev-server.py`),
egne `curl`-kald mod både serveren og produktion, egen browserkørsel (JS udført)
mod den samme server, egen `npm test`, egne WebFetch-opslag mod schema.org og
bilbasen.dk. Intet af det nedenstående er kopieret fra `work/DECISIONS.md` —
alle tal er genmålt. DECISIONS.md er ikke brugt som kilde til konklusioner,
kun som liste over hvad der skulle efterprøves.

---

## 1. Rå målinger — statiske sider

Hentet fra `http://127.0.0.1:8532` (identisk indhold med det, der ligger i
arbejdstræet):

| Side | canonical | description | og:url |
|---|---|---|---|
| `index.html` | `https://bikerbasen.dk` | "Bikerbasen er Danmarks mødested for køb og salg af brugte motorcykler. Søg blandt hundredvis af annoncer fra private og forhandlere." (135 tegn) | `https://bikerbasen.dk` |
| `soegning.html` | `https://bikerbasen.dk/soegning` | "Søg og filtrer blandt brugte motorcykler til salg i Danmark på Bikerbasen." (76 tegn) | `https://bikerbasen.dk/soegning` |
| `maerker.html` | `https://bikerbasen.dk/maerker` | "Find brugte motorcykler efter mærke. Se udvalget fra 20 mærker..." | `https://bikerbasen.dk/maerker` |
| `maerke-bmw.html` | `https://bikerbasen.dk/maerke-bmw` | "Se 17 brugte BMW motorcykler til salg i Danmark..." | samme |
| `maerke-honda.html` | `https://bikerbasen.dk/maerke-honda` | "Se 220 brugte Honda motorcykler..." | samme |
| `maerke-yamaha.html` | `https://bikerbasen.dk/maerke-yamaha` | "Se 21 brugte Yamaha motorcykler..." | samme |
| `maerke-royal-enfield.html` | `https://bikerbasen.dk/maerke-royal-enfield` | "Se 4 brugte Royal Enfield motorcykler..." | samme |

**Ingen ".html" i nogen af disse canonicals. Verificeret ægte:** direkte
`curl` mod PRODUKTION (ikke min server) i dag:

```
200  https://bikerbasen.dk
200  https://bikerbasen.dk/soegning
200  https://bikerbasen.dk/maerker
200  https://bikerbasen.dk/opret-annonce
200  https://bikerbasen.dk/sikkerhed
200  https://bikerbasen.dk/vilkaar
200  https://bikerbasen.dk/privatlivspolitik
200  https://bikerbasen.dk/maerke-aprilia
200  https://bikerbasen.dk/maerke-rewaco
404  https://bikerbasen.dk/maerke-royal-enfield   ← nyt mærke, IKKE deployet endnu (branch er ikke merget)
404  https://bikerbasen.dk/maerke-fb-mondial      ← samme grund
```

Builder B's forklaring for de to 404'ere holder: begge mærker kommer fra den
seneste crawl-runde (Rydbergs MC / Gul og Gratis), som endnu ikke er på
`main`. Det er ikke en fejl i ordningen — det er to sider, der endnu ikke
findes i produktion. Men **det betyder, at hvis dette sitemap blev indsendt
til Google i dag, ville to af dets 27 URL'er 404'e** — det er værd at vide,
og det kræver, at merge og deploy sker sammenhængende, ikke stykvis.

**Slug-kollisionen "Royal Enfield"/"Royal-enfield" er faktisk rettet.**
Egen kørsel af `node scripts/build-brand-pages.js`:

```
Built 20 brand pages + maerker.html + sitemap.xml (27 urls) + robots.txt
  heraf 0 annoncesider og 20 maerkesider. 392 indekserede annoncer er MED VILJE ude af sitemappet (noindex).
```

`ls maerke-*.html | wc -l` = 20. `grep -c "maerke-" sitemap.xml` = 20. Ingen
dubletter (`sort | uniq -d` på alle `<loc>` gav intet). Kørt to gange i træk:
identisk output — bygget er deterministisk, ingen drift. `maerker.html`
siger nu "20 mærker" alle tre steder, ikke "21".

## 2. Sitemap — struktur og indhold

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://bikerbasen.dk</loc><lastmod>2026-08-20</lastmod></url>
  ... 27 <url> i alt, alle statiske/mærke-sider, INGEN annonce-URL'er ...
```

`python -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"` →
gyldig XML. Ingen `noindex`-side optræder i sitemappet (jeg tjekkede
`dashboard.html`, `mine-annoncer.html`, `login.html`, `404.html`,
`afmeld.html` enkeltvis — alle har `noindex` i `<meta name="robots">`, og
ingen af dem står i `<loc>`-listen). Ingen annonce-URL er med — de 392
indekserede er bevidst udeladt, og det er den rigtige side af beslutningen
(se afsnit 5).

## 3. Én indekseret annonce (MC Syd, ingen pris)

`annonce.html?id=4c8b5adb-d56c-4490-8751-b2e7c9dfe490` ("Honda VT 700"),
efter JS har kørt (egen browserkørsel, ikke curl):

```
canonical:  https://mcsyd.dk/Produkter/Motorcykel/Brugt/Honda%20VT%20700%20Cruiser/137963?p=137963&m=1489
robots:     noindex, follow
title:      Honda VT 700 1986 hos MC Syd — Ikke oplyst — Bikerbasen
og:url:     https://bikerbasen.dk/annonce?id=4c8b5adb-d56c-4490-8751-b2e7c9dfe490
og:image:   https://bikerbasen.dk/og-image.png   (kilden har intet foto — falder korrekt tilbage)
product:price:amount:  (tag findes IKKE — korrekt, prisen er ukendt)
description: "Honda VT 700, Årgang 1986, 67.000 km, 698 ccm, Brugt. Hos MC Syd i Rødding — set på Bikerbasen."
```

JSON-LD (fuld, ordret):
```json
{"@context":"https://schema.org","@type":["Product","Motorcycle"],"name":"Honda VT 700",
 "brand":{"@type":"Brand","name":"Honda"},"model":"VT 700","vehicleModelDate":"1986",
 "productionDate":"1986","mileageFromOdometer":{"@type":"QuantitativeValue","value":67000,"unitCode":"KMT"},
 "vehicleEngine":{"@type":"EngineSpecification","engineDisplacement":{"@type":"QuantitativeValue","value":698,"unitCode":"CMQ"}},
 "itemCondition":"https://schema.org/UsedCondition"}
```

**Intet `offers`-felt.** Efterprøvet: `listing.price === null` for denne
annonce (bekræftet direkte fra Supabase via `EXTERNAL_LISTINGS`-arrayet i
browseren). Påstanden "en pris, vi ikke har, giver ikke en `null`-pris i
JSON-LD'et" holder — feltet er udeladt, ikke sat til `null`. Det er korrekt:
en `Offer` med `"price": null` er ugyldig efter schema.orgs egne regler
(price er påkrævet, når `offers` findes), og her findes `offers` slet ikke.

## 4. Én indekseret annonce (Gul og Gratis, "1971 1971"-fejlen)

`annonce.html?id=689aab1f-6674-43eb-b20e-689bbd0b64e8` ("Triumph Daytona
T100R 1971"):

```
canonical:  https://www.guloggratis.dk/annonce/10118663-865f-410e-ade9-0a1ad54d21f3/triumph-daytona-t100r-1971
robots:     noindex, follow
title:      Triumph Daytona T100R 1971 hos Gul og Gratis — 49.000 kr. — Bikerbasen
og:image:   https://assets.guloggratis.dk/images/.../189147ed-...-320x240.webp
```

Titlen har IKKE "1971 1971" — bekræftet rettet. JSON-LD har et gyldigt
`offers`:

```json
"offers":{"@type":"Offer","price":49000,"priceCurrency":"DKK",
  "availability":"https://schema.org/InStock",
  "url":"https://www.guloggratis.dk/annonce/10118663-.../triumph-daytona-t100r-1971",
  "priceValidUntil":"2026-09-19",
  "areaServed":{"@type":"Country","name":"Danmark"},
  "seller":{"@type":"Person","address":{"@type":"PostalAddress","addressLocality":"Odense SV","addressCountry":"DK"}},
  "itemCondition":"https://schema.org/NewCondition"}
```

Alle Offer-felter er reelle, gyldige schema.org-egenskaber (`price`,
`priceCurrency`, `availability`, `url`, `priceValidUntil`, `areaServed`,
`seller`, `itemCondition` — ingen af dem er opfundne).

**Men:** roden af objektet OG `offers` siger begge
`itemCondition: NewCondition` på en motorcykel fra **1971**. Det er ikke en
JSON-LD-syntaksfejl (itemCondition er en gyldig egenskab på både `Offer` og
`Product` — se afsnit 6), men det er en indholdsfejl, der modsiger sig selv
læst i sammenhæng: en 55 år gammel maskine erklæret fabriksny i
struktureret data, som Google læser maskinelt og kan sammenligne mod
sidens synlige tekst. Builder A har selv fundet og dokumenteret dette
(DECISIONS.md, "Titeldublet…") og valgt IKKE at rette det, med
begrundelsen at det ligger uden for opgavens filer. Det er en ærlig
indrømmelse, men det er stadig en reel, uafklaret fejl på præcis den type
struktureret data, opgaven bad om at validere — og den er git-committable
i dag, ikke kun et fremtidigt problem. Google straffer ikke automatisk for
den slags, men det er præcis den slags mismatch (markup vs. synligt
indhold), Googles retningslinjer for struktureret data nævner som grundlag
for en manuel handling, hvis mønsteret er systematisk. Med potentielt
hundredvis af `stand`-felter fra kilder, der ikke er econtrolleret, er det
ikke usandsynligt at mønsteret ER systematisk.

## 5. Schema.org-validering — efterprøvet mod de rigtige definitioner, ikke hukommelse

Hentet direkte fra schema.org (WebFetch, ikke gættet):

- **`itemCondition`** — "Used on these types": `Demand`, `MerchantReturnPolicy`,
  `Offer`, `Product`. **Product er med.** Builder A/B's brug af
  `itemCondition` på både objektets rod (typen `["Product","Motorcycle"]`,
  hvor Product-delen dækker) og inde i `offers` er derfor gyldig — ikke en
  fejl, som jeg først mistænkte den for at være.
- **`mileageFromOdometer`** — "Used on these types": `Vehicle`. Da
  `Motorcycle < Vehicle < Product < Thing` (bekræftet fra schema.orgs egen
  typehierarki-side), er egenskaben gyldig på et objekt typet
  `["Product","Motorcycle"]`, fordi Motorcycle nedarver Vehicle.
- Type-listen `["Product","Motorcycle"]` er selv gyldig JSON-LD — schema.org
  tillader en array af typer på samme objekt.

**Konklusion: JSON-LD'et er teknisk spec-gyldigt.** Builder A's begrundelse
for typevalget (Googles "Vehicle listing"-rige resultat er lukket, ren
Product mangler domæne til køretøjsegenskaber) holder til efterprøvning.

## 6. Regressionstjek

`npm test`: **278/278 grønne**, egen kørsel, ikke kopieret fra
DECISIONS.md:
```
# tests 278
# pass 278
# fail 0
```

`js/seo-adresser.test.js` linje 121 låser stadig præcis:
```js
assert.equal(listingPageUrl(egen()), 'https://bikerbasen.dk/annonce-ktm-rc-390-2021-1032.html');
```
— testen kører grøn, og den EGNE annonces canonical (`.html` bevaret med
vilje, se DECISIONS.md's egen begrundelse) er intakt.

## 7. Rå fetch (ingen JS) vs. browser (JS kørt) — kvantificeret

Dette er det centrale hul i denne runde. `curl` mod PRÆCIS den samme URL som
afsnit 3, uden at eksekvere noget JavaScript:

```
$ curl -s "http://127.0.0.1:8532/annonce.html?id=4c8b5adb-..." | grep -Eo \
  '<title>[^<]*</title>|<link rel="canonical"[^>]*>|<meta name="description"[^>]*>|<meta name="robots"[^>]*>'

<title id="page-title">Annonce — Bikerbasen</title>
<link rel="canonical" href="https://bikerbasen.dk/annonce">
<meta name="description" content="Se billeder, specifikationer og kontaktoplysninger for denne brugte motorcykel til salg på Bikerbasen.">
```

**Ingen `<meta name="robots">`-tag overhovedet i den rå HTML** (`grep -c
'name="robots"'` → 0). Ingen `<script type="application/ld+json">`
overhovedet. Canonical peger på den GENERISKE `/annonce` (den statiske
byggeblok fra `build-meta.js`) — ikke på MC Syds URL, og ikke tom.

Sammenlign med afsnit 3 (samme URL, JS kørt):

| Signal | Rå HTML (curl, ingen JS) | Efter JS (browser) |
|---|---|---|
| `<title>` | "Annonce — Bikerbasen" (generisk) | "Honda VT 700 1986 hos MC Syd — Ikke oplyst — Bikerbasen" |
| canonical | `https://bikerbasen.dk/annonce` (generisk, SELV-refererende) | `https://mcsyd.dk/...` (kildens URL) |
| robots | **fraværende** (standard = indekserbar) | `noindex, follow` |
| og:title/og:image | generisk "Annonce — Bikerbasen" / `og-image.png` | annoncespecifik |
| JSON-LD | **ingen** | `["Product","Motorcycle"]`-blok |

**To konkrete konsekvenser:**

1. **Delesider (Facebook, Messenger, Discord, iMessage, en MC-gruppe på
   Facebook) ser IKKE det, DECISIONS.md hævder.** Builder A skrev: "Titel,
   description og og:-billede er derfor STADIG annoncespecifikke (mærke,
   model, pris, kilde), uanset canonical-retningen." Det er **ikke sandt for
   ikke-JS-eksekverende systemer** — og de fleste sociale link-preview-bots
   (Facebook/Meta's crawler, Twitter/X-kortet, mange Discord/Slack-unfurls)
   kører IKKE JavaScript. En delt annonce vil vise det generiske "Annonce —
   Bikerbasen"-kort med standard-og-billedet på 392 af 392 sider, ikke
   motorcyklens billede og pris. Det er en påstand i DECISIONS.md, der ikke
   holder ved efterprøvning — den eneste af rundens "verificeret"-påstande,
   jeg fandt direkte modsagt af mine egne tal.
2. **For Google specifikt er risikoen reel, men mindre alvorlig, og
   dokumenteret af Google selv.** Googles egen dokumentation
   (developers.google.com/search/docs/crawling-indexing) formulerer det
   generelt sådan: "Google typically renders pages in order to index them,
   however rendering is not guaranteed." Google anbefaler eksplicit IKKE at
   stole på indhold/regler, der først tilføjes af JavaScript, netop fordi
   rendering kan udelades eller forsinkes. I praksis: Googlebot crawler
   typisk i to bølger (rå HTML først, rendering-kø bagefter, som kan tage
   fra timer til flere dage), og de fleste observatører (inkl. Google selv)
   bekræfter, at Google I DAG normalt når at rendere JS-tunge sider — men
   "normalt" er ikke "garanteret", og for et 9 dage gammelt domæne uden
   oparbejdet crawl-budget er der ingen garanti for, at Googlebot prioriterer
   render-runden højt eller hurtigt for lige netop disse 392 sider. Så længe
   rendering lykkes, ender resultatet korrekt (noindex + kilde-canonical).
   Fejler eller forsinkes den, er den midlertidige/worst-case tilstand: en
   indekserbar side uden noget indhold i den rå DOM ud over generisk
   markedsføringstekst, med canonical til SIN EGEN generiske søsterside.
   Det er ikke katastrofalt (siden peger stadig ikke ud af domænet), men det
   er det modsatte af den kontrol, Builder A tror er opnået.

**Ingen af de to builders har flagget dette kvantitativt** — DECISIONS.md
nævner "delesiden er en anden beslutning end Googles indeksering" som om
sagen er afgjort, men har ikke selv kørt en rå fetch for at se, hvad et
ikke-JS-system faktisk modtager. Det er præcis den slags påstand, opgaven
bad om at IKKE tage for givet, og den holder ikke.

## 8. Sammenligning med Bilbasen — kun hvor det er en reel målestok

- **Canonical-konvention:** `curl` mod `https://www.bilbasen.dk/` (egen
  User-Agent, ingen JS): `<link rel="canonical" href="https://www.bilbasen.dk"/>`
  — bar rod, ingen efterfølgende skråstreg. Samme mønster som Bikerbasens
  egen forside efter denne runde. Konventionen er ens; formatet er hentet
  korrekt af Builder B.
- **robots.txt:** Bilbasen har en lang liste `Disallow`-stier (interne
  søgefiltre, PDF'er, webservices, API'er, print-visninger) plus
  `Sitemap: https://www.bilbasen.dk/sitemap_index.axd`. Bikerbasens
  `robots.txt` er `Allow: /` + én sitemap-linje. Det er ikke en fejl —
  Bikerbasen har (endnu) ikke de samme interne stier, der skal beskyttes
  mod indeksering (ingen intern søgefacet-eksplosion, ingen PDF'er). En
  identisk, tom robots.txt ville faktisk være FORKERT for Bikerbasen, hvis
  søgefacetter (allerede lagt i tidligere runde med noindex pr. side, ikke
  robots.txt) begynder at generere uendelige URL-kombinationer.
- **Sitemap-struktur:** Bilbasen deler sit sitemap i 19 delsitemaps efter
  indholdstype (biler, forhandlere, byer, mærke-til-model osv.) — en skala,
  der ikke er relevant for et 9 dage gammelt site med 0 egne annoncer. Ikke
  en fair sammenligning at kræve.
- **Indekserede annoncer:** Jeg forsøgte at hente en konkret Bilbasen-
  bilannonce for at sammenligne canonical/JSON-LD direkte, men
  `bilbasen.dk/brugt/bil` svarer `202` uden indhold til automatiserede
  User-Agents (botbeskyttelse) — jeg kunne ikke hente en levende
  annonceside. Det ændrer ikke min vurdering: Bilbasens lager er
  første-parts (egne annoncer, egen kontrol over friskhed), og det er
  velkendt og udokumenteret modsagt at Bilbasen selv-canonicaliserer og
  indekserer sine egne annoncer. Den sammenligning er STRUKTURELT forskellig
  fra Bikerbasens situation (392 af 392 er tredjeparts, aggregeret,
  ukontrolleret friskhed) — at kræve, at Bikerbasen skal opføre sig som
  Bilbasen her, ville være at ignorere netop den forskel, opgaven bad mig
  tage højde for. Jeg lægger derfor IKKE vægt på denne sammenligning i min
  vurdering af den strategiske beslutning (afsnit 9).

## 9. Et fund, ingen af builderne nævnte: breadcrumb-URL'er på EGNE annoncer bruger stadig ".html"

`js/seo.js` linje 91: `item: \`${SITE_URL}/${it.path}\`` med
`path: 'index.html'` og `path: 'soegning.html?type=...'` (linje 276-277).
`scripts/build-listing-pages.js` linje 97-98 gør det samme
(`${BASE}/index.html`, `${BASE}/soegning.html?type=...`). Begge bruges KUN
til `BreadcrumbList`-strukturerede data på egne annonceside (0 i
produktion i dag, så ingen live-skade endnu) — bekræftet ved egen
browserkørsel: den eksterne annonceside (afsnit 3+4) har INGEN
`BreadcrumbList`, kun `vehicle`.

Det betyder: Builder B's ".html"-oprydning af canonical/og:url for forside
og søgeside blev IKKE fulgt op i `breadcrumb()`, som stadig bygger
`https://bikerbasen.dk/index.html` og `https://bikerbasen.dk/soegning.html?type=…`.
Den dag den første egne annonce får en `annonce-<slug>.html`-side (via
`scripts/build-listing-pages.js`), vil dens `BreadcrumbList` pege på URL'er,
der IKKE er de kanoniske adresser for forsiden/søgesiden — en selvmodsigelse
inde i sitets egen strukturerede data, mellem to filer, ingen af builderne
koordinerede om. Ikke en akut fejl (0 påvirkede sider i dag), men uafsluttet
arbejde, der IKKE står nævnt i DECISIONS.md nogen steder.

---

## 10. Den strategiske beslutning — egen vurdering

**Hvad der faktisk står på spil:** 9 dage gammelt domæne, nul oparbejdet
autoritet, 392 af 392 synlige annoncer er tredjeparts vareliste (pris, foto,
beskrivelsens første linje er kildens egne ord, citeret). Runde 3's forrige
dom (`work/DOM-annonce-runde3.md`, linje 336-338) fandt: alle 392 var
`noindex` med FÆLLES canonical, og de 51 (nu 0) egne annoncer havde en
canonical, der gav 404. Det værste fund var altså ikke "noindex er forkert"
— det var "canonical peger et sted, der ikke findes, og alle 392 sider deler
én adresse, så Google ikke engang kan skelne dem". Det er PRÆCIS det,
denne runde retter (kilde-canonical, individuel pr. annonce), uden at ændre
selve noindex-beslutningen.

**Min vurdering: HOLD beslutningen — men den er mere skrøbelig, end
DECISIONS.md indrømmer, af grunden i afsnit 7.**

Grundene til at holde:
1. Indholdet er reelt tyndt i Googles forstand — pris, foto og
   beskrivelsens første linje ER kildens, ikke omskrevet. 392 sider, der i
   det store hele genudgiver en andens vareliste under et nyt domænenavn,
   er den definition af aggregator-indhold, Googles kvalitetsvejledning
   specifikt nævner. At risikere HELE domænets kvalitetssignal på 392 sider,
   ingen af dem originale, ni dage inde i domænets levetid, er den forkerte
   rækkefølge at tage risici i.
2. Friskhedsgarantien holder ikke — motorcyklen kan være solgt, prisen
   ændret, og Bikerbasen har ingen mekanisme, der opdager det før næste
   crawl. At bede Google indeksere og rangere noget, der kan være forkert i
   morgen, er et løfte, siden selv siger den ikke kan holde.
3. Et udfyldt canonical til kilden (fremfor tomt) er faktisk den rigtige
   tekniske løsning for "duplikeret/spejlet indhold" — det er Googles egen
   anbefaling til den situationstype, og det er en STRAMMERE, ikke løsere,
   variant af den oprindelige (forkerte) fælles-canonical-fejl.

Men beslutningen har en pris, som DECISIONS.md underspiller: **en 9 dage
gammel motorcykel-markedsplads med 0 egne annoncer har lige nu bogstaveligt
talt INGEN vej ind fra en Google-søgning på en specifik motorcykel.** Det er
ikke bare "forsigtigt" — det er et site, en køber kun kan finde ved allerede
at kende navnet "Bikerbasen". Det gentager, punkt for punkt, det forrige
runders kritiker kaldte sitets "nær-nul findbarhed", bare med en bedre
begrundet årsag.

**Mellemvejen, jeg ville have valgt i stedet, findes, og den er ikke den,
Builder A afviste (selv-canonical + index på alle 392):** indekser de
annoncer, hvor Bikerbasen selv lægger en EFTERPRØVELIG, ikke-triviel
oplysning til, som kilden ikke har — kørekortkategori (A1/A2/A) beregnet af
`koerekortForListing()` er den kandidat, DECISIONS.md selv kalder "den ene
strukturelle fordel, en bilside aldrig kan tage fra os". En annonce, hvor
Bikerbasen kan sige "denne motorcykel kan køres på A2" og kilden ikke siger
det nogen steder, er ikke længere ren duplikering — det er en side, der
svarer på et spørgsmål, originalen ikke besvarer. Kriteriet er objektivt
målbart i data i dag (`koerekortForListing(l) !== null`), kræver ingen ny
tekst, ingen ny research, og rammer formentlig et mindretal af de 392 (de
fleste eksterne annoncer mangler hk, jf. DECISIONS.md's egen måling: "332
annoncer mangler den oplysning"). Et selv-canonical KUN på den delmængde,
plus `noindex` uændret på resten, er en risiko, der matcher værdien
kildernes annonce faktisk har fået tilført — i stedet for alt-eller-intet.
Det er mere arbejde end at flippe en switch, og det kræver et nyt filter i
byggekæden/sitemap-logikken, så det er en rimelig ting at UDSKYDE til en
kommende runde — men det bør stå som en navngiven beslutning, ikke som en
implicit "måske senere".

---

VINDER: teknisk-korrekthed=os findbarhed=for tidligt at afgøre struktureret-data=os
STØRSTE HUL: De 392 indekserede annoncers noindex/canonical/JSON-LD sættes udelukkende via JavaScript efter første maling — en rå, ikke-JS-eksekverende hentning (bekræftet med curl) ser hverken robots-tag, kilde-canonical eller JSON-LD, kun en generisk, selv-refererende canonical, hvilket gør DECISIONS.md's påstand om "stadig annoncespecifikke" delingskort for sociale platforme direkte forkert — løsningen er at forrendere robots/canonical/og-tags for de 392 eksterne annoncer på samme måde, `scripts/build-listing-pages.js` allerede gør for egne annoncer, i stedet for at lade dem stå 100 % klient-renderede.
DEN STRATEGISKE BESLUTNING: Hold noindex/canonical-til-kilde for de 392 tredjeparts-annoncer som udgangspunkt — begrundelsen (tyndt/ukontrolleret indhold på et 9 dage gammelt domæne uden autoritet) holder ved efterprøvning og er en strammere, ikke løsere, udgave af forrige runders faktiske fejl (fælles canonical, 404-mål). Men flip den IKKE til alt-eller-intet: indfør en navngiven mellemvej, hvor de annoncer, hvor `koerekortForListing()` faktisk kan udlede en kørekortkategori kilden ikke selv oplyser, får selv-canonical + index — det er den objektivt målbare delmængde, hvor siden reelt lægger noget til, og det giver domænet en lille, kontrolleret mængde indekserbart indhold uden at vædde hele markedspladsen på 392 sider, der i dag er 100 % citeret fra andre.
