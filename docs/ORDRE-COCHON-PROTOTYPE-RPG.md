# Prototype RPG intégré

Cette étape branche le modèle RPG sur le moteur de jeu et les cartes existantes. Elle ne remplace pas encore les cinq étages du prototype par la campagne de douze étages.

## Disponible

- Choix parmi les douze chevaliers, répartis entre Tank, DPS et Jambonmancien ; une innée distincte par chevalier, renforcée aux niveaux 5, 10 et 15.
- Trois actives et trois passives par classe, cinq rangs ; déblocages aux niveaux 1, 2, 3, 7, 11 et 17, plafond de niveau 20. Première active offerte, puis un point par niveau.
- Aperçu avant lancement : cible, coût, dégâts directs estimés, effet et choix du côté pour le Pas de côté. Confirmer dépense un tour ; consulter, tourner et attribuer un point ne dépensent aucun tour.
- Malédictions, saignements, collisions, ripostes, attaques annoncées des élites et du boss, interactions des douze innées, sons et effets brefs.
- Sauvegarde du build et conversion explicite d'une ancienne partie après choix d'un chevalier, en conservant carte et équipement.

Les objets nouvellement générés suivent les budgets de puissance de l'étage. Deux jambons au départ ; une provision garantie au premier ennemi vaincu puis toutes les trois victoires, en plus des trouvailles aléatoires. Les ennemis ne s'alertent automatiquement qu'à concurrence d'un adversaire avant le niveau 3, deux avant le niveau 7, puis trois. Attaquer soi-même une autre cible peut dépasser ce nombre.

## Validation et limites

185 tests unitaires passent, dont 18 couvrant spécifiquement le RPG : sauvegarde, progression, géométrie des compétences, innées, aperçu sans tour, attaques annoncées et limites de l'interruption du boss. TypeScript et compilation de production passent également.

Le parcours navigateur vérifie l'installation, les déplacements rapides, les collisions, l'inventaire, les douze choix de chevalier, l'amélioration sans consommation de tour, le ciblage, les coûts, l'explosion et la reprise de sauvegarde sur PC, mobile paysage, portrait à 390 px et portrait compact à 360 px.

Le script `scripts/ordre-cochon/parcours-rpg.mts` joue les cartes réellement générées avec chacun des douze chevaliers et trois graines : 35 victoires sur 36 essais. Les trois classes terminent le parcours. Le pilote connaît la carte entière, choisit son équipement et laisse venir les adversaires alertés pour éviter une frappe gratuite à l'approche. Ce résultat vérifie la faisabilité ; il ne mesure ni le plaisir ni la difficulté pour un joueur humain. Une défaite de Basile au troisième étage reste à surveiller lors des parties manuelles.

La campagne à douze étages, ses boss intermédiaires et ses refuges restent à intégrer. La réaffectation gratuite est prévue dans le moteur pour ces refuges, mais aucun refuge n'est actuellement créé dans les cinq étages : le bouton reste indisponible. Les compétences des niveaux 11 et 17 sont définies et testables, mais une partie normale de ce court prototype ne les atteint généralement pas. Le test navigateur utilise aussi une sauvegarde préparée pour vérifier les compétences avancées.
