# Critic w3-data (blind): datakvalitet og ærlige mærker

Worktree wt/w3-data, HEAD 0f52714 mod c4e8b15. Ingen kald til produktion; alle Supabase-kald mockes lokalt (page.route, egne fixtures); scripts i `Desktop/rod/crit/` (udenfor repoet); kommentarfjerner og udgiv kørt på en kopi i scratchpad. Ingen produktionskode ændret.

## Samlet dom: AFVIS (smal, billig at rette) 

Alt det Builderen testede holder, og regressionen er ren. Men reglerne har tre reelle fejl, to af dem fjerner ægte data, og én ny falsk påstand. Ret dem, så ACCEPTER.

## Fund

| # | Sev | Fund | Reproduktion |
|---|---|---|---|
| 1 | P1 (smal) | `saniterTal`: "ccm = tallet efter årg" nulstiller **ægte** ccm, når modellen selv hedder det samme tal som årgangen: Honda XR 80 / C90 / DT80 med "årg 80"/"årg 90" i titlen. Kubikken var rigtig. Følge: ccm "Ikke oplyst", og `koerekortForListing` giver **A2** i stedet for **A1** (ccm=null, hk 6 -> A2), så annoncen falder ud af A1-filteret for en 16-årig. | `saniterTal({ccm:80,hk:6,aargang:1980,tekst:'Honda XR 80 årg 80'})` -> `{ccm:null,hk:6}`. Browser (mock): annonce "Honda XR 80": Motorstørrelse "Ikke oplyst", Kørekort "Mulig A2". Samme for `Honda C90 årg 90`. Forslag: spring regel "årg NN" over, når ccm-tallet også står som selvstændigt ord i titlen uden for "årg …" (xj **900** årg 90 -> 90 nulstilles stadig; XR **80** årg 80 -> 80 bevares). |
| 2 | P1/P2 | `erEfterspoergsel` fjerner **ægte salgsannoncer**: "købes" og "søges" matcher overalt i titlen. "Honda CBR 600 kan købes med 12 mdr garanti" (forhandlersprog) og "Honda VFR - søges nyt hjem/ny ejer" er salg. De ryger ud af lager, søgning og tal (kun direkte adresse virker). "Købt ny, kan evt. byttes" er korrekt ikke fanget. | `erEfterspoergsel('Honda CBR 600 kan købes med 12 mdr garanti')` = true; i browser lå rækken i `EXTERNAL_DUBLETTER`, væk fra søgning. Forslag: kræv "købes/søges" som hele titlen eller titlens afslutning/start, og afvis efter "kan/må/skal/ikke"; "søges ny ejer/nyt hjem" skal ikke tælle. Kør sweep på snapshot for at se de rigtige hits. |
| 3 | P2 | Ny falsk/selvmodsigende påstand (Builderen bekræftet): `fabriksnyNote` i `js/annonce.js` siger "kilometerstanden er derfor ikke oplyst" også når km er kendt (0–500). Annonce med km 0 viser rækken "Kilometer 0 km" og noten "ikke oplyst" samtidig. Komponentens tooltip er rettet, annoncesiden ikke. Samme side viser stadig "Salgsvilkår: Engros", mens kortet siger "Handelspris". | Mock-annonce km 0 og km 420, MC Syd Ny: begge viser "0 km"/"420 km" + "…derfor ikke oplyst". |
| 4 | P2 | `modelFraDeeplink` virker på ENHVER vært/sti med "segment/rent tal". Gul og Gratis-formen `/annonce/123456` med titel = kun mærket gav model **"Annonce"**; mærke-uafhængigt: path "Suzuki GSX 750" under mærke Honda blev model "Suzuki GSX 750". (De rigtige GoG-stier kender jeg ikke; fixtures bruger `/annonce/x1`, som er sikker.) | `normalizeExternalListing({maerke:'Honda',titel:'Honda',url:'https://www.guloggratis.dk/annonce/123456',...}).model` = "Annonce". Forslag: begræns til `mcsyd.dk/Produkter/*/(Ny|Brugt|Demo)/<titel>/<id>` og afvis hvis stiens mærke er et andet end rækkens. |
| 5 | P2 | "Handelspris" for ENGROS er et nyt, uverificeret ord. ENGROS står hos MC Syd som "ENGROS/UDEN KLARGØRING" (sælges typisk uden klargøring/til branchen). "Handelspris" kan læses som "fair markedspris" eller "forhandlerpris til dig". Ikke direkte falsk, men en ny påstand uden kilde; annoncesiden siger stadig "Engros". Sikrere: vis kildens ord ("Engros") overalt, eller "Engros-pris". | `salgsmarkoerLabel('ENGROS')` -> "Handelspris"; kort "Handelspris +1" vs annonce "Engros · Uden klargøring". |
| 6 | P3 | Ny-reglen: ægte ny, ikke registreret lagerbil fra årgang < i år−3 (2022 i 2026), km 0, kilde "ny" -> **Brugt** + `UsedCondition`. Samme flip sker alle 1. januar for MC Syds kataloglager (Builderens egen risiko). Modsat: km 1–500 + årgang ≥ i år−3 + kilde "ny" -> "Fabriksny" + garanti-note også for en demomaskine med 420 km. Årgang 0/1 (fejldata) -> false (Brugt). `"4.500"` som streng tolkes som 4,5 -> ny (i drift er km et tal, så uden praktisk effekt). `Demo`-sti (`/Demo/`) matches ikke, og giver null medmindre stand-feltet siger ny/brugt. | tabel nedenfor |
| 7 | P3 | `hk/ccm > 0,30` nulstiller `ccm` (ikke hk) når hk ≤ 250: 125 cc med 40–55 hk (RS125-racer), NSR50 med 20 hk, KX125 45 hk mister den rigtige ccm. Modsat nulstilles ægte hk 310 på Kawasaki H2R (998 cc, 0,31). Alle smalle; retning (ccm bort) er forkert, når ccm er det plausible tal. | tabel nedenfor |
| 8 | P3 | `senesteBekraeftet`: fremtidig `sidstSet` vises som dato uden advarsel ("1. dec." i oktober); dato i besøgendes tidszone (New York ser dagen før); intet år på datoer i indeværende år. Ugyldig/manglende dato -> intet vist (korrekt). | tabel nedenfor |
| 9 | P3 | `harmoniserStavning`: ved lige antal vinder længste streng (flest mellemrum). Eksempel: MT-07 / MT 07 / MT07 / Mt-07 (1 stk. hver) -> alle "MT 07", ikke Yamahas "MT-07". Kan flytte en eksisterende modelsides slug (cbf-1000-a vs cbf-1000a). Ingen forkerte sammenfoldninger fundet. | tabel nedenfor |
| 10 | P3 | `npm test` kører ikke de tre nye testfiler (de er ikke i package.json; Builderen har selv bedt om det). Genererede mærke-/modelsider skal bygges om, før "sælges som nye" stemmer. Mærkesiderne tæller null-status (kilde siger ny, intet bevis) som "brugte". `crawler/normalize.js` er rørt (ren funktion, ikke koblet ind, crawlerens adfærd uændret) — CLAUDE.md siger crawleren er urørt, så ejeren bør vide det. | grep/diff |

