# L’Ordre Cochon — compétences et douze chevaliers

Conception validée par Kenny le 4 octobre 2026. Créations originales autorisées pour ce jeu ; elles ne sont pas présentées comme des personnages déjà établis dans Porkopédia. Ce document décrit la cible, pas des fonctionnalités déjà implémentées. Les coefficients, coûts et délais chiffrés restent des hypothèses de calibration.

## Ce que la revue change

La première proposition accumulait des bonus discrets et réservait la troisième active au niveau 13. Elle risquait de produire des combats attaque/attaque/attaque, une garde qui retarde seulement la victoire, et un mage obligé d’attendre sa mousse.

Nouvelle cible : une action immédiatement satisfaisante, deux ou trois options réellement différentes à chaque situation, et une spécialisation visible plutôt que six multiplicateurs. Trois actives et trois passives par classe, cinq rangs, niveau maximum 20 et douze étages restent conservés.

Modification validée du calendrier initial : active 1 au niveau 1, passive 1 au niveau 2, active 2 au niveau 3, active 3 au niveau 7, passive 2 au niveau 11, passive 3 au niveau 17. Le kit complet arrive dans le deuxième acte et dispose encore de beaucoup de campagne pour évoluer.

## Rythme et commandes

- Une active combine ses effets en un seul tour : frappe et protection, frappe et déplacement, ou frappe et malédiction. Pas de préparation obligatoire sans résultat immédiat.
- Les trois actives se lancent directement au clic ou avec 1/2/3. Le coût et l'effet restent consultables dans les boutons et le livre. Seul le Pas de côté demande gauche/droite quand les deux cases sont libres ; choisir un côté lance immédiatement le pas et la frappe. Une annulation ou une cible invalide ne consomme rien.
- Les rotations restent gratuites comme dans le prototype. Les déplacements prennent un tour. Une compétence qui déplace le joueur vérifie les cases et n’ajoute pas une seconde phase ennemie.
- Attaques fortes, charges et capacités spéciales ennemies annoncées un tour avant. Les attaques ordinaires sont identifiées par leur portée ; il n’est pas nécessaire de transformer chaque coup en panneau d’avertissement.
- Les effets promis par une compétence ne dépendent pas d’un jet caché de précision : la poussée fonctionne si la case est libre et la cible déplaçable. Les immunités sont affichées.
- Un ennemi résistant au déplacement reçoit à la place un bonus de dégâts de collision limité. Les boss conservent leurs attaques ordinaires ; leurs attaques spéciales peuvent être affaiblies ou retardées une fois par cycle, sans verrouillage permanent.
- Délais courts, point de départ à tester : 2, 3 et 4 tours pour les trois actives. Une réduction de délai par effet ne peut jamais relancer une compétence dans le même tour.
- Les délais progressent pendant les tours de combat, pas en tournant sur place ou en marchant dans une cave vide. Un combat terminé réinitialise les délais. Changer de salle ne termine pas un combat avec un ennemi encore engagé.
- Manger et boire gardent leur coût d’un tour. Les actives physiques ne coûtent pas de mousse. Le mage dispose d’une attaque magique simple gratuite et toujours utilisable.
- Le rot d’État universel actuel sera remplacé par l’active du Jambonmancien : trois boutons de classe, sans quatrième pouvoir qui domine les trois kits. Ce changement est validé.

## Tank : faire de l’encaissement une arme

| Niveau | Type | Compétence | Effet et choix intéressant |
| --- | --- | --- | --- |
| 1 | Active | Garde-baffe | Frappe l’ennemi devant soi et réduit les dégâts de la prochaine phase ennemie. Réponse sûre à une attaque annoncée, mais moins offensive qu’un gros coup. |
| 2 | Passive | Rancune | Les dégâts réellement absorbés par Garde-baffe chargent la prochaine frappe. Une seule charge, visible et consommée sur un coup réussi. |
| 3 | Active | Coup de butoir | Frappe et repousse d’une case. Une collision inflige un supplément ; une poussée peut libérer un passage ou interrompre une charge. |
| 7 | Active | Grand revers | Frappe les trois cases adjacentes devant et sur les côtés, avec pénétration d’armure. Utile contre un groupe et contre une cible blindée. |
| 11 | Passive | Tenir la porte | Après un recul ennemi provoqué par toi, ta prochaine frappe sur cet ennemi restaure un peu de PV. Une restauration maximum par cible, jamais en frappant une créature invoquée à répétition. |
| 17 | Passive | Inébranlable | Une riposte chargée par Rancune conserve une partie de ta protection pour la phase ennemie suivante. Alterner protection et offense devient plus puissant. |

