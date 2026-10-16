# Dom: annoncesiden, runde 3

Frisk dommer. Jeg har ikke læst `work/DECISIONS.md`, ingen tidligere domme og
ingen kildekode. Jeg dømmer det, en dansk motorcykelkøber ser i browseren.

## 0. Opsætning — så tallene kan efterprøves

| Forhold | Værdi |
|---|---|
| Server | egen, `PORT=8791 python scripts/dev-server.py` (ikke 8532) |
| Sessioner | udlogget, `localStorage`+`sessionStorage` ryddet før hver måling |
| Cookiemur | afvist med **"Kun nødvendige"** før hver måling |
| Bredde målt **inde i siden** | `innerWidth` = 1440 og 390 på hver eneste måling |
| Katalog på localhost | 443 annoncer: **51 egne** (kun demo) + **332 MC Syd** + **60 Gul og Gratis** |
| Produktion i dag | 0 egne, 392 indekserede → **100 % af det, en rigtig gæst ser, er den indekserede type** |
| Lighthouse | 12.8.2, mobil, `cpuSlowdownMultiplier=4` |
| axe-core | 4.10.2, `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice` |

Jeg høstede alle 443 søgekort på tværs af 19 sider, kørte kørekortfiltret i alle
tre stillinger og åbnede 80+ detaljesider.

---

## 1. Kørekortspørgsmålet — den prøve der betyder mest

### 1.1 A2-loftet er ramt præcist. Det er den ene ting jeg roser uforbeholdent.

35 kW ÷ 0,7355 = **47,6 hk**. Grænsen skal altså ligge mellem 47 og 48 hk.

| Model | Effekt | = kW | Kort | Detaljeblok | Detaljetabel |
|---|---|---|---|---|---|
| KTM 390 Duke | 44 hk | 32,4 | Kørekort A2 | A2 | A2 (vejledende) |
| Honda CMX 500 Rebel | 46 hk | 33,8 | Kørekort A2 | A2 | A2 (vejledende) |
| Honda CL 500 A | 47 hk | 34,6 | Kørekort A2 | A2 | A2 (vejledende) |
| Royal Enfield Super Meteor 650 | 47 hk | 34,6 | Kørekort A2 | A2 | A2 (vejledende) |
| **Suzuki GSF 650 S Bandit** | **48 hk** | **35,3** | **Kørekort A** | **A** | **A (vejledende)** |
| **Honda CB 500** | **48 hk** | **35,3** | **Kørekort A** | **A** | **A (vejledende)** |
| **Aprilia RS 457** | **48 hk** | **35,3** | **Kørekort A** | **A** | **A (vejledende)** |
| **Royal Enfield Continental GT 650** | **48 hk** | **35,3** | **Kørekort A** | **A** | **A (vejledende)** |
| Sym XS 125 | 11 hk | 8,1 | Kørekort A1 | A1 | A1 (vejledende) |
| FB Mondial HPS 125 | 14 hk | 10,3 | Kørekort A1 | A1 | A1 (vejledende) |

**11 af 11 enige, og skiftet falder nøjagtigt mellem 47 og 48 hk.** Der er 39
annoncer med 48 hk i basen — ingen af dem kaldes A2. Det er korrekt, og det er
ikke tilfældigt: 24 er Honda CMX/NX/CB 500-modeller, hvor fristelsen til at
kalde dem "A2-motorcykler" er størst.

### 1.2 Men badge og filter er uenige — og de er uenige om A1

| Kørekort-chip | Facettal | Kort høstet | Badge-fordeling blandt de fundne |
|---|---|---|---|
| A1 (lille mc) | 17 | 17 | 17 × A1 |
| A2 (mellem mc) | 47 | 47 | 32 × A2 + **15 × A1** |
| A (alle mc) | 443 | 443 | alt |

Sidens egen forklaring på A2-chippen lyder: *"A2 dækker også A1-motorcykler, så
de er talt med."* Der er 17 annoncer med A1-badge. A2-filtret finder kun 15 af
dem. **To A1-annoncer falder ud af A2-filtret:**

