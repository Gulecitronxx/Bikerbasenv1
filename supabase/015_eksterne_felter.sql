-- 015: fem felter mere paa eksterne_annoncer
--      hk, type, stand — og variant, salgsmarkoerer fra titelopdelingen
-- ---------------------------------------------------------------
-- 014 er koert i produktion og roeres ikke. Den er bevidst mager, og det
-- princip staar ved magt: ingen fuld annoncetekst, intet galleri, ingen
-- kontaktoplysninger. Migrationen her udvider den med fem kolonner, og de
-- tre foerste er talt op paa MC Syds katalog foerst (343 produkter, aflaest
-- i renderet DOM 16.08.2026, hvoraf vi gemmer 332). Vi tilfoejer ikke en
-- kolonne, vi ikke kan udfylde — et felt der altid er tomt er stoej i hver
-- eneste query, og det ligner data, indtil nogen kigger efter.
--
-- Hvad der IKKE kommer med, og hvorfor — det korte svar; det lange staar i
-- sources/mcsyd.yaml:
--   maaned for 1. registrering  tom paa 343 af 343. Bilbasens "8/2023" har
--                               vi altsaa ikke daekning for paa en MC.
--   farve                       tom paa 343 af 343.
--   antal ejere                 findes ikke i kildens datamodel.
--   udstyr                      kun som fritekst i annoncen, som vi ikke gemmer.
--   galleri                     findes (28 fotos paa den annonce vi aabnede),
--                               men kun paa detaljesiden: 332 ekstra
--                               sideindlaesninger pr. koersel mod en
--                               forhandler vi har en aftale med. Kraever en
--                               beslutning, ikke en migration.

-- ---------- Hestekraefter ----------
-- Det vigtigste af de tre. Sammen med ccm afgoer hk, om motorcyklen maa
-- koeres paa A1- eller A2-koerekort, og det er det foerste filter en dansk
-- MC-koeber under 24 aar bruger. koerekortForListing() i js/data.js kan ikke
-- svare uden. Tallet stod paa kortet hele tiden ([data-key="HP"]) og blev
-- parset af crawleren — og derefter kastet vaek, fordi der ikke var nogen
-- kolonne at laegge det i.
--
-- Udfyldning hos MC Syd: 219 af de 332 annoncer vi gemmer (66 %), spaend 9-218 hk.
-- Loftet paa 400: verdens kraftigste serie-motorcykel ligger omkring 310.
-- Et hoejere tal er et sammenloebet felt, ikke et fund — og en check er
-- billigere end at opdage det i et soegeresultat.
--
-- HVAD DET GIVER TILBAGE. e29c381 rettede koerekortForListing() til at svare
-- null, naar effekten er ukendt — foer stod 214 annoncer med et falsk "A2",
-- heraf 178 paa over 600 ccm. Rettelsen var rigtig, men den efterlod
-- kategorien tom paa 323 af 332 annoncer, fordi hk ikke fandtes i tabellen.
-- Med hk og den udledte ccm (nedenfor) regnet igennem den rettede funktion:
--
--   FOER   A1 9                                    ingen kategori 323
--   EFTER  A1 11, A2 36, A 174  (221 i alt)        ingen kategori 111
--
-- De sidste 111 er dem over 125 ccm uden oplyst effekt. Dér KAN kategorien
-- ikke afgoeres, og saa skal der fortsat ikke staa noget.
alter table public.eksterne_annoncer
  add column if not exists hk int check (hk > 0 and hk <= 400);

