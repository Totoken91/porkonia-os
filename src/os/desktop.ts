/**
 * Grille magnétique des icônes du bureau — logique pure, testée.
 * Les icônes occupent des cases (colonne, ligne), remplies de haut en bas puis de gauche à droite,
 * comme sur les postes d'époque. Deux icônes ne partagent jamais une case.
 */
export const GRID = { cw: 76, ch: 74, x0: 4, y0: 6 };

export interface Cell {
  c: number;
  r: number;
}
export type Layout = Record<string, Cell>;
export interface Dims {
  cols: number;
  rows: number;
}

export const dimsFor = (w: number, h: number): Dims => ({
  cols: Math.max(1, Math.floor((w - GRID.x0) / GRID.cw)),
  rows: Math.max(1, Math.floor((h - GRID.y0) / GRID.ch)),
});

export const cellPos = (cell: Cell) => ({ x: GRID.x0 + cell.c * GRID.cw, y: GRID.y0 + cell.r * GRID.ch });

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const key = (cell: Cell) => `${cell.c}:${cell.r}`;
export const cellKey = key;

/** Case la plus proche d'un point (coin haut-gauche d'une icône). */
export function cellAt(x: number, y: number, d: Dims): Cell {
  return { c: clamp(Math.round((x - GRID.x0) / GRID.cw), 0, d.cols - 1), r: clamp(Math.round((y - GRID.y0) / GRID.ch), 0, d.rows - 1) };
}

export function defaultLayout(ids: string[], d: Dims): Layout {
  const out: Layout = {};
  ids.forEach((id, i) => (out[id] = { c: Math.floor(i / d.rows) % d.cols, r: i % d.rows }));
  return out;
}

/** Case libre la plus proche de `want` (distance de Chebyshev croissante, puis ordre de lecture). */
export function nearestFree(want: Cell, taken: Set<string>, d: Dims): Cell {
  for (let dist = 0; dist < d.cols + d.rows; dist++) {
    const ring: Cell[] = [];
    for (let c = want.c - dist; c <= want.c + dist; c++)
      for (let r = want.r - dist; r <= want.r + dist; r++) {
        if (Math.max(Math.abs(c - want.c), Math.abs(r - want.r)) !== dist) continue;
        if (c < 0 || r < 0 || c >= d.cols || r >= d.rows) continue;
        ring.push({ c, r });
      }
    ring.sort((a, b) => a.c - b.c || a.r - b.r);
    const free = ring.find((cell) => !taken.has(key(cell)));
    if (free) return free;
  }
  return want;
}

/** Remet d'aplomb une disposition lue depuis le stockage : cases valides, uniques, et toutes les icônes placées. */
export function sanitizeLayout(raw: unknown, ids: string[], d: Dims): Layout {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Layout = {};
  const taken = new Set<string>();
  const missing: string[] = [];
  for (const id of ids) {
    const v = src[id] as Partial<Cell> | undefined;
    const ok = v && Number.isInteger(v.c) && Number.isInteger(v.r) && v.c! >= 0 && v.r! >= 0 && v.c! < d.cols && v.r! < d.rows && !taken.has(key(v as Cell));
    if (ok) {
      out[id] = { c: v.c!, r: v.r! };
      taken.add(key(out[id]));
    } else missing.push(id);
  }
  const defaults = defaultLayout(ids, d);
  for (const id of missing) {
    const cell = nearestFree(defaults[id]!, taken, d);
    out[id] = cell;
    taken.add(key(cell));
  }
  return out;
}

/** Déplace un groupe d'icônes d'un décalage en cases ; chaque icône bloquée glisse vers la case libre la plus proche. */
export function moveIcons(layout: Layout, ids: string[], dc: number, dr: number, d: Dims): Layout {
  const moving = new Set(ids);
  const out: Layout = { ...layout };
  const taken = new Set(Object.entries(layout).filter(([id]) => !moving.has(id)).map(([, cell]) => key(cell)));
  const order = [...ids].filter((id) => layout[id]).sort((a, b) => layout[a]!.c - layout[b]!.c || layout[a]!.r - layout[b]!.r);
  for (const id of order) {
    const from = layout[id]!;
    const want = { c: clamp(from.c + dc, 0, d.cols - 1), r: clamp(from.r + dr, 0, d.rows - 1) };
    const cell = nearestFree(want, taken, d);
    out[id] = cell;
    taken.add(key(cell));
  }
  return out;
}

/** Icônes dont la case croise un rectangle de sélection (coordonnées du bureau). */
export function inRect(layout: Layout, rect: { x: number; y: number; w: number; h: number }, icon = { w: 72, h: 64 }): string[] {
  const x0 = Math.min(rect.x, rect.x + rect.w);
  const y0 = Math.min(rect.y, rect.y + rect.h);
  const x1 = Math.max(rect.x, rect.x + rect.w);
  const y1 = Math.max(rect.y, rect.y + rect.h);
  return Object.entries(layout)
    .filter(([, cell]) => {
      const p = cellPos(cell);
      const ix = p.x + (GRID.cw - icon.w) / 2;
      return ix < x1 && ix + icon.w > x0 && p.y < y1 && p.y + icon.h > y0;
    })
    .map(([id]) => id);
}

/** Icône voisine dans une direction (flèches du clavier), ou la même s'il n'y en a pas. */
export function neighbor(layout: Layout, from: string, dir: "haut" | "bas" | "gauche" | "droite"): string {
  const a = layout[from];
  if (!a) return from;
  const [dx, dy] = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[dir];
  let best: [string, number] | null = null;
  for (const [id, b] of Object.entries(layout)) {
    if (id === from) continue;
    const vx = b.c - a.c;
    const vy = b.r - a.r;
    const along = vx * dx! + vy * dy!;
    if (along <= 0) continue;
    const across = Math.abs(vx * dy! - vy * dx!);
    const score = along + across * 3;
    if (!best || score < best[1]) best = [id, score];
  }
  return best ? best[0] : from;
}
