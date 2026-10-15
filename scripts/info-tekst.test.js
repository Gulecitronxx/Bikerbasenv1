/* Info-/tekstsiderne (om-bikerbasen, vilkaar, privatlivspolitik, sikkerhed, om-indeksering, 404).
   Sidernes design blev lavet om (foto-hero, indholdsfortegnelse, sidebjælke), men den juridiske og
   informative TEKST må ikke være ændret. Testen låser tekstindholdet uden markup med en hash, målt
   på de gamle sider (commit e040073) før omlægningen. Skal en tekst ændres bevidst, opdateres hashen
   her i samme commit som tekstændringen, så ændringen bliver synlig i diff'en. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROD = path.join(__dirname, '..');
const les = f => fs.readFileSync(path.join(ROD, f), 'utf8');

const ENT = { aring: 'å', oslash: 'ø', aelig: 'æ', Eacute: 'É', eacute: 'é', mdash: '—', sect: '§', amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' };
function afkod(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (m, n) => {
    if (n[0] === '#') return String.fromCodePoint(n[1].toLowerCase() === 'x' ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10));
    if (!(n in ENT)) throw new Error('ukendt entitet ' + m);
    return ENT[n];
  });
}
/* Tekst uden markup: kommentarer, scripts og tags fjernes, entiteter afkodes, blanktegn samles. */
function tekst(html) {
  const t = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return afkod(t).replace(/\s+/g, ' ').trim();
}
const hash = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

/* Nye sider: de elementer, der bærer den oprindelige tekst, er mærket data-juridisk="<rækkefølge i den gamle side>". */
function juridisk(html) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const dele = [];
  const re = /<(h1|p|article)\b[^>]*\sdata-juridisk="(\d+)"[^>]*>/g;
  let m;
  while ((m = re.exec(main))) {
    const navn = m[1];
    let dybde = 1, i = re.lastIndex;
    const aabn = new RegExp('<' + navn + '\\b|</' + navn + '>', 'g');
    aabn.lastIndex = i;
    let n;
    while (dybde > 0 && (n = aabn.exec(main))) { dybde += n[0][1] === '/' ? -1 : 1; i = aabn.lastIndex; }
    dele.push([Number(m[2]), main.slice(re.lastIndex, i)]);
    re.lastIndex = i;
  }
  return dele.sort((a, b) => a[0] - b[0]).map(d => tekst(d[1])).join(' ');
}

/* sha256 af den gamle sides tekst (h1, ingress/opdateringsdato og brødtekst; uden indholdsfortegnelsen). */
const TEKST_HASH = {
  'vilkaar.html': '199bb72f9f5505ff73c4067bb7d0a22217a8a7cc495fbd61d80e952a3eba2e40',
  'privatlivspolitik.html': 'b0ede460be1b9c21a1f8aa22222cdd0aa03f4b0c4be6bd09165c20945f262d8d',
  'sikkerhed.html': 'a03201da735cb82d61ae1ecac86e1e26cdcb3db4ecce2e21d71b93077b2b691b',
  'om-indeksering.html': '64b977bd891c50fcc80e7d5b9aaa01726aa320f019406946c63f454efc8ae6ad',
  'om-bikerbasen.html': '2404fc5692bb71fd0b48c2da6d41cb5230d5966b897dc764ac3eaf08d05d0205'
};

if (process.env.PRINT_OLD) {
  const cp = require('child_process');
  for (const f of Object.keys(TEKST_HASH)) {
    const gl = cp.execSync(`git show e040073:${f}`, { cwd: ROD, maxBuffer: 1e8 }).toString('utf8');
    const main = gl.slice(gl.indexOf('<main'), gl.indexOf('</main>')).replace(/<div class="legal-toc">[\s\S]*?<\/div>/, '');
    console.log(`  '${f}': '${hash(tekst(main))}',`);
  }
}

for (const [f, forventet] of Object.entries(TEKST_HASH)) {
  test(`${f}: den juridiske/informative tekst er ordret uændret`, () => {
    assert.equal(hash(juridisk(les(f))), forventet);
  });
}

test('tekst(): en ændret ordlyd giver en anden hash (testen kan fange en omskrivning)', () => {
  const a = '<main><article data-juridisk="9"><p>Vi sælger ikke dine data.</p></article></main>';
  const b = '<main><article data-juridisk="9"><p>Vi sælger dine data.</p></article></main>';
  assert.notEqual(hash(juridisk(a)), hash(juridisk(b)));
  assert.equal(hash(juridisk(a)), hash(juridisk(a.replace('<p>', '<p class="x">  '))), 'markup og blanktegn tæller ikke');
});

const SIDER = Object.keys(TEKST_HASH);
const TITLER = {
  'vilkaar.html': 'Vilkår og betingelser — Bikerbasen',
  'privatlivspolitik.html': 'Privatlivspolitik — Bikerbasen',
  'sikkerhed.html': 'Sikkerhed & gode råd — Bikerbasen',
  'om-indeksering.html': 'Om vores indeksering — Bikerbasen',
  'om-bikerbasen.html': 'Om Bikerbasen — Danmarks markedsplads for brugte motorcykler',
  '404.html': 'Siden findes ikke — Bikerbasen'
};

