# Ejer skal levere — oplysninger der IKKE kan findes i koden

STATUS: UDKAST. Intet herunder er indsat på siden. Teksterne er placeholders til ejeren at udfylde og få
gennemlæst af en jurist, før de lægges i `privatlivspolitik.html` / `vilkaar.html`.
Der er med vilje ingen opdigtede værdier i HTML-siderne.

## Tjekliste
- [ ] Juridisk navn på dataansvarlig (virksomhed eller person)
- [ ] CVR-nummer (hvis virksomhed)
- [ ] Postadresse (påkrævet for dataansvarlig og af e-handelsloven)
- [ ] Opbevaringsfrist for konti/annoncer efter sletning og for rækker i `search_notifications` m.m.
- [ ] Databehandleraftale (DPA) med Supabase — bekræft, at den er accepteret i dashboardet
- [ ] DPA med Resend, hvis mails om søgeagenter slås til (og bekræft om funktionen `notify-saved-searches` er deployet)
- [ ] Cloudflare: hvis siden lægges bag Cloudflare (docs/CLOUDFLARE.md), tilføj Cloudflare som databehandler (IP-adresser ses)
- [ ] Bekræft, at GitHub/Fastly-afsnittet og eventuelle overførselsgrundlag (fx EU-U.S. Data Privacy Framework) er korrekte — er fjernet fra siden, fordi det ikke kan belægges i repoet
- [ ] Bekræft Supabase-regionen i dashboardet (siden siger eu-west-1 / Irland)
- [ ] Juristens gennemlæsning af privatlivspolitik og vilkår

## Udkast til tekst (indsættes først, når værdierne er kendt)
Dataansvarlig (punkt 1):
> [JURIDISK NAVN], CVR [CVR-NUMMER], [ADRESSE], er dataansvarlig. Kontakt: kontakt@bikerbasen.dk.

Opbevaring (punkt 6):
> Når du sletter din konto, fjerner vi dine oplysninger inden for [ANTAL DAGE] dage. Sikkerhedskopier overskrives efter [ANTAL DAGE] dage. Regnskabsmateriale opbevares i [ANTAL] år, jf. bogføringsloven.

Databehandlere (punkt 5), hvis relevant:
> Cloudflare ([SELSKAB OG LAND]) — leverer [YDELSE]; vi har en databehandleraftale.
> Resend ([SELSKAB OG LAND]) — udsender mails om søgeagenter; vi har en databehandleraftale.
