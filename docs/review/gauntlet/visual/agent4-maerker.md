# Agent 4 (w14): mærker, kategorier og kørekort — Visual Fidelity Gauntlet

Branch `gauntlet/w14-maerker` (fra fefe1570). Mål: Mærker.png (Yamaha), Sport motorcykler.png (type), Motorcykler til A 2.png (kørekort).
Test: generatorerne er kørt på SYNTETISK lager (308 annoncer) i en kopi udenfor repoet (`%TEMP%\w14\site`); annoncefotos peger via route i testen på sitets egne type-fotos. Produktions-Supabase er ikke rørt; build.js er ikke kørt.

## Acceptkriterier (skrevet FØR arbejdet; målt ved 1440x900 lys, medmindre andet er angivet)
K1  Hero-højde: type-/kørekort-/region-/model-hero (fra headerbund til heroens underkant) højst 360 px; mærkehero højst 380 px (baseline 430-465 px). H1 højst 48 px og på én linje ved 1440, hvor titlen er under 30 tegn.
K2  "Udvalgte ..." overskriften starter højst 760 px fra sidens top på type-, kørekort- og mærkesider (baseline 840-930 px): "Kort fortalt" flyttes ned under annoncerækken.
K3  Annoncekort i "Udvalgte"/mærkerækken: kørekort-, ccm- og hk-chip står på ÉN række (0 kort med to chiprækker, undtagen den lange "Kørekort ikke afgjort"-chip); alle kort i rækken har samme højde.
K4  Typefliser (kørekort, region, budget, mærke): fotofliser i samme format som forsidens (2,1:1, højst 120 px høje), mindst 5 fliser pr. række ved 1440, når der er 5 typer eller flere.
K5  Bundens linkgrupper (relaterede søgninger, region, budget, andre typer, kørekort) står i en 3-kolonne-grid ved 1440 i stedet for 5-6 stablede sektioner; højde under 60 % af baseline.
K6  Søgemodulerne har ikoner i felterne (søg, type, pris, årgang) som billederne, og tallet under knappen = antallet i søgningen (seo-chip-tjek uændret).
K7  Mærkehero: logo-lockup (logo + ordmærke) tydeligt (logo >= 56 px højt), ens opsætning på alle mærker; overskriften står som understreg under lockuppen, ikke som anden stor titel.
K8  Region-/kørekortkolonner på mærkesiden som fliser med tal (som billedets 5 regionsfliser) i stedet for tekstliste.
K9  Ingen regression: 0 vandret overflow (320/390/768/1024/1440, lys+mørk), CLS < 0,05, 0 konsolfejl, tap-mål >= 40 px, kontrast >= 4,5:1, SEO uændret (title/description/canonical/JSON-LD/links), kritisk-CSS-ækvivalens, alle eksisterende tests grønne.
K10 Mobil 390: hero højst 520 px, søgekortets knap synlig over folden på type- og kørekortsider (som før), ingen overlappende elementer.

Beskyttet af ejerens brandvalg (ikke en afvigelse): orange/kobber CTA i stedet for billedernes grønne, ensfarvede logoer, ingen opdigtede tal/forfattere/anmeldelser.
