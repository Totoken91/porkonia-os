/**
 * Générique d'ouverture des émissions de Channel Pork : le carton titre devient la première diapositive, le jingle
 * une réplique sans texte au temps 0, et tout le reste du programme est décalé d'autant. Pure, testée.
 */
import type { Program } from "@/content/types";

export function deplierGenerique(p: Program): Program {
  const g = p.generique;
  if (!g) return p;
  return {
    ...p,
    generique: undefined,
    slides: [{ image: g.image, seconds: g.secondes, fixe: true, ...(g.fond ? { fond: g.fond } : {}) }, ...p.slides],
    subtitles: [
      ...(g.son ? [{ at: 0, dur: g.secondes, voice: g.son, text: "" }] : []),
      ...p.subtitles.map((s) => ({ ...s, at: Math.round((s.at + g.secondes) * 100) / 100 })),
    ],
  };
}
