# Feuille de route du jeu complet

Validée par Kenny le 4 octobre 2026. La base jouable comprend inventaire, équipement, trois classes, douze chevaliers et leurs innées, compétences, progression, sauvegarde et retours de combat. Les douze plans, les quatre boss, les refuges, la calibration, les trois élites avec butin garanti et les comportements de l’inspecteur et du tonneau sont poussés. Les choix d’équipement sont validés et poussés (`596139f`). L’objectif et les conseils de départ sont validés et poussés (`06b384b`). La conclusion est validée et poussée (`1923801`). Les trois sprites propres aux gardiens sont validés et poussés ; les vérifications humaines restent à approfondir.

| Ordre | Chantier | Résultat attendu | État |
| --- | --- | --- | --- |
| 1 | Douze étages en quatre actes | Identités visuelles, plans et rencontres distincts, détours récompensés ; pas douze copies d'un labyrinthe | Douze plans validés et poussés (`475fddf`) |
| 2 | Quatre boss | Boss aux étages 3, 6, 9 et 12, mécaniques et attaques annoncées distinctes | Gardiens validés et poussés (`6294198`) ; sprites natifs des trois gardiens validés et poussés ; Grand Affineur déjà distinct |
| 3 | Refuges | Repos, équipement garanti et réaffectation après les boss intermédiaires | Haltes cozy validées et poussées (`113540b`) |
| 4 | Progression complète | Niveau 18–19 en parcours normal, 20 en exploration approfondie ; XP, équipement et provisions adaptés aux trois classes | Première calibration poussée (`407df13`) : objectifs, gardiens et 72 parcours ; validation humaine à faire |
| 5 | Rencontres et récompenses | Comportements complémentaires et butin qui permet des choix de jeu | Élites et butin poussés (`87c4014`), comportements poussés (`87934d9`) ; compromis d’équipement validés et poussés (`596139f`) |
| 6 | Expérience terminée | Introduction, objectif, apprentissage progressif, conclusion et parties complètes avec les douze chevaliers | Objectif et apprentissage poussés (`06b384b`), conclusion poussée (`1923801`) ; essais humains à faire |

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

### Compromis d’équipement — validés et poussés

Les profils définis dans le pack modulent uniquement la création des nouveaux objets RPG. Ils conservent les statistiques présentes sur chaque base et la progression par étage et qualité. Les objets déjà sauvegardés gardent exactement leurs valeurs, y compris lorsqu’on les rééquipe ; le mode historique garde ses formules.

- Armes : hachoir pour la puissance, os pour les PV, louche pour la mousse. Les armes d’entrée conservent leur progression simple.
- Armures : cotte pour la défense, gilet intermédiaire, manteau pour la réserve de PV au prix de la protection.
- Coiffes : charlotte pour la mousse, bob intermédiaire, casque pour la défense, couronne pour les PV. Des seuils de défense rendent le choix perceptible dès les premiers étages.
- Breloques : Pork ID contre nappe pour défense/PV, appeau contre décapsuleur pour puissance/mousse.

La fiche affiche une phrase d’usage en plus des bonus exacts et des écarts avec l’objet porté. Aucun objet n’est équipé automatiquement. Une réserve maximale accrue ne soigne pas lors de l’échange.

274 tests passent : compromis chiffrés aux débuts et fins d’actes, progression et qualité monotones, statistiques absentes conservées à zéro, valeurs des anciens objets intactes, profils appliqués au butin généré. Build compilé. Le même pilote garde 36/36 victoires en exploration et 36/36 en trajet direct ; ces résultats sont des régressions automatiques, pas une validation humaine de l’équilibrage.

Fiches et échanges vérifiés en bureau, Poche portrait, paysage et compact : rôle affiché, pertes de défense et gains de réserve corrects, échange sans soin ni tour consommé, bonus identiques après reprise. Captures du manteau contre la cotte et de la charlotte contre le bob. Passe validée et poussée (`596139f`). Le chantier suivant est l’entrée en campagne, l’objectif et la conclusion.


## Entrée en campagne — validée et poussée

L’écran titre et l’aide indiquent l’objectif : traverser douze étages et vaincre le Grand Affineur. Les refuges après les gardiens des étages 3, 6 et 9 sont annoncés dès le départ.

Pendant le premier acte, le journal donne un conseil court au moment pertinent : soigner des PV bas, riposter après une esquive laissant une ouverture, dépenser les points de niveau, descendre, comparer le butin et lancer directement une compétence disponible. Chaque conseil paraît au plus une fois par partie ; un seul est choisi par action. Pas de tutoriel bloquant ni de confirmation supplémentaire. Ces messages ne modifient ni tours, ni ressources, ni tirages aléatoires.

