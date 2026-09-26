@AGENTS.md

# PORKONIA OS — consignes de travail

Application privée Next.js 16 (App Router) + TypeScript strict. Source de vérité éditoriale de l'univers de Porkonia ; Porkopédia (ChatGPT Sites) reste la vitrine publique, **jamais modifiée depuis ici**.

## Architecture (détails : docs/ARCHITECTURE.md)
- `src/domain/` — logique métier PURE (ops.ts : toutes les mutations ; integrity.ts ; context.ts ; markdown.ts client-safe ; migrate.ts ; porkopedia-import.ts ; bible-import.ts ; verify.ts). Testée par `tests/*.test.ts`.
- `src/data/store-core.ts` (+ `store.ts` server-only) — persistance : `data/porkonia-db.json` (schéma v2), `transaction()`, sauvegardes vérifiables/restaurables, originaux `data/originals/`.
- `src/bible/` — analyse DOCX (docx-parse.ts, pur) et stockage des originaux/images (docx-store.ts).
- `src/import/` — lecture des extractions ; `scripts/porkopedia-extract.mjs` — extracteur Chromium isolé.
- `src/media/` — médias locaux en lecture seule, vérification de liens.
- `src/export/` — exports complets, références médias, paquets de publication.
- `src/app/actions.ts` — seul point d'entrée des écritures depuis l'UI (server actions).
- `src/app/<module>/` — pages ; `src/components/` — UI « Édition Administrative 2005 » (classes `pk-*` dans globals.css).

## Commandes
`npm run dev` (base réelle, vide au départ) · `npm run dev:demo` (base démo, port 3001) · `npm test` · `npm run typecheck` · `npm run build` · `npm run test:e2e` / `test:e2e:import` · `npm run porkopedia:extract` · `npm run import:report` · `npm run backup` · `npm run backup:verify` · `npm run restore` · `npm run media:backup`

## Règles non négociables
- Aucune suppression physique : corbeille (`deletedAt`). Restaurer = nouvelle révision.
- Toute écriture passe par `ops.*` dans `transaction()` → révision + journal. Vérifier `expectedRevision` (conflits).
- Ne jamais remplacer un portrait / une apparence canonique sans confirmation explicite ; ne jamais modifier un chemin média sans confirmation.
- Médias : on RÉFÉRENCE (URL/chemin), on ne déplace ni ne copie. Pas de Supabase Storage.
- Publication = instantané immuable ; « vérifiée » seulement sur déclaration humaine.
- Ne jamais inventer de contenu canonique ; ne jamais écraser la refonte Douzi (article protégé, voir docs/IMPORT.md).
- Imports : toujours via plan → décisions → apply (après sauvegarde) ; idempotents ; annulables ; jamais de suppression.
- Les scripts de Porkopédia ne s'exécutent QUE dans le Chromium isolé de l'extracteur, jamais dans Node/Next.
- Portrait de personnage = référence source de la Bible ; une image générée ne remplace jamais une référence source.
- Publication locale ≠ mise à jour du site : export, déploiement (déclaré) et vérification sont des étapes distinctes.
- Aucun secret côté client. Aucune API IA payante sans activation explicite.
- Next 16 : lire `node_modules/next/dist/docs/` avant d'utiliser une API (params = Promise, `proxy.ts`, `connection()`).

## Méthode économe
Lire uniquement les fichiers du module concerné. Pas d'agents parallèles pour des modifs triviales. Valider par `npm run typecheck && npm test`, puis e2e si l'UI change.
