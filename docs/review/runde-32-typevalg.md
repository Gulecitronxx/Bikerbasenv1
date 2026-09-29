# Runde 32 — typevalget i opret-annonce: ingen gruppe, ingen fast fejl (29.09.2026)

Bruger: "kør loopet igen." Fortsættelse fra runde 29 (upload-zonen på samme
side). Runden tog formularfejl i trin 1 af opret-annonce.

## Fejlhåndteringen i øvrigt er god

Tom indsendelse af trin 1: alle fem obligatoriske felter får `aria-invalid="true"`,
en fast fejltekst ("Feltet skal udfyldes.") koblet med `aria-describedby`
(`markFieldError()`), fokus flytter til første fejl, og en `role="alert"`-toast
siger det også. Det er ikke rørt.

## Fundet: typevalget faldt uden for alt det

De otte typefliser (Sport, Touring, Cruiser …) er radioknapper i en
`div.radio-card-group`. Målt før rettelsen:

- gruppen havde hverken `role="radiogroup"` eller navn. En skærmlæser læste
  otte knapper op uden at sige, hvad man vælger imellem;
- ingen type valgt gav `valid = false` og en toast — men **ingen** fejlmarkering,
  ingen fast fejltekst og intet `refs.first`. Toasten forsvinder efter 2,6 s;
- manglede *kun* typen (felterne udfyldt), flyttede fokus **ingen steder hen**.
  Man stod på siden uden at vide, hvorfor "Fortsæt" ikke gjorde noget. (Læst i
  koden: `refs.first` blev aldrig sat for typen. Ikke målt separat før
  rettelsen — kun "alt tomt" blev målt, hvor fokus gik til "Mærke", ikke typen.)

Typen er første fejl i læserækkefølgen — den står øverst — så den skal også
være der, fokus lander.

## Rettet

- `opret-annonce.html`: overskriften har fået `id="type-overskrift"`, og
  `#type-radio-group` har `role="radiogroup"` og
  `aria-labelledby="type-overskrift"` (navnet er "Motorcykeltype").
- `js/opret-annonce.js`: `markTypeError()` sætter `aria-invalid="true"` på
  gruppen (understøttet på `radiogroup`), tegner en fast `.felt-fejl`
  ("Vælg en motorcykeltype.") lige efter den og kobler den med
  `aria-describedby`. `clearTypeError()` fjerner det hele. `validateStep(1)`
  kalder den ene ved manglende valg, den anden ellers, og sætter
  `refs.first` til første radioknap, så fokus lander dér — uanset om felterne
  under også mangler. En `change`-lytter på gruppen (delegeret, så den overlever
  `renderTypeTilesIfStale()`, der gentegner fliserne) rydder fejlen i samme
  øjeblik, man vælger.

## Målt efter

Gruppen: `role="radiogroup"`, navn "Motorcykeltype". Alt tomt: fokus på første
radioknap (`bike-type=sport`), `aria-invalid="true"` og `aria-describedby` på
gruppen, fejlteksten synlig, og fejlen på "Mærke" er intakt. Vælg en type:
`aria-invalid` og `aria-describedby` væk, fejlteksten fjernet. Kun typen
mangler (felterne udfyldt, valget fjernet): fokus på første radioknap, fejlen
tegnet, trin 1 står stille.

## Ikke gjort

Ingen automatisk test: `validateStep()` hænger på `document`, og
`opret-annonce.js` er ikke udtrukket til noget, testene kan køre. Målingerne
ovenfor er beviset. Ingen skærmlæser er prøvet; `aria-invalid` og
`aria-describedby` på en `radiogroup` er standardens egne rolle-egenskaber,
men hvordan en bestemt skærmlæser læser dem op, er ikke hørt.

## Aggregator-reglerne

Ingen berørt. Kun en privat annonceformular.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
