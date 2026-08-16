/* Indlæsning og validering af en kildekonfiguration (sources/<navn>.yaml).

   Konfigurationen er kontrakten. Alt hvad crawleren gør mod en kilde står i
   YAML'en — URL'er, selectors, forsinkelse, faste felter. Der er ingen
   kildespecifik kode i pipelinen, og det skal blive ved med at være sådan:
   næste forhandler skal koste en YAML-fil, ikke en if-sætning.

   Validering sker HER og hårdt. En kilde med en stavefejl i en selector skal
   fejle med det samme og med navnet på feltet — ikke gemme 500 annoncer med
   tom pris, fordi '[data-key="Pirce"]' bare matchede ingenting. */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const KILDE_MAPPE = path.join(__dirname, '..', 'sources');

// Selectors vi ikke kan undvære. Uden url og titel er der ingen annonce, og
// uden pris/årgang/km er kortet ikke værd at vise.
const PAAKRAEVEDE_SELECTORS = ['kort', 'url', 'titel', 'pris', 'aargang', 'km'];

// Databasen håndhæver crawl_delay_ms >= 2000 (014_aggregator.sql). Vi
// håndhæver det samme her, så en kilde ikke kan crawles hurtigere end
// tabellen tillader den at blive registreret.
const MINIMUM_DELAY_MS = 2000;

function laesKilde(navn){
  const fil = path.join(KILDE_MAPPE, `${navn}.yaml`);
  if (!fs.existsSync(fil)){
    const findes = fs.existsSync(KILDE_MAPPE)
      ? fs.readdirSync(KILDE_MAPPE).filter(f => f.endsWith('.yaml')).map(f => f.replace(/\.yaml$/, ''))
      : [];
    throw new Error(`Ukendt kilde "${navn}". Findes i sources/: ${findes.join(', ') || '(ingen)'}`);
  }
  const k = YAML.parse(fs.readFileSync(fil, 'utf8'));
  k.slug = navn;
  k.konfig_fil = `sources/${navn}.yaml`;
  return validerKilde(k);
}

function alleKilder(){
  if (!fs.existsSync(KILDE_MAPPE)) return [];
  return fs.readdirSync(KILDE_MAPPE)
    .filter(f => f.endsWith('.yaml'))
    .map(f => f.replace(/\.yaml$/, ''));
}

function validerKilde(k){
  const fejl = [];
  const kraev = (felt, ok, hvorfor) => { if (!ok) fejl.push(`${felt}: ${hvorfor}`); };

  kraev('navn', typeof k.navn === 'string' && k.navn.trim(), 'mangler');
  kraev('domaene', typeof k.domaene === 'string' && k.domaene.trim(), 'mangler');
  if (typeof k.domaene === 'string'){
    // Samme regel som constraint domaene_uden_skema i 014_aggregator.sql.
    kraev('domaene', !/^https?:\/\//i.test(k.domaene), 'skal stå uden http(s)://');
  }

  kraev('liste_urler', Array.isArray(k.liste_urler) && k.liste_urler.length > 0, 'mindst én liste-URL kræves');
  for (const [i, l] of (k.liste_urler || []).entries()){
    kraev(`liste_urler[${i}].url`, typeof l?.url === 'string' && /^https:\/\//.test(l.url),
      'skal være en absolut https-URL');
  }

  kraev('detalje_url_moenster', typeof k.detalje_url_moenster === 'string', 'mangler');
  if (typeof k.detalje_url_moenster === 'string'){
    try { byggeRegex(k.detalje_url_moenster); }
    catch (e){ fejl.push(`detalje_url_moenster: ugyldigt regex — ${e.message}`); }
  }

  kraev('selectors', k.selectors && typeof k.selectors === 'object', 'mangler');
  for (const s of PAAKRAEVEDE_SELECTORS){
    kraev(`selectors.${s}`, typeof k.selectors?.[s] === 'string' && k.selectors[s].trim(), 'mangler');
  }

  // Tilladelse er ikke et teknisk felt, men det er det vigtigste felt i filen.
  // robots.txt er en teknisk regel; et skriftligt ja er en aftale. Vi kræver
  // begge, og pipelinen nægter at køre uden.
  kraev('tilladelse_modtaget', Boolean(k.tilladelse_modtaget), 'skriftlig tilladelse mangler — kilden må ikke crawles');
  kraev('robots_tjekket', Boolean(k.robots_tjekket), 'robots.txt er ikke tjekket');

  const delay = Number(k.crawl_delay_ms);
  kraev('crawl_delay_ms', Number.isFinite(delay) && delay >= MINIMUM_DELAY_MS,
    `skal være mindst ${MINIMUM_DELAY_MS} (databasen afviser mindre)`);

  /* Valgfrie felter. De må mangle — men er de der, skal de være brugbare.
     Et ugyldigt regex ville først kaste midt i en kørsel, på det 200. kort,
     og et tomt type_vokabular ville stille og roligt give 343 annoncer uden
     type, som om kilden ikke havde nogen. */
  if (k.stand_url_moenster != null){
    try { byggeRegex(k.stand_url_moenster); }
    catch (e){ fejl.push(`stand_url_moenster: ugyldigt regex — ${e.message}`); }
  }
  if (k.type_vokabular != null){
    kraev('type_vokabular', Array.isArray(k.type_vokabular) && k.type_vokabular.length > 0
      && k.type_vokabular.every(t => typeof t === 'string' && t.trim()),
      'skal være en liste af ikke-tomme ord, eller udelades helt');
  }

  if (k.faste_felter?.saelgertype != null){
    kraev('faste_felter.saelgertype', ['privat', 'forhandler'].includes(k.faste_felter.saelgertype),
      "skal være 'privat' eller 'forhandler'");
  }

  if (fejl.length){
    throw new Error(`Konfigurationen ${k.konfig_fil} er ugyldig:\n  - ${fejl.join('\n  - ')}`);
  }
  return k;
}

/* YAML'en skriver mønsteret med inline-flag: '(?i)/produkter/...'. JavaScript
   forstår ikke (?i) inde i et mønster — kun som flag på RegExp'en. Uden den
   her oversættelse ville mønsteret kaste, og det er præcis det tilfælde
   YAML-kommentaren advarer om: stien har store begyndelsesbogstaver, så uden
   ignorecase finder vi nul annoncer. */
function byggeRegex(moenster){
  const m = String(moenster).match(/^\(\?([a-z]+)\)(.*)$/s);
  return m ? new RegExp(m[2], m[1]) : new RegExp(moenster);
}

module.exports = { laesKilde, alleKilder, validerKilde, byggeRegex, KILDE_MAPPE, MINIMUM_DELAY_MS };