| Id | Model | Kubik | Effekt | Badge | I A1-filter | I A2-filter |
|---|---|---|---|---|---|---|
| `2a136714…` | Honda MSX 125 | 125 ccm | **Ikke oplyst** | Kørekort A1 | ja | **nej** |
| `9fd5ee7c…` | Honda MSX 125 | 125 ccm | **Ikke oplyst** | Kørekort A1 | ja | **nej** |

Årsagen står på detaljesiden for `2a136714…`, ordret:

> **A1** — Du kan køre den på A1-kørekort
> Maks. 125 cm³ **og 15 hk**. Regnet ud fra **125 ccm** og vejledende …

Siden opstiller selv to betingelser, oplyser at den kun kender den ene — og
konkluderer alligevel **"Du kan køre den på A1-kørekort"**. Detaljetabellen har
slet ingen Effekt-række. Fire linjer længere nede står husreglen:

> *"Mangler et felt, har de ikke oplyst det — vi udfylder ikke huller med gæt."*

Her gættes der. Og gættet går den forkerte vej: A1 er den **strammeste**
kategori, så en flad A1-påstand er en aktiv tilladelse til en 17-årig. Sammenlign
med hvordan siden behandler præcis samme mangel over 125 ccm:

> **A2/A** — Vi kan ikke afgøre, hvilket kørekort der skal til.
> *"Over 125 ccm kræver mindst A2. Effekten står ikke i annoncen hos kilden … Det,
> vi ved, er at A1 er udelukket … Spørg MC Syd, før du regner med A2."*

Det er forbilledligt. Reglen er bare kun slået til i den ene retning.
**Under 125 ccm uden effekt → påstand. Over 125 ccm uden effekt → ærlighed.**

Latent fejl i samme regel: chippens hjælpetekst siger *"Maks. 125 cm³ og 15 hk"*.
15 hk = **11,03 kW**, og A1-loftet er 11 kW. Rundingen går altså i købers disfavør.
Ingen aktuel annonce ligger på 15 hk, så den bider ikke i dag — men den ligger der.

### 1.3 Fire forskellige danske ord for "vi ved det ikke"

| Sted | Ordlyd | Antal annoncer |
|---|---|---|
| Søgekort, kubik kendt | "Kørekort ikke afgjort" | 110 |
| Søgekort, intet kendt | "Kørekort ukendt" | 15 |
| Detaljetabel | "Kan ikke afgøres" | samme annoncer |
| Detaljeblok | "A2/A — Vi kan ikke afgøre …" | samme annoncer |
| Søgekort, egne annoncer uden effekt | **ingen badge overhovedet** | 8 |

Samme tilstand, fire etiketter, og på egne annoncer helt tavshed. En køber, der
scanner en liste, kan ikke se at "ikke afgjort" og "ukendt" betyder det samme.

### 1.4 Vores **egne** annoncer får den dårligste kørekortoplysning

| Annoncetype | Hvad køberen ser | Forbehold synligt? |
|---|---|---|
| MC Syd / Gul og Gratis | blok: "A1 — Du kan køre den på A1-kørekort" + regel + udregning + "vejledende" + "få det bekræftet hos kilden" + linje i "Før du kører derhen" | **ja, 3 steder** |
| Egen annonce (`1048`) | et badge med teksten **"KØREKORT A1"**. Intet andet. | **nej — kun i `title=`-tooltip** |

Tooltippen findes (*"Udledt af 125 ccm og 11 hk — vejledende …"*), men et
`title`-attribut er usynligt på mobil og for de fleste på desktop. På de annoncer,
hvor Bikerbasen selv er afsenderen og selv bærer ansvaret, står kategorien altså
som en bar kendsgerning. Bilbasen har ikke problemet — biler har ikke
kørekortklasser. Det her er vores egen opfindelse og vores eget ansvar.

---

## 2. Kort mod detalje: enige. Målt.

46 indekserede annoncer, felterne Årgang / Kilometer / Kubik / Effekt:

| Felter sammenlignet | Reelle modsigelser |
|---|---|
| **184** | **0** |

