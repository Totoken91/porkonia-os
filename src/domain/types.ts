/**
 * Modèle de données de Porkonia OS (schéma v2).
 * Voir docs/DATA_MODEL.md pour la description détaillée.
 *
 * Règles invariantes :
 * - Les identifiants (`id`) sont permanents et indépendants du titre/slug.
 * - Aucune suppression physique : `deletedAt` = corbeille.
 * - Chaque écriture incrémente `revision` et archive l'état précédent.
 */

export type EntityType = "character" | "article" | "media" | "bible" | "publication";

/** Référence vers une source importée (Porkopédia, Bible DOCX…). */
export type ExternalSource = "porkopedia" | "bible-docx";

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
  /** Identifiants dans les sources importées (ex. id d'article Porkopédia de la figure). */
  external?: { porkopediaId?: string; bibleName?: string } | null;
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
  /** Format du corps : Markdown (défaut) ou HTML d'origine conservé sans conversion (imports Porkopédia). */
  format?: "markdown" | "html";
  /** Lien avec l'article source importé. */
  external?: ArticleExternal | null;
  /** Protection éditoriale : toute mise à jour par import exige une validation humaine. */
  protection?: { reason: string; since: string } | null;
  /** Dernier état constaté sur le site public (par extraction automatique, jamais supposé). */
  siteSeen?: { contentHash: string; at: string; extractionId: string } | null;
}

export interface ArticleExternal {
  source: "porkopedia";
  /** Identifiant Porkopédia (#article=...). */
  id: string;
  /** Empreinte du contenu importé (idempotence et détection des modifications locales). */
  contentHash: string;
  importedAt: string;
  extractionId: string;
  /** Script ou fichier qui a créé l'article (articles.js, bestiary.js, index.html…). */
  origin: string;
  /** Scripts qui ont modifié l'article après sa création, dans l'ordre d'exécution. */
  modifiedBy: string[];
  /** Révision locale à la fin de l'import : au-delà, l'article a été modifié dans Porkonia OS. */
  importedRevision: number;
  /** URL de base pour résoudre les chemins relatifs du HTML d'origine (assets/…). */
  baseUrl: string;
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
  /**
   * Nature de l'image : une référence source (photo canonique non modifiée) ne peut JAMAIS
   * être remplacée comme portrait par une génération ou une image de nature inconnue.
   */
  nature?: MediaNature;
  external?: MediaExternal | null;
}

export type MediaNature = "reference-source" | "generation" | "indeterminee";

export interface MediaExternal {
  source: ExternalSource;
  /** Référence telle qu'écrite dans la source (chemin relatif « assets/… », « word/media/image2.png »…). */
  originalRef: string;
  /** Fichiers où la référence a été trouvée. */
  foundIn: string[];
  /** Affichée sur le site public lors de l'extraction (sinon : référence présente dans le code mais non affichée). */
  displayed?: boolean;
  /** Empreinte du document source (DOCX). */
  documentSha256?: string;
  /** Nom de fichier d'origine déclaré dans la source (ex. « SOURCE CANONIQUE NON MODIFIÉE • x.png »). */
  originalFilename?: string;
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
  /** Section d'un document source importé (DOCX). */
  external?: { source: "bible-docx"; documentSha256: string; sectionPath: string; textHash: string; importedRevision: number } | null;
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

/**
 * Étapes d'une publication, strictement séparées :
 * publication locale (instantané) → exportée pour Porkopédia → déployée (déclaration humaine)
 * → vérifiée (manuellement par un humain OU automatiquement par extraction du site).
 */
export interface PublicationVerificationRecord {
  status: PublicationVerification;
  method?: "manuelle" | "automatique";
  at?: string | null;
  note?: string;
  /** Détails de la vérification automatique (par article). */
  details?: { id: string; title: string; found: boolean; similarity: number; ok: boolean }[];
  extractionId?: string;
}

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
  /** Date du dernier export du paquet destiné à Porkopédia. */
  exportedAt?: string | null;
  /** Déploiement sur Porkopédia DÉCLARÉ par un humain (Porkonia OS ne peut pas déployer). */
  deployment?: { declaredAt: string; note: string } | null;
  verification: PublicationVerificationRecord;
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

/* ------------------------------------------------------------------ */
/* Imports et documents sources                                        */
/* ------------------------------------------------------------------ */

export interface ImportChange {
  entityType: Exclude<EntityType, "publication">;
  entityId: string;
  action: "cree" | "modifie" | "restaure";
  revisionBefore?: number;
  revisionAfter: number;
  label: string;
}

export interface ImportBatch {
  id: string;
  kind: ExternalSource;
  at: string;
  /** Extraction Porkopédia ou empreinte du document DOCX. */
  sourceId: string;
  sourceHash: string;
  summary: Record<string, number>;
  /** Décisions humaines prises dans la prévisualisation. */
  decisions: Record<string, string>;
  changes: ImportChange[];
  status: "appliquee" | "annulee";
  undoneAt?: string | null;
  undoReport?: string[];
}

export interface SourceDocument {
  id: string;
  kind: "docx";
  filename: string;
  sha256: string;
  bytes: number;
  /** Chemin (relatif au dossier de données) de la copie intacte, en lecture seule. */
  storedAt: string;
  registeredAt: string;
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
  imports: ImportBatch[];
  sources: SourceDocument[];
}

export const SCHEMA_VERSION = 2;
