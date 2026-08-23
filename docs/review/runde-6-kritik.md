# Runde 6 — blind efterprøvning af runde 5 mod Bilbasen.dk (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rollen er marketplace-UX-kritiker. Sæt A er Bilbasen.dk (`work/runde5/bilbasen-*`),
sæt B er Bikerbasen.dk EFTER runde 5's rettelser (`work/runde5/efter/bikerbasen-*`).
Før-billederne i `work/runde5/bikerbasen-*` er kun brugt til at se, hvad der er
ændret (bemærk: de er ikke identiske med de mål, runde 5 skrev — forsiden er
8 065 px i mappen mod 9 754 px i rapporten; der er åbenbart optaget igen).

Alt er holdt op mod de hårde regler, læst først: `CLAUDE.md` (aggregator; 548 af
548 annoncer er indekseret fra 4 forhandlere/markedspladser, 0 egne; intet på
siden må påstå noget, tallene ikke bærer), `docs/review/DECISIONS.md` (låst:
"Ærlighed slår fuldstændighed", "Kilden ejer sine billeder", D-005 ingen opdigtet
dato, D-008 ingen favorit på eksterne, D-009/D-010 ingen links til nul træf,
B3 ingen proxy/silhuet; D5-F1 og D5-F6 er nu selv beslutninger) og
`work/DECISIONS.md` (hero-tal = søgesidens tal, "Blandet udbud" er målt og låst,
`.card-specs`-højden er låst, "Sortér:" er en synlig etiket, 16:10 kun på `.srp`).
Runde 5's tre rapporter og `docs/review/rounds/round-5.md` er læst som påstande,
der skal efterprøves på B-billederne — ikke som facit.

---

## 0. Sådan er der målt

Billederne er læst som billeder (Read) og målt med PIL: brand-farvede rækker
(Bilbasen `#FF4D00`, Bikerbasen `#C6420E`) for primære knapper; luminansspring i
lodrette striber (x 17–20 og x 200/300) for sektions- og kortgrænser; mørke
tekstrækker (x 16–300) for titel/pris. Viewports 390×844 og 1366×850. Tallene
er ±4 px for kanter, ±6 px for tekst; "≈" hvor jeg har aflæst i stedet for
målt. Bilbasens fuldsider er 1463/1495 px brede (takeover sprænger vinduet);
y-tallene stemmer med viewport-billederne og er brugt direkte.

**To måleartefakter, der IKKE er dømt som design, men som gentager sig:** (1)
grå, tomme fotofelter på kort under folden i fuldsideoptagelser (lazy-load, der
ikke nåede at tegne) — men i runde 6 står de nu også i "Til salg lige nu",
1 af 4 på mobil og 3 af 6 på desktop, altså på det sted, runde 5 flyttede
lageret op til (se D6-F1); (2) 494 px tom flade UNDER footeren på
desktop-forsiden (før: 574 px) — se D6-F8.

---

## 1. Blind dom pr. side og skærm

Dommen er afsagt på billederne, før kode blev åbnet. "Tæt på" er ikke en dom,
så hver celle har en vinder.

| Side / skærm | Vinder | Hvorfor — det, en blind dommer ser først |
|---|---|---|
| **Forside, mobil** | **Bilbasen, snævert** (runde 5: klart) | Vores første skærm er nu den bedste af de to: foto-hero, fire felter, CTA ved 655–706 mod deres 674–717, og "548 motorcykler til salg hos 4 danske forhandlere og markedspladser" er en sand sætning over folden. Første annoncekort står ved **1 158** mod deres ≈1 530 — vi vinder på tid-til-lager. Bilbasen vinder alligevel på to ting: **tæthed** (14 + 12 + 4 kort i 2-spaltede gitre à ≈95 px pr. kort; vi 4 kort à ≈475 px = 1 880 px for fire annoncer) og **ét gråt kort af fire** (Aprilia RSV 1000, y≈2 110–2 380: tomt fotofelt). En marketplace med fire kort, hvoraf ét er tomt, taber til en med tredive. |
| **Forside, desktop** | **Bilbasen, snævert — og kun på grund af billedet** | Uden reklamen er vores hero renere (ingen OK-ladeboks over formularen, CTA 577–627 mod 623–664), og første kort står ved **1 017** mod ≈1 200. Men anden række af "Til salg lige nu" er **tre grå felter af seks** (y 1 510–1 790). Den dommer, der ser billedet, ser en forside, hvor halvdelen af lageret ikke har fotos. Med fotos vinder vi desktop-forsiden; med billedet, som det er, gør vi ikke. |
| **Søgning (SRP), mobil** | **Bikerbasen, snævert** — første gang | Kortets rytme er nu Bilbasens uden at være kopieret: foto → pris → navn → chips → sted. Første kort 303 mod 284, men første **pris 549–563 mod 684–696** (135 px højere), og andet korts top er over folden (≈738) — Bilbasen viser 1,1 kort pr. skærm, vi 1,8. Det, der trækker fra: **to klippede tekster på første skærm** ("Søg efter mæ…" i søgefeltet, "Blandet udb" i vælgeren) og at side 1 stadig er 24 × MC Syd · Rødding · Kørekort A — et forhandlerkatalog, hvor Bilbasens tre første kort har tre forhandlerlogoer. |
| **Søgning (SRP), desktop** | **Bikerbasen, klart** | Første kort **335 mod 527**, første pris ≈575 mod ≈876, ingen takeover, filtre med tal i en sidebar, hvor Type nu står ved 527 (før 672). Bilbasens kort ser stadig en anelse "dyrere" ud (logo, galleri-prikker), men det er aktiver, vi ikke må have (regel 2). Eneste synlige fejl: kildelinjen over gitteret ombryder til to linjer med "+2 kilder" alene på linje 2, og kortfoden klipper BEGGE led på Gul og Gratis-kortet ("Svendb…" / "guloggrati…", y≈2 090). |
| **Annonce (VDP), mobil** | **Bilbasen, klart** | Vores første skærm er blevet meget bedre (flag 38 px, titel 516, pris 616–636 mod deres 743, handlingsrække) — og så er der **ingen primær knap på den**. Bilbasen har tre handlinger ved 77–165; vi har "Sammenlign · Del · Meld fejl" og en sticky bjælke, der er sat til at gemme sig, så længe prisblokken er i billedet — altså netop på første skærm. "Se annoncen hos MC Syd" står første gang ved ≈2 770. En annonceside, hvor man ikke kan se, hvordan man kommer videre til annoncen, taber til en, hvor det er det første, man ser. |
| **Annonce (VDP), desktop** | **Bikerbasen, snævert** | CTA 235–283 mod 311–350, titel 584 og pris 698 over folden mod deres 950/978 under den; ingen 190 px tom annonceplads. Bilbasen vinder højre spalte (logo, "46 annoncer", adresse, hjemmeside — ting at GØRE); vores stopper ved 765 og efterlader 2 700 px tom spalte under sig. Og nøgletalsgitteret, vores trumf, står ved 866–1 035 med en enlig "Effekt"-celle og tre tomme grå felter ved siden af. |