To tilsyneladende afvigelser (`037f14e6…`, `140deaa6…`) sporede jeg til min egen
høster, der greb ned i "Lignende motorcykler"; efterset i hånden er kort og
detalje ordret ens. Kørekort-badge: 0 modsigelser på tværs af alle 58 stikprøver.

Kun ordvalget skrider:

| Tilstand | På kortet | På detaljesiden |
|---|---|---|
| Pris ukendt | "Pris ved henvendelse" | "Ikke oplyst — spørg MC Syd" |
| Kørekort ukendt | "Kørekort ikke afgjort" | "Kan ikke afgøres" |

**Men ét felt forsvinder helt.** Alle 60 Gul og Gratis-kort siger
**"Privat sælger · guloggratis.dk"**. På **0 af 16** kontrollerede
Gul og Gratis-detaljesider findes en Sælger-række. MC Syd-siderne har den
(10 af 10: "Sælger · Forhandler · MC Syd"). Det er præcis det felt, der afgør
købers retsstilling — og det er det, der falder væk.

---

## 3. Manglende fotos: ingen løgn. Ros.

57 af 443 annoncer (12,9 %) har intet foto. Jeg åbnede 18 af dem. **0 af 18 viste
et opdigtet, illustrativt eller substitueret billede.** `<img>`-tællingen er nul.

| Type | Ordlyd på detaljesiden |
|---|---|
| Egen annonce | "Ingen fotos i denne annonce — Sælgeren har ikke lagt billeder op. **Vi viser ikke en tegning i stedet** — bed sælgeren om fotos af netop den her motorcykel, før du kører efter den." |
| Indekseret | "MC Syd har ikke sat et foto på den her annonce. Vi viser det foto, kilden selv lægger på annoncen, og her er der ingen. **Bed MC Syd om billeder, før du kører efter den.**" |

Det er sagt lige ud, og det siger hvad køberen skal gøre. Det er bedre end
branchen. Det er også den eneste plads, hvor vi klart slår Bilbasen.

**Til gengæld: der findes intet galleri.** Ingen af de 443 annoncer viser mere end
ét billede. På de indekserede henvises der i stedet ud af huset:
*"Flere billeder af netop denne motorcykel finder du i deres annonce."*
Bilbasens samme skærm rummer 23 fotos med miniaturestribe og "+20".

Og det ene billede vi har, er strakt:

| Kilde | Naturlig størrelse | Vist 1440 | Faktor | Vist 390 | Faktor |
|---|---|---|---|---|---|
| MC Syd | 596×447 | 704×440 | 1,18× | 390×293 | 1,00× |
| **Gul og Gratis** | **320×240** | **704×440** | **2,20×** | 390×293 | 1,22× |

Alle 60 Gul og Gratis-annoncer viser en 320×240-miniature blæst op til 704 px
bredde. Det er synligt uskarpt på en 124.800 kr.-vare. MC Syd-fotoet har oven i
købet kildens eget vandmærke ("https://mcsyd.dk") brændt ind i pixlerne.

---

## 4. Kilden: oplyst tidligt, tydeligt og gentaget. Ros.

På en indekseret side møder køberen kilden **fem gange, før der kan klikkes**:

| # | Placering (mobil, y) | Tekst |
|---|---|---|
| 1 | 95 | "Motorcyklen står hos MC Syd, mcsyd.dk. MC Syd er motorcykelforhandler i Rødding, og det er dem, du køber af." |
| 2 | ~530 | "Foto: MC Syd." |
| 3 | ~640 | "Forhandlerannonce" |
| 4 | 711 | overskrift **"PRIS HOS MC SYD"** — ikke bare "Pris" |
| 5 | ~1500 | "Annonce-id hos MC Syd: 180898" + "Annoncen blev hentet hos MC Syd 16. aug. 2026" |

Knappen hedder **"Se annoncen hos MC Syd"**, bærer et eksternt-link-ikon og går
til `https://mcsyd.dk/Produkter/Motorcykel/Brugt/…/180898`. Ingen mellemside,
ingen omdirigering, ingen skjult ramme. Det er ærligt, og det er bedre end
markedsstandarden for aggregatorer.

