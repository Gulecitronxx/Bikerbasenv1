# Runde 8 — blind efterprøvning af runde 7 mod Bilbasen.dk (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rollen er marketplace-UX-kritiker. Sæt A er Bilbasen.dk (`work/runde5/bilbasen-*`
for forside/SRP/VDP, `work/runde5/efter2/bilbasen-maerke-*` for mærkesiden
Honda). Sæt B er Bikerbasen.dk LIVE efter runde 7 (`work/runde5/efter3/bikerbasen-*`,
optaget 23.08.2026 kl. 21:19 — to minutter efter commit `f77f54c`, D7-F2 — med rul
gennem siden, så lazy-billeder er hentet). `work/runde5/efter2/`, `efter/` og
`work/runde5/bikerbasen-*` er kun brugt til at se udvikling.

Alt er holdt op mod de hårde regler, læst først: `CLAUDE.md` (aggregator; 541
annoncer indekseret fra 4 kilder, 0 egne; regel 2: ét thumbnail, ingen galleri,
ingen kontaktinfo, ingen fuld tekst; alt på siden skal være sandt),
`docs/review/DECISIONS.md` (D6-S4 kilde-rundgang godkendt og målt; D7-F2
tværkilde-dubletter 548 → 541; D7-A5 afvist: mærkatet "Kørekort ikke afgjort"
må ikke nævne en kategori, når effekten mangler — begrundelsen holder, og den
efterprøves ikke igen her) og `work/DECISIONS.md`. `docs/review/runde-7-kritik.md`,
`docs/review/rounds/round-7.md` og `docs/review/BACKLOG.md` (runde 7) er læst som
påstande, der skal efterprøves på B-billederne — ikke som facit.

**Én ting, der skal stå øverst, fordi den farver alle fire sider.** Det levende
lager er ikke friskt. Målt direkte i databasen (REST, anon-nøglen, `sidst_set`
pr. kilde, 23.08.2026 kl. ≈21:30): MC Syd 332 annoncer — **sidst set 16.08**
(7 dage); Gul og Gratis 58 fra 19.08 og 60 fra 20.08; Rydbergs 74 og Jensens 24
fra 20.08. Ingen kørsel siden 20.08, og den største kilde (61 % af lageret) er
ikke bekræftet i en uge. Der findes ingen planlagt kørsel (`.github/workflows/
deploy.yml` bygger kun; `npm run crawl` er manuel). Annoncesiden siger det selv
("sidst bekræftet for 7 dage siden" — D7-A3 er lukket, og den lukning er beviset),
mens forsiden skriver "Tallet er antallet til salg lige nu" og mærkesiden "Der er
lige nu 256 Honda". Det er D8-F2 nedenfor, og det er den eneste finding i runden,
der gælder hele sitet.

---

## 0. Sådan er der målt

Billederne er læst som billeder (Read, i 1 100–1 800 px-udsnit; fuldsiderne
skåret i striber med PIL) og målt med PIL: brand-farvede rækker (Bilbasen
`#FF4D00`, Bikerbasen `#C6420E`, tolerance 18) for primære knapper; sidste mørke
række for footerens bund; første ikke-baggrundspixel uden for 390 px for
vandret overløb; WCAG-kontrast regnet på den mørkeste pixel i et tekstfelt mod
dets baggrund. "≈" hvor jeg har aflæst i stedet for målt (±6 px). Viewports
390×844 og 1366×850. Bilbasens fuldsider er 1 463 px brede (takeover).

**Målt uden for billederne:** (1) `sidst_set`/`foerst_set` pr. kilde og antallet
af "Ny" (172 af 548 rå rækker — `stand`/`/ny/` i url'en, samme regel som
`eksternErNy()`), begge via REST med sitets egen offentlige nøgle, kun læsning;
(2) HTTP-status på `om-indeksering`, `soegning`, `maerke-honda` (alle 200);
(3) kode læst i `js/home.js`, `js/search.js`, `js/mine-annoncer.js`,
`js/components.js`, `js/annonce.js`, `js/backend-bridge.js`, `css/styles.css`,
`soegning.html`, `annonce.html`, `maerke-honda.html`, `index.html`. Ingen
skrivning, ingen klik med sideeffekt.

**To måleartefakter, der ikke er dømt som design:** (a) Bilbasens mærkeside er i
begge viewports dækket af deres cookie-modal; dommen er afsagt på det, der ligger
under den. (b) Bikerbasens footer er **tom (sort flade)** i fuldsideoptagelsen af
søgesiden (`bikerbasen-srp-d-full.png` 4 743–5 113, `-m-full` 11 524–12 380): det
er `soegning.html:76` `.site-footer{content-visibility:auto}` — optageren maler
ikke indhold uden for viewporten. En bruger, der ruller derned, ser footeren.
Det er ikke en fejl; den lille ægte kant (pladsholderhøjden) står som D8-S7.

---

## 1. Blind dom pr. side og skærm

Afsagt på billederne, før kode blev åbnet. "Tæt på" er ikke en dom.

