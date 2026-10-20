# V3 samlet Critic (blind, frisk kontekst)

Genstand: commit `95df5046` (new) mod `1b23ffbf` (old, forrige produktion) og de ti mockups i `C:\Users\pasca\Desktop\Bikerbasen billeder`.
Metode: `git archive` af begge commits til scratchpad (`new/`, `old/`), statisk server pr. kopi, Playwright Chromium (Windows) med mocks. `SUPABASE_SERVICE_ROLE_KEY` fjernet. Intet er bygget, crawlet eller committet. Ingen kald forlod maskinen (alt udefra blokeret/mocket; Supabase besvaret af `scripts/smoke-fixtures.js` og `scripts/w9-saelger-mock.js`).

`SP` nedenfor = `C:\Users\pasca\AppData\Local\Temp\claude\C--Users-pasca-AppData-Roaming-Claude-scratch-workspaces-357402ee-4de7-427f-a01c-b50f52088f8b-213b5129-6022-4bce-b2b2-540e4bd69644-scratch-2026-10-15-907060\d79efd16-61f8-4a34-8416-461587afcb4c\scratchpad`
Skærmbilleder: `SP\shots\<side>\{old|new}-{375|430|768|1440|1920}-{lys|moerk}.png` (18 sider x 5 bredder x 2 temaer x 2 træer = 360 billeder, 0 `pageerror`/konsolfejl ved indlæsning). Sammenligningsstrimler: `SP\shots\m_*.png` (mockup | new), `SP\shots\c_*.png` (old | new), `SP\shots\d1-d4.png` (mørk).

## DOM: PUSH

Koden bliver i produktion. Jeg fandt ingen P0 og ingen P1, ingen funktionel regression mod old, og `verificer-site --hurtig --med-udgiv` er grøn (8 af 8 trin). Alle ændringer, jeg kunne måle, er enten neutrale eller forbedringer (ugyldige URL-parametre ignoreres nu, ét H1 på søgesiden, rigtig bekræftelsesdialog, CLS-rettelser, cookie-failsafe). De problemer, der er tilbage, er enten gamle (findes i old) eller små. Intet af det kræver rollback eller hotfix. Det vigtigste for næste runde er annoncesiden: den er ikke rørt i V3 (se sidst).

## Hvad jeg kunne og ikke kunne verificere

- Jeg testede mod mock-data på `127.0.0.1`. På localhost blander lageret 51 demo-annoncer ind (kommentar i `js/backend-bridge.js` siger "51 på localhost, 0 i drift"). Derfor viser mine søgetal 97 (43 fixture + 3 egne + demo) og kort med opdigtede forhandlernavne ("Nordjysk MC Handel ApS", "Fyns MC Center ApS" osv., fra `js/data.js`). Det er ikke et produktionsfund, men jeg har ikke kunnet bekræfte "0 i drift" mod den rigtige side.
- Firefox og WebKit er ikke testet. Reel netværks-CLS er ikke testet (kun mock).
- Min bærbare gik i dvale to gange under de lange smoke-kørsler (`ERR_NETWORK_IO_SUSPENDED`). De kørsler er derfor delvist ugyldige (se pkt. 2).

## Fund

### P0
Ingen.

### P1
Ingen.

### P2

**P2-1. CLS-gaten er ustabil: `type-scooter.html` ved 1440 giver 0,087-0,089 i den fremadgående smoke-kørsel, men ikke i den omvendte eller alene.**
- Fremadgående kørsel (rækkefølge som angivet), to forsøg: `type-scooter` 1440 lys CLS 0,089 og 0,087 (`SP\smoke-run1.txt`, `SP\smoke-run1b.txt`). Disse to kørsler havde også dvale-afbrud ved andre viewports, så resten af dem kan ikke bruges.
- Omvendt rækkefølge (`SP\smoke-run2.txt`): 480 målinger, 48 sider, 0 fejl, 0 advarsler, højeste CLS 0,0265.
- Hver side alene (48 sider x 5 bredder x 2 temaer, `SP\smoke-alone-*.json`): alle exit 0, højeste CLS 0,0265 (`mc-harley-davidson-cruiser` 375).
- Årsag fundet: under 4x CPU-nedbremsning (`SP\cls.js`) hopper `SECTION.section.fa-sektion` (intro + "Er en scooter noget for dig?"-kortet) 28-70 px ved ca. 1-4 s. Det sker 1 af 5 gange på new og 3 af 5 på old, så det er ikke en regression, men det er en reel intermittent CLS på 0,087 for brugere med langsom CPU. `type-sport` gav 0,022 i 1 af 4 under samme nedbremsning.
- Konsekvens: `--cls 0.05 --strikt` er ikke deterministisk. Den kan fejle i CI uden at noget er ændret.

