# Runde 29 — upload-zonen kunne ikke bruges med tastatur (29.09.2026)

Bruger: "kør loopet igen og push og så kør igen." En strukturel
tilgængelighedsscan (billeder uden alt, felter uden label, dublerede id'er,
overskriftshop, manglende `lang`/`main`/viewport, knapper og links uden navn)
på otte sider gav én side med udslag: `opret-annonce.html`.

## Fundet

`#upload-zone` på trin 3 ("Billeder") er en `<div>` med kun en `click`-lytter
(`wirePhotoUpload()` i `js/opret-annonce.js`). Filfeltet indeni, `#photo-input`,
er `hidden`. Målt i browseren: `tabIndex` −1, ingen `role`, intet `aria-label`.

Konsekvensen er, at en sælger, der bruger tastatur, skærmlæser eller
kontaktstyring, **ikke kan uploade et eneste billede** — zonen kan ikke få
fokus, og det skjulte felt kan ikke nås. `js/opret-annonce.js` kalder selv en
annonce uden billeder "dyrere for os end noget andet felt på siden"
(`bar/GAPS.md`). Det er den samme side, hvor en sælger beslutter, om siden er
troværdig.

## Rettet

- `opret-annonce.html`: zonen har `role="button"`, `tabindex="0"`,
  `aria-labelledby` (overskriften "Træk billeder herind, eller klik for at
  vælge") og `aria-describedby` (den forklarende linje om 12 billeder og
  forsidebillede). Overskriften og linjen har fået `id`.
- `js/opret-annonce.js`: `keydown` på zonen — Enter og mellemrum kalder
  `input.click()`. Mellemrum får `preventDefault`, ellers ruller siden. Kun når
  zonen selv har fokus (`e.target === zone`), så en Enter i et element inde i
  zonen ikke åbner filvælgeren to gange.
- Ingen CSS: den globale `:focus-visible` (`css/styles.css:201`) giver fokusringen.

## Målt efter

Fokus lander på zonen; rolle "button"; navn og beskrivelse er sat. Mellemrum og
Enter → 2 kald til filvælgeren, begge `defaultPrevented`. Et andet tastetryk og
en Enter fra det indre `h3` → ingen kald.

## Scannet og fundet i orden

Klikbare elementer uden tastaturadgang (alt med `cursor:pointer`, som hverken er
eller ligger i et interaktivt element): forside, søgning, annonce,
opret-annonce, mærker, mærkeside og login — ingen udslag. Trin 3 var skjult
under scanningen, så zonen selv er kun målt direkte.

## Bevidst ikke rørt

`target="_blank"` på vilkårslinket i `opret-annonce.html` mangler `rel`. Det er
et internt link til `vilkaar.html`, og moderne browsere behandler `_blank` som
`noopener`. Ingen risiko, ingen ændring.

## Ikke gjort

Ingen automatisk test. Filen kan ikke evalueres i node (hænger på `document`);
målingen ovenfor er beviset. Træk-og-slip-ombytning i fotogitteret er ikke
undersøgt for tastatur; forsidevalget har en ★-knap som alternativ.

## Aggregator-reglerne

Ingen berørt. Kun et privat annoncefelt for egne annoncer.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
