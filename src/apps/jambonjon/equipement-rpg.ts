import type { ObjetDef } from '@/content/types';
import { RARETES_RPG } from './equilibrage';

/** Bonus à la création uniquement : un objet existant ne change jamais de valeur. */
export function bonusEquipementRpg(def: ObjetDef, niveau: number, rarete: string) {
  const mult = RARETES_RPG[rarete as keyof typeof RARETES_RPG] ?? 1;
  const k = niveau - 1;
  const part = def.emplacement === 'armure' ? .65 : def.emplacement === 'tete' ? .25 : .1;
  const v = (n: number, stat: 'att' | 'def' | 'pv' | 'mousse') =>
    Math.max(def.profilRpg?.minimums?.[stat] ?? 1, Math.round(n * mult * (def.profilRpg?.facteurs[stat] ?? 1)));
  return {
    att: def.att ? v(def.emplacement === 'arme' ? (2 + .55 * k) * (.85 + Math.min(8, def.att) * .04) : .5 + .08 * k, 'att') : 0,
    def: def.def ? v((2 + .4 * k) * part, 'def') : 0,
    pv: def.pv ? v(def.pv * .25 + 2 * k * (def.emplacement === 'arme' ? .15 : part), 'pv') : 0,
    mousse: def.mousse ? v(Math.min(8, def.mousse * .4) + k * .5, 'mousse') : 0,
  };
}
