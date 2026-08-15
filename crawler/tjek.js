#!/usr/bin/env node
/* Verifikation: hvad står der faktisk i databasen efter en kørsel?

     npm run crawl:tjek                 seneste kørsel + 5 annoncer
     npm run crawl:tjek -- --antal=20   flere annoncer

   Læsning kræver ikke service_role: 014_aggregator.sql gør aktive annoncer
   fra aktive kilder offentligt læsbare, og den publishable nøgle ligger
   allerede i js/supabase-config.js. Er service_role sat, bruges den, fordi
   crawl_koersler kun kan læses med den. */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { projektUrl } = require('./db');

function offentligNoegle(){
  const fil = path.join(__dirname, '..', 'js', 'supabase-config.js');
  const m = fs.existsSync(fil) && fs.readFileSync(fil, 'utf8').match(/anonKey:\s*'([^']+)'/);
  return m ? m[1] : null;
}

function tal(v, enhed){ return v == null ? 'ikke oplyst' : `${v.toLocaleString('da-DK')}${enhed}`; }

async function main(){
  const antal = Number(process.argv.slice(2).find(a => a.startsWith('--antal='))?.split('=')[1] || 5);
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const noegle = service || offentligNoegle();
  if (!noegle) throw new Error('Hverken SUPABASE_SERVICE_ROLE_KEY eller en publishable nøgle kunne findes.');

  const sb = createClient(projektUrl(), noegle, { auth: { persistSession: false, autoRefreshToken: false } });
  console.log(`Læser fra ${projektUrl()} med ${service ? 'service_role' : 'publishable (offentlig læsning)'}\n`);

  const { data: kilder, error: kFejl } = await sb.from('kilder').select('id, navn, domaene, aktiv');
  if (kFejl) throw new Error(`kilder: ${kFejl.message}`);
  if (!kilder.length){ console.log('Ingen kilder registreret endnu — der er ikke kørt en crawl.'); return; }

  for (const k of kilder){
    const { count, error: cFejl } = await sb
      .from('eksterne_annoncer')
      .select('id', { count: 'exact', head: true })
      .eq('kilde_id', k.id).eq('status', 'aktiv');
    if (cFejl) throw new Error(`eksterne_annoncer: ${cFejl.message}`);
    console.log(`${k.navn} (${k.domaene})${k.aktiv ? '' : ' [INAKTIV]'}: ${count} aktive annoncer`);
  }

  if (service){
    const { data: koersler } = await sb.from('crawl_koersler')
      .select('startet, afsluttet, fundet, nye, opdaterede, borte, fejl')
      .order('startet', { ascending: false }).limit(3);
    console.log('\nSeneste kørsler:');
    for (const k of koersler || []){
      console.log(`  ${k.startet.slice(0, 19).replace('T', ' ')}  fundet=${k.fundet} nye=${k.nye} ` +
                  `opdaterede=${k.opdaterede} borte=${k.borte} kasseret=${k.fejl}` +
                  `${k.afsluttet ? '' : '  (ikke afsluttet)'}`);
    }
  }

  const { data: annoncer, error: aFejl } = await sb
    .from('eksterne_annoncer')
    .select('kilde_annonce_id, titel, maerke, model, aargang, km, ccm, pris_dkk, by, postnr, saelgertype, url, thumbnail_url, status, fingerprint, foerst_set, sidst_set')
    .eq('status', 'aktiv').order('sidst_set', { ascending: false }).limit(antal);
  if (aFejl) throw new Error(`eksterne_annoncer: ${aFejl.message}`);

  console.log(`\n${antal} annoncer som de står i databasen:\n${'='.repeat(78)}`);
  for (const a of annoncer){
    console.log(`#${a.kilde_annonce_id}  ${a.titel}`);
    console.log(`   mærke/model : ${a.maerke} / ${a.model}`);
    console.log(`   årgang      : ${a.aargang ?? 'ikke oplyst'}`);
    console.log(`   km          : ${tal(a.km, ' km')}`);
    console.log(`   pris        : ${tal(a.pris_dkk, ' kr.')}`);
    console.log(`   kubik       : ${tal(a.ccm, ' ccm')}`);
    console.log(`   sælger      : ${a.saelgertype} — ${a.postnr} ${a.by}`);
    console.log(`   status      : ${a.status}   (først set ${a.foerst_set.slice(0, 10)})`);
    console.log(`   fingerprint : ${a.fingerprint.slice(0, 16)}…`);
    console.log(`   link        : ${a.url}`);
    console.log('-'.repeat(78));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
