/**
 * Outils purs du rendu VHS de Channel Pork (testés) : découpage des textes, code temporel,
 * déphasage horizontal des lignes (ondulation, bande de tracking, commutation des têtes).
 */

/** Résolution de la cassette : 4:3, proche d'une demi-trame PAL. */
export const VHS = { w: 384, h: 288 };

/** Découpe un texte en lignes qui tiennent dans `max` (mesure fournie par l'appelant). */
export function wrapText(text: string, max: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= max || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Code temporel du magnétoscope : « 0:01:07 ». */
export function timecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export interface Defauts {
  /** Temps (s). */
  t: number;
  /** Position de la bande de tracking (ligne), ou null. */
  tracking: number | null;
  /** Force du défaut de tracking (0–1). */
  force: number;
  /** Aléa [0, 1) pour cette ligne. */
  alea: number;
}

/**
 * Déphasage horizontal (en pixels de cassette) d'une ligne `y` :
 * ondulation lente de la bande, bande de tracking, commutation des têtes dans les dernières lignes.
 */
export function lineOffset(y: number, h: number, d: Defauts): number {
  let dx = Math.sin(d.t * 2.1 + y * 0.043) * 1.1 + Math.sin(d.t * 9.7 + y * 0.29) * 0.5;
  // Tension de la bande : le haut de l'image se tord.
  if (y < 22) dx += (22 - y) * 0.28 * (0.6 + 0.4 * Math.sin(d.t * 0.9));
  if (d.tracking !== null) {
    const dist = Math.abs(y - d.tracking);
    if (dist < 16) dx += (d.alea - 0.5) * 26 * d.force * (1 - dist / 16);
  }
  if (y >= h - 10) dx += 5 + (d.alea - 0.5) * 12 * ((y - (h - 10)) / 10 + 0.4);
  return dx;
}
