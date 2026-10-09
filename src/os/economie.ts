/**
 * Économie de PorkOS : ce qui fait entrer et sortir les Pork$ du compte en dehors des achats. Primes civiques versées
 * sur des signaux du système, dividendes en nature, abonnements prélevés, prix indexés sur la Bourse du jambon.
 * Logique pure ; les montants et les textes sont dans le pack (`economie`), la date est fournie par l'appelant.
 */
import type { Abonnement, Dividende, Prime } from "@/content/types";
import { crediter, debiter, jourLocal, type Compte, type Compteur, type Resultat } from "./banque";

export type { Abonnement, Dividende, Prime };

export const couvre = (cle: string, signal: string) => (cle.endsWith("*") ? signal.startsWith(cle.slice(0, -1)) : cle === signal);

export const primesPour = (signal: string, primes: readonly Prime[]) => primes.filter((p) => couvre(p.signal, signal));

/* -------------------------------- Compteurs -------------------------------- */

const compteurDe = (c: Compte, id: string): Compteur => c.compteurs?.[id] ?? { jour: "", jour_n: 0, total: 0 };

/** Le compteur `id` autorise-t-il encore un passage aujourd'hui ? */
export function compteurLibre(c: Compte, id: string, limite: Prime["limite"], now: Date): boolean {
  const k = compteurDe(c, id);
  if (limite === "unique") return k.total === 0;
  return k.jour !== jourLocal(now) || k.jour_n < limite.parJour;
}

function compter(c: Compte, id: string, now: Date): Compte {
  const k = compteurDe(c, id);
  const jour = jourLocal(now);
  return { ...c, compteurs: { ...c.compteurs, [id]: { jour, jour_n: k.jour === jour ? k.jour_n + 1 : 1, total: k.total + 1 } } };
}

/* ---------------------------------- Primes ---------------------------------- */

/** Verse une prime si sa limite le permet (`plafond` sinon). */
export function verserPrime(c: Compte, p: Prime, now: Date): Resultat {
  const id = `prime:${p.id}`;
  if (!compteurLibre(c, id, p.limite, now)) return { ok: false, erreur: "plafond" };
  const r = crediter(c, p.montant, p.libelle, now);
  return r.ok ? { ok: true, compte: compter(r.compte, id, now) } : r;
}

/* -------------------------------- Dividendes -------------------------------- */

export type EtatDividende = "disponible" | "parts" | "deja";

export function etatDividende(c: Compte, d: Dividende, now: Date): EtatDividende {
  if ((c.portefeuille[d.titre]?.qte ?? 0) < d.seuil) return "parts";
  return compteurLibre(c, `dividende:${d.id}`, { parJour: 1 }, now) ? "disponible" : "deja";
}

/** Enregistre le dividende du jour ; la livraison du produit est à la charge de l'appelant. */
export function toucherDividende(c: Compte, d: Dividende, now: Date): Compte | null {
  return etatDividende(c, d, now) === "disponible" ? compter(c, `dividende:${d.id}`, now) : null;
}

/* ------------------------------- Abonnements -------------------------------- */

export function souscrire(c: Compte, a: Abonnement, now: Date): Compte {
  if (c.abonnements?.[a.id]) return c;
  const iso = now.toISOString();
  return { ...c, abonnements: { ...c.abonnements, [a.id]: { depuis: iso, dernier: iso, n: 0 } } };
}

export function resilier(c: Compte, id: string): Compte {
  if (!c.abonnements?.[id]) return c;
  const abonnements = { ...c.abonnements };
  delete abonnements[id];
  return { ...c, abonnements };
}

export const demandeResiliation = (a: Abonnement, texte: string) => new RegExp(a.resiliation, "i").test(texte);

const JOUR_MS = 86_400_000;

/**
 * Prélève une échéance si la période est écoulée (une seule à la fois : pas de rattrapage en rafale après une
 * longue absence). Rend null s'il n'y a rien à faire. Solde insuffisant : l'échéance est reportée (`impaye`).
 */
export function preleverAbonnement(c: Compte, a: Abonnement, now: Date): { compte: Compte; resultat: "preleve" | "impaye"; n: number } | null {
  const en = c.abonnements?.[a.id];
  if (!en || now.getTime() - Date.parse(en.dernier) < a.joursEntre * JOUR_MS) return null;
  const r = debiter(c, a.montant, a.libelle, now);
  if (!r.ok) return { compte: c, resultat: "impaye", n: en.n };
  const n = en.n + 1;
  return { compte: { ...r.compte, abonnements: { ...r.compte.abonnements, [a.id]: { ...en, dernier: now.toISOString(), n } } }, resultat: "preleve", n };
}

/* ------------------------------ Prix indexés ------------------------------- */

/**
 * Prix du jour d'un article indexé sur un titre : le prix de base suit le rapport entre le cours du jour et le cours
 * de référence du titre. Arrondi au Pork$, jamais sous 1.
 */
export const prixIndexe = (prixBase: number, coursDuJour: number, coursReference: number) =>
  Math.max(1, Math.round((prixBase * coursDuJour) / coursReference));
