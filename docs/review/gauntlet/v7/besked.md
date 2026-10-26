# V7 Agent 1 — Køber–sælger-kontakt (beskeder)

Ejerens ordre: *"Gør Bikerbasen til en markedsplads, hvor køber og sælger reelt kan finde hinanden."*
Verificeret problem (BMW R45, privat annonce): kortet sagde "Beskeder til sælger kan endnu ikke sendes via Bikerbasen" og
henviste køberen til at logge ind for at se, om sælgeren viser sit telefonnummer — ingen tydelig kontaktmulighed.
Historik: en tidligere kontaktformular blev fjernet (F2-006, w5), fordi den indsamlede navn/e-mail/telefon til en besked,
der aldrig blev leveret. Nu er den bygget rigtigt — men **kun som kildefiler bag et flag**, fordi jeg ikke må køre
migrationer, deploye funktioner eller sætte secrets (V7-FAELLES, autorisationsgrænser).

Branch `gauntlet/v7-besked` (ingen push). Alt nedenfor er verificeret mod lokal mock; SQL'en er kun tjekket statisk
(se "Ærlige forbehold").

## 1. Undersøgelse: hvad fandtes?

| Fund | Status | Brug |
|---|---|---|
| Beskedtabeller | **Ingen.** grep over `supabase/*.sql`, `supabase/functions`, `js/` giver ingen messages/samtaler. | Bygget nyt (025). |
| `013_soegeagenter.sql` + `functions/notify-saved-searches` | Trigger -> `pg_net` -> Edge Function -> Resend, `x-bb-secret`/`NOTIFY_SECRET`, `esc()` mod phishing i mails. | **Genbrugt som mønster**: samme trigger-stil, samme secret, samme Resend-afsender, samme escaping. |
| `023_telefon_samtykke.sql` (`hent_saelger_telefon`, `vis_telefon`) | Virker; telefon er sælgerens eget valg. | **Uændret.** Telefon bliver et valgfrit alternativ; beskeder afslører aldrig nummeret. |
| `024_profil_opdeling.sql` (`profiles_private`) | Offentligt profilnavn i `profiles`, privat telefon/e-mail-status i `profiles_private`. | Beskedmodellen bruger kun `profiles.name` (findes før og efter 024). E-mail-verificering læses direkte i `auth.users.email_confirmed_at`, så 025 ikke afhænger af 024. |
| `022_anonym_skrivegulv.sql` (`taeller_tik`, IP-hash) | Rate limit for ANONYME skrivekanaler (IP er det eneste identitetsbevis). | **Ikke genbrugt til beskeder**: beskeder kræver login, så vi har en rigtig identitet. Loftet tælles pr. bruger direkte på `beskeder`-tabellen (ingen hjælpetabel, der kan komme ud af trit). |
| `reports` (DSA notice-and-action) + `indberet` | Kanalen for anmeldelser. | **Genbrugt**: `rapporter_samtale()` skriver til `reports` (`target_type='profile'`, kommentar med tråd-id). Ingen parallel anmeldelsesmodel. |
| `haendelse` / `listing_stats` | Tæller telefonvisninger ("Henvendelser" i dashboard). | Uændret; en besked er ikke en telefonvisning. |
| Mine annoncer (faner, `?tab=`), `bekraeft()`-dialog, `toast()` | Findes. | Ny fane + genbrug af dialog/toast. |
| `js/supabase-config.js` | Indlæses på alle sider med annonce/konto. | Rummer flaget og den lille lazy-loader. |

## 2. Design (kort)

**Datamodel** (`supabase/025_beskeder.sql`, kildefil):
- `samtaler` — én tråd pr. (annonce, køber). `listing_id on delete set null` + `annonce_titel`-snapshot: en slettet annonce
  gør tråden **låst, men læsbar**. Kun annoncer i `public.listings`; indekserede annoncer (`eksterne_annoncer`) har aldrig
  kontaktflade og kan ikke nås af `send_besked` (FK + uuid-opslag i `listings`).
