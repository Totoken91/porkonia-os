/**
 * Icônes pixel d'époque : dessinées en 32×32 sur une grille, contour noir automatique,
 * palette VGA réchauffée aux couleurs de la République. Une version 16×16 est dérivée pour
 * la barre des tâches et les menus. Logique pure (testée), sans DOM.
 */
import type { IconKey } from "@/content/types";

export const PALETTE: Record<string, string> = {
  k: "#000000",
  W: "#ffffff",
  g: "#c0c0c0",
  d: "#808080",
  r: "#d01018",
  m: "#800000",
  y: "#e0a526",
  Y: "#ffe066",
  o: "#b8860b",
  n: "#8b5a2b",
  N: "#c08850",
  C: "#58b8e8",
  B: "#2a6fdb",
  b: "#2f4f8f",
  v: "#3a9a3a",
  V: "#7cc46a",
  P: "#f4b3b0",
  p: "#d86a7a",
  E: "#f3ead3",
};

export type Grid = (string | null)[];

class Toile {
  px: Grid;
  constructor(readonly n = 32) {
    this.px = Array(n * n).fill(null);
  }
  set(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  hline(x: number, y: number, w: number, c: string) {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: string) {
    this.rect(x, y, 1, h, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, ring = false) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / (rx + 0.4)) ** 2 + ((y - cy) / (ry + 0.4)) ** 2;
        const inner = ((x - cx) / (rx - 0.6)) ** 2 + ((y - cy) / (ry - 0.6)) ** 2;
        if (d <= 1 && (!ring || inner > 1)) this.set(x, y, c);
      }
  }
  disc(cx: number, cy: number, r: number, c: string) {
    this.ellipse(cx, cy, r, r, c);
  }
  poly(pts: [number, number][], c: string) {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[(i + 1) % pts.length]!;
        if (y0 === y1) continue;
        if (y >= Math.min(y0, y1) && y < Math.max(y0, y1)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]!); x <= Math.round(xs[i + 1]!); x++) this.set(x, y, c);
    }
  }
  /** Contour noir d'un pixel autour de tout ce qui est dessiné (le trait des icônes d'époque). */
  outline(): Grid {
    const n = this.n;
    const out = [...this.px];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (this.px[y * n + x]) continue;
        const near = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([i, j]) => i! >= 0 && j! >= 0 && i! < n && j! < n && this.px[j! * n + i!] && this.px[j! * n + i!] !== "k");
        if (near) out[y * n + x] = "k";
      }
    return out;
  }
}

type Dessin = (t: Toile) => void;