La réduction de dégâts reste bornée. Rancune donne une puissance plafonnée selon le personnage, sans permettre de stocker la frappe d’un boss pour tuer le suivant. Le soin accompagne une attaque utile : aucune raison de faire durer le combat pour attendre une régénération.

## DPS : attaquer, se replacer, finir

| Niveau | Type | Compétence | Effet et choix intéressant |
| --- | --- | --- | --- |
| 1 | Active | Double entaille | Deux coups rapides sur la cible devant soi. Leur total dépasse une attaque simple, mais ne permet pas de changer de cible au milieu. |
| 2 | Passive | Plaie ouverte | Double entaille applique un saignement court, non cumulable. Les doubles coups des innées ne déclenchent pas deux saignements. |
| 3 | Active | Pas de côté | Frappe puis déplace le joueur sur une case latérale libre. Deux côtés libres : choix immédiat Q/D ou bouton. Un seul côté libre : déplacement automatique. Deux côtés bloqués : feinte sur place avec protection réduite. |
| 7 | Active | Mise à mort | Coup renforcé contre une cible sous un seuil de PV clairement indiqué. Tue : réduit les délais des deux autres actives ; échoue à tuer : reste une vraie frappe. |
| 11 | Passive | Dans l’ouverture | Pas de côté prépare une frappe renforcée contre sa cible. Fonctionne également après la feinte sur place ; bonus unique et visible. |
| 17 | Passive | Encore un | Après une Mise à mort réussie, la prochaine attaque simple applique un saignement court à sa nouvelle cible, ou rafraîchit celui qui existe déjà. Le DPS passe d’un ennemi à l’autre sans obtenir une chaîne de tours gratuits. |

Suppression de l’ancien Enchaînement, qui punissait déplacement et changement de cible alors que ces actions doivent être amusantes. Suppression d’un bonus permanent à bas PV : jouer proprement reste gratifiant. Le seuil d’exécution prend en compte l’armure dans l’aperçu ; un indicateur de mort garantie n’apparaît que si le résultat l’est effectivement.

## Jambonmancien : marquer, déplacer, faire éclater

Attaque simple : éclat d’os gratuit, portée initiale de deux cases en ligne, dégâts modestes. Les murs bloquent les projectiles. L’arme portée fournit aussi la puissance de sort, pour que le butin existant reste utile.

| Niveau | Type | Compétence | Effet et choix intéressant |
| --- | --- | --- | --- |
| 1 | Active | Sel noir | Inflige immédiatement des dégâts à distance et pose une malédiction courte. Réappliquer remplace la durée sans empiler des dégâts illimités. |
| 2 | Passive | Fermentation | L’éclat d’os rend un peu de mousse lorsqu’il touche un ennemi maudit. Gain par action, jamais par projectile secondaire. |
| 3 | Active | Rot d’État | Onde devant soi : dégâts et recul court. Offre une issue au corps-à-corps et peut regrouper des ennemis pour l’explosion. Aucun passage à travers les murs. |
| 7 | Active | Éclatement | Frappe la cible et les cases orthogonales autour d’elle. Consomme sa malédiction pour renforcer l’explosion. Sans malédiction, le sort reste utilisable avec une puissance moindre. |
| 11 | Passive | Contamination | Un ennemi tué par Éclatement transmet une malédiction courte à un survivant voisin. Une transmission par utilisation, sans explosion automatique en chaîne. |
| 17 | Passive | Réserve de lie | Consommer une malédiction restitue une fraction du coût d’Éclatement. Le sort garde toujours un coût net positif. |

La mousse sert à choisir le moment d’un gros effet, sans interdire de jouer. Les coûts seront testés pour permettre une séquence Sel noir → Rot → Éclatement avec la réserve normale, sans bière obligatoire. Fermentation et Réserve de lie ne doivent pas rendre tous les sorts gratuits. Retrait de l’anti-soin, trop situationnel dans la campagne actuelle, et de la zone persistante qui aurait ajouté trop de marquages dans la vue en première personne.

## Les douze chevaliers

