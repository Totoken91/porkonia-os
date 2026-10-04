# Feuille de route du jeu complet

Validée par Kenny le 4 octobre 2026. La base jouable comprend inventaire, équipement, trois classes, douze chevaliers et leurs innées, compétences, progression, sauvegarde et retours de combat. Les douze plans, les quatre boss, les refuges, la calibration, les trois élites avec butin garanti et les comportements de l’inspecteur et du tonneau sont poussés. Les choix d’équipement sont en validation locale ; l’introduction, la conclusion et les vérifications humaines restent à approfondir.

| Ordre | Chantier | Résultat attendu | État |
| --- | --- | --- | --- |
| 1 | Douze étages en quatre actes | Identités visuelles, plans et rencontres distincts, détours récompensés ; pas douze copies d'un labyrinthe | Douze plans validés et poussés (`475fddf`) |
| 2 | Quatre boss | Boss aux étages 3, 6, 9 et 12, mécaniques et attaques annoncées distinctes | Gardiens validés et poussés (`6294198`) ; sprites de boss uniques à produire |
| 3 | Refuges | Repos, équipement garanti et réaffectation après les boss intermédiaires | Haltes cozy validées et poussées (`113540b`) |
| 4 | Progression complète | Niveau 18–19 en parcours normal, 20 en exploration approfondie ; XP, équipement et provisions adaptés aux trois classes | Première calibration poussée (`407df13`) : objectifs, gardiens et 72 parcours ; validation humaine à faire |
| 5 | Rencontres et récompenses | Comportements complémentaires et butin qui permet des choix de jeu | Élites et butin poussés (`87c4014`), comportements poussés (`87934d9`) ; compromis d’équipement en validation locale |
| 6 | Expérience terminée | Introduction, objectif, apprentissage progressif, conclusion et parties complètes avec les douze chevaliers | À faire sur la campagne complète |

## Première livraison du chantier 1

Construire les plans des étages 1–3 avec entrée et sortie intentionnelles, plusieurs salles et boucles, espaces de combat, réserves latérales et récompenses d'exploration. Les positions de rencontre sont conçues, le tirage du butin reste déterministe par graine. Les sauvegardes existantes conservent leur carte ; les nouveaux plans s'appliquent aux nouvelles parties RPG et aux prochains étages visités.

- Étage 1, Cave des Jambons Crus : approche courte, saloir ouvert à piliers, premiers adversaires séparés, détours vers des réserves.
- Étage 2, Cellier des Fûts Oubliés : deux circuits autour des celliers, choix entre salles latérales et progression, premiers inspecteurs.
- Étage 3, Saloir de la Commission : grande salle à piliers, approches latérales et espace réservé au futur premier boss. Le boss sera ajouté au chantier 2.

Les pièges, portes, clés et murs secrets interactifs demandent des mécaniques supplémentaires : les détours actuels sont des alcôves accessibles, pas de faux secrets verrouillés.

## Extension des actes II à IV

- 4–6 : galeries croisées, anneau des fosses et carrefour des pressoirs, rencontres placées.
- 7–9 : archives en peigne, ailes parallèles de l'abattoir et double approche des cuves.
- 10–12 : bifurcation des réserves royales, galerie brisée du dernier saloir, deux ailes avant l'antre final.

Le compteur et la descente vont jusqu'au 12 ; le Grand Affineur existant garde cet étage. Les anciennes cartes restent sauvegardées telles quelles et leur ancien boss au 5 ne termine plus prématurément la campagne. Les adversaires de niveau 20 donnent encore de l'XP ; le seuil nul du personnage à son plafond n'est plus utilisé comme récompense ennemie.

Quelques provisions sont accessibles à l'entrée des actes et dans la dernière approche. Ce sont des réserves ordinaires, pas des refuges ni des soins automatiques. Les nouveaux boss et leur repos garanti restent les chantiers 2 et 3.

## Conditions de validation

Entrée sûre, sortie accessible, toutes les cases ouvertes reliées, rencontres et butin sur cases libres distinctes, décor assorti aux salles, sauvegardes compatibles. Vérifier les douze chevaliers sur plusieurs graines avec le pilote, puis vérifier les vues et commandes sur PC et Poche. Les parties automatiques prouvent la faisabilité, pas le plaisir ni la difficulté pour un joueur humain.

## Boss intermédiaires — livraison validée

- 3 : Prévôt du Sel, verdict en ligne jusqu’à quatre cases ; esquive latérale.

- 6 : Maître du Pressoir, écrasement des quatre cases voisines ; recul.

- 9 : Spectre des Cuves, deux cases marquées à portée de trois ; quitter les sceaux.

