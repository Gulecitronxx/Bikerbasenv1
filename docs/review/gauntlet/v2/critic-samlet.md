# V2 Critic (blind): samlet dom

**Dom: PUSH.** Ingen regression mod live, CLS grøn, funktionelle flows virker, SEO uændret, alle 8 trin i verificer-site grønne. Til gengæld er V2 en finpudsning, ikke en redesign: ligheden med mockuppene er stadig lav, 4 af 10 i gennemsnit (se P1-mål).

## Metode
- Arbejdskopier med `git archive` i `%TEMP%\critic-v2b\new` (HEAD a497f75a) og `\live` (5d912827). `node_modules` som junction. SUPABASE_SERVICE_ROLE_KEY fjernet fra miljøet i alle kald. Intet er bygget mod produktion, og der er ingen commits eller push i hovedmappen.
- Alt kørte mod lokal statisk server med Playwright-mock (`smoke-browser.js`-fixtures og `w9-saelger-mock.js`). Ingen netkald forlod maskinen.
- Skærmbilleder (120 fuldside + 120 top, 1440/390, lys/mørk, begge rødder): `C:\Users\pasca\AppData\Local\Temp\critic-v2b\shots\{new|live}-{side}-{bredde}-{tema}[-top].png`. Funktionsbeviser: `shots\f-new-login-fejl.png`, `f-new-opret-fejl.png`, `f-new-solgt.png`, `c-new-type-sport.png`, `c-live-type-sport.png`.
- Værktøjsscripts: `critic-v2b\tools\*.js` (seodiff, shots, func-soeg, func-sort, func-sell).
- Mock-data har få annoncer pr. mærke. "6 Yamaha" i panelet mod "68" i den statiske tekst på maerke-yamaha er harness-støj, ikke et fund.

## Resultater pr. kontrolpunkt

**(1) Regressioner.** Ingen side er dårligere end live på de punkter jeg kunne måle.
- 1440-toppen er pixel-identisk med live på annonce (intern og ekstern), mærker og mc-honda-adventure.
- Mærkbart bedre: opret-annonce (live klipper heroens undertekst og lader tillidskortet overlappe trinbjælken, begge dele rettet), mobil-brødkrumme på annonce (live afkortede til "Ka…"), login og mine-annoncer (ikoner i statusbadges), guides (kategori, dato, kilder).
- Ét visuelt minus, se P2-1.

**(2) CLS** (`--cls 0.05 --strikt`, 44 sider × 320/390/768/1024/1440 × lys+mørk = 440 målinger).
- Sider: index, soegning, annonce (intern og ekstern), opret-annonce, login, mine-annoncer, dashboard, guides + 5 guides, maerker + 4 mærker, 6 type-, 3 koerekort-, 5 region-, 6 mc-*, model-, budget-, by-, om-bikerbasen, forhandler.
- Kørsel 1 (rækkefølge): 0 fejl, 0 advarsler (275 s).
- Kørsel 2 (omvendt rækkefølge): 0 fejl, 0 advarsler. Forskelle mellem de to kørsler: 6 målinger, alle under 0,012. Det er flaky støj, ingen overskrider grænsen.
- Hver af de 44 sider alene i egen proces, alle 5 viewports, lys+mørk: alle 0 fejl.
- Live (samme sæt): 2 fejl, mc-honda-adventure @768 CLS 0,116. Rettet i new (0,0004). soegning @768 er faldet fra 0,031 til 0,002.
- Reproducerbar, men under grænsen: dashboard @320 giver 0,0385 kun i rækkefølge. Alene er den 0. Live har 0,0335 samme sted, så det er ikke en regression, men der er kun 0,011 til grænsen (P3-1).

**(3) Funktionelle flows** (new, mock):
- Søgning:
  - 223 mock-annoncer, 10 sider, `?page=2`, `?page=10` og pagineringsklik virker.
  - `?page=99` viser sidste side og skriver URL'en om til `?page=10`. Live lader URL'en stå på 99.
  - Sortering efter pris stiger og falder korrekt, valget overlever reload. Listevisning giver 24 rækker, og sort + side bevares.
  - Tomtilstand (0 resultater, f.eks. Scooter + Ducati, ukendt mærke, `q=zzzz`, `yearMin=2030`) viser aldrig kort samtidig. Kortantal 0 mens empty-state er synlig, og sortering og visningsvalg skjules (live viser dem stadig).
  - Med resultater er empty-state aldrig synlig.
  - Filterpiller (år, ccm, hk) har nu "Fra/Maks."-tekst i stedet for "…"/"∞".
