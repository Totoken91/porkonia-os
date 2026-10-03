/**
 * L'assistant de PorkOS dessiné en pixel art (48×48) : un moniteur beige sur pattes, gants et chaussures,
 * tête de cochon en phosphore vert sur l'écran, prise au bout du fil. Poses de bras et expressions animables.
 */
import { Toile, type Grid } from "./pixel";

export type Bras = "salut1" | "salut2" | "repos";
export type Visage = "content" | "ouvert" | "surpris";
export interface Pose {
  bras: Bras;
  visage: Visage;
  parle: boolean;
}

export const TAILLE_GRUIK = 48;

function dessiner(t: Toile, { bras, visage, parle }: Pose) {
  // Arrière du tube cathodique, grille d'aération.
  t.poly(
    [
      [34, 10],
      [42, 13],
      [42, 31],
      [34, 33],
    ],
    "e",
  );
  t.dither(35, 12, 7, 20, "f", 1);
  for (let x = 37; x <= 41; x += 2) t.vline(x, 17, 9, "f");
  // Façade.
  t.rect(9, 4, 27, 29, "E");
  t.bevel(9, 4, 27, 29, "W", "f");
  t.dither(10, 26, 25, 6, "e");
  t.clear([
    [9, 4],
    [35, 4],
    [9, 32],
    [35, 32],
  ]);
  // Écran.
  t.rect(12, 7, 21, 19, "s");
  t.hline(12, 7, 21, "k");
  t.vline(12, 7, 19, "k");
  for (let y = 9; y < 26; y += 3) t.dither(13, y, 20, 1, "S", y);
  t.pts(
    [
      [31, 8],
      [30, 8],
      [31, 9],
    ],
    "S",
  );
  // Tête de cochon.
  t.ellipse(22.5, 17.5, 6.6, 5.6, "a", true);
  t.poly(
    [
      [16, 13],
      [16, 8],
      [20, 12],
    ],
    "a",
  );
  t.poly(
    [
      [29, 13],
      [29, 8],
      [25, 12],
    ],
    "a",
  );
  t.pts(
    [
      [17, 11],
      [28, 11],
    ],
    "s",
  );
  if (visage === "content") {
    t.pts(
      [
        [18, 16],
        [19, 15],
        [20, 16],
        [25, 16],
        [26, 15],
        [27, 16],
      ],
      "a",
    );
  } else if (visage === "ouvert") {
    t.rect(19, 15, 2, 2, "a");
    t.rect(25, 15, 2, 2, "a");
    t.pts(
      [
        [19, 15],
        [25, 15],
      ],
      "A",
    );
  } else {
    t.ellipse(19.5, 15.5, 1.5, 1.5, "a", true);
    t.ellipse(25.5, 15.5, 1.5, 1.5, "a", true);
  }
  t.ellipse(22.5, 19.8, 2.9, parle ? 2.2 : 1.5, "a", true);
  t.pts(
    [
      [21, 20],
      [24, 20],
    ],
    "A",
  );
  // Boutons de façade.
  t.disc(24, 29, 0.8, "f");
  t.disc(27, 29, 0.8, "f");
  t.ellipse(31, 29, 1.6, 1.6, "f", true);
  // Menton, jambes, chaussures.
  t.rect(13, 33, 19, 2, "e");
  for (const x of [15, 27]) {
    t.rect(x, 35, 2, 6, "d");
    t.vline(x, 35, 6, "g");
  }
  t.ellipse(15, 43, 4, 2.4, "E");
  t.hline(12, 45, 7, "f");
  t.ellipse(28.5, 43, 4, 2.4, "E");
  t.hline(25, 45, 8, "f");
  // Bras gauche : il salue, ou se repose.
  if (bras === "repos") {
    t.line(9, 23, 7, 30, "d");
    t.line(10, 23, 8, 30, "g");
    t.disc(6.5, 32, 2.6, "E");
    t.pts([[5, 33]], "e");
  } else {
    const b = bras === "salut2" ? -1.5 : 0;
    t.line(9, 22, Math.round(6 + b), 17, "d");
    t.line(10, 22, Math.round(7 + b), 17, "g");
    t.disc(5.5 + b, 15, 1.8, "e");
    t.ellipse(5 + b, 11, 3.2, 3, "E");
    for (const [x, y] of [
      [2, 6],
      [4, 5],
      [6, 6],
    ] as const)
      t.rect(Math.round(x + b), y, 1, 4, "E");
    t.rect(Math.round(8 + b), 10, 2, 1, "E");
    t.pts([[Math.round(4 + b), 12]], "e");
  }
  // Bras droit, poing, fil et prise.
  t.line(35, 24, 37, 30, "d");
  t.line(36, 24, 38, 30, "g");
  t.disc(38.5, 32, 2.6, "E");
  t.pts([[39, 33]], "e");
  t.line(38, 35, 37, 38, "D");
  t.line(37, 38, 40, 40, "D");
  t.line(40, 40, 43, 39, "D");
  t.rect(43, 37, 3, 4, "e");
  t.pts(
    [
      [46, 38],
      [46, 40],
    ],
    "g",
  );
}

const cache = new Map<string, Grid>();

export function gruikGrid(p: Pose): Grid {
  const k = `${p.bras}:${p.visage}:${p.parle}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const t = new Toile(TAILLE_GRUIK);
  dessiner(t, p);
  const g = t.outline();
  cache.set(k, g);
  return g;
}
