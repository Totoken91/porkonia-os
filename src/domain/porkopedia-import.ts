/**
 * Import Porkopédia — planification (prévisualisation), application et annulation.
 * Logique pure : aucune E/S. L'extraction est produite par scripts/porkopedia-extract.mjs.
 *
 * Garanties :
 * - Idempotent : un article déjà importé au contenu identique n'est jamais réécrit.
 * - Non destructif : aucune suppression ; une mise à jour crée une nouvelle révision (l'ancienne reste).
 * - Conflits explicites : modification locale + modification sur le site, identité ambiguë, article
 *   protégé (Douzi) → décision humaine obligatoire, jamais de choix par défaut destructeur.
 * - Annulable : chaque import enregistre ses changements (ImportBatch) et peut être annulé.
 */
import type { Article, Character, Database, ImportBatch, ImportChange, Media, MediaKind } from "./types";
import { commit, createArticle, createCharacter, createMedia, findEntity, log, restoreFromTrash, softDelete, touch } from "./ops";
import { DomainError, newId, nowIso, slugify } from "./util";

/* ------------------------------- Extraction ------------------------------- */

export interface ExtractedArticle {
  id: string;
  title: string;
  sub: string;
  section: string;
  tags: string[];
  lead: string;
  image: string | null;
  html: string;
  contentHash: string;
  origin: string;
  modifiedBy: string[];
  original: (Omit<ExtractedArticle, "id" | "contentHash" | "origin" | "modifiedBy" | "original" | "provenanceIncertaine" | "render" | "mediaRefs" | "links" | "extraFields"> & { contentHash: string; capturedAfter: string }) | null;
  provenanceIncertaine: boolean;
  render: { title: string | null; images: number; matchesTitle: boolean } | null;
  mediaRefs: string[];
  links: string[];
  extraFields?: string[];
}

export interface ExtractedMedia {
  url: string | null;
  originalRef: string;
  refKind: "url-absolue" | "chemin-relatif" | "donnees-integrees";
  displayed: boolean;
  home: boolean;
  articles: string[];
  foundIn: string[];
  width: number | null;
  height: number | null;
  check?: { status: "ok" | "erreur"; httpStatus?: number; message?: string; contentType?: string };
}

export interface Extraction {
  format: string;
  extractorVersion: string;
  extractionId: string;
  extractedAt: string;
  source: { site: string; snapshotTakenAt: string | null; snapshotDir: string };
  isolation: { browser: string; origin: string; network: { allowed: number; blocked: number; nonGet: number } };
  files: { file: string; sha256: string; bytes: number }[];
  scriptOrder: string[];
  figureAliases: Record<string, string[]>;
  renderCheck: string;
  articles: ExtractedArticle[];
  media: ExtractedMedia[];
  duplicates: { identicalContent: string[][]; identicalTitles: { title: string; ids: string[] }[]; sharedImages: { url: string; articles: string[] }[] };
  brokenLinks: { from: string; to: string }[];
  warnings: string[];
}

/* ------------------------------ Protections ------------------------------ */

export interface Protection {
  reason: string;
  /** Contrôle minimal que la version entrante doit satisfaire pour être acceptable. */
  check: (a: Pick<ExtractedArticle, "html" | "image">) => { ok: boolean; detail: string };
}

export const PROTECTED_ARTICLES: Record<string, Protection> = {
  douzi: {
    reason: "Refonte « épopée » de Sofiane Douzi : douze scènes narratives illustrées (douzi-epopee.js) et nouvelle apparence canonique. Ne jamais la remplacer automatiquement.",
    check: (a) => {
      const scenes = (a.html.match(/class="[^"]*douzi-scene/g) ?? []).length;
      return { ok: scenes >= 12, detail: `${scenes} scène(s) « douzi-scene » détectée(s) (12 attendues)` };
    },
  },
};

/* --------------------------------- Plan ---------------------------------- */

