/**
 * « Nappe Vide » — démineur du protocole des banquets (logique pure, testée).
 * Sous la nappe se cachent des ZONES DE NAPPE VIDE. En découvrir une = incident protocolaire.
 * Un chiffre indique le nombre de zones vides adjacentes. On pose une ASSIETTE sur une zone suspecte.
 */
import type { Rng } from "@/os/rng";

export interface Level {
  id: string;
  label: string;
  w: number;
  h: number;
  vides: number;
}

export const LEVELS: Level[] = [
  { id: "petit", label: "Petit banquet", w: 9, h: 9, vides: 10 },
  { id: "grand", label: "Grand Banquet", w: 16, h: 16, vides: 40 },
  { id: "vii", label: "Niveau VII", w: 30, h: 16, vides: 99 },
];

export interface Cell {
  vide: boolean;
  open: boolean;
  assiette: boolean;
  adj: number;
}

export interface Game {
  level: Level;
  cells: Cell[];
  state: "attente" | "service" | "incident" | "conforme";
  /** Case qui a provoqué l'incident. */
  fatal: number | null;
  started: number | null;
  ended: number | null;
}

export const newGame = (level: Level): Game => ({
  level,
  cells: Array.from({ length: level.w * level.h }, () => ({ vide: false, open: false, assiette: false, adj: 0 })),
  state: "attente",
  fatal: null,
  started: null,
  ended: null,
});

export function neighbors(level: Level, i: number): number[] {
  const x = i % level.w;
  const y = Math.floor(i / level.w);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < level.w && ny < level.h) out.push(ny * level.w + nx);
    }
  return out;
}

/** Pose les zones vides APRÈS le premier clic : la première case et ses voisines sont toujours sûres. */
function seed(g: Game, first: number, rng: Rng): Cell[] {
  const safe = new Set([first, ...neighbors(g.level, first)]);
  const pool = g.cells.map((_, i) => i).filter((i) => !safe.has(i));
  const cells = g.cells.map((c) => ({ ...c, vide: false }));
  const count = Math.min(g.level.vides, pool.length);
  for (let k = 0; k < count; k++) {
    const j = k + Math.floor(rng() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j]!, pool[k]!];
    cells[pool[k]!]!.vide = true;
  }
  cells.forEach((c, i) => (c.adj = neighbors(g.level, i).filter((n) => cells[n]!.vide).length));
  return cells;
}

function flood(g: Game, cells: Cell[], start: number) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const c = cells[i]!;
    if (c.open || c.assiette) continue;
    c.open = true;
    if (c.adj === 0 && !c.vide) for (const n of neighbors(g.level, i)) if (!cells[n]!.open) stack.push(n);
  }
}

function settle(g: Game, cells: Cell[], now: number): Game {
  const won = cells.every((c) => c.vide || c.open);
  if (won) return { ...g, cells: cells.map((c) => (c.vide ? { ...c, assiette: true } : c)), state: "conforme", ended: now };
  return { ...g, cells };
}

export function reveal(g: Game, i: number, rng: Rng, now: number): Game {
  if (g.state === "incident" || g.state === "conforme") return g;
  let cells = g.cells.map((c) => ({ ...c }));
  let started = g.started;
  if (g.state === "attente") {
    cells = seed(g, i, rng);
    started = now;
  }
  const c = cells[i]!;
  if (c.open || c.assiette) return { ...g, cells, started, state: "service" };
  if (c.vide) {
    return { ...g, cells: cells.map((x) => (x.vide ? { ...x, open: true } : x)), started, state: "incident", fatal: i, ended: now };
  }
  flood(g, cells, i);
  return settle({ ...g, started, state: "service" }, cells, now);
}

export function toggleAssiette(g: Game, i: number): Game {
  if (g.state !== "service") return g;
  const c = g.cells[i]!;
  if (c.open) return g;
  return { ...g, cells: g.cells.map((x, j) => (j === i ? { ...x, assiette: !x.assiette } : x)) };
}

/** Clic sur un chiffre entouré du bon nombre d'assiettes : sert toutes les cases voisines. */
export function chord(g: Game, i: number, rng: Rng, now: number): Game {
  const c = g.cells[i]!;
  if (g.state !== "service" || !c.open || c.adj === 0) return g;
  const ns = neighbors(g.level, i);
  if (ns.filter((n) => g.cells[n]!.assiette).length !== c.adj) return g;
  let next = g;
  for (const n of ns) if (!next.cells[n]!.open && !next.cells[n]!.assiette) next = reveal(next, n, rng, now);
  return next;
}

export const remaining = (g: Game) => g.level.vides - g.cells.filter((c) => c.assiette).length;
