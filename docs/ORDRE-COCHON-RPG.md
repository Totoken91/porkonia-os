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

Trois classes : **Tank**, **DPS** et **Jambonmancien**. Chaque chevalier a une classe définie et une compétence innée unique, disponible dès le départ. Leur attribution doit respecter la personnalité des douze chevaliers dans le lore ; aucune répartition ni identité nouvelle n’est fixée ici.

| Classe | Manière de jouer | Équilibrage |
| --- | --- | --- |
| Tank | Blocage, contrôle, contre-attaque | Résistant, dégâts réguliers ; doit pouvoir terminer le jeu seul |
| DPS | Enchaînements, exploitation des ouvertures | Tue rapidement, supporte moins les erreurs |
| Jambonmancien | Sorts, malédictions, contrôle à distance | Polyvalent, dépend davantage de sa mousse |

## Compétences

- Chaque classe possède trois compétences actives et trois passives, chacune avec cinq rangs.
- La première active est disponible au niveau 1. Un point est gagné à chaque montée de niveau ; le budget permet plusieurs spécialisations mais ne suffit pas pour tout maximiser.
- Les rangs supérieurs ont des exigences de niveau. Leurs seuils précis restent à définir.
- Les délais de récupération sont comptés en tours.
- L’innée du chevalier ne consomme pas de points de compétence. Elle évolue automatiquement à des paliers qui restent à définir.

| Niveau | Déblocage |
| --- | --- |
| 1 | Première active et innée du chevalier |
| 2 | Première passive |
| 5 | Deuxième active |
| 9 | Deuxième passive |
| 13 | Troisième active |
| 17 | Troisième passive |

Les six compétences précises de chaque classe et les douze innées constituent la prochaine décision de conception. Les exemples discutés (garde, double frappe, projectile, etc.) sont des pistes de travail, pas des compétences ou des noms canoniques validés.

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

1. Définir les six compétences de chaque classe et les douze innées à partir du lore.
2. Fixer les coefficients initiaux et calibrer des combats représentatifs.
3. Implémenter la progression, le choix du chevalier et les compétences.
4. Étendre et vérifier la campagne sur douze étages.

Les restrictions de classe ou de niveau sur les équipements restent à décider ; ne pas les introduire implicitement.
