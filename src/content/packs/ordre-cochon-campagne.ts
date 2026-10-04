import type { EtageDonjonDef } from '../types';

/** Premier acte : contenu original du jeu, sans ajout au canon de Porkopédia. */
export const premierActe:EtageDonjonDef[]=[
  {
    etage:1,w:23,h:19,
    description:'Les jambons indiquent le saloir. Les réserves latérales valent le détour ; la descente se trouve au-delà des piliers.',
    entree:{x:4,y:14,dir:0},sortie:{x:15,y:3},
    salles:[{x:2,y:13,w:5,h:3,theme:4},{x:9,y:9,w:5,h:5,theme:4},{x:9,y:2,w:9,h:5,theme:1},{x:2,y:3,w:5,h:5,theme:3},{x:17,y:10,w:4,h:5,theme:2}],
    passages:[[[4,13],[4,11],[9,11]],[[11,9],[11,6]],[[9,10],[4,10],[4,7]],[[6,5],[9,5]],[[13,12],[18,12]]],
    piliers:[[11,4],[15,4]],
    rencontres:[{x:4,y:10,type:'rat'},{x:9,y:11,type:'gobelin'},{x:13,y:10,type:'moisissure'},{x:4,y:5,type:'rat'},{x:13,y:5,type:'gobelin'},{x:18,y:12,type:'rat'}],
    reserves:[{x:4,y:7,type:'jambon'},{x:12,y:12,type:'jambon'},{x:6,y:4,type:'biere'},{x:19,y:13,type:'biere'},{x:18,y:13,type:'objet'}],
  },
  {
    etage:2,w:25,h:21,
    description:'Le cellier se divise en deux circuits. Les alcôves humides abritent des provisions ; les inspecteurs surveillent la route de sortie.',
    entree:{x:4,y:16,dir:0},sortie:{x:20,y:16},
    salles:[{x:2,y:15,w:5,h:3,theme:4},{x:9,y:13,w:7,h:5,theme:2},{x:2,y:3,w:7,h:5,theme:3},{x:10,y:3,w:5,h:5,theme:4},{x:16,y:3,w:7,h:5,theme:2},{x:18,y:13,w:5,h:5,theme:4}],
    passages:[[[4,15],[4,11],[12,11],[12,13]],[[12,11],[12,7]],[[8,5],[10,5]],[[14,5],[16,5]],[[5,7],[5,10],[12,10]],[[18,7],[18,11],[20,11],[20,13]]],
    piliers:[[11,15],[13,15],[18,5],[20,5]],
    rencontres:[{x:4,y:12,type:'saucisson'},{x:12,y:10,type:'inspecteur'},{x:4,y:5,type:'moisissure'},{x:8,y:5,type:'gobelin'},{x:19,y:5,type:'inspecteur'},{x:20,y:11,type:'saucisson'},{x:20,y:15,type:'gobelin'}],
    reserves:[{x:11,y:16,type:'jambon'},{x:6,y:5,type:'jambon'},{x:18,y:6,type:'biere'},{x:21,y:14,type:'biere'},{x:3,y:4,type:'objet'}],
  },
  {
    etage:3,w:27,h:23,
    description:'La Commission a bâti large. Les piliers permettent de rompre les lignes ; les salles latérales rejoignent le grand saloir par deux approches.',
    entree:{x:4,y:18,dir:0},sortie:{x:13,y:3},gardien:{x:13,y:6},coinRepos:true,
    salles:[{x:2,y:17,w:5,h:3,theme:4},{x:9,y:13,w:9,h:7,theme:1},{x:9,y:3,w:9,h:7,theme:4},{x:2,y:4,w:5,h:5,theme:3},{x:21,y:4,w:4,h:5,theme:1},{x:21,y:14,w:4,h:5,theme:2}],
    passages:[[[4,17],[4,14],[11,14]],[[13,13],[13,9]],[[9,7],[6,7]],[[4,8],[4,11],[10,11],[10,13]],[[17,7],[21,7]],[[17,16],[21,16]],[[22,14],[22,8]]],
    piliers:[[11,16],[15,16],[11,5],[15,5]],
    rencontres:[{x:4,y:14,type:'rat'},{x:11,y:14,type:'gobelin'},{x:16,y:18,type:'moisissure'},{x:13,y:10,type:'inspecteur'},{x:22,y:16,type:'tonneau'},{x:4,y:7,type:'saucisson'},{x:22,y:7,type:'saucisson'}],
    reserves:[{x:12,y:18,type:'jambon'},{x:5,y:5,type:'jambon'},{x:23,y:17,type:'biere'},{x:23,y:6,type:'biere'},{x:3,y:5,type:'objet'},{x:23,y:15,type:'objet'}],
  },
];

