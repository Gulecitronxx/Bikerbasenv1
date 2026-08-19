# LIGHTHOUSE — det målte gulv

Gulvet står i `bar/RUBRIC.md` kategori 3 og er **absolut**: det gælder kun os, og
vi måler det ikke mod Bilbasens tal (`bar/GAPS.md`, gap 5 — deres side er fuld af
reklamepladser; at vinde på hastighed mod den er ikke en sejr, der tæller).

```
GULV:  ydelse ≥ 95   ·   tilgængelighed = 100   ·   grønne Core Web Vitals
GRØN:  LCP ≤ 2.500 ms   ·   CLS ≤ 0,10   ·   TBT ≤ 200 ms
```

**Status efter runde 4 (måler): 0 af 16 kombinationer består.**
**Status efter runde 6 (builder "ydelse"): 10 af 16.**
**Status efter runde 10 (måler, 17.08.2026, commit `4a33b41`): 9 af 14 på opgavens
syv URL'er — og fortsat 10 af 16 på det historiske sæt, altså uændret antal.**
**Status efter runde 11 (builder 3, 18.08.2026, commit `7297c07`): de tre målte
sider består på desktop og IKKE på mobil — men mobilhullet er skrumpet:
søgning 86/LCP 4.201 → 92/3.433, forside 93/3.186 → 96/2.784, annonce
95/2.924 → 97/2.577. CLS og a11y uændrede (0,000–0,001 og 100). Årsagen er
stadig alene mobil-LCP. Se afsnittet "Runde 11" nederst for hvad der blev
målt, hvad der blev afvist, og hvad der præcist står i vejen.**

Tilgængelighed er 100 på alle 18 målte celler, CLS er grøn på alle 18 (maks. 0,063),
TBT er grøn på alle 18 medianer (0–56 ms). **Hver eneste resterende fejl er
mobil-LCP.** De tre poster, der bærer dem, er de samme på hver side:
`css/styles.css` (nu **49,6 KB** — voksede 4,2 KB siden runde 6), de to fonte
(68,4 KB) og supabase-js fra jsDelivr (55,1 KB) — **173 KB**, før siden har vist ét
eget byte.

**A/B'EN PÅ SUPABASE-JS ER GJORT FÆRDIG, OG DEN TIDLIGERE KONKLUSION FALDER.**
De 142 ms LCP, runde 6 tilskrev "supabase-js på egen origin", holder ikke: 20
flettede par giver **4,3 ms ± 299 ms** i gevinst, D er bedst i 11 af 20 kørsler.
Se afsnittet "Runde 10" nedenfor før nogen checker et 212 KB bundt ind i repoet på
et ydelsesargument.

ADVARSEL FØR DU SAMMENLIGNER TAL PÅ TVÆRS: runde 5–6 er kørt på en anden maskintilstand
end runde 1–4. Samme TTFB, men under det halve FCP på en side, ingen har rørt.
Runde 4 og runde 6 kan IKKE stilles ved siden af hinanden. Læs runde 5 → runde 6,
og læs afsnittet "Runde 5 og 6" nedenfor, før du bruger et absolut tal til noget.
Runde 10 ligger på samme maskintilstand som runde 5–6 (FCP ~1.058 ms på de lette
sider i begge), så de to kan sammenlignes — men **runde 10 er den eneste runde, der
er målt på en fast commit** (`4a33b41`, udpakket med `git archive`), mens runde 1–9
alle målte uncommittede ændringer under aktiv redigering. Er du i tvivl, så stol på
runde 10's INTERNE sammenligninger (A mod D, side mod side) frem for et absolut tal.

---

## Sådan er der målt

| | |
|---|---|
| Værktøj | Lighthouse 12.8.2 CLI (`npx lighthouse --output=json`), Node v22.14.0 |
| Browser | Chrome headless (`--headless=new --no-sandbox --disable-gpu`) |
| Mobil | Lighthouse standardpreset: Moto G Power-emulering, **4x CPU-throttling**, langsom 4G (Lantern: 150 ms RTT, 1,6 Mbit/s ned) |
| Desktop | `--preset=desktop`: 1350×940, 1x CPU, ingen netværksstrupning |
| Kørt af | MÅLER, 16.08.2026, arbejdstræ `claude/vigorous-cohen-dc1032` |
| Sidste commit | `e18b487` (16.08.2026 11:10) — **alle målinger er på uncommittede ændringer oven på den** |

### Fire runder, to servere

| Runde | Klokkeslæt | Server | Hvorfor |
|---|---|---|---|
| 1 | 11:33–11:42 | Python `SimpleHTTP`, port 63194 | Første måler. Median af 3 mobilkørsler pr. side, 1 desktop. |
| 2 | 14:27–14:35 | Python `SimpleHTTP`, port 60745 | Denne måler, 1 kørsel pr. kombination. |
| 3 | 14:41–14:46 | Python `SimpleHTTP`, port 60745 | Gentag efter at andre agenter havde skrevet i filerne. |
| 4 | 14:46–14:52 | **gzip-server, port 60999** | Produktionslignende. Se nedenfor. |

**Runde 4 er den, der tæller.** Dev-serveren (`SimpleHTTP/0.6 Python/3.14.2`)
sender hverken `Content-Encoding` eller cache-headere. Produktionen gør. Verificeret
mod den rigtige side:

```
$ curl -sD- -H 'Accept-Encoding: gzip' https://bikerbasen.dk/css/styles.css
Server: GitHub.com
Content-Encoding: gzip
Content-Length: 37108        # mod 164.070 B ukomprimeret på dev-serveren
Cache-Control: max-age=600   # mod "no-store, must-revalidate" på dev-serveren
```

Runde 1–3 måler altså 127 KB ekstra på hver eneste sideindlæsning, som ikke findes i
produktionen. Til runde 4 er der derfor rejst en lille Node-server i scratchpad
(`gzserver.js`) der serverer det samme arbejdstræ med gzip på html/css/js/svg og
`Cache-Control: max-age=600` — GitHub Pages' opførsel. Repoet er ikke rørt.

Effekten af alene at slå komprimering til, forside mobil: **ydelse 70 → 85, LCP
6.381 → 3.960 ms.** Det er den enkeltrettelse, ingen skal lave — den er der allerede
i produktionen.

### Hvad metoden IKKE kan

- **`network-requests`-tider er OBSERVEREDE; FCP/LCP/SI er Lantern-SIMULEREDE.** De
  to tidslinjer kan ikke sammenlignes direkte. LCP-fasenedbrydningen (TTFB / Load
  Delay / Load Time / Render Delay) er internt konsistent — stol på den.
- **Filerne blev redigeret under målingen.** `css/styles.css` voksede fra 153.372 B
  (14:28) til 171.180 B (14:52) mens der blev målt; `js/search.js` fra 97.814 til
  105.182 B; alle HTML-filer blev regenereret 14:39:36 og igen 14:48:33. Runde 2, 3
  og 4 er derfor tre forskellige sider. Sammenlign kun inden for en runde.
- **Én kørsel pr. celle i runde 2–4** (runde 1 er median af 3). Lighthouse-støj på
  mobil er typisk ±3 point; forskelle under 5 point betyder ingenting.
- **Der kørte en Chrome-fane på samme maskine under alle runder.** CPU-konkurrence
  kan have kostet et par point. Retningen i tallene er stabil på tværs af fire
  runder, størrelsen er det ikke.
- **Ikke målt mod produktion.** Alt er lokalt. Ingen rigtig latenstid til Supabase,
  ingen rigtig CDN.
- **Kontrast på tekst oven på foto kan hverken jeg eller Lighthouse dømme.** 16
  tekstnoder på forsiden og 3 på søgesiden ligger på et billede eller bag et
  gennemsigtigt slør. De er sprunget over, ikke godkendt.

### To af de syv URL'er måler ikke det, navnet siger

| URL | Hvad der faktisk blev målt |
|---|---|
| `/annonce.html?id=1` | **"Annoncen findes ikke"** — tom fejltilstand, 192 DOM-elementer. Id 1 findes ikke; de rigtige er 1007, 1021, 1046, 1049 … Målingen er derfor også lavet på `?id=1007` (Honda CB650R, 751 elementer) og det er DEN, gulvet skal dømmes på. |
| `/forhandler.html` | **"Sælgeren findes ikke"** — tom fejltilstand, 140 elementer. Uden `?id=`. Der findes ingen vej til en udfyldt forhandlerside fra en annonce: `js/annonce.js:156` skriver `forhandler.html?id=${s.id}`, og på annonce 1007 bliver det til `forhandler.html?id=` — sælgeren har intet id. **En udfyldt forhandlerprofil er ikke målt, fordi den ikke kan nås.** |
| `/opret-annonce.html` | **Omdirigerer til `/login.html?redirect=opret-annonce.html`.** Lighthouse måler login-siden. Selve omdirigeringen koster 4.545 ms simuleret på mobil (runde 4). Opretteformularen er ikke målt. |

---

## Tallene

Alle rækker: `runde`, `dato`, `side`, `bredde`, `ydelse`, `a11y`, `LCP` (ms), `CLS`,
`TBT` (ms), `FCP` (ms), `SI` (ms), `KB` (overført), `req`, `DOM` (elementer),
`gulv` (ja/nej). Blokken er append-only — nye runder føjes nederst med et nyt
rundenummer, så den kan tegnes som graf over tid uden at nogen skal parse prosa.

