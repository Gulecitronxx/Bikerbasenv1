/* Redaktionelt indhold til guide-sidefamilien (guides.html + guide-*.html).

   Teksten er skrevet til Bikerbasen. Ingen forfatter-person er opfundet:
   afsenderen er "Bikerbasen". Alle regler og tal er læst i de officielle
   danske kilder, der står under "Kilder" på hver guide — og i rapporten
   docs/review/gauntlet/builder-guides.md. Hvor noget ikke kunne verificeres,
   står det ikke her.

   Kørekortreglerne er læst direkte i Bekendtgørelse om kørekort
   (BEK nr. 550 af 19/06/2026, retsinformation.dk):
     § 11  A1: tohjulet mc, højst 125 cm³, 11 kW, 0,1 kW/kg
     § 12  A2: højst 35 kW, 0,2 kW/kg, ikke afledt af mc med mere end den
           dobbelte maksimale effekt; stk. 2: uden oplysning om køreklar vægt
           bruges egenvægt + 15 kg
     § 13  A: tohjulet mc uden effektgrænse
     § 35  A1 fra 18 år
     § 36  A2 fra 20 år (A1 + 2 års erfaring + prøve, eller køreundervisning
           + prøve); stk. 2-3 særregler fra 18 år (forsvar, mekanikere)
     § 37  A fra 24 år, eller 22 år med mindst to års A2-erfaring + prøve
   Færdselsloven (LBK nr. 118 af 12/01/2026): § 81 styrthjelm, § 105
   ansvarsforsikring. Syn: BEK nr. 1685 af 16/12/2025 § 63 (syn ved ejerskifte,
   køretøjer uden periodisk syn) — ophævet fra 1. januar 2027 ved BEK nr. 259
   af 06/02/2026. */

const SRC = {
  kkbek: {
    label: 'Bekendtgørelse om kørekort (BEK nr. 550 af 19. juni 2026), §§ 11-13 og 35-37 — retsinformation.dk',
    url: 'https://www.retsinformation.dk/eli/lta/2026/550',
  },
  kkborger: {
    label: 'Kørekort til motorcykel — borger.dk',
    url: 'https://www.borger.dk/transport-trafik-rejser/biler-og-koerekort/koerekort/typer-af-koerekort/koerekort-til-motorcykel',
  },
  faerdsel: {
    label: 'Færdselsloven (LBK nr. 118 af 12. januar 2026), § 81 (styrthjelm) og § 105 (ansvarsforsikring) — retsinformation.dk',
    url: 'https://www.retsinformation.dk/eli/lta/2026/118',
  },
  ejerskifte: {
    label: 'Registrering, afmelding, ejerskifte — borger.dk',
    url: 'https://www.borger.dk/transport-trafik-rejser/Biler-og-koerekort/Biler/Registrering-afmelding-ejerskifte',
  },
  afgifter: {
    label: 'Afgifter på køretøjer — borger.dk',
    url: 'https://www.borger.dk/transport-trafik-rejser/Biler-og-koerekort/Biler/Afgifter-paa-biler',
  },
  bilbogen: {
    label: 'Den digitale Bilbog — Life in Denmark (borger.dk); opslag sker på tinglysning.dk',
    url: 'https://lifeindenmark.borger.dk/travel-and-transport/motor-vehicles/the-digital-motor-vehicle-securities-register',
  },
  koebeloven: {
    label: 'Købeloven (LBK nr. 1853 af 24. september 2021), §§ 42, 47 og 52-54 (mangler, undersøgelse, reklamation og to-årsfristen) — retsinformation.dk',
    url: 'https://www.retsinformation.dk/eli/lta/2021/1853',
  },
  syn: {
    label: 'Bekendtgørelse om godkendelse og syn af køretøjer (BEK nr. 1685 af 16. december 2025), § 63 — retsinformation.dk',
    url: 'https://www.retsinformation.dk/eli/lta/2025/1685',
  },
  synaendring: {
    label: 'Bekendtgørelse om ændring af bekendtgørelse om godkendelse og syn af køretøjer (BEK nr. 259 af 6. februar 2026) — retsinformation.dk',
    url: 'https://www.retsinformation.dk/eli/lta/2026/259',
  },
  reklamation: {
    label: 'Reklamationsfristen er to år i forbrugerkøb — Forbrugerstyrelsen (forbrug.dk)',
    url: 'https://forbrug.dk/regler/virksomheder-vejledning-om-koebeloven/reklamationsfrist',
  },
  brugtbil: {
    label: 'Køb af brugt bil: fejl og rettigheder (forskellen på forhandler og privatkøb) — Forbrugerstyrelsen (forbrug.dk)',
    url: 'https://forbrug.dk/emner/biler/koeb-af-brugt-bil',
  },
  finanstilsynet: {
    label: 'Finanstilsynet — tilsyn med forsikringsselskaber (finanstilsynet.dk)',
    url: 'https://www.finanstilsynet.dk',
  },
  ankenaevn: {
    label: 'Ankenævnet for Forsikring — klager over forsikringsselskaber (ankeforsikring.dk)',
    url: 'https://www.ankeforsikring.dk',
  },
  forbrugerombudsmanden: {
    label: 'Forbrugerombudsmanden — markedsføring over for forbrugere (forbrugerombudsmanden.dk)',
    url: 'https://www.forbrugerombudsmanden.dk',
  },
  faerdselsstyrelsen: {
    label: 'Færdselsstyrelsen — regler for færdsel og køretøjer (fstyr.dk)',
    url: 'https://fstyr.dk',
  },
  sikkertrafik: {
    label: 'Rådet for Sikker Trafik — råd om sikkerhed og udstyr (sikkertrafik.dk)',
    url: 'https://www.sikkertrafik.dk',
  },
  brugtevarer: {
    label: 'Brugte varer generelt — Forbrugerstyrelsen (forbrug.dk)',
    url: 'https://forbrug.dk/emner/nye-og-brugte-varer/brugte-varer-generelt',
  },
};

/* Standarddatoer for de tre første guides. En guide kan have egne `published`/`modified` (de to nyeste har).
   Datoerne er dagen, teksten faktisk blev skrevet eller rettet — aldrig tilbagedateret. */
const PUBLISHED = '2026-10-15';
const MODIFIED = '2026-10-15';

