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

## Tilbageværende afvigelser ("ligner ikke endnu")
- Foto-tæller, stjerner, "Autoriseret forhandler", kg og tal i hero er forbudt/opdigtet; A2-chip er kobber ikke grøn (brand).
- Mockup viser kun to linjer i bunden af kortet; vi har sted + kilde, men kildenavn kan afkortes ved smalle kort.
- Info-bånd (2 linjer) er tættere på støj end billedet; honest-disclosure bevaret.
- Mockup-sidebar viser Pris-slider åben som standard; vores viser Type åben først (rækkefølge og sektioner ellers ens).
- Mockuppens hero har trafikfoto og grøn CTA; vores brandfoto/orange CTA er bevidst.
- Ingen "Vis flere"/paginering i mockup; vi beholder rigtige sidelinks (SEO/tilbage).
- Mobil (390) er uændret: 2-kolonne-gitter, 16:10-foto.