Quatre par classe est proposé pour offrir quatre variantes de chaque boucle. Tous sont jouables dès le départ ; pas de déblocage par répétition de la campagne. L’innée est passive, visible et utile dès le premier étage. Sa puissance augmente aux niveaux 5, 10 et 15, sans ajouter des sous-règles à chaque palier.

| Chevalier | Classe et personnalité | Innée | Façon de jouer |
| --- | --- | --- | --- |
| Berthe du Billot | Tank. Ancienne équarrisseuse ; elle considère les portes fermées comme une erreur de menuiserie. | Coincé, c’est cuit : bonus de collision contre les murs et les ennemis indéplaçables, y compris avec sa frappe simple. | Exploiter les couloirs et les murs. Le bonus de frappe simple reste inférieur à une collision de Butoir. |
| Gaspard du Couvercle | Tank. Porte le couvercle d’une marmite dont il refuse de donner la contenance. | Ça résonne : une part des dégâts d’une riposte chargée touche un autre ennemi adjacent visible. Au niveau 1, sa première frappe après avoir reçu un coup produit déjà cet effet. | Tenir face à plusieurs ennemis. Un seul dégât secondaire, aucun nouveau déclenchement de Rancune. |
| Odette des Trois Fûts | Tank. Convoyeuse ; aucun convoi n’a perdu de bière, quelques escortes ont disparu. | Cul sec : boire donne aussi une protection pour la phase ennemie du même tour. | Trouver une fenêtre pour boire sans suspendre l’offensive ; la bière reste limitée par les provisions. |
| Anselme le Clouté | Tank. Répare son armure avec les clous retirés des cercueils adverses. | Mauvaise prise : la première attaque de mêlée reçue de chaque ennemi lui renvoie une petite quantité de dégâts. | Accepter un premier contact puis jouer la garde. Aucun renvoi infini contre un adversaire rapide. |
| Roseline Taillefine | DPS. Couturière des tabards ; laisse toujours une ouverture exactement où elle frappe. | Point de côté : un déplacement latéral près d’un ennemi prépare une frappe qui ignore une partie de son armure. | Chercher un angle ; une seule charge, rotations seules sans effet. |
| Colin Deux-Couteaux | DPS. A commencé avec un couteau ; refuse d’expliquer le second. | Le deuxième est pour toi : la seconde frappe de Double entaille peut atteindre un autre ennemi adjacent si le premier meurt. | Nettoyer les petits groupes ; transfert seulement sur une cible visible et accessible, jamais une attaque supplémentaire. |
| Agathe Courte-Lame | DPS. Ancienne garde de banquet, spécialiste des disputes sous les tables. | Au contact : le premier coup porté au tour suivant une esquive complète d’une attaque annoncée applique un saignement court. | Éviter puis revenir frapper. Au niveau 1, le déplacement ordinaire suffit ; aucun cumul avec Plaie ouverte. |
| Marin Sans-Reste | DPS. Nettoyait les cuisines avant de découvrir que les caves avaient davantage de travail. | Fin de service : tuer un ennemi donne un petit bouclier temporaire pour la prochaine phase ennemie. | Choisir qui achever sous pression. Bouclier plafonné, non cumulable ; utile avant l’arrivée de Mise à mort. |
| Héloïse du Saloir | Jambonmancien. Peut dater une cave en goûtant le mur ; personne ne lui a demandé de continuer. | Sel jusqu’à l’os : la première frappe sur une cible ayant déjà été blessée la maudit brièvement si elle ne l’est pas. | Entamer, marquer puis économiser du sel ; ne rafraîchit pas une malédiction existante. |
| Basile Fond-de-Cuve | Jambonmancien. Ancien brasseur, convaincu que le dépôt est la meilleure partie. | Dernière gorgée : boire réduit le coût du prochain sort ; une seule réduction, consommée au lancement. | Préparer une séquence puissante avec une bière, sans stocker plusieurs réductions. |
| Ysée du Boyau | Jambonmancien. Recoud les enveloppes de saucisse et les trajectoires des projectiles. | Fil d’os : l’éclat d’os traverse le premier ennemi et frappe plus faiblement un second derrière lui. | Aligner deux adversaires. Portée totale bornée et aucun mur traversé ; restauration de mousse une seule fois. |
| Théobald l’Éventé | Jambonmancien. Banni de trois celliers pour « courant d’air non sollicité ». | Reflux : son premier coup sur un ennemi tout juste arrivé au contact le repousse s’il y a de la place, sinon inflige un supplément. Une fois par cible. | Jouer à moyenne portée avec une assurance au contact, utile dès le départ. |

