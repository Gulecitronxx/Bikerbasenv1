# LIGHTHOUSE — det målte gulv

Gulvet står i `bar/RUBRIC.md` kategori 3 og er **absolut**: det gælder kun os, og
vi måler det ikke mod Bilbasens tal (`bar/GAPS.md`, gap 5 — deres side er fuld af
reklamepladser; at vinde på hastighed mod den er ikke en sejr, der tæller).

```
GULV:  ydelse ≥ 95   ·   tilgængelighed = 100   ·   grønne Core Web Vitals
GRØN:  LCP ≤ 2.500 ms   ·   CLS ≤ 0,10   ·   TBT ≤ 200 ms
```

**Status efter runde 4 (måler): 0 af 16 kombinationer består.**
**Status efter runde 6 (builder "ydelse"): 10 af 16.** Tilgængelighed er nu 100 på
alle 16, CLS grøn på alle 16, TBT 0–30 ms på alle 16. **Alle seks resterende fejl
er mobil-LCP**, og de tre poster, der bærer dem, er de samme på hver side:
`css/styles.css` (45,5 KB), de to fonte (68,4 KB) og supabase-js fra jsDelivr
(55,1 KB) — 169 KB, før siden har vist ét eget byte.

ADVARSEL FØR DU SAMMENLIGNER TAL PÅ TVÆRS: runde 5–6 er kørt på en anden maskintilstand
end runde 1–4. Samme TTFB, men under det halve FCP på en side, ingen har rørt.
Runde 4 og runde 6 kan IKKE stilles ved siden af hinanden. Læs runde 5 → runde 6,
og læs afsnittet "Runde 5 og 6" nedenfor, før du bruger et absolut tal til noget.

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
```

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
desktop, og føj rækkerne til TSV-blokken med runde 5. Mål **`?id=1007`, ikke `?id=1`**,
og noter klokkeslæt + `git rev-parse --short HEAD`, så tallene kan placeres i tid.
Median af tre mobilkørsler pr. side hvis der er tid — én kørsel har ±3 points støj.
