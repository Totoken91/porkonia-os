import type { SpriteMonstre } from '@/content/types';

/** Une case du monde porte 40 pixels natifs, quelle que soit la taille du sprite. */
export const PIXELS_PAR_CASE = 40;
export const GRILLES_MONSTRES: Record<SpriteMonstre, number> = {
  rat: 18, gobelin: 24, moisissure: 20, saucisson: 28, tonneau: 26,
  fantome: 32, inspecteur: 34, affineur: 50, prevot: 44, pressoir: 32, spectre: 40,
};
export type Objet3D = 'jambon' | 'biere' | 'tonneau' | 'sac';
export const GRILLES_OBJETS: Record<Objet3D, number> = { jambon: 14, biere: 16, tonneau: 20, sac: 16 };
export const GRILLES_MOBILIER = { lit: 52, coffre: 36 } as const;

/** Tous les sprites à une même profondeur ont le même agrandissement natif. */
export function pasPixelMonde(projection: number, distance: number): number {
  return Math.max(1, Math.round(projection / distance / PIXELS_PAR_CASE));
}
export function coteSprite(natif: number, projection: number, distance: number): number {
  const facteur = projection / distance / PIXELS_PAR_CASE;
  return facteur >= 1 ? natif * pasPixelMonde(projection, distance) : Math.max(1, Math.round(natif * facteur));
}