```tsv
runde	dato	tid	server	side	bredde	ydelse	a11y	lcp_ms	cls	tbt_ms	fcp_ms	si_ms	kb	req	dom	gulv
1	2026-08-16	11:33	dev-ukomp	forside	mobil	72	100	5758	0.027	0	3045	3694	801	33	1442	nej
1	2026-08-16	11:34	dev-ukomp	forside	desktop	85	100	2201	0.063	0	1186	1186	1012	35	1442	nej
1	2026-08-16	11:34	dev-ukomp	soegning	mobil	70	100	6718	0.004	0	3054	3857	601	23	2401	nej
1	2026-08-16	11:35	dev-ukomp	soegning	desktop	82	100	1903	0.098	0	1561	1688	602	23	2745	nej
1	2026-08-16	11:36	dev-ukomp	annonce-tom	mobil	71	100	6789	0.035	0	3047	3275	587	23	187	nej
1	2026-08-16	11:37	dev-ukomp	annonce-tom	desktop	84	100	1836	0.082	0	1499	1499	588	23	187	nej
1	2026-08-16	11:37	dev-ukomp	forhandler-tom	mobil	70	100	6297	0.067	0	3100	3302	548	23	141	nej
1	2026-08-16	11:38	dev-ukomp	forhandler-tom	desktop	90	100	1543	0.089	0	1196	1196	548	23	141	nej
1	2026-08-16	11:38	dev-ukomp	maerker	mobil	72	100	6184	0.005	0	3048	3306	500	19	197	nej
1	2026-08-16	11:39	dev-ukomp	maerker	desktop	85	100	1869	0.007	0	1524	1524	501	19	197	nej
1	2026-08-16	11:39	dev-ukomp	opret-login	mobil	65	100	8427	0.067	0	4010	4010	1324	51	223	nej
1	2026-08-16	11:40	dev-ukomp	opret-login	desktop	58	100	5162	0.013	0	3689	3689	1325	51	223	nej
1	2026-08-16	11:41	dev-ukomp	sikkerhed	mobil	72	100	5736	0.040	0	3048	3430	497	17	216	nej
1	2026-08-16	11:42	dev-ukomp	sikkerhed	desktop	92	100	1482	0.035	0	1152	1152	497	17	216	nej
2	2026-08-16	14:28	dev-ukomp	forside	mobil	71	100	6197	0.003	12	3054	3808	810	33	1453	nej
2	2026-08-16	14:28	dev-ukomp	forside	desktop	85	100	2182	0.070	0	1183	1249	1021	35	1453	nej
2	2026-08-16	14:29	dev-ukomp	soegning	mobil	68	100	7034	0.004	5	3519	3968	625	23	2402	nej
2	2026-08-16	14:29	dev-ukomp	soegning	desktop	82	100	1837	0.124	0	1508	1508	625	23	2637	nej
2	2026-08-16	14:29	dev-ukomp	annonce-tom	mobil	69	100	6969	0.035	0	3494	3494	605	23	191	nej
2	2026-08-16	14:30	dev-ukomp	annonce-tom	desktop	64	100	1853	0.574	0	1511	1511	605	23	191	nej
2	2026-08-16	14:34	dev-ukomp	annonce-1007	mobil	47	100	7118	0.488	27	3559	3816	605	23	750	nej
2	2026-08-16	14:35	dev-ukomp	annonce-1007	desktop	72	100	3854	0.007	0	1510	1861	606	23	750	nej
2	2026-08-16	14:30	dev-ukomp	forhandler-tom	mobil	93	100	2953	0.067	0	1802	1802	555	23	141	nej
2	2026-08-16	14:30	dev-ukomp	forhandler-tom	desktop	90	100	1501	0.089	0	1162	1162	555	23	141	nej
2	2026-08-16	14:31	dev-ukomp	maerker	mobil	70	100	6182	0.005	0	3495	3495	507	19	197	nej
2	2026-08-16	14:31	dev-ukomp	maerker	desktop	86	100	1864	0.007	0	1524	1524	507	19	197	nej
2	2026-08-16	14:31	dev-ukomp	opret-login	mobil	65	100	8450	0.067	0	4021	4021	1332	51	223	nej
2	2026-08-16	14:32	dev-ukomp	opret-login	desktop	63	100	4443	0.013	0	2599	2599	1332	51	223	nej
2	2026-08-16	14:32	dev-ukomp	sikkerhed	mobil	72	100	5770	0.040	0	3065	3303	501	17	216	nej
2	2026-08-16	14:32	dev-ukomp	sikkerhed	desktop	92	100	1478	0.035	0	1150	1150	501	17	216	nej
3	2026-08-16	14:41	dev-ukomp	forside	mobil	70	100	6381	0.003	8	3139	3905	827	33	1383	nej
3	2026-08-16	14:41	dev-ukomp	forside	desktop	86	100	2163	0.064	0	1167	1167	1162	37	1383	nej
3	2026-08-16	14:41	dev-ukomp	soegning	mobil	67	100	7776	0.004	0	3571	4272	995	29	1572	nej
3	2026-08-16	14:42	dev-ukomp	soegning	desktop	68	97	4168	0.132	0	1516	1555	1887	44	1807	nej
3	2026-08-16	14:42	dev-ukomp	annonce-1007	mobil	68	100	7038	0.001	28	3527	3800	614	23	751	nej
3	2026-08-16	14:42	dev-ukomp	annonce-1007	desktop	72	100	3788	0.007	0	1490	1805	614	23	751	nej
3	2026-08-16	14:43	dev-ukomp	annonce-tom	mobil	59	100	7132	0.205	0	3574	3574	614	23	192	nej
3	2026-08-16	14:43	dev-ukomp	annonce-tom	desktop	72	100	1897	0.261	0	1545	1545	614	23	192	nej
3	2026-08-16	14:43	dev-ukomp	forhandler-tom	mobil	57	100	6223	0.289	8	3066	3547	572	23	172	nej
3	2026-08-16	14:44	dev-ukomp	forhandler-tom	desktop	90	100	1523	0.089	0	1176	1176	570	23	141	nej
3	2026-08-16	14:44	dev-ukomp	maerker	mobil	70	100	6203	0.005	0	3506	3506	515	19	197	nej
3	2026-08-16	14:44	dev-ukomp	maerker	desktop	86	100	1854	0.007	0	1512	1512	515	19	197	nej
3	2026-08-16	14:45	dev-ukomp	opret-login	mobil	59	100	9888	0.067	0	5921	5921	1346	51	223	nej
3	2026-08-16	14:45	dev-ukomp	opret-login	desktop	59	100	5037	0.013	0	3598	3598	1346	51	223	nej
3	2026-08-16	14:45	dev-ukomp	sikkerhed	mobil	72	100	5779	0.040	0	3069	3523	514	17	216	nej
3	2026-08-16	14:46	dev-ukomp	sikkerhed	desktop	88	100	1428	0.035	0	1160	2449	514	17	216	nej
4	2026-08-16	14:46	gzip	forside	mobil	85	100	3960	0.000	0	2185	2185	569	33	1383	nej
4	2026-08-16	14:47	gzip	forside	desktop	78	100	2683	0.056	0	1555	1555	905	37	1383	nej
4	2026-08-16	14:47	gzip	soegning	mobil	75	100	5860	0.002	0	2620	2620	656	29	1572	nej
4	2026-08-16	14:47	gzip	soegning	desktop	73	97	3121	0.015	0	1833	1833	1548	44	1807	nej
4	2026-08-16	14:48	gzip	annonce-1007	mobil	87	100	3762	0.000	20	2191	2191	290	23	751	nej
4	2026-08-16	14:48	gzip	annonce-1007	desktop	78	100	2855	0.007	0	1547	1547	290	23	751	nej
4	2026-08-16	14:49	gzip	annonce-tom	mobil	77	100	3718	0.205	0	2171	2171	290	23	192	nej
4	2026-08-16	14:49	gzip	annonce-tom	desktop	67	100	2566	0.260	0	1504	1504	290	23	192	nej
4	2026-08-16	14:50	gzip	forhandler-tom	mobil	71	100	3835	0.294	0	2193	2193	277	23	140	nej
4	2026-08-16	14:50	gzip	forhandler-tom	desktop	70	100	2585	0.206	0	1516	1516	277	23	140	nej
4	2026-08-16	14:50	gzip	maerker	mobil	87	100	3707	0.000	0	2188	2188	240	19	197	nej
4	2026-08-16	14:51	gzip	maerker	desktop	83	100	2238	0.007	0	1495	1495	240	19	197	nej
4	2026-08-16	14:51	gzip	opret-login	mobil	71	100	6212	0.000	0	3150	3150	588	50	223	nej
4	2026-08-16	14:51	gzip	opret-login	desktop	66	100	4112	0.006	0	2261	2261	588	50	223	nej
4	2026-08-16	14:52	gzip	sikkerhed	mobil	88	100	3542	0.000	0	2153	2153	239	17	216	nej
4	2026-08-16	14:52	gzip	sikkerhed	desktop	83	100	2214	0.035	0	1479	1479	238	17	216	nej
5	2026-08-16	15:02	gzip	forside	mobil	88	100	3968	0.000	0	908	1125	571	33	1383	nej
5	2026-08-16	15:02	gzip	forside	desktop	99	100	837	0.056	0	249	387	905	37	1383	ja
5	2026-08-16	15:03	gzip	soegning	mobil	88	100	3996	0.002	0	1057	1057	658	29	1572	nej
5	2026-08-16	15:03	gzip	soegning	desktop	99	97	970	0.015	0	286	328	1550	44	1807	nej
5	2026-08-16	15:03	gzip	annonce-1007	mobil	96	100	2704	0.000	12	909	1044	292	23	751	nej
5	2026-08-16	15:04	gzip	annonce-1007	desktop	100	100	815	0.007	0	247	391	292	23	751	ja
5	2026-08-16	15:04	gzip	annonce-tom	mobil	87	100	2706	0.205	0	909	909	292	23	192	nej
5	2026-08-16	15:04	gzip	annonce-tom	desktop	87	100	604	0.260	0	248	248	292	23	192	nej
5	2026-08-16	15:04	gzip	forhandler-tom	mobil	82	100	2658	0.294	0	908	908	280	23	140	nej
5	2026-08-16	15:05	gzip	forhandler-tom	desktop	85	100	623	0.294	0	248	248	280	23	140	nej
5	2026-08-16	15:05	gzip	maerker	mobil	97	100	2582	0.000	0	909	909	241	19	197	nej
5	2026-08-16	15:05	gzip	maerker	desktop	100	100	605	0.007	0	249	249	241	19	197	ja
5	2026-08-16	15:05	gzip	opret-login	mobil	86	100	4195	0.000	3	1251	1251	590	50	223	nej
5	2026-08-16	15:06	gzip	opret-login	desktop	98	100	1095	0.006	0	349	349	590	50	223	ja
5	2026-08-16	15:06	gzip	sikkerhed	mobil	98	100	2359	0.000	0	906	906	240	17	216	ja
5	2026-08-16	15:06	gzip	sikkerhed	desktop	100	100	543	0.035	0	248	248	240	17	216	ja
6	2026-08-16	15:19	gzip	forside	mobil	89	100	3825	0.000	0	1055	1335	425	33	1336	nej
6	2026-08-16	15:19	gzip	forside	desktop	99	100	887	0.056	0	287	460	760	37	1336	ja
6	2026-08-16	15:19	gzip	soegning	mobil	88	100	3980	0.002	12	1058	1058	661	29	1527	nej
6	2026-08-16	15:20	gzip	soegning	desktop	98	100	1064	0.015	0	288	352	1552	44	1762	ja
6	2026-08-16	15:20	gzip	annonce-1007	mobil	92	100	3349	0.000	30	1060	1060	297	23	593	nej
6	2026-08-16	15:20	gzip	annonce-1007	desktop	100	100	812	0.007	0	290	365	297	23	593	ja
6	2026-08-16	15:20	gzip	annonce-tom	mobil	96	100	2708	0.000	0	1060	1060	297	23	192	nej
6	2026-08-16	15:21	gzip	annonce-tom	desktop	100	100	632	0.007	0	287	287	297	23	192	ja
6	2026-08-16	15:21	gzip	forhandler-tom	mobil	96	100	2716	0.000	0	1059	1059	277	22	139	nej
6	2026-08-16	15:21	gzip	forhandler-tom	desktop	100	100	624	0.007	0	288	288	277	22	139	ja
6	2026-08-16	15:22	gzip	maerker	mobil	100	100	1885	0.000	0	1060	1060	167	12	192	ja
6	2026-08-16	15:22	gzip	maerker	desktop	100	100	428	0.007	0	288	288	167	12	192	ja
6	2026-08-16	15:22	gzip	opret-login	mobil	85	100	4392	0.000	5	1243	1243	441	49	222	nej
6	2026-08-16	15:22	gzip	opret-login	desktop	98	100	1061	0.006	0	344	344	441	49	222	ja
6	2026-08-16	15:23	gzip	sikkerhed	mobil	100	100	1881	0.000	0	1056	1056	167	12	211	ja
6	2026-08-16	15:23	gzip	sikkerhed	desktop	100	100	430	0.035	0	290	290	167	12	211	ja
10	2026-08-17	17:27	gzip	forside	mobil	90	100	3691	0.000	0	1058	1264	448	33	1097	nej
10	2026-08-17	17:28	gzip	forside	desktop	99	100	883	0.056	0	289	487	784	37	1097	ja
10	2026-08-17	17:29	gzip	soegning	mobil	86	100	4162	0.000	2	1059	1107	627	28	1563	nej
10	2026-08-17	17:29	gzip	soegning	desktop	99	100	906	0.026	0	289	392	1404	41	1799	ja
10	2026-08-17	17:30	gzip	annonce-1021	mobil	95	100	2932	0.001	56	1059	1093	290	21	497	nej
10	2026-08-17	17:31	gzip	annonce-1021	desktop	100	100	633	0.008	0	291	371	290	21	497	ja
10	2026-08-17	17:32	gzip	forhandler-mc	mobil	97	100	2664	0.000	0	1059	1059	272	18	139	nej
10	2026-08-17	17:32	gzip	forhandler-mc	desktop	100	100	575	0.007	0	288	312	272	18	139	ja
10	2026-08-17	17:33	gzip	maerker	mobil	99	100	1959	0.000	0	1065	1065	186	12	192	ja
10	2026-08-17	17:34	gzip	maerker	desktop	100	100	434	0.007	0	289	289	186	12	192	ja
10	2026-08-17	17:35	gzip	opret-login	mobil	90	100	3596	0.000	4	1258	1258	406	45	222	nej
10	2026-08-17	17:35	gzip	opret-login	desktop	100	100	772	0.006	0	344	344	406	45	222	ja
10	2026-08-17	17:36	gzip	sikkerhed	mobil	99	100	1961	0.000	0	1061	1061	186	12	215	ja
10	2026-08-17	17:36	gzip	sikkerhed	desktop	100	100	437	0.031	0	290	290	186	12	215	ja
10	2026-08-17	17:37	gzip	annonce-tom	mobil	95	100	2934	0.000	0	1059	1060	290	21	192	nej
10	2026-08-17	17:38	gzip	annonce-tom	desktop	100	100	628	0.007	0	291	291	290	21	192	ja
10	2026-08-17	17:38	gzip	forhandler-tom	mobil	97	100	2685	0.000	0	1057	1057	272	18	139	nej
10	2026-08-17	17:39	gzip	forhandler-tom	desktop	100	100	581	0.007	0	289	319	272	18	139	ja
11	2026-08-18	20:12	gzip	soegning	mobil	86	100	4201	0.000	0	1060	1060	637	27	1442	nej
11	2026-08-18	20:14	gzip	forside	mobil	93	100	3186	0.000	0	1059	1188	455	32	1072	nej
11	2026-08-18	20:16	gzip	annonce-1021	mobil	95	100	2924	0.001	24	1059	1059	299	20	496	nej
11	2026-08-18	20:18	gzip	soegning	desktop	100	100	870	0.023	0	290	337	1413	40	1678	ja
11	2026-08-18	20:19	gzip	forside	desktop	99	100	734	0.056	0	290	420	790	36	1072	ja
11	2026-08-18	20:20	gzip	annonce-1021	desktop	100	100	660	0.008	0	291	391	299	20	496	ja
11	2026-08-18	21:38	gzip-min	soegning	mobil	92	100	3433	0.000	0	911	911	537	27	1442	nej
11	2026-08-18	21:41	gzip-min	forside	mobil	96	100	2784	0.000	0	912	1089	375	32	1072	nej
11	2026-08-18	21:44	gzip-min	annonce-1021	mobil	97	100	2577	0.001	23	913	913	213	20	496	nej
11	2026-08-18	21:46	gzip-min	soegning	desktop	100	100	790	0.023	0	249	326	1314	40	1678	ja
11	2026-08-18	21:47	gzip-min	forside	desktop	99	100	673	0.056	0	253	413	709	36	1072	ja
11	2026-08-18	21:48	gzip-min	annonce-1021	desktop	100	100	571	0.008	0	251	293	213	20	496	ja
```

