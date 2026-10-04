# L’Ordre Cochon — calibration initiale

4 octobre 2026. Les identités et les compétences sont validées dans ORDRE-COCHON-COMPETENCES.md. Ce document fixe une première enveloppe numérique à intégrer et à vérifier en jeu. Le prototype public reste inchangé : cinq étages, anciennes statistiques et ancien rot universel. Les nouvelles fonctions de `src/apps/jambonjon/equilibrage.ts` ne sont pas encore appelées par ce prototype.

## Ce qui a été mesuré

Le banc `scripts/ordre-cochon/simulation.ts` travaille sur des distances relatives en cases. Il traite attaques, protection, poussée/collision, saignement, malédiction, mousse, délais, ouverture et attaque spéciale annoncée. Il ne génère pas une vraie carte et ne valide pas les contrôles, la vue, les directions ou le plaisir de jeu.

5 568 combats principaux : trois classes, niveaux 1/5/10/15/20, duels, blindés, élites, groupes, couloirs et boss ; 64 graines par configuration, sans boss de niveau 1. S’ajoutent 384 combats avec six builds alternatifs de niveau 20, douze essais de sensibilité et cinquante duels pour l’économie de mousse. Les dégâts varient de ±10 %, sans critiques aléatoires.

Chaque combat principal commence à pleine vie et pleine mousse, avec un ensemble courant de référence et un build réalisable avec les points disponibles. Aucun consommable, innée ou objet rare. Les groupes comportent deux ennemis avant le niveau 7, trois ensuite. Dans la fixture couloir, un seul adversaire peut atteindre le contact. Les effets de zone utilisent des voisinages abstraits : ils devront être vérifiés sur la carte réelle.

Résultats, arrondis :

| Mesure | Tank | DPS | Jambonmancien |
| --- | --- | --- | --- |
| Frappes simples par ennemi courant, aux cinq paliers | 4–5 | 4–5 | 4–5 |
| Tours moyens contre le premier boss, niveau 5 | 15,4 | 13,9 | 18,9 |
| Tours moyens contre le boss final de référence, niveau 20 | 15,5 | 14,0 | 15,1 |
| PV perdus contre le boss final, moyenne | 62,8 % | 44,3 % | 45,7 % |
| Victoires contre les quatre boss de référence | 256/256 | 256/256 | 256/256 |

Les variantes spécialisées de niveau 20 gagnent aussi leurs 64 essais chacune ; durées moyennes entre 12,9 et 16,1 tours. Cela vérifie une enveloppe initiale, pas l’équivalence de tous les builds possibles.

Le Tank reste davantage exposé face aux boss : il continue de frapper sous protection, tandis que les autres classes consacrent des tours à esquiver. Le coût de cette différence sera à observer en jeu. Les élites demandent environ 5–8 tours avec les actives ; la cible historique de 6–9 attaques concernait les attaques ordinaires, pas une obligation de ralentir un build offensif.

## Croissance du personnage

Avec `k = niveau - 1`, les statistiques de base sont arrondies puis l’équipement s’ajoute. L’arme augmente aussi la puissance magique.

| Classe | PV | Puissance | Défense | Mousse |
| --- | --- | --- | --- | --- |
| Tank | 42 + 8k | 5 + 1,55k | 3 + 0,65k | 30 + 3k |
| DPS | 32 + 7k | 5 + 1,80k | 1 + 0,40k | 30 + 3k |
| Jambonmancien | 30 + 7k | 5 + 1,65k | 1 + 0,40k | 40 + 3k |

Ensemble courant de référence pour un étage `e` : arme `2 + 0,55(e−1)`, défense totale d’équipement `2 + 0,40(e−1)`, PV d’équipement `2(e−1)`. Ces sommes servent de budget de butin, pas de distribution déjà implémentée entre les quatre emplacements. Le kit de départ et les dix-huit objets existants devront être alignés sur ces budgets.

