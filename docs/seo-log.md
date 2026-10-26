# SEO-log

Én linje pr. routine-kørsel: dato, fund, handling, PR, næste skridt.

| Dato | Fund | Handling | PR | Næste skridt |
|---|---|---|---|---|
| 2026-10-26 | Live-tjek (sitemap.xml, robots.txt, sidernes HTML) kunne ikke udføres: cloud-miljøets proxy afviste forbindelsen til bikerbasen.dk:443 (403 på CONNECT). Lokalt: `node scripts/seo-audit.js` → 102 sider, 73 indekserbare, 0 fund; sitemap.xml i repoet har 73 URL'er. Guide 3 (`scripts/guides-data.js`) dækker allerede, at syn ved ejerskifte ophæves 1.1.2027 (BEK 259/2026); datoen er ikke passeret, så ingen ændring. Lagerfriskhed ('bekræftet senest') kunne ikke måles live; seneste byggedato i repoet er 21.10.2026 (5 dage). Ingen forbedring lavet. | Kun denne logfil | denne PR | Ejeren: tillad bikerbasen.dk i miljøets netværkspolitik (kun læsning, maks. 1 req/sek.), så live-tjek kan køre. Genvurdér guide 3 i december 2026 / januar 2027. |