const s=(x:number,y:number,w:number,h:number,theme:1|2|3|4)=>({x,y,w,h,theme});
const m=(x:number,y:number,type:string,elite=false)=>({x,y,type,elite});
const r=(x:number,y:number,type:'jambon'|'biere'|'objet')=>({x,y,type});

/** Acte II : galeries croisées, circuit des fosses, carrefour des pressoirs. */
export const deuxiemeActe:EtageDonjonDef[]=[
  {etage:4,w:27,h:23,entree:{x:4,y:18,dir:0},sortie:{x:22,y:4},
    description:'Les galeries traversent trois ateliers. Deux passages relient les ailes : une retraite peut devenir une autre approche.',
    salles:[s(2,16,5,5,4),s(10,14,7,7,1),s(20,15,5,5,2),s(2,3,5,7,3),s(10,3,7,7,4),s(20,3,5,7,1)],
    passages:[[[4,16],[4,12],[13,12],[13,14]],[[6,18],[10,18]],[[16,18],[20,18]],[[4,9],[4,16]],[[13,9],[13,14]],[[22,9],[22,15]],[[6,6],[10,6]],[[16,6],[20,6]]],
    piliers:[[12,17],[14,17],[12,6],[14,6]],
    rencontres:[m(4,13,'fantome'),m(13,12,'inspecteur'),m(4,6,'moisissure'),m(13,8,'saucisson'),m(22,17,'tonneau'),m(22,6,'fantome')],
    reserves:[r(5,18,'jambon'),r(5,19,'jambon'),r(3,4,'jambon'),r(15,19,'biere'),r(23,8,'biere'),r(23,18,'objet'),r(3,8,'objet')]},
  {etage:5,w:29,h:23,entree:{x:4,y:18,dir:0},sortie:{x:24,y:4},
    description:'Les fosses encerclent un îlot de pierre. Le circuit extérieur donne de la place ; la traverse centrale offre un trajet plus court.',
    salles:[s(2,16,5,5,4),s(2,3,7,7,3),s(12,3,5,5,2),s(20,3,7,7,3),s(20,14,7,7,2),s(11,14,7,7,1)],
    passages:[[[4,16],[4,9]],[[8,6],[12,6]],[[16,6],[20,6]],[[23,9],[23,14]],[[20,17],[17,17]],[[11,17],[6,17]],[[14,7],[14,14]],[[4,12],[14,12],[23,12]]],
    piliers:[[4,6],[6,6],[22,6],[24,6],[13,17],[15,17]],
    rencontres:[m(4,13,'moisissure'),m(7,6,'fantome'),m(14,9,'inspecteur'),m(21,17,'tonneau'),m(23,11,'saucisson'),m(25,6,'fantome')],
    reserves:[r(3,8,'jambon'),r(16,18,'jambon'),r(22,19,'biere'),r(15,5,'biere'),r(3,4,'objet'),r(25,18,'objet')]},
  {etage:6,w:29,h:25,entree:{x:14,y:21,dir:0},sortie:{x:14,y:3},gardien:{x:14,y:6},coinRepos:true,
    description:'Les pressoirs convergent vers une salle en croix. Les ailes latérales permettent de contourner son centre et cachent les réserves.',
    salles:[s(12,19,5,4,4),s(10,10,9,7,1),s(2,10,5,7,2),s(22,10,5,7,2),s(9,2,11,6,4),s(2,3,5,5,3),s(22,3,5,5,3)],
    passages:[[[14,19],[14,16]],[[10,13],[6,13]],[[18,13],[22,13]],[[14,10],[14,7]],[[4,10],[4,7]],[[24,10],[24,7]],[[6,5],[9,5]],[[19,5],[22,5]]],
    piliers:[[12,12],[16,12],[12,14],[16,14],[11,5],[17,5]],
    rencontres:[m(14,17,'saucisson'),m(14,13,'inspecteur'),m(4,13,'tonneau'),m(24,13,'tonneau'),m(4,5,'fantome'),m(24,5,'fantome')],
    reserves:[r(3,15,'jambon'),r(25,15,'jambon'),r(3,4,'biere'),r(25,4,'biere'),r(5,6,'objet'),r(23,6,'objet')]},
];

