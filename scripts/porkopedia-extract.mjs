#!/usr/bin/env node
/**
 * EXTRACTEUR PORKOPÉDIA — contenu réellement affiché, après exécution des scripts.
 *
 *   npm run porkopedia:extract                          # instantané du site public puis extraction
 *   npm run porkopedia:extract -- --from imports/porkopedia-XXXX   # extraction reproductible hors ligne
 *   options : --check-media (vérifie chaque URL média, HEAD), --out <dossier>, --url <site>
 *
 * Isolation :
 *  - Les scripts de Porkopédia sont exécutés UNIQUEMENT dans un Chromium sans tête (processus séparé),
 *    jamais par Node ni par le serveur Porkonia OS.
 *  - La page est servie depuis une origine fictive (https://porkopedia.snapshot.invalid/) à partir de
 *    l'instantané figé sur disque ; toute autre requête est bloquée. Le site public n'est jamais contacté
 *    pendant l'exécution, et seules des requêtes GET sont faites lors de la prise d'instantané.
 *
 * Traçabilité :
 *  - Une sonde est injectée après chaque <script> (dans l'ordre réel) : empreinte de chaque article,
 *    globales PORKO_* créées → on sait quel script a créé / modifié chaque article.
 *  - Le contenu final est lu dans l'objet `articles` construit par index.html, puis chaque article est
 *    ouvert dans la page (openArticle) pour confirmer que le rendu correspond aux données.
 *
 * Reproductible : même instantané → même identifiant d'extraction et mêmes empreintes.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import playwright from "playwright";

const EXTRACTOR_VERSION = "1.0.0";
const FAKE_ORIGIN = "https://porkopedia.snapshot.invalid/";
const argv = process.argv.slice(2);
const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const flag = (k) => argv.includes(k);
const siteUrl = arg("--url", "https://porkopedia.totoken.chatgpt.site/");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const log = (...a) => console.error(...a);

/* ----------------------------------------------------------------------------------------- */
/* 1. Instantané (lecture seule)                                                              */
/* ----------------------------------------------------------------------------------------- */

