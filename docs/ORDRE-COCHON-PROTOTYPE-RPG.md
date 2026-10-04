# Prototype RPG intégré

Cette étape branche le modèle RPG sur le moteur de jeu et les cartes existantes. Elle ne remplace pas encore les cinq étages du prototype par la campagne de douze étages.

La construction de la campagne commence par les plans conçus des étages 1–3 : entrées sûres, sorties intentionnelles, salles à thème, boucles et réserves latérales. Les nouvelles parties RPG les utilisent ; une sauvegarde garde sa carte en cours et adopte le prochain plan lors de la descente. Les étages 4–5 utilisent encore le générateur historique. La suite est suivie dans [ORDRE-COCHON-FEUILLE-DE-ROUTE.md](ORDRE-COCHON-FEUILLE-DE-ROUTE.md).

## Disponible

- Choix parmi les douze chevaliers, répartis entre Tank, DPS et Jambonmancien ; une innée distincte par chevalier, renforcée aux niveaux 5, 10 et 15.
- Trois actives et trois passives par classe, cinq rangs ; déblocages aux niveaux 1, 2, 3, 7, 11 et 17, plafond de niveau 20. Première active offerte, puis un point par niveau.
- Lancement direct au clic ou avec 1/2/3 ; seul le Pas de côté demande une destination lorsque les deux côtés sont libres. L'action dépense un tour ; consulter, tourner et attribuer un point ne dépensent aucun tour.
- Effets de combat pixelisés propres aux actives, dégâts flottants, éclats à la mort et annonce de niveau avec gains, points et nouvelles compétences accessibles.
- Malédictions, saignements, collisions, ripostes, attaques annoncées des élites et du boss, interactions des douze innées, sons et effets brefs.
- Sauvegarde du build et conversion explicite d'une ancienne partie après choix d'un chevalier, en conservant carte et équipement.

Les objets nouvellement générés suivent les budgets de puissance de l'étage. Deux jambons au départ ; une provision garantie au premier ennemi vaincu puis toutes les trois victoires, en plus des trouvailles aléatoires. Les ennemis ne s'alertent automatiquement qu'à concurrence d'un adversaire avant le niveau 3, deux avant le niveau 7, puis trois. Attaquer soi-même une autre cible peut dépasser ce nombre.

## Validation et limites

199 tests unitaires passent : sauvegarde, progression, géométrie des compétences, innées, commandes directes, retours de combat, ambiance et plans du donjon, attaques annoncées et limites de l'interruption du boss. TypeScript et compilation de production passent également.

Le parcours navigateur vérifie l'installation, les déplacements rapides, les collisions, l'inventaire, les douze choix de chevalier, l'amélioration sans consommation de tour, le ciblage, les coûts, l'explosion et la reprise de sauvegarde sur PC, mobile paysage, portrait à 390 px et portrait compact à 360 px.

Le script `scripts/ordre-cochon/parcours-rpg.mts` joue les cartes réelles avec chacun des douze chevaliers et trois graines : 36 victoires sur 36 essais après intégration des trois premiers plans. Les trois classes terminent le parcours. Le pilote connaît la carte entière, choisit son équipement et laisse venir les adversaires alertés pour éviter une frappe gratuite à l'approche. Ce résultat vérifie la faisabilité ; il ne mesure ni le plaisir ni la difficulté pour un joueur humain.

La campagne à douze étages, ses boss intermédiaires et ses refuges restent à intégrer. La réaffectation gratuite est prévue dans le moteur pour ces refuges, mais aucun refuge n'est actuellement créé dans les cinq étages : le bouton reste indisponible. Les compétences des niveaux 11 et 17 sont définies et testables, mais une partie normale de ce court prototype ne les atteint généralement pas. Le test navigateur utilise aussi une sauvegarde préparée pour vérifier les compétences avancées.