const DESSINS: Record<Exclude<IconKey, "embleme">, Dessin> = {
  dossier: (t) => {
    t.rect(3, 6, 11, 4, "o");
    t.rect(3, 9, 26, 18, "o");
    t.rect(6, 9, 20, 4, "W");
    t.hline(8, 10, 14, "d");
    t.rect(2, 13, 28, 15, "Y");
    t.hline(3, 13, 26, "W");
    t.vline(2, 13, 15, "W");
    t.hline(3, 27, 27, "o");
    t.vline(29, 14, 13, "o");
  },
  texte: (t) => {
    t.rect(7, 4, 18, 25, "W");
    t.vline(24, 5, 24, "g");
    t.hline(8, 28, 17, "g");
    t.rect(7, 4, 18, 4, "r");
    for (const x of [9, 12, 15, 18, 21]) {
      t.set(x, 3, "d");
      t.set(x, 5, "k");
    }
    for (const y of [11, 14, 17, 20, 23]) t.hline(9, y, 13, "C");
    t.hline(9, 26, 8, "C");
  },
  image: (t) => {
    t.rect(3, 5, 26, 22, "n");
    t.hline(3, 5, 26, "N");
    t.vline(3, 5, 22, "N");
    t.rect(6, 8, 20, 16, "C");
    t.disc(21, 12, 2, "Y");
    t.poly(
      [
        [6, 23],
        [12, 14],
        [16, 19],
        [19, 16],
        [25, 23],
      ],
      "v",
    );
    t.set(12, 14, "W");
    t.hline(11, 15, 3, "W");
    t.hline(19, 17, 1, "V");
    t.hline(6, 23, 20, "V");
  },
  mail: (t) => {
    t.rect(3, 8, 26, 17, "W");
    t.hline(3, 24, 26, "g");
    t.line(3, 24, 12, 17, "g");
    t.line(28, 24, 19, 17, "g");
    t.line(3, 8, 16, 18, "d");
    t.line(28, 8, 16, 18, "d");
    t.disc(16, 18, 2, "r");
    t.rect(22, 10, 5, 5, "r");
    t.rect(23, 11, 3, 3, "Y");
  },
  carte: (t) => {
    t.rect(2, 7, 28, 19, "E");
    t.rect(2, 7, 28, 3, "m");
    t.hline(4, 8, 10, "y");
    t.rect(5, 13, 8, 10, "g");
    t.disc(9, 17, 3, "P");
    t.rect(8, 18, 3, 2, "p");
    t.set(7, 16, "k");
    t.set(11, 16, "k");
    t.hline(15, 14, 12, "d");
    t.hline(15, 17, 10, "d");
    t.hline(15, 20, 12, "d");
    t.disc(25, 22, 2, "y");
    t.set(25, 22, "o");
  },
  cadenas: (t) => {
    t.ellipse(16, 13, 7, 8, "g", true);
    t.ellipse(16, 13, 6, 7, "d", true);
    t.rect(7, 15, 18, 14, "y");
    t.vline(8, 16, 12, "Y");
    t.hline(8, 16, 16, "Y");
    t.vline(24, 16, 13, "o");
    t.hline(8, 28, 17, "o");
    t.disc(16, 20, 2, "k");
    t.vline(16, 21, 4, "k");
  },
  poubelle: (t) => {
    t.poly(
      [
        [8, 10],
        [24, 10],
        [22, 29],
        [10, 29],
      ],
      "g",
    );
    for (const x of [12, 16, 20]) t.vline(x, 12, 15, "d");
    t.vline(9, 11, 16, "W");
    t.rect(6, 7, 21, 3, "g");
    t.hline(6, 7, 21, "W");
    t.hline(6, 9, 21, "d");
    t.rect(13, 4, 7, 2, "d");
    t.disc(16, 19, 3, "r");
    t.hline(14, 19, 5, "W");
    t.vline(16, 17, 5, "W");
  },
  tele: (t) => {
    t.line(10, 2, 15, 8, "k");
    t.line(23, 2, 17, 8, "k");
    t.set(10, 2, "r");
    t.set(23, 2, "r");
    t.rect(3, 9, 26, 19, "n");
    t.hline(3, 9, 26, "N");
    t.vline(3, 9, 19, "N");
    t.rect(5, 11, 17, 14, "b");
    t.rect(6, 12, 15, 12, "r");
    t.hline(8, 14, 6, "W");
    t.hline(8, 16, 9, "Y");
    t.set(7, 13, "W");
    t.set(8, 13, "W");
    t.rect(24, 12, 3, 3, "y");
    t.rect(24, 17, 3, 3, "y");
    for (const y of [22, 24]) t.hline(23, y, 5, "k");
    t.rect(6, 28, 3, 2, "k");
    t.rect(23, 28, 3, 2, "k");
  },
  navigateur: (t) => {
    t.disc(15, 15, 11, "B");
    t.disc(11, 11, 4, "v");
    t.disc(20, 19, 4, "v");
    t.disc(9, 20, 2, "v");
    t.disc(21, 9, 2, "v");
    t.set(12, 9, "V");
    t.set(19, 17, "V");
    t.hline(9, 7, 3, "C");
    t.hline(7, 9, 2, "C");
    t.ellipse(16, 17, 15, 4, "y", true);
    t.poly(
      [
        [21, 18],
        [21, 29],
        [23, 27],
        [25, 31],
        [27, 30],
        [25, 26],
        [28, 26],
      ],
      "W",
    );
  },
  nappe: (t) => {
    t.rect(2, 14, 28, 8, "W");
    for (let y = 14; y < 22; y++) for (let x = 2; x < 30; x++) if (((x >> 1) + (y >> 1)) % 2) t.set(x, y, "r");
    for (let x = 2; x < 30; x += 4) t.rect(x, 22, 2, 1, "r");
    t.rect(5, 23, 2, 7, "n");
    t.rect(25, 23, 2, 7, "n");
    t.ellipse(16, 11, 10, 3, "W");
    t.ellipse(16, 11, 10, 3, "g", true);
    t.ellipse(16, 9, 5, 3, "n");
    t.hline(13, 7, 4, "N");
    t.set(20, 8, "W");
  },
  ordinateur: (t) => {
    t.rect(6, 2, 21, 17, "E");
    t.hline(6, 2, 21, "W");
    t.vline(6, 2, 17, "W");
    t.vline(26, 3, 16, "d");
    t.rect(8, 4, 16, 11, "b");
    t.rect(9, 5, 14, 9, "C");
    t.rect(9, 5, 14, 2, "m");
    t.hline(10, 9, 8, "W");
    t.hline(10, 11, 5, "W");
    t.set(22, 17, "v");
    t.rect(13, 19, 7, 2, "g");
    t.rect(3, 21, 27, 8, "E");
    t.hline(3, 21, 27, "W");
    t.hline(4, 28, 26, "d");
    t.rect(6, 24, 9, 2, "d");
    t.rect(19, 24, 7, 1, "k");
    t.set(27, 24, "v");
  },
  executer: (t) => {
    t.rect(3, 5, 26, 21, "g");
    t.hline(3, 5, 26, "W");
    t.vline(3, 5, 21, "W");
    t.rect(4, 6, 24, 3, "m");
    t.rect(24, 6, 3, 3, "g");
    t.rect(5, 11, 22, 13, "k");
    t.hline(7, 13, 3, "y");
    t.set(10, 14, "y");
    t.hline(7, 15, 3, "y");
    t.rect(12, 17, 4, 2, "W");
    t.hline(7, 21, 8, "y");
  },
  config: (t) => {
    t.rect(3, 4, 26, 24, "g");
    t.hline(3, 4, 26, "W");
    t.vline(3, 4, 24, "W");
    t.hline(4, 27, 25, "d");
    t.vline(28, 5, 23, "d");
    for (const x of [9, 16, 23]) t.vline(x, 8, 17, "k");
    t.rect(7, 11, 5, 3, "r");
    t.rect(14, 19, 5, 3, "B");
    t.rect(21, 9, 5, 3, "y");
  },
};

