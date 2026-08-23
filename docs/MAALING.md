# Måling: GA4-hændelser og Search Console

Skrevet efter audit 23.08.2026 (C3). GA4 (`G-RWJZ8NJB0C`) målte kun
sidevisninger; nu måles tragten. Al måling er bag cookiesamtykket
("Accepter alle") og indeholder ingen persondata — se hovedet af
`js/maaling.js`, som er det eneste sted, der taler med `gtag`.

## Hændelser

| Hændelse | Hvornår | Parametre | Kaldes fra |
| --- | --- | --- | --- |
| `search` | et filtersæt er tegnet færdigt (800 ms ro, kun når forespørgslen er ny) | `search_term` (≤80 tegn), `brands`, `types`, `koerekort`, `price_min/max`, `sort`, `results` | `js/search.js` `maalSoegning()` |
| `view_item` | en annonce åbnes (egen eller indekseret) | `items[{item_id, item_name, item_brand, item_category, price, currency, kilde}]`, `kilde` | `js/annonce.js` `renderListing()` |
| `kilde_klik` | klik på et link til et andet værtsnavn — "Se annoncen hos …" og den faste bjælke | `link_domain` + annonceparametre | `js/components.js` (delegeret lytter) |
| `save_search` | søgeagent oprettet | `results`, `brands`, `koerekort` | `js/search.js` |
| `add_to_wishlist` / `remove_from_wishlist` | hjertet | `items[…]` | `js/components.js` |
| `generate_lead` | "Skriv til sælger" sendes (kun AT det skete) | annonceparametre | `js/annonce.js` |
| `publish_listing` / `edit_listing` | annonce udgivet/rettet | `item_brand`, `item_category` | `js/opret-annonce.js` |
| `sign_up` / `login` | konto oprettet / logget ind | `method: email`, `dealer` | `js/login.js` |

`kilde` er kildens domæne (`mcsyd.dk`, `guloggratis.dk`, …) eller `bikerbasen`
for egne annoncer. Det er den dimension, der svarer på "hvilken kilde tager
trafikken".

**Tjek i GA4:** Admin → DebugView med `?debug_mode=1` kan ikke bruges her
(vi sætter ikke debug_mode). Brug Realtime → Events, klik dig gennem
søgning → annonce → "Se annoncen hos", og se `search`, `view_item`,
`kilde_klik` komme ind. Efterprøvet lokalt 23.08.2026 med samtykke=all:
alle tre kom i `dataLayer` med de rigtige parametre; med samtykke=necessary
kom ingenting.

**Enhanced measurement:** hvis "Outbound clicks" er slået til i GA4's
datastrøm, sendes der OGSÅ en automatisk `click`-hændelse på de samme links.
Det er ikke en fejl — men brug `kilde_klik` i rapporterne; den kender
annoncen og kilden.

**Rapporter, der nu kan laves:** søgninger pr. filter (`brands`, `koerekort`)
→ `view_item` → `kilde_klik` pr. `kilde`; `results = 0`-søgninger (hvad
mangler i lageret); `save_search` pr. filter (efterspørgsel, vi ikke dækker).

## Search Console (manuelt — kræver Google-konto)

1. search.google.com/search-console → *Tilføj ejendom* → **Domæne** →
   `bikerbasen.dk`.
2. Verificér med den TXT-record, Google viser, i DNS (one.com i dag;
   Cloudflare efter A3 — `docs/CLOUDFLARE.md`). Ingen meta-tag i HTML
   nødvendig, og ingen er lagt ind.
3. *Sitemaps* → indsend `https://bikerbasen.dk/sitemap.xml` (robots.txt
   peger allerede på den; 42 URL'er).
4. Kobl GSC til GA4: GA4 → Admin → Product links → Search Console links.

Først derefter findes "hvilke søgeord giver os klik" et sted.
