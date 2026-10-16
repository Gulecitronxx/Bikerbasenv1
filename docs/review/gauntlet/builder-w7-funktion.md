# Builder W7 funktion — acceptkriterier (skrevet FØR koden)

Bevis = js/w7-funktion.test.js, der kører den browserkode, siden kører (js/w5-hjaelp.js-mønsteret).

## K1 Betaling (mine-annoncer.js, dashboard.js, opret-annonce.js)
- K1a Med FRI_ADGANG=true vises ingen tekst om Stripe/betaling/abonnement-køb og ingen betalingsknap.
- K1b Med FRI_ADGANG=false men betaling ikke bygget (flag `BETALING_BYGGET`=false, default) vises "Betaling er ikke åben endnu" — ingen "Stripe", ingen knap #plan-upgrade/#plan-portal, intet link "Bliv forhandler"/"Administrér abonnement".
- K1c Samme i dashboardets plan-strimmel og i opret-annonces gratis-grænse-dialog.
- K1d Retur-toasten "din betaling er modtaget" kan ikke vises, når betaling ikke er bygget.
- K1e Kun når BETALING_BYGGET=true OG FRI_ADGANG=false vises checkout/portal (koden bevares).

## K2 Telefonvisninger (ikke "Henvendelser")
- K2a Ingen af dashboard.js, mine-annoncer.js, dashboard.html, mine-annoncer.html, opret-annonce.html (indhold), login.js indeholder "henvendelse" (kommentarer undtaget ikke — rene brugertekster tjekkes på renderet output).
- K2b KPI-label, rækkelabel, tabel/graf-labels, meta description (+og/twitter) og demo-note siger "Telefonvisninger"; ingen tekst antyder beskeder.

## K3 MitID
- K3a Konto-fanens verificeringsrækker indeholder ingen "Identitet (MitID)" med "Ikke bekræftet"; rækken siger "Identitetsbekræftelse er ikke åben endnu" (også når user.mitIdVerified er true i gammel lokal session — vi viser aldrig "Bekræftet" for MitID).
- K3b Krav-flowet (dashboard.js krav, KRAV_GODKENDELSE) uændret: tests i dashboard/mine-annoncer består; krav læser ikke mitIdVerified.

## K4 Gennemgang (validering, backend-fejl, tomme tilstande, a11y, ærlighed)
- K4a Ingen "NaN/undefined/null" i renderede tal/tekster for tomme/manglende data.
- K4b Backend-fejl giver synlig fejltekst (role=alert/aria-live), ingen uhåndterede promise-afvisninger.
- K4c Fejlbeskeder og statuslinjer har aria-live; formularfelter har labels.
- K4d Knapper uden handler findes ikke.


# Resultat (alle kriterier opfyldt; 34 tests i js/w7-funktion.test.js, 33 af dem røde mod HEAD)

## Opgave 1 Betaling
FRI_ADGANG er `true` i js/data.js, så Stripe-teksten var skjult live — men ved `false` ville siden vise Stripe/checkout
selvom privatlivspolitikken siger, at Stripe ikke er i brug. Nyt flag `BETALING_BYGGET = false` (js/store.js) styrer alt:
mine-annoncer.js `planKortHTML()` viser "Betaling er ikke åben endnu" uden knapper/links/Stripe; dashboard.js plan-strimlen
og opret-annonces gratis-grænse-dialog (ingen link til abonnement); retur-toasten "betaling modtaget" kræver `betalingAaben()`.
Checkout/portal-koden er bevaret og kræver `BETALING_BYGGET=true` OG `FRI_ADGANG=false`.
## Opgave 2 Telefonvisninger
Omdøbt i KPI, annoncerække, Mine annoncer-kolonne, meta/og/twitter description, demo-note (siger nu "ikke beskeder"),
login-kontekst og opret-annonces "Sådan når købere dig" (fjernet løftet om at købere kan "markere, at de vil i kontakt").
## Opgave 3 MitID
`kontoRaekker()`: "Identitet (MitID)" erstattet af "Identitetsbekræftelse — Ikke åben endnu"; viser aldrig "Bekræftet", heller ikke
med gammel `mitIdVerified=true`. Krav-flowet rører ikke mitIdVerified (uændret). Login uden backend opfandt "Mikkel Jensen" med
alle bekræftelser = true; nu e-mailens lokaldel og ingen bekræftelser.
## Opgave 4 Fund og rettelser
- dashboard.js: hentning kunne kaste (siden døde) eller svare fejl (vist som rigtige nuller). Nu `sikkertKald`, `DASH_FEJL`,
  #dash-error (role=alert, "Prøv igen"), KPI "Ikke hentet", ingen "Kom godt i gang" ved fejl; ekstern pris afviser negativ/ugyldig;
  krav-søg/-send og sletning fanger kast; `error.message` vist rå/undefined -> `fejlTekst()` + escapeHTML (toast bruger innerHTML).
- mine-annoncer.js: `myListings`/status/slet/favorit-opslag/samtykke kunne kaste uhåndteret (knap blev disabled for evigt);
  statistik-promise uden catch; sortering med manglende pris/dato gav NaN-rækkefølge; "Invalid Date" i søgeagent; aria-live på pf-hint.
- opret-annonce.js: udgivelse kunne hænge på "Udgiver…" ved netværksfejl; efter oprettet annonce ingen genåbning (ingen dublet).
- login.js: `syncSessionToStore` uden catch; telefon uden validering (`telefonOK`); offline-login opfandt identitet.
- forhandler.js: backend-fejl = "findes ikke" (løgn) -> "Kunne ikke hente profilen" + Prøv igen; ødelagt `?id=%E0%A4%A` kastede URIError;
  anmeldelseshentning der fejler sagde "Ingen har bedømt"; addReview kastede/viste rå besked.
- Ikke rettet (uden for ejerskab/omfang): login.html/dashboard.html gate-knap "Bliv forhandler" fører til konto-fanen (kontotype, ikke betaling).

## Filer og tests
Nye: js/w7-funktion.test.js, js/w7-funktion-hjaelp.js (harness, ikke test). `npm test` skal have js/w7-funktion.test.js tilføjet (Orchestrator).
`node --check` alle js/crawler/scripts og `npm test` (813) grønt. Kørt uden build/udgiv/generatorer.
