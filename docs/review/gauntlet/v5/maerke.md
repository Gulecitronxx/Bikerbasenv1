# V5 Builder: mærker/registeret

Branch `gauntlet/v5-maerke`. Kilde: V4-Critic (`docs/review/gauntlet/v4/critic-samlet.md`, P2-1, P2-4, P2-5, P3-1..3).
Screenshots før/efter: `docs/review/gauntlet/v5/maerke/` (`foer-*` = HEAD gauntlet/master, `efter-*` = denne branch; 375/430/768/1440/1920, lys og mørk).
Ingen filer er hentet fra nettet (ingen logoer). Kilderne til nye mærker er læst som tekst (Wikipedia-listen og producentsider) og står som URL'er i registret.

## 1. Udgangspunkt og de største problemer (Gauntlet-metoden)

| # | Problem (V4-Critic) | Før (målt) |
|---|---|---|
| 1 | P2-1 `#f-brand` er `required` med 93 mærker, ingen udvej | en sælger med Silence/NIU/Segway/Boss Hoss/Stark kunne ikke oprette annoncen |
| 2 | P2-4 "Flere mærker" forældes mellem byg | egen annonce på Zero: `?brands=Zero` virker, maerker.html siger stadig "ingen annoncer lige nu" |
| 3 | P2-5 hurtigsøgning | "Ingen mærker matcher." for Zero og Vespa (`foer-soeg-zero.png`) |
| 4 | P3-1 63 piller ligner knapper, men kan ikke trykkes | runde ramme-piller med hover-agtigt udseende (`foer-flere-1440-lys.png`) |
| 5 | P3-2 Daelim, Super Soco, TM Racing står offentligt som "kender vi" uden belæg | stod som piller |
| 6 | P3-3 `?brands=xyz` spejles i H1 | "xyz til salg - ingen annoncer lige nu" |
| 7 | data.js voksede 6,5 KB gzip på alle sider | registeret = 5,9 KB gzip af data.js (45.905 B) |

## 2. Hvad der er ændret

### P2-1 "Andet mærke" i opret-annonce
- `#f-brand` har sidst en `Andet mærke (skriv selv)`. Valget åbner `#f-brand-fri` (label "Mærkets navn", `maxlength=40`, `required` kun når synligt, fokus ved et ægte valg, hjælpetekst: "Teksten står på din annonce. Den bliver ikke et nyt mærke på Bikerbasen, før vi har tjekket, at mærket findes."). Feltet injiceres fra JS (opret-annonce.html er ikke min fil) og er skjult som standard, så der er ingen layoutforskydning.
- Validering ÉT sted: `BrandRegistry.validerFriMaerke()` (registret, så Node-tests og browser bruger samme regler): trimmet og ét mellemrum mellem ord; 2-40 tegn; kun bogstaver/tal/mellemrum/`.`/`'`/`+`/`-`; ingen HTML (`<`, `>`, entities); mindst ét bogstav; ingen internetadresser; "ukendt/andet mærke" afvises (det er det, vi selv viser for uoplyst). Fejl står ved feltet (`.felt-fejl`, `aria-invalid`, `aria-describedby`) og i samlebeskeden; sidste gate i `udgivTrin` validerer igen.
- Skriver sælgeren et registreret mærke ("honda", "stark") vælges det på listen: ét mærke, ingen dublet-stavemåde.
- Gem: `kolonner.brand` = den rensede tekst (≤ 40 tegn, som DB-reglen i `008_haerdning.sql`). Kladde og redigering: `saetMaerke()` lægger et mærke uden for registret tilbage som "Andet mærke" + teksten, uden at stjæle fokus.
- **Bliver aldrig et offentligt mærke af sig selv:** generatoren bygger kun mærkesider for `BrandRegistry.erKendt()` (før: alle ikke-"Ukendt" mærker, så et fritekst-mærke ville have fået `maerke-hanway.html`); forsidens "Populære mærker" tæller kun registrerede mærker; maerker.html tæller dem som "intet mærke fra vores liste". `scripts/maerke-kandidater.js` tæller sælgernes egne mærker (`--live` henter egne annoncer) og logger dem som afvist/afventer/kandidat efter de eksisterende regler (≥ 3 forekomster = kandidat, først en menneskelig registerpost gør det til et mærke).
- Tests: `js/v5-maerke.test.js` (se afsnit 5): tabel af gyldige/ugyldige navne, UI-tilstande, afvisning af tomt/1 tegn/HTML/adresse/"ukendt", **mock-oprettelse** ("Hanway" → `listings.brand = "Hanway"`, ét POST, registret uændret), "honda" → Honda, redigering gendanner "Andet mærke" + tekst, forsiden viser ikke fritekst-mærket.