async function fetchSnapshot(dest) {
  const get = async (rel) => {
    const res = await fetch(new URL(rel, siteUrl), { method: "GET", signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`${rel} : HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  };
  mkdirSync(dest, { recursive: true });
  const index = await get("");
  writeFileSync(path.join(dest, "index.html"), index);
  const html = index.toString("utf8");
  const refs = [...html.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"#?]+\.(?:js|css))"/g)].map((m) => m[1]).filter((s) => !/^(https?:)?\/\//.test(s));
  for (const r of [...new Set(refs)]) {
    const p = path.join(dest, r);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, await get(r));
  }
  return { source: siteUrl, takenAt: new Date().toISOString() };
}

function locateSiteDir(from) {
  if (existsSync(path.join(from, "site", "index.html"))) return path.join(from, "site");
  if (existsSync(path.join(from, "index.html"))) return from;
  throw new Error(`Aucun index.html dans ${from}`);
}

/* ----------------------------------------------------------------------------------------- */
/* 2. Instrumentation de index.html                                                           */
/* ----------------------------------------------------------------------------------------- */

const PROBE = String.raw`
(function(){
  var h = function(str){ var h1=0xdeadbeef, h2=0x41c6ce57; for (var i=0;i<str.length;i++){ var ch=str.charCodeAt(i); h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677);} h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909); return (4294967296*(2097151&h2)+(h1>>>0)).toString(36); };
  var st = { steps: [], first: {}, firstLabel: {}, globals: {}, final: null, finalLabel: null, dims: null, errors: [] };
  window.addEventListener('error', function(e){ st.errors.push(String(e.message)+' @ '+(e.filename||'')+':'+(e.lineno||'')); });
  function isArticle(o){ return o && typeof o==='object' && typeof o.id==='string' && typeof o.title==='string'; }
  function collect(){
    var out = {};
    Object.keys(window).filter(function(k){ return k.indexOf('PORKO_')===0; }).forEach(function(k){
      var v = window[k];
      if (Array.isArray(v)) v.forEach(function(a){ if (isArticle(a)) out[a.id] = a; });
      else if (isArticle(v) && typeof v.html==='string') out[v.id] = v;
    });
    return out;
  }
  window.__pk = {
    snap: function(label){
      try {
        Object.keys(window).filter(function(k){ return k.indexOf('PORKO_')===0; }).forEach(function(k){
          if (!(k in st.globals)) {
            var v = window[k];
            var kind = Array.isArray(v) ? 'array' : (v && typeof v==='object' ? (isArticle(v) ? 'article' : 'map') : typeof v);
            var keys = kind==='map' ? Object.keys(v) : [];
            st.globals[k] = { definedBy: label, kind: kind, keys: keys, id: kind==='article' ? v.id : null };
          }
        });
        var arts = collect(), hashes = {};
        Object.keys(arts).forEach(function(id){
          var json = JSON.stringify(arts[id]);
          hashes[id] = h(json);
          if (!(id in st.first)) { st.first[id] = json; st.firstLabel[id] = label; }
        });
        st.steps.push({ label: label, hashes: hashes });
      } catch (e) { st.errors.push('sonde '+label+' : '+e.message); }
    },
    finalize: function(label, arts){
      if (st.final) return;
      var out = {};
      Object.keys(arts).forEach(function(id){ out[id] = JSON.parse(JSON.stringify(arts[id])); });
      st.final = out; st.finalLabel = label;
      st.dims = window.PORKO_IMAGE_DIMENSIONS ? JSON.parse(JSON.stringify(window.PORKO_IMAGE_DIMENSIONS)) : null;
    },
    state: st
  };
})();`;

function instrument(html) {
  let inlineN = 0;
  const scripts = [];
  let out = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g, (all, attrs, body) => {
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    if (src) {
      scripts.push({ type: "src", name: src, deferred: /\b(defer|async|type="module")\b/.test(attrs) });
      return `${all}\n<script>__pk.snap(${JSON.stringify(src)})</script>`;
    }
    inlineN += 1;
    const label = `index.html#script-en-ligne-${inlineN}`;
    scripts.push({ type: "inline", name: label, bytes: body.length });
    // Une sonde après chaque script en ligne : si l'objet global `articles` existe, c'est le contenu final.
    return `${all}\n<script>__pk.snap(${JSON.stringify(label)});try{if(typeof articles!=='undefined'&&articles)__pk.finalize(${JSON.stringify(label)},articles)}catch(e){}</script>`;
  });
  out = out.replace(/<head([^>]*)>/i, (m) => `${m}\n<script>${PROBE}</script>`);
  return { html: out, scripts };
}

/* ----------------------------------------------------------------------------------------- */
/* 3. Exécution isolée                                                                         */
/* ----------------------------------------------------------------------------------------- */

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function runIsolated(siteDir, instrumentedHtml) {
  const browser = await playwright.chromium.launch({ headless: true, args: ["--disable-background-networking"] });
  const network = { allowed: 0, blocked: 0, nonGet: 0, blockedUrls: [] };
  try {
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false, bypassCSP: false });
    await context.route("**/*", async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (req.method() !== "GET") network.nonGet += 1;
      if (url.origin + "/" !== FAKE_ORIGIN || req.method() !== "GET") {
        network.blocked += 1;
        if (network.blockedUrls.length < 20) network.blockedUrls.push(`${req.method()} ${url.origin}${url.pathname}`);
        return route.abort("blockedbyclient");
      }
      const rel = decodeURIComponent(url.pathname.slice(1)) || "index.html";
      if (rel === "index.html") {
        network.allowed += 1;
        return route.fulfill({ status: 200, contentType: MIME[".html"], body: instrumentedHtml });
      }
      const file = path.resolve(siteDir, rel);
      const ext = path.extname(file);
      if (!file.startsWith(path.resolve(siteDir) + path.sep) || !MIME[ext] || !existsSync(file)) {
        // Médias et fichiers absents de l'instantané : non chargés (inutiles à l'extraction).
        network.blocked += 1;
        return route.fulfill({ status: 404, body: "" });
      }
      network.allowed += 1;
      return route.fulfill({ status: 200, contentType: MIME[ext], body: readFileSync(file) });
    });
    const page = await context.newPage();
    await page.goto(FAKE_ORIGIN + "index.html", { waitUntil: "load", timeout: 120_000 });
    const state = await page.evaluate(() => window.__pk.state);
    // Contrôle de rendu : chaque article est ouvert dans la vraie page.
    const ids = Object.keys(state.final ?? {});
    const render = await page.evaluate(async (ids) => {
      const out = {};
      if (typeof openArticle !== "function") return { unavailable: true };
      for (const id of ids) {
        try {
          openArticle(id, { mode: "none" });
          const root = document.querySelector("#dynamicArticle") || document.body;
          const h1 = root.querySelector("h1");
          out[id] = { title: h1 ? h1.textContent.trim() : null, images: root.querySelectorAll("img").length };
        } catch (e) {
          out[id] = { error: String(e && e.message) };
        }
      }
      return out;
    }, ids);
    await context.close();
    return { state, render, network };
  } finally {
    await browser.close();
  }
}

