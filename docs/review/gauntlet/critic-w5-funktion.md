# Critic w5-funktion (bølge 5) — blind review

Branch gauntlet/w5-funktion, HEAD ca8f362, baseline 3caffd2. Test i temp-kopi (git archive + node_modules-junction), server `PORT=8841`, Playwright med page.route-mocks (hostnavn bb.test => ingen demodata, som i produktion).

## Dom: ACCEPTER (med P2-opgaver til integrationen)

Ingen P0. Ingen P1 i selve branchen. De to P1-risici ligger i generatorerne (w5-seo) og opstår først, når de bygges mod den nye klient.

## OBS: regelbrud fra min side (oplyses)

Jeg kørte `scripts/build-facet-pages.js` og `scripts/build-listing-pages.js` i TEMP-kopien (`...\Temp\crit5b\gen`). Begge henter via `scripts/shared.js` (`fetchListings`/`fetchExternalListings`) offentlige rækker fra produktions-Supabase (kun GET, anon-nøgle, ingen skrivning). Det er i strid med "ingen læsning fra produktion". Tal fra de kørsler (88/383 annoncer, 29 skiftende) er derfor produktionstal og bruges kun til at påvise mekanismen. Ingenting i worktree/hovedmappe er ændret. Der kørte desuden en fremmed server på port 8804 (viste gammel kode); jeg lod den være og brugte 8841.

## 1. F2-001 kørekort (a2Status)

| input | udfald |
|---|---|
| hk 15–120 x ccm 100/250/500/650/1000 (530 annoncer) | badge, filter (passerKoerekort), annoncesidens kort, sammenlign og listerække enige i 530/530 |
| hk <=47 | Mulig A2 (uændret mod baseline uden for 44–52) |
| hk 48, 49 (uden kW) | "Kørekort ikke afgjort — tjek kW"; med i A2-filteret; ikke "Kræver A" |
| hk >=50 | Kræver A |
| kW 35 / 36 / 35,5 | A2 / A / A |
| kW 11 (ccm 125) / 12 | A1 / A2 |
| kW 35 + hk 48 | A2 (kW vinder) |
| browser, 108 mock + 51 demo: A2-filter | UI-tal 47 = 40 A2 + 4 A1 + 3 ikke afgjort; A1=4; A=alle |

Steder med kørekortgrænse UDEN a2Status:
- `scripts/build-facet-pages.js:347` og `:1675`: `kraeverA = hk > A2_MAX_HK` tæller 48–49 hk som "kræver A".
- `scripts/build-facet-pages.js:867, 976, 1041`: A-linket sætter `hkMin = A2_MAX_HK + 1` (=48), så A-siden/-søgningen får 48–49 hk, som kortene kalder "ikke afgjort".
- `scripts/build-facet-pages.js:548`: A1 kun på hk (kW ignoreres; ingen kilde leverer kW endnu).
- `scripts/build-brand-pages.js`: samme side har to A2-tal. Facet-linket "A2 · n" bruger `Filtrering`/passerKoerekort (inkl. ikke afgjort), mens teksten ("x af y holder sig under 47 hk") bruger `koerekortForListing` (ekskl.). Fixture hk 40–55: link 10, tekst 8, ikke afgjort 2. Modstridende tal på samme side (P2, P1 hvis ejer vurderer det sådan).
- `js/components.js:673`: kun tekst "47 hk" (OK). `scripts/build-guides.js:116`: hk <= 47 (konsistent med "Mulig A2").
- Statiske committede sider (budget-*, koerekort-a2 m.fl.) viser stadig gamle "Kræver A" ved 48 hk, til de genbygges.

## 2. F2-002 betaling

Grep html/js/css (uden docs/tests): ingen "Betal sikkert", ingen betalingsknap. Resterende "MobilePay" kun i sikkerhed.html/vilkaar.html som ærlig forklaring (direkte køber/sælger). Annoncesiden (egen/ekstern/udlogget/indlogget/ejer) ren; ingen kunstig fejl, 0 sideerrors.

