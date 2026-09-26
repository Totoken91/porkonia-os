/**
 * Modèle de données de Porkonia OS (V1).
 * Voir docs/DATA_MODEL.md pour la description détaillée.
 *
 * Règles invariantes :
 * - Les identifiants (`id`) sont permanents et indépendants du titre/slug.
 * - Aucune suppression physique : `deletedAt` = corbeille.
 * - Chaque écriture incrémente `revision` et archive l'état précédent.
 */

export type EntityType = "character" | "article" | "media" | "bible" | "publication";

export interface Provenance {
  /** Source d'origine : "demo", "saisie-manuelle", "porkopedia:articles.js", "bible-visuelle.docx#section"... */
  source: string;
  /** Précision libre (section, ligne, URL…). */
  detail?: string;
  importedAt?: string;
}

export interface BaseEntity {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  /** Données de démonstration : jamais canoniques, clairement marquées dans l'interface. */
  isDemo?: boolean;
  provenance: Provenance;
}

/* ------------------------------------------------------------------ */
/* Personnages                                                         */
/* ------------------------------------------------------------------ */

/** canon = validé ; proposition = non validé ; archive = ancienne version conservée. */
export type CanonStatus = "canon" | "proposition" | "archive";

export interface Relation {
  targetId: string;
  kind: string;
  note?: string;
}

export interface Character extends BaseEntity {
  slug: string;
  canonicalName: string;
  nicknames: string[];
  role: string;
  description: string;
  appearance: string;
  biography: string;
  affiliations: string[];
  relations: Relation[];
  events: string[];
  /** Média officiel (statut `officiel`) associé à ce personnage. */
  portraitMediaId?: string | null;
  galleryMediaIds: string[];
  narrativeRefs: string[];
  status: CanonStatus;
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export type ArticleStatus = "brouillon" | "valide" | "publie";

export interface Article extends BaseEntity {
  slug: string;
  /** Anciens slugs / identifiants Porkopédia (#article=...) toujours résolus. */
  aliases: string[];
  title: string;
  subtitle: string;
  section: string;
  tags: string[];
  lead: string;
  /** Corps en Markdown. Liens internes : [[id-ou-slug|texte]]. Images : ![légende](media:med_xxx). */
  body: string;
  status: ArticleStatus;
  characterIds: string[];
  mediaIds: string[];
  /** Média d'illustration principal. */
  coverMediaId?: string | null;
}

/* ------------------------------------------------------------------ */
/* Médias (catalogue de références — les fichiers ne sont PAS déplacés) */
/* ------------------------------------------------------------------ */

export type MediaKind = "image" | "illustration" | "photo" | "video" | "audio" | "logo" | "document" | "autre";
/** externe = URL (ex. Porkopédia / ChatGPT Sites) ; locale = chemin relatif sous PORKONIA_MEDIA_ROOT. */
export type MediaLocation = "externe" | "locale";
export type MediaCanonStatus = "officiel" | "variante" | "proposition" | "archive";

export interface LinkCheck {
  status: "ok" | "erreur" | "inconnu";
  httpStatus?: number;
  contentType?: string;
  message?: string;
  checkedAt: string;
}

export interface Media extends BaseEntity {
  name: string;
  description: string;
  kind: MediaKind;
  location: MediaLocation;
  /** URL absolue (externe) ou chemin relatif (locale). Jamais modifié sans validation explicite. */
  ref: string;
  thumbnailRef?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  /** Empreinte SHA-256 si calculée (sauvegarde facultative ou import local). */
  sha256?: string | null;
  characterIds: string[];
  articleIds: string[];
  canonStatus: MediaCanonStatus;
  /** Si ce média est une variante / nouvelle version d'un autre (l'original n'est jamais écrasé). */
  variantOf?: string | null;
  lastCheck?: LinkCheck | null;
  /** Copie de sauvegarde facultative (scripts/media-backup.mjs). */
  backupPath?: string | null;
}

/* ------------------------------------------------------------------ */
/* Bible canonique                                                     */
/* ------------------------------------------------------------------ */

export type BibleCategory =
  | "regles-visuelles"
  | "regles-narratives"
  | "geographie"
  | "chronologie"
  | "organisations"
  | "personnages"
  | "traditions"
  | "contraintes-generation";

export interface BibleEntry extends BaseEntity {
  category: BibleCategory;
  title: string;
  body: string;
  status: CanonStatus;
  characterIds: string[];
}

/* ------------------------------------------------------------------ */
/* Révisions, publications, journal                                    */
/* ------------------------------------------------------------------ */

export interface Revision {
  id: string;
  entityType: EntityType;
  entityId: string;
  revision: number;
  /** État complet de l'entité APRÈS l'écriture de cette révision. */
  snapshot: unknown;
  message: string;
  createdAt: string;
}

export type PublicationVerification = "non-verifiee" | "verifiee" | "echec";

export interface PublishedArticle {
  id: string;
  slug: string;
  aliases: string[];
  revision: number;
  title: string;
  subtitle: string;
  section: string;
  tags: string[];
  lead: string;
  body: string;
  characterIds: string[];
  media: { id: string; ref: string; location: MediaLocation; name: string }[];
}

export interface PublicationManifest {
  added: string[];
  modified: string[];
  removed: string[];
  unchanged: string[];
}

export interface Publication {
  id: string;
  number: number;
  createdAt: string;
  note: string;
  /** Contenu figé (immuable) de la publication. */
  articles: PublishedArticle[];
  manifest: PublicationManifest;
  contentHash: string;
  /** Si la publication est une restauration, numéro de la publication d'origine. */
  restoredFrom?: number | null;
  verification: PublicationVerification;
  verificationNote?: string;
  verifiedAt?: string | null;
}

export interface OperationLog {
  id: string;
  at: string;
  action: string;
  entityType?: EntityType | "systeme";
  entityId?: string;
  summary: string;
}

export interface BackupRecord {
  id: string;
  at: string;
  file: string;
  bytes: number;
  sha256: string;
}

export interface Database {
  schemaVersion: number;
  characters: Character[];
  articles: Article[];
  media: Media[];
  bible: BibleEntry[];
  revisions: Revision[];
  publications: Publication[];
  log: OperationLog[];
  backups: BackupRecord[];
}

export const SCHEMA_VERSION = 1;
