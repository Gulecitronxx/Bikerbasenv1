# Security Advisor: "Public Bucket Allows Listing" på storage.listing-photos

Rapporteret af ejeren 21.08.2026 fra Supabase Security Advisor. Ikke en
critic/designer-finding fra runde-loopet, derfor intet C-/D-id — men samme
krav om måling gælder.

## Hvad Advisor pegede på

`supabase/schema.sql:193-195`:

```sql
create policy "billedfil: offentlig læsning" on storage.objects
  for select using (bucket_id = 'listing-photos');
```

Ingen `to`-klausul, altså rolle `public` — både `anon` og `authenticated`.
`select`-RLS på `storage.objects` styrer ikke kun "hent én fil ved kendt
sti", den styrer også Storage-API'ets `list()`-kald, som enumererer alle
objekter i bucket'en. Politikken tillader begge dele.

## De tre spørgsmål, der skulle afklares før noget blev rettet

**1. Er bucket'en `public = true`, og bruger appen den vej?**
Ja. Efterprøvet mod produktion 17.08.2026 (`work/DECISIONS.md`,
"UPLOADVEJEN VIRKER"-noten): `select id, public from storage.buckets where
id = 'listing-photos'` gav `public = true`. Al billedvisning i koden bygger
sin URL som `/storage/v1/object/public/listing-photos/<sti>`
(`scripts/shared.js:59`, `js/supabase-api.js:376` via `getPublicUrl`).
Supabase' egen dokumentation (hentet via Context7, `supabase/docs/guides/storage/serving/downloads`
og `.../reference/kotlin/auth-exchangecodeforsession`): "Accessing public
URLs does not require specific RLS policy permissions on the buckets or
objects tables." Den flagede politik bidrager altså intet til, at
thumbnails vises — den er ikke på vejen, appen rent faktisk bruger.

**2. Indeholder stierne noget følsomt?**
Ja. Det ene rigtige uploadede foto i produktion ligger under
`<bruger-uuid>/<annonce-uuid>/<uuid>.jpg` — `uploadListingPhoto()`
(`js/supabase-api.js:352`) bygger stien sådan med vilje, af samme grund
politikken for skriveadgang kræver `(storage.foldername(name))[1] =
auth.uid()::text`. En `list()` blotlægger derfor bruger-id, annonce-id,
antal billeder og tidsstempler — også for en slettet annonce, hvis
filfjernelsen fejlede undervejs (`deleteListingPhoto`/`deleteListing`
logger og fortsætter ved fejl i stedet for at blokere, `js/supabase-api.js:297`).

**3. Er `list()` overhovedet reachable i praksis i dag?**
Kun via et selvbygget Storage-API-kald med anon-nøglen. Grep over `js/`,
`crawler/` og `scripts/` for `.list(` på denne bucket, `/object/authenticated/`
og `/object/sign/`: nul træf. Appen selv udstiller ikke enumerering — men
anon-nøglen ligger i klartekst i `js/supabase-config.js`, så "appen kalder
det ikke" er ikke det samme som "det kan ikke kaldes".

## Konklusion

Reelt hul, men lav skade lige nu: `listings` og `listing_photos` har 0
rækker i produktion (samme 17.08-måling), så det eneste, der kan
enumereres i dag, er ét forældreløst foto fra en allerede slettet bruger.
Det ændrer ikke på, at politikken skal lukkes — bucket'ens `public`-flag
dækker allerede hele læsebehovet, så select-politikken har ingen funktion
tilbage andet end at tillade enumerering, den ikke er bedt om.

**Rettelse:** [`supabase/019_luk_billedliste.sql`](../../supabase/019_luk_billedliste.sql)
fjerner select-politikken helt, uden erstatning — ingen kode i huset
bruger `/object/authenticated/`, så der er intet at bevare en indskrænket
version af. Samme princip som 018: en rettighed skal bedes om eksplicit,
ikke stå tilbage fordi den "plejer at være der".

## Genbekræftet direkte mod produktion, 21.08.2026

En Supabase MCP-forbindelse blev tilgængelig senere i samme session
(projekt `hkcjrwglwurdjnobewzb`, "Bikerbasenv1"). Alle tre punkter ovenfor
er genmålt direkte, ikke kun genbrugt fra 17.08-noten:

```
select id, public, file_size_limit, allowed_mime_types from storage.buckets
  where id = 'listing-photos';
-> public=true, file_size_limit=null, allowed_mime_types=null

select policyname, cmd, roles, qual from pg_policies
  where schemaname='storage' and tablename='objects' and policyname like 'billedfil%';
-> "billedfil: offentlig læsning"  SELECT  {public}         bucket_id = 'listing-photos'
   "billedfil: ret egen mappe"     UPDATE  {authenticated}  ... foldername = auth.uid()
   "billedfil: slet egen mappe"    DELETE  {authenticated}  ... foldername = auth.uid()
   "billedfil: upload til egen mappe" INSERT {authenticated} (ingen using-klausul)

select count(*) from public.listings, public.listing_photos,
  storage.objects where bucket_id='listing-photos';
-> listings=0, listing_photos=0, objects=1
```

Alt stemmer med 17.08-målingen. `get_advisors` (type `security`) blev også
kørt: den lister IKKE dette fund. Dens output er Postgres' database-linter
(RLS-enabled-no-policy på to tabeller, en SECURITY DEFINER-view,
`pg_net` i public, fire SECURITY DEFINER-funktioner kaldbare af
anon/authenticated, samt leaked-password-protection slået fra) — "Public
Bucket Allows Listing" er tilsyneladende en Storage-specifik advarsel i
dashboardet, ikke en del af denne linters flade. Det betyder, at
`get_advisors` ikke kan bruges til at bekræfte, at fundet forsvinder efter
rettelsen — det skal tjekkes i dashboardets Storage-sektion.

## Status: migrationen er IKKE kørt

Ejeren valgte eksplicit "kun verificér" for denne omgang — læsningerne
ovenfor er kørt, men `apply_migration` er bevidst ikke kaldt. At skrive
til det live projekt uden den bekræftelse ville også bryde denne sessions
egne sikkerhedsregler om hard-to-reverse ændringer på delt infrastruktur.

Før migrationen køres: ejeren skal enten
1. bede om at få den anvendt (samme session kan nu nå projektet), eller
2. køre `supabase/019_luk_billedliste.sql` selv i SQL Editor,

og i begge tilfælde bekræfte de tre punkter i filens
efterprøvningsafsnit — inklusive et manuelt tjek af Storage-advarslen i
dashboardet, siden `get_advisors` ikke dækker den.
