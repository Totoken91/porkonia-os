"use client";
/**
 * Cave du citoyen partagée : le site Porkomazon y commande, le moniteur y pose la choppe, la session y annonce les
 * livraisons. Magasin hors de React, conservé dans ce navigateur ; un battement d'une seconde livre les colis arrivés
 * tant qu'un composant l'écoute (au chargement, les colis arrivés pendant l'absence sont livrés d'un coup).
 */
import { useSyncExternalStore } from "react";
import { cave, expedier, livrer, sanitize, servir, type Cave } from "./biere";

const CLE = "porkos.biere";
let etat: Cave = cave();
let lu = false;
const abonnes = new Set<() => void>();
const livraisons = new Set<(n: number) => void>();
let battement: ReturnType<typeof setInterval> | null = null;

function ecrire() {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    /* cave non retenue */
  }
}

function prevenir() {
  for (const f of abonnes) f();
}

function relever() {
  const r = livrer(etat, Date.now());
  if (!r.arrives) return;
  etat = r.cave;
  ecrire();
  prevenir();
  for (const f of livraisons) f(r.arrives);
}

function lire() {
  if (lu || typeof window === "undefined") return;
  lu = true;
  try {
    etat = sanitize(JSON.parse(window.localStorage.getItem(CLE) ?? "null"));
  } catch {
    etat = cave();
  }
  // Les colis arrivés pendant l'absence sont déjà là, sans fanfare.
  const r = livrer(etat, Date.now());
  etat = r.cave;
}

function abonner(f: () => void) {
  lire();
  abonnes.add(f);
  if (!battement) battement = setInterval(relever, 1000);
  return () => {
    abonnes.delete(f);
    if (!abonnes.size && battement) {
      clearInterval(battement);
      battement = null;
    }
  };
}

/** Commande : le colis part, il arrivera dans `delaiMs`. Rend false si la commande est refusée. */
export function commanderBieres(qte: number, mode: string, delaiMs: number): boolean {
  lire();
  const c = expedier(etat, qte, mode, delaiMs, Date.now());
  if (!c) return false;
  etat = c;
  ecrire();
  prevenir();
  return true;
}

/** Prend une bière dans la cave pour la boire. */
export function prendreBiere(): boolean {
  lire();
  const c = servir(etat);
  if (!c) return false;
  etat = c;
  ecrire();
  prevenir();
  return true;
}

/** Abonnement aux livraisons (nombre de bières arrivées). Rend la fonction de désabonnement. */
export function surLivraison(f: (n: number) => void) {
  livraisons.add(f);
  return () => void livraisons.delete(f);
}

const cave_vide = cave();
export const useCave = (): Cave =>
  useSyncExternalStore(
    abonner,
    () => (lu ? etat : (lire(), etat)),
    () => cave_vide,
  );