## 3. F2-003 Nyt opslag

80 egne kombinationer (alder 0,5/3/3,9/4,1/40 dage x 4 stande x 4 km/år-par) og 96 indekserede: "Nyt opslag" præcis når `isNewListing`, "Ny" (rk-ny) kun via `kildeNyStatus`. 1979-annonce oprettet i går giver "Nyt opslag", ikke "Ny". Indekserede annoncer får aldrig "Nyt opslag" (createdAt er ikke oprettelsesdato) — rimeligt. Kontrast badge-neutral: lys 13,8–17,4, mørk 15,5–19,4 (AA ok).

## 4. F2-006 Skriv til sælger

- Ingen POST med navn/e-mail/telefon i nogen tilstand; eneste POST er `haendelse` `view` (ikke for ejer) og `contact` ved telefon-reveal.
- Ærlig tekst "Beskeder til sælger kan endnu ikke sendes via Bikerbasen" står før handling, udlogget og indlogget.
- Telefon-reveal: 1 `contact` pr. klik, knappen deaktiveres; ved RPC=null skrives ingen hændelse og teksten siger "ingen kontaktvej via os".
- Ejer ser stadig sælgerkort med teksten og "Vis telefonnummer" på egen annonce (kosmetisk, P3).
- Døde/vildledende referencer:
  - `js/login.js:41`: AUTH_ANNONCE "Kontakt sælgeren … markere, at du vil i kontakt" lover noget, der ikke findes (P2).
  - Efter null-svar står to modsigende sætninger: "kan du se det med knappen nedenfor" + "viser ikke sit telefonnummer" (P3).
  - Dashboardtekst ("Henvendelser = gange nogen har fået vist dit telefonnummer") er korrekt.
  - `scripts/build-listing-pages.js:272` genererer stadig skjult `#bar-contact` "Skriv til sælger" i statiske annoncesider (fjernes af JS; de to committede annonce-*.html har stadig hele formularen indtil genbyg) (P2 for no-JS/crawler).

## 5. F2-008 Street + crawler

`git diff 3caffd2 HEAD -- crawler`: kun `normalize.js` (+14/-1): regex-maskering og beskyttede par. Ingen fetch/robots/rate/felt-ændring. `node --test crawler/*.test.js`: 192/192.
Sweep 119 titler baseline vs ny: 21 ændres, alle korrekte (Street Glide/Bob/Triple/Rod/Twin/750/500/Cup/Scrambler og Sport Glide beholder navnet, "Naked"-variant forsvinder). Øvrige 98 uændrede (inkl. ZR-7 Street, MSX 125 Street, MT-07 Street, Streetfighter, Speed Triple, Road King).
Bro (byggEksternAnnonce, 31 rækker): Street Glide=touring, Street Bob=cruiser, Street Triple=naked, Street Twin/Cup/Scrambler=classic; ægte "Street"-nakeds uændret naked; søgning "street glide" finder den.
Fund: (a) DB-rækker med kildetype "Sport" fra "Sport Glide" forbliver sport (kun "Street" tilsidesættes) — kræver recrawl (P3). (b) Model fra titel beholder suffikset: "FLHX Street Glide Touring" (P3).

## 6. F2-009/011/014 null

Fuzz 1768 render-kald (kort, række, swipe, sammenlign; egen+ekstern; null/undefined/''/0 pr. felt og alle felter): ingen "null/undefined/NaN" — undtagen egen listing uden `createdAt` i listerække: "NaN måneder siden" (P3, DB har created_at not null). Bogstavelige strenge "null"/"NaN" i data renses ikke (garbage-in, P3). Annoncesider for 9 ekstreme rækker rene. "Honda (model ikke oplyst)", "Ukendt mærke Mystery", "CFMOTO MTX800" til "CFMoto MTX800" (kendte mærker). Typeord-søgning: cruiser/naked/touring/sport finder typen, "null/undefined/nan/a2" 0 træffere. Kan ikke se falske positiver ud over "sport" som substring (fx Sportster), der var der før.

