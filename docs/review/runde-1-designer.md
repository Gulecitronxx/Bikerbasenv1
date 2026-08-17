# Runde 1 — designer (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rækkerne nedenfor er klar til at flettes ind i `BACKLOG.md`.

---

## Sådan er der målt (læs den her først, tallene afhænger af den)

**Dev-serveren var ikke på 55945.** Ingen proces lyttede der. Den kørende server
blev fundet på `127.0.0.1:55559` (og en identisk på `57896`). Begge leverer
`index.html`, `css/styles.css`, `js/search.js` og `js/annonce.js` byte for byte
som arbejdstræet (sha1 kontrolleret). Alt herunder er målt på **55559**.

**Chrome-udvidelsen (`claude-in-chrome`) var ikke tilsluttet.** Målingerne er
lavet i Browser-panelet. `resize_window` virker dér, men **først efter en
efterfølgende `navigate`** — `innerWidth` er derfor efterprøvet indefra før hver
enkelt måling (1440×900 dpr 1, og 390×844 dpr 2, `matchMedia('(max-width:699px)')`
= true).

**Playwright-MCP'en deles med en anden agent lige nu** og er ubrugelig til denne
audit af to grunde: den navigerede min side væk midt i to kald, og dens browser
har ingen udgående netværksadgang, så `cdn.jsdelivr.net` fejler og `Store` står
med 51 demoannoncer og nul indekserede. Alle tal herunder er fra Browser-panelet,
hvor lageret er de rigtige **383 (51 egne + 332 eksterne)**.

**Måleadvarslen er bekræftet, og den er værre end beskrevet.** Browser-panelets
fane rapporterer periodisk `document.visibilityState === "hidden"`, og i den
tilstand målte jeg `setTimeout(0)` klemt til **1.000 ms** (log: 857, 1858, 2858 …).
Søgesidens 24 kort tager derfor ~12 s i stedet for ~44 ms. **Hver** kortmåling
herunder er taget efter en pollingløkke, der venter til `main .card` står på 24.
Det er en artefakt af værktøjet, ikke en fejl for rigtige brugere — derfor ingen
finding på det.

**Tom-tilstanden er målt på drift, ikke gættet.** `bikerbasen.dk` blev åbnet
udlogget: `Store.getAllListings()` = **332, heraf 332 eksterne og 0 egne**. Det
er den tilstand, D-005, D-008 og D-009 handler om.

**Kontrastmetoden.** Alle tal er komposit: `opacity` ganges op gennem hele
forældrekæden og blandes ind i den baggrund, der faktisk ligger bagved (også
gennem halvgennemsigtige lag). Hvor teksten står på et **foto**, er fotoets
pixels læst ud via canvas, `object-fit: cover` + `object-position` er regnet med,
og `.hero::after`/`.tile-label`-gradienterne er komposit oven på dem. Kravet er
4,5:1, eller 3:1 for ≥24px eller ≥18,66px fed. `text-shadow` er ikke krediteret
(WCAG måler det ikke) — hvor det er relevant, står der et overslag alligevel.

---

## Findings