**P2-2. Søgesidens H1 opdateres aldrig efter første indlæsning.** H1 står på "97 motorcykler til salg i Danmark", mens siden viser 12 (efter Sport), 1 (efter Sport + Honda) eller 0 resultater (`SP\func4.js`; `?q=Honda` giver 16 resultater og H1 "97 ..."). Samme fejl i old, men nu er H1 det eneste synlige/hørbare overskriftsniveau (visually-hidden), så skærmlæsere får et forkert tal. Titel og robots opdateres korrekt (tomt resultat giver `noindex, follow`); kun H1-teksten hænger. Antallet bør enten ud af H1 eller følge resultatet.

**P2-3. Cookie-dialogens failsafe dækker kun blokkere, der skjuler den inden 600 ms.** `js/components.js` lukker en skjult `:modal` dialog ved init og igen efter 600 ms. Simuleret `display:none` ved 0 ms og 300 ms virker (siden kan klikkes). Ved 1200 ms står dialogen stadig som `:modal` og siden er død (klik på søgelinket timer ud). Måling: `SP\func3.js`. Brave/uBlock-filtre lægges normalt tidligt, men ikke altid. En MutationObserver/`ResizeObserver` eller at undgå `showModal` ville lukke hullet.

### P3

- **P3-1. Skjult fejltitel på mobil.** Ved 503 vises bannerets titel som "Lageret kunne ikke hen..." (afskåret) på 375 px (`SP\shots\err-index-375.png`). Brugeren ser en afkortet sætning og "Prøv igen"/"Luk"; den fulde tekst er kun for skærmlæsere.
- **P3-2. En tom (men vellykket) Supabase-tabel viser fejltekst.** Hvis REST svarer `[]`, viser søgesiden "Lageret kunne ikke hentes" uden banner (`SP\func1.js`, mode `empty`). Kantfald, men teksten er upræcis.
- **P3-3. `?maxPrice=-5` giver 0 resultater** (tomtilstand), mens `?maxPrice=abc` ignoreres. Skal ignoreres på samme måde (som `type=junk` og `koerekort=Z` nu gør).
- **P3-4. Sidste native `confirm()`** står i `js/mine-annoncer.js:813` (ryd lokale data). Resten er flyttet til `js/bekraeft-dialog.js`.
- **P3-5. Linjeskift:** `js/search.js` er konverteret til CRLF (5346 linjers diff, men kun 12 indsatte/68 slettede med `--ignore-cr-at-eol`). Blander linjeskift i repoet og gør historikken svær at læse. Samme mønster i flere filer (318 filer: 6012 indsat uden filter, 3380 med).
- **P3-6. Mærkeoversigten har tomme logo-pladser** for de mærker, der mangler logo (Bach, Cagiva, Fantic, Kymco, Hyosung, Rewaco, Victory, SYM m.fl.): rækkerne står forskudt (`SP\shots\c_maerker.png`). Samme i old.
- **P3-7. Mobilens fastgjorte CTA siger "Vis nummer"** på en intern privatannonce for en udloggetbruger (`SP\shots\a375.png`), mens kortet siger "Log ind for at se sælgeren" og forklarer, at nummer kun vises hvis sælgeren har valgt det. "Vis nummer" lover noget, der måske ikke findes.
- **P3-8. Annoncesiden ved 768:** "Fakta om motorcyklen"-kortet strækkes til højden af nabokolonnen og får et stort tomt felt nederst (`SP\shots\a768.png`).
- **P3-9. Brandsiders tal kommer to steder fra.** Hero-feltet "6 Yamaha-motorcykler" (live) og leadteksten "Der er 68 brugte Yamaha-motorcykler" (statisk) kan afvige mellem to builds. I produktion er begge 68, men de er ikke samme kilde.
- **P3-10. Mobil: filterskuffen scroller ikke tilbage til resultaterne** efter "Vis resultater" (scrollY 0). Funktionelt rigtigt, men ikke hjælpsomt.

