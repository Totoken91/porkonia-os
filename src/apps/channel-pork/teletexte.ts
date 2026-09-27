/**
 * PorkTexte, le télétexte de Canal 1 : pages de 40 colonnes, composées à partir du pack (grilles des chaînes,
 * météo de la mousse, bourse du jambon, dépêches, petites annonces) ou de lignes écrites. Logique pure.
 */
import type { ContentPack, TeletextePage } from "@/content/types";
import { cours, meteo } from "@/apps/navigateur/portail";
import { DECALAGE, live, programLength } from "./timeline";

export const COLONNES = 40;

export type Couleur = "w" | "y" | "c" | "g" | "r" | "m" | "b";

export interface Ligne {
  texte: string;
  couleur?: Couleur;
  /** Lien vers une page (numéro cliquable). */
  page?: number;
  /** Double hauteur (titres). */
  double?: boolean;
}

export interface PageRendue {
  numero: number;
  titre: string;
  lignes: Ligne[];
}

/** Coupe un texte en lignes d'au plus `largeur` colonnes, sans couper les mots (sauf s'ils sont trop longs). */
export function couper(texte: string, largeur = COLONNES - 2): string[] {
  const out: string[] = [];
  for (const para of texte.split("\n")) {
    let ligne = "";
    for (const mot of para.split(/\s+/).filter(Boolean)) {
      if (!ligne) ligne = mot;
      else if (ligne.length + 1 + mot.length <= largeur) ligne += ` ${mot}`;
      else {
        out.push(ligne);
        ligne = mot;
      }
      while (ligne.length > largeur) {
        out.push(ligne.slice(0, largeur));
        ligne = ligne.slice(largeur);
      }
    }
    out.push(ligne);
  }
  return out;
}

/** « Libellé ........ 101 » sur toute la largeur. */
export function pointilles(libelle: string, droite: string, largeur = COLONNES - 2): string {
  const place = largeur - droite.length - 1;
  const g = libelle.length > place - 1 ? `${libelle.slice(0, place - 2)}…` : libelle;
  return `${g} ${".".repeat(Math.max(0, place - g.length - 1))} ${droite}`;
}

/** Tronque proprement à `n` colonnes, avec points de suspension. */
export const tronquer = (s: string, n = COLONNES - 1) => (s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`);

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Ligne d'en-tête : numéro de page, nom du service, date et heure. */
export function entete(nom: string, numero: number | string, d: Date): string {
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const heure = `${hhmm(d)}:${String(d.getSeconds()).padStart(2, "0")}`;
  const gauche = `P${numero}  ${nom}`;
  const droite = `${date} ${heure}`;
  return `${gauche}${" ".repeat(Math.max(1, COLONNES - gauche.length - droite.length))}${droite}`;
}

function source(pack: ContentPack, p: TeletextePage, d: Date): Ligne[] {
  switch (p.source) {
    case "programmes": {
      const maintenant = d.getTime() / 1000;
      return pack.channels.flatMap((c, i) => {
        const x = live(c, pack.programs, maintenant, i * DECALAGE);
        const fin = new Date((maintenant + programLength(x.program) - x.t) * 1000);
        return [
          { texte: `CH ${String(i + 1).padStart(2, "0")}  ${c.name.toUpperCase()}`, couleur: "y" as const },
          { texte: tronquer(`  EN COURS  ${x.program.title}`) },
          { texte: tronquer(`  ${hhmm(fin)}     ${x.suivant.title}`), couleur: "c" as const },
        ];
      });
    }
    case "meteo":
      return meteo(pack.portal.meteo, d).flatMap((m) => [
        { texte: m.ville.toUpperCase(), couleur: "y" as const },
        ...couper(`${m.ciel}. Mousse : ${m.mousse}.`, COLONNES - 4).map((t) => ({ texte: `  ${t}` })),
      ]);
    case "bourse":
      return cours(pack.portal.bourse, d).map((c) => {
        const v = `${c.valeur.toFixed(2)} ${c.variation >= 0 ? "+" : ""}${c.variation.toFixed(1)}%`;
        return { texte: pointilles(`${c.nom} (${c.unite})`, v), couleur: c.variation >= 0 ? ("g" as const) : ("r" as const) };
      });
    case "depeches":
      return [pack.portal.flash, ...pack.news].flatMap((n, i) => [...couper(n).map((t, j) => ({ texte: t, couleur: j === 0 && i % 2 === 0 ? ("c" as const) : undefined })), { texte: "" }]);
    case "annonces":
      return pack.portal.annonces.flatMap((a, i) => [...couper(`${String(i + 1).padStart(2, "0")}. ${a}`).map((t) => ({ texte: t, couleur: i % 2 ? ("c" as const) : undefined })), { texte: "" }]);
    default:
      return [];
  }
}

/** Compose une page, ou `null` si elle n'est pas diffusée. */
export function pageTeletexte(pack: ContentPack, numero: number, d: Date): PageRendue | null {
  const p = pack.teletexte.pages.find((x) => x.numero === numero);
  if (!p) return null;
  const lignes: Ligne[] = [];
  for (const l of p.lignes ?? []) {
    if (l.page !== undefined) lignes.push({ texte: pointilles(l.texte, String(l.page)), page: l.page, couleur: l.couleur });
    else for (const t of couper(l.texte)) lignes.push({ texte: t, couleur: l.couleur });
  }
  lignes.push(...source(pack, p, d));
  return { numero, titre: p.titre, lignes };
}

/** Page voisine diffusée (pour les touches CH+ et CH−), en boucle. */
export function voisine(pack: ContentPack, numero: number, pas: 1 | -1): number {
  const n = pack.teletexte.pages.filter((p) => !p.cachee).map((p) => p.numero).sort((a, b) => a - b);
  if (!n.length) return numero;
  if (pas > 0) return n.find((x) => x > numero) ?? n[0]!;
  return [...n].reverse().find((x) => x < numero) ?? n[n.length - 1]!;
}
