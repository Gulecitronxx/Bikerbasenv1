# Krav på eksterne annoncer: manuel godkendelse

Dette er runbooken for den ene knap, der IKKE findes i UI'et endnu: at
godkende eller afvise et krav, en forhandler har indsendt fra sit dashboard
på en annonce, der er indekseret fra en anden side (`public.eksterne_annoncer`,
se `supabase/014_aggregator.sql`).

**Hvorfor manuelt, og ikke en admin-side?** Et krav er "jeg ejer denne
annonce hos MC Syd/Gul og Gratis/Jensens/Rydbergs" — et ejerskabsudsagn, ikke
en oplysning brugeren selv kan verificere. Et automatisk "godkend dig selv"-
flow ville lade enhver logget ind bruger overtage en hvilken som helst
forhandlers annoncer og rette priser, titler og status på dem
(`ret_ekstern_annonce()`), kun ved at udfylde en tekstboks. Det er per
definition et tillidsafgørende skridt, og der er endnu intet grundlag
(CVR-opslag, domæneverificering) til at gøre det sikkert automatisk — se
`docs/discovery.md` afsnit 4, hul 5 og `docs/naeste-prompts.md` Prompt 8,
punkt 3. Indtil videre er den mest ærlige løsning: byg det, en forhandler kan
gøre selv (indsende et krav, se dets status), og lad ejeren af Bikerbasen
tjekke det manuelt, samme princip som "vi gætter aldrig".

---

## Se afventende krav

I Supabase SQL Editor:

```sql
select k.id as krav_id, k.oprettet, k.dokumentation,
       p.name as bruger_navn, p.email as bruger_email, p.company, p.cvr,
       e.titel, e.maerke, e.model, e.by, e.pris_dkk, e.url,
       kl.navn as kilde
from public.krav k
join public.profiles p on p.id = k.bruger_id
join public.eksterne_annoncer e on e.id = k.annonce_id
join public.kilder kl on kl.id = e.kilde_id
where k.status = 'afventer'
order by k.oprettet asc;
```

Tjek at `bruger_navn`/`company` rimeligvis matcher `kilde` og annoncens
`by`/indhold — det er hele kontrollen. Er der tvivl, kontakt brugeren på
`bruger_email`, før du godkender.

## Godkend et krav

Sætter `krav.status = 'godkendt'` OG `eksterne_annoncer.ejet_af` til
brugeren i samme transaktion — de to skal altid følges ad, ellers ejer
brugeren en annonce uden et godkendt krav (eller omvendt).

```sql
begin;
  update public.krav
    set status = 'godkendt', behandlet = now()
    where id = '<krav_id>';

  update public.eksterne_annoncer
    set ejet_af = (select bruger_id from public.krav where id = '<krav_id>')
    where id = (select annonce_id from public.krav where id = '<krav_id>');
commit;
```

## Afvis et krav

```sql
update public.krav
  set status = 'afvist', behandlet = now()
  where id = '<krav_id>';
```

Forhandleren ser statusskiftet i sit dashboard (`db.myKrav()` i
`js/supabase-api.js`) uden yderligere handling.

---

## Når volumen retfærdiggør det

Kommer der jævnligt krav ind, er næste skridt en rigtig admin-side eller en
Edge Function med de samme to opdateringer bag et adminlogin — ikke en
opgave for denne runde, men de to statements ovenfor er præcis det, den
funktion skal udføre.
