/**
 * État d'ébriété du citoyen, à l'échelle de tout PorkOS : chaque bière ajoute un verre, un verre s'élimine en
 * une minute. L'écran du moniteur penche, flotte et se dédouble à mesure que le niveau monte. Logique pure ; la
 * conservation dans le navigateur et l'abonnement des composants sont dans `ivresseStore.ts`.
 */

export interface Ebriete {
  /** Niveau (en verres) à l'instant `t`. */
  v: number;
  /** Millisecondes (Date.now). */
  t: number;
}

/** Verres éliminés par seconde. */
export const ELIMINATION = 1 / 60;
export const MAX_VERRES = 16;
/** En dessous, rien ne se voit. */
export const SEUIL_VISIBLE = 0.8;
/** Premier niveau où l'écran déforme franchement : un signal est émis en le franchissant. */
export const SEUIL_WARP = 3;

export const sobre = (): Ebriete => ({ v: 0, t: 0 });

export const niveau = (e: Ebriete, now: number) => (e.v <= 0 ? 0 : Math.max(0, e.v - (Math.max(0, now - e.t) / 1000) * ELIMINATION));

export const boire = (e: Ebriete, now: number, verres = 1): Ebriete => ({ v: Math.min(MAX_VERRES, niveau(e, now) + verres), t: now });

/** Le saucisson éponge : retire des verres (jamais sous zéro). */
export const eponger = (e: Ebriete, now: number, verres: number): Ebriete => {
  const v = Math.max(0, niveau(e, now) - verres);
  return v > 0 ? { v, t: now } : sobre();
};

/** Intensité des effets visuels, de 0 (sobre) à 1 (sous la table). */
export const intensite = (v: number) => Math.min(1, Math.max(0, (v - SEUIL_VISIBLE) / 9));

export type Stade = "sobre" | "gai" | "rond" | "plein" | "fini";

export function stade(v: number): Stade {
  if (v < SEUIL_VISIBLE) return "sobre";
  if (v < SEUIL_WARP) return "gai";
  if (v < 6) return "rond";
  if (v < 10) return "plein";
  return "fini";
}

/** Secondes avant d'être de nouveau sobre. */
export const secondesAvantSobre = (v: number) => Math.ceil(v / ELIMINATION);

export function sanitize(v: unknown, now: number): Ebriete {
  if (!v || typeof v !== "object") return sobre();
  const o = v as Record<string, unknown>;
  if (typeof o.v !== "number" || typeof o.t !== "number" || !Number.isFinite(o.v) || !Number.isFinite(o.t) || o.v < 0) return sobre();
  const e: Ebriete = { v: Math.min(MAX_VERRES, o.v), t: Math.min(o.t, now) };
  return niveau(e, now) <= 0 ? sobre() : e;
}
