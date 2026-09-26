/**
 * Vérification AUTOMATIQUE d'une publication : comparaison avec une extraction réelle du site public.
 * Ne remplace pas un contrôle humain : elle mesure la présence et la similarité du texte.
 */
import { diffArrays } from "diff";
import type { Publication } from "./types";
import type { Extraction } from "./porkopedia-import";

export const SIMILARITY_THRESHOLD = 0.9;

export function plainWords(s: string): string[] {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, "$2")
    .replace(/[#*_>`|[\]()-]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function similarity(a: string, b: string): number {
  const wa = plainWords(a);
  const wb = plainWords(b);
  if (!wa.length && !wb.length) return 1;
  const common = diffArrays(wa, wb)
    .filter((p) => !p.added && !p.removed)
    .reduce((n, p) => n + p.value.length, 0);
  return (2 * common) / (wa.length + wb.length);
}

export function verifyAgainstExtraction(pub: Publication, ex: Extraction) {
  return pub.articles.map((a) => {
    const keys = new Set([a.externalId, a.slug, ...a.aliases].filter(Boolean) as string[]);
    const found = ex.articles.find((x) => keys.has(x.id));
    const sim = found ? similarity(`${a.title} ${a.lead} ${a.body}`, `${found.title} ${found.lead} ${found.html}`) : 0;
    return { id: a.id, title: a.title, found: !!found, similarity: Math.round(sim * 1000) / 1000, ok: !!found && sim >= SIMILARITY_THRESHOLD };
  });
}
