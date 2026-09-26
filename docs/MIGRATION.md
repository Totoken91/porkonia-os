# Migration et import

## 1. Import de Porkopédia et de la Bible visuelle — réalisé (phase « importation canonique »)

Voir **docs/IMPORT.md** (fonctionnement) et **docs/IMPORT_REPORT.md** (rapport de la première importation réelle).

## 3. Passage à PostgreSQL / Supabase (phase 2)

- Brouillon de schéma : `supabase/migrations/0001_schema_initial.sql` (**non appliqué**, aucune ressource créée). Sans Supabase Storage.
- `src/domain/ops.ts` reste identique ; seul `src/data/store.ts` change d'implémentation.
- Procédure : sauvegarde (`npm run backup`), import de l'export JSON dans les tables, comparaison des décomptes et empreintes, bascule par variable d'environnement.

## 4. Version du schéma local

`schemaVersion` dans la base (actuellement **2**). À l'ouverture d'une base plus ancienne :
1. copie intégrale de l'état d'origine dans `data/backups/pre-migration-v<n>-<date>.json`, relue et vérifiée par empreinte ;
2. migration **pure et additive** (`src/domain/migrate.ts`) ;
3. écriture atomique + entrée de journal « Migration de schéma ».

Une base plus récente que l'application est refusée. v1 → v2 : collections `imports` et `sources`, états de publication séparés (une ancienne vérification « vérifiée » devient une vérification **manuelle** avec déploiement déduit).
