#!/usr/bin/env node
/**
 * Sauvegarde FACULTATIVE des médias référencés (protection contre les pertes liées
 * aux versions/déploiements de Porkopédia).
 *   npm run media:backup [-- --dest ./backups/media] [--dry-run]
 *
 * - Télécharge (lecture seule) chaque média externe et copie chaque média local.
 * - Stocke les fichiers par empreinte : <dest>/<sha256>.<ext> (jamais d'écrasement).
 * - Écrit un manifeste <dest>/manifest-<date>.json (id, ref, sha256, taille, statut).
 * - Ne modifie NI la base Porkonia OS, NI les références, NI les fichiers d'origine.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const dry = process.argv.includes("--dry-run");
const dataDir = process.env.PORKONIA_DATA_DIR || path.join(process.cwd(), "data");
const mediaRoot = path.resolve(process.env.PORKONIA_MEDIA_ROOT || path.join(process.cwd(), "medias-locales"));
const dest = path.resolve(arg("--dest", path.join(process.cwd(), "backups", "media")));
const db = JSON.parse(readFileSync(path.join(dataDir, "porkonia-db.json"), "utf8"));
const media = db.media.filter((m) => !m.deletedAt);
mkdirSync(dest, { recursive: true });

const results = [];
for (const m of media) {
  const ext = (/\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(m.ref)?.[1] ?? "bin").toLowerCase();
  try {
    let buf;
    if (m.location === "externe") {
      const res = await fetch(m.ref, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
    } else {
      const abs = path.resolve(mediaRoot, m.ref);
      if (!abs.startsWith(mediaRoot + path.sep)) throw new Error("chemin hors racine");
      buf = readFileSync(abs);
    }
    const sha = createHash("sha256").update(buf).digest("hex");
    const file = path.join(dest, `${sha}.${ext}`);
    const already = existsSync(file);
    if (!already && !dry) writeFileSync(file, buf, { flag: "wx" });
    results.push({ id: m.id, name: m.name, ref: m.ref, location: m.location, sha256: sha, bytes: buf.length, file: path.basename(file), status: already ? "deja-present" : dry ? "simulation" : "copie" });
    console.log(`✓ ${m.name} (${sha.slice(0, 12)}…)`);
  } catch (e) {
    results.push({ id: m.id, name: m.name, ref: m.ref, location: m.location, status: "erreur", error: String(e?.message ?? e) });
    console.log(`✗ ${m.name} : ${e?.message ?? e}`);
  }
}
const manifest = path.join(dest, `manifest-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
if (!dry) writeFileSync(manifest, JSON.stringify({ format: "porkonia-os/media-backup@1", createdAt: new Date().toISOString(), results }, null, 2));
const bad = results.filter((r) => r.status === "erreur").length;
console.log(`\n${results.length - bad} OK, ${bad} erreur(s).${dry ? " (simulation, rien écrit)" : ` Manifeste : ${manifest}`}`);
process.exit(bad ? 3 : 0);