Dégâts moyens : `max(1, arrondi(puissance × coefficient − défense × 0,55 × (1 − pénétration)))`. La variation porte sur la puissance, pas sur le succès d’un contrôle. Une immunité au recul conserve un supplément de collision au lieu d’annuler toute l’active.

## Compétences : coefficients initiaux

Le rang vaut 1 à 5. Les coefficients portent sur la puissance totale du personnage, pas sur des dégâts fixes qui deviendraient inutiles au dernier étage. La première active revient à `t+2`, la deuxième à `t+3`, la troisième à `t+4` après usage au tour `t`.

| Active | Rang 1 → rang 5 | Complément |
| --- | --- | --- |
| Garde-baffe | 0,95 → 1,17 | Réduction de dégâts 40 → 50 % sur la phase suivante |
| Coup de butoir | 1,05 → 1,33 | Collision supplémentaire 0,25 → 0,45 ; recul d’une case |
| Grand revers | 1,05 → 1,35 | Trois cases adjacentes ; pénétration 30 → 60 % |
| Double entaille | Deux coups de 0,72 → 0,86 | Charge de riposte/ouverture appliquée une seule fois |
| Pas de côté | 0,85 → 1,05 | Déplacement ; feinte de secours 35 → 45 % de protection |
| Mise à mort | 1,65 → 2,13 | Seuil 35 % des PV, puis 40 % au rang 3 et 45 % au rang 5 |
| Sel noir | 1,05 → 1,31 | Coût 5 ; dégâts de malédiction 0,13 → 0,21 par phase |
| Rot d’État | 0,90 → 1,18 | Coût 7 ; recul d’une case ou collision si impossible |
| Éclatement | 1,10 → 1,40 | Coût 10 ; bonus sur la cible maudite 0,65 → 0,95 |

Les sorts coûtent ensemble 22 mousse : la réserve initiale de 40 permet la séquence complète. Le projectile gratuit vaut 0,90, portée de deux cases. Éclatement n’exige pas de malédiction pour être lancé ; la politique automatique du banc réserve généralement le sort à une cible maudite.

| Passive | Enveloppe initiale |
| --- | --- |
| Rancune | Charge unique plafonnée à 18 → 32 % de puissance ; récupération limitée à 65 % des dégâts absorbés |
| Tenir la porte | Soin 2,5 → 4,5 % des PV maximum, une fois par cible après poussée puis frappe |
| Inébranlable | Protection conservée 15 → 25 % lors d’une riposte chargée |
| Plaie ouverte | Deux phases de saignement à 13 → 23 % de puissance, sans cumul |
| Dans l’ouverture | Bonus unique 18 → 30 % de puissance sur la cible du Pas de côté |
| Encore un | Saignement court sur la prochaine cible après une exécution ; ses améliorations propres de rang restent à préciser |
| Fermentation | 2 mousse par projectile gratuit sur cible maudite ; 3 au rang 3, 4 au rang 5, un gain par action |
| Contamination | Transmission à un voisin survivant, utilisable pendant un tour suivant ; deux à partir du rang 3. Le cinquième rang reste à préciser |
| Réserve de lie | Remboursement 20 → 34 % d’Éclatement ; arrondi inférieur, coût net toujours positif |

La durée de Sel noir est de deux phases, trois dès le rang 3. Une malédiction transmise garde une fenêtre au prochain tour du joueur : son tick immédiat de phase ennemie ne doit pas la faire disparaître avant de pouvoir être utilisée. Les rangs 3/5 doivent apporter les améliorations marquées prévues ; les deux lignes encore incomplètes et les innées seront finalisées dans le moteur réel, pas présentées comme entièrement calibrées ici.

## Mousse et provisions

Sur dix duels successifs avec la même réserve de mousse et le build de référence, le Jambonmancien utilise 3 bières aux niveaux 1/5/10, 2 au niveau 15, 1 au niveau 20. Une bière rend 40 mousse, comme dans le prototype. Le banc remet les PV à plein entre ces duels et boit entre les combats : il isole l’économie de mousse et ne valide pas la survie sur un étage.

