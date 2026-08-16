/* ============ Reference data ============ */

/* GRATIS-TILSTAND
   Slået til: alle — private som forhandlere — har gratis, ubegrænset adgang,
   og der er ingen betaling. Sat mens betalingsmodellen endnu ikke er valgt.

   Når du vil aktivere forhandler-abonnementet igen:
     1. sæt denne til false
     2. kør supabase/006_forhandler_abonnement.sql igen (genskaber annoncegrænsen)
   Stripe-koden ligger klar og uændret — den bruges bare ikke, mens dette er true. */
const FRI_ADGANG = true;

const REGIONS = ['Hovedstaden', 'Sjælland', 'Syddanmark', 'Midtjylland', 'Nordjylland'];

/* ---------- Landsdel ud fra postnummer ----------

   Kilderne oplyser postnummer og by, aldrig landsdel. Uden landsdel forsvandt
   alle indekserede annoncer, så snart nogen satte ét landsdelsfilter — og det
   er ærgerligt, for landsdelen er ikke ukendt: den FØLGER af postnummeret.
   Det er ikke et gæt, det er et opslag.

   Hvorfor ikke bare findPostnr() fra js/postnumre.js? Fordi søgesiden med
   vilje IKKE loader den fil (se kommentaren i soegning.html): 40 KB og 1089
   rækker, der skulle hentes, parses og evalueres på hovedtråden for ét eneste
   opslag. Den blev fjernet dér som en målt forbedring, og den skal ikke
   snige sig ind igen ad bagvejen.

   I stedet ligger tabellen her i sammentrængt form. Den er ikke en genvej og
   ikke en tilnærmelse: landsdelene ligger i sammenhængende postnummerspænd,
   så alle 1089 postnumre koger ned til 31 knækpunkter — "fra dette
   postnummer og opefter gælder denne landsdel". Verificeret mod js/postnumre.js:
   0 afvigelser på alle 1089, på 280 bytes.

   Hvorfor i data.js? Fordi funktionen fandtes TO gange: én i
   js/backend-bridge.js (for normalizeExternalListing) og én i js/components.js
   (for eksternStedTekst), begge som global function-erklæring med samme navn.
   På hver side, der loader begge filer, vandt den sidste script-tag for ALLE
   kaldere — også for dem, der troede, de kaldte deres egen. I browseren vandt
   components.js; i scripts/shared.js, der kæder filerne sammen i modsat
   rækkefølge, vandt backend-bridge.js. To tabeller, to svar, alt efter hvor
   koden kørte. Her ligger den ét sted, i den fil hver eneste side loader
   først — også maerker.html og sikkerhed.html, der har components.js uden
   backend-bridge.js.

   Bogstavet efter postnummeret er pladsen i REGIONS ovenfor.
   Regenereres med (fra projektroden):
     node -e "const P=JSON.parse(require('fs').readFileSync('js/postnumre.js','utf8').match(/const POSTNUMRE = (\[.*?\]);/s)[1]);P.sort((a,b)=>a[0].localeCompare(b[0]));let l=null;console.log(P.filter(p=>p[2]!==l&&(l=p[2])).map(p=>p[0]+{Hovedstaden:'H','Sjælland':'S',Syddanmark:'D',Midtjylland:'M',Nordjylland:'N'}[p[2]]).join(' '))"

   Kilde: Dataforsyningen (DAWA), samme som js/postnumre.js. */
const REGION_KNAEK = '1050H 2670S 2700H 4030S 4050H 4060S 5000D 6893M 7000D 7130M 7160D 7171M 7173D 7280M 7300D 7362M 7700N 7760M 7770N 7790M 7900N 8000M 8721D 8722M 9000N 9500M 9510N 9550M 9560N 9620M 9640N'
  .split(' ').map(s => [Number(s.slice(0, 4)), REGIONS['HSDMN'.indexOf(s[4])]]);

/* Et postnummer uden for registret skal give "ved ikke" — ikke et svar.
   Under 1050 findes ikke, og over 9999 er ikke et dansk postnummer. Begge
   dele er et FORKERT postnummer, og et forkert postnummer må hverken lande
   på den første række (Hovedstaden) eller den sidste (Nordjylland).
   Landsdelsfilteret skal hellere mangle en annonce end vise den et forkert
   sted i landet.

   parseInt og ikke Number: crawleren gemmer postnummeret som ren firecifret
   streng (parsePostnr i crawler/normalize.js), men "2100 København" fra et
   frit felt er et rigtigt postnummer med en by klistret på. Spændet ovenfor
   fanger alligevel alt, der ikke ER et postnummer.

   findPostnr() slås IKKE op, heller ikke når js/postnumre.js tilfældigvis er
   loadet på siden. Den ville give præcis samme landsdel — det er dét, de 0
   afvigelser betyder — men svaret ville afhænge af, hvilke andre scripts
   siden tilfældigvis havde med. Samme postnummer skal give samme landsdel
   alle steder. Skal bynavnet med, er findPostnr() stadig den rigtige; den
   kender det officielle bynavn, og det gør tabellen her ikke. */
function regionFraPostnr(postnr){
  const nr = parseInt(String(postnr ?? '').trim(), 10);
  if (!Number.isFinite(nr) || nr < REGION_KNAEK[0][0] || nr > 9999) return null;
  let fundet = null;
  for (const [fra, navn] of REGION_KNAEK){ if (nr < fra) break; fundet = navn; }
  return fundet;
}

/* Kurateret udsnit — bruges kun til at generere demoannoncer.
   Den fulde postnummerliste (1089) ligger i js/postnumre.js. */
const DEMO_CITIES = [
  { city: 'København N', postnr: '2200', region: 'Hovedstaden' },
  { city: 'København V', postnr: '1620', region: 'Hovedstaden' },
  { city: 'Frederiksberg', postnr: '2000', region: 'Hovedstaden' },
  { city: 'Hillerød', postnr: '3400', region: 'Hovedstaden' },
  { city: 'Helsingør', postnr: '3000', region: 'Hovedstaden' },
  { city: 'Roskilde', postnr: '4000', region: 'Sjælland' },
  { city: 'Næstved', postnr: '4700', region: 'Sjælland' },
  { city: 'Slagelse', postnr: '4200', region: 'Sjælland' },
  { city: 'Nykøbing F', postnr: '4800', region: 'Sjælland' },
  { city: 'Odense C', postnr: '5000', region: 'Syddanmark' },
  { city: 'Kolding', postnr: '6000', region: 'Syddanmark' },
  { city: 'Esbjerg', postnr: '6700', region: 'Syddanmark' },
  { city: 'Vejle', postnr: '7100', region: 'Syddanmark' },
  { city: 'Sønderborg', postnr: '6400', region: 'Syddanmark' },
  { city: 'Aarhus C', postnr: '8000', region: 'Midtjylland' },
  { city: 'Randers', postnr: '8900', region: 'Midtjylland' },
  { city: 'Silkeborg', postnr: '8600', region: 'Midtjylland' },
  { city: 'Herning', postnr: '7400', region: 'Midtjylland' },
  { city: 'Viborg', postnr: '8800', region: 'Midtjylland' },
  { city: 'Aalborg', postnr: '9000', region: 'Nordjylland' },
  { city: 'Hjørring', postnr: '9800', region: 'Nordjylland' },
  { city: 'Frederikshavn', postnr: '9900', region: 'Nordjylland' },
];

const TYPES = [
  { id: 'sport', label: 'Sport' },
  { id: 'touring', label: 'Touring' },
  { id: 'cruiser', label: 'Cruiser' },
  { id: 'naked', label: 'Naked' },
  { id: 'adventure', label: 'Adventure/Enduro' },
  { id: 'scooter', label: 'Scooter' },
  { id: 'classic', label: 'Classic/Veteran' },
  { id: 'cross', label: 'Cross/MX' },
];

const CONDITIONS = ['Som ny', 'God stand', 'Brugt', 'Defekt/Projekt'];

