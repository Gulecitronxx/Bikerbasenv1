/* ============ Reference data ============ */
const REGIONS = ['Hovedstaden', 'Sjælland', 'Syddanmark', 'Midtjylland', 'Nordjylland'];

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
  Yamaha: ['MT-03', 'MT-07', 'MT-09', 'MT-10', 'YZF-R3', 'YZF-R6', 'YZF-R1', 'YZF-R7', 'Ténéré 700', 'XSR700', 'XSR900', 'Tracer 7', 'Tracer 9 GT', 'NMAX 125', 'XMAX 300', 'TMAX 560', 'WR250F', 'YZ450F', 'Niken', 'Virago 250', 'Virago 535', 'Virago 1100', 'V-Max', 'Fazer 600', 'FZ6', 'FZ1', 'RD350', 'DT125', 'XT250', 'XT660', 'Drag Star 650', 'Majesty 400', 'Seca II', 'SR400'],
  Honda: ['CB125R', 'CB300R', 'CB500F', 'CB500X', 'CB650R', 'CB1000R', 'CBR500R', 'CBR600RR', 'CBR650R', 'CBR1000RR-R', 'Africa Twin', 'Africa Twin Adventure Sports', 'Rebel 300', 'Rebel 500', 'Rebel 1100', 'Forza 350', 'PCX 125', 'SH125i', 'Gold Wing', 'Gold Wing Tour', 'CRF250L', 'CRF450R', 'CRF450RL', 'Monkey', 'Super Cub C125', 'X-ADV', 'CB750 Four', 'CB400 Super Four', 'Hornet 600', 'Hornet 900', 'VFR800', 'Shadow 750', 'VTX1800', 'Transalp 750', 'Varadero 1000', 'Deauville 700', 'NC750X', 'Grom', 'CBX1000', 'CB1300'],
  Suzuki: ['GSX-R600', 'GSX-R750', 'GSX-R1000', 'GSX-S750', 'GSX-S1000', 'SV650', 'V-Strom 650', 'V-Strom 1050', 'Bandit 1200', 'Hayabusa', 'Burgman 400', 'Address 125', 'DR-Z400', 'RM-Z450', 'Boulevard M109R', 'Katana', 'GS500', 'Intruder 800', 'Marauder 800', 'GSF650 Bandit', 'DR650', 'Gladius 650', 'TL1000S', 'RGV250'],
  Kawasaki: ['Ninja 400', 'Ninja 650', 'Ninja ZX-6R', 'Ninja ZX-10R', 'Ninja H2', 'Z400', 'Z650', 'Z900', 'Z900RS', 'Versys 650', 'Versys 1000', 'Vulcan S', 'Vulcan 900', 'KLX230', 'KLX300', 'KX450', 'W800', 'GPZ900R', 'ZZR1400', 'ER-6n', 'Eliminator 400', 'KLR650', 'Concours 1400', 'Zephyr 750', 'Mach III H1'],
  BMW: ['G 310 R', 'G 310 GS', 'F 750 GS', 'F 850 GS', 'F 900 R', 'F 900 XR', 'R 1250 GS', 'R 1250 GS Adventure', 'R 1250 RT', 'R nineT', 'R nineT Pure', 'S 1000 RR', 'S 1000 R', 'S 1000 XR', 'K 1600 GT', 'K 1600 GTL', 'C 400 X', 'CE 04', 'R80 GS', 'R100 RS', 'R1200 GS', 'K100', 'F650 GS', 'HP4 Race'],
  Ducati: ['Monster 797', 'Monster 937', 'Panigale V2', 'Panigale V4', 'Multistrada V2', 'Multistrada V4', 'Scrambler 800', 'Scrambler 1100', 'Diavel 1260', 'Streetfighter V4', 'SuperSport 950', 'Hypermotard 950', '916', '999', 'ST2', 'ST4', '848', 'Supersport 900'],
  KTM: ['Duke 125', 'Duke 200', 'Duke 390', 'Duke 790', 'Duke 890', '1290 Super Duke R', 'RC 125', 'RC 390', '1290 Super Adventure S', '890 Adventure', '390 Adventure', '450 SX-F', '250 SX', '250 EXC', '500 EXC-F', 'LC4 640', 'Adventure 640', '690 Enduro', '690 SMC R'],
  Triumph: ['Street Triple 660', 'Street Triple 765', 'Speed Triple 1200', 'Bonneville T100', 'Bonneville T120', 'Bonneville Bobber', 'Speed Twin', 'Scrambler 900', 'Scrambler 1200', 'Tiger 900', 'Tiger 1200', 'Rocket 3', 'Trident 660', 'Daytona 675', 'Tiger 800', 'Thunderbird 900', 'America', 'Speedmaster'],
  'Harley-Davidson': ['Iron 883', 'Iron 1200', 'Forty-Eight', 'Street Bob', 'Fat Bob', 'Fat Boy', 'Road King', 'Road Glide', 'Street Glide', 'Heritage Classic', 'Sportster S', 'Pan America 1250', 'Nightster', 'LiveWire', 'Sportster 883', 'Sportster 1200', 'Dyna Low Rider', 'Softail Standard', 'Electra Glide', 'V-Rod'],
  Aprilia: ['RS 660', 'RS 125', 'Tuono 660', 'Tuono V4', 'RSV4', 'Tuareg 660', 'SR GT 200', 'SXR 160', 'RSV Mille', 'Shiver 900', 'Dorsoduro 900', 'Caponord 1200'],
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
  Nimbus: ['Type C "Stovepibe"'],
  MZ: ['ETZ 251', 'Saxon 500'],
  Peugeot: ['Django 125', 'Metropolis 400'],
  Sachs: ['Roadster 125', 'Madass 125'],
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
  'Type C "Stovepibe"': 'classic', 'ETZ 251': 'classic', 'Saxon 500': 'classic', 'Django 125': 'scooter', 'Roadster 125': 'classic',
};

