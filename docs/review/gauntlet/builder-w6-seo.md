# Builder w6-seo — acceptkriterier (skrevet FØR koden)

## K1 Brødkrumme + knaprække server-renderet (scripts/build-listing-pages.js)
- K1a `side(l)` kan kaldes uden netværk (fil kan `require`s uden at bygge).
- K1b Hvert `.bc-sep` i brødkrummen indeholder chevron-SVG'en fra js/icons.js i det statiske markup.
- K1c Sidste led har `aria-current="page"` og samme tekst som js/annonce.js `anBrodkrumme` (mærke+model, "Annonce" som fald-tilbage, "Ukendt" mærke udelades, `&amp;` i href).
- K1d `#an-actions` indeholder Del/Sammenlign (og Gem som favorit kun for ikke-eksterne) med de samme klasser/attributter som `anAktioner`.
- K1e Test: integrationstest renderer på fixture og tjekker K1b-d uden JS. Rapport lister overflødige CSS-regler.

## K2 llms.txt
- K2a `scripts/build-llms.js` skriver `llms.txt` deterministisk (to kørsler = identiske bytes), ingen netværk.
- K2b Kun sande ikke-tal-påstande; ingen cifre i tekst om antal annoncer; links til sitemap, guides, søgning, om/kontakt.
- K2c `/^llms\.txt$/,` i udgiv.js allowlist; trinnet registreret i build.js.
- K2d Test dækker K2a-c; alle links i filen peger på filer der findes.

## K3 Critic-P3
- K3a distinkt-nøgle med manglende pris/årgang/km: 5 ens-tomme annoncer tæller ikke som 1 "identisk lagerenhed".
- K3b `&amp;` i modelsiders "Se alle"-href.
- K3c medianårgang vises konsekvent og ærligt (ingen skjult afrunding 2015,5 -> 2016).
- Hver rettelse låst af test; ligger fixet uden for ejerfiler beskrives det i stedet.

## Bevis
Tilføjes pr. kriterium nedenfor efterhånden.

## Bevis (alle kørt i worktreen)
- K1a-e: `scripts/annonce-statisk.test.js` (4 tests grønne) — pile, aria-current, `&amp;`, handlingsrække og identitet med `anBrodkrumme`/`anAktioner` kørt i stub-DOM, 3 fixtures (inkl. "Ukendt" mærke og manglende model/årgang). `side()` eksporteres; generatoren kører kun ved direkte kald.
  Overflødige CSS-regler: ingen eksplicit reservation for brødkrumme/handlingsrække fundet i css/ (kun `.an-crumbrow`/`.an-actions` layout, som stadig skal stå). `.breadcrumb svg{14px}` bruges nu også af server-markup. Forsiden/andre sider med `.bc-sep` er urørt.
- K2: `scripts/llms.test.js` (5 grønne): deterministisk (to kørsler = samme bytes), ingen antal/pris/"verificeret", links findes, registreret i build.js (efter build-meta) og `/^llms\.txt$/,` i udgiv.js. `scripts/seo-vagt.test.js`s tre hårdkodede trinlister opdateret.
- K3a: `distinkte()` i seo-sider.js kræver pris+årgang oplyst; ellers egen nøgle (id). Test i seo-sider.test.js.
- K3c: ny `medianAarTekst()` (2015–2016, aldrig 2016). Test.
- K3b: se åbne punkter (fix ligger i build-facet-pages.js, ikke mine filer). `soegHref` default er allerede `&amp;` (låst af test).

## Åbne punkter til Orchestrator / facet-strømmen (filer uden for mine)
1. build-facet-pages.js:892 `facetSearchUrl` bruger `{ html: false }` men bruges kun i HTML-hrefs (l.1574/1579/1588/1602/1613) -> rå `&` i modelsiders "Se alle"-link. Fix: `{ html: true }` (l.1574 har allerede `&amp;agent=1` efter). Committede model-*.html skal genbygges.
2. build-facet-pages.js:745 `medianårgang ${SIDER.median(aar)}` -> `SIDER.medianAarTekst(aar)`.
3. build-facet-pages.js:~1732 (browser-hydrering) har egen kopi af distinkt-nøglen; skal følge `distinktNoegle` (kræv pris+årgang, ellers unik pr. id).
4. Nye testfiler til `npm test`: scripts/annonce-statisk.test.js, scripts/llms.test.js (seo-sider/seo-soeglink/seo-vagt tests er allerede med).
5. `npm test` i worktreen: 7 fejl er præ-eksisterende (manglende moduler @supabase/supabase-js, yaml, playwright i crawler/*-tests + 1 seo-vagt P2-1); identisk med e5eaa90.
