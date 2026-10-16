# Critic: strøm dashboard (billede 5) — branch gauntlet/dashboard @ ba1f223 mod baseline 9fadd59

Blind, uafhængig test. Egen Supabase-mock (page.route + fiktiv session i localStorage, ingen produktions-kald, ingen konti), baseline udpakket med `git archive` udenfor repoet og serveret på egen port, så alle målinger er A/B. Intet i worktreen er ændret (git status ren). Viewport-screenshots læst: 1440 L/D, 1024, 768, 390 L/D, 320 (tilstande: ingen session, tom ny bruger, fuld bruger aktiv/pause/solgt/kladde, privat vs. forhandler, backend-fejl).

## DOM: ACCEPTER (med P2-rettelser anbefalet før merge)
Ingen P0/P1. Funktion og regel 6 er intakte og identiske med baseline. Acceptkriterium 4 er dog målt FAIL i to smalle tilfælde (se F-1/F-2). Det er P2, fordi afvigelsen er 6-7 px, ikke tab af indhold (undtagen et afskåret label ved 320), og baseline var 373-575 px bred på de samme sider. Behandler Orchestratoren kriterium 4 som hård grænse, er begge rettelser én linje CSS hver (se nedenfor).

## Dom pr. krav
| # | Krav | Dom | Måltal |
|---|---|---|---|
| 1 | Funktioner mod min mock | PASS | Se detaljer nedenfor, 60+ assertions grønne |
| 2 | Tal ægte, intet opdigtet | PASS (forbehold F-9) | KPI 3 / 60 / 6 / 7 = håndregnet; ingen +24 %, beskeder, udløb |
| 3 | Login-gate | PASS | Ingen session: `login.html?redirect=mine-annoncer.html%3Ftab%3Dfavoritter` og `login.html?redirect=dashboard.html`, koden uændret vs. baseline; privat bruger på dashboard får pænt gate-kort |
| 4 | Overflow / overlap / AA / 16px / fokus / konsol | FAIL (delvist) | Overflow: 320 → 326 px (tom bruger, Oversigt); 320 og 360 → 367 px (dashboard, fane Krav). 768/1024/1440 og 390: 0 px i alle 180+ kombinationer. Overlap: 0. Konsol: 0 fejl (kun mock-403/409). Fokusring 2 px synlig på alle 45 tab-stop. Input 15 px (se F-3). Kontrast se F-4/F-8 |
| 5 | XSS/escaping | PASS | `<img onerror>`, `<script>`, `<svg onload>` i brand/model/city/by/titel/navn/virksomhed/agent-label: vises som tekst, `window.__xss` aldrig sat |
| 6 | Tests | PASS | `npm test` 364/364, `node --test js/mine-annoncer.test.js` 8/8, `node --check` på alle js/scripts/crawler OK |
| 7 | Bagudkompatibilitet | PASS (forbehold F-6) | `?tab=mine|favoritter|agenter|konto` virker, ukendt `?tab=xyz` → Oversigt, redirect-parameter uændret. Ingen `#`-anker bruges på mine-annoncer.html i repoet |

