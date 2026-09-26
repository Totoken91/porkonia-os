@AGENTS.md

# PORKONIA OS — consignes de travail

Application privée Next.js 16 (App Router) + TypeScript strict. Source de vérité éditoriale de l'univers de Porkonia ; Porkopédia (ChatGPT Sites) reste la vitrine publique, **jamais modifiée depuis ici**.

## Architecture (détails : docs/ARCHITECTURE.md)
- `src/domain/` — logique métier PURE (ops.ts : toutes les mutations ; integrity.ts ; context.ts ; markdown.ts client-safe). Testée par `tests/*.test.ts`.
- `src/data/store.ts` — persistance V1 : un fichier JSON (`data/porkonia-db.json`), écritures atomiques via `transaction()`.
- `src/media/` — médias locaux en lecture seule, vérification de liens.
- `src/export/` — exports complets, références médias, paquets de publication.
- `src/app/actions.ts` — seul point d'entrée des écritures depuis l'UI (server actions).
- `src/app/<module>/` — pages ; `src/components/` — UI « Édition Administrative 2005 » (classes `pk-*` dans globals.css).

## Commandes
`npm run dev` · `npm test` · `npm run typecheck` · `npm run build` · `npm run test:e2e` (serveur lancé, base jetable) · `npm run backup` · `npm run media:backup` · `npm run porkopedia:snapshot`

## Règles non négociables
- Aucune suppression physique : corbeille (`deletedAt`). Restaurer = nouvelle révision.
- Toute écriture passe par `ops.*` dans `transaction()` → révision + journal. Vérifier `expectedRevision` (conflits).
- Ne jamais remplacer un portrait / une apparence canonique sans confirmation explicite ; ne jamais modifier un chemin média sans confirmation.
- Médias : on RÉFÉRENCE (URL/chemin), on ne déplace ni ne copie. Pas de Supabase Storage.
- Publication = instantané immuable ; « vérifiée » seulement sur déclaration humaine.
- Ne jamais inventer de contenu canonique ; ne jamais écraser la refonte Douzi (voir docs/MIGRATION.md).
- Aucun secret côté client. Aucune API IA payante sans activation explicite.
- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API (params = Promise, `proxy.ts`, `connection()`).

## Méthode économe
Lire uniquement les fichiers du module concerné. Pas d'agents parallèles pour des modifs triviales. Valider par `npm run typecheck && npm test`, puis e2e si l'UI change.