for (const f of [...SIDER, '404.html']) {
  test(`${f}: ét h1, foto-hero, p-info.css, ingen sidespecifikke inline-scripts, SEO-felter på plads`, () => {
    const h = les(f);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'præcis ét h1');
    assert.match(h, /class="if-hero/);
    assert.match(h, /css\/p-info\.css/);
    assert.match(h, /js\/info\.js/);
    assert.match(h, /<title>([^<]*)<\/title>/);
    assert.equal(h.match(/<title>([^<]*)<\/title>/)[1].replace(/&amp;/g, '&'), TITLER[f]);
    assert.match(h, /<meta name="description" content="[^"]{20,}"/);
    assert.match(h, /<link rel="canonical" href="https:\/\/bikerbasen\.dk\//);
    // de eneste tilladte inline-scripts er tema, GA4-bag-samtykke og cookiebanneren (CSP-hashes)
    const inline = [...h.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
    assert.equal(inline.length, 3, 'tema + GA4 + cookiebanner');
    assert.ok(!inline.some(s => /renderHeader|DOMContentLoaded/.test(s)), 'ingen sidespecifikt inline-script');
    assert.doesNotMatch(h, /\son(click|load|error)=/);
  });
}

for (const f of SIDER) {
  test(`${f}: indholdsfortegnelsens ankre peger på afsnit, der findes, og kort fortalt har kun punkter`, () => {
    const h = les(f);
    const toc = h.match(/<nav class="if-toc"[\s\S]*?<\/nav>/)[0];
    const ankre = [...toc.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
    assert.ok(ankre.length >= 5);
    for (const id of ankre) assert.match(h, new RegExp(`<h2 id="${id}"`), `h2 med id ${id}`);
    assert.equal(new Set(ankre).size, ankre.length, 'ingen dubletter');
    assert.match(h, /<section class="if-tldr"/);
    // ingen opdigtede tal i sidebjælken: ingen cifre ud over dem, der står i sidens egen tekst
    const tldr = tekst(h.match(/<section class="if-tldr"[\s\S]*?<\/section>/)[0]);
    const egen = tekst(h.slice(h.indexOf('<main')));
    for (const tal of tldr.match(/\d+/g) || []) assert.ok(egen.split(tal).length > 2, `tallet ${tal} står også i sidens egen tekst`);
  });
}

test('om-bikerbasen.html: ikon-række med principper og "Sådan virker Bikerbasen"', () => {
  const h = les('om-bikerbasen.html');
  assert.equal((h.match(/class="if-princip"/g) || []).length, 4);
  assert.match(h, /class="saadan-trin"/);
  assert.equal((h.match(/class="saadan-trin-punkt"/g) || []).length, 4);
});

test('om-indeksering.html: User-Agent i kodevisning og reglerne som kort', () => {
  const h = les('om-indeksering.html');
  assert.match(h, /<pre class="legal-pre">Bikerbasen-indeksering\/1\.0 \(\+https:\/\/bikerbasen\.dk\/om-indeksering\.html\)<\/pre>/);
  assert.equal((h.match(/class="if-regel"/g) || []).length, 6);
  assert.match(h, /mailto:kontakt@bikerbasen\.dk/);
});

test('404.html: rodrelative stier (virker på dybe URL\'er), noindex, søgefelt og header/footer', () => {
  const h = les('404.html');
  assert.match(h, /<meta name="robots" content="noindex, follow">/);
  assert.match(h, /<form class="if-fejl-sog" action="\/soegning\.html"/);
  assert.match(h, /<header class="site-header" id="sidehoved">/);
  assert.match(h, /<footer class="site-footer">/);
  const rel = [...h.matchAll(/\s(?:href|src)="([^"]*)"/g)].map(m => m[1])
    .filter(u => u && !/^(\/|https?:|mailto:|#|data:)/.test(u));
  assert.deepEqual(rel, [], 'ingen relative href/src');
  assert.doesNotMatch(h, /url\((?!\/|['"]?data:)/, 'ingen relative url() i inline-css');
});

test('404.html: headeren er den samme som index.html — kun med rodrelative stier', () => {
  const START = '<a class="skip-link"', SLUT = '</div>\n</div>';
  const udtraek = h => { const a = h.indexOf(START); return h.slice(a, h.indexOf(SLUT, a) + SLUT.length); };
  const index = udtraek(les('index.html').replace(/\r\n/g, '\n'));
  const fejl = udtraek(les('404.html').replace(/\r\n/g, '\n'))
    .replace(/<!-- 404\.html har sin egen header[\s\S]*?-->\n/, '').replace(' id="sidehoved"', '')
    .replace(/(href|src)="\/(?!\/)/g, '$1="');
  assert.equal(fejl, index);
});