L’aide permet de masquer ou réactiver ces conseils. La préférence reste après fermeture et sur les nouvelles parties. Les anciennes sauvegardes sont silencieuses jusqu’à activation explicite. Sur Poche, la commande indique « Descendre » lorsque le personnage se tient à l’escalier sans ennemi devant lui. Le gardien conserve son verrou normal.

289 tests passent et le build compile. Les parcours automatiques gardent 36/36 victoires en exploration et 36/36 en trajet direct. Ces parcours vérifient la régression du moteur ; ils ne remplacent pas les essais humains de lisibilité, de plaisir et de difficulté. La conclusion de campagne et les apparences propres aux boss restent à faire.

Navigation validée en bureau, Poche portrait, paysage et compact : objectif visible, aide sans débordement horizontal, masquage gratuit, préférence après reprise et nouvelle partie. Déplacements, équipement et compétences restent fonctionnels dans les quatre formats. Passe validée et poussée (`06b384b`).


## Conclusion de campagne — validée et poussée

La victoire ouvre un écran dédié dans le cadre en pierre et métal du jeu. Le blason, le nom et la classe identifient le chevalier qui a vaincu le Grand Affineur. Une courte conclusion rappelle la libération des caves et le retour à la surface ; elle reprend le résultat existant sans ajouter de nouveau canon.

Le bilan utilise les valeurs de la partie : étage atteint, niveau, ennemis vaincus, tours comptés et refuges réellement utilisés. Le dernier coup termine le combat avant l’avancement du temps, conformément au moteur actuel ; le compteur de tours est affiché tel quel. Aucun score, grade ou récompense fictive n’est calculé.

« Une autre expédition » revient au choix du chevalier et crée une partie neuve. Le signal de victoire et sa distinction PorkOS sont conservés, et la sauvegarde active terminée est effacée comme auparavant. La boucle de rendu du donjon s’arrête pendant cet écran. Les nouveaux textes vivent dans le pack ; aucun changement des dégâts, de l’XP ou du butin.

289 tests passent ; build et contrôle TypeScript vérifiés. La validation de la conclusion couvre le coup final réel, le bilan, le chevalier, l’absence de sauvegarde active et le redémarrage avec un autre chevalier.

Navigation validée en bureau, Poche portrait, paysage et compact. La disposition paysage utilise deux colonnes pour garder le bilan et le bouton de nouvelle expédition visibles sans défilement. Captures vérifiées ; conclusion validée et poussée (`1923801`). Les apparences propres aux boss et les essais humains sont les prochains travaux.


## Apparences des gardiens — validées et poussées

Les gardiens des étages 3, 6 et 9 disposent chacun d’un sprite natif 40×40, construit sur une matrice où chaque caractère représente un pixel. Les sources éditables restent dans `src/apps/jambonjon/gardiens-pixels.ts`. Palette partagée avec les ennemis, lumière en haut à gauche, surfaces par groupes de couleurs : aucun agrandissement de la grille ni illustration réduite.

- Prévôt du Sel : robe bordeaux, étole ivoire, toque claire, sceptre de sel et parchemin. Visage construit à la même échelle que l’inspecteur, yeux séparés et nez clair.
- Maître du Pressoir : presse de bois avec deux montants, vis centrale et mâchoire de fer. La structure donne une silhouette différente du tonneau ordinaire.
- Spectre des Cuves : capuchon élancé, manteau froid en plis, col et ceinture de bronze, mains en crochets. Le corps garde l’opacité spectrale du fantôme précédent.

Le Grand Affineur conserve son sprite propre, déjà distinct. Ces costumes sont des visuels de jeu, sans nouvel élément de canon officiel. Les sauvegardes retrouvent les dessins via leurs identifiants de monstres ; les cartes et adversaires ne sont pas recréés. Dimensions projetées, statistiques, zones d’attaque, délais et esquives sont conservés. Le Pressoir garde notamment le léger soulèvement de son ancienne apparence pendant la préparation ; les trois gardiens conservent le contour ambré.

Le script `scripts/ordre-cochon/apercu-gardiens.mjs` vérifie les matrices et exporte les textures réelles. Contrôle à taille native, ×4 sans lissage, en niveaux de gris, en silhouette et dans le moteur à deux et quatre cases ; avant/après sous la même caméra. Palette effective : 14 couleurs pour le Prévôt, 13 pour le Pressoir, 7 pour le Spectre. Alpha 0/255 pour les deux premiers, 0/191 pour le Spectre après finition.

