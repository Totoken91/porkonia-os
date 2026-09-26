/**
 * Paquet d'intégration Porkopédia (ChatGPT Sites) pour une publication locale.
 *
 * Principe compatible avec l'architecture réelle du site (voir docs/CHATGPT_SITES_INTEGRATION.md) :
 * - un fichier JS autonome ajoute les NOUVEAUX articles à window.PORKO_ARCHIVE ;
 * - il est inséré APRÈS le dernier script de transformation et AVANT le script en ligne qui assemble
 *   l'objet `articles` → le contenu publié n'est pas retouché par les passes éditoriales du site ;
 * - il n'écrase JAMAIS un article existant (identifiant déjà présent → ignoré, avertissement console) ;
 * - retour arrière : retirer la balise <script> et le fichier.
 * Version 1 : seuls les AJOUTS sont automatisés ; une modification d'article existant est bloquante.
 */
import { createHash } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import type { Article, Database, Publication, PublishedArticle } from "@/domain/types";
import type { Extraction } from "@/domain/porkopedia-import";
import { resolveArticle } from "@/domain/ops";
import { renderForPorkopedia } from "./render-html";

const sha = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");

export interface SiteArticle {
  id: string;
  title: string;
  sub: string;
  section: string;
  lead: string;
  tags: string[];
  image: string;
  imageAlt?: string;
  html: string;
}

export interface PorkopediaPackage {
  format: "porkonia-os/porkopedia-package@1";
  publication: { number: number; id: string; contentHash: string; createdAt: string };
  baselineExtractionId: string | null;
  fileName: string;
  script: string;
  scriptSha256: string;
  insertAfter: string;
  delta: {
    nouveaux: { id: string; title: string; localId: string }[];
    modifies: { id: string; title: string; localId: string }[];
    inchanges: number;
    retires: { id: string; title: string }[];
  };
  articles: SiteArticle[];
  blocking: string[];
  warnings: string[];
  expected: { added: string[]; modified: string[] };
  instructions: string;
  prompt: string;
}

function isUnchangedOnSite(db: Database, pa: PublishedArticle): boolean {
  const a = db.articles.find((x) => x.id === pa.id);
  return !!(pa.externalId && a?.external && pa.revision <= a.external.importedRevision);
}

