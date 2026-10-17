# Agent 2 — Søgning og marketplace (Visual Fidelity Gauntlet, w14)

Reference: `Motorcykler til salg.png` (1672x941). Mock med lokale typefotos (kun i testharness, ikke i repoet). Billeder: `agent2-soegning/`.

## Acceptkriterier (målbare, skrevet før koden)
- A1 Ved 1440 er kortfotoet 1,9-2,1:1 (mockup ca. 2,3:1), så mindst 3 rækker kort ses i første skærm efter hero.
- A2 Ved >= 1280 uden filtre findes ingen tom chip-række; "Gem søgning" står i resultathovedet; med filtre vises chip-rækken.
- A3 Hero + søgekort slutter højst y=330 ved 1440 (før 332) og resultathovedet starter højst y=360 (før ca. 405).
- A4 Ingen funktionsregression: filtre, sortering, liste/gitter/swipe, URL, paginering, favorit, sammenlign, Gem søgning-panel.
- A5 0 overflow, CLS < 0,05 (`smoke-browser --sider soegning --cls 0.05 --strikt`), lys + mørk; ingen opfundne data.

## Afvigelsesliste (prioriteret)
1. Moduler: mockup har chip-række altid synlig, foto-tæller, "Autoriseret forhandler", kg-chip. De tre sidste er opdigtet/ikke oplyst = bevidst udeladt.
2. Layout: tom "Gem søgning"-række (ca. 55 px) over indholdet uden filtre — LUKKET.
3. Hierarki: indhold startede ca. 105 px lavere end mockup — delvist lukket (hero, række).
4. Kortopbygning: titel/pris, år|km|type, chips, sted/kilde svarer til mockup — allerede på plads.
5. Billedbrug: foto 16:10 vs mockup ca. 2,3:1, kort 325 px høje mod ca. 235 — LUKKET (2:1 fra 760 px).
6. Proportioner: hero 332 -> 322 px, overlap 52 -> 44 px, h1 40 px ved 1440 — lukket.
7. Typografi/detaljer: info-båndet har tre ærlige oplysningslinjer (kildefordeling, alder, sorteringsregel) mod billedets ingen — tilbage.
8. Mikrointeraktion: uændret.

## Lukket
- `css/p-soegning.css` (W14-blok): 2:1-foto fra 760 px, skjult tom chip-række fra 1280 px, kompakt hero fra 1100 px.
- `js/search.js`: #save-search-btn flyttes til resultathovedet >= 1280 px og tilbage under (samme knap/id/handling).
- Ny test `js/w14-soegning.test.js` (2 tests). `js/w10-soegning.test.js` kører uændret grønt (5/5).

## Målt
- smoke-browser soegning --cls 0.05 --strikt: 8 målinger, 0 fejl/0 advarsler. Egen CLS-måling filter-URL 1440/1280/390: 0,000.
- w10-soegning 5/5, w14-soegning 2/2. Gate se rapport.

