/** Sprites natifs 40×40 : mêmes contours et masses de couleur que l’Inspecteur.
 * Coordonnées entières, palette maîtrisée, dessins construits à leur taille réelle.
 */
import type { SpriteMonstre } from "@/content/types";

type G = CanvasRenderingContext2D;
type Bloc = readonly [number, number, number, number];
const P = {
  noir: "#25232d", ombre: "#393744", gris: "#555463", clair: "#787986",
  chair: "#e4b593", peau: "#c28b71", peauOmbre: "#936954", ivoire: "#f3d2aa",
  rouge: "#922e3b", sang: "#62303b", or: "#ceaa62", papier: "#e9ddbc",
  brun: "#76523a", bois: "#a0784d", boisClair: "#c29865", brunOmbre: "#513b30",
  vert: "#73845a", vertClair: "#a5b782", vertOmbre: "#4a593e",
};
function r(g: G, c: string, x: number, y: number, w: number, h: number) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}
function blocs(g: G, c: string, bs: readonly Bloc[]) {
  for (const [x, y, w, h] of bs) r(g, c, x, y, w, h);
}

export const DESSINS_ENNEMIS: Record<Exclude<SpriteMonstre, "inspecteur" | "prevot" | "pressoir" | "spectre">, (g: G) => number> = {
  rat: (g) => {
    // Queue en marches, croupe, museau effilé : profil compact de rat.
    blocs(g, P.peauOmbre, [[2,25,2,7],[3,31,3,2],[5,32,6,2]]);
    blocs(g, P.peau, [[2,25,1,5],[3,30,1,2],[4,31,2,1],[6,32,4,1]]);
    blocs(g, P.ombre, [[9,29,4,7],[12,26,11,11],[22,28,7,8],[28,27,5,8],[32,30,3,4],[35,32,2,2]]);
    blocs(g, P.gris, [[10,29,4,5],[13,27,9,8],[21,29,7,5],[28,28,4,5],[31,30,3,3]]);
    blocs(g, P.clair, [[13,27,7,2],[11,30,2,3],[20,29,5,2],[29,28,2,2]]);
    // Oreille et œil restent séparés ; pattes au sol, incisive à l’avant.
    r(g,P.peauOmbre,27,23,5,6);r(g,P.peau,28,24,3,3);r(g,P.chair,28,24,1,2);
    r(g,P.noir,31,29,2,2);r(g,P.rouge,31,29,1,1);
    r(g,P.peau,35,32,2,1);r(g,P.papier,33,34,1,2);
    blocs(g,P.noir,[[11,36,5,2],[23,35,4,3],[30,35,3,2]]);
    blocs(g,P.peau,[[12,37,5,1],[24,37,4,1],[31,36,3,1]]);
    r(g,P.ombre,15,32,4,1);r(g,P.gris,16,33,2,2);
    return .45;
  },
  gobelin: (g) => {
    // Oreilles anguleuses, visage verdâtre, pourpoint et bourse de chapardeur.
    blocs(g,P.vertOmbre,[[5,7,3,3],[8,9,4,4],[29,7,5,3],[27,10,4,3],[12,7,15,10],[14,17,11,3]]);
    blocs(g,P.vert,[[6,8,2,1],[8,10,4,2],[29,8,3,1],[27,10,3,2],[13,7,12,8],[15,15,9,3]]);
    blocs(g,P.vertClair,[[14,7,7,2],[13,10,3,3],[18,11,3,4],[16,16,5,1]]);
    r(g,P.vertOmbre,15,10,3,1);r(g,P.vertOmbre,22,10,3,1);
    r(g,P.or,16,11,2,1);r(g,P.or,22,11,2,1);
    r(g,P.noir,17,11,1,1);r(g,P.noir,23,11,1,1);
    r(g,P.vertOmbre,18,16,5,1);r(g,P.papier,18,16,1,1);
    blocs(g,P.brunOmbre,[[12,20,15,11],[14,30,5,2],[22,30,4,2]]);
    blocs(g,P.brun,[[13,20,12,9],[14,29,5,2],[22,29,3,2]]);
    r(g,P.bois,14,21,3,5);r(g,P.papier,17,20,5,2);r(g,P.or,19,26,2,2);
    r(g,P.noir,13,28,13,2);r(g,P.or,19,28,2,2);
    blocs(g,P.vertOmbre,[[9,21,4,10],[14,32,4,4],[22,32,4,4],[26,21,3,6]]);
    blocs(g,P.vert,[[9,22,2,7],[14,32,2,4],[22,32,2,4],[26,21,2,4]]);
    blocs(g,P.noir,[[12,36,6,3],[22,36,6,3]]);r(g,P.brun,12,36,3,1);r(g,P.brun,23,36,3,1);
    blocs(g,P.brunOmbre,[[29,24,5,2],[28,26,7,8],[29,34,5,2]]);
    r(g,P.bois,29,27,4,6);r(g,P.boisClair,29,27,2,3);
    r(g,P.noir,29,25,5,1);r(g,P.or,30,30,2,2);r(g,P.vert,27,26,2,3);
    return .62;
  },
  moisissure: (g) => {
    // Lobes construits par paliers, spores en petits groupes lisibles.
    blocs(g,P.vertOmbre,[[5,28,30,8],[8,24,24,12],[11,21,17,14],[14,18,9,7],[5,35,6,3],[13,36,10,2],[27,35,7,3]]);
    blocs(g,P.vert,[[6,28,27,6],[9,25,21,10],[12,22,15,11],[15,19,6,6]]);
    blocs(g,P.vertClair,[[10,25,6,3],[13,22,6,3],[16,19,4,2],[23,25,4,2],[8,30,3,2]]);
    blocs(g,P.papier,[[13,23,3,1],[17,20,2,1],[24,25,2,1]]);
    blocs(g,P.vertOmbre,[[11,31,4,2],[21,32,5,2],[28,29,2,3],[17,35,3,1]]);
    blocs(g,P.noir,[[15,27,2,2],[22,27,2,2]]);r(g,P.papier,15,27,1,1);r(g,P.papier,22,27,1,1);
    r(g,P.vertOmbre,18,31,4,1);
    blocs(g,P.vert,[[9,18,1,7],[26,18,1,7],[31,22,1,5]]);
    blocs(g,P.papier,[[8,17,3,2],[25,17,3,2],[30,21,3,2],[20,14,2,2]]);
    r(g,P.vertClair,20,16,1,3);
    return .5;
  },
  saucisson: (g) => {
    // Boyau rouge, ficelle et marbrures organisées ; deux pieds pour la silhouette.
    blocs(g,P.sang,[[17,8,7,2],[14,10,13,3],[12,13,16,19],[14,32,12,4],[17,36,6,1]]);
    blocs(g,P.rouge,[[16,10,8,3],[13,13,12,18],[15,31,9,4]]);
    blocs(g,"#b46355",[[16,11,3,2],[14,14,3,13],[16,28,3,4]]);
    blocs(g,P.ivoire,[[19,3,2,5],[17,5,2,1],[21,5,2,1]]);
    r(g,P.bois,18,8,4,1);
    blocs(g,P.papier,[[13,12,13,1],[12,22,16,1],[14,32,12,1]]);
    blocs(g,P.chair,[[16,14,2,2],[22,20,2,1],[18,25,2,2],[23,28,2,2],[16,30,1,1]]);
    r(g,P.sang,15,16,4,1);r(g,P.sang,21,16,4,1);
    r(g,P.papier,16,17,2,2);r(g,P.papier,22,17,2,2);
    r(g,P.noir,17,18,1,1);r(g,P.noir,23,18,1,1);r(g,P.sang,18,20,4,1);
    blocs(g,P.noir,[[13,36,5,3],[23,36,5,3]]);r(g,P.sang,14,36,2,1);r(g,P.sang,24,36,2,1);
    return .7;
  },
  tonneau: (g) => {
    // Douves, cerclages métalliques et gueule crénelée.
    blocs(g,P.brunOmbre,[[12,8,16,2],[9,10,22,4],[7,14,26,18],[9,32,22,4],[12,36,16,2]]);
    blocs(g,P.brun,[[12,9,14,2],[10,11,19,4],[8,15,23,16],[10,31,19,4],[13,35,14,2]]);
    blocs(g,P.bois,[[10,15,3,15],[15,11,3,24],[20,11,3,24],[25,15,3,15]]);
    blocs(g,P.boisClair,[[10,16,1,12],[15,11,1,10],[20,11,1,8],[25,16,1,6]]);
    r(g,P.brunOmbre,13,9,13,1);r(g,P.boisClair,14,8,11,1);
    blocs(g,P.ombre,[[8,13,24,3],[8,31,24,3]]);
    blocs(g,P.clair,[[9,13,22,1],[9,31,22,1]]);r(g,P.gris,9,32,22,1);
    blocs(g,P.or,[[10,14,1,1],[28,14,1,1],[10,32,1,1],[28,32,1,1]]);
    r(g,P.brunOmbre,12,18,5,1);r(g,P.brunOmbre,23,18,5,1);
    r(g,P.or,13,19,3,2);r(g,P.or,24,19,3,2);r(g,P.noir,14,20,1,1);r(g,P.noir,25,20,1,1);
    r(g,P.noir,11,24,18,5);r(g,P.noir,13,23,14,1);r(g,P.sang,14,28,12,1);
    blocs(g,P.papier,[[12,24,2,2],[17,24,2,2],[23,24,2,2],[27,24,1,2],[15,27,2,2],[21,27,2,2],[26,27,2,2]]);
    return .66;
  },
  fantome: (g) => {
    // Drap spectral en plans froids, bras écartés et plis continus.
    const ombre="#697e7e", drap="#9eb5ac", lumiere="#d4e0cb";
    blocs(g,ombre,[[17,4,7,2],[14,6,13,3],[12,9,17,10],[10,18,20,14],[8,29,24,6],[9,35,5,3],[17,34,5,4],[26,34,5,3],[5,20,6,4],[3,24,6,5],[30,20,5,4],[32,24,4,4]]);
    blocs(g,drap,[[17,5,6,2],[15,7,10,3],[13,10,13,9],[11,19,16,12],[9,30,20,4],[10,34,3,2],[18,34,3,2],[27,34,2,1],[6,21,5,2],[4,24,4,3],[30,21,3,2],[33,24,2,2]]);
    blocs(g,lumiere,[[17,6,4,1],[15,9,3,3],[13,13,2,7],[12,21,2,9],[10,30,2,3],[19,21,2,9],[6,22,3,1]]);
    r(g,ombre,22,21,2,10);r(g,ombre,15,30,2,5);r(g,ombre,25,29,1,5);
    r(g,P.ombre,16,13,3,3);r(g,P.ombre,23,13,3,3);r(g,P.noir,17,14,1,1);r(g,P.noir,24,14,1,1);
    r(g,ombre,19,18,4,4);r(g,P.ombre,20,19,2,2);
    return .8;
  },
  affineur: (g) => {
    // Même anatomie et vêtement en blocs que l’Inspecteur, tablier et grand tranchoir.
    blocs(g,P.noir,[[11,31,7,8],[23,31,6,8],[9,37,9,2],[23,37,8,2]]);
    r(g,P.gris,12,33,2,3);r(g,P.ombre,24,33,2,3);
    blocs(g,P.gris,[[10,18,19,14],[8,19,4,10],[28,19,4,8]]);
    blocs(g,P.papier,[[12,17,14,4],[10,21,19,10],[12,31,15,4]]);
    blocs(g,P.ivoire,[[12,19,3,10],[15,17,6,2],[13,31,3,2]]);
    blocs(g,"#b2a78b",[[25,22,3,9],[22,31,4,2],[17,29,3,2]]);
    r(g,P.rouge,17,18,4,6);r(g,P.sang,18,22,2,3);
    r(g,P.rouge,12,24,15,1);r(g,P.sang,13,25,2,7);
    r(g,"#b2a78b",16,27,7,1);r(g,P.papier,17,28,5,2);
    blocs(g,P.peau,[[15,7,10,8],[17,15,6,2],[7,29,4,3],[29,25,5,4]]);
    r(g,P.chair,16,8,7,6);r(g,P.ivoire,16,8,3,2);r(g,P.peauOmbre,23,10,2,4);
    r(g,P.noir,16,10,3,1);r(g,P.noir,21,10,3,1);
    r(g,P.rouge,17,11,1,1);r(g,P.rouge,22,11,1,1);
    r(g,P.ivoire,19,11,2,2);r(g,P.peauOmbre,18,14,4,1);
    r(g,P.noir,13,1,14,5);r(g,P.ombre,14,2,10,2);r(g,P.gris,15,2,7,1);
    r(g,P.noir,11,5,18,2);r(g,P.or,13,5,13,1);
    // Acier en deux valeurs, dos épais, manche en bois et main distincte.
    r(g,P.ombre,32,7,5,17);r(g,P.clair,32,8,4,14);r(g,P.papier,33,8,2,12);
    r(g,P.gris,32,21,3,2);r(g,P.or,32,24,4,1);r(g,P.brunOmbre,33,25,3,8);
    r(g,P.bois,33,26,1,5);r(g,P.chair,29,25,4,2);
    return 1;
  },
};
