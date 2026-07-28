-- ============================================================
-- Bikerbasen — migration 002
-- Flytter favoritter, anmeldelser, søgeagenter og indberetninger
-- fra browserens localStorage til databasen.
--
-- Kør i Supabase Dashboard → SQL Editor. Kan køres oven på schema.sql;
-- den rører ikke eksisterende tabeller.
-- ============================================================

-- ---------- Favoritter ----------
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists favorites_user_idx on public.favorites(user_id, created_at desc);

-- ---------- Anmeldelser (bedømmelser af sælgere) ----------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  seller_id  uuid not null references public.profiles(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  rating     numeric(2,1) not null check (rating >= 1 and rating <= 5),
  comment    text not null default '',
  created_at timestamptz not null default now(),

  -- Man kan ikke bedømme sig selv, og kun én gang pr. sælger.
  constraint no_self_review unique (seller_id, author_id),
  constraint not_own_profile check (seller_id <> author_id)
);
create index if not exists reviews_seller_idx on public.reviews(seller_id, created_at desc);

-- ---------- Søgeagenter ----------
create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  query      text not null,
  label      text not null default '',
  notify     boolean not null default true,
  created_at timestamptz not null default now(),
  constraint one_query_per_user unique (user_id, query)
);
create index if not exists saved_searches_user_idx on public.saved_searches(user_id, created_at desc);

-- ---------- Indberetninger (DSA notice-and-action) ----------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid references public.profiles(id) on delete set null, -- må være null: anonyme skal kunne anmelde
  target_type  text not null check (target_type in ('listing','profile')),
  target_id    text not null,
  reason       text not null check (reason in ('svindel','stjaalet','falsk','upassende','andet')),
  comment      text not null default '',
  status       text not null default 'afventer' check (status in ('afventer','behandlet','afvist')),
  created_at   timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.favorites      enable row level security;
alter table public.reviews        enable row level security;
alter table public.saved_searches enable row level security;
alter table public.reports        enable row level security;

-- ---------- Favoritter: strengt private ----------
drop policy if exists "favorit: kun egne" on public.favorites;
create policy "favorit: kun egne" on public.favorites
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Anmeldelser: alle må læse, kun forfatteren må skrive/ændre ----------
drop policy if exists "anmeldelse: offentlig læsning" on public.reviews;
create policy "anmeldelse: offentlig læsning" on public.reviews
  for select using (true);

drop policy if exists "anmeldelse: skriv som sig selv" on public.reviews;
create policy "anmeldelse: skriv som sig selv" on public.reviews
  for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "anmeldelse: ret egen" on public.reviews;
create policy "anmeldelse: ret egen" on public.reviews
  for update to authenticated
  using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "anmeldelse: slet egen" on public.reviews;
create policy "anmeldelse: slet egen" on public.reviews
  for delete to authenticated using (auth.uid() = author_id);

-- ---------- Søgeagenter: strengt private ----------
drop policy if exists "søgeagent: kun egne" on public.saved_searches;
create policy "søgeagent: kun egne" on public.saved_searches
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Indberetninger ----------
-- Alle (også ikke-loggede) skal kunne anmelde ulovligt indhold — det er et
-- udtrykkeligt krav i DSA. Til gengæld må ingen læse andres anmeldelser.
drop policy if exists "indberetning: alle må oprette" on public.reports;
create policy "indberetning: alle må oprette" on public.reports
  for insert with check (
    reporter_id is null or auth.uid() = reporter_id
  );

drop policy if exists "indberetning: læs egne" on public.reports;
create policy "indberetning: læs egne" on public.reports
  for select to authenticated using (auth.uid() = reporter_id);

-- ---------- Offentligt sælger-gennemsnit ----------
-- Beregnes i databasen, så en klient ikke kan lyve om sin egen score.
create or replace view public.seller_ratings
with (security_invoker = off) as
  select seller_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as review_count
  from public.reviews
  group by seller_id;

grant select on public.seller_ratings to anon, authenticated;