const BRANDS_BY_MODEL = {
  Yamaha: ['MT-03', 'MT-07', 'MT-09', 'MT-10', 'YZF-R3', 'YZF-R6', 'YZF-R1', 'YZF-R7', 'Ténéré 700', 'XSR700', 'XSR900', 'Tracer 7', 'Tracer 9 GT', 'NMAX 125', 'XMAX 300', 'TMAX 560', 'WR250F', 'YZ450F', 'Niken', 'Virago 250', 'Virago 535', 'Virago 1100', 'V-Max', 'Fazer 600', 'FZ6', 'FZ1', 'RD350', 'DT125', 'XT250', 'XT660', 'Drag Star 650', 'Majesty 400', 'Seca II', 'SR400', 'MT-125', 'YZF-R125', 'XSR125', 'Tracer 900', 'Tracer 900 GT', 'Super Ténéré 1200', 'FJR1300', 'XJR1300', 'XJ6', 'FZ8', 'TDM900', 'WR450F', 'WR125R', 'MT-15', 'Aerox 155', 'Bolt'],
  Honda: ['CB125R', 'CB300R', 'CB500F', 'CB500X', 'CB650R', 'CB1000R', 'CBR500R', 'CBR600RR', 'CBR650R', 'CBR1000RR-R', 'Africa Twin', 'Africa Twin Adventure Sports', 'Rebel 300', 'Rebel 500', 'Rebel 1100', 'Forza 350', 'PCX 125', 'SH125i', 'Gold Wing', 'Gold Wing Tour', 'CRF250L', 'CRF450R', 'CRF450RL', 'Monkey', 'Super Cub C125', 'X-ADV', 'CB750 Four', 'CB400 Super Four', 'Hornet 600', 'Hornet 900', 'VFR800', 'Shadow 750', 'VTX1800', 'Transalp 750', 'Varadero 1000', 'Deauville 700', 'NC750X', 'Grom', 'CBX1000', 'CB1300', 'CBR125R', 'CBR300R', 'CB125F', 'CBR600F', 'CBR900RR Fireblade', 'CBR1000RR', 'VTR1000 Firestorm', 'VFR750', 'CBF600', 'CBF1000', 'NC700X', 'CB650F', 'Dominator NX650', 'CRF300L', 'Forza 750', 'Dax ST125'],
  Suzuki: ['GSX-R600', 'GSX-R750', 'GSX-R1000', 'GSX-S750', 'GSX-S1000', 'SV650', 'V-Strom 650', 'V-Strom 1050', 'Bandit 1200', 'Hayabusa', 'Burgman 400', 'Address 125', 'DR-Z400', 'RM-Z450', 'Boulevard M109R', 'Katana', 'GS500', 'Intruder 800', 'Marauder 800', 'GSF650 Bandit', 'DR650', 'Gladius 650', 'TL1000S', 'RGV250', 'GSX-R125', 'GSX-S125', 'GSX-8S', 'GSX-8R', 'V-Strom 800DE', 'Bandit 600', 'GSX650F', 'GSX1400', 'SV1000', 'Inazuma 250', 'GSX250R', 'Burgman 650', 'DR350', 'VanVan 200', 'Boulevard M50'],
  Kawasaki: ['Ninja 400', 'Ninja 650', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Ninja H2', 'Z400', 'Z650', 'Z900', 'Z900RS', 'Versys 650', 'Versys 1000', 'Vulcan S', 'Vulcan 900', 'KLX230', 'KLX300', 'KX450', 'W800', 'GPZ900R', 'ZZR1400', 'ER-6n', 'Eliminator 400', 'KLR650', 'Concours 1400', 'Zephyr 750', 'Mach III H1', 'Ninja 125', 'Z125', 'Ninja 300', 'Z1000', 'Z1000SX', 'Ninja 1000SX', 'ZX-14R', 'Versys-X 300', 'Z750', 'Z800', 'GPZ500S', 'ZXR750', 'ZRX1200', 'W650', 'KLX250'],
  BMW: ['G 310 R', 'G 310 GS', 'F 750 GS', 'F 850 GS', 'F 900 R', 'F 900 XR', 'R 1250 GS', 'R 1250 GS Adventure', 'R 1250 RT', 'R nineT', 'R nineT Pure', 'S 1000 RR', 'S 1000 R', 'S 1000 XR', 'K 1600 GT', 'K 1600 GTL', 'C 400 X', 'CE 04', 'R80 GS', 'R100 RS', 'R1200 GS', 'K100', 'F650 GS', 'HP4 Race', 'R 1200 GS Adventure', 'R 1200 RT', 'R 1200 R', 'R 1150 GS', 'R 1100 GS', 'F 800 GS', 'F 800 R', 'F 800 GT', 'G 650 GS', 'R 1250 R', 'R 18', 'R 1300 GS', 'K 1300 S', 'C 650 GT', 'F 900 GS'],
  Ducati: ['Monster 797', 'Monster 937', 'Panigale V2', 'Panigale V4', 'Multistrada V2', 'Multistrada V4', 'Scrambler 800', 'Scrambler 1100', 'Diavel 1260', 'Streetfighter V4', 'SuperSport 950', 'Hypermotard 950', '916', '999', 'ST2', 'ST4', '848', 'Supersport 900', 'Monster 696', 'Monster 821', 'Monster 1200', 'Multistrada 1200', 'Multistrada 1260', 'Multistrada 950', 'XDiavel', 'Diavel V4', 'Panigale 959', 'Panigale 1199', 'Panigale 1299', '748', '1098', '1198', 'Hypermotard 796', 'DesertX', 'Streetfighter V2', '900SS', 'Monster 620'],
  KTM: ['Duke 125', 'Duke 200', 'Duke 390', 'Duke 790', 'Duke 890', '1290 Super Duke R', 'RC 125', 'RC 390', '1290 Super Adventure S', '890 Adventure', '390 Adventure', '450 SX-F', '250 SX', '250 EXC', '500 EXC-F', 'LC4 640', 'Adventure 640', '690 Enduro', '690 SMC R', 'Duke 690', 'Duke 990', '250 Duke', '1290 Super Duke GT', '1190 Adventure', '1090 Adventure', '990 Adventure', '950 Adventure', '790 Adventure', '890 Adventure R', '300 EXC', '350 EXC-F', '450 EXC-F', '125 SX', 'RC8'],
  Triumph: ['Street Triple 660', 'Street Triple 765', 'Speed Triple 1200', 'Bonneville T100', 'Bonneville T120', 'Bonneville Bobber', 'Speed Twin', 'Scrambler 900', 'Scrambler 1200', 'Tiger 900', 'Tiger 1200', 'Rocket 3', 'Trident 660', 'Daytona 675', 'Tiger 800', 'Thunderbird 900', 'America', 'Speedmaster', 'Street Triple 675', 'Tiger Sport 660', 'Tiger Sport 1050', 'Speed Triple 1050', 'Sprint ST', 'Daytona 955i', 'Thruxton 900', 'Thruxton 1200 RS', 'Tiger Explorer 1200', 'Tiger 955i', 'Legend TT'],
  'Harley-Davidson': ['Iron 883', 'Iron 1200', 'Forty-Eight', 'Street Bob', 'Fat Bob', 'Fat Boy', 'Road King', 'Road Glide', 'Street Glide', 'Heritage Classic', 'Sportster S', 'Pan America 1250', 'Nightster', 'LiveWire', 'Sportster 883', 'Sportster 1200', 'Dyna Low Rider', 'Softail Standard', 'Electra Glide', 'V-Rod', 'Softail Slim', 'Breakout', 'Low Rider S', 'Low Rider ST', 'Fat Bob 114', 'Street Glide Special', 'Road Glide Special', 'Ultra Limited', 'Street 750', 'Street Rod', 'Night Rod Special', 'Wide Glide', 'Sport Glide', 'Deluxe', 'Road King Special', 'Tri Glide'],
  Aprilia: ['RS 660', 'RS 125', 'Tuono 660', 'Tuono V4', 'RSV4', 'Tuareg 660', 'SR GT 200', 'SXR 160', 'RSV Mille', 'Shiver 900', 'Dorsoduro 900', 'Caponord 1200', 'RS 457', 'RS 250', 'RSV4 1100 Factory', 'Tuono 1000', 'Pegaso 650', 'Mana 850', 'Falco SL1000', 'Dorsoduro 750', 'SXV 550', 'RX 125', 'Scarabeo 500'],
  'Moto Guzzi': ['V7 Stone', 'V7 Special', 'V9 Bobber', 'V85 TT', 'V100 Mandello', 'California 1400', 'Le Mans', 'Griso 1200', 'Norge 1200'],
  'MV Agusta': ['Brutale 800', 'Brutale 1000', 'F3 800', 'Superveloce 800', 'Turismo Veloce'],
  Husqvarna: ['Svartpilen 125', 'Svartpilen 401', 'Vitpilen 401', 'Vitpilen 701', 'FE 350', 'FE 501', 'TE 300', 'FC 450'],
  'Royal Enfield': ['Classic 350', 'Meteor 350', 'Hunter 350', 'Bullet 350', 'Interceptor 650', 'Continental GT 650', 'Himalayan', 'Scram 411', 'Electra 350', 'Thunderbird 350', 'Continental GT 535'],
  Vespa: ['Primavera 125', 'Sprint 150', 'GTS 125', 'GTS 300', 'Elettrica', 'PX 125', 'GS 150'],
  Piaggio: ['Liberty 125', 'Beverly 300', 'MP3 400', 'MP3 500'],
  Benelli: ['TRK 502', 'Leoncino 500', '502C', '752S', 'TNT 135'],
  Cagiva: ['Mito 125', 'Raptor 650', 'Planet 125'],
  Bimota: ['Tesi H2', 'KB4', 'DB4'],
  Norton: ['Commando 961', 'Atlas 650', 'V4SS'],
  Indian: ['Scout Bobber', 'Scout 100', 'Chief', 'Chieftain', 'Roadmaster', 'FTR 1200', 'Springfield'],
  'Zero Motorcycles': ['S/R', 'SR/F', 'SR/S', 'DSR', 'FXE'],
  Energica: ['Eva Ribelle', 'Ego', 'Experia'],
  CFMOTO: ['300NK', '450NK', '650NK', '700CL-X', '800MT', 'ZT310-R'],
  Zontes: ['ZT125-U', 'ZT310-T', 'ZT350-G1'],
  Voge: ['300AC', '500R', '525DSX'],
  Kymco: ['Agility 125', 'Like 125', 'AK 550', 'X-Town 300'],
  SYM: ['Jet 14', 'Symphony 125', 'Maxsym 400'],
  Hyosung: ['GT250R', 'GT650R', 'Aquila 250'],
  Daelim: ['S-Two 125', 'VJF 250'],
  Bajaj: ['Pulsar 150', 'Pulsar NS200', 'Dominar 400', 'Avenger 220'],
  TVS: ['Apache RTR 160', 'Apache RR 310', 'Ronin'],
  'Hero MotoCorp': ['Splendor Plus', 'Xpulse 200', 'Karizma XMR'],
  Yezdi: ['Roadster', 'Scrambler', 'Adventure'],
  Ural: ['Gear Up', 'CT', 'Ranger'],
  BSA: ['Gold Star 650'],
  Beta: ['RR 300', 'Xtrainer 300', 'Alp 200'],
  GasGas: ['EC 300', 'MC 450F', 'SM 700'],
  Sherco: ['300 SE-R', '450 SEF-R'],
  'TM Racing': ['EN 300', 'MX 250'],
  Fantic: ['Caballero 500', 'XX 125'],
  SWM: ['Superdual 650', 'Gran Milano 440'],
  Rieju: ['MRT 125', 'Tango 125'],
  Nimbus: ['Type C "Kakkelovnsrøret"'],
  MZ: ['ETZ 251', 'Saxon 500'],
  Peugeot: ['Django 125', 'Metropolis 400'],
  Sachs: ['Roadster 125', 'Madass 125'],
  // Amerikanske brugtmærker
  Buell: ['XB12S Lightning', 'XB12R Firebolt', 'XB9SX', '1125R', '1125CR', 'Ulysses XB12X', '1190RX', 'Thunderbolt S3', 'Cyclone M2'],
  Victory: ['Hammer', 'Vegas', 'Gunner', 'Octane', 'Cross Country', 'Cross Roads', 'Judge', 'High-Ball', 'Kingpin', 'Vision', 'Magnum'],
  'Can-Am': ['Spyder F3', 'Spyder F3-S', 'Spyder RT', 'Ryker 600', 'Ryker 900', 'Ryker Rally', 'Pulse', 'Origin'],
  // Moderne A1/A2-mærker (Kina/Europa)
  Keeway: ['RKF 125', 'RKS 125', 'Superlight 125', 'Superlight 200', 'Vieste 300', 'K-Light 202', 'Cafe 152', 'V302C', 'Sixties 300i'],
  Mash: ['Seventy 125', 'Five Hundred', 'Two Fifty', 'Black Seven 125', 'Scrambler 400', 'Dirt Track 650', 'X-Ride 650', 'Family Side 400'],
  Brixton: ['Crossfire 125', 'Crossfire 500', 'Cromwell 125', 'Cromwell 250', 'Cromwell 1200', 'Sunray 125', 'Felsberg 125', 'Storr 500'],
  Lexmoto: ['LXR 125', 'LXR 380', 'ZSB 125', 'Isca 125', 'Assault 125', 'Michigan 125', 'Storm 125', 'Aspire 125'],
  'QJ Motor': ['SRK 700', 'SRK 400', 'SRT 550', 'SRT 750', 'SRV 550', 'SRG 600', 'SRK 125'],
  Kove: ['450 Rally', '450R', '321RR', '321R', '800X', '500R', '525X'],
  'Super Soco': ['TC Max', 'TC', 'TS Street Hunter', 'CPx', 'VS1'],
  // Klassisk & scooter
  Jawa: ['350 OHC', '42', 'Perak', '300 CL', '350 Classic', 'Type 634', 'Californian'],
  Gilera: ['Fuoco 500', 'Nexus 250', 'Nexus 300', 'GP 800', 'Runner 200', 'Nexus 500'],
  Lambretta: ['V125 Special', 'V200 Special', 'G350', 'X300', 'Li 150', 'TV 175'],
};

const TYPE_BY_MODEL_HINT = {
  'MT-07': 'naked', 'MT-09': 'naked', 'YZF-R6': 'sport', 'YZF-R1': 'sport', 'Ténéré 700': 'adventure', 'XSR700': 'classic', 'Tracer 9 GT': 'touring', 'NMAX 125': 'scooter',
  'CB650R': 'naked', 'CBR600RR': 'sport', 'Africa Twin': 'adventure', 'Rebel 500': 'cruiser', 'CB500F': 'naked', 'Forza 350': 'scooter', 'Gold Wing': 'touring', 'CRF450R': 'cross',
  'Ninja 650': 'sport', 'Z900': 'naked', 'Versys 650': 'adventure', 'Vulcan S': 'cruiser', 'ZX-10R': 'sport', 'KLX 300': 'cross',
  'GSX-R750': 'sport', 'V-Strom 650': 'adventure', 'SV650': 'naked', 'Bandit 1200': 'naked', 'Burgman 400': 'scooter',
  'R 1250 GS Adventure': 'adventure', 'F 850 GS': 'adventure', 'S 1000 RR': 'sport', 'R nineT': 'classic', 'C 400 X': 'scooter', 'K 1600 GTL': 'touring',
  'Monster 937': 'naked', 'Panigale V2': 'sport', 'Multistrada V4': 'touring', 'Scrambler 800': 'classic',
  'Duke 390': 'naked', 'Duke 890': 'naked', '1290 Super Adventure': 'adventure', '450 SX-F': 'cross', 'RC 390': 'sport',
  'Street Triple 765': 'naked', 'Bonneville T120': 'classic', 'Tiger 900': 'adventure', 'Speed Twin': 'classic',
  'Iron 883': 'cruiser', 'Street Bob': 'cruiser', 'Road King': 'touring', 'Fat Boy': 'cruiser',
  'RS 660': 'sport', 'Tuono V4': 'naked', 'SR GT 200': 'scooter',
  'Svartpilen 401': 'naked', 'FE 501': 'cross', 'Vitpilen 701': 'naked',
  'Classic 350': 'classic', 'Interceptor 650': 'classic', 'Himalayan': 'adventure',
  'Primavera 125': 'scooter', 'GTS 300': 'scooter', 'Sprint 150': 'scooter',
  'Liberty 125': 'scooter', 'MP3 400': 'scooter',
  'Type C "Kakkelovnsrøret"': 'classic', 'ETZ 251': 'classic', 'Saxon 500': 'classic', 'Django 125': 'scooter', 'Roadster 125': 'classic',
};

const FIRST_NAMES = ['Mikkel', 'Anders', 'Jonas', 'Rasmus', 'Kasper', 'Frederik', 'Mathias', 'Christian', 'Emil', 'Peter', 'Louise', 'Camilla', 'Sofie', 'Ida', 'Mette', 'Nikolaj', 'Thomas', 'Lars'];
const LAST_NAMES = ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Møller'];
/* ============ Demosælgerne ============

   NAVN OG BY BLEV FØR TRUKKET UAFHÆNGIGT AF HINANDEN.
   `pick(DEALER_NAMES)` og `pick(DEMO_CITIES)` var to selvstændige kast, så
   "Bike House Aarhus" stod i Næstved med annoncer i Næstved og Hillerød, og
   "MC Specialisten Fyn" lå i København V. Målt: 5 af de 6 forhandlernavne
   nævnte et sted, og kun 1 af dem stod dér. En forhandler, hvis navn modsiger
   hans egen adresse, er det første en køber lægger mærke til — og det er
   præcis dét, tillidsspørgsmålet i bar/RUBRIC.md handler om.
   Navn, by, postnummer og landsdel står derfor i ÉN række her og kan ikke
   komme fra hinanden.

   NAVNENE er sat sammen af en landsdel eller by plus et generisk fagord
   ("MC Handel", "Motorcykelhus", "MC Center"). De er opdigtede og skal blive
   ved med at være det: ingen af dem må erstattes med en rigtig dansk
   forhandler. De har hverken adresse, telefonnummer eller CVR-nummer, så der
   er intet i dem, en besøgende kan slå op og forveksle med en rigtig butik.

   INTET CVR-NUMMER. Det stod der før, og det bestod ikke sin egen kontrol:
   `String(20000000 + rnd()*79999999)` giver et tilfældigt ottecifret tal, og
   målt bestod 0 af 6 modulus 11-kontrollen i `cvrKontrolOK()` (js/forhandler.js).
   Vi genererer ikke gyldige numre i stedet, og grunden er ikke dovenskab:
     1. `public_profiles` har ingen cvr-kolonne (se work/DECISIONS.md,
        "public_profiles bliver SECURITY DEFINER"). Ingen rigtig forhandler på
        bikerbasen.dk kan have et CVR-nummer på sin profil i dag. Et demofelt,
        produktionen ikke kan frembringe, er en løgn om systemet — nøjagtig
        samme fejltype som de halve stjerner.
     2. Et nummer, der består modulus 11, er en fungerende nøgle ind i et
        RIGTIGT offentligt register, og siden linker direkte derind
        (`datacvr.virk.dk/...?fritekst=<nr>` i `efterproevHTML()`). Enten
        rammer nummeret en virkelig virksomhed — så hænger vi en rigtig
        forretning op på en opdigtet forhandler, hvilket er samme slags fejl
        som at bruge en adresse, der findes — eller også rammer det ingenting,
        og så ser vores egen demoforhandler falsk ud.
     3. Et manglende felt vejer lettere imod os end et gættet
        (work/DECISIONS.md, "Ærlighed slår fuldstændighed"). Uden nummer falder
        profilen i `if (!seller.cvr)`-grenen, som allerede siger det rigtige:
        spørg sælgeren om nummeret, før du betaler.
   `cvrKontrolOK()` er ikke død kode — den er den kontrol, der skal køre den
   dag et cvr-felt kommer ind ad formularen eller fra databasen. Den er bare
   ikke længere noget, demolageret udløser.

   INTET TELEFONNUMMER. Der stod `+45 ${20+rnd()*60} ...` på alle 37
   demosælgere. Det er et opdigtet nummer i det danske mobilspænd, altså et
   nummer, der med stor sandsynlighed tilhører et rigtigt menneske — og
   js/annonce.js lavede det til et `tel:`-link, man kunne trykke på. Samme
   grund som CVR'et: `public_profiles` har ingen telefonkolonne, så knappen
   findes ikke i drift (det var netop derfor, den blev fjernet fra
   forhandler.html, se work/DECISIONS.md). Uden nummer falder annoncesiden i
   sin egen gren uden telefonknap, og kontaktvejen er den, der virker.

   INGEN VERIFICERINGSFLAG. `verified`, `emailVerified`, `phoneVerified` og
   `mitIdVerified` var tilfældige booleans. Ingen af dem læses for en
   annonces sælger (`verifiedBadgeHTML()` i js/components.js returnerer tom
   streng, netop fordi ingen verificering er rigtig endnu), så de påstod noget
   uden at vise noget. Felter, vi ikke har dækning for, får ingen plads. */
const DEMO_DEALERS = [
  { key: 'd0', name: 'Nordjysk MC Handel ApS',    city: 'Aalborg',     postnr: '9000', region: 'Nordjylland', memberSince: 2016 },
  { key: 'd1', name: 'Aarhus Motorcykelhus ApS',  city: 'Aarhus C',    postnr: '8000', region: 'Midtjylland', memberSince: 2018 },
  { key: 'd2', name: 'Fyns MC Center ApS',        city: 'Odense C',    postnr: '5000', region: 'Syddanmark',  memberSince: 2015 },
  { key: 'd3', name: 'Roskilde Motorcykler ApS',  city: 'Roskilde',    postnr: '4000', region: 'Sjælland',    memberSince: 2021 },
  { key: 'd4', name: 'Hovedstadens MC Depot ApS', city: 'København N', postnr: '2200', region: 'Hovedstaden', memberSince: 2019 },
  { key: 'd5', name: 'Sønderjysk MC Service ApS', city: 'Sønderborg',  postnr: '6400', region: 'Syddanmark',  memberSince: 2023 },
];

/* De private sælgere. Et personnavn påstår ingen geografi, så her er der ikke
   noget, byen kan modsige — men sælgeren skal stadig stå ÉT sted, ellers
   flytter han sig mellem sine egne annoncer. Byerne er valgt fra DEMO_CITIES,
   så landsdelsfilteret rammer det samme sted som postnummeret.
   Seks af dem har to annoncer (samme mand, to maskiner). Det er med vilje:
   uden dem findes sælgerprofilen med mere end ét kort ikke i demoen. */
const DEMO_PRIVATE = [
  { key: 'p01', name: 'Mikkel Jensen',       city: 'Vejle',        postnr: '7100', region: 'Syddanmark',  memberSince: 2019 },
  { key: 'p02', name: 'Anders Hansen',       city: 'Hillerød',     postnr: '3400', region: 'Hovedstaden', memberSince: 2017 },
  { key: 'p03', name: 'Jonas Pedersen',      city: 'Aarhus C',     postnr: '8000', region: 'Midtjylland', memberSince: 2022 },
  { key: 'p04', name: 'Rasmus Nielsen',      city: 'Esbjerg',      postnr: '6700', region: 'Syddanmark',  memberSince: 2020 },
  { key: 'p05', name: 'Kasper Larsen',       city: 'Silkeborg',    postnr: '8600', region: 'Midtjylland', memberSince: 2015 },
  { key: 'p06', name: 'Frederik Sørensen',   city: 'Helsingør',    postnr: '3000', region: 'Hovedstaden', memberSince: 2024 },
  { key: 'p07', name: 'Mathias Christensen', city: 'Randers',      postnr: '8900', region: 'Midtjylland', memberSince: 2018 },
  { key: 'p08', name: 'Christian Andersen',  city: 'Næstved',      postnr: '4700', region: 'Sjælland',    memberSince: 2021 },
  { key: 'p09', name: 'Emil Møller',         city: 'Kolding',      postnr: '6000', region: 'Syddanmark',  memberSince: 2023 },
  { key: 'p10', name: 'Peter Rasmussen',     city: 'Frederiksberg',postnr: '2000', region: 'Hovedstaden', memberSince: 2014 },
  { key: 'p11', name: 'Louise Jensen',       city: 'København V',  postnr: '1620', region: 'Hovedstaden', memberSince: 2020 },
  { key: 'p12', name: 'Camilla Nielsen',     city: 'Odense C',     postnr: '5000', region: 'Syddanmark',  memberSince: 2022 },
  { key: 'p13', name: 'Sofie Hansen',        city: 'Aalborg',      postnr: '9000', region: 'Nordjylland', memberSince: 2019 },
  { key: 'p14', name: 'Ida Pedersen',        city: 'Herning',      postnr: '7400', region: 'Midtjylland', memberSince: 2025 },
  { key: 'p15', name: 'Mette Larsen',        city: 'Slagelse',     postnr: '4200', region: 'Sjælland',    memberSince: 2016 },
  { key: 'p16', name: 'Nikolaj Sørensen',    city: 'Hjørring',     postnr: '9800', region: 'Nordjylland', memberSince: 2021 },
  { key: 'p17', name: 'Thomas Andersen',     city: 'Viborg',       postnr: '8800', region: 'Midtjylland', memberSince: 2018 },
  { key: 'p18', name: 'Lars Christensen',    city: 'Nykøbing F',   postnr: '4800', region: 'Sjælland',    memberSince: 2017 },
  { key: 'p19', name: 'Jonas Møller',        city: 'Frederikshavn',postnr: '9900', region: 'Nordjylland', memberSince: 2023 },
  { key: 'p20', name: 'Kasper Rasmussen',    city: 'Roskilde',     postnr: '4000', region: 'Sjælland',    memberSince: 2020 },
  { key: 'p21', name: 'Mette Jensen',        city: 'København N',  postnr: '2200', region: 'Hovedstaden', memberSince: 2024 },
  { key: 'p22', name: 'Emil Hansen',         city: 'Sønderborg',   postnr: '6400', region: 'Syddanmark',  memberSince: 2016 },
  { key: 'p23', name: 'Ida Nielsen',         city: 'Aarhus C',     postnr: '8000', region: 'Midtjylland', memberSince: 2021 },
  { key: 'p24', name: 'Peter Larsen',        city: 'Vejle',        postnr: '7100', region: 'Syddanmark',  memberSince: 2015 },
];

const DEMO_SAELGERE = new Map(
  [...DEMO_DEALERS.map(d => ({ ...d, isDealer: true })),
   ...DEMO_PRIVATE.map(p => ({ ...p, isDealer: false }))].map(s => [s.key, s]));

function seededRandom(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function buildListings(){
  const rnd = seededRandom(20260726);
  const listings = [];
  const now = new Date('2026-07-26T09:00:00');
  let id = 1001;

  /* ÉN sælger pr. navn — ikke ét sælgerobjekt pr. annonce.

     Her blev der før bygget et friskt seller-objekt inde i løkken for HVER
     annonce, også når navnet var det samme. Sælgernavnene blev trukket fra to
     små lister (seks forhandlere, atten fornavne), så gengangere ikke var en
     mulighed men en given ting: målt 9 af 37 demosælgere havde to eller flere
     annoncer, og alle 9 modsagde sig selv. "Motorcykel Centret ApS" stod
     som Frederikshavn / medlem siden 2024 / CVR 37063717 på annonce 1017 og
     som Vejle / medlem siden 2019 / CVR 60996224 på annonce 1001 — og
     forhandler.html viser den FØRSTE annonces sælger (hentSaelgerLokalt i
     js/forhandler.js), så profilen sagde Vejle/2019 om den mand, annoncen
     lige havde kaldt Frederikshavn/2024. Ét klik, to identiteter.

     Sælgeren er nu slået op på en nøgle i DEMO_SAELGERE i stedet for at blive
     trukket tilfældigt, så gengangeren er noget, tabellen BESTEMMER — seks
     private sælgere har med vilje to annoncer hver. Byen kommer fra sælgerens
     række, ikke fra annoncens: en forhandler er én butik ét sted, og hans
     annoncer står, hvor han står.

     Kun `createdAt` er tilfældig nu. Alt, en køber kan efterprøve, står i
     DEMO_LAGER. */
  const saelgere = new Map();

  for (const [brand, model, year, km, ccm, type, hk, price, condition, saelgerKey] of DEMO_LAGER){
    const profil = DEMO_SAELGERE.get(saelgerKey);

    /* Kendt navn = kendt sælger. Den første annonce definerer identiteten;
       de følgende låner den, i stedet for at opfinde en ny mand med samme
       navn. Ét sælgerobjekt betyder også, at ændrer man ham ét sted,
       ændrer han sig alle steder — det var netop dét, der manglede.
       Sælgerobjektet bærer kun de fire felter, en side faktisk viser:
       navn, type, by og medlemsår. Se noten over DEMO_DEALERS for de fem,
       der er væk (cvr, phone og de tre verificeringsflag). */
    let saelger = saelgere.get(profil.name);
    if (!saelger){
      saelger = { name: profil.name, isDealer: profil.isDealer, city: profil.city, memberSince: profil.memberSince };
      saelgere.set(profil.name, saelger);
    }

    /* Kun datoen er tilfældig nu. Alt, en køber kan efterprøve — hk, pris,
       stand, by — står i tabellen. Spredningen er 0-62 dage, så både
       "i dag" og "2 måneder siden" findes i lageret. */
    const daysAgo = Math.floor(rnd() * 62);
    const created = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(rnd()*80000000));

    /* Registrering og afgift FØLGER af de to felter ovenfor i stedet for at
       blive kastet med terninger. Før kunne en crossmaskine være
       "Indregistreret" og en projektmotorcykel have betalt afgift; nu kan de
       ikke. En banemaskine er ikke indregistreret, og et projekt, der ikke
       kan starte, står afmeldt — det er dét, "Afmeldt" betyder. */
    const registration = type === 'cross' ? 'Ikke indregistreret (bane/off-road)'
      : condition === 'Defekt/Projekt' ? 'Afmeldt'
      : 'Indregistreret';
    const afgift = type === 'cross' ? 'Ikke relevant (ikke indregistreret)'
      : registration === 'Afmeldt' ? 'Ikke betalt'
      : 'Betalt';

    listings.push({
      id: id++,
      brand, model, type, year, km, ccm,
      /* null er "Ikke oplyst", ikke nul. Syv annoncer har det med vilje —
         se noten over DEMO_LAGER. formatPower() og koerekortForListing()
         kender begge svaret i forvejen. */
      power: hk,
      price,
      condition,
      city: profil.city, postnr: profil.postnr, region: profil.region,
      createdAt: created.toISOString(),
      isDealer: profil.isDealer,
      seller: saelger,
      registration,
      afgift,
      description: byggBeskrivelse({ brand, model, year, km, type, condition, hk, isDealer: profil.isDealer }, listings.length),
      /* `photos: 4 + rnd()*4` er væk. Ingen af de 51 annoncer har ét eneste
         foto (`photoUrls` er tom), så tallet var en påstand om billeder, der
         ikke findes — og det var netop dét tal, galleriet tegnede fire tomme
         miniaturer efter, indtil js/annonce.js holdt op med at læse det. */
    });
  }
  return listings;
}

/* ============ DEMO_LAGER — de 51 annoncer ============

   HVAD DER VAR GALT: tre af kolonnerne blev REGNET UD, og alle tre regnede
   forkert på maskiner, en dansk motorcyklist kender udenad.

   1. HESTEKRÆFTER kom fra `estimatePower(ccm, type, year, brand)` — ccm gange
      en faktor pr. type. En formel kan ikke kende forskel på en Royal Enfield
      Himalayan og en Suzuki GSX-R750, og det viste sig: Himalayanen stod til
      46 hk (fabrikken siger 24, altså 92 % for meget) og GSX-R750'eren til
      113 (fabrikken siger 148). Målt mod fabrikanternes egne datablade afveg
      5 af 51 med over 40 %, og 14 med over 20 %. Ét forkert hk-tal koster
      ikke bare det tal: det er også kørekortkategorien, siden udleder af det,
      og kategorien er vores ene strukturelle fordel (GAPS.md, gap 1).
      Nu står fabrikkens tal i tabellen. En formel gætter; en tabel kan slås op.

   2. PRISEN kom fra `estimatePrice()`, som endte i `Math.max(price, 12000)`.
      Otte vidt forskellige motorcykler ramte gulvet og kostede derfor NØJAGTIG
      12.000 kr. — en Nimbus Type C fra 1968, en Vespa GTS 300, en Burgman 400
      og fem til. Et gulv er ikke en pris, det er en formel, der er løbet tør.

   3. STANDEN blev kastet med `pick(CONDITIONS)` uafhængigt af prisen, så en
      "Defekt/Projekt" kunne koste det samme som en "Som ny".

   NU: alle tre kolonner står her, sat efter den enkelte maskine, og de er
   afstemt indbyrdes — et projekt er billigt, en "Som ny" er dyr, og prisen
   ligger i det spænd, den model faktisk handles til i Danmark.

   `hk = null` betyder IKKE OPLYST, og de syv er valgt med grund:
     - de tre konkurrencemaskiner (Honda CRF450R, KTM 450 SX-F, Husqvarna
       FE 501). Fabrikanterne opgiver ikke effekt på dem. Et tal her ville
       være opfundet, uanset hvor rigtigt det lød.
     - fire private annoncer, hvor feltet er efterladt tomt. `f-power` i
       opret-annonce.html er det ENESTE af de her felter uden `required`, så
       det er præcis den tomme tilstand, formularen selv tillader — og den,
       alle 332 indekserede annoncer står i. Uden dem fandtes "Ikke oplyst"
       ikke ét sted i demoen, og så kunne hverken formatPower(),
       koerekortForListing() eller uoplystTekst() på forsiden ses i arbejde.

   Kolonner: mærke, model, årgang, km, ccm, type, hk, pris, stand, sælger.
   Sælgernøglen slår op i DEMO_SAELGERE — byen kommer DERFRA, aldrig herfra. */
const DEMO_LAGER = [
  ['Yamaha','MT-09',2022,14200,890,'naked',119,99900,'God stand','d1'],
  ['Yamaha','YZF-R6',2019,21500,599,'sport',118,79900,'God stand','p01'],
  ['Yamaha','Ténéré 700',2021,9800,689,'adventure',73,84900,'Som ny','d0'],
  ['Yamaha','XSR700',2020,17400,689,'classic',null,57900,'Brugt','p02'],
  ['Yamaha','Tracer 9 GT',2023,6200,890,'touring',119,129900,'Som ny','d1'],
  ['Yamaha','NMAX 125',2022,4100,125,'scooter',12,24900,'God stand','p03'],
  ['Honda','CB650R',2021,11300,649,'naked',95,72900,'God stand','d2'],
  ['Honda','CBR600RR',2018,28900,599,'sport',120,34900,'Defekt/Projekt','p04'],
  ['Honda','Africa Twin',2020,23100,1084,'adventure',102,94900,'God stand','d0'],
  ['Honda','Rebel 500',2022,5400,471,'cruiser',46,59900,'Som ny','d4'],
  ['Honda','Forza 350',2023,3200,330,'scooter',29,46900,'Som ny','d4'],
  ['Honda','CRF450R',2023,410,449,'cross',null,54000,'Som ny','p05'],
  ['Kawasaki','Ninja 650',2020,15600,649,'sport',68,59900,'God stand','p06'],
  ['Kawasaki','Z900',2022,9700,948,'naked',125,94500,'Som ny','d1'],
  ['Kawasaki','Versys 650',2019,31200,649,'adventure',null,47500,'Brugt','p07'],
  ['Kawasaki','Vulcan S',2021,8900,649,'cruiser',61,62000,'God stand','p08'],
  ['Suzuki','GSX-R750',2017,34500,750,'sport',148,62900,'Brugt','p09'],
  ['Suzuki','V-Strom 650',2019,26800,645,'adventure',71,52900,'Brugt','p10'],
  ['Suzuki','SV650',2021,10200,645,'naked',76,61900,'God stand','d2'],
  ['Suzuki','Burgman 400',2018,42000,400,'scooter',null,26900,'Brugt','p11'],
  ['BMW','R 1250 GS Adventure',2022,18400,1254,'adventure',136,159000,'God stand','d0'],
  ['BMW','S 1000 RR',2021,8700,999,'sport',207,164900,'Som ny','d4'],
  ['BMW','R nineT',2019,15300,1170,'classic',110,97900,'God stand','p12'],
  ['BMW','F 850 GS',2020,21100,853,'adventure',95,82900,'God stand','p13'],
  ['BMW','C 400 X',2021,7600,350,'scooter',34,52900,'God stand','d5'],
  ['Ducati','Monster 937',2023,3400,937,'naked',111,119900,'Som ny','d1'],
  ['Ducati','Panigale V2',2021,6900,955,'sport',155,144900,'God stand','d4'],
  ['Ducati','Scrambler 800',2019,12700,803,'classic',null,69900,'God stand','p14'],
  ['KTM','Duke 890',2022,7300,889,'naked',115,92900,'God stand','d3'],
  ['KTM','1290 Super Adventure',2020,19800,1301,'adventure',160,114900,'God stand','p15'],
  ['KTM','450 SX-F',2023,180,450,'cross',null,63500,'Som ny','p05'],
  ['KTM','RC 390',2021,9100,373,'sport',44,44900,'God stand','d3'],
  ['Triumph','Street Triple 765',2021,10800,765,'naked',123,89900,'God stand','p16'],
  ['Triumph','Bonneville T120',2019,13200,1200,'classic',80,87500,'God stand','d2'],
  ['Triumph','Tiger 900',2022,14600,888,'adventure',95,104900,'God stand','d2'],
  ['Harley-Davidson','Iron 883',2018,19300,883,'cruiser',52,67900,'God stand','p17'],
  ['Harley-Davidson','Street Bob',2020,15100,1746,'cruiser',86,127500,'God stand','d4'],
  ['Harley-Davidson','Road King',2017,45200,1746,'touring',null,98000,'Brugt','p17'],
  ['Aprilia','RS 660',2022,6100,659,'sport',100,93500,'Som ny','d3'],
  ['Aprilia','Tuono V4',2020,13400,1077,'naked',175,124900,'God stand','p18'],
  ['Husqvarna','Svartpilen 401',2021,8200,373,'naked',44,42900,'God stand','p19'],
  ['Husqvarna','FE 501',2022,950,501,'cross',null,74900,'Som ny','p19'],
  ['Royal Enfield','Classic 350',2022,6800,349,'classic',20,36900,'God stand','d5'],
  ['Royal Enfield','Himalayan',2021,12300,411,'adventure',24,38900,'God stand','p20'],
  ['Royal Enfield','Interceptor 650',2020,9600,648,'classic',47,49900,'God stand','p21'],
  ['Vespa','Primavera 125',2021,5200,125,'scooter',12,31900,'God stand','p22'],
  ['Vespa','GTS 300',2019,14800,278,'scooter',24,33900,'Brugt','p22'],
  ['Piaggio','Liberty 125',2020,9800,125,'scooter',11,14900,'Brugt','p23'],
  // Veteranerne: to maskiner, hvor tallene er kendte og ingen formel duer.
  // Nimbussen yder 22 hk af 750 cm³, MZ'en 21 af 250 — en faktor tre til
  // forskel pr. ccm. Prisen på Nimbussen er heller ikke et afskrivningstal;
  // en Type C i god stand er steget, ikke faldet.
  ['Nimbus','Type C "Kakkelovnsrøret"',1968,38000,750,'classic',22,78000,'God stand','p24'],
  ['MZ','ETZ 251',1985,52000,250,'classic',21,6500,'Defekt/Projekt','p24'],
  ['Peugeot','Django 125',2022,3900,125,'scooter',11,22900,'Som ny','p01'],
];

/* ============ Beskrivelserne ============

   HVAD DER VAR GALT: `buildDescription()` skrev den SAMME tekst på alle 51.
   Kun første linje (mærke, model, årgang, stand) skiftede; de to næste
   afsnit var ordret ens hver eneste gang:

     "Motorcyklen har været velholdt og serviceeftervist gennem hele
      ejerperioden. Nye dæk og bremseklodser ... Ingen kendte fejl eller
      mangler ... perfekt til både dagligt brug og længere ture."

   Målt: 51 af 51 indeholdt sætningen. To steder modsagde den annoncens egne
   felter direkte — annonce 1050 stod med STAND: Defekt/Projekt over "Ingen
   kendte fejl eller mangler", og en Nimbus fra 1968 blev anbefalet til
   "dagligt brug". En beskrivelse, der modsiger specifikationstabellen på
   samme skærm, gør begge dele utroværdige.

   NU bygges teksten af annoncens egne felter: standen bestemmer, hvad der
   må stå om maskinens tilstand, typen og årgangen bestemmer, hvad den er
   blevet brugt til, og sælgertypen bestemmer slutlinjen. Ingen sætning kan
   nå frem til en annonce, hvis felter modsiger den — pools'ene er slået op
   PÅ `condition` og `type`, ikke valgt frit.

   Tre længder med vilje, ikke tre af pænhed: `annonceOplysthed()` i
   js/search.js giver point for en beskrivelse over 80 tegn, og forsidens og
   søgesidens rangering bygger på det. Havde hver eneste demoannonce en fed
   tekst, ville reglen aldrig kunne ses arbejde — og en markedsplads, hvor
   ingen sælger nøjes med "Sælges. Kom og se den", findes ikke. */
const BESKRIVELSE_STAND = {
  'Som ny': [
    'Står som ny. Den har kun kørt sommeren over og har altid stået tørt.',
    'Fremstår uden brugsspor. Alt er originalt, og der er intet skiftet.',
    'Kørt meget lidt siden ny. Der er ikke en skramme på den.',
  ],
  'God stand': [
    'Pæn og velholdt med almindelige brugsspor. Et par småridser i lakken.',
    'Serviceret efter bogen, og dækkene er skiftet inden for det seneste år.',
    'Kører fint og starter i første forsøg. Et enkelt stenslag i skærmen.',
    'Har stået inde om vinteren. Ingen kendte fejl, men ny er den ikke længere.',
  ],
  'Brugt': [
    'Brugt maskine med patina. Alt virker, men lakken er slidt flere steder.',
    'Den har kørt en del og bærer præg af det. Mekanisk er den i orden.',
    'Slidt, men den har været i daglig brug indtil nu og fejler ikke noget.',
    'Kilometerne kan ses. Bremser og dæk er skiftet, resten er som det er.',
  ],
  'Defekt/Projekt': [
    'Sælges som projekt. Den starter ikke, og jeg er ikke kommet videre med den.',
    'Har været væltet. Kåben er ridset og styret er skævt — den skal repareres, før den kan synes igen.',
  ],
};

/* Brugen skal passe til maskinen OG til dens alder. Derfor er `classic`
   delt: en Bonneville fra 2019 og en Nimbus fra 1968 er ikke det samme
   spørgsmål, og kun den ene af dem kan anbefales til daglig kørsel. */
const BESKRIVELSE_BRUG = {
  sport:     ['Den er kørt på landevej, ikke på bane.', 'Bruges om sommeren i weekenderne.'],
  naked:     ['Nem at have med at gøre i trafikken og let at parkere.', 'God til pendling og en tur ud af byen om søndagen.'],
  touring:   ['Den har været med på to ferier syd for grænsen.', 'Bygget til lange dage i sadlen, og det er dét, den har lavet.'],
  adventure: ['Har mest kørt asfalt og lidt grusvej.', 'Brugt til landevej og et par ture på grus.'],
  cruiser:   ['Kørt stille og roligt, mest om sommeren.', 'Rolig at køre, og den lyder som den skal.'],
  classic:   ['Kørt om sommeren og opbevaret tørt om vinteren.', 'Klassiker, der bliver kørt — ikke stillet op.'],
  veteran:   ['Veteran. Den skal køres som det, den er, og ikke som en moderne maskine.', 'Den kører, men reservedele skal findes, hvor de nu findes.'],
  scooter:   ['Har været brugt til pendling i byen.', 'Kørt til og fra arbejde, aldrig langt ad gangen.'],
  cross:     ['Banemaskine, aldrig indregistreret. Fabrikanten opgiver ingen hestekræfter på den her model.', 'Kun kørt på lukket bane.'],
};

const BESKRIVELSE_SLUT_FORHANDLER = [
  'Står i butikken og kan ses efter aftale. Vi tager gerne din nuværende motorcykel i bytte.',
  'Kan ses i åbningstiden. Vi hjælper med indregistrering og finansiering.',
  'Klargjort på vores eget værksted, før den kom på gulvet.',
];

/* Ingen af slutlinjerne beder køberen om at ringe. Der står ikke et
   telefonnummer nogen steder i demolageret (se noten over DEMO_DEALERS), og
   en opfordring til at ringe ville pege på en knap, siden ikke har. */
const BESKRIVELSE_SLUT_PRIVAT = [
  'Fremvises efter aftale. Skriv, hvis du vil vide mere.',
  'Skriv gerne, hvis du vil se den eller har spørgsmål.',
  'Kom og se den. Prøvetur efter aftale.',
  'Sælges, fordi jeg har købt noget andet. Skriv, hvis du er interesseret.',
];

/* De helt korte. En markedsplads uden dem findes ikke, og de er den eneste
   måde at se `annonceOplysthed()`s 80-tegnsregel arbejde på. */
const BESKRIVELSE_KORT = [
  'Sælges. Kom og se den.',
  'Står klar til afhentning. Skriv for en aftale.',
  'Skal væk. Kom med et bud.',
];

function byggBeskrivelse(l, i){
  const kortNr = i % 17 === 3 ? Math.floor(i / 17) % BESKRIVELSE_KORT.length : -1;
  if (kortNr >= 0) return BESKRIVELSE_KORT[kortNr];

  const aabning = `${l.brand} ${l.model} årgang ${l.year}, ${l.km.toLocaleString('da-DK')} km.`;
  const stand = BESKRIVELSE_STAND[l.condition] || BESKRIVELSE_STAND['God stand'];
  const standLinje = stand[i % stand.length];

  // Kun opslagslinjen på hver femte — samme længde som en rigtig kort annonce.
  if (i % 5 === 1) return `${aabning}\n\n${standLinje}`;

  const brugNoegle = l.type === 'classic' && l.year < 1990 ? 'veteran' : l.type;
  const brug = BESKRIVELSE_BRUG[brugNoegle] || BESKRIVELSE_BRUG.naked;
  const brugLinje = brug[Math.floor(i / 2) % brug.length];
  const slut = l.isDealer ? BESKRIVELSE_SLUT_FORHANDLER : BESKRIVELSE_SLUT_PRIVAT;
  /* 7 og ikke 3: `(i*3) % slut.length` er ALTID 0, når listen har tre
     elementer — og forhandlerlisten har tre. Alle 21 forhandlerannoncer fik
     derfor den samme slutlinje, altså præcis den skabelon, hele omskrivningen
     skulle af med. 7 er primisk til både 3 og 4 og roterer gennem begge. */
  const slutLinje = slut[(i * 7 + 1) % slut.length];

  return `${aabning}\n\n${standLinje} ${brugLinje}\n\n${slutLinje}`;
}

/* Demoannoncerne er slået fra i drift: bikerbasen.dk viser kun rigtige
   annoncer fra databasen. Det skal blive ved med at være sådan — en køber
   må aldrig møde en opdigtet motorcykel.

   På localhost tændes de. Uden lager kan hverken design, søgning, filtre
   eller sammenligningen mod Bilbasen vurderes: en tom skærm taber altid.
   Byggescripterne kører i Node uden `location` og får derfor false, så de
   genererede sider og sitemap aldrig kommer til at indeholde demodata. */
const SHOW_DEMO_DATA = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

const LISTINGS = SHOW_DEMO_DATA ? buildListings() : [];

/* ============ Formatting helpers (Danish) ============ */
/* Null betyder "ikke oplyst", ikke nul.

   Egne annoncer har altid pris, årgang og km — formularen kræver dem. De
   indekserede har ikke: en forhandler, der ikke skriver prisen, efterlader
   feltet tomt, og normalize.js returnerer null frem for at gætte.

   Uden det her gardin kastede formatPrice(null), og fejlen ramte ikke kun
   det ene kort — den stoppede hele render-løkken, så en side med 383
   annoncer viste to. Den slags fejl ligner et tomt katalog, ikke en
   undtagelse. */
function formatPrice(n){
  return n == null ? 'Pris ikke oplyst' : n.toLocaleString('da-DK') + ' kr.';
}
function formatKm(n){
  return n == null ? 'Km ikke oplyst' : n.toLocaleString('da-DK') + ' km';
}
/* De to her sagde "— ccm" og "—", mens naboerne tre linjer oppe sagde
   "Pris ikke oplyst" og "Km ikke oplyst" om nøjagtig det samme tomrum. På
   annoncesidens specifikationstabel stod alle fire under hinanden, så den
   samme mangel havde tre skrivemåder i én tabel — og en tankestreg er
   desuden ikke et svar, den er en manglende sætning. Den låste regel i
   work/DECISIONS.md ("Ærlighed slår fuldstændighed") navngiver ordet:
   "Ikke oplyst". `formatPrice` og `formatKm` beholder deres feltnavn, fordi
   de også bruges alene på et kort, hvor der ikke står nogen etiket ved
   siden af — disse to gør ikke. */
function formatCcm(n){
  return n == null ? 'Ikke oplyst' : n.toLocaleString('da-DK') + ' ccm';
}
function formatPower(hk){
  return hk ? hk + ' hk' : 'Ikke oplyst';
}
function timeAgoDa(iso){
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days === 0) return hours <= 0 ? 'i dag' : `i dag, ${hours} t.`;
  if (days === 1) return 'i går';
  // "for 2 uger siden" er ordret "2 weeks ago". Paa en dansk annonceside
  // staar der "2 uger siden" — det lille "for" afsloerer oversaettelsen.
  if (days < 7) return `${days} dage siden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} ${weeks===1?'uge':'uger'} siden`;
  const months = Math.floor(days / 30);
  return `${months} ${months===1?'måned':'måneder'} siden`;
}
function isNewListing(iso){
  const then = new Date(iso).getTime();
  const now = Date.now();
  return (now - then) >= 0 && (now - then) < 4 * 86400000;
}
function typeLabel(id){
  return (TYPES.find(t=>t.id===id) || {}).label || id;
}