- `beskeder` — 2–1000 tegn (CHECK i tabellen).
- `besked_blokeringer` (blokér pr. bruger, begge veje), `besked_indstillinger` (kun mailvalget).

**RLS / adgang**
- Alle fire tabeller har RLS. Kun to politikker: `SELECT` for deltagerne (`auth.uid() = seller_id or buyer_id`), `to authenticated`.
  Ingen politik for INSERT/UPDATE/DELETE; `revoke all … from public, anon, authenticated` + `grant select` på to tabeller.
- Alt skrives gennem ti `security definer`-funktioner med `set search_path = ''`, kun `execute` for `authenticated`.
- **Ingen funktion eller tabel udstiller e-mail eller telefon.** Modparten får kun profilnavnet (offentligt i forvejen) og det, afsenderen selv skriver.
- Kun indloggede med **bekræftet e-mail** kan skrive (`auth.users.email_confirmed_at`); alle kan læse egne tråde.

**Spam** (i databasen, ikke kun i browseren): 20 beskeder/time og 100/døgn pr. bruger; 5/time pr. annonce; højst 10 nye tråde/døgn
pr. køber; samme tekst to gange inden for 10 min afvises; højst to links; honeypot (udfyldt = `ok` uden at gemme noget, så botten
ikke ved, at den blev opdaget); længdegrænser i både UI og CHECK. Svar: 30/time, 150/døgn, 20/time pr. tråd.

**Sælger/køber-flow**: køber skriver på annoncen -> sælger får en mail (uden tekst) + badge i header og på fanen -> åbner tråden
(markeres læst) -> svarer -> køber ser svaret. Tråden kan blokeres (fortrydes), anmeldes og er låst ved solgt / pause / slettet.

**Notifikation**: trigger `on_besked_oprettet` -> `pg_net` -> Edge Function `besked-notifikation` -> Resend. Højst én mail pr. modtager
pr. tråd pr. 30 min; modtageren kan slå mails fra i Beskeder-fanen. **Mailen indeholder aldrig beskedteksten og aldrig afsenderens
navn/e-mail/telefon** (ingen brugerindhold fra vores SPF/DKIM-signerede domæne = ingen phishing-flade); annoncens titel HTML-escapes.
Fejler notifikationen, gemmes beskeden alligevel. Uudfyldte `<<PROJEKT_URL>>`/`<<HEMMELIGHED>>` = ingen kald (vagt i funktionen).

**Opbevaring**: `ryd_gamle_samtaler()` (24 måneder efter sidste besked) findes, men er **ikke planlagt** — ejerens valg ved opdateret privatlivspolitik.

## 3. Hvad er bygget

| Fil | Indhold |
|---|---|
| `supabase/025_beskeder.sql` | Tabeller, RLS, grants, 10 RPC'er, trigger, oprydningsfunktion. **Ikke kørt.** |
| `supabase/functions/besked-notifikation/index.ts` | Edge Function. **Ikke deployet.** |
| `js/supabase-config.js` | `BB_FLAGS.beskeder` (**default false**), `bbFlag()`, `bbIndlaesBeskeder()` (lazy-loader). |
| `js/beskeder.js` + `css/p-beskeder.css` | Formular, kvittering, indbakke, tråd, blokér/anmeld, mailvalg, ren logik. **Hentes kun med flaget.** |
| `js/annonce.js` | Ny kontaktbeskrivelse (flag fra) / besked-pladsholder, login-CTA, bjælke-CTA, egen-annonce-link (flag til). |
| `mine-annoncer.html`, `js/mine-annoncer.js` | Fane **Beskeder** (skjult uden flag), deep-link `?tab=beskeder&samtale=<id>`. |
| `js/components.js`, `css/styles.css` | Badge (`bbSaetBeskedBadge`) i header, mobilprofil, skuffe og fane. |
| `js/opret-annonce.js`, `opret-annonce.html`, `js/dashboard.js`, `dashboard.html` | Teksten "Vi videresender ikke beskeder" skifter, når flaget er til (ellers uændret). |
| `scripts/w9-saelger-mock.js` | Udvidet: flere brugere mod ét lager (`installer(ctx, { som })`), alle database-funktionerne gen-implementeret med samme regler. |
| `css/p-annonce.css` | To små regler til den nye kontaktbeskrivelse + pladsreservation til formularen. |
| `scripts/v5-sidevaegt.budget.json` | Budget for de to nye filer + `supabase-config.js` (begrundet under `begrundelser_v7`). |
| `js/w5-hjaelp.js` | Valgfri 4. parameter `foer` til `indlaes()` (kode før kilderne, bruges til flag-tests). |