Runde 10-rækkerne er **medianer** pr. celle (3 mobilkørsler, 2 desktopkørsler).
Alle 45 enkeltkørsler ligger i `scratchpad/runde-10.tsv`, spredningen står i tabellen
under "Runde 10". Runde 7, 8 og 9 blev kørt af forgængere i samme session og ligger
som rå TSV i scratchpad (`runde-7.tsv`, `runde-8.tsv`, `runde-9.tsv`); de er **ikke**
optaget i blokken her, fordi jeg ikke kan stå inde for deres maskintilstand.
Runde 9 er den nærmeste forgænger-baseline og har samme syv URL'er — dens medianer
er stillet op mod runde 10 nedenfor.

### Gulvet pr. side — runde 4 (produktionslignende)

| Side | Bredde | Ydelse (≥95) | A11y (=100) | LCP (≤2500) | CLS (≤0,10) | TBT (≤200) | **Består** |
|---|---|---|---|---|---|---|---|
| `/` | mobil | 85 ✗ | 100 ✓ | 3960 ✗ | 0,000 ✓ | 0 ✓ | **NEJ** |
| `/` | desktop | 78 ✗ | 100 ✓ | 2683 ✗ | 0,056 ✓ | 0 ✓ | **NEJ** |
| `/soegning.html` | mobil | 75 ✗ | 100 ✓ | 5860 ✗ | 0,002 ✓ | 0 ✓ | **NEJ** |
| `/soegning.html` | desktop | 73 ✗ | **97 ✗** | 3121 ✗ | 0,015 ✓ | 0 ✓ | **NEJ** |
| `/annonce.html?id=1007` (rigtig) | mobil | 87 ✗ | 100 ✓ | 3762 ✗ | 0,000 ✓ | 20 ✓ | **NEJ** |
| `/annonce.html?id=1007` (rigtig) | desktop | 78 ✗ | 100 ✓ | 2855 ✗ | 0,007 ✓ | 0 ✓ | **NEJ** |
| `/annonce.html?id=1` (tom) | mobil | 77 ✗ | 100 ✓ | 3718 ✗ | **0,205 ✗** | 0 ✓ | **NEJ** |
| `/annonce.html?id=1` (tom) | desktop | 67 ✗ | 100 ✓ | 2566 ✗ | **0,260 ✗** | 0 ✓ | **NEJ** |
| `/forhandler.html` (tom) | mobil | 71 ✗ | 100 ✓ | 3835 ✗ | **0,294 ✗** | 0 ✓ | **NEJ** |
| `/forhandler.html` (tom) | desktop | 70 ✗ | 100 ✓ | 2585 ✗ | **0,206 ✗** | 0 ✓ | **NEJ** |
| `/maerker.html` | mobil | 87 ✗ | 100 ✓ | 3707 ✗ | 0,000 ✓ | 0 ✓ | **NEJ** |
| `/maerker.html` | desktop | 83 ✗ | 100 ✓ | 2238 ✓ | 0,007 ✓ | 0 ✓ | **NEJ** |
| `/opret-annonce.html` → login | mobil | 71 ✗ | 100 ✓ | 6212 ✗ | 0,000 ✓ | 0 ✓ | **NEJ** |
| `/opret-annonce.html` → login | desktop | 66 ✗ | 100 ✓ | 4112 ✗ | 0,006 ✓ | 0 ✓ | **NEJ** |
| `/sikkerhed.html` | mobil | 88 ✗ | 100 ✓ | 3542 ✗ | 0,000 ✓ | 0 ✓ | **NEJ** |
| `/sikkerhed.html` | desktop | 83 ✗ | 100 ✓ | 2214 ✓ | 0,035 ✓ | 0 ✓ | **NEJ** |

**0 af 16 består. Ingen mobil-LCP er grøn.** TBT er grøn overalt (0–28 ms) — hovedtråden
er ikke problemet. Problemet er, hvornår den første byte må males.

---

## Runde 5 og 6 — BUILDER "ydelse", 16.08.2026

Runde 5 er en frisk baseline umiddelbart før rettelserne, runde 6 de samme syv
URL'er efter dem. Samme harness, 21 minutter fra hinanden, ingen commit imellem.
Server: en nyskrevet `gzserver.js` med samme opførsel som målerens (gzip på
html/css/js/svg, `Cache-Control: max-age=600`, `Server: GitHub.com`), port 60999.
Lighthouse 12.8.2, Chrome headless, én kørsel pr. celle. `git rev-parse --short
HEAD` = `e18b487` — alt er uncommittede ændringer oven på den, ligesom runde 1–4.

### Læs de absolutte tal med forbehold — harnessen er ikke målerens

| | Måler, runde 4 | Builder, runde 5–6 |
|---|---|---|
| TTFB, mobil | ~450 ms | ~455 ms |
| **FCP, mobil, `sikkerhed.html`** | **2.153 ms** | **906 ms** |

Samme TTFB, under det halve FCP. Forskellen kommer ikke fra rettelserne:
`soegning.html`, som jeg ikke har rørt én byte i, går også fra FCP 2.620 (runde 4)
til 1.057 (runde 5). Det er maskinen — målerens runde 4 kørte med en Chrome-fane og
flere agenter på samme CPU. **Sammenlign derfor kun runde 5 mod runde 6.** De
absolutte tal her er systematisk mildere end målerens, og et "ja" i gulv-kolonnen
betyder "består på denne maskine", ikke "består på målerens".

Støjen skal med i vurderingen: forsiden mobil blev målt til **89 / LCP 3.825** i
runde 6 og **93 / LCP 3.162** femten minutter senere på en identisk filkopi. Det er
±4 point og ±660 ms mellem to kørsler uden nogen ændring. Forskelle under det
betyder ingenting. CLS, a11y og overført vægt er derimod stabile — dem kan man
læse direkte.

### Gulvet pr. side — runde 5 → runde 6

| Side | Bredde | Ydelse | A11y | LCP | CLS | Består |
|---|---|---|---|---|---|---|
| `/` | mobil | 88 → 89 | 100 | 3968 → 3825 | 0,000 | nej → nej |
| `/` | desktop | 99 → 99 | 100 | 837 → 887 | 0,056 | ja → ja |
| `/soegning.html` | mobil | 88 → 88 | 100 | 3996 → 3980 | 0,002 | nej → nej |
| `/soegning.html` | desktop | 99 → 98 | **97 → 100** | 970 → 1064 | 0,015 | **nej → JA** |
| `/annonce.html?id=1007` | mobil | 96 → 92 | 100 | 2704 → 3349 | 0,000 | nej → nej |
| `/annonce.html?id=1007` | desktop | 100 → 100 | 100 | 815 → 812 | 0,007 | ja → ja |
| `/annonce.html?id=1` (tom) | mobil | **87 → 96** | 100 | 2706 → 2708 | **0,205 → 0,000** | nej → nej (LCP 208 ms over) |
| `/annonce.html?id=1` (tom) | desktop | **87 → 100** | 100 | 604 → 632 | **0,260 → 0,007** | **nej → JA** |
| `/forhandler.html` (tom) | mobil | **82 → 96** | 100 | 2658 → 2716 | **0,294 → 0,000** | nej → nej (LCP 216 ms over) |
| `/forhandler.html` (tom) | desktop | **85 → 100** | 100 | 623 → 624 | **0,294 → 0,007** | **nej → JA** |
| `/maerker.html` | mobil | **97 → 100** | 100 | **2582 → 1885** | 0,000 | **nej → JA** |
| `/maerker.html` | desktop | 100 → 100 | 100 | 605 → 428 | 0,007 | ja → ja |
| `/opret-annonce.html` → login | mobil | 86 → 85 | 100 | 4195 → 4392 | 0,000 | nej → nej |
| `/opret-annonce.html` → login | desktop | 98 → 98 | 100 | 1095 → 1061 | 0,006 | ja → ja |
| `/sikkerhed.html` | mobil | **98 → 100** | 100 | **2359 → 1881** | 0,000 | ja → ja |
| `/sikkerhed.html` | desktop | 100 → 100 | 100 | 543 → 430 | 0,035 | ja → ja |

**6 af 16 → 10 af 16.** De fire nye er søgesiden desktop (a11y), begge tomme
tilstande desktop (CLS) og mærkeoversigten mobil (vægt).

