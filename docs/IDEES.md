# Idées d'amélioration de PorkOS

Pistes de polish visuel et d'expérience, par ordre d'impact sur l'illusion d'un vrai OS.
Cocher au fur et à mesure.

## Les plus rentables

- [x] **Vraie police d'époque** : police bitmap pixel (Pixel Operator, CC0) pour toute l'interface, identique sur tous les systèmes (plus de repli vers une police moderne lisse sur Linux/Android), avec option de mise à l'échelle entière pour des pixels nets.
- [x] **Barres de menus dans les fenêtres** (Fichier, Édition, Affichage, ?) : menus déroulants par appli, entrées fonctionnelles et entrées absurdes (« Édition › Annuler la dernière pensée »), boîte « À propos de… » par appli.
- [x] **Appli Mail** : les mails existent déjà dans le pack ; client d'époque (dossiers, liste, aperçu). Brique centrale du futur spin-off d'enquête.
- [ ] **Mode mobile soigné** : ~~baisser automatiquement l'effet tube en petite taille (rayures)~~ (fait), mode « écran seul » sans moniteur, zoom au double-tap.

## Illusion visuelle

- [x] Démarrage plus crédible : bip du BIOS, bruit de disque dur pendant le chargement, compteur « Chargement des pilotes (7/12) ».
- [ ] Effets d'écran ponctuels : léger glitch à l'apparition d'une pub, image qui « saute » à la démagnétisation, rémanence d'une seconde à l'extinction.
- [ ] Fonds d'écran en pixel art (Douzi City la nuit, Grand Banquet tramé en 16 couleurs) plutôt que des aplats unis.
- [x] Animations de menus d'époque (déroulement en 100 ms) et info-bulles jaunes au survol après une demi-seconde.
- [x] Plus d'icônes dans la zone de notification (réseau PigNet qui clignote, antivirus d'État) avec leurs bulles.
- [x] Double-clic sur l'horloge : « Date et heure », qui refuse toute modification.

## Expérience et interactions

- [x] Gestion des fenêtres d'époque : menu système sur l'icône de titre (double-clic = fermer), clic droit sur les boutons de tâche, Cascade / Mosaïque / Réduire toutes les fenêtres, lancement rapide avec « Afficher le bureau ».
- [x] Écran d'exception fatale (commandes secrètes `format c:`, `rm -rf /`, `deltree c:`).
- [x] Alt+Tab / Alt+F4 : interceptés par le système hôte ; remplacés par le commutateur Alt+² (Alt+F4 reste au navigateur).

- [x] Glisser-déposer entre fenêtres et vers le bureau, la Poubelle et les dossiers.
- [ ] Explorateur plus complet : affichage liste/icônes, barre d'adresse, raccourcis clavier (Ctrl+C refusé « pour votre sécurité »).
- [x] Plantages occasionnels : « PigNet Navigateur a cessé de répondre avec loyauté » (Attendre / Fermer / Signaler un collègue).
- [ ] Nouveaux jeux ou accessoires : Réussite du Banquet (solitaire), Paint d'État dont le seul pinceau dessine le Fondateur.
- [x] Commandes secrètes dans Exécuter (`sudo`, `rm`, `douzi`, Konami code…) déclenchant une séquence du Ministère.
- [x] Sauvegarde de session : retrouver ses fenêtres au retour, sauf après un arrêt brutal (ScanDisque fait la morale).

## Contenu et lore

- [ ] Exploiter les archives de l'atelier (dépôt privé porkonia-archives) : « Fichier national des citoyens » avec les 17 fiches validées, vrais portraits de la Bible dans la visionneuse.
- [x] Programmes Channel Pork tirés de vrais articles Porkopédia (Groinball, bestiaire, DJ Viteau, B.R.U.M.E., Pork ID), avec voix off (Speko : ElevenLabs et gpt-4o-mini-tts) et musique dégradée VHS ; trois chaînes en direct sur l'horloge.
- [ ] Vraies vidéos via le skill Channel Pork (champ `videoSrc`) ; plus d'émissions et de pubs pour allonger les grilles.
- [ ] Plus de variété dans les notifications et pubs, liées à l'heure réelle (« Il est 12 h 12. Pensez-y. »).
- [ ] Aide de PorkOS : fichier d'aide à l'ancienne (sommaire, index), terrain idéal pour l'humour.

