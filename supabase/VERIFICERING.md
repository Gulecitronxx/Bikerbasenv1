# Verificering og e-mail — hvad der mangler, og hvad du skal gøre

Status: **ingen profiler på Bikerbasen er identitetsverificerede.** Badgen er
slået fra i `js/components.js` (`verifiedBadgeHTML` returnerer tom streng), og
de tre "bekræft"-knapper i opret-flowet er fjernet, fordi ingen af dem gjorde
noget. Det er en bevidst tilstand, ikke en mangel der er glemt.

Rækkefølgen herunder er efter, hvor meget de spærrer for drift.

---

## 1. E-mailbekræftelse — spærrer for drift

Supabases indbyggede mailtjeneste sender **2 mails i timen** og er udtrykkeligt
ikke beregnet til drift. Den tredje person, der opretter profil inden for en
time, får aldrig sin bekræftelsesmail — og ser ingen fejl, for grænsen rammer
serveren, ikke dem. Egen SMTP er derfor en forudsætning for at gå i luften.

**Resend** (gratis op til 3.000 mails/md, hurtigst at komme i gang med):

1. Opret konto på resend.com, og tilføj domænet `bikerbasen.dk`
2. Læg de DNS-records ind, Resend viser (typisk 3: MX/TXT til `send.` og en
   DKIM-record). Vent på grønt flueben — kan tage op til en time
3. Lav en API-nøgle med adgangen *Sending access*
4. Supabase Dashboard → **Project Settings → Authentication → SMTP Settings**:

   | Felt | Værdi |
   |---|---|
   | Enable Custom SMTP | til |
   | Sender email | `noreply@bikerbasen.dk` |
   | Sender name | `Bikerbasen` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | din API-nøgle |

5. Samme side, længere nede: hæv **Rate limit for sending emails** fra 2 til
   fx 100 i timen. Den følger ikke automatisk med, når du skifter SMTP
6. Test: opret en profil med en adresse du kan tjekke, og se at mailen kommer

**Bekræftelseslinket peger på projektets Site URL** (Authentication → URL
Configuration). Det skal være `https://bikerbasen.dk` i drift. Vil du kunne
teste lokalt, så tilføj `http://localhost:*` under *Redirect URLs* — men lad
Site URL blive på produktionsdomænet.

---

## 2. CVR-verificering — kan virke i morgen

Edge Function `verify-profile` er skrevet og klar. Den slår CVR-nummeret op,
kontrollerer at virksomheden findes, ikke er ophørt, og at navnet ligner det
oplyste — og sætter først derefter `cvr_verified` med service_role.

Den mangler kun en nøgle:

1. Skaf adgang til CVR-registret. To veje:
   - **cvrapi.dk** — betalt token, virker med det samme. Det gratis endpoint
     er rate-limitet pr. IP og svarer `QUOTA_EXCEEDED` (afprøvet)
   - **Erhvervsstyrelsens Datafordeler** — gratis, men kræver en systembruger
     der godkendes manuelt. Tager et par dage
2. `supabase secrets set CVR_API_TOKEN=...`
3. `supabase functions deploy verify-profile`
4. Kobl knappen på i UI'et: kald funktionen med `{ kind: 'cvr' }` og
   brugerens JWT i Authorization-headeren

Bruger du Datafordeleren i stedet for cvrapi.dk, er det kun `slaaCvrOp()` i
funktionen der skal skrives om — resten er uafhængigt af udbyderen.

---

## 3. SMS-verificering — kræver en konto med betalingskort

Danske udbydere: **GatewayAPI** eller **inMobile** (~0,15 kr/SMS). Twilio
virker også, men er dyrere for danske numre.

Der skal bygges to trin, som ikke findes endnu: send en kode (gem den hashet
med et udløbstidspunkt), og bekræft koden. Begge hører hjemme i
`verify-profile` ved siden af CVR-grenen, så flaget bliver ét sted.

Husk en grænse pr. nummer pr. time — ellers kan nogen sende regningen i vejret
for dig.

---

## 4. MitID — uger, ikke dage

MitID kan ikke købes direkte. Der skal en godkendt broker til:
**Criipto** (hurtigst for små udbydere), **Signaturgruppen** eller **Nets**.
Det kræver kontrakt, firmaverifikation og penge, og der er en
godkendelsesproces.

Indtil det er på plads, er den ærlige tekst i opret-flowet den rigtige:
identitetskontrol findes ikke, og køberen skal vurdere sælgeren selv.

---

## Princippet, der ikke må brydes

Flagene `mitid_verified`, `cvr_verified` og `email_verified` kan **kun**
sættes af en betroet serverproces. Migration `005_beskyt_verificering.sql`
fratager både `anon` og `authenticated` retten til at skrive dem — også på
deres egen række. Det er afprøvet mod den kørende database: forsøget svarer
`permission denied for table profiles`.

Bliver en verificering nogensinde flyttet ud i browseren, kan enhver give sig
selv et mærke, og hele tillidssystemet er værdiløst. Sæt aldrig et flag et
andet sted end i `verify-profile`.

---

## 5. Søgeagenter — bygget, mangler to secrets

Søgeagenten var tom hele vejen ned: knappen skrev kun til localStorage,
tabellen `saved_searches` blev aldrig skrevet til, metoderne i
`js/supabase-api.js` blev aldrig kaldt, og intet job sendte mail. Teksten
"Vil du have besked, når der kommer en?" var et løfte uden dækning.

Nu skriver knappen til databasen, en trigger fyrer når en annonce bliver
aktiv, og Edge Function'en `notify-saved-searches` sender via Resend.

Sådan tænder du den:

1. Vælg en lang tilfældig streng som delt hemmelighed
2. Åbn `supabase/013_soegeagenter.sql`, erstat `<<HEMMELIGHED>>` med den, og
   `<<PROJEKT_URL>>` med `https://hkcjrwglwurdjnobewzb.supabase.co`
3. Kør filen i SQL-editoren
4. Sæt de tre secrets:
   ```
   supabase secrets set NOTIFY_SECRET=<samme streng>
   supabase secrets set RESEND_API_KEY=<nøglen fra Resend>
   supabase secrets set SITE_URL=https://bikerbasen.dk
   ```
5. `supabase functions deploy notify-saved-searches`
6. Test: gem en søgeagent, udgiv en annonce der matcher, og se mailen komme

Uden `NOTIFY_SECRET` afviser funktionen alle kald (401), og uden
`RESEND_API_KEY` svarer den 503 uden at sende. Ingen af delene lader som om.

**Afmelding:** hver søgeagent har sit eget `unsubscribe_token`, og
`afmeld.html` slår præcis den ene fra uden login. Et lækket link kan altså
ikke bruges til andet. Det er et krav ved den slags mails, ikke en detalje.

**Dobbeltmails:** tabellen `search_notifications` husker hvem der har fået
hvilken annonce, så en genudgivelse eller et gentaget kald ikke sender igen.