`annonce-1007` mobil faldt fra 96 til 92, men dens DOM gik samtidig fra 751 til 593
elementer: en anden builder skrev i `js/annonce.js` mellem de to runder. De to
kørsler måler ikke samme side, og tallet skal ikke tilskrives noget her.

**Alle seks resterende fejl er mobil-LCP.** A11y er 100 på alle 16, CLS er grøn på
alle 16, TBT er 0–30 ms på alle 16. Hovedtråden og layoutet er færdige emner.

### Hvad rettelserne var værd, målt

| Hul | Rettelse | Før → efter |
|---|---|---|
| `.chip .facet-n{opacity:.7}` — 3,04:1 på 21 noder | `opacity` slettet; tallet dæmpes af `--color-fg-muted` (5,22:1) alene | a11y **97 → 100** på `soegning.html` desktop. Sitets eneste a11y-fejl er lukket. |
| CLS på de fire tomme tilstande | `main#main-content{min-height:calc(100vh - var(--header-h))}` i den kritiske CSS | annonce-tom **0,205/0,260 → 0,000/0,007**; forhandler-tom **0,294/0,294 → 0,000/0,007**. Ydelse +9 til +15 point på de fire celler. |
| Supabase-stakken på sider uden data | supabase-js, config, api, backend-bridge, postnumre + boot-prefetch + to preconnects ud af `sikkerhed.html` og `maerker.html` | maerker **241 → 167 KB, 19 → 12 requests, LCP 2582 → 1885**; sikkerhed **240 → 167 KB, 17 → 12, LCP 2359 → 1881**. Begge sider er nu 100/100 i begge bredder. |
| Otte kategorifliser à 760×570 vist i 182×137 | skaleret til 456×342, webp q80 | **270.350 → 115.592 B.** Forsiden **571 → 425 KB**; opret/login **590 → 441 KB**. |
| `logo-mark.png`, 96×96 med 991 farver | reencodet med 64-farvers palet, samme 96×96 | **8.396 → 4.292 B**, på alle 14 sider. |
| `js/postnumre.js` på sider uden felter | ud af `login.html`, `forhandler.html`, mærkeskabelonen (og de to ovenfor) | 7.482 B gzip og én request færre pr. side. |

### Hvorfor mobil-LCP ikke fulgte med — fire forsøg med tal på

Sidens vægt forklarer det meste af den simulerede mobil-LCP. Lanterns pessimistiske
LCP-graf behandler alle netværksnoder, der er startet før den observerede LCP, som
render-blokerende, og på en localhost-server er den observerede LCP ~122 ms — altså
tæller praktisk talt hele siden. Målt på tværs af runde 6:

```
maerker      167 KB → LCP 1885
forhandler   277 KB → LCP 2716
annonce-tom  297 KB → LCP 2708
forside      425 KB → LCP 3825
```

≈ 158 KB pr. sekund LCP. Men vægten er ikke hele historien — det viste fire
kontrollerede forsøg. Fire komplette kopier af arbejdstræet, fire gzip-servere
(port 61001–61004), samme Lighthouse, kørt lige efter hinanden:

| Variant | Forside: perf / LCP / FCP | annonce-tom: perf / LCP / FCP |
|---|---|---|
| **A** kontrol | 93 / 3162 / 1058 | 96 / 2728 / 1061 |
| **B** `css/styles.css` minificeret (−25 KB) | 90 / 3678 / **911** | 96 / 2715 / **910** |
| **C** font-preloads fjernet | 85 / 3896 / **1509** | 96 / 2695 / **1509** |
| **D** supabase-js flyttet til egen origin | 89 / 3852 / 1058 | **97 / 2586** / 1062 |

Tre ting kan læses ud af det, og de er ikke alle sammen dem, man ville gætte:

1. **Fontenes preload SKAL blive.** Rapportens hul 1 pegede på, at de to fonte
   ligger på High foran css'en, og at `font-display:swap` betyder, at de ikke
   behøvede komme først. Efterprøvet: fjerner man de to `<link rel=preload>`,
   stiger FCP fra 1.058 til **1.509 ms** — et fast tab på 451 ms i begge sider,
   ikke støj. Uden preload opdages fontene først, når layoutet beder om dem, og de
   skubber alt bagefter. **Ikke rørt. Hypotesen er afvist med et tal.**
2. **CSS-minificering er 148 ms FCP, men næsten ingen LCP.** −25 KB på VeryHigh
   giver FCP 1.058 → 911 på begge sider (stabilt), men LCP flytter sig 13 ms.
   FCP vejer 10 % af ydelsestallet, LCP 25 %. Den er værd at tage, men den flytter
   ikke en celle over gulvet alene.
3. **supabase-js på egen origin er 142 ms LCP.** 2.728 → 2.586 på annonce-tom, og
   perf 96 → 97. Det er den enkeltrettelse, der er tættest på at flytte de to tomme
   tilstande over 2.500 ms-grænsen. Gevinsten er ikke bytes (bundtet er lige stort)
   — det er en DNS-opslag og et TLS-håndtryk til en fremmed vært, der forsvinder.

Forsidens tal i tabellen skal man IKKE læse: den svinger 93 → 90 → 85 → 89 på
varianter, der gør den mindre eller lige stor. Forsidens LCP-støj er større end
alle fire effekter tilsammen.

### Hvad der står tilbage, med tal, til den næste

Tre poster ligger på hver eneste side og udgør tilsammen **169 KB**, før siden har
vist ét eget byte:

| Post | Overført | Prioritet | Findes på |
|---|---|---|---|
| `css/styles.css` | **45.459 B** | VeryHigh | 14 af 14 |
| `ibmplexsans.woff2` + `spacegrotesk.woff2` | **68.400 B** | High | 14 af 14 |
| `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | **55.119 B** | Low | 12 af 14 |

Ingen af de tre kunne lukkes inden for dette stykkes mandat. Her er, hvad der skal
til, og hvad det koster:

1. **`css/styles.css` bærer ~60 KB dansk prosa ud til hver besøgende.**
   Rå 180.804 B → gzip 45.459 B. Uden kommentarer: gzip 22.166 B. Minificeret:
   gzip **20.480 B**. Det er 25 KB sparet på hver sideindlæsning, målt til 148 ms
   FCP (forsøg B). Prisen er en byggeafhængighed: `css/styles.css` skal blive
   kilden med kommentarerne, og siderne skal pege på et genereret
   `css/styles.min.css`. **Det kræver samtidig en rettelse i
   `scripts/inline-critical.js`,** hvis fire regex'er matcher `css/styles.css`
   bogstaveligt — peger man siderne på et nyt filnavn uden at rette dem, springer
   scriptet ALLE sider over uden at fejle. Ikke gjort her, fordi fire buildere
   redigerer `css/styles.css` lige nu: en genereret leveringsfil betyder, at deres
   ændringer ikke er live før næste byg. Det hører til en runde, hvor kun én
   arbejder i filen.
2. **supabase-js bør ligge på egen origin.** Målt gevinst: 142 ms LCP (forsøg D).
   Sidegevinst: `https://cdn.jsdelivr.net` kan ryge helt ud af `script-src` i
   CSP'en på alle 14 sider. Ikke gjort her: at hente og indchecke et 212 KB
   minificeret tredjepartsbundt er ikke en beslutning, et ydelsesstykke træffer
   alene. Bundtet svarer til `@supabase/supabase-js@^2.112.3`, som allerede står i
   `package.json`.
3. **Fontene kan næsten ikke skæres mere.** Efterprøvet med `fontTools`: begge
   filer er allerede subsat til deres `unicode-range` (232 og 230 kodepunkter).
   Beholder man alle OpenType-features, sparer en ny subsetting **3.784 B i alt**.
   Skærer man ned til pyftsubsets standardsæt bliver det 45.712 → 37.292 og
   22.288 → 19.076, altså 11.632 B — men det koster `tnum`
   (`font-variant-numeric: tabular-nums` bruges fem steder i `css/styles.css`)
   plus `onum`, `frac` og `sups`. Helt uden features: 68.000 → 41.732 B, og så er
   kerning og ligaturer væk. **11 KB er ikke en typografi værd.**

Fundet undervejs, uden for dette stykkes filer:

- **`/annonce.html` og `/forhandler.html` henter 500 eksterne annoncer.**
  `backendReady()` i `js/backend-bridge.js` kalder `loadExternalListings()`
  ubetinget. Målt: **27.621 B, High prioritet, cross-origin**, på en enkelt
  annonceside og på en sælgerprofil, hvor ingen af dem vises. Det er 81 % af de
  34 KB, `/annonce.html?id=1` mangler for at komme under 2.500 ms.
- **`js/home.js` tegner fliserne uden `srcset`**, med `width="760" height="570"`.
  Forholdet 4:3 er uændret efter skaleringen, så pladsreservationen er stadig
  rigtig, men tallene bør rettes til 456/342, og fliserne bør have
  `srcset="… 320w, … 456w, … 760w"`. Med srcset kan de blive skarpe på en
  DPR-3-telefon uden at koste desktop båndbredde; med én fil kan de ikke.
  Heroen har allerede srcset (800/960/1600/2560).
- **`/opret-annonce.html` redirigerer stadig** (hul 5). Målingen dækker to
  dokumenter og 49 requests, og `redirects`-auditten alene er ~4,4 s simuleret.
  Perf 85 mobil er sitets laveste tal, og hele forskellen er omdirigeringen.
- **`soegning.html` er ikke rørt** — en anden agent arbejdede i filen. Dens
  a11y-fejl er lukket fra `css/styles.css`, men dens kritiske blok er IKKE
  genbygget, så `main#main-content{min-height:…}` når den først med det asynkrone
  ark. Søgesiden har CLS 0,002 og har ikke brug for reglen tidligt, men **kør
  `node scripts/inline-critical.js` på den, næste gang filen er fri.**

---

## Runde 10 — MÅLER, 17.08.2026: A/B'en er færdig, og gulvet er målt igen

### Sådan er der målt

| | |
|---|---|
| Værktøj | Lighthouse 12.8.2 CLI (`npx lighthouse --output=json`), Node v22.14.0 |
| Browser | Chrome headless (`--headless=new --no-sandbox --disable-gpu`) |
| Mobil | Lighthouse standardpreset: Moto G Power, 4x CPU-throttling, langsom 4G (Lantern) |
| Desktop | `--preset=desktop` |
| Server | `scratchpad/gzserver.js` — gzip på html/css/js/svg, `Cache-Control: max-age=600`, `Server: GitHub.com`. Verificeret: `css/styles.css` udleveres i **49.407 B** gzip mod 196.276 B rå |
| **Målt på** | **commit `4a33b41`, udpakket med `git archive HEAD`** — ikke arbejdstræet |
| Klokkeslæt | A/B 17:12–17:26, gulvet 17:26–17:39 |
| Gentagelser | A/B: 6 par pr. side på to sider, 4 par på to sider. Gulv: 3 mobil + 2 desktop pr. celle, 45 kørsler |
| Kildefiler rørt | **ingen.** Variant D findes kun i en kopi under scratchpad |

**Dette er den første runde, der er målt på en fast commit.** Runde 1–9 målte alle
uncommittede ændringer, mens andre agenter skrev i filerne — derfor advarslen øverst
om, at runde 2, 3 og 4 er tre forskellige sider. Jeg pakkede `4a33b41` ud to gange med
`git archive` og satte de to arme op på hver sin kopi. **De to arme er derfor
byte-identiske bortset fra variant D.** Mens jeg målte, ændrede andre agenter
`js/data.js`, `js/backend-bridge.js`, `js/supabase-api.js`, `js/opret-annonce.js` og
`opret-annonce.html` i arbejdstræet. Det påvirker ikke tallene her, men det betyder,
at **runde 10 beskriver `4a33b41`, ikke arbejdstræet i dag.**