Skelnen mellem forhandler og markedsplads er også korrekt formuleret:
MC Syd → *"det er dem, du køber af"*; Gul og Gratis → *"Gul og Gratis er en
markedsplads … du handler med sælgeren bag annoncen, ikke med Gul og Gratis."*

Ét stykke tekst er dog genbrugt uden at være læst igennem. På **alle** Gul og
Gratis-sider står:

> *"Gul og Gratiss kontaktoplysninger og åbningstider står på deres egen side."*

En rubrikmarkedsplads har ingen åbningstider, og siden selv har to linjer
tidligere skrevet at man **ikke** handler med Gul og Gratis. Det er
forhandler-teksten kopieret over på markedspladsen.

---

## 5. Fabriksny under "brugte motorcykler": oplyst. Ros.

| Sted | Hvad der vises |
|---|---|
| Søgekort | chip **"Ny"** ved prisen |
| Detalje, øverst | "Det her er en fabriksny motorcykel. Annoncen ligger i … katalog over nye motorcykler, ikke blandt de brugte." |
| Detaljetabel | "Stand: Fabriksny" |

Ca. 65 af 443 annoncer er 2025/2026-modeller uden kilometertal. Det er oplyst tre
steder. Godt.

---

## 6. Jura: rigtig hos forhandleren, forkert hos privatsælgeren

26 detaljesider gennemgået for de juridiske sætninger:

| Kilde | n | "Sælger"-række | Privat-advarsel | Forhandler-24-mdr | **"køber med garanti"** |
|---|---|---|---|---|---|
| MC Syd (forhandler) | 10 | **10/10** | 0/10 | **10/10** | 0/10 |
| Gul og Gratis (privat) | 16 | **0/16** | **0/16** | 0/16 | **6/16 (37,5 %)** |
| Egen, privat (`1042`, `1048`) | 2 | — | **2/2** | 0/2 | 0/2 |

MC Syd-linjen er korrekt og står kun der, hvor den gælder:
*"Forhandlerannonce. Du har som privatperson reklamationsret i op til 24 måneder
efter købelovens regler for erhvervsmæssigt salg."*

Vores egne private annoncer er også korrekte:
*"Privat annonce. Forbrugerkøbelovens reklamationsret gælder ikke mellem private.
Aftal et grundigt eftersyn og prøvetur, før du køber."*

**Gul og Gratis er forkert på begge led.** Alle 60 kort siger "Privat sælger".
Ingen af siderne gentager det, ingen af dem bærer privat-advarslen — og på ca.
37 % (≈22 annoncer) står i stedet:

> *"Du køber **med garanti** frem for forbrugerkøbelovens reklamationsret …"*