/* ============ Kørekortkategorier ============
   Kilde: Færdselsstyrelsen, "Kørekort til motorcykel".
     A1  maks. 125 cm³, maks. 11 kW (15 hk), maks. 0,1 kW/kg — fra 18 år
     A2  maks. 35 kW (47 hk), maks. 0,2 kW/kg, ikke afledt af mc med
         mere end dobbelt effekt — fra 20 år
     A   ingen effektbegrænsning — fra 24 år

   HER STOD 48 HK, OG DET VAR EN HK FOR MEGET.
   Loven er skrevet i kilowatt, ikke i hestekræfter: A2 er 35 kW. Regnestykket
   er 35 / 0,7355 = 47,59 hk, og 48 blev valgt ved at runde OP. Men 48 hk er
   35,30 kW — over loftet. En Harley-Davidson Iron 883 med 48 hk oplyst stod
   derfor med "Kørekort A2" på kortet, og det er ikke lovligt for en tyveårig.
   Opad afrunding er den forkerte retning, når tallet er en grænse: 47 hk er
   34,57 kW og ligger sikkert under.

   A1's 15 hk er derimod rigtig. 11 kW er 14,96 hk, så 15 er den samme grænse
   skrevet i hele tal — og det er også det tal, en dansk køber genkender.

   BEMÆRK, at effekten kun er den ene af to grænser. A2 kræver også maks.
   0,2 kW/kg køreklar vægt, og at mc'en ikke er afledt af en model med over
   dobbelt effekt. Ingen af delene står i en annonce, så vi kan aldrig love
   at en mc ER A2 — kun at den ikke er udelukket på effekt.

   VIGTIGT: A2 har INGEN slagvolumengrænse. Filtrering på ccm ville være
   forkert og kunne få en køber til at tro, at en for kraftig mc var lovlig.

   Vi kan kun filtrere på effekt. Forholdet kW/kg kræver køreklar vægt, som
   annoncerne ikke indeholder, og en mc kan være en *begrænset* udgave af en
   kraftigere model. Derfor er filteret en vejledning, ikke en garanti —
   det siger UI'et også eksplicit. */