Une règle tactique explique une partie du gain : achever une cible avec le projectile gratuit lorsque celui-ci suffit. L’aperçu des dégâts et du coût doit rendre ce choix lisible. Il faut ensuite tester des étages entiers avec leurs soins, provisions, innées, regroupements et consommation réelle d’un tour pour boire. Ne pas garder aveuglément le nombre actuel de monstres et de bières par étage.

## XP et rareté

XP pour passer du niveau `n` au suivant : `40 + 15n + 2n²`, limite 20. Total pour atteindre 20 : 8 550. Collecter 80 % du budget total conduit au niveau 18, 90 % au niveau 19. Ce calcul ne prouve pas encore la distribution sur la carte ni le niveau avant le boss.

Budgets par étage pour une exploration complète : 57, 181, 297, 202, 531, 727, 447, 1 081, 1 357, 792, 1 831, 1 047. Ils conduisent aux niveaux de fin d’étage 2/4/6/7/9/11/12/14/16/17/19/20. Répartir ce budget entre adversaires, boss, découverte et récompenses fixes ; éviter une dépendance au hasard de génération. Les budgets ne sont pas des quantités identiques d’ennemis.

Multiplicateurs numériques des objets : commun 1, garde 1,08, grand cru 1,16, État 1,25. Ils s’appliquent uniquement aux bonus de l’objet. Dans le kit de référence au niveau 20, passer tous les objets de courant à État augmente la puissance totale de moins de 15 % et les PV de moins de 10 %. Les propriétés intéressantes des raretés restent à définir.

## Risques révélés par les essais

- Deux adversaires simultanés au niveau 1 tuent le DPS dans 11/64 essais et le mage dans 28/64, sans provisions ni retraite. Ne pas proposer ces groupes comme passages obligatoires du tutoriel. Tester surtout des duels au premier étage, puis les rencontres multiples après le déblocage du placement.
- Un élite de niveau 1 tue le DPS dans 1/64 essais : ne pas tirer un élite obligatoire au départ.
- Trois adversaires en salle au niveau 10 restent très dangereux pour le DPS : 2/64 défaites et environ 96 % des PV perdus en moyenne. Prévoir une retraite lisible et des provisions ; vérifier leur composition plutôt que seulement leurs PV.
- La garde du Tank doit être réservée à une attaque annoncée : dépenser son délai pendant le tour de préparation pénalise fortement le joueur. L’interface doit montrer cette information.
- Le mage à zéro mousse conserve son attaque gratuite, mais ne gagne pas systématiquement contre un boss. Préparer sa réserve reste utile ; les repos et l’accès aux provisions doivent éviter de bloquer une campagne.
- La stratégie qui recule en boucle contre un ennemi exclusivement de mêlée doit être vérifiée sur la vraie grille. Ce banc n’autorise pas les retraites libres illimitées et ne prouve pas que le prototype empêche cette exploitation. Les adversaires à distance et les charges annoncées devront donner une raison de se repositionner plutôt que de répéter le même pas.

Ces observations restent visibles dans le rapport : aucun filtre n’élimine les défaites pour présenter un taux de victoire parfait.

## Reproduire et intégrer

`npm run rpg:equilibrage -- chemin/du/rapport` génère `resultats.json` et `combats.md`. Sans destination, les fichiers vont dans `work/ordre-cochon-equilibrage`, à ne pas committer. `npm test` vérifie le budget de points, les seuils d’XP, la rareté, la dépense de mousse, la reproductibilité et les combats de boss de référence.

Prochaine intégration : utiliser les coefficients dans le moteur réel, ajouter les dix-huit compétences et les douze innées, définir les états d’attaque annoncée et le ciblage, migrer les sauvegardes sans perdre le sac. Puis tester les mêmes situations sur de vraies cartes et montrer l’interface avant le push visuel. Les boss réels auront des phases ; la fixture actuelle n’utilise qu’une attaque spéciale périodique.