## 4. Flag fra (standard): hvad ser brugeren nu?

Før (BMW R45, udlogget): *"Beskeder til sælger kan endnu ikke sendes via Bikerbasen. Log ind for at se, om sælgeren har valgt at vise sit telefonnummer."* — og to knapper.

Nu, **udlogget**:
> **Sådan kontakter du sælgeren.** Log ind gratis, og tryk på "Vis telefonnummer", hvis sælgeren har valgt at vise sit nummer.
> **Beskeder via Bikerbasen er ikke åbnet endnu**, så uden et vist nummer kan annoncen ikke kontaktes her.
> [Log ind for at se sælgeren] [Opret gratis profil]

**Indlogget**, tre ærlige tilstande (aldrig to modstridende noter): *Beskeder via Bikerbasen er ikke åbnet endnu + "kan se det med knappen"*; *Sælgeren viser ikke sit telefonnummer, og beskeder … ikke åbnet endnu. Annoncen kan derfor ikke kontaktes via Bikerbasen lige nu*; *Sælgeren har ikke oplyst telefon, og …* (samme slutning).

Ærlighed: teksten siger *"Bikerbasen har ikke åbnet beskeder"*, ikke *"sælgeren har ikke slået beskeder til"* (som ejerens eksempeltekst) — sælgeren kan ikke slå noget til, så den sætning ville være forkert. Ingen annonce står uden en tydelig forklaring på kontaktmuligheden.
Ingen formular, ingen beskedkald, `js/beskeder.js` og `css/p-beskeder.css` hentes **ikke** (målt i test). Beskeder-fanen er skjult; `?tab=beskeder` falder tilbage til Oversigt.

## 5. Flag til: hvad ser brugeren?

- **Udlogget**: "Skriv til sælgeren på Bikerbasen. Log ind gratis for at sende en besked. Sælgeren ser dit navn — ikke din e-mail eller dit telefonnummer." + primær knap *Log ind for at skrive til sælgeren*.
- **Indlogget køber**: formular ("Send besked til sælgeren", tre hurtigstartere, tæller 0/1000, fejl på dansk, ingen dobbeltsend, kladde i `sessionStorage` bevares ved fejl), derefter kvittering med link til tråden. Har køberen allerede skrevet: "Du har allerede skrevet til sælgeren" + *Åbn samtalen*.
- **Mobilbjælken**: *Send besked* (ruller til og fokuserer feltet); udlogget *Log ind for at skrive*.
- **Sælgerens egen annonce**: "Henvendelser til din annonce" + *Se beskeder* (ingen formular). **Demo- og indekserede annoncer**: ingen formular.
- **Mine annoncer -> Beskeder**: liste + tråd (to kolonner fra 900 px, ellers liste ELLER tråd med tilbage-knap), ulæst-prik, status-mærke (Solgt / På pause / Slettet), tom-/fejl-/loading-tilstand, mailvalg, blokér/fortryd, anmeld, sikkerhedsråd i tråden, let genhentning hvert 30. sekund mens fanen er åben og synlig.
- **Badge**: tal på "Min profil" (peger direkte på Beskeder, når der er ulæste), prik på mobilprofilen, tal på skuffens "Mine annoncer" og på fanen. `aria-label` "N ulæste beskeder".

