/**
 * Glisser-déposer des fichiers entre fenêtres et bureau (glisser-déposer du navigateur), et repérage
 * des zones de dépôt sous le pointeur pour les icônes du bureau, qui se déplacent à la main.
 * Toute zone qui accepte des fichiers porte `data-depot` = chemin du dossier (ou POUBELLE).
 */
export const TYPE_FICHIERS = "application/x-porkos-fichiers";

export function porter(dt: DataTransfer, chemins: string[]): void {
  dt.setData(TYPE_FICHIERS, JSON.stringify(chemins));
  dt.setData("text/plain", chemins.join("\n"));
  dt.effectAllowed = "copyMove";
}

export const porteFichiers = (dt: DataTransfer | null): boolean => !!dt && [...dt.types].includes(TYPE_FICHIERS);

export function lireFichiers(dt: DataTransfer | null): string[] {
  try {
    const v = JSON.parse(dt?.getData(TYPE_FICHIERS) || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Zone de dépôt sous un point de l'écran (hors fantômes, qui ignorent le pointeur). */
export function depotSous(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-depot]");
  return el?.dataset.depot ?? null;
}
