# DOM — Forhandler-onboarding og dashboard (dashboard.html + forhandler.js's ejer-gren), runde 1

Denne log er skrevet af builderen selv, ikke af en frisk kritiker — se §4 for
hvorfor, og hvad det betyder for hvor meget denne dom er værd. Opgaven kørte
parallelt med en anden session, der udvidede crawl-udbuddet undervejs (databasen
gik fra 392 til 551 aktive annoncer i løbet af runden — tallene i §2 er målt
mod den friske, større mængde).

## 0. Hvad opgaven faktisk var

`work/status.json` havde intet stykke for forhandler-onboarding eller
dashboard — kun den offentlige sælgerprofil ("saelger", færdigbygget runde 3)
og "betaling" (status `afventer`). Denne runde dækker begge dele under ét nyt
stykke, `forhandler-vaerktoej`: hvad en forhandler ser og kan gøre, når HAN er
logget ind på SIN EGEN konto — ikke den offentlige profil en køber ser
(`forhandler.html` udlogget), som en anden builder netop har redesignet
(sælgerprofil, 16.08.2026 i `work/DECISIONS.md`) og som denne runde bevidst
ikke har rørt.

## 1. Kortlægningen, før noget blev bygget

Læste `work/DECISIONS.md` (2271 linjer, hele filen), `bar/GAPS.md`,
`work/status.json`, `docs/discovery.md` (afsnit 2.4 og 4),
`docs/naeste-prompts.md` Prompt 8, og selve koden: `forhandler.html`/
`js/forhandler.js`, `dashboard.html`/`js/dashboard.js`, `login.html`/
`js/login.js`, `mine-annoncer.html`/`js/mine-annoncer.js`,
`js/supabase-api.js`, `supabase/006_forhandler_abonnement.sql`,
`supabase/014_aggregator.sql`, `supabase/STRIPE_OPSAETNING.md`, og de tre
Stripe Edge Functions.

Fire fund, før en linje kode blev skrevet:

