/* Skriver llms.txt (llmstxt.org-format) i roden.

   Deterministisk og uden netværk: indholdet er kun faste, sande udsagn om, hvad Bikerbasen er, og
   links til sider, der findes i repoet. Ingen tal om lagerets størrelse (de ændrer sig, og et tal i en
   statisk fil bliver hurtigt forkert), ingen datoer, ingen tilfældighed. Samme input giver
   byte-identisk output, så en genbygning ikke skaber en tom commit.

   Kør:  node scripts/build-llms.js */

const fs = require('fs');
const path = require('path');
const siteUrlFra = require('./site-url');

const ROOT = path.join(__dirname, '..');

/* [fil, titel, beskrivelse]. Kun filer, der findes i repoet; testen tjekker det. */
const AFSNIT = [
  ['Find motorcykler', [
    ['soegning.html', 'Søg motorcykler til salg', 'Søgning på mærke, model, pris, årgang, kilometer og kørekort (A1, A2, A).'],
    ['maerker.html', 'Alle mærker', 'Oversigt over de motorcykelmærker, der har annoncer.'],
  ]],
  ['Guides', [
    ['guides.html', 'Alle guides', 'Redaktionelle guides med kilder.'],
    ['guide-foerste-motorcykel.html', 'Din første motorcykel', 'Hvordan man vælger type og tjekker, hvad kørekortet giver ret til.'],
    ['guide-a2-koerekort.html', 'A2-kørekort', 'Regler, alder og krav for A2.'],
    ['guide-brugt-motorcykel.html', 'Køb brugt motorcykel', 'Tjekliste til køb af en brugt motorcykel.'],
    ['guide-mc-forsikring.html', 'MC-forsikring', 'Ansvar mod kasko og spørgsmål at stille, når du får et tilbud.'],
    ['guide-mc-udstyr.html', 'MC-udstyr', 'Hjelm, tøj og pasform: hvad du bør vide, før du køber udstyr.'],
    ['guide-mc-typer.html', 'Motorcykeltyper', 'Naked, sport, adventure, touring, cruiser og flere: hvad typen siger om kørsel og brug.'],
    ['guide-mc-ordliste.html', 'MC-ordliste', 'ccm, kW, hk, kW pr. kg og andre begreber i en motorcykelannonce.'],
    ['guide-saelg-motorcykel.html', 'Sådan sælger du din motorcykel', 'Papirer, pris, annonce, sikker betaling, svindelmønstre og ejerskifte.'],
    ['guide-mc-vinteropbevaring.html', 'Vinteropbevaring af motorcykel', 'Generelle råd om rengøring, batteri, brændstof, dæk, kæde og forsikring.'],
    ['guide-mc-foraar-tjekliste.html', 'Første tur efter vinteren', 'Tjekliste til motorcyklen, før sæsonen starter.'],
  ]],
  ['Om Bikerbasen', [
    ['om-bikerbasen.html', 'Om Bikerbasen', 'Hvem vi er, og hvordan siden virker.'],
    ['om-indeksering.html', 'Om vores indeksering', 'Hvordan vi henter og viser annoncer fra andre sider, og hvordan en kilde fravælger det.'],
    ['privatlivspolitik.html', 'Privatlivspolitik', 'Behandling af personoplysninger.'],
    ['vilkaar.html', 'Vilkår', 'Brugsvilkår.'],
  ]],
];

function byg(site){
  const url = f => `${site}/${f}`;
  const linjer = [
    '# Bikerbasen',
    '',
    '> Bikerbasen er en dansk side for brugte motorcykler. Her samles annoncer fra danske forhandlere og markedspladser på ét sted, så man kan søge på tværs af dem. Kilden står på hvert annoncekort, og kortet linker videre til den oprindelige annonce.',
    '',
    'Bikerbasen hoster ikke de indekserede annoncer: titel, pris, nøgletal og ét billede vises, og købet sker hos kilden. Oplysninger, vi ikke har, vises som ikke oplyst og gættes aldrig. Antal og priser på annoncer skifter løbende og står derfor ikke her; se søgningen for det aktuelle udvalg.',
    '',
  ];
  for (const [overskrift, poster] of AFSNIT){
    linjer.push(`## ${overskrift}`, '');
    for (const [fil, titel, besk] of poster) linjer.push(`- [${titel}](${url(fil)}): ${besk}`);
    linjer.push('');
  }
  linjer.push('## Teknisk', '', `- [Sitemap](${url('sitemap.xml')}): alle sider, der kan indekseres.`, '- Kontakt: kontakt@bikerbasen.dk', '');
  return linjer.join('\n');
}

module.exports = { byg, AFSNIT };

if (require.main === module){
  const ud = byg(siteUrlFra(ROOT));
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), ud, 'utf8');
  console.log(`Skrev llms.txt (${ud.split('\n').length - 1} linjer).`);
}
