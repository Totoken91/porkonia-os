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

Au premier lancement, `data/porkonia-db.json` est créé avec des **données de démonstration** (marquées « DÉMO », non canoniques). Pour partir d'une base vide : `PORKONIA_EMPTY_DB=1 npm run dev` (après avoir supprimé/renommé `data/`).

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
| `npm run porkopedia:snapshot` | Instantané lecture seule du site public pour préparer l'import |

## Modules

| Module | Écran | État V1 |
|---|---|---|
| Tableau de bord | `/` | Opérationnel (statistiques réelles) |
| Registre national des individus | `/personnages` | Opérationnel : fiches, statuts canon/proposition/archive, portrait protégé, galerie, relations, historique |
| Ministère du Lore | `/articles` | Opérationnel : Markdown + aperçu, tableaux, liens internes `[[id|texte]]`, images `media:`, alias, validation, comparaison de versions |
| Archives audiovisuelles | `/medias` | Opérationnel : références externes/locales, doublons, variantes, vérification des liens, export CSV/JSON |
| Bible canonique | `/bible` | Saisie manuelle avec provenance. **Import DOCX : phase 3** |
| Contextes IA | `/contextes` | Opérationnel, déterministe, sans appel IA |
| Préfecture des Publications | `/publication` | Instantanés immuables, manifeste, paquets JSON/Markdown, restauration, vérification déclarative |
| Intégrité, Archives, Corbeille, Journal | menu « Outils et tâches » | Opérationnels |
| API publique lecture seule | `/api/public/v1/…` | Opérationnelle localement (contenu publié uniquement) |

## Documentation

- `docs/ARCHITECTURE.md` — organisation du code et choix techniques
- `docs/DATA_MODEL.md` — modèle de données
- `docs/MIGRATION.md` — import de l'existant (Porkopédia, Bible DOCX), phase 2 PostgreSQL
- `docs/PUBLISHING.md` — circuit de publication et API
- `docs/BACKUP.md` — sauvegardes et restauration
- `docs/CHATGPT_SITES_INTEGRATION.md` — contraintes et procédure pour Porkopédia

## Sécurité

L'application n'a pas d'authentification complète en V1. **Ne pas l'exposer sur Internet** sans définir au minimum `PORKONIA_ADMIN_PASSWORD` (HTTP Basic) — l'authentification complète arrive en phase 2.
