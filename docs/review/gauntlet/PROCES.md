# PROCES — gate, faldgruber og regler der virkede

Kort og praktisk. Kør i denne rækkefølge fra repoets rod (eller din worktree). Stop ved første rød.

## Gate-kommandoer (i rækkefølge)

| # | Kommando | Hvad den fanger | Tid |
|---|---|---|---|
| 1 | `for f in js/*.js scripts/*.js crawler/*.js; do node --check "$f"; done` | syntaksfejl | sek. |
| 2 | `npm test` | 1000+ tests (node:test) | ca. 7 min (400 s målt, heraf 6 browser-filer ca. 330 s) |
| 3 | `node scripts/build.js` (kun Orchestrator, aldrig i en strøm-worktree) | genererede sider, sitemap, versionsstempel, CSP-hashes | < 1 min |
| 4 | `npm run udgiv` (= `node scripts/udgiv.js`) | allowlist + at HVER fil-reference i de udgivne sider peger på en fil, der er med. Det, der fejlede i c4aada0 | sek. |
| 5 | `npm run verificer` (= `node scripts/verificer-site.js`) | syntaks, test, header-synk, seo-audit, sitemap, døde links, testliste | = trin 2 + sek. |
| 6 | `node scripts/smoke-browser.js --strikt` | offline browser-smoke: konsol, overflow, CLS m.m. (kræver Playwright) | 1-3 min |
| 7 | `node scripts/visuel-regression.js --ud <ny> --mod <baseline>` | pixel-diff mod baseline | 1-3 min |

Genvej: `npm run gate` (= `verificer-site.js --med-udgiv`) kører trin 1, 2, 5 OG udgiv-tørkørslen (trin 4) i ét kald. Med `--hurtig`
springes `npm test` over (brug det, når testen lige er kørt). Valgfrit: `--med-browser` (trin 6, hurtig variant) og
`--med-visuel <baseline>` (trin 7). udgiv.js skriver kun til `_site/` (gitignoreret) og rydder kun den mappe; den rører intet netværk.

## Kendte faldgruber

- **udgiv.js attribut-tolkning.** Scanneren læser `href|src|srcset|imagesrcset="..."` med regex i HELE html'en, også i en kommentar eller et
  inline-script. En streng som `src="fil.js"` i en kommentar giver en falsk "mangler fil" og rød deploy (c4aada0). Skriv aldrig
  attributlignende strenge i kommentarer/inline-scripts, og kør `npm run gate` FØR push. `verificer-site.js` kørte ikke udgiv.js før `--med-udgiv`.
- **CRLF/LF-støj.** Repoet er blandet (autocrlf). Genererede filer (llms.txt, sitemap, *.html) kan se ændrede ud af linjeskift alene. Bevar
  filens eksisterende linjeskift; tjek `git diff --stat` og `git diff --ignore-cr-at-eol` før commit. Skriv ikke regex med backslash-r-n gennem
  shell-heredocs (backslash'er bliver ædt/ændret) — brug `String.fromCharCode(13)` eller en node-fil.
- **llms.txt.** `scripts/build-llms.js` skriver llms.txt i roden. `npm test` gjorde det som sideeffekt (rettet i w11: testen kører en temp-kopi).
  Kør build-llms/build.js kun bevidst.
- **node_modules i worktrees.** Worktrees har ingen. Brug PowerShell: `New-Item -ItemType Junction -Path node_modules -Target "C:\Users\pasca\Desktop\rod\Claude code\node_modules"`.
  `cmd mklink /J` fra Git Bash gav et FORKERT mål (`C:\C:\...`): `ls` ser fint ud, men `fs.statSync` kaster ENOENT, crawler-tests fejler
  og udgiv.js crasher. Verificér med `(Get-Item node_modules).Target`. Mappen er i .gitignore. Fjern junction med `cmd /c rmdir node_modules` (ikke rekursiv sletning).
- **GateGuard (Fact-Forcing Gate).** Hook'en blokerer første forsøg på Edit/Write uden forudgående Read og på kommandoer, der ligner destruktive
  (også når ordet blot står i en heredoc-tekst). Læs filen først; ved blokering: list berørte filer, rollback-linje og brugerens instruktion, og prøv igen.
- **Port/proces.** Kun din egen dev-server-port, maks. én Chromium ad gangen; ingen `taskkill`.
- **Værktøjer der muterer repoet.** Kør `git status --short` før og efter hver gate; en uventet ændring (llms.txt, sitemap, ?v=) er en fejl, ikke støj.
- **Målinger i en worktree under redigering.** Redigér ikke filer, mens `npm test` kører i samme worktree; tests læser kildefiler og giver falske røde.

## Builder-regler der virkede

- Skriv acceptkriterier FØRST i rapporten (`builder-<strøm>.md`); mål mod dem til sidst.
- Kun ejer-filer; delt lag (styles.css, components.js, build.js, udgiv.js, package.json "test") kun via Orchestrator ("DELT-ØNSKE").
- Små commits med eksplicit `git add <fil>` (aldrig `-A`), danske beskeder, `Co-Authored-By`-linje; ingen push.
- Nye tests som `<mappe>/<navn>.test.js`, kør `node --test <fil>`, og meld filnavnet — Orchestrator føjer til `npm test` (verificer-site trin 7 fanger glemte).
- Test på den renderede side (Playwright, viewport-screenshots, lys+mørk, 390/1440), ikke kun kildekode.
- Kør `npm run gate` FØR du melder færdig; indsæt resultatlinjen i rapporten.

## Critic-regler der virkede

- Kør selv koden/siden; stol ikke på Builder-rapporten. Hvert fund har fil:linje, reproduktion og alvor (P0-P2).
- Gentag en fejl i browseren, før du kalder den en fejl (CSP-/CORS-støj fra lokal Supabase er kendt).
- ACCEPTER kræver grøn `gate` + `smoke-browser --strikt` + visuel sammenligning af de berørte sider i begge temaer.
- Skil kosmetik (P2) fra regressioner (P0/P1); en test, der kun søger efter en streng i kilden, er IKKE bevis for adfærd.
- Orchestrator: kør gate på det samlede resultat efter hver merge (konflikter mellem individuelt korrekte ændringer); ingen push før `gate` er grøn.
