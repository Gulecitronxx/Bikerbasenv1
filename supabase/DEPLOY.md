# Deploy af backenden (migrationer + Edge Functions)

> **STATUS 23.08.2026: DEPLOYET.** Migrationerne 006, 007, 020, 021 og 022 er
> koert mod produktionen via Supabase MCP (019 sprunget over: den genskaber kun
> `dev_set_plan`, som 020 dropper — 006 blev koert UDEN dev_set_plan, saa
> betalingsomgaaelsen har aldrig eksisteret i produktionen). Alle syv Edge
> Functions er deployet (indberet/haendelse/stripe-webhook/notify uden JWT som
> planlagt, resten med). `node scripts/tjek-backend.js`: **22/22 OK**.
> `enforce_listing_limit()` er desuden lukket for RPC-kald fra klientroller
> (advisor 0028). MANGLER stadig (kraever konti/noegler — kun mennesket):
> Stripe-secrets (STRIPE_SECRET_KEY/PRICE_ID/WEBHOOK_SECRET + webhook-URL i
> Stripe), RESEND_API_KEY + NOTIFY_SECRET (mails), CVR_API_TOKEN (valgfri),
> TAELLER_SALT (anbefalet), SITE_URL. Saet dem som i afsnit 3 nedenfor —
> funktionerne svarer aerligt 4xx/503, indtil de er sat.

Én kommando deployer det, der mangler i produktionen, og efterprøver det
bagefter. Skrevet efter audit 23.08.2026, hvor alle fem Edge Functions svarede
404 og `profiles.plan` ikke fandtes — koden og produktionen var to systemer.

```
node scripts/tjek-backend.js        # hvad mangler? (kun læsning, ingen nøgler)
node scripts/backend-deploy.js      # deploy det, der mangler (kræver token)
```

## 1. Det, du skal have klar (én gang)

| Hvad | Hvor | Bruges til |
| --- | --- | --- |
| **Access token** `sbp_…` | supabase.com → Account → Access Tokens | Management API (SQL) og CLI (funktioner). Læg den i miljøet som `SUPABASE_ACCESS_TOKEN` — aldrig i en fil i repoet. |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard (testtilstand først) | `create-checkout`, `create-portal`, `stripe-webhook`. Trin 1 og 4 i `STRIPE_OPSAETNING.md`. |
| `RESEND_API_KEY` | resend.com | `notify-saved-searches` sender mails. |
| `NOTIFY_SECRET` | en lang tilfældig streng, du selv laver | Delt hemmelighed mellem databasens trigger (013) og `notify-saved-searches`. |
| `SITE_URL` | `https://bikerbasen.dk` | Tilbage-links i mails og Stripe-flows. |
| `CVR_API_TOKEN` (valgfri) | se `VERIFICERING.md` | `verify-profile` — uden den springes CVR-opslaget over. |
| `TAELLER_SALT` (valgfri) | en tilfældig streng | `indberet`/`haendelse` salter IP-hashen med den (standard i koden, hvis den mangler). Skift den, og alle tællere starter forfra næste dag. |

## 2. Kør deployet

PowerShell:

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
$env:NOTIFY_SECRET = "<samme streng som du sætter som secret nedenfor>"
node scripts/backend-deploy.js --dry-run    # se planen først
node scripts/backend-deploy.js
```

Scriptet:

1. slår projektet op (token virker?),
2. læser tilstanden direkte i databasen (`profiles.plan`? `enforce_listing_limit`? `dev_set_plan`? pladsholdere i 013?),
3. kører **kun** de migrationer, tilstanden beviser mangler, i rækkefølgen
   `006 → 007 → 019 → 020 → 021 → 022` (i dag: alle seks; 021 er kolonnegulvet
   på `kilder`, 022 er det anonyme skrivegulv — taeller + lukkede direkte veje,
   se filernes hoveder),
4. udfylder `<<PROJEKT_URL>>`/`<<HEMMELIGHED>>` i 013's trigger, hvis `NOTIFY_SECRET` er sat,
5. deployer de syv funktioner via `npx supabase@2 functions deploy` —
   `stripe-webhook`, `notify-saved-searches`, `indberet` og `haendelse` **uden
   JWT-tjek** (de kaldes af Stripe, pg_net hhv. udloggede browsere; graensen i
   de to sidste er IP-baseret inde i funktionen; `config.toml` siger det samme),
6. lister hvilke secrets der mangler (kun navne),
7. kører `scripts/tjek-backend.js` og afslutter med fejlkode, hvis noget stadig mangler.

Flag: `--dry-run` (skriv intet), `--kun-sql`, `--kun-funktioner`.

## 3. Sæt secrets på funktionerne

```powershell
npx supabase@2 secrets set --project-ref hkcjrwglwurdjnobewzb `
  STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_ID=price_... STRIPE_WEBHOOK_SECRET=whsec_... `
  RESEND_API_KEY=re_... NOTIFY_SECRET=<samme som ovenfor> SITE_URL=https://bikerbasen.dk
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY` er der automatisk.

Webhooken i Stripe skal pege på
`https://hkcjrwglwurdjnobewzb.supabase.co/functions/v1/stripe-webhook`
(trin 4 i `STRIPE_OPSAETNING.md`) — ellers bliver ingen nogensinde forhandler ved betaling.

## 4. Efterprøv

```
node scripts/tjek-backend.js
```

Alle 22 linjer skal stå `OK`: kolonnerne fra 006 findes, `dev_set_plan` findes
ikke, `kilder.crawl_delay_ms` er lukket for anon (021) mens navn/domæne stadig
kan læses, de direkte anonyme skriveveje er lukket (022) mens `indberet` og
`haendelse` svarer, og ingen funktion svarer 404. En funktion, der svarer 401 uden login, er
**deployet og beskyttet** — det er rigtigt.

## Hvorfor ikke `supabase db push`?

Migrationerne ligger som nummererede filer direkte i `supabase/` og er kørt i
hånden i dashboardet i en rækkefølge, CLI'ens `schema_migrations`-tabel ikke
kender. `db push` ville forsøge at køre dem alle forfra. Scriptet læser i
stedet, hvad der faktisk findes, og kører resten. Vil I over på CLI'ens
migrationsmappe senere, så gør det *efter* dette deploy, med `supabase migration
repair` for at markere 002–020 som kørt.