### 1. A/B: supabase-js på egen origin — de 142 ms holder ikke

**Opsætning.** To komplette kopier af `4a33b41`, to gzip-servere, kørt FLETTET
(A, D, A, D, … umiddelbart efter hinanden pr. side), så maskintilstanden er den samme
for begge arme. Kun mobil — desktop består i forvejen overalt.

- **Arm A (kontrol):** `<script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">`, port 61030. Lighthouse henter faktisk fra det rigtige jsDelivr over det rigtige net.
- **Arm D:** samme bundt fra egen origin, `/js/vendor/supabase-js.js`, port 61031. 10 scripttags, 11 `preconnect` og 12 CSP-poster ændret; `cdn.jsdelivr.net` nævnes ikke længere i én eneste HTML-fil.

**Virker D funktionelt? Ja, efterprøvet igen på den friske kopi:** `/soegning.html`
viser **383 annoncer** og 24 kort i begge arme, `window.supabase.createClient` findes
i begge, **nul `pageerror`** i begge, og netværkslisten bekræfter, at A hentede fra
`cdn.jsdelivr.net` og D fra egen origin.

**Resultatet, 20 flettede par:**

| Side | par | A LCP median | D LCP median | A spredning | D spredning | parvis A−D | sd | t | D bedst i |
|---|---|---|---|---|---|---|---|---|---|
| `annonce.html?id=1021` | 6 | 2.931 | **2.714** | 181 ms | 340 ms | **+161 ms** | 208 | 1,9 | 4/6 |
| `forhandler.html?id=Motorcykel Centret ApS` | 6 | 2.621 | 2.609 | 123 ms | 97 ms | +11 ms | 60 | 0,4 | 4/6 |
| `soegning.html` | 4 | 4.165 | 4.164 | 10 ms | 160 ms | +25 ms | 72 | 0,7 | 2/4 |
| `/` (forside) | 4 | 3.199 | 3.515 | 935 ms | 487 ms | **−261 ms** | 583 | −0,9 | 1/4 |
| **alle 20 par** | **20** | — | — | — | — | **+4,3 ms** | **299** | **0,1** | **11/20** |

**Dommen: de 142 ms er afvist som en generel effekt.** Den reproducerer på ÉN side —
`annonce.html?id=1021`, hvor 161 ms parvist ligner runde 6's 142 ms ret præcist — men
selv der er t = 1,9 (p ≈ 0,11 med 5 frihedsgrader), altså ikke til at skelne fra støj,
fordi D's egen spredning på den side er 340 ms. På forhandlersiden er gevinsten 11 ms.
På forsiden er D **dårligere** med 261 ms. Samlet over alle 20 par: **4,3 ms med en
spredning på 299 ms.** Det er nul.

**Hvorfor runde 6 kunne måle 142 ms og jeg ikke kan.** Runde 6 målte ét par på én
side. De 142 ms er ikke en observeret tid — det er et output fra Lanterns
simuleringsmodel. Målt observeret i runde 10 tog jsDelivr-hentningen **87 ms**
(`networkRequestTime` 29,2 → `networkEndTime` 116,4, h2, `entity: JSDelivr CDN`).
Lantern lægger en fast ekstra rundtur på for en ny origin, men **om den ekstra rundtur
lander på LCP-grafens kritiske sti afhænger af, hvilken knude der tilfældigvis er
flaskehals i netop den kørsel.** Derfor dukker effekten op på annoncesiden og
forsvinder alle andre steder. Bytes flytter sig ikke: A overfører 55.119 B, D 54.676 B
— 443 B forskel, og sidens samlede vægt er den samme (290 mod 289 KB).

Bemærk også, at A's egne bytes svinger: jsDelivr leverede 55.119, 55.437 og 55.441 B
i tre kørsler af samme side. Det er rigtigt nok — sådan opfører en fremmed CDN sig
også i produktionen — men det er variation, egen origin ikke har.

### Hvad det KOSTER at checke bundtet ind — for det er en beslutning, ikke en detalje

**Bundtet er verificeret identisk med det, CDN'en serverer i dag.**
`cdn.jsdelivr.net/npm/@supabase/supabase-js@2` svarer `X-JSD-Version: 2.112.3` og
212.199 B; `node_modules/@supabase/supabase-js/dist/umd/supabase.js` er 211.907 B, og
de 292 B forskel er jsDelivrs egen bannerkommentar. Koden er byte for byte den samme,
og `package.json` står i forvejen på `^2.112.3`. Der er altså ingen tvivl om, hvad der
skulle checkes ind.

| Pris | Tal |
|---|---|
| **Repostørrelse** | +211.907 B rå på et arbejdstræ, der uden `node_modules`/`.git` er **23 MB** — altså **+0,9 %**. Til sammenligning er `logo.png` alene 1.025.234 B, fem gange bundtet. **Størrelsen er ikke argumentet imod.** |
| **Git-historik** | Bundtet er minificeret på én linje. Hver opdatering skriver et helt nyt 212 KB blob, som ikke kan delta-komprimeres mod det gamle. Ti opdateringer = ~2 MB permanent i historikken. |
| **Opdateringer** | `@2` følger i dag automatisk seneste 2.x. Med egen origin fryser versionen, til nogen kopierer filen igen. Det skal være et `npm`-script, ikke en hukommelsessag, ellers står vi med en gammel auth-klient uden at nogen har besluttet det. |
| **CSP** | `https://cdn.jsdelivr.net` kan ryge ud af `script-src` i **13 HTML-filer** + de to generatorer `scripts/build-brand-pages.js` og `scripts/build-listing-pages.js` (dem må man ikke glemme — `maerker.html` og annoncesiderne GENERERES). Tilbage står `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`. **Bemærk: `'unsafe-inline'` bliver der. Gevinsten er, at én fremmed vært ikke længere må udføre kode hos os — ikke at CSP'en bliver stram.** |
| **SRI** | Det her er den stærkeste grund, og den handler ikke om hastighed. jsDelivr skriver selv i filens hoved: *"Do NOT use SRI with dynamically generated files"*. Vi henter altså i dag 212 KB eksekverbar tredjepartskode fra en flydende `@2`-adresse **uden integritetshash og uden fastlåst version**. Med egen origin kan filen versionsmærkes og hashes. |
| **Modsat vej** | En fremmed origin giver også en ekstra parallel forbindelse, og bundtet ligger på `Low` prioritet — den kø, det ikke haster med. Preconnecten dækker DNS+TLS i en rigtig browser. Derfor er der ingen hastighedsgevinst at hente, og det passer med tallene ovenfor. |

### 2. Gulvet, runde 10 — 9 af 14 på opgavens syv URL'er

Medianer af 3 mobilkørsler / 2 desktopkørsler. Spredningen er den fulde
min–maks over kørslerne, så man kan se, hvad et enkelt tal er værd.

| Side | Bredde | Ydelse (≥95) | A11y (=100) | LCP (≤2500) | CLS (≤0,10) | TBT (≤200) | LCP-spredning | **Består** |
|---|---|---|---|---|---|---|---|---|
| `/` | mobil | 90 ✗ | 100 ✓ | 3.691 ✗ | 0,000 ✓ | 0 ✓ | 3.320–3.717 | **NEJ** |
| `/` | desktop | 99 ✓ | 100 ✓ | 883 ✓ | 0,056 ✓ | 0 ✓ | 826–939 | **JA** |
| `/soegning.html` | mobil | 86 ✗ | 100 ✓ | 4.162 ✗ | 0,000 ✓ | 2 ✓ | 4.115–4.191 | **NEJ** |
| `/soegning.html` | desktop | 99 ✓ | 100 ✓ | 906 ✓ | 0,026 ✓ | 0 ✓ | 896–916 | **JA** |
| `/annonce.html?id=1021` | mobil | 95 ✓ | 100 ✓ | 2.932 ✗ | 0,001 ✓ | 56 ✓ | 2.905–2.998 | **NEJ** |
| `/annonce.html?id=1021` | desktop | 100 ✓ | 100 ✓ | 633 ✓ | 0,008 ✓ | 0 ✓ | 632–633 | **JA** |
| `/forhandler.html?id=Motorcykel Centret ApS` | mobil | 97 ✓ | 100 ✓ | **2.664 ✗** | 0,000 ✓ | 0 ✓ | 2.617–2.673 | **NEJ** |
| `/forhandler.html?id=…` | desktop | 100 ✓ | 100 ✓ | 575 ✓ | 0,007 ✓ | 0 ✓ | 572–578 | **JA** |
| `/maerker.html` | mobil | 99 ✓ | 100 ✓ | 1.959 ✓ | 0,000 ✓ | 0 ✓ | 1.958–1.965 | **JA** |
| `/maerker.html` | desktop | 100 ✓ | 100 ✓ | 434 ✓ | 0,007 ✓ | 0 ✓ | 433–435 | **JA** |
| `/opret-annonce.html` → login | mobil | 90 ✗ | 100 ✓ | 3.596 ✗ | 0,000 ✓ | 4 ✓ | 3.567–3.699 | **NEJ** |
| `/opret-annonce.html` → login | desktop | 100 ✓ | 100 ✓ | 772 ✓ | 0,006 ✓ | 0 ✓ | 763–780 | **JA** |
| `/sikkerhed.html` | mobil | 99 ✓ | 100 ✓ | 1.961 ✓ | 0,000 ✓ | 0 ✓ | 1.959–1.963 | **JA** |
| `/sikkerhed.html` | desktop | 100 ✓ | 100 ✓ | 437 ✓ | 0,031 ✓ | 0 ✓ | 435–439 | **JA** |

**9 af 14.** De to tomme tilstande er målt med, så tallet kan holdes op mod de
historiske 16:

| Side | Bredde | Ydelse | LCP | Består |
|---|---|---|---|---|
| `/annonce.html?id=1` (tom) | mobil | 95 | 2.934 ✗ | NEJ (434 ms over) |
| `/annonce.html?id=1` (tom) | desktop | 100 | 628 | JA |
| `/forhandler.html` (tom) | mobil | 97 | 2.685 ✗ | NEJ (185 ms over) |
| `/forhandler.html` (tom) | desktop | 100 | 581 | JA |

**11 af 18 i alt. På det historiske 16-sæt (samme otte sider som runde 6): 10 af 16 —
uændret fra runde 6.** Ingen celle er skiftet retning. Men tallene under dem er
flyttet: `annonce-tom` mobil gik fra LCP 2.708 til 2.934 og `forhandler-tom` fra
2.716 til 2.685, mens ALLE sider blev 7–8 KB tungere end i forgængerens runde 9
(forside 441 → 448 KB, søgning 620 → 627, annonce 283 → 290, mærker 178 → 186).
**Det er den samme vægt på hver side, altså en fælles fil.** `css/styles.css`
udleveres nu i **49.644 B** gzip mod 45.459 B i runde 6 og 41.363 B i runde 4.
Den vokser stille, og den er den eneste post på `VeryHigh`.

Alle 18 celler: **a11y 100** (ingen `color-contrast`-fejl nogen steder — runde 6's
rettelse holder), **CLS grøn** (maks. 0,063 på opret/login mobil), **TBT grøn** på
alle medianer. Én enkeltkørsel stikker ud: `annonce-tom` mobil kørsel 1 gav TBT 318 ms
og ydelse 87, mens kørsel 2 og 3 gav 0 ms og 95. Det er harness-støj, ikke siden —
derfor står medianen i blokken.

