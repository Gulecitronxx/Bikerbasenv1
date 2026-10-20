# V4 Critic, samlet dom (blind, frisk kontekst)

Bedømt: `new` = 262ac42a (gauntlet/master, bygget) mod `old` = 95df5046 (forrige produktion) og de ti mockups i `Bikerbasen billeder`.
Metode: `git archive` af begge commits til `C:\Users\pasca\AppData\Local\Temp\cv4\{new,old}` (node_modules som junction til hovedmappen). Statisk server + Playwright på værten `bb-qa.test` (så `SHOW_DEMO_DATA` er false som i drift). Netværk blokeret undtagen GET mod Supabase (lagerets 735 rækker hentet læsende og gemt som snapshot, derefter samme data til old og new, så sammenligningen er retfærdig). `SUPABASE_SERVICE_ROLE_KEY` fjernet i hver shell. Ingen build/generator/crawler mod produktion, ingen skrivning til Supabase (alle ikke-GET afvist af min mock), ingen commits eller ændringer i hovedmappen udover denne fil. Mine værktøjer: `cv4\tools\*.js`. Rå resultater: `cv4\res\*`. Skærmbilleder: `cv4\shots\{old,new,cmp}` (temp-mappe: tag dem med, hvis de skal gemmes).

## 0. Dom: PUSH (ingen hotfix nødvendig)

Intet P0 og intet P1. Alle målbare krav fra opgaven holder, og jeg har ikke kunnet få V4 til at regressere mod old på nogen sidefamilie. Det, der stadig er galt, er enten gammelt (findes identisk i old) eller småt. Det mest værd at rette i næste runde er P2-1 (opret-annonce kan ikke vælge et uregistreret mærke).

Samtidig: Builderens selvscorer er for høje mod mockuppen (forside 8/10, annonce 6/10 m.fl.). Jeg lander 0,5-1,5 point lavere (se afsnit 2). V4 er en reel forbedring på mærker, søgelogik og annonceside, men visuelt er resten af sitet pixel-identisk med old.

## 1. Fund (P0 til P3, med bevis)

### P0
Ingen.

### P1
Ingen.

### P2
1. **Opret-annonce har ingen "Andet mærke"-udvej.** `#f-brand` er `required` og har 93 registermærker (old: 60), men intet fald-tilbage. En sælger med fx Silence, NIU, Segway, Boss Hoss, Polaris/Slingshot, Aermacchi, CZ, Scorpa, Malaguti eller Stark kan ikke oprette annoncen (målt: `res/brands.json` -> `new.opret`, ingen post matcher andet/ukendt). Samme hul i old, men V4's formål er "komplet mærkedækning", og hullet er nu tydeligere, fordi resten er lukket. Forslag: valgmulighed "Andet mærke (skriv selv)" der mappes til `Ukendt` indtil registret kender det, og som fylder `maerke-kandidater`.
2. **CLS over eget mål på dybe søge-links ved 768 px.** Live-data, 8 gentagelser: `soegning.html?types=cruiser` = 0,076 hver gang (new) / 0,075-0,076 (old); `?q=cf+moto` 0,032-0,076 (new) mod 0,072-0,112 (old). Smoke (`--cls 0.05 --strikt`) fanger det ikke, fordi den kun åbner `soegning.html` uden query. Ikke en regression (old er værre eller lig), men 0,05 er jeres egen streng, og under 0,10 (Googles "god"). Evidens: `res/clslive.json`, `tools/clsrep.js`.
3. **Søgekort ved 768 px: chip-rækken løber over i smalle kort.** "BMW R 1300 RS": "Kræver A | 1.300 ccm 145 hk Bytter gerne" ligger oven i hinanden/er klippet (`shots/cmp/soegning-768-lys.png`, venstre = old, højre = new, begge). Uændret af V4. 
4. **"Flere mærker" forældes mellem byg.** Med en mocket egen annonce for Zero: filteret får Zero (`?brands=Zero` giver "Zero til salg - 1 annonce"), men maerker.html viser stadig Zero som ikke-klikbar pille med teksten "ingen annoncer til salg er indekseret lige nu", og der er ingen `maerke-zero.html` før næste byg (`tools/zero.js`). Det er et ærligt, men synligt hul i øjeblikket. Builderens egen dækningsrunner ser det som info (`pille-har-annoncer`).
5. **Mærkehurtigsøgningen på maerker.html siger "Ingen mærker matcher." for mærker, siden selv kalder "kendte"** (Zero, Vespa, Piaggio, "zero motorcycles": `tools/hurtig.js`). Siden et andet sted på samme side lister dem under "Flere mærker (63)". Ret teksten til "X kender vi, men ingen annoncer lige nu".
6. **Smoke-infrastrukturen er ikke deterministisk.** Én af 59 "hver side alene"-kørsler gav `ERR_NO_BUFFER_SPACE` (annonce-harley-davidson-flhx-2007-541ad405, 375 lys; `res/alone.txt`); 3 genkørsler: 0 fejl. Samme OS-fejl som Builder dokumenterede i annonce.md 9b. Der er stadig ikke indbygget genforsøg i `smoke-browser.js`; en "0 fejl"-påstand kan derfor ikke kræves af en enkelt kørsel.

