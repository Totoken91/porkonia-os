/**
 * Logique métier pure : fonctions qui transforment une `Database` en mémoire.
 * Aucune E/S ici — la persistance est gérée par src/data/.
 * Toutes les écritures passent par `commit()` qui archive une révision et journalise.
 */
import type {
  Article,
  ArticleStatus,
  BibleEntry,
  Character,
  Database,
  EntityType,
  Media,
  Publication,
  PublicationVerification,
  PublishedArticle,
} from "./types";
import { DomainError, newId, nowIso, sha256, slugify } from "./util";

type AnyEntity = Character | Article | Media | BibleEntry;

const COLLECTION: Record<Exclude<EntityType, "publication">, keyof Database> = {
  character: "characters",
  article: "articles",
  media: "media",
  bible: "bible",
};

const LABEL: Record<EntityType, string> = {
  character: "personnage",
  article: "article",
  media: "média",
  bible: "entrée de la Bible",
  publication: "publication",
};

function list(db: Database, type: Exclude<EntityType, "publication">): AnyEntity[] {
  return db[COLLECTION[type]] as unknown as AnyEntity[];
}

export function findEntity(db: Database, type: Exclude<EntityType, "publication">, id: string): AnyEntity {
  const e = list(db, type).find((x) => x.id === id);
  if (!e) throw new DomainError(`${LABEL[type]} introuvable : ${id}`, "INTROUVABLE");
  return e;
}

export function log(db: Database, action: string, summary: string, entityType?: EntityType | "systeme", entityId?: string) {
  db.log.push({ id: newId("log"), at: nowIso(), action, summary, entityType, entityId });
}

/** Vérifie la révision attendue (détection des conflits d'édition). */
function checkRevision(entity: { revision: number; id: string }, expected: number | undefined) {
  if (expected !== undefined && expected !== entity.revision) {
    throw new DomainError(
      `Conflit de version sur ${entity.id} : vous éditiez la révision ${expected}, la révision actuelle est ${entity.revision}. ` +
        `Rechargez la fiche ; vos modifications n'ont PAS été enregistrées.`,
      "CONFLIT",
    );
  }
}

function commit<T extends AnyEntity>(db: Database, type: Exclude<EntityType, "publication">, entity: T, message: string): T {
  db.revisions.push({
    id: newId("revision"),
    entityType: type,
    entityId: entity.id,
    revision: entity.revision,
    snapshot: structuredClone(entity),
    message,
    createdAt: entity.updatedAt,
  });
  log(db, message.split(" :")[0] ?? message, message, type, entity.id);
  return entity;
}

function touch<T extends AnyEntity>(entity: T, patch: Partial<T>): T {
  Object.assign(entity, patch);
  entity.revision += 1;
  entity.updatedAt = nowIso();
  return entity;
}

function base(kind: "character" | "article" | "media" | "bible", source = "saisie-manuelle") {
  const t = nowIso();
  return { id: newId(kind), revision: 1, createdAt: t, updatedAt: t, deletedAt: null, provenance: { source, importedAt: t } };
}

function uniqueSlug(db: Database, wanted: string, selfId?: string): string {
  const root = slugify(wanted) || "sans-titre";
  const taken = (s: string) =>
    db.articles.some((a) => a.id !== selfId && (a.slug === s || a.aliases.includes(s)));
  let s = root;
  let i = 2;
  while (taken(s)) s = `${root}-${i++}`;
  return s;
}

/* ------------------------------ Personnages ------------------------------ */

export type CharacterInput = Pick<
  Character,
  | "canonicalName"
  | "nicknames"
  | "role"
  | "description"
  | "appearance"
  | "biography"
  | "affiliations"
  | "events"
  | "narrativeRefs"
  | "status"
> & { relations?: Character["relations"] };

export function createCharacter(db: Database, input: CharacterInput): Character {
  if (!input.canonicalName.trim()) throw new DomainError("Le nom canonique est obligatoire.", "INVALIDE");
  const c: Character = {
    ...base("character"),
    slug: slugify(input.canonicalName),
    relations: [],
    galleryMediaIds: [],
    portraitMediaId: null,
    ...input,
  };
  db.characters.push(c);
  return commit(db, "character", c, `Création : fiche « ${c.canonicalName} »`);
}

