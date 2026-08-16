#!/usr/bin/env node
/* Kommandolinjen.

     npm run crawl -- --source=mcsyd --limit=20
     npm run crawl -- --alle
     npm run crawl -- --source=mcsyd --limit=5 --toerloeb

   --toerloeb kører hele pipelinen og skriver ingenting til databasen. Det er
   den måde, en ny YAML-fil skal afprøves på: man ser præcis hvad der ville
   være blevet gemt, uden at have rørt kataloget. */

const { koerKilder } = require('./pipeline');
const { alleKilder } = require('./config');

function laesArgumenter(argv){
  const a = { kilder: [], limit: null, toerloeb: false };
  for (const arg of argv){
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m){ throw new Error(`Ukendt argument "${arg}"`); }
    const [, navn, vaerdi] = m;
    switch (navn){
      case 'source': case 'kilde':
        if (!vaerdi) throw new Error('--source kræver et navn, fx --source=mcsyd');
        a.kilder.push(...vaerdi.split(',').map(s => s.trim()).filter(Boolean));
        break;
      case 'alle':
        a.kilder.push(...alleKilder());
        break;
      case 'limit': {
        const n = Number(vaerdi);
        if (!Number.isInteger(n) || n < 1) throw new Error('--limit kræver et helt tal over 0');
        a.limit = n;
        break;
      }
      case 'toerloeb': case 'dry-run':
        a.toerloeb = true;
        break;
      case 'hjaelp': case 'help':
        a.hjaelp = true;
        break;
      default:
        throw new Error(`Ukendt flag "--${navn}"`);
    }
  }
  return a;
}

const HJAELP = `
Bikerbasen crawler

  npm run crawl -- --source=<navn>     kør én kilde (sources/<navn>.yaml)
  npm run crawl -- --alle              kør alle kilder i sources/
  npm run crawl -- ... --limit=<n>     stop efter n annoncer (delvis kørsel:
                                       forsvundne annoncer markeres ikke)
  npm run crawl -- ... --toerloeb      kør uden at skrive til databasen

Kræver SUPABASE_SERVICE_ROLE_KEY i miljøet (ikke ved --toerloeb).
Kendte kilder: ${alleKilder().join(', ') || '(ingen)'}

PowerShell: "npm run crawl -- --source=..." virker IKKE. PowerShell fjerner
det frie "--", og så opfatter npm --source og --limit som sine egne config-
flag i stedet for at sende dem videre. Scriptet får nul argumenter og viser
den her tekst i stedet for at køre. Kald node direkte:

    node crawler/run.js --source=mcsyd --limit=20
`.trim();

async function main(){
  let a;
  try { a = laesArgumenter(process.argv.slice(2)); }
  catch (e){ console.error(`${e.message}\n\n${HJAELP}`); process.exit(2); }

  if (a.hjaelp || !a.kilder.length){ console.log(HJAELP); process.exit(a.hjaelp ? 0 : 2); }

  const unikke = [...new Set(a.kilder)];
  const resultater = await koerKilder(unikke, { limit: a.limit, toerloeb: a.toerloeb });

  console.log('\n--- opsummering ---');
  for (const r of resultater){
    if (r.sprunget_over){ console.log(`  ${r.navn}: sprunget over`); continue; }
    if (!r.ok){ console.log(`  ${r.navn}: FEJLET — ${r.fejl?.message || 'ukendt fejl'}`); continue; }
    console.log(`  ${r.navn}: ${r.tal.fundet} fundet, ${r.tal.nye} nye, ${r.tal.opdaterede} opdaterede, ${r.tal.borte} borte`);
  }

  // Fejl på én kilde stopper ikke de andre, men kørslen som helhed skal
  // afsluttes med en fejlkode, så en cron-jobovervågning kan se det.
  process.exit(resultater.some(r => r.ok === false) ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
