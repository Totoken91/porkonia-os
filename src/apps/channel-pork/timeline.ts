/** Où en est le programme au temps t (secondes) : diapositive courante et sous-titre ; chaînes en direct. Pur. */
import type { Channel, Program } from "@/content/types";

export const programLength = (p: Program) => p.slides.reduce((s, x) => s + x.seconds, 0);

export function at(p: Program, t: number): { slide: number; subtitle: string | null } {
  let acc = 0;
  let slide = p.slides.length - 1;
  for (let i = 0; i < p.slides.length; i++) {
    acc += p.slides[i]!.seconds;
    if (t < acc) {
      slide = i;
      break;
    }
  }
  let subtitle: string | null = null;
  for (const s of p.subtitles) if (s.at <= t) subtitle = s.text;
  return { slide, subtitle };
}

/** Réplique enregistrée en cours au temps t : son fichier et la position de lecture (s). Pur. */
export function voiceAt(p: Program, t: number): { index: number; src: string; offset: number } | null {
  let found: { index: number; src: string; offset: number } | null = null;
  p.subtitles.forEach((s, index) => {
    if (s.at <= t && s.voice) found = { index, src: s.voice, offset: t - s.at };
    else if (s.at <= t) found = null;
  });
  return found;
}

/** Décalage entre chaînes (s), pour qu'elles ne commencent pas toutes leur grille ensemble. */
export const DECALAGE = 97;

/** Programmes d'une chaîne, dans l'ordre de sa grille (les identifiants inconnus sont ignorés). */
export function gridOf(c: Channel, programs: Program[]): Program[] {
  return c.grid.map((id) => programs.find((p) => p.id === id)).filter((p): p is Program => !!p);
}

/** Durée d'un tour complet de grille (s). */
export const loopLength = (c: Channel, programs: Program[]) => gridOf(c, programs).reduce((s, p) => s + programLength(p), 0);

/**
 * Ce que diffuse une chaîne à l'instant `now` (secondes, horloge réelle) : la grille tourne en boucle
 * depuis l'origine des temps, décalée par chaîne pour que deux chaînes ne commencent pas ensemble.
 * `slot` : position dans la grille ; `suivant` : le programme d'après.
 */
export function live(c: Channel, programs: Program[], now: number, decalage = 0): { program: Program; slot: number; t: number; suivant: Program } {
  const grille = gridOf(c, programs);
  const total = loopLength(c, programs);
  let pos = (((now + decalage) % total) + total) % total;
  for (let slot = 0; slot < grille.length; slot++) {
    const len = programLength(grille[slot]!);
    if (pos < len) return { program: grille[slot]!, slot, t: pos, suivant: grille[(slot + 1) % grille.length]! };
    pos -= len;
  }
  return { program: grille[0]!, slot: 0, t: 0, suivant: grille[1 % grille.length]! };
}