export function buildPorkopediaPackage(db: Database, pub: Publication, baseline: Extraction | null): PorkopediaPackage {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const siteIds = new Set((baseline?.articles ?? []).map((a) => a.id));
  if (!baseline) warnings.push("Aucune extraction de référence du site : collisions d'identifiants et point d'insertion non vérifiés.");
  const nouveaux: PorkopediaPackage["delta"]["nouveaux"] = [];
  const modifies: PorkopediaPackage["delta"]["modifies"] = [];
  let inchanges = 0;
  const newIds = new Set(pub.articles.filter((pa) => !pa.externalId).map((pa) => pa.slug));

  const articles: SiteArticle[] = [];
  for (const pa of pub.articles) {
    if (isUnchangedOnSite(db, pa)) {
      inchanges += 1;
      continue;
    }
    if (pa.externalId) {
      modifies.push({ id: pa.externalId, title: pa.title, localId: pa.id });
      blocking.push(`« ${pa.title} » (#article=${pa.externalId}) a été modifié localement : la modification d'un article existant n'est pas automatisée (v1). Retirez-le de la publication ou intégrez-le à la main.`);
      continue;
    }
    const siteId = pa.slug;
    if (siteIds.has(siteId)) blocking.push(`L'identifiant « ${siteId} » existe déjà sur Porkopédia : changez le slug de « ${pa.title} ».`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(siteId)) blocking.push(`Identifiant « ${siteId} » invalide pour une adresse #article=.`);
    const local = db.articles.find((x) => x.id === pa.id) as Article | undefined;
    const coverMedia = local?.coverMediaId ? db.media.find((m) => m.id === local.coverMediaId) : undefined;
    const image = coverMedia?.external?.source === "porkopedia" ? coverMedia.external.originalRef : null;
    if (!image) blocking.push(`« ${pa.title} » : l'illustration principale doit être un média déjà hébergé sur Porkopédia (le site affiche toujours une image dans l'encadré).`);
    let html = pa.body;
    if ((pa.format ?? "markdown") === "markdown") {
      const r = renderForPorkopedia(pa.body, {
        resolveArticle: (key) => {
          const t = resolveArticle(db, key);
          if (!t || t.deletedAt) return null;
          const target = t.external?.id ?? t.slug;
          if (!siteIds.has(target) && !newIds.has(target)) return null;
          return { siteId: target, title: t.title };
        },
        resolveMedia: (id) => {
          const m = db.media.find((x) => x.id === id);
          return m?.external?.source === "porkopedia" ? { src: m.external.originalRef, name: m.name } : null;
        },
      });
      // Convention du site : le corps commence par le chapeau (<p class="lead">), utilisé comme introduction.
      const escHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = pa.lead.trim() ? `<p class="lead">${escHtml(pa.lead.trim())}</p>\n${r.html}` : r.html;
      r.problems.forEach((p) => blocking.push(`« ${pa.title} » : ${p}`));
    }
    if (!html.trim()) blocking.push(`« ${pa.title} » : corps vide.`);
    const alt = coverMedia && !/\.[a-z0-9]{2,5}$/i.test(coverMedia.name) ? coverMedia.name : undefined; // sinon le site utilise le titre
    articles.push({ id: siteId, title: pa.title, sub: pa.subtitle, section: pa.section, lead: pa.lead, tags: pa.tags, image: image ?? "", ...(alt ? { imageAlt: alt } : {}), html });
    nouveaux.push({ id: siteId, title: pa.title, localId: pa.id });
  }
  const publishedIds = new Set(pub.articles.map((a) => a.externalId ?? a.slug));
  const retires = [...siteIds].filter((id) => !publishedIds.has(id) && db.articles.some((a) => a.external?.id === id && a.deletedAt)).map((id) => ({ id, title: db.articles.find((a) => a.external?.id === id)!.title }));
  if (retires.length) warnings.push(`${retires.length} article(s) du site sont dans la corbeille locale : le retrait d'un article du site n'est pas automatisé (v1) et n'est PAS inclus dans ce paquet.`);
  if (!nouveaux.length) blocking.push("Aucun nouvel article à intégrer : rien à déployer.");

  // Point d'insertion : juste après le dernier script externe exécuté avant l'assemblage en ligne.
  const order = baseline?.scriptOrder ?? [];
  const firstInline = order.findIndex((s) => s.startsWith("index.html#"));
  const insertAfter = (firstInline > 0 ? order.slice(0, firstInline) : order).filter((s) => !s.startsWith("index.html#")).at(-1) ?? "image-dimensions.js";

  const n = String(pub.number).padStart(3, "0");
  const fileName = `porkonia-os-publication-${n}.js`;
  const contentHash = sha(JSON.stringify(articles));
  const script = [
    `/*`,
    ` * Porkonia OS — publication locale n°${pub.number} (${pub.createdAt})`,
    ` * Fichier généré automatiquement : NE PAS MODIFIER À LA MAIN.`,
    ` * Ajoute ${articles.length} nouvel(s) article(s) à window.PORKO_ARCHIVE ; n'écrase jamais un article existant.`,
    ` * Empreinte du contenu : ${contentHash}`,
    ` * À charger juste après ${insertAfter}.`,
    ` */`,
    `(function () {`,
    `  "use strict";`,
    `  var archive = (window.PORKO_ARCHIVE = window.PORKO_ARCHIVE || []);`,
    `  var nouveaux = ${JSON.stringify(articles, null, 2).replace(/\n/g, "\n  ")};`,
    `  nouveaux.forEach(function (a) {`,
    `    for (var i = 0; i < archive.length; i++) {`,
    `      if (archive[i] && archive[i].id === a.id) { console.warn("Porkonia OS : l'article " + a.id + " existe déjà, il n'est pas remplacé."); return; }`,
    `    }`,
    `    archive.push(a);`,
    `  });`,
    `  window.PORKONIA_OS_PUBLICATIONS = (window.PORKONIA_OS_PUBLICATIONS || []).concat([{ numero: ${pub.number}, empreinte: "${contentHash}" }]);`,
    `})();`,
    ``,
  ].join("\n");
  const scriptSha256 = sha(script);
  const site = baseline?.source.site ?? "https://porkopedia.totoken.chatgpt.site/";
  const tag = `<script src="${fileName}"></script>`;

  const instructions = [
    `# Intégration de la publication n°${pub.number} dans Porkopédia (ChatGPT Sites)`,
    ``,
    `> Ce paquet ne modifie rien par lui-même. L'intégration est une opération manuelle, à faire **uniquement avec votre autorisation explicite**.`,
    ``,
    `## Changements attendus sur le site`,
    ``,
    ...nouveaux.map((a) => `- **+ Nouvel article** : « ${a.title} » → ${site}#article=${a.id}`),
    `- Articles existants modifiés : **aucun** (${inchanges} article(s) déjà en ligne sont inchangés et ne sont pas concernés).`,
    `- Articles retirés : **aucun**.`,
    ``,
    `## Étapes`,
    ``,
    `1. Ouvrir le projet ChatGPT Sites de Porkopédia.`,
    `2. Créer le fichier \`${fileName}\` à la racine du site, avec **exactement** le contenu du fichier joint (SHA-256 \`${scriptSha256}\`).`,
    `3. Dans \`index.html\`, ajouter la ligne suivante **immédiatement après** \`<script src="${insertAfter}"></script>\`, et ne rien modifier d'autre :`,
    ``,
    "   ```html",
    `   ${tag}`,
    "   ```",
    ``,
    `4. Publier le site.`,
    `5. Contrôle visuel : ouvrir ${site}#article=${nouveaux[0]?.id ?? "…"} (titre, image, liens).`,
    `6. Vérification réelle dans Porkonia OS : \`npm run porkopedia:extract -- --check-media\`, puis Préfecture des Publications → « Comparer au site ».`,
    `   La publication ne sera marquée **déployée et vérifiée** que si cette comparaison réussit.`,
    ``,
    `## Retour arrière`,
    ``,
    `Supprimer la ligne \`${tag}\` de \`index.html\` et le fichier \`${fileName}\` : le site revient exactement à son état précédent (le script n'écrase et ne supprime aucun article).`,
    ``,
    `## Contrôles effectués avant export`,
    ``,
    `- Delta calculé contre l'extraction du site \`${baseline?.extractionId ?? "aucune"}\`.`,
    `- Simulation recommandée : \`npm run publication:simulate -- ${pub.number}\` (applique ce paquet à une copie locale du site et vérifie qu'il n'ajoute que les articles attendus).`,
    ...(blocking.length ? [``, `## ⚠ Blocages`, ``, ...blocking.map((b) => `- ${b}`)] : []),
    ...(warnings.length ? [``, `## Avertissements`, ``, ...warnings.map((w) => `- ${w}`)] : []),
    ``,
  ].join("\n");

  const prompt = [
    `Dans le site Porkopédia, fais UNIQUEMENT les deux modifications suivantes, sans rien changer d'autre (aucun autre fichier, aucun contenu, aucun style) :`,
    ``,
    `1. Crée un nouveau fichier nommé ${fileName} à la racine du site, avec exactement ce contenu (ne le reformate pas, ne le corrige pas) :`,
    ``,
    "```js",
    script.trimEnd(),
    "```",
    ``,
    `2. Dans index.html, insère exactement cette ligne juste après la ligne <script src="${insertAfter}"></script> :`,
    ``,
    tag,
    ``,
    `Ne modifie aucun autre article ni aucun autre script. Quand c'est fait, indique-moi la liste exacte des fichiers modifiés.`,
  ].join("\n");

  return {
    format: "porkonia-os/porkopedia-package@1",
    publication: { number: pub.number, id: pub.id, contentHash: pub.contentHash, createdAt: pub.createdAt },
    baselineExtractionId: baseline?.extractionId ?? null,
    fileName,
    script,
    scriptSha256,
    insertAfter,
    delta: { nouveaux, modifies, inchanges, retires },
    articles,
    blocking,
    warnings,
    expected: { added: nouveaux.map((a) => a.id), modified: [] },
    instructions,
    prompt,
  };
}

/** Archive ZIP du paquet : script, instructions, invite pour ChatGPT, manifeste, empreintes. */
export function zipPackage(pkg: PorkopediaPackage): Uint8Array {
  const { script, instructions, prompt, ...meta } = pkg;
  const manifest = JSON.stringify({ ...meta, scriptSha256: pkg.scriptSha256 }, null, 2);
  const files: Record<string, string> = {
    [pkg.fileName]: script,
    "INSTRUCTIONS.md": instructions,
    "PROMPT-CHATGPT-SITES.txt": prompt,
    "manifest.json": manifest,
  };
  const sums = Object.entries(files)
    .map(([name, content]) => `${sha(content)}  ${name}`)
    .join("\n");
  const all: [string, string][] = [...Object.entries(files), ["SHA256SUMS", sums + "\n"]];
  return zipSync(Object.fromEntries(all.map(([k, v]) => [k, strToU8(v)])));
}
