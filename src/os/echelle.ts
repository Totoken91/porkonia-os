/**
 * Échelle d'affichage du moniteur. Une police et des icônes pixel ne sont nettes que si un pixel logique
 * couvre un nombre entier de pixels physiques : on arrondit donc l'échelle vers le bas quand la perte
 * de taille reste faible (ou toujours, en mode « pixels nets »). Pure, testée.
 */
export function echelle(fit: number, dpr: number, nette: boolean, tolerance = 0.85): number {
  const physique = fit * dpr;
  if (physique < 1) return fit;
  const entier = Math.floor(physique);
  return nette || entier / physique >= tolerance ? entier / dpr : fit;
}
