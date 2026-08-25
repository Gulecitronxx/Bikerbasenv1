# Runde 11 — købersiderne mod Bilbasen/AutoScout24 (aim-loop)

Fire dommere: en A2-køber (kørekortsiderne), en SEO-landingssidekritiker
(model/type/region), en dataintegritetsrevisor (al udgivet copy) og en blind
A/B-dommer, der ikke fik at vide, hvilke sites billederne kom fra.

Optagelser: `work/runde11/`. Sider, der aldrig havde mødt en kritiker før:
`koerekort-a1/a2`, `model-*`, `type-*`, `region-*`.

---

## 0. Metodefejl fundet undervejs — og hvad den kostede

Første optagelsesrunde blev lavet mod `http://localhost:8532`. `js/data.js:772`
tænder **demolageret på 51 opdigtede annoncer** på præcis den vært (`localhost`
/ `127.0.0.1`); i drift er `LISTINGS` tom. Facetsidernes hydrering renderede
demokortene øverst, umarkeret, uden kildelinje.

Det forurenede tre findings, som derfor **ikke** er produktionsfejl:

| Påstand i første dom | Virkelighed |
|---|---|
| "Fotoløse kort ejer toppen, første foto først ved y≈8.250" | Demokort har ingen fotos. I drift starter siden med MC Syd-fotos. |
| "58-tallet modsiger livevisningen" | Live viste 58 + 51 demo. I drift: 58 = 58. |
| "maerke-honda: 282 i h2 mod 276 i intro" | Differencen VAR demolageret. |

Alt blev genoptaget mod `http://bikerbasen.localhost:8532` (samme server, anden
vært → demo slukket), og blinddommen blev afsagt om på de rene billeder.

**Regel for næste runde: optag aldrig på `localhost`.** En dommer, der ser
opdigtede annoncer, dømmer en side, der ikke findes.

Anden måleartefakt: Chrome-fuldsider gentager toppen pr. 16.384 px. På
`B-kk-a2-m-full.png` (38.432 px) findes samme kort pixelidentisk tre steder.
Alt over 16.384 px i en fuldside er tekstur-gentagelse, ikke sideindhold.

---

## 1. Blind dom (rene optagelser, `work/runde11/blind2/`)

Dommeren fik neutrale filnavne og vidste ikke, hvilke sites hun så.

| Duel | Vinder | Hvorfor |
|---|---|---|
| Kørekort A2, mobil | **Bikerbasen, klart** | "x deltager reelt ikke i duellen": Bilbasens SRP viser biler og har intet kørekortfilter. Vores side svarer på købers spørgsmål før scroll: hvor mange, hvad koster de, hvad grænsen betyder. |
| Kørekort A2, desktop | **Bikerbasen, klart** | Samme + Bilbasens Polestar-takeover æder begge sidekanter. Anke mod os: "Royal Enfield" og "Royal-enfield" som to mærker i chiprækken. |
| Modelside, mobil | **Bilbasen, snævert** | Vores intro er "det bedste enkeltelement i hele testen" — men listen kunne hun ikke handle på: dublet-udseende kort, 13 af 17 uden km, fotoløse kort øverst. |
| Modelside, desktop | **Bilbasen, snævert** | Samme: "overblikket vinder toppen; listen taber siden". |

**Stilling 2-2.** Dommerens tværgående dom: vores styrke er teksten (ærlige,
svarende introafsnit, bedst i klassen), vores svaghed er varelisten.

---

## 2. Findings og status

47 findings i alt fra de tre kritikere (efter fradrag af de demo-forurenede).
Alle P1 er lukket i `f89a3fe`-efterfølgeren; P2/P3-resten står i BACKLOG.

### Lukket i denne runde