Samlet: 3–3 på celler, men Bilbasen har de to sider med størst vægt på mobil
(forside, annonce). Det, der skiller, er ikke længere struktur — det er fire
konkrete ting: grå kort på forsiden, ingen CTA på annoncesidens første skærm,
to klippede tekster på søgesiden, og tæthed på mobilforsiden.

---

## 2. Pixelfakta (A = Bilbasen, B = Bikerbasen efter)

### Forside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Header | 0–56 hvid | 0–68 transparent | 0–80 | 0–68 |
| Hero (til og med sidste formularrække) | kort 72→≈765 | 0→**923** (kort 272→775, hero-trust 795–900) | ≈600 | 0→**865** (kort 420→755, trust 790) |
| Primær CTA (y) | 674–717 | **655–706** | 623–664 | **577–627** |
| Synligt under hero i første skærm | fotofliser fra 800 | nej (hero-trust til 900) | fliser 750–935 | nej (hero til 865) |
| Første annoncekort (y) | ≈1 530 | **1 158** (før ≈4 340) | ≈1 200 | **1 017** (før ≈2 840) |
| Annoncekort på siden | ≈30 (14+12+4), 2-spaltet | **4**, fuld bredde, ≈475 px pr. kort; **1 af 4 uden foto i optagelsen** | ≈28, 4-spaltet | **6** (2×3); **3 af 6 uden foto i optagelsen** |
| Sidehøjde | 7 589 | **7 876** (før 8 065 i mappen / 9 754 i runde 5) | 4 384 | **5 948** — heraf 494 px tom flade under footeren (footer 5 083–5 454) |

Sektioner hos B (390, ≈): hero 0–923 · Til salg lige nu 985–3 040 (4 kort) · Søg
efter type 3 180–3 440 (vandret stribe, 7 fliser, flest først) · Mærker med flest
annoncer 3 500–4 010 (12 chips med tal) · Tryghed 4 130–4 900 · SEO-bånd
4 950–5 630 · facet-chips 5 700–6 280 · Sælg din motorcykel 6 330–6 900 · footer
7 050–7 876. "Sådan køber du trygt", priskortet på mobil, CTA-båndet og den tomme
"Nyeste annoncer" er væk.

### Søgeside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Rækker over listen | 4 | **5** (brødkrumme · h1 · søg+klokke+Filtre · antal (2 linjer) · Sortér+visning) | — | — |
| Filtre-knap | 72–119, fyldt | **131–175, fyldt** | "Alle filtre" 285–330 | sidebar |
| Første kort (y) | 284 | **303** (før 394) | 527 | **335** (før 398) |
| Første pris (versalhøjde) | 684–696 | **549–563** (før 673–687) | ≈876 | ≈575 |
| Kortafstand | ≈525 | **≈435** (før ≈498) | — | — |
| Kortet viser | logo · foto 4:3 · titel · pris · 4 grå chips · sted | foto 16:10 · **pris** · titel · type · chips (år · km · ccm · Kørekort A som kontur) · by · "Forhandler · mcsyd.dk" | — | samme, kørekortchip på egen række i 280 px |
| Sidebar: Type / Pris (y) | — | — | — | **527** (før 672) / **841** |
| Sidehøjde | 17 647 | **12 370** (før 14 214) | 6 540 | 5 127 |

### Annonceside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | **77–116** (+2 til 165) | **ingen i viewport** — sticky skjult mens prisblokken er synlig; i flow ≈2 770 | 311–350 | **235–283** |
| Varsel før fotoet | 0 | flag **118–156 (38 px)** (før 112 px) | 0 (+190 px tom annonceplads) | 0 (flag skjult ≥960) |
| Foto | 213–507 | 182–445 | 311–795 | 128–528 |
| Titel / pris | 638 / 743 | **516 / 616–636** (før 628 / 722) | ≈950 / ≈978 (under folden) | **584 / 698** (før 728 / 835) |
| Nøgletal (Kørekort først) | detaljer ≈1 090+ | gitter fra ≈800 (kun overkanten over 844) | — | **866–1 035** (under folden; 5 celler i 4 spalter) |
| Højre spalte slutter | — | — | ≈2 350 af 5 194 | **≈765 af 3 530** |
| Sidehøjde | 7 845 | 5 926 | 5 194 | 3 530 |