### P2-4 maerker.html følger det levende lager (`js/maerker-lager.js`, ny)
- Oversigten er forrenderet statisk markup uden Supabase. Efter første maling (`load` + tomgang; aldrig ved Save-Data) indlæser `maerker-lager.js` dynamisk `supabase-config.js`, `supabase-api.js`, `maaling.js`, `backend-bridge.js` (samme normalisering og dubletregler som forside/søgning), kalder `backendReady()` og opdaterer:
  - tal på flisernes og A-Z-rækkernes mærker (ét tal, samme som siden selv; 0 hvis lageret ikke har dem længere),
  - et mærke uden side, der har annoncer (fx Zero): pillen flyttes til "Nyt siden sidste opdatering" som et rigtigt link `soegning.html?brands=Zero` ("Zero · 1 annonce"),
  - "Flere mærker (N)" (overskrift og intro), "Søg blandt alle N annoncer" (3 steder).
- Kun når `Store.harHeleLageret()` og lageret ikke er tomt (demoannoncer lokalt tælles ikke, som i `js/maerke.js`). Fejler hentningen, står det byggede urørt, og broens "Lageret kunne ikke hentes"-banner undertrykkes (`meldDataafbrud` sat til no-op for denne side): hentningen er kun en opdatering af tal, der allerede står i HTML'en.
- Ingen sider oprettes, kun REGISTREREDE mærker tælles.
- Pris: scripts hentes først efter `load`; verificeret i test (ingen Supabase-script starter før `loadEventEnd`; ingen backend-kald ved Save-Data). Målt: bridge + api + config + maaling = ca. 39 KB gzip (cachede, hvis brugeren kommer fra en anden side). Lagerdata: broens egen kommentar målte 29,9 KB gzip for 332 rækker; lageret er nu 735 rækker, så forvent mere (ikke målt: ingen produktionskald fra tests). Se afsnit 6 for risici.

### P2-5 hurtigsøgning (`js/maerker-sog.js`)
Piller bærer `data-mk-soeg` (navn, slug, registeraliaser), `data-mk-pille`, `data-mk-navn`. Søgningen filtrerer A-Z, pillerne og de nye mærker. Tekster: "Zero kender vi, men der er ingen annoncer lige nu. Se under Flere mærker." (op til 3 navne, derefter "N mærker"), "1 mærke med annoncer og 1 uden annoncer lige nu.", "Ingen mærker matcher." kun når intet matcher. Tomme lister efterlades ikke som hul. Daelim/Super Soco/TM Racing findes ikke her (se nedenfor).

### P3 pillerne er ikke knapper
Beslutning: **ikke-interaktiv stil** (ikke links til opret-annonce). Et link på "Vespa" til en opret-formular ville love købere en annonce; det er det forkerte svar for en køber. Pillerne er nu ren tekst med en tom prik (`cursor:default`, ingen ramme/baggrund/hover); historiske i kursiv. Intro-teksten siger "De er ikke knapper". Rigtige links (mærker, der har fået annoncer siden byg) har egen pille-stil med hover/fokus. `css/p-maerke.css` (sidens egen fil).
- Test: computed style (cursor default, border 0, radius 0, ingen ændring ved hover) i lys og mørk; ingen `<a>`/`<button>` i pillerne.