### 3. De tre dyreste resterende huller

Rangeret efter hvor mange millisekunder en celle mangler for at nå gulvet.

#### Hul A — `/soegning.html` mobil: LCP-elementet er et fremmed foto, der opdages 2.656 ms for sent

Sidens dyreste celle, **1.662 ms over grænsen**, og den eneste, hvor LCP ikke er tekst.
LCP-faserne siger det hele:

```
TTFB          455 ms
Load Delay  2.656 ms   ← billedet findes ikke i HTML'en
Load Time   1.010 ms   ← 59.732 B JPEG fra images.danbase.dk
Render Delay   70 ms
```

LCP-elementet er `<img src="https://images.danbase.dk/…/Honda_CB_1000_0_2.jpg">`.
De fem tungeste poster på siden er alle fremmede JPEG'er (55.872–65.209 B), og
`modern-image-formats` alene peger på 119.232 B. **De 3.666 ms er ikke vægt vi kan
komprimere — de er en opdagelseskæde:** HTML → CSS+JS → JS henter data → JS skriver
`<img>` → browseren opdager fotoet. Ingen `preload` kan komme foran det, fordi
adressen først findes, når dataene er hjemme. Enten skal det første korts foto ligge
i HTML'en (eller en `preload`, serveren kan gætte), eller det første kort skal ikke
have foto. Vægten er 627 KB, hvoraf ~355 KB er `images.danbase.dk`. Vi kan ikke
konvertere deres JPEG'er — vi kan vælge, hvad der står øverst.

#### Hul B — `css/styles.css`, 49.644 B på `VeryHigh` på alle 14 sider, hvoraf 44–47 KB er ubrugt

På de fem tekst-LCP-sider er **hele LCP'en TTFB + Render Delay**, med Load Delay 0 og
Load Time 0. Målt (mobil, runde 10):

```
forside        Render Delay 3.238 ms af LCP 3.691
opret/login    Render Delay 3.142 ms af LCP 3.596
annonce-tom    Render Delay 2.572 ms af LCP 3.027
annonce-1021   Render Delay 2.451 ms af LCP 2.905
forhandler-tom Render Delay 2.231 ms af LCP 2.685
forhandler-mc  Render Delay 2.210 ms af LCP 2.664
maerker        Render Delay 1.507 ms af LCP 1.965
sikkerhed      Render Delay 1.505 ms af LCP 1.959
```

Der er intet at hente på hovedtråden — TBT er 0 på seks af de otte. Det er kø.
`unused-css-rules` måler **44.009–47.271 B ubrugt på hver enkelt side**, altså
90 % af filen. Runde 6's tal står stadig: minificeret ville den være gzip 20.480 B,
og forsøg B målte 148 ms FCP for de 25 KB. Prisen er uændret den, runde 6 beskrev
(et genereret `css/styles.min.css` plus de fire regex'er i
`scripts/inline-critical.js`, der matcher `css/styles.css` bogstaveligt) — men
**filen er nu 8,3 KB gzip større end da beslutningen blev udskudt**, så gevinsten
vokser, hver gang den udskydes igen.

#### Hul C — `/opret-annonce.html` omdirigerer stadig: 2.726 ms simuleret

`redirects`-auditten, mobil runde 10: **2.726 ms**. 45 requests over to dokumenter.
Ydelse 90 mobil, FCP 1.258 ms mod 1.058 ms på alle andre sider — de 200 ms ekstra
FCP er den ekstra rundtur, og de er den eneste side med det tal. Hullet er kendt fra
runde 4 (hul 5) og har ikke flyttet sig.

**Lige under de tre:** `js/data.js` overføres med **27.012 B** (75.649 B rå) på
`Low` på alle otte målte sider — også `maerker.html` og `sikkerhed.html`, som ikke
viser en annonce. Og forsiden henter nu **30.515 B fra
`hkcjrwglwurdjnobewzb.supabase.co/rest/v1/eksterne_annoncer` på `High` prioritet**,
altså i samme kø som heroen og fontene. På en side, hvis LCP er `<h1>`, er det
30 KB `High` foran første maling.

### Hvad jeg IKKE kan svare på

- **Lantern mod observeret.** LCP/FCP/SI er simulerede; `network-requests`-tiderne er observerede. Den ene tidslinje er ikke den anden — det er hele forklaringen på, hvorfor 142 ms kunne måles og ikke kan reproduceres.
- **Kontrolarmen hænger på det rigtige internet.** Arm A henter fra det rigtige jsDelivr. Det er realistisk, men det er også en støjkilde, jeg ikke styrer.
- **Ingen produktionsmåling.** Alt er localhost. Ingen rigtig latenstid til Supabase, ingen rigtig CDN-geografi.
- **`/opret-annonce.html` og `js/data.js` blev ændret af andre agenter, mens jeg målte.** Tallene for `opret-login` gælder `4a33b41`.
- **Søgesiden er målt i headless Lighthouse, ikke i en forreste fane.** Kortene tegnes to ad gangen via `setTimeout(0)`; Lighthouse holder siden aktiv, så timerne klemmes ikke, og DOM'en når 1.563 elementer i alle tre kørsler. Men den advarsel gælder stadig alle, der måler siden i en baggrundsfane eller iframe.

---

## Tilgængelighed — hvad Lighthouse fandt, og hvad jeg selv gik efter

Lighthouse giver 100 på 30 af 32 kombinationer. Den ene fejl er ægte:

**`/soegning.html` desktop, runde 3 og 4: `color-contrast` fejler på 21 noder → a11y 97.**
```
span.facet-n (antallet ved et filterchip, fx "15")
kontrast 3,04:1   #979390 på #ffffff   11 px normal vægt   kræver 4,5:1
årsag: css/styles.css:2616  .chip .facet-n{ opacity:.7 }
```
Rammer chippene under "Kørekort" og "Type" i filterpanelet. Findes ikke i runde 1–2 —
den kom ind med de facet-tal, der blev skrevet i `js/search.js` i dag. **Det alene
gør, at søgesiden ikke kan bestå gulvet, uanset hastighed.**

Lighthouse dækker ca. en tredjedel af WCAG. Jeg gik selv siderne igennem i browseren
ved 375×812 med et script, der tjekker kontrast, labels, landmarks, fokusrækkefølge,
alt-tekster, overskriftshierarki og klikmål:

| Side | Overskriftskæde | H1 | main | Skip-link | Felter uden label | Links/knapper uden navn | `img` uden `alt` |
|---|---|---|---|---|---|---|---|
| `/` | 1·2·2·3·3·3·2·2·2·3×8·2·3×4·2·3×3·2·3·3·3·2·2·2·2 | 1 | 1 | ja | 0 af 3 | 0 | 0 |
| `/soegning.html` | 1·2·3×24·2·2·2 | 1 | 1 | ja | 0 af 2 | 0 | 0 |
| `/annonce.html?id=1007` | 1·2·2·3·3·3·2·2·2 | 1 | 1 | ja | — | 0 | 0 |
| `/forhandler.html` | 1·2·2·2·2 | 1 | 1 | ja | — | 0 | 0 |
| `/maerker.html` | 1·2·2·2·2 | 1 | 1 | ja | — | 0 | 0 |
| `/login.html` (fra opret) | 1·2·2·2 | 1 | 1 | ja | 0 af 6 | 0 | 0 |
| `/sikkerhed.html` | 1·2·3·3·3·2·3·3·2·3·2·2·2·2·2 | 1 | 1 | ja | 0 af 5 | 0 | 0 |

**Ingen spring i overskriftshierarkiet. Præcis ét `<h1>` og ét `<main>` på hver side.
Alle felter har label. Alle links og knapper har et tilgængeligt navn. Alle `<img>`
har `alt`.** Skip-link `Gå til indhold → #main-content` findes på alle syv.
`:focus-visible{outline:2.5px solid var(--color-ring)}` gælder globalt.
`html lang="da"` overalt.

Det jeg fandt, som Lighthouse ikke rapporterer:

| Fund | Sider | Alvor |
|---|---|---|
| Dekorative inline-`<svg>` uden `aria-hidden="true"`: **136** på forsiden, **208** på søgesiden, **53** på annoncen | alle | Lav. Nogle skærmlæsere annoncerer dem som "grafik". Ikke en WCAG-fejl, men støj i oplæsningen. |
| Klikmål under 24 px: `privatlivspolitik` 89×17, `Forside` (brødkrumme) 43×20, `Naked` 37×20, `Læs gode råd` 98×20 | `/`, `/soegning.html`, `/annonce.html` | Lav-mellem. WCAG 2.2 AA 2.5.8 kræver 24×24 medmindre der er nok afstand. |
| Påkrævede felter uden `aria-required` på login: 5 af 6 | `/login.html` | Lav. `required` alene er nok for moderne skærmlæsere. |
| Fokusrækkefølge: 29 baglæns spring på forsiden, 31 på søgesiden | `/`, `/soegning.html` | **Falsk alarm.** Springene skyldes gitterlayout (kort ved siden af hinanden), ikke `order`- eller `tabindex`-rod. Ingen positiv `tabindex` nogen steder. |
| Kontrast: 0 beviselige fejl ud af 290 tekstnoder på forsiden, 259 på søgesiden, 109 på annoncen | alle | 16 + 3 noder ligger på foto eller bag et 65%-slør og er **sprunget over, ikke godkendt**. `.gallery-counter` "1 / 4" så ud til at fejle (1,17:1), men har sin egen `rgba(0,0,0,.65)` — komposit ≈ 9,9:1. Ren falsk alarm. |

---

## Det kendte problem: 51 egne annoncer uden foto

Spørgsmålet var: hvad gør de illustrerede SVG-pladsholdere ved LCP og ved sidens vægt?
Der findes et rigtigt tal, og det er ikke det, man ville gætte.

### Hvad en pladsholder koster (målt direkte i DOM'en, 14:33)

| | |
|---|---|
| Kort på `/soegning.html` side 1 | 24 |
| Heraf SVG-pladsholdere | **24 af 24 — nul fotos** |
| Inline-SVG-markup pr. kort | **2.920 B** |
| Inline-SVG-markup i alt | **70.069 B** |
| DOM-noder brugt på tegningerne | **944 af 2.443 — 39 % af hele sidens DOM** |
| Netværksbytes for billeder | **0** |
| Netværkspris for tegneren `js/bike-art.js` | 8.209 B rå / **2.377 B gzip** |
| Tid at parse alle 24 SVG'er fra streng | **2,20 ms** (× 4 CPU-strupning ≈ 9 ms) |
| Ekstra reflow-tid med SVG'erne kontra tomme kasser | **0,4 ms mod 0,4 ms — ikke måleligt** |

### Hvad fotos koster (målt A/B på samme side, samme server, 12 minutter fra hinanden)

Mens jeg målte, ændrede en anden agent standardresultatet fra "24 egne annoncer"
til "21 indekserede annoncer fra MC Syd + 3 egne". Det gav en A/B, jeg ikke selv
kunne have opstillet:

| `/soegning.html` mobil | 14:29 — **24 pladsholdere, 0 fotos** | 14:41 — **21 fotos, 3 pladsholdere** | Forskel |
|---|---|---|---|
| Overført | 625 KB | **995 KB** | **+370 KB (+59 %)** |
| Requests | 23 | 29 | +6 |
| Billed-bytes | ~0 | **362 KB** | +362 KB |
| DOM-elementer | 2.402 | 1.572 | −830 |
| LCP | 7.034 ms | **7.776 ms** | **+742 ms** |
| LCP-element | `<p>` i cookiebanneret | `img.card-photo` "Sym XS 125" | — |
| CLS | 0,004 | 0,004 | 0 |
| Ydelse | 68 | 67 | −1 |