export function updateCharacter(db: Database, id: string, patch: Partial<CharacterInput>, expectedRevision?: number): Character {
  const c = findEntity(db, "character", id) as Character;
  checkRevision(c, expectedRevision);
  if (patch.canonicalName !== undefined && !patch.canonicalName.trim())
    throw new DomainError("Le nom canonique est obligatoire.", "INVALIDE");
  touch(c, patch);
  return commit(db, "character", c, `Modification : fiche « ${c.canonicalName} » (rév. ${c.revision})`);
}

/**
 * Définit le portrait officiel. Protections :
 * - le média doit être associé à CE personnage et avoir le statut « officiel » ;
 * - il ne peut pas être le portrait d'un autre personnage ;
 * - remplacer un portrait existant exige `confirmReplace` (jamais de remplacement silencieux).
 */
export function setPortrait(
  db: Database,
  characterId: string,
  mediaId: string | null,
  opts: { confirmReplace?: boolean } = {},
): Character {
  const c = findEntity(db, "character", characterId) as Character;
  if (mediaId) {
    const m = findEntity(db, "media", mediaId) as Media;
    if (m.deletedAt) throw new DomainError("Ce média est dans la corbeille.", "INVALIDE");
    if (!m.characterIds.includes(c.id))
      throw new DomainError(`Le média « ${m.name} » n'est pas associé à ${c.canonicalName}. Associez-le d'abord explicitement.`, "PROTEGE");
    if (m.canonStatus !== "officiel")
      throw new DomainError(`Le média « ${m.name} » n'est pas homologué (statut : ${m.canonStatus}). Seul un média « officiel » peut devenir portrait.`, "PROTEGE");
    const other = db.characters.find((x) => x.id !== c.id && x.portraitMediaId === m.id && !x.deletedAt);
    if (other) throw new DomainError(`Ce média est déjà le portrait officiel de ${other.canonicalName}.`, "PROTEGE");
  }
  if (c.portraitMediaId && c.portraitMediaId !== mediaId && !opts.confirmReplace) {
    throw new DomainError(
      `${c.canonicalName} possède déjà un portrait officiel. Le remplacement doit être confirmé explicitement.`,
      "PROTEGE",
    );
  }
  const previous = c.portraitMediaId;
  touch(c, { portraitMediaId: mediaId });
  return commit(
    db,
    "character",
    c,
    `Portrait : ${c.canonicalName} — ${previous ?? "aucun"} → ${mediaId ?? "aucun"}`,
  );
}

/* ------------------------------- Articles -------------------------------- */

export type ArticleInput = Pick<Article, "title" | "subtitle" | "section" | "tags" | "lead" | "body" | "characterIds"> & {
  slug?: string;
  aliases?: string[];
};

export function createArticle(db: Database, input: ArticleInput): Article {
  if (!input.title.trim()) throw new DomainError("Le titre est obligatoire.", "INVALIDE");
  const a: Article = {
    ...base("article"),
    ...input,
    slug: uniqueSlug(db, input.slug || input.title),
    aliases: input.aliases ?? [],
    status: "brouillon",
    mediaIds: [],
    coverMediaId: null,
  };
  db.articles.push(a);
  return commit(db, "article", a, `Création : article « ${a.title} » (brouillon)`);
}

/** Modifier le contenu repasse l'article en brouillon. Changer le slug conserve l'ancien en alias. */
export function updateArticle(db: Database, id: string, patch: Partial<ArticleInput>, expectedRevision?: number): Article {
  const a = findEntity(db, "article", id) as Article;
  checkRevision(a, expectedRevision);
  if (patch.title !== undefined && !patch.title.trim()) throw new DomainError("Le titre est obligatoire.", "INVALIDE");
  const next: Partial<Article> = { ...patch };
  if (patch.slug !== undefined && slugify(patch.slug) !== a.slug) {
    const newSlug = uniqueSlug(db, patch.slug, a.id);
    next.slug = newSlug;
    next.aliases = [...new Set([...(patch.aliases ?? a.aliases), a.slug])].filter((s) => s !== newSlug);
  }
  const contentChanged = (["title", "subtitle", "lead", "body", "section", "tags"] as const).some(
    (k) => patch[k] !== undefined && JSON.stringify(patch[k]) !== JSON.stringify(a[k]),
  );
  if (contentChanged && a.status !== "brouillon") next.status = "brouillon";
  touch(a, next);
  return commit(db, "article", a, `Modification : article « ${a.title} » (rév. ${a.revision}, ${a.status})`);
}

