# Builder w5-funktion (bølge 5) — acceptkriterier og bevis

Branch `gauntlet/w5-funktion` fra `3caffd2`. Kilde: `detective2-funktion.md` (F2-001 … F2-014). Kriterierne er skrevet FØR bygning
(meta-gauntlet-2: acceptkriterier først, integrationstests frem for streng-søgning i kildekode).

## Acceptkriterier (kopi af opgaven)

| ID | Sev | Kriterium |
|---|---|---|
| F2-001 | P1 | Annonce med 48 eller 49 hk (uden kW) vises IKKE som "Kræver A" og udelukkes IKKE af A2-filteret; den vises som "Kørekort ikke afgjort — tjek kW". hk ≤ 47 giver "Mulig A2" (uændret), hk ≥ 50 giver "Kræver A" (uændret). Test: 40 hk-værdier 30-60, kW opgivet (35 kW giver mulig A2, 36 kW giver kræver A), A1-grænser. Kørekort-antal på kortbadge, filter, annoncesidens "Kan du køre denne?" og facet/forside følger ÉN funktion (integrationstest). Antal annoncer i fixturen der skifter status dokumenteres. |
| F2-002 | P1 | Knappen "Betal sikkert (MobilePay)" og alt tilhørende UI er væk; ingen betalingsløfte i brugerrettet tekst (grep js/ og html); annoncesiden virker ellers uændret (test på egen annonce i mock). |
| F2-003 | P1 | Opslagsmærket hedder "Nyt opslag" (anden stil end "Ny"-stand); "Ny" kun via standen (`kildeNyStatus`). Test: 1979-annonce oprettet i går giver "Nyt opslag", ikke "Ny". |
| F2-006 | P1 | Ingen personoplysninger indsamles til noget, der ikke leveres: formular og felter fjernet, klar tekst FØR enhver handling; kun telefon vises hvis sælgeren har valgt det; den falske tæller (+1 pr. klik) fjernet. Åben ejerbeslutning om besked-levering beskrives. Test på egen annonce i mock: ingen POST med navn/e-mail/telefon, ingen tæller-skrivning. |
| F2-008 | P2 | Modelnavne bevares uforkortede; "Street Glide/Street Bob/Street Triple/Street Rod/Street 750" bliver ikke Naked via ordet "Street"; søgning "street glide" finder dem; test på 15 navne inkl. ægte Street-nakeds (type fra kilde/model-tabel, ikke ordet alene). |
| F2-009/011/014 | P2/P3 | Aldrig "null"/"undefined"/"NaN" i brugerrettet tekst (test: kort/annonce/sammenlign/swipe med alle felter null). Søgning uden typeord/tastefejl: kun hvis rent og enkelt, ellers beskrevet. Uden model: "Model ikke oplyst"/"Ukendt mærke" ærligt; ingen opfundet model. |
| F2-010 | P2 | Ved backend-fejl/tom hentning står en ærlig fejl ("Vi kunne ikke hente annoncerne lige nu — prøv igen"), ikke "Bikerbasen er helt nyt". Test med mock (500 og []). |
| F2-007 | P1 hyp. | Kun rapport-note (kræver crawl/ejerbeslutning). |

Gate: `npm test` (645 baseline i worktree), `node --check` på alle js, 0 overflow og ren konsol på berørte sider (mocks).

## Bevis

(udfyldes nedenfor under bygning)