Les éléments biographiques sont validés pour le jeu. Leur intégration dans une encyclopédie externe ne fait pas partie de cette validation.

## Progression gratifiante

Une active gratuite au rang 1 dès le départ, puis 19 points : budget total de 20 rangs sur 30 possibles. Les autres compétences se débloquent dans l’arbre puis nécessitent un point pour être apprises. Garder une réserve permet d’apprendre l’active au niveau 3 ou 7 dès son ouverture.

Proposition de rangs : 1 = fonction complète ; 2 = efficacité ; 3 = amélioration marquée de la spécialité ; 4 = efficacité ; 5 = autre amélioration marquée. Aucun effet essentiel, protection ou capacité de survie, n’exige le rang 5. Les rangs 3 et 5 accentuent le même geste : meilleure collision, seconde cible secondaire, malédiction plus généreuse, etc., plutôt qu’une nouvelle jauge.

Seuils globaux proposés pour les rangs 2 à 5 : niveaux 4, 8, 12 et 16, en plus du niveau de déblocage de la compétence. Cela autorise à investir des points économisés dans une passive tardive. Les valeurs de chaque rang restent à calibrer : cinq rangs avec cinq bonus presque invisibles seraient à revoir.

Réaffectation gratuite aux refuges après les boss, afin d’essayer un build sans relancer toute la partie. Ce service n’est pas accessible pendant un combat.

## Retour visuel et sonore

Garde : choc métallique bref et nombre de dégâts absorbés. Collision : petit impact sur le mur. Double entaille : deux impacts très courts. Exécution : son distinct et confirmation des délais réduits. Sel : marque lisible sur la fiche de la cible et indication de durée. Explosion : effet en gros pixels limité aux cases touchées. Innée prête : petit signe stable près de ses boutons, sans notification répétée à chaque tour.

Animations courtes, réglage accéléré et mouvement d’écran désactivable. Pas de pause obligatoire longue à chaque ennemi ni de vibration qui rend la vue difficile à lire. L’aperçu des effets compte davantage que la quantité de particules.

## Ce qu’il faudra vérifier dans un prototype

La recherche soutient les principes, pas la promesse que le jeu est déjà amusant. Jouer et comparer les trois classes : duel courant, couloir avec deux ennemis, salle ouverte, ennemi blindé et phase de boss annoncée, puis refaire ces situations avec deux chevaliers de chaque classe.

Mesurer les tours, les dégâts reçus, la mousse, la fréquence des trois actives et les actions d’attente. Si une active reste presque toujours le meilleur choix, si le mage doit attendre ou boire après chaque ennemi, ou si le Tank prend deux fois plus de tours que les autres, revoir les effets/coûts avant d’ajouter les douze étages. Vérifier séparément les douze innées au niveau 1 : chacune doit produire un moment reconnaissable sans compétence tardive.

Tester les abus : repousser/revenir sans fin, quitter une salle pour récupérer, frapper des invocations pour se soigner, doubles déclenchements de passives, alternance sans risque pour charger un bonus et contrôle continu des boss. Le but est de retirer la récompense des gestes répétitifs, pas de sanctionner une retraite tactique.

## Ressources consultées et application

- [Matthew Davis — Into the Breach, Design Postmortem, GDC 2019](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf) : contraintes de lisibilité, menus limités, temps perdu réduit, attaques annoncées et manipulation des positions. Application proposée ici : trois boutons, contrôle prévisible et poussées adaptées à la grille. PorkOS garde son propre combat, sans reprendre tout le système d’Into the Breach.
- [Sid Meier — Interesting Decisions, GDC 2012](https://www.gdcvault.com/play/1015756/interesting) : la présentation examine les décisions, le rythme, l’information et le retour au joueur. Application proposée ici : décider entre protéger, déplacer ou achever, avec les conséquences visibles. La page descriptive a été consultée ; la conférence n’a pas été visionnée intégralement.

Les kits, biographies, calendriers et règles de ressources ci-dessus sont notre conception validée, pas des recommandations littérales de ces auteurs. Le document ORDRE-COCHON-RPG.md reprend les décisions communes. Les chiffres et améliorations de rang seront vérifiés en prototype.
