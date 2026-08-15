-- 014: aggregator — indekserede annoncer fra andre danske MC-sider
-- ---------------------------------------------------------------
-- Bikerbasen faar to slags annoncer, og de MAA ikke blandes sammen:
--
--   public.listings           brugerens egne. Vi hoster dem, koeberen
--                             kontakter saelgeren gennem os.
--   public.eksterne_annoncer  indekseret fra en anden side. Vi hoster dem
--                             IKKE. Koeberen sendes videre til kilden.
--
-- Derfor to tabeller frem for en kolonne paa den eksisterende. En koeber skal
-- aldrig komme i tvivl om, hvem der staar bag annoncen, og en flettet tabel
-- goer det alt for let at komme til at vise en ekstern annonce som vores egen
-- — i en query man skrev seks maaneder senere og glemte at filtrere.
--
-- Vi gemmer med vilje KUN de felter, der skal til for at finde og videresende:
-- ingen fuld annoncetekst, intet galleri, ingen kontaktoplysninger. Uddraget
-- er haardt begraenset til 200 tegn i databasen, ikke kun i crawleren — en
-- graense der kun findes i klientkoden, er ingen graense.

-- ---------- Kilder ----------
create table if not exists public.kilder (
  id                uuid primary key default gen_random_uuid(),
  navn              text not null,
  domaene           text not null unique,
  aktiv             boolean not null default true,
  -- Slaas kilden fra, soft-deletes alle dens annoncer ved naeste koersel.
  -- Det er opt-out-kravet: ét flag, og de forsvinder.
  robots_hentet     timestamptz,
  crawl_delay_ms    int not null default 2000 check (crawl_delay_ms >= 2000),
  konfig_fil        text not null,          -- sources/<domaene>.yaml
  oprettet          timestamptz not null default now(),
  constraint domaene_uden_skema check (domaene !~ '^https?://')
);

-- ---------- Indekserede annoncer ----------
create table if not exists public.eksterne_annoncer (
  id                uuid primary key default gen_random_uuid(),
  kilde_id          uuid not null references public.kilder(id) on delete cascade,
  kilde_annonce_id  text not null,          -- id'et hos kilden
  url               text not null,          -- deeplink, sidens primaere CTA
  titel             text not null,
  maerke            text,
  model             text,
  aargang           int check (aargang between 1900 and 2100),
  km                int check (km >= 0),
  ccm               int check (ccm >= 0),
  pris_dkk          int check (pris_dkk >= 0),
  by                text,
  postnr            text,
  saelgertype       text check (saelgertype in ('privat','forhandler')),
  thumbnail_url     text,
  uddrag            text check (char_length(uddrag) <= 200),
  fingerprint       text not null,
  status            text not null default 'aktiv' check (status in ('aktiv','solgt','borte')),
  foerst_set        timestamptz not null default now(),
  sidst_set         timestamptz not null default now(),
  -- Saet naar et claim godkendes. Peger paa profiles, ikke paa en ny
  -- Dealer-tabel: forhandlere findes allerede dér med navn, CVR og firma.
  ejet_af           uuid references public.profiles(id) on delete set null,
  -- Felter ejeren har rettet i haanden. Crawleren maa ALDRIG overskrive dem.
  manuelle_felter   text[] not null default '{}',
  unique (kilde_id, kilde_annonce_id)
);

create index if not exists eksterne_fingerprint_idx on public.eksterne_annoncer(fingerprint);
create index if not exists eksterne_status_idx on public.eksterne_annoncer(status, sidst_set desc);
create index if not exists eksterne_maerke_idx on public.eksterne_annoncer(maerke, model);

-- ---------- Krav paa ejerskab ----------
create table if not exists public.krav (
  id                uuid primary key default gen_random_uuid(),
  annonce_id        uuid not null references public.eksterne_annoncer(id) on delete cascade,
  bruger_id         uuid not null references public.profiles(id) on delete cascade,
  metode            text not null check (metode in ('domaene','kode','manuel')),
  status            text not null default 'afventer' check (status in ('afventer','godkendt','afvist')),
  dokumentation     text,
  oprettet          timestamptz not null default now(),
  behandlet_af      uuid references public.profiles(id) on delete set null,
  behandlet         timestamptz,
  -- Én bruger kan kun have ét aabent krav pr. annonce.
  unique (annonce_id, bruger_id)
);

