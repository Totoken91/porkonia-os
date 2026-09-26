# Architecture

## Vue d'ensemble

```
Navigateur (UI « Édition Administrative 2005 »)
   │  server actions (écritures) / rendu serveur (lectures)
   ▼
src/app/actions.ts ──► src/domain/ops.ts (logique pure, testée)
   │                         │
   ▼                         ▼
src/data/store.ts  ◄── transaction(db => ops.*(db, …))
   │  JSON atomique : data/porkonia-db.json (+ data/backups/)
   ▼
src/export/*  →  /api/export, /api/medias/export, /api/publications/:n, /api/public/v1/*
src/media/*   →  /api/media/local/* (lecture seule, confinée), vérification de liens
src/bible/*   →  analyse DOCX (pure) + stockage des originaux et images (/api/bible/*)
src/import/*  →  lecture des extractions produites par scripts/porkopedia-extract.mjs (Chromium isolé, CLI)
```

Séparation demandée : interface (`src/app`, `src/components`) · logique métier (`src/domain`) · accès aux données (`src/data`) · médias (`src/media`) · export/publication (`src/export`, routes `api/`) · contextes IA (`src/domain/context*.ts`).

## Choix techniques

| Choix | Raison |
|---|---|
| Next.js 16 App Router + server actions | Une seule application, rendu serveur, pas d'API interne à maintenir pour l'UI. |
| TypeScript strict (`noUncheckedIndexedAccess`) | Robustesse du modèle de données. |
| Tailwind v4 + couche `@layer components` (`pk-*`) | Thème d'époque centralisé dans `globals.css`, utilitaires pour la mise en page. |
| Stockage V1 : fichier JSON unique | Démarre sans aucun service ; exportable/lisible ; écriture atomique (tmp + fsync + rename) ; mutations sérialisées ; rollback implicite (on travaille sur une copie). Adapté à quelques milliers d'articles. |
| Logique métier pure (`ops.ts`) | Testable sans base ; réutilisable telle quelle avec PostgreSQL en phase 2. |
| **Pas de Supabase Storage** | Décision du 26/09/2026 : les médias restent où ils sont (ChatGPT Sites / disque) ; Porkonia OS est un catalogue de références. |
| react-markdown + remark-gfm | Rendu Markdown sûr (pas de HTML brut exécuté), tableaux GFM. |

## Médias : catalogue, pas hébergement

- `location: "externe"` : URL absolue (ex. `https://porkopedia.totoken.chatgpt.site/assets/...`), affichée telle quelle.
- `location: "locale"` : chemin relatif sous `PORKONIA_MEDIA_ROOT` (défaut `./medias-locales`), servi en lecture seule par `/api/media/local/*` (anti-traversée, CSP `sandbox` pour les SVG).
- Doublons : même référence ou même SHA-256 → refus.
- Nouvelle version = nouveau média `variantOf` l'original, statut « proposition » ; l'original n'est jamais écrasé.
- Changer un chemin exige une confirmation explicite et reste dans l'historique.
- Vérification des liens : HEAD (puis GET 1 octet) côté serveur, résultat journalisé, aucune modification.
- Sauvegarde facultative : `scripts/media-backup.mjs` (fichiers nommés par empreinte, manifeste), sans toucher la base ni les références.
- Migration vers un autre hébergeur : facultative, jamais imposée (non implémentée en V1).

## Accès et sécurité

- V1 : usage local. `src/proxy.ts` impose HTTP Basic si `PORKONIA_ADMIN_PASSWORD` est défini (sauf `/api/public/*`).
- Aucune clé côté navigateur. `robots: noindex`.
- API publique : GET seulement, contenu **publié** uniquement, CORS limité à `PORKONIA_PUBLIC_CORS_ORIGIN` (défaut : Porkopédia).

## Limites connues

- Un seul utilisateur, pas de comptes.
- Stockage fichier : pas d'accès concurrent multi-processus (un seul serveur Next). Base réelle ≈ 9 Mo après import complet.
- L'extraction de Porkopédia se lance en ligne de commande (choix de sécurité : le serveur n'exécute jamais le code du site).
