"use client";
/**
 * L'économie branchée sur une session : primes versées sur les signaux, prélèvements et alertes des abonnements,
 * résiliation par courrier. Les décisions sont dans `economie.ts` ; ici, seulement le compte du profil, les bulles et
 * les courriers.
 */
import type { ActionRef, ContentPack } from "@/content/types";
import { formaterPork } from "./banque";
import { lireCompte, operer } from "./banqueStore";
import { demandeResiliation, preleverAbonnement, primesPour, resilier, souscrire, verserPrime } from "./economie";
import type { Rng } from "./rng";

interface Branchement {
  pack: ContentPack;
  profil: string;
  rng: Rng;
  str(key: string, vars?: Record<string, string | number>): string;
  pushToast(title: string, body: string): void;
  runAction(a: ActionRef): void;
  /** Émet un signal du système (pour Gruik et les distinctions). */
  signal(name: string): void;
}

/** Probabilité, à chaque minute, qu'Éric « détecte » un saucisson pour ses abonnés. */
const CHANCE_ALERTE = 1 / 12;

export function brancherEconomie(b: Branchement) {
  const { pack, profil, str } = b;
  const eco = pack.economie;
  const maintenant = () => new Date();
  const compte = () => lireCompte(profil);

  /** Un signal du système : primes et souscriptions. */
  function surSignal(nom: string) {
    if (nom.startsWith("economie:")) return;
    for (const p of primesPour(nom, eco.primes)) {
      if (!compte()) {
        b.pushToast(str("economie.prime.titre"), str("economie.tresor"));
        continue;
      }
      const r = operer(profil, (c) => verserPrime(c, p, maintenant()));
      if (!r?.ok) continue;
      b.pushToast(str("economie.prime.titre"), p.bulle.replace("{montant}", formaterPork(p.montant)));
      b.runAction({ type: "mail", id: "eco-primes" });
      b.signal("economie:prime");
    }
    for (const a of eco.abonnements) {
      if (a.declencheur !== nom || !compte() || compte()!.abonnements?.[a.id]) continue;
      operer(profil, (c) => ({ ok: true, compte: souscrire(c, a, maintenant()) }));
      b.runAction({ type: "mail", id: a.bienvenue });
    }
  }

  /** Battement (une fois par minute) : échéances des abonnements et alertes du « service ». */
  function tic() {
    for (const a of eco.abonnements) {
      const c = compte();
      if (!c?.abonnements?.[a.id]) continue;
      const p = preleverAbonnement(c, a, maintenant());
      if (p?.resultat === "preleve") {
        operer(profil, () => ({ ok: true, compte: p.compte }));
        b.pushToast(str("economie.preleve.titre"), str("economie.preleve", { montant: formaterPork(a.montant), libelle: a.libelle }));
        const rapport = a.rapports[p.n - 1];
        if (rapport) b.runAction({ type: "mail", id: rapport });
      } else if (p?.resultat === "impaye") b.pushToast(str("economie.preleve.titre"), str("economie.impaye"));
      else if (a.alertes.length && b.rng() < CHANCE_ALERTE) {
        const texte = a.alertes[Math.floor(b.rng() * a.alertes.length)]!;
        b.pushToast(str("economie.alerte.titre"), texte.replace("{distance}", String(100 + Math.floor(b.rng() * 300))));
      }
    }
  }

  /** Un courrier envoyé à un correspondant : une demande de résiliation y est prise au mot. */
  function surCourrier(correspondant: string, texte: string) {
    for (const a of eco.abonnements) {
      if (a.correspondant !== correspondant || !compte()?.abonnements?.[a.id] || !demandeResiliation(a, texte)) continue;
      operer(profil, (c) => ({ ok: true, compte: resilier(c, a.id) }));
      b.pushToast(str("economie.resilie.titre"), str("economie.resilie"));
    }
  }

  return { surSignal, tic, surCourrier };
}
