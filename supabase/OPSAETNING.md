# Opsætning af databasen (Supabase)

Sådan kobler du Bikerbasen på en rigtig database med login og billed-upload.
Tager ca. 15 minutter.

Indtil du har gjort det, kører siden videre på demodata i browseren — den går
altså ikke i stykker af at vente.

---

## 1. Opret projektet

1. Gå til [supabase.com](https://supabase.com) og opret en konto.
2. Klik **New project**.
3. **Vælg region: `Central EU (Frankfurt)`** — dine brugeres data bliver
   dermed i EU, hvilket er det, privatlivspolitikken på siden lover.
4. Vælg et databasekodeord og gem det et sikkert sted (fx en password manager).
   Du får ikke brug for det i koden, kun hvis du skal forbinde direkte til databasen.

---

## 2. Kør skemaet

1. I Supabase: **SQL Editor** → **New query**.
2. Åbn `supabase/schema.sql` her i projektet, kopiér **hele** filen ind, og kør den.
3. Du skulle gerne se "Success".

Det opretter tabellerne `profiles`, `listings` og `listing_photos`, en
storage-bucket til billeder, og — vigtigst — **Row Level Security-politikkerne**.

> **Spring ikke dette over.** Uden RLS ville enhver med adgang til den offentlige
> nøgle kunne læse og ændre alt i databasen. Politikkerne er det, der gør nøglen
> ufarlig at have liggende i frontend-koden.

### Migrationer

Kør derefter migrationsfilerne i nummerorden i samme SQL-editor. De kan køres
oven på et eksisterende skema uden at røre data, du allerede har:

| Fil | Hvad den tilføjer |
| --- | --- |
| `002_favorites_reviews.sql` | Favoritter, anmeldelser, søgeagenter og indberetninger i databasen |
| `003_udstyr.sql` | Udstyr, brændstof, træktype, cylindre og farve på annoncerne — det søgefiltrene på søgesiden filtrerer på |
| `004a_tabel.sql` | Tabel til dagstotaler pr. annonce, med RLS så kun ejeren ser sine tal |
| `004b_visninger.sql` | Funktion der tæller en visning eller en kontaktafsløring |
| `004c_gemte.sql` | Funktion der tæller hvor mange der har gemt hver af dine annoncer |
| `005_beskyt_verificering.sql` | Låser `mitid_verified`/`cvr_verified`/`email_verified`, så ingen kan give sig selv et falsk "Verificeret"-badge |
| `012_email_verified_synk.sql` | Saetter `email_verified` naar brugeren rent faktisk klikker i bekraeftelsesmailen — uden den stod kolonnen `false` for evigt |
| `013_soegeagenter.sql` | Soegeagenter der faktisk sender mail: trigger paa nye annoncer, afmeldingstoken og log mod dobbeltmails |
| `005_tjek.sql` | Kun læsning — viser at flagene er låst for almindelige brugere |
| `006_forhandler_abonnement.sql` | Abonnement-felter (låst), server-håndhævet gratis-grænse på 3 aktive annoncer, og en **dev-funktion** til at teste forhandler-status uden betaling |
| `007_fri_adgang.sql` | Slår annoncegrænsen **fra** — gratis, ubegrænset adgang for alle, mens betalingsmodellen ikke er valgt. Modstykke til `FRI_ADGANG` i `js/data.js`. Genskabes ved at køre `006` igen |

> **`006` indeholder en midlertidig testfunktion** `dev_set_plan`, så forhandler-status kan afprøves før Stripe er koblet på. **Fjern den før lancering** med:
> `drop function public.dev_set_plan(text);`

**Kør 004 som tre separate filer, én ad gangen.** SQL-editoren kører et ark
som én transaktion, så ét fejlende udtryk ruller resten tilbage — og skjuler
hvor det gik galt. Delt op ser du med det samme hvilken del der fejler, og de
tidligere dele består. Alle filer kan køres igen uden skade.

Filerne er skrevet i ren ASCII. Danske tegn og tankestreger i SQL har været
kilde til svære fejl her, og der er intet vundet ved dem.

Bagefter kan `004_tjek.sql` køres — den er kun læsning og rapporterer hvad der
faktisk findes i databasen.

Annoncer oprettet før `003` har tomt udstyr og dukker derfor ikke op, når nogen
filtrerer på f.eks. ABS. De kan redigeres og få felterne udfyldt bagefter.

---

## 3. Sæt nøglerne ind

1. I Supabase: **Project Settings** → **API**.
2. Kopiér **Project URL** og **anon public**-nøglen.
3. Åbn `js/supabase-config.js` og udfyld:

```js
const SUPABASE_CONFIG = {
  url: 'https://ditprojekt.supabase.co',
  anonKey: 'eyJhbG...',
};
```

### Om nøglerne

| Nøgle | Må ligge i frontend? | Hvorfor |
|---|---|---|
| `anon public` | **Ja** | Designet til det. RLS bestemmer hvad den må. |
| `service_role` | **Nej, aldrig** | Omgår al RLS. Giver fuld adgang til alt. Kun til servere. |

Hvis `service_role`-nøglen nogensinde havner i et git-repo, skal den roteres
med det samme under **Project Settings → API → Reset**.

---

## 4. Slå e-mailbekræftelse til

**Authentication** → **Providers** → **Email**: sørg for at
*Confirm email* er slået til. Ellers kan man oprette konti på andres e-mails.

---

## 5. Tjek at det virker

Åbn siden og kør i browserkonsollen:

```js
db.enabled          // skal nu være true
await db.currentUser()   // null indtil du logger ind
```

---

## Hvad der er bygget — og hvad der mangler

**Klar til brug:**
- `profiles`, `listings`, `listing_photos` med fulde RLS-politikker
- Storage-bucket med mappebaseret adgangskontrol (`<bruger-id>/<annonce-id>/fil.jpg`)
- Automatisk oprettelse af profil ved signup
- VIN-format valideres i databasen, ikke kun i browseren
- Billeder får **EXIF/GPS fjernet** før upload (`stripExifAndResize`) — ellers
  ville sælgeres hjemmeadresse kunne aflæses af koordinaterne i fotoet
- Filtype- og størrelsesvalidering før upload

**Næste skridt (ikke bygget endnu):**
- Favoritter, anmeldelser, søgeagenter og svindelanmeldelser ligger stadig i
  localStorage — de skal have hver sin tabel efter samme mønster
- Selve UI'et bruger stadig demodata; `js/supabase-api.js` er datalaget, men
  `search.js`, `annonce.js` og `opret-annonce.js` skal skiftes til at kalde det
- MitID kræver en godkendt broker (fx Criipto eller Signaturgruppen) — det kan
  Supabase ikke levere, og det er stadig en simulering i UI'et
- Betaling kræver en PCI-certificeret udbyder; gem aldrig kortdata selv

---

## Sikkerhedsprincippet bag det hele

Klienten sender aldrig "hvem er jeg" — det afgør databasen selv ud fra
login-token'et via `auth.uid()`. Derfor kan man ikke redigere en fremmed
annonce ved at ændre et id i browseren:

```sql
create policy "annonce: opdater egen" on public.listings
  for update to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);
```

Det er den beskyttelse mod IDOR, sikkerhedskravene bad om — og den kan ikke
omgås fra frontend, uanset hvad brugeren gør i browserens udviklerværktøjer.
