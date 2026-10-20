# V4 Agent 1 — Komplet mærkedækning (mærkeregisteret)

Branch `gauntlet/v4-maerker`. Registerets filer: `js/brands-registry.js` (kilden), `scripts/maerke-register-gen.js`, `scripts/maerke-kandidater.js`, `scripts/fixtures/maerke-lager.json`, `scripts/maerke-register.test.js`.
Før/efter-screenshots: `docs/review/gauntlet/v4/maerker/` (`foer-*` / `efter-*`, plus `maal.json` med de målte tal).

## 1. Udgangspunkt (før V4)

Mærker levede i **fem uafhængige lister**, som ikke kendte hinanden:

| Sted | Hvad | Antal |
|---|---|---|
| `js/data.js` `BRANDS_BY_MODEL` | redaktionel modelliste; bruges af opret-annonce og bro | 60 |
| `js/backend-bridge.js` `MAERKE_AKRONYM` | stavemåder -> kanonisk (BSA, "andet mærke" -> Ukendt …) | 14 værdier |
| `scripts/build-brand-pages.js` `YDERLIGERE_KENDTE_MAERKER` | kun-tekst-mærker under "Flere mærker" | 13 |
| `img/brands/manifest.json` | logoer, aliaser, monogram | 64 poster, 20 med godkendt logo |
| `maerke-*.html` | genererede mærkesider (mærker med ≥ 1 annonce) | 29 |

Samlet 79 forskellige mærker (efter foldning af stavemåder). Målt mod det faktiske lager (produktions-Supabase, kun læsning, 2026-10-19: 735 rækker, 720 efter tværkildedubletter, 29 mærker + "uoplyst"):