## Finitions techniques

- [ ] Vercel : régler la branche de production sur `porkos` (Settings → Environments → Production → Branch Tracking) pour que chaque push déploie.
- [x] Carte de partage (Open Graph) : image du moniteur allumé (`public/og.jpg`, régénérable par `scripts/capture-og.mjs`), titre et description.
- [ ] Charger les notices Porkopédia (130 Ko) seulement à l'ouverture de PigNet.
- [ ] Accessibilité et clavier : Tab dans les fenêtres, Alt+F4, Alt+Tab.

## Audit du 27 septembre 2026

Parcours complet et inventaire du code. Le mobile est hors sujet.

### 1. Défauts visibles

- [x] Avalanche de bulles à l'ouverture de session : file d'attente, une bulle à la fois (quatre en attente au plus).
- [x] Channel Pork : bandeau coupé (il se resserre puis défile), « CANAL 1 » en double (l'incrustation n'affiche plus que le numéro vert), afficheur qui répétait le titre (désormais « titre · À suivre : … »).
- [x] Listes déroulantes, cases à cocher, boutons radio et curseurs du navigateur moderne : remplacés par des commandes d'époque dessinées maison (Nappe Vide, Réglages, PigNet).
- [x] Documentation à jour (sons en échantillons, Pixel Operator 16 px, afficheur PorkTV).
- [x] Aperçu du fond « Vert bouteille » resté blanc dans les Réglages (couleur manquante).

### 2. Fonctions d'OS

- [x] PorkAmp : lecteur d'époque dans son boîtier (temps, titre défilant, analyseur de spectre branché sur la vraie sortie, aléa, boucle, liste de lecture, touches Z X C V B), morceaux de DJ Viteau.
- [x] Télétexte sur PorkTV (PorkTexte) : touche TXT, sommaire 100, programmes des cinq chaînes en direct (101), météo de la mousse, bourse du jambon, dépêches, petites annonces, sous-pages tournantes, compteur de recherche, page 999 secrète ; remplace le guide perdu.
- [x] Gestion de fichiers d'OS : disque modifiable (créer, renommer, couper, copier, coller), glisser-déposer entre fenêtres, vers le bureau, dans un dossier ; Poubelle d'État fonctionnelle (jeter, restaurer, vider) ; Bloc-notes qui enregistre vraiment.
- [x] Calculatrice d'État (douze chiffres, touche ×12, division par zéro = table vide), Défragmenteur (disque qui se range, blocs système immobiles), PorkPaint (crayon, pinceau, gomme, pot, tampons chope/jambon/saucisse/groin, dessins enregistrés sur le disque).
- [x] Ergonomie : commutateur de tâches Alt+² (Alt+` en QWERTY ; Alt+Tab reste au vrai ordinateur), Date et heure au clic sur l'horloge (calendrier feuilletable, horloge à aiguilles), copier-coller de fichiers, documents persistants.

### 3. Contenu (à faire valider : rien d'inventé n'est présenté comme canon)

- [x] Distinctions civiques : 25 médailles (bronze, argent, or) dans « Mes décorations », rangs de « Citoyen ordinaire » à « Citoyen intégral », fanfare et bulle cliquable à la remise, retenues dans le navigateur.
- [ ] Courrier : plus de mails, qui arrivent au fil des sessions et réagissent à ce qu'on a fait.
- [ ] PigNet : pages perso de citoyens (livre d'or, compteur, « en construction »), annuaire des sites, services de l'État.
- [ ] Channel Pork : un jeu télévisé, d'autres pubs que la Douzi Ambrée.
- [ ] Secrets : commandes cachées dans Exécuter, fichiers dissimulés dans Mes documents.

### 4. Technique

- [ ] 880 Ko de JavaScript au démarrage : charger chaque appli à son ouverture.
- [ ] 18 Mo d'audio : réencoder les morceaux de 2,3 Mo en 64k mono (ils sont dégradés VHS de toute façon).
- [x] Image d'aperçu pour le partage (Open Graph).
