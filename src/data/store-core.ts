/**
 * Persistance locale : un fichier JSON unique, écrit de manière atomique.
 *
 * - Lecture : cache mémoire, rechargé si le fichier a changé sur disque.
 * - Écriture : `transaction()` travaille sur une COPIE ; si la fonction lève une
 *   erreur, rien n'est écrit (rollback implicite). Écriture tmp + fsync + rename.
 * - Migration de schéma : copie intégrale « pre-migration » écrite et vérifiée AVANT.
 * - Premier lancement : base vide (ou données de démonstration si PORKONIA_DEMO=1).
 *
 * Utilisable par l'application (via store.ts, protégé « server-only ») et par les scripts CLI.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Database } from "@/domain/types";
import { SCHEMA_VERSION } from "@/domain/types";
import { emptyDatabase, migrate, needsMigration } from "@/domain/migrate";
import { newId, nowIso, sha256 } from "@/domain/util";
import { demoDatabase } from "./fixtures";

export function dataDir(): string {
  return process.env.PORKONIA_DATA_DIR || path.join(process.cwd(), "data");
}
export const dbFile = () => path.join(dataDir(), "porkonia-db.json");
export const backupDir = () => path.join(dataDir(), "backups");
export const originalsDir = () => path.join(dataDir(), "originals");

let cache: { db: Database; mtimeMs: number; file: string } | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function writeAtomic(file: string, content: string | Buffer) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, file);
}

function stamp() {
  return nowIso().replace(/[:.]/g, "-");
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
    // Base réelle : vide par défaut. Base de démonstration : PORKONIA_DEMO=1 (npm run dev:demo → data-demo/).
    const seed = process.env.PORKONIA_DEMO === "1" ? demoDatabase() : emptyDatabase();
    await writeAtomic(file, JSON.stringify(seed, null, 1));
    stat = await fs.stat(file);
    cache = { db: seed, mtimeMs: stat.mtimeMs, file };
    return seed;
  }
  if (cache && cache.file === file && cache.mtimeMs === stat.mtimeMs) return cache.db;
  const raw = await fs.readFile(file, "utf8");
  let db = JSON.parse(raw) as Database;
  if (needsMigration(db)) {
    // 1) Copie intégrale et vérifiée de l'état d'origine.
    const safety = path.join(backupDir(), `pre-migration-v${db.schemaVersion ?? 1}-${stamp()}.json`);
    await writeAtomic(safety, raw);
    if (sha256(await fs.readFile(safety, "utf8")) !== sha256(raw)) throw new Error("Copie pré-migration corrompue : migration annulée.");
    // 2) Migration pure, additive.
    const { db: migrated, applied } = migrate(JSON.parse(raw));
    migrated.log.push({
      id: newId("log"),
      at: nowIso(),
      action: "Migration de schéma",
      summary: `Migration ${applied.join(", ")} appliquée. Copie d'origine : ${path.relative(dataDir(), safety)}`,
      entityType: "systeme",
    });
    await writeAtomic(file, JSON.stringify(migrated, null, 1));
    db = migrated;
    stat = await fs.stat(file);
  } else if (db.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Version de schéma inattendue (${db.schemaVersion}). Voir docs/MIGRATION.md.`);
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
  await transaction(() => undefined);
  const db = await load();
  const file = path.join(backupDir(), `porkonia-${stamp()}.json`);
  const content = JSON.stringify(db, null, 1);
  await writeAtomic(file, content);
  const hash = sha256(await fs.readFile(file, "utf8"));
  if (hash !== sha256(content)) throw new Error("Sauvegarde corrompue : la relecture ne correspond pas.");
  await transaction((d) => {
    d.backups.push({ id: newId("backup"), at: nowIso(), file: path.relative(dataDir(), file), bytes: Buffer.byteLength(content), sha256: hash });
    d.log.push({ id: newId("log"), at: nowIso(), action: "Sauvegarde", summary: `Sauvegarde ${reason} : ${path.basename(file)} (vérifiée)`, entityType: "systeme" });
  });
  return { file, sha256: hash };
}

export async function listBackupFiles(): Promise<string[]> {
  try {
    return (await fs.readdir(backupDir())).filter((f) => f.endsWith(".json")).sort().reverse();
  } catch {
    return [];
  }
}

export interface BackupCheck {
  ok: boolean;
  file: string;
  sha256: string;
  schemaVersion: number;
  counts: Record<string, number>;
  messages: string[];
}

function counts(db: Database) {
  return {
    articles: db.articles.length,
    personnages: db.characters.length,
    medias: db.media.length,
    bible: db.bible.length,
    revisions: db.revisions.length,
    publications: db.publications.length,
  };
}

/**
 * Vérifie qu'une sauvegarde est RESTAURABLE sans rien modifier : lecture, contrôle de structure,
 * migration à blanc en mémoire, puis restauration d'essai dans un dossier temporaire.
 */