- Login: tomt felt giver "Skriv din e-mail.", ugyldig e-mail giver konkret besked, tom adgangskode giver "Skriv din adgangskode.". Fokus flyttes til feltet, og der sker 0 auth-kald ved de tre valideringer. Forkert kode giver ét kald og "Forkert e-mail eller adgangskode.". Ingen Google/Facebook/Apple. Live sendte tomt skema til serveren.
- Opret: tomt trin 1 giver felt-specifikke danske tekster ("Vælg mærke.", "Angiv kilometerstand — skriv 0, hvis den er ny." m.fl.) og toast "9 felter skal rettes. Først: Vælg mærke.". De 9 felter ligger alle på samme side, så tallet er korrekt.
- Mine annoncer, markér solgt:
  - Menuen viser "Markér som solgt", og confirm-dialogen vises.
  - PATCH `status=sold` sendes, rækken skifter til "Solgt" med "Sæt til salg igen", og toast lyder "…Tillykke!". Tilstanden overlever reload.
  - Ved PATCH-fejl (500) vises "Annoncen kunne ikke markeres som solgt: boom", og statussen er uændret.
  - `sold` er gyldig i schema.sql (`active|sold|hidden`).
- Tests: `npm test` 1376/1376 grøn i anden kørsel. Første kørsel fejlede (se P2-2).

**(4) Ærlighed.**
- Grep og skærmbilleder: ingen opdigtede stjerner, anmeldelsestal, "typisk svartid", beskeder, finansiering, social login eller forfatter. Hero-byline er "Af Bikerbasen / Redaktionel guide med kilder".
- Kørekortfakta i kode og tekst:
  - A1: 18 år, 11 kW (15 hk), 0,1 kW/kg, 125 cm³.
  - A2: 20 år, 35 kW (ca. 47 hk), 0,2 kW/kg, ikke afledt.
  - A: 24 år, eller 22 år efter 2 år A2 og praktisk prøve.
  - 48-49 hk vises som "Kørekort ikke afgjort — tjek kW".
  - "Mulig A2" er ikke bekræftet. Siderne siger "ikke udelukket ud fra det, annoncerne oplyser".
- Mockup-elementer der bevidst ikke er kopieret (korrekt): 120.000+ medlemmer, anmeldelser, Google/Facebook/Apple-login, visningstal, beskeder, sælgerfoto.

**(5) SEO-diff mod live**, alle 101 rod-html: title, description, canonical, robots, H1 og JSON-LD (typer og indhold) er 101 af 101 identiske. robots.txt og llms.txt er identiske. Eneste forskel er `sitemap.xml`: lastmod for de 5 regionssider går fra 2026-10-17 til 2026-10-18. Det er forklarligt, fordi regionssiderne har fået ny indholdssektion. Guide-datoer: 10 af 10 kort-datoer matcher guidens `dateModified` og den synlige dato.

**(6) Nye links, datoer og chips.**
- Regionchips i alle guides og "Efter region" på guides.html: 5 links hver, alle målfiler findes.
- Regionssiders guide- og kørekort-/type-genveje: korrekte.
- Dødt-link-audit over 10.799 interne links: 0 døde. De eneste "fund" er rodstier (`/index.html`) i 404.html, som er bevidst.
- Søgelinks bruger gyldige parametre (`brands`, `regions`, `type`, `koerekort`, `priceMax`, `yearMin`).
- "Se 0 sport-motorcykler" er en eksisterende facet-flise, se P2-3.

**(7) `verificer-site.js --hurtig --med-udgiv`** i new: alle 8 trin OK ("npm test" springes over under `--hurtig`, derfor kørte jeg den separat, se (3)).

## Fund

### P0
Ingen.

### P1
- **P1-1 (mål, ikke push-blokerende): ligheden med mockuppene er lav.** Samme sidestruktur og samme orange mærkefarve som live. Mockuppene bruger grøn primærfarve, blåt søge-/filterbånd, en rytterfoto-hero, rige kort med vægt og mærkelogo-rækker, og 4 trin i "Sådan virker". V2 ændrer mest spacing, ikoner og små tekster. Se tabellen. Builderne har selv dokumenteret at rytterbilleder og vægtdata ikke findes, så det er ærligt, men målet er ikke nået.

