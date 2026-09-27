/**
 * PACK DE CONTENU — tout ce qui se trouve « dans l'ordinateur » est décrit ici, en données.
 * PorkOS (la démo) est un pack. L'ordinateur fouillé du futur spin-off d'enquête en sera un autre :
 * mêmes applis (Fichiers, Mail, Navigateur…), autres utilisateurs, fichiers, mails et événements.
 * Aucun contenu narratif ne doit être codé en dur dans les composants.
 */

/** Clé d'un composant d'application (voir src/apps/registry.tsx). */
export type AppKind = "bienvenue" | "executer" | "mail" | "navigateur" | "channel-pork" | "nappe-vide" | "config" | "fichiers" | "visionneuse" | "texte";

export type IconKey = "embleme" | "bureau" | "ordinateur" | "executer" | "navigateur" | "tele" | "nappe" | "config" | "dossier" | "poubelle" | "texte" | "image" | "mail" | "carte" | "cadenas";

/**
 * Entrée de menu d'une fenêtre. `&` dans un libellé marque la lettre d'accès (Alt+lettre), soulignée.
 * - `command` : commande de l'appli (ou de la fenêtre : fenetre.fermer, fenetre.reduire, fenetre.agrandir, aide.apropos),
 *   avec `arg` facultatif ; une commande que l'appli ne gère pas apparaît grisée.
 * - `action` : action système (dialogue, notification, ouvrir une appli…).
 * - `radio` : puce au lieu de coche quand l'entrée est active.
 */
export type MenuEntry =
  | { separator: true }
  | { label: string; shortcut?: string; disabled?: boolean; command?: string; arg?: string; action?: ActionRef; radio?: boolean };

export interface MenuSpec {
  label: string;
  items: MenuEntry[];
}

export interface AppManifest {
  id: string;
  kind: AppKind;
  title: string;
  icon: IconKey;
  /** Taille par défaut de la fenêtre. */
  size: { w: number; h: number };
  /** Une seule fenêtre à la fois (réouvrir = remettre au premier plan). */
  single?: boolean;
  /** Rangée dans le menu PorkOS (absente = n'y figure pas). */
  menu?: "programmes" | "accessoires" | "systeme";
  /** Info-bulle du menu. */
  blurb?: string;
  /** Barre de menus de la fenêtre. */
  menus?: MenuSpec[];
  /** Texte de la boîte « À propos de… ». */
  about?: string;
  /** Fenêtre habillée : pas de barre de titre ni de menus, l'appli dessine son propre boîtier. */
  habillage?: "tele";
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
  /** Pièces jointes : chemins du système de fichiers du pack (ouvrables), ou simples noms (confisqués). */
  attachments?: string[];
  /** Absent au départ : livré en cours de session par une règle (action « mail »). */
  later?: boolean;
}

/** Messagerie : adresse du poste, réponses automatiques de l'administration, dossier surveillé. */
export interface MailboxSpec {
  address: string;
  signature: string;
  autoReplies: { from: string; body: string }[];
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
  kind: "journal" | "education" | "publicite" | "divertissement" | "documentaire" | "sport" | "meteo" | "clip";
  /** Étiquette du bandeau (sinon celle du genre, `tv.etiquette.<kind>`). */
  etiquette?: string;
  /** Vidéo réelle facultative (sinon : diaporama d'images + sous-titres). */
  videoSrc?: string;
  /**
   * `focus` : point à garder dans le cadre 4:3 (0–1 en largeur et en hauteur ; défaut 0,5 et 0,35).
   * `fixe` : pas de zoom lent (cartes). `meteo` : bulletin dessiné sur la carte (lieux de `carteMeteo`).
   */
  slides: {
    image: string;
    seconds: number;
    caption?: string;
    chyron?: string;
    focus?: [number, number];
    fixe?: boolean;
    meteo?: BulletinMeteo;
    /** Zoom de départ (1 = cadre entier) : pour un détail de l'image. */
    zoom?: number;
    /** Image entière posée sur un fond uni (logos sombres sur fond transparent). */
    fond?: string;
  }[];
  /**
   * Sous-titres, synchronisés sur le temps total du programme ; `voice` : voix off enregistrée de la réplique,
   * `dur` : sa durée (s), qui sert à faire défiler les sous-titres longs au rythme de la voix.
   */
  subtitles: { at: number; text: string; voice?: string; dur?: number }[];
  /** Musique de fond (bouclée, baissée sous la voix). */
  music?: string;
  /** Clip musical : `music` est le morceau lui-même, calé sur le direct ; incrustation artiste et titre. */
  clip?: { artiste: string; titre: string; mention?: string };
}