Kun 6 af de 21 fotos blev overhovedet hentet — resten er `loading="lazy"`. De 6 vejede
55.863–65.209 B (målt: `curl` mod `images.danbase.dk` giver 59.045 og 61.652 B for to
tilfældige). **Havde alle 24 kort haft foto af den vægt, ville side 1 alene indeholde
ca. 1,45 MB billeder — 3,4 gange sidens nuværende vægt.**

### Svaret

**De manglende fotos koster os ikke hastighed. De sparer os for den.**

- Pladsholderne koster **~9 ms CPU** (strupet) og **2,4 KB gzip** for tegneren, og
  sparer **362 KB** hentede billeder på side 1.
- Prisen er **944 DOM-noder — 39 % af siden** — der findes for at tegne en motorcykel,
  vi ikke har et billede af. Det er ikke gratis i hukommelse og style-recalc, men det
  er heller ikke det, der holder siden under gulvet: reflow-forskellen er 0,0 ms og
  TBT er 0.
- Den ægte konsekvens er, hvad LCP-elementet **bliver**: uden fotos er det største
  malede element på søgesiden **et afsnit i cookiebanneret**. Der er intet billede
  stort nok til at vinde. Med fotos flytter LCP til det første kortfoto — og bliver
  742 ms langsommere, fordi fotoet først opdages, når JS har hentet data
  (runde 4 måler `Load Delay` på **4.502 ms** for netop det billede).

Forbehold: A/B'en er ikke et rent laboratorium. `js/search.js` og `css/styles.css`
blev ændret mellem de to kørsler, og kortlayoutet skiftede. Retningen og
størrelsesordenen holder — vægten er direkte målt, ikke estimeret — men ±100 ms på
LCP-tallet skal man ikke bygge en beslutning på.

---

## Hullerne, rangeret med tal på

Rangeret efter runde 4 (gzip, produktionslignende), mobil. Kun ting, der er målt på
dette site.

### 1. Skrifttyper + CSS + tredjeparts-JS spiser hele den kritiske sti — 3.092–3.510 ms Render Delay

Dette er hullet. Det er ikke ét fejl, det er tre filer, der skal ned ad røret, før en
bogstav må males, og det rammer **alle syv sider**.

`sikkerhed.html` er den letteste side vi har — 239 KB, 17 requests, TBT 0, CLS 0 — og
den lander på 88 med LCP 3.542 ms. LCP-faserne: **TTFB 450 ms · Load Delay 0 · Load
Time 0 · Render Delay 3.092 ms (87 %).**

Hvad der ligger på den kritiske sti, med prioritet, målt (runde 4, gzip):

