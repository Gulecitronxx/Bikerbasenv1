# Runde 30 — hovedmenuens skuffe opførte sig ikke som en dialog (29.09.2026)

Bruger: "kør loopet igen og push og så kør igen." Runden tog fokus og tastatur i
sidens overlays: filterskuffen, hovedmenuens skuffe og (i)-forklaringen.

## Filterskuffen er i orden

`role="dialog"`, `aria-modal`, fokus flytter ind på luk-knappen, Escape lukker og
sender fokus tilbage til "Filtre", en Tab-fælde i begge retninger, og baggrunden
er `inert` (`setBackgroundInert` i `js/search.js`). Ingen ændring.

## Fundet: menuskuffen

`wireHeader()` i `js/components.js` skiftede kun en CSS-klasse på `#mobile-drawer`.
Markup'en siger `role="dialog" aria-label="Menu"`, men skuffen opførte sig ikke
som en. Målt åben, før rettelsen:

- hamburgerknappen havde ingen `aria-expanded` og ingen `aria-controls`;
- fokus blev på knappen bag skuffen, ikke inde i den;
- Escape lukkede den ikke (skuffen stod åben efter et Escape);
- Tab løb ud i siden bag skuffen, og baggrunden var ikke `inert`.

Det er den delte header på **61 sider**. Lukket er skuffen `display:none` og
dermed ikke tabbar, så fejlen gælder kun åben tilstand — men det er præcis
dér, en tastatur- eller skærmlæserbruger står, når de har trykket på menuen.

## Rettet

Samme greb som filterskuffen, i `wireHeader()`:

- `aria-controls="mobile-drawer"` og `aria-expanded` (false/true) på knappen;
  `aria-modal="true"` på panelet, mens det er åbent;
- baggrunden `inert` (alle søskende på vejen op fra skuffen: header, main og
  footer), og fjernet igen ved lukning;
- fokus ind på luk-knappen, og tilbage på hamburgerknappen ved lukning;
- Escape lukker; Tab og Shift+Tab løber rundt inde i panelet;
- lukker skuffen af sig selv, hvis vinduet vokser forbi menuknappens breakpoint
  (1024 px) mens den er åben — ellers ville `inert` hænge fast på en desktopside
  og gøre hele siden utilgængelig. Ved den lukning flyttes fokus ikke, da
  knappen er væk.

## Målt efter

Lukket: `aria-expanded="false"`, `aria-controls="mobile-drawer"`, skuffen
`display:none`. Åben: `aria-expanded="true"`, `aria-modal="true"`, fokus på
luk-knappen, header, main og footer `inert`, selve skuffen ikke. Tab-fælde:
frem fra sidste → første, tilbage fra første → sidste (begge `defaultPrevented`).
Lukning via Escape, luk-knappen og scrim: `aria-expanded="false"`, ingen
`inert` tilbage, fokus tilbage på knappen (Escape og luk-knappen). Filterskuffen
på samme side målt igen: uændret. Menuen målt på forsiden også (19 `inert`
søskende åben, 0 efter).

## Ikke gjort

Ingen automatisk test: `wireHeader()` hænger på `document`, `matchMedia` og
`inert`, og `npm test` har ingen browser. Målingerne ovenfor er beviset. (i)-
forklaringen ("Hvad betyder indekseret?") er ikke gennemgået i denne runde.
Fokus-tilbage ved klik på scrim er ikke målt separat — kun at skuffen lukker og
`inert` fjernes. Breakpoint-oprydningen (1024 px) er skrevet, men ikke udløst i
browseren.

## Aggregator-reglerne

Ingen berørt. Kun header-interaktion.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
