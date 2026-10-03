/**
 * Ordonnanceur d'événements système (pop-ups, pubs, mises à jour, rappels) — logique pure.
 * Les règles viennent du pack de contenu ; le temps est celui écoulé depuis la connexion.
 */
import type { ActionRef, EventRule } from "@/content/types";
import type { Rng } from "./rng";
import { correspond } from "./distinctions";

export interface RuleState {
  fired: Record<string, number>;
  /** Prochaine échéance (ms depuis la connexion) des règles périodiques. */
  nextAt: Record<string, number>;
}

export const emptyRuleState = (): RuleState => ({ fired: {}, nextAt: {} });

export type SchedulerInput =
  | { kind: "tick"; elapsed: number }
  | { kind: "app-open"; app: string; elapsed: number }
  | { kind: "signal"; name: string; elapsed: number };

/** Renvoie les actions à exécuter et le nouvel état. Ne fait aucun effet de bord. */
/**
 * `sessions` : numéro de la session en cours pour ce citoyen (1 = première). Une règle avec `apresSessions`
 * ne joue qu'à partir de cette session-là ; avec `jusquaSessions`, que jusqu'à celle-là. Un signal de règle en `nom*` accepte tout signal qui commence par `nom`.
 */
export function schedule(rules: EventRule[], st: RuleState, input: SchedulerInput, rng: Rng, settings: Record<string, unknown> = {}, sessions = 1): { actions: { rule: string; action: ActionRef }[]; state: RuleState } {
  const fired = { ...st.fired };
  const nextAt = { ...st.nextAt };
  const actions: { rule: string; action: ActionRef }[] = [];
  const fire = (r: EventRule) => {
    fired[r.id] = (fired[r.id] ?? 0) + 1;
    actions.push({ rule: r.id, action: r.action });
  };
  for (const r of rules) {
    if (r.max !== undefined && (fired[r.id] ?? 0) >= r.max) continue;
    if (r.unlessSetting && settings[r.unlessSetting] === false) continue;
    if (r.apresSessions !== undefined && sessions < r.apresSessions) continue;
    if (r.jusquaSessions !== undefined && sessions > r.jusquaSessions) continue;
    const t = r.trigger;
    if (input.kind === "tick" && t.type === "login") {
      if (!fired[r.id] && input.elapsed >= t.delay) fire(r);
    } else if (input.kind === "tick" && t.type === "interval") {
      const due = nextAt[r.id] ?? t.startAfter;
      if (input.elapsed >= due) {
        fire(r);
        nextAt[r.id] = input.elapsed + t.every + Math.round((rng() * 2 - 1) * t.jitter);
      } else if (nextAt[r.id] === undefined) nextAt[r.id] = due;
    } else if (input.kind === "app-open" && t.type === "app-open" && t.app === input.app) {
      fire(r);
    } else if (input.kind === "signal" && t.type === "signal" && correspond(t.name, input.name)) {
      fire(r);
    }
  }
  return { actions, state: { fired, nextAt } };
}
