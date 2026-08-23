# Runde 7 — blind efterprøvning af runde 6 mod Bilbasen.dk, nu med mærkeside (AUDIT ONLY)

Ingen kodeændringer. Ingen produktionsfil er rørt. Denne fil er det eneste,
runden har skrevet.

Rollen er marketplace-UX-kritiker. Sæt A er Bilbasen.dk (`work/runde5/bilbasen-*`
for forside/SRP/VDP, `work/runde5/efter2/bilbasen-maerke-*` for mærkesiden
Honda). Sæt B er Bikerbasen.dk LIVE efter runde 6 (`work/runde5/efter2/bikerbasen-*`,
optaget med rul gennem siden, så lazy-billeder er hentet). `work/runde5/efter/` og
`work/runde5/bikerbasen-*` er kun brugt til at se udvikling.

Alt er holdt op mod de hårde regler, læst først: `CLAUDE.md` (aggregator; 548
annoncer indekseret fra 4 forhandlere/markedspladser, 0 egne; regel 2: ét
thumbnail, ingen galleri, ingen kontaktinfo, ingen fuld tekst; alt på siden skal
være sandt), `docs/review/DECISIONS.md` (låst: "Ærlighed slår fuldstændighed",
"Kilden ejer sine billeder", B3 ingen proxy/silhuet, D-008 ingen favorit på
eksterne, D5-F1 "samme rækkefølge som søgningen", D5-F6 udsat cascade) og
`work/DECISIONS.md` (standardsorteringen er målt; "De 162 fabriksnye bliver
MÆRKET, ikke sorteret fra" — og dens egen sætning: *"Det er overskriften
'brugte motorcykler', der er for snæver"*). `docs/review/runde-6-kritik.md` og
`docs/review/rounds/round-6.md` er læst som påstande, der skal efterprøves på
B-billederne.

**Én tidsforskydning, der skal stå øverst.** B-billederne er taget 19:27–19:29.
Commit `8aad821` ("D6-S4 — kilde-rundgang i standardsorteringen, godkendt,
målt") er fra 19:39 og er live nu. Billederne viser altså side 1 FØR rundgangen
(23 af 24 kort MC Syd på SRP, 8 af 8 på forsiden); det levende site viser side 1
EFTER (målt i browser 1366×850: 12 MC Syd · 12 Gul og Gratis, skiftevis; forsiden
6 MC Syd · 2 Gul og Gratis). Opgaveteksten siger, at D6-S4 "er bevidst åben og
kræver menneskets ja" — det ja er givet og udført. Blinddommen er afsagt på
billederne, som opgaven beder om; hvor rundgangen ændrer dommen, står det
skrevet ved siden af.

---

## 0. Sådan er der målt

Billederne er læst som billeder (Read, i 1 400–1 600 px-udsnit) og målt med
PIL: brand-farvede rækker (Bilbasen `#FF4D00`, Bikerbasen `#C6420E`) for
primære knapper; luminansspring i lodrette striber for kort- og sektionskanter;
"≈" hvor jeg har aflæst i stedet for målt (±6 px). Viewports 390×844 og
1366×850. Bilbasens fuldsider er 1 463 px brede (takeover).

Derudover er **fire ting målt på det levende site** i Browser-panelet
(bikerbasen.dk, 1366×850), fordi billeder ikke kan vise dem: (1) dokumenthøjde
mod footerens bund (D6-F8), (2) filterpanelets indre scroll og Mærke-gruppens
position, (3) kilderne bag kortene på side 1 og i "Til salg lige nu", (4)
sælgertype, modelfelter og "Ny"-markøren i `Store.getAllListings()` (548
annoncer). Ingen skrivning, ingen klik på knapper med sideeffekt.

**To måleartefakter, der ikke er dømt som design:** Bilbasens mærkeside er i
begge viewports dækket af deres cookie-modal ("Vores 1018 reklamepartnere");
dommen over deres første skærm er afsagt på, hvad der ligger under den, og
modalen er nævnt under "kopiér ikke". Og Bilbasens SRP/mærkeside-fuldsider har
tomme, hvide fotofelter under folden (deres lazy-load nåede ikke at tegne — samme
artefakt, runde 6 frikendte os for).

---

## 1. Blind dom pr. side og skærm

Dommen er afsagt på billederne, før kode blev åbnet. "Tæt på" er ikke en dom.

| Side / skærm | Vinder | Hvorfor — det, en blind dommer ser først |
|---|---|---|
| **Forside, mobil** | **Bikerbasen, snævert** (runde 6: Bilbasen snævert) | Første skærm er vores: foto-hero, fire felter, kørekort-vælger, CTA ved **655–706** mod 674–717, og en sand sætning ("548 motorcykler til salg hos 4 danske forhandlere og markedspladser") mod "Danmarks største markedsplads". Første annoncekort **1 157** mod ≈1 530, og nu er det **8 kompakte kort i to spalter** (≈322 px pr. række, sektionen 1 157→≈2 445) med pris · model · år · km · ccm · kørekort · kilde — Bilbasens 2-spaltede kort har pris · titel · km. Ingen grå felter (0 af 8; Bilbasen 2 grå silhuetter af 14). Det, der trækker fra, og som holder dommen på "snævert": **8 af 8 kort er MC Syds riflede væg** — en blind dommer læser "én forhandlers lager", ikke "4 kilder" (live efter `8aad821`: 6 af 8). Og Bilbasen har stadig 30 kort mod vores 8. |
| **Forside, desktop** | **Bikerbasen, klart** (runde 6: Bilbasen snævert) | Uden takeover er vores hero den eneste, man kan se: h1, tal, formular, CTA **577–628** mod 623–664 under en OK-ladeboks. Første kort **897** mod ≈1 200, 6 kort med fotos (0 grå; runde 6: 3 af 6), typefliser med tal, mærkechips med tal. Bilbasens eneste plus er 28 kort mod 6 — men 8 af deres første 8 er varebiler til leasingpriser ("3.599 kr.") på en "brugte biler"-forside. Trækker fra hos os: 6 af 6 MC Syd-fotos (samme væg), og "Royal Enfield" ombryder i chippen. |
| **Søgning (SRP), mobil** | **Bikerbasen, snævert** (uændret) | Første kort **≈280** mod 284, første pris **≈525–540** mod 684–696, andet kort over folden (≈716) — 1,9 kort pr. skærm mod 1,1. Overskriften er én linje ("548 annoncer · fra 4 kilder (i)"), vælgeren siger "Blandet". Det, der stadig koster "klart": **placeholderen klipper stadig — "Mærke eller m"** (ingen ellipse), og side 1 er 23 af 24 MC Syd-vægge (live: 12/12). Bilbasen viser logo · galleriprikker · video · hjerte — aktiver vi ikke må have, og de flytter ikke dommen. |
| **Søgning (SRP), desktop** | **Bikerbasen, klart** (uændret) | Første kort **323** mod 527, første pris ≈560 mod ≈876, ingen takeover, 9 kort i første 1 400 px mod 3. Kildelinjen er én linje. Eneste synlige svaghed: sidebjælken viser **kun Kørekort og Pris** i sin egen 748 px-rude — Mærke (Bilbasens 2. felt) ligger ved 1 154 px inde i panelets interne scroll, som intet i billedet afslører. |
| **Annonce (VDP), mobil** | **Bikerbasen, snævert** (runde 6: Bilbasen klart) | Den primære knap står nu under prisen ved **739–787** ("Se annoncen hos MC Syd ↗"). Rækkefølgen er ren: kildeflag 118–156 → foto 182–445 → titel 516 → pris 616–636 → CTA → handlingsrække 818. Bilbasen: tre knapper ved 77–165 FØR bilen, foto 213–507, +11-stribe, titel 638, "4,4 · 58 anmeldelser", pris 743 — og så en Lendo-ydelse. Deres første skærm har mere bevis (11 fotos, logo, anmeldelser), men det er aktiver, regel 2 forbyder, og de tre knapper over fotoet er støj. Det, der holder os på "snævert": **nøgletallene (vores trumf) begynder ved 863 — 19 px under folden**, og "Kørekort ikke afgjort" i "Lignende" på 1 000 ccm-maskiner læses som "vi ved det ikke", lige under en boks, der siger "A dækker hele lageret". |
| **Annonce (VDP), desktop** | **Bikerbasen, klart** (runde 6: snævert) | CTA **236–283** mod 311–350 (under en 190 px tom annonceplads), titel 584 og pris 698 over folden mod ≈950/978 under den; nøgletalsgitteret 824–908 med alle 5 celler på én række (etiketter over folden, værdier ≈878 lige under). Højre spalte har nu handlinger med tal ("Alle annoncer fra MC Syd · 332", "Alle Honda · 262" …) som Bilbasens "Se forhandlerens 46 annoncer". Trækker fra: spalten slutter ved 778, og fra dér til 3 402 er der **ingen synlig CTA** — Bilbasens spalte følger længere med. |
| **Mærkeside (Honda), mobil** | **Bilbasen, klart** — ny i sammenligningen | Under Bilbasens cookie-modal ligger deres SRP med Honda valgt: søgefelt · klokke · "Filtre 3", "Viser 141 biler", sortering, første kort ≈282, 30 kort, **"Side 1 af 5"**, derefter model-links og tre prosablokke; 18 987 px. Vores: brødkrumme, h1, **12 linjer indledning**, to knapper 576–623, 12 modelchips, "262 annoncer til salg nu", første kort **873** — og så **alle 262 kort under hinanden uden filtre, sortering eller sideinddeling: 130 358 px**. Det er ikke en markedsplads-side, det er en udskrift. Oven i det står der "Brugte Honda" og "262 brugte" over kort, hvoraf 165 bærer chippen "Ny". |
| **Mærkeside (Honda), desktop** | **Bilbasen, klart** | Samme billede: deres 3-spaltede SRP-gitter med 30 kort og sideinddeling (6 818 px) mod vores h1 ved 157, indledning 200–340, knapper 379–425, chips 490–585, overskrift 693, første kort **728**, og 262 kort i 3 spalter (45 488 px). Bilbasens prose er fluff ("Honda er et lidt overset mærke", "Hondas historie"); vores er tal — men to af vores overskrifter sidder klistret til forrige afsnit, og én sætning modsiger sig selv ("Ligger prisniveauet uden for budgettet, ligger brugte KTM typisk i samme leje"). |

Samlet: **6–2 til Bikerbasen** (runde 6: 3–3 på seks celler). Forside, SRP og VDP
er vundet på begge skærme. Mærkesiden tabes klart på begge — ikke på udseendet
af ét kort, men fordi siden mangler det, der gør en mærkeside til en
markedsplads (filtre, sortering, sideinddeling), og fordi dens overskrift ikke
passer til dens lager. Det, der nu skiller på de vundne sider, er fire ting:
sælgertypen "Privat" er et gæt (P1), søgeagenten lover en mail, den ikke kan
sende (P1), placeholderen klipper stadig, og Mærke-filteret er usynligt på
desktop.

---

## 2. Pixelfakta (A = Bilbasen, B = Bikerbasen efter runde 6)

### Forside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 674–717 | **655–706** | 623–664 | **577–628** |
| Første annoncekort (y) | ≈1 530 | **1 157** | ≈1 200 | **897** (før 1 017) |
| Kort under hero'en | ≈30 (14+12+4), 2-spaltet, ≈225 px/kort | **8, 2-spaltet, ≈322 px/række** (før 4 à 475) | ≈28, 4-spaltet | **6**, 3-spaltet |
| Grå/tomme fotofelter | 2 af 14 (silhuet) | **0 af 8** (før 1 af 4) | 1 af 28 | **0 af 6** (før 3 af 6) |
| Kilder bag kortene | 3+ forhandlerlogoer i første 6 | **8 af 8 MC Syd** (live efter 8aad821: 6/2) | blandet | **6 af 6 MC Syd** |
| Sidehøjde | 7 589 | **7 330** (før 7 876) | 4 384 | **5 846** — heraf 495 px under footeren (se D6-F8: måleartefakt, forklaret) |

Sektioner hos B (390, ≈): hero 0–923 · Til salg lige nu 998–2 445 (8 kort) ·
Søg efter type 2 582–2 900 · Mærker 2 916–3 400 · Tryghed 3 555–4 300 · SEO-bånd
4 365–5 050 · facetrækker 5 118–5 650 · Sælg 5 745–6 320 · footer 6 470–7 330.

### Søgeside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Rækker over listen | 4 | **5** (brødkrumme · h1 · søg+klokke+Filtre · antal (1 linje) · Sortér+visning) | — | — |
| Søgefeltets placeholder | "Søg på bil" (hel) | **"Mærke eller m" — klippet** | "Søg på bil, mærke, model…" | "Mærke eller model" (hel, 718 px) |
| Første kort (y) | 284 | **≈280** (før 303) | 527 | **323** (før 335) |
| Første pris (y) | 684–696 | **≈525–540** | ≈876 | ≈560 |
| Kort pr. første skærm | 1,1 | **1,9** | 1,0 | 3 (+3 delvist) |
| Side 1, kilder | 3 forhandlere i de 3 første | **23 MC Syd · 1 Gul og Gratis** (live: 12 · 12) | — | samme |
| Sidebar: grupper synlige uden indre scroll | — | — | modal | **Kørekort (73) · Pris (356→839)**; Type 839, **Mærke 1 154** af 2 220 i en 748 px-rude |
| Sidehøjde | 17 647 | 12 381 | 6 540 | 5 114 |

### Annonceside

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Primær CTA (y) | 77–116 (+2 til 165) | **739–787** (før ≈2 770) | 311–350 | **236–283** |
| Varsel/flag | 0 | 118–156 | 190 px tom annonceplads | 0 |
| Foto | 213–507 | 182–445 | 311–795 | 128–528 |
| Titel / pris | 638 / 743 | **516 / 616–636** | ≈950 / ≈978 | **584 / 698** |
| Nøgletal | ≈1 090+ | gitter **863–1 115** (under 844) | — | gitter **824–908**, værdier ≈878 (under 850) |
| Højre spalte slutter | — | — | ≈2 350 af 5 194 | **778 af 3 402** |
| Sidehøjde | 7 845 | 6 076 | 5 194 | 3 402 |

### Mærkeside (Honda)

| | A 390 | B 390 | A 1366 | B 1366 |
|---|---|---|---|---|
| Første skærm | cookie-modal; under den: søg · klokke · Filtre 3 · "Viser 141" · Sortér · Køb/Leasing | brødkrumme 85 · h1 130–180 · indledning 200–525 (12 linjer) · knapper **576–623** · "Se Honda efter model" 658 + chips 690–730 · "262 annoncer til salg nu" 840 | cookie-modal; under den: SRP-layout | h1 157 · indledning 200–340 · knapper 379–425 · 12 chips 490–585 · overskrift 693 |
| Første kort (y) | ≈282 | **873** | ≈527 | **728** |
| Filtre / sortering / sideinddeling | ja / ja / **"Side 1 af 5"** (30 pr. side) | **nej / nej / nej — 262 kort på én side** | ja / ja / ja | nej / nej / nej |
| Antal kort på siden | 30 | **262** | 30 | **262** |
| "Ny" (fabriksny) blandt kortene under "Brugte …" | — | **165 af 262** | — | 165 af 262 |
| Bundindhold | model-links · "Honda" (mening) · "3 Facts" · "Hondas historie" | Prisniveau · Kørekort · Hvad du skal tjekke · FAQ (3 `<details>`) · Andre mærker — alle med tal fra lageret | samme | samme |
| Sidehøjde | 18 987 | **130 358** | 6 818 | **45 488** |
| HTML | — | 900 KB rå (52 KB overført), 256 lazy-billeder, `js/maerke.js` tegner alle 262 igen efter `backendReady()` | — | samme |

---

## 3. Runde 6's findings — én for én, med bevis fra B-billederne

| ID | Status | Bevis |
|---|---|---|
| D6-F1 grå kort i "Til salg lige nu" | **lukket** | 0 af 8 (390) og 0 af 6 (1 366) grå; første række `loading="eager"`. Optagelsesprotokollen med rul er fulgt (mappen hedder efter2). |
| D6-F2 "set af hele Danmark" | **lukket** | "Gratis annonce for private" + "Ingen kommission, ingen skjulte gebyrer. Din annonce står i søgningen side om side med de indekserede …"; tre punkter, der beskriver, hvad koden gør; priskortet "0 kr. · ingen binding". Ingen rækkevidde- eller tidspåstand. |
| D6-F3 Scooter (0) i SEO-kolonnen | **lukket** | "Motorcykeltyper": Cruiser (89) … Cross/MX (1), flest først, ingen Scooter (`B-fors-m` y≈4 440, `-d` 3 480). |
| D6-F4 tæthed på mobil | **lukket** | 2-spaltet kompakt gitter, 8 kort, foto 4:3, pris 16 px, titel én linje, to chiprækker, kildelinje "mcsyd.dk". Sektionen 1 157→≈2 445 (før 1 158→3 040 med 4 kort). Kosmetik: titlen klipper modellen væk ("Harley-Davidson …", "Honda CB 1000 H…") → D7-F4. |
| D6-F5 måne i desktop-headeren | **lukket** | Headeren: Forside · Søg motorcykler · Log ind. "Lys / mørk tilstand" står i footerens "Om Bikerbasen" på alle fire sider. |
| D6-F6 første kort 167 px under folden | **lukket** | h2 "Til salg lige nu" ved 808, underrubrik 849, første kort 897 (mål ≈897). |
| D6-F7 "Bsa" og ombrydning | **delvist** | "BSA" ✓ (chip og SEO). Men "Royal Enfield" ombryder stadig til to linjer på desktop (`B-fors-d` y≈2 800) og "Harley-Davidson" på mobil (y≈1 460) — `white-space:nowrap`/minbredde er ikke sat. |
| D6-F8 tom flade under footeren | **forklaret — måleartefakt med en lille ægte kant** | Live på 1366×850: footerens bund 5 846, `scrollHeight` 6 072 → 226 px, og de 226 px er `body{padding-bottom:var(--cookie-h)}`. `--cookie-h` måles af `initCookieConsent()` med `offsetHeight` + `ResizeObserver` — men banneret var 80 px høj, og variablen stod på 226: siden var indlæst i en **baggrundsfane** (`document.visibilityState === 'hidden'`), hvor ResizeObserver-callbacks ikke kører, så den første (høje, ustilede) måling blev stående. En optagelse i baggrund ser altså en tom strimmel; en bruger i forgrunden gør ikke, før fanen har været skjult under indlæsning (Ctrl+klik fra Google → samme tilstand, indtil fanen vises og observeren fyrer). Ikke design, men værd at hærde → D7-F6. |
| D6-F9 fem chips → 4+1 | **lukket** | Fire chips på én række (A2 under 60.000 kr. · Under 50.000 kr. · Adventure · Cruiser), søgekortet slutter ved 700. |
| D6-S1 klippede tekster | **delvist** | "Blandet" ✓. Placeholderen blev kortet til "Mærke eller model" — og klipper stadig: **"Mærke eller m"** (`bikerbasen-srp-m.png` 131–175, zoomet). → D7-S2. |
| D6-S2 overskrift på to linjer | **lukket** | Én linje: "**548** annoncer · fra 4 kilder (i)" ved 203; første kort ≈280 — på niveau med Bilbasens 284 (dev måler 279). |
| D6-S3 klippet fodlinje i 280 px | **lukket** | Desktop: "Rødding" + "mcsyd.dk" / "Svendborg" + "guloggratis.dk" — sælgertypen skjult i smalle spalter (`B-srp-d` y≈2 075). Mobil: "Forhandler · mcsyd.dk". |
| D6-S4 kilde-rundgang | **lukket — efter billederne** | Billederne (19:27): 23/24 MC Syd. Commit `8aad821` (19:39): side 1 live = 12 MC Syd · 12 Gul og Gratis, skiftevis; forsiden 6 · 2; de billedløses pladser uændrede; målt og skrevet i DECISIONS. Godkendt af mennesket. Bivirkning, set live: kort 2 på forsiden er nu "Suzuki Motorcykel med meget udstyr · Privat · guloggratis.dk" → D7-F1 og D7-S4. |
| D6-S5 "+2 kilder" alene på linje 2 | **lukket** | "indekseret: 332 hos MC Syd · 118 hos Gul og Gratis · 98 hos 2 andre (i)" på én linje (`bikerbasen-srp-d.png` 295). |
| D6-S6 "km i…" | **delvist** | ≤620 px: "2025 · 1.000 ccm · km ikke oplyst" + "Kørekort ikke afgjort" på to rækker ✓ (`B-vdp-m` Lignende). Men reglen er en media-query, ikke en container-query: på mærkesidens 3-spaltede desktopkort (krop ≈348 px) klipper "km ikke op…" / "km ikke …" igen (`bikerbasen-maerke-d-full.png` y≈44 280 og 44 770). → D7-S5. |
| D6-S7 Pris-gruppen på folden | **lukket** | "Pris (DKK)" ved 511 (viewport 527); Kørekort → Pris → Type. Men det åbner D7-S3: Mærke er nu nr. 4 og usynlig. |
| D6-A1 ingen CTA på første skærm (mobil) | **lukket** | "Se annoncen hos MC Syd ↗" ved 739–787 lige under prisblokken; bjælken følger den knap (`annonce.html:325-329`: observeren holder øje med `.external-detail-cta`, når den er synlig). |
| D6-A2 højre spalte uden handlinger | **lukket (indhold) / delvist (rum)** | "Søg videre på Bikerbasen": 5 links med tal og chevron (332 · 262 · 548 · 355 · 548) ✓; "Hentet hos MC Syd 16. aug. 2026 — for 7 dage siden" under knappen ✓; brødteksten kortet ✓. Spalten slutter stadig ved 778 af 3 402 → D7-A4 (sticky). |
| D6-A3 nøgletal under folden | **delvist** | Desktop: gitter 824–908, handlingsrækken flyttet op på titlens linje ✓ — etiketterne er over 850, **værdierne (≈878) er ikke**. Mobil: gitteret begynder ved **863** (>844). Målet "pris, kørekort, årgang, ccm, hk på første skærm" er ikke nået på nogen af skærmene → D7-A2. |
| D6-A4 3 tomme grå felter | **lukket** | 5 celler på én række (Kørekort · Årgang · Kilometer · Kubik · Effekt). |
| D6-A5 "km i…" + grå i Lignende | **lukket** | Se D6-S6; 3 af 3 fotos hentet. |
| D6-A6 "650 ccm–1.350 ccm" + dubletter | **lukket** | "Lignende: Honda · 650–1.350 ccm · 75–175 t.kr."; tre forskellige modeller (CB 1000 Hornet · CB 650 R · CB 750 Hornet E-Clutch). |

**Tælling: 16 lukket (heraf D6-S4 efter billederne), 5 delvist (F7, S1, S6, A2-rum,
A3), 1 forklaret som artefakt (F8), 0 ikke lukket.**

---

## 4. Nye findings — det, der nu afgør blinddommen

Severity: P1 = falsk/udokumenteret påstand, funktion virker ikke som lovet,
AA-brud; P2 = mærkbar forskel til Bilbasen med konkret konsekvens; P3 = kosmetisk.
"Måling" er os mod Bilbasen, hvor der er en sammenligning at lave.

### Forside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D7-F1** | **P1** | `js/backend-bridge.js:607` (`isDealer: row.saelgertype === 'forhandler'`), `js/components.js:802-803` (`saelgerType = l.isDealer ? 'Forhandler' : 'Privat'`), `js/annonce.js:115-116` + `:821-823` (`sellerTypeNoteHTML(false)`), `sources/guloggratis.yaml` (ingen `saelgertype`-selector; `crawler/normalize.js:459 normaliserSaelgertype` → `null`) | **"Privat" er et gæt på 118 af 118 Gul og Gratis-annoncer.** Kilden oplyser ingen sælgertype til os (`saelgertype = null`), broen oversætter null til `isDealer:false`, og kortet skriver "Privat · guloggratis.dk". Målt live: **mindst 8 af de 118 er forhandlerannoncer** — 7 med "MC-SYD" i titlen (Rødding, "5 ÅRS GARANTI", "BYTTER GERNE") og 1 "Aalborg MC". På annoncesiden for `a35866fe-…` ("Honda CBR 650 R MC-SYD", Gul og Gratis) står: *"Privat annonce. Forbrugerkøbelovens reklamationsret gælder ikke mellem private."* — en forkert retsoplysning om en forhandlers bil. Forsidens tryghedskort lover "Ingen gættede felter … vi fylder ikke hullet ud med et skøn", og efter `8aad821` står et Gul og Gratis-kort med "Privat" som kort nr. 2 på forsiden. Bilbasen viser forhandlerlogo eller intet — aldrig et gæt. | Tre lag, ingen nye påstande: (1) **Crawleren:** find Gul og Gratis' egen sælgertype-markering (deres annoncer bærer "Privat"/"Forhandler"-badge) og sæt `saelgertype`-selector i `sources/guloggratis.yaml`; kan den ikke læses robust, forbliver feltet null. (2) **Broen:** bær tri-state med: `saelgertype: 'forhandler' \| 'privat' \| null`, og lad `isDealer` kun være `true/false`, når feltet er sat; ellers `null`. (3) **Visning:** `null` → kortet skriver kun domænet ("guloggratis.dk"); annoncesiden skriver én neutral sætning i stedet for privat-advarslen: "Gul og Gratis oplyser ikke til os, om sælgeren er forhandler eller privat — spørg, før du handler: reklamationsretten afhænger af det." `sellerTypeNoteHTML` får tre grene. Efterprøv: de 8 kendte forhandlerannoncer viser ikke "Privat"; tests i `js/eksternt-kort.test.js` for null-grenen. |
| **D7-F2** | **P2** | `crawler/normalize.js fingerprint()` (kun inden for én kilde), `js/backend-bridge.js` (flettes uden dublet-tjek), hero-tallet `js/home.js` | **Samme motorcykel tælles to gange på tværs af kilder.** MC Syd lægger sine egne annoncer på Gul og Gratis: "Honda GL 1800 Gold Wing 2023 · 575.000 kr." står hos mcsyd.dk og som "GL 1800 Gold Wing MC-SYD 5 ÅRS GARANTI · Privat · guloggratis.dk"; "Honda CBR 650 R 2024 · 124.995" og "NC 750 X 2024 · 105.000" ligeså — 7 fundet ved mærke+årgang+pris+postnr, sandsynligvis flere (Aalborg MC). Hero'en siger "548 **motorcykler** til salg" — det er 548 annoncer, og færre motorcykler. Bilbasen har samme problem, men skriver "annoncer i dag". | Kortsigtet og sandt: hero/SRP → "548 **annoncer** fra 4 kilder" (ordet "motorcykler" kun hvor tallet er afdubletteret). Mellemlang: i `js/backend-bridge.js` (klienten) et tværkilde-tjek på `brand+year+price+postnr` (alle fire felter oplyst), hvor GG-udgaven af en forhandlerannonce markeres `dubletAf: <id>` og vises som "Også hos Gul og Gratis →" **på MC Syd-kortets annonceside** i stedet for som eget kort; tallet tæller den ikke med. Mål: 548 → N og skriv N og metoden i DECISIONS. Ingen annonce slettes fra databasen. |
| **D7-F3** | **P2** | `js/home.js tegnFeatured()` ("højst én pr. mærke", `Sortering.sorter(…,'blandet')`) | **"Til salg lige nu" = én kildes væg.** Billede: 8 af 8 (390) og 6 af 6 (1 366) er MC Syds riflede væg med grønt logo. Live efter `8aad821`: 6 af 8. Bilbasen: ≥3 forhandlere i første 6, forskellige baggrunde. Underrubrikken er sand ("samme rækkefølge som i søgningen, højst én pr. mærke") — men reglen "én pr. mærke" favoriserer den kilde med flest mærker. | Udvid reglen med én sætning og ét filter: "højst én pr. mærke **og højst halvdelen fra samme kilde**, så længe en anden kilde har et kort med foto og modelnavn" — samme mekanik som D6-S4's rundgang, bare pr. kilde i `tegnFeatured()`. Underrubrikken skrives om tilsvarende (den er en påstand, der skal passe). Mål før/efter på 548: kilder i de 8 (390) og 6 (1 366). Rører ikke søgningen. Skriv i DECISIONS som tillæg til D5-F1. |
| **D7-F4** | **P3** | `css/styles.css:842-851` (`#featured-listings .card-external …`, titel én linje med ellipsis) | Kompakte kort klipper modellen væk: "Harley-Davidson …", "Honda CB 1000 H…" (`B-fors-m` y≈1 338 og 2 310). Mærket står i titlen, modellen er det, køberen leder efter. Bilbasen: to linjer titel. | `#featured-listings .card-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal}` (+≈18 px pr. kort, sektionen ≈+72 px — stadig 1 000 px under de 1 880, runde 6 målte). |
| **D7-F5** | **P3** | `js/components.js` `MAERKE`-chips / `.brand-chip-name`, `css/styles.css` `.brand-chip` | "Royal Enfield" ombryder til to linjer på desktop-chippen (`B-fors-d` y≈2 800), "Harley-Davidson" på mobil (y≈1 460) — D6-F7's anden halvdel. | `.brand-chip-name{white-space:nowrap; overflow:hidden; text-overflow:ellipsis}` + `minmax(170px,1fr)` på ≥768 og `minmax(160px,1fr)` på mobil. |
| **D7-F6** | **P3** | `js/components.js:1098-1099` (`maalHoejde` + `ResizeObserver`), `css/styles.css:179` | D6-F8's forklaring: `--cookie-h` fryser på den første måling, når siden indlæses i en skjult fane (målt 226 px mod bannerets 80). Konsekvens: 146 px tom strimmel under footeren og 146 px for meget `scroll-padding-bottom` i den fane, indtil noget får banneret til at ændre størrelse. | Mål igen ved `document.addEventListener('visibilitychange', maalHoejde)` og `window.addEventListener('resize', maalHoejde, {passive:true})`; eller mål først i `requestAnimationFrame` efter `load`. Alternativt CSS-only: `.cookie-banner{position:sticky; bottom:0}` i dokumentflowet, så ingen variabel skal holdes ved lige. |

### Søgeside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D7-S1** | **P1** | `js/search.js:2094-2128` (`#save-search-btn` → toast "Søgeagent oprettet — du får en mail, når der kommer en der matcher" / "Log ind for at få besked på mail"), `soegning.html:1082` (tom tilstand: "Gem søgningen som søgeagent"), `supabase/013_soegeagenter.sql:77-79` (`create trigger on_listing_active … on public.listings`), `supabase/functions/notify-saved-searches/index.ts:137` (`admin.from('listings')`) | **Søgeagenten kan ikke sende den mail, den lover, for 548 af 548 annoncer.** Udløseren sidder på `listings` (egne annoncer: 0 aktive i drift); der findes ingen trigger på `eksterne_annoncer` (014–022), og funktionen slår kun op i `listings`. En indekseret Honda, der dukker op i morgen, udløser ingenting. Knappen ("Gem søgning", klokken i `.srp-bar`), tom-tilstanden og toasten lover det modsatte. Bilbasen: "Opret søgeagent" virker på deres eget lager. | Nu, uden at spørge: ret **teksten** til det, der sker: knap "Gem søgning" (uændret), toast "Søgningen er gemt her på enheden — du finder den under Mine annoncer › Gemte søgninger" og fjern "du får en mail"/"få besked på mail"; tom-tilstanden → "Gem søgningen, så du hurtigt kan komme tilbage til den." Dernæst, som egen opgave med deploy: trigger `after insert on public.eksterne_annoncer` (status 'aktiv') → samme funktion med `{ kilde:'ekstern', id }`; funktionen læser rækken fra `eksterne_annoncer`, normaliserer med samme feltnavne som `normalizeExternalListing` (brand/model/price/km/ccm/power/postnr) og matcher med `matcher()`; linket i mailen → `annonce.html?id=<uuid>`. Først når den er deployet og testet med én indsat række, må ordet "mail" tilbage i toasten. |
| **D7-S2** | **P2** | `soegning.html:577` (`#filter-q placeholder="Mærke eller model"`), `css/styles.css:1455` (`.srp-bar{grid-template-columns:1fr auto auto}`) | **Placeholderen klipper stadig på første skærm ved 390: "Mærke eller m"** — uden ellipse. Feltet er ≈197 px bred (1fr ved siden af klokke 44 + Filtre 103), tekstpladsen efter ikonet ≈150 px, og "Mærke eller model" er ≈165 px ved 16 px. Bilbasen: "Søg på bil" (hel). D6-S1 foreslog teksten; den passede ikke. | To lag: (1) `#filter-q::placeholder{text-overflow:ellipsis}` (så det aldrig klipper midt i et ord igen), (2) tekst **"Mærke/model"** (≈100 px) på ≤420 via et `data-placeholder-kort`-attribut, som `js/search.js` sætter ved `matchMedia('(max-width:420px)')` — eller lad søgefeltet fylde hele første række og sæt klokke + Filtre på række 2 (`.srp-bar{grid-template-columns:1fr 1fr}` med `#filter-q{grid-column:1/-1}`); det koster 52 px og flytter første kort til ≈332 — så vælg (1)+(2). Efterprøv på 360 og 390. |
| **D7-S3** | **P2** | `soegning.html:330-419` (gruppernes rækkefølge: Kørekort → Pris → Type → Mærke), `css/styles.css:1328-1333` (`.filters-panel{position:sticky; max-height:calc(100dvh - …); overflow-y:auto}`), `:1344-1350` (mobil-skuffe 88vh) | **Mærke-filteret er usynligt på desktop uden indre scroll.** Live målt: panelet viser 748 px af 2 220; Kørekort-summary ved 73, Pris ved 356, Type ved 839, **Mærke ved 1 154**. Pris-gruppen fylder 483 px (5 chips + 3 linjer prosa "Kun ét prisinterval ad gangen …" + skyder + to felter). Billedet (`bikerbasen-srp-d.png`) viser kun Kørekort og Pris, og intet afslører, at panelet kan rulles. Bilbasen: Mærke er 2. felt i formularen, Model 3. Køberen, der leder efter "Honda", finder det kun via fritekst. Samme rækkefølge i mobilskuffen (88vh). | Rækkefølge **Mærke → Kørekort → Pris → Type** (Mærke er en søgeliste med filterfelt og "Vis alle N mærker" — den fylder ≈260 px sammenklappet). Pris-prosaen ud af flowet: `title`/`aria-description` på gruppen og én linje under chips "Ét interval ad gangen". Prischips i to kolonner (`.pris-chips{display:grid;grid-template-columns:1fr 1fr}`). Mål efter: Mærke-summary ≤ 90 px i panelet, Pris-summary ≤ 450, Type ≤ 700 — tre grupper inden for 748 uden scroll. En synlig "flere filtre ↓"-affordance nederst i panelet (`mask-image` fade + tekst), så indre scroll ikke er en hemmelighed. |
| **D7-S4** | **P2** | `crawler/normalize.js delModelOgVariant()` / `fjernPersonoplysninger()`, `js/backend-bridge.js normalizeExternalListing` | **Modelfeltet bærer kildens salgsstøj.** Live i 548: "CBR 650 R **MC-SYD**", "GL 1800 Gold Wing **MC-SYD 5 ÅRS GARANTI**", "NT 1100 A **5 ÅRS FABRIKS GARANTI**", "ZZR600 **sælges eller byttes**", "Gsf 650 bandit 2008 **sælges bud modtages**", "**Motorcykel med meget udstyr**" (det sidste står som forsidekort 2 live) — 13 med sælges/byttes/bud/med meget/MC, 55 med ≥5 versaler i træk. Modellen er vores kort-titel, h1 på annoncesiden, `<title>`, "Lignende"-nøgle og mærkesidens modelchips. Bilbasen: "Skoda Roomster · 1,2 12V Classic 5d" — altid mærke · model · variant. | I `delModelOgVariant()`: klip modellen ved første støjord (`/\b(sælges|saelges|byttes|bud|garanti|bytter gerne|med meget|nysynet|velholdt|flot|pæn)\b/i`), ved et aktivt kildenavn (`MC[- ]?SYD`, `Aalborg MC` — listen fra `sources/*.yaml` `navn`), og ved ≥2 versal-tokens i træk efter et modeltoken; resten går i `variant` eller smides væk (det er reklame, ikke data). Titlecase af ALL-CAPS-modeller (`Daytona 660 ALUMINIUM SILVER/SAPPHIRE BLACK` → variant). Kør på de rækker, der ligger, via `normalizeExternalListing` (samme tabel, så klienten ser det i dag) og i crawleren for nye. Tests i `crawler/normalize.test.js` med de seks eksempler ovenfor. |
| **D7-S5** | **P2** | `css/styles.css:1124-1126` (`@media (max-width:620px){ .card-specs:has(.spec-tom):has(.kk-ukendt){…} }`), `:1118-1120` (`@container (max-width:320px)`) | D6-S6's rettelse er en **media**-query; kortets krop er en container. I 321–≈400 px krop (mærkesidens 3 spalter: krop ≈348 px; SRP 3 spalter ved 1 240–1 300) klipper "2026 · 750 ccm · **km ikke op…** · Kørekort ikke afgjort" igen (`bikerbasen-maerke-d-full.png` y≈44 280, 44 770, 45 060). Et ærligt felt, der ikke kan læses, er ikke ærligt (runde 6's ord). | Flyt reglen til `@container (max-width:420px){ .card-specs:has(.spec-tom):has(.kk-ukendt){ flex-wrap:wrap; align-content:flex-start; height:54px } }` og slet media-versionen. Efterprøv ved 390, 1 240 (SRP 3 spalter), 1 366 (mærkeside 3 spalter). |
| **D7-S6** | **P3** | `js/components.js:1161-1180` (`specRows`: Drivlinje · Stand · Servicehistorik · Antal ejere · Sidste syn) | Sammenlign-modalen for to indekserede annoncer skriver "Ikke oplyst" i **fem rækker**, vi aldrig indekserer (regel 2's feltliste) — kilden KAN have oplyst dem; det er os, der ikke bærer dem med. "Ikke oplyst" er en påstand om sælgeren. Bilbasen sammenligner egne felter. | `if (bikes.every(b => b.isExternal))` → drop de fem rækker (behold Pris · Årgang · Km · Motor · Effekt · Kørekort · Type) og sæt én linje under tabellen: "Udstyr, ejere og syn står i annoncen hos kilden — vi indekserer dem ikke." Blandede sæt: behold rækkerne, men skriv "Se hos kilden" i de eksterne celler. |

### Annonceside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D7-A1** | **P1** | `js/annonce.js:821-823` (`listing.isDealer ? … : sellerTypeNoteHTML(false)`), `:115-116` | **"Privat annonce. Forbrugerkøbelovens reklamationsret gælder ikke mellem private."** på annoncesiden for Gul og Gratis-udgaven af MC Syds "Honda CBR 650 R MC-SYD" (live, `annonce.html?id=a35866fe-…`; h1 bærer selv forhandlernavnet). Samme for de øvrige 7 kendte forhandlerannoncer på GG — og for de 110 andre GG-annoncer, hvor vi **ikke ved det**. Runde 4 valgte privat-advarslen som "den forsigtige retning at tage fejl i" — men den er ikke forsigtig for en køber, der læser, at han ingen reklamationsret har over for en forhandler. Bilbasen: retsoplysningen følger forhandlerstatus, som de kender. | Samme rettelse som D7-F1, lag (3): tre grene i `sellerTypeNoteHTML(true \| false \| null)`; null-grenen: "Kilden oplyser ikke, om sælgeren er forhandler eller privat. Spørg — er det en forhandler, har du 24 måneders reklamationsret; er det privat, har du ikke." Kildeflaget "du køber af sælgeren bag den" er allerede neutralt og bliver. Efterprøv på `a35866fe-…` og på en GG-annonce uden forhandlernavn. |
| **D7-A2** | **P2** | `js/annonce.js:683-740` (`.external-detail-head` rækkefølge), `css/styles.css` `.external-detail-salgsvilkaar`, `.external-detail-actions` | **Nøgletallene er stadig under folden på begge skærme** (D6-A3): mobil gitter **863–1 115** (>844) — prisblok 616–636, chip 668, salgsvilkårslinje 690–725 (to linjer), CTA 739–787, handlingsrække 818–840; desktop etiketter 849, værdier ≈878 (>850). Bilbasen har ingen nøgletal i viewporten — det er vores trumf, ikke en tabt sammenligning: kørekortet er det, de aldrig kan vise. | Mobil (<960): (1) salgsvilkårslinjen (36 px) → `title` på chippen "Bytter gerne" + én linje i "Før du kører derhen" (den står der allerede som "Pris og oplysninger …"), (2) handlingsrækken (Sammenlign · Del · Meld fejl, ≈50 px inkl. margin) **under** gitteret. Forventet: CTA ≈700–748, gitterets første række (Kørekort · Årgang) ≈770–850 — inden for 844. Desktop: `.external-detail-media img{max-height:360px}` ved ≥960 (fotoet er 400 px i dag; 16:10 af 703 er 439, så det er allerede beskåret) → alt under rykker 40 op: værdier ≈838 < 850. Efterprøv på et kort uden "Bytter gerne" og et uden foto. |
| **D7-A3** | **P2** | `js/annonce.js:622-632` (`hentetLinje` ← `indekseretFoerste`), `js/backend-bridge.js:582` (`sidstSet` bæres med, bruges ikke) | "Hentet hos MC Syd 16. aug. 2026 — for 7 dage siden" regnes af `foerst_set`. Men `sidst_set` (sidste kørsel, hvor annoncen stadig var aktiv) ligger i objektet og vises ingen steder. Linjen siger altså, at oplysningerne er 7 dage gamle, når de (sandsynligvis) blev bekræftet i går — og under den står "Tjek pris … de kan være ændret, siden vi hentede". Det eneste friskhedssignal på siden er det forkerte. Bilbasen viser ingen dato. | "**Set hos MC Syd første gang 16. aug. · sidst bekræftet i går**" (to tal, begge sande; `sidstSet` → `datoKort` + samme "i dag/i går/for N dage siden"). Er `sidstSet` ældre end 3 dage, så skriv det med — det er præcis dér, "kan være ændret" betyder noget. Samme linje i kildekortet på mobil. |
| **D7-A4** | **P2** | `css/styles.css` `.external-detail-aside` / højre spalte (`annonce.html` layout ≥960) | Desktop: højre spalte (kildekort + Søg videre) slutter ved **778**; fra 778 til 3 402 er der **ingen synlig "Se annoncen hos …"** — handlingsrækken (Sammenlign · Del · Meld fejl) er det eneste, der ruller med i toppen. Bilbasens spalte er 2 100 px lang (logo, finansiering, forsikring …) og følger længere. Runde 6 (D6-A2) bad om indhold; indholdet er der. Rummet er stadig tomt. | `.external-detail-aside{position:sticky; top:calc(var(--header-h) + 16px); align-self:start}` — én regel, ingen nyt indhold: kildekortet med knappen følger læseren til "Lignende". Efterprøv, at "Søg videre" ikke overlapper footeren (spalten er 650 px < 850 − 84). |
| **D7-A5** | **P3** | `js/components.js:598` (`KK_UAFGJORT` = "Kørekort ikke afgjort"), `js/annonce.js` A-boksen | På annoncesiden for CB 1000 Hornet står boksen "Du kan køre den på A-kørekort — A har ingen effektgrænse og dækker hele lageret", og 1 500 px længere nede står tre "Lignende"-kort med 1 000 ccm/750 ccm og chippen "**Kørekort ikke afgjort**". For køberen er det samme spørgsmål med to svar: "A dækker alt" og "ikke afgjort". Det, der ikke er afgjort, er A2 — ikke A. | Ordlyden, ikke reglen (`koerekortMaerkat()` er låst "regnes ét sted"): `KK_UAFGJORT` → "**A · A2 uvist**" (chip) og `title`: "Kan køres på A. Om den også må køres på A2, kan vi ikke afgøre — effekten er ikke oplyst." Sammenligningstabellen (D7-S6) får samme tekst. Tests i `js/koerekort.test.js` rører kun etiketten. |

### Mærkeside

| ID | Sev. | Fil / selector | Måling (os vs Bilbasen) | Konkret fix |
|---|---|---|---|---|
| **D7-M1** | **P1** | `scripts/build-brand-pages.js` (`<h1>Brugte ${brand}-motorcykler i Danmark</h1>`, `introFor()` "Der er lige nu **N** brugte … til salg", `titelFor()` "Honda brugt – 262 til salg", `bundIndholdFor()` "Prisniveau for brugte …", `faqFor()` "Hvad koster en brugt Honda-motorcykel?"), `js/components.js eksternErNy()` | **"Brugte Honda" — 165 af de 262 er fabriksnye.** Målt live med sidens egen `eksternErNy()`: 172 af 548 er "Ny" (162 MC Syd, 10 Gul og Gratis), **165 af dem er Honda** — 63 % af mærkesidens lager bærer chippen "Ny" under overskriften "Brugte Honda-motorcykler i Danmark" og sætningen "Der er lige nu **262** brugte Honda motorcykler til salg". Prisniveau ("median 119.995 kr.") og FAQ ("Hvad koster en brugt Honda") regner nye og brugte sammen. `work/DECISIONS.md` ("De 162 fabriksnye bliver MÆRKET") skrev selv: *"Det er overskriften 'brugte motorcykler', der er for snæver"* — og mærkesiden skriver overskriften med tal. Bilbasen: "Brugte biler" og deres SRP har `Nyhed`-badge, men deres brand-URL hedder `/brugt/bil/honda`, og de skriver ikke et antal "brugte" i brødteksten. SRP'ens h1 "Brugte motorcykler til salg" (172 af 548 nye) har samme problem i mildere grad. | I `build-brand-pages.js`: tæl `ny = items.filter(eksternErNy)` (funktionen er i `js/components.js`, tilgængelig via `browserModules()`); h1 → "**Honda-motorcykler til salg i Danmark**"; indledning → "Der er lige nu **262** Honda til salg — **97 brugte og 165 fabriksnye** hos forhandlere — fra 4.000 kr. …"; `<title>` → "Honda til salg – 262 annoncer (97 brugte) \| Bikerbasen"; prisniveau/FAQ: regn og skriv **to** tal ("brugte: median X kr. · fabriksnye: median Y kr."), eller regn kun på brugte og sig det. SRP: h1 → "Motorcykler til salg" med underlinje "N brugte · M fabriksnye" fra samme tælling. Test i `scripts/maerkeside.test.js`: en side med ≥1 "Ny" må ikke skrive "N brugte" med N = alle. |
| **D7-M2** | **P2** | `scripts/build-brand-pages.js:639-641` (`items … .sort(createdAt)` → `listingCardHTML` for ALLE), `js/maerke.js:12-18` (sorterer på `createdAt` — null på 548/548, så `sort` er en no-op — og `mount.innerHTML = items.map(listingCardHTML)` for alle), `css` ingen sideinddeling | **262 kort, ingen sideinddeling, ingen filtre, ingen sortering: 130 358 px på 390, 45 488 px på 1 366.** Bilbasen: SRP med filtre/sortering, 30 kort, "Side 1 af 5", 18 987/6 818 px. Oven i det: rækkefølgen er `sidst_set` faldende (databasens orden), **ikke** søgningens "blandet" — mens forsiden lover "samme rækkefølge som i søgningen", og `js/maerke.js` tegner alle 262 igen efter `backendReady()` (samme kort, dobbelt arbejde, og et spring hvis lageret har ændret sig siden bygget). Sidens egen "Søg i alle Honda"-knap fører til det, siden burde være. | (1) Byg og tegn **24 kort** (= SRP's sidestørrelse), sorteret med `Sortering.sorter(items,'blandet')` i BÅDE build og `js/maerke.js` (samme funktion, samme orden, ingen omrokering); under gitteret: **"Se alle 262 Honda i søgningen — med filtre og sortering →"** (`soegning.html?brands=Honda`; den side har allerede sideinddeling, Gem søgning og facetter) + `noscript`-listen bliver som den er (den er SEO-bærende). (2) `js/maerke.js`: tegn kun om, hvis `items.length !== mount.children.length` eller første id afviger — ellers rør ikke DOM'en. (3) h2 "262 annoncer til salg nu" skrives af `js/maerke.js` fra `items.length`, så tallet følger lageret mellem to byg. Mål efter: sidehøjde ≈ 24 × 480 + 3 000 ≈ 14 500 (390), ≈ 8 × 495 + 2 300 ≈ 6 300 (1 366). Alternativ, hvis man VIL have alle 262 på siden: klient-sideinddeling med samme `pagination`-komponent som SRP — men så er siden en halv søgeside, og den hele findes ét klik væk. |
| **D7-M3** | **P2** | `scripts/build-brand-pages.js` (`.brand-hero`: `introFor()` + `BRAND_ARV`), `css/styles.css:2760-2765` | **Første kort ved 873 (390) / 728 (1 366) — intet lager over folden.** Indledningen er 12 linjer på 390 (200–525), før knapperne (576–623) og chips (690–730). Bilbasen (under modalen): kort ved ≈282/527. En mærkeside, hvor man skal rulle en hel skærm for at se den første Honda, taber til en, der viser den straks. | Første afsnit = to sætninger (arv + "262 Honda til salg — 97 brugte, 165 nye — fra 4.000 kr."), resten i `<details class="brand-intro-mere"><summary>Mere om udvalget</summary>…</details>`; flyt "Se Honda efter model"-chips **over** knapperne (de er navigation) og knapperne ned til bunden af hero'en. Forventet første kort ≈560 (390) / ≈560 (1 366) med h1 og tal stadig øverst. Målt krav: første kort ≤ 620 på 390. |
| **D7-M4** | **P3** | `scripts/build-brand-pages.js:503` (`"Ligger prisniveauet uden for budgettet, ligger brugte ${andetBrand} typisk i samme leje"`), `introFor()` (kildeliste "Gul og Gratis og Rydbergs MC og Jensens Motorcykler og MC Syd"), `css/styles.css:2765` (`.brand-sub{margin-bottom}` uden `margin-top`) | Tre tekst-/typografifejl, som en læser ser på 10 sekunder: (1) en sætning, der modsiger sig selv — "ligger prisniveauet uden for budgettet, ligger KTM i **samme** leje" (`naermesteMedianBrand` finder det NÆRMESTE, ikke det billigere); (2) "og … og … og" i kildelisten; (3) h2'erne "Kørekort til brugt Honda" og "Hvad du skal tjekke …" sidder klistret til forrige afsnit (≈8 px), mens "Prisniveau" har 60 px over sig (`bikerbasen-maerke-d-full.png` y≈44 300–44 460). | (1) "Brugte KTM ligger typisk i samme prisleje — se dem, hvis udvalget her er for lille." — eller find det mærke med **lavere** median og skriv "Er budgettet mindre, ligger brugte X typisk lavere (median Y kr.)". (2) `listeJoin(navne)` → "Gul og Gratis, Rydbergs MC, Jensens Motorcykler og MC Syd" (Intl.ListFormat('da')). (3) `.brand-sub:not(:first-child){margin-top:var(--space-6)}`. |
| **D7-M5** | **P3** | `scripts/build-brand-pages.js` ("Andre mærker": `brands.filter(b => b !== brand).slice(0,10)` — alfabetisk; `maerke-andet-maerke.html` bygges; "Fb Mondial") | "Andre mærker" starter med **"Andet Mærke"** (en mærkeside for "Andet Mærke" findes: 2 annoncer, den ene er en Victory — som har sin egen side), derefter Aprilia (7), Benelli (1), BMW (26), BSA (3), Cagiva (1), Ducati (3), **Fb Mondial** (1), Harley-Davidson (72), Husqvarna (1). Ti chips, hvoraf seks fører til sider med 1–3 annoncer, og de to største mærker efter Honda (Harley 72, Yamaha 44, Suzuki 42) står sidst eller slet ikke. | Sortér "Andre mærker" efter antal faldende, skriv tallet i chippen ("Harley-Davidson · 72") som forsiden gør; udelad "Andet Mærke" fra mærkesider og chips (det er en restkategori, ikke et mærke — `kvalificeret`-tærsklen gælder allerede for tekstpakken; brug samme tærskel for at **bygge** siden); alias `'fb mondial' → 'FB Mondial'` i `MAERKE_ALIAS` (som D6-F7 gjorde for BSA). |

---

## 5. Kopiér IKKE fra Bilbasen

Runde 5 og 6's liste står ved magt (takeover-annoncer, Køb/Leasing, Solgt.com,
Lendo, nyhedsbrev, "Danmarks største"/"700.000 købere", stjerner/anmeldelser,
billedstribe/galleri/video/logo på kortet, hjerte på eksterne (D-008), "Book en
prøvetur"/"Vis telefonnummer", nummerplade-vurdering, "Seneste biler" med dato).
Mærkesiden tilføjer fire:

| Bilbasen-element (mærkeside) | Hvorfor ikke |
|---|---|
| Cookie-modalen ("Vores 1018 reklamepartnere", dækker hele første skærm på begge viewports) | Vi har nul reklamepartnere og et bånd, der ikke dækker indholdet. Det er en af de få ting, der gør vores første skærm bedre end deres — behold båndet. |
| Prosa med mening og historie ("Honda er et lidt overset mærke", "3 Facts om Honda", "Hondas historie", "Ergonomien er … tæt på perfekt") | Meninger og anekdoter er ikke lagerdata; de kan ikke måles, og de gør en side til en artikel. Vores bundtekst er tal fra lageret — det er rigtigt. Fejlene i den (D7-M1, D7-M4) er regnefejl og ordvalg, ikke genren. |
| "Brugte Honda – Populære modeller" (Civic · Jazz · CR-V …) uden tal | Et ord som "populære" er en påstand om efterspørgsel, vi ikke måler. Vores "Se Honda efter model" med de 12 modeller med flest annoncer er den sande udgave — sæt tallet på chippen, så reglen kan efterprøves. |
| Grå bil-silhuet som pladsholder (2 af 14 kort på forsiden, 1 på mærkesiden) | B3 afvist: "Uden foto tegner vi INGENTING" — vores fejlfelt siger, hvad der er sket. |
| **Og én, der peger på os selv:** "Brugte …" i h1 med et tal, der tæller fabriksnye med (D7-M1) | Det er Bilbasens URL-struktur (`/brugt/bil/honda`), vi har arvet som overskrift. Deres lager ER brugt; 63 % af vores Honda er ikke. Overskriften skal passe til lageret, ikke til URL'en. |

**Må gerne kopieres (form, ikke påstand):** mærkesiden som en filtreret søgeside
med sideinddeling (D7-M2) — det er layout og funktion, ikke data. Og Bilbasens
placering af Mærke som andet felt (D7-S3).

---

## 6. Den ene ændring pr. side

**Forside — D7-F1: stop med at gætte "Privat".** Tri-state sælgertype, domænet
alene på kortet, når kilden ikke oplyser det, og en neutral retslinje på
annoncesiden. Forsiden vinder allerede blindt; det, der kan tabe den igen, er
et tryghedskort, der siger "ingen gættede felter", over et kort, der gætter.
(D7-F3's "højst halvdelen fra samme kilde" flytter billedet mest — men
sandheden først.)

**Søgeside — D7-S3: Mærke synligt uden at scrolle i panelet, og D7-S2: en
placeholder, der ikke klipper.** Rækkefølgen Mærke → Kørekort → Pris → Type og
prisprosaen ud af flowet; "Mærke/model" med ellipse på ≤420. Det er de to ting,
en blind dommer ser på første skærm på begge bredder. D7-S1 (søgeagenten)
er P1 og skal rettes uanset — tekstrettelsen er ti linjer og kan gøres i dag;
triggeren på `eksterne_annoncer` er en deploy-opgave.

**Annonceside — D7-A2: nøgletallene på første skærm på mobil (og A4: sticky
spalte på desktop).** Salgsvilkårslinjen ud, handlingsrækken under gitteret, så
Kørekort · Årgang står over 844. Det er vores trumf, og den står 19 px under
kanten. D7-A1 (privat-advarslen på forhandlerannoncer) følger med D7-F1.

**Mærkeside — D7-M2 + D7-M1 sammen: 24 kort i søgningens rækkefølge med et
link til den rigtige søgning — under en overskrift, der passer til lageret.**
"Honda-motorcykler til salg — 97 brugte, 165 fabriksnye", 24 kort sorteret som
søgesiden, "Se alle 262 Honda i søgningen →". Det gør siden fra en 130 000 px
udskrift til en indgang, og fra en påstand til et tal. Det er den eneste side,
Bilbasen stadig vinder, og den vinder den på begge skærme.
