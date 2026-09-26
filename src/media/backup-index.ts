import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface MediaBackupIndex {
  finishedAt: string;
  dest: string;
  summary: { total: number; sauvegardes: number; nouveaux: number; dejaPresents: number; erreurs: number; ecartsEmpreinte: number; octets: number };
  identical: string[][];
}

/** Index de la dernière sauvegarde physique des médias (écrit par scripts/media-backup.mts). */
export async function readMediaBackupIndex(): Promise<MediaBackupIndex | null> {
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.PORKONIA_MEDIA_BACKUP_DIR || path.join(process.cwd(), "backups", "media"));
  try {
    const raw = JSON.parse(await fs.readFile(path.join(dir, "index.json"), "utf8"));
    return { finishedAt: raw.finishedAt, dest: path.relative(process.cwd(), raw.dest) || raw.dest, summary: raw.summary, identical: raw.identical ?? [] };
  } catch {
    return null;
  }
}
