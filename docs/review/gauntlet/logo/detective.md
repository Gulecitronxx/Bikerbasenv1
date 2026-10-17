# Detective — mærkelogoer (Logo Gauntlet)

Dato 2026-10-17 · branch `gauntlet/master` (HEAD 70badc24, alle w12-strømme integreret kl. 14:00) · kun læsning; ingen site-kode ændret.
Hjælpescripts i denne mappe: `png-inventar.js` (IHDR + alfa-statistik), `hist.js`, `crop.js` (udsnit af mockups til nærstudie).
Ærlig begrænsning: jeg må ikke downloade originale logofiler, så "ligner det det autentiske?" er vurderet fra kendskab til mærkerne, ikke pixel-for-pixel mod en facitfil. Alle domme "KRÆVER OPRYDNING" skal derfor verificeres mod den officielle fil, før de udgives.

---------------------------------------------------------------------------------------------------

## 1. Logo-inventar (20 AI-udkast)

Fælles tekniske fakta (målt): alle 20 er PNG, 1254 x 1254 px, 8 bit RGBA, 217-712 KB pr. fil (ialt ca. 8,5 MB). Baggrund er GENNEMSIGTIG i alle 20 (hjørnepixel alfa = 0; 67-90 % af fladen alfa 0). Blækket er ensfarvet mørk grå ca. #1a1a1a (ikke ren sort, ikke `currentColor`), alfa ca. 224-254 (næsten dækkende) plus anti-alias-kanter. Ingen farve. Indholdet fylder kun 8-28 % af lærredet (stor tom margin, forskellig pr. fil; se bbox). Det er rasterfiler: ingen skalerbarhed, ingen mørk-tilstand uden filter/mask. Bemærk: nogle filmbilleder vises hvide, andre sorte i en viser, der ignorerer alfa — begge slags er transparente (RGB under alfa 0 varierer; skal nulstilles ved konvertering).

Filnavn-præfiks `ChatGPT-billede 17. okt. 2026, ` er udeladt. Dom: **LET** = kræver let oprydning (vektorisering, trim, kontrol af bogstavformer), **TUNG** = kræver tung oprydning/gentegning og stadig verifikation, **UBRUGELIG** = erstat af officiel originalfil. Ingen får "BRUGBAR SOM ER": som rasterfil, 1254 px, mørkegrå på transparent, kan ingen bruges direkte (kun som midlertidig PNG-placeholder).

| # | Fil | Mærke | Viser | Indhold (bbox px) | Kvalitet / autenticitet | Dom |
|---|---|---|---|---|---|---|
| 1 | 13.14.47-1 (511 KB) | Yamaha | Stemmegaffel-emblem i cirkel + ordmærke YAMAHA, lodret lockup | 1047x1035 | Gaffel med 3 arme og cirkel genkendelige; detaljer i gaffelfoden approksimeret. Ordmærke OK. | LET |
| 2 | 13.14.48-2 (529 KB) | Honda | Vinge (4 fjer) + HONDA i serif-lignende ordmærke, lodret | 1145x900 | Vingen er rigtig idé; fjerenes trin/hak er AI-tilnærmelser (små sorte "hak" ved fjerstart). Ordmærke plausibelt. | LET-TUNG (vingen skal sammenlignes med original) |
| 3 | 13.14.48-3 (408 KB) | Kawasaki | "K"-symbol (firkant + sving) + ordmærket Kawasaki | 1075x544 | Tæt på; K-svinget og ordmærket ser rigtige ud. Ren, skarp. | LET |
| 4 | 13.14.49-4 (446 KB) | BMW (BMW Motorrad) | Roundel (kvadranter fyldt diagonalt) + "BMW MOTORRAD" | 1115x1059 | Roundel og bogstavplacering i ringen ser korrekte ud; mono-kvadranter korrekt diagonalt. Bogstavformerne i ringen lidt vaklende. NB: filen er "BMW Motorrad"-lockup, mens siden hedder "BMW". | LET |
| 5 | 13.14.50-5 (315 KB) | KTM | Kun ordmærke KTM (T-streg over) | 1159x332 | Meget tæt på mærkets form; M-formen er den mest usikre. Ren. | LET |
| 6 | 13.14.51-6 (376 KB) | Ducati | Skjold med DUCATI + sving | 934x972 | Skjoldets omrids/sving afviger sandsynligt fra originalen (skjoldet er i virkeligheden bredere/mere flueben-agtigt); bogstaver OK. | TUNG |
| 7 | 13.14.52-7 (461 KB) | Suzuki | Skråt S-symbol + SUZUKI | 1157x908 | Meget ren og sandsynligt tro. | LET |
| 8 | 13.14.53-8 (432 KB) | Triumph | Trekant-emblem med T + ordmærke med sving | 1112x934 | Plausibel; trekantens indre streger (skulderlinjer) og svinget under ordet skal verificeres. | TUNG (verificér) |
| 9 | 13.14.54-9 (588 KB) | Harley-Davidson | Bar & shield: MOTOR / HARLEY-DAVIDSON / CYCLES | 1196x938 | Skjoldets form og bogstaver er AI-"tegnet": mærkelig pil/streg over "MOTOR", ujævne bogstaver, **®-tegn med hvidt halo-felt** (sprite-artefakt), skjoldet er fladere end det rigtige. Genkendeligt men ikke korrekt. H-D er en af de mest kendte marks og er forsiden-top-3 — fejl her ses. | UBRUGELIG |
| 10 | 13.14.55-10 (550 KB) | Royal Enfield | Vinget R i cirkel + "Royal Enfield" i dekorativ serif | 1053x1047 | Emblemet ser rigtigt ud, ordmærkets krøller/D'et er AI-skønsmæssige. | TUNG |
| 11 | 13.37.23-1 (217 KB) | Aprilia | Kun ordmærke aprilia (kursiv, små bogstaver) | 1177x294 | Tæt på; bogstavsnit approksimeret. | LET |
| 12 | 13.37.24-2 (712 KB) | Benelli | Løve i laurbærkrans med 3 stjerner + ordmærke | 978x1025 | Meget fin AI-gravering (største fil). Løvens/krans-detaljer er opfundne, ordmærkets skrifttype er ikke mærkets. Går i grød under 40 px. | UBRUGELIG |
| 13 | 13.37.25-3 (328 KB) | CFMoto | Cirkel med flag-agtigt "F" + CFMOTO | 1133x776 | Plausibel; kontrollér flagformen. | LET-TUNG |
| 14 | 13.37.26-4 (438 KB) | Husqvarna | Krone-H-emblem + "Husqvarna MOTORCYCLES" | 962x984 | Emblemets krone/omkreds er bulet og sandsynligt forkert; linjen "MOTORCYCLES" hører til en ældre lockup. | TUNG (verificér) |
| 15 | 13.37.27-5 (515 KB) | Indian | Indianerhoved med fjerprydelse + Indian-skriftmærke + ® | 1150x681 | Hoved/fjer-detaljer er AI-opfundne; **stray streger** under ordmærket (venstre, y~950). Detaljerigt og følsomt (også kulturelt). | UBRUGELIG |
| 16 | 13.37.28-6 (330 KB) | Moto Guzzi | Ørn med udbredte vinger + MOTO GUZZI | 1152x373 | Overordnet rigtig; fjerene er opfundne og bliver til støj ved små størrelser. | TUNG |
| 17 | 13.37.28-7 (432 KB) | MV Agusta | Tandhjul med MV, "AGUSTA"-krone, kompasnåle + MV AGUSTA | 1127x888 | Imponerende, men meget detaljeret; fejlrisiko i MV-monogram og krone. | TUNG |
| 18 | 13.37.29-8 (346 KB) | GasGas | G-emblem + GASGAS (kursiv) | 1162x619 | Plausibel og ren. **Ingen mærkeside på sitet.** | LET |
| 19 | 13.37.30-9 (378 KB) | Zero (Motorcycles) | Rundet Z-emblem + ZERO MOTORCYCLES® | 1124x802 | Plausibel; ®-tegn i teksten. **Ingen mærkeside på sitet** (findes i js/data.js som "Zero Motorcycles"). | LET |
| 20 | 13.37.31-10 (409 KB) | Piaggio | Sekskant med blad/P-form + PIAGGIO | 1080x922 | Plausibel; **ingen mærkeside** (findes i js/data.js). | LET |