| Side / skærm | Vinder | Hvorfor — det, en blind dommer ser først |
|---|---|---|
| **Forside, mobil** | **Bikerbasen, snævert** (uændret) | Første skærm: foto-hero, sand underrubrik ("541 annoncer med motorcykler til salg hos 4 danske forhandlere og markedspladser") mod "Danmarks største markedsplads for biler"; søgekort med fire felter; CTA **655–706** mod 674–717. Første annoncekort **≈1 155** mod ≈1 530, 8 kompakte kort i to spalter med pris · model · år · km · ccm · kørekort · kilde; Bilbasen: pris · titel · km. Kilder i de 8: 4 MC Syd · 3 Gul og Gratis · 1 Rydbergs — væggen er brudt (runde 7: 8 af 8). Det, der holder dommen på "snævert": Bilbasens første skærm **slutter med varer** (to fotofelter titter frem ved 800), vores med tre tryghedspunkter — og de kompakte kort klipper modellen **uden ellipse og med en tom linje under** ("Honda CB 1000", "Suzuki Gs katana", "Harley-Davidson", se D8-F3). Bilbasen har stadig ≈30 kort mod vores 8. |
| **Forside, desktop** | **Bikerbasen, klart** (uændret) | Bilbasens første skærm er en OK-ladeboks-takeover med formularen klemt ind i midten (CTA 623–664); vores er h1, tal, tre felter, kørekort-vælger, CTA **577–628**, fire chips, tre tryghedslinjer og en motorcykel. Første kort **≈930** mod ≈1 200 (runde 7: 897 — hero'en er vokset 33 px med den nye underrubrik). 6 kort i tre spalter, 0 grå. Trækker fra: **4 af 6 kort er MC Syds riflede væg** under en underrubrik, der lover "højst halvdelen fra samme kilde" (D8-F1), chips klipper "Harley-Da…"/"Royal Enfi…" (D8-F4), og 454 px tom flade under footeren (D8-F5). |
| **Søgning (SRP), mobil** | **Bikerbasen, snævert** (uændret) | Første kort ≈280 mod 284; første pris ≈525 mod 684; 1,9 kort pr. skærm mod 1,1; placeholderen "Mærke/model" er hel (D7-S2 lukket); "541 annoncer · fra 4 kilder (i)" på én linje. Bilbasens kort har logo · galleriprikker · video · hjerte — aktiver regel 2 forbyder. Det, der koster "klart": vi bruger **60 px på brødkrumme + h1** over søgefeltet (Bilbasen: 0), og h1'en siger **"Brugte motorcykler til salg"** over et lager, hvor ≈170 af 541 bærer "Ny" (D8-S1) — det er D7-M1 én gang til, bare på søgesiden. |
| **Søgning (SRP), desktop** | **Bikerbasen, klart** (uændret) | Første kort 323 mod 527; sidebjælken viser **Mærke først** med 6 mærker og tal, Kørekort med tal (D7-S3 lukket); kildelinjen "indekseret: 332 hos MC Syd · 111 hos Gul og Gratis · 98 hos 2 andre" summerer til 541; ingen takeover. Bilbasen: Polestar-tapet, 3 kort synlige, filtrene bag en modal. Trækker fra: sidebjælken slutter ved ≈1 000 og lader 4 000 px tom spalte stå; kortets undertitel skifter betydning fra kort til kort ("Naked" / "(Eurosport)" / "DragStar Classic" — D8-S4). |
| **Mobilens filterskuffe mod Bilbasens filtre** | **Bikerbasen, snævert — med forbehold** | Jeg har intet billede af Bilbasens "Udvidet søgning"; dømt mod deres synlige filterlag (knappen "Filtre 2" med tælle-badge, pille "Personbil", "Nulstil") og deres kendte mønster (fuldskærmsmodal med selects uden tal). Vores skuffe: Mærke med søgefelt og **tal pr. mærke** (Honda 256 …), "Vis alle 27 mærker", Kørekort som tre chips med tal (13 · 47 · 541) og én forklaringslinje, sticky "Vis 541 annoncer" 786–830, tælle-badge på "Filtre" (`#filter-badge`). Det er bedre end selects uden tal. Forbeholdene: **"Nulstil" står to gange** (toppen 1 og bunden 1), skuffen begynder ved ≈100 px med headeren og en halvt synlig h1 ovenover — den ser ud som en fane, der ikke nåede op (D8-S6). |
| **Annonce (VDP), mobil** | **Bikerbasen, klart** (runde 7: snævert) | Rækkefølgen er ren og hel i første skærm: kildeflag 118–156 → foto 182–445 → titel 516 → pris 616 "hos MC Syd" → chip → CTA **695–743** → nøgletallenes første række (Kørekort · Årgang) **≈793–836** (D7-A2 lukket for første række). Bilbasen: tre knapper ved 77–165 FØR bilen, +11-stribe, "4,4 · 58 anmeldelser", pris 743 og derefter en Lendo-ydelse. Deres bevis (11 fotos, logo, anmeldelser) er aktiver, regel 2 forbyder. Trækker fra: **kilden nævnes 5 gange** i 844 px (D8-A2), og "sidst bekræftet for 7 dage siden" er sandt og ubehageligt (D8-F2). |
| **Annonce (VDP), desktop** | **Bikerbasen, klart** (uændret) | CTA **236–283** mod 311–350 (under 190 px tom annonceplads); titel 557, pris 672, nøgletal med værdier ≈839 — alle fem over folden (D7-A2 lukket); højre spalte "Du køber af MC Syd" + "Søg videre" med tal (332 · 256 · 541 · 348 · 541) og sticky (D7-A4). Bilbasen: bil ved 311, pris først ved ≈978, spalten er Lendo/forsikring/nummerplade. Eneste synlige svaghed: "Beskrivelse" som h2 over en sætning om, at beskrivelsen ligger et andet sted (D8-A3). |
| **Mærkeside (Honda), mobil** | **Bilbasen, klart** (uændret) | Under Bilbasens modal ligger deres SRP: søg · klokke · "Filtre 3" · "Viser 141" · sortering · første kort ≈282 · "Side 1 af 5". Vores: brødkrumme 85 · h1 130–180 · tre linjer + "Mere om udvalget" · "Se Honda efter model" + chips 375–415 · **≈80 px luft** · "256 annoncer til salg nu — de første 24 her" 495–540 · "Alle 256 i søgningen" 595 · første kort **≈630** (mål: ≤620; runde 7: 873). Siden er gået fra 130 358 til 14 530 px (D7-M2 lukket) — men den har stadig hverken filtre, sortering eller sideinddeling, og **den ruller vandret**: fuldsideoptagelsen er 440 px bred, fordi knappen "Se alle 256 Honda i søgningen — med filtre og sortering" (nowrap) er ≈422 px (D8-M1). Det er en blind dommer, der ser en side, der ikke passer i telefonen. |
| **Mærkeside (Honda), desktop** | **Bilbasen, snævert** (runde 7: klart) | Vores h1 157, sand underrubrik ("256 … 91 brugte og 165 fabriksnye — fra 4.000 kr.", D7-M1 lukket), 12 modelchips 335–435, overskrift 531, første kort **589** mod ≈527; 24 kort i 3 spalter, "Se alle 256 …"-knap, tekstpakke med tal, "Andre mærker" efter antal med tal (D7-M5 lukket), 6 060 px mod 6 818. Bilbasen: 30 kort, filtre, sortering, "Side 1 af 5". Det, der afgør det: **deres side kan bruges som en søgning, vores skal forlades for at blive det** — to klik til "Honda under 60.000 kr. på A2". Udseendet er vundet; funktionen er ikke. |

Samlet: **6–2 til Bikerbasen** (som runde 7), men med forskudte afstande: VDP
mobil er gået fra "snævert" til "klart", mærkesiden desktop fra "klart tabt" til
"snævert tabt". Mærkesiden mobil tabes stadig klart — nu også på en
vandret rullebjælke. Det, der nu skiller på de vundne sider, er tre ting, der
alle er **påstande**: "højst halvdelen fra samme kilde" (falsk ved 6 kort),
"Brugte motorcykler til salg" (172 af 541 er nye) og "lige nu" (3–7 dage gamle
data).

---

## 2. Pixelfakta (A = Bilbasen, B = Bikerbasen efter runde 7)

### Forside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 674–717 | **655–706** | 623–664 | **577–628** |
| Første annoncekort (y) | ≈1 530 | **≈1 155** | ≈1 200 | **≈930** (runde 7: 897) |
| Kort under hero'en | ≈30, 2-spaltet | **8**, 2-spaltet kompakt | ≈28, 4-spaltet | **6**, 3-spaltet |
| Kilder bag kortene | ≥3 logoer i første 6 | **4 MC Syd · 3 GG · 1 Rydbergs** (runde 7: 8/8) | blandet | **4 MC Syd · 2 GG** — 67 % mod lovede ≤50 % |
| Grå/tomme fotofelter | 2 af 14 | 0 af 8 | 1 af 28 | 0 af 6 |
| Titel klippet i kompakt kort | — | **3 af 8** ("Honda CB 1000", "Suzuki Gs katana", "Harley-Davidson"), uden ellipse, tom 2. linje | — | 0 af 6 |
| Sidehøjde | 7 589 | 7 330 | 4 384 | **5 798 — heraf 454 px under footeren** (runde 7: 494) |

### Søgeside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Rækker over listen | 4 | 5 (brødkrumme · h1 · søg+klokke+Filtre · antal · Sortér+visning) | — | — |
| Filtre-knap (y) | 72–119 | **132–174** | "Alle filtre 2" 284–331 | sidebjælke fra 173 |
| Placeholder | "Søg på bil" | **"Mærke/model" (hel)** | "Søg på bil, mærke, model…" | "Mærke eller model" |
| Første kort (y) | 284 | ≈280 | 527 | **323** |
| h1 | ingen | **"Brugte motorcykler til salg"** — 172 af 541 er "Ny" | ingen | samme |
| Side 1, kilder | 3 forhandlere i første 3 | 12 MC Syd · 12 GG, skiftevis (D6-S4) | — | samme |
| Sidebjælke synligt uden indre scroll | — | — | modal | **Mærke (6 + "Vis alle 27") · Kørekort (3 chips)**; Pris/Type under |
| Sideinddeling | "Side 1 af 5" (URL) | "Side 1 af 23" — **knapper, replaceState** | — | samme |
| Footer i fuldside | — | tom (content-visibility, artefakt) | — | samme |
| Sidehøjde | 17 647 | 12 381 | 6 540 | 5 114 |

### Annonceside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 77–116 (+2 til 165) | **695–743** (runde 7: 739–787) | 311–350 | **236–283** |
| Foto | 213–507 | 182–445 | 311–795 | 128–488 |
| Titel / pris | 638 / 743 | **516 / 616** | ≈950 / ≈978 | **557 / 672** |
| Nøgletal | ≈1 090+ | række 1 **≈793–836** (Kørekort · Årgang); række 2 under 844 | — | etiketter ≈809, **værdier ≈839** — 5 af 5 over folden |
| Kilden nævnt i første skærm | logo 1× + 3 knapper | **5×** (flag, fototekst, "hos MC Syd", "Forhandlerannonce", CTA) | logo + "KT-S" | 3× (aside, pris, "Forhandlerannonce") |
| Friskhed | ingen dato | "sidst bekræftet **for 7 dage siden**" | ingen | samme |
| Kontrast (mørkeste tekstpixel mod baggrund) | — | fototekst 5,28:1 · "hos MC Syd" 5,28:1 · kildelinje 5,05:1 — AA ✓ | — | kildelinje 5,25:1 · "Naked" 5,74:1 ✓ |
| Sidehøjde | 7 845 | 6 054 (+76 px sticky bjælke) | 5 194 | 3 392 |

### Mærkeside (Honda)

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Første skærm | modal; under: søg · klokke · Filtre 3 · Viser 141 · Sortér | brødkrumme 85 · h1 130–180 · 3 linjer + details · chips 375–415 · **luft til 495** · overskrift 495–540 · link 595 | modal; under: SRP | h1 157 · 2 linjer · chips 335–435 · overskrift 531 |
| Første kort (y) | ≈282 | **≈630** (runde 7: 873; mål ≤620) | ≈527 | **589** (runde 7: 728) |
| Filtre / sortering / sideinddeling | ja / ja / "Side 1 af 5" | **nej / nej / nej** — 24 kort + knap til søgningen | ja / ja / ja | nej / nej / nej |
| Antal kort | 30 | 24 | 30 | 24 |
| h1 / lager | "Brugte Honda" | **"Honda-motorcykler til salg i Danmark" · 91 brugte · 165 fabriksnye** | — | samme |
| Vandret overløb | 0 | **+50 px (fuldside 440 bred)** — `.btn{white-space:nowrap}` | 0 | 0 |
| Sidehøjde | 18 987 | **14 530** (runde 7: 130 358) | 6 818 | **6 060** (runde 7: 45 488) |

---

## 3. Runde 7's findings — én for én, med bevis fra B-billederne

| ID | Status | Bevis |
|---|---|---|
| D7-F1 "Privat" som gæt | **lukket** | Gul og Gratis-kort skriver kun domænet: "Esbjerg · guloggratis.dk", "Borup · guloggratis.dk" (`B-fors-d` y≈1 877, `B-srp-d` y≈1 180); MC Syd-kort "Forhandler · mcsyd.dk". Kode: `js/components.js` tri-state `saelgertype`; `js/annonce.js:855-856` `sellerTypeNoteHTML(null)` ved ukendt. |
| D7-F2 "548 motorcykler" / dubletter | **lukket** | Hero "541 annoncer med motorcykler til salg", SRP "541 annoncer fundet", kildelinjen 332+111+98 = 541, VDP-spalten "Alle motorcykler 541". DECISIONS: 7 grupper / 29 rækker, 548 → 541 (REST i dag: 548 rå rækker, som før). |
| D7-F3 "Til salg lige nu" = én kildes væg | **delvist** | 390: 8 kort = 4 MC Syd · 3 GG · 1 Rydbergs ✓ (≤ halvdelen). **1366: 6 kort = 4 MC Syd · 2 GG = 67 %**, under underrubrikken "højst halvdelen fra samme kilde". Årsag: `js/home.js:944` `vaelgFeatured(8)` lægger loftet ved ⌈8/2⌉ = 4 og **derefter** `slice(0, 6)` (linje 976). → **D8-F1, P1**. |
| D7-F4 kompakt kort klipper modellen | **ikke lukket** | "Honda CB 1000" (Hornet væk), "Suzuki Gs katana" (650 cc væk), "Harley-Davidson" (model væk) — nu **uden ellipse** og med en **tom anden linje** under (`B-fors-m-full` y≈1 340, zoomet). `css/styles.css:851` sætter `-webkit-line-clamp:2`, men `:1006-1010` (`.card-title-main{height:24px; line-height:24px}`) vinder — boksen er én linje høj, h3'en 44 px. → D8-F3. |
| D7-F5 "Royal Enfield" ombryder | **delvist** | Ombryder ikke længere — **klipper** i stedet: "Harley-Da…", "Royal Enfi…" (`B-fors-d-full` y≈2 760 og 2 830). Mærkenavnet er chippens eneste indhold. → D8-F4. |
| D7-F6 `--cookie-h` fryser i baggrundsfane | **ikke lukket** (samme optagelsesvilkår) | `bikerbasen-forside-d-full.png`: footerens bund 5 343, dokument 5 798 → **454 px tom** (runde 7: 494). De tre andre sider: 0 px. `js/components.js:1113-1114` lytter nu på `visibilitychange` + `load`; det har ikke hjulpet i denne optagelse. → D8-F5 (CSS-only). |
| D7-S1 søgeagent lover mail | **delvist** | Toasten lover ikke længere mail (`js/search.js:2142`: "… hvor den tæller nye annoncer"). Men **den tæller ikke nye annoncer** for 541 af 541: `js/mine-annoncer.js:185-186` regner "nye" af `l.createdAt`, som er `null` på alle indekserede (`js/backend-bridge.js:675`, med vilje). Klokken "Slå notifikationer til" står der stadig. → **D8-S3, P1**. |
| D7-S2 placeholder "Mærke eller m" | **lukket** | "Mærke/model" helt synligt (`bikerbasen-srp-m.png` 132–174); `js/search.js:2105` skifter ved ≤420. |
| D7-S3 Mærke usynligt i sidebjælken | **lukket** | `bikerbasen-srp-d.png`: Mærke først (y 262) med søgefelt, 6 mærker med tal, "Vis alle 27 mærker"; Kørekort ved 678; Pris og Type under. |
| D7-S4 modelfelt med salgsstøj | **lukket (det, der blev nævnt)** | Ingen "MC-SYD", "sælges", "bud" i de 36 kort, jeg har læst; "Suzuki" uden model på ét kort (model null, som lovet). Rest: årstal/ccm/småt begyndelsesbogstav i 12+1+14 modeller ("Kawasaki ER6 2007", "Suzuki Gs katana 650 cc", "Honda vf750f") → D8-S5, P3. |
| D7-S5 "km ikke op…" i 3 spalter | **lukket** | `@container (max-width:420px)` (`css/styles.css:1127`); VDP-desktop "Lignende" i 3 spalter viser "km ikke oplyst" helt (`B-vdp-d-full` y≈2 825). |
| D7-S6 sammenlign "Ikke oplyst" i fem rækker | **lukket (kode)** | `js/components.js:1202-1206`: rent eksterne sæt dropper rækkerne; blandede skriver "Se hos kilden". Ikke synligt i billederne. |
| D7-A1 privat-advarsel på forhandlerannoncer | **lukket (kode)** | `js/annonce.js:855-856` tre grene. Billedet er en MC Syd-annonce ("Forhandlerannonce. Du har som privatperson reklamationsret …" — rigtig gren). |
| D7-A2 nøgletal under folden | **lukket (desktop) / delvist (mobil)** | Desktop: værdier ≈839 < 850 ✓, alle fem. Mobil: Kørekort · Årgang ≈793–836 ✓; Kilometer · Kubik · Effekt under 844. Målet "pris, kørekort, årgang, ccm, hk på første skærm" er nået på desktop og halvt på mobil. |
| D7-A3 "Hentet … for 7 dage siden" | **lukket** | "Set hos MC Syd første gang 16. aug. 2026 · sidst bekræftet for 7 dage siden" (`B-vdp-d` 298–330). To sande tal — og de afslører D8-F2. |
| D7-A4 højre spalte følger ikke med | **lukket (kode)** | `css/styles.css:1993` `position:sticky; align-self:start`. Et stillbillede kan ikke vise det. |
| D7-A5 "Kørekort ikke afgjort" mod A-boksen | **afvist — accepteret** | DECISIONS: mærkatet må ikke nævne en kategori, når den ikke kan udledes; testen låser det. Dobbeltheden står stadig på siden (`B-vdp-d-full` y≈1 080 mod ≈2 850), og dev's eget alternativ — omformulér A-boksen — er den vej, der er åben. Ikke rejst igen. |
| D7-M1 "Brugte Honda" over 165 nye | **lukket** | h1 "Honda-motorcykler til salg i Danmark", "256 … 91 brugte og 165 fabriksnye", `<title>` "Honda – 256 til salg, nye og brugte". 91 + 165 = 256 ✓. |
| D7-M2 262 kort uden sideinddeling | **lukket (som foreskrevet)** | 24 kort, "256 annoncer til salg nu — de første 24 her", knap "Se alle 256 Honda i søgningen". 130 358 → 14 530 px (390), 45 488 → 6 060 (1 366). Rækkefølgen er søgningens (første tre kort = SRP's første tre). |
| D7-M3 første kort 873/728 | **delvist** | 630 (390) mod mål ≤620; 589 (1 366). Det, der mangler, er ≈80 px luft mellem chips og overskrift og et redundant link ("Alle 256 i søgningen" lige under "256 annoncer …"). → D8-M2. |
| D7-M4 "samme leje" / "og … og" / h2-luft | **lukket** | "KTM ligger typisk i samme prisleje — se dem, hvis udvalget her er for lille."; h2'erne "Prisniveau", "Kørekort til Honda", "Hvad du skal tjekke" har ens luft (`B-maerke-d-full` 4 748–4 760 / 4 890 / 5 056). |
| D7-M5 "Andre mærker" alfabetisk med Andet Mærke | **lukket** | "Harley-Davidson · 72, Yamaha · 43, Suzuki · 42, … BSA · 3, Alle mærker" — efter antal, med tal, uden "Andet Mærke". |

**Tælling: 14 lukket, 5 delvist (F3, F5, S1, A2-mobil, M3), 2 ikke lukket (F4, F6),
1 afvist (A5).** Af de 5 delvise er to P1-påstande (F3's "højst halvdelen" og S1's
"tæller nye annoncer").

---

## 4. Nye findings — det, der nu afgør blinddommen

Severity: P1 = falsk/udokumenteret påstand, funktion virker ikke som lovet,
AA-brud; P2 = mærkbar forskel til Bilbasen med konkret konsekvens; P3 = kosmetisk.
"Måling" er os mod Bilbasen, hvor der er en sammenligning at lave.

### Forside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D8-F1** | **P1** | `js/home.js:859-868` (`vaelgFeatured` med loft ⌈antal/2⌉), `:944` (`vaelgFeatured(8)`), `:976` (`featured.slice(0, maks)`), `:903` (underrubrikken "… og højst halvdelen fra samme kilde") | **Underrubrikken er falsk på desktop.** 1366 (3 spalter): 6 kort = Honda CB (MC Syd) · Kawasaki ZR-7 (MC Syd) · Aprilia (MC Syd) · Suzuki (GG) · BMW K 1200 S (MC Syd) · Yamaha (GG) → **4 af 6 = 67 %**. 390 (8 kort): 4 af 8 ✓. Loftet regnes på 8 og skæres til 6 bagefter. Bilbasen lover intet om kilder — og holder det. | Regn `maks` FØR udvalget (kolonnerne læses allerede før indsættelse, jf. kommentaren ved linje 946-956): `const maks = …; featured = vaelgFeatured(maks);` — loftet bliver ⌈6/2⌉ = 3, og resize-lytteren kalder samme `tegnFeatured`. Forventet: 3 MC Syd · 2 GG · 1 Rydbergs ved 1366. Mål før/efter ved 390, 768, 1366, 1600. Ingen ny tekst. |
| **D8-F2** | **P1** (hele sitet) | Data: `eksterne_annoncer.sidst_set` pr. kilde (REST 23.08 ≈21:30). Tekst: `index.html` "Mærker med flest annoncer — Tallet er antallet til salg lige nu", h2 "Til salg lige nu"; `scripts/build-brand-pages.js` "Der er lige nu N …"; `js/search.js` "541 annoncer fundet". Drift: `.github/workflows/deploy.yml` (kun build), `package.json` `crawl` (manuel) | **"Lige nu" er 3–7 dage gammelt.** MC Syd 332 annoncer: `sidst_set` **16.08** (7 dage; 61 % af lageret). GG 58 fra 19.08 + 60 fra 20.08. Rydbergs 74 og Jensens 24 fra 20.08. Ingen kørsel siden 20.08; ingen planlagt kørsel findes. Siden SIGER det selv ét sted (VDP "sidst bekræftet for 7 dage siden") og modsiger det fire andre steder. Bilbasen: "50.355 annoncer **i dag**" — en dagsfrisk påstand, de kan holde. En Honda solgt i Rødding d. 17. står stadig som "til salg lige nu". | To lag, begge nødvendige. (1) **Drift:** kør crawleren, og planlæg den (GitHub Actions `schedule: cron '0 3 * * *'` med service-nøglen som secret; rate limit og robots er allerede i crawleren — CLAUDE.md regel 1, 3 ændres ikke). (2) **Tekst, der er sand uanset drift:** én friskhedslinje, regnet af `max(sidst_set)` pr. kilde, som allerede hentes (`EKSTERNE_KOLONNER`): SRP-tallinjen "541 annoncer · fra 4 kilder · **senest opdateret 20. aug.**" og (i)-popoveren med datoen pr. kilde; forsidens "Tallet er antallet til salg lige nu" → "Tallet er antallet i lageret, senest opdateret 20. aug."; mærkesidens "Der er lige nu" → "Der er" + samme linje. Når `max(sidst_set)` er ældre end 2 dage, skrives datoen; er den i dag/i går, skrives "i dag"/"i går". Mål: ingen sætning med "lige nu"/"i dag" uden en dato bag sig. |
| **D8-F3** | **P3** | `css/styles.css:851` (`#featured-listings .card-external .card-title-main{-webkit-line-clamp:2 …}`) mod `:1006-1010` (`.card-title-main{height:24px; line-height:24px; white-space:nowrap}`) | Kompakte kort (390): "Honda CB 1000" / "Suzuki Gs katana" / "Harley-Davidson" — modellen klippet **uden ellipse** (`text-overflow` virker ikke på `-webkit-box`) og en **tom linje** under titlen (h3 er 44 px, boksen 24). Bilbasen: to linjer titel, hel. D7-F4 er ikke lukket, bare ændret. | `#featured-listings .card-external .card-title-main{height:auto; max-height:36px; line-height:18px}` + `#featured-listings .card-external .card-title{height:auto; min-height:36px}`. Efterprøv "Harley-Davidson Electra Glide" og "Honda CRF 1000 L Africa Twin" ved 390. |
| **D8-F4** | **P3** | `css/styles.css` `.brand-chip` / `.brand-chip-name` (nowrap + ellipsis ≥640), gitteret 6 spalter ved 1366 | "Harley-Da…" (mærke nr. 2, 72 annoncer) og "Royal Enfi…" klippet i chips, der kun indeholder navn + tal. Bilbasen: navne hele. D7-F5 byttede ombrydning for klipning. | `repeat(auto-fill, minmax(205px,1fr))` på ≥1200 (→ 5 spalter ved 1366, 6 fra ≈1 400) **eller** tal-badgen `position:absolute` i hjørnet, så navnet får 40 px mere. Mål: 0 chips med ellipse ved 1366 og 1600. |
| **D8-F5** | **P3** | `js/components.js:1108-1114` (`--cookie-h` måling), `css/styles.css:179` (`body:has(#cookie-banner:not([hidden])){padding-bottom:var(--cookie-h)}`) | **454 px tom flade under footeren** på `bikerbasen-forside-d-full.png` (runde 7: 494; D7-F6's lytter på visibilitychange/load har ikke ændret det i denne optagelse). SRP/VDP/mærkeside: 0. Bilbasen: 0. | CSS-only, ingen variabel at holde ved lige: læg `#cookie-banner` i dokumentflowet som `position:sticky; bottom:0` sidst i `<body>`, fjern `body{padding-bottom:var(--cookie-h)}` og `scroll-padding-bottom` bliver `calc(bannerets faste højde)` via `:has()`. Mål: `document.scrollHeight − footer.bottom === 0` i både for- og baggrundsfane. |
| **D8-F6** | **P3** | `index.html:8-9` (`<title>Bikerbasen — Køb og sælg brugte motorcykler i Danmark</title>`, description "samler brugte motorcykler"), footer-`<p>` på alle sider ("Danmarks mødested for køb og salg af brugte motorcykler. Bygget til entusiaster, af entusiaster."), JSON-LD `WebSite.description`, footer-kolonnen "Om Bikerbasen" | **172 af 548 rå rækker (≈32 %) er fabriksnye** — title, description, tagline og JSON-LD siger "brugte" (D7-M1's regel: overskriften skal passe til lageret). "Danmarks mødested" er samme slags påstand som Bilbasens "Danmarks største", bare uden tal. Og footeren har **intet link til `om-indeksering.html`** (findes, svarer 200 — CLAUDE.md regel 4's kontaktvej) eller `om-bikerbasen.html`; Bilbasen: "Om Bilbasen · Kundeservice · Hjælp". | Title "Motorcykler til salg i Danmark — nye og brugte, samlet ét sted | Bikerbasen"; description uden "brugte"; tagline "Motorcykler til salg fra danske forhandlere og markedspladser — samlet ét sted, kilden på hvert kort."; JSON-LD samme. Footer "Om Bikerbasen": + "Om indeksering" + "Om Bikerbasen". |

### Søgeside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D8-S1** | **P1** | `soegning.html:13` (`<title>Brugte motorcykler til salg — Bikerbasen</title>`), `:14` (description "Brugte motorcykler til salg på Bikerbasen …"), `:23` (og:title), `:303` (`<h1 class="search-heading">Brugte motorcykler til salg</h1>`), `scripts/build-srp.js` (den forudtegnede udgave) | **"Brugte" over ≈170 fabriksnye af 541** (172 af 548 rå rækker, målt med `eksternErNy()`-reglen via REST) — præcis D7-M1, som blev rettet på mærkesiden og står urørt på søgesiden, sitets vigtigste side. Kortene under h1'en bærer chippen "Ny" (fx Honda NT 1100 A 2025 · 600 km; Honda CRF 1100 L 2026 · 300 km). Bilbasen: "Viser 40.438 biler til salg" — ingen stand i overskriften. | h1 "Motorcykler til salg i Danmark" (build-srp + soegning.html), title "Motorcykler til salg — nye og brugte | Bikerbasen", description uden "brugte". Tallinjen får standen med, regnet med `eksternErNy()`: "541 annoncer · 369 brugte · 172 fabriksnye · fra 4 kilder (i)" — og når et standfilter er aktivt, følger teksten med. Samme test som `scripts/maerkeside.test.js` låser for mærkesiden. |
| **D8-S2** | **P2** | `js/search.js:1777-1800` (`renderPagination`: `<button data-page>` + `render()`), `:136-138` (`render()` → `replaceState`) | **Tilbage-knappen virker ikke på sideinddelingen.** Side 1 → 2 → 3 skriver `?page=N` med `replaceState`; Tilbage forlader søgesiden (eller springer til sidste filter-pushState). Sidetallene er `<button>`, ikke `<a href>` — ingen "åbn i ny fane", ingen sti for crawlere til side 2–23 (541 annoncer, 24 pr. side). Bilbasen: `?page=N` som rigtige adresser, Tilbage går én side tilbage. Egen regel (`:2037`): "et diskret klik får sit eget historik-punkt" — et sideskift er et diskret klik. | Tegn `<a href="soegning.html?${currentQueryString(true)}&page=N" data-page="N">`, afbryd klikket med `preventDefault()` → `state.page = N; pushFilterState();` (ikke `render()`), behold `scrollTo(0)`. `popstate` læser allerede `page` fra URL'en (`:68`). Mål: Tilbage fra side 3 lander på side 2 med filtrene bevaret; `curl soegning.html?page=2` indeholder `?page=3` i markup'en. |
| **D8-S3** | **P1** | `js/mine-annoncer.js:184-186` (`fresh = matches.filter(l => new Date(l.createdAt) > since)`), `:198-201` (klokken "Slå notifikationer til"), `js/search.js:2142` (toast "… hvor den tæller nye annoncer"), `js/backend-bridge.js:661-675` (`createdAt: null`, `indekseretFoerste: row.foerst_set`) | **"Tæller nye annoncer" tæller aldrig nye indekserede annoncer.** `createdAt` er med vilje `null` på 541 af 541 (begrundet: ikke annoncens alder hos kilden) → `new Date(null) = 0` → "N nye" vises aldrig; kun "N annoncer i alt". D7-S1 byttede "mail" for "tæller nye" — og den nye sætning holder heller ikke. Klokken skifter en `notify`-flag, intet læser. Bilbasen: søgeagenten leverer. | Det, vi ved, er `foerst_set` — "hvornår VI så den første gang" — og det er præcis det, en gemt søgning skal tælle fra: `const set = l.indekseretFoerste || l.createdAt;` i `fresh`, og etiketten "N nye siden du gemte (første gang set hos kilden efter {dato})". Klokken fjernes, til mail findes (BACKLOG: trigger på `eksterne_annoncer`), eller mærkes "Besked på mail: kommer". Test i `js/favoritter.test.js`-stil: en agent gemt i går + en annonce med `indekseretFoerste` i dag → 1 ny. |
| **D8-S4** | **P3** | `js/components.js:503-520` (`eksternTitel`: undertitel = `typeLabel(type)` hvis `variant` findes, ellers resten af `delModelOgVariant(model)`) | Undertitlens slot skifter betydning fra kort til kort: "Naked" (type) · "(Eurosport)" (variant, med parenteser) · "virago" (småt) · "DragStar Classic" · "Aspencade" · "Gold Wing" (`B-srp-d` y≈622, `B-srp-m-full` y≈7 280, 9 290). Bilbasen: altid "variant/udstyrslinje" under "Mærke Model" — én betydning. | I `delModelOgVariant()`: strip omkransende parenteser og sæt stort begyndelsesbogstav; og når der IKKE er en variant, vis typen i slot'en (som de andre kort) og lad hele modelstrengen stå i titlen. Én regel: slot 2 = type. |
| **D8-S5** | **P3** | `crawler/normalize.js:434` + `js/backend-bridge.js:495` (`rensModelStoej`) | Rest efter D7-S4 (REST, 548 rå): **12 modeller med årstal** ("ER6 2007", "Thruxton 1200 fra 2017", "GPZ 500S årg 1992", "CB 500 Hornet 2025"), **1 med ccm** ("Gs katana 650 cc"), **14 med småt begyndelsesbogstav** ("vf750f", "zephyr", "xv 750 virago"). Og 3 annoncer med **km < 100 på årgange før 2020** ("Honda vf750f 1983 · 59 km" står som fakta på SRP og mærkeside). Bilbasen: "Skoda Roomster · 1,2 12V Classic 5d". | `rensModelStoej`: drop `\b(fra|årg\.?)?\s?(19|20)\d{2}\b` i halen, når tallet = `aargang`; drop `\b\d{2,4}\s?cc\b`; stort begyndelsesbogstav på første ord, når hele ordet er småt. Kilometer under 100 på årgang < 2020: vis tallet, men med `title` "Kilden skriver 59 km — tjek hos kilden" (ingen gæt, ingen skjul). |
| **D8-S6** | **P3** | `soegning.html:318-330` (skuffens header "Filtre · Nulstil · ×"), `:562` (`.filter-drawer-footer` "Nulstil · Vis 541 annoncer"), `css/styles.css:1344-1350` (skuffe 88vh) | `bikerbasen-srp-filtre-m.png`: **"Nulstil" to gange** (y 136 og 808), skuffen begynder ved ≈100 med headeren og en halvt synlig h1 over sig ("Brugte motorcykler til salg" klippet ved 100). Bilbasens filterlag er fuldskærm med én "Nulstil". | Fjern header-"Nulstil" (behold den i bunden ved siden af den primære), skuffen `height:100dvh` med egen lukkeknap — eller behold 88vh og læg en `backdrop` over header/h1, så intet titter frem. |
| **D8-S7** | **P3** | `soegning.html:76-77` (`.site-footer{content-visibility:auto; contain-intrinsic-size:auto 1014px}` / ≥768: 372px) | Footerens reelle højde er ≈855 px ved 390 (forside-m-full 6 470–7 330) og 370 ved 1366 — pladsholderen er 1 014: **≈160 px spring** i rullehøjden, når footeren tegnes første gang på mobil. Desktop passer. | `contain-intrinsic-size:auto 860px` ved <768. (Den sorte flade i fuldsideoptagelsen er denne regel — ikke en fejl.) |

### Annonceside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D8-A1** | **P2** | `annonce.html:8-9` (`<title>`, `meta description` "Se billeder, specifikationer og **kontaktoplysninger** for denne brugte motorcykel"), `:18` (`og:title` "Annonce — Bikerbasen"), `:120` (statisk h1 "Brugt motorcykel til salg"); `js/seo.js`/`js/annonce.js:365` overskriver kun i browseren | **"Del"-knappen deler et forkert forhåndsbillede.** Messenger, WhatsApp, Slack, iMessage henter `annonce.html?id=…` **uden JavaScript** og viser de statiske tags: "Annonce — Bikerbasen / Se billeder … og kontaktoplysninger" — to ting, regel 2 forbyder os at have, på 541 af 541 delte links. Bilbasen: per-bil og:title/og:image i HTML'en. (Googlebot kører JS og ser noindex + canonical til kilden — det er i orden og låst i DECISIONS.) | Statiske tags, der er sande for alle 541: title "Motorcykel til salg — Bikerbasen", description "Pris, årgang, km, ccm og kørekortkategori for en motorcykel til salg hos en dansk forhandler eller markedsplads — indekseret af Bikerbasen, handlen sker hos kilden.", og:image `og-image.png`, h1-fallback "Motorcykel til salg". Mål: `curl -A facebookexternalhit annonce.html?id=…` → ingen "billeder"/"kontaktoplysninger"/"brugt". |
| **D8-A2** | **P3** | `js/annonce.js:683-740` (`.external-detail-head`: flag "Annonce hos MC Syd — det er dem, du køber af" 118–156, fototekst "Foto: MC Syd — flere billeder i deres annonce" ≈478, "hos MC Syd" ved prisen, "Forhandlerannonce", CTA "Se annoncen hos MC Syd") | Mobil første skærm: **kilden nævnt 5 gange** i 844 px. Bilbasen: logo én gang + knapperne. Gentagelsen koster ≈50 px (flaget), der ville lægge Kilometer · Kubik på første skærm (række 2 ved ≈850 → ≈800). | <960: skjul flaget (CTA'en og "hos MC Syd" ved prisen bærer det); behold det ≥960, hvor aside-kortet står ved siden af. Forventet: CTA ≈645–693, gitterets begge rækker ≈745–855 — tæt på, men række 2 halvt; alternativt gitteret over CTA'en på mobil (nøgletallene er vores trumf, CTA'en er sticky alligevel — `B-vdp-m-full` viser den 76 px høje bjælke). |
| **D8-A3** | **P3** | `js/annonce.js` "Beskrivelse"-sektionen (h2 + én sætning "Beskrivelsen, udstyrslisten og de øvrige billeder står i MC Syds egen annonce …") | En h2 for et fravær. Bilbasen har en beskrivelse; vi har — med rette (regel 2) — ingen, men overskriften lover én. | Drop h2'en; gør sætningen til en linje i "Før du kører derhen" ("Beskrivelse, udstyr og flere billeder: i MC Syds annonce →" med linket). Siden bliver ≈90 px kortere og lyver ikke med en overskrift. |

### Mærkeside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D8-M1** | **P2** | `maerke-honda.html:951` (`<a class="btn btn-primary">Se alle 256 Honda i søgningen — med filtre og sortering</a>`), `css/styles.css:234-241` (`.btn{white-space:nowrap}`), ingen `overflow-x` på `html/body`; `scripts/build-brand-pages.js` (teksten) | **Siden ruller vandret på 390.** Fuldsideoptagelsen er **440 px bred** (de tre andre -m-full: 390); eneste indhold uden for 390 er knappen ved y 12 088–12 132 (`bikerbasen-maerke-m-full.png`, PIL-scan). Knappen er ≈422 px; på telefonen står "…og sortering" uden for skærmen, og hele siden kan trækkes sidelæns. Bilbasen: 0 px overløb. Gælder alle 27 mærkesider med samme skabelon. | `.brand-mere .btn{white-space:normal; text-align:center; max-width:100%; line-height:1.3}` **og** kortere tekst: "Se alle 256 Honda i søgningen" (resten står i sætningen over). Belt: `html,body{overflow-x:clip}` — men ret årsagen. Mål: `document.documentElement.scrollWidth === 390` på alle 27 sider. |
| **D8-M2** | **P2** | `scripts/build-brand-pages.js` (rækkefølge: h1 · intro · details · "Se Honda efter model" · chips · `<h2 class="brand-sub">` "256 annoncer til salg nu — de første 24 her" · `<a>` "Alle 256 i søgningen" · gitter), `css/styles.css:2784` (`.brand-sub:not(:first-child){margin-top:var(--space-6)}`) | Første kort **≈630 (390)** mod mål ≤620 og Bilbasen ≈282; **≈80 px luft** 415→495 mellem chips og overskrift; "256" står **tre gange** før det første kort (intro, overskrift, link). 1366: 589 mod 527. | Overskrift og link på samme række (`.section-head` findes allerede: "256 Honda til salg — de første 24" + "Alle 256 i søgningen →" til højre), `margin-top: var(--space-5)` over den, og fjern den separate link-linje. Forventet: første kort ≈540 (390) / ≈540 (1366). |
| **D8-M3** | **P2** | `scripts/build-brand-pages.js` (siden har ingen filtre/sortering/sideinddeling — D7-M2 valgte "24 + knap") | Den blinde dom tabes på **funktion, ikke udseende**: "Honda på A2 under 60.000 kr." er to klik og et sideskift hos os, nul hos Bilbasen. 24 kort i søgningens rækkefølge er rigtigt; at ingen af søgningens håndtag følger med, er det, der gør siden til en landingsside i stedet for en markedsplads. | Uden at bygge sidebjælken om: **facetlinks med tal over gitteret**, statiske og crawlbare — "Kørekort: A1 (10) · A2 (29) · A (145)" → `soegning.html?brands=Honda&koerekort=A2`; "Pris: under 30.000 (n) · under 60.000 (n) · under 100.000 (n)"; "Type: Touring (n) · Adventure (n) · …" — tallene regnes allerede for tekstpakken (`kørekort til Honda`, `prisniveau`). Og ét `<select>` "Sortér" der sender til `soegning.html?brands=Honda&sort=…`. Næste skridt (hvis mennesket vil): mærkesiden = `soegning.html?brands=Honda` forudtegnet med tekstpakken under. Mål: antal klik til "Honda · A2 · ≤60.000": 2 → 1. |
| **D8-M4** | **P3** | `scripts/build-brand-pages.js` `introFor()` ("Der er lige nu **256** Honda motorcykler til salg **på Bikerbasen**") | "Til salg på Bikerbasen" — de er til salg hos MC Syd, Gul og Gratis, Rydbergs og Jensens; Bikerbasen hoster ingen (CLAUDE.md). Og "lige nu" (D8-F2). Bilbasen kan skrive "på Bilbasen"; vi kan ikke. | "Der er **256** Honda til salg hos danske forhandlere og markedspladser, indekseret på Bikerbasen — 91 brugte og 165 fabriksnye — fra 4.000 kr. Senest opdateret {dato}." |
| **D8-M5** | **P3** | `scripts/build-brand-pages.js` "Se Honda efter model"-chips (12 modelnavne uden tal) | Forsidens mærkechips har tal, "Andre mærker" har tal (D7-M5), modelchips har ingen — og FAQ'en kender tallene ("GL 1800 Gold Wing (18 stk.)"). Bilbasens modellinks har heller ingen tal — det er ikke en grund. | "GL 1800 Gold Wing · 18" osv.; samme chip-komponent som "Andre mærker". |

---

## 5. Kopiér IKKE fra Bilbasen

Runde 5–7's liste står ved magt (takeover-annoncer, Køb/Leasing, Solgt.com,
Lendo, nyhedsbrev, "Danmarks største"/"700.000 købere", stjerner/anmeldelser,
billedstribe/galleri/video/logo på kortet, hjerte på eksterne (D-008), "Book en
prøvetur"/"Vis telefonnummer", nummerplade-vurdering, "Seneste biler" med dato,
cookie-modalen, mening/historie-prosa, "Populære modeller" uden tal, grå
silhuet, "Brugte …" som h1 over et blandet lager). Runde 8 tilføjer fire — og
én ting, der gerne må kopieres:

| Bilbasen-element | Hvorfor ikke |
|---|---|
| Leasingpriser i samme kortformat som købspriser ("3.550 kr.", "3.799 kr." på en forside med "Brugte biler til salg") | Et tal uden enhed ved siden af et andet tal med en anden enhed. Vores kort har én pris, i kr., eller "Pris ved henvendelse". |
| "Se flere biler / Se flere private biler / Se flere seneste biler" — tre udvid-knapper, der hver tegner 12 kort mere med spinnere | Det er tre søgesider på forsiden. Vores "Til salg lige nu" + "Se alle annoncer →" er rigtigt; det, der skal rettes, er sandheden i dens underrubrik (D8-F1), ikke antallet. |
| "Generelle modeloplysninger*" med "-" i Nypris, Bagagerumsstørrelse, Farve | Rækker, der står tomme, fordi skabelonen har dem. Vores `raekke()` dropper rækken, når feltet mangler — behold det. |
| "21 km" på en Kia Rio 2015 i "Seneste biler" (og "0 km, modelår 2027" på brugtbilsforsiden) | De viser kildens tal uden forbehold. Vi gør det samme ("59 km, 1983") — det er D8-S5's `title`, ikke et skjult tal, der er svaret. |
| **Må gerne kopieres (form, ikke påstand):** "50.355 annoncer **i dag**" | Et tal med en tidsangivelse, der kan holdes. Det er D8-F2's tekstlag: "541 annoncer · senest opdateret 20. aug." — og så køre crawleren, så der kan stå "i dag". Og: sideinddeling som rigtige adresser (D8-S2). |

---

## 6. Den ene ændring pr. side

**Forside — D8-F1: lad loftet følge antallet af kort.** Én linje
(`vaelgFeatured(maks)` i stedet for `vaelgFeatured(8)`), og den eneste påstand
på forsiden, der kan efterprøves ved at tælle kort, er sand igen på begge
skærme. Forsiden vinder allerede blindt; det, der kan tabe den, er en regel,
siden selv skriver og bryder. (D8-F2 — friskheden — er sitets vigtigste
rettelse og står her, fordi forsiden er det sted, "lige nu" står oftest; men
den er drift + én linje tekst på tre sider, ikke én sides ændring.)

**Søgeside — D8-S1: en overskrift, der passer til lageret.** "Motorcykler til
salg i Danmark" og "541 annoncer · 369 brugte · 172 fabriksnye · fra 4 kilder".
Det er D7-M1's regel, anvendt på den side, der har flest besøg. D8-S2
(sideinddeling med Tilbage-knap og adresser) og D8-S3 (en søgeagent, der
faktisk tæller) følger lige efter — S3 er P1 og ti linjer.

**Annonceside — kør crawleren, og gør de statiske delingstags sande (D8-A1).**
Siden vinder klart på begge skærme; det eneste, der kan tabe den, er dens egen
ærlighed: "sidst bekræftet for 7 dage siden" er sandt, og det er dårligt. Det
er ikke en tekstrettelse, det er en kørsel (og en cron). Og når "Del" trykkes,
skal forhåndsvisningen ikke love billeder og kontaktoplysninger.

**Mærkeside — D8-M1 + M2 nu, D8-M3 som det, der flytter dommen.** Knappen, der
får siden til at rulle vandret, er en fejl, ingen blind dommer tilgiver; første
kort ved 540 i stedet for 630 er to CSS-regler. Men det, Bilbasen vinder på, er,
at deres mærkeside ER søgningen. Facetlinks med tal (kørekort · pris · type)
over gitteret giver køberen søgningens håndtag uden at bygge sidebjælken om —
og gør "Honda på A2 under 60.000" til ét klik.
