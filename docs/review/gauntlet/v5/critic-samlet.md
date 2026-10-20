# V5 Critic (uafhængig, blind): samlet dom

Dato: 2026-10-21. Version under test: `611c8c51` (new). Reference: `cbbb411f` (old, V4). Live: https://bikerbasen.dk (kun læsning, 0 skrivninger).
Arbejdskopier: `C:\Users\pasca\Desktop\rod\w7v_tmp\critic_v5\{new,old}` (git archive). Bevismateriale: `...\critic_v5\shots\` (skærmbilleder) og `...\critic_v5\out\` (scripts + rå output). Intet i hovedmappen er rørt udover denne fil. `SUPABASE_SERVICE_ROLE_KEY` var fjernet fra miljøet i alle kørsler. Ingen build, generator eller crawler er kørt. Alle sider er serveret på `bb-qa.test` (ikke localhost), så demoannoncer ikke blandes ind. Supabase er mocket (fixtures + `w9-saelger-mock`); hver kørsel logger skrivninger, og for anonyme eksterne favoritter var de 0.

## DOM: PUSH (ingen hotfix nødvendig)

Ingen P0 og ingen P1. V5 er et sikkert, overvejende inkrementelt trin: nul regressioner i funktion, nul CLS-overskridelser på de offentlige sider, SEO uændret, favoritter og "Andet mærke" virker end-to-end mod mock, logoerne er rene og korrekt tilordnet. De fund, der er, er P2/P3 og hører til næste runde. Det vigtigste at vide om "hvor tæt på mockuppen": V5 flytter nålen kun lidt (se tabel). Den visuelle identitet (varm orange/mørk, Space Grotesk-agtig overskrift, typefoto-pladsholdere) er stadig langt fra mockuppernes hvide/grønne/blå sprog; strukturen er derimod tæt på.

## Resultat pr. tjekpunkt

| # | Punkt | Resultat |
|---|---|---|
| 1 | Regression new vs old, ti sidefamilier, 375/430/768/1440/1920, lys+mørk (300 skærmbilleder + pixel-diff) | Ingen funktionel regression. Forside, login, mine annoncer, opret, type/kørekort er pixelmæssigt næsten identiske (login 0,00 %, mine-annoncer 0,3 %). Størst ændring: søgning (kort +527 px højere ved 1440, 16:10-foto), guides (+600 px ved 375), mærkeside (logo i hero), annonce (ordmærke i titel). Se P2-3, P3-1. |
| 2 | Logoer | 31 logoer (21 officielle + 10 vektoriserede udkast) kontaktark lys+mørk: `shots/logosheet-lys.png`, `shots/logosheet-moerk.png`. Alle 105 manifest-poster: navn/alias/slug/fil/godkendelse konsistente (0 uoverensstemmelser, 0 alias-dubletter). Ingen forkert mærke/logo-kombination (visuelt tjekket én for én). SVG: ingen script, e-mail, `<metadata>`/RDF, `<image>`, `data:`, `<foreignObject>`, event-handlers. Rester: `inkscape:connector-curvature` (Triumph, Indian), `sodipodi` (Triumph), `<!DOCTYPE>` med ekstern DTD-URL (AJP, DKW, Husqvarna, Piaggio, SYM), `<style>` (5 filer): harmløse som `<img>`. Slots: `.bl`-mål identiske lys vs mørk (0 forskel på 46 logoer); smoke CLS 0. Brede ordmærker (Honda, Husqvarna, RE, Benelli, Fantic, Kymco, Rieju, Keeway) falder i `md`/A-Z til monogram. Det er konsistent og gør ingen skade, men ser rodet ud (P3-2). |
| 3 | Mærkedækning | `v4-maerke-dakning --streng-v5`: **live-data 0 fejl** (720 annoncer, 31 mærkenavne); fixtures-data: 1 fejl (`v5-andet-tekst-gaar-tabt`) i 2 af 3 kørsler, bestod i 1. Se P2-4 (flaky gate). Egen stikprøve: "Andet mærke" findes sidst i listen, felt vises, valideringen (tom, mellemrum, 1 tegn, HTML, 40+ tegn via maxlength) virker på dansk, skrives "Honda" vælges Honda, kladde gendannes (Andet mærke + tekst), mock-udgivelse gemmer `brand: "Fantasi Motors"`, ingen `maerke-fantasi-motors.html` (404), ikke i oversigten/filteret. Aliasser i fritekst: harley/hd/cf moto OK. Lagermærker: BSA/Bsa slås sammen (8), Royal-enfield/Lauge/Fb Mondial normaliseres. "Flere mærker (70-72)": tekst og hydrering OK. |
| 4 | Favoritter | Hjerte på alle kortvarianter (gitter, liste, forside 4/5, annonce 7/7, type, mærke, model, A2, favoritsiden). Eksterne: kun `bb_favorites_ext(+_meta,_info)` i localStorage, 0 Supabase-kald (også logget ind), toast "Gemt i denne browser.", persist efter reload, header-tæller 1→2, fjern virker, forsvundet annonce: "Annoncen er ikke længere i vores indeks". Anonym "Gemte annoncer" viser eksterne favoritter. Egne (private sælgere): se P2-5. |
| 5 | CLS | `smoke-browser --strikt --cls 0.05`, 102 sider x 5 viewports x lys/mørk = 1020 målinger: **0 fejl, 0 advarsler, max CLS 0,0265** (mc-harley-davidson-cruiser 375). 2. kørsel i omvendt rækkefølge (sider, viewports, temaer): identisk grøn, max 0,0265. Søgesiden med 11 dybe links `--soeg-links --varm` (240 målinger, kold+varm): 0 fejl, max 0,0095. Hver af 40 sider alene (3 viewports x 2 temaer): 40/40 exit 0. Egen måling på `bb-qa.test` (15 sidetyper x 5 vp x 2 temaer, 150 skærmbilleder): alle <= 0,032 undtagen indloggede mine-annoncer/dashboard (0,094 ved 768, uændret fra old). Søgning med `?view=list` var 0,074 i old, 0,0016 i new (rettet). Se P2-6, P3-5. |
| 6 | Funktionelle flows | Søgning: 21 parametervarianter (ugyldige `page/priceMax/sort/types/koerekort/yearMin`, 300 tegn, `<script>`, `%00`, dobbelte `brands`) giver aldrig crash, aldrig tom-tilstand sammen med resultater, `page=999` klampes til sidste side; 503: korrekt fejlbanner, "Lageret kunne ikke hentes", ingen "0 annoncer" (undtagen maerker.html, se P3-6). Sammenlign-knap: ingen tekstoverlap på 10 sidetyper x 5 vp x 2 temaer (kun overlay på foto, ≥ 40 px). Pris-skyder: tommelfingre centreret på sporet, labels i linje (`shots/slider-1440-lys.png`). Opret: trinbjælke + "Påkrævede felter udfyldt 0 af 10" (aria `progressbar`), forhåndsvisning, dansk validering, fuld mock-udgivelse. Login: 5 fejlkoder giver danske tekster (ugyldig, ubekræftet, 429, 500, ukendt engelsk, netværk), felter 16 px, skip-link "Gå til indhold" synlig ved første Tab. Mine annoncer: tællerstribe, rækker, siderail (men ikke ændret fra old). Guides: kort 16:10 og figurer i naturligt format, ingen hård beskæring. Cookie: se P2-1. |
| 7 | Ærlighed | Eksterne annoncer: ingen telefon, intet galleri, ingen visningstæller (0 `haendelse`-kald), "Foto: MC Syd, flere billeder i deres annonce", "Typefoto, ikke annoncens eget", "Du handler direkte med MC Syd". Kørekortfakta (A1 fra 18, A2 fra 20, A fra 24 / 22 efter 2 år på A2; A2 35 kW ≈ 47 hk, 0,2 kW/kg) er konsistente på tværs af forside, A1/A2/A-sider og opret og angiver kilde (Færdselsstyrelsen); jeg har ikke kunnet slå paragrafferne op her. Privatlivspolitik: den ene nye linje om `bb_favorites_ext`, `_ext_meta`, `_ext_info` er korrekt: præcis disse tre nøgler er de eneste nye i koden (diff af alle `bb_*`-nøgler old/new), de gemmes kun lokalt og aldrig i databasen. Ingen opdigtet indhold fundet. |
| 8 | SEO-diff | 102 rod-HTML-filer: title, description, canonical, robots, H1, og:image, JSON-LD: **0 ændringer**. robots.txt og llms.txt identiske. Sitemap: samme 73 URL'er, kun `lastmod` 17.→20. okt. på ændrede sider (forklarligt). Live sitemap har samme URL-sæt (lastmod 18. okt, ingen betydning). |
| 9 | `verificer-site --hurtig --med-udgiv` | 8/8 trin grønne, exit 0. Fuld `npm test` (jeg kørte den også): 2 røde (begge beskrevet under P2-4). |

## Fund

### P0
Ingen.

### P1
Ingen.

### P2

**P2-1. Cookie-modal er en fælde, hvis JavaScript ikke indlæses.** `#cookie-banner` åbnes med `showModal()` af et inline-script. "Failsafe" dækker kun at CSS mangler/skjuler dialogen. Blokeres eller fejler `js/components.js` (abort), står dialogen åben, knapperne er døde, og hele siden er inert (`elementFromPoint` rammer DIALOG). Simulering (ikke-blokerende forsinkelse 0/300/1200/3000 ms af js og css: banneret vises og "Kun nødvendige" virker i alle tilfælde; blokeret JS: knap virker ikke). Bevis: `out/cookie.js`, `shots/cookie-js-blokeret.png`, `shots/cookie-js-3000.png`. Rettelse: lad det inline script sætte en 4-5 s timer, som lukker dialogen/viser et `<noscript>`-lignende link hvis knapperne ikke er koblet (`data-bound`), eller gem og luk selv med "Kun nødvendige" som standard ved timeout.