/** Acte III : archives en peigne, deux longues ailes, anneau autour des cuves. */
export const troisiemeActe:EtageDonjonDef[]=[
  {etage:7,w:29,h:25,entree:{x:4,y:20,dir:0},sortie:{x:24,y:4},
    description:'Les archives s’ouvrent sur une longue galerie. Les salles traversantes relient ses deux branches ; les impasses conservent ce qui a été oublié.',
    salles:[s(2,18,5,5,4),s(2,10,5,5,3),s(2,2,5,5,4),s(10,18,9,5,1),s(10,10,9,5,4),s(10,2,9,5,1),s(22,2,5,7,4)],
    passages:[[[4,18],[4,14]],[[4,10],[4,6]],[[6,20],[10,20]],[[6,12],[10,12]],[[6,4],[10,4]],[[18,4],[22,4]],[[14,18],[14,14]],[[14,10],[14,6]],[[24,8],[24,20],[18,20]]],
    piliers:[[12,12],[16,12],[12,4],[16,4]],
    rencontres:[m(4,16,'fantome'),m(4,8,'moisissure'),m(14,20,'inspecteur'),m(14,12,'fantome'),m(14,8,'saucisson'),m(24,6,'inspecteur')],
    reserves:[r(5,20,'jambon'),r(3,3,'jambon'),r(17,13,'jambon'),r(12,21,'biere'),r(23,7,'biere'),r(5,11,'objet'),r(17,3,'objet')]},
  {etage:8,w:31,h:25,entree:{x:4,y:21,dir:0},sortie:{x:26,y:3},
    description:'L’abattoir possède deux ailes parallèles et trois traverses. Les piliers coupent les lignes de vue ; les chambres extérieures offrent des replis.',
    salles:[s(2,19,5,4,4),s(2,2,5,6,3),s(10,2,5,21,1),s(20,2,5,21,4),s(26,2,3,6,2),s(26,17,3,6,2)],
    passages:[[[4,19],[4,7]],[[6,21],[10,21]],[[6,5],[10,5]],[[14,5],[20,5]],[[14,12],[20,12]],[[14,21],[20,21]],[[24,5],[26,5]],[[24,20],[26,20]]],
    piliers:[[12,8],[12,16],[22,8],[22,16]],
    rencontres:[m(4,17,'saucisson'),m(12,19,'inspecteur'),m(12,11,'fantome'),m(4,5,'moisissure'),m(22,20,'tonneau'),m(22,11,'fantome'),m(26,5,'inspecteur')],
    reserves:[r(3,3,'jambon'),r(13,13,'jambon'),r(21,17,'biere'),r(27,21,'biere'),r(28,3,'objet'),r(28,19,'objet')]},
  {etage:9,w:31,h:27,entree:{x:4,y:23,dir:0},sortie:{x:15,y:3},gardien:{x:15,y:6},coinRepos:true,
    description:'Un anneau contourne les cuves. Le cœur du saloir dispose de deux entrées ; choisir l’approche évite de se coincer entre les piliers.',
    salles:[s(2,21,5,4,4),s(2,3,5,8,3),s(10,3,11,7,4),s(24,3,5,8,3),s(10,16,11,9,1),s(24,17,5,8,2)],
    passages:[[[4,21],[4,10]],[[6,6],[10,6]],[[20,6],[24,6]],[[26,10],[26,17]],[[24,21],[20,21]],[[10,22],[6,22]],[[15,10],[15,16]],[[4,14],[11,14],[11,16]],[[26,14],[19,14],[19,16]]],
    piliers:[[12,19],[18,19],[12,22],[18,22],[12,6],[18,6]],
    rencontres:[m(4,19,'fantome'),m(11,17,'inspecteur'),m(15,13,'saucisson'),m(26,20,'tonneau'),m(26,7,'fantome'),m(4,7,'moisissure')],
    reserves:[r(13,23,'jambon'),r(3,4,'jambon'),r(27,23,'biere'),r(27,4,'biere'),r(5,9,'objet'),r(25,9,'objet')]},
];

