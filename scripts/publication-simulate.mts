/**
 * SIMULATION d'une publication avant tout déploiement :
 *   npm run publication:simulate -- <numéro>
 *
 * 1. Génère le paquet Porkopédia de la publication (même code que l'export).
 * 2. Copie l'instantané du site de la dernière extraction RÉELLE dans imports/simulations/… (le site n'est pas touché).
 * 3. Applique le paquet à cette copie (fichier + balise <script> au point d'insertion).
 * 4. Exécute la copie dans le navigateur isolé (extracteur) et compare avec l'extraction de référence :
 *    seuls les ajouts attendus doivent apparaître, avec un contenu identique au paquet ; aucune modification, aucun retrait.
 * 5. Enregistre le résultat dans la publication (champ « simulation »). Une simulation ne prouve JAMAIS un déploiement.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { readDb, transaction } from "@/data/store-core";
import { setSimulation } from "@/domain/ops";
import type { Database } from "@/domain/types";
import type { Extraction } from "@/domain/porkopedia-import";
import { buildPorkopediaPackage } from "@/export/porkopedia-package";

async function previewScreens(site: string, ids: string[], outDir: string): Promise<string[]> {
  const { default: playwright } = await import("playwright");
  const mirror = path.resolve(process.cwd(), "backups", "media", "par-chemin");
  const MIME: Record<string, string> = { html: "text/html", js: "text/javascript", css: "text/css", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml", mp3: "audio/mpeg" };
  const out: string[] = [];
  const browser = await playwright.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await page.route("**/*", async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== "porkopedia.snapshot.invalid" || route.request().method() !== "GET") return route.abort();
      const rel = decodeURIComponent(u.pathname.slice(1)) || "index.html";
      const candidates = [path.join(site, rel), path.join(mirror, rel)];
      const file = candidates.find((f) => existsSync(f) && !rel.split("/").includes(".."));
      if (!file) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: MIME[rel.split(".").pop()!.toLowerCase()] ?? "application/octet-stream", body: readFileSync(file) });
    });
    for (const id of ids) {
      await page.goto(`https://porkopedia.snapshot.invalid/index.html#article=${encodeURIComponent(id)}`, { waitUntil: "load" });
      await page.waitForTimeout(800);
      const shot = path.join(outDir, `apercu-${id}.png`);
      await page.screenshot({ path: shot });
      out.push(`Aperçu visuel (hors ligne, images de la sauvegarde locale) : ${path.relative(process.cwd(), shot)}`);
    }
  } finally {
    await browser.close();
  }
  return out;
}

