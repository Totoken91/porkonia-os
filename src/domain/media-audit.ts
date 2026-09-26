/**
 * Audit des associations médias ↔ personnages — SUGGESTIONS uniquement.
 * Rien n'est appliqué sans sélection humaine ; aucun portrait ni référence canonique n'est modifié.
 *
 * Indices utilisés, du plus fort au plus faible :
 *  1. Portrait officiel (référence source de la Bible)            → portrait-source (confirmé)
 *  2. Vignette « Archives visuelles liées » (figure-galleries.js)   → lien-indirect (fait constaté)
 *  3. Nom cité dans le texte alternatif ou la légende de l'image    → apparaît (probable, à confirmer)
 *  4. Nom présent dans le nom de fichier                             → apparaît (probable, à confirmer)
 *  5. Image de l'article de la figure, sans autre indice             → lien-article (fait constaté)
 */
import type { Article, Character, Database, Depiction, Media, MediaUsage } from "./types";
import { commit, findEntity, touch } from "./ops";
import { DomainError } from "./util";

const STOP = new Set(["les", "des", "une", "pork", "porc", "general", "generale", "grand", "maitre", "alias", "dit", "dite", "sur", "pour", "avec", "dans", "archive", "archives", "image", "the", "and"]);
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

export const USAGE_LABEL: Record<MediaUsage, string> = {
  "portrait-source": "Portrait source canonique",
  "illustration-narrative": "Illustration narrative",
  "scene-collective": "Scène collective",
  "variante-generee": "Variante générée",
  archive: "Média archivé",
};
export const DEPICTION_LABEL: Record<Depiction["kind"], string> = {
  "portrait-source": "Portrait source",
  apparait: "Apparaît",
  "lien-article": "Illustration de son article",
  "lien-indirect": "Lien indirect (galerie)",
};

/** Jetons propres à un seul personnage (les jetons partagés sont écartés : ambigus). */
export function characterTokens(db: Database): Map<string, string> {
  const owners = new Map<string, Set<string>>();
  for (const c of db.characters.filter((x) => !x.deletedAt)) {
    const src = [c.canonicalName, ...c.nicknames, c.external?.porkopediaId?.replace(/-/g, " ") ?? "", c.external?.bibleName ?? ""];
    for (const w of new Set(src.flatMap(words))) owners.set(w, new Set([...(owners.get(w) ?? []), c.id]));
  }
  const out = new Map<string, string>();
  for (const [w, set] of owners) if (set.size === 1) out.set(w, [...set][0]!);
  return out;
}

function namesIn(text: string, tokens: Map<string, string>): Set<string> {
  const found = new Set<string>();
  for (const w of words(text)) {
    const id = tokens.get(w);
    if (id) found.add(id);
  }
  return found;
}

interface ImgContext {
  article: Article;
  alt: string;
  caption: string;
  galleryCard: boolean;
  cardTarget?: string;
}

/** Contextes d'apparition d'un média dans les articles (texte alternatif, légende, vignette de galerie). */
export function imageContexts(db: Database, m: Media): ImgContext[] {
  const out: ImgContext[] = [];
  const refs = new Set([m.ref, m.external?.originalRef, `media:${m.id}`].filter(Boolean) as string[]);
  for (const aid of m.articleIds) {
    const a = db.articles.find((x) => x.id === aid);
    if (!a) continue;
    const figures = [...a.body.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)].map((f) => f[0]);
    let matched = false;
    for (const f of figures) {
      const src = /<img\b[^>]*\bsrc=["']([^"']+)["']/i.exec(f)?.[1];
      if (!src || !refs.has(src)) continue;
      matched = true;
      out.push({
        article: a,
        alt: /\balt=["']([^"']*)["']/i.exec(f)?.[1] ?? "",
        caption: (/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(f)?.[1] ?? "").replace(/<[^>]+>/g, " "),
        galleryCard: /figure-archive-card/.test(f),
        cardTarget: /data-article=["']([^"']+)["']/.exec(f)?.[1],
      });
    }
    if (!matched) {
      const img = [...a.body.matchAll(/<img\b[^>]*>/gi)].map((x) => x[0]).find((tag) => [...refs].some((r) => tag.includes(`"${r}"`)));
      const md = [...a.body.matchAll(/!\[([^\]]*)\]\(media:([a-z]{3}_[a-z0-9]+)\)/g)].find((x) => x[2] === m.id);
      out.push({ article: a, alt: img ? (/\balt=["']([^"']*)["']/i.exec(img)?.[1] ?? "") : md?.[1] ?? "", caption: "", galleryCard: false });
    }
  }
  return out;
}