| ID | rolle | akse | severity | fil | problem | forslag | status |
|---|---|---|---|---|---|---|---|
| D-001 | designer | design | P1 | `css/styles.css:456-462` (mobil) og `:428-439` (desktop) | Hero-scrimmens lyseste punkt ligger præcis under teksten. **390×844:** `.hero-count` ("383 motorcykler til salg i dag", 17px/600, `#EFEAE1`) måler **2,12:1** værst og 2,17:1 i snit — 100 % af 51 målepunkter under 4,5. `h1` (27px/700, krav 3:1) måler **2,66:1** værst, 33 % af punkterne under kravet, alle på anden linje. Årsag: gradientstoppet `34 %` sidder ved y=270 af 899, og h1 står 140-197 (16-22 %), tælleren 208-231 (23-26 %) — altså i selve dykket. Kommentaren på :451 siger, at kurven blev hævet fra 12 % i runde 9; den er stadig ikke nok. **1440×900:** headeren er `background-color: rgba(0,0,0,0)` oven på fotoet, og den vandrette scrim er `transparent` fra 82 % = x 1168, mens navigationen står x 832-1300. Målt: `nav a` (15px/500 hvid) **2,38:1** værst / 2,75 i snit; `.btn-outline` "Log ind" (15px/600) **2,05:1** / 2,24. `text-shadow: 0 1px 12px rgba(0,0,0,.55)` på tælleren løfter et generøst overslag til ~3,2:1 — stadig under 4,5. Kontrolmåling på samme side: de otte `.tile-label` har deres EGEN etiket-gradient (`to top, .92 → .55 → 0`) og måler værst **4,93:1** (Scooter) — alle otte passerer. Mønsteret findes altså på siden, det er bare ikke brugt i hero'en eller bag headeren. | To indgreb, ingen ny farve, ingen ændring af fotoets komposition. (1) Giv hero-teksten sit eget etiket-lag efter `.tile-label`-opskriften — en lokal gradient bag `h1` + `.hero-count`, ikke en hævning af hele scrimmen (det ville slukke cyklen, som :426 og :448 med vilje holder fri). (2) Giv `.site-header` en egen top-scrim, når den ligger over hero'en (`body.home`), fx en `linear-gradient(180deg, var(--color-dark) 62%, transparent)` i en `::before` — headeren skal have kontrast, uden at hero'ens højre side bliver mørk. Efterprøv med samme metode: mål på kompositten, ikke på tokenet. | åben |
| D-002 | designer | design | P1 | `css/styles.css:815` + `:795`, `js/components.js:439-442` | **Prishierarkiet er vendt om på 87 % af lageret.** `.card-external .card-price` er sat ned til `font-size:17px` — nøjagtig samme størrelse og vægt som `.card-title-main` (17px/700, :795) — og den står i DOM'en EFTER titlen. Målt på 1440: titel `y=669`, variant `y=693`, pris `y=725`; prisen ligger 56 px UNDER titlen og har nul størrelsesforskel. På 390: titel `y=773`, pris `y=829`, altså 15 px over folden på et 844-vindue. Det egne kort gør det rigtigt i samme gitter: kørekort-badge `y=1150`, **pris 21px/700 `y=1200`**, titel 15px/600 `y=1240`, årgang/km/ccm 13px `y=1267` — pris først og 6 px større end titlen (den delte regel `.card-price` :953 ER 21px; :815 overskriver den). På side 1 er 20 af 24 kort eksterne, så den regel, rollen og RUBRIC'en beder om (pris → mærke/model → årgang/km) gælder i praksis for 4 af 24 kort. | Byt `.card-prisrække` og `<h3 class="card-title">` om i `externalCardHTML()`, og lad `.card-external .card-price` arve de 21px fra :953. Højden er ikke et problem: begge korttyper er allerede strakt til samme 548 px af gitteret på desktop. Det, :814-817 løser (at "Pris ved henvendelse" og salgsmarkørerne skal kunne stå på én 24px-række), løses billigere ved at lade `.pris-mangler` beholde sine 14px og lade markørerne ombryde — prisen er det eneste tal, købet træffes på. | åben |
| D-003 | designer | design | P1 | `js/components.js:454-456` | **Søgeresultatet sender 87 % af trafikken ud af sitet ét klik efter søgningen — og springer vores egen annonceside over.** Det eksterne kort har præcis ÉT `<a>`, det fylder 357×605 px = **99,3 % af kortets areal**, og det peger på `https://mcsyd.dk/...` med `target="_blank"`. Der er ingen vej til `annonce.html`. Men siden FINDES og er god: `annonce.html?id=42410d86-c150-4ce9-8e0f-8ca744bb4e0c` tegner en komplet `.external-detail` med kildeoplysning, "Pris hos MC Syd 5.000 kr." i 30px, og A1-dommen **med sit regnestykke** ("Regnet ud fra 124 ccm og 11 hk"). Det er dér, vores ene strukturelle fordel er skrevet ud — og ingen køber kan komme derhen fra en søgning. Rejsen `søg → kort → annonce → "Se hos kilde"` eksisterer altså kun for de 51 (i drift: 0) egne annoncer. For de 332 er den `søg → kort → mcsyd.dk`. | Lad `.card-link` på eksterne kort pege på `annonce.html?id=${l.id}` som de egne kort gør, og lad `.card-external-cta`-linjen blive den ærlige forvarsel den er ("Se annoncen hos MC Syd"). Klikket ud af sitet flyttes til D-004's side, hvor vi først har fået sagt vores. Ingen oplysning skjules, og `aria-label`'en (som i dag er forbilledlig — den nævner kilde, "åbner i ny fane", model og pris) skal tilpasses den nye destination. | åben |
| D-004 | designer | design | P1 | `js/annonce.js` — `videreKortHTML()` / den eksterne gren; `css/styles.css` `.listing-next` | **På den eksterne annonceside konkurrerer væk-CTA'en med ingenting — den vinder ved walkover.** Målt på 390: dokumentet er 5.803 px. Den eneste udfyldte knap på hele siden er "Se annoncen hos MC Syd" (`btn btn-primary`, 309×48, `y=2461` — 2,9 skærme nede). Der er **nul** `.fav-btn`, nul sammenlign-knap og ingen `#listing-actionbar` (den egne annonceside HAR en sticky bjælke, målt 390×69 ved y=775). De eneste blive-handlinger er fire links i "Søg videre på Bikerbasen" — 14px, `font-weight:400`, `color: var(--color-fg)`, `text-decoration:none`, altså **grafisk identiske med brødteksten** — og de står UNDER væk-knappen. Spørgsmålet "hvad konkurrerer den med, og hvad vinder?" har derfor et præcist svar: intet, og væk. | Giv siden én blive-handling med vægt, før væk-knappen: "Gem annoncen" (samme `.fav-btn`, id'et findes — sammenlign-knappen bruger det allerede på kortet) eller "Giv mig besked, hvis prisen falder", som knytter sig til noget, vi faktisk kan levere. Og gør "Søg videre"-rækkerne til noget, der ser klikbart ud: `color: var(--color-primary)` eller en chevron pr. række. Væk-knappen skal blive — den er ærlig — den skal bare ikke være den eneste. | åben |
| D-005 | designer | design | P1 | `js/home.js:475` og `:499` (gaten), `index.html` `#newest-sub` | **I drift påstår forsiden en dato, vi ikke har.** Målt udlogget på `bikerbasen.dk`: 332 annoncer, 0 egne. Sektionen "Nyeste annoncer" står med underrubrikken **"De senest oprettede annoncer på Bikerbasen."** over otte MC Syd-kort, hvis `createdAt` med vilje er `null` — vi ved ikke, hvornår de blev oprettet, og de ligger ikke på Bikerbasen. Rækkefølgen er oven i købet prisstigende (5.000 → 10.000 → … → 20.000 kr.), fordi `sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))` på :475 sammenligner `NaN` og lader listen stå urørt. Den datadrevne rettelse på :499 er gatet bag `newest[0]?.createdAt` og fyrer derfor aldrig i drift; tomtilstanden på :557 fyrer heller ikke, fordi `slice(0,8)` returnerer otte kort. Rubrikken er skrevet til et lager med egne annoncer, og drift har ingen. Det er præcis den fejl, "Lige landet"-blokken i `work/DECISIONS.md` blev skrevet for at lukke — den er bare flyttet til en tilstand, ingen har stået i endnu. | Gaten skal stå på den egenskab, den handler om: har vi annoncer med en kendt oprettelsesdato? Har vi ingen, må sektionen ikke hedde "Nyeste". To ærlige udgange: (a) skjul sektionen og lad "Udvalgte annoncer" + et "opret din annonce"-bånd stå, eller (b) omdøb den til det, indholdet er — fx "Senest indekseret hos MC Syd" med `indekseretFoerste` som den dato, vi faktisk HAR. Vælg (b) hvis sektionen skal blive, for så er både overskrift og rækkefølge dækket af data. | åben |
| D-006 | designer | design | P1 | `css/styles.css` — `html` (ingen `scroll-padding`); `.site-header:256`, `.listing-actionbar:1354` | **WCAG 2.2 AA, SC 2.4.11 "Focus Not Obscured (Minimum)" fejler i BEGGE ender, og den ene ende er hele sitet.** Efterprøvet med rigtige tastetryk på `annonce.html?id=1021` ved 390×844: **Tab** → fokus lander på "Motorcykler til A-kørekort" med blækkassen `y 800-838`, mens `.listing-actionbar` dækker `775-844` → fuldstændigt skjult (screenshot bekræfter: ingen fokusring synlig). **Shift+Tab** → fokus lander på "Alle BMW til salg" med blækkassen `y 0-38`, mens den sticky `.site-header` dækker `0-68` → fuldstændigt skjult. Årsagen er den samme begge steder: der findes **ingen `scroll-padding` nogen steder i `css/styles.css`**, så browseren regner elementet som "i viewporten" og ruller ikke fri. Topfejlen gælder alle 14 sider, fordi headeren er `position:sticky; height:68px` uden sidescope. `body{padding-bottom:76px}` er i øvrigt rigtigt sat, så INTET er permanent skjult ved dokumentets slutning (footer bund 768 < bjælkens top 775) — det er kun rulningen, der mangler. | `html{ scroll-padding-top: var(--header-h) }` som en delt regel, og `scroll-padding-bottom` svarende til bjælkens højde inde i det samme `@media (max-width:959px)`, som viser `.listing-actionbar` (jf. :1362). To linjer, og de dækker begge ender på alle sider. Efterprøv med Tab og Shift+Tab, ikke med `element.focus()` — programmatisk fokus udløser ikke `:focus-visible` ens og ruller efter samme regel, så en test dér kan se grøn ud uden at være det. | åben |
| D-007 | designer | design | P1 | `css/styles.css:1963` | `.safety-banner-sep{ opacity:.4 }` — **samme fejl som `.facet-n`, et andet sted.** Separatoren "·" er 13px/400. Komposit i lys tilstand: `rgb(220,160,135)` på `rgb(255,230,217)` = **1,86:1**. I mørk tilstand: `rgb(137,64,34)` på `rgb(58,36,23)` = **1,95:1**. Kravet er 4,5. To noder pr. side, målt på `annonce.html?id=1017`, `?id=1021` og `forhandler.html`. Det er den ENESTE komposit-fejl, sweepet fandt uden for hero'en — og den er af den slags, der koster gulvet i `bar/RUBRIC.md` kategori 3 (a11y = 100), præcis som `.facet-n` gjorde ved 3,04. | Samme rettelse som `.facet-n` fik: dæmp med farve, ikke med `opacity`. Enten `color: var(--color-fg-muted)` på separatoren, eller — bedre, fordi tegnet ikke bærer nogen oplysning — erstat de to `<span>`-separatorer med en CSS-`::before`/`border-inline-start` på det efterfølgende led, så der slet ikke er en tekstnode at måle på. | åben |
| D-008 | designer | design | P2 | `js/components.js:428-457` (eksternt kort, ingen `.fav-btn`) | **Favoritfunktionen har i drift ingenting at virke på.** Målt på søgesiden: 0 af 20 eksterne kort har en "Gem annonce"-knap; 4 af 4 egne kort har den. Den eksterne annonceside har heller ingen (se D-004). Da drift har 0 egne annoncer, kan hjerteikonet i headeren — som står på alle 14 sider og viser "0" — aldrig blive andet end 0. Der er altså en global funktion i toppen af hver side, som 100 % af det aktuelle lager er udelukket fra. Det er ikke et teknisk problem: `.card-compare` bruger det samme `l.id` (en UUID) på de samme kort og virker. | Sæt `.fav-btn` på det eksterne kort og på den eksterne annonceside med samme `l.id`. Det er samtidig den blive-handling, D-004 mangler, og den ene grund en køber kan have til at komme tilbage til os frem for til MC Syd. Findes der en grund til, at eksterne ikke må gemmes, skal den skrives i `work/DECISIONS.md` — for lige nu ligner det en forglemmelse, ikke et valg. | åben |
| D-009 | designer | design | P2 | `maerker.html` (genereres af `scripts/build-brand-pages.js`) | **Mærkeindekset er 73 % blindgyder, og det taber to mærker, der HAR lager.** Siden linker 60 mærker. Driftlageret (332 eksterne) indeholder 18 forskellige mærker. **44 af de 60 links giver "0 annoncer fundet".** Dertil to konkrete fejl: (1) linket "SYM" → `soegning.html?brands=SYM` giver **0 træf**, selvom lageret har én `Sym` — mærkefiltret er versalfølsomt, så sidens eget link er dødt oven i købet for et mærke, der findes. (2) `Sym` og `Rewaco` har begge lager og står **slet ikke** i de 60. Intro'en siger ærligt "også dem uden annoncer lige nu", men ikke HVILKE, så det koster et klik og en tom side pr. mærke at finde ud af det. | Mærkeindekset genereres på byggetidspunktet, så antallet kan bages ind uden at bryde beslutningen om, at `maerker.html` ikke henter Supabase (jf. `work/DECISIONS.md`, "Sider uden data henter ikke Supabase"). Skriv antallet i hver række, og del listen i to: "Mærker med annoncer nu (18)" øverst, "Alle mærker vi kender (60)" nedenunder — så holder intro'ens løfte. Ret desuden mærkenøglen, så den matcher data ("Sym", ikke "SYM"), og lad listen komme fra lageret + den faste liste, ikke fra den faste liste alene. | åben |
| D-010 | designer | seo | P2 | `maerker.html`, `sitemap.xml` | Følger af D-009, men det er et selvstændigt forhold: mærkeindekset udstiller **44 interne links til søgeresultater med nul indhold**. Det er 44 tynde sider, en crawler bruger budget på, og som ikke kan rangere på andet end mærkenavnet. Samtidig er de to mærker, der HAR indhold (`Sym`, `Rewaco`), uden en indgang. | Samme rettelse som D-009 løser det: mærker uden lager skal ikke være indekserbare landingssider. Enten `rel="nofollow"` på dem, eller — renere — lad dem være ren tekst uden link, indtil der er lager. Og få de mærker, der HAR lager, ind i indekset og i `sitemap.xml`. | åben |
| D-011 | designer | design | P2 | `css/styles.css:749-916` (`.card-external`), `js/components.js` `eksternSpecs()` | **De to korttyper i samme liste har to forskellige rytmer.** Målt på 390: eksternt kort **607 px** højt, eget kort **472 px** — 135 px / 29 % forskel i den samme kolonne. Forskellen ligger i specblokken: de fire felter (årgang, km, ccm, hk) står som et 2×2-gitter af piller i tre rækker á 36 px = 108 px, hvor det egne kort skriver "2021 · 9.100 km · 373 ccm" på én 13px-linje = 20 px. Dertil nævnes kilden **fire gange** på ét kort ("Annonce fra MC Syd"-bånd, `https://mcsyd.dk`-vandmærke i fotoet, "Forhandler · mcsyd.dk", "Se annoncen hos MC Syd"). Konsekvensen er målbar: i drift er forsiden **13.858 px = 16,4 skærme** på 390×844, hvoraf 12 annoncekort udgør 7.917 px, og søgesiden koster 607 px pr. annonce at skanne. Ærligheden om kilden skal blive; det er den fjerde gentagelse og de 108 px, der er dyre. | Slå specpillerne sammen til én linje som på det egne kort (de skjulte `<dt>`'er kan blive — de er det, der gør pillerne læsbare for en skærmlæser, og en `·`-separeret linje kan bære de samme `<dt>`). Behold ét sted, hvor kilden navngives visuelt (båndet i toppen), og lad "Forhandler · mcsyd.dk" og CTA-linjen dele én fodlinje. Målet er, at de to korttyper er lige høje — så er listen én liste. | åben |
| D-012 | designer | design | P3 | `js/search.js` — tomtilstandens hjælpetekst | `soegning.html?q=zzzzqqq` (nul træf, ét aktivt filter = frisøgningen) skriver "Prøv at fjerne et filter eller **udvide dit prisinterval**". Brugeren har ikke sat et prisinterval. Rådet peger på en indstilling, der ikke er i spil, i den ene situation hvor rådet er det eneste, siden har at give. Resten af tomtilstanden er god (se nedenfor). | Skriv hjælpelinjen ud fra de filtre, der faktisk er sat: er det kun frisøgningen, så "Prøv et kortere søgeord — fx kun mærket." Er der et prisfilter, så nævn prisen. Teksten findes allerede i data (chipsene ved siden af viser præcis hvilke filtre der er aktive). | åben |

---

## Det her er fint — og det skal stå, så ingen laver det om

Målt, ikke skønnet.

- **Kategoriflisernes kontrast.** De otte `.tile-label` har deres egen
  etiket-gradient og måler værst **4,93:1** (Scooter, den lyseste baggrund).
  Alle otte passerer 4,5. Det er kontrolmålingen, der gør D-001 til en fejl og
  ikke til en metodefejl: samme metode, samme side, samme hvide tekst på foto —
  fliserne klarer det, fordi de har et etiket-lag. Hero'en har ikke et.
- **Mørk tilstand.** Fuldt komposit-sweep på `soegning.html` (24 kort tegnet) og
  `annonce.html?id=1017` i `data-theme="dark"` efter en ren indlæsning: **nul**
  fejl ud over D-007. Ingen hardcodet farve slap igennem.
- **Fokusindikatoren findes overalt.** 23 forskellige varianter af fokuserbare
  elementer på forsiden gennemgået: alle får `outline: 2,4px solid #C6420E` med
  `outline-offset: 1,6px` via `:focus-visible`, og `:focus-visible` matcher
  faktisk ved tastaturnavigation. Problemet i D-006 er ikke ringen — den er der.
- **Tilgængelige navne.** Nul tomme links på søgesiden. Det eksterne korts store
  linkflade har `aria-label="Se annoncen hos MC Syd (åbner i ny fane): Honda
  CB 1000 Hornet Street, 124.800 kr."` — kilde, ny fane, model og pris i én
  streng. Det er bedre end de fleste rigtige markedspladser.
- **Berøringsmål.** Intet interaktivt element under 24×24 px (WCAG 2.2 AA,
  SC 2.5.8). Mindste er `.section-link` på 24 px høj og `.card-compare` på
  34×34. Ingen vandret scroll på nogen målt side ved 390.
- **Mobilens filterark.** Sticky overskrift med "Nulstil" + luk, sticky fod med
  "Nulstil" og **"Vis 383 annoncer"** med levende tal, antal på hver enkelt chip,
  Kørekort som første gruppe, og kun **ét** indre rulleområde
  (`.filter-body-scroll`, 596 af 1959 px synligt). Handlingerne er i
  tommelfingerzonen. Det er den bedste flade på sitet.
- **Tomme tilstande, der ER designet.** Tom søgning: ikon, overskrift, forklaring,
  primær "Nulstil filtre", sekundær "Sælg din motorcykel" og et søgeagent-tilbud.
  "Sælgeren findes ikke": ikon, overskrift, årsag, CTA. Annoncen uden fotos:
  kameraikon, "Ingen fotos i denne annonce" og en linje der siger *hvorfor* vi
  ikke tegner en motorcykel i stedet. Alle tre sælger eller forklarer — ingen af
  dem ser død ud.
- **Den egne annonceside.** Pris 30px/700 over folden (`y=493` af 844), titel
  24px, sticky handlingsbjælke med primær + sekundær, og `body{padding-bottom:76px}`
  så bjælken ikke permanent dækker dokumentets slutning (footerens underkant 768
  < bjælkens top 775). Den side er i orden.
- **Den eksterne annonceside SELV** (indholdet, ikke handlingerne — se D-004):
  kildeoplysning før produktet, "Pris hos MC Syd" som prislabel, og A1-dommen med
  sit regnestykke skrevet ud. Det er sitets stærkeste side. Den er bare uden for
  rækkevidde (D-003).
- **Tre-kliks-testen i `bar/RUBRIC.md` klares på ét.** "A2 under 60.000 kr." er
  en chip i hero'ens søgekort. Og CTA'en "Vis 383 motorcykler" har underkant ved
  **684 af 844** på 390 — over folden, som `work/DECISIONS.md` lover.

---

## Samlet vurdering

Sitet er **håndværksmæssigt bedre, end det opfører sig**. Alt det svære er
allerede gjort én gang: tokens holder i mørk tilstand, fokusringen findes på hver
enkelt komponent, aria-navnene er skrevet af nogen der har tænkt over dem,
tomtilstandene er designet frem for glemt, og filterarket på mobil er bedre end
Bilbasens. Der er ingen bunkevis af smådefekter at rydde op i — sweepet fandt
**én** komposit-kontrastfejl uden for hero'en (D-007) og nul i mørk tilstand.

Problemet ligger et niveau over CSS'en: **sitets vigtigste side kan ikke nås, og
dens vigtigste tal kan ikke ses.** 332 af 383 annoncer — i drift 332 af 332 —
sender køberen direkte til `mcsyd.dk` ved det første klik efter søgningen, forbi
en `annonce.html`, der findes, er god, og er det eneste sted vi skriver
A1/A2/A-dommen ud med sit regnestykke. På vejen derhen har kortet gjort prisen
lige så stor som titlen og lagt den nedenunder, så det ene tal, købet afgøres på,
er hverken først eller størst. Og forsiden påstår i drift en oprettelsesdato på
otte annoncer, hvis dato vi selv har besluttet ikke at gætte.

Det er ikke tre problemer. Det er én holdning, der ikke er ført igennem: vi har
bygget en ærlig markedsplads og så givet trafikken væk, før den nåede at se den.

### Den ENE ting, der ville flytte mest

**Lad det eksterne annoncekort pege på `annonce.html?id=${l.id}` i stedet for
direkte på `mcsyd.dk` (D-003).** Én linje i `js/components.js:454`. Den flytter
87 % af lageret fra "hand-off" til "sidevisning", den gør den bedste side på
sitet synlig for de kritikere, der dømmer os udlogget, og den er forudsætningen
for at D-004 og D-008 overhovedet kan betale sig — der er ingen grund til at
bygge en blive-handling på en side, ingen besøger.