export type Decision = "importer" | "garder-local" | "ignorer" | "restaurer" | "copie" | "lier";

export interface ArticlePlanItem {
  key: string;
  porkopediaId: string;
  title: string;
  action: "creer" | "inchange" | "mettre-a-jour" | "conflit" | "corbeille";
  reason: string;
  existingId?: string;
  existingTitle?: string;
  origin: string;
  modifiedBy: string[];
  hasOriginalVersion: boolean;
  provenanceIncertaine: boolean;
  protection?: string;
  defaultDecision: Decision;
  choices: Decision[];
}

export interface MediaPlanItem {
  key: string;
  url: string;
  originalRef: string;
  refKind: ExtractedMedia["refKind"];
  action: "creer" | "existant";
  existingId?: string;
  displayed: boolean;
  articles: string[];
  foundIn: string[];
  unavailable: boolean;
  check?: ExtractedMedia["check"];
}

export interface CharacterPlanItem {
  key: string;
  porkopediaId: string;
  name: string;
  nicknames: string[];
  action: "creer" | "existant" | "lier";
  existingId?: string;
  existingName?: string;
  defaultDecision: Decision;
  choices: Decision[];
}

export interface ImportOptions {
  /** Importer aussi les références présentes dans le code mais non affichées (statut « archive »). */
  nonDisplayedMedia: boolean;
  /** Importer les références dont la vérification a échoué (conservées et signalées comme indisponibles). */
  unavailableMedia: boolean;
  /** Créer / lier les fiches personnages des « Figures historiques ». */
  characters: boolean;
}

export const DEFAULT_OPTIONS: ImportOptions = { nonDisplayedMedia: true, unavailableMedia: true, characters: true };