/** Acte IV : bifurcation royale, galerie brisée, deux approches de l'antre final. */
export const quatriemeActe:EtageDonjonDef[]=[
  {etage:10,w:31,h:25,entree:{x:15,y:21,dir:0},sortie:{x:26,y:4},
    description:'Les réserves royales se séparent autour d’un massif central. Le chemin gauche rejoint les magasins ; le chemin droit mène vers la descente.',
    salles:[s(12,19,7,4,4),s(2,16,7,7,2),s(22,16,7,7,1),s(2,3,7,7,3),s(22,3,7,7,4),s(12,2,7,6,2)],
    passages:[[[12,21],[8,21]],[[18,21],[22,21]],[[5,16],[5,9]],[[25,16],[25,9]],[[8,6],[12,6]],[[18,6],[22,6]],[[5,13],[25,13]]],
    piliers:[[4,19],[6,19],[24,19],[26,19],[4,6],[6,6],[24,6],[26,6]],
    rencontres:[m(10,21,'saucisson'),m(20,21,'fantome'),m(5,13,'inspecteur'),m(25,13,'inspecteur'),m(5,8,'tonneau'),m(15,5,'fantome'),m(25,8,'saucisson'),m(26,5,'inspecteur')],
    reserves:[r(14,21,'jambon'),r(3,21,'jambon'),r(27,21,'jambon'),r(3,4,'biere'),r(27,8,'biere'),r(16,4,'objet'),r(7,4,'objet')]},
  {etage:11,w:31,h:27,entree:{x:4,y:23,dir:0},sortie:{x:26,y:3},
    description:'Le dernier saloir alterne chambres et coudes. La boucle extérieure permet de quitter une ligne dangereuse et de revenir par une autre porte.',
    salles:[s(2,21,5,4,4),s(11,19,7,6,1),s(23,15,6,6,2),s(11,10,7,5,4),s(2,7,5,6,3),s(11,2,7,5,1),s(23,2,6,7,4)],
    passages:[[[6,23],[11,23]],[[17,22],[25,22],[25,20]],[[25,15],[25,12],[17,12]],[[11,12],[6,12]],[[4,7],[4,4],[11,4]],[[17,4],[23,4]],[[26,8],[26,15]],[[14,19],[14,14]]],
    piliers:[[13,22],[15,22],[13,4],[15,4],[25,5],[27,5]],
    rencontres:[m(9,23,'fantome'),m(16,23,'inspecteur'),m(25,18,'tonneau'),m(14,12,'saucisson'),m(4,10,'moisissure'),m(14,5,'fantome'),m(26,7,'inspecteur')],
    reserves:[r(5,23,'jambon'),r(12,23,'jambon'),r(3,8,'jambon'),r(27,19,'biere'),r(27,3,'biere'),r(5,11,'objet'),r(16,3,'objet')]},
  {etage:12,w:31,h:27,entree:{x:15,y:23,dir:0},sortie:{x:15,y:3},gardien:{x:15,y:5},
    description:'L’antre se rejoint par deux ailes. Le Grand Affineur attend au fond de la salle ; les réserves se trouvent avant le dernier passage.',
    salles:[s(12,21,7,4,4),s(2,16,7,7,2),s(22,16,7,7,2),s(2,7,7,5,3),s(22,7,7,5,3),s(10,2,11,10,1)],
    passages:[[[12,23],[5,23],[5,22]],[[18,23],[25,23],[25,22]],[[5,16],[5,11]],[[25,16],[25,11]],[[8,9],[10,9]],[[22,9],[20,9]],[[15,21],[15,15],[5,15]],[[15,15],[25,15]]],
    piliers:[[4,19],[6,19],[24,19],[26,19],[12,5],[18,5],[12,8],[18,8]],
    rencontres:[m(9,23,'saucisson'),m(21,23,'fantome'),m(5,14,'inspecteur'),m(25,14,'inspecteur'),m(5,9,'tonneau'),m(25,9,'tonneau'),m(15,10,'fantome')],
    reserves:[r(14,23,'jambon'),r(3,21,'jambon'),r(27,21,'jambon'),r(7,9,'biere'),r(23,9,'biere'),r(3,8,'objet'),r(27,8,'objet')]},
];

export const campagneOrdre=[...premierActe,...deuxiemeActe,...troisiemeActe,...quatriemeActe];
