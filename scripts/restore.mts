/**
 * Vérification / restauration d'une sauvegarde (CLI).
 *   npm run backup:verify -- data/backups/porkonia-XXXX.json
 *   npm run restore -- data/backups/porkonia-XXXX.json --confirm
 * La restauration sauvegarde d'abord l'état actuel, remplace la base de façon atomique puis vérifie les décomptes.
 */
import path from "node:path";
import { restoreBackup, verifyBackup } from "@/data/store-core";

const [cmd, file] = process.argv.slice(2);
if (!file) {
  console.error("Usage : restore.ts <verify|restore> <fichier.json> [--confirm]");
  process.exit(1);
}
const abs = path.resolve(file);
const check = await verifyBackup(abs);
console.log(`${check.ok ? "✓ RESTAURABLE" : "✗ NON RESTAURABLE"} — ${abs}\n  SHA-256 ${check.sha256}\n  schéma v${check.schemaVersion} · ${Object.entries(check.counts).map(([k, v]) => `${v} ${k}`).join(", ")}\n  ${check.messages.join("\n  ")}`);
if (cmd === "restore") {
  if (!process.argv.includes("--confirm")) {
    console.log("\nAjoutez --confirm pour restaurer réellement (l'état actuel sera sauvegardé avant).");
    process.exit(check.ok ? 0 : 2);
  }
  const r = await restoreBackup(abs);
  console.log(`\nBase restaurée. État précédent conservé : ${r.previousStateSavedAt}`);
}
process.exit(check.ok ? 0 : 2);
