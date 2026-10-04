# L’Ordre Cochon — progression du prototype

Décisions du joueur : trois classes, **Tank**, **DPS** et **Jambonmancien**. Chaque chevalier de l’Ordre Cochon possède une compétence innée unique. Les chevaliers, leurs compétences et leurs affiliations restent à définir à partir du lore ; ces classes ne sont pas encore implémentées.

## Première étape : inventaire et équipement

- Sac de 12 équipements, quatre emplacements actuels : arme, armure, tête, breloque.
- Provisions empilées séparément, avec les compteurs historiques des sauvegardes.
- Sélectionner un objet ne modifie pas l’équipement. La fiche présente les bonus et les écarts par rapport à l’objet porté au même emplacement.
- Équiper, retirer, poser au sol et ramasser sur sa case ne prennent pas de tour. Manger ou boire prennent un tour.
- Un échange reste possible avec un sac plein : l’objet équipé remplace l’ancien dans le sac. Retirer un équipement exige une place libre.
- Diminuer les bonus de PV ou de mousse borne les valeurs courantes au nouveau maximum ; augmenter ces bonus ne soigne pas.
- Sauvegardes existantes conservées, sans changement de version ou de structure.

## Étapes suivantes

Progression de niveaux, choix de chevalier / classe, puis compétences actives, passives et innées. Ne pas imposer de restriction de classe ou de niveau aux équipements avant d’avoir défini ces règles avec le joueur.
