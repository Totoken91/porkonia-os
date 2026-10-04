/**
 * La cave du citoyen : les bières commandées sur Porkomazon voyagent (un délai de livraison, en secondes réelles),
 * puis attendent, livrées, qu'on les boive à la choppe posée devant l'écran. Logique pure : le temps est fourni par
 * l'appelant ; la conservation et l'abonnement sont dans `biereStore.ts`.
 */

export interface Colis {
  id: number;
  /** Nombre de bières dans le colis. */
  qte: number;
  /** Millisecondes (Date.now) de l'arrivée. */
  arriveeA: number;
  /** Mode de livraison choisi (id du pack), pour l'affichage. */
  mode: string;
}

export interface Cave {
  /** Bières livrées, prêtes à boire. */
  stock: number;
  enRoute: Colis[];
  prochainId: number;
}

export const MAX_STOCK = 999;
export const MAX_COLIS = 20;

export const cave = (): Cave => ({ stock: 0, enRoute: [], prochainId: 1 });

/** Passe un colis commandé en route. Refuse quand trop de colis circulent. */
export function expedier(c: Cave, qte: number, mode: string, delaiMs: number, now: number): Cave | null {
  if (!Number.isInteger(qte) || qte <= 0 || qte > MAX_STOCK) return null;
  if (c.enRoute.length >= MAX_COLIS) return null;
  return { ...c, prochainId: c.prochainId + 1, enRoute: [...c.enRoute, { id: c.prochainId, qte, arriveeA: now + Math.max(0, delaiMs), mode }] };
}

/** Dépose les colis arrivés dans le stock. `arrives` : bières livrées par cet appel. */
export function livrer(c: Cave, now: number): { cave: Cave; arrives: number } {
  const arrives = c.enRoute.filter((k) => k.arriveeA <= now);
  if (!arrives.length) return { cave: c, arrives: 0 };
  const n = arrives.reduce((a, k) => a + k.qte, 0);
  return { cave: { ...c, stock: Math.min(MAX_STOCK, c.stock + n), enRoute: c.enRoute.filter((k) => k.arriveeA > now) }, arrives: n };
}

/** Prend une bière dans le stock pour la boire. Null s'il n'en reste pas. */
export const servir = (c: Cave): Cave | null => (c.stock > 0 ? { ...c, stock: c.stock - 1 } : null);

/** Secondes avant l'arrivée du colis (0 : arrivé). */
export const secondesRestantes = (k: Colis, now: number) => Math.max(0, Math.ceil((k.arriveeA - now) / 1000));

export function sanitize(v: unknown): Cave {
  if (!v || typeof v !== "object") return cave();
  const o = v as Record<string, unknown>;
  const stock = typeof o.stock === "number" && Number.isInteger(o.stock) && o.stock >= 0 ? Math.min(MAX_STOCK, o.stock) : 0;
  const colis = Array.isArray(o.enRoute) ? o.enRoute : [];
  const enRoute: Colis[] = colis
    .filter((k): k is Colis => !!k && typeof k === "object" && Number.isInteger((k as Colis).id) && Number.isInteger((k as Colis).qte) && (k as Colis).qte > 0 && (k as Colis).qte <= MAX_STOCK && Number.isFinite((k as Colis).arriveeA) && typeof (k as Colis).mode === "string")
    .slice(0, MAX_COLIS)
    .map((k) => ({ id: k.id, qte: k.qte, arriveeA: k.arriveeA, mode: k.mode.slice(0, 40) }));
  const prochainId = enRoute.reduce((a, k) => Math.max(a, k.id + 1), typeof o.prochainId === "number" && Number.isInteger(o.prochainId) ? Math.max(1, o.prochainId) : 1);
  return { stock, enRoute, prochainId };
}
