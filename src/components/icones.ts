/**
 * Icônes de PorkOS, dessinées pixel par pixel. Deux planches : 32×32 (bureau, menus principaux)
 * et 16×16 (barres de titre, barre des tâches, sous-menus), chacune dessinée pour sa taille.
 * Convention : lumière en haut à gauche, trois tons par matière (reflet, base, ombre),
 * trame d'époque pour les dégradés ; le contour noir est ajouté automatiquement autour du dessin.
 */
import type { IconKey } from "@/content/types";
import type { Toile } from "./pixel";

type Nom = Exclude<IconKey, "embleme">;
type Dessin = (t: Toile) => void;

/* ================================ 32 × 32 ================================ */

export const DESSINS: Record<Nom, Dessin> = {
  /** Afficher le bureau : sous-main vert, feuille et crayon. */
  bureau: (t) => {
    t.poly(
      [
        [4, 10],
        [28, 10],
        [31, 26],
        [1, 26],
      ],
      "n",
    );
    t.poly(
      [
        [6, 12],
        [26, 12],
        [28, 24],
        [4, 24],
      ],
      "t",
    );
    t.dither(6, 12, 22, 12, "T", 1);
    t.hline(5, 11, 23, "N");
    t.hline(2, 26, 29, "z");
    t.rect(9, 14, 8, 8, "W");
    t.hline(10, 16, 6, "g");
    t.hline(10, 18, 5, "g");
    t.hline(10, 20, 6, "g");
    for (let k = 0; k < 9; k++) {
      t.set(26 - k, 13 + k, "Y");
      t.set(27 - k, 13 + k, "y");
    }
    t.pts([[18, 22], [17, 23]], "k");
  },
  /** Dossier jaune entrouvert, feuilles qui dépassent. */
  dossier: (t) => {
    // dos et onglet
    t.rect(3, 5, 11, 4, "o");
    t.hline(4, 6, 8, "y");
    t.rect(2, 8, 27, 19, "o");
    t.hline(3, 9, 25, "y");
    // feuilles
    t.rect(5, 9, 21, 6, "W");
    t.rect(7, 8, 18, 1, "l");
    t.hline(7, 11, 13, "g");
    t.hline(7, 13, 9, "g");
    t.vline(25, 9, 6, "l");
    // rabat avant : dégradé tramé, arêtes en relief
    t.poly(
      [
        [1, 14],
        [30, 14],
        [29, 27],
        [2, 27],
      ],
      "y",
    );
    t.hline(2, 14, 28, "Y");
    t.rect(2, 15, 27, 2, "Y");
    t.dither(2, 17, 27, 2, "Y");
    t.dither(3, 24, 26, 2, "o");
    t.hline(3, 26, 26, "o");
    t.vline(29, 15, 11, "o");
    t.vline(2, 15, 11, "Y");
  },

  /** Bloc-notes à spirale, lignes bleues, marge rouge et crayon. */
  texte: (t) => {
    t.rect(5, 5, 20, 24, "W");
    t.vline(24, 6, 23, "l");
    t.hline(6, 28, 19, "l");
    t.rect(5, 5, 20, 3, "c");
    t.hline(5, 5, 20, "C");
    for (const x of [7, 10, 13, 16, 19, 22]) {
      t.vline(x, 2, 4, "d");
      t.set(x, 2, "g");
      t.set(x, 5, "D");
    }
    t.vline(9, 9, 19, "R");
    for (let y = 11; y <= 26; y += 3) t.hline(6, y, 18, "C");
    // écriture
    const lignes: [number, number][] = [
      [10, 12],
      [10, 9],
      [10, 13],
      [10, 7],
      [10, 11],
    ];
    lignes.forEach(([x, w], i) => {
      const y = 10 + i * 3;
      for (let k = 0; k < w; k++) if ((k * 7 + i) % 5 !== 0) t.set(x + 1 + k, y, "d");
    });
    // crayon en diagonale
    for (let k = 0; k < 11; k++) {
      const x = 28 - k;
      const y = 12 + k;
      t.set(x, y, k < 2 ? "p" : k < 3 ? "g" : "Y");
      t.set(x + 1, y, k < 2 ? "q" : k < 3 ? "d" : "y");
      t.set(x + 1, y + 1, k < 3 ? "D" : "o");
    }
    t.pts([[17, 23], [18, 23], [17, 24]], "N");
    t.set(16, 24, "n");
    t.set(16, 25, "k");
  },

  /** Tableau au cadre doré : montagnes, colline, soleil. */
  image: (t) => {
    t.rect(2, 5, 28, 23, "y");
    t.hline(2, 5, 28, "Y");
    t.vline(2, 5, 23, "Y");
    t.hline(3, 27, 27, "O");
    t.vline(29, 6, 22, "O");
    t.dither(3, 6, 26, 21, "o", 1);
    t.rect(4, 7, 24, 19, "y");
    t.bevel(4, 7, 24, 19, "O", "Y");
    // toile
    t.rect(5, 8, 22, 17, "C");
    t.rect(5, 8, 22, 4, "c");
    t.dither(5, 12, 22, 2, "c");
    t.disc(21, 12, 2, "Y");
    t.pts([[21, 9], [24, 12], [18, 12]], "Y");
    t.poly(
      [
        [5, 21],
        [11, 13],
        [17, 21],
      ],
      "d",
    );
    t.poly(
      [
        [9, 16],
        [11, 13],
        [13, 16],
      ],
      "W",
    );
    t.poly(
      [
        [11, 25],
        [19, 16],
        [26, 21],
        [26, 25],
      ],
      "v",
    );
    t.line(12, 23, 19, 16, "V");
    t.line(13, 23, 19, 17, "V");
    t.rect(5, 22, 22, 3, "G");
    t.dither(5, 22, 22, 1, "v");
  },

  /** Enveloppe vue de dos : rabat, cachet de cire rouge. */
  mail: (t) => {
    t.rect(2, 8, 28, 17, "u");
    t.hline(3, 24, 27, "e");
    t.vline(29, 9, 16, "e");
    t.line(2, 24, 13, 16, "e");
    t.line(29, 24, 18, 16, "e");
    t.poly(
      [
        [2, 8],
        [29, 8],
        [16, 19],
      ],
      "W",
    );
    t.line(2, 8, 16, 19, "f");
    t.line(29, 8, 16, 19, "f");
    t.line(3, 8, 16, 18, "e");
    t.disc(16, 19, 3, "r");
    t.pts([[15, 17], [14, 18], [16, 17]], "R");
    t.pts([[17, 21], [18, 20], [16, 22]], "m");
    t.pts([[15, 19], [16, 19], [17, 19], [16, 20]], "m");
  },

  /** Pork ID : carte plastifiée, bandeau d'État, portrait porcin, hologramme. */
  carte: (t) => {
    t.rect(1, 7, 30, 19, "E");
    t.hline(2, 25, 29, "e");
    t.vline(30, 8, 18, "e");
    t.rect(2, 8, 28, 4, "r");
    t.hline(2, 8, 28, "R");
    t.hline(2, 11, 28, "m");
    t.rect(4, 9, 3, 2, "y");
    t.set(4, 9, "Y");
    t.hline(9, 10, 12, "Y");
    // photo
    t.rect(4, 14, 9, 10, "C");
    t.bevel(4, 14, 9, 10, "e", "W");
    t.disc(8, 19, 3, "P");
    t.pts([[5, 16], [6, 16], [10, 16], [11, 16]], "p");
    t.rect(7, 19, 3, 2, "p");
    t.pts([[7, 20], [9, 20]], "q");
    t.pts([[6, 18], [10, 18]], "k");
    t.rect(5, 22, 7, 1, "b");
    // texte et code
    t.hline(15, 14, 12, "d");
    t.hline(15, 16, 8, "g");
    t.hline(15, 18, 11, "d");
    for (let x = 15; x < 24; x++) if (x % 3 !== 1) t.vline(x, 21, 3, "D");
    t.disc(27, 21, 2, "y");
    t.pts([[26, 20], [27, 20]], "Y");
    t.set(28, 22, "o");
    t.clear([[1, 7], [30, 7], [1, 25], [30, 25]]);
  },

  /** Cadenas d'État : anse chromée, corps doré, trou de serrure. */
  cadenas: (t) => {
    t.ellipse(16, 14, 8, 9, "g", true);
    t.ellipse(16, 14, 7, 8, "l", true);
    t.ellipse(16, 14, 6, 7, "d", true);
    t.rect(6, 15, 20, 14, "y");
    t.rect(7, 16, 18, 2, "Y");
    t.vline(7, 16, 12, "Y");
    t.vline(24, 16, 12, "o");
    t.hline(7, 27, 18, "o");
    t.dither(8, 25, 16, 2, "o");
    t.hline(8, 19, 16, "o");
    t.hline(8, 20, 16, "Y");
    t.set(9, 17, "W");
    // trou de serrure
    t.rect(15, 20, 3, 3, "k");
    t.pts([[16, 19]], "k");
    t.vline(16, 23, 2, "k");
    t.hline(15, 25, 3, "k");
    t.set(15, 20, "D");
  },

  /** Poubelle d'État : seau cannelé, couvercle, papier froissé, sceau rouge. */
  poubelle: (t) => {
    t.disc(20, 7, 2.4, "W");
    t.pts([[19, 6], [21, 8]], "g");
    t.poly(
      [
        [7, 11],
        [25, 11],
        [23, 29],
        [9, 29],
      ],
      "g",
    );
    t.poly(
      [
        [7, 11],
        [10, 11],
        [11, 29],
        [9, 29],
      ],
      "l",
    );
    t.poly(
      [
        [22, 11],
        [25, 11],
        [23, 29],
        [21, 29],
      ],
      "d",
    );
    for (const x of [12, 16, 20]) {
      t.vline(x, 13, 14, "d");
      t.vline(x + 1, 13, 14, "l");
    }
    t.rect(5, 8, 23, 3, "g");
    t.hline(5, 8, 23, "W");
    t.hline(6, 10, 22, "d");
    t.hline(13, 5, 7, "d");
    t.vline(13, 5, 3, "d");
    t.vline(19, 5, 3, "d");
    t.hline(9, 28, 15, "d");
    t.disc(16, 20, 3.2, "y");
    t.disc(16, 20, 2.2, "r");
    t.pts([[15, 18], [14, 19]], "R");
    t.pts([[16, 21], [17, 21]], "m");
    t.pts([[14, 17], [13, 18]], "Y");
  },

  /** Téléviseur en bois : écran allumé sur Canal 1, boutons, haut-parleur, antennes. */
  tele: (t) => {
    t.line(11, 2, 15, 8, "D");
    t.line(21, 2, 17, 8, "D");
    t.pts([[11, 2], [21, 2]], "r");
    t.rect(14, 7, 5, 2, "D");
    t.rect(3, 9, 26, 19, "n");
    t.hline(3, 9, 26, "N");
    t.vline(3, 9, 19, "N");
    t.hline(4, 27, 25, "z");
    t.vline(28, 10, 18, "z");
    for (const y of [12, 16, 20, 24]) t.dither(4, y, 24, 1, "z", y);
    t.rect(5, 11, 18, 14, "D");
    t.rect(6, 12, 16, 12, "b");
    for (let y = 12; y < 24; y += 2) t.hline(6, y, 16, "B");
    // tête de cochon en direct, bandeau « Canal 1 »
    t.disc(14, 17, 3.6, "P");
    t.pts([[10, 13], [11, 13], [11, 14], [17, 13], [18, 13], [17, 14]], "p");
    t.rect(13, 17, 3, 2, "p");
    t.pts([[13, 18], [15, 18]], "q");
    t.pts([[12, 16], [16, 16]], "k");
    t.pts([[11, 18], [17, 18]], "p");
    t.rect(6, 21, 16, 3, "r");
    t.hline(7, 22, 3, "W");
    t.hline(11, 22, 1, "Y");
    t.pts([[7, 13], [8, 13], [7, 14]], "C");
    t.rect(23, 11, 5, 14, "z");
    t.disc(25, 14, 1.5, "e");
    t.disc(25, 19, 1.5, "e");
    t.pts([[25, 13], [26, 19]], "k");
    for (const y of [22, 24]) t.hline(24, y, 3, "k");
    t.rect(6, 28, 2, 3, "z");
    t.rect(24, 28, 2, 3, "z");
  },

  /** Globe PigNet : sphère ombrée, continents, anneau d'or en orbite. */
  navigateur: (t) => {
    t.ellipse(16, 17, 15, 4.5, "o", true);
    const cx = 15;
    const cy = 15;
    const R = 11.3;
    // continents dessinés à la main sur la face visible (15 lignes, centrées sur le globe)
    const carte = [
      "...............",
      "..##...........",
      ".#####....##...",
      ".######..###...",
      "..#####...#....",
      "...###.........",
      "....##...####..",
      "....#...######.",
      ".........#####.",
      "...##.....####.",
      "..###......##..",
      "...#.......#...",
      "...............",
    ];
    const terre = (x: number, y: number) => {
      const row = carte[Math.floor((y - 4) / 1.75)];
      const ch = row?.[Math.floor((x - 4) / 1.55)];
      return ch === "#";
    };
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > R * R) continue;
        const lumiere = Math.hypot(x - 10, y - 10);
        const ombre = Math.hypot(x - 22, y - 22);
        const sol = terre(x, y);
        let c = sol ? "v" : "B";
        if (lumiere < 4.5) c = sol ? "V" : "C";
        else if (lumiere < 8) c = sol ? "v" : "c";
        else if (lumiere < 9 && (x + y) % 2 === 0) c = sol ? "v" : "c";
        if (ombre < 7) c = sol ? "G" : "b";
        else if (ombre < 8.5 && (x + y) % 2 === 0) c = sol ? "G" : "b";
        t.set(x, y, c);
      }
    t.pts([[8, 7], [9, 7], [7, 8]], "W");
    // avant de l'anneau (passe devant le globe)
    for (let x = 1; x <= 31; x++) {
      const dx = (x - 16) / 15.4;
      if (Math.abs(dx) > 1) continue;
      const y = Math.round(17 + 4.5 * Math.sqrt(1 - dx * dx));
      t.set(x, y, x > 21 ? "o" : "y");
      t.set(x, y - 1, x < 13 ? "Y" : "y");
    }
  },

  /** Nappe Vide : table à nappe vichy, cochon rôti sur son plat, chope de bière. */
  nappe: (t) => {
    // plateau en perspective
    t.poly(
      [
        [5, 14],
        [27, 14],
        [30, 20],
        [2, 20],
      ],
      "W",
    );
    for (let y = 14; y < 26; y++) for (let x = 1; x < 31; x++) if (((x >> 1) + (y >> 1)) % 2 === 0 && (y >= 20 || (x >= 5 - (y - 14) / 2 && x <= 27 + (y - 14) / 2))) t.set(x, y, "r");
    t.rect(2, 20, 29, 5, "W");
    for (let y = 20; y < 25; y++) for (let x = 2; x < 31; x++) if (((x >> 1) + (y >> 1)) % 2 === 0) t.set(x, y, "r");
    for (let x = 2; x < 31; x += 3) t.set(x, 25, "r");
    t.hline(2, 20, 29, "m");
    t.dither(2, 24, 29, 1, "m");
    t.rect(4, 25, 2, 6, "n");
    t.rect(26, 25, 2, 6, "n");
    t.vline(5, 25, 6, "z");
    t.vline(27, 25, 6, "z");
    // plat et rôti
    t.ellipse(13, 15, 8, 2.6, "W");
    t.ellipse(13, 15, 8, 2.6, "g", true);
    // cochon de lait rôti : groin et pomme à droite, queue en tire-bouchon à gauche
    t.ellipse(12, 12.5, 5, 2.8, "n");
    t.ellipse(11, 11.5, 3.2, 1.4, "N");
    t.rect(16, 11, 3, 3, "n");
    t.pts([[17, 10], [16, 10]], "z");
    t.rect(19, 12, 2, 2, "p");
    t.set(20, 12, "q");
    t.set(18, 12, "k");
    t.pts([[6, 11], [5, 10], [6, 9]], "z");
    t.set(9, 11, "W");
    // chope
    t.rect(22, 6, 5, 8, "y");
    t.vline(22, 6, 8, "Y");
    t.vline(26, 7, 7, "o");
    t.rect(21, 4, 7, 3, "W");
    t.pts([[21, 4], [27, 4]], "u");
    t.vline(28, 8, 4, "g");
    t.pts([[27, 8], [27, 11]], "g");
  },

  /** Réglages d'État : console beige à curseurs, cadran et voyants. */
  config: (t) => {
    t.rect(2, 5, 28, 23, "E");
    t.bevel(2, 5, 28, 23, "W", "f");
    t.bevel(3, 6, 26, 21, "E", "e");
    t.rect(4, 7, 16, 19, "e");
    t.bevel(4, 7, 16, 19, "f", "W");
    for (const x of [7, 12, 17]) {
      t.vline(x, 9, 15, "D");
      t.vline(x + 1, 9, 15, "W");
    }
    const curseurs: [number, number, string, string][] = [
      [5, 12, "r", "R"],
      [10, 19, "B", "c"],
      [15, 10, "y", "Y"],
    ];
    for (const [x, y, c, hi] of curseurs) {
      t.rect(x, y, 5, 3, c);
      t.hline(x, y, 5, hi);
      t.set(x + 2, y + 1, "k");
    }
    t.disc(25, 11, 3, "e");
    t.ellipse(25, 11, 3, 3, "f", true);
    t.pts([[24, 9], [23, 10]], "W");
    t.line(25, 11, 27, 9, "k");
    t.pts([[23, 18], [25, 18], [27, 18]], "v");
    t.set(25, 18, "V");
    t.set(27, 18, "r");
    t.rect(22, 21, 7, 4, "D");
    t.hline(23, 22, 5, "v");
    t.hline(23, 23, 3, "v");
  },

  /** Poste du citoyen : moniteur beige sur unité centrale, bureau PorkOS à l'écran. */
  ordinateur: (t) => {
    t.rect(6, 2, 21, 17, "E");
    t.bevel(6, 2, 21, 17, "W", "f");
    t.hline(7, 17, 19, "e");
    t.rect(8, 4, 17, 12, "D");
    t.rect(9, 5, 15, 10, "t");
    t.dither(9, 5, 15, 10, "T", 1);
    t.rect(9, 5, 15, 10, "t");
    t.pts([[10, 6], [10, 8], [10, 10]], "y");
    t.rect(13, 7, 7, 5, "E");
    t.hline(13, 7, 7, "m");
    t.hline(9, 14, 15, "g");
    t.set(9, 14, "r");
    t.set(10, 14, "r");
    t.pts([[9, 5], [10, 5]], "C");
    t.set(24, 17, "v");
    t.rect(13, 19, 7, 2, "e");
    t.rect(2, 21, 29, 8, "E");
    t.bevel(2, 21, 29, 8, "W", "f");
    t.hline(3, 27, 27, "e");
    t.rect(5, 23, 11, 3, "e");
    t.hline(6, 24, 9, "D");
    t.set(14, 23, "v");
    for (const x of [19, 21, 23]) t.vline(x, 23, 3, "f");
    t.disc(27, 24, 1.3, "e");
    t.set(27, 24, "d");
  },

  /** Exécuter : fenêtre à invite de commande dorée et flèche de lancement. */
  executer: (t) => {
    t.rect(2, 4, 27, 22, "g");
    t.bevel(2, 4, 27, 22, "W", "d");
    t.rect(4, 6, 23, 3, "m");
    t.rect(17, 6, 10, 3, "r");
    t.dither(13, 6, 4, 3, "r");
    t.rect(23, 6, 3, 3, "g");
    t.set(23, 6, "W");
    t.rect(4, 10, 23, 14, "k");
    t.bevel(4, 10, 23, 14, "d", "W");
    t.hline(6, 12, 2, "y");
    t.set(8, 13, "y");
    t.hline(6, 14, 2, "y");
    t.rect(10, 13, 3, 2, "W");
    t.hline(6, 17, 9, "o");
    t.hline(6, 19, 6, "o");
    // flèche de lancement, vers la droite
    t.poly(
      [
        [17, 20],
        [23, 20],
        [23, 16],
        [30, 22],
        [23, 28],
        [23, 24],
        [17, 24],
      ],
      "v",
    );
    t.hline(18, 21, 6, "V");
    t.line(24, 17, 28, 21, "V");
    t.hline(18, 24, 5, "G");
  },
  /** Mes décorations : médaille d'or frappée d'un groin, sur son ruban lie-de-vin à liseré d'or. */
  medaille: (t) => {
    t.rect(10, 1, 12, 11, "r");
    t.vline(10, 1, 11, "R");
    t.vline(21, 1, 11, "m");
    t.dither(18, 2, 3, 9, "m", 1);
    t.vline(15, 1, 11, "y");
    t.vline(16, 1, 11, "Y");
    t.rect(9, 11, 14, 2, "o");
    t.hline(9, 11, 14, "y");
    t.disc(16, 21, 9, "O");
    t.disc(16, 21, 8, "o");
    t.disc(16, 21, 7, "y");
    t.dither(18, 22, 6, 6, "o", 1);
    t.pts([[11, 18], [12, 17], [13, 16], [11, 19], [12, 16], [14, 15]], "Y");
    // groin en relief
    t.ellipse(16, 21, 4, 3, "o", true);
    t.pts([[15, 21], [17, 21], [15, 22], [17, 22]], "O");
    t.pts([[13, 19], [14, 18]], "Y");
  },
  /** PorkAmp : disque noir à étiquette lie-de-vin, sillons, et une croche dorée. */
  musique: (t) => {
    t.disc(15, 15, 13, "D");
    t.ellipse(15, 15, 10, 10, "k", true);
    t.ellipse(15, 15, 7, 7, "k", true);
    t.pts([[7, 8], [8, 7], [9, 6], [6, 10], [6, 9], [10, 5]], "d");
    t.pts([[21, 23], [22, 22], [23, 21], [20, 24]], "d");
    t.disc(15, 15, 4, "r");
    t.pts([[13, 13], [14, 12]], "R");
    t.set(15, 15, "k");
    // croche
    t.vline(27, 14, 12, "O");
    t.vline(26, 14, 12, "y");
    t.line(27, 14, 30, 18, "y");
    t.line(27, 15, 30, 19, "o");
    t.disc(24, 26, 3, "y");
    t.pts([[23, 25], [22, 26]], "Y");
    t.pts([[25, 28], [26, 27]], "o");
  },
};

