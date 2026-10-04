/** Sprites dessinés sur leurs grilles natives, proportionnées à leur taille dans le monde.
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

export const DESSINS_ENNEMIS: Record<Exclude<SpriteMonstre, "inspecteur" | "prevot" | "pressoir" | "spectre">, (g: G) => void> = {
  rat: (g) => {
    // Queue en marches, croupe, museau effilé : profil compact de rat.
    blocs(g, P.peauOmbre, [[1,11,1,3],[1,14,2,1],[2,14,3,1]]);
    blocs(g, P.peau, [[1,11,1,3],[1,14,1,1],[2,14,1,1],[3,14,2,1]]);
    blocs(g, P.ombre, [[4,13,2,3],[5,12,5,5],[10,13,3,3],[13,12,2,4],[14,14,2,1],[16,14,1,1]]);
    blocs(g, P.gris, [[5,13,1,2],[6,12,4,4],[9,13,4,2],[13,13,1,2],[14,14,1,1]]);
    blocs(g, P.clair, [[6,12,3,1],[5,14,1,1],[9,13,2,1],[13,13,1,1]]);
    // Oreille et œil restent séparés ; pattes au sol, incisive à l’avant.
    r(g,P.peauOmbre,12, 10, 2, 3);r(g,P.peau,13, 11, 1, 1);r(g,P.chair,13, 11, 1, 1);
    r(g,P.noir,14, 13, 1, 1);r(g,P.rouge,14, 13, 1, 1);
    r(g,P.peau,16, 14, 1, 1);r(g,P.papier,15, 15, 1, 1);
    blocs(g,P.noir,[[5,16,2,1],[10,16,2,1],[14,16,1,1]]);
    blocs(g,P.peau,[[5,17,3,1],[11,17,2,1],[14,16,1,1]]);
    r(g,P.ombre,7, 14, 2, 1);r(g,P.gris,7, 15, 1, 1);
  },
  gobelin: (g) => {
    // Oreilles anguleuses, visage verdâtre, pourpoint et bourse de chapardeur.
    blocs(g,P.vertOmbre,[[3,4,2,2],[5,5,2,3],[17,4,3,2],[16,6,3,2],[7,4,9,6],[8,10,7,2]]);
    blocs(g,P.vert,[[4,5,1,1],[5,6,2,1],[17,5,2,1],[16,6,2,1],[8,4,7,5],[9,9,5,2]]);
    blocs(g,P.vertClair,[[8,4,5,1],[8,6,2,2],[11,7,2,2],[10,10,3,1]]);
    r(g,P.vertOmbre,9, 6, 2, 1);r(g,P.vertOmbre,13, 6, 2, 1);
    r(g,P.or,10, 7, 1, 1);r(g,P.or,13, 7, 1, 1);
    r(g,P.noir,10, 7, 1, 1);r(g,P.noir,14, 7, 1, 1);
    r(g,P.vertOmbre,11, 10, 3, 1);r(g,P.papier,11, 10, 1, 1);
    blocs(g,P.brunOmbre,[[7,12,9,7],[8,18,3,1],[13,18,3,1]]);
    blocs(g,P.brun,[[8,12,7,5],[8,17,3,2],[13,17,2,2]]);
    r(g,P.bois,8, 13, 2, 3);r(g,P.papier,10, 12, 3, 1);r(g,P.or,11, 16, 2, 1);
    r(g,P.noir,8, 17, 8, 1);r(g,P.or,11, 17, 2, 1);
    blocs(g,P.vertOmbre,[[5,13,3,6],[8,19,3,3],[13,19,3,3],[16,13,1,3]]);
    blocs(g,P.vert,[[5,13,2,4],[8,19,2,3],[13,19,1,3],[16,13,1,2]]);
    blocs(g,P.noir,[[7,22,4,1],[13,22,4,1]]);r(g,P.brun,7, 22, 2, 1);r(g,P.brun,14, 22, 2, 1);
    blocs(g,P.brunOmbre,[[17,14,3,2],[17,16,4,4],[17,20,3,2]]);
    r(g,P.bois,17, 16, 3, 4);r(g,P.boisClair,17, 16, 2, 2);
    r(g,P.noir,17, 15, 3, 1);r(g,P.or,18, 18, 1, 1);r(g,P.vert,16, 16, 1, 1);
  },
  moisissure: (g) => {
    // 20×20 pour une créature d'une demi-case : même densité que 40×40 sur une case.
    // Un caractère = un pixel natif ; contour ajouté sur cette même grille.
    const palette: Record<string, string> = {
      d: P.vertOmbre, m: P.vert, l: P.vertClair, h: "#8d9d6b",
      X: P.noir, w: P.papier, i: P.ivoire, t: P.brunOmbre, o: P.bois,
    };
    const pixels = [
      '....................',
      '....................',
      '.........ttt........',
      '........tiwwt.......',
      '.........ot.........',
      '....ttt..ot...ttt...',
      '...tiwwt.ot..tiwwt..',
      '....ot..ddmd..ot....',
      '....ot.dlhmmd.ot....',
      '.....ddllmmmmdod....',
      '....dllmmmmmmmdd....',
      '...dllmmmmmmmmmd....',
      '...dlmmmXmmXmmmmdd..',
      '..dlmmmmmmmmmmmmmd..',
      '..dmmmmmmddmmmmmmd..',
      '..dmmddmmmmmmddmmd..',
      '...ddmmddddddmmdd...',
      '....ddddm..mdddd....',
      '....................',
      '....................',
    ];
    for (const [y, ligne] of pixels.entries()) {
      for (const [x, signe] of [...ligne].entries()) {
        const couleur = palette[signe];
        if (couleur) r(g, couleur, x, y, 1, 1);
      }
    }

  },
  saucisson: (g) => {
    // Boyau rouge, ficelle et marbrures organisées ; deux pieds pour la silhouette.
    blocs(g,P.sang,[[12,6,5,1],[10,7,9,2],[8,9,12,13],[10,22,8,3],[12,25,4,1]]);
    blocs(g,P.rouge,[[11,7,6,2],[9,9,9,13],[11,22,6,3]]);
    blocs(g,"#b46355",[[11,8,2,1],[10,10,2,9],[11,20,2,2]]);
    blocs(g,P.ivoire,[[13,2,2,4],[12,4,1,1],[15,4,1,1]]);
    r(g,P.bois,13, 6, 2, 1);
    blocs(g,P.papier,[[9,8,9,1],[8,15,12,1],[10,22,8,1]]);
    blocs(g,P.chair,[[11,10,2,1],[15,14,2,1],[13,18,1,1],[16,20,2,1],[11,21,1,1]]);
    r(g,P.sang,11, 11, 2, 1);r(g,P.sang,15, 11, 3, 1);
    r(g,P.papier,11, 12, 2, 1);r(g,P.papier,15, 12, 2, 1);
    r(g,P.noir,12, 13, 1, 1);r(g,P.noir,16, 13, 1, 1);r(g,P.sang,13, 14, 2, 1);
    blocs(g,P.noir,[[9,25,4,2],[16,25,4,2]]);r(g,P.sang,10, 25, 1, 1);r(g,P.sang,17, 25, 1, 1);
  },
  tonneau: (g) => {
    // Douves, cerclages métalliques et gueule crénelée.
    blocs(g,P.brunOmbre,[[8,5,10,2],[6,7,14,2],[5,9,16,12],[6,21,14,2],[8,23,10,2]]);
    blocs(g,P.brun,[[8,6,9,1],[7,7,12,3],[5,10,15,10],[7,20,12,3],[8,23,10,1]]);
    blocs(g,P.bois,[[7,10,1,10],[10,7,2,16],[13,7,2,16],[16,10,2,10]]);
    blocs(g,P.boisClair,[[7,10,1,8],[10,7,1,7],[13,7,1,5],[16,10,1,4]]);
    r(g,P.brunOmbre,8, 6, 9, 1);r(g,P.boisClair,9, 5, 7, 1);
    blocs(g,P.ombre,[[5,8,16,2],[5,20,16,2]]);
    blocs(g,P.clair,[[6,8,14,1],[6,20,14,1]]);r(g,P.gris,6, 21, 14, 1);
    blocs(g,P.or,[[7,9,1,1],[18,9,1,1],[7,21,1,1],[18,21,1,1]]);
    r(g,P.brunOmbre,8, 12, 3, 1);r(g,P.brunOmbre,15, 12, 3, 1);
    r(g,P.or,8, 12, 2, 2);r(g,P.or,16, 12, 2, 2);r(g,P.noir,9, 13, 1, 1);r(g,P.noir,16, 13, 1, 1);
    r(g,P.noir,7, 16, 12, 3);r(g,P.noir,8, 15, 10, 1);r(g,P.sang,9, 18, 8, 1);
    blocs(g,P.papier,[[8,16,1,1],[11,16,1,1],[15,16,1,1],[18,16,1,1],[10,18,1,1],[14,18,1,1],[17,18,1,1]]);
  },
  fantome: (g) => {
    // Drap spectral en plans froids, bras écartés et plis continus.
    const ombre="#697e7e", drap="#9eb5ac", lumiere="#d4e0cb";
    blocs(g,ombre,[[14,3,5,2],[11,5,11,2],[10,7,13,8],[8,14,16,12],[6,23,20,5],[7,28,4,2],[14,27,4,3],[21,27,4,3],[4,16,5,3],[2,19,5,4],[24,16,4,3],[26,19,3,3]]);
    blocs(g,drap,[[14,4,4,2],[12,6,8,2],[10,8,11,7],[9,15,13,10],[7,24,16,3],[8,27,2,2],[14,27,3,2],[22,27,1,1],[5,17,4,1],[3,19,3,3],[24,17,2,1],[26,19,2,2]]);
    blocs(g,lumiere,[[14,5,3,1],[12,7,2,3],[10,10,2,6],[10,17,1,7],[8,24,2,2],[15,17,2,7],[5,18,2,1]]);
    r(g,ombre,18, 17, 1, 8);r(g,ombre,12, 24, 2, 4);r(g,ombre,20, 23, 1, 4);
    r(g,P.ombre,13, 10, 2, 3);r(g,P.ombre,18, 10, 3, 3);r(g,P.noir,14, 11, 1, 1);r(g,P.noir,19, 11, 1, 1);
    r(g,ombre,15, 14, 3, 4);r(g,P.ombre,16, 15, 2, 2);
  },
  affineur: (g) => {
    // Même anatomie et vêtement en blocs que l’Inspecteur, tablier et grand tranchoir.
    blocs(g,P.noir,[[14,39,9,10],[29,39,7,10],[11,46,12,3],[29,46,10,3]]);
    r(g,P.gris,15, 41, 3, 4);r(g,P.ombre,30, 41, 3, 4);
    blocs(g,P.gris,[[13,23,23,17],[10,24,5,12],[35,24,5,10]]);
    blocs(g,P.papier,[[15,21,18,5],[13,26,23,13],[15,39,19,5]]);
    blocs(g,P.ivoire,[[15,24,4,12],[19,21,7,3],[16,39,4,2]]);
    blocs(g,"#b2a78b",[[31,28,4,11],[28,39,5,2],[21,36,4,3]]);
    r(g,P.rouge,21, 23, 5, 7);r(g,P.sang,23, 28, 2, 3);
    r(g,P.rouge,15, 30, 19, 1);r(g,P.sang,16, 31, 3, 9);
    r(g,"#b2a78b",20, 34, 9, 1);r(g,P.papier,21, 35, 7, 3);
    blocs(g,P.peau,[[19,9,12,10],[21,19,8,2],[9,36,5,4],[36,31,7,5]]);
    r(g,P.chair,20, 10, 9, 8);r(g,P.ivoire,20, 10, 4, 3);r(g,P.peauOmbre,29, 13, 2, 5);
    r(g,P.noir,20, 13, 4, 1);r(g,P.noir,26, 13, 4, 1);
    r(g,P.rouge,21, 14, 2, 1);r(g,P.rouge,28, 14, 1, 1);
    r(g,P.ivoire,24, 14, 2, 2);r(g,P.peauOmbre,23, 18, 5, 1);
    r(g,P.noir,16, 1, 18, 7);r(g,P.ombre,18, 3, 12, 2);r(g,P.gris,19, 3, 9, 1);
    r(g,P.noir,14, 6, 22, 3);r(g,P.or,16, 6, 17, 2);
    // Acier en deux valeurs, dos épais, manche en bois et main distincte.
    r(g,P.ombre,40, 9, 6, 21);r(g,P.clair,40, 10, 5, 18);r(g,P.papier,41, 10, 3, 15);
    r(g,P.gris,40, 26, 4, 3);r(g,P.or,40, 30, 5, 1);r(g,P.brunOmbre,41, 31, 4, 10);
    r(g,P.bois,41, 33, 2, 6);r(g,P.chair,36, 31, 5, 3);
  },
};
