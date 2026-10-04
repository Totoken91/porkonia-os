import type { Partie } from './logic';
import { disponible } from './rpg';

export const CONSEILS_DEBUT = ['mission', 'soin', 'esquive', 'niveau', 'escalier', 'butin', 'combat'] as const;
export type ConseilDebut = typeof CONSEILS_DEBUT[number];
export interface GuideDebut { actif: boolean; vus: ConseilDebut[] }

/** Un conseil au plus, lié à la situation réelle, pendant le premier acte. */
export function conseilSuivant(p: Partie, pvMax: number): ConseilDebut | null {
  if (!p.joueur.rpg || !p.guide?.actif || p.fin || p.etage > 3) return null;
  const j = p.joueur;
  const candidats: [ConseilDebut, boolean][] = [
    ['soin', j.pv < pvMax * .5 && j.jambons > 0],
    ['esquive', p.evenements.includes('esquive') && p.monstres.some(m => (m.rpg?.recuperation ?? -1) >= p.tour)],
    ['niveau', j.rpg!.points > 0],
    ['escalier', p.carte.cases[j.y * p.carte.w + j.x] === 2 && !p.monstres.some(m => m.boss)],
    ['butin', j.sac.length > 0],
    ['combat', disponible(p, 0)],
  ];
  return candidats.find(([id, pertinent]) => pertinent && !p.guide!.vus.includes(id))?.[0] ?? null;
}

export function guideValide(v: unknown): boolean {
  if (v === undefined) return true;
  if (!v || typeof v !== 'object') return false;
  const g = v as GuideDebut;
  return typeof g.actif === 'boolean' && Array.isArray(g.vus) &&
    g.vus.every(id => CONSEILS_DEBUT.includes(id)) && new Set(g.vus).size === g.vus.length;
}