## Tjek 1: regressioner mod old

Pixelsammenligning (old mod new, `SP\diffs.py`): `annonce-ext/int/statisk`, `guide-forsikring`, `guides`, `opret`, `mine` (1440) er identiske til <0,02 %. Ændret er kun: `index`, `soegning`, `soegning-q`, `maerker`, `maerke-yamaha`, `type-sport`, `koerekort-a2`, `region`, `mc-harley`, `login`, `mine` (375). Jeg har set alle ændringer. Ingen er en regression:
- Index: typefliser lagt direkte under søgekortet, tillidsrække efter Udvalgte (bevidst). Indholdet er ellers ens.
- Søgning: hero og søgekort væk, kompakt fritekstfelt (bevidst). Mobil er mere kompakt og renere (`SP\shots\c_s375.png`, `c_sq375.png`). Filterskuffen virker (åbner, fokus på luk-knap, 22 søskende inert, Escape lukker, fokus tilbage på Filtre, "Vis resultater" lukker og anvender; overflow 0).
- Mærkesider: tomme 0-flisen "Fra 2021 og nyere, Se 0 annoncer" er fjernet (forbedring). Mærkeoversigt og region: kun layoutjusteringer (CLS).
- Kørekortsider: tekstindholdet er ordret identisk (jeg diffede sætning for sætning); kun layout/højde er ændret.
- Mørk tilstand: kontrol af index, annonce, login, mine, mærke, A2, opret, guide (`SP\shots\d1-d4.png`): ingen kontrastfejl set.
- 1920: ingen problemer; indholdet er centreret (`SP\shots\w1920.png`).
- Konsol/pageerror ved alle 360 indlæsninger: 0.

## Tjek 2: CLS

Se P2-1. Sider (48, over de krævede 40): index, soegning, annonce, maerker, 5 mærkesider, 8 typesider, 3 kørekortsider, 6 guides, login, mine-annoncer, opret-annonce, dashboard, forhandler, 2 regioner, 3 mc-sider, 2 modelsider, budget, by, om, 2 statiske annoncer, 404, privatliv, vilkår, sikkerhed. Viewports 375/430/768/1024/1440, lys + mørk, `--cls 0.05 --strikt`.

| Kørsel | Resultat |
|---|---|
| Omvendt rækkefølge (run2) | 480 målinger, 0 fejl, 0 advarsler, maks CLS 0,0265, 297 s |
| Hver side alene (48 x 10) | alle exit 0, maks CLS 0,0265 |
| Fremadgående (run1, run1b) | ugyldige: dvale (`ERR_NETWORK_IO_SUSPENDED`) + `type-scooter` 1440 0,089/0,087 |

## Tjek 3: funktionelle flows