### P3 ukendt `?brands=xyz` i H1
Én blok i `js/search.js` `soegeoverskrift()` (3 linjer, kun H1-tekst): kun registrerede mærker, "uoplyst" og mærker, annoncerne selv har, spejles. `?brands=xyz` giver "Motorcykler til salg i Danmark"; `?brands=Zero` stadig "Zero til salg". **Meldes til Agent soegning** (de ejer filen).

### P3 mærker uden belæg er ikke offentlige
Nyt registerflag `offentlig` (= har selvstændigt belæg og ikke `ekstra.offentlig === false`). Daelim, Super Soco og TM Racing er stadig gyldige (normalisering, valg i opret-annonce, side hvis de får annoncer), men nævnes hverken som pille, i hurtigsøgning eller i tællere (`opgoer()`); ikke et ord om dem på siden. Flagene fjernes, når ejeren har bekræftet dem (tilføj en kilde i posten).

### Nye mærker (12, alle med mindst ét belæg)
Læst 2026-10-20 (ingen filer hentet):

| Mærke | Belæg | Bemærkning |
|---|---|---|
| NIU, Segway, Lifan, Boss Hoss | Wikipedia-listen (`wp`): i produktion | |
| Aermacchi, CZ | Wikipedia-listen: historiske (CZ ophørt 1997) | alias `čz` |
| Malaguti | Wikipedia-listen: fører den både som i produktion og som ophørt 1930-2018 | registreret som historisk |
| Horwin | producentsiden horwin.com: elscootere/-motorcykler | siden er kinesisk-sproget, land ikke angivet |
| Silence | producentsiden silence.eco: bekræfter kun et elektrisk-køretøjsmærke | **svagt belæg**: land og modeller står ikke på siden |
| Stark Future | starkfuture.com: elektriske VARG-motorcykler | land ikke angivet på siden |
| Cake | ridecake.com: lette elektriske mopeder/motorcykler | periode `ukendt` (ikke belagt, om det stadig produceres) |
| Polaris Slingshot | Wikipedia: Polaris Slingshot (trehjulet, siden 2014) | registreret som mærke, fordi annoncer skriver det sådan; alias `slingshot`, `polaris` |

**Ikke tilføjet: Hanway.** hanwaymotorcycles.com findes ikke, hanway.co.uk er en privat blog, og Wikipedia-listen har den ikke. Uden belæg tilføjes den ikke; den er stadig et fint eksempel på "Andet mærke". Landekoder (`ES`, `SE`, `CN`) for Silence/Stark/Cake/Horwin er informative og ikke bekræftet på siderne (står i noterne). Tre mærker (Daelim, Super Soco, TM Racing) er fortsat ubelagte.
Registret: 93 -> 105 mærker; 0 dubletter (test); logo-manifestet synkroniseret (`brand-logos-gen.js`, alle nye med monogram/ordmærke-fallback, intet logo hentet).

## 3. Registret i en separat fil? Undersøgt, målt, dokumenteret

**Mål (gzip):** data.js 45.905 B før V5 (registeret 6.322 B + resten 40.006 B uden registeret). Efter: registret 3.348 B; data.js **43.263 B** (-2.642 B, selv med 12 mærker mere).

**Hvorfor ikke en separat `js/brands-registry.js`-script-tag:** 102 sider læser `js/data.js`, og `data.js` bruger selv registret ved indlæsning (`BRANDS_BY_MODEL`), ligesom broen, filtreringen, søgningen, forsiden og opret-annonce. En separat fil kræver en ny `<script>`-tag FØR data.js på alle 102 sider, i ~13 generatorer (`scripts/build*.js`, `build.js`, statisk html) + test-harnesses, og alle disse er fælles filer uden for mit område. CSP og `udgiv.js` er ikke problemet (js/ kopieres hele, scripts er `'self'`), men en side, der glemmer tagget, kaster `ReferenceError` ved indlæsning af data.js. Den risiko står ikke mål med en gevinst på højst ca. 3 KB gzip på de få sider, der slet ikke bruger registret.

