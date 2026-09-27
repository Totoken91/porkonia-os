/**
 * Distinctions civiques (succès) : ce que le citoyen a accompli sur le poste, conservé dans le navigateur.
 * Logique pure : on observe les signaux et les ouvertures d'applis, on rend les nouvelles distinctions.
 */
import type { Distinction } from "@/content/types";

export interface EtatDistinctions {
  /** Distinctions obtenues → date de remise (ISO). */
  obtenues: Record<string, string>;
  /** Compteurs des distinctions qui demandent plusieurs fois le même geste. */
  compteurs: Record<string, number>;
  /** Applis déjà ouvertes au moins une fois. */
  applis: string[];
}

export type Observation = { kind: "signal"; name: string } | { kind: "app-open"; app: string };

export const etatVide = (): EtatDistinctions => ({ obtenues: {}, compteurs: {}, applis: [] });

/** `nom*` accepte tout signal qui commence par `nom`. */
export const correspond = (motif: string, nom: string) => (motif.endsWith("*") ? nom.startsWith(motif.slice(0, -1)) : motif === nom);

/**
 * Observe un geste. `applisDuPoste` : les applis à avoir toutes ouvertes pour « toutes-applis ».
 * Rend le nouvel état et les distinctions décernées par ce geste, dans l'ordre du pack.
 */
export function observer(defs: Distinction[], etat: EtatDistinctions, obs: Observation, applisDuPoste: string[], date: string): { etat: EtatDistinctions; nouvelles: Distinction[] } {
  const obtenues = { ...etat.obtenues };
  const compteurs = { ...etat.compteurs };
  const applis = obs.kind === "app-open" && !etat.applis.includes(obs.app) ? [...etat.applis, obs.app] : etat.applis;
  const nouvelles: Distinction[] = [];
  const decerner = (d: Distinction) => {
    obtenues[d.id] = date;
    nouvelles.push(d);
  };
  for (const d of defs) {
    if (obtenues[d.id]) continue;
    const t = d.trigger;
    if (t.type === "signal" && obs.kind === "signal" && correspond(t.name, obs.name)) {
      const n = (compteurs[d.id] ?? 0) + 1;
      if (n >= (t.fois ?? 1)) {
        delete compteurs[d.id];
        decerner(d);
      } else compteurs[d.id] = n;
    } else if (t.type === "app-open" && obs.kind === "app-open" && t.app === obs.app) decerner(d);
    else if (t.type === "toutes-applis" && applisDuPoste.length && applisDuPoste.every((a) => applis.includes(a))) decerner(d);
  }
  // La dernière : toutes les autres, obtenues à l'instant ou avant.
  for (const d of defs) {
    if (obtenues[d.id] || d.trigger.type !== "toutes-distinctions") continue;
    if (defs.every((x) => x.id === d.id || x.trigger.type === "toutes-distinctions" || obtenues[x.id])) decerner(d);
  }
  return { etat: { obtenues, compteurs, applis }, nouvelles };
}

/** Rang atteint : le dernier seuil franchi. */
export function rang(rangs: { seuil: number; titre: string }[], obtenues: number): string {
  let titre = rangs[0]?.titre ?? "";
  for (const r of rangs) if (obtenues >= r.seuil) titre = r.titre;
  return titre;
}

/** Relit un état conservé : tout ce qui est inconnu ou mal formé est oublié. */
export function sanitizeDistinctions(v: unknown, defs: Distinction[]): EtatDistinctions {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const ids = new Set(defs.map((d) => d.id));
  const obtenues: Record<string, string> = {};
  const compteurs: Record<string, number> = {};
  if (o.obtenues && typeof o.obtenues === "object")
    for (const [k, d] of Object.entries(o.obtenues)) if (ids.has(k) && typeof d === "string") obtenues[k] = d;
  if (o.compteurs && typeof o.compteurs === "object")
    for (const [k, n] of Object.entries(o.compteurs)) if (ids.has(k) && typeof n === "number" && Number.isFinite(n) && n > 0) compteurs[k] = Math.floor(n);
  const applis = Array.isArray(o.applis) ? o.applis.filter((a): a is string => typeof a === "string") : [];
  return { obtenues, compteurs, applis };
}
