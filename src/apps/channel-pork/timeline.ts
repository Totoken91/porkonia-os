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

/**
 * Découpe une réplique en sous-titres d'au plus `max` caractères, sans couper une phrase si possible :
 * par phrases, puis par virgules ou deux-points, puis par mots.
 */
export function decouper(texte: string, max = 76): string[] {
  const morceaux: string[] = [];
  const pousser = (bout: string) => {
    if (bout.length <= max) return morceaux.push(bout);
    const coupe = bout.slice(0, max).search(/[,;:](?=\s)[^,;:]*$/);
    const i = coupe > max * 0.35 ? coupe + 1 : bout.lastIndexOf(" ", max);
    if (i <= 0) return morceaux.push(bout);
    pousser(bout.slice(0, i).trim());
    pousser(bout.slice(i).trim());
  };
  let courant = "";
  for (const phrase of texte.split(/(?<=[.!?…])\s+(?![»])/)) {
    const essai = courant ? `${courant} ${phrase}` : phrase;
    if (essai.length <= max) courant = essai;
    else {
      if (courant) pousser(courant);
      courant = "";
      if (phrase.length <= max) courant = phrase;
      else pousser(phrase);
    }
  }
  if (courant) pousser(courant);
  return morceaux;
}

/**
 * Sous-titre affiché au temps t : la réplique en cours, découpée et répartie sur sa durée
 * (proportionnellement à la longueur de chaque morceau). Rien entre deux répliques.
 */
export function sousTitre(p: Program, t: number): string | null {
  let s: Program["subtitles"][number] | null = null;
  for (const x of p.subtitles) if (x.at <= t) s = x;
  if (!s) return null;
  if (!s.dur) return s.text;
  if (t > s.at + s.dur + 0.8) return null;
  const bouts = decouper(s.text);
  const total = bouts.reduce((n, b) => n + b.length, 0);
  let fin = s.at;
  for (const b of bouts) {
    fin += (b.length / total) * s.dur;
    if (t < fin) return b;
  }
  return bouts[bouts.length - 1]!;
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
