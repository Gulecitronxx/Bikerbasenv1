
## Status efter oprydningen (26.08.2026)

| ID | Status | Note |
|---|---|---|
| R13-1 sortér slukket paa mobil | **lukket** | Praemissen ("koster et halvt kort") udloeb, da runde 12 lagde raekkerne bag en lukket fold |
| R13-2 tom fold paa 8 maerkesider | **lukket** | Foelger af R13-1; efterproevet paa Benelli: 62 px med tre chips |
| R13-3 23 % af titlerne klippet | **lukket** | To linjer under 560 px. Maalt paa Harley: 8 af 24 klippet -> 0 |
| R13-4 forbeholdet naaede ikke skaermlaeseren | **lukket** | aria-label paa rolleloest span -> .visually-hidden-soeskende |
| R13-5 "Andet Maerke"/"Lauge"/dubletter | **lukket** | Rettet baade i displaylaget og crawleren |
| R13-6 facetsiden doer ved kort 24 | **lukket** | Knappen fandtes, men som ghost-pille — nu samme vaegt som maerkesidernes |
| R13-7 antallet opdateres ikke i drift | **lukket** | Baade overskrift og introens tal, og de opdateres SAMMEN |
| R13-8 CSP paa 4 sider mere | **lukket** | Plus js/csp-billedvaerter.test.js, som er efterproevet at kunne fejle |
| R13-9 typeNote uden for folden | **lukket** | |
| R13-10 foldens disclosure-semantik | **lukket** | aria-controls + tilstand i navnet, uden JS |
| R13-11 to identiske kort | **AABEN** | Se nedenfor |
| R13-12 "Mulig A1" paa A2-siden | **lukket** | Siden siger nu selv, at A2 daekker A1 |
| R13-13 desktop er mobil med mere luft | **delvist** | Sorteringsraekkens etiket rettet. Listehovedets to <p> og det manglende section-link staar aabne |
| R13-14 anonym tomtilstand | **lukket** | |
| R13-15 saelgerindgang skjult for anonyme | **lukket** | Linket var aldrig doedt — opret-annonce.js omdirigerer selv |

### R13-11 staar aaben med vilje

To kort paa A2-siden er identiske i hvert eneste viste felt: "Honda ST 125 DAX ·
49.995 kr. · 2024 · 125 ccm · km ikke oplyst · Mulig A1 · Roedding · mcsyd.dk".
Kritikeren kunne ikke bevise, at det er en dedup-fejl — id'erne og
forhandlerens billed-id'er peger paa to fysiske maskiner — og det kan jeg heller
ikke.

Derfor roerer jeg det ikke. At skjule det ene kort ville vaere at paastaa, at der
kun er én maskine; at slaa dem sammen til "2 stk." ville paastaa, at de er ens.
Begge dele er et gaet om kildens lager. Det aerlige svar kraever et felt, vi ikke
gemmer i dag (stelnummer eller kildens annonce-id), og det er en
crawler-beslutning, ikke en CSS-beslutning.