-- ---------- Koersler ----------
create table if not exists public.crawl_koersler (
  id                uuid primary key default gen_random_uuid(),
  kilde_id          uuid not null references public.kilder(id) on delete cascade,
  startet           timestamptz not null default now(),
  afsluttet         timestamptz,
  fundet            int not null default 0,
  nye               int not null default 0,
  opdaterede        int not null default 0,
  borte             int not null default 0,
  fejl              int not null default 0,
  log               text
);
create index if not exists koersler_kilde_idx on public.crawl_koersler(kilde_id, startet desc);

-- ---------- RLS ----------
alter table public.kilder            enable row level security;
alter table public.eksterne_annoncer enable row level security;
alter table public.krav              enable row level security;
alter table public.crawl_koersler    enable row level security;

-- Aktive annoncer fra aktive kilder er offentlige. Alt andet er internt.
drop policy if exists "ekstern: offentlig laesning" on public.eksterne_annoncer;
create policy "ekstern: offentlig laesning" on public.eksterne_annoncer
  for select using (
    status <> 'borte'
    and exists (select 1 from public.kilder k where k.id = kilde_id and k.aktiv)
  );

-- Kilder maa laeses (vi viser "Se annoncen hos {kilde}"), men kun aktive.
drop policy if exists "kilde: offentlig laesning" on public.kilder;
create policy "kilde: offentlig laesning" on public.kilder
  for select using (aktiv);

-- Man kan oprette og se sine EGNE krav. Ingen kan se andres.
drop policy if exists "krav: opret eget" on public.krav;
create policy "krav: opret eget" on public.krav
  for insert to authenticated with check (auth.uid() = bruger_id);
drop policy if exists "krav: laes eget" on public.krav;
create policy "krav: laes eget" on public.krav
  for select to authenticated using (auth.uid() = bruger_id);

-- Ingen politik paa crawl_koersler: kun service_role (crawleren og admin).
-- Samme moenster som search_notifications i 013.

-- Skrivning til kilder og eksterne_annoncer sker KUN fra crawleren med
-- service_role. Ejeren retter gennem en funktion, ikke direkte — saa kan
-- vi haandhaeve, at kun godkendte ejere rører kun deres egne felter.
revoke insert, update, delete on public.eksterne_annoncer from anon, authenticated;
revoke insert, update, delete on public.kilder from anon, authenticated;

-- ---------- Ejerens rettelser ----------
-- Retter ét felt og husker at det er manuelt, saa crawleren lader det staa.
create or replace function public.ret_ekstern_annonce(p_annonce uuid, p_felt text, p_vaerdi text)
returns boolean language plpgsql security definer set search_path = public as $$
declare tilladt text[] := array['titel','maerke','model','aargang','km','ccm','pris_dkk','by','postnr','saelgertype','status'];
begin
  if not (p_felt = any(tilladt)) then
    raise exception 'Feltet % kan ikke rettes', p_felt;
  end if;
  if not exists (select 1 from public.eksterne_annoncer where id = p_annonce and ejet_af = auth.uid()) then
    return false;   -- ikke din annonce
  end if;
  execute format('update public.eksterne_annoncer set %I = $1, manuelle_felter = array(select distinct unnest(manuelle_felter || $2)) where id = $3', p_felt)
    using p_vaerdi, p_felt, p_annonce;
  return true;
end;
$$;

grant execute on function public.ret_ekstern_annonce(uuid, text, text) to authenticated;

-- Tjek bagefter:
--   select count(*) from public.eksterne_annoncer;
--   select k.navn, count(*) from public.eksterne_annoncer e join public.kilder k on k.id=e.kilde_id group by 1;