export interface MediaAuditItem {
  mediaId: string;
  name: string;
  ref: string;
  thumbRef: string;
  location: Media["location"];
  currentUsage: MediaUsage | null;
  suggestedUsage: MediaUsage | null;
  usageReason: string;
  current: Depiction[];
  suggested: Depiction[];
  /** Personnages actuellement associés sans aucun indice qui le justifie. */
  unsupported: string[];
  isPortraitOf: string[];
  changed: boolean;
}

export function auditMedia(db: Database, m: Media, tokens = characterTokens(db)): MediaAuditItem {
  const byChar = new Map<string, Depiction>();
  const put = (d: Depiction) => {
    const rank = { "portrait-source": 4, apparait: 3, "lien-indirect": 2, "lien-article": 1 } as const;
    const prev = byChar.get(d.characterId);
    if (!prev || rank[d.kind] > rank[prev.kind]) byChar.set(d.characterId, d);
  };
  const portraitOf = db.characters.filter((c) => !c.deletedAt && c.portraitMediaId === m.id);
  for (const c of portraitOf)
    put({ characterId: c.id, kind: "portrait-source", basis: m.external?.source === "bible-docx" ? "Bible visuelle — registre des visages (référence source)" : "Portrait officiel défini dans Porkonia OS", confirmed: true });

  const ctxs = imageContexts(db, m);
  for (const ctx of ctxs) {
    const figureOwner = db.characters.find((c) => c.external?.porkopediaId && c.external.porkopediaId === ctx.article.external?.id);
    if (ctx.galleryCard) {
      if (figureOwner) put({ characterId: figureOwner.id, kind: "lien-indirect", basis: `Vignette de galerie dans « ${ctx.article.title} » (renvoie à ${ctx.cardTarget ?? "?"})`, confirmed: true });
      continue;
    }
    const named = namesIn(`${ctx.alt} ${ctx.caption}`, tokens);
    for (const id of named) put({ characterId: id, kind: "apparait", basis: `Nommé dans ${ctx.alt ? "le texte alternatif" : "la légende"} de « ${ctx.article.title} » : « ${(ctx.alt || ctx.caption).trim().slice(0, 110)} »`, confirmed: false });
    if (figureOwner && !named.has(figureOwner.id)) put({ characterId: figureOwner.id, kind: "lien-article", basis: `Illustration de l'article « ${ctx.article.title} » ; ${ctx.alt || ctx.caption ? "le texte de l'image ne le nomme pas" : "aucun texte descriptif"}`, confirmed: true });
  }
  const file = (m.external?.originalRef ?? m.ref).split("/").pop() ?? "";
  for (const id of namesIn(file.replace(/\.[a-z0-9]+$/i, ""), tokens))
    if (!byChar.has(id) || byChar.get(id)!.kind === "lien-article") put({ characterId: id, kind: "apparait", basis: `Nom de fichier « ${file} »`, confirmed: false });

  // Les confirmations humaines déjà enregistrées l'emportent sur les suggestions.
  for (const d of m.depictions ?? []) if (d.confirmed) byChar.set(d.characterId, d);

  const suggested = [...byChar.values()];
  const appearing = suggested.filter((d) => d.kind === "apparait" || d.kind === "portrait-source");
  let suggestedUsage: MediaUsage | null = null;
  let usageReason = "";
  if (portraitOf.length || (m.external?.source === "bible-docx" && m.nature === "reference-source" && suggested.some((d) => d.kind === "portrait-source"))) {
    suggestedUsage = "portrait-source";
    usageReason = "Portrait officiel issu d'une référence source.";
  } else if (m.nature === "generation" || m.variantOf) {
    suggestedUsage = "variante-generee";
    usageReason = m.variantOf ? "Variante d'un autre média." : "Nature : génération.";
  } else if (m.canonStatus === "archive" || m.external?.displayed === false) {
    suggestedUsage = "archive";
    usageReason = "Non affiché sur le site / statut archive.";
  } else if (appearing.length >= 2) {
    suggestedUsage = "scene-collective";
    usageReason = `${appearing.length} personnages nommés dans l'image.`;
  } else if (ctxs.length || m.articleIds.length) {
    suggestedUsage = "illustration-narrative";
    usageReason = appearing.length === 1 ? "Un seul personnage nommé." : "Illustration d'article sans personnage nommé.";
  }
  const current = m.depictions ?? [];
  const unsupported = m.characterIds.filter((id) => !byChar.has(id));
  const changed =
    (suggestedUsage !== null && suggestedUsage !== (m.usage ?? null)) ||
    unsupported.length > 0 ||
    JSON.stringify([...suggested].sort((a, b) => a.characterId.localeCompare(b.characterId))) !== JSON.stringify([...current].sort((a, b) => a.characterId.localeCompare(b.characterId)));
  return {
    mediaId: m.id,
    name: m.name,
    ref: m.ref,
    thumbRef: m.ref,
    location: m.location,
    currentUsage: m.usage ?? null,
    suggestedUsage,
    usageReason,
    current,
    suggested,
    unsupported,
    isPortraitOf: portraitOf.map((c) => c.id),
    changed,
  };
}

