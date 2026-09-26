import type { Database } from "./types";
import { latestPublication, resolveArticle } from "./ops";

export interface IntegrityIssue {
  level: "erreur" | "avertissement";
  entityType: "character" | "article" | "media" | "bible";
  entityId: string;
  message: string;
}

const INTERNAL_LINK = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
const MEDIA_REF = /\(media:([a-z]{3}_[a-z0-9]+)\)/g;

/** Contrôle national d'intégrité : relations cassées, portraits non homologués, liens internes morts… */
export function integrityReport(db: Database): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const live = <T extends { deletedAt?: string | null }>(xs: T[]) => xs.filter((x) => !x.deletedAt);
  const charIds = new Set(live(db.characters).map((c) => c.id));
  const mediaById = new Map(db.media.map((m) => [m.id, m]));
  const artIds = new Set(live(db.articles).map((a) => a.id));

  for (const c of live(db.characters)) {
    if (c.portraitMediaId) {
      const m = mediaById.get(c.portraitMediaId);
      if (!m) issues.push({ level: "erreur", entityType: "character", entityId: c.id, message: `Portrait officiel introuvable (${c.portraitMediaId}).` });
      else if (m.deletedAt) issues.push({ level: "erreur", entityType: "character", entityId: c.id, message: `Portrait officiel dans la corbeille : « ${m.name} ».` });
      else if (m.canonStatus !== "officiel") issues.push({ level: "erreur", entityType: "character", entityId: c.id, message: `Portrait non homologué (statut ${m.canonStatus}) : « ${m.name} ».` });
      else if (!m.characterIds.includes(c.id)) issues.push({ level: "erreur", entityType: "character", entityId: c.id, message: `Le portrait « ${m.name} » n'est pas associé à ce personnage.` });
    }
    for (const r of c.relations)
      if (!charIds.has(r.targetId)) issues.push({ level: "avertissement", entityType: "character", entityId: c.id, message: `Relation « ${r.kind} » vers un personnage inexistant (${r.targetId}).` });
  }

  const slugOwners = new Map<string, string>();
  for (const a of live(db.articles)) {
    for (const s of [a.slug, ...a.aliases]) {
      const owner = slugOwners.get(s);
      if (owner && owner !== a.id) issues.push({ level: "erreur", entityType: "article", entityId: a.id, message: `Slug/alias « ${s} » déjà utilisé par ${owner}.` });
      slugOwners.set(s, a.id);
    }
    for (const cid of a.characterIds)
      if (!charIds.has(cid)) issues.push({ level: "avertissement", entityType: "article", entityId: a.id, message: `Personnage associé inexistant (${cid}).` });
    for (const m of a.body.matchAll(INTERNAL_LINK)) {
      const target = resolveArticle(db, m[1]!.trim());
      if (!target || target.deletedAt) issues.push({ level: "avertissement", entityType: "article", entityId: a.id, message: `Lien interne non résolu : [[${m[1]}]].` });
    }
    if (a.format === "html") {
      for (const m of a.body.matchAll(/data-article=["']([^"']+)["']/g)) {
        const target = resolveArticle(db, m[1]!);
        if (!target || target.deletedAt) issues.push({ level: "avertissement", entityType: "article", entityId: a.id, message: `Lien Porkopédia non résolu : data-article="${m[1]}".` });
      }
    }
    for (const m of a.body.matchAll(MEDIA_REF)) {
      const med = mediaById.get(m[1]!);
      if (!med || med.deletedAt) issues.push({ level: "erreur", entityType: "article", entityId: a.id, message: `Image insérée introuvable : media:${m[1]}.` });
    }
  }

  for (const m of live(db.media)) {
    if (m.lastCheck?.status === "erreur")
      issues.push({ level: "erreur", entityType: "media", entityId: m.id, message: `Lien mort : ${m.ref} (${m.lastCheck.httpStatus ?? m.lastCheck.message ?? "erreur"}).` });
    for (const cid of m.characterIds)
      if (!charIds.has(cid)) issues.push({ level: "avertissement", entityType: "media", entityId: m.id, message: `Associé à un personnage inexistant (${cid}).` });
    for (const aid of m.articleIds)
      if (!artIds.has(aid)) issues.push({ level: "avertissement", entityType: "media", entityId: m.id, message: `Associé à un article inexistant (${aid}).` });
    if (m.variantOf && !mediaById.has(m.variantOf))
      issues.push({ level: "avertissement", entityType: "media", entityId: m.id, message: `Variante d'un média inexistant (${m.variantOf}).` });
  }
  return issues;
}

export function dashboardStats(db: Database) {
  const live = <T extends { deletedAt?: string | null }>(xs: T[]) => xs.filter((x) => !x.deletedAt);
  const articles = live(db.articles);
  const lastPub = latestPublication(db);
  const issues = integrityReport(db);
  const trash =
    db.articles.length - articles.length +
    (db.characters.length - live(db.characters).length) +
    (db.media.length - live(db.media).length) +
    (db.bible.length - live(db.bible).length);
  const pending = articles.filter((a) => a.status !== "publie").length;
  return {
    articles: articles.length,
    articlesDraft: articles.filter((a) => a.status === "brouillon").length,
    articlesValidated: articles.filter((a) => a.status === "valide").length,
    articlesPublished: articles.filter((a) => a.status === "publie").length,
    characters: live(db.characters).length,
    media: live(db.media).length,
    mediaExternal: live(db.media).filter((m) => m.location === "externe").length,
    mediaBroken: live(db.media).filter((m) => m.lastCheck?.status === "erreur").length,
    mediaUnchecked: live(db.media).filter((m) => !m.lastCheck).length,
    bible: live(db.bible).length,
    demoItems: [...db.articles, ...db.characters, ...db.media, ...db.bible].filter((x) => x.isDemo).length,
    trash,
    errors: issues.filter((i) => i.level === "erreur").length,
    warnings: issues.filter((i) => i.level === "avertissement").length,
    lastPublication: lastPub ?? null,
    pendingForPublication: pending,
    lastBackup: db.backups.at(-1) ?? null,
    recent: [...db.log].slice(-12).reverse(),
  };
}