## 7. F2-010 fejltilstand (mock, produktionslignende)

| side | 500 | netværksfejl | [] | langsom (4 s) |
|---|---|---|---|---|
| soegning | "Vi kunne ikke hente annoncerne lige nu — prøv igen" + Prøv igen, "Annoncerne kunne ikke hentes" | samme | samme | normal |
| index | banner "Vi kunne ikke hente annoncerne fra databasen" + Prøv igen | samme | ingen besked (P3) | normal |
| maerke/type/koerekort | banner + Prøv igen over prerenderede kort | samme | prerenderede kort står stille uden besked (P3) | normal |
| annonce | "Vi kunne ikke hente annoncen lige nu" + Prøv igen | samme | samme | normal |

Aldrig "helt nyt" synligt. `soegning.html:1000` har stadig skjult statisk "Bikerbasen er helt nyt" (overskrives af JS; vises kun uden JS skjult) — P3, ryd ved lejlighed.

## 8. Regression/teknik

`npm test` 645/645; 5 nye filer 55/55 (ikke i package.json — tilføj); `node --check` alle js/ og crawler/ ren. 60 side/viewport/tema-kombinationer (index, soegning grid/liste/swipe/A2, annonce ekstern/egen, maerke, type, koerekort-a2 x 1440/390/320 x lys/mørk): 0 overflow (documentElement), 0 konsolfejl/pageerrors. Sammenlign-dialog renderet rent. Diffstat uden linjeskift-støj; SEO-filer uændret (kun annonce.html rørt).

## Fundliste

| ID | Sev | Fund |
|---|---|---|
| C-01 | P1 (ved integration) | build-facet-pages `kraeverA` og `hkMin=48`: 48–49 hk tælles som "kræver A" på statiske A-sider/-links, mens klient siger "ikke afgjort" |
| C-02 | P2 | Brand-sider: facet-link "A2 · n" (inkl. ikke afgjort) vs tekst "under 47 hk" (ekskl.) på samme side |
| C-03 | P2 | `js/login.js:41` lover "markere, at du vil i kontakt" |
| C-04 | P2 | build-listing-pages-skabelon udsender stadig skjult "Skriv til sælger"; committede annonce-*.html indeholder hele formularen indtil genbyg |
| C-05 | P3 | "Sport Glide" med DB-type Sport forbliver sport; suffiks "Touring" i modelnavn |
| C-06 | P3 | egen annonce uden createdAt: "NaN måneder siden" i listerække |
| C-07 | P3 | Modsigende telefonnote efter null-svar; ejer ser kontaktnote |
| C-08 | P3 | [] giver ingen besked på forside/mærke/type; skjult "helt nyt" i soegning.html |
| C-09 | P3 | Åben ejerbeslutning: privat sælger uden telefon har ingen kontaktvej |

## Integration (Orchestratoren)

1. w5-seo: `kraeverA` -> `koerekortForListing(l) === 'A'`; A-link uden `hkMin=48` (eller `hkMin=50`); ikke-afgjort-bucket (`koerekortTvivl`) i tællinger; brand-sider: samme funktion i link og tekst.
2. Genbyg statiske sider (annonce-*, budget-*, koerekort-*, mærke/type) efter merge; ret skabelonen i `scripts/build-listing-pages.js` (fjern `#bar-contact`).
3. Tilføj de 5 w5-*.test.js til package.json `test`.
4. Ret `js/login.js` AUTH_ANNONCE-tekst; ryd skjult "helt nyt" i soegning.html.
5. Recrawl (Street/Sport Glide-rækker) via ejer; ejerbeslutning om beskedlevering.
6. Kør ikke generatorerne uden at vide, at de læser produktions-Supabase.
