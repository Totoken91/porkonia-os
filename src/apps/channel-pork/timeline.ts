/** Où en est le programme au temps t (secondes) : diapositive courante et sous-titre. Pur. */
import type { Program } from "@/content/types";

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
