"use client";
/** Stocks de provisions indépendants, conservés dans le navigateur. La même logique
 * de colis sert à la bière et au saucisson, avec une clé et des abonnements distincts. */
import { useSyncExternalStore } from "react";
import { cave, expedier, livrer, sanitize, servir, type Cave } from "./biere";
import {profilActif,surProfil,cleProfil} from './profilActif';

export function creerStock(CLE: string) {
  let etat: Cave = cave();
  let lu = false;
  const abonnes = new Set<() => void>();
  const livraisons = new Set<(n: number) => void>();
  let battement: ReturnType<typeof setInterval> | null = null;

  function ecrire() {
    try {
      const id=profilActif();if(id)window.localStorage.setItem(cleProfil(CLE,id), JSON.stringify(etat));
    } catch {
      /* stock non retenu */
    }
  }

  function prevenir() {
    for (const f of abonnes) f();
  }

  function relever() {
    if(!profilActif())return;
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
    const id=profilActif();if(!id){etat=cave();return;}
    try {
      etat = sanitize(JSON.parse(window.localStorage.getItem(cleProfil(CLE,id)) ?? "null"));
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
  function commander(qte: number, mode: string, delaiMs: number): boolean {
    if(!profilActif())return false;
    lire();
    const c = expedier(etat, qte, mode, delaiMs, Date.now());
    if (!c) return false;
    etat = c;
    ecrire();
    prevenir();
    return true;
  }

  /** Prend une provision livrée dans le stock. */
  function prendre(): boolean {
    if(!profilActif())return false;
    lire();
    const c = servir(etat);
    if (!c) return false;
    etat = c;
    ecrire();
    prevenir();
    return true;
  }

  /** Abonnement aux livraisons (nombre de provisions arrivées). Rend la fonction de désabonnement. */
  function surLivraison(f: (n: number) => void) {
    livraisons.add(f);
    return () => void livraisons.delete(f);
  }

  const cave_vide = cave();
  surProfil(()=>{lu=false;etat=cave();lire();prevenir();});
  const useStock = (): Cave =>
    useSyncExternalStore(
      abonner,
      () => (lu ? etat : (lire(), etat)),
      () => cave_vide,
    );

  return {commander, prendre, surLivraison, useStock};
}