Søgning (`SP\func1.js`, mod new; old kørt som reference):
- `?q=Honda` 16 resultater, `?q=honda cmx` 2, `?q=<script>` 0 (ingen script-udførelse, tomtilstand), `?q=zzzqq` 0 med tomtilstand.
- `?page=999` kappes til side 5 af 5 (1 kort); `?page=abc`, `-3`, `0` giver side 1. `type=junk` ignoreres (97; old gav 0, forbedring); `koerekort=Z` ignoreres; `maxPrice=abc` ignoreres; `sort=junk` giver "blandet"; `kilde=zzz` giver 0 med overskrift "Motorcykler hos zzz" (ærligt).
- Tomtilstand aldrig sammen med resultater: kontrolleret på 33 URL'er og med 12 hurtige skift mellem 0 og mange resultater: 0 tilfælde. De skjulte forudtegnede kort har ingen bokse.
- Sortering: pris stigende/faldende, årgang nyeste og km laveste er korrekte (kontrolleret numerisk). Paginering via klik: `?page=2`, "Viser 25–48 af 97". Typefilter via UI giver `?types=sport` (12), og både `type` og `types` læses ved genindlæsning.
- 503-mock: index og søgning viser banner ("Prøv igen"/"Luk") plus ærlig tomtilstand ("Vi kunne ikke hente annoncerne lige nu"); typetællere viser "?" i stedet for tal; fliserne på index står uden tal (`SP\shots\err1.png`). Se P3-1 for mobil.
- Opret (`SP\func2.js`): tomt felt giver 10 fejl med "Først: Vælg motorcykeltype" (nu rigtigt tal), alle fejl er `aria-invalid`; udfyldt + vilkår giver `POST listings 201` og redirect til `annonce.html?id=...&udgivet=1`.
- Login: første Tab er "Gå til indhold" (kontrolleret på 11 sider, begge temaer ikke nødvendigt). Forkert kodeord giver "Forkert e-mail eller adgangskode.", tomt felt "Skriv din e-mail.", rigtigt kodeord ender på `mine-annoncer.html?tab=oversigt`. Ingen Google/Facebook/Apple-login.
- Bekræftelsesdialog (`SP\func3.js`): slet og solgt åbner en `<dialog>` (modal) med annoncens navn, tydelige knapper og Escape annullerer uden at ændre noget. Slet har fokus på "Annuller" (sikkert); solgt har fokus på bekræft (reversibelt, acceptabelt). Bekræftet solgt giver `PATCH listings` + toast; bekræftet slet fjerner annoncen.
- Cookie (`SP\func3.js`): to ligestillede knapper (306x44, samme baggrund); Escape lukker ikke; "Kun nødvendige" gemmer valg og dialogen kommer ikke igen efter reload. Se P2-3 for blokkeren.

## Tjek 4: ærlighed

- Ingen opdigtede stjerner, anmeldelser, svartid ("Typisk svartid"), beskeder, betaling, social login eller forfatter. Guiden "MC-forsikring" er signeret "Af Bikerbasen, Redaktionel guide med kilder" (mockuppen har et opdigtet menneske). JSON-LD har ingen `aggregateRating`/`Review`, forfatter er `Organization`.
- Mine annoncer viser kun, hvad der findes (aktive, kladder, favoritter, på pause, søgeagenter). Ingen "visninger/beskeder"-tal ("Ingen visninger endnu").
- Annonce-sidebjælken siger ærligt "Bikerbasen har ingen betalingsløsning eller rører aldrig pengene" og "Beskeder til sælger kan endnu ikke sendes via Bikerbasen".
- Kørekortfakta (`koerekort-a1/a2/a`): A1 125 cm³/11 kW/0,1 kW/kg, fra 18; A2 35 kW/0,2 kW/kg, fra 20, ikke afledt af mere end dobbelt effekt; A fra 24 eller 22 efter 2 års A2. Tjekket mod et Folketingssvar fra 2013 (A1 18, A2 20, A 22/24) og stemmer. Jeg fandt ikke Færdselsstyrelsens egen nuværende side, så reglerne bør kontrolleres mod den (to tredjepartssider siger A1 fra 16; de afviger fra de officielle danske kilder, jeg fandt). Teksten er ordret uændret mod old.
- Se forbehold om demo-annoncer på localhost ovenfor.

## Tjek 5: SEO-diff (alle rod-*.html, old mod new)

101 filer, ingen tilføjet/fjernet. 90 er identiske på title, description, canonical, robots, H1 og JSON-LD. De 11 forskelle:
- 10 guide-sider (`guide-*.html`): kun `dateModified` i Article-JSON-LD (2026-10-17 til 2026-10-18; `datePublished` uændret). Forklarligt.
- `soegning.html`: statisk H1 er "Motorcykler til salg i Danmark" (old: "Find din næste motorcykel — Motorcykler til salg i Danmark"). Titel, description, canonical og robots er uændrede. Præcis én H1 i både statisk og hydreret DOM (kontrolleret efter filtrering).
- Alle 101 sider har præcis én H1. Alle JSON-LD blokke er gyldig JSON.

## Tjek 6: mærker