## 1. Ny-reglen: kantcaser (kilde "ny", i år = 2026)

512 kombinationer af kilde (ny/Ny/NY/new/brugt/demo/null) x km (0/500/501/null/"4.500"/"500 km"/"0") x årgang (null/2026/2023/2022/2027/"2023"/0/1) kørt; udsnit:

| km | årgang | udfald | vurdering |
|---|---|---|---|
| 0 | null | ny | ok |
| 500 | 2026 / 2023 | ny | ok (grænse) |
| 501 | alle | brugt | ok (grænse) |
| null | null | null (intet mærke) | ok, ærligt |
| null | 2026 / 2023 | ny | ok |
| null | 2022 | brugt | omstridt (P3 #6) |
| 0 | 2022 | brugt | ægte ny lagerbil kaldes Brugt (P3 #6) |
| 0 | 2027 (fremtidig) | ny | ok (nyt modelår i oktober) |
| 0 | 0 / 1 | brugt | fejldata flipper til Brugt |
| "4.500" | 2026 | ny | tolkes som 4,5 (uden effekt i drift) |
| 420 | 2025 | ny, "Fabriksny", garanti-note | demomaskine? (kilden siger ny) |
| kilde brugt | alle | brugt | ok |
| kilde ukendt + /Ny/-sti | km 9000 | brugt | ok |
| kilde ukendt + /Demo/-sti | | null | ok |

Konsekvens (mockede data, browser): annoncesidens Stand ("Fabriksny"/"Brugt"), JSON-LD `itemCondition` (Offer og Product) og kortets "Ny"-mærke følger altid samme resultat; null giver ingen Stand-række og ingen itemCondition. Garanti-note kun hos forhandler (uændret). Filtret `?conditions=Ny` returnerer præcis de tre bekræftede.

## 2. Tal-sanering: 88 køretøjer

Bevaret korrekt (udsnit): Puch 50 cc, scooter 49 cc, Monkey 125, Grom, Panigale 1299 (1285/205), V4R (998/234), R6 (599/129 og 133), ZX-10RR, S1000RR, RC213V-S, RSV4, KTM 1290 (1301/180, også med årgang=1290), Gold Wing 1832, Harley 1923, Indian 1890, Rocket III 2294/2458, Hayabusa, H2 (998/200), Desmosedici, Boss Hoss 8200/500 hk, veteraner (BSA, Ariel 995, Vincent 998, Indian Chief 1200 årg 1940), CB750 "årg 75", Bonneville "årg 1971" (750), Z900RS, Z650, DT80 (årg 1980), CT90 (årg 1990 uden "årg" i tekst), el-motorcykler (ccm null/0 -> null, hk bevaret), hk som streng "72".

Fejlagtigt fjernet (ægte data tabt):

| Input | Resultat | Årsag |
|---|---|---|
| XR 80, ccm 80, årg 80 i titel | ccm null | #1 |
| C90, ccm 90, "årg 90" i titel | ccm null | #1 |
| RS125 racer ccm 125, hk 40/55 | ccm null | #7 |
| NSR50 ccm 50, hk 20 | ccm null | #7 |
| KX125 ccm 125, hk 45 | ccm null | #7 |
| H2R ccm 998, hk 310 | hk null | #7 |
| ccm 2000 + årgang 2000, ccm 1000/årgang 1000 | ccm null | ægte tvetydighed, men ingen kendt serie-MC har ccm = sit eget byggeår, så ok |

Slipper igennem: "Triumph Bonneville T 120" med ccm 120 og **hk ukendt** (1200 læst som 120) forbliver 120 cc; ccm 120/hk null giver ikke A1 (A1 kræver kendt hk), så ingen forkert kørekort. ccm 45 beholdes, 44 nulstilles.

Kørekort: nulstilles ccm, mens hk er lille, bliver svaret A2 i stedet for A1 (stramning, men en ægte A1-maskine ryger ud af A1-filteret, #1). Nulstilles hk, bliver svaret null, så der kommer aldrig en forkert A1.

Drift-test: min egen fuzz (45.240 kombinationer inkl. tekstmønstre "årg 90", "Årg. 80", "aarg", "å rg", ccm som streng) gav 0 forskelle mellem `saniterTal` og `renseUrealistiskeTal`; Builderens test er meningsfuld som synkroniseringsvagt, men kontrollerer ikke om reglen er rigtig.

## 3. "Senest bekræftet"

| Input (nu = 16.10.2026 09:00 CEST) | Tekst |
|---|---|
| sidstSet 15.10 23:30Z | "16. okt." (lokal dag, rigtig i DK) |
| 2.10 | "2. okt." uden advarsel (13 dage) |
| 1.10 | "1. okt." uden advarsel (grænsen er >14 hele dage, dvs. advarsel først fra 15 dage) |
| 30.5 | "30. maj. Annoncerne kan være ændret siden." |
| 31.12.2025 23:30Z | "1. jan." (uden år, lokal dag) |
| 1.12.2026 (fremtid) | "1. dec." uden advarsel (P3) |
| "junk", null, [], tom | intet vist |
| blandet 15.10 og gammelt | seneste vælges; ældste kun i tooltip |

Sand ift. data: datoen er max over det viste udsnit, og crawleren stempler hele kørslen ens, så "senest" er ærlig for en delmængde (samme regel som de genererede sider). Layout (mock, frisk og 31 dage gammel): 0 px overflow på forside og søgning ved 1440/390/320, lys og mørk; teksten ombrydes pænt på 320 (screenshot set), ingen konsolfejl.

## 4. F-008..F-011

- Deeplink: MC Syd-stier (Brugt/Ny, Harley-Davidson, Royal Enfield, Moto Guzzi, Can Am, Sym -> SYM, Mz -> MZ, Indian, Victory, "Ukendt DKW 250") giver rigtige mærker/modeller; "Hondaline X" og "Hondarare" fejlmatches ikke (hele ord). Fejl: #4.
- Købes/søges: se #2. Test: "Købt ny, kan evt. byttes" false (rigtigt), "Suzuki Bandit – købesum" false (rigtigt), "Triumph søgesæt" false.
- Modelfoldning: Z 650 / Z650 / Z650 RS -> "Z 650", "Z650 RS" (ikke sammenfoldet, rigtigt); R 80 G/S og R80 GS ikke foldet; mærker Sym/SYM, Fb Mondial/FB Mondial foldes; Harley-Davidson/Harley Davidson/Harleydavidson foldes. Rækkefølgeuafhængig. Ingen forkert sammenfoldning fundet; kun tie-break #9.
- FILTER_CONDITIONS / `?conditions=Ny` virker (3 af 3); `CONDITIONS` urørt; `opret-annonce.js` bruger stadig `CONDITIONS`.

## 5. F-019 kommentarfjerner (kopi af alle 69 rod-HTML)

- (a) inline script/style byte-ens: 69/69. (b) ingen runtime-læsning af kommentarnoder (grep nodeType/NodeFilter/SHOW_COMMENT i js/ og HTML: 0; `<!--` i js/*.js findes kun inde i skabelonstrenge, som ikke berøres); build-markører (`cookie:start`, `kildefotos`, `srp:start`) bruges kun af byggescripts på kilde-HTML, ikke på _site. (c) JSON-LD identisk (parsed) på alle sider; efter `node scripts/udgiv.js` på kopien: alle 261 inline-scripts har deres sha256 i sidens CSP, udgiv slutter "_site er klar". (d) 12 sider renderet før/efter i Playwright (kommentar-noder fjernet fra begge, whitespace normaliseret): identisk DOM, 0 konsolfejl. (e) idempotent på 69/69. 772 kommentarer, 139.081 bytes fjernet, ingen betingede kommentarer fundet.
- Syntetiske kantcaser: script/style/pre/textarea/noscript/svg/template/CDATA/CRLF/versaler på tags: korrekt. Eneste afvigelse: en kommentar *inde i en attributværdi* (`title="<!-- x -->"`) fjernes; findes ikke i nogen rodside (0 matches).

## 6. Regression

- `npm test`: 525/525. De tre nye filer: 38/38. `node --check` på js/, scripts/, crawler/: ingen fejl.
- Render forside, søgning, 4 annoncesider, mærkeside Honda, `?conditions=Ny` ved 1440/390/320, lys+mørk, mockede data: 0 overflow, 0 konsolfejl (kun egne blokerede billed-/fontværter som er mit netværksforbud), intet gået i stykker. SEO: JSON-LD og canonical uændret på mærkesiden; annoncesidernes JSON-LD ændres kun i itemCondition, som tilsigtet.
