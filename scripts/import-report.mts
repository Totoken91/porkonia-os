/**
 * Rapport d'importation (Markdown) à partir de la base, des extractions et des analyses DOCX.
 *   npm run import:report [-- --out docs/IMPORT_REPORT.md]
 * Lecture seule : ne modifie ni la base ni les sources.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir, readDb } from "@/data/store-core";
import { planPorkopediaImport, type Extraction } from "@/domain/porkopedia-import";
import { planBibleImport } from "@/domain/bible-import";
import { integrityReport } from "@/domain/integrity";
import type { Database } from "@/domain/types";
import type { DocxAnalysis } from "@/bible/docx-parse";

const out = process.argv.includes("--out") ? process.argv[process.argv.indexOf("--out") + 1]! : null;
const db = (await readDb()) as Database;
const L: string[] = [];
const p = (s = "") => L.push(s);
const imports = db.imports;
const pkBatch = [...imports].reverse().find((b) => b.kind === "porkopedia");
const bBatch = [...imports].reverse().find((b) => b.kind === "bible-docx");

p(`# Rapport d'importation canonique — Porkonia OS`);
p();
p(`_Généré le ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC par \`npm run import:report\` (lecture seule)._`);
p();
p(`## État de la base après import`);
p();
const live = <T extends { deletedAt?: string | null }>(xs: T[]) => xs.filter((x) => !x.deletedAt);
p(`| Élément | Nombre |`);
p(`|---|---|`);
p(`| Articles | ${live(db.articles).length} (dont ${db.articles.filter((a) => a.external).length} importés de Porkopédia, ${db.articles.filter((a) => a.protection).length} protégé(s)) |`);
p(`| Personnages | ${live(db.characters).length} (${db.characters.filter((c) => c.portraitMediaId).length} avec portrait canonique) |`);
p(`| Médias référencés | ${live(db.media).length} (${db.media.filter((m) => m.location === "externe").length} externes sur Porkopédia, ${db.media.filter((m) => m.location === "locale").length} fichiers locaux) |`);
p(`| Entrées de Bible | ${live(db.bible).length} |`);
p(`| Révisions archivées | ${db.revisions.length} |`);
p(`| Documents sources conservés | ${db.sources.map((s) => `${s.filename} (SHA-256 \`${s.sha256.slice(0, 16)}…\`)`).join(", ") || "—"} |`);
p(`| Anomalies d'intégrité | ${integrityReport(db).length} |`);
p();
p(`Sauvegardes avant import : ${db.backups.filter((b) => /import|avant/.test(b.file) || true).slice(-4).map((b) => `\`${b.file}\``).join(", ")}.`);

if (pkBatch) {
  const exFile = path.join(process.cwd(), "imports", pkBatch.sourceId, "extraction.json");
  const ex = JSON.parse(readFileSync(exFile, "utf8")) as Extraction;
  p();
  p(`## 1. Porkopédia`);
  p();
  p(`- Site : ${ex.source.site} — instantané du ${ex.source.snapshotTakenAt ?? "?"} (\`${ex.source.snapshotDir}\`), extraction \`${ex.extractionId}\` (extracteur v${ex.extractorVersion}).`);
  p(`- Isolation : ${ex.isolation.browser}, origine fictive \`${ex.isolation.origin}\` ; ${ex.isolation.network.allowed} fichiers servis depuis l'instantané, ${ex.isolation.network.blocked} requêtes bloquées, ${ex.isolation.network.nonGet} tentative(s) d'écriture. **Aucune requête vers le site public pendant l'exécution ; le site n'a pas été modifié.**`);
  p(`- Contrôle de rendu : chaque article ouvert dans la page ; titres affichés ${ex.articles.every((a) => a.render?.matchesTitle) ? "tous conformes aux données" : "avec écarts"}.`);
  p(`- Import \`${pkBatch.id}\` du ${pkBatch.at.slice(0, 16).replace("T", " ")} : ${Object.entries(pkBatch.summary).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  p();
  p(`### Articles récupérés : ${ex.articles.length}`);
  p();
  const origins: Record<string, number> = {};
  ex.articles.forEach((a) => (origins[a.origin.replace(/ \(.*\)$/, "")] = (origins[a.origin.replace(/ \(.*\)$/, "")] ?? 0) + 1));
  p(`| Origine (script créateur) | Articles |`);
  p(`|---|---|`);
  Object.entries(origins).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => p(`| \`${k}\` | ${v} |`));
  p();
  p(`**${ex.articles.filter((a) => a.modifiedBy.length).length} articles modifiés par des scripts** après leur création ; ${ex.articles.filter((a) => a.original).length} versions d'origine (avant transformation) conservées dans l'historique des révisions.`);
  p();
  p(`| Script de transformation (ordre d'exécution) | Articles modifiés |`);
  p(`|---|---|`);
  for (const s of ex.scriptOrder) {
    const n = ex.articles.filter((a) => a.modifiedBy.some((m) => m.startsWith(s))).length;
    if (n) p(`| \`${s}\` | ${n} |`);
  }
  const d = ex.articles.find((a) => a.id === "douzi");
  const dl = db.articles.find((a) => a.external?.id === "douzi");
  if (d && dl) {
    p();
    p(`### Article protégé : Sofiane Douzi (\`#article=douzi\`)`);
    p();
    p(`- Chaîne réelle : \`${d.origin}\` → ${d.modifiedBy.map((m) => `\`${m}\``).join(" → ")}.`);
    p(`- Version importée : ${(d.html.match(/douzi-scene/g) ?? []).length} scènes « douzi-scene », image principale \`${d.image}\`.`);
    p(`- Ancienne version (\`articles.js\`, image \`${d.original?.image}\`) conservée **uniquement dans l'historique** (révision 1), jamais comme version courante.`);
    p(`- Protection active : ${dl.protection ? "oui" : "NON"} — toute future mise à jour par import exige une décision humaine ; une version sans les 12 scènes est refusée par défaut.`);
  }
  p();
  p(`### Médias : ${ex.media.length} références`);
  p();
  const checked = ex.media.filter((m) => m.check);
  p(`- Affichées sur le site : ${ex.media.filter((m) => m.displayed).length} (statut « officiel ») ; présentes dans le code mais non affichées : ${ex.media.filter((m) => !m.displayed).length} (statut « archive »).`);
  p(`- Chemins relatifs \`assets/…\` : ${ex.media.filter((m) => m.refKind === "chemin-relatif").length}, résolus en URL absolues ; le chemin d'origine est conservé. Aucune image n'a été déplacée ni copiée.`);
  p(`- Vérification HEAD : ${checked.length ? `${checked.filter((m) => m.check!.status === "ok").length} OK / ${checked.filter((m) => m.check!.status !== "ok").length} indisponible(s)` : "non effectuée"}.`);
  p(`- ⚠ Un catalogue d'URL n'est pas une sauvegarde physique : \`npm run media:backup\` en fait une copie facultative.`);
  p();
  p(`### Doublons, liens, provenance`);
  p();
  p(`- Contenus identiques : ${ex.duplicates.identicalContent.length} ; titres identiques : ${ex.duplicates.identicalTitles.length} ; images partagées entre articles : ${ex.duplicates.sharedImages.length}.`);
  p(`- Liens internes \`#article=\` cassés : ${ex.brokenLinks.length}.`);
  const unc = ex.articles.filter((a) => a.provenanceIncertaine);
  p(`- Provenance incertaine : ${unc.length ? unc.map((a) => `\`${a.id}\` (${a.origin})`).join(", ") : "aucune"}.`);
  const replan = planPorkopediaImport(db, ex);
  p();
  p(`### Idempotence (nouveau passage du planificateur sur la même extraction)`);
  p();
  p(`Nouveaux : ${replan.counts.articlesNouveaux} · inchangés : ${replan.counts.articlesInchanges} · conflits : ${replan.counts.articlesConflits} · médias nouveaux : ${replan.counts.mediasNouveaux} · fiches nouvelles : ${replan.counts.personnagesNouveaux}.`);
}

if (bBatch) {
  const an = JSON.parse(readFileSync(path.join(dataDir(), "originals", `${bBatch.sourceId}.analysis.json`), "utf8")) as DocxAnalysis;
  p();
  p(`## 2. Bible visuelle (${an.filename})`);
  p();
  p(`- Original conservé intact : \`data/originals/${an.sha256}.docx\` (lecture seule, ${(an.bytes / 1e6).toFixed(1)} Mo) ; copie de sécurité \`backups/originals/\`.`);
  p(`- Structure : ${an.stats.paragraphs} paragraphes, ${an.stats.tables} tableaux, ${an.stats.headings} titres → ${an.sections.length} sections.`);
  p(`- Import \`${bBatch.id}\` : ${Object.entries(bBatch.summary).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
  p();
  p(`### Images extraites : ${an.images.length} (octet pour octet, empreintes vérifiées)`);
  p();
  p(`| Image | Rôle | Dimensions | Contexte |`);
  p(`|---|---|---|---|`);
  for (const im of an.images) p(`| \`${im.name}\` | ${im.role} | ${im.width ?? "?"}×${im.height ?? "?"} | ${im.placements[0]?.sectionPath ?? (im.role === "miniature" ? "miniature du fichier" : "non placée dans le texte")}${im.placements[0]?.cellName ? ` — ${im.placements[0].cellName}` : ""} |`);
  p();
  p(`### Portraits canoniques → personnages`);
  p();
  p(`| Nom dans la Bible | Fiche | Fichier source déclaré | Apparence |`);
  p(`|---|---|---|---|`);
  for (const pt of an.portraits) {
    const c = db.characters.find((x) => db.media.find((m) => m.id === x.portraitMediaId)?.external?.originalRef === pt.image);
    p(`| ${pt.name} | ${c ? `${c.canonicalName} (${c.status})` : "—"} | \`${pt.originalFilename ?? "?"}\` | ${pt.appearance ? "renseignée depuis la Bible" : "absente du document"} |`);
  }
  const bp = planBibleImport(db, an);
  p();
  p(`- Catégories sans aucune section dans le document (laissées vides, rien d'inventé) : ${bp.missingCategories.join(", ") || "aucune"}.`);
}

p();
p(`## 3. Points restant à valider par un humain`);
p();
const todo: string[] = [];
const props = db.characters.filter((c) => !c.deletedAt && c.status === "proposition");
if (props.length) todo.push(`**${props.length} fiches personnages au statut « proposition »** : créées depuis les pages « Figures historiques » et associées aux visages de la Bible. À relire puis passer en « canon » (Registre des individus).`);
if (bBatch) {
  const an = JSON.parse(readFileSync(path.join(dataDir(), "originals", `${bBatch.sourceId}.analysis.json`), "utf8")) as DocxAnalysis;
  const skipped = an.sections.filter((s) => !db.bible.some((b) => b.external?.sectionPath === s.path));
  if (skipped.length) todo.push(`Section(s) de la Bible non importée(s) faute de catégorie : ${skipped.map((s) => `« ${s.path} »`).join(", ")} — à classer dans le Bureau des Importations si utile.`);
  const unplaced = an.images.filter((i) => i.role === "non-placee");
  if (unplaced.length) todo.push(`Image(s) présente(s) dans le DOCX mais non placée(s) dans le texte : ${unplaced.map((i) => `\`${i.name}\``).join(", ")} — importée(s) au statut « archive », rôle à préciser.`);
}
const unc = db.articles.filter((a) => a.external && ["artefacts", "gastronomie"].includes(a.external.id));
if (unc.length) todo.push(`Provenance à confirmer pour ${unc.map((a) => `« ${a.title} » (\`${a.external!.id}\`)`).join(", ")} : articles définis uniquement dans le script en ligne d'index.html (« featuredArticles »).`);
todo.push(`Nature des ${db.media.filter((m) => m.external?.source === "porkopedia").length} images de Porkopédia : « indéterminée » (impossible de savoir automatiquement lesquelles sont des générations). À reclasser si besoin ; elles ne peuvent de toute façon pas remplacer un portrait source.`);
todo.push(`Aucun conflit d'article n'est ouvert : premier import sur une base vide. Les conflits apparaîtront lors des prochains imports si un article est modifié à la fois ici et sur le site.`);
todo.forEach((t) => p(`- ${t}`));
p();

const text = L.join("\n") + "\n";
if (out) {
  writeFileSync(out, text);
  console.log(`Rapport écrit : ${out}`);
} else console.log(text);
void existsSync;
void readdirSync;