**Det, der blev gjort (sikkert, inden for mit område):** `scripts/maerke-register-gen.js` skriver nu en **slank browserudgave** ind i data.js: kun `// @@NODE-ONLY-START/END`-udeladte områder (kilder med URL'er, kandidatvurdering, `opgoer`, `status`, `sideRegel`), noter, kommentarer og kilde-arrays er væk; tabellen er kompakt (`["Yamaha","JP","aktuel",[],["wp"]]`). Node (tests, generatorer, kandidatlog) bruger den fulde fil. Test: den slanke kopi svarer det samme som den fulde på alle navne, aliaser og slugs (`normalise`, `kanonisk`, `erKendt`, `visNavn`, `slug`, `fraTekst`, `logoNoegle`, `valgbare`, `validerFriMaerke`, `find().verificeret/offentlig`), og en budgettest holder kopien < 4 KB gzip og data.js under før-V5-vægten. Videre trin, hvis Orchestrator vil: en fælles `<script>`-injektion i `scripts/components`/stamp-version, så en separat fil kan indlæses uden at røre 13 generatorer.

## 4. Iterationer (Gauntlet)
1. **Iteration 1:** registerudvidelse, `offentlig`, slank kopi, "Andet mærke" (valg + validering + gem), pille-markup, hurtigsøg, `maerker-lager.js`, H1. 12 af 14 browsertests grønne; 4 fejl i eksisterende tests (pille-markup, 12 KB-grænse, A–Z-logo-tælling) rettet.
2. **Iteration 2:** screenshots fandt tre fejl: (a) broens fejl-banner kom frem på oversigten ved fejlet hentning (`meldDataafbrud` undertrykt), (b) "Søg blandt alle  720  annoncer" fik hul, fordi tallets `<span>` blev et flex-barn (hele teksten i ét `<span>`), (c) lokalt kom demoannoncer (Vespa, Piaggio, MZ) med som "nye mærker" (filtreret som i `js/maerke.js`). Desuden: fritekstfeltet var for bredt (maks 520 px), og placeholder "Silence" blev byttet til "Hanway" (Silence er nu registreret).

## 5. Tests (Orchestrator skal tilføje til `package.json` "test")
- **Ny:** `js/v5-maerke.test.js` (21 tests: 9 statiske/enhed, 12 browser mod lokal mock, springes over uden Playwright).
- **Rettet (allerede i listen):** `scripts/maerke-register.test.js` (slank kopi, offentlig), `scripts/maerke-audit.test.js` (pille-markup), `scripts/v4-maerke-dakning.js` + `.test.js` (pille-markup, `offentlig`, tal i `<span>`), `scripts/w13-logo-kerne.test.js` (logodata-grænse 12 -> 14 KB: 12 poster mere), `scripts/w13-logo-generator.test.js` (A-Z-tælling).
- Kørt: `node scripts/maerke-register-gen.js --tjek` ok, `node scripts/brand-logos-gen.js --tjek` ok (105 mærker). `node --check` på alle ændrede js. Smoke strikt (maerker, opret-annonce, index, soegning, maerke-honda, maerke-dkw; 320/390/768/1024/1440; lys+mørk; `--cls 0.05`): 60 målinger, 0 fejl, 0 advarsler (2 kørsler). Fuld `npm test`: 1516 af 1521 grønne i første kørsel; de 4 fejl var 2 belastningsflaker (grønne alene), kritisk-manifestet (nu regenereret, se afsnit 6) og git-ren-tjek før commit.

## 6. Til Orchestrator / øvrige agenter (ikke mit område)
1. **Byg efter merge:** `css/p-maerke.css` er ændret, så `scripts/kritisk-manifest.json` er regenereret her (build -> kritisk-gen -> build). Ved konflikt: regenerér i stedet for at flette. Genererede sider er IKKE committet undtagen `maerker.html`.
2. **Agent soegning (`js/filtrering.js`):** et fritekst-mærke i en egen annonce ("Hanway") står i dag i mærkefilteret **under eget navn** ("Hanway 1", verificeret i browser) og kan findes med `?q=hanway`. Det er tilladt efter opgaven, men gør en sælgers tekst til en offentlig filterrække. Forslag: i `maerkeListe()` grupperes mærker, `BrandRegistry.erKendt()` ikke kender, under "Uoplyst mærke", mens kortet/titlen stadig viser teksten. Jeg har ikke rørt filtrering.js.
3. **Agent soegning (`js/search.js`):** jeg har ændret kun H1-blokken i `soegeoverskrift()` (3 linjer; ukendt `?brands=` spejles ikke).
4. **Statisk forside:** hvis en generator forudtegner "Populære mærker" (ikke fundet i `build-brand-pages.js`; `js/home.js` er rettet), skal den bruge `BrandRegistry.erKendt()`.
5. **`maerker.html` hydrerer nu fra Supabase efter første maling.** Det er et bevidst brud med V3-beslutningen "ren statisk oversigt"; forklaret i kommentaren i siden. Rulles tilbage ved at fjerne `<script ... maerker-lager.js>`: så falder siden tilbage til byggede tal.
6. `opret-annonce.html` er uændret; fritekstfeltet injiceres fra JS. Vil Agent opret have det i statisk markup, er id'erne `f-brand-fri-felt`, `f-brand-fri`, `f-brand-fri-hint`.
7. Gamle `BrandRegistry`-API'er er uændrede; nyt: `validerFriMaerke`, `FRI_MIN/FRI_MAX`, `offentlig`. `status`, `sideRegel`, `opgoer`, `vurderKandidat`, `KILDER` findes kun i Node-udgaven (`require('./js/brands-registry.js')`), ikke i browserens kopi.

## 7. Dimensionsskema (ærligt; en uafhængig Critic dømmer)

| Dimension | Mærkeoversigt | Opret annonce (mærkevalg) | Søgning (H1/filter) | Forside (mærkeflise) |
|---|---|---|---|---|
| Visuel kvalitet | 7: pillerne er nu rolig tekst i stedet for 72 runde knapper; hero stadig uden rytter (mockup-forskel uændret) | 7: ét ekstra felt i samme komponentstil, fejlfarve som de øvrige | 6: uændret | 6: uændret |
| Designkonsistens | 7: nye links bruger sidens primærfarve og fokusring; historiske i kursiv | 7: `.field`/`.felt-fejl`/`.field-hint` genbrugt | 6 | 6 |
| Funktionalitet | 8: søgning finder alle kendte mærker, tal følger lageret, ingen forældet "ingen annoncer"; afhænger af Supabase-hentning efter load | 8: ingen sælger blokeres; validering, kladde, redigering, mock-oprettelse testet | 7: H1 spejler ikke ukendt; filter viser stadig fritekst-mærke under eget navn (restpunkt 6.2) | 7: kun registrerede mærker |
| Brugeroplevelse | 7: "Zero kender vi, men ingen annoncer lige nu" i stedet for "Ingen mærker matcher" | 7: hjælpetekst siger ærligt, hvad "Andet mærke" gør; fokus og fejl ved feltet | 6 | 6 |
| Mobil | 7: pillerne fylder mindre højde end før (tekstflow, ingen 44 px knaprækker); 0 overflow 320-1440 | 7: feltet fylder rækken, 520 px max på bred skærm | 6 | 6 |
| Performance | 6: **ca. +39 KB gzip scripts + lagerdata (>30 KB)** efter load for dem, der bliver; data.js **-2,6 KB** på alle 102 sider; intet før første maling | 7: ingen ekstra bytes (feltet er JS) | 6 | 7: data.js lettere |
| Indholdskvalitet | 8: 12 belagte mærker, 3 ubelagte skjult, ærlig tekst om "intet mærke fra vores liste"; Silence/Cake svagt belagt (noteret) | 8: hjælpetekst + fejltekster på dansk | 6 | 6 |

Mockup-fidelitet (Mærker): uændret ift. V4 (ca. 6,0); denne runde er funktions- og ærlighedsarbejde, ikke visuelt løft. Hero med rytter kræver assets.
