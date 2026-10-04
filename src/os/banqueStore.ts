"use client";
/**
 * Compte en banque du citoyen, conservé dans ce navigateur (une clé par utilisateur). Partagé entre le site de la
 * banque, la Course de Grosses et la buvette : toutes les opérations passent par `operer`, qui applique une
 * fonction pure de `banque.ts` et enregistre le résultat.
 */
import { useSyncExternalStore } from "react";
import { sanitize, type Compte, type Resultat } from "./banque";

const cle = (u: string) => `porkos.banque.${u}`;
const comptes = new Map<string, Compte | null>();
const abonnes = new Set<() => void>();

function charger(u: string): Compte | null {
  if (comptes.has(u)) return comptes.get(u) ?? null;
  let c: Compte | null = null;
  try {
    c = sanitize(JSON.parse(window.localStorage.getItem(cle(u)) ?? "null"));
  } catch {
    c = null;
  }
  comptes.set(u, c);
  return c;
}

export function enregistrer(u: string, c: Compte | null) {
  comptes.set(u, c);
  try {
    if (c) window.localStorage.setItem(cle(u), JSON.stringify(c));
    else window.localStorage.removeItem(cle(u));
  } catch {
    /* compte non retenu */
  }
  for (const f of abonnes) f();
}

/** Applique une opération pure au compte de l'utilisateur ; rend le résultat (le compte est enregistré si ok). */
export function operer(u: string, op: (c: Compte) => Resultat): Resultat | null {
  const c = charger(u);
  if (!c) return null;
  const r = op(c);
  if (r.ok) enregistrer(u, r.compte);
  return r;
}

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => void abonnes.delete(f);
};

/** Le compte de l'utilisateur (null : pas encore ouvert), à jour quand il change ailleurs. */
export function useCompte(u: string): Compte | null {
  return useSyncExternalStore(
    abonner,
    () => charger(u),
    () => null,
  );
}
