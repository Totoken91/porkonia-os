/** PorkPaint : image en indices de palette, pot de peinture et trait de crayon. Logique pure. */

export interface Image {
  w: number;
  h: number;
  px: Uint8Array;
}

export const imageVide = (w: number, h: number, fond = 0): Image => ({ w, h, px: new Uint8Array(w * h).fill(fond) });

/** Pot de peinture : remplit la zone de même couleur contiguë (4 voisins). Rend le nombre de pixels peints. */
export function remplir(im: Image, x: number, y: number, couleur: number): number {
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return 0;
  const avant = im.px[y * im.w + x]!;
  if (avant === couleur) return 0;
  let n = 0;
  const pile: number[] = [x, y];
  while (pile.length) {
    const cy = pile.pop()!;
    let cx = pile.pop()!;
    while (cx > 0 && im.px[cy * im.w + cx - 1] === avant) cx--;
    let hautOuvert = false;
    let basOuvert = false;
    for (; cx < im.w && im.px[cy * im.w + cx] === avant; cx++) {
      im.px[cy * im.w + cx] = couleur;
      n++;
      if (cy > 0) {
        const h = im.px[(cy - 1) * im.w + cx] === avant;
        if (h && !hautOuvert) pile.push(cx, cy - 1);
        hautOuvert = h;
      }
      if (cy < im.h - 1) {
        const b = im.px[(cy + 1) * im.w + cx] === avant;
        if (b && !basOuvert) pile.push(cx, cy + 1);
        basOuvert = b;
      }
    }
  }
  return n;
}

/** Trait d'un point à un autre (Bresenham), d'épaisseur `taille` (carré centré). */
export function trait(im: Image, x0: number, y0: number, x1: number, y1: number, couleur: number, taille = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const r = Math.floor(taille / 2);
  for (;;) {
    for (let yy = y0 - r; yy < y0 - r + taille; yy++)
      for (let xx = x0 - r; xx < x0 - r + taille; xx++) if (xx >= 0 && yy >= 0 && xx < im.w && yy < im.h) im.px[yy * im.w + xx] = couleur;
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/**
 * Tampon : motif de caractères (« . » = transparent, sinon indice de palette en base 36), centré sur (x, y),
 * chaque point du motif agrandi `echelle` fois.
 */
export function tamponner(im: Image, motif: string[], x: number, y: number, echelle = 1): void {
  const h = motif.length * echelle;
  const w = Math.max(...motif.map((l) => l.length)) * echelle;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const c = motif[Math.floor(j / echelle)]![Math.floor(i / echelle)];
      if (!c || c === ".") continue;
      const xx = x - Math.floor(w / 2) + i;
      const yy = y - Math.floor(h / 2) + j;
      if (xx >= 0 && yy >= 0 && xx < im.w && yy < im.h) im.px[yy * im.w + xx] = parseInt(c, 36);
    }
}