Opsummering: 0 brugbare som de er; 9 LET, 8 TUNG (heraf Honda og CFMoto "LET-TUNG"), 3 UBRUGELIG (Harley-Davidson, Benelli, Indian). 18 af 20 udkast hører til mærker, sitet faktisk har sider for; 3 (GasGas, Zero, Piaggio) har ingen mærkeside i dag (men indgår i redaktionel liste i js/data.js).

Strukturelle problemer ved udkastene, uanset dom:
- To slags lockups blandet: nogle har emblem + ordmærke lodret (Yamaha, BMW, Suzuki, Triumph...), andre kun ordmærke (KTM, Aprilia), andre kun emblem+ord vandret (Honda). Flise-/hero-systemet har brug for **to varianter pr. mærke**: (a) `mark` til kompakt brug (emblem hvis findes ellers ordmærke) og (b) `lockup` (fuld). De 20 filer giver kun én variant hver.
- De bærer ®/™ i to filer (Harley, Indian, Zero) — fjernes eller bevares kun hvis originalen har det.
- Ikke en eneste fil er farveholdig; mockupsene viser dog farvede logoer (se afsnit 2).

---------------------------------------------------------------------------------------------------

## 2. Hvor viser mockupsene mærker/logoer? (alle 10 set)

Mockup-canvas er 1672 x 941; mål herunder er i mockup-pixels (container ca. 1590 px bred).

| Mockup | Logo-brug |
|---|---|
| **Forside** | JA — kun ét sted: kortet "Populære mærker" (nederste række, første af tre kort side om side: mærker / kørekort / region). |
| **Mærker** (=Yamaha-mærkeside, billede 9; **ikke** oversigten maerker.html) | JA — i hero og i CTA-panel (+ ingen logo i annoncekort). Der findes INGEN mockup af maerker.html (oversigten); den må afledes fra forsidens grid. |
| **Annonce** | JA — ét logo ved titlen (Yamaha ved "Yamaha MT-07"). |
| **Sport motorcykler** (type) | NEJ — mærker nævnes kun som tekst ("De mest populære mærker: Yamaha, Kawasaki, Honda, BMW, Ducati"); populære modeller har små mc-thumbnails, ikke logoer. |
| **Motorcykler til A 2** (kørekort) | NEJ — "Populære A2-modeller" bruger lille motorcykel-silhuet + modelnavn; ingen logoer. |
| **Motorcykler til salg** (søgning) | NEJ — filtre "Mærke og model" = to selects med tekst; chips uden logo; kort uden logo. |
| Artikel, Opret annonce, Mine annoncer, Login | NEJ — ingen producentlogoer (Opret: mærke = select; Login: Google/Facebook/Apple-ikoner, ikke mærker). |

### 2a. Forside — "Populære mærker"
- Placering: nederst i første kolonnekort (x 44-610, ca. 566 px bred; samme række som "Udforsk efter kørekort" og "Find motorcykler i din region"). Kortets titel "Populære mærker" venstre, link "Se alle mærker →" højre.
- **6 fliser i ÉN række** (ikke 3x2 på desktop): Yamaha, Honda, BMW, Kawasaki, KTM, Ducati.
- Flise: ca. 85-90 px bred x 53-60 px høj, lys baggrund (hvid/meget lys), tynd 1 px kant, afrundet ca. 8-10 px, ca. 8-10 px mellemrum.
- Indhold lodret centreret, i denne rækkefølge: **logo** (ca. 22-26 px højt = ca. 40-45 % af flisehøjden, centreret) -> **mærkenavn** (ca. 11 px, semibold, mørk) -> **antal** (ca. 9-10 px, grå, tal med tusindtalspunktum, fx "12.842"). Logo + navn + antal ALTSÅ alle tre.
- Logoer er FARVEDE (Yamaha rødt, Honda rødt, BMW blå/sort, Kawasaki grønt, KTM orange, Ducati rødt). Ingen hover vist.
- Vigtigt konflikt: DESIGN_DNA siger "grøn kun til ✓; primær = orange/kobber; lys OG mørk tilstand skal virke". Farvede producentlogoer må ikke lade en grøn Kawasaki/rød Honda true brandet; anbefaling i afsnit 6: ensfarvede (`currentColor`) som standard, evt. farve kun på hover.
- Nuværende kode (js/home.js l.349-355 + css/styles.css l.1026-1039, p-forside.css l.163-166): `.maerke-flise` med 30 px cirkelformet monogram (`.maerke-mono`), navn (`strong`), antal (`.tal-n`); 3 kolonner mobil, 6 fra 1100 px; min-højde 96 px. Logoet skal erstatte monogrammet i samme 30 px-slot (breddebegrænsning ca. 56 px x 28 px, `object-fit:contain`) — ingen CLS, fordi pladsen allerede er reserveret.

