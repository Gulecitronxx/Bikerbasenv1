# Runde 6 — blind kritik efter runde 5, og rettelserne (23.08.2026)

Kritikeren (docs/review/runde-6-kritik.md) dømte blindt på friske
screenshots (work/runde5/efter/) mod bilbasen.dk: forside mobil/desktop →
Bilbasen snævert (tæthed + grå lazy-felter), SRP mobil → Bikerbasen snævert
(første gang), SRP desktop → Bikerbasen klart, VDP mobil → Bilbasen klart
(ingen CTA på første skærm), VDP desktop → Bikerbasen snævert.

Rettet i denne runde og målt igen (srp.test:8532, 548 annoncer):

| Måling | før | efter |
|---|---|---|
| Forside 390: "Til salg lige nu" | 4 kort à 475 px (1 880 px), 1 gråt | 8 kompakte kort i 2 spalter, 315 px/kort, sektion 1 583 px, første række eager |
| Forside 390: sidehøjde | 8 114 | 7 517 |
| Forside 1366: første kort | 1 017 | 891 |
| Forside: SEO-typer | Scooter (0) som link | 7 typer med tal, flest først |
| Forside: sælgerbånd | "set af hele Danmark", "under 5 min." | "Gratis annonce for private" + det, koden gør |
| SRP 390: første kort | 303 | **279** (Bilbasen 284) |
| SRP 390: overskrift | 2 linjer (49 px) | 1 linje (25 px): "548 annoncer · fra 4 kilder (i)" |
| SRP 390: vælger/placeholder | "Blandet udb", "Søg efter mæ…" | "Blandet", "Mærke eller model" |
| SRP 1366: Pris-gruppe | 841 | 511 |
| SRP 1366: kildelinje | "+2 kilder" på linje 2 | "indekseret: 332 hos MC Syd · 118 hos Gul og Gratis · 98 hos 2 andre" |
| VDP 390: primær CTA | ≈2 770 (bjælke skjult) | **739** ("Se annoncen hos MC Syd" under prisen; bjælken følger den) |
| VDP 1366: nøgletal | 868 (under folden) | 824 (værdier ved 892); handlinger på titlens linje |
| VDP: "Søg videre" | 4 links uden tal | 5 links med tal: "Alle annoncer fra MC Syd · 332" (ny `?kilde=`), Honda 262, A 548, Syddanmark 355, alle 548 |
| VDP: kildekort | "Annoncen blev hentet … 16. aug. 2026" som fodnote | "Hentet hos MC Syd 16. aug. 2026 — for 7 dage siden" under knappen |
| VDP 1366: nøgletalsgitter | 4 + 1 (tre grå felter) | 5 på én række |

D6-S4 (kilde-rundgang i standardsorteringen): først udsat, derefter godkendt
af mennesket og gennemført samme dag — målingen står i DECISIONS.md ("D6-S4
gennemført"): side 1 MC Syd 21 · GG 3 → 12 · 12, billedløse pladser identiske.

Gate: node --check, 324 tests, build, udgiv — grønt. 0 sidefejl på de tre sider.