## 6. Tests

Nye filer (**ikke tilføjet til `package.json`** — Orchestrator ejer listen):

| Fil | Type | Indhold |
|---|---|---|
| `js/v7-besked.test.js` | node | Validering, normalisering = SQL-reglen, hver SQL-kode har en dansk tekst, låse-/tids-/badgetekster, formularens markup, **flaget er default fra**, `beskeder.js` står ikke i nogen HTML, `bbIndlaesBeskeder()` henter intet uden flag, sælgerkortet i alle flag/login/uuid/egen-kombinationer. |
| `js/v7-besked-sql.test.js` | node, **statisk SQL** | Alle tabeller har RLS; kun to politikker og begge `for select … to authenticated … auth.uid()`; ingen `using (true)`; ingen skrive-politik; ingen grant til anon/skriveret; hver funktion `security definer` + tom `search_path`; kun ti klientfunktioner med `execute` til authenticated; ingen e-mail/telefon i svar; rate-limit-linjerne findes; trigger-vagt; Edge Function læser ikke beskedtekst, escaper titel, kræver secret; ren ASCII; mock og SQL deler koder. |
| `js/v7-besked-flow.test.js` | Playwright + mock | Flag fra (udlogget/indlogget, intet modul hentet, fane skjult); flag til: login-CTA, validering uden kald, send (netfejl, dobbeltklik, kvittering, notifikation uden tekst), honeypot, uverificeret e-mail + "send linket igen", egen/demo-annonce, mobilbjælke, sælger-badge -> læs -> svar -> køber-badge, deep-link, spam-grænser, slettet/solgt/pauset, blokér/fortryd/anmeld, XSS/escaping, tom/fejl-indbakke, mailvalg, **375/430 lys+mørk**, 1440/1920 mørk, CLS. Skærmbilleder med `BESKED_SKAERM=<mappe>`. |

Eksisterende tests, jeg har måttet røre (copy-ændringen er opgavens kerne):
`js/w5-annonce.test.js`, `js/w6-funktion.test.js`, `js/v4-annonce.test.js` (nye formuleringer i flag-fra-teksten), `js/w6-funktion.test.js`
(guard mod "Beskeden er sendt" m.fl. springer `js/beskeder.js` over — filen hentes kun bag flaget, og det låser `v7-besked.test.js`),
`scripts/v5-sidevaegt.budget.json` (budgetposter for de nye filer). Ingen tærskler er hævet for eksisterende sider.

## 7. Aktiveringsguide til ejeren

Rækkefølge — **flaget sættes SIDST**. Intet af dette er gjort.

1. **Stage først.** Opret en Supabase-branch/staging og kør hele 025 dér. Tjek de fire sætninger nederst i filen
   (`has_function_privilege('anon', …)` skal give *false*, `has_table_privilege('authenticated','public.beskeder','insert')` *false*).
   Kør derefter flowet med to testkonti med bekræftet e-mail (send, svar, blokér, slettet annonce, spam-grænse). SQL'en er skrevet
   uden at kunne køres lokalt og er kun statisk kontrolleret.
2. **Migration i produktion.** I filen: erstat `<<PROJEKT_URL>>` (`https://<projekt-ref>.supabase.co`) og `<<HEMMELIGHED>>` (samme
   værdi som i `013_soegeagenter.sql`/secret `NOTIFY_SECRET`) i funktionen `besked_notifikation()`. Kør filen i SQL Editor. Den kan
   køres igen uden skade. Uden de to værdier virker beskeder, men der sendes ingen mail.
3. **Edge Function.** `supabase functions deploy besked-notifikation --no-verify-jwt`.
4. **Secrets** (findes de allerede for søgeagenter, er der intet nyt): `NOTIFY_SECRET`, `RESEND_API_KEY`, `SITE_URL=https://bikerbasen.dk`.
5. **Databehandleraftale (DPA) med Resend.** Resend modtager nu også modtagerens e-mailadresse til *"ny besked"*-mails (aldrig tekst).
   Tjek at DPA'en dækker det, og at afsenderdomænet `bikerbasen.dk` er verificeret (SPF/DKIM).
