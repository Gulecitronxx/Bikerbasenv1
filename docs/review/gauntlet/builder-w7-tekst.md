# Builder w7-tekst (gauntlet/w7-tekst, fra 03dd9a1)

## Acceptkriterier (skrevet FØR ændringerne)
1. privatlivspolitik beskriver IP-hash-tælling præcist efter `supabase/functions/haendelse/index.ts` og `022_anonym_skrivegulv.sql` (hvad gemmes, hvor længe).
2. Alle tredjeparts-domæner i sidens CSP-meta (Supabase, Google, danbase, guloggratis) er nævnt i teksten; miniature-hotlinking (kildens server ser IP) står der.
3. Fritekst-søgeord som GA4 `search_term` efter samtykke er nævnt; tilbagekald af samtykke er beskrevet præcist (ingen indstillingsknap; "Ryd mine data" nulstiller valget; allerede sat GA-cookies fjernes ikke af os).
4. Resend/søgeagent-mails beskrives sandt ud fra koden; "ikke i brug" bruges ikke om Resend. afmeld.html tjekkes (siger ikke noget forkert; uændret).
5. `supabase/OPSAETNING.md` siger eu-west-1 (Irland), ikke Frankfurt.
6. vilkaar.html: ingen HTML-kommentar med intern begrundelse; "konto kan spærres" peger på spærringsafsnittet (§7).
7. Ingen opdigtet navn/CVR/adresse/e-mail/frist; ingen placeholders i HTML. Udkast til manglende oplysninger ligger i `docs/ejer-skal-levere.md`.
8. `scripts/tekstsider.test.js` har adfærdsinvarianter mod kildekode-fakta; hashes i `info-tekst.test.js` opdateret kun for de sider, hvor teksten bevidst er ændret.
9. `node --check` og `npm test` grønt.
