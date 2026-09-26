#!/usr/bin/env node
/**
 * Instantané LECTURE SEULE du site public Porkopédia, pour préparer l'import (phase 3).
 *   npm run porkopedia:snapshot [-- --url https://porkopedia.totoken.chatgpt.site/] [--with-assets]
 *
 * - Télécharge index.html et tous les scripts <script src> (articles.js + correctifs).
 * - Produit un rapport : nombre d'articles de base, scripts qui modifient le contenu,
 *   médias référencés (assets/...), identifiants d'articles (liens #article=...).
 * - --with-assets télécharge aussi les médias référencés (copie de sauvegarde).
 * - N'envoie RIEN au site et n'importe RIEN dans Porkonia OS.
 *
 * Limite connue : le contenu effectif du site résulte de l'exécution de ~40 scripts
 * correctifs dans le navigateur ; ce script conserve les sources brutes, il ne les rejoue pas.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const base = arg("--url", "https://porkopedia.totoken.chatgpt.site/");
const withAssets = process.argv.includes("--with-assets");
const out = path.join(process.cwd(), "imports", `porkopedia-${new Date().toISOString().replace(/[:.]/g, "-")}`);
mkdirSync(path.join(out, "site"), { recursive: true });

const get = async (rel) => {
  const res = await fetch(new URL(rel, base), { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${rel} : HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (rel, buf) => {
  const p = path.join(out, "site", rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, buf);
};

const index = await get("index.html").catch(() => get(""));
save("index.html", index);
const html = index.toString("utf8");
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^https?:/.test(s));
const files = [{ file: "index.html", sha256: sha(index), bytes: index.length }];
let allText = html;
for (const s of scripts) {
  try {
    const b = await get(s);
    save(s, b);
    files.push({ file: s, sha256: sha(b), bytes: b.length });
    allText += "\n" + b.toString("utf8");
  } catch (e) {
    files.push({ file: s, error: String(e.message) });
  }
}

// Articles de base (articles.js) évalués dans un bac à sable isolé, sans DOM ni réseau.
let baseArticles = [];
try {
  const ctx = { window: {} };
  vm.runInNewContext(allText.includes("PORKO_ARCHIVE") ? (await get("articles.js")).toString("utf8") : "", ctx, { timeout: 5000 });
  baseArticles = ctx.window.PORKO_ARCHIVE ?? [];
} catch (e) {
  console.warn("Évaluation de articles.js impossible :", e.message);
}
const assets = [...new Set([...allText.matchAll(/["'(](assets\/[^"')\s]+\.(?:png|jpe?g|webp|gif|svg|mp3|mp4|webm))/gi)].map((m) => m[1]))].sort();

if (withAssets) {
  for (const a of assets) {
    try {
      save(a, await get(a));
    } catch (e) {
      console.warn("✗", a, e.message);
    }
  }
}

const bySection = {};
for (const a of baseArticles) bySection[a.section] = (bySection[a.section] ?? 0) + 1;
const report = {
  format: "porkonia-os/porkopedia-snapshot@1",
  source: base,
  takenAt: new Date().toISOString(),
  files,
  scripts,
  baseArticles: { count: baseArticles.length, bySection, ids: baseArticles.map((a) => a.id) },
  mediaReferences: { count: assets.length, list: assets, downloaded: withAssets },
  warning: "Contenu brut : les scripts correctifs (image-overrides, *-restore, editorial-*…) modifient les articles à l'exécution. Ne pas considérer articles.js comme la version canonique.",
};
writeFileSync(path.join(out, "rapport.json"), JSON.stringify(report, null, 2));
console.log(`Instantané : ${out}\n${scripts.length} scripts · ${baseArticles.length} articles de base · ${assets.length} médias référencés`);
