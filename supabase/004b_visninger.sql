-- Bikerbasen migration 004b: registrer en visning eller en kontakt.
-- Koer 004a foerst. Hele denne fil koeres som den er.
--
-- security definer, saa ogsaa anonyme besoegende kan taelle med.
-- Funktionen accepterer kun de to kendte haendelsestyper.

create or replace function public.record_listing_event(p_listing uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_kind not in ('view', 'contact') then
    raise exception 'Ukendt haendelsestype: %', p_kind;
  end if;

  -- Kun aktive annoncer, og aldrig saelgerens egne besoeg paa sin annonce.
  if not exists (
    select 1 from public.listings
    where id = p_listing
      and status = 'active'
      and (auth.uid() is null or seller_id <> auth.uid())
  ) then
    return;
  end if;

  -- Maaltabellen faar aliaset s, saa ON CONFLICT DO UPDATE kan referere
  -- den utvetydigt. Et skemakvalificeret navn er ikke tilladt her.
  insert into public.listing_stats as s (listing_id, stat_day, views, contacts)
  values (
    p_listing,
    current_date,
    case when p_kind = 'view' then 1 else 0 end,
    case when p_kind = 'contact' then 1 else 0 end
  )
  on conflict (listing_id, stat_day) do update set
    views = s.views + excluded.views,
    contacts = s.contacts + excluded.contacts;
end;
$fn$;

grant execute on function public.record_listing_event(uuid, text) to anon, authenticated;
