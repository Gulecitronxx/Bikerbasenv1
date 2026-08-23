# Deploy af backenden (migrationer + Edge Functions)

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
   `006 → 007 → 019 → 020` (i dag: alle fire),
4. udfylder `<<PROJEKT_URL>>`/`<<HEMMELIGHED>>` i 013's trigger, hvis `NOTIFY_SECRET` er sat,
5. deployer de fem funktioner via `npx supabase@2 functions deploy` —
   `stripe-webhook` og `notify-saved-searches` **uden JWT-tjek** (de kaldes af
   Stripe hhv. pg_net, ikke af en bruger; `config.toml` siger det samme),
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

Alle 16 linjer skal stå `OK`: kolonnerne fra 006 findes, `dev_set_plan` findes
ikke, og ingen funktion svarer 404. En funktion, der svarer 401 uden login, er
**deployet og beskyttet** — det er rigtigt.

## Hvorfor ikke `supabase db push`?

Migrationerne ligger som nummererede filer direkte i `supabase/` og er kørt i
hånden i dashboardet i en rækkefølge, CLI'ens `schema_migrations`-tabel ikke
kender. `db push` ville forsøge at køre dem alle forfra. Scriptet læser i
stedet, hvad der faktisk findes, og kører resten. Vil I over på CLI'ens
migrationsmappe senere, så gør det *efter* dette deploy, med `supabase migration
repair` for at markere 002–020 som kørt.