### P3
1. De 63 "Flere mærker"-piller er runde ramme-piller, der ligner knapper, men ikke kan trykkes (`shots/flere-1440-lys.png`, `flere-375-moerk.png`). Begrundelsen står i teksten ovenfor, men affordancen lyver. Giv dem `cursor:default`, ingen hover og evt. anden form.
2. Tre mærker, registret selv flagger `verificeret:false` (Daelim, Super Soco, TM Racing), står offentligt som "kender vi".
3. `?brands=xyz` giver H1 "xyz til salg - ingen annoncer lige nu": brugerens tekst spejles som om det var et mærke (sikkert: ingen XSS fundet med `<img onerror>` og `<script>` i `q`/`types`).
4. Mobil-CTA udlogget på egen annonce: knappen "Log ind for at se nummer" bryder på to linjer med en 11 px underlinje ("Ikke alle sælgere viser et"); trang og svær at læse (`shots/cmp/annonce-int-375-moerk.png`). Ærlig, men pænere som to elementer.
5. Eksternt foto ved 768: kreditpillen "Foto: MC Syd - flere billeder i deres annonce" bryder på to linjer og fylder fotoets top (`shots/cmp/annonce-ext-768-lys.png`). Og "flere billeder i deres annonce" kan ikke garanteres for hver annonce (gammel tekst, ikke ny).
6. `js/data.js` er vokset 106 til 127 KB (gzip 39 til 46 KB) på alle ~100 sider, fordi hele registret er kopieret ind. Lille, men det er nu den tungeste delte fil efter search.js.
7. Datakvalitet, uændret fra old men nu mere synligt: "Triumph Norton købes" ligger under BSA og "moto cross købes" som Uoplyst mærke (begge "købes"-annoncer, ikke til salg). Rapporteret af Builder også.
8. Kørekortfakta: A1 18 år, A2 20 år, A 24 år (22 efter 2 år A2) stemmer med Folketingets svar og anden dansk kilde (modsat mockuppen, der siger A2 fra 18, og EU-direktivets 16/18/20). Teksten "Har du haft A1 i 2 år, kan du komme til A2 før" på A2-siden kunne jeg ikke verificere hos en officiel kilde; bør have kildehenvisning eller væk.
9. Statiske `annonce-*.html` (forhåndsrenderet til crawlere) har den gamle markup (Builder nævner det selv).

