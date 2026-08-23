# Runde 5 — forside, blind sammenligning mod Bilbasen.dk (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rollen er marketplace-UX-kritiker. Referencen er Bilbasen.dk's forside, den
navngivne best-in-class. Alt herunder er holdt op mod de hårde regler: CLAUDE.md
(aggregator — alt på siden skal være SANDT; i dag er 548 af 548 annoncer
indekseret fra forhandlere/markedspladser, 0 egne), `docs/review/DECISIONS.md`
"Låst" + "Afvist" (ingen opdigtet friskhed; "Nyeste annoncer" har en ærlig
tomtilstand, fordi indekserede annoncer ingen oprettelsesdato har — der
foreslås INGEN gættet dato her; ingen kuraterede mærkelister, der kan pege på
nul træf, jf. D-009/D-010) og `work/DECISIONS.md` (hero-tal fra lageret,
hero-tal = søgesidens tal, "Udvalgte" kræver foto, "Nyeste" er datorækkefølge).
Søgekortet (mærke/model-fritekst, type, maks. pris, kørekort A1/A2/A) er sitets
signatur og er behandlet som noget, der skal forbedres — ikke erstattes.

---

## Sådan er der målt (læs den her først, tallene afhænger af den)

**Kilden er de otte screenshots i `work/runde5/`**, læst som billeder og
målt med pixelscanning (PIL): `bilbasen-forside-m.png` (390×844),
`bilbasen-forside-m-full.png` (390×7 589), `bilbasen-forside-d.png`
(1366×850), `bilbasen-forside-d-full.png` (1463×4 384 — 97 px bredere end
viewporten, formentlig scrollbar + devicePixel-afrunding; y-tallene er brugt
som de er), og de fire tilsvarende `bikerbasen-forside-*` (390×844,
390×9 754, 1366×850, 1366×6 843).