export type IconeMeteo = "soleil" | "eclaircies" | "nuages" | "pluie" | "neige" | "brouillard" | "confettis" | "mousse" | "vent";

/** Un écran du bulletin météo : un titre et des lieux de la carte, avec pictogramme, température, légende ou vent. */
export interface BulletinMeteo {
  titre: string;
  points: { lieu: string; icone?: IconeMeteo; temp?: number; texte?: string; vent?: { dir: number; force: number } }[];
}

/** Chaîne en direct : sa grille tourne en boucle sur l'horloge réelle (on arrive en cours d'émission). */
export interface Channel {
  id: string;
  name: string;
  /** Identifiants des programmes, dans l'ordre de diffusion (un programme peut revenir, les pubs surtout). */
  grid: string[];
}

/** Portail officiel PigNet (page d'accueil du navigateur). */
export interface Portal {
  /** Compteur de visites : valeur au 1er janvier 2000, puis tant de visites par jour. */
  compteur: { base: number; parJour: number };
  /** Saint du jour, tiré selon la date. */
  saints: string[];
  /** Dépêche défilante « Dernière minute ». */
  flash: string;
  /** Services de l'État (colonne de gauche) : une adresse PigNet ou une action. */
  services: { label: string; note: string; url?: string; action?: ActionRef }[];
  sondage: { question: string; options: string[]; resultats: number[]; merci: string };
  bourse: { nom: string; base: number; unite: string }[];
  meteo: { villes: string[]; ciels: string[]; mousses: string[] };
  annonces: string[];
  pub: { image: string; texte: string; cta: string };
  badges: string[];
  construction: string;
  pied: string;
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
  | { type: "shutdown" }
  | { type: "restart" }
  | { type: "lock" }
  | { type: "signal"; name: string }
  | { type: "mail"; id: string }
  /** Un programme ouvert cesse de répondre un moment. */
  | { type: "freeze" }
  /** Écran d'exception fatale (texte en plein écran), puis retour au bureau. */
  | { type: "fatal" }
  /** Action système interne sur une fenêtre (boîtes « ne répond pas »). */
  | { type: "window"; op: "close" | "unfreeze"; id: string };

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
  /** Fond d'écran « Portrait du Fondateur » (référence d'origine, jamais une copie). */
  wallpaper?: { portrait?: string };
  /** Écran de bienvenue ouvert à la connexion. */
  welcome: { title: string; intro: string; tips: string[]; links: { label: string; action: ActionRef }[] };
  filesystem: FsNode;
  mails: Mail[];
  mailbox: MailboxSpec;
  boot: {
    bios: string[];
    splash: { title: string; slogan: string };
    skipHint: string;
    /** Pilotes affichés pendant le chargement. */
    drivers: string[];
    /** Contrôle affiché au démarrage suivant un arrêt brutal (courant coupé, onglet fermé). */
    scandisk: { title: string; lines: string[]; outro: string };
  };
  /** Fermeture propre du système. */
  shutdown: { closing: string; safe: string; restarting: string };
  /** Boîte « Exécuter… » : commandes reconnues. */
  run: { prompt: string; aliases: Record<string, { app: string; args?: Record<string, string> } | { action: ActionRef }>; notFound: string };
  login: { prompt: string; emptyPassword: string; acceptedAny: string[]; patriotic: string; wrongPassword: string; guestNotice: string };
  /** Dépêches de l'agence de presse nationale (portail PigNet). */
  news: string[];
  toastPools: Record<string, Toast[]>;
  dialogs: Record<string, DialogSpec>;
  ads: Ad[];
  updates: ForcedUpdate[];
  programs: Program[];
  channels: Channel[];
  portal: Portal;
  /** Carte météo stylisée et position des lieux (0–1). */
  carteMeteo: { image: string; lieux: Record<string, [number, number]> };
  rules: EventRule[];
  /** Messages de l'appli Configuration et du système (réglages absurdes). */
  strings: Record<string, string>;
}