const number = Number(process.argv[2]);
if (!number) {
  console.error("Usage : npm run publication:simulate -- <numéro de publication>");
  process.exit(1);
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const importsDir = path.resolve(process.env.PORKONIA_IMPORTS_DIR || path.join(process.cwd(), "imports"));

function latestReal(): Extraction | null {
  const list = readdirSync(importsDir)
    .filter((d) => /^ext_[a-f0-9]{16}$/.test(d) && existsSync(path.join(importsDir, d, "extraction.json")))
    .map((d) => JSON.parse(readFileSync(path.join(importsDir, d, "extraction.json"), "utf8")) as Extraction)
    .filter((e) => !/simulations?[\\/]/.test(e.source.snapshotDir))
    .sort((a, b) => b.extractedAt.localeCompare(a.extractedAt));
  return list[0] ?? null;
}

const db = (await readDb()) as Database;
const pub = db.publications.find((p) => p.number === number);
if (!pub) throw new Error(`Publication n°${number} introuvable.`);
const baseline = latestReal();
if (!baseline) throw new Error("Aucune extraction réelle du site : lancez d'abord npm run porkopedia:extract.");
const pkg = buildPorkopediaPackage(db, pub, baseline);
const messages: string[] = [];
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const simDir = path.join(importsDir, "simulations", `publication-${String(number).padStart(3, "0")}-${stamp}`);

let ok = pkg.blocking.length === 0;
let observed = { added: [] as string[], modified: [] as string[], removed: [] as string[] };
let simulatedId = "";
if (!ok) {
  messages.push(...pkg.blocking.map((b) => `Blocage : ${b}`));
} else {
  const srcSite = path.resolve(baseline.source.snapshotDir);
  const site = path.join(simDir, "site");
  mkdirSync(simDir, { recursive: true });
  cpSync(srcSite, site, { recursive: true });
  writeFileSync(path.join(site, pkg.fileName), pkg.script);
  const indexPath = path.join(site, "index.html");
  const html = readFileSync(indexPath, "utf8");
  const anchor = `<script src="${pkg.insertAfter}"></script>`;
  const count = html.split(anchor).length - 1;
  if (count !== 1) {
    ok = false;
    messages.push(`Point d'insertion « ${anchor} » trouvé ${count} fois dans index.html (1 attendu).`);
  } else {
    writeFileSync(indexPath, html.replace(anchor, `${anchor}\n<script src="${pkg.fileName}"></script>`));
    messages.push(`Paquet appliqué à une copie : ${path.relative(process.cwd(), site)}`);
    const out = path.join(simDir, "extraction");
    execFileSync(process.execPath, ["scripts/porkopedia-extract.mjs", "--from", simDir, "--out", out], { stdio: "inherit" });
    const sim = JSON.parse(readFileSync(path.join(out, "extraction.json"), "utf8")) as Extraction;
    simulatedId = sim.extractionId;
    const before = new Map(baseline.articles.map((a) => [a.id, a]));
    const after = new Map(sim.articles.map((a) => [a.id, a]));
    observed = {
      added: [...after.keys()].filter((id) => !before.has(id)).sort(),
      removed: [...before.keys()].filter((id) => !after.has(id)).sort(),
      modified: [...after.keys()].filter((id) => before.has(id) && before.get(id)!.contentHash !== after.get(id)!.contentHash).sort(),
    };
    const expected = [...pkg.expected.added].sort();
    if (JSON.stringify(observed.added) !== JSON.stringify(expected)) {
      ok = false;
      messages.push(`Ajouts observés (${observed.added.join(", ") || "aucun"}) ≠ attendus (${expected.join(", ")}).`);
    }
    if (observed.modified.length) {
      ok = false;
      messages.push(`Articles existants modifiés par le paquet : ${observed.modified.join(", ")}`);
    }
    if (observed.removed.length) {
      ok = false;
      messages.push(`Articles disparus : ${observed.removed.join(", ")}`);
    }
    const CONTENT = ["title", "sub", "section", "tags", "lead", "image", "html"] as const;
    for (const a of pkg.articles) {
      const s = after.get(a.id);
      if (!s) continue;
      const expectedHash = sha(JSON.stringify(Object.fromEntries(CONTENT.map((k) => [k, (a as unknown as Record<string, unknown>)[k] ?? null]))));
      if (s.contentHash !== expectedHash) {
        ok = false;
        messages.push(`« ${a.title} » : contenu affiché différent du paquet (transformé par un script du site ?).`);
      } else messages.push(`« ${a.title} » : contenu affiché identique au paquet.`);
      if (!s.render?.matchesTitle) {
        ok = false;
        messages.push(`« ${a.title} » : le rendu de la page ne montre pas le titre attendu.`);
      } else messages.push(`« ${a.title} » : rendu vérifié (titre affiché, ${s.render.images} image(s)).`);
      const broken = sim.brokenLinks.filter((l) => l.from === a.id);
      if (broken.length) {
        ok = false;
        messages.push(`« ${a.title} » : lien(s) interne(s) cassé(s) : ${broken.map((b) => b.to).join(", ")}`);
      }
    }
    if (sim.isolation.network.nonGet) messages.push(`${sim.isolation.network.nonGet} tentative(s) d'écriture bloquée(s) pendant la simulation.`);
    // Aperçu visuel hors ligne : la copie du site, avec les images de la sauvegarde physique locale.
    const shots = await previewScreens(site, pkg.expected.added, simDir);
    messages.push(...shots);
  }
}

const result = {
  at: new Date().toISOString(),
  ok,
  baselineExtractionId: baseline.extractionId,
  simulatedExtractionId: simulatedId,
  packageSha256: pkg.scriptSha256,
  expected: pkg.expected,
  observed,
  messages,
};
mkdirSync(simDir, { recursive: true });
writeFileSync(path.join(simDir, "rapport-simulation.json"), JSON.stringify({ ...result, package: { fileName: pkg.fileName, insertAfter: pkg.insertAfter, delta: pkg.delta } }, null, 2));
await transaction((d) => setSimulation(d, number, result));
console.log(
  [
    ``,
    `Simulation de la publication n°${number} : ${ok ? "CONFORME" : "NON CONFORME"}`,
    `  Paquet ${pkg.fileName} (SHA-256 ${pkg.scriptSha256.slice(0, 16)}…), inséré après ${pkg.insertAfter}`,
    `  Attendu : +${pkg.expected.added.length} (${pkg.expected.added.join(", ")}) · Observé : +${observed.added.length} ~${observed.modified.length} −${observed.removed.length}`,
    ...messages.map((m) => `  - ${m}`),
    `  Rapport : ${path.relative(process.cwd(), path.join(simDir, "rapport-simulation.json"))}`,
    `  (Simulation locale : le site public n'a pas été modifié et cette simulation ne vaut pas vérification de déploiement.)`,
  ].join("\n"),
);
process.exit(ok ? 0 : 2);
