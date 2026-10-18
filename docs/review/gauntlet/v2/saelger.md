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

---

# Iteration 2: Login og Mine annoncer mod mockuppen

Billeder: `docs/review/gauntlet/v2/saelger/` (foer2-* = før, efter2-* = efter, 1440 lys/mørk og 390). Mockups: `Login eller oper profil.png`, `Mine annoncer.png`.

## Login: forskelsliste (mockup mod før) og status
1. Felt- og knapstater: mockup har tydelig fokusring og hover; vores havde kun farveskift. RETTET (4 px ring, ikon skifter farve, rød ring ved aria-invalid).
2. Fejlstate: tomt skema gik til serveren og gav "Forkert e-mail eller adgangskode."; fejlboksen lå klistret op ad "Fortsæt uden konto". RETTET (klientvalidering med konkret tekst + fokus + aria-invalid; luft omkring boksen).
3. Primærknap: mockup har dybde; vores var flad. RETTET (skygge, hover/active, fokusring; ingen flytning, da en test låser knappens position).
4. Kortets dybde og kant: RETTET (lagdelt skygge, mobil: blødere overlap).
5. Fordelslistens ikoncirkler 44 mod 50 px og tættere rækker: RETTET (50 px, mere luft fra 960 px).
6. Rytterfoto, social login, "120.000+", Samme passion-håndskrift: BEVIDST IKKE (findes ikke i repoet/må ikke opdigtes).
7. Tillidsstrimmel: ikoner uden cirkel i mockup; vi beholder cirkler (konsistent med designlinjen). Uændret.

## Mine annoncer: forskelsliste og status
1. Statuskolonnen sprang fra række til række ("Aktiv" x=513, "På pause" x=599) fordi kolonnerne var indholdsstyrede og rækker med statistik fik en anden skabelon. RETTET (faste kolonner, samme x i alle rækker).
2. Annoncefoto 116 mod mockuppens ca. 135 px: RETTET (132 px).
3. Statusmærker uden ikon (mockup har ikon): RETTET.
4. Rækkernes hover/fokus: RETTET (ramme i brandfarve + skygge).
5. Mobil: 5. statistikkort stod alene i halv række: RETTET (fuld bredde, vandret layout).
6. Mobil: fanelinjen skar "Søgeagenter" af uden antydning: RETTET (fade i højre kant).
7. Min konto: menurækker uden skillelinjer: RETTET.
8. Hero er mørk (ingen rytter), Beskeder, visninger-graf, udløb, 3 annoncer med fotos: BEVIDST IKKE / mangler fotos i repoet. "Brug for hjælp?"-kort og opret-stribe fandtes allerede.

## Test og måling (iteration 2)
`js/v2-saelger.test.js` udvidet til 8 tests (login-validering uden auth-kald, fejlboks-luft + fokusring lys/mørk, statuskolonne-justering + ikoner + mobil statistikkort). 139 tests grønne på tværs af v2-saelger, w9-saelger, w14-brugere, w14-annonce, mine-annoncer, login-fejl, dashboard, w12-kritisk, opret-validering, opret-markup. smoke-browser strikt (4 sider x 5 bredder x lys/mørk) 0 fejl/0 advarsler, kørt 2 gange. Build -> `kritisk-gen.js --familie login` -> build kørt; kun egne sider + manifestet er committet.

Filstørrelsesgrænsen er bevidst 12 MB i kode og tekst (mockup: 10 MB).

## Ærlig selvscore (Critic dømmer)
Opret 7,5 · Login 7,0 · Mine annoncer 7,0. Største rest: ingen rytterfoto/lys hero i repoet, ingen visninger/beskeder-moduler (findes ikke), rækker uden fotos i mock ser tomme ud.