289 tests passent ; build et TypeScript vérifiés. Passe validée par Kenny et poussée.

Navigation validée en bureau, Poche portrait, paysage et compact : préparation visible des trois gardiens, esquive sans dégâts, reprise avec le bon adversaire. Inventaire, commandes et compétences conservent leurs contrôles habituels. Les nouveaux sprites sont validés et poussés.


## Peaufinage — passe locale à valider

Priorité donnée à la cohérence des pixels à la demande de Kenny. Le problème observé sur la moisissure était aggravé par le rendu : un tramage à la résolution du framebuffer et la vignette ajoutaient des variations de couleur à l’intérieur des pixels agrandis du sprite. Ces traitements ne viennent pas de sa grille 40×40.

- Suppression du tramage ajouté sur l’écran. Les sprites opaques conservent une couleur uniforme par texel natif ; la vignette reste sur le décor. Lumière chaude, brume, palette 15 bits et palettes grunge sont conservées.
- Murs, sol, plafond et cadres sont échantillonnés au plus proche sur leurs textures natives 32×32, sans interpolation bilinéaire. Les motifs et leur grain de source sont conservés.
- Les courbes des sacs et tonneaux au sol sont construites sur la grille native en pixels opaques, sans couverture partielle de Canvas. L’ombre CSS d’un pixel d’écran sous les objets de l’inventaire est retirée : leurs contours restent ceux du PNG.
- Contrôle des onze textures d’ennemis dans le moteur, avec caméra et temps fixes. Sur les neuf sprites opaques, aucun pixel source échantillonné à l’intérieur de sa cellule n’a plusieurs couleurs de rendu. Les deux spectres gardent leur mélange transparent avec le fond ; ils ne sont pas déclarés opaques. Les vingt PNG d’items sont à leur petite résolution native (24×24, 32×24, 32×40 ou 32×48), avec alpha 0/255.

Le script `scripts/ordre-cochon/controle-pixels.mjs` produit les vues et le rapport machine ; `PIXELS_STRICT=1` rejette des sous-détails dans les cellules opaques. Avant correction, les 623 cellules natives testées sur la moisissure présentaient plusieurs couleurs de sortie ; après correction, aucune. Ce contrôle porte sur la couleur à l’intérieur des cellules, pas sur l’appréciation artistique ni sur une égalité de taille entre un objet proche et un objet lointain.

Deux corrections de lisibilité accompagnent cette passe :

- Journal compact sans lignes coupées verticalement, et bouton « Journal » / touche H pour lire les événements conservés en entier. Les plus récents viennent d’abord, le texte long se replie dans la largeur disponible. Consulter ou fermer le journal ne consomme aucun tour et ne modifie pas le hasard.
- La barre des compétences explique le verrou réel : niveau requis, compétence à apprendre lorsque le niveau suffit déjà, manque de mousse, récupération, cible hors portée ou compétence prête. La portée n’introduit pas de nouveau verrou de clic ; les règles de ciblage restent celles du moteur.

Sur Poche, un bouton « Attendre » donne accès directement à l’action existante d’un tour, sans se déplacer. Aucun changement des dégâts, de l’XP, des prix, des ressources ou des règles de combat.

291 tests passent ; build et TypeScript vérifiés. Navigation validée en bureau, Poche portrait, paysage et compact : journal sans débordement et gratuit, labels de compétences, attente tactile, équipements, déplacements, sorts, trois refuges et trois esquives de boss. Captures contrôlées. Le rendu et les interfaces restent locaux pour validation visuelle ; les essais humains de difficulté et de plaisir restent distincts de ces vérifications automatiques.


### Reprise après rejet de la capture — locale, non poussée

Le contrôle de couleur précédent ne suffisait pas : le dessin rectangulaire de la moisissure et les agrandissements fractionnaires restaient visibles. La moisissure est reconstruite sur une matrice native 40×40, avec lobes arrondis, ombres reliées et trois champignons charnus. La palette olive, bois et ivoire reste partagée avec les autres ennemis ; aucune illustration réduite ni grain ajouté dans les pixels.

Le moteur agrandit désormais tous ses sprites proches (ennemis et objets au sol) par un facteur entier et pose leurs bords sur les coordonnées entières du framebuffer. Les colonnes d'un même pixel natif ne passent plus alternativement de deux à trois pixels. Les sprites lointains sont toujours réduits au plus proche. Ce choix assume des changements de taille par paliers pendant l'approche, à contrôler en jeu ; les positions, collisions et actions ne changent pas. Les textures en perspective et les effets CRT du moniteur restent distincts de la grille native des sprites.

