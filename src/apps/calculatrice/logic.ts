/**
 * Calculatrice d'État : calculatrice de bureau à douze chiffres (pas un de plus). Logique pure.
 * Touches : chiffres, virgule, + − × ÷, =, %, ±, C (tout), CE (entrée), et « Douz. » qui multiplie par douze.
 */
export type Operateur = "+" | "-" | "*" | "/";
export type Touche = { t: "chiffre"; v: string } | { t: "virgule" } | { t: "op"; v: Operateur } | { t: "egal" } | { t: "c" } | { t: "ce" } | { t: "signe" } | { t: "pourcent" } | { t: "douzaine" };

export interface Calcul {
  /** Nombre affiché, en texte (saisie en cours ou résultat). */
  affichage: string;
  /** Opérande gauche en attente d'un opérateur. */
  memoire: number | null;
  op: Operateur | null;
  /** La prochaine frappe de chiffre commence un nouveau nombre. */
  neuf: boolean;
  /** Erreur affichée (division par zéro, dépassement) ; toute touche sauf C est ignorée. */
  erreur: "table-vide" | "trop-gros" | null;
}

export const CHIFFRES = 12;
export const calculNeuf = (): Calcul => ({ affichage: "0", memoire: null, op: null, neuf: true, erreur: null });

const valeur = (c: Calcul) => Number(c.affichage);

/** Met un nombre en forme sur douze chiffres au plus ; `null` s'il ne tient pas. */
export function formater(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) >= 10 ** CHIFFRES) return null;
  const entiers = Math.max(1, Math.floor(Math.abs(n)).toString().length);
  const decimales = Math.max(0, CHIFFRES - entiers);
  const s = Number(n.toFixed(decimales)).toString();
  return s === "-0" ? "0" : s;
}

function calculer(a: number, b: number, op: Operateur): number | "table-vide" {
  if (op === "/" && b === 0) return "table-vide";
  return op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
}

function resultat(c: Calcul, n: number | "table-vide"): Calcul {
  if (n === "table-vide") return { ...calculNeuf(), affichage: "0", erreur: "table-vide" };
  const s = formater(n);
  if (s === null) return { ...calculNeuf(), erreur: "trop-gros" };
  return { ...c, affichage: s, neuf: true, erreur: null };
}

export function appuyer(c: Calcul, k: Touche): Calcul {
  if (k.t === "c") return calculNeuf();
  if (c.erreur) return c;
  switch (k.t) {
    case "chiffre": {
      if (c.neuf) return { ...c, affichage: k.v, neuf: false };
      if (c.affichage.replace(/[-.]/g, "").length >= CHIFFRES) return c;
      return { ...c, affichage: c.affichage === "0" ? k.v : c.affichage + k.v };
    }
    case "virgule":
      if (c.neuf) return { ...c, affichage: "0.", neuf: false };
      return c.affichage.includes(".") ? c : { ...c, affichage: `${c.affichage}.` };
    case "ce":
      return { ...c, affichage: "0", neuf: true };
    case "signe":
      return c.affichage === "0" ? c : { ...c, affichage: c.affichage.startsWith("-") ? c.affichage.slice(1) : `-${c.affichage}` };
    case "pourcent":
      return resultat(c, c.memoire !== null ? (c.memoire * valeur(c)) / 100 : valeur(c) / 100);
    case "douzaine":
      return resultat(c, valeur(c) * 12);
    case "op": {
      // Enchaîner « 2 + 3 × » calcule d'abord 2 + 3, comme les calculatrices de bureau.
      if (c.op !== null && c.memoire !== null && !c.neuf) {
        const r = resultat(c, calculer(c.memoire, valeur(c), c.op));
        return r.erreur ? r : { ...r, memoire: valeur(r), op: k.v, neuf: true };
      }
      return { ...c, memoire: valeur(c), op: k.v, neuf: true };
    }
    case "egal": {
      if (c.op === null || c.memoire === null) return { ...c, neuf: true };
      const r = resultat(c, calculer(c.memoire, valeur(c), c.op));
      return { ...r, memoire: null, op: null };
    }
  }
}

/** Affichage à la française : virgule décimale. */
export const enFrancais = (s: string) => s.replace(".", ",");

/** Remarque de l'afficheur pour certains résultats (clés de textes du pack), ou null. */
export function remarque(c: Calcul): string | null {
  if (c.erreur) return `calc.${c.erreur}`;
  if (!c.neuf) return null;
  const n = Number(c.affichage);
  if (n === 11) return "calc.onze";
  if (n === 12) return "calc.douze";
  if (n === 7) return "calc.sept";
  return null;
}
