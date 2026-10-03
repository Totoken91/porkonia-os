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

/**
 * Boîte de la partie visible d'une image RGBA (pixels d'alpha supérieur à `seuil`) : les logos ont souvent des marges
 * transparentes inégales, qu'il faut ignorer pour les centrer. Renvoie toute l'image si rien n'est visible.
 */
export function boiteVisible(rgba: ArrayLike<number>, w: number, h: number, seuil = 24): [number, number, number, number] {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3]! > seuil) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? [0, 0, w, h] : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

/** Place une boîte `bw`×`bh` au centre d'un écran `W`×`H`, sans dépasser `maxL` et `maxH` (fractions de l'écran). */
export function centrer(bw: number, bh: number, W: number, H: number, maxL = 0.84, maxH = 0.6, echelle = 1): [number, number, number, number] {
  const k = Math.min((W * maxL) / bw, (H * maxH) / bh) * echelle;
  return [(W - bw * k) / 2, (H - bh * k) / 2, bw * k, bh * k];
}