Le contrôle des onze textures réelles passe à nouveau sans variations à l'intérieur des cellules opaques. Aperçus natifs et capture du jeu dans le moniteur produits sous la même caméra que la version rejetée. Build et 291 tests passent ; navigation et interfaces vérifiées dans les quatre formats. Les gardiens ont également été inspectés à deux et quatre cases. Cette reprise reste soumise à validation visuelle, sans push.


### Correction de densité — moisissure native 20×20, locale

La version 40×40 de la moisissure est remplacée par un dessin construit directement en 20×20, à la demande de Kenny. Sa taille dans le monde reste une demi-case : 20 pixels sur 0,5 case donnent une densité de référence de 40 pixels par case, comme le Grand Affineur. Les formes et les yeux sont simplifiés sur la petite grille ; il ne s'agit pas d'une réduction automatique du dessin précédent.

La préparation crée une véritable texture 20×20 et ajoute son contour à cette résolution. La finition lit désormais la taille du canvas natif au lieu de supposer 40 partout. Le contrôle de pixels utilise les dimensions réelles des textures et rapporte les pixels par case. La taille projetée reste petite, avec quatre pixels de framebuffer par pixel natif à une case dans la scène de contrôle. Aucun push.


### Validation de la passe — 4 octobre 2026

Kenny valide la moisissure 20×20 et autorise le push de la passe de peaufinage : rendu natif sans sous-tramage, projection entière des sprites proches, journal complet, statuts de compétences et attente tactile. Les mentions « locale » et « non poussée » ci-dessus décrivent les étapes de revue précédant cette validation.

Dernière vérification : build réussi, 291 tests passés, contrôle des onze textures réelles et égalité du facteur d'agrandissement entre moisissure et inspecteur à une case. Navigation bureau revalidée avec le sprite 20×20 ; les quatre formats ont passé la navigation lors de la passe de rendu et d'interface précédente. Le push Git déclenche le déploiement automatique ; aucun déploiement manuel.


## Cohérence globale des sprites — nouvelle passe locale

À la demande de Kenny, la règle de la moisissure est appliquée à tous les sprites du monde : résolution native proportionnelle à la taille, à raison de 40 pixels par case. `grille-pixels.ts` fixe les grilles des onze monstres, des quatre objets au sol et des deux meubles du refuge. Les dessins sont adaptés sur ces grilles ; les contours sont ajoutés à leur résolution native. Le renderer projette un même pixel avec un facteur identique pour tous les sprites à une profondeur donnée. Les multiplicateurs de zoom des boss et élites sont retirés ; la taille des boss vient de leurs propres grilles (jusqu’à 50×50 pour le Grand Affineur).

Rat 18×18, gobelin 24×24, moisissure 20×20, saucisson 28×28, tonneau vivant 26×26, fantôme 32×32, inspecteur 34×34, Prévôt 44×44, Pressoir 32×32, Spectre 40×40, Grand Affineur 50×50. Le butin utilise 14×14, 16×16 ou 20×20 ; lit 52×52 et coffre 36×36 pour garder leurs proportions dans la pièce. Aucun changement des statistiques, du hasard ou des actions du jeu.

Les particules de compétences suivent cette grille projetée ; leurs cellules sont composées une fois pour éviter le mélange de sous-pixels. Les chiffres restent une police d’interface. Les spectres gardent leur alpha 191 mais composent le fond par texel, sans micro-détails ni vignette à l’intérieur des cellules.

Les vingt PNG d’inventaire et les douze blasons sont contrôlés à leur petite résolution native (alpha 0/255). Le navigateur vérifie les facteurs entiers et l’absence d’étirement des images d’interface. Les textures 32×32 du donjon gardent leur grain et le filtre CRT du moniteur est conservé.

Audit strict des 17 sprites du monde passé à une et trois cases, y compris les deux spectres ; 296 tests et build réussis. Navigation, inventaire, blasons, trois refuges et esquives des trois boss passent dans les quatre formats après la correction finale de transparence. Captures relues. Passe locale, non poussée pour validation visuelle.


### Validation de la cohérence globale — 4 octobre 2026

Kenny valide les aperçus et autorise la publication de la passe globale. Les mentions « locale » et « non poussée » de cette section décrivent la revue avant validation. Les onze mobs, quatre objets au sol, deux meubles, particules et transparences partagent maintenant leur règle de projection ; inventaire et blasons sont vérifiés à leurs échelles natives. Build, 296 tests, audit strict et navigation dans les quatre formats réussis. Publication par push de `porkos`, avec déploiement automatique Vercel.
