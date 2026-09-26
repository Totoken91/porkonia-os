# PORKONIA OS — Édition Administrative 2005

Centre de commande éditorial **privé** de l'univers de Porkonia : articles encyclopédiques, registre des personnages, catalogue de médias (référencés, jamais déplacés), Bible canonique, générateur de contextes IA déterministe et préparation des publications vers Porkopédia.

> Porkonia OS est la source de vérité éditoriale. Porkopédia (https://porkopedia.totoken.chatgpt.site/) reste la vitrine publique et n'est **jamais modifié automatiquement**.

## Démarrage

Prérequis : Node.js ≥ 20.

```bash
npm install
npm run dev
# → http://localhost:3000
```

Deux bases indépendantes :

- **Base réelle** (`data/`, `npm run dev`) : vide au premier lancement, alimentée par le **Bureau des Importations** (Porkopédia + Bible visuelle). Voir `docs/IMPORT.md`.
- **Base de démonstration** (`data-demo/`, `npm run dev:demo` sur le port 3001) : données inventées marquées « DÉMO », pour tester sans risque.

Aucun compte Supabase ni clé n'est nécessaire. Variables facultatives : voir `.env.example`.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build && npm start` | Version de production locale |
| `npm test` | Tests unitaires (logique métier, stockage) |
| `npm run typecheck` | Vérification TypeScript stricte |
| `npm run test:e2e` | Parcours navigateur complet (serveur lancé, **base jetable** : `PORKONIA_DATA_DIR=/tmp/pk npm run dev`) |
| `npm run backup` | Copie vérifiée de la base (option `-- --dest <dossier>`) |
| `npm run media:backup` | Sauvegarde facultative des fichiers médias référencés (`--dry-run` possible) |
| `npm run porkopedia:snapshot` | Instantané lecture seule du site public (sources brutes) |
| `npm run porkopedia:extract -- --check-media` | Extraction du contenu réellement affiché (navigateur isolé) → `imports/<ext_id>/` |
| `npm run import:report` | Rapport d'importation (Markdown), lecture seule |
| `npm run backup:verify -- <fichier>` | Vérifie qu'une sauvegarde est restaurable (restauration d'essai en dossier temporaire) |
| `npm run restore -- <fichier> --confirm` | Restaure une sauvegarde (l'état actuel est sauvegardé avant) |
| `npm run test:e2e:import` | Parcours navigateur de l'import (voir en-tête du fichier) |

## Modules

| Module | Écran | État V1 |
|---|---|---|
| Tableau de bord | `/` | Opérationnel (statistiques réelles) |
| Registre national des individus | `/personnages` | Opérationnel : fiches, statuts canon/proposition/archive, portrait protégé, galerie, relations, historique |
| Ministère du Lore | `/articles` | Opérationnel : Markdown + aperçu, tableaux, liens internes `[[id|texte]]`, images `media:`, alias, validation, comparaison de versions |
| Archives audiovisuelles | `/medias` | Opérationnel : références externes/locales, doublons, variantes, vérification des liens, export CSV/JSON |
| Bible canonique | `/bible` | Consultation par chapitres, saisie manuelle, **import DOCX** (sections, images d'origine, portraits canoniques) |
| Bureau des Importations | `/import` | Porkopédia + Bible : prévisualisation, conflits, décisions, annulation, registre |
| Contextes IA | `/contextes` | Opérationnel, déterministe, sans appel IA |
| Préfecture des Publications | `/publication` | Publication locale immuable → export → déploiement **déclaré** → vérification manuelle ou **automatique** (comparaison avec une extraction du site) |
| Intégrité, Archives, Corbeille, Journal | menu « Outils et tâches » | Opérationnels |
| API publique lecture seule | `/api/public/v1/…` | Opérationnelle localement (contenu publié uniquement) |

## Documentation

- `docs/ARCHITECTURE.md` — organisation du code et choix techniques
- `docs/DATA_MODEL.md` — modèle de données
- `docs/IMPORT.md` — importation Porkopédia et Bible visuelle
- `docs/IMPORT_REPORT.md` — rapport de la première importation réelle
- `docs/MIGRATION.md` — migrations de schéma, passage futur à PostgreSQL
- `docs/PUBLISHING.md` — circuit de publication et API
- `docs/BACKUP.md` — sauvegardes et restauration
- `docs/CHATGPT_SITES_INTEGRATION.md` — contraintes et procédure pour Porkopédia

## Sécurité

L'application n'a pas d'authentification complète en V1. **Ne pas l'exposer sur Internet** sans définir au minimum `PORKONIA_ADMIN_PASSWORD` (HTTP Basic) — l'authentification complète arrive en phase 2.