**P2-2. "Andet mærke"-annoncer fører til blindgyde.** Ad-sidens brødkrumme "Fantasi Motors" linker til `soegning.html?brands=Fantasi%20Motors`, og den side viser "Ingen motorcykler til salg i Danmark", selvom `?q=fantasi` finder annoncen ("1 motorcykel"). Ukendt `?brands=` er med vilje ikke et mærke (korrekt mod SEO-spam), men brødkrummen genererer linket. Bevis: `out/andet2.js`, `shots/andet-brands-true.png`, `shots/opret-efter-udgiv-1440.png`. Rettelse: for ikke-registrerede mærker udelad brand-leddet i brødkrummen eller peg på `?q=`.

**P2-3. Brede ordmærker æder titelbredden på annonceside.** Honda-ordmærket (~135 px bredt i `wm`-slot) står til højre for H1; ved 768 og 1440 brydes "Honda CB / 1000 R" og ved 1440 står "R" alene på linje 2. Old havde et smalt "vinge"-emblem uden problemet. Bevis: `shots/cmp-annonce-ekstern-768-lys-0.png`, `shots/new/annonce-ekstern-1440-lys.png`. Længere titler (Royal Enfield, Husqvarna) vil blive værre. Rettelse: flyt logoet under titlen/ind i badge-rækken for ordmærker med forhold > 3, eller begræns slot til 90 px.