### P2
- **P2-1: CTA-panelet på facetsider gør kortrækken højere og skaber tomt rum i kortene (1440).** Bevis: `shots\c-new-type-sport.png` mod `shots\c-live-type-sport.png`. Rettelsen af fotoet, der lå oven på teksten, flytter det til egen række under knappen. Panelet bliver ca. 73 px højere, gitteret strækker de 4 kort, og der opstår ca. 100 px tomt hvidt rum mellem "Sport"-linjen og kørekort-/specifikationschips. Samme mønster ses på koerekort-a2 og i mindre grad maerke-yamaha. Mobil og tablet er ikke ramt. Det er en lille visuel regression i forhold til den gamle overlap-fejl, men overlappet var værre. Forslag: `align-items:start` på kortrækken eller en lavere foto-max-højde.
- **P2-2: flaky test.** Første `npm test` fejlede i `js/w9-saelger.test.js:183` (`#f-model` var tom efter login-redirect, forventet "MT-07"). Testen er grøn isoleret (33/33) og i hele-suite kørsel 2 (1376/1376). Det ligner et kapløb mellem kladde-gendannelse og redirect under belastning. Tjek om en rigtig bruger kan se et tomt modelfelt efter login-redirect.
- **P2-3: facet-fliser uden resultat.** "Se 0 sport-motorcykler" (Under 30.000 kr.) er et link til tom søgning. Findes også på live, så det er ikke en regression, men det er en død handling.

### P3
- P3-1: dashboard @320 CLS 0,0385 i rækkefølge (grænse 0,05), også 0,0335 på live. Overvåg.
- P3-2: login: "Opret, rediger og slet dine egne annoncer ét sted." brydes så "sted." står alene på linje 2 ved 1440.
- P3-3: mærkesidens panel viser tallet ("6") alene på en linje over etiketten, og typeflisen "Sport-motorcykler" er afkortet ved 390 (`new-type-sport-390-dark-top.png`).
- P3-4: guide-sidernes `dateModified` er ikke løftet, selvom HTML ændrede sig (chips, kilder). Det er forsvarligt (indholdet er uændret), men noter det.
- P3-5: hero-billedet på type-sport er hårdt beskåret og uskarpt ved 1440. Det er uændret fra live.

## Ligner mockuppen x/10, og bedre eller dårligere end live

| Mockup | Side | Ligner x/10 | Mod live |
|---|---|---|---|
| Forside.png | index | 4 | Lidt bedre: større felter, hele forbehold, outlinede ikoner. Hero uden rytter, orange mod grøn. |
| Motorcykler til salg.png | soegning | 4 | Lig live ved 1440, bedre i kanttilfælde (tom, page=99, pillertekster). |
| Annonce.png | annonce (intern + ekstern) | 3 | Lig live ved 1440 (pixel-identisk), lidt bedre på mobil (brødkrumme). Mockupens anmeldelser og svartid er bevidst ikke med. |
| Opret annonce.png | opret-annonce | 4 | Bedre: klippet hero og overlap rettet, konkrete fejltekster. |
| Mærker.png | maerke-yamaha | 4 | Lig live til lidt bedre (tillidskort-ikoner, CTA ryddet). Se P2-1. |
| Sport motorcykler.png | type-sport | 4 | Blandet: overlap væk, men tomt rum i kort (P2-1). |
| Motorcykler til A 2.png | koerekort-a2 | 4 | Lig live, samme P2-1 på CTA. |
| Artikel.png | guide-mc-forsikring + guides | 5 | Bedre: kategorichip, opdateret-dato, kilder, regionchips. Ærlig byline, ingen forfatter. |
| Login eller oper profil.png | login | 4 | Lidt bedre (validering uden auth-kald). Social login mangler bevidst. |
| Mine annoncer.png | mine-annoncer | 4 | Bedre: statusikoner og "Markér som solgt". Visningstal og beskeder mangler bevidst. |

## Entydig dom
**PUSH.** Hårde målinger er grønne: 0 CLS-fejl i 440 målinger (2 kørsler plus 44 sider alene), 0 døde links, SEO identisk, `npm test` 1376/1376 (efter ét flaky første forsøg), og verificer-site er grøn. Ingen side er dårligere end live på noget funktionelt eller SEO-mæssigt. Retter P2-1 og P2-2 hurtigst muligt efter push. Mockup-ligheden (P1-1) kræver et egentligt designspring (farve, hero, kortrigdom), ikke flere finpudsninger.