## Iteration 2-3 (efter Orchestrator-afvisning)
Lukket:
- Hero som mockuppen: søgekortet ligger INDE i bannerfotoet (ingen overlap), felter 44 px, brødkrumme kun for skærmlæsere ved >= 1100, h1 38 px. Hero ca. 213 px (før 280 + 52 overlap); første skærm ved 1440 viser hero + filter-sidebar + 2 kortrækker (før knap 1).
- Info-bånd: én rolig muted linje uden ramme (kildefordeling + lagerets alder med ellipsis). Sorteringsreglen står kun i (i) ved Sortér (tekst og ids uændrede; skjult ved >= 1100). Skillestregen er erstattet af "·".
- Kort: lavere body (padding 10/12/8, ingen skillelinje i foden), spec-chips fylder bredden som billedets chip-række, kildenavn op til 2 linjer i stedet for "Hovedstadens MC ...".
- Mobil 390: h1 25 px på én linje, mindre luft; første kortrække starter y=517 (før 569). Kortlayout 2-kolonne uændret.
- Liste- og swipe-visning screenshottet og vurderet (sek6/sek7): intet brud; rækker og swipe-kort er fine.
- Sidebar: rækkefølge og åbne/lukkede tilstande er ALLEREDE som mockuppen (Mærke, Type, Pris åbne; Årgang, Km lukkede; Kørekort åben; Region og Sælgertype findes, lukkede). Min tidligere påstand om Type-først var forkert; Pris står som nr. 3 som i billedet.
- Visuel regression mod fefe1570 på index, maerke-honda, type-sport, koerekort-a2, annonce ved 390/1440: 20 sammenlignet, 0 med forskel (kortreglerne er scopet til #results-grid).
- Målt efter sidste CSS-ændring (320/390/768/1024/1440, lys + mørk): overflow 0, 0 tekstklasser under 4,5:1, tap-mål >= 40 px (filtre, sortér, visning, (i), sidetal, Gem), CLS 0,000 på filter-URL ved 1440/1280/390, smoke-browser --cls 0.05 --strikt 0 fejl.
- Tests: js/w10-soegning.test.js opdateret bevidst (søgekortet ligger nu i hero i stedet for at hænge ned: "card_bund_i_hero"); js/w14-soegning.test.js (2 tests, nu også hero <= 225 px, info-bånd <= 44 px, kort <= 290 px, sorteringsnote skjult). npm test 1272/1274: de to fejl (w10-fejl CLS, w13-logo-layout) består enkeltvis (flaky under belastning).

Billeder: sek1 første skærm, sek2 kort, sek3 filtre/chips, sek4 mørk, sek5 mobil før/efter lys+mørk, sek6 liste+swipe 1440, sek7 liste+swipe 390, foer/efter-1440, reference (JPEG, 1,3 MB samlet).

Ærlig vurdering: ligner mockuppen 7,5/10.

## Iteration 3-4 (efter blind Critic: AFVIS 6,5/10)
Critic-punkter og status:
1. Kort for højt -> LUKKET: 209 px @1440 (mål mockup ca. 189, Critic-krav <= 215; før 261), foto 2,3:1, titel på én linje (ellipsis, helt navn i title), pris til højre, ens højde (differens <= 3 px), kørekortpille "Kræver A" er outline i stedet for sort, chips på én linje. Sammenlign-knappen er flyttet fra fotoet til kortets fod (JS flytter knappen ved >= 760 px; delegeret handler uændret).
2. Fotomangel -> LUKKET (designvalg efter Orchestrator): kort uden thumbnail i gitteret får sidens eget typefoto (img/type/<type>.webp) med synligt label "Typefoto, ikke annoncens" (title forklarer). Aldrig som annoncens eget foto; intet hentes hos kilden. "Fotoet kunne ikke hentes" og liste/swipe uændret. 0 stiplede tomme felter i gitteret (test).
3. Hero -> LUKKET: 165 px @1440 (Critic: <= 180), titel og undertitel på én linje, object-position 74% 34% så motorcyklens styr/lygte læses i bannerets overkant (bagved søgekortet ligger resten; samme sammensætning som mockuppen).
4. Infolinje -> LUKKET: ingen ellipsis; kilde-linjen og ærlighedsteksten (+ sorteringsnoten, nu synlig) ombrydes i to rolige linjer (42 px).
5. 503-overlay -> LUKKET: .data-afbrud på søgesiden ligger nederst til højre (body.srp, >= 1024 px) og dækker intet af søgekortet; test med elementFromPoint på alle kontroller + ingen overlap. role=alert/Prøv igen/Luk uændret.
6. Bundmoduler -> LUKKET (>= 1100 px): fem kompakte kolonne-kort, 3 linjer chips; sektion ca. 230 px (før 600+).
7. Sidebar: lange mærke-/modellister scroller internt (176 px) så Type bliver på plads. 
8. Småting: tap-mål >= 40 px for "Tilføj flere", prishurtigvalg, kørekortsegment og søge-x; paginering scroller til resultathovedet (test, sort bevares, tilbage bevarer filter). Resterende < 40 px er delt lag (header-logo/nav 39 px, footerlink, dr-thumb slider-inputs, 24 px x-knapper i chips med større hitfelt).
- CLS: gitterets højde holdes under portionsvis maling ved >= 760 px (ellers lå sidens bund kortvarigt i billedet ved 768). 8/8 kørsler grønne i alle viewports (smoke --cls 0.05 --strikt). BEMÆRK: en mobil-kompaktering (mindre h1, mindre luft) gav intermitterende CLS ved 390 mørk og er derfor rullet tilbage; mobil er som iteration 1.
- Visuel regression (index, maerke-honda, type-sport, koerekort-a2, annonce @390/1440): 0 forskel. w10/w11/w12/annoncekort/w14: 58/58.
- Nye tests i js/w14-soegning.test.js: kort 195-215 px og ens, typefoto+label, sammenlign ikke i foto, én-linjes titel, bund <= 350 px, ingen ellipsis, 503 elementFromPoint, paginering scroll + sort + tilbage.

Billeder (JPEG, ca. 1,4 MB): sek1 første skærm, sek2 kort, sek3 filtre/chips, sek4 mørk, sek5 mobil før/efter lys+mørk, sek6/sek7 liste og swipe 1440/390, foer/efter-1440, reference.

Ærlig vurdering (min egen, blind Critic skal bekræfte): ligner mockuppen hero 7/10, filtre 8/10, kortgitter 7,5/10 (samlet ca. 7,5).

## Tilbageværende afvigelser ("ligner ikke endnu")
- Foto-tæller, stjerner, "Autoriseret forhandler", kg-chip, tal i hero: opdigtet/ikke oplyst. Typefoto-label og stiplet "Fotoet kunne ikke hentes" afviger fra mockuppens 100 % ægte fotos; vi kan ikke vise annoncens foto, hvis kilden ingen har.
- Mockup har rytterfoto/bro i hero, grøn CTA og A2-badge, hvid/lyseblå flade; vi har brandfoto, orange CTA, kobber/outline-badge og creme.
- Kilde/sted i kortfoden afkortes (ellipsis, full tekst i title) for at holde kortene lave og ens.
- Chip-rækken vises kun med filtre (ingen opdigtet chip).
- Header 68 px mod mockuppens ca. 34 (Agent 1).
- Mobil (390) er uændret fra iteration 1: kortene starter først midt på første skærm.