### 2b. Mærkesidens hero (billede "Mærker")
- Øverst til venstre i hero, over H1: **logo + ordmærke** i farver, samlet ca. 235 px bredt x 54 px højt (emblem ca. 54 px rund + rødt "YAMAHA"-ordmærke ca. 170 px). Venstrekant på H1's venstre kant (x ~132). Hero er mørkt fotos (motorcykel, solnedgang) med gradient til venstre -> logoet står på mørk baggrund, så emblemet har hvid indfatning.
- H1 under logoet er en mærke-slogan ("Revs Your Next Ride") — **opfundet i mockuppen og Yamahas egne tagline-varemærke; brug IKKE**; sitet beholder "Brugte Yamaha-motorcykler til salg i Danmark".
- Søgekort under hero: "Søg Yamaha motorcykler" osv. — ingen logo.
- **CTA-panel** til højre for annoncerækken ("Find din næste Yamaha"): lidt mindre logo + ordmærke (ca. 140 x 30 px) øverst i panelet over overskriften, på lys fotobaggrund (farvet logo).
- Nuværende kode: `<p class="mk-wordmark" aria-hidden>` med `.mk-mono` (cirkel m. bogstav) + tekst (scripts/build-brand-pages.js l.1267, css/p-maerke.css l.94-116 og l.529). Logoet skal sidde HER (erstatter `.mk-mono`), hvid/lys variant (`color:#fff`) pga. mørk hero.
- Det kører også på siden "Populære Yamaha modeller": mockuppen bruger mc-thumbnails — ingen logoer; ingen mærkelogo på modelfliser.

### 2c. Annoncedetalje (billede "Annonce")
- Logo står **til højre i titelrækken** i midterkolonnen, ud for H1 "Yamaha MT-07": ca. 117 px bredt x ca. 40 px højt (emblem + ordmærke + lille tagline-linje), højrejusteret (x 1073-1190), toplinje ca. i H1-kappehøjde. Farvet på hvid baggrund.
- Breadcrumb ("Forside > Motorcykler > Yamaha > MT-07 > ...") har ingen logoer. Faktatabellen har mærke-række med et lille generisk ikon (stemmegaffel-agtigt) — dekoration, ikke logo.
- Annoncekort (lignende motorcykler) uden logo.
- Taglinen under logoet ("Revs Your Heart") i mockuppen er AI-bunden tekst — må ikke med. Brug kun emblem+ordmærke, ikke en slogan-lockup.
- Fallback: for "Ukendt"/ukendt logo — ingen tom plads: vis intet (titlen er venstrestillet; logo er supplement), eller tekst-ordmærke i `--color-fg-muted`.

### 2d. Øvrige sider (kort/filtre/typer/kørekort/region/guides)
Ingen af mockupsene viser logoer her. Ejerens ønske om logoer "på tværs af sitet" er altså en ny udvidelse; foreslået designspec (afledt, ikke fra billederne):
- **Søgefilter "Mærke"** (checkbox-rækker i js/search.js l.383-390): lille 16-18 px mark foran navnet i den eksisterende `.checkbox-row`; kun hvis logo findes, ellers 18 px tom/ingen (hold venstrekant: brug fast 18 px kolonne for at undgå hop).
- **Søgeresultat-/annoncekort**: INGEN logo i kortet (mockup: ingen; tæt design). Evt. mærkenavnet som tekst som nu.
- **Aktive filterchips**: intet logo (mockup: ren tekst).
- **Typesider/kørekortsider/regionssider**: "Populære mærker"-række kan genbruge samme `.maerke-flise` (6 fliser) — én komponent, ikke tre. Modelfliser: ingen logo (mockup har mc-thumbnails).
- **Modelsider** (`model-*.html`): lille mark (24 px) ved H1 eller i brødkrumme-sidebar; ikke påkrævet.
- **Guides**: undgå; logoer i redaktionelt indhold giver varemærke-/sponsorindtryk (se afsnit 5).
- **Mørk tilstand**: ensfarvet mask med `currentColor`. Alle logoer ens farve (fg) -> ro i gitteret.

---------------------------------------------------------------------------------------------------

## 3. Mærkeregister

Kilder: `maerker.html` (committet, 29 mærker, ialt 718 annoncer), `maerke-*.html` (29 sider), `index.html` data-maerkesider (samme 29 slugs), `js/data.js` BRANDS_BY_MODEL (60 redaktionelle mærker), `crawler/normalize.js` MAERKE_ALIAS. Ingen produktions-Supabase hentet. Antal = "annoncer" i den committede maerker.html (A-Z-listen), dvs. status på bygge-tidspunktet; sitemap.xml har 73 `<url>`.

Alias/foldning (der skal gentages i logo-opslaget): slug = `slugify(navn)` (accenter foldes, ikke-alfanumerisk -> `-`). Aliaser i crawler/normalize.js: 'harley davidson'/'harley'/'hd'/'h-d' -> Harley-Davidson; 'bmw motorrad' -> BMW; 'cf moto'/'cfmoto' -> **CFMoto** (men js/data.js har 'CFMOTO' — samme slug `cfmoto`, så OK, men vis aldrig navn fra data.js til et logo-opslag); 'gas gas' -> GasGas; 'lauge'/'lauge jensen' -> Lauge Jensen; 'andet mærke' -> Ukendt (sentinel — aldrig logo, aldrig mærkeside; build-brand-pages.js l.1325/1362 filtrerer `andet-maerke` ud). js/data.js kalder Zero for 'Zero Motorcycles' (slug `zero-motorcycles`) — manifestet bør have alias `zero-motorcycles -> zero`.