/* ================================ 16 × 16 ================================ */

export const DESSINS16: Record<Nom, Dessin> = {
  bureau: (t) => {
    t.poly(
      [
        [2, 5],
        [13, 5],
        [15, 13],
        [0, 13],
      ],
      "n",
    );
    t.poly(
      [
        [3, 6],
        [12, 6],
        [13, 12],
        [2, 12],
      ],
      "t",
    );
    t.rect(4, 7, 4, 4, "W");
    t.line(12, 6, 8, 10, "y");
  },
  dossier: (t) => {
    t.rect(1, 3, 6, 2, "o");
    t.rect(1, 4, 13, 9, "o");
    t.rect(3, 5, 9, 2, "W");
    t.rect(1, 7, 14, 6, "y");
    t.hline(1, 7, 14, "Y");
    t.vline(1, 7, 6, "Y");
    t.hline(2, 12, 13, "o");
  },
  texte: (t) => {
    t.rect(2, 2, 12, 13, "W");
    t.rect(2, 2, 12, 2, "c");
    t.pts([[3, 1], [5, 1], [7, 1], [9, 1], [11, 1]], "d");
    for (const y of [6, 8, 10, 12]) t.hline(3, y, 10, "C");
    t.vline(4, 5, 9, "R");
    t.vline(13, 3, 12, "l");
    t.pts([[6, 7], [7, 7], [9, 7], [6, 9], [8, 9], [9, 9], [10, 9]], "d");
  },
  image: (t) => {
    t.rect(1, 2, 14, 12, "y");
    t.bevel(1, 2, 14, 12, "Y", "O");
    t.rect(3, 4, 10, 8, "C");
    t.rect(3, 4, 10, 2, "c");
    t.set(10, 6, "Y");
    t.poly(
      [
        [3, 11],
        [6, 7],
        [9, 11],
      ],
      "d",
    );
    t.poly(
      [
        [6, 11],
        [10, 8],
        [12, 10],
        [12, 11],
      ],
      "v",
    );
  },
  mail: (t) => {
    t.rect(1, 4, 14, 9, "u");
    t.poly(
      [
        [1, 4],
        [14, 4],
        [8, 9],
      ],
      "W",
    );
    t.line(1, 4, 8, 9, "f");
    t.line(14, 4, 8, 9, "f");
    t.hline(2, 12, 13, "e");
    t.rect(7, 9, 3, 2, "r");
  },
  carte: (t) => {
    t.rect(1, 3, 14, 10, "E");
    t.rect(1, 3, 14, 2, "r");
    t.rect(2, 6, 4, 5, "C");
    t.rect(3, 7, 2, 2, "P");
    t.hline(7, 7, 6, "d");
    t.hline(7, 9, 5, "d");
    t.set(12, 11, "y");
    t.hline(2, 12, 13, "e");
  },
  cadenas: (t) => {
    t.ellipse(8, 7, 4, 4.5, "g", true);
    t.rect(3, 7, 10, 8, "y");
    t.vline(3, 7, 8, "Y");
    t.hline(3, 7, 10, "Y");
    t.vline(12, 8, 7, "o");
    t.hline(4, 14, 9, "o");
    t.rect(7, 9, 2, 3, "k");
  },
  poubelle: (t) => {
    t.poly(
      [
        [3, 5],
        [12, 5],
        [11, 14],
        [4, 14],
      ],
      "g",
    );
    t.vline(4, 6, 8, "l");
    t.vline(11, 6, 8, "d");
    t.vline(6, 7, 6, "d");
    t.vline(9, 7, 6, "d");
    t.rect(2, 3, 12, 2, "g");
    t.hline(2, 3, 12, "W");
    t.hline(6, 2, 4, "d");
    t.rect(7, 8, 2, 3, "r");
    t.set(7, 8, "R");
  },
  tele: (t) => {
    t.line(5, 1, 7, 4, "D");
    t.line(11, 1, 9, 4, "D");
    t.rect(1, 4, 14, 10, "n");
    t.hline(1, 4, 14, "N");
    t.vline(1, 4, 10, "N");
    t.rect(2, 5, 9, 7, "b");
    t.rect(4, 6, 4, 4, "P");
    t.pts([[4, 6], [7, 6]], "p");
    t.rect(5, 8, 2, 1, "p");
    t.hline(2, 11, 9, "r");
    t.set(3, 5, "C");
    t.pts([[12, 6], [12, 9]], "e");
    t.hline(2, 13, 13, "z");
    t.pts([[2, 14], [12, 14]], "z");
  },
  navigateur: (t) => {
    t.disc(7.5, 7.5, 6, "B");
    t.disc(6, 6, 3.5, "c");
    t.dither(9, 9, 5, 5, "b");
    t.pts([[4, 4], [5, 4], [4, 5]], "C");
    t.poly(
      [
        [4, 5],
        [7, 3],
        [8, 6],
        [6, 8],
        [4, 8],
      ],
      "v",
    );
    t.poly(
      [
        [9, 7],
        [12, 6],
        [12, 10],
        [10, 12],
      ],
      "v",
    );
    for (let x = 0; x <= 15; x++) {
      const dx = (x - 8) / 7.6;
      if (Math.abs(dx) > 1) continue;
      t.set(x, Math.round(9 + 2.4 * Math.sqrt(1 - dx * dx)), x < 6 ? "Y" : "y");
    }
  },
  nappe: (t) => {
    t.rect(1, 8, 14, 5, "W");
    for (let y = 8; y < 13; y++) for (let x = 1; x < 15; x++) if ((x + y) % 2 === 0) t.set(x, y, "r");
    t.hline(1, 8, 14, "m");
    t.rect(2, 13, 1, 3, "n");
    t.rect(13, 13, 1, 3, "n");
    t.ellipse(6, 6.5, 4, 1.5, "W");
    t.ellipse(6, 5.5, 2.5, 1.5, "n");
    t.set(5, 5, "N");
    t.rect(11, 3, 3, 5, "y");
    t.hline(11, 2, 3, "W");
    t.vline(14, 4, 2, "g");
  },
  config: (t) => {
    t.rect(1, 2, 14, 12, "E");
    t.bevel(1, 2, 14, 12, "W", "f");
    for (const x of [4, 7, 10]) t.vline(x, 4, 8, "D");
    t.rect(3, 5, 3, 2, "r");
    t.rect(6, 9, 3, 2, "B");
    t.rect(9, 6, 3, 2, "y");
    t.set(13, 5, "v");
    t.set(13, 7, "r");
  },
  ordinateur: (t) => {
    t.rect(3, 1, 11, 9, "E");
    t.bevel(3, 1, 11, 9, "W", "f");
    t.rect(4, 2, 9, 6, "t");
    t.rect(6, 3, 4, 3, "E");
    t.hline(4, 7, 9, "g");
    t.rect(6, 10, 5, 1, "e");
    t.rect(1, 11, 15, 4, "E");
    t.bevel(1, 11, 15, 4, "W", "f");
    t.hline(3, 12, 5, "D");
    t.set(13, 12, "v");
  },
  executer: (t) => {
    t.rect(1, 2, 13, 11, "g");
    t.bevel(1, 2, 13, 11, "W", "d");
    t.rect(2, 3, 11, 2, "m");
    t.rect(2, 6, 11, 6, "k");
    t.hline(3, 7, 2, "y");
    t.set(5, 8, "W");
    t.poly(
      [
        [8, 11],
        [11, 11],
        [11, 9],
        [15, 12],
        [11, 15],
        [11, 13],
        [8, 13],
      ],
      "v",
    );
  },
  medaille: (t) => {
    t.rect(5, 0, 6, 6, "r");
    t.vline(5, 0, 6, "R");
    t.vline(10, 0, 6, "m");
    t.vline(7, 0, 6, "y");
    t.vline(8, 0, 6, "Y");
    t.hline(4, 5, 8, "o");
    t.disc(8, 11, 4.5, "o");
    t.disc(8, 11, 3.5, "y");
    t.pts([[5, 9], [6, 8], [5, 10]], "Y");
    t.pts([[7, 11], [9, 11]], "O");
  },
  musique: (t) => {
    t.disc(7, 7, 6.5, "D");
    t.ellipse(7, 7, 4.5, 4.5, "k", true);
    t.disc(7, 7, 2, "r");
    t.set(7, 7, "k");
    t.pts([[3, 4], [4, 3]], "d");
    t.vline(13, 7, 6, "y");
    t.line(13, 7, 15, 9, "y");
    t.disc(11.5, 13, 1.5, "y");
  },
};
