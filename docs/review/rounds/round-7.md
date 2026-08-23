# Runde 7 — blind kritik efter runde 6, inkl. mærkesiden (23.08.2026)

Kritikeren (docs/review/runde-7-kritik.md) dømte på live-screenshots efter
runde 6 (work/runde5/efter2/): forside m/d → Bikerbasen; SRP m/d →
Bikerbasen; VDP m snævert / d klart → Bikerbasen; mærkeside m+d → Bilbasen
klart (262 kort uden sideinddeling, 130 358 px). Samlet 6–2 til Bikerbasen.

Rettet og målt igen (srp.test:8532, 548 annoncer):

| Måling | før | efter |
|---|---|---|
| Kort/annonceside: sælgertype for Gul og Gratis | "Privat" på 118/118 (gæt), "reklamationsret gælder ikke mellem private" | kun domænet; neutral note "Kilden oplyser ikke …" |
| Søgeagent | "du får en mail, når …" | "Søgningen er gemt … tæller nye annoncer" |
| Mærkeside Honda: h1 / indledning | "Brugte Honda … 262 brugte" | "Honda-motorcykler til salg i Danmark" · "262 … 97 brugte og 165 fabriksnye" |
| Mærkeside Honda 390: kort / sidehøjde / første kort | 262 / 130 358 / 873 | 24 / 14 717 / 630 |
| Mærkeside Honda 1366: første kort | 728 | 589 |
| Forside: kilder i "Til salg lige nu" (8) | 8 × MC Syd | MC Syd 5 · Gul og Gratis 3 → efter loft: mcsyd, gg, mcsyd, mcsyd, mcsyd, gg, gg, rydbergs |
| Forside: hero-linje | "548 motorcykler til salg" | "548 annoncer med motorcykler til salg hos 4 …" |
| SRP 390: placeholder | "Mærke eller m" | "Mærke/model" |
| SRP 1366: Mærke-gruppe | 1 105 px (usynlig) | 60 px; Kørekort 476, Pris 741 |
| SRP: modelfelt | "CBR 650 R MC-SYD", "Motorcykel med meget udstyr" | "CBR 650 R", model null (kun mærke) |
| VDP 390: nøgletal | 863–1 115 | 768–836 (CTA 695) |
| VDP 1366: nøgletal/værdier | 849/878 | 784/852 |
| VDP: kildekortets dato | "Hentet … for 7 dage siden" | "Set … første gang 16. aug. 2026 · sidst bekræftet …" |
| VDP 1366: højre spalte | static (sticky uden effekt) | sticky |

Afvist: D7-A5 (se DECISIONS.md). Åbent: D7-F2 tværkilde-afdublettering,
D7-S1 mail for indekserede annoncer (trigger + funktion, kræver deploy),
GG-sælgertype i crawleren.

Gate: node --check, 329 tests, build, udgiv — grønt. 0 sidefejl på de fire sider.