-- ---------- Motorcykeltype ----------
-- Cruiser, Touring, Adventure, Sport … Vores egne annoncer har allerede en
-- type (img/type/*.webp findes for otte af dem), og uden den her kolonne kan
-- en ekstern annonce ikke staa i det samme typefilter som vores egne.
--
-- Fri tekst frem for et enum: ordlisten er kildens, ikke vores, og en ny
-- forhandler med "Naked" i sit vokabular skal ikke kraeve en migration.
-- Normaliseringen sker i crawler/normalize.js mod listen i kildens YAML.
--
-- Udfyldning hos MC Syd: 285 af 332 (86 %). Stoerste grupper: Cruiser 77,
-- Street 55, Adventure 44, Touring 31, Sportstouring 22, Sport 19.
alter table public.eksterne_annoncer
  add column if not exists type text;

-- ---------- Ny eller brugt ----------
-- Halvdelen af MC Syds katalog er fabriksnye motorcykler: 162 nye mod 170
-- brugte. Indtil nu stod de nye paa vores kort uden at sige det, side om side
-- med en 2007'er med 31.000 km. Forskellen afgoer garanti og
-- reklamationsret, og det er ikke et felt en koeber selv kan gaette.
--
-- Udfyldning hos MC Syd: 332 af 332 — kategorien staar som eget segment i
-- produktlinkets sti, saa den koster ingen ekstra hentning.
alter table public.eksterne_annoncer
  add column if not exists stand text check (stand in ('ny','brugt'));

-- ---------- Variant ----------
-- Titlens anden linje, naar maerke og model er klippet fra: Bilbasens
-- "54 Altitude 5d" under "Jeep Avenger". Skrives af en anden parser end de
-- tre ovenfor, men skal med i SAMME migration — en kolonne der mangler,
-- vaelter naeste koersel med "column does not exist", og upserten skriver
-- hele annonceobjektet.
--
-- BEMÆRK OVERLAPPET MED type: hos MC Syd er varianten i praksis det samme ord
-- som typen ("Cruiser", "Sportstouring"), fordi forhandleren skriver typen
-- ind i modelnavnet. De to kolonner er alligevel ikke det samme, og det er
-- vaerd at holde fast i:
--
--   type     er FILTRERBAR. Den er slaaet op i kildens egen faste ordliste
--            (sources/mcsyd.yaml: type_vokabular) og er altid enten null
--            eller et af 11 kendte ord. Den kan baere et typefilter.
--   variant  er VISNING. Den er resten af titlen og kan indeholde hvad som
--            helst, forhandleren har tastet — "ENGROS/UDEN KLARGØRING
--            Touring" er en rigtig variant hos MC Syd. Den kan ikke
--            filtreres paa, og den maa ikke laegges i et facetfilter.
--
-- Viser det sig ved naeste kilde, at de altid falder sammen, er det en
-- oprydning vaerd — men saa som en bevidst sammenlaegning, ikke ved at en af
-- dem stille holder op med at blive skrevet.
alter table public.eksterne_annoncer
  add column if not exists variant text;

-- ---------- Salgsmarkoerer ----------
-- Forhandlerens egne markoerer paa annoncen: ENGROS, UDEN KLARGØRING,
-- BYTTER GERNE. De er ikke pynt. "UDEN KLARGØRING" betyder, at motorcyklen
-- saelges som beset uden klargoering, og det er en oplysning en koeber skal
-- have FOER han koerer til Roedding, ikke efter.
--
-- text[] frem for én tekst, fordi en annonce kan baere flere, og fordi et
-- array kan filtreres paa (where 'ENGROS' = any(salgsmarkoerer)) uden at
-- nogen skal skrive et like-moenster.
--
-- default '{}' frem for null: en annonce uden markoerer har en TOM liste,
-- ikke en ukendt. Saa slipper hver eneste laeser for et null-tjek.
alter table public.eksterne_annoncer
  add column if not exists salgsmarkoerer text[] not null default '{}';

-- ---------- Udledte felter ----------
-- Modstykket til manuelle_felter fra 014. Dér staar, hvad EJEREN har rettet
-- i haanden og crawleren aldrig maa roere. Her staar, hvad CRAWLEREN har
-- gaettet frem for at laese.
--
-- Baggrunden: 109 af 332 annoncer fra MC Syd har ingen ccm i kortet, og uden
-- baade ccm og hk svarer koerekortForListing() i js/data.js null — saa staar
-- der intet A1/A2/A paa kortet. Det er det felt, referencen udpeger som vores
-- eneste reelle fordel over Bilbasen, og det forsvandt paa hver tredje
-- annonce. Modelnavnet kender som regel kubikken: "MSX 125", "CBR 1000 F".
--
-- Maalt mod de 229 annoncer, hvor kilden SELV oplyser ccm: 176 gaet, 175
-- inden for 10 % (33 helt praecise), ét forkert. Afvigelsen er systematisk og
-- harmloes — en "CBR 1000" er 998 ccm — men den er der.
--
-- Effekten, koert end-to-end mod det levende site 16.08.2026:
--   ccm udfyldt       223 af 332  ->  320 af 332   (67 % -> 96 %)
--   heraf udledt                      97
--   kort helt uden koerekortgrundlag  109  ->  12
--
-- Derfor denne kolonne frem for bare at skrive tallet i ccm og tie. Vaerdien
-- ligger i ccm, saa filtre og koerekortmaerkat virker uden at nogen skal
-- aendre en linje i js/data.js. Men raekken siger selv, hvor tallet kommer
-- fra, saa en visning kan skrive "ca. 750 ccm" — og saa ingen om et halvt aar
-- laeser et gaet som en maaling.
--
-- default '{}' og not null: en annonce uden gaettede felter har en TOM liste.
alter table public.eksterne_annoncer
  add column if not exists udledte_felter text[] not null default '{}';

-- ---------- Index ----------
-- Koerekortfilteret spoerger paa ccm og hk sammen ("hvad maa jeg koere paa
-- A2?"), og det er den forespoergsel, kataloget faar flest af. Resten af
-- kolonnerne faar ikke et index: tabellen er lille, og et index man ikke har
-- maalt behovet for koster skrivetid ved hver eneste koersel.
create index if not exists eksterne_koerekort_idx
  on public.eksterne_annoncer(ccm, hk)
  where status = 'aktiv';

-- ---------- Ejerens rettelser ----------
-- ret_ekstern_annonce() har en hvidliste over felter, ejeren maa rette. De
-- tre nye skal med, ellers er de de eneste felter paa annoncen, en forhandler
-- der har gjort krav paa den ikke kan korrigere — og hk er netop et af dem,
-- kilden oftest mangler. Funktionen er ellers uaendret fra 014.
--
-- salgsmarkoerer staar BEVIDST ikke paa listen: funktionen tager en text ind
-- og saetter den direkte, og et text[] kan ikke udfyldes den vej uden en cast,
-- der ville fejle paa foerste forsoeg. Skal ejeren kunne rette markoererne,
-- kraever det sin egen funktion med en text[]-parameter — ikke en stille
-- udvidelse af den her.
create or replace function public.ret_ekstern_annonce(p_annonce uuid, p_felt text, p_vaerdi text)
returns boolean language plpgsql security definer set search_path = public as $$
declare tilladt text[] := array['titel','maerke','model','variant','aargang','km','ccm','hk','type','stand','pris_dkk','by','postnr','saelgertype','status'];
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

-- Tjek bagefter — tallene boer ligne dem ovenfor efter foerste koersel:
--   select count(*) filter (where hk is not null)    as med_hk,
--          count(*) filter (where type is not null)  as med_type,
--          count(*) filter (where stand is not null) as med_stand,
--          count(*)                                  as i_alt
--     from public.eksterne_annoncer;
--   select stand, count(*) from public.eksterne_annoncer group by 1;
--   select type, count(*) from public.eksterne_annoncer group by 1 order by 2 desc;
