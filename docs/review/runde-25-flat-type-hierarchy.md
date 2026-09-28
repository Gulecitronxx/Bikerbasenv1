# Runde 25 — sidste kendte finding: flat-type-hierarchy (28.09.2026)

Fortsættelse af runde 20's Impeccable-kritik. Bruger: "kør loopet igen". Alle
P0/P1/P2-findings fra den oprindelige kritik er lukket efter runde 24 — det
eneste, der stod tilbage, var sidefundet fra runde 21: `flat-type-hierarchy`
på footer-h2 (14px), aldrig en del af selve kritikken.

## Genkørt, ikke antaget

Kørte detektoren (`impeccable detect --json --target index.html`) igen for at
bekræfte, at fundet stadig var reelt, i stedet for at rette på et en måned
gammelt notat. Det var det: `"Role sizes: body 14px, h2 14px, h3 14px
(largest adjacent step 1.00:1; target 1.25:1)"`. To kilder til den 14px-h2/h3:
`.footer-col-title` og `.seo-col h3` — samme uppercase-label-mønster, brugt
to steder.

Samme kørsel fandt også `cramped-padding` (hero/generisk sektion),
`overused-font` (Space Grotesk), `dark-glow`, `radial-halo` og
`em-dash-overuse` (18 stk.) — alle "slop"/"quality"-kategori, advarsels- eller
rådgivningsniveau, ingen af dem del af den oprindelige, menneske-verificerede
kritik. Ikke rørt her: det er raa detektor-output uden Assessment A's
design-modtjek, og flere ligner allerede begrundede valg (Space Grotesk er
sitets bevidste displayfont siden runde 1; de varme foto-gradienter er
dokumenterede, ikke tilfældige). Nævnes, ikke handlet på.

## Hvad blev rettet — og hvorfor 12px, ikke et tal, der rammer 1,25×

`.footer-col-title`/`.footer-col h4` og `.seo-col h3` stod begge på 14px.
Før noget blev ændret, blev resten af `css/styles.css` grep'et for samme
mønster (uppercase, bold, letter-spacing — en "label over en liste"):
`.field label`, `.filter-subgroup-title`, `.listing-price-label`,
`.spec-item .spec-icon`, `.external-detail-source-label`, `.kpi-label`,
`.data-table th`, `.price-card-label` — **ni** eksisterende steder, alle
12px. 14px var ikke sitets konvention for denne rolle; det var afvigelsen.

Begge rettet til 12px. Genkørt detektor bagefter: forholdet gik fra 1,00:1
til 1,17:1 — bedre, men stadig under detektorens 1,25×-maal (14px krop mod
12px label). Overvejet at gå til 11px i stedet (14/11 = 1,27, ville rydde
tærsklen) — men 11px er kodebasens andet, mindre register
(`.status-pill`, `.brand-facet-navn`), brugt til kompakte tags, ikke til en
label over en hel kolonne af links. At vælge 11px for at ramme et tal ville
have skabt en ny uoverensstemmelse for at lukke en anden. 12px er den bedre
begrundede rettelse: den matcher ni eksisterende steder, og en uppercase,
fed, farve-dæmpet 12px-label læses utvetydigt som en label — ikke fordi
tallet rammer 1,25, men fordi resten af sproget (kasus, vægt, farve) allerede
gør arbejdet. Dette er præcis den slags sag, Impeccable-protokollen selv
beder om menneskeligt skøn til: en mekanisk detektor ser kun pixel-forholdet,
ikke at ni andre steder på siden allerede har afgjort, hvad en label vejer.

## Verifikation

Browser (Playwright): footer og SEO-browse-spalterne på 1280px, mørk tema —
begge fuldt læselige ved 12px, ingen visuel regression. `getComputedStyle`
bekræftede begge selektorer ramte 12px efter genbyg.

**Gate:** `node --check` (alle js/crawler/scripts), `npm test` 336/336
(uændret — ren CSS), `node scripts/build.js`, `node scripts/udgiv.js` —
alle grønne.

## Status

Alle kendte findings fra runde 20's Impeccable-kritik (P0, P1, P2, og
sidefundet) er nu lukket eller bevidst afvist med begrundelse. Ingen åbne
punkter tilbage fra denne kritik-runde.
