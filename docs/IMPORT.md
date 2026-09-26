# Importation canonique

Deux sources, un même principe : **prévisualiser → décider → appliquer (après sauvegarde) → pouvoir annuler**.
Écran : **Outils et tâches → Bureau des Importations** (`/import`).

## 1. Porkopédia

### Extraction (ligne de commande)

```bash
npm run porkopedia:extract -- --check-media          # instantané du site public (GET/HEAD seulement) + extraction
npm run porkopedia:extract -- --from imports/porkopedia-<date>   # rejouer une extraction hors ligne (reproductible)
```

- Les scripts du site sont exécutés **uniquement** dans un Chromium sans tête, jamais par Node ni par le serveur.
- La page est servie depuis une origine fictive `https://porkopedia.snapshot.invalid/` à partir de l'instantané figé : toute autre requête est bloquée (y compris les tentatives d'écriture, comptées dans le rapport).
- Une sonde est injectée après chaque `<script>` dans l'ordre réel → pour chaque article : script créateur (`origin`), scripts modificateurs (`modifiedBy`), version d'origine avant transformation (`original`).
- Le contenu final est lu dans l'objet `articles` construit par `index.html`, puis chaque article est ouvert (`openArticle`) pour vérifier que le rendu correspond.
- Résultat : `imports/<ext_id>/extraction.json`. Même instantané → même identifiant et mêmes empreintes. (Deux instantanés successifs du site ont des identifiants différents car ChatGPT Sites/Cloudflare injecte un jeton variable dans `index.html` ; les empreintes d'articles restent comparables.)

### Planification et décisions (`src/domain/porkopedia-import.ts`)

| État | Signification | Défaut |
|---|---|---|
| Nouveau | Article absent de la base | importer |
| Inchangé | Même empreinte qu'au dernier import | rien (idempotence) |
| Mis à jour sur le site | Site modifié, pas de modification locale | importer (l'ancienne version reste en révision) |
| Conflit | Modifié localement ET sur le site, adresse déjà prise par un article local, ou article **protégé** | garder la version locale / ignorer |
| Corbeille | Déjà importé puis supprimé ou import annulé | ignorer (restaurer sur décision) |

- **Protection `douzi`** : la version entrante doit contenir les 12 scènes `douzi-scene`, sinon elle est refusée par défaut ; même une version valide exige une décision humaine.
- Corps conservé en **HTML d'origine** (`format: "html"`), sans conversion ; aperçu nettoyé par DOMPurify.
- Médias : références externes (URL absolue + chemin d'origine), statut « officiel » si affichées, « archive » sinon, nature « indéterminée ». Aucune copie : voir `npm run media:backup` pour une sauvegarde physique.
- Figures historiques (liste `figureAliases` de `figure-galleries.js`) : fiches « proposition », **sans portrait** (le portrait vient de la Bible).

## 2. Bible visuelle (DOCX)

Dépôt dans `/import` (ou fichier déjà présent dans `data/originals/`).

- Original copié **intact** : `data/originals/<sha256>.docx` (lecture seule) ; analyse en cache `<sha256>.analysis.json`.
- Sections découpées sur les titres ; tableaux → Markdown ; catégorie **suggérée**, à confirmer (« à classer » sinon, jamais devinée en silence).
- **Toutes** les images du paquet (y compris non placées et miniature) extraites **octet pour octet** vers `medias-locales/bible-visuelle/<sha12>/` (jamais écrasées, empreinte vérifiée).
- Portraits détectés (image + nom + « SOURCE CANONIQUE NON MODIFIÉE » ou registre des visages) → correspondance proposée avec les fiches existantes, **à valider** ; apparence « Conserver … » reprise si la fiche est vide (sinon décision : garder / remplacer / compléter).
- Portraits enregistrés comme **références sources** : `setPortrait` refuse de les remplacer par une image générée ou de nature indéterminée, même avec confirmation.
- Une fiche Bible « Visage canonique — <nom> » est créée par personnage (utilisée par les contextes IA).
- Catégories absentes du document : signalées, laissées vides.

## 3. Annulation

`/import` → « Annuler… » : les éléments créés vont à la corbeille, les éléments modifiés retrouvent leur état antérieur (nouvelle révision). Tout élément modifié **depuis** l'import est conservé et signalé. Sauvegarde automatique avant.

## 4. Rapport

`npm run import:report -- --out docs/IMPORT_REPORT.md` — état de la base, attribution par script, Douzi, médias, portraits, points à valider.