| ID | Hvad | Fix |
|---|---|---|
| KK-1 / F-3 / I-2 | 90 kort sagde "Kørekort A2" + "Kan føres på A2-kørekort" | `js/components.js`: **"Mulig A2"** med eksklusionsforklaring. A-grenen konkluderer stadig (A har ingen øvre grænse) |
| I-1 | Annoncesidens panel: **"Du kan køre den på A2-kørekort"** i fed | "Ikke udelukket til A2 — men få det bekræftet", med kW/kg + afledningsreglen |
| I-3 | Mærke-FAQ: "Kan man køre Honda på A2? **Ja, til dels**" — ryger i FAQPage-JSON-LD og dermed Googles rige resultat | "N er ikke udelukket på effekt", med begge forbehold |
| I-4 | `<title>`/meta på kørekortsider antydede egnethed | Eksklusionsform: "Motorcykler til A2-kørekort — ikke udelukket på de oplyste tal" |
| I-5 | "Ny"-chippens tooltip lovede ubetinget "du køber med garanti frem for reklamationsret" — også på GG-annoncer uden kendt sælgertype | Betinget af oplyst forhandler (D7-A1's regel, flyttet fra detaljesiden til kortet) |
| F-2 / I-6 | "Brugte" i titel/meta/intro med fabriksnye på samme side (type-cruiser: 32 af 91 "Ny") | `brugtOrd()` flyttet fra brand-generatoren; blandet lager får intet adjektiv, tallet står i introen |
| F-5 | Intet kortloft: region-midtjylland **522 KB / 12.885 tags / 88.482 px** | 24 kort + "Se alle N i søgningen" (mærkesidens kontrakt siden runde 7). Målt efter: **103 KB / 2.566 tags**. type-cruiser 311 → 98 KB. noscript beholder alle |
| F-4 | FAQPage-JSON-LD uden synligt FAQ på modelsider (manual action-risiko) | FAQ renderes synligt, samme `<details>`-mønster som mærkesiden |
| F-6 | Dobbeltrender: byg sorterede anderledes end hydreringen → første kort skiftede identitet efter load | Samme sortering begge steder + id-diff før DOM røres (js/maerke.js' mønster) |
| F-11 | Fotoløse kort uden km øverst på varesiderne | `substansScore`: foto 4, km 2, pris 2, hk 1 — derefter nyeste først |
| F-14 | Ingen søgeagent på de mest købsintente sider; CTA'en var "Sælg din motorcykel" på en køberside | "Få besked om nye X" → `?agent=1` mod det eksisterende flow i `js/search.js` |
| F-8 | Modelsidens "Se X efter mærke" med én chip, der linker samme sted som CTA'en | Modelsider undtaget fra mærkechips |
| I-10 | "lige nu" bages ved byg og opdateres aldrig — kan ældes til løgn mellem to crawl | "Senest bekræftet hos kilderne \<dato\>" (D9-M2's linje) |
| I-11 | "til salg **på** Bikerbasen" om 100 % indekseret lager | "indekseret på Bikerbasen" (D8-M4's regel) |
| I-12 | vilkaar: "Annoncer er tydeligt mærket som Privat eller Forhandler" — GG-kort har ingen sælgertype | Forbehold tilføjet: hvor kilden oplyser det |
| I-13 | sikkerhed: "Langt de fleste handler på Bikerbasen går problemfrit" — 0 handler er sket på platformen | Erstattet uden handelshistorik |
| I-16 | sikkerhed/vilkaar lovede "Anmeld annonce" på alle annoncer; indekserede har "Meld fejl" | Begge navne nævnt |
| I-9 | Sitemap optog noindex-mærkesider (modsat signal) | Filtreret på samme tærskel, der afgør noindex |
| F-9 (delvist) | Årgangsspænd ankret i modelår 2027 | Aggregater afviser år > indeværende+1. **Km- og prisoutliers står stadig** |
| I-14 / I-15 | "MC Syd og Jensens og Gul og Gratis og Rydbergs"; "kr.." | `listeJoin()`; punktum fjernet |

### Åbent (BACKLOG)

| ID | Hvad | Hvorfor ikke nu |
|---|---|---|
| F-1 | Demokort kan renderes på facetsider på `localhost` | Rammer aldrig drift (`data.js:772`), men gør lokale runder utroværdige. Fix: filtrér `LISTINGS` fra facet-hydreringen |
| KK-9 | "Royal Enfield" / "Royal-enfield" som to mærker; "Fb Mondial FB Mondial HPS 125" | Hører til i crawler/normalize.js — mærkekanonisering, ikke en visningsregel |
| KK-8 | Identiske forhandler-lagerkort ligner indekseringsfejl | Dublet-gruppering ("3 stk. hos MC Syd") er en visningsregel, ikke data — men rører kortkomponenten alle sider deler |
| KK-7 / F-11-rest | Ingen sortering/filtre på facetsider | Kortloftet fjernede det akutte; sortér-UI er næste skridt |
| KK-5 | Introen er juridisk korrekt, men svær for en 22-årig | Kræver pædagogisk omskrivning uden at tabe ét forbehold |
| F-7 | Mærkesiden: to sandhedskilder for antallet (intro build-tid vs. h2 klienttal) | Kan først lukkes, når intro også opdateres live |
| M1-rest | Mærkeside mobil: første kort **712 px** (mål ≤700) | 12 px. Og de 712 opnås ved at JS klapper folden efter load — ~200 px spring. Fix: fjern `open` i markup, lad JS åbne på desktop |
| I-20 | h1 "Danmarks markedsplads for motorcykler" på 100 % indekseret lager | Positioneringsvalg — menneskets, ikke loopets |

---

## 3. Hvad referencen stadig gør bedre — og hvad vi ikke må kopiere

**Må og bør kopieres:** sortér-kontrol og visningsskift på listesider;
resultater i bidder ("vis flere") frem for alt eller intet; filtre, der bliver
på siden i stedet for at sende brugeren til søgesiden.

**Må ikke kopieres:** volumenpral uden dækning, hjerter/gallerier på
indekserede annoncer (regel 2), anmeldelsesstjerner uden data, "A2-egnet"-
stempler uden grundlag. Hele "Kopiér IKKE"-listen fra runde 5–9 står ved magt.

**Vi gør bedre end referencen:** kilde-domæne på hvert kort, "km ikke oplyst"
sagt højt, "Ikke oplyst af kilden" som eksplicit spec-række, ingen
annonce-takeover — og fra denne runde: et kørekortfilter, der siger "Mulig A2"
i stedet for at love noget, ingen annonce kan bære.

---

## 4. Utterly wowed?

Alle tre kritikere: **NEJ.** Blinddommen står 2-2. Kørekortsiderne vinder,
fordi referencen ikke kan svare på købers spørgsmål; modelsiderne taber, fordi
varelisten ikke bærer. Denne runde flyttede copy-integriteten (alle P1 lukket)
og sidevægten (5× lettere) — næste runde skal flytte **listen**: sortering,
dublet-gruppering, mærkekanonisering.