const KOEREKORT = [
  { id: 'A1', label: 'A1 (lille mc)',      hint: 'Maks. 125 cm³ og 15 hk' },
  { id: 'A2', label: 'A2 (mellem mc)',     hint: 'Maks. 35 kW (47 hk)' },
  { id: 'A',  label: 'A (stor mc)',        hint: 'Ingen effektgrænse' },
];

const A1_MAX_HK = 15, A1_MAX_CCM = 125, A2_MAX_HK = 47;

/* Ukendt effekt har mange stavemåder, og de betyder alle det samme:
     null      databasen (eksterne_annoncer.hk er tom for alle 332)
     ""        et tomt formularfelt
     "-"       MC Syds måde at skrive "feltet er tomt"
     "ukendt"  en tekst, Number() gør til NaN
     0         en kilde, der skriver nul i stedet for at lade feltet stå tomt
   0 hk er ikke en oplysning — der findes ikke en motorcykel uden effekt.
   crawler/normalize.js parseHk() afviser den allerede, men annoncer kommer
   også fra databasen og formularen, og det er her, svaret bliver til en
   påstand på skærmen. Derfor ét sted at læse feltet, og ét svar på, hvornår
   vi ikke ved det — de to funktioner nedenfor skal aldrig kunne blive
   uenige om, hvad "ingen hk" betyder. */
