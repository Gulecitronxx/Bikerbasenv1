# Agent 5: tværgående konsistens-tjek (1440x900, lys; målt i de fem worktrees)

Målt med `cross.js` (udenfor repoet) i `wt/w14-forside`, `w14-soegning`, `w14-annonce`, `w14-maerker`, `w14-brugere`. Kun læst. `w14-soegning` havde ingen commits da målingen kørte (= baseline). Annoncesiden kunne ikke vurderes: den eneste committede annonceside viser "Annoncen findes ikke" uden lager.

## Prioriteret liste til Orchestrator/agenter
1. **Header-højde (Agent 1 / merge).** Forside-branchen har header 54 px og en ekstra "Om Bikerbasen"-menu; de fire andre har 68 px. Efter merge skal `node scripts/synk-header.js` køres, så ALLE sider (guides, login, dashboard, info, mærker, kørekort) får samme header; ellers hopper layoutet mellem sider. Tjek at heroernes top-padding ikke er tunet til en bestemt header-højde.
2. **H1-skala i heroer er ikke ens:** forside 43 px, mærkeside 30 px (Yamaha) / 48 (kørekort, type) / 50 (mærker-oversigt), guide 42, dashboard 46 — og kørekort/type i de uberørte branches stadig 64. Forslag: én skala `clamp(32px, 3.2vw, 46px)` til indholdsheroer (kategori, mærke, guide, profil); forsiden må være 1 trin større (~54).
3. **Hero-højde:** kørekort-a2/type-sport 416-429 px (ikke berørt), mærker-branchen 306-382, mærkeside 452 -> 382, guide 337, mine annoncer ca. 204, forside 252 + overlappende søgekort. Mål: 280-380 px for indholdsheroer. Kørekort-/typesider (Agent 4) er stadig 416+.
4. **Tillidsrække:** forside = ren tekst med ikon, mærkeside = hvidt kort med peach ikon-cirkler. Vælg ét udtryk (kortet fra mærkesiden matcher login-strimlen og guides).
5. **Kort fortalt:** samme grønne tint og ✓ på mærke/kørekort/guide/info, men bred 2-spalters række (mærke/kørekort) vs smalt sidekort (guide/info). Acceptabelt (billede 10 har sidekort), men ikonstørrelse/radius bør være ens (guide: 26 px pære, radius lg).
6. **Knapper:** alle pille (999 px) og brandfarve; højde 40 (forside-søgning) / 49 (resten). Sæt 48-49 overalt undtagen kompakte headerknapper.
7. **Footer** er ens (synkes), men forside-branchen er målt med header 54: kør synk samlet.
8. **Baggrund/farver:** alle bruger samme varme creme (#F7F5F2) og brandfarve (#C6420E); ingen afvigelser fundet. Grøn kun til ✓/Aktiv.
9. **Info-sider (om, sikkerhed, vilkår):** havde ikon over tekst i "Læs også" (rettet i w14-brugere i `css/p-info.css`; samme styles.css-regel `main ul:not([class]) > li > a:only-child` (specificitet 0,2,4) kan ramme andre lister med klasse på li/a i andre branches: giv egne link-lister `display:flex` med selektor `main .x ul > li > a:only-child`).
10. **Kritisk-test:** en ny absolut positioneret `visually-hidden`-span i et stretched sidekort giver forskellig `bottom` mellem kritisk-alene og fuldt ark. Giv containeren `position:relative` (gjort for `.gd-pop-card`); tjek lignende kort i nye aside-komponenter med `node --test scripts/w12-kritisk.test.js`.
