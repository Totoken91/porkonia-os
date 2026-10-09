<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Règles communes à tous les agents (Claude, Codex)

- **Données conservées dans le navigateur** : uniquement par le registre `src/os/stockage.ts` (`cle(nom, { profil, pack, hote })`). Aucune chaîne `porkos.…` écrite ailleurs dans `src/` : `tests/stockage.test.ts` la refuse. Ne jamais changer la forme d'une clé existante sans migration. Un magasin gardé dans un module s'abonne à `surProfil` (`src/os/profilActif.ts`). Détails : `docs/ARCHITECTURE.md`, « Comptes, profils et stockage ».
- **Documentation** : les guides de `docs/` décrivent l'état actuel et se corrigent avec le code. Une livraison se raconte dans `docs/journal/AAAA-MM-JJ-sujet.md` (choix, validation, prompts d'images). Pas de comptes de tests dans les guides. Index : `docs/README.md`.
