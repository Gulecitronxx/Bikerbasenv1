# V4 QA (Agent 5, kritiker) - fase 1: mærkedækningsrunner

Worktree: wt/v4-qa, branch gauntlet/v4-qa, udgangspunkt gauntlet/master 95df5046.

## Hvad der er bygget
- `scripts/v4-maerke-dakning.js` - runner (CLI + modul `koer()`), se kommandohovedet i filen.
- `scripts/v4-maerke-dakning.test.js` - 5 tests (3 statiske/rene, 2 browser; browserdelen springes over uden Playwright).
- `scripts/v4-maerke-dakning.kendt.json` - kendte fund pr. 95df5046 (tjek|mærke). Tæller ikke i exit-kode; skrumper når andre agenter retter.
- `docs/review/gauntlet/v4/qa/maerke-baseline-live.json` - baseline: 720 annonce-id -> mærke (live, produktions-Supabase læst GET-only) + 29 mærkesider (canonical/noindex/antal) + sitemap.
- `docs/review/gauntlet/v4/qa/maerke-baseline-fixtures.json` - samme, mod smoke-fixtures (deterministisk; bruges af testen).

## Design
- Mærkeregister: `img/brands/register.json` eller `js/brand-register.json` hvis de findes, ellers `img/brands/manifest.json` (64 mærker). `--register <fil>` overstyrer. Kun `normaliserRegister()` skal tilpasses, når Agent 1's format er kendt.
- Siden serveres på værten `bb-qa.test` (ikke localhost), så SHOW_DEMO_DATA er false som i drift.
- `--data live`: hver REST-adresse hentes én gang fra Supabase (GET), serveres derefter fra cache; alle ikke-GET mod *.supabase.co afvises og tælles (overtrædelser = 0 i alle kørsler). `--snapshot` giver offline genkørsel.
- Tjek 1 filter/antal: #so-brand og afkrydsningslisten pr. lagermærke, antal = lagerets; mærkesidens hydrerede [data-mk-n]; oversigtens tal; statisk tal (live).
  Tjek 2 alias: syntetisk annonce x alle navne/aliaser/slug-varianter (226), kerne-aliasser mod rigtigt lager i søgefeltet, hurtigsøgning på maerker.html (50 aliasser).
  Tjek 3 logo: fil+hash, generated brand-logos-data i synk, data-bl/slug, link, navn, alt-politik, døde logobilleder.
  Tjek 4 opret-annonce: #f-brand har alle registermærker + lagermærker + sidemærker; valg uden fejl.
  Tjek 5 regression: id -> mærke mod baseline (skiftet/mistet = fejl, Ukendt->mærke = advarsel til validering, stavning = advarsel), URL/canonical/noindex bevaret.
  Tjek 6 dubletter/ødelagte sider: slug/navn/alias-kollisioner, flere stavemåder, flere sider pr. mærke, tom indekserbar side, sitemap, konsolfejl/404/h1/null.

## Kørsler pr. 95df5046
- Fixtures, fuld: 1 fejl, 15 advarsler. Live, fuld (~60 s): 5 fejl, 11 advarsler, 0 afviste skrivninger, baseline selv-sammenlignet: 720/720 uændret.
- Test: 5/5 grønne (tid 25-170 s afhængig af maskinbelastning).
- Runneren er verificeret til at KUNNE fejle: fejlindsprøjtning (ødelagt mærkefilter, dublet-slug, canonical, manglende logo, dublet i oversigt, tom indekserbar side, sitemap, skiftet mærke).

Fase 2 (efter integration): kør runneren mod V4-build med `--baseline maerke-baseline-live.json --data live` + `node scripts/v3-regression.js`, og skriv uafhængig dom her.
