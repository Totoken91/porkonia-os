/**
 * Portail PigNet : ce qui change avec la date (une du jour, saint, compteur, bourse, météo).
 * Tout est déterministe pour une date donnée : deux visiteurs le même jour voient le même portail. Pur, testé.
 */
import type { Portal } from "@/content/types";

const ORIGINE = Date.UTC(2000, 0, 1);

/** Numéro du jour (heure locale) depuis le 1er janvier 2000. */
export function jour(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - ORIGINE) / 86_400_000);
}

/** Aléa déterministe [0, 1) pour un entier et un sel. */
export function alea(n: number, sel = 0): number {
  let x = (n * 374_761_393 + sel * 668_265_263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1_274_126_177);
  x ^= x >>> 16;
  return (x >>> 0) / 4_294_967_296;
}

export const duJour = <T>(liste: readonly T[], d: Date, sel = 0): T => liste[Math.floor(alea(jour(d), sel) * liste.length)]!;

/** Compteur de visites : il ne fait que monter, régulièrement, même la nuit. */
export function compteur(c: Portal["compteur"], d: Date): number {
  const secondes = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return c.base + jour(d) * c.parJour + Math.floor((secondes / 86_400) * c.parJour);
}

/** Cours du jour et variation sur la veille (en %, arrondie au dixième). */
export function cours(bourse: Portal["bourse"], d: Date): { nom: string; unite: string; valeur: number; variation: number }[] {
  const j = jour(d);
  const prix = (base: number, k: number, n: number) => base * (1 + 0.25 * Math.sin(n / 9 + k) + 0.12 * (alea(n, k + 7) - 0.5));
  return bourse.map((b, k) => {
    const v = prix(b.base, k, j);
    const hier = prix(b.base, k, j - 1);
    const decimales = b.base < 10 ? 2 : b.base < 100 ? 1 : 0;
    return { nom: b.nom, unite: b.unite, valeur: Number(v.toFixed(decimales)), variation: Math.round(((v - hier) / hier) * 1000) / 10 };
  });
}

export function meteo(m: Portal["meteo"], d: Date): { ville: string; ciel: string; mousse: string }[] {
  return m.villes.map((ville, k) => ({ ville, ciel: duJour(m.ciels, d, 20 + k), mousse: duJour(m.mousses, d, 40 + k) }));
}
