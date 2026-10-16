# YDELSE — dommen over runde 3's strid om `/soegning.html`

*Uafhængig opmåling, 19.08.2026. Alt herunder er mine egne tal, kørt på egne
rigge på egne porte (61711, 61721–61727). Ingen produktionsfil er rørt; de
eneste ændringer ligger i kopier under scratchpad.*

---

## DOMMEN

**Begge byggere har fat i noget rigtigt, og begge tager fejl om det, der
afgør sagen.** Builder 3's mekanisme er ægte — i en rigtig browser under
rigtig strubning koster søskendefotoerne LCP-billedet **902 ms** af dets egen
hentetid (1.825 ms med dem, 923 ms uden, målt tre gange hver) — men det tal,
builder 3 brugte som bevis, beviser det modsatte: **57–72 B/ms er præcis, hvad
billedet får, når det er HELT alene om røret** (64,7 B/ms målt uden søskende),
fordi resten er opsætning af en kold tredjepartsforbindelse og TCP slow start,
ikke konkurrence. Builder 4's observation om rækkefølgen er korrekt — søskendene
starter efter LCP-billedet — men slutningen er ugyldig: de kører **samtidig**
med det (4.577–6.725 ms mod billedets 4.506–6.331 ms), og noget, der starter
senere, kan udmærket stjæle båndbredde. Builder 4's advarsel om `dev-server.py`
er derimod **fuldt bekræftet og er den vigtigste enkeltoplysning i hele
striden**: den rig alene flytter LCP fra 3.755 til 6.408 ms. Og så det, ingen af
dem fandt: **på det tal, gulvet faktisk måles med — Lighthouses Lantern-simulering
— giver det NUL at fjerne søskendefotoerne (3.755 → 3.915 ms).** LCP-billedet er
hverken båndbreddesultent eller blokeret bag datahentningen i den forstand,
striden handler om. Det er **opdaget for sent, fordi hele første søgeresultat
tegnes af JavaScript efter en rundtur til API'et** — billedets URL findes ikke i
dokumentet. Med billedet forudindlæst, alle søskendefotos blokeret og
brødteksfonten helt fjernet lander siden på **3.036 ms**. Gulvet på 2.500 ms er
**ikke nåeligt på `/soegning.html`** uden at første resultats markup og
billed-URL kommer med i selve HTML-dokumentet.

---

## 1. Riggen: hvad forudsiger produktionen, og hvad gør ikke

Produktionen er GitHub Pages: HTTP/2, multiplexet, gzip, TLS, CDN. Jeg rejste
fire rigge og målte den samme side på alle fire, så forskellen mellem dem er
målt og ikke påstået.

| Rig | Port | Transport | Rod | Formål |
|---|---|---|---|---|
| R0 | 61711 | `scripts/dev-server.py`, HTTP/1.0, ingen keep-alive, ingen gzip, `no-store` | arbejdstræet | builder 4's rig, uændret |
| R1 | 61721 | HTTP/1.1 med `Connection: close`, ingen gzip | `_site/` | isolerer transporten fra minificeringen |
| R2 | 61722 | HTTP/1.1 keep-alive + gzip + `max-age=600` | `_site/` | builder 3's `gzserver.js` |
| R3 | 61723 | **HTTPS/h2, multiplexet, gzip, `max-age=600`** | `_site/` | **produktionsforudsigeren** |

`/soegning.html`, 390×844, 4× CPU, Lantern, 3 kørsler pr. rig:

| Rig | Ydelse (median, spænd) | LCP (median, spænd) | FCP | overført |
|---|---|---|---|---|
| R0 dev-server.py | 75 (75–75) | **6.408** (6.399–6.764) | 1.953 | 1.150 kB |
| R1 h1.0 + `_site` | 79 (78–79) | **5.136** (5.068–5.142) | 1.502 | 882 kB |
| R2 h1.1 + gzip | 88 (86–89) | **3.563** (3.546–3.569) | 907 | 626 kB |
| R3 **h2 + TLS + gzip** | 88 (86–88) | **3.755** (3.713–3.777) | 902 | 623 kB |