---

## 3. Runde 5's findings — én for én, med bevis fra B-billederne

| ID | Status | Bevis |
|---|---|---|
| D5-F1 Lager under hero'en | **lukket** | "Til salg lige nu" lige under hero'en; 4 kort på 390 (første 1 158), 6 på 1 366 (1 017; 3 spalter ved 1 366 giver 6, ikke de 8 runde-5-loggen skriver). "Nyeste" er væk. Underrubrik fra data ("Fire af de 535 annoncer med foto og modelnavn — samme rækkefølge som i søgningen, højst én pr. mærke"). Men: grå fotofelter i 1/4 og 3/6 af kortene i optagelsen → D6-F1. |
| D5-F2 Mærker fra lageret | **lukket** | "Mærker med flest annoncer", Honda 262 … Ducati 3, tal på chippen, Harley-Davidson med, ingen Vespa. SEO-kolonnen arver listen. Kosmetisk: "Bsa" (→ D6-F7). |
| D5-F3 Typefliser | **lukket** | 7 fliser, Scooter væk, flest først, vandret stribe på mobil (≈121 px). Men SEO-kolonnen "Motorcykeltyper" lister stadig Scooter (0) → D6-F3. |
| D5-F4 Sandheden over folden på mobil | **lukket** | "548 motorcykler til salg hos 4 danske forhandlere og markedspladser"; hero-trust er købrfakta ("Kilden står på hvert kort" · "Kørekort … aldrig gættet" · "Mangler et tal, står der 'Ikke oplyst'"). |
| D5-F5 Prosa og to sælger-CTA'er | **lukket** | "Sådan køber du trygt" væk, ét sælgerbånd nederst, priskort skjult på mobil. Men båndets nye overskrift påstår rækkevidde → D6-F2. |
| D5-F6 Søgehjælp | **lukket (delvist udsat med begrundelse)** | `<datalist>` + Nulstil bygget (ikke synligt på billeder, dokumenteret i DECISIONS "D5-F6 delvist udsat"); cascade bevidst udsat til ≈2 000 annoncer. Accepteret. |
| D5-F7 Tema-knap i headeren | **delvist** | Mobil: profil + burger, tema i skuffen ✓. Desktop: månen står stadig alene mellem "Søg motorcykler" og "Log ind" (`bikerbasen-forside-d.png` x≈1 123) → D6-F5. |
| D5-S1 Otte rækker over listen | **lukket — med to bivirkninger** | Søg + klokke + Filtre (fyldt) i én række, sortering + visning i én række, kildelinje kompakt "548 indekseret fra 4 kilder (i)". Første kort 394 → 303. Men: option-teksterne blev IKKE kortet, så vælgeren klipper "Blandet udb", og søgefeltets placeholder klipper "Søg efter mæ…" → D6-S1. Overskriften er stadig to linjer → D6-S2. |
| D5-S2 Kildestriben | **lukket** | Ingen stribe; kilden står én gang i foden med eksternt-link-ikon ("Forhandler · mcsyd.dk"). Foto 34 px højere. |
| D5-S3 Kørekortchippens vægt | **lukket** | Kontur-chip "Kørekort A" i spec-rækken; prisen er det tungeste på kortet. Fyld på A1/A2 kan ikke ses på side 1 (alle A) — ikke efterprøvet, ikke modbevist. |
| D5-S4 Specs som chips | **lukket** | "2025 · 5.500 km · 1.000 ccm · Kørekort A" som én 24 px-række på 390; ombryder til to på 280 px desktop som beskrevet. |
| D5-S5 Sidebar-prosa | **lukket** | Hint 2 er nu `<details>` "Hvorfor er A hele lageret?"; Type ved 527 (mål ≈500), Pris-gruppens overskrift ved 841 — lige på folden, ikke over → D6-S7. |
| D5-S6 Sorteringsnote | **lukket** | Linjen er skjult på side 1 (0 uden foto); (i) sidder i sort-feltet. |
| D5-S7 Bundlinjen | **delvist** | By alene ("Rødding") ✓. Men i 280 px desktop-spalten klipper Gul og Gratis-kortet BEGGE led: "Svendb…" og "Privat sælger · guloggrati…" (`bikerbasen-srp-d-full.png` y≈2 090) → D6-S3. |
| D5-A1 112 px flag | **lukket** | Én linje, 38 px ("Annonce hos MC Syd — det er dem, du køber af"), skjult ≥960. |
| D5-A2 Kørekort under bjælken | **delvist** | Gitter med Kørekort som første celle, flyttet op under prisen ✓; etiket på linje med tallet ("124.800 kr. hos MC Syd") ✓; figcaption én linje ✓. Men målet — pris, kørekort, årgang, ccm, hk på første skærm — er ikke nået: gitteret begynder ≈800 på 390 (kun overkanten over 844) og 866 på 1 366 (under 850) → D6-A3. |
| D5-A3 Højre spalte | **ikke lukket** | Brødteksten er stadig tre sætninger inkl. "Pris og udstyr kan være ændret …" (står også under "Før du kører derhen"); datoen er stadig fodnote ("Annoncen blev hentet hos MC Syd 16. aug. 2026"); "Søg videre" er fire links uden tal, chevron eller linkfarve (`bikerbasen-vdp-d.png` 560–720). Ikke nævnt i round-5.md. → D6-A2. |
| D5-A4 Handlingsrække | **lukket** | "Sammenlign · Del · Meld fejl" under prisen (mobil 757, desktop 826). |
| D5-A5 Lignende | **lukket** | Rangeret: "Lignende: Honda · 650 ccm–1.350 ccm · 75–175 t.kr.", tre CB 1000 Hornet/CB 650 R til en CB 1000 Hornet. (Kosmetik → D6-A6.) |
| D5-A6 UUID i tabellen | **lukket (minimum)** | `js/annonce.js:612`: rækken kun ved id ≤ 12 tegn. "Ref. hos …"-linjen i kildekortet er ikke bygget — acceptabelt. |
| D5-A7 Bjælke uden oplysning | **lukket som foreslået — og forslaget var forkert på mobil** | Bjælken bærer prisen og viser sig først, når prisblokken er rullet ud. Konsekvens: første skærm på 390 har ingen primær knap → D6-A1. Det er runde 5's forslag, der skal rettes, ikke dev's udførelse. |