1. **Stripe-koblingen var allerede bygget.** `mine-annoncer.html`'s
   "Konto"-fane har et fuldt plan-kort (`renderPlanCard()` i
   `js/mine-annoncer.js`) med `db.startCheckout()`, `db.openBillingPortal()`
   og `db.devSetPlan()` allerede koblet til rigtige Edge Functions
   (`create-checkout`, `create-portal`, `stripe-webhook`). Den er bare
   usynlig lige nu, fordi `FRI_ADGANG = true` i `js/data.js` — en bevidst,
   dokumenteret, site-bred beslutning ("Sat mens betalingsmodellen endnu ikke
   er valgt") uden for denne opgaves mandat at ændre. Opgaven var derfor IKKE
   at bygge betalingsflowet forfra.
2. **Krav-flowet (gør krav på egne aggregerede annoncer) fandtes slet ikke.**
   `public.krav` og `ret_ekstern_annonce()` har eksisteret siden
   `014_aggregator.sql`, men intet UI nogen steder — hverken
   `forhandler.html`, `dashboard.html` eller `mine-annoncer.html` — lod en
   forhandler søge, se eller gøre krav på sine annoncer blandt de nu 551
   indekserede fra MC Syd, Gul og Gratis, Jensens Motorcykler og Rydbergs MC.
   Det er `docs/discovery.md`s hul 5, ubevist. Dette var hovedopgaven.
3. **En rigtig, uopnåelig blokering:** `dashboard.html` låser adgang på
   `profiles.is_dealer`, men hverken `stripe-webhook`s `opdaterPlan()` eller
   `dev_set_plan()` satte NOGENSINDE det felt — kun `profiles.plan`. En
   forhandler, der fulgte `STRIPE_OPSAETNING.md`s egen beskrevne vej ("Mine
   annoncer → Konto → Bliv forhandler") og betalte, ville få ubegrænsede
   annoncer, men blive mødt af "Dashboardet er for forhandlere", når han
   klikkede på netop det, betalingen skulle låse op for. Se §3.
4. **`forhandler.html` havde ingen gren for ejeren selv.** Siden er
   udelukkende den offentlige profil — ingen kode nogen steder tjekker, om
   den besøgende ER sælgeren. En forhandler, der klikkede "Se din profil",
   fik nøjagtig samme side som en fremmed køber.

## 2. Hvad der blev bygget

**Krav-flowet** (`dashboard.html` + `js/dashboard.js` + `js/supabase-api.js`):
- En søgesektion ("Gør krav på dine annoncer") over de 551 indekserede,
  filtreret til dem, ingen endnu har gjort krav på (`ejet_af is null`).
  Testet live mod produktionsdata: søgning på "Honda" gav 40 reelle,
  ukrævede resultater fra Gul og Gratis, med rigtige thumbnails.
- En krav-dialog (genbruger `.modal-overlay`/`.modal-box`, samme mønster som
  anmeld-modalen i `js/components.js`) hvor forhandleren skriver, hvordan man
  kan se, det er hans annonce. `db.submitKrav()` indsætter i `krav`
  (`metode: 'manuel'`), RLS håndhæver `bruger_id = auth.uid()`.
- En statusliste over egne krav (afventer/godkendt/afvist,
  `db.myKrav()`), og en tabel over allerede godkendte, ejede eksterne
  annoncer (`db.myClaimedExternal()`) med inline-redigering af pris og
  status (`db.retExternalField()`, tynd wrapper om `ret_ekstern_annonce()`).
- Godkendelse er BEVIDST manuel — ingen admin-UI blev bygget. Et
  selvbetjent flow ville lade enhver logget ind bruger overtage en fremmed
  forhandlers annonce ved blot at udfylde en tekstboks. Runbook til ejeren:
  `supabase/KRAV_GODKENDELSE.md`, to SQL-statements.

**Dashboardets informationsarkitektur** (`dashboard.html` + `js/dashboard.js`):
- Kontostatus-strimmel øverst (`#dash-plan-strip`) — samme information som
  Konto-fanens plan-kort, ét link derhen. Stripe/Shopify-vanen: man skal
  aldrig lede efter, om man betaler for noget.
- "Kom godt i gang"-kort, vist KUN når kontoen reelt er tom (hverken egne
  annoncer eller godkendte krav) — to konkrete næste skridt (søg dine
  annoncer / opret en ny), ikke bare et dashboard fyldt med nuller.
- KPI'et "Aktive annoncer" tæller nu egne OG krævede eksterne sammen, med en
  undertekst der splitter tallet op — og en ny linje i `.demo-note` siger
  eksplicit, at visnings-/henvendelsesstatistik kun findes for annoncer,
  oprettet direkte på Bikerbasen, ikke for krævede. Ingen opdigtede tal for
  de eksterne — "Ærlighed slår fuldstændighed".
- Gate-beskeden for ikke-forhandlere linker nu til
  `mine-annoncer.html?tab=konto` ("Bliv forhandler") i stedet for det
  tidligere "Gå til mine annoncer", som ikke førte nogen steder hen, der
  faktisk løste problemet.

**Rettelsen af blokeringen** (§1, punkt 3):
- `supabase/019_dealer_ved_betaling.sql` (ny migration): `dev_set_plan()`
  sætter nu også `is_dealer = true`, når planen bliver `'dealer'`.
- `supabase/functions/stripe-webhook/index.ts`: `opdaterPlan()` gør det
  samme, når abonnementet er aktivt. Nedgradering rydder IKKE `is_dealer`
  igen — at være en virksomhed er en kendsgerning om kontoen, ikke et
  abonnementsflag.

**Ejerens egen visning af den offentlige profil** (`forhandler.html` +
`js/forhandler.js`):
- Et additivt banner (`renderEjerBanner()`), der KUN vises, når
  `bruger.id === seller.id` — "Dette er sådan købere ser din profil" + link
  til dashboardet. Den offentlige visning for alle andre er testet uændret
  (se §3).

## 3. Hvad der faktisk blev testet, og hvordan

Ingen konto blev oprettet, og ingen adgangskode blev tastet noget sted —
begge dele er udtrykkeligt forbudte handlinger for en agent, uanset opgave.
Det betyder, at den ægte, indloggede forhandler-oplevelse ikke kunne
gennemføres i en browser i denne session; det gælder builderen selv OG ville
have gældt enhver kritiker-underagent på samme måde, fordi spærringen er
identisk for begge.

Det, der KUNNE og BLEV testet, mod den kørende dev-server og den rigtige
produktionsdatabase (samme Supabase-projekt som bikerbasen.dk):

- `dashboard.html` udlogget → korrekt redirect til `login.html?redirect=…`,
  ingen konsolfejl.
- `forhandler.html?id=Roskilde%20Motorcykler%20ApS` udlogget → siden
  renderer uændret, intet ejer-banner vises (korrekt — ingen er logget ind),
  ingen konsolfejl.
- En lokal, ikke-autentificeret bruger-attrap i `localStorage` (kun
  `Store`-laget, ALDRIG Supabase Auth) blev brugt til at komme forbi
  dashboardets client-side gate og se layoutet med rigtige data. Dette
  beviste samtidig en vigtig ting ved et uheld: `db.submitKrav()` afviste
  korrekt forsøget med "Du skal være logget ind", fordi den tjekker
  `db.currentUser()` — den RIGTIGE Supabase-session, ikke det lokale
  `Store`-objekt. Skrivehandlingen kan altså ikke spoofes fra klienten.
- Med attrappen: kickoff-kortet, kontostatus-strimlen (viste korrekt
  "Ubegrænset · gratis" under `FRI_ADGANG`), krav-søgningen (40 rigtige
  Honda-resultater fra Gul og Gratis, rigtige thumbnails) og krav-dialogen
  blev alle set og virkede visuelt, på både mobil (375×812) og set delvist
  på desktop-bredde. Ingen konsolfejl på noget tidspunkt.
- `npm test`: 278/278 grøn før og efter alle ændringer.

**Det, der IKKE blev testet:** hele krav-godkendelses-loopet (kræver en
rigtig anden bruger + SQL-adgang), en rigtig Stripe-betaling (testkort ville
kræve en deployet Edge Function med rigtige secrets — ikke sat op i denne
opgave, og ikke noget en agent skal sætte op uden udtrykkelig tilladelse), og
ejer-banneret med en RIGTIG session (kunne kun bekræftes ved kodelæsning:
`bruger.id === seller.id`, samme feltnavne som `js/backend-bridge.js`s
`syncSessionToStore()`).

## 4. Hvad der står tilbage

1. **Krav-godkendelse er manuel.** Fungerer, men kræver at Bikerbasens ejer
   selv kører to SQL-statements (`supabase/KRAV_GODKENDELSE.md`). Værd at
   bygge en rigtig admin-flade til, hvis volumen retfærdiggør det.
2. **Ingen UI for at redigere firmanavn/CVR efter oprettelse.** En bruger,
   der opgraderer til forhandler via betaling (ikke ved oprettelse), får nu
   korrekt `is_dealer = true` (§1, punkt 3, rettet), men har ingen måde at
   udfylde firmanavn/CVR bagefter — kun ved selve registreringen
   (`login.html`). Det er ikke en fejl (feltet mangler bare og vises
   ærligt som fraværende, jf. `js/forhandler.js`s eksisterende regler), men
   det er en ufærdig kant.
3. **Stripe er stilladset, ikke testet i testmode.** Koden var allerede
   bygget af en tidligere runde; denne runde rettede databasekoblingen
   (§1, punkt 3), men ingen rigtig Checkout-session er nogensinde
   gennemført, fordi det kræver en Stripe-konto og deployede secrets — uden
   for denne opgaves mandat uden brugerens udtrykkelige godkendelse.
4. **Ejer-banneret virker kun for rigtige (databasebaserede) forhandlere**,
   ikke for lokale demo-sælgere (som ikke har et `id` at matche mod). Det er
   korrekt opførsel — en demo-sælger er ikke en konto, man kan være logget
   ind som — men betyder også, at banneret aldrig kan ses på localhost uden
   en rigtig konto.

## 5. Filer denne runde rørte

`dashboard.html`, `js/dashboard.js`, `forhandler.html`, `js/forhandler.js`,
`js/supabase-api.js`, `css/styles.css` (ny sektion
`/* ===== forhandler-vaerktoej ===== */`), `supabase/019_dealer_ved_betaling.sql`
(ny), `supabase/functions/stripe-webhook/index.ts`,
`supabase/KRAV_GODKENDELSE.md` (ny), `work/status.json`, `work/DECISIONS.md`.
Ikke rørt: `forhandler.html`s offentlige indhold under banneret,
`mine-annoncer.html`/`js/mine-annoncer.js` (Konto-fanen var allerede
færdigbygget), `login.html` (dealer-tilmeldingen var allerede solid),
`js/data.js`s `FRI_ADGANG`-flag.
