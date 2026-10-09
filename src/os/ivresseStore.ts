"use client";
/**
 * Ébriété du citoyen, partagée par tout PorkOS : le moniteur (parent de la session) et les applis la lisent au même
 * endroit. Un magasin hors de React, conservé dans ce navigateur ; un battement commun d'une seconde fait redescendre
 * le niveau tant qu'un composant l'écoute.
 */
import { useSyncExternalStore } from "react";
import { boire, niveau, sanitize, SEUIL_WARP, sobre, type Ebriete } from "./ivresse";
import {profilActif,surProfil} from './profilActif';
import { cle } from './stockage';

let etat: Ebriete = sobre();
let lu = false;
let v = 0;
const abonnes = new Set<() => void>();
const warps = new Set<() => void>();
let battement: ReturnType<typeof setInterval> | null = null;

function lire() {
  if (lu || typeof window === "undefined") return;
  lu = true;
  const id=profilActif();if(!id){etat=sobre();v=0;return;}
  try {
    etat = sanitize(JSON.parse(window.localStorage.getItem(cle('ivresse',{profil:id})) ?? "null"), Date.now());
  } catch {
    etat = sobre();
  }
  v = niveau(etat, Date.now());
}

function ecrire() {
  try {
    const id=profilActif();if(id)window.localStorage.setItem(cle('ivresse',{profil:id}), JSON.stringify(etat));
  } catch {
    /* ivresse non retenue */
  }
}

function prevenir() {
  for (const f of abonnes) f();
}

/** Niveau courant, arrondi au centième pour ne pas réveiller React à chaque fraction. */
function tic() {
  const n = Math.round(niveau(etat, Date.now()) * 100) / 100;
  if (n !== v) {
    v = n;
    prevenir();
  }
}

function abonner(f: () => void) {
  lire();
  abonnes.add(f);
  if (!battement) battement = setInterval(tic, 1000);
  return () => {
    abonnes.delete(f);
    if (!abonnes.size && battement) {
      clearInterval(battement);
      battement = null;
    }
  };
}

/** Un verre (ou plus) de plus. Rend le nouveau niveau. */
export function boireVerres(verres = 1): number {
  if(!profilActif())return 0;
  lire();
  const avant = niveau(etat, Date.now());
  etat = boire(etat, Date.now(), verres);
  ecrire();
  v = Math.round(niveau(etat, Date.now()) * 100) / 100;
  prevenir();
  if (avant < SEUIL_WARP && v >= SEUIL_WARP) for (const f of warps) f();
  return v;
}

/** Abonnement au franchissement du seuil où l'écran se met à déformer franchement. */
export function surWarp(f: () => void) {
  warps.add(f);
  return () => void warps.delete(f);
}

/** Dégrisement immédiat (pour les tests et le mode secours). */
export function degriser() {
  etat = sobre();
  ecrire();
  v = 0;
  prevenir();
}

export const niveauActuel = () => {
  lire();
  return v;
};

/** Niveau d'ébriété en verres, qui se met à jour tout seul. */
export function useIvresse(): number {
  return useSyncExternalStore(abonner, () => (lu ? v : (lire(), v)), () => 0);
}
surProfil(()=>{lu=false;etat=sobre();v=0;lire();prevenir();});
