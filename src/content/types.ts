/**
 * PACK DE CONTENU — tout ce qui se trouve « dans l'ordinateur » est décrit ici, en données.
 * PorkOS (la démo) est un pack. L'ordinateur fouillé du futur spin-off d'enquête en sera un autre :
 * mêmes applis (Fichiers, Mail, Navigateur…), autres utilisateurs, fichiers, mails et événements.
 * Aucun contenu narratif ne doit être codé en dur dans les composants.
 */

/** Clé d'un composant d'application (voir src/apps/registry.tsx). */
export type AppKind = "navigateur" | "channel-pork" | "nappe-vide" | "config" | "fichiers" | "visionneuse" | "texte";

export type IconKey = "navigateur" | "tele" | "nappe" | "config" | "dossier" | "poubelle" | "texte" | "image" | "mail" | "carte" | "cadenas";

export interface AppManifest {
  id: string;
  kind: AppKind;
  title: string;
  icon: IconKey;
  /** Taille par défaut de la fenêtre. */
  size: { w: number; h: number };
  /** Une seule fenêtre à la fois (réouvrir = remettre au premier plan). */
  single?: boolean;
  /** Horaire fictif affiché dans le menu « Au programme ». */
  slot?: string;
  /** Sous-titre du menu. */
  blurb?: string;
}

export interface DesktopIcon {
  id: string;
  label: string;
  icon: IconKey;
  /** Ouvre une appli (avec arguments éventuels) ou déclenche une action système. */
  open: { app: string; args?: Record<string, string> } | { action: ActionRef };
}

/* ------------------------------ Utilisateurs ------------------------------ */

export interface UserProfile {
  id: string;
  displayName: string;
  /** Sous-titre sur l'écran de connexion. */
  caption: string;
  /** Mot de passe exigé (null = tout mot de passe non vide est accepté, et commenté). */
  password: string | null;
  passwordHint: string;
  guest?: boolean;
  porkId?: { numero: string; niveauBanquet: string; profession: string; delivrance: string };
}

/* --------------------------- Système de fichiers --------------------------- */

export type FsNode =
  | { type: "dossier"; name: string; children: FsNode[]; locked?: string }
  | { type: "texte"; name: string; content: string; date?: string }
  | { type: "image"; name: string; src: string; caption?: string; date?: string }
  | { type: "lien"; name: string; app: string; args?: Record<string, string> };

/* ---------------------------------- Mail ---------------------------------- */

export interface Mail {
  id: string;
  folder: "reception" | "envoyes" | "brouillons" | "corbeille";
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  read?: boolean;
  attachments?: string[];
}

/* -------------------------------- Messages -------------------------------- */

export interface DialogSpec {
  title: string;
  /** Pictogramme : information, avertissement, erreur, sceau d'État. */
  icon: "info" | "attention" | "erreur" | "sceau";
  body: string;
  buttons: { label: string; then?: ActionRef }[];
}

export interface Toast {
  title: string;
  body: string;
}

export interface Ad {
  id: string;
  sponsor: string;
  headline: string;
  body: string;
  slogan: string;
  image?: string;
  /** Secondes avant que la croix de fermeture ne soit accordée. */
  closeAfter: number;
  cta: string;
}

export interface ForcedUpdate {
  id: string;
  title: string;
  version: string;
  steps: { label: string; ms: number }[];
  outro: string;
  /** Remet les réglages du citoyen à leur « valeur recommandée » une fois terminée. */
  resetSettings?: boolean;
}

/* ----------------------------- Channel Pork ------------------------------- */

export interface Program {
  id: string;
  title: string;
  channel: string;
  kind: "journal" | "education" | "publicite" | "divertissement" | "documentaire";
  /** Vidéo réelle facultative (sinon : diaporama d'images + sous-titres). */
  videoSrc?: string;
  slides: { image: string; seconds: number; caption?: string; chyron?: string }[];
  /** Sous-titres, synchronisés sur le temps total du programme. */
  subtitles: { at: number; text: string }[];
}

/* ---------------------------- Actions & règles ---------------------------- */

/** Action système déclenchable par une icône, un bouton de dialogue ou une règle. */
export type ActionRef =
  | { type: "toast"; toast: Toast }
  | { type: "toast-pool"; pool: string }
  | { type: "dialog"; dialog: DialogSpec }
  | { type: "dialog-ref"; id: string }
  | { type: "ad"; id?: string }
  | { type: "update"; id: string }
  | { type: "open"; app: string; args?: Record<string, string> }
  | { type: "sleep" }
  | { type: "lock" }
  | { type: "signal"; name: string };

export type Trigger =
  | { type: "login"; delay: number }
  /** Répétition : première occurrence après `startAfter`, puis tous les `every` ± `jitter` (ms). */
  | { type: "interval"; startAfter: number; every: number; jitter: number }
  | { type: "app-open"; app: string }
  | { type: "signal"; name: string };

export interface EventRule {
  id: string;
  trigger: Trigger;
  action: ActionRef;
  /** Nombre maximal de déclenchements par session (défaut : illimité). */
  max?: number;
  /** Ne se déclenche pas si un réglage le désactive (clé de réglage booléenne). */
  unlessSetting?: string;
}

/* ---------------------------------- Pack ---------------------------------- */

export interface ContentPack {
  id: string;
  os: { name: string; edition: string; version: string; vendor: string };
  users: UserProfile[];
  apps: AppManifest[];
  desktop: DesktopIcon[];
  /** Affiche du bureau : portrait tramé (référence d'origine, jamais une copie). */
  wallpaper?: { portrait?: string };
  filesystem: FsNode;
  mails: Mail[];
  boot: { bios: string[]; splash: { title: string; slogan: string }; skipHint: string };
  login: { prompt: string; emptyPassword: string; acceptedAny: string[]; patriotic: string; wrongPassword: string; guestNotice: string };
  ticker: string[];
  toastPools: Record<string, Toast[]>;
  dialogs: Record<string, DialogSpec>;
  ads: Ad[];
  updates: ForcedUpdate[];
  programs: Program[];
  rules: EventRule[];
  /** Messages de l'appli Configuration et du système (réglages absurdes). */
  strings: Record<string, string>;
}
