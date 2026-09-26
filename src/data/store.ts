/**
 * Persistance locale V1 : un fichier JSON unique, écrit de manière atomique.
 *
 * - Lecture : cache mémoire, rechargé si le fichier a changé sur disque.
 * - Écriture : `transaction()` travaille sur une COPIE ; si la fonction lève une
 *   erreur, rien n'est écrit (rollback implicite). Écriture tmp + rename.
 * - Premier lancement : base initialisée avec les données de démonstration.
 *
 * Phase 2 : une implémentation PostgreSQL/Supabase remplacera ce module derrière
 * la même API (`readDb`, `transaction`, `createBackup`).
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Database } from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { newId, nowIso, sha256 } from "@/domain/util";
import { demoDatabase } from "./fixtures";

export function dataDir(): string {
  return process.env.PORKONIA_DATA_DIR || path.join(process.cwd(), "data");
}
const dbFile = () => path.join(dataDir(), "porkonia-db.json");
const backupDir = () => path.join(dataDir(), "backups");

let cache: { db: Database; mtimeMs: number; file: string } | null = null;
let queue: Promise<unknown> = Promise.resolve();

function emptyDatabase(): Database {
  return { schemaVersion: SCHEMA_VERSION, characters: [], articles: [], media: [], bible: [], revisions: [], publications: [], log: [], backups: [] };
}

async function writeAtomic(file: string, content: string) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, file);
}

async function load(): Promise<Database> {
  const file = dbFile();
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    stat = null;
  }
  if (!stat) {
    const seed = process.env.PORKONIA_EMPTY_DB === "1" ? emptyDatabase() : demoDatabase();
    await writeAtomic(file, JSON.stringify(seed, null, 1));
    stat = await fs.stat(file);
    cache = { db: seed, mtimeMs: stat.mtimeMs, file };
    return seed;
  }
  if (cache && cache.file === file && cache.mtimeMs === stat.mtimeMs) return cache.db;
  const raw = await fs.readFile(file, "utf8");
  const db = JSON.parse(raw) as Database;
  if (db.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `Version de schéma inattendue (${db.schemaVersion}, attendu ${SCHEMA_VERSION}). Aucune migration automatique : voir docs/MIGRATION.md.`,
    );
  }
  cache = { db, mtimeMs: stat.mtimeMs, file };
  return db;
}

/** Lecture seule. Ne pas muter l'objet retourné. */
export async function readDb(): Promise<Readonly<Database>> {
  await queue.catch(() => undefined);
  return load();
}

/** Exécute une mutation de façon sérialisée et atomique. */
export function transaction<T>(fn: (db: Database) => T): Promise<T> {
  const run = async () => {
    const current = await load();
    const draft = structuredClone(current);
    const result = fn(draft);
    const file = dbFile();
    await writeAtomic(file, JSON.stringify(draft, null, 1));
    const stat = await fs.stat(file);
    cache = { db: draft, mtimeMs: stat.mtimeMs, file };
    return result;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => undefined);
  return p;
}

/** Copie intégrale horodatée de la base dans data/backups/, vérifiée par relecture. */
export async function createBackup(reason = "manuelle") {
  return transaction(() => undefined).then(async () => {
    const db = await load();
    const stamp = nowIso().replace(/[:.]/g, "-");
    const file = path.join(backupDir(), `porkonia-${stamp}.json`);
    const content = JSON.stringify(db, null, 1);
    await writeAtomic(file, content);
    const reread = await fs.readFile(file, "utf8");
    const hash = sha256(reread);
    if (hash !== sha256(content)) throw new Error("Sauvegarde corrompue : la relecture ne correspond pas.");
    await transaction((d) => {
      d.backups.push({ id: newId("backup"), at: nowIso(), file: path.relative(dataDir(), file), bytes: Buffer.byteLength(content), sha256: hash });
      d.log.push({ id: newId("log"), at: nowIso(), action: "Sauvegarde", summary: `Sauvegarde ${reason} : ${path.basename(file)} (vérifiée)`, entityType: "systeme" });
    });
    return { file, sha256: hash };
  });
}

export async function listBackupFiles(): Promise<string[]> {
  try {
    return (await fs.readdir(backupDir())).filter((f) => f.endsWith(".json")).sort().reverse();
  } catch {
    return [];
  }
}

/** Réinitialise le cache (tests). */
export function __resetCache() {
  cache = null;
}
