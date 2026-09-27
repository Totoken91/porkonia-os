/**
 * Disque du poste : arborescence modifiable (copie du système de fichiers du pack) et Poubelle d'État.
 * Logique pure : chaque opération rend un nouveau disque, ou une erreur (clé de texte du pack + variables).
 * Les chemins sont des noms joints par « / » depuis la racine ; le bureau est le dossier « Bureau ».
 */
import type { FsNode } from "@/content/types";
import { childPath, parentPath, resolve, splitPath } from "./fs";

export const BUREAU = "Bureau";
/** Dépôt spécial : la Poubelle d'État (glisser un élément dessus le supprime). */
export const POUBELLE = "::poubelle";

export interface Jete {
  node: FsNode;
  /** Dossier d'origine, pour la restauration. */
  origine: string;
  date: string;
}

export interface Disque {
  racine: Extract<FsNode, { type: "dossier" }>;
  poubelle: Jete[];
  /** Chemins du pack déjà livrés sur ce disque : les nouveautés du pack s'ajoutent, les éléments jetés ne reviennent pas. */
  connus?: string[];
}

export type Resultat = { ok: true; disque: Disque; chemins: string[] } | { ok: false; erreur: string; vars?: Record<string, string> };

const echec = (erreur: string, vars?: Record<string, string>): Resultat => ({ ok: false, erreur, vars });
type Dossier = Extract<FsNode, { type: "dossier" }>;

/** Tous les chemins d'une arborescence (hors racine), parents avant enfants. */
export function chemins(n: FsNode, base = ""): string[] {
  if (n.type !== "dossier") return [];
  return n.children.flatMap((c) => {
    const p = childPath(base, c.name);
    return [p, ...chemins(c, p)];
  });
}

/** Disque neuf à partir du pack : on garantit un dossier Bureau, vide s'il n'existe pas. */
export function disqueInitial(fs: FsNode): Disque {
  const racine = structuredClone(fs) as Dossier;
  if (racine.type !== "dossier") return { racine: { type: "dossier", name: "Poste", children: [{ type: "dossier", name: BUREAU, children: [] }] }, poubelle: [], connus: [] };
  if (!racine.children.some((c) => c.name === BUREAU && c.type === "dossier")) racine.children.unshift({ type: "dossier", name: BUREAU, children: [], protege: "fichiers.err.systeme" });
  return { racine, poubelle: [], connus: chemins(fs) };
}

/**
 * Livre sur un disque déjà en service les éléments ajoutés au pack depuis : chaque chemin du pack encore
 * inconnu est déposé dans son dossier s'il existe (un dossier neuf arrive avec son contenu), puis noté.
 */
export function fusionnerPack(d: Disque, fs: FsNode): Disque {
  const connus = new Set(d.connus ?? []);
  let racine = d.racine;
  for (const p of chemins(fs)) {
    if (connus.has(p)) continue;
    connus.add(p);
    const n = resolve(fs, p)!;
    if (n.type === "dossier") for (const q of chemins(n, p)) connus.add(q);
    const parent = parentPath(p);
    const dossier = resolve(racine, parent);
    if (resolve(racine, p) || dossier?.type !== "dossier") continue;
    const copie = structuredClone(n);
    racine = modifier(racine, parent, (e) => [...e, copie]);
  }
  return { ...d, racine, connus: [...connus] };
}

/** Recopie l'arborescence en remplaçant les enfants du dossier `chemin`. */
function modifier(racine: Dossier, chemin: string, f: (enfants: FsNode[]) => FsNode[]): Dossier {
  const parts = splitPath(chemin);
  const rec = (d: Dossier, i: number): Dossier => {
    if (i === parts.length) return { ...d, children: f(d.children) };
    return { ...d, children: d.children.map((c) => (c.name === parts[i] && c.type === "dossier" ? rec(c, i + 1) : c)) };
  };
  return rec(racine, 0);
}

const dossierDe = (d: Disque, chemin: string): Dossier | null => {
  const n = resolve(d.racine, chemin);
  return n?.type === "dossier" ? n : null;
};

/** « Nouveau dossier » → « Nouveau dossier (2) » ; « note.txt » → « note (2).txt ». */
export function nomLibre(enfants: FsNode[], nom: string): string {
  const pris = new Set(enfants.map((c) => c.name.toLowerCase()));
  if (!pris.has(nom.toLowerCase())) return nom;
  const m = /^(.*?)(\.[a-z0-9]{1,4})?$/i.exec(nom)!;
  const base = m[1] ?? nom;
  const ext = m[2] ?? "";
  for (let i = 2; ; i++) {
    const n = `${base} (${i})${ext}`;
    if (!pris.has(n.toLowerCase())) return n;
  }
}