### Krav 1 i detaljer (alle PASS)
- Faner (mine-annoncer 5, dashboard 3): klik, ArrowRight/Left med wrap, Home/End, fokus følger, roving tabindex (-1/0), `?tab=` sættes og læses, aria-controls peger på eksisterende paneler, tabpanel-aria-labelledby.
- Rediger-link: `opret-annonce.html?rediger=<uuid>`. Pausede/solgte rækker har ikke Rediger (kendt, jf. builder).
- Pause: `PATCH listings?id=eq.<id>` body `{"status":"hidden"}`; Aktivér og Sæt til salg igen: `{"status":"active"}`; kun `status` i body. Rækkestatus og Aktive-tal opdateres.
- PATCH-fejl (403): ingen statusændring, knap genaktiveret, toast "Status kunne ikke ændres: …".
- Slet: afvist confirm = 0 DELETE-kald og rækken bliver; DELETE-fejl: rækken bliver; accepteret: DELETE med korrekt id og række væk.
- Kladde: Fortsæt → `opret-annonce.html`; slet afvist = bliver; slet = væk og `bb_draft` fjernet.
- Favorit fjern: localStorage tom, `DELETE favorites` sendt, tom-tilstand vist (kræver annonce fra anden sælger; egen annonce blokeres af Store-sikkerhedsnet, som før).
- Søgeagenter: notifikation toggler, slet virker, label escapes.
- Log ud: `bb_user` og sb-session væk, navigerer til index.html.
- Krav-flow (dashboard.html), kørt mod BÅDE baseline og ny med samme mock: søgekald identisk (`status=eq.aktiv&ejet_af=is.null&or=(titel.ilike…)`), dialog åbner med fokus i feltet, Esc lukker uden kald, dublet (409) holder dialogen åben uden ny række, indsendelse = ét POST med nøjagtigt `{annonce_id, bruger_id, metode:"manuel", dokumentation}` (ingen status/behandlet/behandlet_af/godkendt), statuslisten viser Afventer og Afvist, rækken skifter til "Krav indsendt". Regel 6 er ikke svækket: `krav`-koden i js/dashboard.js er diff-identisk, kun fanerne omkring er nye.

## Sektionsscores (0-5, lys / mørk)
| Element | Lys | Mørk | Note |
|---|---|---|---|
| Hero + faner | 4,5 | 4,5 | Foto-hero, brødkrumme, stor h1, underlinjeret fane og CTA til højre matcher billedet klart. Hvid tekst på foto: 5,2-17,5:1 målt på pixels ved alle bredder. Foto er forsidens (en parkeret motorcykel, ikke rytter) |
| Statistikkort | 4 | 4 | 4 kort med rund ikon, tal, label, link som billedet. Femte kort (Beskeder, +24 %) udeladt med rette. Ved 320 skubber "Søgeagenter" ud af kortet (F-1) |
| Annoncerækker + handlinger | 4 | 4 | Thumb med fotoantal, titel, "år \| km \| type", sted, pris, badge, "Oprettet", Rediger/Pause/Slet. Mangler billedets visninger/favoritter/beskeder-kolonner (vises kun som lille linje hvor listing_stats findes), "⋮"-menu og "Udløber". Det er ærligt, ikke en fejl |
| "Opret ny"-stribe | 5 | 5 | Stiplet kant, plus-cirkel, tekst og CTA, 1:1 komposition |
| Sidebjælke (Min konto / Sælg hurtigere / Hjælp) | 4,5 | 4,5 | Avatar med initialer, menu, varm tip-boks med svag bjergillustration, hjælp-kort. Intet "Beskeder 3". Hjælp-ikon er skjold i stedet for headset |
| dashboard.html | 3,5 | 3,5 | Samme hero/faner/sidebjælke, 5 KPI-kort, rækker med tal. Graferne er den gamle komponent (aksetekst meget lille), strimlen "Ubegrænset · gratis" over kortene er ren gammel |
| forhandler.html | 3 | 3 | Kun en smal hero ovenpå den uændrede side. Ingen forlæg i billede 5, så "tæt nok" er ikke målbart; hero + banner + profilkort hænger sammen men er ikke redesignet |
| Profilindstillinger | 3,5 | 3,5 | Skrivebeskyttede oplysningskort + adgang + verificering + data. Pænt og ærligt, men ingen redigerbar formular (kun e-mail-henvisning) |
| Mobil (390) | 4 | 4 | Stabler pænt, 44 px+ tryk, ingen overlap. Fanerække skjuler 4.-5. fane uden tydeligt scroll-hint (F-7). 320 har F-1 |
| Tilstande | 4 | 4 | Tom bruger (0-kort + tom-kort), gate, fuld bruger, privat/forhandler pæne. Backend-fejl: se F-5 |