Konkret eksempel, `328dc95d…` (Royal Enfield Classic 650, 95.000 kr., Terndrup):
kortet siger "Privat sælger · guloggratis.dk"; siden lover garanti. **Mellem to
private er der hverken reklamationsret eller lovbestemt garanti.** Sætningen er
en juridisk påstand, der er både forkert og placeret præcis dér, hvor den ikke
gælder — og den beskytter samtidig køberen mod at få den advarsel, han skulle have
haft. Sætningen stammer åbenlyst fra forhandler-tilfældet ("nyt køretøj fra
forhandler") og er koblet til `Stand = Fabriksny` i stedet for til sælgertypen.

---

## 7. Kontaktflow ende til ende

| Annoncetype | Andel af produktion | Vej til sælger |
|---|---|---|
| Indekseret | **100 %** | én knap: "Se annoncen hos MC Syd/Gul og Gratis" → kildens site. Ingen besked, ingen telefon, ingen favorit, ingen "Anmeld annonce" på siden. |
| Egen | 0 % i dag | "Skriv til sælger" + "Vis nummer" → begge til `login.html?redirect=%2Fannonce.html%3Fid%3D1042` |

Loginmuren er begrundet på siden — *"Kontaktoplysninger og sælgerens navn er kun
synlige for indloggede brugere. Det holder telefonnumre væk fra robotter og
reklamehenvendelser."* Det er en fair afvejning, og Bilbasen gater også beskeder.

Men konteksten går tabt i overgangen. Klikker man "Vis nummer" på en Husqvarna FE
501, lander man på:

> "Velkommen til Bikerbasen — Log ind for at gemme annoncer, sende beskeder og
> oprette dine egne annoncer."

`?redirect=` er teknisk med, men teksten nævner hverken motorcyklen, sælgeren
eller hvorfor man kom. Bilbasens mobil giver til sammenligning **"Ring op"** som
direkte handling øverst på skærmen.

---

## 8. Mobil 390 — her taber vi tydeligst

20 annoncer målt ved `innerWidth = 390`, y er afstand fra dokumentets top.

| Id | Kilde | Pris y | Kørekort y | **CTA y** | docW | docH | Fast handlingsbjælke |
|---|---|---|---|---|---|---|---|
| 0098fee2 | MC Syd | 711 | 869 | **2716** | 390 | 6040 | **nej** |
| 028653e2 | MC Syd | 711 | 785 | **2588** | 390 | 5911 | **nej** |
| 03178f5a | MC Syd | 711 | 785 | **2588** | 390 | 5911 | **nej** |
| 037f14e6 | MC Syd | 711 | 785 | **2588** | 390 | 6030 | **nej** |
| 1b56a4ee | Gul og Gratis | 707 | 781 | **2483** | 390 | 5846 | **nej** |
| 693dd0a0 | Gul og Gratis | 707 | 781 | **2483** | 390 | 5846 | **nej** |
| 177253b4 | Gul og Gratis | 735 | 809 | **2512** | 390 | 5874 | **nej** |
| 39de3e76 | MC Syd, u. foto | 552 | 612 | **2370** | 390 | 5694 | **nej** |
| **328dc95d** | GG, fabriksny | **899** | 973 | **2656** | 390 | 6018 | **nej** |
| **2a136714** | MC Syd, fabriksny | **854** | — | **2518** | 390 | 5841 | **nej** |
| 0d4eb1a9 | MC Syd, fabriksny | 829 | — | 2572 | 390 | 5896 | **nej** |
| 1032 / 1039 / 1003 / 1044 / 1007 | egne | 459 | 712 | 1612–1721 | 390 | 5054–5183 | **ja** (`.listing-actionbar`, fixed, top 775, h 69) |

Tre målinger, der afgør sagen:

1. **`document.documentElement.scrollWidth = 390` på alle 20.** Ingen vandret
   scroll. Godkendt.
2. **Prisen ligger over folden på 17 af 20** (552–735). Men på **fabriksny**
   annoncer skubber oplysningsblokken den ned til **854 og 899** — altså
   **under 844-folden**. Det tal, køberen kom efter, er væk på første skærm.
3. **Den eneste handling på 15 af 15 indekserede sider ligger i y 2370–2716.**
   Viewporten er 844 px. Køberen skal scrolle **1.921 px — 2,3 skærmfulde —**
   for at nå den knap, der er hele sidens formål. Der er **ingen fast
   handlingsbjælke.** Vores egne annoncer har den (fixed, 775/69) — men egne
   annoncer findes ikke i produktion.

Bilbasens samme skærm: **tre** handlinger ("Book en prøvetur", "Skriv til
sælger", "Ring op") mellem y 80 og 165, dvs. i de første 20 % af første skærm.

---

## 9. Findbarhed — det værste tal i hele dommen

| Måling | Egne annoncer | Indekserede annoncer (392 = 100 % af produktion) |
|---|---|---|
| `<meta name="robots">` | ingen | **`noindex, follow`** |
| `<link rel=canonical>` | `…/annonce-husqvarna-fe-501-2022-1042.html` | **`https://bikerbasen.dk/annonce.html`** — samme URL for alle 392 |
| `og:title` | "Husqvarna FE 501 2022 — 74.900 kr. — Bikerbasen" | **"Annonce — Bikerbasen"** |
| JSON-LD | `Motorcycle` + `Offer` + `BreadcrumbList` | **ingen** |
| Lighthouse SEO | **100** | **69** (`is-crawlable`: blokeret) |

Og:

| Måling | Værdi |
|---|---|
| `<loc>` i `sitemap.xml` | **28** |
| Heraf annoncesider | **0** |
| `annonce-*.html` i repoet | **0** |
| `annonce-husqvarna-fe-501-2022-1042.html` (egen annonces canonical) | **HTTP 404** |
| `annonce-*.html` i byggeoutput `_site/` | **0** |

Altså: de 392 annoncer, der faktisk findes i produktion, er sat til `noindex` og
peger alle sammen på den samme kanoniske URL. De 51 egne annoncer peger på en
kanonisk adresse, **der giver 404**. Ingen annonce står i sitemappet.

**Ingen enkelt motorcykel på Bikerbasen kan findes i Google.** Deles en
MC Syd-annonce på Facebook, står der "Annonce — Bikerbasen" og intet mærke.
`noindex` på scrapet indhold er en forsvarlig beslutning; en canonical til en
404-side på vores eget indhold er det ikke.

---

## 10. Ydelse og tilgængelighed

Lighthouse 12.8.2, mobil, 4× CPU, samme server:

| Side | Ydelse | A11y | Best practices | SEO | FCP | **LCP** | TBT | **CLS** |
|---|---|---|---|---|---|---|---|---|
| MC Syd `0098fee2` | **76** | **100** | 100 | 69 | 2,0 s | **6,3 s** | 0 ms | **0** |
| Gul og Gratis `328dc95d` | **77** | **100** | 100 | 69 | 2,0 s | **5,8 s** | 60 ms | **0** |
| Egen `1042` | **80** | **100** | 100 | 100 | 2,0 s | **5,2 s** | 20 ms | **0** |

Gulvet i `bar/GAPS.md` er **ydelse ≥ 95** og **LCP < 2,5 s**. Ingen af de tre
sider er i nærheden. CLS = 0 og TBT ≤ 60 ms er derimod fremragende.

LCP-nedbrydning på MC Syd-siden:

| Fase | ms | Andel |
|---|---|---|
| TTFB | 452 | 7 % |
| **Load Delay** | **4.125** | **65 %** |
| Load Time | 1.318 | 21 % |
| Render Delay | 409 | 6 % |

To tredjedele af LCP er *ventetid før billedet overhovedet bliver anmodet*.
Vandfaldet forklarer hvorfor:

| Rækkefølge | Ressource | ms |
|---|---|---|
| 1 | `/annonce.html` (18,8 KB) | 1→3 |
| 2–3 | `styles.css` 218 KB + 2 skrifter 68 KB | 15→20 |
| 4–14 | 10 scripts, i alt ≈ 410 KB (`annonce.js` 72 KB, `data.js` 84 KB, `components.js` 54 KB, `postnumre.js` 40 KB, `backend-bridge.js` 38 KB …) | 20→38 |
| 15 | `@supabase/supabase-js` fra **cdn.jsdelivr.net** (55 KB, tredjepart på kritisk vej) | 23→96 |
| 16 | Supabase `listings` (preflight + fetch) | 14→161 |
| 17 | Supabase **`eksterne_annoncer` 40 KB** (preflight + fetch) | 120→**265** |
| 18 | **først nu** kendes billedets URL → hentning starter | ~4.100 |

Siden er fuldt klient-renderet: HTML'en indeholder ikke fotoet, så browseren kan
hverken forudindlæse eller opdage det. To Supabase-rundture skal hjem først.
Delvist er det udviklingsserveren (ingen gzip — 400 KB kunne spares, ingen
minificering — 243 KB), men **Load Delay på 4,1 s er arkitektur, ikke server.**

`is-crawlable` er den eneste SEO-fejl på de indekserede sider.

**axe-core 4.10.2, 0 overtrædelser** — 6 kørsler:

| Side | 1440 | 390 |
|---|---|---|
| Egen `1042` | **0** | **0** |
| MC Syd `0098fee2` | **0** | **0** |
| Gul og Gratis `328dc95d` | **0** | **0** |

Det er målt, og det er ægte. `<h1>` er ganske vist `visually-hidden` (1×1 px) og
den synlige overskrift er en `<h2>`; det er ikke en overtrædelse, men siden har
ingen synlig `h1`.

---

## 11. Dansk

Jeg kørte hele den synlige tekstmasse fra 80+ sider (306 unikke linjer) igennem
for engelsk og scraper-sprog: **0 fund.** Ingen "price", "dealer", "listing",
"seller", "mileage", "undefined", "N/A". Sproget er skrevet, ikke oversat, og
tonen er en dansk motorcykelhandels: *"Se motorcyklen fysisk, og få stelnummeret,
før du betaler noget som helst."*

Fejlene der er:

| Fejl | Antal | Rettelse |
|---|---|---|
| **"Gul og Gratiss"** (genitiv af navn på -s) | **3 steder** | "Gul og Gratis'" |
| "Gul og Gratiss kontaktoplysninger og **åbningstider**" | alle 60 GG-sider | markedspladser har ingen åbningstider — forhandlertekst genbrugt |
| "A har ingen effektgrænse og **dækker hele lageret** — også de annoncer, hvor effekten ikke er oplyst" | alle A-badgede sider | facet-forklaring klistret ind på en enkelt motorcykels side; giver ingen mening dér |

Datakvalitet, som vi viderebringer ubearbejdet:

| Problem | Antal | Eksempel |
|---|---|---|
| Titel = kun mærke | **6** | `<title>` og `<h1>` er ordret **"Honda hos MC Syd — Bikerbasen"** (609.995 kr.) |
| Mærke dubleret i facetten | 1 par | **"Royal Enfield" (6)** og **"Royal-enfield" (1)** er to mærker; filtrerer man på det rigtige, mister man en motorcykel |
| Mærke gentaget i titlen | 2 | "Suzuki **Zusuki** V-STROM 650 dl", "Fb Mondial **FB Mondial** HPS 125" |
| Umulig kubik vist som faktum | ≥1 | Triumph Bonneville T 120 C, årgang 1964: **"Kubik 120 ccm"** ved siden af "Effekt 52 hk" |

Den sidste er værd at fremhæve begge veje: siden **nægter** at udlede kørekort af
de modstridende tal ("Kan ikke afgøres", og annoncen dukker hverken op i A1- eller
A2-filtret — kontrolleret) — men den **trykker stadig "120 ccm" som et faktum** i
detaljetabellen.

---

## 12. Blind A/B

Rækkefølgen blev afgjort med `$RANDOM` **før** jeg så billederne (`coin.txt` = 0).
Begge udsnit: 390 px bredt, 776 px højt, brandingstriben i toppen skåret af, samme
skærmhøjde, udlogget, cookiemur afvist.

**Side A** giver mig i rækkefølge: brødkrumme → grå oplysningsboks om at
annoncen ligger et andet sted → ét foto (rigtigt, skarpt, men med kildens eget
vandmærke "https://mcsyd.dk" brændt ind) → fotokredit → titel → type → sted →
"Forhandlerannonce" → pris → "Bytter gerne" → note om salgsvilkår.
**Nul handlingsmuligheder.** Ikke én knap. Jeg kan ikke se flere billeder, ikke
skrive, ikke ringe.

**Side B** giver mig: **tre knapper i de første 90 px** → brødkrumme → hjerte →
stort foto → miniaturestribe med **"+20"** (altså 23 fotos) → titel →
sælgervurdering "4,5 · 50 anmeldelser" → **pris** → **månedlig ydelse 1.628 kr.**

**Hvilken side vil jeg hellere købe en motorcykel fra? B. Uden tøven.**

B besvarer alle tre spørgsmål, en køber har på første skærm: *hvordan ser den ud*
(23 billeder), *hvad koster den* (kontant og pr. måned), *hvordan får jeg fat i
sælgeren* (tre veje, ét tryk). A besvarer kun det midterste. A bruger sine
dyreste 150 px på at forklare, at annoncen tilhører en anden — det er ærligt, og
jeg respekterer det, men det er placeret dér, hvor købers opmærksomhed er dyrest,
og der går yderligere 1,9 skærme, før der er noget at trykke på. Ét foto er
desuden ikke nok til en vare til 124.800 kr., og A indrømmer det selv:
*"Flere billeder af netop denne motorcykel finder du i deres annonce"* — altså:
gå et andet sted hen for at se motorcyklen.

**A = os (MC Syd-annonce). B = Bilbasen.** Bilbasen vinder på mobil, klart.

På desktop 1440×900 er afstanden mindre. Vores højre skinne sætter
"Se annoncen hos MC Syd" ved y = 235 med "DU KØBER AF · MC Syd · mcsyd.dk"
ovenover — det er roligere og langt klarere om, hvem man handler med, end
Bilbasens skinne, der er stoppet med finansiering, forsikring, ladeboks og
byttebil-vurdering. Men Bilbasen har stadig 23 fotos, tre kontaktveje, en
månedlig ydelse og en forhandlervurdering, hvor vi har ét strakt billede og ét
udgående link. **Bilbasen vinder også på desktop — på substans, ikke på ro.**

---

## 13. Hullerne, rangeret

1. **Ingen handling på mobil i produktion.** 392 af 392 sider: eneste knap i
   y ≈ 2.370–2.716, ingen fast bjælke, 1.921 px scroll. Vores egne annoncer har
   allerede `.listing-actionbar` — den skal gælde de indekserede.
2. **Forkert juridisk påstand hos privatsælgere.** ≈22 Gul og Gratis-annoncer
   lover "garanti", 60 mangler privat-advarslen og Sælger-rækken. Bind sætningen
   til sælgertypen, ikke til `Stand = Fabriksny`.
3. **Ingen annonce kan findes i Google.** 0 annoncer i sitemappet, 392 `noindex`
   med fælles canonical og og:title "Annonce — Bikerbasen", 51 egne med canonical
   til en 404.
4. **A1 påstås uden effekttal**, mens den samme mangel over 125 ccm behandles
   ærligt — og A2-filtret er uenigt med badget om netop de to annoncer.
5. **Vores egne annoncer bærer kørekortet uden forbehold**, kun i en `title=`.
6. **Ingen galleri.** 1 foto pr. annonce mod Bilbasens 23; GG-fotos strækkes 2,2×.
7. **LCP 5,2–6,3 s** med 65 % Load Delay: fotoets URL kendes først efter to
   Supabase-rundture.
8. **Prisen under folden på fabriksny mobilsider** (854 og 899 px).
9. **Dansk:** "Gul og Gratiss", åbningstider på en markedsplads,
   facet-forklaringen om "hele lageret" på en enkelt motorcykel.
10. **Rå kildedata trykt som faktum:** "Honda" som titel (6 stk.), "120 ccm" på en
    T120, mærket splittet i "Royal Enfield"/"Royal-enfield".

Roses, fordi det er målt: A2-grænsen ved 47/48 hk rammer præcist (11/11);
184 felter kort-mod-detalje uden én modsigelse; 0 opdigtede billeder ud af 18
fotoløse annoncer; kilden oplyst fem gange før første klik; fabriksny oplyst tre
steder; forhandler-reklamationsretten korrekt og kun der hvor den gælder;
**axe: 0 overtrædelser i alle 6 kørsler**; **CLS = 0**; `documentWidth = 390`
på alle 20 mobilmålinger; ingen engelske ord i 306 linjer synlig tekst.

---

VINDER: findbarhed=Bilbasen tillid=os hastighed=Bilbasen dansk=os
LIGHTHOUSE: ydelse=76 a11y=100 LCP=6.3s CLS=0
STØRSTE HUL: På alle 392 annoncer, en rigtig gæst kan se i dag, ligger sidens eneste knap 2.370–2.716 px nede uden fast handlingsbjælke — udbred `.listing-actionbar` fra de egne annoncer til de indekserede, så "Se annoncen hos <kilde>" står fast på mobilen fra første skærm.
