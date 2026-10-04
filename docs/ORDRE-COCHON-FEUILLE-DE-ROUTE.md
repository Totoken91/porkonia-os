# Feuille de route du jeu complet

Validée par Kenny le 4 octobre 2026. La base jouable comprend inventaire, équipement, trois classes, douze chevaliers et leurs innées, compétences, progression, sauvegarde et retours de combat. La campagne est étendue à douze plans conçus ; le jeu complet demande encore les boss intermédiaires, refuges, enrichissements et vérifications humaines ci-dessous.

| Ordre | Chantier | Résultat attendu | État |
| --- | --- | --- | --- |
| 1 | Douze étages en quatre actes | Identités visuelles, plans et rencontres distincts, détours récompensés ; pas douze copies d'un labyrinthe | Douze plans validés et poussés (`475fddf`) |
| 2 | Quatre boss | Boss aux étages 3, 6, 9 et 12, mécaniques et attaques annoncées distinctes | Trois gardiens intermédiaires implémentés localement ; aperçu avant push |
| 3 | Refuges | Repos, équipement garanti et réaffectation après les boss intermédiaires | Réaffectation dans le moteur ; aucun refuge créé |
| 4 | Progression complète | Niveau 18–19 en parcours normal, 20 en exploration approfondie ; XP, équipement et provisions adaptés aux trois classes | Première vérification automatique des douze étages ; calibration humaine à faire |
| 5 | Rencontres et récompenses | Comportements complémentaires et butin qui permet des choix de jeu | Premier bestiaire et équipement présents ; à enrichir |
| 6 | Expérience terminée | Introduction, objectif, apprentissage progressif, conclusion et parties complètes avec les douze chevaliers | À faire sur la campagne complète |

## Première livraison du chantier 1

Construire les plans des étages 1–3 avec entrée et sortie intentionnelles, plusieurs salles et boucles, espaces de combat, réserves latérales et récompenses d'exploration. Les positions de rencontre sont conçues, le tirage du butin reste déterministe par graine. Les sauvegardes existantes conservent leur carte ; les nouveaux plans s'appliquent aux nouvelles parties RPG et aux prochains étages visités.

- Étage 1, Cave des Jambons Crus : approche courte, saloir ouvert à piliers, premiers adversaires séparés, détours vers des réserves.
- Étage 2, Cellier des Fûts Oubliés : deux circuits autour des celliers, choix entre salles latérales et progression, premiers inspecteurs.
- Étage 3, Saloir de la Commission : grande salle à piliers, approches latérales et espace réservé au futur premier boss. Le boss sera ajouté au chantier 2.

Les pièges, portes, clés et murs secrets interactifs demandent des mécaniques supplémentaires : les détours actuels sont des alcôves accessibles, pas de faux secrets verrouillés.

## Extension des actes II à IV

- 4–6 : galeries croisées, anneau des fosses et carrefour des pressoirs, premières élites placées.
- 7–9 : archives en peigne, ailes parallèles de l'abattoir et double approche des cuves.
- 10–12 : bifurcation des réserves royales, galerie brisée du dernier saloir, deux ailes avant l'antre final.

Le compteur et la descente vont jusqu'au 12 ; le Grand Affineur existant garde cet étage. Les anciennes cartes restent sauvegardées telles quelles et leur ancien boss au 5 ne termine plus prématurément la campagne. Les adversaires de niveau 20 donnent encore de l'XP ; le seuil nul du personnage à son plafond n'est plus utilisé comme récompense ennemie.

Quelques provisions sont accessibles à l'entrée des actes et dans la dernière approche. Ce sont des réserves ordinaires, pas des refuges ni des soins automatiques. Les nouveaux boss et leur repos garanti restent les chantiers 2 et 3.

## Conditions de validation

Entrée sûre, sortie accessible, toutes les cases ouvertes reliées, rencontres et butin sur cases libres distinctes, décor assorti aux salles, sauvegardes compatibles. Vérifier les douze chevaliers sur plusieurs graines avec le pilote, puis vérifier les vues et commandes sur PC et Poche. Les parties automatiques prouvent la faisabilité, pas le plaisir ni la difficulté pour un joueur humain.

## Boss intermédiaires — prochaine livraison

- 3 : Prévôt du Sel, verdict en ligne jusqu’à quatre cases ; esquive latérale.

- 6 : Maître du Pressoir, écrasement des quatre cases voisines ; recul.

- 9 : Spectre des Cuves, deux cases marquées à portée de trois ; quitter les sceaux.

Les marques ne suivent pas le joueur. Si la géométrie supprime toutes les échappatoires, le motif est réduit. Après l’impact, un tour de récupération permet la riposte. Le gardien bloque la descente et sa mort ne termine pas la campagne. Les apparences reprennent temporairement les sprites inspecteur, tonneau et fantôme : portraits et sprites de boss uniques restent à produire.

216 tests unitaires, compilation et navigation vérifiées. Pilote complet : 31 victoires sur 36 ; cinq morts au premier gardien. Les refuges et l’économie de soins sont encore à construire avant calibration humaine.
