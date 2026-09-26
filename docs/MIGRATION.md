# Migration et import

## 1. Import de Porkopédia (phase 3 — non implémenté)

Préparation disponible : `npm run porkopedia:snapshot` télécharge en **lecture seule** `index.html` et les 41 scripts dans `imports/porkopedia-<date>/` avec un rapport (`rapport.json`). `--with-assets` copie aussi les médias.

Plan d'import prévu :
1. Rejouer les scripts dans un navigateur sans tête (Playwright) pour obtenir le **contenu effectif** affiché, pas seulement `articles.js`.
2. Pour chaque article : id Porkopédia → alias ; HTML → Markdown (conserver le HTML original dans la provenance).
3. Médias : créer des références **externes** vers `https://porkopedia.totoken.chatgpt.site/assets/...` (aucun déplacement), associer par article.
4. Prévisualisation obligatoire : rapport nouveaux / doublons / conflits / médias manquants / relations non résolues, puis validation.
5. Articles importés en statut « brouillon » ou « publié » selon décision, provenance `porkopedia:<script>`.

### Attention particulière : Sofiane Douzi

- La refonte (12 scènes illustrées, nouvelle apparence) est dans `douzi-epopee.js` (`PORKO_DOUZI_EPIC`), appliquée à l'article `douzi` par `index.html`. Les anciennes versions existent encore dans `articles.js` (`douzi`, `sofiane-douzi-fondateur`, `archive-iii-le-fondateur-sofiane-douzi`…).
- Règle : l'import doit prendre la version **effective après surcharge**, conserver les autres comme révisions/archives, et ne jamais laisser `articles.js` écraser la refonte. Aucun choix automatique « le plus récent = canon » : validation humaine.

## 2. Import de la Bible visuelle DOCX (phase 3)

Besoin : le fichier DOCX original. Plan : conservation de l'original (empreinte), extraction par titres en sections, prévisualisation, affectation d'une catégorie, provenance `fichier.docx#section`. Rien n'est inventé pour combler un manque.

## 3. Passage à PostgreSQL / Supabase (phase 2)

- Brouillon de schéma : `supabase/migrations/0001_schema_initial.sql` (**non appliqué**, aucune ressource créée). Sans Supabase Storage.
- `src/domain/ops.ts` reste identique ; seul `src/data/store.ts` change d'implémentation.
- Procédure : sauvegarde (`npm run backup`), import de l'export JSON dans les tables, comparaison des décomptes et empreintes, bascule par variable d'environnement.

## 4. Version du schéma local

`schemaVersion` dans la base. Aucune migration automatique : si la version ne correspond pas, l'application refuse de démarrer et renvoie ici. Toute migration future : sauvegarde d'abord, script dédié, vérification.
