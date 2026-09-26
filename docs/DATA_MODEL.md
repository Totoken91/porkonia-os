# Modèle de données (schéma v1)

Source : `src/domain/types.ts`. Tous les identifiants sont **permanents** et préfixés : `per_` (personnage), `art_` (article), `med_` (média), `bib_` (Bible), `pub_` (publication), `rev_`, `log_`, `sav_`.

## Champs communs (`BaseEntity`)

| Champ | Rôle |
|---|---|
| `id` | Identifiant permanent, indépendant du titre/slug |
| `revision` | Incrémenté à chaque écriture |
| `createdAt`, `updatedAt` | ISO 8601 |
| `deletedAt` | Corbeille (suppression logique) |
| `isDemo` | Donnée de démonstration, jamais canonique |
| `provenance` | `{ source, detail?, importedAt? }` |

## Entités

- **Character** : `slug, canonicalName, nicknames[], role, description, appearance, biography, affiliations[], relations[{targetId, kind, note}], events[], portraitMediaId, galleryMediaIds[], narrativeRefs[], status (canon|proposition|archive)`.
- **Article** : `slug, aliases[] (anciens slugs, ids Porkopédia #article=...), title, subtitle, section, tags[], lead, body (Markdown), status (brouillon|valide|publie), characterIds[], mediaIds[], coverMediaId`.
  - Syntaxe interne : `[[id-ou-slug-ou-alias|texte]]`, `![légende](media:med_xxx)`.
  - Modifier le contenu d'un article validé/publié le repasse en brouillon.
- **Media** : `name, description, kind, location (externe|locale), ref, thumbnailRef, width, height, format, sha256, characterIds[], articleIds[], canonStatus (officiel|variante|proposition|archive), variantOf, lastCheck, backupPath`.
- **BibleEntry** : `category (regles-visuelles|regles-narratives|geographie|chronologie|organisations|personnages|traditions|contraintes-generation), title, body, status, characterIds[]` + provenance obligatoire.
- **Revision** : `entityType, entityId, revision, snapshot (état complet après écriture), message, createdAt`.
- **Publication** : `number, createdAt, note, articles[] (PublishedArticle figés), manifest {added, modified, removed, unchanged}, contentHash (SHA-256), restoredFrom, verification (non-verifiee|verifiee|echec), verificationNote, verifiedAt`.
- **OperationLog**, **BackupRecord**.

## Invariants (appliqués dans `src/domain/ops.ts`, testés)

1. Toute écriture crée une révision et une entrée de journal.
2. `expectedRevision` différent de la révision courante → `CONFLIT`, rien n'est écrit.
3. Portrait officiel : média associé au personnage, statut `officiel`, pas déjà portrait d'un autre ; remplacement seulement avec `confirmReplace`.
4. Un portrait officiel ne peut être déclassé, dissocié ni mis à la corbeille.
5. Restaurer une révision = copier l'ancien état dans une **nouvelle** révision.
6. Une publication n'inclut jamais un brouillon ; un article publié repassé en brouillon garde sa dernière version publiée.
7. Restaurer une publication = nouvelle publication identique ; les brouillons ne sont pas touchés.
