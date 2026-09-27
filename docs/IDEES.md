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
- [ ] Alt+Tab / Alt+F4 : interceptés par le système hôte, impossibles à simuler dans un navigateur ; à remplacer par un raccourci maison si besoin.

- [ ] Glisser-déposer entre fenêtres : fichier sur la Poubelle d'État (refusé), image sur le Bloc-notes (qui s'offusque).
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
- [ ] Carte de partage (Open Graph) : image du moniteur allumé, titre et description soignés.
- [ ] Charger les notices Porkopédia (130 Ko) seulement à l'ouverture de PigNet.
- [ ] Accessibilité et clavier : Tab dans les fenêtres, Alt+F4, Alt+Tab.