### Bekræftet godt (det jeg forsøgte at ramme og ikke kunne)
- Cookie-failsafe: blokker, der skjuler dialogen efter 0, 300, 1200, 3000, 6000 og 13000 ms: dialogen lukkes og siden kan klikkes i alle seks (`tools/flowsB.js`, `tools/cookie0.js`). Old (kun målt ved 0/5/50/300 ms) lukkede ved 300 ms først efter ca. 600 ms (dialogen stod åben et halvt sekund); 1200 ms og senere er kun testet mod new, hvor Builders beskrivelse af old-fejlen ikke er genmålt af mig. Normalt flow: "Kun nødvendige" fjerner banneret, husker valget efter reload.
- Bekræftelsesdialog: "Ryd data i denne browser?" (new) er en modal `<dialog>` med fokus på "Annuller", Escape lukker og returnerer fokus til knappen, bekræft sender videre til forsiden. Old brugte native `confirm()`. Slet-annonce-dialogerne fandtes allerede fra V3.
- Skip-link "Gå til indhold" er første Tab-stop og synlig på login, søgning, annonce, mærker, opret-annonce og forside.
- Ærlighed: ekstern annonce har 0 `tel:`-links, 0 telefonknapper, 0 tæller, 0 miniaturer, ét foto (`B.ext`), kilde-CTA har `rel="noopener noreferrer nofollow" target=_blank`. Udlogget intern: "Log ind for at se nummer / Ikke alle sælgere viser et". Logget ind (mocket session): "Vis telefonnummer" giver enten nummeret eller "Sælgeren viser ikke sit telefonnummer" ved tomt svar. Intet opdigtet (anmeldelser, svartid, finansiering, "tusindvis") fundet i nogen side (grep over alle html + js).
- URL-bevarelse: gamle søge-links kanoniseres pænt (`?brands=Sym` -> SYM, `Royal-enfield` -> Royal Enfield, `Bsa` -> BSA, `CFMOTO` -> CFMoto, `Zero+Motorcycles` -> Zero, `honda&model=gl1800goldwing` -> rigtig model; `?brands=Ukendt` virker). Old gav 0 for flere af dem (`Royal-enfield` 0, `Harley` 0, `honda&model=gl1800goldwing` 0).
- H1 følger resultatet ("720 motorcykler til salg i Danmark", "Honda til salg - 307 annoncer", "Ingen motorcykler ..."); old stod fast på 720 uanset filter. Tomtilstand og resultatgitter var aldrig synlige samtidig (5 søgninger x 6 målepunkter, 0 sammenfald). 503-mock: bannerteksten "Vi kunne ikke hente annoncerne fra databasen ..." + "Lageret kunne ikke hentes", ingen halve resultater. Tom-svar (200 []) giver "Vi kunne ikke hente annoncerne lige nu - prøv igen". Ugyldige parametre (`maxPrice=-5`, `page=abc`, `-3`, `999` (klemmes til 30/30), `minYear=abc`, `sort=zzz`, `brands=`, `koerekort=Z`) ignoreres uden fejl.

## 2. Ligner mockuppen x/10 og bedre/dårligere end old

Mine skærmbilleder bruger 1x1-billeder (alle fotos er derfor lilla flader i begge versioner), så jeg dømmer layout, hierarki, tæthed og indhold, ikke fotografi. Mockuppen har rytterfoto, grøn primærfarve og indhold (billedtællere, anmeldelser, "+10", kg, sociale logins), som reglerne i CLAUDE.md eller data ikke tillader. Jeg trækker kun for det, der KUNNE være gjort ærligt.