**Hvad det viser.**

* **Builder 4's advarsel er bekræftet med tal.** Projektets dev-server koster
  **2.653 ms LCP** i forhold til produktionsformen — mere end hele det hul,
  striden handler om. Et absolut tal fra den rig kan ikke sammenlignes med
  noget som helst. 1.272 ms af det er transporten alene (R0→R1 er samme
  ukomprimerede bytes, kun forbindelsesgenbrug skiller), resten er gzip.
* **h2's multiplexing køber ingenting.** R3 er 192 ms LANGSOMMERE end R2, og
  hele forskellen ligger i TTFB (602 mod 454 ms) — TLS-håndtrykket. Load Delay
  er identisk (2.155–2.223 mod 2.214–2.266 ms). Flaskehalsen er altså ikke
  antallet af forbindelser; havde den været det, ville multiplexing have vist
  det.
* **Derfor er R3 min produktionsforudsiger, ikke R2.** Produktionen kører TLS.
  Builder 3's `gzserver.js` er ren HTTP og udelader et håndtryk, produktionen
  betaler. Det er ~148 ms, og det er hele forskellen mellem builder 3's
  LCP 3.433 og mine 3.755 sammen med maskintilstanden (min TBT ligger på
  148–242 ms, builder 3's på 0 — samme kode, anden maskine).

**Vinduet er efterprøvet indefra siden**, ikke kun sat på kommandolinjen.
Lighthouses `ViewportDimensions`-artefakt, som læser `window.innerWidth` i
selve dokumentet:

```
{"innerWidth":390,"innerHeight":844,"outerWidth":390,"outerHeight":844,"devicePixelRatio":3}
throttling: rttMs 150 · throughputKbps 1638,4 · cpuSlowdownMultiplier 4 · method "simulate"
```

**Vinduet er ikke forklaringen på uenigheden.** Jeg kørte også
standardpresettet (412×823, builder 3's vindue) på R3: LCP median **3.693**
(3.618–3.922) mod 3.755 ved 390×844. Forskellen forsvinder i støjen, og
**de samme fem søskendefotos hentes i begge vinduer** — builder 3's "fire
søsterfotos på 240.127 B" er en undertælling; det femte (Triumph, 73.850 B)
kommer med i begge vinduer under Lantern. Fire er tallet i den
devtools-strubede kørsel, hvor den femte ikke når at starte.

---

## 2. Den kritiske sti til LCP — vandfald med bytes og tider

Nedenstående er **rigtige, målte tider under rigtig strubning**
(`--throttling-method=devtools`, 1,6 Mbit/s, 150 ms RTT, 4× CPU, 390×844,
kørsel `d-dev-2`), ikke Lantern-simulerede tal. Det er den eneste tabel i
denne rapport, hvor start- og sluttider er direkte observerede.

| start | slut | varighed | overført | rå | prio | type | ressource |
|---:|---:|---:|---:|---:|---|---|---|
| 1 | 643 | 643 | 12.953 | 42.122 | VeryHigh | doc | `soegning.html` |
| 638 | 708 | 70 | 0 | 0 | High | xhr | `listings` (OPTIONS, boot-blokken) |
| 640 | 1.574 | 934 | 22.336 | 22.288 | High | font | `fonts/spacegrotesk.woff2` |
| 641 | **1.747** | 1.106 | **45.760** | 45.712 | High | font | `fonts/ibmplexsans.woff2` |
| 643 | 1.590 | 946 | 21.525 | 127.325 | VeryHigh | css | `css/styles.css` |
| 657 | 1.319 | 662 | 4.329 | 4.292 | Low | img | `logo-mark.png` |
| 708 | 1.304 | 596 | 702 | 2 | High | xhr | `listings` (svar: tomt array) |
| 1.863 | 2.459 | 596 | 224 | 251 | Low | js | `js/security.js` |
| 1.868 | 3.088 | 1.219 | **55.119** | 212.199 | Low | js | `cdn.jsdelivr.net/…/supabase-js@2` |
| 1.869 | 2.883 | — | **57.120** | 187.153 | Low | js | *ti egne scripts, parallelt* (`data.js` 14.028 · `search.js` 17.386 · `components.js` 8.292 · …) |
| 3.203 | 3.224 | 21 | 0 | 0 | High | xhr | `eksterne_annoncer` (OPTIONS) |
| 3.225 | **4.033** | 809 | **40.058** | **303.237** | High | xhr | `eksterne_annoncer` (selve dataene) |
| 3.237 | 3.839 | 602 | 3.920 | 3.868 | High | img | `favicon.png` |
| **4.506** | **6.331** | **1.825** | **59.732** | 59.553 | **High** | **img** | **LCP: `images.danbase.dk/…/Honda_CB_1000_0_2.jpg`** |
| 4.577 | 6.422 | 1.846 | 55.863 | 55.732 | Low | img | søskende 1 `Honda_F6_Valkyrie` |
| 4.720 | 6.693 | 1.973 | 62.304 | 62.173 | Low | img | søskende 2 `Kawasaki_ZR-7` |
| 4.721 | 6.725 | 2.004 | 65.209 | 65.069 | Low | img | søskende 3 `Aprilia_RSV_1000` |
| 4.721 | 6.636 | 1.915 | 56.712 | 56.582 | Low | img | søskende 4 `BMW_K_1200_S` |

**263.822 B er landet, før LCP-billedets forespørgsel overhovedet sendes**
(builder 3 sagde 250.168 B — samme størrelsesorden, bekræftet). LCP-elementet
er efterprøvet i hver eneste kørsel:

```
<img src="https://images.danbase.dk/…/Honda_CB_1000_0_2.jpg" alt="Honda CB 1000 Hornet"
     loading="eager" fetchpriority="high" decoding="async" class="card-photo">
```

**Kæden, læst som årsag og ikke som rækkefølge:** dokument → render-blokerende
stilark + to preloadede fonte → ti udskudte scripts → scripts KØRER (4× CPU) →
`eksterne_annoncer` hentes (40 kB gzip, **303 kB JSON at parse**) → kort bygges →
**først dér findes billedets URL** → kold forbindelse til `images.danbase.dk`
(DNS + TCP + TLS) → slow start → maling.

En advarsel om at læse tabellen: `eksterne_annoncer` starter 3.203 ms, kun 115 ms
efter supabase-js er hentet færdigt (3.088 ms). Det *ligner* en afhængighed. Det
er det ikke — se X4 nedenfor. Vandfaldet alene ville have ført til builder 3's
konklusion nummer 2; A/B'en afviser den.

---

## 3. Beviset: syv indgreb, hver målt tre gange

Alle på R3 (h2 + TLS + gzip), 390×844, 4× CPU, Lantern. Medianer med spænd.
"Δ" er mod baseline 3.755 ms.

| # | Indgreb | Ydelse | LCP median (spænd) | Δ LCP | Load Delay | Load Time | Render Delay |
|---|---|---|---|---|---|---|---|
| — | **baseline** | 88 (86–88) | **3.755** (3.713–3.777) | — | 2.184 | 736 | 254 |
| X1 | alle 5 søskendefotos blokeret (−313.956 B) | 86 (84–86) | **3.915** (3.904–3.942) | **+160** | 2.327 | 782 | 206 |
| X4 | supabase-js fra jsDelivr blokeret (−55.119 B) | 87 (83–88) | **3.760** (3.396–3.798) | **+5** | 2.058 | 603 | 229 |
| O3 | `font-display:optional` | 86 (86–88) | 3.844 (3.698–3.870) | +89 | 2.357 | 755 | 132 |
| S2 | begge webfonte blokeret (−68.096 B) | 91 (87–91) | **3.240** (3.160–3.733) | **−515** | 1.872 | 672 | 106 |
| X2 | **LCP-billedet preloadet i `<head>`** | 92 (91–92) | **3.342** (3.335–3.355) | **−413** | **0** | 487 | **2.252** |
| X3 | X2 + søskende blokeret | 91 (90–91) | **3.183** (3.182–3.334) | **−572** | 0 | 585 | 2.131 |
| Z | **LOFT: X3 + `ibmplexsans` blokeret** | 92 (92–93) | **3.036** (3.034–3.042) | **−719** | 0 | 347 | 2.087 |

Og den ene måling, der afgør båndbreddespørgsmålet — **rigtig browser, rigtig
strubning, ikke simuleret** — LCP-billedets egen hentetid:

| | kørsel 1 | kørsel 2 | kørsel 3 | median | B/ms |
|---|---|---|---|---|---|
| med søskende | 1.399 | 1.825 | 1.860 | **1.825 ms** | **32,7** |
| søskende blokeret | 929 | 923 | 921 | **923 ms** | **64,7** |

Hele sidens LCP i samme to arme: **6.416 ms** (6.345–6.441) med søskende mod
**5.532 ms** (5.413–5.731) uden — **−884 ms**. I Lantern: **0 ms**.

---

## 4. Dom over hver enkelt påstand

### Builder 3

| Påstand | Dom | Bevis |
|---|---|---|
| "250.168 B skal lande, før LCP-billedet forespørges" | **BEKRÆFTET** | Jeg måler 263.822 B og billedets forespørgsel ved 4.506 ms |
| "fire søsterfotos på 240.127 B hentes SAMTIDIG med LCP-fotoet" | **BEKRÆFTET** (og undertalt: fem, 313.956 B under Lantern) | Overlappende vinduer 4.577–6.725 mod 4.506–6.331 ms |
| "de er `loading=lazy`, men ligger inden for Chromes doven-grænse" | **BEKRÆFTET** | De hentes i både 390×844 og 412×823 |
| "LCP-fotoet får 57–72 B/ms ud af et ~200 B/ms rør — derfor sultes det" | **DELVIST — mekanismen er ægte, beviset er forkert** | Alene får billedet **64,7 B/ms**, altså midt i det interval, builder 3 kaldte bevis på sult. Konkurrencen koster reelt 32,7 mod 64,7 B/ms; resten er kold forbindelse + slow start og forsvinder ikke |
| **"færre fotos over folden er den største enkeltpost"** | **AFKRÆFTET på det tal, gulvet måles med** | X1: **3.755 → 3.915 ms**. Nul gevinst. −884 ms i den devtools-strubede kørsel, 0 ms i Lantern |
| "supabase-js må ikke ligge foran dataene" (vej 2) | **AFKRÆFTET** | X4: hele bundtet blokeret, siden tegner stadig kortene, **LCP +5 ms**. `eksterne_annoncer` går ikke gennem bundtet |

### Builder 4

| Påstand | Dom | Bevis |
|---|---|---|
| "søskendene starter EFTER LCP-billedet (4.919–5.053 mod 4.865 ms)" | **BEKRÆFTET** | Jeg måler 4.577–4.721 mod 4.506 ms |
| **"…derfor kan de ikke sulte det"** | **AFKRÆFTET — slutningen holder ikke** | De kører samtidig; blokeres de, falder billedets hentetid 1.825 → 923 ms i en rigtig browser |
| "`fetchpriority=low` på alle ikke-første kort flyttede 6.488 → 6.520 ms, altså intet" | **BEKRÆFTET, og forklaringen er nu kendt** | Søskendene har ALLEREDE `Low` i vandfaldet. Prioritet er ikke det, der deler røret — det er samtidighed |
| **"`dev-server.py` svarer HTTP/1.0 uden keep-alive; absolutte tal er usammenlignelige"** | **BEKRÆFTET, og det er stridens vigtigste enkeltoplysning** | R0 mod R3: LCP 6.408 mod 3.755 ms, ydelse 75 mod 88 |

### Det, ingen af dem fandt

**LCP-billedet er ikke båndbreddesultent OG ikke blokeret bag datahentningen
— det er opdaget for sent, fordi det ikke findes i dokumentet.**

X2 beviser det: lægges `<link rel="preload" as="image">` med billedets URL i
`<head>`, går **Load Delay fra 2.184 ms til 0** og selve hentningen til 487 ms.
Alligevel falder LCP kun til 3.342 ms — fordi **Render Delay springer til
2.252 ms**. Billedet ligger færdigt i browseren ved ~1.100 ms og venter i over
to sekunder på, at `js/search.js` overhovedet får tegnet kortet. Da jeg
blokerede `eksterne_annoncer` helt (X5), malede siden sin fejltilstand ved
**2.552 ms** (2.552–2.555) med Load Delay 0 og Load Time 0 — det er prisen for
vores egen scriptkæde alene, uden ét billede og uden ét datafelt.

**Gulvet er 2.500 ms. Vores egen kæde bruger 2.552 ms, før der er noget at
vise.** Det er dér, sagen ender.

---

## 5. Hvad der faktisk køber de resterende ~933 ms — rangeret

Baseline for rangeringen er min R3-måling: **3.755 ms, mangler 1.255 ms**
(builder 3's tal var 3.433/933 ms på en rig uden TLS).

| # | Vej | Målt/estimeret gevinst | Tillid | Grundlag |
|---|---|---|---|---|
| 1 | **Forudtegn side 1 af søgeresultatet ind i `soegning.html`** — statisk kortmarkup med billed-URL, `eager` + `fetchpriority=high` på kort 1, `lazy`+`low` på resten. **Præcis det `scripts/build-brand-pages.js` allerede gør for `maerke-*.html`.** | **~800 ms** (3.755 → ~2.950) | **middel** | `maerke-ktm.html` — som ER forudtegnet på nøjagtig den form — måler **2.949 ms** (2.853–3.030), ydelse 95, TBT 0. Det er den bedste tilgængelige måling af, hvad formen lander på. Estimatet er en overførsel mellem to sider, ikke en A/B på søgesiden |
| 2 | **Tag `ibmplexsans.woff2` (45.760 B) af den kritiske sti** — kraftigere subsetning, eller lad brødteksten falde tilbage på systemfonten ved første maling | **300–1.250 ms**, sidetype-afhængig | **middel/lav** | Målt som blokering: søgesiden −515 ms, forsiden −256 ms, **annoncesiden −1.248 ms** (2.602 → 1.354). En blokering er et LOFT, ikke en leverbar rettelse — se §7 |
| 3 | **Færre fotos over folden** (builder 3's forslag) | **0 ms på gulvets tal · ~880 ms for den rigtige bruger** | **høj** (begge tal) | X1: 3.755 → 3.915 i Lantern. Devtools-strubet: 6.416 → 5.532. Den er værd at lave for brugeren og værdiløs for scoren |
| 4 | `<link rel="preload" as="image">` på LCP-fotoet | **−413 ms**, men kun mulig SAMMEN med vej 1 | **høj** på tallet, **lav** på anvendeligheden | X2. URL'en kendes ikke uden forudtegning, og den ændrer sig med filtre. Alene er den ikke leverbar |
| 5 | Skær `eksterne_annoncer`-svaret ned (40 kB gzip, **303 kB JSON**) — færre kolonner, `limit` på side 1 | **~200–400 ms** | **lav** | Ikke isoleret målt. Afledt af, at parsingen bærer TBT 148–242 ms, og at rundturen tager 809 ms observeret |
| — | **supabase-js væk fra den kritiske sti** (builder 3's vej 2) | **0 ms** | **høj** | X4: **+5 ms**. Brug ikke en runde på den |
| — | **`font-display:optional`** | **0 ms** | **høj** på målingen, se §7 om hvorfor | O3: +89 ms. Lighthouse KAN ikke se den — §7 |

**Om `images.danbase.dk`:** vi kontrollerer ikke værten, og det er dyrere, end
det ser ud. LCP-fotoet får kun **64,7 B/ms selv helt alene om røret** mod
rørets 204,8 B/ms — det er en kold fremmed origin: DNS + TCP + TLS + slow start.
`preconnect` står allerede i siden og scorer nul (bekræftet af builder 3, og
Lantern flytter blot omkostningen til Load Delay). Det eneste, der reelt
fjerner den, er at servere kortfotos fra eget domæne, og det er en aftale- og
lagringsbeslutning, ikke en ydelsesrettelse.

---

## 6. Forsiden og annoncesiden — og ja, den ene er billig

Målt på R3, 390×844, 3 kørsler. **Begge siders LCP-element er TEKST**, ikke et
billede: Load Delay 0 og Load Time 0 i hver eneste kørsel.

| Side | LCP-element | baseline | begge fonte blokeret | kun `ibmplexsans` blokeret | kun `spacegrotesk` blokeret |
|---|---|---|---|---|---|
| `/index.html` | `<h1>` | **2.810** (2.253–2.891) · ydelse 96 | **2.477** · 98 | **2.554** · 97 | — |
| `/annonce.html?id=1021` | `<p class="gallery-tom-tekst">` | **2.602** (2.598–2.653) · 97 | **1.278** · **100** | **1.354** · **100** | 2.481 · 98 |

**Annoncesidens hul på 77 ms er ikke bare billigt — det er én fil.**
`ibmplexsans.woff2` alene bærer **1.248 ms** af sidens LCP. Elementet er
tomtilstandsteksten "ingen fotos" (annonce 1021 har ingen billeder — det kendte
problem med 51 egne annoncer uden foto), og den males om, når brødteksfonten
lander. Fjernes fonten fra den kritiske sti, går siden fra 2.602 til 1.354 ms og
fra ydelse 97 til **100**. Det er 1.100 ms mere end de 77, der mangles.

**Forsiden er dyrere, end de 284 ms lader ane.** Selv med BEGGE webfonte helt
væk lander den på **2.477 ms** — 23 ms under gulvet, altså inde i støjen.
Forsiden har ingen billedafhængighed at rette; dens 1.575 ms mellem FCP (902)
og LCP er ren scriptkæde. Den kan nås, men ikke med margin, og ikke af
fonterettelsen alene.

**Det, der IKKE virker på nogen af dem:** `font-display:optional` (annonce
2.602 → 2.590, forside 2.810 → 2.799 — nul), og at fjerne `ibmplexsans`'
`preload` uden at fjerne fonten (annonce 2.602 → 2.561, men FCP 1.057 → 1.205 —
en dårlig handel, og builder 3's afvisning af samme idé i runde 6 og 11 står ved
magt).

---

## 7. Hvad min rig IKKE kan afgøre

1. **`font-display:optional` kan ikke måles af Lighthouse — hverken af mig
   eller af nogen anden.** Lantern simulerer på en indsamlingskørsel, der er
   **ustrubet**. Fonten lander dér på ~20 ms, altså inden for `optional`'s
   blokeringsvindue på ~100 ms, og bliver derfor brugt — den ommaling, der
   sætter LCP, sker alligevel. På en rigtig langsom 4G ville `optional` droppe
   fonten, og LCP ville lande ved reservefontens maling. **Rettelsen kan altså
   være rigtig for brugeren og usynlig for gulvet på samme tid.** Mine 0 ms er
   et udsagn om måleren, ikke om rettelsen. Jeg kunne ikke omgå det: fontene er
   samme-origin, og devtools-strubning strubede dem ikke på en måde, der lod
   `optional` udløse.
2. **Jeg har ikke målt mod produktionen.** Ingen rigtig CDN, ingen rigtig
   edge-latenstid, ingen rigtig TLS-session-genoptagelse. Mit TTFB på 602 ms
   indeholder et fuldt håndtryk til en selvsigneret lokal vært; GitHub Pages'
   edge er hurtigere. **Alle mine absolutte tal er derfor sandsynligvis
   pessimistiske med et par hundrede ms** — men alle interne sammenligninger
   (arm mod arm, samme rig, samme time) er gyldige, og det er dem, dommen
   hviler på.
3. **Maskintilstanden er ikke builder 3's.** Min TBT på søgesiden ligger på
   148–242 ms, builder 3's på 0 ms på den samme kode. Det koster mig 2–4
   ydelsespoint og gør, at mine 88 ikke må stilles ved siden af builder 3's 92.
   Retningerne i §3 er robuste; de absolutte niveauer er det ikke.
4. **`eksterne_annoncer`-svaret er levende data.** Kortenes rækkefølge og
   dermed hvilket foto der er LCP, afhænger af API'et. Det var stabilt gennem
   alle kørsler i dag (samme Honda CB 1000 hver gang, samme seks URL'er), men
   det er ikke garanteret i morgen.
5. **Vej 1's tal er en overførsel, ikke en A/B.** Jeg har målt en forudtegnet
   side (`maerke-ktm.html` → 2.949 ms), ikke en forudtegnet SØGESIDE. Søgesiden
   har filtre, facettal og en filterskinne, `maerke-*.html` ikke har. Estimatet
   på ~800 ms bør efterprøves med en rigtig prototype, før nogen bygger på det.
6. **Jeg har ikke målt, hvad forudtegning koster i CLS eller i hydrering.**
   `maerke-ktm.html` måler CLS 0,000, hvilket er lovende, men søgesidens
   filterpanel er præcis det sted, hvor runde 2 fandt CLS 0,115.
7. **Blokering er ikke en rettelse.** X1, X4, S2, P1, P2 og Z er kørt med
   Lighthouses `--blocked-url-patterns`. De måler LOFTET for, hvad det kan være
   værd at fjerne noget — ikke hvad en leverbar version af rettelsen giver. En
   mindre font giver mindre end en fjernet font.

---

## 8. Konklusion, uden pynt

**Gulvet — ydelse ≥95 og LCP ≤2.500 ms på mobil — er ikke nåeligt på
`/soegning.html` med nogen kombination af de rettelser, striden handlede om.**
Loftet for dem alle tilsammen (billedet preloadet, alle søskendefotos væk,
brødteksfonten væk) er **3.036 ms**, og 2.087 ms af det er Render Delay: tiden,
før vores eget JavaScript har tegnet det første kort.

Den arkitektoniske ændring, det kræver, er **at første side af søgeresultatet
bliver til statisk markup i dokumentet på byggetidspunktet**, med billed-URL'en
i `<head>` som `preload`. **Det bryder ikke projektets binding** — der er ingen
framework og ingen bundler i det; `scripts/build-brand-pages.js` og
`scripts/build-listing-pages.js` gør allerede nøjagtig dette for 21
mærkesider, og `maerke-ktm.html` måler 2.949 ms mod søgesidens 3.755. Prisen er
en byggetrins-afhængighed af friske data (side 1 bliver så frisk som sidste
deploy, ikke som sidste crawl), og at siden skal kunne erstatte den forudtegnede
markup, så snart brugeren rører et filter.

Selv dét er efter min bedste vurdering ikke nok alene: ~2.950 ms er stadig
450 ms over gulvet, og de sidste 450 ms ligger i den kritiske sti, alle sider
deler — 21.525 B render-blokerende stilark og 68.096 B fonte, hvoraf de 45.760 B
er brødteksfonten, der beviseligt bærer 1.248 ms på annoncesiden.

**En ærlig anbefaling:** tag annoncesiden først — den er én fil fra at score 100
— og forsiden derefter. Og beslut, om gulvet på søgesiden skal nås ved at
forudtegne siden, eller om tallet 2.500 skal skrives om for netop den side, med
begrundelsen stående. Begge dele er forsvarlige. At blive ved med at rette
enkeltposter på den nuværende form er det ikke: jeg har målt syv af dem i dag,
og den bedste af dem lader siden stå 536 ms over gulvet.

---

## Bilag: alle arme, medianer og spænd

Alle på 390×844, 4× CPU, Lantern, R3 medmindre andet står. n = antal kørsler.

| Arm | n | Ydelse (spænd) | LCP median (spænd) | FCP | TBT | CLS |
|---|---|---|---|---|---|---|
| `r0-py` dev-server.py | 3 | 75 (75–75) | 6.408 (6.399–6.764) | 1.953 | 100 | 0,006 |
| `r1-h10` | 3 | 79 (78–79) | 5.136 (5.068–5.142) | 1.502 | 162 | 0,006 |
| `r2-h11` | 3 | 88 (86–89) | 3.563 (3.546–3.569) | 907 | 175 | 0,006 |
| `r3-h2` søgning baseline | 3 | 88 (86–88) | 3.755 (3.713–3.777) | 902 | 152 | 0,006 |
| `v-std` søgning 412×823 | 3 | 87 (86–88) | 3.693 (3.618–3.922) | 903 | 161 | 0,004 |
| `x1-nosib` | 3 | 86 (84–86) | 3.915 (3.904–3.942) | 902 | 171 | 0,006 |
| `x2-preload` | 3 | 92 (91–92) | 3.342 (3.335–3.355) | 903 | 76 | 0,006 |
| `x3-begge` | 3 | 91 (90–91) | 3.183 (3.182–3.334) | 901 | 165 | 0,006 |
| `x4-nosbjs` | 3 | 87 (83–88) | 3.760 (3.396–3.798) | 908 | 218 | 0,006 |
| `x5-noekst` (element skifter) | 2 | 88 (88–88) | 2.555 (2.552–2.555) | 903 | 0 | 0,187 |
| `s2-nofont` | 3 | 91 (87–91) | 3.240 (3.160–3.733) | 902 | 155 | 0,006 |
| `o3-soegning` optional | 3 | 86 (86–88) | 3.844 (3.698–3.870) | 902 | 153 | 0,006 |
| `o4-alt` optional+preload | 3 | 92 (88–92) | 3.369 (3.359–3.686) | 931 | 84 | 0,006 |
| `z-loft` | 3 | 92 (92–93) | 3.036 (3.034–3.042) | 903 | 151 | 0,006 |
| `m-ktm` forudtegnet mærkeside | 3 | 95 (94–96) | 2.949 (2.853–3.030) | 903 | 0 | 0,000 |
| `f-forside` | 3 | 96 (95–99) | 2.810 (2.253–2.891) | 904 | 0 | 0,000 |
| `f2-nofont` forside | 3 | 97 (97–98) | 2.503 (2.479–2.503) | 902 | 0 | 0,000 |
| `p3-f-nofont` forside, gentag | 2 | 98 (98–98) | 2.477 (2.477–2.477) | 902 | 0 | 0,000 |
| `q1-f-noibm` forside | 3 | 97 (97–97) | 2.554 (2.551–2.657) | 901 | 0 | 0,000 |
| `o2-forside` optional | 3 | 96 (96–96) | 2.799 (2.781–2.853) | 903 | 0 | 0,000 |
| `a-annonce` | 3 | 97 (97–97) | 2.602 (2.598–2.653) | 1.057 | 23 | 0,001 |
| `a2-nofont` annonce | 3 | 100 (100–100) | 1.278 (1.278–1.655) | 1.053 | 22 | 0,001 |
| `p1-nosg` annonce | 3 | 98 (97–98) | 2.481 (2.479–2.554) | 1.054 | 11 | 0,001 |
| `p2-noibm` annonce | 3 | 100 (99–100) | 1.354 (1.354–1.954) | 1.054 | 37 | 0,001 |
| `q2-nopre` annonce | 3 | 97 (97–97) | 2.561 (2.555–2.628) | 1.205 | 13 | 0,001 |
| `o1-annonce` optional | 3 | 97 (97–97) | 2.590 (2.589–2.609) | 1.054 | 11 | 0,001 |
| `d-dev` devtools-strubet | 3 | 64 (50–65) | 6.416 (6.345–6.441) | 1.792 | 457 | 0,006 |
| `d2-nosib` devtools-strubet | 3 | 66 (57–69) | 5.532 (5.413–5.731) | 1.810 | 468 | 0,006 |

**Værktøj:** Lighthouse 12.8.2 CLI, Node v22.14.0, HeadlessChrome 151.
Tilgængelighed = **100 på samtlige 80 kørsler**. Målt på arbejdstræet ved
commit `7297c07` (rent træ), bygget med `node scripts/udgiv.js` til `_site/`.