/** Audit de tous les médias liés à un personnage (galerie, associations, portrait) ou de tous les médias liés à des personnages. */
export function auditMediaForCharacter(db: Database, characterId?: string): MediaAuditItem[] {
  const tokens = characterTokens(db);
  const c = characterId ? (findEntity(db, "character", characterId) as Character) : null;
  const media = db.media.filter(
    (m) =>
      !m.deletedAt &&
      (c
        ? c.galleryMediaIds.includes(m.id) || m.characterIds.includes(c.id) || c.portraitMediaId === m.id || (m.depictions ?? []).some((d) => d.characterId === c.id)
        : m.characterIds.length > 0 || (m.depictions ?? []).length > 0),
  );
  return media.map((m) => auditMedia(db, m, tokens));
}

export interface AuditSelection {
  mediaId: string;
  usage?: MediaUsage | null;
  /** Associations retenues (celles marquées confirmées l'ont été explicitement par la personne). */
  depictions: Depiction[];
}

/**
 * Applique des classifications CHOISIES par un humain.
 * - Ne touche jamais à `portraitMediaId`, ni au chemin, ni à la nature d'un média.
 * - Retirer l'association d'un personnage dont c'est le portrait est refusé.
 * - Met à jour les galeries en conséquence (ajout / retrait), avec révisions.
 */
export function applyMediaClassification(db: Database, sel: AuditSelection): Media {
  const m = findEntity(db, "media", sel.mediaId) as Media;
  const keep = new Set(sel.depictions.map((d) => d.characterId));
  for (const c of db.characters.filter((x) => x.portraitMediaId === m.id && !x.deletedAt)) {
    if (!keep.has(c.id)) throw new DomainError(`« ${m.name} » est le portrait de ${c.canonicalName} : cette association ne peut pas être retirée ici.`, "PROTEGE");
    const d = sel.depictions.find((x) => x.characterId === c.id)!;
    if (d.kind !== "portrait-source") throw new DomainError(`« ${m.name} » est le portrait de ${c.canonicalName} : son rôle reste « portrait source ».`, "PROTEGE");
  }
  if (sel.usage && sel.usage !== "portrait-source" && db.characters.some((c) => c.portraitMediaId === m.id && !c.deletedAt))
    throw new DomainError(`« ${m.name} » est un portrait officiel : son usage ne peut être que « portrait source ».`, "PROTEGE");
  for (const d of sel.depictions) findEntity(db, "character", d.characterId);

  const before = new Set(m.characterIds);
  touch(m, { usage: sel.usage ?? m.usage ?? null, depictions: sel.depictions, characterIds: [...keep] });
  commit(db, "media", m, `Classification : « ${m.name} » — ${sel.usage ? USAGE_LABEL[sel.usage] : "usage inchangé"} ; ${sel.depictions.length} association(s)`);
  for (const c of db.characters.filter((x) => !x.deletedAt)) {
    const had = c.galleryMediaIds.includes(m.id);
    const should = keep.has(c.id);
    if (had !== should && (before.has(c.id) || should)) {
      touch(c, { galleryMediaIds: should ? [...c.galleryMediaIds, m.id] : c.galleryMediaIds.filter((x) => x !== m.id) });
      commit(db, "character", c, `Galerie : « ${m.name} » ${should ? "ajouté" : "retiré"} (classification des médias)`);
    }
  }
  return m;
}
