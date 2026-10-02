/**
 * Format de l'écran du poste. Sur un vrai écran, le moniteur d'État 14" (800×600 dans son boîtier) ; sur un
 * téléphone ou une fenêtre trop étroite, le PorkOS Poche : l'écran épouse l'appareil, à l'échelle 1, pour que la
 * police pixel reste nette et que tout tombe sous le doigt. Pure, testée.
 */
export type ModeEcran = "moniteur" | "poche";
export type ChoixEcran = "auto" | ModeEcran;

export interface Ecran {
  mode: ModeEcran;
  /** Taille logique de l'écran (px CSS). */
  w: number;
  h: number;
  /** Hauteur réservée en haut (barre d'état du Poche) et en bas (barre des tâches ou de navigation). */
  haut: number;
  bas: number;
}

export const MONITEUR = { w: 800, h: 600 };
/** Barre des tâches du moniteur. */
export const BARRE_TACHES = 28;
/** Barre d'état et barre de navigation du Poche (cibles tactiles d'au moins 44 px). */
export const BARRE_ETAT = 26;
export const BARRE_NAV = 50;
/** En dessous, le moniteur réduit deviendrait illisible : on passe au Poche. */
const SEUIL = { w: 720, h: 500 };
const MINI = 300;

export function choisirEcran(vw: number, vh: number, choix: ChoixEcran = "auto"): Ecran {
  const mode: ModeEcran = choix !== "auto" ? choix : vw < SEUIL.w || vh < SEUIL.h ? "poche" : "moniteur";
  if (mode === "moniteur") return { mode, ...MONITEUR, haut: 0, bas: BARRE_TACHES };
  return { mode, w: Math.max(MINI, Math.floor(vw)), h: Math.max(MINI, Math.floor(vh)), haut: BARRE_ETAT, bas: BARRE_NAV };
}

/** Lit un choix d'écran imposé dans l'adresse (?ecran=poche|moniteur), sinon `auto`. */
export function choixDansAdresse(search: string): ChoixEcran {
  const v = new URLSearchParams(search).get("ecran");
  return v === "poche" || v === "moniteur" ? v : "auto";
}

/**
 * Échelle d'une fenêtre « habillée » (l'appli dessine son propre boîtier, de taille fixe) dans la zone utile du
 * Poche : on la réduit pour qu'elle tienne, et on l'agrandit un peu si la place le permet (sans dépasser `max`).
 */
export function echelleHabillage(boitier: { w: number; h: number }, zone: { w: number; h: number }, max = 1.5): number {
  const k = Math.min(zone.w / boitier.w, zone.h / boitier.h, max);
  return Math.max(0.3, Math.floor(k * 100) / 100);
}
