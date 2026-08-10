# Stripe: forhandler-abonnement

Denne guide kobler betalingen til. Al kode er skrevet — du skal oprette
produktet i Stripe, deploye de to Edge Functions og sætte deres secrets.
**Kør det hele i testtilstand først** (Stripe har en "Test mode"-kontakt øverst),
så virker alt end-to-end uden en eneste rigtig krone.

Du behøver aldrig lægge Stripes hemmelige nøgle ind i hjemmesidens kode — den
bor kun som en secret på Edge Function'en.

---

## 1. Opret abonnementet i Stripe

1. Stripe Dashboard → slå **Test mode** til (kontakt øverst til højre).
2. **Products** → **+ Add product**.
   - Navn: `Forhandler`
   - Pris: vælg **Recurring**, **Monthly**, og sæt beløbet (fx 199 DKK).
3. Gem, og kopiér prisens **Price ID** (starter med `price_...`). Den skal bruges i trin 3.

---

## 2. Deploy de to Edge Functions

Filerne ligger i `supabase/functions/`. To måder:

**A) Via Supabase Dashboard** (nemmest — ingen installation)
- Supabase → **Edge Functions** → **Deploy a new function**.
- Opret `create-checkout`, indsæt `supabase/functions/create-checkout/index.ts`, deploy.
- Opret `create-portal`, indsæt `supabase/functions/create-portal/index.ts`, deploy.
- Opret `stripe-webhook`, indsæt `supabase/functions/stripe-webhook/index.ts`.
  **Slå "Verify JWT" FRA** for denne (Stripe sender ikke et login med —
  signaturen er beskyttelsen).

**B) Via CLI** (hvis du foretrækker det)
```bash
supabase functions deploy create-checkout
supabase functions deploy create-portal
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 3. Sæt secrets på funktionerne

Supabase → **Edge Functions** → **Secrets** (eller `supabase secrets set`):

| Navn | Værdi |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripes hemmelige nøgle (`sk_test_...` i test) |
| `STRIPE_PRICE_ID` | Price ID fra trin 1 (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | Sættes i trin 4 |
| `SITE_URL` | `https://bikerbasen.dk` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY` er der
automatisk — dem skal du ikke tilføje.

---

## 4. Opret webhooken i Stripe

1. Stripe → **Developers** → **Webhooks** → **+ Add endpoint**.
2. Endpoint-URL:
   `https://hkcjrwglwurdjnobewzb.supabase.co/functions/v1/stripe-webhook`
3. Vælg events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Gem, og kopiér **Signing secret** (`whsec_...`).
5. Sæt den som `STRIPE_WEBHOOK_SECRET` i Supabase-secrets (trin 3), og deploy
   `stripe-webhook` igen, så den får secreten.

---

## 4b. Aktivér kundeportalen

For at "Administrér abonnement"-knappen virker, skal Stripes kundeportal slås til:

1. Stripe → **Settings** → **Billing** → **Customer portal**.
2. Slå den til, og vælg hvad forhandleren må: **opsige abonnement**, skifte
   betalingskort, se fakturaer. Gem.

(Uden dette svarer portalen med en fejl, og knappen viser "kunne ikke åbne".)

---

## 5. Test i testtilstand

1. Log ind på bikerbasen.dk med en konto → **Mine annoncer → Konto → Bliv forhandler**.
2. Brug Stripes testkort: `4242 4242 4242 4242`, en fremtidig udløbsdato, et
   vilkårligt CVC og postnummer.
3. Efter betaling sendes du tilbage, og kortet skifter til **"Forhandler · aktivt"**
   inden for et par sekunder (webhooken sætter planen).
4. Prøv at oprette en 4. annonce som privat konto — den skal afvises med
   "bliv forhandler"-beskeden.
5. Som forhandler: tryk **Administrér abonnement** → du sendes til Stripes
   portal, hvor du kan opsige. Efter opsigelse (ved periodens udløb) sætter
   webhooken planen tilbage til privat.

---

## 6. Før rigtig lancering

- Skift Stripe til **Live mode**, opret produktet igen dér, og udskift
  secrets med live-nøglerne (`sk_live_...`, ny `price_...`, ny `whsec_...`).
- **Fjern dev-funktionen**, så ingen kan give sig selv forhandler gratis:
  ```sql
  drop function public.dev_set_plan(text);
  ```
- (Senere) tilføj en "Administrér abonnement"-knap via Stripes kundeportal, så
  forhandlere selv kan opsige. Det kræver en lille ekstra Edge Function —
  sig til, så laver jeg den.
