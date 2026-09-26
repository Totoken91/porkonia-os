# Intégration avec Porkopédia (ChatGPT Sites)

## Constat (audit en lecture seule du 26/09/2026)

- Site : https://porkopedia.totoken.chatgpt.site/ — site **statique** (HTML + JS) servi par ChatGPT Sites.
- Contenu : `articles.js` définit `window.PORKO_ARCHIVE` (302 articles de base : `id, title, sub, section, lead, tags, image, html`).
- **41 scripts** chargés ensuite modifient ce contenu à l'exécution : correctifs éditoriaux (`editorial-*.js`, `lore-polish.js`, `content-fixes.js`), fiches de personnages (`luis-fontanillas.js`, `john-pork.js`…), remplacements d'images (`image-overrides.js`, `city-beast-overrides.js`), restaurations (`bestiary-legacy-*.js`), dimensions d'images (`image-dimensions.js`).
- Du code en ligne dans `index.html` applique aussi des surcharges, par ex. `Object.assign(articles.douzi, window.PORKO_DOUZI_EPIC)` (refonte Douzi, 12 scènes, `assets/douzi-archives/`).
- Médias : ~650 références `assets/...` (images, mp3).
- Navigation : `#article=<id>` ; ces identifiants doivent rester valides (alias dans Porkonia OS).

## Ce qui n'existe pas / n'est pas supposé

- Aucune API connue pour modifier ou déployer un site ChatGPT Sites depuis l'extérieur. Porkonia OS **ne tente aucune écriture** sur le site.
- Accès aux sources : seul le rendu public a été lu. Les sources de travail dans ChatGPT (projet Sites) n'ont pas été fournies.

## Solution retenue (repli, V1)

1. Porkonia OS crée une publication (instantané immuable + manifeste).
2. Export du paquet (`/api/publications/:n` JSON ou Markdown) : liste exacte des articles ajoutés/modifiés/retirés, avec ids, alias et médias référencés.
3. Intégration **manuelle** via ChatGPT Sites (fournir le paquet/les articles concernés dans le projet Sites).
4. Contrôle sur le site public, puis déclaration « vérifiée » / « échec » dans `/publication`.

Aucune fausse synchronisation : l'indicateur reste « non vérifiée » tant qu'un humain n'a pas contrôlé.

## Évolution possible (phase 4, à valider)

Si ChatGPT Sites permet d'ajouter un script chargeant des données distantes :
- Porkonia OS hébergé en HTTPS expose `/api/public/v1/publications/latest` (lecture seule, CORS limité à Porkopédia).
- Porkopédia chargerait ce JSON à la place d'`articles.js`.
- Prérequis : test d'intégration minimal sur une copie du site, jamais directement en production, et validation explicite.
