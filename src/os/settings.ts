/** Réglages du citoyen (conservés dans le navigateur, jamais ailleurs). */
import type { ChoixEcran } from "./ecran";
import { cle, cleSansProfil } from "./stockage";

export type FondUni = "bouteille" | "lie" | "fondateur" | "emblemes";
/** Fond uni du système, ou image d'un pack (« image:<id> », voir `wallpaper.images`). */
export type Fond = FondUni | `image:${string}`;
export const FONDS: FondUni[] = ["bouteille", "lie", "fondateur", "emblemes"];
const estFond = (v: unknown): v is Fond => FONDS.includes(v as FondUni) || (typeof v === "string" && /^image:[a-z0-9-]{1,40}$/.test(v));

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
  /** Assistant numérique (Gruik) au coin du bureau. */
  assistant: boolean;
}

export const DELAIS_ECONOMISEUR = [0, 60, 120, 300];

export const DEFAULT_SETTINGS: Settings = { crt: 35, hymne: 70, fond: "bouteille", rappels: true, sons: true, economiseur: 120, contenuFenetres: true, pixelsNets: false, fichiersCaches: false, affichage: "auto", assistant: true };


/** Réglages d'un profil ; sans profil (avant la connexion), la clé commune du poste. */
const cleReglages = (profil?: string) => (profil ? cle("reglages", { profil }) : cleSansProfil("reglages"));

export function loadSettings(user?:string): Settings {
  try {
    const raw = window.localStorage.getItem(cleReglages(user));
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings,user?:string): void {
  try {
    window.localStorage.setItem(cleReglages(user), JSON.stringify(s));
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
    fond: estFond(o.fond) ? o.fond : d.fond,
    rappels: typeof o.rappels === "boolean" ? o.rappels : d.rappels,
    sons: typeof o.sons === "boolean" ? o.sons : d.sons,
    economiseur: DELAIS_ECONOMISEUR.includes(o.economiseur as number) ? (o.economiseur as number) : d.economiseur,
    contenuFenetres: typeof o.contenuFenetres === "boolean" ? o.contenuFenetres : d.contenuFenetres,
    pixelsNets: typeof o.pixelsNets === "boolean" ? o.pixelsNets : d.pixelsNets,
    fichiersCaches: typeof o.fichiersCaches === "boolean" ? o.fichiersCaches : d.fichiersCaches,
    affichage: o.affichage === "moniteur" || o.affichage === "poche" ? o.affichage : d.affichage,
    assistant: typeof o.assistant === "boolean" ? o.assistant : d.assistant,
  };
}