| Mærke | Slug | Annoncer (maerker.html) | Logoudkast | Foreslået fallback hvis intet logo |
|---|---|---|---|---|
| Honda | honda | 307 | JA 13.14.48-2 | — |
| Harley-Davidson | harley-davidson | 83 | JA 13.14.54-9 (UBRUGELIG) | monogram "HD" indtil officiel fil |
| Yamaha | yamaha | 68 | JA 13.14.47-1 | — |
| Suzuki | suzuki | 63 | JA 13.14.52-7 | — |
| BMW | bmw | 47 | JA 13.14.49-4 (BMW Motorrad) | — |
| Kawasaki | kawasaki | 43 | JA 13.14.48-3 | — |
| Triumph | triumph | 35 | JA 13.14.53-8 | — |
| KTM | ktm | 14 | JA 13.14.50-5 | — |
| Royal Enfield | royal-enfield | 14 | JA 13.14.55-10 | — |
| BSA | bsa | 8 | **NEJ** | ordmærke "BSA" |
| Aprilia | aprilia | 7 | JA 13.37.23-1 | — |
| Ducati | ducati | 5 | JA 13.14.51-6 | — |
| Moto Guzzi | moto-guzzi | 3 | JA 13.37.28-6 | — |
| Husqvarna | husqvarna | 2 | JA 13.37.26-4 | — |
| Indian | indian | 2 | JA 13.37.27-5 (UBRUGELIG) | monogram "I"/ordmærke |
| Lauge Jensen | lauge-jensen | 2 | **NEJ** (dansk mærke) | to-linjers tekst-ordmærke |
| MV Agusta | mv-agusta | 2 | JA 13.37.28-7 | — |
| Victory | victory | 2 | **NEJ** (udgået mærke; Polaris) | ordmærke "VICTORY" |
| Bach | bach | 1 | **NEJ** | ordmærke "BACH" |
| Benelli | benelli | 1 | JA 13.37.24-2 (UBRUGELIG) | ordmærke "BENELLI" |
| Buell | buell | 1 | **NEJ** | ordmærke "BUELL" |
| Cagiva | cagiva | 1 | **NEJ** | ordmærke "CAGIVA" |
| CFMoto | cfmoto | 1 | JA 13.37.25-3 | — |
| Fantic | fantic | 1 | **NEJ** | ordmærke "FANTIC" |
| FB Mondial | fb-mondial | 1 | **NEJ** | to-linjers ordmærke |
| Hyosung | hyosung | 1 | **NEJ** | ordmærke "HYOSUNG" |
| Kymco | kymco | 1 | **NEJ** | ordmærke "KYMCO" |
| Rewaco | rewaco | 1 | **NEJ** | ordmærke "REWACO" |
| SYM | sym | 1 | **NEJ** | ordmærke "SYM" |

Dækning af udkast: 17 af 29 mærkesider har et draft (Honda, Harley-Davidson, Yamaha, Suzuki, BMW, Kawasaki, Triumph, KTM, Royal Enfield, Aprilia, Ducati, Moto Guzzi, Husqvarna, Indian, MV Agusta, Benelli, CFMoto) = 697 af 718 annoncer (ca. 97 %). 12 sider har intet draft: BSA, Lauge Jensen, Victory, Bach, Buell, Cagiva, Fantic, FB Mondial, Hyosung, Kymco, Rewaco, SYM (21 annoncer ialt). De 3 draft-mærker uden side er GasGas, Zero, Piaggio (17+3 = 20).
Bemærk: forsidens top-6 (Honda, H-D, Yamaha, Suzuki, BMW, Kawasaki) har alle udkast, men H-D-udkastet er UBRUGELIGT -> H-D kræver officiel fil/ren gentegning FØR forsiden kan vise logoer uden pinlig fejl.

Redaktionelle mærker i js/data.js UDEN side (35): Vespa, Piaggio, Bimota, Norton, Zero Motorcycles, Energica, Zontes, Voge, Daelim, Bajaj, TVS, Hero MotoCorp, Yezdi, Ural, Beta, GasGas, Sherco, TM Racing, SWM, Rieju, Nimbus, MZ, Peugeot, Sachs, Can-Am, Keeway, Mash, Brixton, Lexmoto, QJ Motor, Kove, Super Soco, Jawa, Gilera, Lambretta. Af disse har kun Piaggio, Zero og GasGas udkast. Sider uden for data.js: bach, fb-mondial, lauge-jensen, rewaco (kommer fra data/crawler). Lager i committede sider er altså ikke den fulde mængde: ved nye crawls kan nye mærker dukke op -> fallback SKAL være automatisk (se afsnit 4).

Anbefalet fallback (ét komponent, ikke pr. mærke): ordmærke i tekst — mærkenavnet i `--font-display`, bold, VERSALER, `letter-spacing:.04em`, `currentColor`, 1-2 linjer, skaleret til slottets højde (fx "BSA", "FB MONDIAL" på to linjer, "LAUGE JENSEN" på to linjer); monogram-cirklen (som i dag) kun hvor pladsen er <= 24 px og et kort ord ikke kan stå (filterrækker). Mærker uden logo må aldrig se "ødelagte" ud ved siden af mærker med logo: hold fast slotstørrelse og samme farve (fg-muted).

---------------------------------------------------------------------------------------------------

## 4. Eksisterende logo-/mærkekode, og hvor et centralt system skal sidde

Fundet (alt er monogram/tekst — ingen logoer eksisterer):

| Sted | Hvad |
|---|---|
| `js/home.js` l.333-358 `tegnMaerker` | forsidens `#brand-cloud`: 6 `.maerke-flise` med `.maerke-mono` (første bogstav i cirkel) + navn + antal; næste 8 som tekstlinks i `#seo-brands`. Slug i JS lokal `slugify` (samme regler som generatoren). `data-maerkesider` i index.html bestemmer linkmål. |
| `css/styles.css` l.1026-1039 | `.maerke-grid` (3 kol, 6 fra 1100 px), `.maerke-flise`, `.maerke-mono` (30 px cirkel). `css/p-forside.css` l.151-166 hover + kolonner. |
| `scripts/build-brand-pages.js` l.778-781 `monogram()`, l.1267 | `<p class="mk-wordmark"><span class="mk-mono">` i brand-hero; `monogram` eksporteres og testes (scripts/maerkeside.test.js l.257-261). |
| `css/p-maerke.css` l.94-116, 376-387, 529 | `.mk-mono`, `.mk-wordmark(-lang)`, `.mk-brandtile` (maerker.html flise: kun tekst, **ingen** monogram). |
| `scripts/build-brand-pages.js` l.1437 | maerker.html topfliser (8) `<a class="mk-brandtile">`: navn + antal, ingen ikon. A-Z-liste l.1456. |
| `js/search.js` l.383-390 | mærkefilter (checkbox-rækker), ingen ikon. |
| `js/annonce.js` l.496-506, 952 | brødkrumme og faktatabel: kun tekst. |
| `js/components.js` | `listingCardHTML` (l.888) uden mærkeikon; ikke brugt til logoer. |
| `scripts/build-facet-pages.js` l.1790 m.fl. | `popular-chip` til region/budget; mærke-chips uden ikon. |
| `scripts/build-guides.js` l.485-499 | "Efter mærke"-liste (tekstlinks). |