**P2-4. QA-gaten er flaky, ikke ren grøn.** `npm test` (fuld) fejlede med 2 tests: (a) `scripts/v4-maerke-dakning.test.js` "den hurtige delmængde": `v5-andet-tekst-gaar-tabt` ("Fantasi Motors" findes ikke i `collectFormData()"`); samme fejl i 2 af 3 selvstændige fixtures-kørsler af runneren med `--streng-v5`, men ikke i live-datakørslen, og jeg kan ikke genskabe fejlen manuelt (3 ens sekvenser, med og uden forsinkede Supabase-svar, giver brand = "Fantasi Motors", og en komplet mock-udgivelse gemmer det). Det er altså sandsynligvis et race i runneren, men årsagen er ikke fundet. Det betyder at "Andet mærke"-kontrakten reelt ikke kan stoles på som automatisk gate. (b) `scripts/facet-intro-cls.test.js`: mc-harley-davidson-cruiser 375 mørk CLS 0,051 > 0,05 under CPU-last (0,0265 i idle; bestod ved genkørsel). Tærsklen ligger tæt på maksimum. Bevis: `out/npmtest.txt`, `out/dakning-fix.txt`, `out/dakning-live.txt`.

**P2-5. Anonyme favoritter på private sælgeres annoncer forvirrer.** Som anonym kan man hjerte en privat sælgers annonce (tæller i headeren: "Favoritter 2"), men "Gemte annoncer" viser "Ingen gemte annoncer / Klik på hjertet…" over en note om at "2 gemte annoncer fra private sælgere vises, når du er logget ind". Ærligt, men modsigende. Bevis: `shots/fav-gemte-anon-1440.png`. Rettelse: skjul tomtilstanden når noten vises, eller skjul hjertet på egne annoncer for anonyme med forklaring.