export async function verifyBackup(file: string): Promise<BackupCheck> {
  const messages: string[] = [];
  const raw = await fs.readFile(file, "utf8");
  const hash = sha256(raw);
  let parsed: Database;
  try {
    parsed = JSON.parse(raw) as Database;
  } catch (e) {
    return { ok: false, file, sha256: hash, schemaVersion: 0, counts: {}, messages: [`JSON illisible : ${(e as Error).message}`] };
  }
  const v = parsed.schemaVersion ?? 1;
  for (const k of ["characters", "articles", "media", "bible", "revisions", "publications", "log"] as const) {
    if (!Array.isArray(parsed[k])) messages.push(`Collection manquante : ${k}`);
  }
  if (messages.length) return { ok: false, file, sha256: hash, schemaVersion: v, counts: {}, messages };
  const { db, applied } = migrate(structuredClone(parsed));
  if (applied.length) messages.push(`Migration nécessaire à la restauration : ${applied.join(", ")} (sera précédée d'une copie).`);
  const os = await import("node:os");
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "porkonia-restore-test-"));
  try {
    await fs.writeFile(path.join(tmp, "porkonia-db.json"), raw);
    const reread = JSON.parse(await fs.readFile(path.join(tmp, "porkonia-db.json"), "utf8"));
    const { db: trial } = migrate(reread);
    const a = counts(db);
    const b = counts(trial);
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) messages.push("Les décomptes diffèrent après restauration d'essai.");
    messages.push(same ? "Restauration d'essai réussie dans un dossier temporaire." : "Restauration d'essai incohérente.");
    return { ok: same, file, sha256: hash, schemaVersion: v, counts: a, messages };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

/**
 * Restaure une sauvegarde (opération explicite, CLI uniquement) :
 * vérification → sauvegarde de l'état actuel → remplacement atomique → relecture et comparaison.
 */
export async function restoreBackup(file: string) {
  const check = await verifyBackup(file);
  if (!check.ok) throw new Error(`Sauvegarde non restaurable : ${check.messages.join(" ; ")}`);
  const safety = await createBackup("avant restauration");
  const raw = await fs.readFile(file, "utf8");
  await transaction(() => undefined); // vide la file d'écritures
  await writeAtomic(dbFile(), raw);
  cache = null;
  const db = await load();
  const after = counts(db);
  if (JSON.stringify(after) !== JSON.stringify(check.counts)) {
    throw new Error(`Restauration incohérente ; l'état précédent reste disponible : ${safety.file}`);
  }
  await transaction((d) => {
    d.log.push({ id: newId("log"), at: nowIso(), action: "Restauration de sauvegarde", summary: `Base restaurée depuis ${path.basename(file)} ; état précédent : ${path.basename(safety.file)}`, entityType: "systeme" });
  });
  return { restoredFrom: file, previousStateSavedAt: safety.file, counts: after };
}

/** Enregistre une copie intacte d'un document source (nommée par empreinte, lecture seule, jamais écrasée). */
export async function storeOriginal(buf: Buffer, ext: string): Promise<{ sha256: string; path: string; created: boolean }> {
  const hash = sha256(buf);
  const target = path.join(originalsDir(), `${hash}.${ext}`);
  let created = false;
  try {
    await fs.access(target);
  } catch {
    await writeAtomic(target, buf);
    await fs.chmod(target, 0o444).catch(() => undefined);
    created = true;
  }
  if (sha256(await fs.readFile(target)) !== hash) throw new Error("Copie du document source corrompue.");
  return { sha256: hash, path: path.relative(dataDir(), target), created };
}

/** Réinitialise le cache (tests). */
export function __resetCache() {
  cache = null;
}