Forslag til centralt system (filer; alle NYE undtagen de nævnte integrationspunkter):
- `img/brands/<slug>.svg` — ét ensfarvet mark pr. mærke (viewBox normaliseret, fx 0 0 100 100/ eller 0 0 W 40, kun `fill` ingen farve, ingen `<script>`, ingen `style` med url()). Valgfri `img/brands/<slug>-lockup.svg`. (udgiv.js tillader allerede svg i `img/` rekursivt.)
- `img/brands/manifest.json` — `{ "yamaha": {"mark":"yamaha.svg","w":100,"h":100,"lockup":"yamaha-lockup.svg","kilde":"https://…","licens":"…","hash":"ab12cd34"}, … }` + `alias`-tabel (bmw-motorrad->bmw, harley->harley-davidson, cf-moto->cfmoto, gas-gas->gasgas, zero-motorcycles->zero). Kilde-URL og licens pr. mærke i manifestet = ét sted at dokumentere "troværdig kilde".
- `scripts/brand-logos.js` (Node-modul, CommonJS som øvrige scripts): `logoFor(brand) -> {slug, mark, w, h}|null`, `logoHTML(brand,{variant,size,cls})` -> `<span class="bl" …>` eller fallback-ordmærke; læser manifestet ÉN gang; bruges af build-brand-pages.js, build-facet-pages.js, build-guides.js, build-listing-pages.js. Test: hvert manifest-element har en fil; hver SVG består sanitér-tjek; slug-opslag for alle 29 sider (ingen "huller" uden bevidst fallback).
- `js/brand-logos.js` (klient): samme opslag mod en **indlejret mini-manifest** (slug->{mark,w,h}) — IKKE et ekstra fetch ved første maling. Forsiden/søgning/annonce kræver synkron slot; foreslå at byggetrinnet skriver `data-logos="slug1,slug2,…"` (som `data-maerkesider`) eller at `js/brand-logos.js` selv indeholder tabellen (ca. 30 poster, < 2 KB) og at test `brand-logos.test.js` verificerer at den matcher `manifest.json`. API: `BrandLogo.html(brand,{variant:'mark',size:'md'})`.
- CSS: `.bl` (slot) i **ny** `css/p-logo.css` ELLER i delt `styles.css` (se strømme nedenfor). Teknik: `.bl{display:inline-block;width:var(--bl-w);height:var(--bl-h);background:currentColor;-webkit-mask:var(--bl-src) center/contain no-repeat;mask:var(--bl-src) center/contain no-repeat}` + størrelses-tokens `--bl-sm:16px`, `--bl-md:28px`, `--bl-lg:54px`. Giver lys/mørk gratis og `currentColor`, kræver ingen ekstra HTTP-request pr. flise ud over selve SVG'en.
- Dekorativt: logo/slot med `aria-hidden="true"` når navnet står som tekst ved siden (fliser, filter); `role="img" aria-label="Yamaha"` kun hvor logoet står alene (annoncetitel, mærke-hero).
- Mærkebytte: `monogram()` bevares som fallback i `logoHTML` (test findes).

---------------------------------------------------------------------------------------------------

## 5. Juridik og licens (forsigtig vurdering — ikke juridisk rådgivning)

Princip: producentlogoer er registrerede varemærker (og ofte ophavsretligt beskyttede værker). I en annonce-/markedsplads-aggregator er brug af producentens mærke til at **identificere varen/producenten** (nominativ brug: "det her er en Yamaha") typisk acceptabel i EU/Danmark under varemærkeloven/varemærkedirektivets begrænsningsregel (anvendelse i overensstemmelse med god markedsføringsskik, kun så meget som nødvendigt, uden antydning af tilknytning/sponsorering). Det er IKKE en licens til at bruge logoet vilkårligt: logoet skal vises neutralt, i rimelig størrelse, uden at ligne at producenten står bag eller anbefaler Bikerbasen, ikke i reklameværdi (hero med "Revs Your Next Ride", producentens slogans), ikke ændret/farvelagt/forvansket, og ikke som sponsoreret/forhandler-badge. Ophavsret er en separat sag: simple tekst-/geometri-logoer er ofte under originalitetstærsklen, komplekse (Honda-vinge, Benelli-løve, Indian-hoved, Moto Guzzi-ørn, H-D bar & shield, MV Agusta) kan være beskyttede.

Kritiske punkter, der skal afklares af ejer/jurist:
1. **AI-genererede logoer** er gengivelser af varemærker, ikke officielle filer: unøjagtigheder (H-D, Benelli, Indian) kan være misvisende/forvanskende og undergrave "uændret" krav. Ret ikke i dem; brug officielle filer eller tekstordmærke.
2. **Hero-brug med logo + slogan** (mockuppens Yamaha-hero) kan fremstå som producent-/forhandlerside -> **brug ikke slogan**; hold logoet lille, med tydelig "uafhængig annoncesite"-formulering (om-siden dækker det allerede?).
3. Ingen kommerciel tilknytning må antydes. Tilføj fodnote: "Mærkenavne og logoer tilhører deres respektive ejere; vises kun til identifikation. Bikerbasen er uafhængig." (privatlivs-/vilkårs-/om-side).
4. Wikimedia Commons "Public domain" på mærkelogoer betyder **kun ophavsret under US/oprindelseslands tærskel** (typisk PD-textlogo/ineligible); varemærke-retten består ("Restrictions: trademarked" i metadata). Danske/EU-tærskler for originalitet kan være lavere end USA's — så Commons-PD er ikke en garanti i Danmark for komplekse logoer.
5. Der findes **ingen** officiel åben licens ("CC") for producenternes egne logoer. Bedste troværdige kilder er (a) producentens presse-/brandcenter (typisk "kun editorial/presseformål", ofte login), (b) anmodning om skriftlig tilladelse, (c) Commons som sekundær.

