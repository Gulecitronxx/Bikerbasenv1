-- Bikerbasen migration 004a: tabel til dagstotaler.
-- Koer hele denne fil i Supabase SQL Editor. Kan koeres igen uden skade.
-- Ren ASCII med vilje, saa tegnsaet aldrig kan vaere aarsag til en fejl.

create table if not exists public.listing_stats (
  listing_id uuid not null references public.listings(id) on delete cascade,
  stat_day   date not null default current_date,
  views      int  not null default 0,
  contacts   int  not null default 0,
  primary key (listing_id, stat_day)
);

alter table public.listing_stats enable row level security;

-- Kun annoncens ejer maa se sine egne tal.
-- Der er bevidst ingen insert- eller update-politik: al skrivning gaar
-- gennem funktionen i 004b, saa en klient ikke kan saette vilkaarlige tal ind.
drop policy if exists "statistik: kun egen annonce" on public.listing_stats;

create policy "statistik: kun egen annonce" on public.listing_stats
  for select to authenticated using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

create index if not exists listing_stats_day_idx
  on public.listing_stats (listing_id, stat_day desc);
