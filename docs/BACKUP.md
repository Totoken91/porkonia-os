# Sauvegardes et conservation

## Ce qui protège les données

| Mécanisme | Où |
|---|---|
| Révisions complètes de chaque entité | `revisions` dans la base |
| Journal des opérations | `/journal` |
| Corbeille (aucune suppression physique via l'interface) | `/corbeille` |
| Écriture atomique + rollback en cas d'erreur | `src/data/store.ts` |
| Sauvegarde vérifiée (relecture + SHA-256) | bouton « Sauvegarder », `npm run backup`, automatique avant chaque publication/restauration |
| Export complet autonome | `/api/export` (format `porkonia-os/export@1`) |
| Copie facultative des fichiers médias | `npm run media:backup` |
| Copie pré-migration automatique | `data/backups/pre-migration-v<n>-*.json` |
| Sauvegarde automatique avant chaque import / annulation d'import | `data/backups/` |
| Documents sources intacts (lecture seule, nommés par empreinte) | `data/originals/` |

Emplacements : base `data/porkonia-db.json`, sauvegardes `data/backups/`, médias sauvegardés `backups/media/`. Ces dossiers ne sont **pas versionnés** dans Git : copiez-les régulièrement sur un support externe (`npm run backup -- --dest /media/disque/porkonia`).

## Vérifier qu'une sauvegarde est restaurable

- Écran **Direction des Archives** → « Tester la restauration » (aucune modification), ou `npm run backup:verify -- data/backups/<fichier>.json`.
- Le test lit le fichier, contrôle la structure, applique la migration à blanc et restaure dans un dossier temporaire en comparant les décomptes.

## Restaurer une sauvegarde (explicite, en ligne de commande)

```bash
npm run restore -- data/backups/porkonia-XXXX.json            # vérification seule
npm run restore -- data/backups/porkonia-XXXX.json --confirm  # restauration
```

La restauration : vérifie → sauvegarde l'état actuel → remplace la base atomiquement → relit et compare les décomptes → journalise. Il n'existe volontairement aucun bouton « restaurer la base ».

## Git n'est pas une sauvegarde des données

`data/`, `data-demo/`, `imports/`, `backups/` et les médias locaux ne sont **pas** versionnés. `npm run backup -- --dest <disque externe>` copie la base **et** les documents originaux (`data/originals/`) et les images extraites de la Bible (`medias-locales/bible-visuelle/`), fichiers immuables jamais écrasés.

## Médias

Les fichiers restent là où ils sont (Porkopédia / disque). `npm run media:backup` télécharge ou copie chaque média référencé vers `backups/media/<sha256>.<ext>` (jamais d'écrasement) avec un manifeste. Il ne modifie ni la base ni les références.
