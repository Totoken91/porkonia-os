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
    entree:{x:4,y:18,dir:0},sortie:{x:13,y:3},
    salles:[{x:2,y:17,w:5,h:3,theme:4},{x:9,y:13,w:9,h:7,theme:1},{x:9,y:3,w:9,h:7,theme:4},{x:2,y:4,w:5,h:5,theme:3},{x:21,y:4,w:4,h:5,theme:1},{x:21,y:14,w:4,h:5,theme:2}],
    passages:[[[4,17],[4,14],[11,14]],[[13,13],[13,9]],[[9,7],[6,7]],[[4,8],[4,11],[10,11],[10,13]],[[17,7],[21,7]],[[17,16],[21,16]],[[22,14],[22,8]]],
    piliers:[[11,16],[15,16],[11,5],[15,5]],
    rencontres:[{x:4,y:14,type:'rat'},{x:11,y:14,type:'gobelin'},{x:16,y:18,type:'moisissure'},{x:13,y:10,type:'inspecteur'},{x:22,y:16,type:'tonneau'},{x:4,y:7,type:'saucisson'},{x:13,y:6,type:'inspecteur'},{x:22,y:7,type:'saucisson'}],
    reserves:[{x:12,y:18,type:'jambon'},{x:5,y:5,type:'jambon'},{x:23,y:17,type:'biere'},{x:23,y:6,type:'biere'},{x:3,y:5,type:'objet'},{x:23,y:15,type:'objet'}],
  },
];
