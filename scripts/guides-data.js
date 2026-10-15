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
  brugtevarer: {
    label: 'Brugte varer generelt — Forbrugerstyrelsen (forbrug.dk)',
    url: 'https://forbrug.dk/emner/nye-og-brugte-varer/brugte-varer-generelt',
  },
};

const PUBLISHED = '2026-10-15';
const MODIFIED = '2026-10-15';

const GUIDES = [
  /* ------------------------------------------------------------------ 1 */
  {
    file: 'guide-foerste-motorcykel.html',
    slug: 'guide-foerste-motorcykel',
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
<li><strong>At glemme udstyr og forsikring i budgettet.</strong> Prisen på motorcyklen er kun en del af regnskabet.</li>
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
    navn: 'Motorcykler til A2-kørekort — regler og gode valg',
    h1: 'Motorcykler til A2-kørekort — regler og gode valg',
    title: 'Motorcykler til A2-kørekort — regler og gode valg',
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
];

module.exports = { GUIDES, SRC, PUBLISHED, MODIFIED };
