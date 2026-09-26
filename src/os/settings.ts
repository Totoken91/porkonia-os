/** Réglages du citoyen (conservés dans le navigateur, jamais ailleurs). */
export type Fond = "affiche" | "mire" | "trame";

export interface Settings {
  /** Intensité du signal CRT, 12–100. */
  crt: number;
  /** Volume de l'hymne, 12–100. */
  hymne: number;
  fond: Fond;
  rappels: boolean;
}

export const DEFAULT_SETTINGS: Settings = { crt: 60, hymne: 70, fond: "affiche", rappels: true };

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
    fond: o.fond === "mire" || o.fond === "trame" || o.fond === "affiche" ? o.fond : d.fond,
    rappels: typeof o.rappels === "boolean" ? o.rappels : d.rappels,
  };
}