function hkEllerNull(power){
  const v = Number(power);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/* Må en mc med denne effekt/slagvolumen føres på det valgte kørekort?
   Et højere kørekort dækker de lavere kategorier. */
/* UKENDT EFFEKT ER IKKE NUL EFFEKT.

   Her stod `Number(listing.power) || 0`. For vores egne annoncer er det
   harmløst — formularen kræver hestekræfter. For de indekserede er det ikke:
   eksterne_annoncer har ingen hk-kolonne, så power er altid null, null bliver
   til 0, og 0 <= 48 er altid sandt.

   Resultatet var, at 214 af 332 indekserede annoncer fik stemplet A2 — heraf
   178 på over 600 ccm. En Honda CBR 1000 F på 989 ccm stod med "Kan føres på
   A2-kørekort". Vi fortalte en tyveårig, at han lovligt måtte køre den.

   Kommentaren ovenfor advarede allerede mod præcis denne fejl: A2 har INGEN
   slagvolumengrænse, så uden effekt kan kategorien ikke afgøres. Nu siger
   koden det samme som kommentaren. */
function passerKoerekort(listing, kat){
  if (!kat) return true;
  const hk = hkEllerNull(listing.power);
  const ccm = Number(listing.ccm) || 0;

  // A1 KAN afgøres uden effekt, fordi den har en ccm-grænse: er slagvolumen
  // over 125, er svaret nej uanset hvor mange hk der står.
  if (kat === 'A1') return ccm > 0 && ccm <= A1_MAX_CCM && (hk == null || hk <= A1_MAX_HK);

  if (kat === 'A2'){
    // En stærkere mc tæller også med, hvis den kan effektbegrænses.
    if (listing.kanNedsaettesA2) return true;
    // Uden effekt kan vi ikke svare. At vise den ville være et løfte om, at
    // den er lovlig — og det er den påstand, der koster kørekortet.
    if (hk == null) return false;
    return hk <= A2_MAX_HK;
  }
  return true; // A dækker alt
}

/* Mindste kørekortkategori en mc kan føres på, udledt af slagvolumen + effekt.
   Returnerer null, når spørgsmålet ikke kan besvares — kortet viser så ingen
   kategori frem for en forkert. */
function koerekortForListing(listing){
  const hk = hkEllerNull(listing.power);
  const ccm = Number(listing.ccm) || 0;
  if (hk == null && !ccm) return null;

  if (ccm > 0 && ccm <= A1_MAX_CCM && (hk == null || hk <= A1_MAX_HK)) return 'A1';
  if (hk == null) return null;   // over 125 ccm og uden hk: A2 eller A, vi ved det ikke
  if (hk <= A2_MAX_HK) return 'A2';
  return 'A';
}

/* ============ Udstyr og teknik ============
   123mc lader dig filtrere på ~40 udstyrspunkter, farve, brændstof, træktype
   og cylinderantal. Det er dér de vinder på købere der ved hvad de leder
   efter — "MT-07 med quickshifter og varmehåndtag" kan ikke søges hos os
   uden det her.

   Listen er trimmet til det, der reelt afgør et køb på en motorcykel, og
   grupperet så feltet i opret-annonce ikke bliver en mur af checkbokse. */
const EQUIPMENT_GROUPS = [
  { group: 'Sikkerhed og elektronik', items: [
    { id: 'abs',        label: 'ABS-bremser' },
    { id: 'corner-abs', label: 'Kurve-ABS' },
    { id: 'tcs',        label: 'Traction control' },
    { id: 'koreprogrammer', label: 'Køreprogrammer' },
    { id: 'quickshifter',   label: 'Quickshifter' },
    { id: 'slipperkobling', label: 'Slipperkobling' },
    { id: 'el-affjedring',  label: 'Elektronisk affjedring' },
    { id: 'gearindikator',  label: 'Gearindikator' },
  ]},
  { group: 'Komfort', items: [
    { id: 'varmehandtag', label: 'Varmehåndtag' },
    { id: 'saedevarme',   label: 'Sædevarme' },
    { id: 'fartpilot',    label: 'Fartpilot' },
    { id: 'vindskaerm',   label: 'Vindskærm' },
    { id: 'fuldkaabe',    label: 'Fuldkåbe' },
    { id: 'halvkaabe',    label: 'Halvkåbe' },
    { id: 'centralstotteben', label: 'Centralstøtteben' },
  ]},
  { group: 'Instrumenter og forbindelse', items: [
    { id: 'tft',       label: 'TFT-/farvedisplay' },
    { id: 'kurecomputer', label: 'Kørecomputer' },
    { id: 'navigation', label: 'GPS-navigation' },
    { id: 'bluetooth', label: 'Bluetooth / intercom' },
    { id: 'usb',       label: 'USB-udtag' },
    { id: 'keyless',   label: 'Nøglefri betjening' },
    { id: 'led-lys',   label: 'LED-lygter' },
  ]},
  { group: 'Bagage og beskyttelse', items: [
    { id: 'sidetasker', label: 'Sidetasker' },
    { id: 'topboks',    label: 'Topboks' },
    { id: 'tanktaske',  label: 'Tanktaske' },
    { id: 'crashpads',  label: 'Crashpads / styrtbøjler' },
    { id: 'tankbeskytter', label: 'Tankbeskytter' },
    { id: 'sidevogn',   label: 'Sidevogn' },
  ]},
  { group: 'Tyverisikring', items: [
    { id: 'alarm',      label: 'Alarm' },
    { id: 'startspaerre', label: 'Startspærre / immobiliser' },
    { id: 'skivelaas',  label: 'Skivelås' },
  ]},
  { group: 'Historik', items: [
    { id: 'nysynet',    label: 'Nysynet' },
    { id: 'servicebog', label: 'Servicebog følger med' },
    { id: 'en-ejer',    label: 'Kun én ejer' },
    { id: 'garanti',    label: 'Garanti følger med' },
  ]},
];

/* Flad opslagstabel — brugt til at vise labels på annoncesiden. */
const EQUIPMENT = EQUIPMENT_GROUPS.flatMap(g => g.items);
const EQUIPMENT_LABELS = Object.fromEntries(EQUIPMENT.map(e => [e.id, e.label]));

function equipmentLabel(id){
  return EQUIPMENT_LABELS[id] || id;
}

const FUELS = ['Benzin', 'El', 'Hybrid', 'Diesel'];
const DRIVES = ['Kædetræk', 'Kardantræk', 'Remtræk'];
const SERVICE_HISTORIK_OPTIONS = ['Fuld', 'Delvis', 'Ingen', 'Ukendt'];
const CYLINDERS = [1, 2, 3, 4, 6];
const COLORS = [
  'Sort', 'Hvid', 'Grå', 'Sølv', 'Blå', 'Rød', 'Grøn',
  'Gul', 'Orange', 'Brun', 'Bordeaux', 'Guld', 'Flerfarvet',
];

/* Hvor gammel må annoncen være? Bruges af "Oprettet"-filteret. */
const AGE_FILTERS = [
  { id: '1',  label: 'Seneste døgn' },
  { id: '3',  label: 'Seneste 3 dage' },
  { id: '7',  label: 'Seneste uge' },
  { id: '14', label: 'Seneste 14 dage' },
  { id: '30', label: 'Seneste 30 dage' },
];

/* ============ Security / trust helpers ============ */
function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* URL'er, der stammer fra en anden side.

   escapeHTML er ikke nok her. Den forhindrer, at en værdi bryder ud af
   attributten, men "javascript:alert(1)" indeholder ingen af de tegn, den
   erstatter — den ville stå urørt i href og køre ved klik.

   Kilden til de her URL'er er en forhandlers DOM. I dag er den venlig, og
   crawlerens detalje_url_moenster afviser i forvejen alt, der ikke ligner en
   produktside. Men den slags forsvar står ét sted og fjernes en dag af
   nogen, der ikke kender grunden. Skemaet tjekkes derfor dér, hvor linket
   faktisk bliver til et link. */
function sikkerUrl(raa){
  const s = String(raa ?? '').trim();
  if (!/^https?:\/\//i.test(s)) return null;
  try { return new URL(s).href; } catch { return null; }
}

/* Databaseannoncer har uuid som id; demo- og localStorage-annoncer har tal.
   Skellet afgør, om en handling skal ramme Supabase eller browseren. */
function isUuid(v){
  return typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
}


const AFGIFT_STATUSES = ['Betalt', 'Ikke betalt', 'Ikke relevant (ikke indregistreret)'];
const REPORT_REASONS = [
  { id: 'svindel', label: 'Svindel eller bedrageri' },
  { id: 'stjaalet', label: 'Formodet stjålet motorcykel' },
  { id: 'falsk', label: 'Falsk eller vildledende annonce' },
  { id: 'upassende', label: 'Upassende indhold' },
  { id: 'andet', label: 'Andet' },
];

/* ============ "Under markedspris" ============

   HVAD DER VAR GALT (fundet i runde 2). Mærkatet hang på en median over
   annoncens TYPE: alle annoncer med type "classic", alle med "cruiser" og så
   videre. Tre ting fulgte af det, og alle tre gjorde mærkatet til et gæt,
   der blev udgivet som en oplysning:

   1. En type spænder fra 125 til 1800 cm³ og fra 1968 til 2026. Medianen for
      "classic" var 50.000 kr., og en Nimbus Type C fra 1968 til 12.000 kr.
      blev derfor stemplet "Under markedspris". Der findes ikke ÉN anden
      Nimbus i lageret at sammenligne med — vi havde intet grundlag for at
      udtale os om den pris, og gjorde det alligevel.
   2. Årgang indgik slet ikke i beregningen, selvom mærkatets egen
      forklaringstekst lovede "for den type og årgang". Teksten beskrev en
      udregning, der ikke fandtes.
   3. Lageret er 332 forhandlerannoncer (mest nye/næsten nye maskiner til
      listepris) og 51 private brugtannoncer. Median for vores egne er
      64.500 kr., for de indekserede 129.995 kr. — præcis en faktor 2. Med
      en grænse på 45 % af medianen fandt mærkatet derfor ikke svindel; det
      fandt "privat sælger". Alle 11 mærkater på siden sad på ærlige private
      annoncer, og ingen af dem sad på noget mistænkeligt.

   HVAD DER ER GJORT. Sammenligningsgrundlaget er nu samme MÆRKE og MODEL
   inden for et årgangsvindue. En Honda CMX 500 Rebel 2024 måles mod andre
   Honda CMX 500 Rebel fra 2021-2027 — ikke mod en Harley. Findes der færre
   end MIN_SAMPLE_FOR_PRICE_CHECK af dem, siger vi ingenting: en pris uden et
   sammenligningsgrundlag er ikke "for lav", den er bare ukendt. Samme linje
   som verifiedBadgeHTML() i js/components.js, der returnerer tom streng,
   fordi ingen verificering er rigtig endnu.

   Målt på lageret 16. aug. 2026: 88 annoncer har et rigtigt grundlag, og
   NUL af dem ligger under grænsen. Mærkatet er altså ikke slået fra — det
   har bare ikke noget at sige om det lager, vi har. Det virker stadig, dér
   hvor det skal: en planteret annonce til 25 % af medianen for sin egen
   model bliver fanget.

   Mærkatet kan derfor nu bakkes op med et tal, køberen selv kan efterprøve.
   prisSammenligning() giver grundlaget frem, så forklaringsteksten kan sige
   HVAD der er sammenlignet med i stedet for at påstå "markedsniveau". */

/* Mindste antal sammenlignelige annoncer, før en median siger noget.
   Med færre end dette er "billig i forhold til hvad?" ikke et rigtigt spørgsmål. */
const MIN_SAMPLE_FOR_PRICE_CHECK = 5;
/* Hvor mange årgange til hver side der stadig er den samme motorcykel.
   ±3 holder en 2024-model sammen med 2021-2027 og skiller den fra en
   veteran — og det er netop årgangen, der gør en Nimbus fra 1968
   usammenlignelig med alt andet i lageret. */
const PRIS_AARSVINDUE = 3;
/* Hvor langt under medianen prisen skal ligge, før vi siger noget.
   0,45 er uændret fra før — det er GRUNDLAGET, der var forkert, ikke
   grænsen. */
const PRIS_MISTANKE_FAKTOR = 0.45;

/* Grundlaget bag mærkatet, eller null når der ikke er noget at sammenligne
   med. Returnerer { median, antal, aarFra, aarTil }, så den, der tegner
   mærkatet, kan skrive tallene ud i stedet for at påstå et markedsniveau,
   vi ikke kender. */
function prisSammenligning(listing){
  if (!listing || listing.price == null || listing.year == null) return null;
  if (!listing.brand || !listing.model) return null;
  const aarFra = listing.year - PRIS_AARSVINDUE;
  const aarTil = listing.year + PRIS_AARSVINDUE;
  // Bruger alle kendte annoncer (database + evt. demo), ikke kun demodata.
  const kilde = (typeof Store !== 'undefined' && Store.getAllListings) ? Store.getAllListings() : LISTINGS;
  const priser = kilde
    .filter(l => String(l.id) !== String(listing.id)
      // price == null er "ikke oplyst" og ikke "0 kr.". Før røg de med i
      // sorteringen, hvor null sorteres som 0 og trak medianen ned — en
      // udregning forurenet af netop de felter, siden ellers nægter at gætte på.
      && l.price != null && l.year != null
      && l.brand === listing.brand && l.model === listing.model
      && l.year >= aarFra && l.year <= aarTil)
    .map(l => l.price)
    .sort((a, b) => a - b);
  if (priser.length < MIN_SAMPLE_FOR_PRICE_CHECK) return null;
  const mid = Math.floor(priser.length / 2);
  return {
    median: priser.length % 2 ? priser[mid] : (priser[mid-1] + priser[mid]) / 2,
    antal: priser.length,
    aarFra, aarTil,
  };
}

/* Advarer kun når der faktisk er noget at sammenligne med. Et falsk
   "Under markedspris" på en ærlig annonce er værre end ingen advarsel —
   det er en anklage mod sælgeren, som vi ikke kan bakke op. */
function isSuspiciouslyCheap(listing){
  const grundlag = prisSammenligning(listing);
  return grundlag != null && listing.price < grundlag.median * PRIS_MISTANKE_FAKTOR;
}

/* Demoanmeldelser, holdt adskilt fra de anmeldelser, en session selv lægger
   i localStorage.

   To ting var galt med dem, og begge fik siden til at vise et tal, køberen
   ikke kunne regne efter:

   1) Karaktererne var HALVE stjerner (`Math.round((3.5 + rnd()*1.5)*2)/2`
      gav 3,5 / 4 / 4,5 / 5). Ingen bruger kan afgive en halv stjerne —
      stjernevælgeren giver 1-5, og `db.addReview()` sender et helt tal. En
      demoværdi, systemet aldrig selv kan frembringe, er en løgn om systemet.
      Værre: stjernerækken kunne kun tegne hele stjerner og rundede OP, så en
      anmeldelse på 4,5 stod med fem fyldte stjerner. Gennemsnittet var
      regnet rigtigt hele tiden — det var BILLEDERNE, der løj, og derfor så
      "4,5 af 1 anmeldelse" og "3,8 af 2" umulige ud.

   2) Alle sælgere havde mindst én anmeldelse (1-4). Så den tomme tilstand —
      dén, hver eneste rigtige profil i databasen står i — kunne ikke ses
      nogen steder i demoen. Nu er spændet 0-6, så alle tre tilstande findes:
      ingen anmeldelser, under grænsen for et gennemsnit, og over den.

   3) STJERNERNE OG TEKSTEN VAR TO UAFHÆNGIGE TRÆK. `rating` blev kastet for
      sig (3-5) og `comment` for sig, ud af seks sætninger. Målt på det gamle
      lager: 32 af 97 anmeldelser modsagde sig selv — "Meget tilfreds,
      motorcyklen var i bedre stand end forventet" stod med tre stjerner, og
      "Lidt langsom til at svare" stod med fem. En bedømmelse, hvor tallet og
      teksten peger hver sin vej, er værre end ingen bedømmelse: køberen kan
      ikke afgøre, hvilken af de to der er sælgeren.
      KARAKTEREN HØRER NU TIL SÆTNINGEN. De står som ét par i tabellen
      nedenfor, og der findes ingen kodesti, hvor de kan komme fra hinanden.

   4) SEKS SÆTNINGER TIL 97 ANMELDELSER. Den samme sætning stod ordret op til
      21 gange, og på 16 profiler stod den samme tekst mere end én gang under
      hinanden på SAMME side. Puljen er nu 16 sætninger, og hver sælger
      trækker UDEN tilbagelægning, så en profil aldrig gentager sig selv.

   5) KUN ROS. Alle karakterer lå mellem 3 og 5, og alle seks sætninger var
      positive. Et demolager uden en eneste utilfreds køber viser ikke, hvad
      siden gør ved en dårlig anmeldelse — og en profil med lutter firere og
      femmere er præcis det, en køber holder op med at tro på. Puljen dækker
      nu 1-5. Den er stadig vægtet positivt (ros trækkes tre gange så ofte som
      kritik), fordi det er sådan et rigtigt anmeldelseslager ser ud. */

/* Karakter og tekst i ét par. `vaegt` er, hvor mange gange sætningen ligger i
   trækposen — ikke en påstand om noget, kun demolagerets fordeling. */
const DEMO_ANMELDELSER = [
  { rating: 5, vaegt: 2, tekst: 'Nem handel. Motorcyklen var præcis som beskrevet, og papirerne var i orden.' },
  { rating: 5, vaegt: 2, tekst: 'God kommunikation hele vejen. Han holdt den, til jeg kunne komme og hente den.' },
  { rating: 5, vaegt: 2, tekst: 'Fair pris og ingen overraskelser. Kan varmt anbefales.' },
  { rating: 5, vaegt: 2, tekst: 'Tog sig tid til at vise mig det hele og svarede ærligt på det, jeg spurgte om.' },
  { rating: 5, vaegt: 2, tekst: 'Kørte fra Sjælland til Jylland efter den, og det var turen værd. Alt passede.' },
  { rating: 5, vaegt: 2, tekst: 'Hjalp med at få den på traileren og gav servicehistorikken med på skrift.' },
  { rating: 5, vaegt: 2, tekst: 'Første gang jeg køber motorcykel, og han forklarede tålmodigt det hele.' },
  { rating: 5, vaegt: 2, tekst: 'Ærlig handel. Han sagde selv, hvad der skal laves til foråret.' },
  { rating: 4, vaegt: 2, tekst: 'God handel. Der var lidt flere ridser end forventet, men det blev vi enige om prisen på.' },
  { rating: 4, vaegt: 2, tekst: 'Alt gik, som det skulle. Lidt ventetid på papirerne, ellers intet at klage over.' },
  { rating: 4, vaegt: 2, tekst: 'Rar at handle med. Der manglede en nøgle, som han eftersendte et par dage efter.' },
  { rating: 4, vaegt: 2, tekst: 'Ærlig omkring standen, så jeg vidste, hvad jeg kom efter.' },
  { rating: 4, vaegt: 2, tekst: 'Fin motorcykel til pengene. Dækkene var mere slidte, end jeg havde regnet med.' },
  { rating: 4, vaegt: 2, tekst: 'Hurtigt svar og en ordentlig handel. Batteriet var dødt, da jeg kom, men det tog han af prisen.' },
  { rating: 3, vaegt: 2, tekst: 'Handlen gik fint, men han var langsom til at svare på beskeder.' },
  { rating: 3, vaegt: 2, tekst: 'Motorcyklen var i orden. Fremvisningen blev flyttet to gange, og det kostede mig en fridag.' },
  { rating: 3, vaegt: 2, tekst: 'Hverken godt eller skidt. Den var som beskrevet, men servicebogen manglede.' },
  { rating: 3, vaegt: 2, tekst: 'Den kørte, som han sagde. Til gengæld var den ikke rengjort, og der var olie under motoren.' },
  { rating: 2, vaegt: 1, tekst: 'Kilometerstanden passede ikke med servicebogen. Det burde have stået i annoncen.' },
  { rating: 2, vaegt: 1, tekst: 'Jeg kørte langt efter den, og den var ikke i den stand, annoncen lovede.' },
  { rating: 2, vaegt: 1, tekst: 'Prisen blev sat op, da jeg stod der. Det gik jeg ikke med til.' },
  { rating: 1, vaegt: 1, tekst: 'Aftalt tid og sted, og så dukkede han ikke op. Svarede heller ikke bagefter.' },
  { rating: 1, vaegt: 1, tekst: 'Annoncen passede ikke på den motorcykel, der stod i garagen. Spildt tur.' },
];

const SEED_REVIEWS = (function(){
  const rnd = seededRandom(4471);

  /* Trækposen: én plads pr. vægt, så fordelingen af stjerner ligger i data og
     ikke i koden. 41 kort til ~100 anmeldelser.

     KORTSPIL, IKKE TERNINGKAST. Med `pose[Math.floor(rnd()*pose.length)]` er
     hvert træk uafhængigt, og så samler gentagelserne sig: målt stod ÉN
     sætning 12 gange i lageret, mens andre stod 3. En besøgende, der klikker
     tre profiler igennem, møder altså den samme sætning igen og igen — og det
     er nøjagtig sådan, man opdager, at anmeldelserne er genereret.
     Posen blandes derfor og deles ud som kort. Først når den er tom, blandes
     den igen. Så bruges hver sætning lige mange gange (±1 pr. runde), og den
     hyppigste falder fra 12 til det, matematikken tillader. */
  const bland = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--){
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pose = DEMO_ANMELDELSER.flatMap((a, i) => Array(a.vaegt).fill(i));
  let bunke = bland(pose), naeste = 0;
  const traek = () => {
    if (naeste >= bunke.length){ bunke = bland(pose); naeste = 0; }
    return bunke[naeste++];
  };

  const out = {};
  const names = [...new Set(LISTINGS.map(l => l.seller.name))];
  names.forEach(name => {
    const n = Math.floor(rnd() * 7);
    /* Uden gentagelse PR. SÆLGER. To profiler må gerne dele en sætning — to
       købere kan sagtens skrive det samme om hver sin handel — men den samme
       sætning to gange under hinanden på ÉN side afslører generatoren med det
       samme. Det gjorde den på 16 af 37 profiler. */
    const brugt = new Set();
    const anmeldelser = [];
    let forsoeg = 0;
    while (anmeldelser.length < n && forsoeg < 200){
      forsoeg++;
      const idx = traek();
      if (brugt.has(idx)) continue;
      brugt.add(idx);
      const kilde = DEMO_ANMELDELSER[idx];
      anmeldelser.push({
        author: `${FIRST_NAMES[Math.floor(rnd()*FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rnd()*LAST_NAMES.length)][0]}.`,
        // Hele stjerner 1-5 — præcis de værdier, stjernevælgeren kan afgive —
        // og de kommer fra SAMME række som teksten.
        rating: kilde.rating,
        comment: kilde.tekst,
        date: new Date(Date.now() - Math.floor(rnd()*200)*86400000).toISOString(),
      });
    }
    out[name] = anmeldelser;
  });
  return out;
})();