Samlet: **4,0 / 5**. Tæt nok på billedet til at det "matcher tydeligt"; ikke for tæt på det gamle site (helt ny sidestruktur, ingen gamle count-tabs/aside tilbage). Mere modig kunne den være i hero (rytter-foto), tip-illustrationen og række-statistikken.

## Fund
**P2 (anbefalet rettet før merge)**
- F-1 Stat-kort ved 320: `db-stat-label` "Søgeagenter" (79 px) i 40 px bred kolonne, hænger ud af kortet og gør `documentElement.scrollWidth` 326 > 320 (tom bruger/Oversigt). Ny regression: baseline 320/320. Reproduktion: viewport 320, `mine-annoncer.html?tab=oversigt`. Rettelse: `.db-stat-label{overflow-wrap:anywhere}` og/eller ikon 40 px under 400 px. Ved 360/390 er labelen også afskåret (scrollWidth > clientWidth) men giver ikke sideoverflow.
- F-2 Dashboard-fanen Krav ved 320 og 360: scrollWidth 367. Årsag målt: `<span class="visually-hidden">Handlinger</span>` i `<th>` inde i `.table-scroll` er `position:absolute` uden positioneret forælder og slipper ud af overflow-klippet (x=366). Samme mekanisme er i baseline (575 px dér). Builderens "98 grønne kontroller" målte kun `main`, ikke `documentElement`. Rettelse: `.table-scroll{position:relative}`. Reproduktion: 360 px, dealer, `dashboard.html?tab=krav`.
- F-3 Input på 15 px (iOS-zoom): `#mine-sort`, `#fav-sort`, `#krav-search-input`, alle bredder. Samme 15 px i baseline. Rettelse: `font-size:16px` under 768 px på `.db-sort .input` og krav-søgefeltet.
- F-4 Kontrast under AA 4,5:1 (lys): "Se vores gode råd" `.db-link` på tip-tint 4,2:1 (NY). Delte/ældre komponenter, identiske i baseline: "Ubegrænset · gratis" 4,14, "Bekræftet" 3,66, "Afvist" 3,94, "Ryd mine data" 3,94, "0 %"-delta 4,14. I MØRK tilstand: status-pillen "Aktiv"/"Ny" og "1 ny" er 1,73:1 (baseline identisk). Rapporteres som fund, ikke regression, men siden røres nu af strømmen.
- F-5 Backend-fejl på egne annoncer: hentEgneAlle ved 500 falder stille tilbage til kun aktive annoncer. Pausede og solgte forsvinder uden besked, "Aktive annoncer" står tilsyneladende rigtigt, og brugeren kan ikke aktivere en pauseret annonce igen. Reproduktion: mock `GET listings?seller_id=…` → 500, åbn `?tab=mine`. Foreslå en synlig meddelelse (som `meldDataafbrud`) i stedet for en tavs mindre sandhed.
- F-6 Genaktivering omgår 3-annoncers-grænsen: databasetriggeren `trg_listing_limit` er `before insert` (supabase/006), så "Aktivér"/"Sæt til salg igen" kan føre en privat konto over 3 aktive, hvis FRI_ADGANG slås fra. I dag er adgang gratis, så ikke aktivt. Skal med i beslutningen, når betaling genindføres.
- F-9 (arvet) "↑ 0 % vs. forrige 30 dage" på Visninger: tallet sammenligner sidste 15 dage med de første 15 af SAMME 30-dages vindue, ikke "forrige 30 dage", og pilen vises op ved 0 %. Beregnet, ikke opdigtet, men mærkaten er forkert. Uændret fra baseline.