/** Nom acceptable : non vide, sans « / », sans caractères interdits d'époque. */
export function nomValide(nom: string): boolean {
  const n = nom.trim();
  return n.length > 0 && n.length <= 64 && !/[\\/:*?"<>|]/.test(n) && n !== "." && n !== "..";
}

/** Chemin et ses ancêtres : un élément protégé ne se touche pas, un dossier verrouillé ne se modifie pas. */
function verifierDossier(d: Disque, chemin: string): Resultat | Dossier {
  const dossier = dossierDe(d, chemin);
  if (!dossier) return echec("fichiers.err.introuvable", { nom: chemin || d.racine.name });
  if (dossier.locked) return echec("fichiers.err.verrouille", { nom: dossier.name });
  return dossier;
}
const estResultat = (x: Resultat | Dossier): x is Resultat => "ok" in x;

/** Crée un élément dans un dossier (le nom est rendu unique). */
export function creer(d: Disque, dossier: string, node: FsNode): Resultat {
  const cible = verifierDossier(d, dossier);
  if (estResultat(cible)) return cible;
  const nom = nomLibre(cible.children, node.name);
  const neuf = { ...node, name: nom } as FsNode;
  return { ok: true, disque: { ...d, racine: modifier(d.racine, dossier, (e) => [...e, neuf]) }, chemins: [childPath(dossier, nom)] };
}

export function renommer(d: Disque, chemin: string, nom: string): Resultat {
  const n = resolve(d.racine, chemin);
  if (!n || !chemin) return echec("fichiers.err.introuvable", { nom: chemin });
  if (n.protege) return echec(n.protege, { nom: n.name });
  const propre = nom.trim();
  if (!nomValide(propre)) return echec("fichiers.err.nom", { nom: propre });
  if (propre === n.name) return { ok: true, disque: d, chemins: [chemin] };
  const parent = parentPath(chemin);
  const p = verifierDossier(d, parent);
  if (estResultat(p)) return p;
  if (p.children.some((c) => c !== n && c.name.toLowerCase() === propre.toLowerCase())) return echec("fichiers.err.existe", { nom: propre });
  return { ok: true, disque: { ...d, racine: modifier(d.racine, parent, (e) => e.map((c) => (c === n ? ({ ...c, name: propre } as FsNode) : c))) }, chemins: [childPath(parent, propre)] };
}

/** Réécrit le contenu d'un document texte. */
export function ecrire(d: Disque, chemin: string, contenu: string, date: string): Resultat {
  const n = resolve(d.racine, chemin);
  if (n?.type !== "texte") return echec("fichiers.err.introuvable", { nom: chemin });
  if (n.protege) return echec(n.protege, { nom: n.name });
  const parent = parentPath(chemin);
  return { ok: true, disque: { ...d, racine: modifier(d.racine, parent, (e) => e.map((c) => (c === n ? { ...n, content: contenu, date } : c))) }, chemins: [chemin] };
}

/** Déplace (ou copie) des éléments dans un dossier. Les noms en conflit sont numérotés. */
export function deplacer(d: Disque, chemins: string[], dest: string, copie = false): Resultat {
  let disque = d;
  const out: string[] = [];
  for (const chemin of chemins) {
    const n = resolve(disque.racine, chemin);
    if (!n || !chemin) return echec("fichiers.err.introuvable", { nom: chemin });
    const parent = parentPath(chemin);
    if (!copie && parent === dest) {
      out.push(chemin);
      continue;
    }
    if (!copie && n.protege) return echec(n.protege, { nom: n.name });
    if (n.type === "dossier" && (dest === chemin || dest.startsWith(`${chemin}/`))) return echec("fichiers.err.dansLuiMeme", { nom: n.name });
    const cible = verifierDossier(disque, dest);
    if (estResultat(cible)) return cible;
    const nom = nomLibre(cible.children, copie && parent === dest ? `Copie de ${n.name}` : n.name);
    const neuf = { ...(copie ? structuredClone(n) : n), name: nom } as FsNode;
    if (copie) delete (neuf as { protege?: string }).protege;
    let racine = disque.racine;
    if (!copie) racine = modifier(racine, parent, (e) => e.filter((c) => c !== n));
    racine = modifier(racine, dest, (e) => [...e, neuf]);
    disque = { ...disque, racine };
    out.push(childPath(dest, nom));
  }
  return { ok: true, disque, chemins: out };
}

/** Envoie des éléments à la Poubelle d'État. */
export function supprimer(d: Disque, chemins: string[], date: string): Resultat {
  let disque = d;
  for (const chemin of chemins) {
    const n = resolve(disque.racine, chemin);
    if (!n || !chemin) return echec("fichiers.err.introuvable", { nom: chemin });
    if (n.protege) return echec(n.protege, { nom: n.name });
    const parent = parentPath(chemin);
    const p = verifierDossier(disque, parent);
    if (estResultat(p)) return p;
    disque = { ...disque, racine: modifier(disque.racine, parent, (e) => e.filter((c) => c !== n)), poubelle: [...disque.poubelle, { node: n, origine: parent, date }] };
  }
  return { ok: true, disque, chemins: [] };
}

/** Remet un élément de la Poubelle dans son dossier d'origine (ou à la racine s'il n'existe plus). */
export function restaurer(d: Disque, index: number): Resultat {
  const j = d.poubelle[index];
  if (!j) return echec("fichiers.err.introuvable", { nom: String(index) });
  const origine = dossierDe(d, j.origine) && !dossierDe(d, j.origine)!.locked ? j.origine : "";
  const r = creer({ ...d, poubelle: d.poubelle.filter((_, i) => i !== index) }, origine, j.node);
  return r;
}

export const vider = (d: Disque): Disque => ({ ...d, poubelle: [] });

/** Tous les dossiers où l'on peut écrire (pour « Enregistrer sous »), dans l'ordre de l'arborescence. */
export function dossiersEcrivables(d: Disque): string[] {
  const out: string[] = [];
  const rec = (n: FsNode, chemin: string) => {
    if (n.type !== "dossier" || n.locked) return;
    out.push(chemin);
    for (const c of n.children) rec(c, childPath(chemin, c.name));
  };
  rec(d.racine, "");
  return out;
}

/** Relit un disque conservé ; ce qui est mal formé est écarté, et le Bureau garanti. */
export function sanitizeDisque(v: unknown, fs: FsNode): Disque {
  const neuf = disqueInitial(fs);
  const noeud = (x: unknown, profondeur: number): FsNode | null => {
    if (!x || typeof x !== "object" || profondeur > 12) return null;
    const o = x as Record<string, unknown>;
    if (typeof o.name !== "string" || !nomValide(o.name)) return null;
    const protege = { ...(typeof o.protege === "string" ? { protege: o.protege } : {}), ...(o.cache === true ? { cache: true } : {}) };
    switch (o.type) {
      case "dossier": {
        if (!Array.isArray(o.children)) return null;
        const vus = new Set<string>();
        const children = o.children.map((c) => noeud(c, profondeur + 1)).filter((c): c is FsNode => !!c && !vus.has(c.name.toLowerCase()) && !!vus.add(c.name.toLowerCase()));
        return { type: "dossier", name: o.name, children, ...(typeof o.locked === "string" ? { locked: o.locked } : {}), ...protege };
      }
      case "texte":
        return typeof o.content === "string" ? { type: "texte", name: o.name, content: o.content.slice(0, 100_000), ...(typeof o.date === "string" ? { date: o.date } : {}), ...protege } : null;
      case "image":
        // Images d'origine (liens) ou dessins de PorkPaint (PNG embarqué, taille bornée).
        return typeof o.src === "string" && (/^(https:\/\/|\/)/.test(o.src) || (/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(o.src) && o.src.length < 300_000))
          ? { type: "image", name: o.name, src: o.src, ...(typeof o.caption === "string" ? { caption: o.caption } : {}), ...(typeof o.date === "string" ? { date: o.date } : {}), ...protege }
          : null;
      case "lien":
        return typeof o.app === "string" ? { type: "lien", name: o.name, app: o.app, ...(o.args && typeof o.args === "object" ? { args: Object.fromEntries(Object.entries(o.args as object).filter(([, a]) => typeof a === "string")) as Record<string, string> } : {}), ...protege } : null;
      default:
        return null;
    }
  };
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const racine = noeud(o.racine, 0);
  if (!racine || racine.type !== "dossier") return neuf;
  if (!racine.children.some((c) => c.name === BUREAU && c.type === "dossier")) racine.children.unshift({ type: "dossier", name: BUREAU, children: [], protege: "fichiers.err.systeme" });
  const poubelle = Array.isArray(o.poubelle)
    ? o.poubelle.flatMap((j) => {
        const x = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
        const n = noeud(x.node, 1);
        return n && typeof x.origine === "string" && typeof x.date === "string" ? [{ node: n, origine: x.origine, date: x.date }] : [];
      })
    : [];
  // Disques d'avant la fusion : ce qui est déjà là (ou à la Poubelle) compte comme livré.
  const connus = Array.isArray(o.connus)
    ? o.connus.filter((c): c is string => typeof c === "string")
    : [...chemins(racine), ...poubelle.flatMap((j) => [childPath(j.origine, j.node.name), ...chemins(j.node, childPath(j.origine, j.node.name))])];
  return fusionnerPack({ racine, poubelle, connus }, fs);
}