/* ----------------------------------------------------------------------------------------- */
/* 4. Analyse                                                                                  */
/* ----------------------------------------------------------------------------------------- */

const CONTENT_FIELDS = ["title", "sub", "section", "tags", "lead", "image", "html"];
const canon = (a) => JSON.stringify(Object.fromEntries(CONTENT_FIELDS.map((k) => [k, a[k] ?? null])));
export const contentHash = (a) => sha(canon(a));

function classifyRef(ref) {
  if (/^data:/i.test(ref)) return "donnees-integrees";
  if (/^https?:\/\//i.test(ref)) return "url-absolue";
  if (/^\/\//.test(ref)) return "url-absolue";
  if (/^#/.test(ref)) return "interne";
  return "chemin-relatif";
}

function mediaRefsInHtml(html) {
  const refs = [];
  for (const m of String(html || "").matchAll(/<(img|source|audio|video)\b[^>]*\bsrc=["']([^"']+)["']/gi)) refs.push(m[2]);
  for (const m of String(html || "").matchAll(/\bdata-(?:full|src|image)=["']([^"']+\.(?:png|jpe?g|webp|gif|svg|avif))["']/gi)) refs.push(m[1]);
  return refs;
}

function internalLinks(html) {
  const out = new Set();
  for (const m of String(html || "").matchAll(/data-article=["']([^"']+)["']/g)) out.add(m[1]);
  for (const m of String(html || "").matchAll(/href=["']#article=([^"'&]+)["']/g)) out.add(decodeURIComponent(m[1]));
  return [...out];
}

function parseFigureAliases(text) {
  const block = /figureAliases\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(text)?.[1];
  if (!block) return {};
  const out = {};
  for (const m of block.matchAll(/["']([\w-]+)["']\s*:\s*\[([^\]]*)\]/g)) out[m[1]] = [...m[2].matchAll(/"([^"]+)"|'([^']+)'/g)].map((x) => x[1] ?? x[2]);
  return out;
}

async function checkUrls(urls) {
  const res = {};
  let i = 0;
  const worker = async () => {
    while (i < urls.length) {
      const u = urls[i++];
      try {
        let r = await fetch(u, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
        if (r.status === 405 || r.status === 403) r = await fetch(u, { method: "GET", headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(15_000) });
        res[u] = { status: r.ok ? "ok" : "erreur", httpStatus: r.status, contentType: r.headers.get("content-type") ?? undefined };
      } catch (e) {
        res[u] = { status: "erreur", message: String(e?.message ?? e) };
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return res;
}

async function main() {
  const t0 = Date.now();
  let snapshotInfo;
  let siteDir;
  const from = arg("--from", null);
  const stampNow = new Date().toISOString().replace(/[:.]/g, "-");
  if (from) {
    siteDir = locateSiteDir(from);
    const rep = path.join(path.dirname(siteDir), "rapport.json");
    snapshotInfo = existsSync(rep) ? { source: JSON.parse(readFileSync(rep, "utf8")).source ?? siteUrl, takenAt: JSON.parse(readFileSync(rep, "utf8")).takenAt ?? null } : { source: siteUrl, takenAt: null };
  } else {
    const snapDir = path.join(process.cwd(), "imports", `porkopedia-${stampNow}`);
    siteDir = path.join(snapDir, "site");
    log(`Instantané lecture seule de ${siteUrl} …`);
    snapshotInfo = await fetchSnapshot(siteDir);
    writeFileSync(path.join(snapDir, "rapport.json"), JSON.stringify(snapshotInfo, null, 2));
  }

  // Empreintes des fichiers sources → identifiant d'extraction déterministe.
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const files = walk(siteDir)
    .map((f) => ({ file: path.relative(siteDir, f).split(path.sep).join("/"), sha256: sha(readFileSync(f)), bytes: readFileSync(f).length }))
    .sort((a, b) => a.file.localeCompare(b.file));
  const extractionId = `ext_${sha(JSON.stringify(files) + EXTRACTOR_VERSION).slice(0, 16)}`;
  const out = arg("--out", path.join(process.cwd(), "imports", extractionId));
  mkdirSync(out, { recursive: true });

  const indexHtml = readFileSync(path.join(siteDir, "index.html"), "utf8");
  const { html: instrumented, scripts } = instrument(indexHtml);
  const warnings = [];
  if (scripts.some((s) => s.deferred)) warnings.push("Des scripts defer/async/module existent : l'attribution par ordre d'exécution peut être approximative.");

  log(`Exécution isolée de ${scripts.length} scripts dans Chromium (origine fictive, réseau bloqué) …`);
  const { state, render, network } = await runIsolated(siteDir, instrumented);
  if (!state.final) throw new Error("Contenu final introuvable : l'objet `articles` n'a pas été construit par la page.");
  if (network.nonGet) warnings.push(`${network.nonGet} requête(s) non-GET tentée(s) par la page (bloquées).`);
  state.errors.forEach((e) => warnings.push(`Erreur JavaScript dans la page : ${e}`));

  const texts = Object.fromEntries(files.filter((f) => /\.(js|html)$/.test(f.file)).map((f) => [f.file, readFileSync(path.join(siteDir, f.file), "utf8")]));
  // Surcharges appliquées par le script en ligne : Object.assign(articles.X, window.G) / articles[window.G.id] = window.G
  const inlineCode = [...indexHtml.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
  const assignRules = [];
  for (const m of inlineCode.matchAll(/Object\.assign\(\s*articles(?:\.([\w$]+)|\[['"]([\w-]+)['"]\])\s*,\s*window\.(PORKO_\w+)\s*\)/g))
    assignRules.push({ id: m[1] ?? m[2], global: m[3] });
  // Remplacements complets : featuredArticles (Object.assign(articles, featuredArticles)) et articles[window.G.id] = window.G
  const featuredBlock = /featuredArticles\s*=\s*\{([\s\S]*?)\n\};/.exec(inlineCode)?.[1] ?? "";
  const featuredIds = new Set([...featuredBlock.matchAll(/^\s*['"]?([\w-]+)['"]?\s*:\s*\{\s*title\s*:/gm)].map((m) => m[1]));
  const replaceRules = [...inlineCode.matchAll(/articles\[\s*window\.(PORKO_\w+)\.id\s*\]\s*=/g)].map((m) => m[1]);
  const inlineTouched = new Set([...inlineCode.matchAll(/articles(?:\.([\w$]+)|\[['"]([\w-]+)['"]\])\.(?:html|image|title|sub|lead|tags|section)\s*\+?=/g)].map((m) => m[1] ?? m[2]));

  const labels = state.steps.map((s) => s.label);
  const finalLabel = state.finalLabel;
  const lastStepBeforeFinal = state.steps.filter((s) => s.label !== finalLabel).at(-1);
  const figureAliases = parseFigureAliases(texts["figure-galleries.js"] ?? "");

  const articles = Object.entries(state.final)
    .map(([id, a]) => {
      a.id = id;
      // Origine
      let origin = state.firstLabel[id] ?? null;
      const globalDef = Object.entries(state.globals).find(([, g]) => g.kind === "article" && g.id === id);
      if (!origin && globalDef) origin = globalDef[1].definedBy;
      const featuredInline = !origin;
      if (!origin) origin = `${finalLabel} (featuredArticles)`;
      // Scripts ayant modifié l'article (ordre d'exécution)
      const modifiedBy = [];
      let prev = null;
      for (const step of state.steps) {
        const hsh = step.hashes[id];
        if (hsh === undefined) continue;
        if (prev !== null && hsh !== prev && step.label !== finalLabel) modifiedBy.push(step.label);
        prev = hsh;
      }
      for (const [g, info] of Object.entries(state.globals)) {
        if (info.kind === "map" && info.keys.includes(id) && info.definedBy !== origin) modifiedBy.push(`${info.definedBy} (${g}, appliqué par index.html)`);
      }
      if (featuredIds.has(id) && state.firstLabel[id]) modifiedBy.push(`${finalLabel} (featuredArticles : remplacement complet)`);
      for (const g of replaceRules) {
        const info = state.globals[g];
        if (info?.id === id && info.definedBy !== state.firstLabel[id]) modifiedBy.push(`${info.definedBy} (${g} : remplacement complet, appliqué par index.html)`);
      }
      for (const r of assignRules) if (r.id === id) modifiedBy.push(`${state.globals[r.global]?.definedBy ?? "?"} (${r.global}, appliqué par index.html)`);
      const finalHash = contentHash(a);
      const firstJson = state.first[id] ? JSON.parse(state.first[id]) : null;
      const originalHash = firstJson ? contentHash(firstJson) : null;
      const explained = modifiedBy.length > 0;
      if (inlineTouched.has(id) || (firstJson && originalHash !== finalHash && !explained)) modifiedBy.push(`${finalLabel} (modification directe)`);
      const uniq = [...new Set(modifiedBy)];
      const provenanceIncertaine = featuredInline || (firstJson && originalHash !== finalHash && uniq.length === 0);
      const rendered = render?.[id];
      return {
        id,
        title: a.title ?? "",
        sub: a.sub ?? "",
        section: a.section ?? "",
        tags: Array.isArray(a.tags) ? a.tags : [],
        lead: a.lead ?? "",
        image: a.image ?? null,
        html: a.html ?? "",
        extraFields: Object.keys(a).filter((k) => ![...CONTENT_FIELDS, "id"].includes(k)),
        contentHash: finalHash,
        origin,
        modifiedBy: uniq,
        original: firstJson && originalHash !== finalHash ? { ...Object.fromEntries(CONTENT_FIELDS.map((k) => [k, firstJson[k] ?? null])), contentHash: originalHash, capturedAfter: state.firstLabel[id] } : null,
        provenanceIncertaine: !!provenanceIncertaine,
        render: rendered ? { title: rendered.title ?? null, images: rendered.images ?? 0, matchesTitle: rendered.title === (a.title ?? "") } : null,
        mediaRefs: [...new Set([a.image, ...mediaRefsInHtml(a.html)].filter(Boolean))],
        links: internalLinks(a.html),
      };
    })
    .sort((x, y) => x.id.localeCompare(y.id));

  // Médias : affichés (articles + page d'accueil) et références présentes dans le code mais non affichées.
  const homeHtml = indexHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const homeRefs = new Set(mediaRefsInHtml(homeHtml).concat([...homeHtml.matchAll(/<link[^>]+rel="icon"[^>]+href="([^"]+)"/g)].map((m) => m[1])));
  const mediaMap = new Map();
  const addMedia = (ref, info) => {
    if (!ref) return;
    const kind = classifyRef(ref);
    if (kind === "interne") return;
    const abs = kind === "chemin-relatif" ? new URL(ref, snapshotInfo.source).toString() : kind === "url-absolue" ? new URL(ref, snapshotInfo.source).toString() : null;
    const key = abs ?? `data:${sha(ref).slice(0, 16)}`;
    const m = mediaMap.get(key) ?? { url: abs, originalRef: kind === "donnees-integrees" ? ref.slice(0, 40) + "…" : ref, refKind: kind, displayed: false, articles: [], home: false, foundIn: [] };
    if (info.article) {
      m.displayed = true;
      if (!m.articles.includes(info.article)) m.articles.push(info.article);
    }
    if (info.home) {
      m.displayed = true;
      m.home = true;
    }
    if (info.file && !m.foundIn.includes(info.file)) m.foundIn.push(info.file);
    mediaMap.set(key, m);
  };
  for (const a of articles) for (const r of a.mediaRefs) addMedia(r, { article: a.id });
  for (const r of homeRefs) addMedia(r, { home: true, file: "index.html" });
  for (const [file, text] of Object.entries(texts)) {
    for (const m of text.matchAll(/["'(`=\s](assets\/[^"'`)\s<>]+\.(?:png|jpe?g|webp|gif|svg|avif|mp3|mp4|webm|ogg|wav))/gi)) addMedia(m[1], { file });
  }
  const dims = state.dims ?? {};
  const media = [...mediaMap.values()]
    .map((m) => {
      const d = dims[m.originalRef];
      return { ...m, width: d?.[0] ?? null, height: d?.[1] ?? null, articles: m.articles.sort(), foundIn: m.foundIn.sort() };
    })
    .sort((a, b) => (a.url ?? "").localeCompare(b.url ?? ""));

  let mediaCheck = null;
  if (flag("--check-media")) {
    log(`Vérification (HEAD, lecture seule) de ${media.filter((m) => m.url).length} URL médias …`);
    mediaCheck = await checkUrls(media.filter((m) => m.url).map((m) => m.url));
    for (const m of media) if (m.url) m.check = mediaCheck[m.url];
  }

  // Doublons et liens
  const ids = new Set(articles.map((a) => a.id));
  const byHash = new Map();
  const byTitle = new Map();
  for (const a of articles) {
    byHash.set(a.contentHash, [...(byHash.get(a.contentHash) ?? []), a.id]);
    const t = a.title.trim().toLowerCase();
    byTitle.set(t, [...(byTitle.get(t) ?? []), a.id]);
  }
  const brokenLinks = articles.flatMap((a) => a.links.filter((l) => !ids.has(l)).map((l) => ({ from: a.id, to: l })));

  const extraction = {
    format: "porkonia-os/porkopedia-extraction@1",
    extractorVersion: EXTRACTOR_VERSION,
    extractionId,
    extractedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
    source: { site: snapshotInfo.source, snapshotTakenAt: snapshotInfo.takenAt, snapshotDir: path.relative(process.cwd(), siteDir) },
    isolation: { browser: "chromium (headless)", origin: FAKE_ORIGIN, network },
    files,
    scriptOrder: scripts.map((s) => s.name),
    globals: state.globals,
    figureAliases,
    renderCheck: render?.unavailable ? "indisponible" : "effectue",
    articles,
    media,
    duplicates: {
      identicalContent: [...byHash.values()].filter((v) => v.length > 1),
      identicalTitles: [...byTitle.entries()].filter(([, v]) => v.length > 1).map(([title, v]) => ({ title, ids: v })),
      sharedImages: media.filter((m) => m.articles.length > 1).map((m) => ({ url: m.url, articles: m.articles })),
    },
    brokenLinks,
    warnings,
  };
  writeFileSync(path.join(out, "extraction.json"), JSON.stringify(extraction, null, 1));

  const modified = articles.filter((a) => a.modifiedBy.length).length;
  const renderMismatch = articles.filter((a) => a.render && !a.render.matchesTitle).length;
  console.log(
    [
      `Extraction ${extractionId} → ${path.relative(process.cwd(), out)}/extraction.json`,
      `  ${scripts.length} scripts exécutés dans l'ordre · ${articles.length} articles finaux · ${modified} modifiés par des scripts`,
      `  ${media.length} références médias (${media.filter((m) => m.displayed).length} affichées) · ${brokenLinks.length} lien(s) interne(s) cassé(s)`,
      `  contrôle de rendu : ${renderMismatch === 0 ? "titres conformes" : `${renderMismatch} écart(s)`}`,
      `  réseau : ${network.allowed} fichiers servis depuis l'instantané, ${network.blocked} requêtes bloquées, 0 requête vers le site public`,
      ...warnings.map((w) => `  ⚠ ${w}`),
    ].join("\n"),
  );
}

main().catch((e) => {
  console.error("ÉCHEC de l'extraction :", e.message);
  process.exit(1);
});
