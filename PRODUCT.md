# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**To ligeværdige brugergrupper.** Når deres behov støder sammen, løses det fra sag
til sag — der er ingen fast rangorden, og fremtidigt arbejde må ikke antage en.

- **Køberen.** Dansk motorcykelkøber, typisk med A1- eller A2-kørekort, ofte ung
  og på telefon. Jobbet er ikke "find en motorcykel", men "find en motorcykel,
  jeg lovligt må køre, til det jeg har råd til". Det er derfor kørekortklassen,
  ikke slagvolumen, er den primære søgeakse.
- **Forhandleren.** Dansk MC-forhandler, der opdager sit eget lager indekseret på
  sitet og kan gøre krav på det. Forhandlerabonnementet er den primære
  indtægtskilde, og claim-flowet er vejen dertil.

Privatsælgeren findes som brugergruppe, men der er endnu ingen egne annoncer på
sitet, så dens behov er kendt fra hensigt frem for fra brug.

## Product Purpose

Bikerbasen er en dansk markedsplads for brugte motorcykler, bygget om én
organiserende idé: **du søger på det kørekort, du har — ikke på kubikcentimeter.**

En dansk A2-kører må ikke lovligt køre det meste af, hvad et "600-800 ccm"-filter
returnerer. De bindende grænser er effekt, effekt pr. kilo og om maskinen er
afledt af en kraftigere model. På alle andre sider skal køberen selv regne det ud;
de fleste lader være, og nogle køber forkert.

Succes for køberen: at kunne afvise det meste af listen med øjnene og åbne en
annonce, der faktisk kan lade sig gøre. Succes for forhandleren: at finde sit eget
lager og have en grund til at gøre krav på det.

## Positioning

To ting tilsammen, som ingen nabo kan kopiere troværdigt:

1. **Kørekortklassen som primær søgemekanik.** Det første filter er A1/A2/A; alt
   andet indsnævrer inden for det.
2. **"Vi gætter aldrig."** Verificerede data vises som verificerede, uverificerede
   som uverificerede, og **manglende data som manglende**. Vi udleder ikke effekt
   af slagvolumen og estimerer ikke en vægt for at færdiggøre et regnestykke.

Den anden halvdel er den, der ikke kan kopieres. En markedsplads, der optimerer
for annoncevolumen, har ikke råd til at fortælle sine brugere, at en tredjedel af
lageret har ukendte specifikationer. Det har vi, fordi løftet er nøjagtighed
frem for størrelse.

Konkret betyder det, at filteret kun må **udelukke** på oplyste tal — aldrig
bekræfte en kørekortklasse. Deraf den totrins-mærkning, produktet bruger.

## Operating Context

- **Aggregator, ikke vært.** En crawler indekserer annoncer fra eksterne kilder
  under et hårdt krav om dokumenteret samtykke pr. kilde. Fire aktive kilder
  (MC Syd, Gul og Gratis, Rydbergs MC, Jensens MC) giver ~602 annoncer efter
  dubletfjernelse. Handlen sker hos kilden; vi er opdagelseslaget.
- **Nul egne annoncer** i dag. Alt synligt udbud er lånt.
- **Claim-flowet** er forhandlertragten: indekseret annonce → krav → konto →
  abonnement. Godkendelse sker i dag kun manuelt.
- Statisk site bygget fra en allowlist til `_site/`; Supabase som backend.
- Arbejdsgangen er et review-loop med rollerne designer, critic og dev.
  Beslutninger og runde-logs ligger i `docs/review/`. En verifikationsgate
  (syntakstjek, tests, byg, udgiv) skal være grøn før hver commit.

## Capabilities and Constraints

**Ikke-forhandlelige regler** (`CLAUDE.md`). De er juridiske, ikke tekniske
præferencer, og bunder i EU-databaseretten (ophavsretslovens §71) og kildernes
vilkår: robots.txt og Crawl-delay pr. domæne; en fast feltliste uden fuld
annoncetekst, billedgallerier eller kontaktoplysninger; maks. 1 request/2 sek. og
ingen parallelle kald mod samme domæne; identificerbar User-Agent med kontakt-URL;
opt-out pr. kilde med ét flag; og claim kræver verificeret ejerskab.

