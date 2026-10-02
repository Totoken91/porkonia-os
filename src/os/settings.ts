/** Réglages du citoyen (conservés dans le navigateur, jamais ailleurs). */
import type { ChoixEcran } from "./ecran";

export type Fond = "bouteille" | "lie" | "fondateur" | "emblemes";
export const FONDS: Fond[] = ["bouteille", "lie", "fondateur", "emblemes"];

export interface Settings {
  /** Rémanence du tube (lignes de balayage), 12–100. */
  crt: number;
  /** Volume de l'hymne, 12–100. */
  hymne: number;
  fond: Fond;
  rappels: boolean;
  /** Sons système (démarrage, alertes, arrêt). */
  sons: boolean;
  /** Délai avant l'écran de veille, en secondes (0 = jamais). */
  economiseur: number;
  /** Déplacer les fenêtres « en plein » (true) ou par leur seul contour (false). */
  contenuFenetres: boolean;
  /** Échelle entière imposée (pixels parfaitement nets, écran parfois plus petit). */
  pixelsNets: boolean;
  /** Afficher les fichiers cachés dans Mes documents et sur le bureau. */
  fichiersCaches: boolean;
  /** Format de l'écran : automatique (Poche sur téléphone), moniteur d'État ou PorkOS Poche. */
  affichage: ChoixEcran;
}

export const DELAIS_ECONOMISEUR = [0, 60, 120, 300];

export const DEFAULT_SETTINGS: Settings = { crt: 35, hymne: 70, fond: "bouteille", rappels: true, sons: true, economiseur: 120, contenuFenetres: true, pixelsNets: false, fichiersCaches: false, affichage: "auto" };

const KEY = "porkos.reglages";

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* navigation privée : les réglages restent en mémoire */
  }
}

const clampPct = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(12, Math.min(100, Math.round(v))) : d);

/** Toute valeur inconnue revient à la valeur recommandée. */
export function sanitizeSettings(v: unknown): Settings {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    crt: clampPct(o.crt, d.crt),
    hymne: clampPct(o.hymne, d.hymne),
    fond: FONDS.includes(o.fond as Fond) ? (o.fond as Fond) : d.fond,
    rappels: typeof o.rappels === "boolean" ? o.rappels : d.rappels,
    sons: typeof o.sons === "boolean" ? o.sons : d.sons,
    economiseur: DELAIS_ECONOMISEUR.includes(o.economiseur as number) ? (o.economiseur as number) : d.economiseur,
    contenuFenetres: typeof o.contenuFenetres === "boolean" ? o.contenuFenetres : d.contenuFenetres,
    pixelsNets: typeof o.pixelsNets === "boolean" ? o.pixelsNets : d.pixelsNets,
    fichiersCaches: typeof o.fichiersCaches === "boolean" ? o.fichiersCaches : d.fichiersCaches,
    affichage: o.affichage === "moniteur" || o.affichage === "poche" ? o.affichage : d.affichage,
  };
}
