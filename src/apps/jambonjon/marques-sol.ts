/** Sceau de braises natif 32×32 : la pierre reste visible entre les traces. */
export const MARQUE_SOL = Uint8Array.from({ length: 32 * 32 }, (_, i) => {
  const x = i % 32, y = Math.floor(i / 32);
  const dx = x - 15.5, dy = y - 15.5;
  const rayon = Math.hypot(dx, dy);
  const bruit = ((x * 17 + y * 31 + x * y * 3) % 19) / 19;
  const anneau = Math.abs(rayon - (11.5 + bruit * 1.5)) < 1.3;
  const fissure = rayon < 11 && rayon > 3 &&
    (Math.abs(dx + dy * .45 + Math.floor(y / 4) % 2) < .85 ||
     Math.abs(dy - dx * .35 - Math.floor(x / 5) % 2) < .7);
  if (!anneau && !fissure) return 0;
  return bruit > .78 ? 3 : bruit > .35 ? 2 : 1;
});

export const COULEURS_MARQUE = [[0, 0, 0], [111, 45, 22], [195, 78, 29], [237, 151, 63]] as const;
