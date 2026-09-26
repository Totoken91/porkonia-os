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

Emplacements : base `data/porkonia-db.json`, sauvegardes `data/backups/`, médias sauvegardés `backups/media/`. Ces dossiers ne sont **pas versionnés** dans Git : copiez-les régulièrement sur un support externe (`npm run backup -- --dest /media/disque/porkonia`).

## Restaurer une sauvegarde (procédure manuelle, explicite)

1. Arrêter le serveur.
2. Sauvegarder l'état actuel : `npm run backup`.
3. Copier le fichier choisi : `cp data/backups/porkonia-XXXX.json data/porkonia-db.json`.
4. Relancer `npm run dev`, vérifier le tableau de bord et le journal.

Il n'existe volontairement aucun bouton « restaurer la base » : l'opération remplace tout et doit rester délibérée.

## Médias

Les fichiers restent là où ils sont (Porkopédia / disque). `npm run media:backup` télécharge ou copie chaque média référencé vers `backups/media/<sha256>.<ext>` (jamais d'écrasement) avec un manifeste. Il ne modifie ni la base ni les références.
