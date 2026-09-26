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

// Documents sources (DOCX…) et images extraites de la Bible : fichiers immuables nommés par empreinte / chemin,
// copiés s'ils manquent dans la destination (jamais écrasés).
import { readdirSync, statSync } from "node:fs";
const copyTree = (from, to) => {
  if (!existsSync(from)) return 0;
  let n = 0;
  for (const e of readdirSync(from)) {
    const a = path.join(from, e);
    const b = path.join(to, e);
    if (statSync(a).isDirectory()) n += copyTree(a, b);
    else if (!existsSync(b)) {
      mkdirSync(to, { recursive: true });
      copyFileSync(a, b);
      if (h(a) !== h(b)) throw new Error(`Copie corrompue : ${b}`);
      n += 1;
    }
  }
  return n;
};
const mediaRoot = process.env.PORKONIA_MEDIA_ROOT || path.join(process.cwd(), "medias-locales");
const nOrig = copyTree(path.join(dataDir, "originals"), path.join(dest, "originals"));
const nBible = copyTree(path.join(mediaRoot, "bible-visuelle"), path.join(dest, "medias-locales", "bible-visuelle"));
console.log(`Documents sources copiés : ${nOrig} · images de la Bible copiées : ${nBible} (fichiers déjà présents ignorés)`);