export function setArticleStatus(db: Database, id: string, status: Exclude<ArticleStatus, "publie">): Article {
  const a = findEntity(db, "article", id) as Article;
  if (a.deletedAt) throw new DomainError("Article dans la corbeille.", "INVALIDE");
  touch(a, { status });
  return commit(db, "article", a, `Statut : article « ${a.title} » → ${status}`);
}

export function setCover(db: Database, articleId: string, mediaId: string | null): Article {
  const a = findEntity(db, "article", articleId) as Article;
  if (mediaId && !a.mediaIds.includes(mediaId)) throw new DomainError("Associez d'abord ce média à l'article.", "INVALIDE");
  touch(a, { coverMediaId: mediaId });
  return commit(db, "article", a, `Illustration principale : « ${a.title} » → ${mediaId ?? "aucune"}`);
}

/** Résout un article par id, slug ou alias (compatibilité des liens #article=...). */
export function resolveArticle(db: Database, key: string): Article | undefined {
  const k = decodeURIComponent(key);
  return (
    db.articles.find((a) => a.id === k) ??
    db.articles.find((a) => a.slug === k) ??
    db.articles.find((a) => a.aliases.includes(k))
  );
}

/* -------------------------------- Médias --------------------------------- */

export type MediaInput = Pick<Media, "name" | "description" | "kind" | "location" | "ref" | "canonStatus"> &
  Partial<Pick<Media, "thumbnailRef" | "width" | "height" | "format" | "sha256" | "variantOf" | "characterIds" | "articleIds">> & {
    source?: string;
  };

export function normalizeRef(location: Media["location"], ref: string): string {
  const r = ref.trim();
  if (location === "externe") {
    try {
      const u = new URL(r);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
      return u.toString();
    } catch {
      throw new DomainError(`URL invalide (http/https requis) : ${r}`, "INVALIDE");
    }
  }
  const p = r.replace(/\\/g, "/").replace(/^\.?\/+/, "");
  if (!p || p.split("/").includes("..")) throw new DomainError(`Chemin local invalide : ${r}`, "INVALIDE");
  return p;
}

export function findDuplicateMedia(db: Database, location: Media["location"], ref: string, hash?: string | null): Media | undefined {
  const r = normalizeRef(location, ref);
  return db.media.find((m) => (m.location === location && m.ref === r) || (!!hash && m.sha256 === hash));
}

export function createMedia(db: Database, input: MediaInput, opts: { allowDuplicate?: boolean } = {}): Media {
  if (!input.name.trim()) throw new DomainError("Le nom du média est obligatoire.", "INVALIDE");
  const ref = normalizeRef(input.location, input.ref);
  const dup = findDuplicateMedia(db, input.location, ref, input.sha256);
  if (dup && !opts.allowDuplicate)
    throw new DomainError(`Doublon détecté : ce fichier est déjà référencé sous « ${dup.name} » (${dup.id}).`, "INVALIDE");
  if (input.variantOf) findEntity(db, "media", input.variantOf);
  const { source, ...rest } = input;
  const m: Media = {
    ...base("media", source),
    characterIds: [],
    articleIds: [],
    thumbnailRef: null,
    width: null,
    height: null,
    format: guessFormat(ref),
    sha256: null,
    variantOf: null,
    lastCheck: null,
    backupPath: null,
    ...rest,
    ref,
  };
  db.media.push(m);
  return commit(db, "media", m, `Référencement : média « ${m.name} » (${m.location})`);
}

