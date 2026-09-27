/**
 * Défragmenteur : disque en blocs, rangé pas à pas. Chaque pas échange deux blocs pour mettre à sa place
 * le premier bloc mal rangé ; les blocs système ne bougent jamais. Logique pure.
 */
export type Bloc = "libre" | "systeme" | 0 | 1 | 2 | 3 | 4;
export const GROUPES = 5;

/** Disque fragmenté : blocs système fixes, fichiers de cinq familles éparpillés, trous. */
export function fragmenter(n: number, alea: () => number): Bloc[] {
  return Array.from({ length: n }, () => {
    const r = alea();
    if (r < 0.06) return "systeme";
    if (r < 0.34) return "libre";
    return Math.floor(alea() * GROUPES) as Bloc;
  });
}

/** Disposition visée : les fichiers regroupés par famille en tête (autour des blocs système), puis le vide. */
export function cible(blocs: Bloc[]): Bloc[] {
  const fichiers = blocs.filter((b): b is Exclude<Bloc, "libre" | "systeme"> => typeof b === "number").sort((a, b) => a - b);
  let k = 0;
  return blocs.map((b) => (b === "systeme" ? "systeme" : k < fichiers.length ? fichiers[k++]! : "libre"));
}

/** Un pas : échange qui répare le premier écart. `null` quand tout est rangé. */
export function etape(blocs: Bloc[], vise: Bloc[]): { blocs: Bloc[]; lu: number; ecrit: number } | null {
  const i = blocs.findIndex((b, k) => b !== vise[k]);
  if (i < 0) return null;
  // On préfère un bloc qui est lui-même mal placé, pour ne pas défaire le travail déjà fait.
  let j = blocs.findIndex((b, k) => k > i && b === vise[i] && b !== vise[k]);
  if (j < 0) j = blocs.findIndex((b, k) => k > i && b === vise[i]);
  if (j < 0) return null;
  const out = [...blocs];
  [out[i], out[j]] = [out[j]!, out[i]!];
  return { blocs: out, lu: j, ecrit: i };
}

/** Part des blocs déjà à leur place, de 0 à 1. */
export const avancement = (blocs: Bloc[], vise: Bloc[]) => blocs.filter((b, k) => b === vise[k]).length / Math.max(1, blocs.length);
