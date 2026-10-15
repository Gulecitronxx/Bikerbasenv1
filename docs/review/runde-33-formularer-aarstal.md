# Runde 33 — formularfelter: autocomplete i orden, hårdkodede årstal (29.09.2026)

Bruger: "kør loopet igen." Runden tog formularfelternes tekniske kvalitet:
`type`, `autocomplete` og `inputmode`, som styrer adgangskodemanagere, autofyld
og mobiltastaturer. Browser og Bash var midlertidigt blokeret af en
forbigående klassifikatorfejl under runden; den første del er derfor læst i
kildeteksten, ikke målt i browseren.

## Fundet i orden

`login.html`: `type="email"` og `autocomplete="email"` på e-mail-felterne,
`current-password` på login, `new-password` på nulstilling og oprettelse,
`type="tel"` + `autocomplete="tel"` på telefon. Tal i opret-annonce (årgang, km,
ccm, hk, pris, ejere, syn, dæk) har `type="number"` og `inputmode="numeric"`.
Ikke rørt.

## Fundet: årstal skrevet ind i HTML'en

`opret-annonce.html` har `max="2026"` på tre felter — årgang (`f-year`), sidste
syn (`f-synsaar`) og dæk (`f-daek`). I dag er det 2026, så det er rigtigt; fra
nytår er det forkert. Formularen er `novalidate`, så tal udenfor stopper aldrig
indsendelsen, og `validateStep()` bruger allerede `new Date().getFullYear() + 1`
som grænse for årgang. Men `max` er det, browseren bruger til piletasterne og
det, en skærmlæser fortæller om feltet: fra 1. januar 2027 ville piletasterne på
"Sidste syn" stoppe ved 2026, så et syn i 2027 ikke kunne nås med dem.

Rettet: `populateStaticFields()` i `js/opret-annonce.js` sætter `max` på de tre
felter til `getFullYear() + 1` — samme grænse som valideringen. HTML'ens egne
`max="2026"` er ikke fjernet; de er reserve, indtil scriptet kører, og
overskrives.

## Målt efter

Alle tre felter: `max="2027"` (2026 + 1). `min` uændret (1950, 1980, 1990).
Ingen konsolfejl.

## Bevidst ikke rørt: `memberSince: 2026`

`sellerFromUser()` i `js/opret-annonce.js` sætter `memberSince: 2026` på
sælgerobjektet til forhåndsvisningen og lokale annoncer. Fra 2027 ville en ny
sælger stå som "Medlem siden 2026" dér. Rigtige annoncer er ikke ramt: de får
`memberSince` fra databasen (`seller.member_since`, ellers årstallet på
`created_at`, `js/backend-bridge.js`). Og brugerobjektet gemmer ingen
oprettelsesdato, så der er ikke noget bedre at slå op — `getFullYear()` ville
være forkert i den anden retning (en, der oprettede sig i 2026 og laver en
annonce i 2027). En rigtig løsning kræver, at oprettelsesåret gemmes ved
registrering. Det er en dataændring, ikke en rettelse af en konstant.

## Ikke gjort

Ingen automatisk test: `populateStaticFields()` hænger på `document`. Målingen
ovenfor er beviset. Min/max på `f-year` (1950) er ikke afstemt med valideringens
1900; det er en forskel, ikke en fejl, fordi formularen er `novalidate`.

## Aggregator-reglerne

Ingen berørt. Kun feltattributter på en privat annonceformular.

## Verifikation

**Gate:** `node --check`, `npm test` 344/344, `node scripts/build.js`,
`node scripts/udgiv.js` — alle grønne.
