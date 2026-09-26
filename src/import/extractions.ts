/** Accès en lecture aux extractions Porkopédia produites par scripts/porkopedia-extract.mjs. */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Extraction } from "@/domain/porkopedia-import";

export const importsDir = () => path.resolve(/*turbopackIgnore: true*/ process.env.PORKONIA_IMPORTS_DIR || path.join(process.cwd(), "imports"));
const ID = /^ext_[a-f0-9]{16}$/;

export async function listExtractions() {
  let dirs: string[] = [];
  try {
    dirs = (await fs.readdir(importsDir())).filter((d) => ID.test(d));
  } catch {
    return [];
  }
  const out = [];
  for (const d of dirs) {
    try {
      const ex = await loadExtraction(d);
      out.push({
        id: ex.extractionId,
        extractedAt: ex.extractedAt,
        site: ex.source.site,
        snapshotTakenAt: ex.source.snapshotTakenAt,
        articles: ex.articles.length,
        media: ex.media.length,
        checked: ex.media.some((m) => m.check),
        scripts: ex.scriptOrder.length,
      });
    } catch {
      /* extraction illisible : ignorée */
    }
  }
  return out.sort((a, b) => b.extractedAt.localeCompare(a.extractedAt));
}

export async function loadExtraction(id: string): Promise<Extraction> {
  if (!ID.test(id)) throw new Error("Identifiant d'extraction invalide.");
  const ex = JSON.parse(await fs.readFile(path.join(importsDir(), id, "extraction.json"), "utf8")) as Extraction;
  if (ex.format !== "porkonia-os/porkopedia-extraction@1" || ex.extractionId !== id) throw new Error("Fichier d'extraction invalide.");
  return ex;
}

/** Dernière extraction RÉELLE du site (les simulations sont stockées ailleurs et ne sont jamais listées ici). */
export async function latestRealExtraction(): Promise<Extraction | null> {
  const list = await listExtractions();
  for (const e of list) {
    const ex = await loadExtraction(e.id).catch(() => null);
    if (ex && !/simulations?[\\/]/.test(ex.source.snapshotDir)) return ex;
  }
  return null;
}
