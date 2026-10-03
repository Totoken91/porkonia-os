/**
 * Assistant numérique : que dire, et quand. Logique pure. Il commente la première ouverture de chaque programme
 * (une question, réponse Oui / Non), certains signaux du système (une remarque), et glisse des conseils au repos.
 */
import type { AssistantSpec } from "@/content/types";
import { pick, type Rng } from "./rng";

export interface Bulle {
  cle: string;
  texte: string;
  /** Question : boutons Oui / Non. Sinon, une remarque qui s'efface seule. */
  question: boolean;
}

export type EvenementOs = { kind: "app-open"; app: string } | { kind: "signal"; name: string };

/** Signal couvert par une clé (« installeur:installe:* » couvre « installeur:installe:jambonjon »). */
export const signalCouvert = (cle: string, nom: string) => (cle.endsWith("*") ? nom.startsWith(cle.slice(0, -1)) : cle === nom);

/**
 * Réaction à un événement, ou null. Une seule question par programme et par session (`dejaVus` contient les clés
 * déjà prononcées) ; les remarques sur signaux peuvent revenir.
 */
export function reagir(spec: AssistantSpec, ev: EvenementOs, dejaVus: ReadonlySet<string>, rng: Rng): Bulle | null {
  if (ev.kind === "app-open") {
    const cle = `app:${ev.app}`;
    const textes = spec.parApp[ev.app];
    if (!textes?.length || dejaVus.has(cle)) return null;
    return { cle, texte: pick(rng, textes), question: true };
  }
  const k = Object.keys(spec.parSignal).find((c) => signalCouvert(c, ev.name));
  if (!k) return null;
  return { cle: `signal:${k}`, texte: spec.parSignal[k]!, question: false };
}

/** Conseil au hasard, jamais deux fois de suite le même. */
export function conseil(spec: AssistantSpec, rng: Rng, precedent?: string): Bulle {
  const choix = spec.conseils.filter((c) => c !== precedent);
  return { cle: "conseil", texte: pick(rng, choix.length ? choix : spec.conseils), question: false };
}

/** Durée d'affichage d'une remarque (ms) : le temps de la lire, à l'ancienne. */
export const dureeLecture = (texte: string) => Math.min(16000, Math.max(5000, texte.length * 70));