**P2-6. Logget-ind-sider er ikke dækket af smoke og har CLS 0,094 ved 768.** `mine-annoncer`/`dashboard` skifter `aside.db-aside` + `.db-create` ved ~165 ms (0,093); uændret fra old (0,094), altså ikke rettet af V5, selvom "mine annoncer" var i scope. Smoke logger aldrig ind, så det slipper igennem. Bevis: `out/cls2.js`. Rettelse: reserver højde på siderailen, og tilføj logget-ind-mock (`w9-saelger-mock`) til smoke.

**P2-7. Ti af de 31 logoer er stadig AI-vektoriserede udkast, og det er netop de største mærker.** Yamaha, Suzuki, BMW, Kawasaki, KTM (plus Aprilia, CFMoto, GasGas, Zero og Moto Guzzi markeret `tvivlsom`) har `autenticitet: ukendt/tvivlsom` i manifestet, men vises som mærkets identitet øverst på forside, mærkeoversigt og annoncer. BMW-filen er "BMW Motorrad"-logoet. Brugerne kan ikke se forskel på officielle og approksimerede. Desuden bygger "Public domain"-angivelsen for varemærker (Honda, Ducati, Harley, Vespa m.fl.) på Wikimedias markering, ikke på mærkeejerens tilladelse; manifestet noterer ejerens godkendelse, men det er et juridisk spørgsmål kun ejeren kan afgøre. Rettelse: hent de ti manglende officielle filer, eller vis de ti som monogram indtil da.

### P3

**P3-1. Søgekort er blevet højere og mindre ensartede.** 16:10-foto + padding: 24 kort fylder 3444 px mod 2917 (+18 %) ved 1440. Når titlen er lang, falder prisen ned på egen linje ("Honda CX 650 E (Eurosport)", "Harley-Davidson FLHX Street Glide"), og rækkernes tekst starter i forskellig højde (live: `shots/live-soegning-1440.png`). Hjerte + sammenlign dækker ~20 % af fotoet i 2-kolonne ved 375.

**P3-2. Blanding af rigtige logoer og grå monogramcirkler i samme liste** (A-Z, `shots/z-maerker-az.png`): Honda, Husqvarna, RE, Benelli, Fantic, Kymco, Rieju og Keeway er monogram, selvom filerne findes. I mørk tilstand blandes lyse fliser (officielle) med fliseløse masker (udkast), og forsidens Honda-flise fylder hele cellen (`shots/z-dark375.png`); Honda har ikke navnetekst i "Populære mærker", men de andre har.

**P3-3. Mærkeoversigt ved 503** viser statiske tal (720 annoncer) uden fejlbanner eller "pr. dato" (`shots/e503-_maerker_html.png`).

**P3-4. Ukendte rester i SVG'er** (se tjekpunkt 2) og `Ukendt` som række i filteret (live-runner: info).

**P3-5. maerker.html** går fra CLS 0,000 (old) til 0,011 (new) pga. levende tal (stadig langt under 0,05). Smoke kører på `127.0.0.1`, hvor `SHOW_DEMO_DATA` er sand; bb-qa.test-kørslerne ovenfor supplerer, men et smoke-flag til bb-qa-værten ville gøre det rigtigere.

**P3-6.** `?view=list` er ikke en gyldig parameter (visning styres kun af `bb_view_mode`); harmløst, men link til listevisning er umuligt.

**P3-7.** Opret: "Eksempel"-badge ligger oven på hjertet i forhåndsvisningskortet (`shots/cmp-opret-1440-lys-0.png`); 4 trin, mockuppen har 5.

**P3-8.** Ducati-filen er et rødt rektangel med tekst, ikke skjoldet (`shots/logosheet-lys.png`); Triumph vises som badge og ikke ordmærke. Begge er officielle Wikimedia-filer, men kan overraske.

## Tabel: ligner mockuppen x/10, bedre/dårligere end old

Vurderet efter struktur (indhold, sektioner, rækkefølge) og udseende (farver, foto, typografi). Mockupfarver er grøn/blå på hvid; sitet er orange/varm mørk, og det trækker alle ti ned.

