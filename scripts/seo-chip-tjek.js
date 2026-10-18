/* Hjælper til integrationstesten "chippens tal = linkets resultat" (F2-004, F2-005).
   Ingen netværk, ingen filer udover js/search.js (læses).

   Tre ting:
   1. soegeTilstand(search): læser et søgelink PRÆCIS som søgesiden gør. Koden er den rigtige
      readStateFromURL() klippet ud af js/search.js (samme greb som js/soegeoverskrift.test.js) —
      ikke en kopi, så en ændring af URL-vokabularet dér også rammer testen her.
   2. traefFraHref(href, ctx): antal annoncer destinationen viser. Søgelinks regnes med
      Filtrering.anvendFiltre (browserModules()), statiske sider (slug.html) med facettens egen match.
   3. udtraekChips(html): alle <a href> på en genereret side, hvor linket bærer et tal.

   Fixturelageret lagerFixture() er bygget til at ramme de kendte fejl: modelnavne der er delstrenge
   af hinanden (CB 1000 / CBR 1000 F, CRF 110 F / CRF 1100 L Africa), identiske dealerenheder,
   annoncer uden pris/årgang/type, og byer med to kilder. */

const fs = require('fs');
const path = require('path');

const KILDE = fs.readFileSync(path.join(__dirname, '..', 'js', 'search.js'), 'utf8');

