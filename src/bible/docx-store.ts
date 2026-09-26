/**
 * Stockage des documents sources DOCX et de leurs images — côté serveur uniquement.
 * - L'original est copié intact (nommé par empreinte, lecture seule, jamais écrasé).
 * - Les images sont extraites OCTET POUR OCTET (aucune recompression) sous la racine des médias locaux.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataDir, originalsDir, storeOriginal, writeAtomic } from "@/data/store";
import { mediaRoot } from "@/media/local";
import { analyzeDocx, extractDocxFile, type DocxAnalysis } from "./docx-parse";
import { bibleMediaDir } from "@/domain/bible-import";
import { sha256 } from "@/domain/util";

const SHA = /^[a-f0-9]{64}$/;

export async function registerDocx(buf: Buffer, filename: string) {
  if (buf.subarray(0, 2).toString("latin1") !== "PK") throw new Error("Ce fichier n'est pas un DOCX (archive ZIP attendue).");
  const stored = await storeOriginal(buf, "docx");
  const analysis = analyzeDocx(new Uint8Array(buf), filename);
  await writeAtomic(path.join(originalsDir(), `${stored.sha256}.analysis.json`), JSON.stringify(analysis, null, 1));
  return { ...stored, analysis };
}

export async function listDocuments(): Promise<{ sha256: string; filename: string; bytes: number; analyzedAt: string | null; stats?: DocxAnalysis["stats"] }[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(originalsDir());
  } catch {
    return [];
  }
  const out = [];
  for (const f of files.filter((x) => x.endsWith(".docx"))) {
    const sha = f.replace(/\.docx$/, "");
    const st = await fs.stat(path.join(originalsDir(), f));
    const an = await loadAnalysis(sha).catch(() => null);
    out.push({ sha256: sha, filename: an?.filename ?? f, bytes: st.size, analyzedAt: an?.analyzedAt ?? null, stats: an?.stats });
  }
  return out;
}

export async function loadOriginal(sha: string): Promise<Buffer> {
  if (!SHA.test(sha)) throw new Error("Empreinte invalide.");
  const buf = await fs.readFile(path.join(originalsDir(), `${sha}.docx`));
  if (sha256(buf) !== sha) throw new Error("Le document original ne correspond plus à son empreinte : copie altérée.");
  return buf;
}

/** Analyse (mise en cache) ; recalculée depuis l'original si absente. */
export async function loadAnalysis(sha: string, filename?: string): Promise<DocxAnalysis> {
  if (!SHA.test(sha)) throw new Error("Empreinte invalide.");
  const p = path.join(originalsDir(), `${sha}.analysis.json`);
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as DocxAnalysis;
  } catch {
    const an = analyzeDocx(new Uint8Array(await loadOriginal(sha)), filename ?? `${sha.slice(0, 12)}.docx`);
    await writeAtomic(p, JSON.stringify(an, null, 1));
    return an;
  }
}

/**
 * Copie les images choisies du DOCX sous medias-locales/bible-visuelle/<sha12>/ — sans transformation.
 * Un fichier existant n'est JAMAIS écrasé ; s'il diffère, l'opération échoue.
 */
export async function materializeImages(sha: string, files: string[]) {
  const buf = await loadOriginal(sha);
  const dirRel = bibleMediaDir(sha);
  const dirAbs = path.join(mediaRoot(), dirRel);
  await fs.mkdir(dirAbs, { recursive: true });
  const written: string[] = [];
  for (const file of files) {
    const data = extractDocxFile(new Uint8Array(buf), file);
    const target = path.join(dirAbs, path.basename(file));
    const expected = sha256(Buffer.from(data));
    try {
      const existing = await fs.readFile(target);
      if (sha256(existing) !== expected) throw new Error(`Un fichier différent existe déjà : ${target}. Aucun écrasement.`);
      continue;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    await writeAtomic(target, Buffer.from(data));
    await fs.chmod(target, 0o444).catch(() => undefined);
    if (sha256(await fs.readFile(target)) !== expected) throw new Error(`Copie corrompue : ${target}`);
    written.push(file);
  }
  return { mediaDir: dirRel, written, docPath: path.relative(dataDir(), path.join(originalsDir(), `${sha}.docx`)) };
}