Kilder undersøgt (WebSearch/WebFetch, intet gemt lokalt):
- Wikimedia Commons (API-metadata): filer nedenfor har `LicenseShortName="Public domain"` og `Restrictions="trademarked"` (hvis ikke andet nævnt). Brugsvilkår som de står på Commons: "Public domain" + varemærkebegrænsning (de generiske Commons-skabeloner: ophavsretsligt ikke-beskyttet, men "this image is trademarked; usage may be restricted"). Download er teknisk tilladt, men varemærket er stadig beskyttet.
- Yamaha: Yamaha Motor Mynewsdesk-pressebilleder — vilkår (som gengivet i søgeresultatet): må bruges af "journalists, bloggers… provided that the content is unmodified" og med kreditering; brugsformål = redaktionel omtale. US-siden `usa.yamaha.com/about_yamaha/trademark_guidelines` (generelt Yamaha, ikke Motor): brug uden for retningslinjerne "is strictly prohibited"; forhandlere med tilladelse må bruge logoer ifølge retningslinjerne. **Aggregator-brug kræver afklaring/tilladelse.**
- BMW: BMW Group PressClub (spansk legal-notice via søgning; dansk URL `press.bmwgroup.com/denmark/info/legal` gav 404): "may only be used for press purposes… commercial purposes… or making it accessible to third parties, is not permitted". **Forbyder tredjeparts-/kommerciel brug af pressemateriale — tilladelse kræves.**
- Ducati: ingen officiel presse-/brandside fundet; en kopi på Audi-mediecenter angiver "Copyright: Ducati Motor Holding S.p.A.", "royalty-free" til presse. Ukendt for aggregator.
- Triumph, Harley-Davidson: ingen officiel brandcenter-side fundet via søgning. H-D håndhæver varemærket aktivt (retssager mod uautoriserede varer; "we are legally required to exercise control over the use of our trademarks" ifølge dækning) -> **højeste risiko for kontakt; hold logo-brug minimal eller brug tekst**.
- Resterende mærker (Honda, Kawasaki, Suzuki, KTM, Royal Enfield osv.): ingen officiel brandcenter-side kunne verificeres med de fire søgeforsøg; dette er en TODO for næste runde (anbefalet manuel kontrol på producenternes media/press-sider; mange kræver login eller kontakt).
- Tredjeparts "logo-sites" (cdnlogo.com, logotyp.us, brandkit.pro, thesvg.org, 1000logos): modstridende vilkår ("personal and educational use", "all rights reserved", én påstår CC0). **Ikke troværdige kilder; brug aldrig som licensgrundlag.**

### Per mærke — kilde, status og anbefaling
Format: Commons-fil (alle: "Public domain", Restrictions: trademarked, medmindre andet nævnt) · officiel kilde · anbefaling: (a) officiel fil, (b) AI-udkast efter oprydning, (c) tekst-ordmærke.

| Mærke | Commons-kandidat (URL-sti under commons.wikimedia.org/wiki/) | Officiel kilde/vilkår | Anbefaling |
|---|---|---|---|
| Yamaha | `File:Yamaha_Motor_logo.svg` ("Public domain", trademarked) | Mynewsdesk: kun uændret redaktionel brug; US trademark-guideline: kun efter tilladelse | (a) når tilladelse/Commons-fil accepteres; indtil da (c). ADVARSEL: tredjeparts-brug kræver tilladelse. |
| Honda | `File:Honda_Logo.svg` (PD, trademarked) | Ikke fundet | (a) Commons efter juridisk ok; (b) kun hvis vingen verificeres |
| Kawasaki | `File:Kawasaki-logo.svg`, `File:Kawasaki_Logo_vert.svg` (PD, trademarked) | Ikke fundet | (a)/(b) |
| BMW | `File:Logo_BMW_Motorrad_2021.svg` (PD, trademarked) | PressClub: kun pressebrug, tredjepart forbudt -> **tilladelse påkrævet** | (a) Commons efter ok — ellers (c). NB: roundel selv er BMW-kerne; mest håndhævet. |
| KTM | `File:KTM-Logo.svg` (PD, trademarked) | Ikke fundet | (a) |
| Ducati | `File:Logo_Ducati.svg`, `File:Ducati_red_logo.svg` (PD, trademarked) | Kopi hos Audi: "royalty-free" til presse; ukendt vilkår | (a) |
| Suzuki | `File:Suzuki_logo_2025.svg`, `File:Suzuki_logo_2025_(vertical).svg` (PD, trademarked) | Ikke fundet | (a) |
| Triumph | `File:Triumph_Motorcycles_logo_and_claim_2015.svg` (PD, trademarked) — ældre logo (pre-2020?) kontrollér mod nuværende | Ikke fundet | (a) hvis aktuelt; ellers (c) |
| Harley-Davidson | `File:Harley-Davidson_logo.svg`, `File:Harley_Davidson_logo.svg` (PD, trademarked) | Ingen brandcenter fundet; aktiv håndhævelse | (c) som standard; (a) kun med tilladelse. **AI-udkast: ikke brug.** |
| Royal Enfield | `File:Royal_Enfield_logo.svg`, `File:Royal_Enfield_logo_new.svg` (eksisterer; licensstatus ikke hentet) | Ikke fundet | (a) efter kontrol af filens licens; (b) |
| Aprilia | `File:Aprilia-logo.svg` (PD, trademarked) | Ikke fundet | (a) |
| Benelli | Kun `File:BenelliGlobalPMS485Logo.NoTag.svg` og `File:Benelli_logo_2019.png` fundet (licens ikke hentet) — **pas på `File:Logo_Benelli_Armi.svg`: det er det ITALIENSKE VÅBENFIRMA, ikke motorcyklerne** | Ikke fundet | (a) hvis Global-filen er acceptabel; ellers (c). AI-udkast: ikke brug. |
| CFMoto | `File:CFMOTO_Logo.svg` (PD, trademarked) | Ikke fundet | (a) |
| Husqvarna | `File:Husqvarna_Logo.png` (PD, trademarked; kun PNG), `File:Husqvarna_logo_ArtWW.svg` (PD) — hvilket Husqvarna-firma (motorcykler vs. havemaskiner!) skal kontrolleres | Ikke fundet | (a) efter kontrol; ellers (c) |
| Indian | `File:Indian_Motorcycle_logo.svg` (PD, trademarked) | Ikke fundet | (a) efter ok; AI-udkast: ikke brug. Kulturelt følsomt motiv. |
| Moto Guzzi | Ingen logo-SVG fundet på Commons (kun fotos af emblem, CC BY-SA 4.0) | Ikke fundet | (c) indtil officiel fil; (b) kun efter verifikation |
| MV Agusta | `File:MV_Agusta_Logo.svg` (fundet; licens ikke hentet), `File:MV_Agusta_Logo_1945_noBG.png` (PD) | Ikke fundet | (a) efter kontrol |
| GasGas | `File:GasGas_Logo.jpg` (PD, trademarked; kun JPG — ikke vektor) | Ikke fundet | (c)/(b) — **ingen mærkeside, lav prioritet** |
| Zero Motorcycles | Kun `File:ZERO_logo.png` (CC BY 4.0 — kræver kreditering, upålideligt hvem der har lagt det op) | Ikke fundet | (c) — ingen mærkeside |
| Piaggio | `File:Piaggio-logo.svg`, `File:Piaggio_Group_logo.svg` (PD, trademarked) | Ikke fundet | (a) — ingen mærkeside endnu |