function matchLuk(src, start){
  const aabne = src.slice(start).search(/[{[]/);
  let i = start + aabne, dybde = 0;
  for (; i < src.length; i++){
    const c = src[i];
    if (c === '{' || c === '[') dybde++;
    else if ((c === '}' || c === ']') && --dybde === 0) return i + 1;
  }
  throw new Error('ingen slutning fra ' + start);
}
function udklipFunktion(navn){
  const s = KILDE.indexOf(`function ${navn}(`);
  if (s < 0) throw new Error(`${navn}() findes ikke i js/search.js`);
  let i = KILDE.indexOf('{', s), d = 0;
  for (; i < KILDE.length; i++){ if (KILDE[i] === '{') d++; else if (KILDE[i] === '}' && --d === 0) return KILDE.slice(s, i + 1); }
  throw new Error('ingen slutning på ' + navn);
}
function udklipKonstant(navn){
  const s = KILDE.indexOf(`const ${navn} = `);
  if (s < 0) throw new Error(`const ${navn} findes ikke i js/search.js`);
  return KILDE.slice(s, matchLuk(KILDE, s)) + ';';
}

/* readStateFromURL() filtrerer ?type= mod TYPES (js/data.js) — den global skal findes, ellers kaster klippet ReferenceError. */
const TYPES = new Function(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + ';return TYPES;')();

const vindue = { location: { search: '' } };
const laes = new Function('window', 'TYPES', [
  udklipKonstant('LIST_PARAMS'), udklipKonstant('NUM_PARAMS'), udklipKonstant('SORTERINGER'),
  udklipKonstant('SORT_ALIAS'), udklipKonstant('EMPTY_STATE'),
  'let state = { ...EMPTY_STATE };', udklipFunktion('numOrNull'), udklipFunktion('readStateFromURL'),
  'return function(search){ window.location.search = search; state = { ...EMPTY_STATE }; readStateFromURL(); return state; };',
].join('\n'))(vindue, TYPES);

const afEsc = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/* '?type=naked&amp;maxPrice=3000' -> søgesidens state. */
function soegeTilstand(href){
  const q = afEsc(href).split('?')[1] || '';
  return laes('?' + q);
}

/* Nøgler, der står mere end én gang i et søgelink (ekstra nøgle = det andet ord "vinder" ikke). */
function dubletNoegler(href){
  const q = afEsc(href).split('?')[1] || '';
  const set = new Map();
  for (const [k] of new URLSearchParams(q)) set.set(k, (set.get(k) || 0) + 1);
  return [...set].filter(([, n]) => n > 1).map(([k]) => k);
}

/* ctx = { alle, facetter, Filtrering }. Returnerer antal, eller null hvis destinationen ikke kan regnes. */
function traefFraHref(href, ctx){
  const h = afEsc(href);
  if (/^soegning\.html\?/.test(h)) return ctx.Filtrering.anvendFiltre(ctx.alle, soegeTilstand(h), null, null).length;
  const m = /^([a-z0-9-]+)\.html$/.exec(h);
  if (m){
    const f = (ctx.facetter || []).find(x => x.slug === m[1]);
    if (f) return ctx.alle.filter(f.match).length;
    const b = /^maerke-(.+)$/.exec(m[1]);
    if (b && ctx.maerke) return ctx.maerke(b[1]);
  }
  return null;
}

const tilTalTekst = t => Number(String(t).replace(/\./g, ''));

/* Chips: <a href> hvis indre har et tal. Mønstrene er dem generatorerne skriver:
     data-fa-n / data-mk-n spans, "tekst · 12", "12 annoncer", "12 indekseret", og mærkesidens
     <li><a><strong>X</strong><span>12 Honda</span></a></li>. */
function udtraekChips(html){
  const ud = [];
  const re = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))){
    const href = m[1], inner = m[2];
    let tal = null;
    let t;
    if ((t = /data-(?:fa|mk)-n[^>]*>\s*([\d.]+)\s*</.exec(inner))) tal = tilTalTekst(t[1]);
    else if ((t = /^\s*Se (?:de|alle) ([\d.]+) /.exec(inner.replace(/<[^>]+>/g, '')))) tal = tilTalTekst(t[1]);
    else if ((t = /·\s*([\d.]+)/.exec(inner.replace(/<[^>]+>/g, '')))) tal = tilTalTekst(t[1]);
    else if ((t = /([\d.]+)\s+(?:annonce|annoncer|indekseret)\b/.exec(inner.replace(/<[^>]+>/g, ' ')))) tal = tilTalTekst(t[1]);
    else if (/<li\b/.test(html.slice(Math.max(0, m.index - 6), m.index)) && (t = /<span>\s*([\d.]+)(?:\s[^<]*)?<\/span>\s*$/.exec(inner))) tal = tilTalTekst(t[1]);
    ud.push({ href, tal, tekst: inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
  }
  return ud;
}

/* ---------- Fixturelager ---------- */
function lagerFixture(){
  let i = 0;
  const alle = [];
  const udenNull = (o) => o;
  const tilfoej = (n, basis, variation) => {
    for (let k = 0; k < n; k++){
      i++;
      const v = variation ? variation(k) : {};
      const post = Object.assign({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, isExternal: true,
        brand: 'Honda', model: 'CB 500', year: 2019, price: 40000, km: 10000, type: 'naked',
        region: 'Hovedstaden', city: 'København', postnr: '1050', ccm: 471, power: 47,
        condition: 'brugt', source: { navn: 'Test', domaene: 'test.dk' }, createdAt: '2026-08-01T10:00:00Z', photoUrls: [],
      }, basis, udenNull(v));
      // Et indekseret kort uden brugbar kilde-URL tegnes ikke (components.js listingCardHTML).
      if (post.isExternal && post.source) post.externalUrl = `https://${post.source.domaene}/annonce/${i}`;
      alle.push(post);
    }
  };
  const regioner = [
    ['Hovedstaden', 'København', '1050'], ['Midtjylland', 'Aarhus', '8000'], ['Syddanmark', 'Odense', '5000'],
    ['Sjælland', 'Roskilde', '4000'], ['Nordjylland', 'Aalborg', '9000'],
  ];
  const sted = k => { const [region, city, postnr] = regioner[k % regioner.length]; return { region, city, postnr }; };
  const kilde = k => (k % 3 === 0 ? { navn: 'MC Syd', domaene: 'mcsyd.dk' } : k % 3 === 1 ? { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' } : { navn: 'Rydbergs MC', domaene: 'rydbergsmc.dk' });
  const prisAt = (k, lav, trin) => lav + k * trin;

  // Honda: modelnavne der er delstrenge/ordmængder af hinanden (F2-005).
  tilfoej(8, { brand: 'Honda', model: 'CB 1000', type: 'naked', ccm: 998, power: 120 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 52000, 2500), year: 2008 + k, km: 12000 + k * 7000 }));
  tilfoej(3, { brand: 'Honda', model: 'CBR 1000 F', type: 'sport', ccm: 998, power: 100 }, k => ({ ...sted(k + 1), source: kilde(k), price: prisAt(k, 48000, 3000), year: 1999 + k, km: 30000 + k * 5000 }));
  tilfoej(2, { brand: 'Honda', model: 'CB 1000 R', type: 'naked', ccm: 998, power: 143 }, k => ({ ...sted(k + 2), source: kilde(k), price: 99000 + k * 9000, year: 2018 + k, km: 9000 + k * 3000 }));
  tilfoej(1, { brand: 'Honda', model: 'CRF 110 F', type: 'cross', ccm: 109, power: 6 }, () => ({ ...sted(1), price: 11900, year: 2021, km: 400 }));
  tilfoej(24, { brand: 'Honda', model: 'CRF 1100 L Africa', type: 'adventure', ccm: 1084, power: 102 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 79000, 4500), year: 2020 + (k % 6), km: 2000 + k * 2200, condition: k % 4 === 0 ? 'ny' : 'brugt' }));
  tilfoej(12, { brand: 'Honda', model: 'CB 500', type: 'naked', ccm: 471, power: 47 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 29000, 1500), year: 2013 + (k % 8), km: 5000 + k * 4300 }));
  tilfoej(3, { brand: 'Honda', model: 'VFR 800 F', type: 'sport', ccm: 782, power: 106 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 45000, 6000), year: 2015 + k, km: 15000 + k * 6000 }));
  tilfoej(10, { brand: 'Honda', model: 'NX 500', type: 'adventure', ccm: 471, power: 47, price: 89995, year: 2024, km: 0, condition: 'ny', source: { navn: 'MC Syd', domaene: 'mcsyd.dk' }, region: 'Syddanmark', city: 'Rødding', postnr: '6630' }, () => ({}));
  // BMW
  tilfoej(6, { brand: 'BMW', model: 'F 800 GS', type: 'adventure', ccm: 798, power: 85 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 61000, 4000), year: 2009 + k, km: 20000 + k * 9000 }));
  tilfoej(2, { brand: 'BMW', model: 'F 800 R', type: 'naked', ccm: 798, power: 90 }, k => ({ ...sted(k), source: kilde(k), price: 58000 + k * 4000, year: 2012 + k, km: 18000 + k * 3000 }));
  tilfoej(12, { brand: 'BMW', model: 'R 1250 GS', type: 'adventure', ccm: 1254, power: 136 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 139000, 9000), year: 2019 + (k % 6), km: 4000 + k * 3500 }));
  tilfoej(2, { brand: 'BMW', model: 'K 1200', type: 'touring', ccm: 1157, power: 130 }, k => ({ ...sted(k), source: kilde(k), price: 38000 + k * 3000, year: 2006 + k, km: 60000 + k * 9000 }));
  tilfoej(2, { brand: 'BMW', model: 'K 1200 GT', type: 'touring', ccm: 1157, power: 130 }, k => ({ ...sted(k + 3), source: kilde(k), price: 52000 + k * 3000, year: 2008 + k, km: 50000 + k * 9000 }));
  // Yamaha, Kawasaki, Harley, scooter
  tilfoej(14, { brand: 'Yamaha', model: 'MT-07', type: 'naked', ccm: 689, power: 74 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 42000, 2800), year: 2015 + (k % 9), km: 3000 + k * 3500, kanNedsaettesA2: k % 2 === 0 }));
  tilfoej(8, { brand: 'Yamaha', model: 'MT-09', type: 'naked', ccm: 847, power: 115 }, k => ({ ...sted(k + 1), source: kilde(k), price: prisAt(k, 64000, 4200), year: 2014 + k, km: 7000 + k * 5200 }));
  tilfoej(7, { brand: 'Yamaha', model: 'XT 660', type: 'adventure', ccm: 660, power: 48 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 24000, 1500), year: 2005 + k, km: 25000 + k * 8000 }));
  tilfoej(12, { brand: 'Kawasaki', model: 'Z 900', type: 'naked', ccm: 948, power: 125 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 69000, 3800), year: 2017 + (k % 8), km: 4000 + k * 4100 }));
  tilfoej(6, { brand: 'Harley-Davidson', model: 'FLHX', type: 'touring', ccm: 1800, power: 75 }, k => ({ ...sted(k + 2), source: kilde(k), price: 118000 + k * 14000, year: 2007 + k * 2, km: 40000 + k * 9000 }));
  tilfoej(10, { brand: 'Harley-Davidson', model: 'Sportster 883', type: 'cruiser', ccm: 883, power: 53 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 38000, 3000), year: 2004 + k, km: 15000 + k * 7000 }));
  tilfoej(9, { brand: 'Piaggio', model: 'Beverly 300', type: 'scooter', ccm: 278, power: 22 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 12000, 1500), year: 2010 + k, km: 9000 + k * 6000 }));
  tilfoej(10, { brand: 'Royal Enfield', model: 'Classic 350', type: 'classic', ccm: 349, power: 20 }, k => ({ ...sted(k), source: kilde(k), price: prisAt(k, 21000, 2000), year: 2015 + k, km: 6000 + k * 4000 }));
  // Ufuldstændige annoncer: ingen pris / årgang / km / type / postnummer
  tilfoej(5, { brand: 'Suzuki', model: 'GSX-R 750', type: 'sport', ccm: 750, power: 150 }, k => ({ ...sted(k), source: kilde(k), price: k < 2 ? null : 60000 + k * 5000, year: k < 3 ? null : 2010 + k, km: k === 4 ? null : 20000 }));
  tilfoej(4, { brand: 'Triumph', model: 'Bonneville', type: null, ccm: 865, power: null }, k => ({ ...sted(k), source: kilde(k), price: 70000 + k * 3000, year: 2012 + k, km: 15000 + k * 1000 }));
  // Byen Aarhus-bytest: to kilder, mange annoncer
  tilfoej(18, { brand: 'Ducati', model: 'Monster', type: 'naked', ccm: 937, power: 111, region: 'Midtjylland', city: 'Aarhus', postnr: '8000' }, k => ({ source: k % 2 ? { navn: 'MC Syd', domaene: 'mcsyd.dk' } : { navn: 'Gul og Gratis', domaene: 'guloggratis.dk' }, price: 60000 + k * 4000, year: 2012 + (k % 9), km: 10000 + k * 3000 }));
  // Priser tæt på budgetgrænserne (<=, ikke <)
  tilfoej(1, { brand: 'Honda', model: 'CB 500', price: 30000, year: 2008, km: 50000 }, () => ({ ...sted(0) }));
  tilfoej(1, { brand: 'Honda', model: 'CB 500', price: 50000, year: 2009, km: 40000 }, () => ({ ...sted(1) }));
  // Egen (ikke-ekstern) annonce
  tilfoej(2, { brand: 'Honda', model: 'CB 500', isExternal: false, source: undefined, price: 33000 }, k => ({ year: 2010 + k, km: 21000 + k * 1000 }));
  return alle;
}

module.exports = { soegeTilstand, dubletNoegler, traefFraHref, udtraekChips, lagerFixture, afEsc };
