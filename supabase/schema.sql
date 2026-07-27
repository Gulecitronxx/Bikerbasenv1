-- ============================================================
-- Bikerbasen — databaseskema (Supabase / Postgres)
-- Kør denne fil i Supabase Dashboard → SQL Editor → New query.
--
-- Sikkerhedsmodellen bygger på Row Level Security (RLS). RLS håndhæves
-- i databasen, ikke i browseren — så selvom nogen manipulerer frontend-koden
-- eller kalder API'et direkte, kan de ikke redigere andres annoncer.
-- Det er beskyttelsen mod IDOR, som sikkerhedskravene bad om.
-- ============================================================

-- ---------- 1. Profiler ----------
-- Udvider Supabases indbyggede auth.users med vores egne felter.
-- Kodeord ligger i auth.users og hashes af Supabase (bcrypt) — aldrig her.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null default '',
  phone           text,
  city            text,
  is_dealer       boolean not null default false,
  company         text,
  cvr             text,
  email_verified  boolean not null default false,
  phone_verified  boolean not null default false,
  mitid_verified  boolean not null default false,
  cvr_verified    boolean not null default false,
  member_since    int not null default extract(year from now()),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Erhvervskonti skal have CVR udfyldt for at kunne blive verificeret (DSA-krav).
  constraint dealer_needs_cvr check (not cvr_verified or cvr is not null)
);

-- Afledt: "verificeret" badge. Forhandlere kræver både MitID og CVR.
create or replace function public.is_verified(p public.profiles)
returns boolean language sql immutable as $$
  select case when p.is_dealer then p.mitid_verified and p.cvr_verified
              else p.mitid_verified end;
$$;

-- ---------- 2. Annoncer ----------
create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  brand         text not null,
  model         text not null,
  type          text not null check (type in
                  ('sport','touring','cruiser','naked','adventure','scooter','classic','cross')),
  year          int  not null check (year between 1900 and extract(year from now()) + 1),
  km            int  not null check (km >= 0),
  ccm           int  not null check (ccm > 0),
  power         int  check (power >= 0),
  price         int  not null check (price >= 0),
  condition     text not null,
  vin           text check (vin is null or vin ~* '^[A-HJ-NPR-Z0-9]{11,17}$'),
  registration  text,
  afgift        text,
  postnr        text,
  city          text,
  region        text,
  description   text not null default '',
  status        text not null default 'active' check (status in ('active','sold','hidden')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists listings_seller_idx  on public.listings(seller_id);
create index if not exists listings_active_idx  on public.listings(status, created_at desc);
create index if not exists listings_facets_idx  on public.listings(brand, type, price, year);

-- ---------- 3. Billeder ----------
-- Selve filerne ligger i Storage-bucket'en 'listing-photos';
-- her gemmer vi kun stien + rækkefølgen.
create table if not exists public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  position     int  not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists listing_photos_listing_idx on public.listing_photos(listing_id, position);

-- ---------- 4. updated_at holdes opdateret automatisk ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_listings_touch on public.listings;
create trigger trg_listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- 5. Opret profil automatisk ved signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, phone, is_dealer, company, cvr, email_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'is_dealer')::boolean, false),
    new.raw_user_meta_data->>'company',
    new.raw_user_meta_data->>'cvr',
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_photos enable row level security;

-- ---------- Profiler ----------
-- Rå profiltabel er privat: kun din egen række. Telefonnummer m.m. lækker
-- dermed ikke til alle. Offentlige felter eksponeres via view'et nedenfor.
drop policy if exists "profil: læs egen" on public.profiles;
create policy "profil: læs egen" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profil: opdater egen" on public.profiles;
create policy "profil: opdater egen" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Offentligt view med kun de felter, en køber må se.
-- security_invoker = off gør at view'et kan læse profiles uden at arve RLS,
-- men vi eksponerer bevidst ingen kontaktoplysninger her.
create or replace view public.public_profiles
with (security_invoker = off) as
  select id, name, city, is_dealer, company, member_since,
         public.is_verified(profiles.*) as verified
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ---------- Annoncer ----------
-- Alle må se aktive annoncer; ejeren kan altid se sine egne (også skjulte/solgte).
drop policy if exists "annonce: offentlig læsning" on public.listings;
create policy "annonce: offentlig læsning" on public.listings
  for select using (status = 'active' or auth.uid() = seller_id);

-- Man kan kun oprette annoncer i sit eget navn.
drop policy if exists "annonce: opret egen" on public.listings;
create policy "annonce: opret egen" on public.listings
  for insert to authenticated with check (auth.uid() = seller_id);

-- Kernen i IDOR-beskyttelsen: uanset hvilket id klienten sender,
-- kan databasen kun ændre/slette rækker der tilhører den loggede bruger.
drop policy if exists "annonce: opdater egen" on public.listings;
create policy "annonce: opdater egen" on public.listings
  for update to authenticated using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists "annonce: slet egen" on public.listings;
create policy "annonce: slet egen" on public.listings
  for delete to authenticated using (auth.uid() = seller_id);

-- ---------- Billeder ----------
drop policy if exists "billede: offentlig læsning" on public.listing_photos;
create policy "billede: offentlig læsning" on public.listing_photos
  for select using (
    exists (select 1 from public.listings l
            where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid()))
  );

drop policy if exists "billede: skriv til egen annonce" on public.listing_photos;
create policy "billede: skriv til egen annonce" on public.listing_photos
  for all to authenticated
  using      (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- ============================================================
-- STORAGE: bucket til annoncebilleder
-- Filer lægges under <bruger-uuid>/<annonce-id>/<fil>, så mappenavnet
-- er brugerens id. Politikkerne nedenfor binder skriveadgang til den mappe.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

drop policy if exists "billedfil: offentlig læsning" on storage.objects;
create policy "billedfil: offentlig læsning" on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists "billedfil: upload til egen mappe" on storage.objects;
create policy "billedfil: upload til egen mappe" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "billedfil: ret egen mappe" on storage.objects;
create policy "billedfil: ret egen mappe" on storage.objects
  for update to authenticated using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "billedfil: slet egen mappe" on storage.objects;
create policy "billedfil: slet egen mappe" on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