- 29 `maerke-*.html` findes; oversigten har 29 A-Z-poster med links til dem. Tællingerne summerer til 718, plus "2 annoncer oplyser ikke et mærke" = 720 (matcher "Søg blandt alle 720 annoncer"). Hver mærkeside viser samme tal som oversigten.
- Filter (mock med alle 29 mærker): `#so-brand` indeholder alle 29, og listen "Tilføj flere mærker" viser alle 29 (`SP\brands.js`).
- "Flere mærker (48)": ren liste uden links og uden egne sider, med teksten "Disse mærker kender vi, men ingen annoncer til salg er indekseret lige nu. De har derfor ingen egen side". Ærlig.

## Tjek 7: cookie-banner

Se P2-3. Kan lukkes (begge valg), siden er ikke inert efter svar, og en `display:none`-blokker ved 0 og 300 ms gør ikke siden død.

## Tjek 8: verificer-site

`node scripts/verificer-site.js --hurtig --med-udgiv` i new (med junction til hovedmappens `node_modules`): alle 8 trin grønne (node --check, synk-header, seo-audit, sitemap, døde links, package.json-test, udgiv tørkørsel). `npm test` springes over af `--hurtig`. Exit 0. Output: `SP\verificer.txt`.

## Ligner mockuppen x/10 og bedre/dårligere end old

| # | Mockup | new | old | Dom | Bemærkning |
|---|---|---|---|---|---|
| 1 | Forside | 7,5 | 7 | lidt bedre | Rækkefølgen følger nu brugerens beslutning; samme struktur som mockuppen (hero, søgekort, typer, udvalgte + sælg-kort, 3 bundmoduler). Mockuppens rytterfoto og grønne CTA er ikke med (orange er bevidst, jf. `DESIGN_DNA.md`). |
| 2 | Motorcykler til salg | 6 | 7,5 | dårligere mod mockuppen (bevidst) | Hero og søgekort er fjernet; mockuppen har begge. Sidebar, chips, antal, sortering, grid/liste og 4 kolonner stemmer. |
| 3 | Annonce | 7 | 7 | uændret | Strukturen matcher mockuppen overraskende tæt (3 kolonner, fakta, "Kan du køre", "Det bør du tjekke", lignende), men siden er ikke rørt i V3 (0,01 % pixelforskel). |
| 4 | Opret annonce | 6 | 6 | uændret | Ét-sides-form med 4 trin mod mockuppens 5; "Din annonce"-forhåndsvisning og hjælpebokse findes, men uden fotografi og uden mockuppens tips-bokse. |
| 5 | Mærker (Yamaha) | 7 | 6,5 | lidt bedre | Samme sektioner som mockuppen; 0-flisen fjernet. Logo + rytterfoto i hero er ikke med. |
| 6 | Sport motorcykler | 7 | 7 | uændret/lidt bedre | Hero med faktaboks, søgekort, tillidsrække, udvalgte og sælg-kort stemmer; mangler "typer inden for" og "populære modeller" med rigtige tal. |
| 7 | Motorcykler til A2 | 7 | 7 | uændret/lidt bedre | Faktarække, søgekort, udvalgte stemmer. Teksten er uændret, layoutet kortere. |
| 8 | Artikel | 7 | 7 | uændret | Hero, indholdsfortegnelse, "Kort fortalt", kørekortkort stemmer; ærlig byline i stedet for opdigtet forfatter. |
| 9 | Login eller opret profil | 6,5 | 6,5 | uændret | To-kolonne-kort med billede og fordelsliste som mockuppen, uden social login og uden opdigtede tal (bevidst). |
| 10 | Mine annoncer | 6,5 | 6,5 | uændret | Faner, statistikkort, annoncerække med handlinger; ingen visninger/beskeder (ærligt). |

Gennemsnit: new 6,8, old 6,9 (forskellen er hele søgesiden, som er valgt bort fra mockuppen). Ingen side er blevet markant dårligere eller bedre; V3 var primært ærlighed, robusthed og CLS, ikke visuel tilnærmelse.

## Prioriteret liste til næste runde