export interface ImportPlan {
  extractionId: string;
  articles: ArticlePlanItem[];
  media: MediaPlanItem[];
  characters: CharacterPlanItem[];
  skippedEmbedded: number;
  brokenLinks: { from: string; to: string; resolvedLocally: boolean }[];
  duplicates: Extraction["duplicates"];
  uncertain: { id: string; title: string; why: string }[];
  counts: Record<string, number>;
  warnings: string[];
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const tokens = (s: string) => norm(s).split(" ").filter(Boolean).sort().join(" ");

export function localModified(a: Article): boolean {
  return !!a.external && a.revision > a.external.importedRevision;
}

function figureNames(ex: Extraction, a: ExtractedArticle) {
  const aliases = ex.figureAliases[a.id] ?? [];
  const name = aliases[0] ?? a.title;
  return { name, nicknames: [...new Set([a.title, ...aliases.slice(1)].filter((n) => n && n !== name))] };
}

export function findCharacterByNames(db: Database, names: string[]): Character | undefined {
  const wanted = new Set(names.map(tokens));
  return db.characters.find((c) => !c.deletedAt && [c.canonicalName, ...c.nicknames].some((n) => wanted.has(tokens(n))));
}

export function planPorkopediaImport(db: Database, ex: Extraction, options: ImportOptions = DEFAULT_OPTIONS): ImportPlan {
  const warnings = [...ex.warnings];
  const articles: ArticlePlanItem[] = ex.articles.map((a) => {
    const base = {
      key: `article:${a.id}`,
      porkopediaId: a.id,
      title: a.title,
      origin: a.origin,
      modifiedBy: a.modifiedBy,
      hasOriginalVersion: !!a.original,
      provenanceIncertaine: a.provenanceIncertaine,
    };
    const prot = PROTECTED_ARTICLES[a.id];
    const check = prot?.check(a);
    const imported = db.articles.find((x) => x.external?.source === "porkopedia" && x.external.id === a.id);
    if (imported) {
      const existing = { existingId: imported.id, existingTitle: imported.title };
      const protection = imported.protection?.reason ?? prot?.reason;
      if (imported.deletedAt)
        return { ...base, ...existing, protection, action: "corbeille" as const, reason: "Déjà importé puis placé dans la corbeille (suppression manuelle ou import annulé).", defaultDecision: "ignorer" as const, choices: ["ignorer", "restaurer"] as Decision[] };
      const siteChanged = imported.external!.contentHash !== a.contentHash;
      const local = localModified(imported);
      if (!siteChanged)
        return { ...base, ...existing, protection, action: "inchange" as const, reason: local ? "Identique au dernier import ; modifié localement depuis (conservé)." : "Identique au dernier import.", defaultDecision: "ignorer" as const, choices: ["ignorer"] as Decision[] };
      if (check && !check.ok)
        return { ...base, ...existing, protection, action: "conflit" as const, reason: `Article protégé : la version du site semble incomplète (${check.detail}). La version locale est conservée par défaut.`, defaultDecision: "garder-local" as const, choices: ["garder-local", "importer"] as Decision[] };
      if (local || protection)
        return {
          ...base,
          ...existing,
          protection,
          action: "conflit" as const,
          reason: protection && !local ? "Article protégé modifié sur le site : validation humaine obligatoire." : "Modifié à la fois dans Porkonia OS et sur le site depuis le dernier import.",
          defaultDecision: "garder-local" as const,
          choices: ["garder-local", "importer"] as Decision[],
        };
      return { ...base, ...existing, action: "mettre-a-jour" as const, reason: "Modifié sur le site depuis le dernier import ; aucune modification locale. L'ancienne version reste dans l'historique.", defaultDecision: "importer" as const, choices: ["importer", "ignorer"] as Decision[] };
    }
    const homonym = db.articles.find((x) => !x.deletedAt && !x.external && (x.slug === a.id || x.aliases.includes(a.id)));
    if (homonym)
      return {
        ...base,
        existingId: homonym.id,
        existingTitle: homonym.title,
        protection: prot?.reason,
        action: "conflit" as const,
        reason: `Un article local non importé utilise déjà l'adresse « ${a.id} ».`,
        defaultDecision: "ignorer" as const,
        choices: ["ignorer", "copie", "lier"] as Decision[],
      };
    if (check && !check.ok)
      return { ...base, protection: prot?.reason, action: "conflit" as const, reason: `Article protégé : version incomplète (${check.detail}). Import refusé par défaut.`, defaultDecision: "ignorer" as const, choices: ["ignorer", "importer"] as Decision[] };
    return { ...base, protection: prot?.reason, action: "creer" as const, reason: a.original ? "Nouvel article (version d'origine conservée dans l'historique)." : "Nouvel article.", defaultDecision: "importer" as const, choices: ["importer", "ignorer"] as Decision[] };
  });

  const media: MediaPlanItem[] = [];
  let skippedEmbedded = 0;
  for (const m of ex.media) {
    if (!m.url) {
      skippedEmbedded += 1;
      continue;
    }
    if (!m.displayed && !options.nonDisplayedMedia) continue;
    const unavailable = m.check?.status === "erreur";
    if (unavailable && !options.unavailableMedia) continue;
    const existing = db.media.find((x) => x.location === "externe" && x.ref === m.url);
    media.push({
      key: `media:${m.url}`,
      url: m.url,
      originalRef: m.originalRef,
      refKind: m.refKind,
      action: existing ? "existant" : "creer",
      existingId: existing?.id,
      displayed: m.displayed,
      articles: m.articles,
      foundIn: m.foundIn,
      unavailable,
      check: m.check,
    });
  }

  const characters: CharacterPlanItem[] = [];
  if (options.characters) {
    // Figures : liste explicite de figure-galleries.js si disponible (une section peut aussi contenir des récits).
    const figureIds = Object.keys(ex.figureAliases ?? {});
    const figures = figureIds.length ? ex.articles.filter((x) => figureIds.includes(x.id)) : ex.articles.filter((x) => x.section === "Figures historiques");
    for (const a of figures) {
      const { name, nicknames } = figureNames(ex, a);
      const byId = db.characters.find((c) => c.external?.porkopediaId === a.id && !c.deletedAt);
      const byName = byId ? undefined : findCharacterByNames(db, [name, ...nicknames]);
      const item: CharacterPlanItem = byId
        ? { key: `char:${a.id}`, porkopediaId: a.id, name, nicknames, action: "existant", existingId: byId.id, existingName: byId.canonicalName, defaultDecision: "ignorer", choices: ["ignorer"] }
        : byName
          ? { key: `char:${a.id}`, porkopediaId: a.id, name, nicknames, action: "lier", existingId: byName.id, existingName: byName.canonicalName, defaultDecision: "lier", choices: ["lier", "ignorer"] }
          : { key: `char:${a.id}`, porkopediaId: a.id, name, nicknames, action: "creer", defaultDecision: "importer", choices: ["importer", "ignorer"] };
      characters.push(item);
    }
  }

  const known = new Set([...ex.articles.map((a) => a.id)]);
  const brokenLinks = ex.articles.flatMap((a) =>
    a.links
      .filter((l) => !known.has(l))
      .map((l) => ({ from: a.id, to: l, resolvedLocally: db.articles.some((x) => !x.deletedAt && (x.slug === l || x.aliases.includes(l) || x.external?.id === l)) })),
  );
  const uncertain = [
    ...ex.articles.filter((a) => a.provenanceIncertaine).map((a) => ({ id: a.id, title: a.title, why: `Origine non attribuable à un script précis (${a.origin}).` })),
    ...ex.articles.filter((a) => a.render && !a.render.matchesTitle).map((a) => ({ id: a.id, title: a.title, why: `Le titre affiché (« ${a.render!.title} ») diffère des données.` })),
    ...ex.media.filter((m) => !m.displayed).slice(0, 0).map((m) => ({ id: m.originalRef, title: m.originalRef, why: "Référence non affichée" })),
  ];
  if (ex.renderCheck !== "effectue") warnings.push("Le contrôle de rendu n'a pas pu être effectué.");

  const count = (xs: { action: string }[], a: string) => xs.filter((x) => x.action === a).length;
  return {
    extractionId: ex.extractionId,
    articles,
    media,
    characters,
    skippedEmbedded,
    brokenLinks,
    duplicates: ex.duplicates,
    uncertain,
    warnings,
    counts: {
      articlesDetectes: ex.articles.length,
      articlesNouveaux: count(articles, "creer"),
      articlesInchanges: count(articles, "inchange"),
      articlesMisAJour: count(articles, "mettre-a-jour"),
      articlesConflits: count(articles, "conflit"),
      articlesCorbeille: count(articles, "corbeille"),
      articlesModifiesParScripts: ex.articles.filter((a) => a.modifiedBy.length > 0).length,
      mediasTotal: media.length,
      mediasNouveaux: count(media, "creer"),
      mediasExistants: count(media, "existant"),
      mediasNonAffiches: media.filter((m) => !m.displayed).length,
      mediasIndisponibles: media.filter((m) => m.unavailable).length,
      mediasNonVerifies: media.filter((m) => !m.check).length,
      personnagesNouveaux: count(characters, "creer"),
      personnagesALier: count(characters, "lier"),
      liensCasses: brokenLinks.filter((l) => !l.resolvedLocally).length,
      provenanceIncertaine: uncertain.length,
    },
  };
}

/* ------------------------------- Application ------------------------------ */

function mediaKind(url: string): MediaKind {
  if (/\.(mp3|wav|ogg)$/i.test(url)) return "audio";
  if (/\.(mp4|webm)$/i.test(url)) return "video";
  if (/embleme|logo|insigne|ecusson/i.test(url)) return "logo";
  return "illustration";
}

/**
 * Applique un plan validé. `decisions[key]` remplace la décision par défaut d'un élément.
 * Toute l'opération se fait dans UNE transaction (tout ou rien).
 */
export function applyPorkopediaImport(db: Database, ex: Extraction, plan: ImportPlan, decisions: Record<string, Decision>): ImportBatch {
  if (plan.extractionId !== ex.extractionId) throw new DomainError("Le plan ne correspond pas à cette extraction.", "INVALIDE");
  const decide = (item: { key: string; defaultDecision: Decision; choices: Decision[] }) => {
    const d = decisions[item.key] ?? item.defaultDecision;
    if (!item.choices.includes(d)) throw new DomainError(`Décision « ${d} » invalide pour ${item.key}.`, "INVALIDE");
    return d;
  };
  const at = nowIso();
  const changes: ImportChange[] = [];
  const byId = new Map(ex.articles.map((a) => [a.id, a]));
  const baseUrl = ex.source.site;
  const touchedArticles = new Map<string, Article>(); // porkopediaId → article local

  // 1) Médias (références seulement).
  const mediaByUrl = new Map<string, Media>();
  for (const m of db.media) if (m.location === "externe") mediaByUrl.set(m.ref, m);
  for (const item of plan.media) {
    if (item.action === "existant") continue;
    const src = ex.media.find((x) => x.url === item.url)!;
    const m = createMedia(
      db,
      {
        name: decodeURIComponent(item.url.split("/").pop() || item.url),
        description: src.displayed ? `Affiché sur Porkopédia${src.articles.length ? ` (${src.articles.length} article(s))` : src.home ? " (page d'accueil)" : ""}.` : "Référencé dans le code de Porkopédia mais non affiché lors de l'extraction.",
        kind: mediaKind(item.url),
        location: "externe",
        ref: item.url,
        canonStatus: src.displayed ? "officiel" : "archive",
        nature: "indeterminee",
        width: src.width,
        height: src.height,
        external: { source: "porkopedia", originalRef: src.originalRef, foundIn: src.foundIn, displayed: src.displayed },
        source: `porkopedia:${ex.extractionId}`,
      },
      { allowDuplicate: false },
    );
    if (src.check) m.lastCheck = { status: src.check.status, httpStatus: src.check.httpStatus, message: src.check.message, contentType: src.check.contentType, checkedAt: ex.extractedAt };
    mediaByUrl.set(item.url, m);
    changes.push({ entityType: "media", entityId: m.id, action: "cree", revisionAfter: m.revision, label: m.name });
  }
  const resolveUrl = (ref: string) => {
    try {
      return new URL(ref, baseUrl).toString();
    } catch {
      return null;
    }
  };

  // 2) Articles.
  for (const item of plan.articles) {
    const d = decide(item);
    const a = byId.get(item.porkopediaId)!;
    if (d === "ignorer" || d === "garder-local") continue;
    const mediaIds = [...new Set(a.mediaRefs.map(resolveUrl).map((u) => (u ? mediaByUrl.get(u)?.id : undefined)).filter((x): x is string => !!x))];
    const cover = a.image ? mediaByUrl.get(resolveUrl(a.image) ?? "")?.id ?? null : null;
    const fields = { title: a.title, subtitle: a.sub, section: a.section, tags: a.tags, lead: a.lead, body: a.html };
    const external = (rev: number) => ({
      source: "porkopedia" as const,
      id: a.id,
      contentHash: a.contentHash,
      importedAt: at,
      extractionId: ex.extractionId,
      origin: a.origin,
      modifiedBy: a.modifiedBy,
      importedRevision: rev,
      baseUrl,
    });
    const prot = PROTECTED_ARTICLES[a.id];

    if (item.action === "creer" || (item.action === "conflit" && !item.existingId) || (item.action === "conflit" && d === "copie")) {
      const slug = d === "copie" ? `${a.id}-porkopedia` : a.id;
      const first = a.original ?? null;
      const art = createArticle(db, {
        title: (first ?? a).title ?? a.title,
        subtitle: (first ?? a).sub ?? "",
        section: (first ?? a).section ?? "",
        tags: (first ?? a).tags ?? [],
        lead: (first ?? a).lead ?? "",
        body: (first ?? a).html ?? "",
        characterIds: [],
        slug,
      });
      art.format = "html";
      art.provenance = { source: `porkopedia:${first ? first.capturedAfter : a.origin}`, detail: `#article=${a.id} · extraction ${ex.extractionId}`, importedAt: at };
      if (first) {
        // Révision 1 = version d'origine ; on la réécrit dans l'historique puis on applique la version affichée.
        const r1 = db.revisions.findLast((r) => r.entityId === art.id)!;
        (r1 as { message: string }).message = `Import : version d'origine (${first.capturedAfter}) — état AVANT les scripts de transformation`;
        r1.snapshot = structuredClone(art);
        touch(art, { ...fields });
        commit(db, "article", art, `Import : version affichée sur Porkopédia — modifiée par ${a.modifiedBy.join(", ")}`);
      }
      touch(art, { mediaIds, coverMediaId: cover, status: "valide", format: "html", protection: prot ? { reason: prot.reason, since: at } : null, siteSeen: { contentHash: a.contentHash, at: ex.extractedAt, extractionId: ex.extractionId } });
      art.external = external(art.revision);
      commit(db, "article", art, `Import Porkopédia : « ${art.title} » (${a.id})`);
      for (const mid of mediaIds) {
        const m = db.media.find((x) => x.id === mid)!;
        if (!m.articleIds.includes(art.id)) m.articleIds.push(art.id);
      }
      touchedArticles.set(a.id, art);
      changes.push({ entityType: "article", entityId: art.id, action: "cree", revisionAfter: art.revision, label: art.title });
      continue;
    }

    const existing = findEntity(db, "article", item.existingId!) as Article;
    if (item.action === "conflit" && d === "lier") {
      const before = existing.revision;
      touch(existing, { aliases: [...new Set([...existing.aliases, a.id])] });
      existing.external = { ...external(existing.revision + 1), contentHash: "lie-sans-import" };
      commit(db, "article", existing, `Import : article local lié à Porkopédia #article=${a.id} (contenu local conservé)`);
      existing.external.importedRevision = existing.revision;
      changes.push({ entityType: "article", entityId: existing.id, action: "modifie", revisionBefore: before, revisionAfter: existing.revision, label: existing.title });
      touchedArticles.set(a.id, existing);
      continue;
    }
    const before = existing.revision;
    let action: ImportChange["action"] = "modifie";
    if (item.action === "corbeille") {
      if (d !== "restaurer") continue;
      restoreFromTrash(db, "article", existing.id);
      action = "restaure";
    }
    if (existing.external?.contentHash !== a.contentHash) {
      touch(existing, { ...fields, mediaIds: [...new Set([...existing.mediaIds, ...mediaIds])], coverMediaId: cover ?? existing.coverMediaId, format: "html", siteSeen: { contentHash: a.contentHash, at: ex.extractedAt, extractionId: ex.extractionId } });
      commit(db, "article", existing, `Import Porkopédia : mise à jour depuis le site (${ex.extractionId}) — version précédente conservée (rév. ${before})`);
    }
    existing.external = external(existing.revision);
    for (const mid of mediaIds) {
      const m = db.media.find((x) => x.id === mid)!;
      if (!m.articleIds.includes(existing.id)) m.articleIds.push(existing.id);
    }
    touchedArticles.set(a.id, existing);
    changes.push({ entityType: "article", entityId: existing.id, action, revisionBefore: before, revisionAfter: existing.revision, label: existing.title });
  }

  // 3) Personnages des « Figures historiques » (sans portrait : la référence canonique vient de la Bible).
  for (const item of plan.characters) {
    const d = decide(item);
    if (d === "ignorer") continue;
    const a = byId.get(item.porkopediaId)!;
    const art = touchedArticles.get(a.id) ?? db.articles.find((x) => x.external?.id === a.id && !x.deletedAt);
    let c: Character;
    let before: number | undefined;
    if (item.action === "creer") {
      c = createCharacter(db, {
        canonicalName: item.name,
        nicknames: item.nicknames,
        role: a.sub,
        description: a.lead,
        appearance: "",
        biography: "",
        affiliations: [],
        events: [],
        narrativeRefs: art ? [`Article Porkopédia #article=${a.id}`] : [],
        status: "proposition",
      });
      c.provenance = { source: `porkopedia:${ex.extractionId}`, detail: `Figure historique #article=${a.id}. Apparence non renseignée : la référence canonique est la Bible visuelle.`, importedAt: at };
    } else {
      c = findEntity(db, "character", item.existingId!) as Character;
      before = c.revision;
    }
    // Galerie : images de l'article de la figure (jamais comme portrait : la référence canonique vient de la Bible).
    const gallery = art ? [...new Set([...c.galleryMediaIds, ...art.mediaIds])] : c.galleryMediaIds;
    for (const mid of art?.mediaIds ?? []) {
      const m = db.media.find((x) => x.id === mid);
      if (m && !m.characterIds.includes(c.id)) m.characterIds.push(c.id);
    }
    touch(c, { external: { ...(c.external ?? {}), porkopediaId: a.id }, galleryMediaIds: gallery });
    commit(db, "character", c, item.action === "creer" ? `Import Porkopédia : fiche « ${c.canonicalName} » (proposition, sans portrait)` : `Import Porkopédia : fiche liée à #article=${a.id}`);
    changes.push({ entityType: "character", entityId: c.id, action: item.action === "creer" ? "cree" : "modifie", revisionBefore: before, revisionAfter: c.revision, label: c.canonicalName });
    if (art && !art.characterIds.includes(c.id)) {
      touch(art, { characterIds: [...art.characterIds, c.id] });
      commit(db, "article", art, `Import : personnage « ${c.canonicalName} » associé`);
      if (art.external) art.external.importedRevision = art.revision;
      const ch = changes.find((x) => x.entityId === art.id);
      if (ch) ch.revisionAfter = art.revision;
    }
  }

  const batch: ImportBatch = {
    id: newId("log").replace("log_", "imp_"),
    kind: "porkopedia",
    at,
    sourceId: ex.extractionId,
    sourceHash: ex.files.map((f) => f.sha256).join("").slice(0, 64),
    summary: {
      articlesCrees: changes.filter((c) => c.entityType === "article" && c.action === "cree").length,
      articlesModifies: changes.filter((c) => c.entityType === "article" && c.action !== "cree").length,
      mediasCrees: changes.filter((c) => c.entityType === "media").length,
      personnagesCrees: changes.filter((c) => c.entityType === "character" && c.action === "cree").length,
      personnagesLies: changes.filter((c) => c.entityType === "character" && c.action === "modifie").length,
      conflitsLaissesEnPlace: plan.articles.filter((i) => i.action === "conflit" && (decisions[i.key] ?? i.defaultDecision) !== "importer").length,
    },
    decisions: Object.fromEntries(
      [...plan.articles, ...plan.characters].filter((i) => (decisions[i.key] ?? i.defaultDecision) !== i.defaultDecision || i.choices.length > 1).map((i) => [i.key, decisions[i.key] ?? i.defaultDecision]),
    ),
    changes,
    status: "appliquee",
  };
  db.imports.push(batch);
  log(db, "Import Porkopédia", `Import ${batch.id} depuis ${ex.extractionId} : ${Object.entries(batch.summary).map(([k, v]) => `${k}=${v}`).join(", ")}`, "systeme");
  return batch;
}

/* -------------------------------- Annulation ------------------------------- */

/** Rétablit exactement l'état d'une révision (statut et corbeille compris) sous forme d'une NOUVELLE révision. */
function revertTo(db: Database, type: ImportChange["entityType"], id: string, revision: number, batchId: string) {
  const e = findEntity(db, type, id) as unknown as Record<string, unknown> & { revision: number; createdAt: string };
  const rev = db.revisions.find((r) => r.entityType === type && r.entityId === id && r.revision === revision);
  if (!rev) throw new DomainError(`Révision ${revision} introuvable.`, "INTROUVABLE");
  const snap = structuredClone(rev.snapshot) as Record<string, unknown>;
  const keep = { id: e.id, createdAt: e.createdAt, revision: e.revision };
  for (const k of Object.keys(e)) delete e[k];
  Object.assign(e, snap, keep);
  const ent = e as unknown as Article;
  touch(ent, {});
  commit(db, type, ent, `Annulation de l'import ${batchId} : état de la rév. ${revision} rétabli`);
}

/**
 * Annule un import : les éléments créés vont à la corbeille (jamais supprimés), les éléments modifiés
 * retrouvent leur révision antérieure (sous forme d'une NOUVELLE révision). Un élément modifié
 * depuis l'import n'est pas touché : il est signalé.
 */
export function undoImport(db: Database, batchId: string): ImportBatch {
  const batch = db.imports.find((b) => b.id === batchId);
  if (!batch) throw new DomainError(`Import ${batchId} introuvable.`, "INTROUVABLE");
  if (batch.status === "annulee") throw new DomainError("Cet import a déjà été annulé.", "INVALIDE");
  const report: string[] = [];
  for (const ch of [...batch.changes].reverse()) {
    const coll = { article: db.articles, media: db.media, character: db.characters, bible: db.bible }[ch.entityType] as { id: string; revision: number; deletedAt?: string | null }[];
    const e = coll.find((x) => x.id === ch.entityId);
    if (!e) {
      report.push(`${ch.label} : introuvable, ignoré.`);
      continue;
    }
    // Les liens ajoutés par l'import (galeries, articles) sont ignorés dans la comparaison de révision
    // uniquement pour les médias, qui n'ont pas de révision dédiée à ces liens.
    if (e.revision !== ch.revisionAfter) {
      report.push(`${ch.label} : modifié depuis l'import (rév. ${ch.revisionAfter} → ${e.revision}) — conservé tel quel.`);
      continue;
    }
    try {
      if (ch.action === "cree") {
        softDelete(db, ch.entityType, ch.entityId);
        report.push(`${ch.label} : placé dans la corbeille.`);
      } else if (ch.revisionBefore) {
        revertTo(db, ch.entityType, ch.entityId, ch.revisionBefore, batch.id);
        report.push(`${ch.label} : état de la révision ${ch.revisionBefore} rétabli (nouvelle révision, historique conservé).`);
      }
    } catch (err) {
      report.push(`${ch.label} : non annulé (${(err as Error).message}).`);
    }
  }
  // Nettoyage des liens média → article/personnage ajoutés par l'import pour les éléments mis en corbeille.
  const trashed = new Set(db.articles.filter((a) => a.deletedAt).map((a) => a.id).concat(db.characters.filter((c) => c.deletedAt).map((c) => c.id)));
  for (const m of db.media) {
    m.articleIds = m.articleIds.filter((id) => !trashed.has(id) || !batch.changes.some((c) => c.entityId === id));
    m.characterIds = m.characterIds.filter((id) => !trashed.has(id) || !batch.changes.some((c) => c.entityId === id));
  }
  batch.status = "annulee";
  batch.undoneAt = nowIso();
  batch.undoReport = report;
  log(db, "Annulation d'import", `Import ${batch.id} annulé : ${report.length} élément(s) traité(s).`, "systeme");
  return batch;
}

/** Utilitaire pour les tests et le rapport. */
export const _norm = { norm, tokens, slugify };