function guessFormat(ref: string): string | null {
  const m = /\.([a-z0-9]{2,5})(?:$|[?#])/i.exec(ref);
  return m ? m[1]!.toLowerCase() : null;
}

type MediaMeta = Pick<Media, "name" | "description" | "kind" | "canonStatus" | "thumbnailRef" | "width" | "height" | "format">;

/** Métadonnées modifiables librement. Le chemin/URL (`ref`) nécessite `updateMediaRef` avec confirmation. */
export function updateMedia(db: Database, id: string, patch: Partial<MediaMeta>, expectedRevision?: number): Media {
  const m = findEntity(db, "media", id) as Media;
  checkRevision(m, expectedRevision);
  if (patch.canonStatus && patch.canonStatus !== "officiel" && m.canonStatus === "officiel") {
    const portraitOf = db.characters.find((c) => c.portraitMediaId === m.id && !c.deletedAt);
    if (portraitOf)
      throw new DomainError(`Ce média est le portrait officiel de ${portraitOf.canonicalName}. Retirez d'abord le portrait.`, "PROTEGE");
  }
  touch(m, patch);
  return commit(db, "media", m, `Modification : média « ${m.name} » (rév. ${m.revision})`);
}

export function updateMediaRef(db: Database, id: string, ref: string, opts: { confirm: boolean }): Media {
  if (!opts.confirm) throw new DomainError("La modification d'un chemin de média doit être confirmée explicitement.", "PROTEGE");
  const m = findEntity(db, "media", id) as Media;
  const next = normalizeRef(m.location, ref);
  const dup = db.media.find((x) => x.id !== m.id && x.location === m.location && x.ref === next);
  if (dup) throw new DomainError(`Ce chemin est déjà référencé par « ${dup.name} ».`, "INVALIDE");
  const old = m.ref;
  touch(m, { ref: next, lastCheck: null });
  return commit(db, "media", m, `Chemin modifié : média « ${m.name} » ${old} → ${next}`);
}

export function linkMedia(db: Database, mediaId: string, target: { characterId?: string; articleId?: string }): Media {
  const m = findEntity(db, "media", mediaId) as Media;
  if (target.characterId) {
    const c = findEntity(db, "character", target.characterId) as Character;
    if (!m.characterIds.includes(c.id)) m.characterIds = [...m.characterIds, c.id];
    if (!c.galleryMediaIds.includes(m.id)) {
      touch(c, { galleryMediaIds: [...c.galleryMediaIds, m.id] });
      commit(db, "character", c, `Galerie : « ${m.name} » ajouté à ${c.canonicalName}`);
    }
  }
  if (target.articleId) {
    const a = findEntity(db, "article", target.articleId) as Article;
    if (!m.articleIds.includes(a.id)) m.articleIds = [...m.articleIds, a.id];
    if (!a.mediaIds.includes(m.id)) {
      touch(a, { mediaIds: [...a.mediaIds, m.id] });
      commit(db, "article", a, `Illustration : « ${m.name} » associé à « ${a.title} »`);
    }
  }
  touch(m, {});
  return commit(db, "media", m, `Association : média « ${m.name} »`);
}

export function unlinkMedia(db: Database, mediaId: string, target: { characterId?: string; articleId?: string }): Media {
  const m = findEntity(db, "media", mediaId) as Media;
  if (target.characterId) {
    const c = findEntity(db, "character", target.characterId) as Character;
    if (c.portraitMediaId === m.id)
      throw new DomainError(`Ce média est le portrait officiel de ${c.canonicalName}. Retirez d'abord le portrait.`, "PROTEGE");
    m.characterIds = m.characterIds.filter((x) => x !== c.id);
    touch(c, { galleryMediaIds: c.galleryMediaIds.filter((x) => x !== m.id) });
    commit(db, "character", c, `Galerie : « ${m.name} » retiré de ${c.canonicalName}`);
  }
  if (target.articleId) {
    const a = findEntity(db, "article", target.articleId) as Article;
    m.articleIds = m.articleIds.filter((x) => x !== a.id);
    touch(a, { mediaIds: a.mediaIds.filter((x) => x !== m.id), coverMediaId: a.coverMediaId === m.id ? null : a.coverMediaId });
    commit(db, "article", a, `Illustration : « ${m.name} » retiré de « ${a.title} »`);
  }
  touch(m, {});
  return commit(db, "media", m, `Dissociation : média « ${m.name} »`);
}

export function recordLinkCheck(db: Database, mediaId: string, check: NonNullable<Media["lastCheck"]>) {
  const m = findEntity(db, "media", mediaId) as Media;
  // Vérification de lien : pas une révision de contenu, simple journalisation.
  m.lastCheck = check;
  log(db, "Vérification", `Lien « ${m.name} » : ${check.status}${check.httpStatus ? ` (HTTP ${check.httpStatus})` : ""}`, "media", m.id);
}

/* --------------------------------- Bible --------------------------------- */

export type BibleInput = Pick<BibleEntry, "category" | "title" | "body" | "status" | "characterIds"> & { source?: string; detail?: string };

export function createBibleEntry(db: Database, input: BibleInput): BibleEntry {
  if (!input.title.trim()) throw new DomainError("Le titre est obligatoire.", "INVALIDE");
  const { source, detail, ...rest } = input;
  const b: BibleEntry = { ...base("bible", source || "saisie-manuelle"), ...rest };
  if (detail) b.provenance.detail = detail;
  db.bible.push(b);
  return commit(db, "bible", b, `Création : Bible « ${b.title} »`);
}

export function updateBibleEntry(db: Database, id: string, patch: Partial<BibleInput>, expectedRevision?: number): BibleEntry {
  const b = findEntity(db, "bible", id) as BibleEntry;
  checkRevision(b, expectedRevision);
  const { source, detail, ...rest } = patch;
  touch(b, rest);
  if (source !== undefined || detail !== undefined)
    b.provenance = { ...b.provenance, ...(source !== undefined && { source }), ...(detail !== undefined && { detail }) };
  return commit(db, "bible", b, `Modification : Bible « ${b.title} » (rév. ${b.revision})`);
}

/* --------------------------- Corbeille & révisions --------------------------- */

export function softDelete(db: Database, type: Exclude<EntityType, "publication">, id: string): AnyEntity {
  const e = findEntity(db, type, id);
  if (e.deletedAt) return e;
  if (type === "media") {
    const portraitOf = db.characters.find((c) => c.portraitMediaId === id && !c.deletedAt);
    if (portraitOf)
      throw new DomainError(`Impossible : ce média est le portrait officiel de ${portraitOf.canonicalName}.`, "PROTEGE");
  }
  touch(e, { deletedAt: nowIso() });
  return commit(db, type, e, `Corbeille : ${LABEL[type]} ${id} placé(e) dans la corbeille`);
}

export function restoreFromTrash(db: Database, type: Exclude<EntityType, "publication">, id: string): AnyEntity {
  const e = findEntity(db, type, id);
  if (!e.deletedAt) return e;
  touch(e, { deletedAt: null });
  return commit(db, type, e, `Restauration : ${LABEL[type]} ${id} sorti(e) de la corbeille`);
}

export function revisionsOf(db: Database, type: EntityType, id: string) {
  return db.revisions.filter((r) => r.entityType === type && r.entityId === id).sort((a, b) => b.revision - a.revision);
}

/**
 * Restaure une ancienne révision SANS détruire l'historique : l'ancien état devient
 * une nouvelle révision (n+1). Les révisions intermédiaires restent consultables.
 */
export function restoreRevision(
  db: Database,
  type: Exclude<EntityType, "publication">,
  id: string,
  revision: number,
  expectedRevision?: number,
): AnyEntity {
  const e = findEntity(db, type, id);
  checkRevision(e, expectedRevision);
  const rev = db.revisions.find((r) => r.entityType === type && r.entityId === id && r.revision === revision);
  if (!rev) throw new DomainError(`Révision ${revision} introuvable.`, "INTROUVABLE");
  const snap = structuredClone(rev.snapshot) as AnyEntity;
  const current = e.revision;
  const keep = { id: e.id, createdAt: e.createdAt, revision: e.revision, deletedAt: e.deletedAt };
  for (const k of Object.keys(e)) delete (e as unknown as Record<string, unknown>)[k];
  Object.assign(e, snap, keep);
  if (type === "article") (e as Article).status = "brouillon";
  touch(e, {});
  return commit(db, type, e, `Restauration de révision : ${LABEL[type]} ${id} — rév. ${revision} recopiée en rév. ${current + 1}`);
}

/* ------------------------------ Publication ------------------------------ */

function toPublished(db: Database, a: Article): PublishedArticle {
  return {
    id: a.id,
    slug: a.slug,
    aliases: [...a.aliases],
    revision: a.revision,
    title: a.title,
    subtitle: a.subtitle,
    section: a.section,
    tags: [...a.tags],
    lead: a.lead,
    body: a.body,
    characterIds: [...a.characterIds],
    media: a.mediaIds
      .map((mid) => db.media.find((m) => m.id === mid))
      .filter((m): m is Media => !!m && !m.deletedAt)
      .map((m) => ({ id: m.id, ref: m.ref, location: m.location, name: m.name })),
  };
}

function manifestOf(prev: PublishedArticle[], next: PublishedArticle[]) {
  const before = new Map(prev.map((a) => [a.id, a]));
  const manifest = { added: [] as string[], modified: [] as string[], removed: [] as string[], unchanged: [] as string[] };
  for (const a of next) {
    const p = before.get(a.id);
    if (!p) manifest.added.push(a.id);
    else if (JSON.stringify(p) !== JSON.stringify(a)) manifest.modified.push(a.id);
    else manifest.unchanged.push(a.id);
    before.delete(a.id);
  }
  manifest.removed = [...before.keys()];
  return manifest;
}

export function latestPublication(db: Database): Publication | undefined {
  return db.publications.reduce<Publication | undefined>((acc, p) => (!acc || p.number > acc.number ? p : acc), undefined);
}

/**
 * Prépare le contenu d'une publication : les articles « validés » ou déjà « publiés »,
 * hors corbeille. Les brouillons ne sortent JAMAIS.
 * NB : un article publié puis remis en brouillon conserve sa version publiée précédente.
 */
export function previewPublication(db: Database): { articles: PublishedArticle[]; manifest: Publication["manifest"] } {
  const prev = latestPublication(db);
  const prevById = new Map((prev?.articles ?? []).map((a) => [a.id, a]));
  const articles: PublishedArticle[] = [];
  for (const a of db.articles) {
    if (a.deletedAt) continue;
    if (a.status === "valide" || a.status === "publie") articles.push(toPublished(db, a));
    else if (prevById.has(a.id)) articles.push(prevById.get(a.id)!); // brouillon en cours : on garde la version publiée
  }
  articles.sort((x, y) => x.title.localeCompare(y.title, "fr"));
  return { articles, manifest: manifestOf(prev?.articles ?? [], articles) };
}

function freeze(pub: Publication): Publication {
  const deep = (o: unknown) => {
    if (o && typeof o === "object") {
      Object.freeze(o);
      for (const v of Object.values(o)) deep(v);
    }
  };
  deep(pub.articles);
  deep(pub.manifest);
  return pub;
}

export function publish(db: Database, note: string, restoredFrom?: Publication): Publication {
  const prev = latestPublication(db);
  const content = restoredFrom
    ? { articles: structuredClone(restoredFrom.articles), manifest: manifestOf(prev?.articles ?? [], restoredFrom.articles) }
    : previewPublication(db);
  if (content.articles.length === 0) throw new DomainError("Rien à publier : aucun article validé.", "INVALIDE");
  const pub: Publication = {
    id: newId("publication"),
    number: (prev?.number ?? 0) + 1,
    createdAt: nowIso(),
    note: note.trim(),
    articles: content.articles,
    manifest: content.manifest,
    contentHash: sha256(JSON.stringify(content.articles)),
    restoredFrom: restoredFrom?.number ?? null,
    verification: "non-verifiee",
    verifiedAt: null,
  };
  if (!restoredFrom) {
    for (const a of db.articles) {
      if (!a.deletedAt && a.status === "valide") {
        touch(a, { status: "publie" });
        commit(db, "article", a, `Publication : article « ${a.title} » inclus dans la publication n°${pub.number}`);
      }
    }
  }
  db.publications.push(pub);
  log(
    db,
    restoredFrom ? "Restauration de publication" : "Publication",
    `Publication n°${pub.number} créée (${pub.articles.length} articles, +${pub.manifest.added.length} ~${pub.manifest.modified.length} -${pub.manifest.removed.length})` +
      (restoredFrom ? ` — copie de la n°${restoredFrom.number}` : ""),
    "publication",
    pub.id,
  );
  return freeze(pub);
}

/** Restaure une publication antérieure en créant une NOUVELLE publication identique. Les brouillons ne sont pas touchés. */
export function restorePublication(db: Database, number: number, note: string): Publication {
  const src = db.publications.find((p) => p.number === number);
  if (!src) throw new DomainError(`Publication n°${number} introuvable.`, "INTROUVABLE");
  return publish(db, note || `Restauration de la publication n°${number}`, src);
}

/** La vérification est déclarée par un humain après contrôle réel de Porkopédia — jamais automatiquement. */
export function setVerification(db: Database, number: number, status: PublicationVerification, note: string) {
  const idx = db.publications.findIndex((p) => p.number === number);
  if (idx < 0) throw new DomainError(`Publication n°${number} introuvable.`, "INTROUVABLE");
  const p = db.publications[idx]!;
  // Le contenu reste figé : on recrée l'enveloppe avec les mêmes articles gelés.
  db.publications[idx] = { ...p, verification: status, verificationNote: note, verifiedAt: nowIso() };
  log(db, "Vérification publication", `Publication n°${number} : ${status}${note ? ` — ${note}` : ""}`, "publication", p.id);
}
