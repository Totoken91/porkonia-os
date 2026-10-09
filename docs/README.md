# Documentation de PorkOS

Deux sortes de documents, à ne pas mélanger.

## Guides de référence

Ils décrivent **l'état actuel** et se corrigent dans le même commit que le code qu'ils décrivent.

| Document | Sujet |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Structure du code, flux d'une session, comptes, profils et stockage, comment ajouter quelque chose |
| [COMPTES-LOCAUX.md](COMPTES-LOCAUX.md) | Comptes et sauvegardes vus par le joueur |
| [CASTING.md](CASTING.md) | Personnages et voix de Channel Pork (avec `scripts/channel-pork/casting.json`) |
| [PIGNET-PORTAIL.md](PIGNET-PORTAIL.md) | Portail PigNet et sites dédiés |
| [POIDS-PUBLIE.md](POIDS-PUBLIE.md) | Poids de l'export et stockage des déploiements Vercel |
| [IDEES.md](IDEES.md) | Pistes d'amélioration, à cocher |
| [ORDRE-COCHON-RPG.md](ORDRE-COCHON-RPG.md) | L'Ordre Cochon : règles de progression validées |
| [ORDRE-COCHON-COMPETENCES.md](ORDRE-COCHON-COMPETENCES.md) | Classes, compétences et douze chevaliers |
| [ORDRE-COCHON-EQUILIBRAGE.md](ORDRE-COCHON-EQUILIBRAGE.md) | Calibration numérique |
| [ORDRE-COCHON-FEUILLE-DE-ROUTE.md](ORDRE-COCHON-FEUILLE-DE-ROUTE.md) | Chantiers du jeu complet et leur état |
| [ORDRE-COCHON-BLASONS.md](ORDRE-COCHON-BLASONS.md) | Blasons des chevaliers et leur régénération |

## Journal des livraisons

[`journal/`](journal/) garde la trace d'une livraison : ce qui a été fait, pourquoi, comment c'est validé, prompts
d'images. Un fichier par livraison, nommé `AAAA-MM-JJ-sujet.md`. On n'y revient pas pour le mettre à jour : si l'état
change, c'est le guide concerné qui change.

Les résultats de validation (« 299 tests, parcours sur ordinateur et Poche ») vont dans le journal ou dans le message
de commit, pas dans les guides : ils y seraient faux dès le commit suivant.
