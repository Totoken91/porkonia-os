/**
 * Icônes pixel d'époque : dessinées en 32×32 sur une grille, contour noir automatique,
 * palette VGA réchauffée aux couleurs de la République. Une version 16×16 est dérivée pour
 * la barre des tâches et les menus. Logique pure (testée), sans DOM.
 */
import type { IconKey } from "@/content/types";
import { DESSINS, DESSINS16 } from "./icones";

export const PALETTE: Record<string, string> = {
  k: "#000000", D: "#3c3c3c", d: "#808080", g: "#c0c0c0", l: "#e0e0e0", W: "#ffffff",
  u: "#fff8e0",
  Y: "#ffeb8a", y: "#f5c542", o: "#c8901c", O: "#8a5a0a",
  R: "#ff6a5a", r: "#d01018", m: "#8a0a10",
  C: "#c4eaff", c: "#5fb4ee", B: "#2468d8", b: "#173c8c",
  V: "#9ee06a", v: "#3c9a2c", G: "#1e5e1a", t: "#2f6f5c", T: "#4f9a80",
  N: "#e9b777", n: "#b5773a", z: "#6e4318",
  P: "#ffd4cf", p: "#f29a97", q: "#c4566a",
  E: "#f2ead4", e: "#d6cba9", f: "#a4987a",
};

export type Grid = (string | null)[];

export class Toile {
  px: Grid;
  constructor(readonly n = 32) {
    this.px = Array(n * n).fill(null);
  }
  set(x: number, y: number, c: string) {
    if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] = c;
  }
  /** Efface des pixels (coins arrondis, échancrures). */
  clear(list: [number, number][]) {
    for (const [x, y] of list) if (x >= 0 && y >= 0 && x < this.n && y < this.n) this.px[y * this.n + x] = null;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Trame d'époque : un pixel sur deux (damier), pour les dégradés et les ombres. */
  dither(x: number, y: number, w: number, h: number, c: string, phase = 0) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((i + j + phase) % 2 === 0) this.set(i, j, c);
  }
  /** Relief : arête claire en haut et à gauche, sombre en bas et à droite. */
  bevel(x: number, y: number, w: number, h: number, hi: string, lo: string) {
    this.hline(x, y, w - 1, hi);
    this.vline(x, y, h - 1, hi);
    this.hline(x + 1, y + h - 1, w - 1, lo);
    this.vline(x + w - 1, y + 1, h - 1, lo);
  }
  /** Pixels posés à la main : liste de [x, y] d'une même couleur. */
  pts(list: [number, number][], c: string) {
    for (const [x, y] of list) this.set(x, y, c);
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

const cache = new Map<string, Grid>();

/** Grille d'une icône : 32×32 pour le bureau, 16×16 dessinée à part pour les barres et menus. */
export function iconGrid(name: Exclude<IconKey, "embleme">, n: 32 | 16 = 32): Grid {
  const key = `${name}:${n}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const t = new Toile(n);
  (n === 16 ? DESSINS16 : DESSINS)[name](t);
  const g = t.outline();
  cache.set(key, g);
  return g;
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
