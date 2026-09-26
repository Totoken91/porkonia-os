/**
 * SAUVEGARDE PHYSIQUE des médias référencés (externes sur Porkopédia et fichiers locaux).
 *
 *   npm run media:backup                      # télécharge / copie, vérifie, enregistre
 *   npm run media:backup -- --dry-run         # ne rien écrire
 *   npm run media:backup -- --dest <dossier>  # défaut : backups/media
 *   npm run media:verify                      # re-vérifie les empreintes de la dernière sauvegarde
 *
 * Garanties :
 * - Lecture seule vis-à-vis des sources (GET) : l'hébergement public n'est ni modifié ni migré ;
 *   les références (URL, chemins) de la base restent inchangées.
 * - Stockage par empreinte : <dest>/fichiers/<sha256>.<ext> (jamais d'écrasement ; relecture et vérification).
 * - Chemin d'origine conservé : <dest>/par-chemin/<chemin d'origine> (lien physique vers le fichier) + manifeste.
 * - La base reçoit seulement l'empreinte (si absente) et l'emplacement de sauvegarde ; un écart d'empreinte
 *   avec une valeur déjà connue est SIGNALÉ, jamais écrasé.
 */
import { createHash } from "node:crypto";
import { existsSync, linkSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { readDb, transaction } from "@/data/store-core";
import { log } from "@/domain/ops";
import type { Database, Media } from "@/domain/types";

const argv = process.argv.slice(2);
const arg = (k: string, d: string) => (argv.includes(k) ? argv[argv.indexOf(k) + 1]! : d);
const dry = argv.includes("--dry-run");
const verifyOnly = argv.includes("--verify");
const dest = path.resolve(arg("--dest", path.join(process.cwd(), "backups", "media")));
const mediaRoot = path.resolve(process.env.PORKONIA_MEDIA_ROOT || path.join(process.cwd(), "medias-locales"));
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

export interface BackupEntry {
  mediaId: string;
  name: string;
  location: Media["location"];
  url: string | null;
  originalRef: string;
  status: "copie" | "deja-present" | "erreur" | "simulation";
  sha256?: string;
  bytes?: number;
  contentType?: string | null;
  httpStatus?: number;
  file?: string;
  pathCopy?: string;
  knownSha256?: string | null;
  shaMismatch?: boolean;
  error?: string;
}

async function verify() {
  const idx = path.join(dest, "index.json");
  if (!existsSync(idx)) throw new Error(`Aucun index de sauvegarde dans ${dest}`);
  const index = JSON.parse(readFileSync(idx, "utf8")) as { entries: BackupEntry[] };
  let ok = 0;
  const bad: string[] = [];
  for (const e of index.entries.filter((x) => x.file)) {
    const f = path.join(dest, e.file!);
    if (!existsSync(f)) bad.push(`manquant : ${e.originalRef}`);
    else if (sha(readFileSync(f)) !== e.sha256) bad.push(`empreinte différente : ${e.originalRef}`);
    else ok += 1;
  }
  console.log(`Vérification : ${ok} fichier(s) intègres, ${bad.length} problème(s).`);
  bad.slice(0, 30).forEach((b) => console.log("  ✗ " + b));
  process.exit(bad.length ? 2 : 0);
}

async function fetchBytes(m: Media): Promise<{ buf: Buffer; contentType: string | null; httpStatus?: number }> {
  if (m.location === "externe") {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(m.ref, { method: "GET", signal: AbortSignal.timeout(60_000) });
        if (!res.ok) return Promise.reject(Object.assign(new Error(`HTTP ${res.status}`), { httpStatus: res.status }));
        return { buf: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type"), httpStatus: res.status };
      } catch (e) {
        lastErr = e;
        if ((e as { httpStatus?: number }).httpStatus) throw e;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    throw lastErr;
  }
  const abs = path.resolve(mediaRoot, m.ref);
  if (!abs.startsWith(mediaRoot + path.sep)) throw new Error("chemin hors racine");
  return { buf: readFileSync(abs), contentType: null };
}

async function main() {
  if (verifyOnly) return verify();
  const db = (await readDb()) as Database;
  const media = db.media.filter((m) => !m.deletedAt);
  mkdirSync(path.join(dest, "fichiers"), { recursive: true });
  const entries: BackupEntry[] = [];
  let i = 0;
  const started = new Date().toISOString();
  const worker = async () => {
    while (i < media.length) {
      const m = media[i++]!;
      const originalRef = m.external?.originalRef ?? m.ref;
      const base: BackupEntry = { mediaId: m.id, name: m.name, location: m.location, url: m.location === "externe" ? m.ref : null, originalRef, status: "erreur", knownSha256: m.sha256 ?? null };
      try {
        const { buf, contentType, httpStatus } = await fetchBytes(m);
        const hash = sha(buf);
        const ext = (/\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(originalRef)?.[1] ?? "bin").toLowerCase();
        const rel = `fichiers/${hash}.${ext}`;
        const file = path.join(dest, rel);
        let status: BackupEntry["status"] = dry ? "simulation" : "copie";
        if (existsSync(file)) {
          if (sha(readFileSync(file)) !== hash) throw new Error(`fichier existant corrompu : ${rel}`);
          status = "deja-present";
        } else if (!dry) {
          writeFileSync(file, buf, { flag: "wx" });
          if (sha(readFileSync(file)) !== hash) throw new Error("relecture : empreinte différente");
        }
        // Miroir par chemin d'origine (lien physique : pas de double stockage).
        const pathRel = path.join("par-chemin", m.location === "externe" ? originalRef.replace(/^\/+/, "") : path.join("locales", m.ref));
        if (!dry && !pathRel.split(path.sep).includes("..")) {
          const pc = path.join(dest, pathRel);
          if (!existsSync(pc)) {
            mkdirSync(path.dirname(pc), { recursive: true });
            try {
              linkSync(file, pc);
            } catch {
              copyFileSync(file, pc);
            }
          }
        }
        entries.push({ ...base, status, sha256: hash, bytes: buf.length, contentType, httpStatus, file: rel, pathCopy: pathRel, shaMismatch: !!m.sha256 && m.sha256 !== hash });
        process.stdout.write(".");
      } catch (e) {
        entries.push({ ...base, error: String((e as Error)?.message ?? e), httpStatus: (e as { httpStatus?: number }).httpStatus });
        process.stdout.write("x");
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  process.stdout.write("\n");
  entries.sort((a, b) => a.originalRef.localeCompare(b.originalRef));

  const errors = entries.filter((e) => e.status === "erreur");
  const mismatches = entries.filter((e) => e.shaMismatch);
  const byHash = new Map<string, string[]>();
  for (const e of entries) if (e.sha256) byHash.set(e.sha256, [...(byHash.get(e.sha256) ?? []), e.originalRef]);
  const identical = [...byHash.values()].filter((v) => v.length > 1);
  const summary = {
    total: entries.length,
    sauvegardes: entries.filter((e) => e.sha256).length,
    nouveaux: entries.filter((e) => e.status === "copie").length,
    dejaPresents: entries.filter((e) => e.status === "deja-present").length,
    erreurs: errors.length,
    ecartsEmpreinte: mismatches.length,
    fichiersIdentiquesSousPlusieursChemins: identical.length,
    octets: entries.reduce((n, e) => n + (e.bytes ?? 0), 0),
  };
  const manifest = { format: "porkonia-os/media-backup@2", startedAt: started, finishedAt: new Date().toISOString(), dest, summary, identical, entries };
  if (!dry) {
    const stamp = started.replace(/[:.]/g, "-");
    writeFileSync(path.join(dest, `manifest-${stamp}.json`), JSON.stringify(manifest, null, 1));
    writeFileSync(path.join(dest, "index.json"), JSON.stringify(manifest, null, 1));
    // Enregistrement dans la base : empreinte (si inconnue) + emplacement de sauvegarde. Références inchangées.
    const relDest = path.relative(process.cwd(), dest);
    await transaction((d) => {
      for (const e of entries) {
        const m = d.media.find((x) => x.id === e.mediaId);
        if (!m || !e.sha256) continue;
        if (!m.sha256) m.sha256 = e.sha256;
        m.backupPath = `${relDest}/${e.file}`;
      }
      log(d, "Sauvegarde physique des médias", `${summary.sauvegardes}/${summary.total} médias sauvegardés et vérifiés (${(summary.octets / 1e6).toFixed(1)} Mo) dans ${relDest} ; ${summary.erreurs} erreur(s) ; ${summary.ecartsEmpreinte} écart(s) d'empreinte`, "systeme");
    });
  }
  console.log(
    [
      `Sauvegarde physique des médias → ${dest}`,
      `  ${summary.sauvegardes}/${summary.total} sauvegardés (${summary.nouveaux} nouveaux, ${summary.dejaPresents} déjà présents) · ${(summary.octets / 1e6).toFixed(1)} Mo`,
      `  ${summary.erreurs} erreur(s) · ${summary.ecartsEmpreinte} écart(s) avec une empreinte connue · ${summary.fichiersIdentiquesSousPlusieursChemins} fichier(s) identique(s) sous plusieurs chemins`,
      dry ? "  (simulation : rien n'a été écrit)" : `  Manifeste : ${path.join(dest, "index.json")}`,
      ...errors.slice(0, 20).map((e) => `  ✗ ${e.originalRef} : ${e.error}`),
      ...mismatches.slice(0, 20).map((e) => `  ⚠ ${e.originalRef} : empreinte différente de celle enregistrée (fichier modifié à la source ?)`),
    ].join("\n"),
  );
  void readdirSync;
  process.exit(errors.length ? 3 : 0);
}

main().catch((e) => {
  console.error("ÉCHEC :", e.message);
  process.exit(1);
});