const cache = new Map<string, Grid>();

/** Grille 32×32, ou 16×16 redessinée (couleurs réduites puis contour refait à la petite taille). */
export function iconGrid(name: Exclude<IconKey, "embleme">, n: 32 | 16 = 32): Grid {
  const key = `${name}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = new Toile(32);
  DESSINS[name](t);
  let g: Grid;
  if (n === 32) g = t.outline();
  else {
    const petit = new Toile(16);
    petit.px = reduire(t.px);
    g = petit.outline();
  }
  cache.set(key, g);
  return g;
}

/** 32 → 16 : un bloc 2×2 garde la couleur dominante s'il contient au moins deux pixels peints. */
function reduire(g: Grid): Grid {
  const out: Grid = [];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const bloc = [g[2 * y * 32 + 2 * x], g[2 * y * 32 + 2 * x + 1], g[(2 * y + 1) * 32 + 2 * x], g[(2 * y + 1) * 32 + 2 * x + 1]].filter(Boolean) as string[];
      if (bloc.length < 2) {
        out.push(null);
        continue;
      }
      const count = new Map<string, number>();
      for (const c of bloc) count.set(c, (count.get(c) ?? 0) + (c === "k" ? 0.9 : 1));
      out.push([...count].sort((a, b) => b[1] - a[1])[0]![0]);
    }
  return out;
}

/* ------------------------------- Curseurs ------------------------------- */

const CURSEURS: Record<"fleche" | "sablier" | "main", { rows: string[]; hot: [number, number] }> = {
  fleche: {
    hot: [0, 0],
    rows: [
      "X...........",
      "XX..........",
      "XWX.........",
      "XWWX........",
      "XWWWX.......",
      "XWWWWX......",
      "XWWWWWX.....",
      "XWWWWWWX....",
      "XWWWWWWWX...",
      "XWWWWWWWWX..",
      "XWWWWWWWWWX.",
      "XWWWWWWXXXXX",
      "XWWWXWWX....",
      "XWWX.XWWX...",
      "XWX..XWWX...",
      "XX....XWWX..",
      "X.....XWWX..",
      ".......XWWX.",
      ".......XWWX.",
      "........XX..",
    ],
  },
  sablier: {
    hot: [6, 8],
    rows: [
      "XXXXXXXXXXXXX",
      "XWWWWWWWWWWWX",
      "XXXXXXXXXXXXX",
      ".XWWWWWWWWWX.",
      ".XWYYYYYYYWX.",
      ".XWWYYYYYWWX.",
      "..XWWYYYWWX..",
      "...XWWYWWX...",
      "....XWYWX....",
      "...XWWYWWX...",
      "..XWWWYWWWX..",
      ".XWWWWYWWWWX.",
      ".XWWWYYYWWWX.",
      ".XWYYYYYYYWX.",
      "XXXXXXXXXXXXX",
      "XWWWWWWWWWWWX",
      "XXXXXXXXXXXXX",
    ],
  },
  main: {
    hot: [5, 0],
    rows: [
      ".....XX.........",
      "....XWWX........",
      "....XWWX........",
      "....XWWX........",
      "....XWWXXX......",
      "....XWWXWWXXX...",
      "....XWWXWWXWWXX.",
      ".XX.XWWXWWXWWXWX",
      "XWWXXWWWWWWWWXWX",
      "XWWWXWWWWWWWWWWX",
      ".XWWWWWWWWWWWWWX",
      "..XWWWWWWWWWWWWX",
      "..XWWWWWWWWWWWX.",
      "...XWWWWWWWWWWX.",
      "...XWWWWWWWWWX..",
      "....XWWWWWWWWX..",
      "....XXXXXXXXXX..",
    ],
  },
};

/** Valeur CSS `cursor` d'un curseur pixel, agrandi d'un facteur entier. */
export function cursorCss(nom: keyof typeof CURSEURS, zoom = 1, repli = "default"): string {
  const { rows, hot } = CURSEURS[nom];
  const couleurs: Record<string, string> = { X: "#000", W: "#fff", Y: "#e0a526" };
  let rects = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && (rects += `<rect x='${x}' y='${y}' width='1.02' height='1.02' fill='${couleurs[ch]}'/>`)));
  const w = rows[0]!.length;
  const h = rows.length;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w * zoom}' height='${h * zoom}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hot[0] * zoom} ${hot[1] * zoom}, ${repli}`;
}

/** Une traînée SVG par couleur, pixels regroupés en segments horizontaux. */
export function gridPaths(g: Grid): { color: string; d: string }[] {
  const n = Math.sqrt(g.length);
  const by = new Map<string, string[]>();
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      const c = g[y * n + x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < n && g[y * n + x + w] === c) w++;
      (by.get(c) ?? by.set(c, []).get(c)!).push(`M${x} ${y}h${w}v1h-${w}z`);
      x += w;
    }
  }
  return [...by].map(([c, parts]) => ({ color: PALETTE[c] ?? c, d: parts.join("") }));
}