| # | Mockup / side | Mockup-lighed new | old | Bedre/dårligere end old | Hvorfor |
|---|---|---|---|---|---|
| 1 | Forside / index | 6,5 | 6,5 | Lig (+0,0) | Sidehøjde pixel-identisk ved alle 5 bredder; kun bjerg-tegningen i guide-banner og samme højde på "Sådan virker"-titler. Builder 8/10 er for højt: mangler rytter-hero, grøn CTA, større søgekort og de rige modelkort (kg, 1/12-tæller) |
| 2 | Motorcykler til salg / soegning | 5,5 | 5,5 | Visuelt lig; funktionelt klart bedre | Kompakt søgefelt i stedet for hero + stort søgekort + filterchips. Nu: H1 følger resultat, model fra lager ("GL 1800 Gold Wing (24)", 195 modeller under Honda), alias-fritekst, infobånd kortere (-58 px ved 375), skeletter |
| 3 | Annonce | 6,0 | 4,5 | Bedre (+1,5) | Info-panel som kort, sticky sidekort, kildekort med to sekundærknapper, foto med kreditpille + ud-knap, nøgletal i grid, slankere lignende-stribe, ny mobilrækkefølge (kilde før faktatabel; ekstern 6462 -> 6181 px ved 375). Mangler galleri, anmeldelser, "Ring op" (forbudt/opdigtet) |
| 4 | Opret annonce | 6,0 | 6,0 | Lig (pixel-identisk) | Stepper, vejledningskort, forhåndsvisning findes. Eneste ændring er mærkelisten (93), som ikke kan ses |
| 5 | Mærker (maerker + maerke-honda; mockup er Yamaha-mærkeside) | 6,0 | 5,0 | Bedre (+1,0) | Topmærker 4+4 i stedet for 6+2, A-Z med ens monogramkolonne, 4 kolonner, region som søjler, "Sådan virker" kortere. Hero stadig flad uden rytter. "Flere mærker" er ærlig, men fylder meget ved 375 (63 piller) |
| 6 | Sport motorcykler / type-sport | 6,5 | 6,3 | Marginalt bedre (+0,2) | "Mere om udvalget" med chevron, tomme overskrifter skjult. Ellers identisk; mangler undertyper med foto og "Populære modeller" med billeder |
| 7 | Motorcykler til A2 / koerekort-a2 | 6,5 | 6,3 | Marginalt bedre (+0,2) | Samme som 6; faktaboksen og "Hvad må du køre" er tæt på mockuppen |
| 8 | Artikel / guide-foerste-motorcykel | 6,5 | 6,5 | Lig (pixel-identisk) | Ingen V4-ændring |
| 9 | Login | 5,5 | 5,5 | Lig (pixel-identisk) | Ingen Google/Facebook/Apple (ikke bygget, med god grund), ingen stor rytter-collage |
| 10 | Mine annoncer | 6,0 | 6,0 | Lig (pixel-identisk; logget ind tjekket med mocket session) | Strukturen er mockuppens (stat-kort, liste, konto-kolonne), men uden visninger/beskeder, fordi data ikke findes. Ærligt |

Gennemsnit new 6,1 mod old 5,8. Kun 3, 5 og (svagt) 2/6/7 flytter sig; fire familier (4, 8, 9, 10) er byte-identiske i alle 10 skærmbilleder pr. familie (SHA-lig).

Regression mod old (afsnit 1 i opgaven): 12 sider x 5 bredder (375/430/768/1440/1920) x lys+mørk x 2 versioner = 240 skærmbilleder. 0 vandret overflow, 0 konsol-/sidefejl. Ingen visuel regression fundet; kun de forventede ændringer. Evidens: `shots/cmp/{forside,soegning,annonce-ext,annonce-int,opret,maerker,maerke-honda,type-sport,koerekort-a2,guide,login,mine-annoncer}-1440-lys.png`, `...-375-lys/moerk.png`, `...-768-lys.png`, `annonce-int-1920-lys.png`, `maerker-1440-moerk.png`.

## 3. CLS og smoke

Kommando (alle kørsler): `node scripts/smoke-browser.js --sider <59 sider> --viewports 375,430,768,1024,1440 --temaer lys,mørk --cls 0.05 --strikt`. De 59 sider = index, soegning, annonce, 2 statiske annonce-*, maerker, 30 maerke-*, 8 type-*, koerekort-a/a1/a2, opret-annonce, login, mine-annoncer, guides, guide-foerste-motorcykel, mc-honda-cruiser, model-honda-cb-1000-r, region-hovedstaden, by-horsens, budget-under-50000, dashboard, forhandler.

| Kørsel | Resultat |
|---|---|
| 1 (alfabetisk, lys->mørk) | 590 målinger, 334 s, **0 fejl, 0 advarsler** |
| 2 (omvendt sider, omvendt viewports, mørk->lys, parallel 2) | 590 målinger, 493 s, **0 fejl, 0 advarsler** |
| Hver side alene (59 separate processer, parallel 1) | 58 x 0/0; 1 x `ERR_NO_BUFFER_SPACE` (OS), 3 genkørsler 0/0 |
| Hele sitet (alle 102 rod-html) 375+1440, lys+mørk | 408 målinger, **0 fejl, 0 advarsler** |