| Fejl | Observeret før |
|---|---|
| "DKW 250" (Gul og Gratis, kildens mærke "Andet Mærke") | stod som **Ukendt**: DKW fandtes ikke i nogen liste |
| Mærkefilteret på søgning | viste en række **"Ukendt (2)"** |
| Opret annonce (`#f-brand`) | **60** mærker; **kunne ikke vælge** 5 mærker, der HAR annoncer: Lauge Jensen, Bach, CFMoto, FB Mondial, Rewaco |
| Navngivning | CFMOTO (data.js) / CFMoto (bro, manifest, tests) / "Zero" (lager) / "Zero Motorcycles" (data.js, manifest) / Sym / SYM / Fb Mondial / FB Mondial |
| Mærkeoversigten, "Flere mærker" | 48 mærker som ikke-klikbare piller, uden at sige hvorfor eller hvad man kunne gøre |
| Nye mærkenavne fra kilder | `maerkeAkronym()` returnerede ethvert ukendt navn uændret, så en parserfejl, et modelnavn eller en stavefejl i `maerke`-kolonnen ville blive et **mærke med egen side og filterpille** |
| Zero | slug `zero` i manifestet, men `slugify("Zero Motorcycles")` = `zero-motorcycles` (to mulige URL'er) |

## 2. Ægte mærker på det danske marked — research og kilder

Fremgangsmåde: ejerens liste + mærker i lageret + V3-listerne tjekkes mod uafhængige kilder. **Et mærke kommer kun i registret med mindst ét belæg** (`kilder`; testet). Kilder, der faktisk blev hentet 2026-10-19:

- Wikipedia, liste over motorcykelproducenter (dækker størstedelen, inkl. aktiv/ophørt og oprindelsesland): https://en.wikipedia.org/wiki/List_of_motorcycle_manufacturers
- Producentsider, hentet og læst: https://www.mash-motors.fr/ (Mash, FR, bygget i Kina), https://www.brixton-motorcycles.com/ (Brixton, KSR Group), https://www.rewaco.com/ (Rewaco, DE, trikes, aktiv 2026), https://www.lexmoto.com/ (UK-importør/mærke), https://www.kovemoto.com/ (Kove, CN), https://www.jawayezdimotorcycles.com/ (Jawa/Yezdi, IN), https://www.zontes.com/ (Zontes; siden svarede, men teksten kunne ikke læses), https://surron.com/ (svarede, kun ordet "SURRON"), https://www.talariaeu.com/ (linket fra Lexmotos side, ikke hentet)
- Voge er et Loncin-mærke: https://www.visordown.com/features/cfmoto-zongshen-chinese-motorcycle-brands-explained
- Hyosung solgt i Danmark (2004): https://ing.dk/artikel/motorcykler-i-oeksnehallen ; forhandlerside: https://www.moto.it/concessionari/hyosung
- Lageret (MC Syd, Gul og Gratis, Jensens Motorcykler) belægger Lauge Jensen, Bach, Rewaco, DKW, Fantic, Victory, Buell, Cagiva m.fl.

**Ærlige huller:**
- Jeg fandt **ingen dansk importørliste** for Voge, Zontes, Mash og Brixton (søgninger gav kun norske/tyske/britiske sider). De er med, fordi de står på ejerens liste og producenten/mærket er verificeret — **ikke** fordi dansk salg er bekræftet.
- Tre mærker har **intet selvstændigt belæg** og er markeret `verificeret: false` med note "kræver ejerens bekræftelse": **Daelim, Super Soco, TM Racing**. De stod i V3-listen og er ikke tilføjet af mig; de fjernes ikke, men flagges.
- Wikipedia-listen er ikke dansk-specifik; at et mærke står der, er et belæg for at det er et ægte mærke, ikke for dansk udbredelse.
- Fabrikant-sider, jeg ikke kunne læse (Voge, Hyosung, TM Racing, Super Soco, Motron, Cagiva): TLS-/DNS-fejl; ikke brugt som kilde.
- Det forkerte spor: `daelimmotor.com` og `laugejensen.dk` er IKKE producenter (casino-affiliate og personlig blog) og er ikke brugt.

### Tilføjede mærker (15, alle med belæg)

Ud over de 79 fra før: **AJP, Italjet, Tomos** (aktive, Wikipedia); **DKW** (lager + Wikipedia + ejerliste); historiske **Ariel, Matchless, Velocette, Vincent, Brough Superior, Greeves, Bultaco, Hercules, NSU, Horex, Morbidelli** (Wikipedia). Ejerens mærker som V3 manglede: AJP, DKW (Husaberg, Derbi, Moto Morini fandtes i V3's tekstliste og er nu rigtige poster).
Registret har nu **93 mærker** (65 aktuelle, 26 historiske, 2 med ukendt periode); 90 med selvstændigt belæg, 3 flagget.

## 3. Registeret

**Filer:** `js/brands-registry.js` er kilden (UMD: `require()` i Node, global `BrandRegistry` i browseren). Ca. 100 sider henter allerede `js/data.js`; en separat script-tag ville kræve ændringer i hver side, hver generator og udgivelsens allowlist. Derfor kopierer `node scripts/maerke-register-gen.js` registret ind i `js/data.js` (mellem `@@BRANDREG-START/-END`), og `--tjek` + en test fanger en kopi, der er ude af trit. **Rediger kun `js/brands-registry.js`.**

**En post** (`MAERKER`): `[navn, land, periode, aliaser, kilder, ekstra?]`, fx

```js
['CFMoto', 'CN', 'aktuel', ['cfmoto', 'cf moto', 'cf-moto'], ['wp', 'lager', 'ejer'], { note: '...' }],
```

- `navn` kanonisk visningsnavn; `slug` = `slugify(navn)` (testet mod alle eksisterende `maerke-*.html`; en `ekstra.slug` er kun til at bevare en gammel URL); `logo` = nøglen i `img/brands/manifest.json` hvis anden end slug (QJMotor -> `qj-motor`); `periode` aktuel/historisk/ukendt (styrer kun gruppering på oversigten, aldrig synlighed); `kilder` = belæg.
- Opslag er ligeglad med versaler, mellemrum, bindestreger, punktummer og accenter ("CF Moto" = "cf-moto" = "CFMOTO"); det giver 0 dubletter, og testen fejler, hvis to mærker deler navn, alias, nøgle eller slug.

**API:** `normalise` (kanonisk/`Ukendt`/`null`), `kanonisk` (som gamle `maerkeAkronym`), `visNavn` ("Uoplyst mærke" for ukendte), `slug`/`fraSlug`, `logoNoegle`, `valgbare` (alle til opret-annonce), `fraTekst` (mærke først i titel/deeplink, kræver mindst ét ord mere), `status(navn, antal)` (aktiv / uden-annoncer / historisk), `sideRegel(antal)`, `opgoer(lagerets mærker)`, `vurderKandidat(...)`.

**Tilføj et mærke = én registerpost** (+ `node scripts/maerke-register-gen.js`). Alt andet følger.

### Forbrugere (alle bruger nu registret)

| Forbruger | Ændring |
|---|---|
| `js/data.js` | indeholder registret; `BRANDS_BY_MODEL` = alle registrerede mærker (tom liste, hvis ingen modelforslag); modeltabellen hedder `MODELLER_PR_MAERKE` med kanoniske nøgler (Zero, CFMoto, QJMotor) |
| `js/backend-bridge.js` | `MAERKE_AKRONYM`, `kendteMaerker()` væk; `maerkeAkronym` = `BrandRegistry.kanonisk`; kun et **registreret** mærke bliver et mærke (ellers `Ukendt`); egne annoncers mærke kanoniseres; `harmoniserStavning` bruger registrets navne |
| `js/filtrering.js` | mærkefilter sammenligner på registrets nøgle (CFMOTO = CFMoto = CF Moto, Zero = Zero Motorcycles) |
| `js/search.js` | `?brands=` kanoniseres; filteret viser "Uoplyst mærke" (sidst, under værdien `Ukendt` så `?brands=Ukendt` virker); søg-mærke finder også på aliaser (`data-brand-alias`); filterpiller og overskrift bruger `visNavn` |
| `js/opret-annonce.js` | `#f-brand` bygges af `BrandRegistry.valgbare()`: **alle 93** kan vælges, også dem uden annoncer og historiske |
| `js/home.js` | uoplyst/slug fra registret |
| `scripts/build-brand-pages.js` | `MIN_LISTINGS_FULD_TEKST` fra registret; slug fra registret; "Flere mærker" = alle registrerede mærker uden annoncer, opdelt aktuelle/historiske, med forklaring og link til opret annonce; `maerkerUdenLager()` er registerbaseret (stadig eksporteret) |
| `img/brands/manifest.json` | navn for `zero` -> "Zero", `qj-motor` -> "QJMotor" (så logo og register har samme navn; `brand-logos-gen.js` kørt) |

## 4. Normalisering

- Alias -> kanonisk: CFMOTO/CFMoto/CF Moto -> **CFMoto** (kanonisk er den stavning, som crawler, tests og logo allerede brugte; officielt skrives CFMOTO, noteret i registret). Zero/Zero Motorcycles -> **Zero**. hd/harley/H-D -> Harley-Davidson. Bsa -> BSA. Sym -> SYM. Fb Mondial/fb-mondial/F.B. Mondial -> FB Mondial. Royal-enfield -> Royal Enfield. Lauge -> Lauge Jensen. Gas Gas/GASGAS -> GasGas. Zundapp -> Zündapp. Can Am -> Can-Am. QJ Motor -> QJMotor.
- **"Ukendt" -> "Uoplyst mærke"** (vises så for brugeren i filter, pille, overskrift; sentinellen `Ukendt` bevares internt, fordi annonce.js, seo.js og generatorerne tester på den). Reservekategorien "Andet mærke" er ét af aliaserne for "uoplyst".
- DKW: "Andet Mærke" + titel "DKW 250" -> mærket DKW (registreret, historisk). "Ukendt" er nu kun "moto cross købes" (en søgeannonce uden mærke).
- "Ukendt (2)" i filteret er væk: det var DKW (nu et mærke) + søgeannoncen.

## 5. Nye mærker fra annoncekilder — validering

Et ukendt `maerke` fra en kilde bliver **aldrig** automatisk et mærke. Annoncen står som "Uoplyst mærke", navnet vurderes af `BrandRegistry.vurderKandidat` og logges af `node scripts/maerke-kandidater.js` (snapshot, `--live` for læsning af produktions-Supabase, `--md <fil>`, `--min N`):

| Tilstand | Betingelse |
|---|---|
| registreret | findes (eller er en uoplyst-betegnelse) |
| afvist | generisk ord (scooter, købes …), tal/>3 ord/>30 tegn (modelnavn/titel), kendt modelnavn (fra `MODELLER_PR_MAERKE`), eller sandsynlig stavefejl af et registreret mærke (Levenshtein; løsningen er et alias) |
| afventer | ser ud som et mærke, men set < 3 gange |
| kandidat | ser ud som et mærke, set ≥ 3 gange, ikke i registret -> slå op, tilføj belæg og én post |

Rapporten på lageret (snapshot 2026-10-19): 0 kandidater, 0 afventer, 0 afviste; 1 annonce uden registreret mærke. Rapporten ændrer hverken register, sider eller database.

## 6. Mærker uden annoncer

- **Ingen tomme sider:** `sideRegel(0)` = ingen side. Mærkesiden findes kun ved ≥ 1 annonce, er `noindex` under 5 og får først fuld tekstpakke, FAQ og sitemap-opførsel ved ≥ 5 (reglen bor i registret: `MIN_ANNONCER_INDEKS`). Eksisterende URL'er fjernes aldrig.
- **Oversigt (`maerker.html`):** "Flere mærker (63)": 41 aktuelle og 22 historiske registrerede mærker, ikke-klikbare piller (et link er en påstand om, at der er noget for enden), tekst om at siden først findes, når der er annoncer, link til opret annonce (alle kan vælges) og søgning. 63 + 30 med side = 93: hvert registreret mærke er enten en række i A–Z eller en pille.
- **Filter:** viser kun mærker i lageret (ingen nul-træf-valg, D-009), plus "Uoplyst mærke" sidst.
- **Opret annonce:** alle 93 mærker kan vælges. Et nyt mærke, en sælger vælger, får en `noindex` mærkeside ved 1 annonce.

## 7. Logoer

**Ingen logoer er hentet.** Download fra nettet kræver ejerens eget ja; V4-FAELLES forbyder det uden at spørge, og jeg har kun fået det som videresendt agentbesked, ikke fra ejeren i min egen kontekst. Orchestrator har ejerens ja og henter dem. Så: eksisterende logoer, logosystemets fallback, og en liste.

- 20 mærker har godkendt logo (AI-genererede, vektoriserede udkast, `godkendt_af: ejer`). Autenticitet i manifestet: **ubrugelig** (kræver officiel fil): Harley-Davidson, Indian, Benelli. **Tvivlsom:** Honda, Triumph, Royal Enfield, Ducati, Moto Guzzi, Husqvarna, MV Agusta. **Ukendt:** Yamaha, Suzuki, BMW, Kawasaki, KTM, Aprilia, CFMoto, Piaggio, GasGas, Zero. Varemærkeusikkerheden er altså størst for HD/Indian/Benelli; alle 20 bør på sigt erstattes af producentens egne filer.
- **Manglende logo giver aldrig manglende mærke.** `BrandLogos.logoHTML/logoFor` virker for ethvert navn (monogram/ordmærke); testet for alle 93 registrerede mærker i størrelserne sm/md/lg. 73 af 93 mærker bruger i dag fallback.
- **Lagermærker uden logo** (prioritet, i antal annoncer): BSA (8), Lauge Jensen (2), SYM, Kymco, Hyosung, Cagiva, FB Mondial, Buell, Victory, Rewaco, Bach, DKW (1 hver).
- **Ejerens liste uden logo:** Vespa, BSA, Norton, Bimota, Beta, Sherco, Fantic, Rieju, Derbi, Gilera, Peugeot, SYM, Kymco, Keeway, Hyosung, Mash, Voge, Zontes, QJMotor, Moto Morini, Brixton, Jawa, Ural, Can-Am, Buell, Victory, Husaberg, SWM, AJP (+ DKW).
- **Hvor man henter officielle filer:** producentens egen presse-/brand-/media-side (søg "<mærke> brand assets/press kit"), ellers Wikimedia Commons (kontrollér licens/PD-markering pr. fil). Foretræk SVG; kun PNG ≥ 512 px. Ingen logo-samlesites. Producentsiderne for Mash, Brixton, Rewaco, Lexmoto, Kove, Jawa/Yezdi står i kildelisten. Nye logoer skrives i `img/brands/manifest.json` (kilde, licens, hash), derefter `node scripts/brand-logos-gen.js --opdater`; registret behøver ingen ændring (logo-nøglen = slug, eller `ekstra.logo`).

## 8. Tests

`scripts/maerke-register.test.js` (23 tests; **skal tilføjes til `package.json` "test" af Orchestrator**): ingen dubletter; belæg pr. mærke og udpegning af de 3 ubelagte; slug = `slugify` og eksisterende URL'er bevaret; ejerens liste + alle V3-mærker er med; aliasser/normalisering (15 mærker × stavemåder); "Uoplyst mærke"; `fraTekst`; `data.js`-kopi i trit; `BRANDS_BY_MODEL` = registret; opret-annonce kan vælge alle; filter finder alle 93 mærker på navn, versaler og alle aliaser; søgning/forside/generator/bro bruger registret; "Flere mærker" dækker alle mærker uden annoncer; lagerets mærker 100 % håndteret (snapshot); ingen tom mærkeside og noindex-reglen; ukendte navne bliver ikke mærker; kandidatvalidering; rapport; sideregler; logo-fallback for alle; manifest <-> register.

Rettede eksisterende tests (brand-relateret): `scripts/maerke-audit.test.js` (Zero), `scripts/w13-logo-kerne.test.js` (A1: registret i stedet for tekstlæsning af data.js), `js/lager-determinisme.test.js` (BrandRegistry i harness).
Sidegevinst: `scripts/seo-chip-tjek.js` og `js/soegeoverskrift.test.js` udklipper funktioner fra `search.js` uden `BrandRegistry`; to steder i `search.js` er derfor vagtet med `typeof BrandRegistry`.

## 9. Acceptkriterier

| Kriterium | Resultat |
|---|---|
| Før/efter mærkeliste | 79 forskellige mærker i 5 lister -> **93 i ét register** (+15 med belæg, 0 fjernet) |
| Lageret 100 % håndteret | alle 29 lagermærker + DKW er registrerede; 0 uregistrerede navne; 1 annonce uden mærke ("moto cross købes", ærligt "Uoplyst mærke") |
| Nyt mærke = én registerpost | ja (+ `maerke-register-gen.js`); ingen anden liste skal ændres (testet) |
| Ingen dubletter / ødelagte mærkesider | 0 dubletter (test); alle 29 eksisterende URL'er bevaret, +1 ny (`maerke-dkw.html`, noindex, 1 annonce); ingen tom side |
| Opret annonce | 60 -> **93** valgbare, inkl. de 5 lagermærker, der ikke kunne vælges |
| Filter | "Ukendt (2)" -> "Uoplyst mærke" sidst; `?brands=CFMOTO`/`harley` rammer rigtigt mærke |
| Oversigt | 48 -> 63 "Flere mærker", opdelt, forklaret; 30 mærker med side i A–Z |
| Logoer | ingen hentet (ejerens ja ikke i min kontekst); fallback for alle 93; mangler-liste ovenfor |
| Nye navne fra kilder | bliver aldrig mærker; `scripts/maerke-kandidater.js` logger |

## 10. Iterationer og dommer (Gauntlet-metoden)

1. **Iteration 1:** registret + forbrugere; første testkørsel afslørede, at seks klippe-/harness-tests manglede `BrandRegistry` (rettet med guards/harness). Rækkernes `data-brand-row` fik først aliaser tilføjet, hvilket brød w13-integrationens logo-test (den læser navnet af attributten); rettet ved at lægge aliaser i `data-brand-alias`.
2. **Iteration 2:** fuld build -> kritisk-gen -> build; før/efter-screenshots; QA's fund F1 (opret), F3 (Zero-slug), F4 (Ukendt), F5 (Flere mærker) var alle allerede lukket i registret og forbrugerne.

Screenshots: `foer-/efter-maerker-{1440-light,1440-dark,390-light}.png`, `foer-/efter-filter-maerker-1440.png`; tal i `maal.json`.

### Dimensionsskema (ærligt, uafhængig Critic dømmer)

| Dimension | Mærker (oversigt) | Filter/søgning | Opret annonce | Observation |
|---|---|---|---|---|
| Visuel kvalitet | 6 | 6 | — | "Flere mærker" er stadig tekstpiller; flere pille-rækker (63) er lange; visuel finpudsning er Agent 4's |
| Designkonsistens | 6 | 7 | — | genbruger `.mk-flere`, `.mk-flere-note`; ingen ny CSS |
| Funktionalitet | 8 | 8 | 9 | alle registrerede mærker virker overalt; aliaser; ingen tom side |
| Brugeroplevelse | 7 | 7 | 8 | ærlig forklaring + vej til opret annonce; 93 mærker i en `<select>` er lang uden søg |
| Mobil | 6 | 6 | 7 | de 63 piller bryder over mange linjer på 390; ikke foldet |
| Performance | 8 | 8 | 8 | +~22 KB rå i data.js (registret); intet netværk |
| Indholdskvalitet | 7 | 7 | 8 | kilder dokumenteret; 3 mærker uden selvstændigt belæg flagget; ingen dansk importørliste fundet |

Mockuppen "Mærker.png" er en Yamaha-**mærkeside** (hero, søgekort, typefliser); mærkesidens visuelle fidelitet er ikke min opgave. Selvscore (mærkedækning, ikke visuel fidelitet): 8/10.

## 11. Restpunkter

- Logoer til 73 mærker mangler (se liste); Harley/Indian/Benelli kræver officielle filer.
- "Flere mærker" kan foldes (`<details>`) på mobil; `<select>` i opret annonce kan få søgning — begge er UI-ændringer, ikke register.
- Daelim, Super Soco, TM Racing: belæg ønskes (eller fjernelse).
- `crawler/normalize.js` har sin egen kopi af stavemåder (`'cf moto': 'CFMoto'` m.fl.) og må ikke ændres her; den bør senere læse fra registret (`require('../js/brands-registry.js')`).
- `js/brands-registry.js` kopieres af `udgiv.js` til `_site` uden at blive hentet af nogen side (registret er indlejret i `data.js`); harmløst, kan udelades fra allowlisten.
- `scripts/maerke-register.test.js` skal ind i `package.json` "test"; `node scripts/maerke-register-gen.js --tjek` bør med i gaten.