**Tælling: 15 lukket, 4 delvist (F7, S7, A2, A7-konsekvens), 1 ikke lukket (A3), 1 lukket med dokumenteret udsættelse (F6).**

---

## 4. Nye findings — det, der nu afgør blinddommen

Severity: P1 = falsk/udokumenteret påstand, funktion virker ikke som lovet, AA-brud;
P2 = mærkbar forskel til Bilbasen med konkret konsekvens; P3 = kosmetisk.

### Forside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D6-F1** | **P2** | `js/home.js` `kortHTML` (indeks forskudt +1, så intet kort er eager — jf. work/DECISIONS "Kun hero-fotoet er eager"), `js/components.js` `listingMediaHTML()` | **1 af 4 kort på mobil og 3 af 6 på desktop står med gråt, tomt fotofelt** i "Til salg lige nu" (`efter/bikerbasen-forside-m-full.png` 2 110–2 380; `-d-full.png` 1 510–1 790). Hverken foto eller fejlfeltet ("Fotoet kunne ikke hentes hos kilden") er tegnet — altså er `loading="lazy"` ikke udløst, ikke et knækket hotlink. Det er tredje runde, den står i en optagelse, og nu på det sted, vi flyttede lageret hen til. Bilbasen: 0 grå af 30. | Beslutningen om "kun hero-fotoet eager" blev truffet, da kortene lå 4 300 px nede; nu ligger første række 170 px (1 366) / 235 px (390) under folden — inden for Chromes egen lazy-tærskel, så eager koster intet målbart på LCP (hero-fotoet er stadig LCP). Gør **første række** eager: i `tegnFeatured()` send `{ eager: i < cols }` til `kortHTML`, og lad `listingMediaHTML` skrive `loading="eager" fetchpriority="low"` for dem. Anden række forbliver lazy. Og skriv i optagelsesprotokollen (den mangler et script i repoet): rul til bunden og vent på `networkidle`, før fuldsiden tages — ellers dømmer næste kritiker det samme igen. Efterprøv LCP før/efter i Lighthouse (gulvet er låst). |
| **D6-F2** | **P1** | `index.html:410-449` `.sell-band` (h2, p, `.sell-points` li 3) | **"Gratis annonce — set af hele Danmark"**, "kom i kontakt med købere i hele landet", "Nå entusiaster, der leder efter netop din model", "Opret på under 5 minutter". Rækkevidde- og tidspåstande uden én måling bag — på et site med 0 egne annoncer. Det er præcis Bilbasens "over 700.000 potentielle købere ugentligt", som runde 5 skrev på "kopiér ikke"-listen. | h2 → **"Gratis annonce for private"**. p → "Ingen kommission, ingen skjulte gebyrer. Din kontaktinfo vises kun for indloggede." Punkt 3 → noget, der er sandt i dag: "Din annonce står i søgningen side om side med de N indekserede" (N = `ALLE.length`, skrevet af `js/home.js` som hero-tallet) — eller slet punktet. "Under 5 minutter" ud, medmindre det er målt. Footerens "Danmarks mødested for køb og salg af brugte motorcykler" er samme slægt, men mildere; lad den stå, indtil linjen om kilderne er skrevet ind dér. |
| **D6-F3** | **P1** | `js/home.js:408` `fillSeoCol('seo-types', TYPES…)`; `index.html:347` | SEO-kolonnen "Motorcykeltyper" lister **Scooter (0 annoncer)** som link til `soegning.html?type=scooter` — nul træf (`efter/bikerbasen-forside-m-full.png` y≈5 240, `-d-full.png` 3 806). D5-F3 lukkede nul-flisen; samme liste lever 1 800 px længere nede. D-009/D-010-mønsteret. | Flyt `fillSeoCol('seo-types', …)` ind i `fyldTypeAntal()` efter tællingen og filtrér `n > 0`, sortér som fliserne (flest først). Skriv tallet i parentes som mærkerne gør ("Cruiser (89)"). Footerens statiske "Kategorier" (Sport … Adventure) har alle > 0 i dag og rører ingen — men den er hårdkodet i 32 filer; noter i BACKLOG at byggetrinnet bør skrive den. |
| **D6-F4** | **P2** | `css/styles.css` `.listings-grid` + `#featured-listings`; `js/home.js` `maks` (`cols === 1 ? 4`) | **Tæthed.** Vores 4 kort = 1 880 px (≈475 px/kort, fuld bredde, 16:10 foto 222 px + 8 linjer). Bilbasens første gitter: 14 kort på ≈1 330 px i **to spalter** (≈95 px pr. kort: foto 4:3 ≈130 px + prisbadge + 2 linjer titel). Samme skærmplads, 3,5× så mange annoncer. Det er det ene sted, en blind dommer stadig ser "fire annoncer" mod "en markedsplads". | Ny gittervariant KUN til forsidens "Til salg lige nu" på ≤620 px: `#featured-listings{ grid-template-columns:repeat(2,1fr); gap:12px }` og en kompakt kortform `.card-external.card-kompakt` (foto 4:3, pris 16 px/700, titel 1 linje med ellipsis, én 20 px-række "2025 · 5.500 km · Kørekort A", kildelinje "mcsyd.dk" 11 px). `maks` på én spalte → 8 (4 rækker ≈ 1 000 px — kortere end de 4 i dag). Alle felter er de samme sande felter; intet nyt påstås. Søgesiden rører det ikke (dens kort og 16:10-regel er målt og låst). Efterprøv: første kort stadig ≈1 158, sektionen slutter ≈2 200 i stedet for 3 040. |
| **D6-F5** | **P3** | `css/styles.css:458` (`.header-actions .theme-toggle{display:inline-flex}` ≥ brudpunkt), `index.html:87` | Desktop-headeren: måne-ikon alene mellem "Søg motorcykler" og "Log ind" (x≈1 123). D5-F7 bad om skuffen OG footeren; kun skuffen er gjort. Bilbasen: "Log ind · Favoritter · Kundeservice · Menu" — ingen indstilling i headeren. | `.header-actions .theme-toggle{display:none}` på alle bredder; sæt `.drawer-theme`-knappen (samme markup som `index.html:109`) ind i footerens "Om Bikerbasen"-kolonne som `<li>`. Én indstilling, ét sted, på alle 32 sider via footer-blokken. |
| **D6-F6** | **P3** | `css/styles.css:527` `.hero{padding: var(--space-9) 0 var(--space-8)}`, `:334` `.section{padding: var(--space-8) 0}`, `.hero-trust` | Desktop: hero 0–865, "Til salg lige nu" h2 ved 945, første kort 1 017 — 167 px under folden. Bilbasen viser fotofliser fra 750 i viewporten; vi viser 75 px tom hero-bund + 80 px sektionsluft. | `.hero{padding-bottom:var(--space-5)}` på ≥768 (−40), `#featured-section{padding-top:var(--space-6)}` (−24), og flyt `.hero-trust` ind i `.search-panel` som sidste række (−56). Forventet: h2 ≈825, første kort ≈897 — overskrift og underrubrik over folden, kortets overkant lige under. Helt over folden kræver en to-spaltet hero (h1 ved siden af kortet), og det er ikke 40 px værd endnu. |
| **D6-F7** | **P3** | `crawler/normalize.js:236` `MAERKE_ALIAS`; `js/backend-bridge.js` `normalizeExternalListing` | Chippen "Bsa 3" (og SEO-kolonnen). Ukendte mærker får stort forbogstav pr. ord; BSA er et akronym. "Royal Enfield" ombryder til to linjer i chippen. | `'bsa': 'BSA', 'ajs': 'AJS', 'gas gas': 'GasGas', 'gasgas': 'GasGas'` i aliaslisten (rammer nye rækker) OG samme opslag i `normalizeExternalListing` (rammer de 3, der ligger). `.brand-chip-name{white-space:nowrap}` + chip-bredde `minmax(150px,1fr)` på mobil. |
| **D6-F8** | **P3** | ukendt — efterprøves | `efter/bikerbasen-forside-d-full.png`: footer 5 083–5 454, billede 5 948 → **494 px baggrund under footeren** (før: 574). Kun forsiden, kun desktop. Enten måler optagelsen `scrollHeight` før en sektion skjules (`#newest-section`/`#recently-viewed-section` sættes `hidden` af JS efter data), eller også bidrager et element efter footeren (skuffe/toast/cookie) til dokumenthøjden. Er det reelt, kan en bruger rulle en halv skærm ned i ingenting. | I browseren på 1 366: `document.documentElement.scrollHeight - document.querySelector('footer').getBoundingClientRect().bottom - scrollY`. Er tallet > 0: find synderen med `[...document.body.children].map(e=>[e.id||e.className, e.getBoundingClientRect().bottom])`. Er det 0: det er optagelsen — så skal fuldsiden tages EFTER `dataKlar`, og det er D6-F1's protokolnote. |
| **D6-F9** | **P3** | `index.html` `.search-panel` chips, `css/styles.css` `.popular-row` | Desktop-hero: fem chips ombryder til 4 + 1 ("Under 10.000 km" alene på anden række, y 695–738) og gør søgekortet 44 px højere. | Fire chips på ≥768 (drop den svageste, "Under 10.000 km" — 162 af 548 er fabriksnye uden km, så chippen favoriserer ét lager), eller `flex-wrap:nowrap; overflow-x:auto` som på mobil. −44 px i hero'en, som D6-F6 også beder om. |