6. **Privatlivspolitik og vilkår** — opdatér med teksterne i afsnit 8 (jeg har **ikke** rørt `privatlivspolitik.html`, `vilkaar.html`,
   `sikkerhed.html` eller `om-bikerbasen.html`; de siger i dag *"Bikerbasen leverer ikke beskeder"*, og det bliver forkert, når flaget er til).
7. **Opbevaring.** Planlæg `select public.ryd_gamle_samtaler();` (fx månedligt med pg_cron), når opbevaringstiden står i politikken.
8. **Flaget.** I `js/supabase-config.js`: `beskeder: false` -> `true`, byg og udgiv (`node scripts/build.js` -> `node scripts/kritisk-gen.js` -> `node scripts/build.js`, derefter gate). Test én rigtig besked mellem to egne konti.
9. **Rollback**: sæt flaget tilbage til `false` og udgiv — formular, fane og badge forsvinder; data bliver liggende (RLS lukker for alle andre end deltagerne).

## 8. FORSLAG til ændrede tekster (ejerens godkendelse kræves — intet er ændret i repoet)

### privatlivspolitik.html

**§2 Hvilke data vi behandler — ny punkt:**
> **Beskeder mellem brugere:** skriver du til en sælger (eller svarer du en køber) via en annonce, gemmer vi din besked, tidspunktet, hvilken annonce den handler om og hvem der er afsender og modtager. Modparten ser dit profilnavn og din besked — ikke din e-mailadresse og ikke dit telefonnummer, medmindre du selv skriver dem i beskeden. Vi læser ikke beskeder som led i den almindelige drift; vi kan læse en samtale, hvis den bliver anmeldt (se punkt 5), eller hvis loven kræver det.

**§3 Formål og retsgrundlag — tilføj efter første sætning:**
> Beskeder behandles for at formidle kontakt mellem køber og sælger (opfyldelse af kontrakt). Spærring af misbrug (rate limit, blokering, anmeldelse) bygger på vores legitime interesse i at holde platformen sikker.

**§5 Databehandlere — ret punktet om Resend:**
> **Resend** — udsendelse af mails om søgeagenter og om nye beskeder. Resend får din e-mailadresse og mailens indhold. En mail om en ny besked indeholder kun annoncens titel og et link til Bikerbasen — aldrig selve beskeden og aldrig afsenderens navn eller kontaktoplysninger.

**§5 — ny underoverskrift "Beskeder og mails":**
> Når du får en besked, sender vi højst én mail pr. samtale pr. halve time til din kontos e-mailadresse. Du kan slå mails om nye beskeder fra under Mine annoncer, Beskeder. Du kan blokere en bruger, så ingen af jer kan skrive i samtalen, og du kan anmelde en samtale; en anmeldt samtale kan Bikerbasen læse for at vurdere anmeldelsen (DSA).

**§6 Opbevaringsperiode — tilføj:**
> Beskeder og samtaler slettes automatisk 24 måneder efter den seneste besked i samtalen. Sletter du din konto, slettes dine samtaler med den. Slettes en annonce, forbliver samtalen læsbar for begge parter, men kan ikke bruges til nye beskeder.

**§7 Dine rettigheder — tilføj:**
> Du kan få udleveret eller slettet dine beskeder ved at skrive til kontakt@bikerbasen.dk.

**§8 Datasikkerhed — tilføj:**
> Beskeder kan kun læses af de to deltagere (adgangen er styret pr. række i databasen). Vi begrænser antallet af beskeder pr. time og pr. døgn og afviser spam, så en bruger ikke kan oversvømme andre.

