# PorkOS — Édition Citoyenne

Le système d'exploitation officiel de la République de Porkonia, jouable dans le navigateur,
façon poste administratif de 1998 : écran 4:3 (800×600) dans son moniteur beige, PorkBIOS,
écran de chargement, ouverture de session, bureau, fenêtres, menu PorkOS, bulles de notification,
publicités de la Douzi Ambrée et mises à jour obligatoires. Le moniteur s'allume et s'éteint vraiment,
les icônes se rangent sur une grille, le clic droit, « Exécuter… », les sons système et l'écran de veille répondent. Alt+² fait défiler les fenêtres ouvertes (Alt+Tab appartient au vrai ordinateur) ; un clic sur l'heure ouvre le calendrier.

> Le porc. La bière. Toujours plus.

L'ancien atelier éditorial (import Porkopédia, Bible, révisions…) est conservé sur la branche `archive/atelier`.

## Lancer

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # export statique dans out/ (aucun serveur requis)
npm start            # sert out/
```

## Vérifier

```bash
npm run typecheck
npm test             # logique pure + cohérence du pack
npm run build && npm run test:e2e   # parcours complet (bureau + mobile), captures si SHOTS=dossier
```

## Applis de la V1

| Appli | Ce qu'elle fait |
| --- | --- |
| Bienvenue dans PorkOS | Écran d'accueil à la connexion : raccourcis et « Le saviez-vous ? ». |
| PigNet Navigateur | Portail officiel d'époque (une du jour, rubriques, services de l'État, télé en direct, sondage, bourse du jambon, météo de la mousse, petites annonces, compteur de visites ; contenu dans `portal` du pack), adresses `porko://…`, Porkopédia hors ligne (12 notices intégrées, index de 470 titres), recherche, internet étranger refusé, erreur 412 ; pages perso de citoyens (porko://tonton-marcel…), annuaire, livres d'or, Anneau des pages perso (contenu dans `sites` du pack). |
| Channel Pork | Cinq chaînes en direct (toutes « Canal 1 », dont Canal 1 Météo et sa carte redessinée façon bulletin des années 90, et Canal 1 Zouk, chaîne de clips de DJ Viteau ; Canal 1 diffuse le jeu télévisé « Ferme ta gueule et réponds », épisode 1, sur une bande son complète `bande` calée sur le direct) calées sur l'horloge : on arrive en cours d'émission, on regarde ou on zappe. Rendu VHS 4:3, voix off et musique (`public/audio/channel-pork/`), bandeaux défilants, sous-titres, afficheur « en cours / à suivre » du logiciel PorkTV, télétexte PorkTexte (touche TXT : programmes en direct, météo, bourse, dépêches, annonces ; pages dans `teletexte` du pack) (vidéo réelle possible via `videoSrc`). |
| Nappe Vide | Démineur du protocole des banquets : zones de nappe vide, assiettes, Petit banquet → Niveau VII. |
| PorkAmp | Lecteur de musique d'époque dans son boîtier : afficheur, analyseur de spectre, liste de lecture (morceaux de DJ Viteau), aléa, boucle, touches Z X C V B ; pistes dans `lecteur` du pack. |
| Mes décorations | Distinctions civiques (succès) : 25 médailles décernées par ce qu'on fait sur le poste (regarder un dossier B.R.U.M.E. jusqu'au bout, réussir le Niveau VII, tenter `format c:`…), dont des secrètes, et un rang ; contenu dans `distinctions` et `rangs` du pack. |
| Panneau de configuration | Réglages qui agissent vraiment (signal CRT, fond d'écran, rappels, hymne) et d'autres qui refusent poliment. |
| Mes documents | Disque du poste (copie modifiable du système de fichiers du pack, retenue dans le navigateur) : créer, renommer, couper, copier, coller, glisser-déposer entre fenêtres et vers le bureau, Poubelle d'État (jeter, restaurer, vider) ; Bloc-notes d'État qui enregistre, Visionneuse. |
| Accessoires | Calculatrice d'État (douze chiffres, touche ×12), Défragmenteur de disque, PorkPaint (dessins enregistrés sur le disque) ; textes, palette et tampons dans `accessoires` du pack. |

## Tout est données

Rien de narratif n'est codé dans les composants : `src/content/packs/porkos.ts` décrit
utilisateurs, applis, icônes, fichiers, mails, textes de démarrage et de connexion, bandeau,
notifications, dialogues, pubs, mises à jour, programmes TV et **règles d'événements**
(`login`, `interval`, `app-open`, `signal`). Un autre pack (l'ordinateur fouillé du futur
spin-off d'enquête) réutilise les mêmes applis avec d'autres données.

Voir `docs/ARCHITECTURE.md`.

## Police

L'interface utilise **Pixel Operator** (Jayvee Enaguas, licence CC0, `src/app/fonts/`), police bitmap nette à 16 px, identique sur tous les systèmes. Les grands titres « imprimés » restent à empattements ; les pages web de PigNet gardent une police de navigateur.

## Images

Les images viennent de Porkopédia et restent hébergées là-bas (liens directs, aucune copie).
Seul l'emblème (`public/brand/`) est local. Porkopédia n'est jamais modifiée depuis ce projet.

Pour régénérer les notices intégrées à partir d'une extraction :

```bash
npm run content:porkopedia -- chemin/vers/extraction.json
```