### Søgeside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D6-S1** | **P2** | `soegning.html:567` (`#filter-q` placeholder), `:626-632` (`<option>`), `css/styles.css:2949-2952` (`#sort-select{flex:1 1 auto; min-width:0}`), `:3652-3653` | **To klippede tekster på første skærm ved 390.** Søgefeltet i `.srp-bar` (1fr ved siden af klokke 44 + Filtre 103) er ≈196 px; placeholderen "Søg efter mærke eller model" klippes til "Søg efter mæ…". Vælgeren i `.sort-felt` (ved siden af "Sortér:", (i) og tre visningsknapper) er ≈115 px; "Blandet udbud" klippes til "Blandet udb". Bilbasen: "Søg på bil" (10 tegn) og "Standard" (8). D5-S1 foreslog kortere option-tekster af netop den grund; det blev ikke gjort. | (1) Placeholder → **"Mærke eller model"** (≈125 px ved 15 px; passer i 152 px efter ikonet) — aria-label'en "Søg mærke eller model" bliver. (2) Options → "Blandet udbud" → **"Blandet"**, "Nyeste først", "Pris: lav → høj", "Pris: høj → lav", "Årgang: nyeste", "Km: laveste" (`soegning.html:626-632`; `js/search.js` læser `value`, ikke tekst — ingen logik rører). (3) `.sort-felt > select{min-width:96px}` som gulv, så den aldrig klipper "Blandet". Efterprøv begge på 360 px også. |
| **D6-S2** | **P2** | `js/search.js renderResultsCount()`, `soegning.html <style id="soeg-perf"> .results-headline{min-height}` | Overskriften er stadig **to linjer** på 390 ("548 annoncer fundet" 196–207 + "548 indekseret fra 4 kilder (i)" 220–232). D5-S1's mål var én linje: "548 annoncer fra 4 kilder (i)". Det er ≈25 px + margin, og første kort står 303 mod Bilbasens 284. | På ≤620 skriv ÉN linje: `<b>548</b> annoncer fra 4 kilder` + (i) (samme `forklarIndekseret()`-popover; fordelingen står dér). `.results-headline{min-height:24px}` i `soeg-perf` på ≤620. Forventet første kort ≈278 — under Bilbasens 284 for første gang. |
| **D6-S3** | **P2** | `js/components.js:798` (`saelger = [Forhandler/Privat sælger, domaene]`), `:863` `.card-kildelinje`; `css/styles.css:1141-1143` (D5-S7: `.card-sted{max-width:45%}`) | I 280 px desktop-spalten klipper fodlinjen **begge** led på Gul og Gratis-kortet: "Svendb…" (45 % = 111 px) og "Privat sælger · guloggrati…" (`bikerbasen-srp-d-full.png` y≈2 090). D5-S7's regel lod domænet vinde — men "Privat sælger · guloggratis.dk" er 31 tegn og taber alligevel. Det eneste, køberen kan slå op (domænet), er det, der mangler. | `saelger = [l.isDealer ? 'Forhandler' : 'Privat', domaene]` (−7 tegn; "Privat" er ikke mindre ærligt end "Privat sælger" ved siden af et domæne). Wrap sælgertypen i `<span class="card-saelgertype">` og i `@container (max-width:300px){ .card-saelgertype{display:none} }` — domænet alene i smalle spalter, sælgertypen står i `title` og i `.card-seller` på egne kort. `.card-sted{max-width:40%}`. Forventet: "Svendborg" (≈62 px) + "Privat · guloggratis.dk" (≈135 px) = 197 < 248. |
| **D6-S4** | **P2** — kræver menneskets ja | `js/sortering.js` `blandetRaekkefoelge()` (målt og låst i work/DECISIONS "Standardsorteringen er MÅLT") | Side 1 ved 390 og 1 366: **24 af 24 kort er MC Syd · Rødding · Forhandler · mcsyd.dk**, alle "Kørekort A". Bilbasens tre første kort: tre forhandlere (Dalsgaard, Andersen&Martini, KT-S). En blind dommer læser side 1 som ét forhandlerkatalog, ikke som en markedsplads med 4 kilder — og det er det, "548 annoncer fra 4 kilder" lover. Runde 5 skrev det samme uden for tabellen; det står her i tabellen, fordi det nu er den største tilbageværende forskel på søgesiden. | Ikke at ændre fordelingen af fotoløse (den er målt). Forslag til test, ikke til kode: inden for fotogruppen en **kilde-rundgang** (MC Syd, Gul og Gratis, Jensens, Rydbergs, MC Syd …) så længe en anden kilde har et kort med foto tilbage i samme oplysthedsklasse; målekrav: 21/3-fordelingen uændret pr. side, og første side bærer ≥ 2 kilder. Skal måles som runde 2 målte standarden, og skrives i DECISIONS, før det kobles til. Hvis nej: så er sætningen "fra 4 kilder" stadig sand, og det er side 1's udseende, ikke påstanden, der koster. |
| **D6-S5** | **P3** | `js/search.js renderResultsCount()` (desktop-grenen), `css/styles.css:2955-2962` `.results-mix` | Desktop: kildelinjen "332 indekseret hos MC Syd · 118 indekseret hos Gul og Gratis · +2 kilder" ombryder, så "+2 kilder" står alene på linje 2 med (i) hængende efter (`bikerbasen-srp-d.png` 291–315). Ordet "indekseret" står to gange. | Skriv "indekseret: 332 hos MC Syd · 118 hos Gul og Gratis · 98 hos 2 andre" (tallet 98 = 548−332−118, kan tælles efter). `.results-mix{white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0}` som bagstopper. |
| **D6-S6** | **P3** | `js/components.js:598` `KK_UAFGJORT`, `:821` `.spec-tom`, `css/styles.css` `.card-specs{height:24px; overflow:hidden}` (D-011) | Kort uden km OG uden kørekortdom: chiprækken "2025 · 1.000 ccm · km i… · Kørekort ikke afgjort" — km-chippen klippes til **"km i…"** (set på annoncesidens "Lignende" ved 390, `efter/bikerbasen-vdp-m-full.png` y≈3 905 og 4 385; samme komponent på søgesiden for de 162 fabriksnye uden km). Et ærligt felt, der ikke kan læses, er ikke ærligt. | På ≤620: `.card-specs:has(.spec-tom):has(.kk-ukendt){ flex-wrap:wrap; height:54px }` — højden er stadig fast (D-011's pointe), bare en anden fast højde for den kortklasse, der har brug for to rækker. Alternativt kort `KK_UAFGJORT` til "Kørekort: uvist" — men "ikke afgjort" er den mere præcise sætning, så vælg ombrydningen. |
| **D6-S7** | **P3** | `soegning.html` filtergruppernes rækkefølge, `css/styles.css:1215-1222` `.filters-panel` | Desktop: Pris-gruppens overskrift ved **841** — på folden (850), indholdet under. D5-S5 ville have den over. Bilbasens første formularrække har Pris; det er det filter, køberen oftest rører efter mærke. | Ryk Pris-gruppen op som nr. 2 (Kørekort → Pris → Type); Type er 7 chips i to spalter og kan stå under. Og `.filters-panel{padding:12px 16px}` (D5-S5's punkt 3 — tjek om det er gjort; Type ved 527 mod mål 500 tyder på, at det ikke er). |

### Annonceside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D6-A1** | **P1** | `annonce.html:318-320` (`IntersectionObserver` på `.external-detail-price-block` → `bar.hidden`), `js/annonce.js:683-740` (rækkefølgen i `.external-detail-head`) | **Ingen primær knap på første skærm ved 390.** Bjælken skjules, mens prisblokken er i viewporten (616–650 på første skærm), og knappen i kildekortet står første gang ved ≈2 770. Bilbasen: "Book en prøvetur" ved 77–116. Den ene handling, siden findes for — deeplinket til kilden, som work/DECISIONS (runde 4, "Sticky CTA manglede på indekserede annoncer") tilføjede bjælken for at sikre — er ikke synlig, før man har rullet ≈650 px. Det er D5-A7's forslag, der var forkert; udførelsen følger det. | (a) På <960: tegn `<a class="btn btn-primary btn-block external-detail-cta" href=… data-listing-id=…>Se annoncen hos MC Syd ↗</a>` **lige under `.external-detail-price-block`** (samme href/rel/target som kildekortets knap; C3-måling via samme `data-listing-id`). (b) Lad observeren holde øje med DEN knap i stedet for prisblokken: bjælken viser sig, når knappen er rullet ud — så er der altid præcis én synlig "Se annoncen"-knap. (c) ≥960 uændret (højre spalte har den ved 259). (d) Budget på 390, så gitteret ikke skubbes ud: sætningen "Salgsvilkår oplyst i annoncen hos MC Syd — de er en del af prisen. Få dem bekræftet dér." (2 linjer, ≈36 px) → `title` på "Bytter gerne"-chippen + én linje i "Før du kører derhen"; handlingsrækken (Sammenlign · Del · Meld fejl) under gitteret. Forventet: CTA ≈660–708, gitterets første række (Kørekort · Årgang) ≈730–800 — over 844. Efterprøv på et kort uden "Bytter gerne" også. |
| **D6-A2** | **P2** | `js/annonce.js:639-657` (`.external-detail-source-body`, `-meta`, `.external-detail-next`), `css/styles.css` `.external-detail-next a` | D5-A3 er ikke rørt: tre sætninger inkl. "Pris og udstyr kan være ændret …" (står igen under "Før du kører derhen"); datoen som fodnote; "Søg videre" = fire links i brødfarve uden tal/chevron. Højre spalte slutter ved 765 og efterlader **≈2 700 px tom spalte** på desktop-fuldsiden. Bilbasen: "Se forhandlerens 46 annoncer" · adresse · hjemmeside — handlinger med tal. | Som D5-A3 (a)(b)(c), plus ét link, vi HAR tallet til: **"Alle annoncer fra MC Syd · 332"** (`source`-tælling i `Store.getAllListings()`, samme tal som søgesidens kildelinje) → `soegning.html?kilde=mcsyd.dk` (findes facetten ikke som URL-parameter, er det ét felt i `js/filtrering.js`). Det er Bilbasens "46 annoncer" uden at kopiere logoet. Linkene: `color:var(--color-primary); display:flex; justify-content:space-between` + chevron + tal ("Alle Honda til salg · 262", "Motorcykler til A-kørekort · 548", "Motorcykler i Syddanmark · N"). Datoen op under knappen som "Hentet 16. aug. — for 7 dage siden" (`Date.now() − indekseretFoerste`, ingen ny data). |
| **D6-A3** | **P2** | `js/annonce.js:683-740` (`.external-detail-head` rækkefølge), `css/styles.css:1863-1869` | Nøgletallene står **under folden på desktop**: gitter 866–1 035 ved 1 366×850 (foto 128–528, titel 584, pris 698, chip 745, salgsvilkårslinje 790, handlingsrække 826). På 390: gitter fra ≈800, kun overkanten. Bilbasen har ingen nøgletal i viewporten (detaljer ≈1 090) — så det er ikke en tabt sammenligning, det er en tabt **trumf**: kørekortet er det, Bilbasen aldrig kan vise, og det står under kanten på begge skærme. | Desktop: handlingsrækken (Sammenlign · Del · Meld fejl) op på brødkrummens linje, højrestillet (Bilbasens "Sammenlign · Print · Anmeld" ved 286) — −40 px; salgsvilkårslinjen ind som gitterets 6. celle "Salgsvilkår · Bytter gerne" (−30 px) — så står gitteret ≈795–960 med etiketter OG værdier for Kørekort/Årgang/Km/Kubik/Effekt inden for 850. Mobil: D6-A1(d) gør det samme. |
| **D6-A4** | **P3** | `css/styles.css:1864` `.external-detail-stats{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}` | Desktop: 5 celler i 4 spalter (703 px / 140 = 4) → "Effekt" alene på række 2 med **tre tomme grå felter** (≈530 px grå, 953–1 035). Mobil-reglen (`:last-child:nth-child(odd){grid-column:1/-1}`) gælder kun ≤ brudpunkt. | `minmax(120px,1fr)` → 5 spalter ved 703 px (5×120 + 4 = 604). Og som bagstopper for fremtidige 6/7 celler: `.external-detail-stat:last-child:nth-child(4n+1){grid-column:1/-1}` på ≥700. |
| **D6-A5** | **P3** | `js/components.js` `externalCardHTML()` — se D6-S6 | "Lignende" ved 390: "km i…" på to af tre kort (samme fejl som D6-S6, samme komponent), og 2 af 3 fotos grå i optagelsen (lazy; D6-F1's protokolnote dækker). | Rettes af D6-S6 og D6-F1. Ingen separat kode. |
| **D6-A6** | **P3** | `js/annonce.js:827-833` (`overskrift.textContent`), `:823-825` (dedupe på `brand|model|price`) | Overskriften "Lignende: Honda · 650 ccm–1.350 ccm · 75–175 t.kr." skriver enheden to gange; striben viser to fabriksnye CB 1000 Hornet (139.995 / 159.995) side om side — ærligt (to maskiner), men læses som en dublet. | "650–1.350 ccm". Dedupe på `brand|model` når der er ≥ 3 kandidater med score ≥ 4, ellers som nu — så bliver striben "samme model · samme model · næste model" i stedet for "samme · samme · samme". Ingen ny påstand. |

---

## 5. Kopiér IKKE fra Bilbasen

Listen fra runde 5 står ved magt; her er den samlet og med én tilføjelse, der
peger på os selv.

| Bilbasen-element | Hvorfor ikke |
|---|---|
| Takeover-annoncer (OK-ladeboks, Polestar), tom 190 px annonceplads over headeren, "Se mere"-kasser | Vi har ingen annoncører, og det er dér, vi slår dem på tid-til-lager på alle tre sider. |
| Køb/Leasing-toggle og -faner, "Privatleasing/Erhvervsleasing"-fliser | Intet leasinglager, intet leasingfelt i felt-whitelisten (regel 2). En toggle, der altid står på "Køb", er et felt uden funktion. |
| Solgt.com-"garantipris", Lendo-finansiering/"Månedlig ydelse", "Forsikre din bil", nyhedsbrev-bånd | Ingen partner, ingen ydelse at regne på en pris, vi selv skriver kan være ændret, intet nyhedsbrev at sende. |
| **"Danmarks største markedsplads" / "over 700.000 potentielle købere ugentligt"** | Størrelses- og rækkeviddepåstande, vi ikke kan måle. **Og vi har selv skrevet én: "Gratis annonce — set af hele Danmark" (D6-F2).** Den skal ud af samme grund. |
| Stjerner "4,4 · 58 anmeldelser" under titlen | Ingen anmeldelser af tredjepartssælgere; et stjernegennemsnit uden grundlag var en af de tre fejl, der kostede tillidskategorien. |
| Billedstribe "+11", galleri-prikker, video-ikon, forhandlerlogo på kortet | Ét thumbnail, ingen gallerier, ingen kopierede aktiver ("Kilden ejer sine billeder"; regel 2). Kildens NAVN i tekst er ækvivalenten. |
| Hjerte på kortet/fotoet | D-008: fremmednøglen i `favorites` peger på `listings`. Et hjerte, der ikke gemmer, er værre end intet. |
| "Book en prøvetur" / "Skriv til sælger" / "Vis telefonnummer" | Vi gemmer ingen kontaktoplysninger og har ingen relation til sælgeren. Vores ene knap siger, hvad den gør — den skal bare stå, hvor den kan ses (D6-A1). |
| Byttehandel: nummerplade-formular / "Vurder min bil" | Ingen værdiansættelsesdata; persondata uden formål. |
| "Seneste biler" med dato | `createdAt: null` på 548 af 548; D-005 står. Sektionen er skjult, ikke fyldt med en crawldato — rigtigt. |
| 2-spaltet kompakt kortgitter på mobil | **Formen MÅ kopieres** (D6-F4) — det er et layout, ikke en påstand. Prisbadge på fotoet også. Felterne forbliver vores sande felter. |

---

## 6. Den ene ændring pr. side

**Forside — D6-F1 + D6-F4 sammen: "Til salg lige nu" uden grå kort og dobbelt så tæt.**
Første række eager (så der aldrig står et gråt felt dér, hvor vi lige har flyttet
lageret hen), og på mobil et 2-spaltet kompakt gitter med 8 kort på ≈1 000 px i
stedet for 4 på 1 880. Det er forskellen mellem "fire annoncer" og "en markedsplads"
— præcis det, Bilbasen stadig vinder mobilforsiden på. (D6-F2's påstand skal ud
uanset; den er P1, men flytter ikke blinddommen — den flytter, om vi må kalde os
ærlige.)

**Søgeside — D6-S1 + D6-S2: ingen klippet tekst på første skærm, og overskriften på én linje.**
"Mærke eller model", "Blandet", "548 annoncer fra 4 kilder (i)". Det koster ti
linjer og ingen højde, og det er det første, en blind dommer ser på 390. Med
første kort ved ≈278 står vi under Bilbasens 284, og siden, der allerede vinder
på kortet, holder op med at se sjusket ud over det.

**Annonceside — D6-A1: den primære knap tilbage på første skærm på mobil.**
"Se annoncen hos MC Syd" lige under prisen på <960, og bjælken følger den
knap, ikke prisblokken. Siden vinder allerede desktop; på mobil er det den ene
ting, der afgør, om en dommer ser en annonceside eller en velskrevet side uden
udgang.