Les marques ne suivent pas le joueur. Si la géométrie supprime toutes les échappatoires, le motif est réduit. Après l’impact, un tour de récupération permet la riposte. Le gardien bloque la descente et sa mort ne termine pas la campagne. Les apparences reprennent temporairement les sprites inspecteur, tonneau et fantôme : portraits et sprites de boss uniques restent à produire.

216 tests unitaires, compilation et navigation vérifiées. Pilote complet : 31 victoires sur 36 ; cinq morts au premier gardien. Les refuges et l’économie de soins sont encore à construire avant calibration humaine.

## Refuges — prochaine livraison

Aux escaliers des étages 3, 6 et 9, après la mort du gardien et la fin des poursuites :

- Repos complet gratuit, une fois par halte : PV, mousse et faim restaurés ; ivresse et préparations de combat dissipées. Le registre de repos persiste dans les sauvegardes.
- Redistribution des compétences gratuite au refuge, sans faire avancer le temps ; hors du refuge, elle reste interdite.
- Un objet garanti à l’escalier : qualité « de garde » au 3, « grand cru » aux 6 et 9, niveau de l’étage. Le choix vise un emplacement équipé ancien. Le joueur décide de l’équiper ; sac plein, l’objet reste au sol.
- La descente quitte le refuge. Ni l’attente, ni un rechargement, ni un aller-retour ne redonnent un repos consommé.

Les sauvegardes historiques sans registre de repos restent lisibles. Les 224 tests couvrent soins, repos unique, sécurité, réaffectation, butin garanti, sac plein et descente. Le pilote complet gagne 31 parties sur 36 avec les refuges : les cinq échecs restent au premier boss, avant toute halte. La calibration du premier acte et les essais humains constituent la suite du chantier 4.

Navigation vérifiée en bureau, Poche paysage, Poche portrait et Poche compact : les trois haltes s’affichent sans débordement ; repos consommé après reprise, réaffectation des points et descente vers l’acte suivant validés.

### Alcôve de repos

Les haltes ont désormais un volume ouvert devant l’escalier : cheminée en pierre avec lumière chaude, couchette et couverture bordeaux, coffre en bois et tapis tissé usé. Textures natives 32×32, mobilier 40×40, rendu dans la caméra habituelle du donjon. Le mobilier est décoratif ; il n’ajoute pas de collisions invisibles. Le repos et la réaffectation fonctionnent dans toute l’alcôve ; la descente se fait à l’escalier. Les commandes sont placées sous la vue.

Les anciennes cartes conçues compatibles reçoivent uniquement l’alcôve au premier mouvement ou à la première rotation. Carte historique générée aléatoirement : conservée telle quelle. L’ouverture, l’éclairage, la sauvegarde et l’absence de réinitialisation sont testés ; 228 tests au total. Aperçus et contrôles dans les quatre formats d’écran.

## Calibration de la progression — livraison validée

Les marques de danger au sol utilisent désormais un sceau de braises irrégulier natif 32×32, sans cadre carré ni croix. Seul le dessin change : mêmes cases menacées, même délai et même esquive.

- Les gardiens des plans conçus attendent une approche visible à trois pas. Ils restent dans un rayon de deux cases de leur poste. Un boss d’ancienne sauvegarde déjà égaré rejoint son poste case par case ; aucun soin, téléportation ou retrait de dégâts ne lui est accordé.
- Les PV, puissance et défense des boss sont conservés. Les messages de danger indiquent le geste attendu, plutôt qu’une alerte lourde générique.
- XP des ennemis : 72 % de l’ancien montant. Accomplissement à la descente : 40 % du budget d’étage prévu ; premier étage, bonus du premier niveau. Les deux sources s’additionnent. Le bonus n’est gagné qu’en descendant réellement ; ni attente, ni rotation, ni escalier gardé ne le donnent. Le plafond reste 20.
- Une provision supplémentaire au carrefour du 2 et avant la salle du Prévôt au 3 permet de préparer les premiers combats sans parcourir toutes les annexes. Les anciennes cartes conservent leur butin déjà tiré.

Le pilote joue deux styles, avec douze chevaliers et trois graines chacun. Exploration complète : 36 victoires sur 36, niveau 20. Trajet vers les escaliers, sans nettoyage systématique des annexes : 31 victoires sur 36, niveaux 18 (27 parties) et 19 (4 parties). Les cinq morts restantes concernent les mages au 2 et deux DPS au 5 ; pas le premier boss. Le trajet direct est un test de contrainte automatisé, pas une définition de la difficulté humaine. Les 240 tests passent ; les essais humains restent nécessaires avant de déclarer l’équilibrage terminé.

## Rencontres et récompenses — élites validées et poussées

