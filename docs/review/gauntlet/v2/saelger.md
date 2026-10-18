# V2 Builder 4: Sælger og konto (opret, login, mine annoncer)

Branch `gauntlet/v2-saelger`. Alt testet mod lokal mock (`scripts/w9-saelger-mock.js`); ingen produktions-Supabase.
Billeder: `docs/review/gauntlet/v2/saelger/` (foer-opret-1440, efter-opret-1440, efter-opret-390).

## Iteration 1: P2-2 hero klippet (opret-annonce)
Årsag: trinbjælken overlapper heroen med 48 px, men heroens bundpolstring var kun 34 px (flere stablede overrides i css/p-opret.css), så undertekstens 2. linje og tillidsboksens sidste linje lå bag kortet.
Rettelse: ét `--op-overlap` (28 px, 24 px mobil), bundpolstring = overlap + 24, bredere tekstkolonne (undertekst på én linje ved 1440), kompakt tillidsboks. Hero ca. 197 px ved 1440 (før 190 med klippet indhold); eksisterende "hero højst 200 px"-test holder.
Test: `js/v2-saelger.test.js` måler undertekst og tillidsboks mod trinbjælkens top ved 1440/768/390, lys og mørk, samt overflow.

## Iteration 2: fund i flows
1. Tom "Fortsæt" gav "Feltet skal udfyldes." ved alle felter. Nu konkrete tekster ("Vælg mærke.", "Skriv modellen, f.eks. MT-07.", "Angiv årgang...", "Vælg motorcyklens stand." osv.) og samlet toast "N felter skal rettes. Først: ...". Stand (select uden valg) gav tidligere generisk tekst og tom-postnummer en forkert "vælg fra listen".
2. Manglede handling: markér solgt. Mine annoncer havde status `sold` i data, men ingen vej dertil. Nu "Markér som solgt" i række-menuen (bekræftelse, PATCH status=sold, fejl lader status stå, kan sættes til salg igen).
3. Verificeret uden fund: login-port og kladde-flow, billedupload/forhåndsvisning/cover/fjern, fil over 12 MB (afvist med filnavn), ikke-billede, ødelagt fil, validering af grænseværdier, gem kladde, gennemse + vilkår, udgiv (1 annonce, 3 uploads, redirect til annonce), rediger/pause/slet (w9-saelger), login-fejl og open-redirect-værn.

## Kendt/ikke ændret
- Grænsen er 12 MB i kode og tekst (konsistent); mockuppen siger 10 MB. Billedfejl i `supabase-api.js` nævner ikke HEIC (kun intern validering).
- Login og mine annoncer er visuelt uændrede; ingen rytterfotos/social login/visninger/beskeder (bevidst).

## Filer
css/p-opret.css, js/opret-annonce.js, js/mine-annoncer.js, js/v2-saelger.test.js (NY, tilføj til package.json), dette dokument. Orchestrator: kør build + `kritisk-gen.js` + build (hero-CSS er kritisk for opret-annonce).

## Måling
v2-saelger 5/5, w9-saelger, w14-annonce, w14-brugere, opret-validering, opret-annonce-markup, mine-annoncer, login-fejl, dashboard: 113/113 grønne. smoke-browser strikt (4 sider x 5 bredder x lys/mørk, CLS 0,05) 0 fejl, kørt 2 gange.
