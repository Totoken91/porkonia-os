# L’Ordre Cochon — règles de progression validées

Cadre validé par le joueur le 4 octobre 2026. Ce document est la référence commune pour les travaux sur le RPG. Les règles ci-dessous décrivent la cible ; le prototype reste actuellement sur cinq étages, avec des statistiques communes et sans classes implémentées.

## Campagne et niveaux

- Douze étages, organisés en quatre actes de trois étages.
- Niveau maximum du personnage : 20.
- Boss aux étages 3, 6 et 9 ; boss final à l’étage 12.
- Une exploration normale conduit au dernier étage vers le niveau 18–19. Une exploration complète permet d’atteindre le niveau 20 avant le boss final.
- Les niveaux attendus sont des cibles d’équilibrage, pas des conditions pour descendre. La progression ne doit pas exiger de tuer des ennemis à répétition.

| Étages | Progression attendue à l’entrée | Difficulté et apprentissage |
| --- | --- | --- |
| 1–3 | Niveau 1 vers 5 | Apprentissage, équipement initial, premier boss |
| 4–6 | Niveau 6 vers 10 | Ennemis complémentaires, élites, deuxième boss |
| 7–9 | Niveau 11 vers 15 | Combinaisons dangereuses, spécialisation, troisième boss |
| 10–12 | Niveau 16 vers 19 | Mise à l’épreuve du personnage, boss final |

## Classes et chevaliers

Trois classes : **Tank**, **DPS** et **Jambonmancien**, avec quatre chevaliers par classe. Les douze chevaliers sont des créations originales pour le jeu, autorisées puis validées par Kenny ; ils ne sont pas présentés comme des personnages déjà établis dans Porkopédia. Tous sont disponibles dès le départ et possèdent une innée passive unique. Leurs identités, personnalités et compétences figurent dans [le document de conception validé](ORDRE-COCHON-COMPETENCES.md).

| Classe | Manière de jouer | Équilibrage |
| --- | --- | --- |
| Tank | Blocage, contrôle, contre-attaque | Résistant, dégâts réguliers ; doit pouvoir terminer le jeu seul |
| DPS | Enchaînements, exploitation des ouvertures | Tue rapidement, supporte moins les erreurs |
| Jambonmancien | Sorts, malédictions, contrôle à distance | Polyvalent, dépend davantage de sa mousse |

## Compétences

- Chaque classe possède trois compétences actives et trois passives, chacune avec cinq rangs.
- La première active est offerte au rang 1 au niveau 1. Un point est gagné à chaque montée de niveau : 20 rangs au total, dont le rang offert, sur 30 possibles. Les autres compétences demandent un point pour être apprises après leur déblocage.
- Les rangs 2 à 5 exigent respectivement les niveaux 4, 8, 12 et 16, ainsi que le niveau de déblocage de la compétence. Les effets chiffrés de chaque rang restent à calibrer.
- Les délais de récupération sont comptés en tours.
- L’innée du chevalier ne consomme pas de points de compétence. Elle évolue automatiquement aux niveaux 5, 10 et 15.
- Réaffectation gratuite des points aux refuges après les boss, hors combat.

| Niveau | Déblocage |
| --- | --- |
| 1 | Première active et innée du chevalier |
| 2 | Première passive |
| 3 | Deuxième active |
| 7 | Troisième active |
| 11 | Deuxième passive |
| 17 | Troisième passive |

Les dix-huit compétences et les douze innées sont validées dans [ORDRE-COCHON-COMPETENCES.md](ORDRE-COCHON-COMPETENCES.md). Ce calendrier remplace celui de la première validation : le kit actif complet arrive au deuxième acte.

Une active consomme un seul tour, même si elle combine attaque et déplacement. Les rotations restent gratuites. Les actives physiques ne coûtent pas de mousse ; le Jambonmancien possède une attaque magique simple gratuite. Le rot d’État devient son active de classe et remplace le pouvoir universel actuel. Les actions invalides et les annulations ne consomment rien. Les délais progressent en combat et se réinitialisent à sa fin, sans récupération par rotation ou exploration d’une cave vide. Les attaques spéciales ennemies sont annoncées ; déplacements, collisions et résistances sont lisibles avant l’action.

## Puissance et difficulté

- Les niveaux augmentent progressivement les statistiques de base.
- L’équipement apporte les améliorations matérielles et les propriétés utiles au personnage.
- Les compétences améliorent surtout les possibilités tactiques : contrôle, portée, pénétration, récupération et synergies.
- Les multiplicateurs de rareté actuels doivent être réduits : le facteur 2,3 des objets d’État est trop déterminant pour la campagne cible. Les nouveaux chiffres restent à calibrer. Une rareté supérieure apporte un bonus raisonnable et une propriété intéressante.
- La campagne doit rester terminable avec de l’équipement courant adapté à l’étage.
- Les adversaires tardifs gagnent des comportements et des combinaisons, au-delà de l’augmentation de leurs PV.

| Adversaire | Cible indicative de durée |
| --- | --- |
| Ennemi courant | 3–5 attaques ordinaires |
| Élite | 6–9 attaques, avec une mécanique à gérer |
| Boss | 12–20 tours de combat, avec plusieurs phases |

Ces durées sont des objectifs de calibration, pas des statistiques déjà vérifiées. Les coefficients de dégâts, de défense, d’XP, de butin et de ressources seront ajustés sur des combats représentatifs des trois classes.

## Repos et récompenses

- Repos garanti après chaque boss intermédiaire.
- Récompense d’équipement garantie après les boss.
- Une montée de niveau rend une partie des PV et de la mousse, plutôt qu’un soin complet. Les proportions précises restent à définir.

## Première étape : inventaire et équipement

- Sac de 12 équipements, quatre emplacements actuels : arme, armure, tête, breloque.
- Provisions empilées séparément, avec les compteurs historiques des sauvegardes.
- Sélectionner un objet ne modifie pas l’équipement. La fiche présente les bonus et les écarts par rapport à l’objet porté au même emplacement.
- Équiper, retirer, poser au sol et ramasser sur sa case ne prennent pas de tour. Manger ou boire prennent un tour.
- Un échange reste possible avec un sac plein : l’objet équipé remplace l’ancien dans le sac. Retirer un équipement exige une place libre.
- Diminuer les bonus de PV ou de mousse borne les valeurs courantes au nouveau maximum ; augmenter ces bonus ne soigne pas.
- Sauvegardes existantes conservées, sans changement de version ou de structure.

## Ordre de travail suivant

1. Fixer les coefficients initiaux et calibrer des combats représentatifs à partir des kits validés.
2. Implémenter la progression, le choix du chevalier et les compétences.
3. Étendre et vérifier la campagne sur douze étages.

Les restrictions de classe ou de niveau sur les équipements restent à décider ; ne pas les introduire implicitement.