1. **Annoncesiden mod `Annonce.png` (ikke rørt i V3).** Det er sidens vigtigste skærm, og den er identisk med old. Konkrete forskelle mod mockuppen:
   - Galleri: mockuppen har stort billede + thumbnailstribe med "+N". Eksterne annoncer har kun ét billede fra kilden (kan ikke opdigtes), men egne annoncer bør få tydeligere thumbnailstribe/tæller og samme højde som titelkolonnen.
   - Beskrivelse: mockuppen har en afkrydsningsliste med udstyr/stand. Brug de felter, der faktisk er oplyst (udstyr, service, ejere), ellers udelad; og udnyt pladsen under beskrivelsen i stedet for tomme felter.
   - Sælgerkort: mockuppen har ét stort, grønt CTA + sekundær række (ring/besked). På new er CTA'en "Gå til annoncen hos X" (ekstern) eller "Log ind for at se sælgeren" (intern). Gør hierarkiet ens (stor primær + to sekundære) uden at love funktioner, der ikke findes. Ret mobil-CTA'en "Vis nummer" (P3-7).
   - "Fakta om motorcyklen": ret den tomme bund (P3-8) og brug mockuppens to ikon-kolonner uden "Ikke oplyst"-linje under tabellen.
   - "Det bør du tjekke": mockuppen har den som kompakt kort i højre kolonne med foto; new har et fuldbredt bånd. Overvej at flytte den.
   - "Lignende motorcykler": mockuppen viser 6 slanke kort med foto i fuld bredde; new har højere kort med flere chips. Skær ned til mockuppens tæthed.
   - Typografi: mockuppen bruger ren, tung grotesk til titel og pris; new bruger display-fonten med mere karakter. Vurder, om titel/pris skal rolige ned.
2. **Søgesiden uden hero** er bevidst, men mockuppen "Motorcykler til salg" har aktive chips og tællere tæt på toppen; sørg for, at "Ryd alle filtre" og aktive chips er lige så synlige på desktop (de er der, men først efter en tom række). Ret H1-tallet (P2-2).
3. **CLS-gaten** (P2-1): fix `fa-sektion` på typesiderne (reservér højde til intro + "Er en X noget for dig?"-kortet), og få `--strikt` til at køre i faste rækkefølger i CI.
4. **Cookie-failsafe** (P2-3): fang også sen skjulning.
5. **Opret annonce:** mockuppens 5 trin og "Gode titler"/"God beskrivelse"-bokse mangler; overvej en titelrække og et billedfelt, der ligner mockuppens (stort uploadfelt + miniaturer), og et eksempelkort med foto, ikke kun tekst.
6. **Hero-fotografiet:** hver side bruger samme mørke motorcykelfoto (uden rytter), mens mockuppens signatur er rytter ved kystvej. Det er den største resterende visuelle forskel efter farven (som er bevidst).
7. **Mærkeoversigt:** tilføj manglende logoer eller skjul tomme logo-pladser, så rækkerne står lige (P3-6). Hold tallene samlet fra én kilde (P3-9).
8. Småting: P3-1 til P3-5, P3-10.

## Bevis (udvalgte filer)

- `SP\shots\index\new-375-lys.png`, `SP\shots\c_index375.png` (old|new, typefliser under søgekort)
- `SP\shots\soegning\new-1440-lys.png`, `SP\shots\c_s375.png`, `SP\shots\c_sq375.png`
- `SP\shots\annonce-ext\new-1440-lys.png`, `SP\shots\annonce-int\new-1440-lys.png`, `SP\shots\a375.png`, `SP\shots\a768.png`
- `SP\shots\m_maerke.png`, `m_type.png`, `m_a2.png`, `m_login.png`, `m_art.png`, `m_mine.png`, `m_opret.png` (mockup | new)
- `SP\shots\err1.png`, `SP\shots\err2.png` (503-tilstand), `SP\shots\soegning\mob-drawer-new.png`
- `SP\smoke-run2.txt`, `SP\smoke-alone-*.txt`, `SP\smoke-run1.txt`, `SP\smoke-run1b.txt`, `SP\verificer.txt`, scripts: `SP\func1.js`-`func4.js`, `SP\cls.js`, `SP\seo.js`, `SP\brands.js`.