**P3**
- F-7 Fanerække ved ≤ 390 px skjuler Søgeagenter/Profilindstillinger bag vandret scroll uden fade/pil.
- F-8 `dashboard.html#krav-panel` åbner ikke længere Krav-fanen (anker findes, men panelet er skjult). Ingen interne links peger på det; gamle bogmærker rammer Oversigt. Overvej at læse `location.hash`.
- F-10 Linjeskift: forhandler.html viser 114 ændrede linjer mod 14 reelle (LF-blokke gjort til CRLF). Bryder PARALLEL-reglen om at bevare linjeskift og gør merge-diff støjende.
- F-11 Krav-dialogen mangler `role="dialog"`/`aria-modal` og fokusfælde (identisk i baseline). Slet bruger `window.confirm`, hvilket er tilgængeligt.
- F-12 Kladdens "Slet" og agent-"Slet" er ikke ens (confirm vs. ingen confirm for agenter). Agent-slet har ingen bekræftelse (som baseline).
- F-13 `p-dashboard.css` mangler `?v=`-stempel (Orchestrator-opgave, jf. builder DELT-ØNSKE 3).

**Separat (præeksisterende, ikke denne strøm):** Delt header `.header-actions` er 148 px bred ved 320 når brugeren har favoritter (heart-ikonet vises), så `documentElement.scrollWidth` er 333 > 320 på alle logged-in sider. Verificeret på baseline: `mine-annoncer.html?tab=favoritter` 333/320 med 148 px før strømmens ændringer (96 px og 320/320 uden favoritter). Urørt side (private gate, forhandler uden fav) er 320/320. Hører til delt lag. Desuden i delt annoncekort på forhandler.html: "Kørekort Kørekort A" (dobbelt ord), og to sammenlign-knapper på 34×34 px (under 36 px).

## Verificeret OK
Én h1 pr. side, title/canonical/noindex uændret, ingen konsolfejl, intet overlap i rækker (0 af ~1400 målinger), alle tryk-mål ≥ 36 px på mobil, ingen vandret overflow ved 768/1024/1440 (lys og mørk) og ved 390, tastaturrækkefølge logisk gennem header → faner → kort → rækker → sidebjælke → fod, ingen inline scripts tilføjet.

## For at komme tættere på billedet (prioriteret)
1. Ret F-1/F-2/F-3 (fjerner alle målte overflow og iOS-zoom; 3 CSS-linjer).
2. Række-statistik som i billedet: faste kolonner "Visninger / Favoritter" for hver annonce, når `listing_stats` og `my_listing_saves` findes (data er der; vis "–" frem for skjul, så kolonnerne ikke hopper). Ingen "Beskeder".
3. "⋮"-menu pr. række (Se annonce, Kopiér link, Slet) i stedet for tre knapper på mobil; billedet har både menu og dropdown-chevron.
4. Hero: rytter-/motorcykelfoto med ægte billedfil til siden (som billedet) frem for forsidens hero, evt. med højre-justeret motiv.
5. Fanerække på mobil: fade/pil eller to-rækkers wrap, så Søgeagenter og Profilindstillinger kan ses.
6. Stat-kort: tilføj tendens-chip kun når to perioder findes (rigtigt "forrige 30 dage"), ellers intet. Ret samtidig F-9.
7. Profilindstillinger: en rigtig redigerbar formular (navn, telefon, vis_telefon-samtykke findes allerede i API'et) i billedets kortstil.
8. forhandler.html: egentlig redesign af profilkortet i samme kortsprog, ikke kun hero.
9. "Sælg hurtigere": ægte illustration i stedet for tint + svag SVG; hjælp-ikon som headset.
10. Dashboard-graferne: større aksetekst og samme kortstil som rækkerne.

## Filer
- Rapport: `C:\Users\pasca\Desktop\rod\Claude code\docs\review\gauntlet\critic-dashboard.md`
- Testscripts og screenshots (scratch, udenfor repoet): `…\scratchpad\c\` (lib.js mock, func1.js/func2.js funktion, matrix.js måling, shots/ skærmbilleder), baseline: `…\scratchpad\base\`.
