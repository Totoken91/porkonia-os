#!/usr/bin/env node
/**
 * Sauvegarde hors application : copie horodatée et vérifiée de la base JSON.
 *   npm run backup [-- --dest /chemin/vers/disque-externe]
 * Ne modifie jamais la base.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const dataDir = process.env.PORKONIA_DATA_DIR || path.join(process.cwd(), "data");
const src = path.join(dataDir, "porkonia-db.json");
const destIdx = process.argv.indexOf("--dest");
const dest = destIdx > 0 ? process.argv[destIdx + 1] : path.join(dataDir, "backups");
if (!existsSync(src)) {
  console.error(`Base introuvable : ${src}`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.join(dest, `porkonia-${stamp}-cli.json`);
copyFileSync(src, out);
const h = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
if (h(src) !== h(out)) {
  console.error("ÉCHEC : la copie ne correspond pas à l'original.");
  process.exit(2);
}
console.log(`Sauvegarde vérifiée : ${out}\nSHA-256 : ${h(out)}`);
