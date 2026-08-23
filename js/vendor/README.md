# js/vendor

Tredjepartskode, sitet selv serverer. Skrevet af `scripts/vendor-supabase.js` — ret ikke i haanden.

| Fil | Pakke | Version | sha256 |
| --- | --- | --- | --- |
| `supabase.js` | `@supabase/supabase-js` (`dist/umd/supabase.js`) | 2.112.3 | `ec004176d101aec77aeef266aa1c94411287fe2039c65ea5f6c72f5e14b3847d` |

Efterproev mod npm: `npm pack @supabase/supabase-js@2.112.3` og sammenlign `package/dist/umd/supabase.js`.

Opgradér: `npm install @supabase/supabase-js@<ny> && node scripts/vendor-supabase.js`, og commit baade
`package-lock.json` og denne mappe. `scripts/stamp-version.js` giver filen nyt `?v=` automatisk.
