# Prototype RPG intégré

Le modèle RPG est branché sur le moteur de jeu. La campagne est maintenant étendue à douze plans conçus en quatre actes, avec le boss final existant au douzième étage.

Les plans comportent des entrées sûres, sorties intentionnelles, salles à thème, boucles et réserves latérales. Les nouvelles parties RPG les utilisent ; une sauvegarde garde sa carte en cours et adopte le prochain plan lors de la descente. Un ancien boss sauvegardé à l'étage 5 ne termine plus la partie avant le 12. La suite est suivie dans [ORDRE-COCHON-FEUILLE-DE-ROUTE.md](ORDRE-COCHON-FEUILLE-DE-ROUTE.md).

## Disponible

- Choix parmi les douze chevaliers, répartis entre Tank, DPS et Jambonmancien ; une innée distincte par chevalier, renforcée aux niveaux 5, 10 et 15.
- Trois actives et trois passives par classe, cinq rangs ; déblocages aux niveaux 1, 2, 3, 7, 11 et 17, plafond de niveau 20. Première active offerte, puis un point par niveau.
- Lancement direct au clic ou avec 1/2/3 ; seul le Pas de côté demande une destination lorsque les deux côtés sont libres. L'action dépense un tour ; consulter, tourner et attribuer un point ne dépensent aucun tour.
- Effets de combat pixelisés propres aux actives, dégâts flottants, éclats à la mort et annonce de niveau avec gains, points et nouvelles compétences accessibles.
- Malédictions, saignements, collisions, ripostes, attaques annoncées des élites et du boss, interactions des douze innées, sons et effets brefs.
- Sauvegarde du build et conversion explicite d'une ancienne partie après choix d'un chevalier, en conservant carte et équipement.

Les objets nouvellement générés suivent les budgets de puissance de l'étage. Deux jambons au départ ; une provision garantie au premier ennemi vaincu puis toutes les trois victoires, en plus des trouvailles aléatoires. Les ennemis ne s'alertent automatiquement qu'à concurrence d'un adversaire avant le niveau 3, deux avant le niveau 7, puis trois. Attaquer soi-même une autre cible peut dépasser ce nombre.

## Validation et limites

210 tests unitaires passent : sauvegarde, progression, géométrie des compétences, innées, commandes directes, retours de combat, ambiance et douze plans du donjon, XP des adversaires tardifs, transition des anciennes parties, attaques annoncées et limites de l'interruption du boss. TypeScript et compilation de production passent également.

Le parcours navigateur vérifie l'installation, les déplacements rapides, les collisions, l'inventaire, les douze choix de chevalier, l'amélioration sans consommation de tour, le ciblage, les coûts, l'explosion et la reprise de sauvegarde sur PC, mobile paysage, portrait à 390 px et portrait compact à 360 px.

Le script `scripts/ordre-cochon/parcours-rpg.mts` joue les douze cartes réelles avec chacun des douze chevaliers et trois graines : 36 victoires sur 36 essais. Les trois classes terminent le parcours. Le pilote connaît la carte entière, choisit son équipement et laisse venir les adversaires alertés pour éviter une frappe gratuite à l'approche. Son plafond d'actions passe de 3 000 à 6 000 pour permettre un parcours de douze étages. Ce résultat vérifie la faisabilité ; il ne mesure ni le plaisir ni la difficulté pour un joueur humain.

Les boss intermédiaires et les refuges restent à intégrer. La réaffectation gratuite est prévue dans le moteur pour ces refuges, mais aucun refuge n'est actuellement créé : le bouton reste indisponible. La campagne permet désormais d'atteindre les compétences des niveaux 11 et 17 ; le test navigateur utilise aussi des sauvegardes préparées pour vérifier les compétences avancées et la victoire au douzième étage.