### vilkaar.html (afsnittet om kontakt, i dag: "Bikerbasen leverer i dag ikke beskeder mellem brugere …")
> Køber og sælger kan kontakte hinanden via beskeder på Bikerbasen (kræver en profil med bekræftet e-mail) eller, hvis sælgeren har valgt det, via sælgerens telefonnummer. På annoncer, vi indekserer fra andre sider, sker kontakten hos kilden. Du må ikke bruge beskeder til spam, svindel, chikane eller reklame, og Bikerbasen kan begrænse eller lukke en konto, der gør det. Bikerbasen er ikke part i handlen og håndterer ingen betaling.

### sikkerhed.html (listepunktet om kontakt, i dag: "… Bikerbasen leverer ikke beskeder mellem brugere.")
> Er den oprettet på Bikerbasen, kan du som indlogget sende sælgeren en besked eller — hvis sælgeren har valgt det — se telefonnummeret. Betal aldrig depositum, før du har set motorcyklen, og del aldrig koder fra MitID eller banken. Virker en besked mistænkelig, kan du blokere afsenderen og anmelde samtalen.

### om-bikerbasen.html (i dag: "… Bikerbasen leverer ikke beskeder mellem brugere endnu.")
> Du opretter en profil for at skrive til sælgere, se en sælgers telefonnummer (hvis sælgeren viser det) og for at oprette egne annoncer.

## 9. Ærlige forbehold og restpunkter

1. **SQL er ikke kørt mod en rigtig Postgres.** Der er ingen lokal Postgres her; SQL'en er skrevet og læst igennem, og testen er statisk. Mock-flowet beviser frontenden, ikke databasen. Trin 1 i guiden (staging) er derfor et krav, ikke en anbefaling. De mest risikable steder at se efter: `mine_samtaler` (`returns table` + sql-funktion), `hent_samtale` (jsonb_agg med `order by`), og at `grant`-løkken i bunden accepterer signaturerne.
2. **Mailen kan ikke testes uden Resend/Deno.** Edge Function er læst og statisk kontrolleret, ikke kørt.
3. **E-mailbekræftelse**: kræver at projektet faktisk sender bekræftelsesmails ved oprettelse. Er "Confirm email" slået fra i Supabase Auth, er ingen bruger "verificeret", og ingen kan skrive. Tjek Auth-indstillingen før flaget.
4. **Statiske annoncesider** (`annonce-*.html`) har stadig "Log ind for at se sælger og kontaktoplysninger." i forrenderet markup (`scripts/build-listing-pages.js:288`) i de millisekunder, før JS erstatter kortet. Det er sandt nok i begge flagtilstande, men en ændring i generatoren (ikke mit område) kunne sige "Skriv til sælgeren" ved flag til.
5. **Tilbagelevering til tredje part**: dealer-annoncer i `listings` får også beskedflade (alle brugeroprettede annoncer); eksterne har aldrig.
6. **Ingen realtime**: indbakken genhenter hvert 30. sekund og ved fokus. Supabase Realtime kunne erstatte det; kræver en politik-gennemgang.
7. **Ingen vedhæftninger, ingen billeder i beskeder** (bevidst: ingen filer fra fremmede, ingen EXIF).
8. **Mine annoncer-oversigtens statistikkort** viser ikke et beskedtal (badge på fane og header dækker behovet; kortgitteret har fem fliser).
9. `package.json` "test"-listen skal have de tre nye filer (Orchestrator).

## 10. Skærmbilleder

`docs/review/gauntlet/v7/besked/` — `foer-*` (udgangspunkt, flag-fra-teksten før ændringen) og `flagfra-*` / `flagtil-*` (efter): annoncekort udlogget/indlogget, valideringsfejl, sendt, indbakke, tråd, slettet annonce, bloker-dialog, tom/fejl, mobil 375/430 og 1440/1920, lys og mørk.

## 11. Selvvurdering (7 dimensioner, 1–10, pr. sidefamilie)

Udfyldes endeligt efter de afsluttende kørsler — se bunden af denne fil.