**Målemetode.** Sektionsgrænser er fundet som luminansspring i en lodret
stribe ved sidens venstre kant (x 0–8 / x 20–25 / x 110); CTA-knapperne som
sammenhængende rækker, hvor >60 % af pixlerne i knapbæltet er mærkefarven
(Bilbasen #FF5A00-ish, os rust-orange). Alt andet er aflæst af billederne og
står med "≈". Fuldsidebilledet af Bikerbasen er 9 754 px, ikke de ≈10 300 px
opgaven nævner — forskellen er formentlig lazy-indhold, der ikke nåede at
tegne sig før capture (to af de tre "Dyrere modeller"-kort på mobil står
med tomt fotofelt, og ét af tre på desktop). Jeg har ikke regnet det som en
finding — det er en måleartefakt, ikke noget en bruger ser — men det
gentager sig i runde efter runde på MC Syd-billeder og bør tjekkes i en
rigtig browser (referrer/hotlink eller lazy-threshold).

**Kilde til lagertal.** `maerker.html` (genereret af
`scripts/build-brand-pages.js`) bærer de byggetidens mærkeantal: Honda 262,
Harley-Davidson 72, Yamaha 44, Suzuki 42, Triumph 27, BMW 26, Kawasaki 26,
KTM 13, Aprilia 7, Royal Enfield 7, Ducati 3, BSA 3, Indian 2, Husqvarna 1 …
og **ingen side for Vespa** (= 0 annoncer). Typetallene (Sport 20, Touring 53,
Cruiser 89, Naked 60, Adventure 67, Scooter 0, Classic 6, Cross 1 — og 252 af
548 uden type) er aflæst af fliserne på screenshottet. Kildetal: 4 aktive
YAML'er i `sources/` (guloggratis, jensensmc, mcsyd, rydbergsmc).

**Kildekode læst:** `index.html` (header, hero, søgekort, alle sektioner),
`js/home.js` (bid 1–7: hero-tal, chips, fliser, mærkesky, tryghedsbånd,
nyeste, featured), `css/styles.css` (`.hero`, `.search-panel`, `.search-row*`,
`.kk-*`, `.hero-trust`, `.tiles-grid`/`.tile`, `.steps`, `.sell-band`,
`.price-card`, `.popular-row`, `.seo-browse`, `.trust-*`, `.header-actions`,
`.theme-toggle`, `.fav-count`), `js/data.js` (`TYPES`, `BRANDS_BY_MODEL`),
`js/search.js:225-260` (mærkefacetten bygges af lageret, ikke af
`BRANDS_BY_MODEL`), `js/components.js:70-92` (hjertet skjules ved 0 gemte),
`js/backend-bridge.js:585-596` (`createdAt: null`, `indekseretFoerste`).

---

## 1. Blind dom

**Bilbasen vinder på begge skærme, og det er ikke tæt — men ikke af den grund,
man tror.** Vores hero er faktisk bedre: rigtigt foto i stedet for en
OK-ladeboks-annonce, fire felter i stedet for otte, kørekortvælgeren er et
rigtigt svar på et rigtigt spørgsmål, og den primære knap står 38 px højere
på mobil (≈658 mod ≈696) og 40 px højere på desktop (≈603 mod ≈643).
Bilbasen vinder, fordi **alt under hero'en er lager**: ≈30 annoncekort på
mobil i tre gitre før SEO-blokken, mod **2** hos os (3 på desktop) — begravet
≈4 300 px nede efter otte typefliser, tre købetrin, et sælgerbånd med priskort,
en mærkesky uden tal og en sektion, der bruger ≈670 px på at forklare, at den
er tom. En køber, der ruller én skærm ned hos Bilbasen, ser biler; hos os ser
han en flise for "Scooter" med tallet 0. På desktop er forskellen samme
historie i en kortere side: Bilbasen 4 384 px med lager fra y≈1 200; vi
6 843 px med første annoncekort ved y≈2 840.

## 2. Pixelfakta

| | Bilbasen 390 | Bikerbasen 390 | Bilbasen 1366 | Bikerbasen 1366 |
|---|---|---|---|---|
| Header | 0–56, hvid, fast | 0–68, transparent oven på foto | 0–80, hvid | 0–68, transparent |
| Hero (til og med søgeformularens sidste række) | kort 72→≈765 = **≈690 px** (hele det hvide kort inkl. "Populære søgninger"-fliser: 72→1 012 = 940) | 0→900 = **900 px** (foto-bg slutter y 900; søgekort 251→758 = 507 px) | annonce 80→260, søgekort 275→≈680; header-bund→formularens bund = **≈600 px** | 0→865 = **865 px** (søgekort 420→755) |
| y for primær CTA ("Vis N …") | **674–717**, centrum ≈696 | **632–683**, centrum ≈658 | **622–665**, centrum ≈643 | **577–628**, centrum ≈603 |
| Antal formularfelter i hero | **8** kontroller (fritekst + Personbil, Mærke, Model [disabled indtil mærke], Årgang, Kørte km, Drivmiddel, Køb/Leasing, Pris) + søg-ikonknap + CTA + "Nulstil"/"Udvidet søgning" | **4** kontroller (fritekst, Type, Maks. pris, Kørekort-segment à 4) + CTA + 5 chips + hjælpelinje | 8 (samme, 2 rækker à 4) + CTA + Nulstil/Udvidet | 4 (1 række à 3 + segment) + CTA + 5 chips |
| Synligt under hero'en i første skærm | ja: "Nulstil/Udvidet" + toppen af 6 fotofliser (Elbil, Privatleasing…) fra y≈800 | **nej** — skærm 844 slutter midt i hero-trust-listen (795–860); "Søg efter type" begynder y≈975 | ja: "Populære søgninger" + ≈100 px af fotofliserne (725–850) | **nej** — hero til 865; næste overskrift y≈945 |
| Første annoncekort (y) | ≈1 530 | **≈4 340** | ≈1 200 | **≈2 840** |
| Annoncekort på forsiden (ca.) | ≈30 (14 + 12 + 4) | **2** | ≈28 | **3** |
| Sidehøjde i alt | **7 589** | **9 754** (+29 %) | **4 384** | **6 843** (+56 %) |

Sektionsrækkefølge og -længde hos os på 390 px (≈): hero 0–900 · Søg efter
type 900–1 700 (8 fliser, ≈800) · Sådan køber du trygt 1 700–2 560 (≈860) ·
Sælg din motorcykel + priskort 2 560–3 450 (≈890) · Populære mærker
3 500–4 080 (≈580) · Dyrere modeller 4 130–5 410 (2 kort, ≈1 280) · Nyeste
annoncer, tomtilstand 5 470–6 140 (≈670) · Tryghed 6 170–6 900 (≈730) ·
SEO-bånd 7 000–7 700 · facet-chips 7 720–8 420 · CTA-bånd 8 430–8 780 ·
footer 8 850–9 754. **Sælgerrettet indhold (sælgerbånd + priskort + CTA-bånd
+ hero-trust's "Gratis annonce for private") ≈ 1 300 px på en side, hvor 0 af
548 annoncer er oprettet af sælgere hos os.**

## 3. Findings

| ID | sev. | fil / selector | måling (os) | hvad Bilbasen gør | konkret fix |
|---|---|---|---|---|---|
| **D5-F1** | **P1** | `index.html` sektionsrækkefølge; `js/home.js` bid 6 (`medDato`, tomtilstanden) + bid 7 (`kandidater`, `tegnFeatured`, `maks`); `css/styles.css` `.listings-grid` | **Forsiden viser 2 annoncer af 548 på mobil (3 på desktop), første kort y≈4 340 / ≈2 840.** "Nyeste annoncer" bruger ≈670 px (mobil) / ≈600 px (desktop) på en tomtilstand, der korrekt siger, at vi ikke kender nogen dato. "Dyrere modeller" vælger kun blandt annoncer ≥ medianen (119 800 kr.) med foto — 248 kandidater — og viser 2/3 af dem. | `bilbasen-forside-m-full.png` y≈1 500–4 500: tre rene gitre ("Brugte biler til salg på Bilbasen" 14 kort, "Brugte private biler" 12, "Seneste biler" 4) med foto + pris + titel/årgang/km, "Se flere biler"-link under hvert. Overskrifterne lover ingenting ud over "til salg". | (a) **Skjul `#newest-listings`-sektionen på forsiden, når `medDato.length === 0`** (D-005's udgang (a); forklaringen står allerede i tomtilstanden og hører til på søgesiden — ikke på det dyreste sted på sitet). Ingen dato opfindes; sektionen vender selv tilbage, den dag en annonce har `createdAt`. (b) **Erstat "Dyrere modeller" med "Til salg lige nu"**: samme `harFoto && harModel`-kriterium, **uden** `price >= median`, i `Sortering.blandetRaekkefoelge` (samme rækkefølge som søgesidens standard, så rubrikken er dækket) — 8 kort på ≥1240, 6 på 3 spalter, 4 på mobil (i dag 2; `maks = cols === 1 ? 2 : …` → 4). Underrubrik skrevet fra data som i dag: "Et udsnit af de N annoncer med foto — samme rækkefølge som i søgningen." (c) Flyt sektionen **op lige under hero'en**, før typefliserne. Forventet: første kort fra y≈4 340 → ≈1 000 på mobil. |
| **D5-F2** | **P1** | `js/home.js:375-395` (`POPULAR_BRANDS`, `KNOWN`, `brandCloud`, `fillSeoCol('seo-brands')`); `index.html` "Populære mærker" underrubrik | `POPULAR_BRANDS` filtreres mod `BRANDS_BY_MODEL` (kendte mærker), **ikke mod lageret**. Resultat på drift: **Vespa → 0 annoncer** (ingen `maerke-vespa.html` findes), Husqvarna → 1, Indian → 2, Ducati → 3 — 4 af 12 chips er blindgyder eller næsten. **Harley-Davidson (72 annoncer, lagerets nr. 2) er ikke med.** Underrubrikken "de mærker, danske bikere søger mest" bygger på ingen data — vi har ingen søgevolumen. Det er præcis det mønster, D-009/D-010 lukkede på `maerker.html` (44 af 60 nul træf) — det lever videre på forsiden. SEO-kolonnen "Populære mærker" (`seo-brands`) arver de samme 8. | `bilbasen-forside-m-full.png` y≈5 100–6 000: "Brugte Audi / BMW / Citroën …" med 5 modeller hver, og et mærkebånd. Bilbasen har volumen til, at alt peger på træf; vi har ikke, så vi må lade lageret vælge. | Byg listen af lageret, som `js/search.js` allerede gør for facetten: tæl `brand` over `ALLE`, sortér faldende, tag de første 12 med **≥ 2** annoncer, og skriv tallet på chippen (`<span class="brand-chip-n">72</span>` — `.facet-n`-mønsteret findes). Omdøb til **"Mærker med flest annoncer"**, underrubrik "Tallet er antallet til salg lige nu." Link til `maerke-<slug>.html`, hvor siden findes (bedre scent og SEO end `soegning.html?brands=`), ellers søgningen. Lad `seo-brands` bruge samme liste. Nul-chips må aldrig tegnes. |
| **D5-F3** | **P1** | `index.html:215-231` + `js/home.js:325-370` (`tilesMount`, `fyldTypeAntal`); `css/styles.css:709-741` (`.tiles-grid`, `.tile`) | Otte fliser à ≈190 px i 2 spalter = **≈800 px på mobil**, den første sektion under folden. Tre af otte døre er tomme eller næsten: **Scooter 0, Cross/MX 1, Classic/Veteran 6** — og 252 af 548 (46 %) har ingen type, så fliserne dækker 296 annoncer. Flisen "Scooter 0" er et klikbart link til et søgeresultat med nul træf — samme blindgyde som D-010, bare med ærligt tal på. | `bilbasen-forside-m-full.png` y≈800–990: "Populære søgninger" er **én vandret rulleliste** af 6 fotofliser (≈190 px høj) inde i søgekortet, ingen tal, ingen tomme indgange. Desktop (`-d.png` y 725–935): 6 fliser på én række. | (1) **Tegn ikke fliser med n === 0** (`fyldTypeAntal`: `tile.hidden = n === 0`), og sortér fliserne efter antal faldende — Cruiser 89 først, Cross 1 sidst. (2) På ≤639 px: `.tiles-grid{ grid-auto-flow:column; grid-auto-columns:minmax(150px,1fr); overflow-x:auto; scroll-snap-type:x mandatory }` → sektionen falder fra ≈800 til ≈260 px, og "Til salg lige nu" (F1) rykker op. (3) Behold tallet på flisen og den ærlige underrubrik om de 252 — det er vores, og Bilbasen har det ikke. Ingen type gættes. |
| **D5-F4** | **P2** | `css/styles.css:553-597` (`@media (max-width:760px) .hero p.lead{display:none}`), `index.html:122-136` (`.hero-eyebrow`, `h1`, `.hero-count`, `.lead`), `.hero-trust` | Den sætning, der gør hero'en sand — "Motorcykler til salg fra forhandlere og markedspladser i hele landet — samlet ét sted" — er **skjult på ≤760 px**. På mobil (`bikerbasen-forside-m.png`) står der derfor: "Kun motorcykler — intet andet / Danmarks markedsplads for motorcykler / 548 motorcykler til salg / [søgekort] / Gratis annonce for private / Kontaktinfo skjult for udloggede". Det læses som et klassisk annoncehost — på en side, hvor 548 af 548 annoncer ligger hos andre. Første tillidspunkt er oven i købet sælgertale. | `bilbasen-forside-m.png` y 100–230: h1 + "50.355 annoncer i dag" — én linje, ét tal, og tallet er sandt for dem. | Sæt sandheden ind i den linje, der ER synlig på mobil: `.hero-count` → "**548** motorcykler til salg hos **4** danske forhandlere og markedspladser" (antal kilder regnes af `ALLE` som i `skrivFeaturedSub`; ingen hårdkodning). Så kan `.lead` blive skjult på mobil uden tab. Skift `.hero-trust` til køberfakta, der gælder hver eneste annonce: "Kilden står på hvert kort" · "Kørekort A1/A2/A vurderet ud fra hk og ccm — aldrig gættet" · "Mangler et tal, står der 'Ikke oplyst'". "Gratis annonce for private" hører til i sælgerbåndet, ikke over folden på en køberside. |
| **D5-F5** | **P2** | `index.html:232-280` (`.steps`), `:282-321` (`.sell-band` + `.price-card`), `:488-500` (`.cta-band`); `css/styles.css` `.steps`, `.sell-band`, `.price-card`, `.cta-band` | ≈860 px "Sådan køber du trygt" + ≈890 px sælgerbånd med 0-kr.-priskort + ≈360 px CTA-bånd = **≈2 100 px prosa på mobil**, to sælger-CTA'er på samme side, og trin 1 påstår "Gem favoritter" — men ingen af de 548 annoncer kan gemmes (D-008: fremmednøglen i `favorites` peger på `listings`, hjertet er derfor skjult i headeren). Trin 1 lover noget, 100 % af lageret ikke kan. | `bilbasen-forside-m-full.png` y≈1 030–1 480: ét sælgerkort ("Sælg din bil på Bilbasen", 1 knap, ≈220 px) + ét partnerkort. Ingen købeguide på forsiden, intet priskort. | (1) Fjern "Gem favoritter og" fra trin 1, eller — bedre — flyt hele `.steps` til `sikkerhed.html` og lad forsiden nøjes med `#trust-strip` (som siger det samme kortere). (2) Slå `.sell-band` og `.cta-band` sammen til ÉT bånd nederst (behold `.sell-band`, slet `.cta-band`), og `display:none` på `.sell-band-art` under 820 px — priskortet er ≈300 px for at sige "0 kr." to gange. Netto ≈ −1 400 px på mobil uden at fjerne én oplysning, der ikke står et andet sted på siden. |
| **D5-F6** | **P2** | `index.html:139-148` (`#hs-query`), `js/home.js:74-76`, `:297` (live-tælling); `js/data.js:119` (`BRANDS_BY_MODEL`) | Fritekstfeltet har ingen forslag (ingen `<datalist>`, ingen combobox). Placeholder "f.eks. Yamaha MT-07" — der er ingen garanti for, at lageret har én. Knappen tæller godt nok live ("Vis 0 motorcykler" advarer), men en førstegangskøber får ingen hjælp til, at 262 af 548 er Honda, og at "Nightster" hedder "RH975 Nightster" hos kilden. **Cascading Mærke→Model à la Bilbasen:** data støtter **Mærke** (lageret bærer `brand`; `js/search.js` bygger allerede facetten af lageret). **Model** støttes kun, hvis listen bygges af lagerets `model`-strenge — `BRANDS_BY_MODEL` er en statisk liste ("Nightster", "XV 1900" findes ikke i den), og en model-select derfra ville producere nul-træf-kombinationer, præcis det D-009 forbyder. | `bilbasen-forside-m.png` y 258–300: fritekst + søgeknap, derunder "— eller —" og Mærke → Model (Model disabled, indtil mærke er valgt), "Nulstil" + "Udvidet søgning" under CTA'en. | Behold fritekst som signatur, og giv den hjælp uden at gøre hero'en højere: **`<datalist id="hs-suggest">` fyldt fra lageret** — distinct `brand` og `brand + ' ' + model` med ≥1 annonce — i bid 5, når `dataKlar`. Det er ≈10 linjer og koster 0 px. Bilbasens "eller"-divider + Mærke/Model-selects anbefales **ikke** i hero'en på mobil (+≈120 px på en hero, der allerede er 900); vis dem i stedet kun ≥700 px som en tredje række under `.search-row-2`, begge bygget af lageret med tal i option-teksten ("Honda (262)"), Model `disabled` indtil mærke er valgt. Tilføj "Nulstil" som tekstlink ved siden af CTA'en (`type="reset"`, nulstiller også segmentet) — det mangler, og kørekortsegmentet har ingen anden vej tilbage til "Alle" end at klikke "Alle". |
| **D5-F7** | **P3** | `index.html:82-95` (`.header-actions`), `css/styles.css:414-453` (`.theme-toggle`, `.mobile-menu-btn`, `.fav-count[data-count="0"]`), `js/components.js:85-92` | På mobil viser headeren **kun måne-ikon + burger** (hjertet er skjult ved 0 gemte, login ligger i skuffen). Tema-skift er en indstilling, ikke en opgave — den optager 44 px af de to slots, en køber kan nå med tommelfingeren, og den sidder på et foto, hvor et måne-ikon ligner dekoration. På desktop står den som ensomt ikon mellem "Søg motorcykler" og "Log ind". | `bilbasen-forside-m.png` y 0–56: profil + hjerte + menu — altid de samme tre, altid kontoindgang synlig. Desktop: "Log ind · Favoritter · Kundeservice · Menu". | Flyt `.theme-toggle` ind i `.mobile-drawer-panel` (og i footeren på desktop, hvor sitet har sin "Om"-kolonne). Sæt profil-ikonet (`data-auth-slot`, samme SVG som i dag) i headeren på mobil i stedet — det er kontoindgangen, ikke et tema, Bilbasen og resten af kategorien holder fast i. Hjertet bliver skjult, som D-008 bestemte; det er rigtigt, for det kan ikke virke på lageret. |

## 4. Kopiér IKKE fra Bilbasen

1. **Annoncetakeover over søgekortet** (`bilbasen-forside-d.png` y 80–260 + sidebanner, "OK-ladeboks"): 180 px reklame før første felt. Vi har ingen annoncører, og vores foto-hero er den ene ting, vi vinder blindt på. Lad være.
2. **Køb/Leasing-toggle og "Privatleasing/Erhvervsleasing"-fliser**: vi har intet leasinglager og ingen leasingpriser i feltlisten (CLAUDE.md regel 2). En toggle, der altid står på "Køb", er et felt uden funktion.
3. **Solgt.com-"garantipris"-kort, bilfinansiering, nyhedsbrev-bånd** ("Få tips og guides i din indbakke"): vi har ingen partner, ingen finansiering og intet nyhedsbrev. Et felt, der tager en e-mail, vi ikke kan sende til, er præcis den type løfte, "Ærlighed slår fuldstændighed" forbyder.
4. **"Danmarks største markedsplads for biler" / "over 700.000 potentielle købere ugentligt"**: størrelses- og rækkeviddepåstande, vi ikke kan måle og ikke kan dokumentere. Vores h1 bør forblive uden superlativ — og sætningen om kilderne (F4) er vores version af troværdighed.
5. **"Seneste biler på Bilbasen"-sektionen**: de har en oprettelsesdato, vi har `createdAt: null` på 548 af 548. Sektionen er låst som ærlig tomtilstand (D-005, 18.08.2026); forslaget i F1 er at SKJULE den på forsiden, ikke at fylde den med en crawldato.

## 5. Den ene ændring

**Sæt lageret under hero'en: skjul den tomme "Nyeste", drop prisgrænsen i "Dyrere modeller", og vis 4/8 rigtige annoncekort i søgesidens rækkefølge som første sektion — så første kort står ved y≈1 000 i stedet for ≈4 340 (D5-F1).** Det er forskellen på "en marketplace" og "en brochure for en marketplace", og det er dét, den blinde dom i dag tabes på.
