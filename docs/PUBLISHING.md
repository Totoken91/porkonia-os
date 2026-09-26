# Publication

## Circuit

1. **Brouillon** — toute création ou modification de contenu.
2. **Validation** — bouton « Valider pour publication » (article sans modification en attente).
3. **Prévisualisation** — `/publication` montre le manifeste : nouveaux / modifiés / retirés / inchangés.
4. **Création de la publication** — sauvegarde automatique, puis instantané immuable (empreinte SHA-256). Les articles validés passent « publiés ».
5. **Intégration sur Porkopédia** — manuelle (voir CHATGPT_SITES_INTEGRATION.md) à partir du paquet JSON/Markdown.
6. **Vérification** — l'opérateur contrôle le site et déclare « vérifiée » ou « échec » avec un constat. Porkonia OS n'affirme jamais qu'une publication a réussi.

## Restauration

« Restaurer (republier) la n°X » crée une publication n°N+1 au contenu identique à X. Rien n'est supprimé ; les articles en cours d'édition ne changent pas.

## Exports

- `GET /api/publications/:n` — paquet JSON `porkonia-os/publication@1` (publication, manifeste, articles).
- `GET /api/publications/:n?format=md` — même contenu en Markdown.

## API publique v1 (lecture seule)

- `GET /api/public/v1/publications/latest` — dernière publication.
- `GET /api/public/v1/articles/:key` — article publié par id, slug ou alias (compatible `#article=...`).
- CORS : `PORKONIA_PUBLIC_CORS_ORIGIN` (défaut `https://porkopedia.totoken.chatgpt.site`). Jamais de brouillon ni de donnée privée.
- Cette API n'est utile au site public que si Porkonia OS est hébergé et joignable en HTTPS (phase 4) ; en V1 elle tourne en local.
