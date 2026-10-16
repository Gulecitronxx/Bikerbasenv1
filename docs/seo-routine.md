# SEO-Routine (kontinuerligt cloud-spor)

Mål: et lille, gentaget arbejdsløb i skyen (ingen lokal computer tændt) der holder Bikerbasens tekniske og indholdsmæssige SEO sund og finder nye organiske muligheder — uden nogensinde at røre produktionen direkte.
Dette er et **driftsspor, adskilt fra produkt-Gauntleten** (`docs/review/GAUNTLET.md`). Det blokerer ikke produktarbejdet.

## Rammer (ufravigelige)

1. **Kun pull requests mod `main`.** Aldrig push direkte til `main`, aldrig merge. Ejeren (eller en senere godkendt auto-merge) afgør.
2. `CLAUDE.md`s juridiske regler gælder uændret: ingen ændring af crawler-regler, robots-håndtering, feltliste, rate limit, opt-out eller claim. Routinen **kører ikke crawleren** og rører ikke `crawler/`, `sources/`, `supabase/`.
3. Ingen skrivning til produktions-Supabase, ingen secrets i output, ingen nye eksterne tjenester eller betalinger.
4. Intet opdigtet: tal og påstande på sider skal komme fra lageret eller verificerede officielle kilder (kilder noteres).
5. Hver PR skal have grøn gate: `node --check` (js/crawler/scripts), `npm test`, `node scripts/build.js`, `node scripts/udgiv.js`, og en kort **før/efter-SEO-sammenligning** (title/description/canonical/robots/h1/JSON-LD/interne links for alle sider — ingen regression).
6. Maks. én PR pr. kørsel og maks. ca. 10 ændrede kildefiler (genererede sider ikke talt med). Større idéer → notat i `docs/seo-log.md`, ikke kode.

## Hver kørsel (prompt til Routinen)

> Du er Bikerbasens SEO-routine. Læs `CLAUDE.md`, `DESIGN_DNA.md`, `docs/seo-routine.md` og `docs/seo-log.md`. Gå igennem i denne rækkefølge og stop ved første punkt der kræver ejerens beslutning:
> 1. **Tilstand:** hent live `https://bikerbasen.dk/sitemap.xml` og `robots.txt` (maks. 1 request/sek.); tjek at alle sitemap-URL'er svarer 200, har canonical til sig selv, ét h1, unik title/description (≤60/≤160 tegn), gyldig JSON-LD og ikke er noindex. Tjek interne links (døde links, forældreløse sider) og at nye annoncer/sider er med.
> 2. **Friskhed:** er lagerdata ældre end 14 dage, skriv det som fund (routinen starter ikke crawleren).
> 3. **Indhold med reelt grundlag:** kig efter søgeintentioner med nok annoncer men uden side (pris, by, model, mærke+type), tynde eller dublerede sider, manglende interne links, forældede guide-påstande (fx datobundne regler i `scripts/guides-data.js` — verificér mod officielle kilder: Færdselsstyrelsen, borger.dk, retsinformation.dk).
> 4. **Én forbedring:** vælg den med størst forventet organisk effekt pr. indsats, lav den på en ny branch `seo/<kort-navn>`, kør hele gaten, skriv før/efter-sammenligning i PR-teksten, og åbn PR mod `main`.
> 5. **Log:** tilføj en linje til `docs/seo-log.md` (dato, fund, handling, PR-link, næste skridt).
> Hvis noget er uklart, kræver en juridisk vurdering eller rører ufravigelige regler: lav INGEN ændring, skriv det i loggen.

## Opsætning (cloud)

- Type: Claude Code Routine (planlagt cloud-agent) på repoet `Gulecitronxx/Bikerbasenv1`, standard-branch `main`.
- Interval: ugentlig (fx mandag morgen) til start; hyppigere først når PR'erne holder kvaliteten.
- Adgang: kun repo-læsning og PR-oprettelse. Generatorer læser Supabase med den offentlige anon-nøgle i `js/supabase-config.js`; routinen skriver aldrig.
- Overvågning: ejeren gennemgår PR'erne; to afviste PR'er i træk → pausér og revurdér prompten (Meta-Gauntlet).

## Hvad der IKKE er med (bevidst)

- Søgevolumen, Search Console og placeringsdata (kræver ejerens adgang). Når en eksport eller API-adgang findes, tilføjes den som input i punkt 1 og 3.
- Linkbuilding, betalte kanaler og Cloudflare-regler (to URL'er pr. side, `.html` og uden endelse): kræver ejerens beslutning og adgang.