Konklusion: 14 af 20 har en vektor-SVG på Commons (Yamaha, Honda, Kawasaki, BMW Motorrad, KTM, Ducati, Suzuki, Triumph, H-D, Aprilia, CFMoto, Indian, Piaggio, plus Royal Enfield/MV Agusta hvor licens ikke er hentet), 4 har kun raster/usikker (Husqvarna, GasGas, MV Agusta png, Benelli), 2 intet brugbart (Moto Guzzi, Zero). Ingen er hentet. For intet mærke har jeg kunnet verificere et officielt brandcenter med eksplicit tilladelse til tredjeparts-aggregatorer. "Troværdig kilde der må anvendes" kræver derfor for hvert mærke ENTEN en skriftlig tilladelse/bekræftelse fra producenten eller dansk juridisk vurdering af nominativ brug; indtil da tekst-ordmærke som default og logoer bag en feature-flag (`BRAND_LOGOS_ON`) der kun tændes efter ejerens/juristens godkendelse. Hold et `LOGO-KILDER.md`-styret (eller manifest-felt) register pr. mærke: kilde-URL, licens, dato hentet, hash af fil, godkendelsesstatus.

---------------------------------------------------------------------------------------------------

## 6. Tekniske begrænsninger

- **CSP** (alle sider, meta-tag, håndskrevet): `img-src 'self' data: blob: …`. Lokale `img/brands/*.svg` er `'self'` -> ingen CSP-ændring. `data:`-URI'er er også tilladt (mask-image via data-URI virker), men giver større HTML — brug filer. `default-src 'self'`, `style-src 'self' 'unsafe-inline'`. En SVG indlæst via `<img>` eller CSS-mask kører ALDRIG scripts (så sandboxet), men filer må stadig sanitéres: forbyd `<script>`, `on*`-attributter, `<foreignObject>`, `<style>`-`@import`, eksterne `href`/`xlink:href`, `<image>`; kun `<path>/<g>/<rect>/<circle>/<polygon>` med `fill`. Skriv en test (`scripts/brand-logos.test.js`) der parser hver SVG. Inline-SVG (indsat i HTML af generatoren) kræver samme sanitering fordi det ville køre i sidens kontekst; undgå inline for andet end sprite fra egen mappe.
- **Hvis `<use href="…#id">` sprite**: skal være samme origin (OK), men `<img>`/mask kan ikke arve `currentColor` hvis filen indeholder faste farver; derfor ensfarvet mask-teknik (afsnit 4) eller sprite via `<use>` (arver `currentColor`). Mask er enklest, 1 request pr. logo, cache pr. fil.
- **udgiv.js** (`scripts/udgiv.js` l.49-54): `{ fra: 'img', tillad: /\.(webp|avif|png|jpe?g|gif|svg)$/ }`, kopieres rekursivt (img/type findes allerede) — `img/brands/*.svg` udgives uden ændring; `manifest.json` i img/ udgives IKKE (kun billedtyper) -> læg manifestet i `js/` (som .js) eller byg det ind i `js/brand-logos.js`. `*.md` forbudt i udgivelsen (FORBUDTE_TYPER). **SVG minificeres ikke** af udgiv.js (kun js/css) -> minimer offline (SVGO-lignende) FØR commit. Reference-scanneren følger kun `href|src|srcset` i HTML og `url()` i inline CSS; sti-referencer bygget i JS (`img/brands/${slug}.svg`) fanges **ikke** -> manglende fil = stille 404. Test: hver manifest-post findes på disk og hver generator-/JS-genereret slug har en post eller bevidst fallback.
- **Cache/versionering**: `stamp-version.js` stempler kun `js/css`-referencer og fonte; billeder er ustemplede og cachet 1 uge, ikke immutable (cloudflare-setup l.139-165). Derfor: enten indholdshash i filnavn (`yamaha.ab12cd34.svg`, kilde = manifest) eller bevidst accept af op til 1 uges forsinkelse ved logoskift. Anbefaling: hash-filnavne (ingen cache-problem, kan senere sættes immutable) — men så skal manifestet være byggekilden.
- **Vægt**: mål < 6 KB pr. mærke-SVG (emblem/ordmærke; Benelli/Moto Guzzi/Indian/MV kan blive 20-80 KB som vektor -> forenkl eller tekstordmærke). 29 logoer x ca. 5 KB = ca. 150 KB, kun hentet ved behov (forside henter 6, ca. 30 KB). PNG-udkastene (8,5 MB) må ALDRIG udgives.
- **CLS**: fast slot med `width/height` (eller `aspect-ratio`) fra manifestet; nuværende `.maerke-grid:empty{min-height:150px}`/84 px og flisehøjde 96 px er allerede reserveret. Brug `--bl-w/--bl-h` fra manifestet, hvis logo er bredt (KTM 3.5:1). Ordmærke-logoer (KTM, Aprilia) kræver bredere slot end emblemer -> slot = max 56 x 28 px med `contain`.
- **Lazy**: logoer i fliser er små; brug `loading="lazy"` på `<img>` under folden (maerker.html A-Z-liste, evt. 29 stk.) og ingen preload. Forsidens 6 fliser ligger i bunden af første række -> lazy er fint; maske-teknikken er CSS og kan ikke lazy-loades, men filerne er små.
- **Kritisk CSS** (w12-kritisk, 8 familier, `scripts/kritisk-*.js`, `kritisk-manifest.json`): nye klasser i `styles.css` kan ændre den indlejrede kritiske CSS; kør `node scripts/build.js` (Orchestrator) og kontrollér at `.bl` ikke ligger over folden (forside: logofliser under folden OK; mærke-hero logo ligger OVER folden -> kritisk).
- **Lys/mørk**: ensfarvede `currentColor`-masker følger `--color-fg`/`-fg-muted`; farvelogoer kræver to sæt (mørkt/lyst) eller hvid kontur. Anbefaling: monokrome som standard; evt. farve ved `:hover`/på mærke-hero (kun hvis juridisk ok).
- **A11y**: kontrast mellem `fg-muted` og baggrund ≥ 4.5:1 for tekst; logo er dekorativt -> `aria-hidden`; flise har allerede `aria-label` med navn+antal.

