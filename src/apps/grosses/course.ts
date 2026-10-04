/**
 * Course de Grosses : six cochonnes, des cotes, une piste de 100 mètres. La course est entièrement calculée à
 * l'avance (déterministe pour une graine) : l'interface n'a qu'à rejouer les positions image par image.
 * Les noms et les caractéristiques sont fournis par le pack ; ici, seulement la mécanique.
 */
import { makeRng, type Rng } from "@/os/rng";

export interface Cochon {
  id: string;
  nom: string;
  couleur: string;
  /** Caractéristiques de 0 à 1, visibles dans le paddock. */
  vitesse: number;
  endurance: number;
  sprint: number;
  /** Humeur du jour, cachée : un peu de hasard que la cote ne connaît pas. */
  humeur: number;
}

export const LONGUEUR = 100;
export const IMAGES_PAR_SECONDE = 30;
const MAX_IMAGES = IMAGES_PAR_SECONDE * 40;

export interface Resultat {
  /** positions[i][k] : mètres parcourus par le cochon k à l'image i (plafonnés à la ligne d'arrivée). */
  positions: number[][];
  /** Indices des cochons dans l'ordre d'arrivée. */
  classement: number[];
  /** Instant d'arrivée de chaque cochon (en images, fractionnaire). */
  arrivee: number[];
}

/** Tire `n` cochons parmi les noms et couleurs du pack ; les caractéristiques sont différentes à chaque course. */
export function composer(noms: readonly { nom: string; couleur: string }[], graine: number, n = 6): Cochon[] {
  const rng = makeRng(graine);
  const pris = [...noms];
  const out: Cochon[] = [];
  for (let k = 0; k < n && pris.length; k++) {
    const [p] = pris.splice(Math.floor(rng() * pris.length), 1);
    out.push({ id: `c${k}`, nom: p!.nom, couleur: p!.couleur, vitesse: 0.3 + rng() * 0.7, endurance: 0.25 + rng() * 0.75, sprint: 0.25 + rng() * 0.75, humeur: (rng() - 0.5) * 2 });
  }
  return out;
}

/** Note de forme (0–5 étoiles) lue dans le paddock : la moyenne des caractéristiques visibles. */
export const etoiles = (c: Cochon) => Math.max(1, Math.min(5, Math.round(((c.vitesse * 2 + c.endurance + c.sprint) / 4) * 5)));

export function simuler(cochons: readonly Cochon[], graine: number, avecHumeur = true): Resultat {
  const rng: Rng = makeRng(graine ^ 0x9e3779b9);
  const n = cochons.length;
  const pos = new Array<number>(n).fill(0);
  const vit = new Array<number>(n).fill(0);
  const gene = new Array<number>(n).fill(0);
  const arrivee = new Array<number>(n).fill(-1);
  const positions: number[][] = [pos.slice()];
  for (let i = 1; i < MAX_IMAGES; i++) {
    for (let k = 0; k < n; k++) {
      if (arrivee[k]! >= 0) continue;
      const c = cochons[k]!;
      const prog = pos[k]! / LONGUEUR;
      let cible = 6.4 + c.vitesse * 2.2 + (avecHumeur ? c.humeur * 0.45 : 0);
      if (prog > 0.55) cible *= 1 - (1 - c.endurance) * 0.32 * Math.min(1, (prog - 0.55) / 0.35);
      if (prog > 0.8) cible *= 1 + c.sprint * 0.22;
      // Accidents de parcours : un faux pas ralentit, un coup de groin relance.
      if (gene[k]! > 0) {
        gene[k] = gene[k]! - 1;
        cible *= gene[k]! > 0 ? 0.45 : 1;
      } else if (rng() < 0.0032) gene[k] = 14 + Math.floor(rng() * 14);
      else if (rng() < 0.0025) vit[k] = vit[k]! + 2.2;
      vit[k] = vit[k]! + (cible - vit[k]!) * 0.12 + (rng() - 0.5) * 0.55;
      pos[k] = pos[k]! + Math.max(0.5, vit[k]!) / IMAGES_PAR_SECONDE;
      if (pos[k]! >= LONGUEUR) {
        // Instant d'arrivée fractionnaire : départage deux cochons arrivés dans la même image.
        const avant = pos[k]! - Math.max(0.5, vit[k]!) / IMAGES_PAR_SECONDE;
        arrivee[k] = i - 1 + (LONGUEUR - avant) / (pos[k]! - avant);
        pos[k] = LONGUEUR;
      }
    }
    positions.push(pos.slice());
    if (arrivee.every((a) => a >= 0)) break;
  }
  // Course interminable (jamais arrivée) : on classe d'après la distance parcourue.
  const classement = [...Array(n).keys()].sort((a, b) => {
    const ta = arrivee[a]! >= 0 ? arrivee[a]! : 1e9 - pos[a]!;
    const tb = arrivee[b]! >= 0 ? arrivee[b]! : 1e9 - pos[b]!;
    return ta - tb;
  });
  return { positions, classement, arrivee };
}

export interface Cotes {
  gagnant: number[];
  place: number[];
}

/** Marge de l'État sur les paris. */
export const TAXE = 0.12;

/**
 * Cotes de la maison : on rejoue la course des centaines de fois sans l'humeur (que le bookmaker ignore), on compte
 * les victoires et les podiums, et on retire la taxe. Déterministe.
 */
export function cotes(cochons: readonly Cochon[], essais = 360): Cotes {
  const n = cochons.length;
  const vic = new Array<number>(n).fill(0);
  const pod = new Array<number>(n).fill(0);
  for (let e = 0; e < essais; e++) {
    const r = simuler(cochons, 7919 + e * 31, false);
    vic[r.classement[0]!] = vic[r.classement[0]!]! + 1;
    for (const k of r.classement.slice(0, 3)) pod[k] = pod[k]! + 1;
  }
  const arrondi = (x: number) => Math.round(x * 10) / 10;
  const lisse = (c: number) => (c + 0.6) / (essais + 0.6 * n);
  return {
    gagnant: vic.map((c) => Math.min(60, Math.max(1.2, arrondi((1 - TAXE) / lisse(c))))),
    place: pod.map((c) => Math.min(20, Math.max(1.1, arrondi(((1 - TAXE) * 3) / (lisse(c) * 3) / 1.9)))),
  };
}

export type TypePari = "gagnant" | "place";
export interface Pari {
  type: TypePari;
  cochon: number;
  mise: number;
}

/** Somme rendue au parieur (mise comprise), 0 si le pari est perdu. */
export function gain(pari: Pari, classement: readonly number[], c: Cotes): number {
  const rang = classement.indexOf(pari.cochon);
  if (pari.type === "gagnant") return rang === 0 ? Math.floor(pari.mise * c.gagnant[pari.cochon]!) : 0;
  return rang >= 0 && rang < 3 ? Math.floor(pari.mise * c.place[pari.cochon]!) : 0;
}

export const MISES = [5, 10, 25, 50, 100];