| Side | Mockup | New x/10 | Old x/10 | Bedre/dårligere end old |
|---|---|---|---|---|
| Forside | Forside.png | 6,0 | 6,0 | Ens (hjerter på eksterne kort, ellers pixel-ens ved 1440). Mangler rytter-hero og de blå/grønne accenter. |
| Motorcykler til salg | Motorcykler til salg.png | 6,5 | 6,0 | Bedre: hjerte + sammenlign på alle kort, 16:10-foto, CLS rettet på dybe links. Mangler hero med søgelinje og aktive filter-chips; kort højere. |
| Annonce | Annonce.png | 5,0 | 5,0 | Ens; lidt dårligere ved ordmærke-brud i titel (P2-3), lidt bedre pga. "Gem som favorit" på eksterne. Ingen galleri/anmeldelser/telefon (ærligt). |
| Opret annonce | Opret annonce.png | 6,5 | 6,0 | Bedre: fremdriftsbjælke, "Andet mærke", forhåndsvisning. 4 trin mod 5; ingen foto-grid som i mock. |
| Mærker (mærkeside) | Mærker.png | 6,0 | 5,0 | Bedre: officielt Honda-ordmærke på lys flise i hero, som mockuppens Yamaha-hero. Kun Honda/Harley/Triumph m.fl. er officielle; Yamaha m.fl. er stadig udkast. |
| Sport motorcykler | Sport motorcykler.png | 6,0 | 6,0 | Ens (0,06 % pixeldiff). Strukturen (hero + statpanel, søgelinje, udvalgte, undertyper, modeller, guides) matcher; udseende ikke. |
| Motorcykler til A2 | Motorcykler til A 2.png | 6,5 | 6,5 | Ens (0,2 % pixeldiff). Struktur meget tæt (fakta-bånd, søg, udvalgte, typer, hvad må/kan ikke, modeller, guides). |
| Artikel | Artikel.png | 6,0 | 5,5 | Lidt bedre: figurer i naturligt format, 16:10-kort. Ingen forfatterfoto/dato-ikon som mock (ærligt: "Af Bikerbasen"). |
| Login/opret profil | Login eller oper profil.png | 7,0 | 7,0 | Ens (0,00 % pixeldiff). Tæt på i opbygning; ingen Google/Facebook/Apple (ikke bygget); danske fejl er bedre men usynlige i skærmbilleder. |
| Mine annoncer | Mine annoncer.png | 6,5 | 6,5 | Ens (0,3 % pixeldiff). Tællerstribe, rækker og siderail findes i begge versioner. |
| **Gennemsnit** | | **6,2** | **5,9** | **+0,3 samlet; ingen side dårligere** |

(Builderes selvscorer er ikke brugt. Skalaen er hård: 10 = kunne forveksles med mockuppen.)

## Prioriteret liste til næste runde

1. P2-1 Cookie-modal-failsafe for JS-fejl (hindrer en komplet blokering af sitet for en bruger med fejlet script-indlæsning).
2. P2-4 Gør QA-gaten deterministisk: find race i `v5-maerke-krav.js` "Andet mærke" (vent på `data-bound`/hydrering før fill), og hæv CLS-testens tærskel eller kør den serielt, så `npm test` er grøn ved første forsøg.
3. P2-7 Erstat de ti vektoriserede udkastlogoer med officielle filer (eller monogram), og få ejerens skriftlige afklaring af logorettighederne.
4. P2-3 Ordmærke i annoncetitel: flyt/skaler brede logoer.
5. P2-2 "Andet mærke"-brødkrumme uden blindgyde.
6. P2-6 Logget-ind-CLS 768 + tilføj login-mock til smoke (så mine-annoncer/dashboard/opret er målt).
7. P2-5 Anonym favoritside: fjern selvmodsigelsen.
8. P3-1/P3-2 Kortdensitet og logo/monogram-ensartethed (især mørk tilstand).
9. Det store løft, der ikke er rørt af V5: mockuppernes visuelle sprog (hero med rytterfoto, grøn/blå CTA, rigtige motorcykelfotos i stedet for typefoto-pladsholdere, annoncegalleri). Det er det, der afgør "ligner mockuppen", ikke flere V5-detaljer.

## Reproduktion

Alle scripts ligger i `C:\Users\pasca\Desktop\rod\w7v_tmp\critic_v5\out\`: `h.js` (harness, bb-qa.test + mock), `shoot.js` (300 skærmbilleder), `diff.js` (pixel-diff old/new), `sheet.js` (logo-kontaktark), `fav*.js`, `opret.js`, `andet*.js`, `login.js`, `srch.js`, `e503.js`, `cookie.js`, `overlap.js`, `slider.js`, `cls2.js`, `seodiff.js`. Rå smoke-rapporter: `smoke1.json` (1020), `smoke2.json` (1020, omvendt), `smoke3.json` (240, dybe links), `alene-summary.txt` (40 sider alene), `verificer.txt`, `npmtest.txt`, `dakning-fix.txt`, `dakning-live.txt`.