const GUIDES = [
  /* ------------------------------------------------------------------ 1 */
  {
    file: 'guide-foerste-motorcykel.html',
    slug: 'guide-foerste-motorcykel',
    related: ['guide-mc-typer', 'guide-brugt-motorcykel', 'guide-mc-forsikring'],
    navn: 'Sådan vælger du din første motorcykel',
    h1: 'Sådan vælger du din første motorcykel',
    title: 'Sådan vælger du din første motorcykel',
    description: 'Guide til din første motorcykel: vælg type, forstå hvad dit kørekort giver ret til, nyt eller brugt, og hvad du bør tjekke, før du køber. Med kilder.',
    ingress: 'Din første motorcykel behøver ikke være den perfekte, men den skal passe til dit kørekort, din kørsel og dit budget. Her får du en jordnær gennemgang af typer, regler, nyt eller brugt og de ting, du bør tjekke, før du siger ja.',
    cardImage: 'img/hero-960.webp',
    cardPos: '82% center',
    tldr: [
      'Start med din kørsel og dit kørekort, ikke med mærket.',
      'Tjek altid effekt og køreklar vægt i registreringsattesten, ikke kun cm³.',
      'Sæt penge af til udstyr og forsikring ved siden af købsprisen.',
      'Prøv flere motorcykler, og se papirerne, før du betaler.',
    ],
    sources: ['kkbek', 'kkborger', 'faerdsel', 'reklamation', 'brugtbil'],
    sections: [
      {
        id: 'type',
        title: 'Hvilken type motorcykel passer til dig?',
        toc: 'Hvilken type motorcykel passer til dig?',
        html: `
<p>Start ikke med mærket, men med kørslen. Skal motorcyklen mest bruges til hverdagen og pendling, til weekendture på landevejen, til lange rejser eller til veje uden asfalt? Typen afgør kørestilling, vindbeskyttelse, vægt og hvor meget du kan have med. Her er de fem typer, som mange førstegangskøbere vælger imellem.</p>
{{TYPE_TILES}}
<p>Typerne er brede kategorier, og der er stor forskel på modeller inden for samme type. Brug dem til at indsnævre søgningen, ikke som facit. Der findes også <a href="type-scooter.html">scootere</a>, <a href="type-cross.html">crossmotorcykler</a> og <a href="type-classic.html">klassikere</a>. Annoncer, hvor kilden ikke oplyser en type, vises ikke på typesiderne, men du finder dem i <a href="soegning.html">søgningen</a>.</p>`,
      },
      {
        id: 'koerekort',
        title: 'Hvad må du køre på dit kørekort?',
        toc: 'Hvad må du køre på dit kørekort?',
        html: `
<p>Dit kørekort sætter en øvre grænse for motorcyklens effekt. For en førstegangskøber er det ofte den vigtigste afgrænsning, fordi den afgør, hvilke motorcykler der overhovedet er relevante. Der er tre motorcykelkategorier:</p>
{{KK_TABLE}}
<p>Grænserne handler om effekt og køreklar vægt, ikke kun om cm³. Kategori A2 har for eksempel ingen grænse for slagvolumen. Står effekten ikke i annoncen, kan vi ikke afgøre, om en motorcykel passer til dit kørekort, og så skriver vi "Ikke oplyst" frem for at gætte. Se altid registreringsattesten, før du køber.</p>
<p>Vil du dykke ned i reglerne, har vi samlet dem i <a href="guide-a2-koerekort.html">guiden til A2-kørekort</a> og på siderne for <a href="koerekort-a1.html">kørekort A1</a> og <a href="koerekort-a2.html">kørekort A2</a>.</p>`,
      },
      {
        id: 'nyt-eller-brugt',
        title: 'Nyt eller brugt — hvad skal du vælge?',
        toc: 'Nyt eller brugt — hvad skal du vælge?',
        html: `
<p>Der er ikke ét rigtigt svar. Det afhænger af dit budget, og af hvor tryg du er ved selv at vurdere en motorcykels stand.</p>
<ul>
<li><strong>Ny motorcykel:</strong> du kender historikken, og stand er ikke et spørgsmål. Til gengæld binder du flere penge.</li>
<li><strong>Brugt motorcykel:</strong> du kan få mere motorcykel for pengene, men du skal selv tjekke stand, papirer og historik. Brug <a href="guide-brugt-motorcykel.html">vores tjekliste til brugt motorcykel</a>.</li>
</ul>
<p>Køber du af en forhandler, er det et forbrugerkøb med to års reklamationsret, også når varen er brugt. Hos en forhandler dækker reklamationsretten mangler, der var der ved levering, ikke normal slitage. Køber du af en privatperson, gælder de forbrugerbeskyttende regler ikke, og sælgeren kan aftale forbehold som "købt som beset", som dog ikke dækker svig. Læs mere i guiden til <a href="guide-brugt-motorcykel.html">køb af brugt motorcykel</a>. Det er en vigtig forskel at kende, før du sammenligner priser.</p>
<p>Bikerbasen viser både nye og brugte motorcykler fra forskellige kilder, og kilden står på hvert kort, så du kan se, hvem du handler med.</p>`,
      },
      {
        id: 'tjek',
        title: 'Vigtige ting at kigge efter',
        toc: 'Vigtige ting at kigge efter',
        html: `
<ul>
<li><strong>Passer den til din krop?</strong> Prøv at sidde på den. Kan du nå jorden, og kan du løfte og skubbe den uden at miste kontrollen? Vægt og sædehøjde mærker du først i virkeligheden.</li>
<li><strong>Er effekten til at styre?</strong> En motorcykel, hvor kræfterne er lette at håndtere, gør det nemmere at lære. Husk, at dit kørekort sætter en øvre grænse.</li>
<li><strong>Udstyr:</strong> styrthjelm er lovpligtig for føreren og for passagerer fra 15 år, og føreren skal sørge for, at passagerer fra 5 til 15 år bruger den, medmindre passagersædet har sikkerhedssele. Pligten gælder ikke på fx en parkeringsplads (færdselsloven § 81). Jakke, handsker, bukser og støvler er ikke et lovkrav, men de hører med i budgettet.</li>
<li><strong>Forsikring:</strong> motordrevne køretøjer skal være dækket af en ansvarsforsikring (færdselsloven § 105). Indhent et tilbud, før du køber.</li>
<li><strong>Løbende udgifter:</strong> forsikring, afgifter, dæk og service kommer oveni købsprisen.</li>
<li><strong>Papirerne:</strong> se registreringsattesten og sammenlign stelnummer og oplysninger med motorcyklen.</li>
</ul>`,
      },
      {
        id: 'fejl',
        title: 'Fejl du let kan undgå som nybegynder',
        toc: 'Typiske fejl du kan undgå',
        html: `
<p>Det her er ikke statistik, men en række fælder, der er nemme at falde i, når man køber sin første motorcykel:</p>
<ol>
<li><strong>At købe efter datablad frem for efter kørsel.</strong> Flere hestekræfter gør ikke en motorcykel nemmere at lære på.</li>
<li><strong>At glemme udstyr og forsikring i budgettet.</strong> Prisen på motorcyklen er kun en del af regnskabet. Læs om <a href="guide-mc-udstyr.html">udstyr</a> og <a href="guide-mc-forsikring.html">forsikring</a>.</li>
<li><strong>At købe på billeder alene.</strong> Se motorcyklen, hvis du overhovedet kan, og få en prøvetur.</li>
<li><strong>At springe papirerne over.</strong> Registreringsattest, servicehistorik og eventuel gæld skal på bordet, før du betaler.</li>
<li><strong>At stoppe ved første motorcykel.</strong> Sammenlign flere annoncer af samme model, så du kan se, hvad der er rimeligt.</li>
</ol>`,
      },
      {
        id: 'raad',
        title: 'Sådan går du til det',
        toc: 'Sådan går du til det — vores råd',
        html: `
<p>Bikerbasen er et indeks over annoncer, ikke en forhandler, så vi anbefaler ikke bestemte modeller. Vi kan til gengæld pege på en fremgangsmåde, der virker:</p>
<ol>
<li>Afgræns med dit kørekort. Brug <a href="soegning.html?koerekort=A2">kørekortfilteret</a>, så du kun ser motorcykler, hvor de oplyste tal passer.</li>
<li>Vælg type efter din kørsel. Se <a href="type-naked.html">naked</a>, <a href="type-adventure.html">adventure</a>, <a href="type-touring.html">touring</a> og de øvrige typesider.</li>
<li>Find et par modeller, du kan lide, og sammenlign annoncer af samme model. Mange mærker har en egen side, fx under <a href="maerker.html">mærker</a>.</li>
<li>Gå til kilden, stil spørgsmål, og aftal at se motorcyklen.</li>
</ol>`,
      },
      {
        id: 'klar',
        title: 'Klar til at finde din første motorcykel?',
        toc: 'Klar til at finde din første motorcykel?',
        html: `
<p>Du har nu et overblik over typer, regler og de vigtigste tjek. Næste skridt er at se, hvad der faktisk er til salg.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a> <a class="btn btn-outline" href="koerekort-a2.html">Se kørekortfilteret</a></p>`,
      },
    ],
  },

  /* ------------------------------------------------------------------ 2 */
  {
    file: 'guide-a2-koerekort.html',
    slug: 'guide-a2-koerekort',
    related: ['guide-foerste-motorcykel', 'guide-mc-ordliste', 'guide-brugt-motorcykel'],
    /* T-001: guiden har informationsintention. "Motorcykler til A2-kørekort" er den kommercielle side
       (koerekort-a2.html); begge sider konkurrerede om samme søgning med næsten ens title og H1.
       Én tekst i title, H1, breadcrumb, oversigtskort og Article-headline. */
    navn: 'A2-kørekort: regler, alder og krav',
    h1: 'A2-kørekort: regler, alder og krav',
    title: 'A2-kørekort: regler, alder og krav',
    description: 'A2-kørekort forklaret: 35 kW, 0,2 kW/kg, afledningsreglen, alder og vejen til A. Sådan tjekker du, om en motorcykel passer. Med kilder.',
    ingress: 'A2 er for mange vejen ind i motorcykelverdenen, men reglerne handler om mere end cm³. Her gennemgår vi grænserne for effekt og vægt, hvordan du kommer fra A1 til A2 til A, og hvordan du vælger en motorcykel, der faktisk kan dokumenteres som A2.',
    cardImage: 'img/type/naked.webp',
    cardPos: 'center',
    tldr: [
      'A2 handler om effekt (højst 35 kW) og vægt (højst 0,2 kW/kg), ikke om cm³.',
      'En motorcykel afledt af en model med over 70 kW opfylder ikke A2.',
      'Står effekten ikke i annoncen, kan vi ikke afgøre det. Tjek registreringsattesten.',
      'Normalt 20 år for A2, og 22 år for A efter to års A2-erfaring.',
    ],
    sources: ['kkbek', 'kkborger'],
    sections: [
      {
        id: 'kategorier',
        title: 'De tre motorcykelkategorier',
        toc: 'De tre motorcykelkategorier',
        html: `
<p>Kørekort til motorcykel er delt i tre kategorier, og hver giver ret til at føre tohjulede motorcykler op til en bestemt grænse. Et højere kørekort dækker også de lavere kategorier.</p>
{{KK_TABLE}}
<p>Aldersgrænserne i tabellen er hovedreglerne. Der er særregler, fx for ansatte i forsvaret og for mekanikere, som kan få A2 fra 18 år, men som i en periode kun må køre i tjenesten eller ved afprøvning (kørekortbekendtgørelsen § 36, stk. 2 og 3).</p>`,
      },
      {
        id: 'a2-regler',
        title: 'Hvad må du køre med A2?',
        toc: 'Hvad må du køre med A2?',
        html: `
<p>Kørekort til A2 giver ret til at føre en tohjulet motorcykel, som opfylder <em>alle</em> tre krav:</p>
<ol>
<li>Maksimal motoreffekt på <strong>35 kW</strong>.</li>
<li>Et forhold mellem motoreffekt og køreklar vægt på højst <strong>0,2 kW pr. kg</strong>.</li>
<li>Motorcyklen er <strong>ikke afledt</strong> af en motorcykel med mere end den dobbelte maksimale effekt.</li>
</ol>
<p>Der er ingen grænse for slagvolumen. Du kan ikke se på cm³, om en motorcykel passer til A2. Til gengæld dækker A2 også de motorcykler, A1 giver ret til.</p>
<h3>Hvad er køreklar vægt?</h3>
<p>Køreklar vægt er motorcyklens egenvægt med tillæg af vand, olie og brændstof. Findes der ingen oplysning om køreklar vægt, bruger reglerne egenvægten plus 15 kg.</p>
<h3>Et regneeksempel</h3>
<p>Kravet på 0,2 kW pr. kg betyder, at en motorcykel med en køreklar vægt på 175 kg højst må have 35 kW (0,2 × 175 = 35). Er motorcyklen lettere, falder loftet: ved 150 kg er grænsen 30 kW. Først over 175 kg er det kravet på 35 kW, der sætter grænsen. Det er et regneeksempel, ikke en bestemt model.</p>
<p>35 kW svarer til ca. 47,6 hk. Det er en omregning, ikke en lovtekst: kørekortreglerne bruger kW.</p>`,
      },
      {
        id: 'afledning',
        title: 'Effektbegrænsning og afledningsreglen',
        toc: 'Effektbegrænsning og afledningsreglen',
        html: `
<p>Det er en udbredt tanke, at en kraftig motorcykel kan "gøres til A2" ved at begrænse effekten. Reglen har en grænse: motorcyklen må ikke være afledt af en motorcykel med mere end den dobbelte maksimale effekt. Dobbelt af 35 kW er 70 kW. En motorcykel, der oprindeligt er en model med over 70 kW, opfylder derfor ikke A2, selv om den er drosset.</p>
<p>Vær derfor varsom med formuleringer som "A2-venlig" eller "kan drosles" i en annonce. De er ikke dokumentation. Det, der tæller, er motorcyklens registrering og papirer. Få oplysningerne bekræftet i registreringsattesten, og spørg sælger, hvis noget er uklart. Ved tvivl kan du kontakte Motorstyrelsen eller Færdselsstyrelsen, før du køber.</p>
<p>Derfor lover Bikerbasen heller ikke, at en bestemt motorcykel "må køres" på A2. Vi viser de oplyste tal og de officielle grænser, og du tjekker attesten.</p>`,
      },
      {
        id: 'vejen',
        title: 'Vejen fra A1 til A2 til A',
        toc: 'Vejen fra A1 til A2 til A',
        html: `
<p>Du kan nå frem til de større kategorier på flere måder:</p>
<ul>
<li><strong>A1</strong> kan udstedes fra 18 år.</li>
<li><strong>A2</strong> kan udstedes fra 20 år, enten efter mindst to års erfaring som fører af lille motorcykel på et A1-kørekort og en bestået praktisk prøve på A2, eller uden A1 efter køreundervisning og en køreprøve på A2.</li>
<li><strong>A</strong> kan udstedes fra 24 år, enten efter køreundervisning og køreprøve på A, eller hvis du har A2 og består en praktisk prøve på A. Har du mindst to års erfaring som fører af mellemstor motorcykel på A2, kan A udstedes fra 22 år, efter en bestået praktisk prøve.</li>
</ul>
<h3>Praktisk</h3>
<p>Du ansøger i Borgerservice med en ansøgningsblanket, et foto og gyldig legitimation. Til en ny kategori skal du normalt bruge en lægeattest, som ikke må være mere end seks måneder gammel ved ansøgning. Ifølge borger.dk koster prøven og kørekortet 1.600 kr. i 2026, og den praktiske prøve koster 520 kr., når du tilføjer mellemstor eller stor motorcykel til et eksisterende kørekort. Priser og krav kan ændre sig, så tjek borger.dk og tal med din køreskole.</p>`,
      },
      {
        id: 'gode-valg',
        title: 'Sådan finder du en god A2-motorcykel',
        toc: 'Sådan finder du en god A2-motorcykel',
        html: `
<p>Et godt valg er først og fremmest en motorcykel, hvor A2 kan dokumenteres. Herefter handler det om det samme som ved enhver anden første motorcykel:</p>
<ul>
<li><strong>Dokumentation først.</strong> Effekt og vægt skal stå sort på hvidt i papirerne. Er der noget, du ikke kan få bekræftet, så lad være.</li>
<li><strong>Vælg type efter kørslen.</strong> Se <a href="type-naked.html">naked</a>, <a href="type-adventure.html">adventure</a>, <a href="type-cruiser.html">cruiser</a> og de øvrige typer.</li>
<li><strong>Tænk på næste kørekort.</strong> Hvis du på sigt vil have A, kan du vælge en motorcykel, du også har lyst til at beholde nogle år.</li>
<li><strong>Prøv den.</strong> Sædehøjde, vægt og kørestilling betyder mere for de fleste end de sidste hestekræfter.</li>
</ul>
<p>Vi anbefaler ikke bestemte modeller. Bikerbasen er et indeks over annoncer, og effekten er kildens oplysning, ikke vores garanti.</p>`,
      },
      {
        id: 'misforstaaelser',
        title: 'Fire misforståelser om A2',
        toc: 'Fire misforståelser om A2',
        html: `
<ol>
<li><strong>"Under 125 cm³ er altid A1."</strong> Nej. A1 kræver både højst 125 cm³, højst 11 kW og højst 0,1 kW pr. kg. En lille motor er ingen garanti for lav effekt.</li>
<li><strong>"A2 betyder højst et bestemt antal cm³."</strong> Nej. A2 har ingen grænse for slagvolumen, kun for effekt, vægtforhold og afledning.</li>
<li><strong>"Kan den drosles, passer den til A2."</strong> Ikke nødvendigvis. Motorcyklen må ikke være afledt af en model med mere end dobbelt effekt, og begrænsningen skal kunne dokumenteres.</li>
<li><strong>"Sælger siger, den er A2."</strong> Det er en påstand, ikke et bevis. Registreringsattesten og motorcyklens papirer er dokumentationen.</li>
</ol>`,
      },
      {
        id: 'filter',
        title: 'Sådan bruger du kørekortfilteret på Bikerbasen',
        toc: 'Sådan bruger du kørekortfilteret',
        html: `
<p>Når du vælger A2 i <a href="soegning.html?koerekort=A2">søgningen</a>, viser vi motorcykler, hvor den oplyste effekt ligger inden for grænsen, eller hvor sælger har oplyst, at den kan nedsættes. Kendes effekten ikke, tæller motorcyklen ikke med, for vi vil ikke give et løfte, vi ikke kan holde. Se også siderne for <a href="koerekort-a2.html">kørekort A2</a> og <a href="koerekort-a1.html">kørekort A1</a>.</p>
<p>Kørekortfilteret er en genvej, ikke en godkendelse. Kontrollér altid registreringsattesten.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html?koerekort=A2">Søg motorcykler til A2</a></p>`,
      },
    ],
  },

  /* ------------------------------------------------------------------ 3 */
  {
    file: 'guide-brugt-motorcykel.html',
    slug: 'guide-brugt-motorcykel',
    related: ['guide-mc-forsikring', 'guide-mc-ordliste', 'guide-foerste-motorcykel'],
    navn: 'Køb brugt motorcykel — det skal du tjekke',
    h1: 'Køb brugt motorcykel — det skal du tjekke',
    title: 'Køb brugt motorcykel — det skal du tjekke',
    description: 'Tjekliste til køb af brugt motorcykel: papirer, pant i Bilbogen, stand, forhandler eller privat, ejerskifte og forsikring. Med kilder.',
    ingress: 'En brugt motorcykel kan være et godt køb, men den fortæller kun så meget, som du selv får øje på. Her er en tjekliste, der tager dig fra annoncen til ejerskiftet: papirer, pant, stand, handlen og det, der skal ordnes bagefter.',
    cardImage: 'img/type/classic.webp',
    cardPos: 'center',
    tldr: [
      'Se registreringsattesten og slå stelnummeret op i Bilbogen, før du betaler.',
      'Hos en forhandler har du to års reklamationsret på mangler, der var der ved levering. Ved privatkøb afhænger det af aftalen: reklamer straks, og få aftaler og tilsagn på skrift.',
      'Som ny ejer skal du omregistrere inden for 4 hverdage.',
      'Tegn ansvarsforsikring. Det er et lovkrav.',
    ],
    sources: ['ejerskifte', 'afgifter', 'bilbogen', 'syn', 'synaendring', 'faerdsel', 'koebeloven', 'reklamation', 'brugtbil', 'brugtevarer'],
    sections: [
      {
        id: 'foer',
        title: 'Før du ser på motorcyklen',
        toc: 'Før du ser på motorcyklen',
        html: `
<p>Det meste af arbejdet sker, før du tager af sted. Gør tre ting:</p>
<ul>
<li><strong>Læs annoncen kritisk.</strong> Er årgang, kilometer, effekt og pris oplyst? På Bikerbasen står der "Ikke oplyst", når kilden ikke har skrevet et tal, og kilden står på kortet, så du kan gå videre til selve annoncen.</li>
<li><strong>Sammenlign.</strong> Se flere annoncer af samme model, så du kan vurdere, om prisen er rimelig. Nogle modeller har en egen side, og mærkesiderne samler annoncer fra flere kilder, se <a href="maerker.html">mærker</a>.</li>
<li><strong>Afklar kørekortet.</strong> Passer motorcyklens effekt til dit kørekort? Læs <a href="guide-a2-koerekort.html">guiden til A2-kørekort</a>.</li>
</ul>
<p>Er prisen markant under det, du ser andre steder, så vær ekstra opmærksom. Betal aldrig forud til en sælger, du ikke har mødt, og læs vores <a href="sikkerhed.html">råd om sikker handel</a>.</p>`,
      },
      {
        id: 'papirer',
        title: 'Papirer og registrering',
        toc: 'Papirer og registrering',
        html: `
<p>Bed om at se registreringsattesten, før du går i gang med at forhandle. Tjek:</p>
<ul>
<li>at <strong>stelnummeret</strong> på attesten er det samme som det, der står på motorcyklens stel,</li>
<li>at <strong>sælger er den registrerede ejer</strong>, eller har en fuldmagt fra ejeren,</li>
<li>at <strong>effekt og vægt</strong> på attesten passer til annoncen, og til dit kørekort,</li>
<li>at motorcyklen er <strong>registreret i Danmark</strong>. Kommer den fra udlandet, skal der som udgangspunkt betales registreringsafgift, og den skal registreres her (borger.dk).</li>
</ul>
<p>Afgiften på brugte motorcykler beregnes ifølge borger.dk på samme måde som for nye, men nedsættes efter motorcyklens værdi. Har du spørgsmål til afgiften på en konkret motorcykel, så spørg Motorstyrelsen, før du køber.</p>`,
      },
      {
        id: 'pant',
        title: 'Gæld og pant i Bilbogen',
        toc: 'Gæld og pant i Bilbogen',
        html: `
<p>En motorcykel kan være pantsat, eller sælger kan have lånt penge til den med ejendomsforbehold. Det kan du slå op i Bilbogen på <a href="https://www.tinglysning.dk" rel="noopener noreferrer">tinglysning.dk</a>. Her søger du på køretøjets stelnummer eller på sælgers oplysninger. Bilbogen viser kun gæld sikret ved pant og ejendomsforbehold. Den er ikke et ejerregister.</p>
<p>Gør opslaget, før du betaler. Er der pant, så aftal med sælger og långiver, hvordan det bliver klaret, inden pengene skifter hænder. Står du i tvivl om, hvad opslaget viser for netop din motorcykel, så spørg Tinglysningsretten.</p>`,
      },
      {
        id: 'stand',
        title: 'Stand, syn og prøvetur',
        toc: 'Stand, syn og prøvetur',
        html: `
<p>Se motorcyklen i dagslys og med kold motor, hvis du kan. Gå systematisk til værks:</p>
<ul>
<li><strong>Stel og forgaffel:</strong> bøjninger, svejsninger, lakskader og olie på gaflerne kan være tegn på en tidligere skade.</li>
<li><strong>Dæk, bremser og kæde:</strong> slidmærker og alder fortæller, hvor godt motorcyklen er passet.</li>
<li><strong>Motor og udstødning:</strong> lyt til kold start, se efter lækager, og lugt efter brændt olie.</li>
<li><strong>Elektronik og lys:</strong> prøv alle kontakter, lys, blinklys og kombiinstrument.</li>
<li><strong>Servicehistorik:</strong> bed om regninger eller stempler, og sammenhold med kilometertallet.</li>
</ul>
<p>Tag på en prøvetur, hvis sælger tillader det. Vil du være sikker, kan du få et værksted til at se på motorcyklen, før du handler.</p>
<h3>Hvad med syn?</h3>
<p>Motorcykler er som udgangspunkt ikke omfattet af periodisk syn (det gælder fx motorcykler til øvelseskørsel). Til og med 31. december 2026 gælder dog en regel om syn ved ejerskifte (BEK 1685/2025 § 63): en motorcykel, der er registreret første gang for 5-10 år siden og sidst er synet for mere end 2 år siden, eller som er registreret for mere end 10 år siden og sidst er synet for mere end 1 år siden, skal synes og godkendes senest 3 uger efter ejerskiftet, medmindre den afmeldes først. Der er undtagelser, fx ved ejerskifte mellem ægtefæller.</p>
<p>Fra 1. januar 2027 er bestemmelsen ophævet (BEK 259/2026). Handler du omkring årsskiftet, så tjek hos Færdselsstyrelsen, hvad der gælder. Spørg under alle omstændigheder sælger, hvornår motorcyklen sidst er synet.</p>`,
      },
      {
        id: 'spoergsmaal',
        title: 'Spørgsmål du bør stille sælger',
        toc: 'Spørgsmål du bør stille sælger',
        html: `
<p>Du får mere ud af en samtale med sælger, hvis du ved, hvad du vil have svar på. Skriv spørgsmålene ned, og notér svarene:</p>
<ul>
<li>Hvor længe har du ejet motorcyklen, og hvorfor sælger du den?</li>
<li>Er den nogensinde væltet eller skadet? Er der udskiftede dele efter en skade?</li>
<li>Hvornår blev den sidst serviceret, og hvad blev lavet? Kan du vise regninger?</li>
<li>Hvornår blev den sidst synet?</li>
<li>Er der pant eller lån i motorcyklen?</li>
<li>Er den ændret i forhold til fabriksudgaven, fx udstødning, effekt eller dele, der kan påvirke registreringen?</li>
<li>Må jeg få den set efter af et værksted, før vi handler?</li>
</ul>
<p>Er sælger uvillig til at svare eller til at vise papirerne, er det i sig selv en oplysning. Du behøver ikke at handle samme dag.</p>`,
      },
      {
        id: 'handlen',
        title: 'Forhandler eller privat?',
        toc: 'Forhandler eller privat?',
        html: `
<p>Hvem du køber af, afgør dine rettigheder:</p>
<ul>
<li><strong>Forhandler:</strong> et køb hos en erhvervsdrivende er et forbrugerkøb. Du har to års reklamationsret, der løber fra leveringen, også når varen er brugt. Den dækker mangler, der var til stede ved levering, ikke normal slitage, og på en brugt motorcykel afhænger det af alder og slid, hvad der er en mangel. En forhandler kan ikke fraskrive sig retten med generelle forbehold.</li>
<li><strong>Privatperson:</strong> de forbrugerbeskyttende regler gælder ikke, og din beskyttelse afhænger meget af aftalen. Har I ikke aftalt andet, gælder købeloven: du skal give sælger besked uden ugrundet ophold, efter du har opdaget fejlen (§ 52), og to år er kun den yderste frist (§ 54). Du kan ikke kræve rettet fejl, som sælgeren ikke kendte (Forbrugerstyrelsen). Mange private sælger "som beset" og uden reklamationsret. Det dækker ikke svig, og urigtige oplysninger om tilsikrede egenskaber kan give ret til erstatning (§ 42, stk. 2, og § 53). Til gengæld kan du ikke påberåbe dig fejl, som du burde have opdaget ved en undersøgelse før købet (§ 47). Gem derfor annoncen som skærmbillede, og få aftaler skriftligt. Spørg en rådgiver, hvis I bliver uenige.</li>
</ul>
<p>Uanset hvem du køber af: få en <strong>skriftlig købsaftale</strong> med motorcyklens oplysninger (mærke, model, årgang, stelnummer, kilometer), prisen og de forbehold, I har aftalt. Behold dokumentationen.</p>
<p>Vi hoster ikke annoncerne, og vi er ikke part i handlen. Vi linker til kilden, og aftalen laver du med sælger.</p>`,
      },
      {
        id: 'efter',
        title: 'Efter købet: ejerskifte og forsikring',
        toc: 'Efter købet: ejerskifte og forsikring',
        html: `
<ul>
<li><strong>Omregistrering:</strong> som ny ejer skal du omregistrere inden for 4 hverdage fra købet. Det kan du selv gøre i Motorstyrelsens app Ejerskifte eller i Motorregistret, hvor du skal bruge MitID, registreringsattesten og dit betalingskort. Ifølge borger.dk koster omregistrering i Motorregistret 340 kr. i 2026.</li>
<li><strong>Ansvarsforsikring:</strong> motordrevne køretøjer skal være dækket af en ansvarsforsikring i et selskab med Finanstilsynets tilladelse (færdselsloven § 105). Tegn den, før du kører hjem.</li>
<li><strong>Udstyr:</strong> styrthjelm er lovpligtig for føreren og for passagerer fra 15 år, og føreren skal sørge for, at passagerer fra 5 til 15 år bruger den, medmindre passagersædet har sikkerhedssele. Pligten gælder ikke på fx en parkeringsplads (færdselsloven § 81).</li>
</ul>
<p>Er du på vej til din første motorcykel, kan du læse mere i <a href="guide-foerste-motorcykel.html">guiden til din første motorcykel</a>. Er du klar til at lede efter en, så start i <a href="soegning.html">søgningen</a>.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a></p>`,
      },
    ],
  },
  /* ------------------------------------------------------------------ 4 */
  {
    file: 'guide-mc-forsikring.html',
    slug: 'guide-mc-forsikring',
    published: '2026-10-16',
    modified: '2026-10-16',
    related: ['guide-foerste-motorcykel', 'guide-brugt-motorcykel', 'guide-mc-udstyr'],
    navn: 'MC-forsikring: det skal du vide som ny motorcyklist',
    h1: 'MC-forsikring: det skal du vide som ny motorcyklist',
    title: 'MC-forsikring: det skal du vide som nybegynder',
    description: 'MC-forsikring for nye motorcyklister: hvad loven kræver, forskellen på ansvar og kasko, og hvad du bør spørge om, før du vælger. Med kilder.',
    ingress: 'Forsikring er det kedelige punkt i budgettet, indtil du får brug for den. Her får du de generelle fakta: hvad loven kræver, hvad der er frivilligt, og hvilke spørgsmål du bør stille, før du skriver under.',
    cardImage: 'img/type/touring.webp',
    cardPos: 'center',
    tldr: [
      'Ansvarsforsikring er et lovkrav (færdselsloven § 105). Den dækker skader på andre, ikke på din egen motorcykel.',
      'Vil du have din egen motorcykel dækket ved fx tyveri eller eget uheld, kræver det en kaskoforsikring. Den er frivillig.',
      'Sammenlign dækning, selvrisiko og vilkår, ikke kun prisen.',
      'Afklar forsikringen, før du kører hjem fra købet, og få tilbud i god tid.',
    ],
    sources: ['faerdsel', 'finanstilsynet', 'ankenaevn', 'forbrugerombudsmanden', 'ejerskifte'],
    sections: [
      {
        id: 'krav',
        title: 'Hvad kræver loven?',
        toc: 'Hvad kræver loven?',
        html: `
<p>Motordrevne køretøjer skal være dækket af en ansvarsforsikring i et selskab med Finanstilsynets tilladelse (færdselsloven § 105). Det er dit ansvar som ejer at sørge for, at motorcyklen er forsikret. Ansvarsforsikringen dækker den skade, du er juridisk ansvarlig for over for andre, når du kører: skade på andre personer og på andres ting.</p>
<p>Den dækker ikke skader på din egen motorcykel, og den er ikke en ulykkesforsikring for dig selv. Det er to vigtige forskelle, som mange nye opdager sent.</p>
<p>Gælder spørgsmålet et ualmindeligt køretøj, for eksempel en motorcykel, der skal importeres eller først registreres, så spørg både forsikringsselskabet og Motorstyrelsen, hvad der gælder. Lovkravet er ikke et råd om, hvilket selskab eller hvilken dækning der passer til dig. Det er blot gulvet.</p>`,
      },
      {
        id: 'typer',
        title: 'Ansvar, kasko og andre dækninger',
        toc: 'Ansvar, kasko og andre dækninger',
        html: `
<ul>
<li><strong>Ansvarsforsikring (lovkrav):</strong> dækker skader, du forvolder på andre. Det er minimum, og den skal du have for at køre lovligt.</li>
<li><strong>Kaskoforsikring (frivillig):</strong> dækker skader på din egen motorcykel. Selskaberne bruger forskellige betegnelser, for eksempel delkasko og fuld kasko, og indholdet kan være forskelligt fra selskab til selskab. Find selv svar på, om tyveri, brand, hærværk, eget uheld og skader under transport er med.</li>
<li><strong>Tillægsdækninger:</strong> nogle selskaber tilbyder for eksempel dækning af hjelm og beklædning, assistance eller en erstatningsmotorcykel. Hvad der findes, og hvad det koster, varierer. Spørg.</li>
<li><strong>Personforsikringer:</strong> ulykkes-, sundheds- og indboforsikring dækker dig som person og dine ting. Tjek i dine egne betingelser, om motorcykelkørsel er med, eller om det kræver et tillæg.</li>
</ul>
<p>Er motorcyklen købt på lån eller leasing, kan långiveren stille krav om kasko. Det står i aftalen, så læs den.</p>`,
      },
      {
        id: 'pris',
        title: 'Hvad kan påvirke prisen?',
        toc: 'Hvad kan påvirke prisen?',
        html: `
<p>Bikerbasen er ikke et forsikringsselskab, og vi nævner ingen priser. De afhænger af dig, motorcyklen og selskabet. Det, selskaberne typisk spørger til, er:</p>
<ul>
<li>din alder og din erfaring som fører,</li>
<li>din skadehistorik,</li>
<li>motorcyklens model, effekt og værdi,</li>
<li>hvor du bor, og hvor motorcyklen står om natten,</li>
<li>hvor meget du regner med at køre,</li>
<li>hvilken dækning og hvilken selvrisiko du vælger.</li>
</ul>
<p>Har du ikke en skadehistorik på motorcykel, så spørg selskabet, hvordan det indgår i tilbuddet, og om du kan ændre dækningen senere. Forsikring er en del af de løbende udgifter, og det er klogt at kende dem, før du vælger motorcykel. Der er mere om budgettet i <a href="guide-foerste-motorcykel.html">guiden til din første motorcykel</a>.</p>`,
      },
      {
        id: 'sammenlign',
        title: 'Sådan sammenligner du tilbud',
        toc: 'Sådan sammenligner du tilbud',
        html: `
<p>Den laveste pris er sjældent hele billedet. Få tilbuddene skriftligt, og stil de samme spørgsmål til alle:</p>
<ol>
<li>Hvad er selvrisikoen, og er den den samme for alle skadetyper?</li>
<li>Hvad dækker kaskoen helt konkret, og hvad er undtaget?</li>
<li>Stiller selskabet krav til sikring mod tyveri, for eksempel lås, kæde eller alarm, eller til hvor motorcyklen opbevares?</li>
<li>Hvilke krav gælder for føreren, og må andre låne motorcyklen?</li>
<li>Gælder forsikringen i udlandet, og i hvilke lande?</li>
<li>Er banekørsel, løb og træningsdage dækket? Det er ofte undtaget.</li>
<li>Hvad gælder, hvis motorcyklen står stille om vinteren? Findes der en sæsonordning?</li>
<li>Hvordan ændrer eller opsiger du aftalen, og hvilken binding er der?</li>
</ol>
<p>Læs betingelserne, ikke kun forsiden af tilbuddet. Det er i betingelserne, at undtagelserne står.</p>`,
      },
      {
        id: 'vilkaar',
        title: 'Vilkår, der kan overraske',
        toc: 'Vilkår, der kan overraske',
        html: `
<p>Det er sjældent selve prisen, der giver problemer, men et vilkår, man ikke havde læst. Tjek især disse punkter i betingelserne:</p>
<ul>
<li><strong>Sikringskrav:</strong> dækning ved tyveri kan være betinget af, at motorcyklen var låst og sikret på en bestemt måde.</li>
<li><strong>Udlån:</strong> hvis du lader en ven køre din motorcykel, er det ikke sikkert, at dækningen er den samme.</li>
<li><strong>Brug og område:</strong> bane, løb og kørsel uden for Danmark er ofte særlige emner.</li>
<li><strong>Ændringer:</strong> er motorcyklen ændret i forhold til fabriksudgaven, for eksempel udstødning eller effekt, så fortæl det. Oplysningerne, du giver, når du tegner forsikringen, skal være rigtige, og forkerte oplysninger kan få betydning for, hvad du får udbetalt.</li>
</ul>
<p>Er du i tvivl om, hvad en formulering betyder, så bed selskabet forklare det skriftligt, før du accepterer.</p>`,
      },
      {
        id: 'koeb',
        title: 'Når du køber motorcykel: rækkefølgen',
        toc: 'Når du køber motorcykel: rækkefølgen',
        html: `
<ol>
<li><strong>Før du aftaler købet:</strong> få et tilbud på forsikring til netop den motorcykel, så du kender de løbende udgifter.</li>
<li><strong>Når I har aftalt købet:</strong> sørg for, at ansvarsforsikringen er på plads, før du kører hjem. Afklar med sælger og dit selskab, hvordan overgangen sker, hvis motorcyklen allerede er registreret og forsikret hos sælger.</li>
<li><strong>Efter købet:</strong> omregistrer motorcyklen. Fristen og fremgangsmåden står i <a href="guide-brugt-motorcykel.html">guiden til køb af brugt motorcykel</a> og på borger.dk.</li>
<li><strong>Sælger du senere:</strong> giv forsikringsselskabet besked om salget.</li>
</ol>
<p>Leder du stadig efter motorcykel, kan du bruge <a href="soegning.html">søgningen</a> og se, hvad der er til salg, så du har en konkret model at bede om tilbud på.</p>`,
      },
      {
        id: 'skade',
        title: 'Hvis uheldet er ude, og hvis I er uenige',
        toc: 'Hvis uheldet er ude, og hvis I er uenige',
        html: `
<p>Meld skaden til selskabet hurtigst muligt, og gem dokumentationen: fotos, navne og kontaktoplysninger på de involverede og eventuelle vidner. Ved tyveri skal tyveriet normalt anmeldes til politiet, og selskabet vil bede om anmeldelsen.</p>
<p>Er du uenig i selskabets afgørelse, kan du først klage til selskabet og derefter til Ankenævnet for Forsikring. Mener du, at et selskab har brugt vildledende markedsføring, kan du kontakte Forbrugerombudsmanden. Finanstilsynet fører tilsyn med forsikringsselskaberne og kan oplyse, om et selskab har tilladelse.</p>`,
      },
      {
        id: 'raad',
        title: 'Vores råd',
        toc: 'Vores råd',
        html: `
<p>Vi anbefaler ikke bestemte selskaber eller produkter. Vi kan pege på en fremgangsmåde, der virker for de fleste nye: kend lovkravet, beslut om du vil have din egen motorcykel dækket, sammenlign mindst to tilbud på de samme spørgsmål, og læs betingelserne, før du skriver under.</p>
<p>Det her er generelle oplysninger og ikke forsikringsrådgivning. Din situation og dit selskabs betingelser afgør, hvad der gælder for dig.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a></p>`,
      },
    ],
  },

  /* ------------------------------------------------------------------ 5 */
  {
    file: 'guide-mc-udstyr.html',
    slug: 'guide-mc-udstyr',
    published: '2026-10-16',
    modified: '2026-10-16',
    related: ['guide-foerste-motorcykel', 'guide-mc-forsikring', 'guide-brugt-motorcykel'],
    navn: 'MC-udstyr til ny motorcyklist: hjelm og tøj',
    h1: 'MC-udstyr til ny motorcyklist: hjelm og tøj',
    title: 'MC-udstyr til nybegyndere: hjelm og tøj',
    description: 'MC-udstyr til nye motorcyklister: hjelmpligten, pasform, beklædning, hvad du prioriterer først, og hvad du ikke bør købe brugt. Med kilder.',
    ingress: 'Udstyret er det, der sidder mellem dig og asfalten. Her får du en jordnær gennemgang af hjelm, jakke, handsker og støvler: hvad loven kræver, hvad du bør kigge efter, og hvordan du prioriterer, når pengene er begrænsede.',
    cardImage: 'img/type/sport.webp',
    cardPos: 'center',
    tldr: [
      'Styrthjelm er lovpligtig for føreren (færdselsloven § 81). Den skal sidde tæt og passe til din hovedform.',
      'Mange prioriterer hjelm, handsker og støvler først. Jakke og bukser med beskyttere hører med.',
      'Se efter mærkning på udstyret, og prøv det i kørestilling.',
      'Køb ikke en brugt hjelm med ukendt historik.',
    ],
    sources: ['faerdsel', 'faerdselsstyrelsen', 'sikkertrafik'],
    sections: [
      {
        id: 'hjelm',
        title: 'Hjelmen: lov og pasform',
        toc: 'Hjelmen: lov og pasform',
        html: `
<p>Styrthjelm er lovpligtig for føreren og for passagerer fra 15 år, og føreren skal sørge for, at passagerer fra 5 til 15 år bruger den, medmindre passagersædet har sikkerhedssele. Pligten gælder ikke på fx en parkeringsplads (færdselsloven § 81). Er du i tvivl om, hvad loven kræver af hjelmens godkendelse, så spørg Færdselsstyrelsen.</p>
<h3>Typer</h3>
<p>De mest almindelige typer er den lukkede integralhjelm, den åbne jethjelm og klaphjelmen, hvor fronten kan åbnes. En lukket hjelm dækker mest af hoved og ansigt. De øvrige giver andre fordele i komfort og i, hvor nemt det er at tage på og af. Vælg efter din kørsel og efter, hvad du faktisk vil bruge.</p>
<h3>Pasform</h3>
<ul>
<li>Hjelmen skal sidde fast uden at give pressede punkter. Prøv den i butikken i en rum tid, ikke kun nogle sekunder.</li>
<li>Ryst på hovedet: hjelmen må ikke glide rundt.</li>
<li>Med stroppen spændt skal du ikke kunne trække hjelmen af forover.</li>
<li>Bruger du briller, så prøv hjelmen med dem på.</li>
</ul>
<h3>Mærkning og levetid</h3>
<p>Kig efter godkendelsesmærkningen i hjelmen, og bed forhandleren fortælle, hvilken standard den er godkendt efter. Producenterne anbefaler normalt, at en hjelm skiftes efter et hårdt slag, selv om den ser hel ud, og at den udskiftes efter nogle års brug. Følg altid producentens anvisning.</p>`,
      },
      {
        id: 'beklaedning',
        title: 'Jakke, bukser, handsker og støvler',
        toc: 'Jakke, bukser, handsker og støvler',
        html: `
<p>Loven kræver hjelm, men ikke resten. Det betyder ikke, at resten er valgfrit, hvis du vil beskytte dig selv. Almindeligt hverdagstøj, for eksempel jeans, er normalt ikke bygget til at tåle et glid hen ad asfalten.</p>
<ul>
<li><strong>Jakke og bukser:</strong> vælg tøj med indbyggede beskyttere i skuldre, albuer og knæ. Rygbeskytter er i mange jakker et tilkøb, så spørg, hvad der følger med.</li>
<li><strong>Handsker:</strong> hænderne rammer jorden tidligt, når man falder. Vælg handsker, der dækker håndleddet og sidder fast.</li>
<li><strong>Støvler:</strong> de skal støtte anklen og være stive nok til ikke at bøje uden for deres normale bevægelse. Almindelige kondisko er ikke støvler.</li>
<li><strong>Mærkning:</strong> motorcykelbeklædning kan være testet efter standarden EN 17092 og mærket med en klasse. Spørg forhandleren, hvad klassen betyder for netop det tøj og for din kørsel.</li>
</ul>
<h3>Vejr og synlighed</h3>
<p>Du bliver kold, våd og træt hurtigere på en motorcykel end i en bil. Tænk i lag, og overvej regntøj. Komfort holder dig opmærksom. Lyse farver og reflekser gør dig nemmere at se for andre trafikanter.</p>`,
      },
      {
        id: 'prioritering',
        title: 'Prioritér, når pengene er begrænsede',
        toc: 'Prioritér, når pengene er begrænsede',
        html: `
<p>Vi nævner ingen priser, fordi de varierer meget mellem mærker og forhandlere. Til gengæld kan du vælge rækkefølge. Mange vælger at starte her:</p>
<ol>
<li>Hjelm, der passer.</li>
<li>Handsker.</li>
<li>Støvler.</li>
<li>Jakke med beskyttere.</li>
<li>Bukser med beskyttere.</li>
<li>Regntøj og tilbehør.</li>
</ol>
<p>Husk, at udstyr er en del af budgettet ved siden af købsprisen, forsikring og de løbende udgifter. Læs mere i <a href="guide-foerste-motorcykel.html">guiden til din første motorcykel</a> og i <a href="guide-mc-forsikring.html">guiden til MC-forsikring</a>.</p>`,
      },
      {
        id: 'proev',
        title: 'Sådan prøver du udstyr',
        toc: 'Sådan prøver du udstyr',
        html: `
<p>Udstyr skal prøves i kørestilling, ikke kun stående foran et spejl.</p>
<ul>
<li>Sæt dig på en motorcykel i butikken, hvis forhandleren tillader det, og tag fat i styret. Strammer jakken over skuldrene? Flytter beskytterne sig?</li>
<li>Gå, bøj knæene og stræk armene. Støvler og bukser skal kunne følge med.</li>
<li>Prøv handskerne med fingrene bøjet om et greb. Sømme må ikke trykke.</li>
<li>Prøv tøjet over det, du ellers har på om efteråret og foråret.</li>
</ul>
<p>Få returret og byttevilkår oplyst, før du køber, især hvis du bestiller på nettet.</p>
<p>Tag dig tid. Udstyr, der føles næsten godt i butikken, bliver sjældent bedre efter en lang tur. Hellere en times prøvning nu end en sæson med en hjelm, der trykker, eller handsker, der gnaver. Bed gerne en medarbejder om at hjælpe med at justere stropper, ærmer og snøre, så du kan mærke forskel på det, der sidder rigtigt, og det, du bare vænner dig til.</p>`,
      },
      {
        id: 'brugt',
        title: 'Brugt udstyr',
        toc: 'Brugt udstyr',
        html: `
<p>Brugt udstyr kan spare penge, men ikke alt egner sig:</p>
<ul>
<li><strong>Hjelm:</strong> køb ikke en brugt hjelm, hvis du ikke kender dens historik. Skader kan være usynlige udefra.</li>
<li><strong>Beklædning:</strong> tjek sømme, lynlåse, lædertilstand og beskyttere. Tøj, der har været med i et styrt, kan have mistet noget af sin beskyttelse.</li>
<li><strong>Beskyttere:</strong> er de gamle, stive eller revnede, så udskift dem.</li>
</ul>
<p>Følger der udstyr med en brugt motorcykel, så vurder det med samme kritiske øjne. Se vores <a href="guide-brugt-motorcykel.html">tjekliste til køb af brugt motorcykel</a>.</p>`,
      },
      {
        id: 'fejl',
        title: 'Fejl du let kan undgå',
        toc: 'Typiske fejl du kan undgå',
        html: `
<ol>
<li><strong>At vælge efter udseende alene.</strong> Pasform og beskyttelse kommer først.</li>
<li><strong>En hjelm, der er for stor.</strong> Den kan flytte sig i et fald.</li>
<li><strong>At spare på handsker og støvler.</strong> De bruges hver gang og rammer ofte først.</li>
<li><strong>At lade udstyret blive på hylden.</strong> Det beskytter kun, når det er på, også på korte ture.</li>
<li><strong>At glemme at tjekke mærkningen.</strong> Spørg efter standard og klasse, og få det forklaret.</li>
</ol>`,
      },
      {
        id: 'raad',
        title: 'Sådan går du til det',
        toc: 'Sådan går du til det — vores råd',
        html: `
<p>Bikerbasen er et indeks over annoncer og sælger ikke udstyr, så vi anbefaler ingen mærker. Gå ind i en butik, få målt og prøvet, og stil spørgsmål om mærkning. Sæt penge af til udstyr, før du kigger på motorcyklen.</p>
<p>Er du i tvivl om, hvad du kan vente med, så start med det, der sidder tættest på kroppen og rammer først: hjelm, handsker og støvler. Resten kan du bygge op over tid, efterhånden som du lærer din egen kørsel at kende.</p>
<p>Oplysningerne her er generelle. Følg altid producentens anvisning og de aktuelle regler hos Færdselsstyrelsen.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a></p>`,
      },
    ],
  },
  /* ------------------------------------------------------------------ 6 (w9-discovery) */
  {
    file: 'guide-mc-typer.html',
    slug: 'guide-mc-typer',
    published: '2026-10-16',
    modified: '2026-10-16',
    related: ['guide-foerste-motorcykel', 'guide-mc-ordliste', 'guide-a2-koerekort'],
    navn: 'Motorcykeltyper: hvilken passer til dig?',
    h1: 'Motorcykeltyper: hvilken passer til dig?',
    title: 'Motorcykeltyper: hvilken passer til dig?',
    description: 'Naked, sport, adventure, touring, cruiser, classic, scooter og cross: sådan skiller motorcykeltyperne sig ud, og hvordan du vælger efter din kørsel. Med kilder.',
    ingress: 'Typen fortæller, hvordan en motorcykel er bygget til at blive brugt: kørestilling, vindbeskyttelse, affjedring og bagage. Her er en jordnær gennemgang af de typer, du møder i annoncerne, og de spørgsmål, der hjælper dig til den rigtige.',
    cardImage: 'img/type/adventure.webp',
    cardPos: 'center',
    tldr: [
      'Typen siger noget om kørestilling og brug, ikke om kørekort. Det gør effekten.',
      'Start med, hvor og hvor langt du kører, og om du skal have bagage eller passager med.',
      'Sæt dig på flere typer: sædehøjde og kørestilling mærker du kun på selve motorcyklen.',
      'Typerne er brede. Der er stor forskel på modeller inden for samme type.',
    ],
    sources: ['kkbek', 'kkborger'],
    sections: [
      {
        id: 'overblik',
        title: 'Fire spørgsmål, før du vælger type',
        toc: 'Fire spørgsmål, før du vælger type',
        html: `
<p>En motorcykeltype er en kategori, ikke en garanti. Inden for samme type kan modellerne være meget forskellige, men typen er et godt sted at starte, fordi den indsnævrer feltet. Stil dig selv fire spørgsmål:</p>
<ol>
<li><strong>Hvor kører du mest?</strong> By og pendling, landevej, motorvej eller grusveje?</li>
<li><strong>Hvor langt kører du ad gangen?</strong> En time om søndagen eller flere dage i træk?</li>
<li><strong>Skal der bagage eller passager med?</strong></li>
<li><strong>Hvordan sidder du?</strong> Din højde og dine ben afgør, hvor høj en motorcykel du kan have det godt med.</li>
</ol>
<p>Her er de fem typer, der oftest dukker op, når man søger efter sin første eller næste motorcykel:</p>
{{TYPE_TILES}}`,
      },
      {
        id: 'naked',
        title: 'Naked',
        toc: 'Naked: alsidig og ligefrem',
        html: `
<p>En naked er en motorcykel uden store skærme omkring forhjul og instrumenter. Motor og stel er synlige, kørestillingen er som regel oprejst, og styret sidder bredt. Det gør dem lette at overskue og alsidige: de bruges til pendling, landevejsture og leg i svingene.</p>
<p>Tilbagesiden er vinden. Uden vindskærm tager den fat i overkroppen, når farten stiger, så lange motorvejsture kan blive anstrengende. Mange kører alligevel naked på lange ture og tilføjer et lille skjold.</p>
<p>Se annoncerne under <a href="type-naked.html">naked-motorcykler</a>.</p>`,
      },
      {
        id: 'sport',
        title: 'Sport',
        toc: 'Sport: præcision og fart',
        html: `
<p>Sportsmotorcykler har kåbe, en fremadlænet kørestilling og som regel stram affjedring. De er bygget til præcision, stærke bremser og fart, og de er skabt til godt asfalt og gerne bane.</p>
<p>Prisen for præcisionen er komforten: hænder, håndled og nakke bærer mere af din vægt, og passager og bagage er sjældent en del af tanken. Mange sportsmodeller har høj effekt, så tjek altid effekten i registreringsattesten, hvis du kører på A1 eller A2. Der findes dog også lettere sportsmodeller med lavere effekt.</p>
<p>Se annoncerne under <a href="type-sport.html">sportsmotorcykler</a>.</p>`,
      },
      {
        id: 'adventure',
        title: 'Adventure og enduro',
        toc: 'Adventure og enduro: højt og alsidigt',
        html: `
<p>Adventure- og enduromodeller sidder højt, har lang fjedring og en oprejst kørestilling. De er bygget til at kunne tage både asfalt og grusveje, ofte med plads til bagage og en stor tank. Det gør dem populære til rejser.</p>
<p>Den høje sædehøjde betyder noget for, om du kan nå jorden, når du holder stille. Prøv at sidde på motorcyklen, og vær ærlig om, hvordan den føles, især når den er fyldt med bagage. Vægten kan også mærkes ved lav fart.</p>
<p>Se annoncerne under <a href="type-adventure.html">adventure- og enduromodeller</a>.</p>`,
      },
      {
        id: 'touring',
        title: 'Touring',
        toc: 'Touring: komfort på lange ture',
        html: `
<p>Touringmotorcykler er bygget til afstand: stor vindskærm eller kåbe, komfortabelt sæde, plads til bagage i kufferter og ofte plads til en passager. De kan gøre lange dage i sadlen behagelige.</p>
<p>Til gengæld er de ofte store og tunge, og de fylder mere i garagen. Vægten mærkes, når du rangerer eller kører langsomt, så tag en prøvetur, hvor du også vender om på stedet.</p>
<p>Se annoncerne under <a href="type-touring.html">touringmotorcykler</a>.</p>`,
      },
      {
        id: 'cruiser',
        title: 'Cruiser',
        toc: 'Cruiser: afslappet og klassisk',
        html: `
<p>På en cruiser sidder du lavt, med fødderne frem og ryggen afslappet. Stilen er klassisk, og tempoet er roligt. Mange føler sig hurtigt godt tilpas, fordi sædet er lavt.</p>
<p>Den lave stil har en pris i svingene: på mange cruisere rører fodhvilerne eller udstødningen asfalten, før dækkene er færdige. Prøv derfor den konkrete motorcykel og kør i dit eget tempo. Kørekort og effekt skal tjekkes på den enkelte model, også her.</p>
<p>Se annoncerne under <a href="type-cruiser.html">cruisere</a>.</p>`,
      },
      {
        id: 'andre',
        title: 'Classic, scooter og cross',
        toc: 'Classic, scooter og cross',
        html: `
<p><strong>Classic</strong> er motorcykler i retrostil eller ægte klassikere. De er ofte enkle at forstå og have med at gøre, men moderne hjælpemidler som ABS findes ikke på alle. Tjek, hvad der faktisk sidder på den motorcykel, du kigger på. Se <a href="type-classic.html">klassikere</a>.</p>
<p><strong>Scootere</strong> har automatgear og ofte plads under sædet. Store scootere kan have samme effekt som motorcykler. Kørekortreglerne handler om køretøjets art og effekt, ikke om modellens navn, så tjek registreringsattesten. Se <a href="type-scooter.html">scootere</a>.</p>
<p><strong>Cross</strong> er bygget til terræn og bane. Mange crossmotorcykler er ikke bygget til almindelig vejkørsel, så få bekræftet, at motorcyklen er godkendt til vej, før du køber. Se <a href="type-cross.html">crossmotorcykler</a>.</p>`,
      },
      {
        id: 'koerekort',
        title: 'Type og kørekort er to forskellige ting',
        toc: 'Type og kørekort er to forskellige ting',
        html: `
<p>Typen afgør ikke, hvilket kørekort du skal bruge. Det gør motorcyklens effekt og, for A1 og A2, forholdet mellem effekt og vægt. Derfor kan en naked være til A2, mens en anden naked kræver A.</p>
{{KK_TABLE}}
<p>Står effekten ikke i annoncen, kan hverken vi eller du afgøre det ud fra typen. Læs mere i <a href="guide-a2-koerekort.html">guiden til A2-kørekort</a>, eller se <a href="koerekort-a2.html">motorcykler til A2-kørekort</a>.</p>`,
      },
      {
        id: 'valg',
        title: 'Sådan vælger du',
        toc: 'Sådan vælger du: vores råd',
        html: `
<p>Brug dine svar fra første afsnit som en tjekliste:</p>
<ul>
<li>Mest by og landevej, og du vil have noget alsidigt: kig på <a href="type-naked.html">naked</a>.</li>
<li>Du vil have præcision og kan leve med en fremadlænet stilling: kig på <a href="type-sport.html">sport</a>.</li>
<li>Du vil på langtur med bagage eller passager: kig på <a href="type-touring.html">touring</a> og <a href="type-adventure.html">adventure</a>.</li>
<li>Du vil sidde afslappet og cruise: kig på <a href="type-cruiser.html">cruiser</a>.</li>
</ul>
<p>Sæt dig på flere motorcykler, før du bestemmer dig, og tag en prøvetur, hvis du kan. Se også vores <a href="guide-brugt-motorcykel.html">tjekliste til køb af brugt motorcykel</a> og <a href="guide-mc-udstyr.html">guiden til udstyr</a>.</p>
<p>Bikerbasen er et indeks over annoncer og anbefaler ikke bestemte modeller. Beskrivelserne her er generelle og gælder ikke alle modeller inden for en type.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a></p>`,
      },
    ],
  },
  /* ------------------------------------------------------------------ 7 (w9-discovery) */
  {
    file: 'guide-mc-ordliste.html',
    slug: 'guide-mc-ordliste',
    published: '2026-10-16',
    modified: '2026-10-16',
    related: ['guide-a2-koerekort', 'guide-brugt-motorcykel', 'guide-mc-typer'],
    navn: 'MC-ordliste: ccm, kW, hk og andre begreber',
    h1: 'MC-ordliste: ccm, kW, hk og andre begreber',
    title: 'MC-ordliste: ccm, kW, hk og andre begreber',
    description: 'Hvad betyder ccm, kW, hk og kW/kg? Ordliste over begreberne i en motorcykelannonce, og hvordan du læser kørekortmærkerne på Bikerbasen. Med kilder.',
    ingress: 'En motorcykelannonce er fuld af forkortelser. Her forklarer vi de vigtigste, hvordan de hænger sammen med kørekortreglerne, og hvad der står på et annoncekort på Bikerbasen, og hvad der ikke gør.',
    cardImage: 'img/type/cruiser.webp',
    cardPos: 'center',
    tldr: [
      'ccm er motorens størrelse. kW og hk er effekten. 35 kW svarer til cirka 47 hk.',
      'Kørekortet afgøres af effekt og vægt, ikke af ccm alene.',
      'Står et tal ikke i annoncen, skriver vi "ikke oplyst". Vi gætter ikke.',
      'Registreringsattesten er det dokument, der gælder. Annoncen er ikke et bevis.',
    ],
    sources: ['kkbek', 'ejerskifte', 'kkborger', 'bilbogen', 'brugtbil'],
    sections: [
      {
        id: 'motor',
        title: 'Motor og effekt',
        toc: 'Motor og effekt: ccm, kW og hk',
        html: `
<dl class="gd-dl">
<dt>ccm eller cm³</dt>
<dd>Motorens slagvolumen, altså det samlede rumfang, som stemplerne fejer i cylindrene. Skrives som cm³ (kubikcentimeter), men i daglig tale og i annoncer som ccm. Et højere tal betyder ikke altid mere effekt.</dd>
<dt>kW og hk</dt>
<dd>Begge er mål for motorens effekt. kW er det officielle mål, og det er det, kørekortreglerne bruger. Hk (hestekræfter) er det mål, de fleste annoncer bruger. Cirka 0,74 kW svarer til 1 hk. Derfor er 35 kW cirka 47 hk, og 11 kW cirka 15 hk.</dd>
<dt>kW pr. kg</dt>
<dd>Forholdet mellem effekt og vægt. A1 kræver højst 0,1 kW pr. kg og A2 højst 0,2 kW pr. kg. Det er derfor, vægten også betyder noget for kørekortet.</dd>
<dt>Effektbegrænsning og afledt model</dt>
<dd>En motorcykel kan være effektbegrænset, så den ligger under en grænse. For A2 gælder desuden, at den ikke må være afledt af en model med mere end dobbelt så høj effekt. Om en motorcykel er afledt, står ikke i annoncen.</dd>
</dl>`,
      },
      {
        id: 'vaegt',
        title: 'Vægt',
        toc: 'Vægt: egenvægt og køreklar vægt',
        html: `
<dl class="gd-dl">
<dt>Køreklar vægt</dt>
<dd>Den vægt, reglerne for A1 og A2 regner med, når de sætter en grænse for kW pr. kg. Den står sjældent i annoncer.</dd>
<dt>Egenvægt</dt>
<dd>Den vægt, der står i registreringsattesten. Oplyses køreklar vægt ikke, bruger kørekortbekendtgørelsen egenvægten plus 15 kg (§ 12 stk. 2).</dd>
</dl>
<p>Det betyder, at du ikke kan afgøre kørekortet ud fra en annonce alene. Du skal se papirerne.</p>`,
      },
      {
        id: 'papirer',
        title: 'Papirer og køb',
        toc: 'Papirer og køb',
        html: `
<dl class="gd-dl">
<dt>Registreringsattest</dt>
<dd>Dokumentet, der beskriver køretøjet og dets ejer i motorregistret. Det er her, du kan tjekke effekt, vægt og identifikation.</dd>
<dt>Stelnummer</dt>
<dd>Motorcyklens unikke identifikationsnummer. Sammenlign det på motorcyklen med det, der står i papirerne.</dd>
<dt>Årgang og første registrering</dt>
<dd>Årgang er som regel produktionsåret. Første registreringsdato kan ligge senere. Spørg, hvis det betyder noget for dig.</dd>
<dt>Ejerskifte</dt>
<dd>Når motorcyklen skifter ejer, skal den omregistreres. Se <a href="guide-brugt-motorcykel.html">guiden til køb af brugt motorcykel</a>.</dd>
</dl>`,
      },
      {
        id: 'koerekort',
        title: 'Kørekortkategorier',
        toc: 'Kørekortkategorier: A1, A2 og A',
        html: `
<p>Kørekort til motorcykel er delt i tre kategorier. Et højere kørekort dækker også de lavere:</p>
{{KK_TABLE}}
<p>Læs mere i <a href="guide-a2-koerekort.html">guiden til A2-kørekort</a>.</p>`,
      },
      {
        id: 'tal',
        title: 'Tal, der ikke passer, og 48-hk-faldgruben',
        toc: 'Tal, der ikke passer sammen',
        html: `
<p>Ikke alle annoncer er skrevet omhyggeligt. To fejl går igen:</p>
<ul>
<li><strong>Effekt og ccm, der ikke kan passe sammen.</strong> En lille motor kan ikke yde hvad som helst. Når en annonce oplyser en effekt, der er urealistisk høj for den oplyste slagvolumen, viser Bikerbasen ikke en kørekortkategori. Vi retter ikke tallet og gætter ikke på, hvilket der er forkert. Spørg sælgeren, og se registreringsattesten.</li>
<li><strong>48 eller 49 hk uden kW.</strong> 35 kW er 47,6 hk, og mange kilder runder op til 48. Står der 48 eller 49 hk uden kW, kan vi derfor hverken sige, at motorcyklen kræver A, eller at den kan køres på A2. Så skriver vi "kørekort ikke afgjort" og beder dig tjekke kW i registreringsattesten.</li>
</ul>
<p>Tommelfingerreglen er den samme begge steder: et tal i en annonce er et udsagn fra sælgeren, ikke en dokumentation. Papirerne afgør.</p>`,
      },
      {
        id: 'saelger',
        title: 'Sælger, kilde og pris',
        toc: 'Sælger, kilde og pris',
        html: `
<dl class="gd-dl">
<dt>Kilde</dt>
<dd>Det sted, annoncen oprindeligt står: en forhandlers side eller en markedsplads. Bikerbasen samler annoncerne og linker til kilden. Vi sælger ikke selv, og handlen sker mellem dig og sælgeren.</dd>
<dt>Forhandler og privat sælger</dt>
<dd>Forhandler er en virksomhed, privat sælger er en person. Reglerne for reklamation er forskellige, så det betyder noget for dig som køber. Se <a href="guide-brugt-motorcykel.html">guiden til køb af brugt motorcykel</a>.</dd>
<dt>Pris ved henvendelse</dt>
<dd>Annoncen oplyser ingen pris. Det betyder ikke, at motorcyklen er gratis eller dyr, kun at prisen skal spørges om hos sælgeren.</dd>
<dt>Pant og ejendomsforbehold</dt>
<dd>Den digitale Bilbog viser, om der er tinglyst pant eller ejendomsforbehold i en motorcykel. Det er et af de ting, du bør slå op, før du betaler.</dd>
</dl>`,
      },
      {
        id: 'annonce',
        title: 'Sådan læser du et annoncekort',
        toc: 'Sådan læser du et annoncekort',
        html: `
<p>Bikerbasen viser kun det, annoncen selv oplyser. Hvad står der på et kort?</p>
<dl class="gd-dl">
<dt>Mulig A2</dt>
<dd>Effekten og slagvolumen udelukker ikke A2. Det er ikke en garanti, for vægt og afledning står ikke i annoncen.</dd>
<dt>Kræver A</dt>
<dd>Den oplyste effekt ligger over A2-grænsen på 35 kW (47 hk).</dd>
<dt>Kørekort ikke afgjort</dt>
<dd>Tallene i annoncen mangler eller passer ikke sammen, så kategorien kan ikke afgøres. Tjek registreringsattesten, eller spørg sælgeren.</dd>
<dt>Kilde og sælgertype</dt>
<dd>Kortet viser, hvor annoncen står, og om sælgeren er forhandler eller privat, når kilden oplyser det. Handlen sker hos sælgeren, ikke hos os.</dd>
<dt>Ikke oplyst</dt>
<dd>Det felt, kilden ikke oplyser, står som "ikke oplyst". Vi gætter ikke.</dd>
</dl>
<p>Når du er klar, så kig på <a href="koerekort-a2.html">motorcykler til A2-kørekort</a> eller søg på hele udvalget.</p>
<p class="gd-actions"><a class="btn btn-primary" href="soegning.html">Søg motorcykler på Bikerbasen</a></p>`,
      },
    ],
  },
];

/* Datoer for en guide, med standarden som reserve. */
const publiceret = g => g.published || PUBLISHED;
const aendret = g => g.modified || MODIFIED;

module.exports = { GUIDES, SRC, PUBLISHED, MODIFIED, publiceret, aendret };