const FIRST_NAMES = ['Mikkel', 'Anders', 'Jonas', 'Rasmus', 'Kasper', 'Frederik', 'Mathias', 'Christian', 'Emil', 'Peter', 'Louise', 'Camilla', 'Sofie', 'Ida', 'Mette', 'Nikolaj', 'Thomas', 'Lars'];
const LAST_NAMES = ['Jensen', 'Nielsen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Møller'];
const DEALER_NAMES = ['Motorcykel Centret ApS', 'Nordjysk MC Handel', 'Bike House Aarhus', 'MC Specialisten Fyn', 'Metropol Motor', 'Vestjysk Custom Cycles'];

function seededRandom(seed){
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function buildListings(){
  const rnd = seededRandom(20260726);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const brands = Object.keys(BRANDS_BY_MODEL);
  const listings = [];
  const now = new Date('2026-07-26T09:00:00');
  let id = 1001;

  const entries = [
    ['Yamaha','MT-09',2022,14200,890,'naked'],['Yamaha','YZF-R6',2019,21500,599,'sport'],
    ['Yamaha','Ténéré 700',2021,9800,689,'adventure'],['Yamaha','XSR700',2020,17400,689,'classic'],
    ['Yamaha','Tracer 9 GT',2023,6200,890,'touring'],['Yamaha','NMAX 125',2022,4100,125,'scooter'],
    ['Honda','CB650R',2021,11300,649,'naked'],['Honda','CBR600RR',2018,28900,599,'sport'],
    ['Honda','Africa Twin',2020,23100,1084,'adventure'],['Honda','Rebel 500',2022,5400,471,'cruiser'],
    ['Honda','Forza 350',2023,3200,330,'scooter'],['Honda','CRF450R',2023,410,449,'cross'],
    ['Kawasaki','Ninja 650',2020,15600,649,'sport'],['Kawasaki','Z900',2022,9700,948,'naked'],
    ['Kawasaki','Versys 650',2019,31200,649,'adventure'],['Kawasaki','Vulcan S',2021,8900,649,'cruiser'],
    ['Suzuki','GSX-R750',2017,34500,750,'sport'],['Suzuki','V-Strom 650',2019,26800,645,'adventure'],
    ['Suzuki','SV650',2021,10200,645,'naked'],['Suzuki','Burgman 400',2018,42000,400,'scooter'],
    ['BMW','R 1250 GS Adventure',2022,18400,1254,'adventure'],['BMW','S 1000 RR',2021,8700,999,'sport'],
    ['BMW','R nineT',2019,15300,1170,'classic'],['BMW','F 850 GS',2020,21100,853,'adventure'],
    ['BMW','C 400 X',2021,7600,350,'scooter'],
    ['Ducati','Monster 937',2023,3400,937,'naked'],['Ducati','Panigale V2',2021,6900,955,'sport'],
    ['Ducati','Scrambler 800',2019,12700,803,'classic'],
    ['KTM','Duke 890',2022,7300,889,'naked'],['KTM','1290 Super Adventure',2020,19800,1301,'adventure'],
    ['KTM','450 SX-F',2023,180,450,'cross'],['KTM','RC 390',2021,9100,373,'sport'],
    ['Triumph','Street Triple 765',2021,10800,765,'naked'],['Triumph','Bonneville T120',2019,13200,1200,'classic'],
    ['Triumph','Tiger 900',2022,14600,888,'adventure'],
    ['Harley-Davidson','Iron 883',2018,19300,883,'cruiser'],['Harley-Davidson','Street Bob',2020,15100,1746,'cruiser'],
    ['Harley-Davidson','Road King',2017,45200,1746,'touring'],
    ['Aprilia','RS 660',2022,6100,659,'sport'],['Aprilia','Tuono V4',2020,13400,1077,'naked'],
    ['Husqvarna','Svartpilen 401',2021,8200,373,'naked'],['Husqvarna','FE 501',2022,950,501,'cross'],
    ['Royal Enfield','Classic 350',2022,6800,349,'classic'],['Royal Enfield','Himalayan',2021,12300,411,'adventure'],
    ['Royal Enfield','Interceptor 650',2020,9600,648,'classic'],
    ['Vespa','Primavera 125',2021,5200,125,'scooter'],['Vespa','GTS 300',2019,14800,278,'scooter'],
    ['Piaggio','Liberty 125',2020,9800,125,'scooter'],
    ['Nimbus','Type C "Stovepibe"',1968,38000,750,'classic'],
    ['MZ','ETZ 251',1985,52000,250,'classic'],
    ['Peugeot','Django 125',2022,3900,125,'scooter'],
  ];

  for (const [brand, model, year, km, ccm, typeOverride] of entries){
    const type = typeOverride || TYPE_BY_MODEL_HINT[model] || 'naked';
    const city = pick(DEMO_CITIES);
    const isDealer = rnd() < 0.32;
    const basePrice = estimatePrice(year, ccm, km, brand, type);
    const daysAgo = Math.floor(rnd() * 34);
    const created = new Date(now.getTime() - daysAgo * 86400000 - Math.floor(rnd()*80000000));
    const condition = year >= 2022 ? pick(['Som ny','God stand']) : (year <= 1990 ? pick(['Brugt','God stand','Defekt/Projekt']) : pick(CONDITIONS.slice(0,3)));
    const sellerName = isDealer ? pick(DEALER_NAMES) : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const power = Math.round(ccm * (type === 'scooter' ? 0.055 : (type === 'cross' ? 0.09 : 0.075)));
    const registration = type === 'cross' ? 'Ikke indregistreret (bane/off-road)' : (rnd() < 0.9 ? 'Indregistreret' : 'Afmeldt');
    const afgift = registration.startsWith('Ikke indregistreret') ? 'Ikke relevant (ikke indregistreret)' : (rnd() < 0.92 ? 'Betalt' : 'Ikke betalt');
    listings.push({
      id: id++,
      brand, model, type, year, km, ccm,
      power,
      price: basePrice,
      condition,
      city: city.city, postnr: city.postnr, region: city.region,
      createdAt: created.toISOString(),
      isDealer,
      seller: {
        name: sellerName,
        isDealer,
        verified: isDealer ? rnd() < 0.75 : rnd() < 0.15,
        emailVerified: true,
        phoneVerified: isDealer ? true : rnd() < 0.6,
        mitIdVerified: isDealer ? rnd() < 0.75 : rnd() < 0.15,
        cvr: isDealer ? String(20000000 + Math.floor(rnd()*79999999)) : null,
        phone: `+45 ${20 + Math.floor(rnd()*60)} ${10+Math.floor(rnd()*89)} ${10+Math.floor(rnd()*89)} ${10+Math.floor(rnd()*89)}`,
        memberSince: 2014 + Math.floor(rnd()*11),
        rating: (4 + rnd()*0.9).toFixed(1),
        reviews: 3 + Math.floor(rnd()*140),
        city: city.city,
      },
      vin: `${brand.replace(/[^A-Z0-9]/gi,'').slice(0,3).toUpperCase()}${year}${String(id).padStart(6,'0')}X1`,
      registration,
      afgift,
      description: buildDescription(brand, model, year, condition, type),
      photos: 4 + Math.floor(rnd()*4),
    });
  }
  return listings;
}

function estimatePrice(year, ccm, km, brand, type){
  const age = 2026 - year;
  let base = ccm * 165;
  if (['BMW','Ducati','Triumph','Harley-Davidson','Aprilia'].includes(brand)) base *= 1.35;
  if (brand === 'Royal Enfield' || brand === 'Vespa' || brand === 'Piaggio' || brand === 'Peugeot') base *= 0.85;
  if (type === 'classic' && year < 1995) base = 35000 + (1995-year)*900 + ccm*40;
  let price = base * Math.max(0.32, 1 - age * 0.052) - km * 1.1;
  price = Math.max(price, 12000);
  return Math.round(price / 500) * 500;
}

function buildDescription(brand, model, year, condition, type){
  const typeLabel = (TYPES.find(t=>t.id===type)||{}).label || '';
  return `${brand} ${model} årgang ${year} sælges i ${condition.toLowerCase()}.\n\nMotorcyklen har været velholdt og serviceeftervist gennem hele ejerperioden. Nye dæk og bremseklodser inden for de sidste par tusinde km. ${typeLabel}-modellen er kendt for sin pålidelighed og køreglæde – perfekt til både dagligt brug og længere ture.\n\nIngen kendte fejl eller mangler. Fremvises gerne efter aftale, og der er mulighed for prøvetur ved seriøs interesse. Sælges som den er, fremvist og godkendt af sælger.`;
}

const LISTINGS = buildListings();

/* ============ Formatting helpers (Danish) ============ */
function formatPrice(n){
  return n.toLocaleString('da-DK') + ' kr.';
}
function formatKm(n){
  return n.toLocaleString('da-DK') + ' km';
}
function formatCcm(n){
  return n.toLocaleString('da-DK') + ' ccm';
}
function formatPower(hk){
  return hk + ' hk';
}
function timeAgoDa(iso){
  const then = new Date(iso).getTime();
  const now = new Date('2026-07-26T09:00:00').getTime();
  const diffMs = Math.max(0, now - then);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days === 0) return hours <= 0 ? 'i dag' : `i dag, ${hours} t.`;
  if (days === 1) return 'i går';
  if (days < 7) return `for ${days} dage siden`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `for ${weeks} ${weeks===1?'uge':'uger'} siden`;
  const months = Math.floor(days / 30);
  return `for ${months} ${months===1?'måned':'måneder'} siden`;
}
function isNewListing(iso){
  const then = new Date(iso).getTime();
  const now = new Date('2026-07-26T09:00:00').getTime();
  return (now - then) < 4 * 86400000;
}
function typeLabel(id){
  return (TYPES.find(t=>t.id===id) || {}).label || id;
}