| Ressource | Overført | Rå | Prioritet | Bemærkning |
|---|---|---|---|---|
| `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | **55.453 B** | 212.199 B | Low | **23 % af sidens vægt.** `sikkerhed.html` henter ikke data. LH: 42.210 B af den er ubrugt. Egen origin → egen DNS + TLS. |
| `/fonts/ibmplexsans.woff2` | **45.892 B** | 45.712 B | **High** | `<link rel=preload>` — hentes FØR css'en. Kan ikke komprimeres yderligere. |
| `/css/styles.css` | **41.363 B** | 170.306 B | **VeryHigh** | Heraf **147.561 B (87 %) ubrugt på denne side**. |
| `/fonts/spacegrotesk.woff2` | **22.468 B** | 22.288 B | **High** | Samme. De to fonte er tilsammen **68.360 B ved høj prioritet**. |
| `/js/postnumre.js` | 7.482 B | 40.050 B | Low | **Siden har nul formularfelter.** Se hul 4. |

68.360 B fonte + 41.363 B CSS = 109.723 B, der skal ned før første maling. På Lanterns
langsomme 4G (1,6 Mbit/s ≈ 200 KB/s) er det ~549 ms ren transporttid oven i RTT'erne —
og `font-display:swap` betyder, at fontene slet ikke behøvede at komme først.

**Tallene at handle på:** 55 KB tredjeparts-JS på sider uden data · 147.561 B ubrugt CSS
på `sikkerhed.html` (LH: 38.913 B gzip at spare) · 68.360 B preloadede fonte foran CSS'en.

### 2. `section.similar-strip` på annoncesiden — CLS 0,488 (mobil, runde 2)

Målt CLS på `/annonce.html`: **0,488** (mobil, runde 2, rigtig annonce) og **0,574**
(desktop, runde 2, tom annonce). Grøn grænse er 0,10. Ydelsen faldt til **47** i den
kørsel — det laveste tal, der er målt på sitet.

`layout-shifts` peger på ét element:
```
0,488   body > main#main-content > div.container > section.similar-strip
```
Målt i browseren: **`.similar-strip` er 979 px høj** og bliver indsat under indholdet,
efter siden er malet, uden at pladsen er reserveret. På et 844 px højt viewport betyder
det, at hele resten af siden hopper.

Samme mønster, mindre udslag, på de tomme tilstande: `/annonce.html?id=1` **0,205
mobil / 0,260 desktop**, `/forhandler.html` **0,294 mobil / 0,206 desktop** — her er det
`footer.site-footer`, der flytter sig (0,313 + 0,260 i to skub), fordi indholdet
skrives ind over den. Alle fire tal er røde i runde 4 og fejler gulvet på CLS alene.

Bemærk: `.tiles-grid:empty{min-height:520px}`, `.listings-grid:empty{min-height:340px}`
og `.brand-cloud:empty{min-height:132px}` findes allerede i den kritiske CSS. Mønstret
er der — `similar-strip` og annoncens indholdsblok mangler det bare.

### 3. Otte kategorifliser på forsiden — 270.350 B leveret, 254.846 B spildt

`/img/type/*.webp` er alle **760×570 px** og vises i **182×137 CSS-px** på mobil.

| Fil | Bytes | Spildt (LH image-delivery) |
|---|---|---|
| `classic.webp` | 36.688 | 34.584 |
| `cross.webp` | 36.460 | 34.369 |
| `sport.webp` | 35.576 | 33.536 |
| `adventure.webp` | 35.540 | 33.502 |
| `naked.webp` | 33.126 | 31.226 |
| `cruiser.webp` | 33.100 | 31.202 |
| `touring.webp` | 30.228 | 28.494 |
| `scooter.webp` | 29.632 | 27.933 |
| **I alt** | **270.350** | **254.846** |

Lighthouse: `uses-responsive-images` **228.580 B**, `image-delivery-insight` **283 KiB**.
Det er 270 KB på en 569 KB-side — **47 % af forsidens vægt** — til otte fliser under
folden. Der findes ingen `srcset` på dem (heroen har det: 800/960/1600/2560).

Oveni: `logo-mark.png` er **8.396 B, 96×96 PNG, vist i 30×30**, og ligger på **alle syv
sider**. LH: 8.246 B spildt, "brug et moderne format". 8 KB × 7 sider.

### 4. `js/postnumre.js` — 40.050 B rå / 7.482 B gzip på sider uden ét eneste felt

Målt fra `network-requests`, hvilke sider der henter den:

| Side | Henter `postnumre.js` | Synlige formularfelter |
|---|---|---|
| `/sikkerhed.html` | **ja** | **0** |
| `/maerker.html` | **ja** | **0** |
| `/forhandler.html` | **ja** | 0 |
| `/annonce.html` | ja | 0 |
| `/opret-annonce.html` → login | ja | 6 |
| `/` | nej | 3 |
| `/soegning.html` | nej | 2 |

På `sikkerhed.html` er det 7.482 af 244.439 B (3,1 %) og en request mere i den kø, der
i forvejen er problemet. Ren fejlkobling — ikke en afvejning.

### 5. `/opret-annonce.html` omdirigerer — 4.545 ms simuleret

`redirects`-audit, runde 4 mobil: **4.544,6 ms** (runde 1: 7.225 ms; runde 3: højere).
`/opret-annonce.html` → `/login.html?redirect=opret-annonce.html`. Login-siden er
i sig selv fin (a11y uden fejl, 588 KB, CLS 0), men brugeren betaler en fuld ekstra
rundtur, før den overhovedet begynder. Ydelse **71 mobil / 66 desktop** — sitets
næstdårligste, og hele forskellen er omdirigeringen.

### 6. `.chip .facet-n{opacity:.7}` — a11y 97 på søgesiden desktop

Se afsnittet om tilgængelighed. 21 noder, 3,04:1 mod krævet 4,5:1, `css/styles.css:2616`.
Det er det billigste hul på listen at lukke og det eneste, der rammer a11y-kravet.

### Ikke vores at rette

`modern-image-formats` på søgesiden: **142.995 B** at spare på de indekserede MC
Syd-fotos fra `images.danbase.dk`. De er JPEG i ~60 KB stykket og ligger på en
tredjeparts host. Vi kan vælge ikke at vise dem eller vise færre — vi kan ikke
konvertere dem.

---

## Næste runde

Kør de samme syv URL'er mod en gzip-server (`Cache-Control: max-age=600`), mobil og
desktop, og føj medianrækkerne til TSV-blokken med et nyt rundenummer. Mål
**`?id=1021`, ikke `?id=1`**. Tre ting, runde 10 gjorde, som er værd at gentage:

1. **Mål på en commit, ikke på arbejdstræet.** `git archive HEAD | tar -x -C <kopi>`
   og server kopien. Så ved du, hvad tallet beskriver, også når fire andre agenter
   skriver i filerne imens. Noter hashen.
2. **Flet en A/B, kør den aldrig i blokke.** A, D, A, D umiddelbart efter hinanden,
   mindst 6 par, og rapportér den parvise forskel MED spredning. Runde 6's 142 ms
   var ét par på én side og holdt ikke for 20.
3. **Tre mobilkørsler pr. celle er minimum.** Enkeltkørsler så `annonce-tom` mobil
   svinge mellem ydelse 87 og 95 og TBT mellem 318 og 0 ms uden nogen ændring.

Det, der ikke behøver måles igen: **a11y (100 på 18 af 18), CLS (grøn på 18 af 18) og
TBT (grøn på 18 af 18).** De tre er færdige emner og har været det siden runde 6.
Mål dem, men brug ikke tid på dem. **Hele det resterende hul er mobil-LCP**, og efter
runde 10 er det tre ting: søgesidens fremmede LCP-foto (3.666 ms opdagelse + hentning),
`css/styles.css` (49.644 B `VeryHigh`, 90 % ubrugt pr. side) og omdirigeringen på
`/opret-annonce.html` (2.726 ms).

Det, der IKKE skal prøves igen uden en ny idé: **supabase-js på egen origin som
hastighedsrettelse.** Den er nu målt to gange — 142 ms på ét par i runde 6, 4,3 ms
± 299 på 20 par i runde 10. Der er stadig gode grunde til at flytte bundtet
(SRI, fastlåst version, én fremmed vært mindre i `script-src`), men hastighed er
ikke en af dem, og de grunde hører til sikkerhedsstykket, ikke ydelsesstykket.

---

## Runde 11 — BUILDER 3 (ydelse), 18.08.2026: minificering + den kritiske blok slået fra

**Gulvet er STADIG ikke nået på mobil. Ingen af de tre sider består.** Det står
først, fordi resten af afsnittet er fremgang, og fremgang uden den sætning
læses som en beståelse.

### Sådan er der målt

| | |
|---|---|
| Værktøj | Lighthouse 12.8.2 CLI (`npx lighthouse --output=json`), Node v22.14.0 |
| Browser | Chrome headless (`--headless=new --no-sandbox --disable-gpu`) |
| Mobil | Lighthouse standardpreset: Moto G Power, **4x CPU-throttling**, langsom 4G (Lantern) |
| Desktop | `--preset=desktop` |
| Server | egen `gzserver.js` — gzip på html/css/js/svg, `Cache-Control: max-age=600`, `Server: GitHub.com`. Porte 61330 (før) og 61334 (efter) |
| **Målt på** | **commit `7297c07`, udpakket to gange med `git archive HEAD`** — ikke arbejdstræet |
| Arme | **A (før)** = `7297c07` som den er. **B (efter)** = `7297c07` + mine fire scripts, kørt gennem `inline-critical` + `inline-boot` + `udgiv`, og serveret fra `_site/` |
| Gentagelser | 3 mobilkørsler pr. celle, 1–2 desktop. Medianer i tabellen |
| Spredning, mobil | søgning 4.198–4.216 → 3.416–3.481 · forside 3.175–3.337 → 2.777–2.847 · annonce 2.899–2.959 → 2.536–2.588. Alle tre intervaller er adskilte |

**Efter-armen er den UDGIVNE form.** Minificeringen findes kun i `_site/`, så en
måling på arbejdstræet ville slet ikke vise den. De to arme er byte-identiske
bortset fra mine ændringer.

### Før → efter, alle seks celler

| Side | Bredde | Ydelse (≥95) | A11y (=100) | FCP | LCP (≤2500) | TBT (≤200) | CLS (≤0,01) | KB | **Gulv** |
|---|---|---|---|---|---|---|---|---|---|
| `/soegning.html` | mobil | 86 → **92** ✗ | 100 → 100 ✓ | 1.060 → **911** | 4.201 → **3.433** ✗ | 0 → 0 ✓ | 0,000 → 0,000 ✓ | 637 → **537** | **NEJ** |
| `/soegning.html` | desktop | 100 → 100 ✓ | 100 ✓ | 290 → 249 | 870 → 790 ✓ | 0 ✓ | 0,023 ✓ | 1.413 → 1.314 | JA |
| `/` | mobil | 93 → **96** ✓ | 100 → 100 ✓ | 1.059 → **912** | 3.186 → **2.784** ✗ | 0 → 0 ✓ | 0,000 → 0,000 ✓ | 455 → **375** | **NEJ** |
| `/` | desktop | 99 → 99 ✓ | 100 ✓ | 290 → 253 | 734 → 673 ✓ | 0 ✓ | 0,056 ✓ | 790 → 709 | JA |
| `/annonce.html?id=1021` | mobil | 95 → **97** ✓ | 100 → 100 ✓ | 1.059 → **913** | 2.924 → **2.577** ✗ | 24 → 23 ✓ | 0,001 → 0,001 ✓ | 299 → **213** | **NEJ** |
| `/annonce.html?id=1021` | desktop | 100 → 100 ✓ | 100 ✓ | 291 → 251 | 660 → 571 ✓ | 0 ✓ | 0,008 ✓ | 299 → 213 | JA |

**Hvor langt fra gulvet, i point og millisekunder:**

```
soegning mobil   ydelse 92 (mangler 3)   LCP 3.433 (933 ms for meget)
forside  mobil   ydelse 96 (bestaaet)    LCP 2.784 (284 ms for meget)
annonce  mobil   ydelse 97 (bestaaet)    LCP 2.577 ( 77 ms for meget)
```

Alle tre desktopceller består. **Ingen mobilcelle består**, og årsagen er den
samme alle tre steder: LCP. Det er samme dom som runde 10 — hele det resterende
hul er mobil-LCP — men hullet er blevet mindre på alle tre sider.

### Ingen regression: CLS og tilgængelighed

Det var kravet, og det er efterprøvet på hver enkelt kørsel, ikke kun på
medianen:

* **CLS mobil: 0,000 / 0,000 / 0,001 før OG efter.** Ikke én af de ni
  efter-kørsler afveg. Desktop ligeledes uændret (0,023 / 0,056 / 0,008).
  At CLS holdt, selvom den indlejrede kritiske blok forsvandt, er ikke held:
  med et render-blokerende ark er HELE stilarket til stede ved første maling,
  så geometrien er rigtig fra første pixel. Den indlejrede blok var altid et
  UDSNIT, og et udsnit er netop dét, der kan være uenigt med arket.
* **Tilgængelighed: 100 på alle 12 celler**, før som efter.
* **TBT: 0 / 0 / 23 ms.** Uændret. Hovedtråden er stadig ikke problemet.

### Hvilke audits holdt op med at fejle

| Audit | Før (søgning mobil) | Efter |
|---|---|---|
| `unminified-css` | 20 KiB | **væk på alle sider** |
| `unminified-javascript` | 54 KiB (forside 41, annonce 45) | **væk** (3 KiB rest på `annonce.html` — det er et inline-`<script>` i selve siden, ikke en fil) |
| `unused-css-rules` | 46 KiB | 17 KiB (forside 43 → 15) |
| `lcp-lazy-loaded` | bestod allerede (score 1) | består |
| `prioritize-lcp-image` | 614 ms | 488–635 ms — **fejler stadig** |
| `modern-image-formats` | 116 KiB | 116 KiB — **uændret, og ingen af posterne er vores** |
| `render-blocking-resources` | bestod | **220 ms — NY**, og den er bevidst betalt |

`render-blocking-resources` er prisen for at slå den indlejrede kritiske CSS
fra. Den står i regnskabet, fordi den er ægte: arket blokerer igen første
maling. Nettoregnskabet er alligevel positivt på alle tre sider — og FCP blev
149 ms HURTIGERE, ikke langsommere, fordi dokumentet skrumpede mere end arket
kostede.

### Hvad der flyttede tallet, hver for sig

| Ændring | Målt på søgning mobil |
|---|---|
| Minificering af js+css i `_site/` | 86 / LCP 4.201 → **91 / 3.542** |
| Den indlejrede kritiske blok slået fra | 91 / 3.542 → **92 / 3.432** |
| `preconnect` til `images.danbase.dk` | **neutralt** (se nedenfor) |

Bytes: `css/styles.css` 52.486 → **20.641 B gzip**. `js/search.js` 38.657 →
17.950. `js/data.js` 30.406 → 13.912. `js/components.js` 15.177 → 7.198.
Dokumentet `soegning.html` 18.447 → **9.778 B gzip**, fordi den indlejrede blok
var 8.669 B af det. `_site` som helhed 4,0 → 3,0 MB, fordi det ubrugte
`logo.png` (1.025.234 B) ikke længere udgives.

### preconnect: ærligt neutralt, og hvorfor

`<link rel="preconnect" href="https://images.danbase.dk" crossorigin>` er lagt
ind (skrevet af `scripts/inline-boot.js` ud fra sidens egen `img-src`).
Lighthouse scorer den **nul**. LCP-faserne viser hvorfor:

```
uden preconnect   TTFB 457 · Load Delay 1.938 · Load Time 1.049 · Render 98
med  preconnect   TTFB 455 · Load Delay 2.264 · Load Time   717 · Render 129
```

De 332 ms opsætning forsvinder fra selve billedet — og dukker op igen i Load
Delay. Lanterns model flytter dem, den fjerner dem ikke. Hintet bliver stående,
fordi DNS + TCP + TLS til en fremmed vært er noget en rigtig browser laver i
idle tid, før billedet skal bruges; men **det skal ikke tilskrives noget af
fremgangen ovenfor.**

### To hypoteser prøvet og AFVIST — brug ikke en runde på dem igen

Begge er bygget på komplette kopier af arbejdstræet, egen server, tre kørsler
pr. arm.

1. **`eksterne_annoncer` prefetchet i boot-blokken** (plus én linje i
   `js/backend-bridge.js`, der samler den op). Funktionelt korrekt. **LCP 3.464
   median mod 3.433 uden. Load Delay 1.939–1.961 ms i BEGGE arme.**
   Årsagen er, at Load Delay ikke er seriel ventetid men båndbredde: der skal
   lande 250.168 B, før billedets forespørgsel begynder, og en tidligere
   forespørgsel står i den samme kø.
2. **Fontenes `preload` fjernet.** **LCP uændret (3.483 mod 3.433), FCP 911 →
   1.511 ms.** Samme resultat som runde 6, men målt på den nye sidestruktur.
   Hypotesen er nu afvist to gange.

### Hvad der præcist står i vejen på `/soegning.html`

Målt på efter-armen, kørsel 3:

```
LCP 3.416 ms = TTFB 455 + Load Delay 2.027 + Load Time 829 + Render Delay 104
```

**Load Delay: 250.168 B skal være landet, før billedets forespørgsel begynder.**
De største poster:

| Post | Overført | Prioritet | Vores? |
|---|---|---|---|
| `cdn.jsdelivr.net/npm/@supabase/supabase-js@2` | 55.119 B | Low | nej |
| `fonts/ibmplexsans.woff2` | 45.912 B | High | ja — men prøvet fjernet, se ovenfor |
| `rest/v1/eksterne_annoncer` | 30.895 B | High | ja — selve dataene |
| `fonts/spacegrotesk.woff2` | 22.488 B | High | ja — samme |
| `css/styles.css` | 20.878 B | VeryHigh | ja — allerede minificeret |
| otte egne javascriptfiler | ~55.000 B | Low | ja — allerede minificeret |

**Load Time: fire søsterfotos på 240.127 B hentes samtidig med LCP-fotoet.**
De er `loading="lazy"`, men kort 2–5 ligger inden for Chromes doven-grænse på en
823 px høj skærm, så de hentes alligevel. LCP-fotoet er 59.702 B og bruger
829–1.049 ms på at komme ned — altså 57–72 B/ms, hvor røret kan cirka 200 B/ms.
**Det er ikke prioritet, der mangler:** billedet HAR `fetchpriority="high"`, og
`lcp-lazy-loaded` består. Det er, at der er fire andre billeder om pladsen.

### Til den næste: de tre veje, der er tilbage, i rækkefølge

1. **Færre fotos over folden på side 1.** Største enkeltpost. Den ligger i
   `js/search.js` (`FIRST_CARDS`/`CARD_CHUNK`, og hvor mange kort der
   overhovedet tegnes ved første maling) og i kortets højde. Hvert kort færre
   inden for doven-grænsen er ~60 KB mindre konkurrence om røret, mens
   LCP-fotoet hentes. **Det er en produktbeslutning lige så meget som en
   ydelsesbeslutning** — læs kritikerens punkt 4 om, at første pris står ved
   y=854 af 844, før nogen gør kortene lavere.
2. **supabase-js må ikke ligge foran dataene.** 55.119 B tredjeparts-javascript
   skal hentes, parses og initialiseres, FØR forespørgslen efter annoncerne kan
   sendes. En rå `fetch` mod PostgREST — som boot-blokken allerede laver for
   `listings` — har ingen af de bytes. Det er ikke et argument for at flytte
   bundtet til egen origin; dét er målt til nul to gange (runde 6 og 10). Det er
   et argument for, at annoncehentningen ikke skal gå igennem det.
3. **`js/data.js` er 13.912 B gzip på hver side.** `SHOW_DEMO_DATA` er kun sandt
   på localhost, så demolagerets 51 annoncer er bytes, ingen bruger i drift
   nogensinde ser. Skilles demodataene fra funktionerne, forsvinder de fra den
   kritiske sti på alle sider. Ikke rørt: `js/data.js` er ikke min.

Det, der IKKE skal prøves igen: supabase-js på egen origin (afvist runde 6 og
10), fontenes preload (afvist runde 6 og 11), prefetch af `eksterne_annoncer`
(afvist runde 11).