**Kørekortfilteret kan kun udelukke.** A1 kræver både kendt ccm ≤ 125 og kendt
hk ≤ 15; A2 kræver kendt hk ≤ 47 eller sælgers eget drosselflag. Effekt pr. kilo
og afledningsreglen står ikke i nogen annonce og kan derfor aldrig bekræftes
derfra. Produktet bruger totrins-mærkning: **"Mulig A2"** (ikke udelukket på de
oplyste tal) og **"A2 bekræftet"** (alle krav dokumenteret).

**Aldrig opdigtede annoncer.** En falsk annonce på et site, hvis løfte er
verificerede data, er et selvpåført dødsstød.

**Ingen indeksering uden dokumenteret, revokerbart samtykke pr. kilde.**

### Åbne beslutninger — fremtidigt arbejde må ikke antage et svar

- **Er aggregeringen et stillads eller selve produktet?** Uafklaret.
  `docs/forretning.md` §4.6 argumenterer for, at indekserede annoncer er
  bootstrap og forhandlertragt, og at tyngdepunktet flytter mod egne annoncer og
  samtykkede feeds — men beslutningen er ikke truffet. Svaret ændrer
  forretningsmodellen, verifikationsløftet og forhandlerpitchet, så det skal
  afgøres bevidst, ikke pr. vane.
- **GDPR-grundlaget for privatsælgeres persondata i indekserede annoncer.**
  Kildens samtykke dækker ikke sælgerens persondata. Koden kører allerede i
  minimeret tilstand (kun køretøjsdata gemmes; telefonnumre, mails og adresser
  fjernes før lagring), men den formelle vurdering mangler.
- **Prisvurdering / "fair pris"** er bevidst ikke bygget: uden transaktionsdata
  ville det være et gæt med et mærkat på.

## Brand Commitments

- **Navnet "Bikerbasen" er bindende.** Brand- og designarbejde må bygge videre på
  det. (Note: nærheden til MCbasen.dk er et uafklaret varemærkespørgsmål, som
  dansk IP-rådgiver bør se på — men navnet er ikke til forhandling i det
  løbende arbejde.)
- **Kopireglen:** offentlig tekst siger *gratis*, aldrig *altid gratis* eller
  *gratis for evigt*. Et løfte om "altid gratis" ville gøre en fremtidig
  prisændring til et brudt løfte i stedet for en forretningsbeslutning.
- **Kilden står på hvert indekseret kort** — navn og domæne, låst med test.
- **Ingen påstand om lovlighed ud fra effekt alene.** Gælder også titler,
  meta-beskrivelser, JSON-LD og FAQ-svar.
- Sproget er dansk.

## Evidence on Hand

- `docs/forretning.md` — forretningsgrundlaget, revideret mod koden 25.08.2026.
- `docs/review/` — runde 1-15: blinde A/B-domme mod Bilbasen og AutoScout24,
  kritikerfund og skriftlige begrundelser for afviste fund.
- Rigtige crawl-data: 616 rå / 602 viste annoncer fra fire samtykkede kilder.
- `CLAUDE.md` — reglerne og en optegnelse af, hvor i koden hver enkelt håndhæves.

**Fravær, fremtidigt arbejde ikke må udfylde:** der findes ingen
transaktionsdata, ingen solgt-priser, ingen kundeudtalelser, ingen trafiktal og
ingen forhandleranmeldelser. Ingen af delene må opfindes til brug i tekst,
markedsføring eller designmockups.

## Product Principles

1. **Sig hvad vi ved — og sig hvad vi ikke ved.** Manglende data vises som
   manglende. Et tomt felt er en oplysning, ikke en fejl at skjule.
2. **Køberens spørgsmål er "må jeg køre den?"** Alt, der ikke hjælper med det
   svar, er sekundært.
3. **Et tal på skærmen skal kunne efterprøves.** Lover en chip "26 under 60.000
   kr.", skal klikket give 26.
4. **Kilden ejer annoncen.** Vi er opdagelseslaget og krediterer altid.
5. **Udbud og ærlig tekst før pynt.** Designarbejde på et tomt eller usandt site
   er spildt.

## Accessibility & Inclusion

Dansksproget produkt. Etableret i arbejdet og skal bevares:

- Forbehold skal nå skærmlæseren som rigtig tekst — ikke som `aria-label` på et
  rolleløst element, og ikke kun som `title`, som touch aldrig ser.
- Synlig fokusmarkering på alle betjeningselementer; foldemekanikker skal kunne
  betjenes med tastatur og melde deres tilstand.
- Touch-mål mindst 44 px.
- Samtykkevalg skal veje nøjagtig det samme — "Kun nødvendige" må aldrig være
  sværere at vælge end "Accepter alle".