Trois adversaires existants deviennent des élites dans les détours : moisissures aux étages 4 et 8, tonneau au 10. Les plans précédents ne plaçaient en réalité aucune élite. Chaque rencontre peut être contournée sans couper l’accès aux escaliers ; elle reprend le comportement lourd annoncé déjà présent dans le moteur. Les monstres d’un étage déjà sauvegardé sont conservés.

Une élite RPG laisse désormais exactement un équipement, de niveau égal à l’étage, en plus des provisions périodiques existantes. Qualité minimale « de garde », puis « grand cru » à partir du 7 ; un tirage supérieur reste supérieur. Le prix reste au sol, avec une annonce dans le journal : pas d’équipement automatique, pas de perte si le sac est plein, conservation après sauvegarde. Le butin ordinaire et les récompenses fixes des boss suivent leurs règles précédentes.

248 tests passent, compilation et scénario de butin/comparaison/reprise vérifiés dans les quatre formats. Les 72 parcours automatiques conservent 36/36 victoires en exploration et 31/36 en trajet direct. Cette passe commence le chantier 5 ; diversité des comportements et choix plus marqués entre équipements restent à construire.

### Comportements ordinaires — validés et poussés

- L’inspecteur prépare un verdict à trois pas maximum, en ligne droite et sans traverser de mur. La case visée reste fixe : changer de case évite le coup, même en avançant vers lui. Les dégâts d’un verdict correspondent à un coup normal.
- Le tonneau prépare un écrasement au contact, de puissance 1,35 fois celle d’un coup normal. Un pas de côté ou un recul permet de l’éviter. Sans case d’esquive libre, il utilise un coup normal.
- Après chaque impact ou esquive, un tour entier de récupération garantit une occasion d’approcher ou de riposter. Le butoir peut interrompre la préparation ; tuer le lanceur la supprime. Annonce et récupération survivent à la sauvegarde.
- Les attaques des élites et des boss gardent leurs règles. Le mode historique sans classes conserve son combat classique.
- L’avertissement précise le geste attendu. Un contour ambré d’un pixel natif indique la préparation sur le sprite ; le tonneau se soulève légèrement. La silhouette, les matériaux et la grille 40×40 sont conservés. La marque sous les pieds est hors du champ de la caméra ; le signal sur l’ennemi complète donc le sceau au sol.

259 tests passent et le build compile. Le pilote omniscient, qui exploite les esquives, gagne 36/36 parcours d’exploration (niveau 20) et 36/36 trajets directs (niveau 18). La meilleure survie vient des ouvertures annoncées ; les statistiques de base n’ont pas été réduites. Ces résultats ne mesurent pas la difficulté ni le plaisir pour un joueur humain.

Navigation vérifiée en bureau, Poche portrait, paysage et compact : avertissement approprié, esquive sans dégâts, récupération conservée après reprise et attaques des trois boss intermédiaires. Les captures montrent le signal sur le sprite dans le rendu réel. Validé et poussé (`87934d9`).

### Compromis d’équipement — passe locale à valider

Les profils définis dans le pack modulent uniquement la création des nouveaux objets RPG. Ils conservent les statistiques présentes sur chaque base et la progression par étage et qualité. Les objets déjà sauvegardés gardent exactement leurs valeurs, y compris lorsqu’on les rééquipe ; le mode historique garde ses formules.

- Armes : hachoir pour la puissance, os pour les PV, louche pour la mousse. Les armes d’entrée conservent leur progression simple.
- Armures : cotte pour la défense, gilet intermédiaire, manteau pour la réserve de PV au prix de la protection.
- Coiffes : charlotte pour la mousse, bob intermédiaire, casque pour la défense, couronne pour les PV. Des seuils de défense rendent le choix perceptible dès les premiers étages.
- Breloques : Pork ID contre nappe pour défense/PV, appeau contre décapsuleur pour puissance/mousse.

La fiche affiche une phrase d’usage en plus des bonus exacts et des écarts avec l’objet porté. Aucun objet n’est équipé automatiquement. Une réserve maximale accrue ne soigne pas lors de l’échange.

274 tests passent : compromis chiffrés aux débuts et fins d’actes, progression et qualité monotones, statistiques absentes conservées à zéro, valeurs des anciens objets intactes, profils appliqués au butin généré. Build compilé. Le même pilote garde 36/36 victoires en exploration et 36/36 en trajet direct ; ces résultats sont des régressions automatiques, pas une validation humaine de l’équilibrage.

Fiches et échanges vérifiés en bureau, Poche portrait, paysage et compact : rôle affiché, pertes de défense et gains de réserve corrects, échange sans soin ni tour consommé, bonus identiques après reprise. Captures du manteau contre la cotte et de la charlotte contre le bob. La passe reste locale en attente de validation ; le chantier suivant est l’entrée en campagne, l’objectif et la conclusion.
