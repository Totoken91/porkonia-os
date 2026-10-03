/**
 * Assistant d'installation : étapes de l'assistant, puis installation et désinstallation réelles sur le disque
 * (dossier du programme, raccourcis, fichiers des composants). Logique pure.
 */
import type { FsNode, Installeur } from "@/content/types";
import { childPath, parentPath } from "@/os/fs";
import { BUREAU, creer, creerDossiers, effacer, raccourcisVers, type Disque, type Resultat } from "@/os/vfs";

export const ETAPES = ["accueil", "licence", "dossier", "composants", "options", "pret", "copie", "fin"] as const;
export type Etape = (typeof ETAPES)[number];

export interface Choix {
  dossier: string;
  composants: string[];
  options: string[];
  raccourciBureau: boolean;
}

export const choixParDefaut = (inst: Installeur): Choix => ({
  dossier: inst.dossier,
  composants: inst.composants.map((c) => c.id),
  options: inst.options.filter((o) => o.coche || o.imposee).map((o) => o.id),
  raccourciBureau: true,
});

/** Espace requis (Ko) pour les composants choisis (les obligatoires comptent toujours). */
export const espaceRequis = (inst: Installeur, composants: string[]) => inst.composants.filter((c) => c.obligatoire || composants.includes(c.id)).reduce((a, c) => a + c.taille, 0);

/** Normalise un dossier tapé à la main : séparateurs « \ » ou « / », sans blancs ni barres en trop. */
export const normaliserDossier = (s: string) =>
  s
    .replace(/\\/g, "/")
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean)
    .join("/");

/** Le programme est-il installé ? (un raccourci vers lui existe quelque part sur le disque) */
export const estInstalle = (d: Disque, programme: string) => raccourcisVers(d, programme).length > 0;

/** Dossier d'installation : celui qui contient le raccourci du programme hors du Bureau. */
export function dossierInstalle(d: Disque, inst: Installeur): string | null {
  const hors = raccourcisVers(d, inst.programme).filter((c) => parentPath(c) !== BUREAU);
  return hors.length ? parentPath(hors[0]!) : null;
}

/** Installe : crée le dossier, y dépose le programme, le désinstalleur et les fichiers ; raccourci sur le Bureau. */
export function installer(d: Disque, inst: Installeur, choix: Choix): Resultat {
  const dossier = normaliserDossier(choix.dossier);
  if (!dossier) return { ok: false, erreur: "inst.err.dossier" };
  const r = creerDossiers(d, dossier);
  if (!r.ok) return r;
  let disque = r.disque;
  const poser = (dans: string, n: FsNode): Resultat => {
    const x = creer(disque, dans, n);
    if (x.ok) disque = x.disque;
    return x;
  };
  const a = poser(dossier, { type: "lien", name: inst.raccourci, app: inst.programme });
  if (!a.ok) return a;
  poser(dossier, { type: "lien", name: `Désinstaller ${inst.nom}`, app: "installeur", args: { id: inst.id, mode: "desinstaller" } });
  for (const c of inst.composants) if (c.obligatoire || choix.composants.includes(c.id)) for (const f of c.fichiers) poser(dossier, structuredClone(f));
  if (choix.raccourciBureau) poser(BUREAU, { type: "lien", name: inst.raccourci, app: inst.programme });
  return { ok: true, disque, chemins: [childPath(dossier, inst.raccourci)] };
}

/** Désinstalle : supprime le dossier du programme et tous ses raccourcis. */
export function desinstaller(d: Disque, inst: Installeur): Resultat {
  const dossier = dossierInstalle(d, inst);
  const cibles = [...raccourcisVers(d, inst.programme), ...raccourcisVers(d, "installeur").filter((c) => dossier && parentPath(c) === dossier)];
  // Le dossier entier part, puis les raccourcis restés ailleurs (Bureau).
  const r = dossier ? effacer(d, [dossier]) : { ok: true as const, disque: d, chemins: [] };
  if (!r.ok) return r;
  return effacer(
    r.disque,
    cibles.filter((c) => !dossier || !c.startsWith(`${dossier}/`)),
  );
}