/* ============ Security / trust helpers ============ */
function escapeHTML(str){
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* Simplified real-world VIN shape check: 11-17 chars, alphanumeric, excludes I/O/Q (not used in real VINs). */
function isValidVIN(vin){
  return /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(String(vin || '').trim());
}

const AFGIFT_STATUSES = ['Betalt', 'Ikke betalt', 'Ikke relevant (ikke indregistreret)'];
const REPORT_REASONS = [
  { id: 'svindel', label: 'Svindel eller bedrageri' },
  { id: 'stjaalet', label: 'Formodet stjålet motorcykel' },
  { id: 'falsk', label: 'Falsk eller vildledende annonce' },
  { id: 'upassende', label: 'Upassende indhold' },
  { id: 'andet', label: 'Andet' },
];

/* Lightweight fraud-signal heuristic: flags listings priced well under the market median for their type. */
function medianPriceForType(type, excludeId){
  const prices = LISTINGS.filter(l => l.type === type && l.id !== excludeId).map(l => l.price).sort((a,b)=>a-b);
  if (!prices.length) return null;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid] : (prices[mid-1] + prices[mid]) / 2;
}
function isSuspiciouslyCheap(listing){
  const median = medianPriceForType(listing.type, listing.id);
  return median != null && listing.price < median * 0.45;
}

/* Seeded sample reviews for sellers, kept separate from live localStorage reviews added during a session. */
const SEED_REVIEWS = (function(){
  const rnd = seededRandom(4471);
  const comments = [
    'Nem og hurtig handel, motorcyklen var som beskrevet.',
    'God kommunikation og fair pris. Kan varmt anbefales.',
    'Alt gik som det skulle, mødte op og fik en god handel.',
    'Lidt langsom til at svare, men ærlig omkring standen.',
    'Meget tilfreds — motorcyklen var i bedre stand end forventet.',
    'Professionel og imødekommende. Vil handle igen.',
  ];
  const out = {};
  const names = [...new Set(LISTINGS.map(l => l.seller.name))];
  names.forEach(name => {
    const n = 1 + Math.floor(rnd() * 4);
    out[name] = Array.from({ length: n }, (_, i) => ({
      author: `${FIRST_NAMES[Math.floor(rnd()*FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(rnd()*LAST_NAMES.length)][0]}.`,
      rating: Math.round((3.5 + rnd() * 1.5) * 2) / 2,
      comment: comments[Math.floor(rnd()*comments.length)],
      date: new Date(Date.now() - Math.floor(rnd()*200)*86400000).toISOString(),
    }));
  });
  return out;
})();