Egen CLS-måling med **live lagerdata** (720 annoncer; strengere end smoke-fixtures' 48): 13 sidetyper x 375/430/768/1440 x lys/mørk. new maks: index 0,000; soegning 0,009; annonce ekstern 0,001; intern 0,002; maerker 0,011; maerke-honda 0,000; type-sport 0,000; A2 0,000; opret 0,007; guide 0,000. Eneste overskridelser er de to dybe søge-links (P2-2). Verifikation og tests: `node scripts/verificer-site.js --hurtig --med-udgiv` i new: **alle 8 trin grønne** (exit 0). `npm test` i new (jeg kørte den ekstra): 1521 tests, **1520 grønne, 0 fejl, 1 sprunget over**.

## 4. SEO-diff mod old (alle rod-*.html + sitemap)

Script `tools/seo.js` (title, description, canonical, robots, H1, og:title, JSON-LD som struktureret JSON, sitemap-loc).
- Nye filer: kun `maerke-dkw.html` (noindex, follow; canonical `/maerke-dkw`; ikke i sitemap; 1 annonce, DKW 250, 1956).
- Fjernede filer: ingen. Alle 29 gamle mærkeside-URL'er findes stadig (ingen død URL).
- Ændrede metadata på eksisterende sider: kun `maerker.html` description ("29 mærker" -> "30 mærker"). Ingen ændring i title, canonical, robots, H1 eller JSON-LD på nogen anden side.
- Sitemap: 73 -> 73 URL'er, identiske `<loc>`; kun `lastmod` på facet-/maerker-sider (17./18. okt -> 20. okt). Ingen noindex-side i sitemap (`maerke-cfmoto`, `-lauge-jensen`, `-dkw` osv. alle udenfor).
- Alle sider med `backend-bridge.js`/`filtrering.js`/`search.js` indlæser også `data.js` (registret er der). Versionsstempel `?v=` er skiftet (ac2dae2c -> fbce3c18), så gamle caches ikke bliver hængende.
- `title id="page-title"` på annonce.html/forhandler.html er med vilje dynamiske (mit regex-fund, ikke et sitefund).

## 5. MÆRKEDÆKNING (dokumentation)

### 5.1 Builderens runner (kørt af mig mod ren kopi)
- `node scripts/v4-maerke-dakning.js` (fixtures): 93 registermærker, 30 mærkesider, filter 18/18, opret 93/93, alias syntetisk 335, **0 fejl, 0 advarsler**, 9 info.
- `--data live --baseline docs/.../maerke-baseline-live.json`: lager 720 annoncer, 31 mærkenavne, filter 30/30, mærkesider 30/30, opret 93/93, hurtigsøg-aliasser 57, 0 afviste Supabase-skrivninger. Baseline: **719 uændret, 0 fjernet, 0 skiftet, 0 stavning, 1 Ukendt->DKW** (annonce 92279869, "DKW 250", `Andet Mærke` i kilden). **0 fejl, 1 advarsel** (netop DKW-valideringen), 4 info.

### 5.2 Min egen stikprøve (17 mærker, live-data, begge versioner)
Alle tal er hydreret i browseren (`res/brands.json`; script `tools/brands.js`). Filter = rækken i søgningens mærkeliste; UI = antal efter valg via `?brands=`; Side = `[data-mk-n]`; Oversigt = tal på maerker.html.

| Mærke | Filter new (old) | UI-antal new | Mærkeside new / robots | Oversigt new | Opret-annonce new (old) | Bemærkning |
|---|---|---|---|---|---|---|
| Lauge Jensen | 2 (2) | 2 | 2 / noindex | 2 | ja (nej) | "Lauge"+"Lauge Jensen" slået sammen |
| Bach | 1 (1) | 1 | 1 / noindex | 1 | ja (nej) | |
| CFMoto | 1 (1) | 1 | 1 / noindex | 1 | ja (ja) | annonce ligger som "Andet Mærke / CFMOTO MTX800" i kilden, fundet via titel |
| FB Mondial | 1 (1) | 1 | 1 / noindex | 1 | ja (nej) | |
| Rewaco | 1 (1) | 1 | 1 / noindex | 1 | ja (nej) | |
| DKW | **1 (ingen)** | 1 | 1 / noindex (ny side) | 1 | ja (nej) | var "Ukendt"; ny side, ikke i sitemap |
| Zero | ingen (ingen) | 0 ("ingen annoncer lige nu") | 404 (ingen side) | ingen række | ja (nej) | intet lager; pille under "Flere mærker" |
| BSA | 8 (8) | 8 | 8 / indekserbar | 8 | ja (ja) | 5 "BSA" + 3 "Bsa" |
| Honda | 307 (307) | 307 | 307 | 307 | ja | 320 rå rækker, 13 tværkildedubletter |
| Harley-Davidson | 83 (83) | 83 | 83 | 83 | ja | |
| MV Agusta | 2 (2) | 2 | 2 / noindex | 2 | ja | |
| Royal Enfield | 14 (14) | 14 | 14 | 14 | ja | rå "Royal-enfield" slået ind (old gav 0 på `?brands=Royal-enfield`) |
| Victory | 2 (2) | 2 | 2 / noindex | 2 | ja | |
| SYM | 1 (1, "Sym") | 1 | 1 / noindex | 1 | ja | stavemåde SYM nu overalt |
| Fantic | 1 (1) | 1 | 1 / noindex | 1 | ja | |
| Husqvarna | 2 (2) | 2 | 2 / noindex | 2 | ja | |
| Kymco | 1 (1) | 1 | 1 / noindex | 1 | ja | |

Konklusion: filter = UI = mærkeside = oversigt = forside "Populære mærker" for alle mærker med lager (også hele 30-listen via runneren). Eneste mærke i stikprøven uden lager (Zero) kan vælges i opret-annonce og via `?brands=Zero` (viser "ingen annoncer lige nu"), men står ikke i søgningens mærkeliste, fordi listen er lager-baseret (rimeligt valg, men Zero kan ikke "vælges" som afkrydsning).

Alias i fritekst (`?q=`, new; old i parentes): `cf moto` 1 (1), `CFMOTO` 1 (1), `cf-moto` 1 (1), `harley` 83 (83), `hd` 83 (83), `bmw motorrad` **47 (0)**, `zero motorcycles` 0 (0), `zero` 0 (0), `bsa` 8 (8), `dkw` 1 (1), `lauge` 2 (2), `fb mondial` 1 (1), `rewaco` 1 (1), `royal enfield` 14 (14), `mv agusta` 2 (2), `sym` 1 (1), `h d` **83 (425)** (old matchede alt med h og d), `ukendt` **0 (2)** (sentinellen kan ikke længere findes ved at skrive ordet), `harley road king` 7 (7), `honda cb 1000` 38 (38). Rigtigt (på nær at "zero" naturligt giver 0, fordi der ikke er lager).

Maerker-hurtigsøg (new): `cf moto`->CFMoto, `harley`->Harley-Davidson, `bmw motorrad`->BMW, `lauge`, `dkw`, `bsa`, `royal-enfield`: alle ét match. `zero`, `vespa` (kendte, uden annoncer): "Ingen mærker matcher." (P2-5).

"Flere mærker": 63 piller, **0 links på pillerne**; de tre links i afsnittet er forklarende (`opret-annonce`, `soegning` x2). Gruppering: 41 aktuelle + 22 historiske.

### 5.3 Før / efter
| | Før (old) | Efter (new) |
|---|---|---|
| Mærker i register | 79 (fem uafhængige lister) | 93 (ét register, `js/brands-registry.js`) |
| Opret-annonce mærkevalg | 60 | 93 (alle, også historiske) |
| Mærkesider | 29 | 30 (+ `maerke-dkw`, noindex) |
| Søgefilter-rækker (lager) | 30 inkl. "Ukendt (2)" | 31 inkl. "Uoplyst mærke (1)", sidst, DKW som rigtigt mærke |
| "Flere mærker" | 48 ikke-klikbare piller | 63 ikke-klikbare piller i to grupper (aktuelle/historiske) med forklaring |
| Annonce ændret mærke | - | 1 af 720 (DKW 250: Ukendt -> DKW), 0 uforklarede |

**Tilføjede mærker (15):** AJP, Italjet, Tomos, DKW, Ariel, Matchless, Velocette, Vincent, Brough Superior, Greeves, Bultaco, Hercules, NSU, Horex, Morbidelli.

**Der mangler stadig** (målt: `BrandRegistry.normalise()` returnerer null; ingen mærkeside, ingen valgmulighed i opret-annonce): Silence, NIU, Horwin, Segway, Stark, Cake, Hanway, Lifan, Skyteam, PGO, Benda, Macbor, Big Dog, Boss Hoss, Confederate, Excelsior, Polaris (Slingshot), Aermacchi, Malaguti, CZ, Cotton, Douglas, Rudge, Scott, Sunbeam, Cushman. De er med god sandsynlighed relevante for et dansk lager (især de små el-/125-mærker og amerikanske customs). Plus P2-1: uden "Andet mærke" i opret-annonce er hvert manglende mærke en blokeret sælger.

## 6. Prioriteret liste til næste runde
1. (P2-1) "Andet mærke" i opret-annonce + kandidatloop, så et manglende mærke aldrig blokerer en annonce. Tilføj samtidig de ca. 12 mest sandsynlige manglende mærker (Silence, NIU, Segway, Stark, Boss Hoss, Polaris, CZ, Scorpa, Aermacchi, Malaguti, Horwin, Hanway).
2. (P2-5 + P2-4) Mærkehurtigsøg og "Flere mærker": "X kender vi, men ingen annoncer lige nu"; vis mærker, der har egne annoncer siden sidste byg, som klikbare til `soegning?brands=X`, og lad en rigtig hydrering fjerne pillen.
3. (P2-2) Smoke: tilføj dybe søge-URL'er (`?types=cruiser`, `?q=cf+moto`, `?brands=Honda&sort=price-asc`) ved 768 og 1024, og find de 0,076 (sandsynligvis infobånd/filterchips før `so-klar`).
4. (P2-3) Søgekort ved 768: chip-række der ombrydes/klippes pænt (flex-wrap eller skjul "Bytter gerne" ved smal kolonne).
5. (P2-6) Genforsøg på `ERR_NO_BUFFER_SPACE` i `smoke-browser.js` og keep-alive på dens server.
6. (P3-1) Piller der ligner knapper men ikke er det; (P3-2) fjern eller skjul mærker uden belæg, til ejeren har bekræftet dem; (P3-3) spejl ikke ukendt `?brands=` i H1.
7. (P3-4/5) Mobil-CTA udlogget: to linjer, 11 px; fotopille ved 768.
8. Visuelt mod mockup (størst løft pr. indsats): forside-hero med rytter og større søgekort (6,5 -> 8), søgeside med hero + stort søgekort + filterchips som i mockuppen (5,5 -> 7), mærkehero med rytter (6 -> 7,5). Kræver assets, ikke kode.
9. Datakvalitet i crawler/normalisering: "købes"-annoncer (BSA/Ukendt) skal ikke vises som til salg; støj i modelnavne er nu synlig i modelfilteret (`CBF125 2009 Projekt mekaniker`, `Café' ræser`).
10. Dokumenter kørekortudsagnet "A1 i 2 år -> A2 før" med kilde, eller fjern.

## 7. Hvad jeg ikke kunne
- Ingen ægte fotos i mine skærmbilleder (billeder mocket til 1x1), så billedbeskæring og LCP er ikke vurderet.
- Ingen test mod ægte Supabase-login; "logget ind" er en mocket session med mocket `/auth/v1/user` og fixtures. Funktionen "Vis telefonnummer" er testet med mocket RPC.
- Live-data blev læst (GET) fra produktions-Supabase af runneren (`--data live`) og af min harness (snapshot, to forespørgsler); ingen anden trafik mod produktion.