**Leveringsformat-anbefaling**: (1) Original: officiel vektor (SVG/EPS/AI) fra godkendt kilde -> (2) i-huset normalisering til ensfarvet SVG (én `<path>`, `fill="currentColor"` kun hvis inline; til mask: sort fill), viewBox beskåret tæt (trim: AI-udkastene har 70-90 % tom margin), side-ratio i manifest -> (3) `img/brands/<slug>.svg` (+ `<slug>-lockup.svg`) -> (4) manifest med kilde/licens/hash -> (5) udgivet som cachebar statisk fil. WebP/PNG-fallback kun hvis kilden kun findes som raster (min. 2x af visningsstørrelse: 112 x 56 px for fliser, 480 px bred for hero; udkastene er 1254 px -> alt for store, resize til 400 px + oxipng, men vektor foretrækkes).

---------------------------------------------------------------------------------------------------

## 7. Koordination

`git worktree list`: 48 worktrees under `C:\Users\pasca\Desktop\rod\wt\` (soegning, annonce, opret, dashboard, login, facet, maerke, guides, w2…w12-*) + hovedmappen på `gauntlet/master` (70badc24). **Alle w12-strømme** (a11y, crawler, forside2, guides, kort2, kritisk, perf2) er rene (ingen uncommittede ændringer) og **allerede merget ind i gauntlet/master** (`git merge-base --is-ancestor` = ja for alle syv; integrationscommit kl. 14:00 "integration w12: …"). Seneste branch-commit er w12-perf2 kl. 13:30. Ingen strøm ser altså ud til at køre nu (kun hovedmappen har en ny untracked mappe: `docs/review/gauntlet/logo/`). `gauntlet/maerke` har lokalt kun ændret robots.txt/sitemap.xml (genererede filer). Kontroller før start, at ingen proces stadig skriver i wt-mapperne.

Delte filer et logosystem rører:
| Fil | Ejer (PARALLEL.md) | Hvorfor |
|---|---|---|
| `css/styles.css` (`.maerke-flise`, `.maerke-mono` l.1026-1039) | Orchestrator (delt lag, låst for strømme) | slot/mask-klasse + størrelsestokens |
| `js/components.js` | Orchestrator | evt. mærkemark i `listingCardHTML` (anbefales ikke), header uændret |
| `js/home.js` (l.349-355) | Orchestrator (forside) | erstat `.maerke-mono` med logo; `index.html` (`data-maerkesider`/evt. `data-logos`) |
| `index.html` | Orchestrator | evt. ny `<script src="js/brand-logos.js">` + CSP-hashes (build) |
| `scripts/build-brand-pages.js` | maerke | hero `.mk-mono` -> logo; maerker.html fliser + A-Z |
| `scripts/build-facet-pages.js` | facet | "populære mærker" i type/kørekort/region/model |
| `scripts/build-listing-pages.js`, `js/annonce.js`, `css/p-annonce.css` | annonce | logo ved annoncetitel |
| `js/search.js`, `css/p-soegning.css` | soegning | mærkefilter-ikon (valgfrit) |
| `scripts/build-guides.js` | guides | "Efter mærke"-liste (valgfrit, anbefales ikke) |
| `scripts/udgiv.js`, `scripts/stamp-version.js`, `scripts/build.js` | Orchestrator | uændret, men testes; build.js skal køres af Orchestrator (kritisk CSS/CSP-hashes) |
| `crawler/normalize.js` | (crawler) | KUN læsning; aliasser genbruges som kilde |

Foreslået opdeling i 4 uafhængige Builder-strømme (+ Orchestrator):

1. **LOGO-ASSETS & KILDER (ejer: `img/brands/**`, `img/brands/manifest.*`/`js/brand-logos-data.js`, `docs/review/gauntlet/logo/LOGO-KILDER.md`, `scripts/brand-logos.test.js`, SVG-sanitérer `scripts/svg-saniter.js`)**: hent/udarbejd officielle eller godkendte logoer -> ensfarvet, beskåret, minimeret SVG; manifest med kilde-URL, licens, hash, status; SVG-sikkerhedstest; slug/alias-tabel; fallback-regler. Ingen kald af sitekode. Afhænger af ejerens/juristens godkendelse (feature-flag).
2. **CENTRALT MODUL & DELT LAG (ejer: `js/brand-logos.js`, `scripts/brand-logos.js`, `css/p-logo.css` evt. + linje i `css/styles.css`; Orchestrator-godkendt)**: `logoFor/logoHTML`, `.bl`-maskeklasse, tokens, fallback-ordmærke, tests (`js/brand-logos.test.js`, bevar `monogram`-testen). Dette er den eneste strøm, der rører låste filer, og køres af Orchestrator-sporet.
3. **FORSIDE + SØGNING + ANNONCE-INTEGRATION (ejer: `js/home.js`, `index.html`, `js/search.js`, `js/annonce.js`, `scripts/build-listing-pages.js`, `css/p-forside.css`, `css/p-soegning.css`, `css/p-annonce.css`)**: forside-grid (6 fliser), mærkefilter-ikoner, annoncetitel-logo. Afhænger af 2.
4. **GENERATOR-SIDER (ejer: `scripts/build-brand-pages.js`, `scripts/build-facet-pages.js`, `scripts/build-guides.js`, `css/p-maerke.css`, `css/p-facet.css`)**: maerke-hero + CTA-panel-logo, maerker.html topfliser + A-Z (logo eller ordmærke), type/kørekort/region/model "populære mærker"-fliser. Afhænger af 2; må bygges parallelt mod en stub af `scripts/brand-logos.js`.

Rækkefølge: 1 og 2 først (parallelt, ingen filkonflikt), derefter 3 og 4 parallelt; Orchestrator kører `node scripts/build.js`, `npm run gate`, `npm run udgiv`, visuel regression. Risiko: `css/styles.css`/kritisk CSS og `index.html` er delte -> kun Orchestrator committer dem.

