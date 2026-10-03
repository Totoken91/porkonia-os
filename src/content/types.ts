/**
 * PACK DE CONTENU — tout ce qui se trouve « dans l'ordinateur » est décrit ici, en données.
 * PorkOS (la démo) est un pack. L'ordinateur fouillé du futur spin-off d'enquête en sera un autre :
 * mêmes applis (Fichiers, Mail, Navigateur…), autres utilisateurs, fichiers, mails et événements.
 * Aucun contenu narratif ne doit être codé en dur dans les composants.
 */

/** Clé d'un composant d'application (voir src/apps/registry.tsx). */
export type AppKind = "bienvenue" | "executer" | "mail" | "navigateur" | "channel-pork" | "nappe-vide" | "config" | "fichiers" | "visionneuse" | "texte" | "distinctions" | "porkamp" | "calculatrice" | "defrag" | "paint";

export type IconKey = "embleme" | "bureau" | "ordinateur" | "executer" | "navigateur" | "tele" | "nappe" | "config" | "dossier" | "poubelle" | "texte" | "image" | "mail" | "carte" | "cadenas" | "medaille" | "musique" | "calculatrice" | "defrag" | "paint";

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
  habillage?: "tuner" | "lecteur";
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

/**
 * `protege` : message opposé à qui veut supprimer, renommer, déplacer ou modifier l'élément.
 * `cache` : fichier caché, visible seulement avec « Afficher les fichiers cachés ».
 */
export type FsNode = (
  | { type: "dossier"; name: string; children: FsNode[]; locked?: string }
  | { type: "texte"; name: string; content: string; date?: string }
  | { type: "image"; name: string; src: string; caption?: string; date?: string }
  | { type: "lien"; name: string; app: string; args?: Record<string, string> }
) & { protege?: string; cache?: boolean };

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

/**
 * Personnalité à qui le citoyen peut écrire : sa réponse est rédigée en personnage par un modèle de langage, via le relais
 * serveur `/api/courrier` (jamais depuis le navigateur). La fiche ne contient que des faits établis (notice Porkopédia
 * extraite, ou personnage déjà présent dans PorkOS) et la manière d'écrire du personnage.
 */
export interface Correspondant {
  id: string;
  /** « Nom <adresse> », comme dans le Courrier. */
  adresse: string;
  /** Qui c'est, en une ligne (carnet d'adresses). */
  qui: string;
  /** Faits et manière d'écrire, transmis au modèle. Rester court : la limite gratuite compte les mots. */
  fiche: string;
  /** Provenance des faits. */
  source: string;
  /** Réponse de secours si le relais est indisponible (hors ligne, quota du jour épuisé). */
  secours: string;
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
  /** Programme diffusé sans habillage d'antenne (ni logo de chaîne ni bandeau), comme un dessin animé. */
  sansHabillage?: boolean;
  kind: "journal" | "education" | "publicite" | "divertissement" | "documentaire" | "sport" | "meteo" | "clip" | "jeu" | "anime";
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
  /**
   * Bande son intégrale de l'émission (voix, bruitages, public déjà mixés), jouée calée sur le direct
   * comme un clip : les sous-titres suivent la bande, sans voix séparées.
   */
  bande?: string;
  /** Musique de fond (bouclée, baissée sous la voix). */
  music?: string;
  /** Clip musical : `music` est le morceau lui-même, calé sur le direct ; incrustation artiste et titre. */
  clip?: { artiste: string; titre: string; mention?: string };
  /**
   * Générique d'ouverture : carton titre de `secondes`, avant la première diapositive. `son` : le jingle, joué comme
   * une réplique (programmes à voix séparées) ; pour une bande intégrale, le jingle est déjà en tête de la bande.
   * Déplié par `deplierGenerique` (src/os/generique.ts).
   */
  generique?: { image: string; secondes: number; son?: string; fond?: string };
}

export type IconeMeteo = "soleil" | "eclaircies" | "nuages" | "pluie" | "neige" | "brouillard" | "confettis" | "mousse" | "vent";

/** Un écran du bulletin météo : un titre et des lieux de la carte, avec pictogramme, température, légende ou vent. */
export interface BulletinMeteo {
  titre: string;
  points: { lieu: string; icone?: IconeMeteo; temp?: number; texte?: string; vent?: { dir: number; force: number } }[];
}

/** Chaîne en direct : sa grille tourne en boucle sur l'horloge réelle (on arrive en cours d'émission). */
/** Habillage d'antenne d'une chaîne : logo incrusté et bandeau, chacun avec son style. */
export interface Habillage {
  /** Texte du logo incrusté (« CANAL 1 », « ZOUK »…). */
  logo: string;
  /** Petite ligne sous le logo (« DÉCOUVERTE »), facultative. */
  sousLogo?: string;
  position: "haut-droite" | "haut-gauche" | "bas-droite";
  /** Pastille « DIRECT » sous le logo (chaîne d'information). */
  direct?: boolean;
  /** Logo en italique penché (chaîne musicale). */
  italique?: boolean;
  /** Couleur du logo, couleur d'accent (étiquette du bandeau, pastille), fond et texte du bandeau. */
  couleurs: { logo: string; accent: string; barre: string; barreTexte: string };
  /** Opacité du logo (0–1) : les chaînes de nuit et de documentaires restent discrètes. */
  opacite?: number;
}

export interface Channel {
  id: string;
  name: string;
  habillage?: Habillage;
  /** Identifiants des programmes, dans l'ordre de diffusion (un programme peut revenir, les pubs surtout). */
  grid: string[];
}

/** Portail officiel PigNet (page d'accueil du navigateur). */
/** Bloc d'une page perso de PigNet (pages de citoyens façon années 2000). */
export type BlocSite =
  | { t: "titre"; texte: string }
  | { t: "texte"; texte: string }
  | { t: "defile"; texte: string }
  | { t: "clignote"; texte: string }
  | { t: "liste"; items: string[] }
  | { t: "image"; src: string; legende?: string }
  | { t: "liens"; liens: { texte: string; url: string }[] }
  | { t: "construction" }
  | { t: "compteur"; base: number; parJour: number }
  | { t: "livreDor" }
  | { t: "anneau" }
  | { t: "annuaire" };

export interface SitePerso {
  /** Adresse : porko://<hote>/<page>. */
  hote: string;
  titre: string;
  /** Ligne de l'annuaire. */
  description: string;
  categorie: string;
  theme: "bois" | "ciel" | "nuit" | "papier" | "rouge" | "portail";
  /** Membre de l'Anneau des pages perso (liens précédent / suivant). */
  anneau?: boolean;
  /** Pages : "" est l'accueil. */
  pages: Record<string, { titre?: string; blocs: BlocSite[] }>;
  /** Messages déjà présents dans le livre d'or. */
  livreDor?: { nom: string; date: string; message: string }[];
}

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
  /** Ne joue qu'à partir de la n-ième session du citoyen sur ce poste (courriers qui arrivent au fil du temps). */
  apresSessions?: number;
}

/* ------------------------------- Télétexte -------------------------------- */

/** Page du télétexte de Canal 1 : lignes écrites (liens vers d'autres pages possibles) et/ou données du pack. */
export interface TeletextePage {
  numero: number;
  titre: string;
  lignes?: { texte: string; couleur?: "w" | "y" | "c" | "g" | "r" | "m" | "b"; page?: number }[];
  source?: "programmes" | "meteo" | "bourse" | "depeches" | "annonces";
  /** Absente du défilement CH+/CH− : on n'y arrive qu'en tapant son numéro. */
  cachee?: boolean;
}

/* ------------------------------ Distinctions ------------------------------ */

/**
 * Ce qui décerne une distinction : un signal du système (`nom*` = tout signal qui commence par `nom`),
 * éventuellement répété `fois` fois, l'ouverture d'une appli, toutes les applis du poste, ou toutes les autres distinctions.
 */
export type DistinctionTrigger =
  | { type: "signal"; name: string; fois?: number }
  | { type: "app-open"; app: string }
  | { type: "toutes-applis" }
  | { type: "toutes-distinctions" };

export interface Distinction {
  id: string;
  titre: string;
  /** Motif officiel, lu une fois la distinction obtenue. */
  motif: string;
  /** Ce qu'on lit avant de l'obtenir ; absent pour une distinction secrète (« ??? »). */
  indice?: string;
  metal: "bronze" | "argent" | "or";
  trigger: DistinctionTrigger;
}

/* ---------------------------------- Pack ---------------------------------- */

export interface ContentPack {
  id: string;
  os: { name: string; edition: string; version: string; vendor: string };
  users: UserProfile[];
  apps: AppManifest[];
  desktop: DesktopIcon[];
  /**
   * Fond d'écran « Portrait du Fondateur » (référence d'origine, jamais une copie) et fonds en image proposés dans
   * les Réglages (`image` en 4:3, `vignette` pour la liste).
   */
  wallpaper?: { portrait?: string; images?: { id: string; label: string; image: string; vignette: string }[] };
  /** Écran de bienvenue ouvert à la connexion. */
  welcome: { title: string; intro: string; tips: string[]; links: { label: string; action: ActionRef }[] };
  filesystem: FsNode;
  mails: Mail[];
  mailbox: MailboxSpec;
  /** Personnalités qui répondent en personnage au Courrier d'État. */
  correspondants: Correspondant[];
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
  /** `secretes` : commandes absentes des suggestions (on les trouve en les tapant). */
  run: { prompt: string; aliases: Record<string, { app: string; args?: Record<string, string> } | { action: ActionRef }>; secretes: string[]; notFound: string };
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
  /** Sites de PigNet hors Porkopédia : pages perso de citoyens et annuaire. */
  sites: SitePerso[];
  /** Carte météo stylisée et position des lieux (0–1). */
  carteMeteo: { image: string; lieux: Record<string, [number, number]> };
  rules: EventRule[];
  /** PorkAmp, lecteur de musique : pistes (fichiers de public/audio) et textes de l'afficheur. */
  lecteur: { slogan: string; infos: string; pistes: { titre: string; artiste: string; src: string }[] };
  /** Accessoires : familles et messages du Défragmenteur, palette et tampons de PorkPaint. */
  accessoires: {
    defrag: { familles: string[]; messages: string[]; fin: string };
    paint: { palette: string[]; tampons: { nom: string; motif: string[] }[] };
  };
  /** Télétexte de PorkTV : pages, et barre de liens colorés en bas d'écran. */
  teletexte: { nom: string; pages: TeletextePage[]; fastext: { texte: string; page: number }[]; introuvable: string; recherche: string };
  /** Distinctions civiques (succès) et rangs atteints selon leur nombre (seuils croissants, le premier à 0). */
  distinctions: Distinction[];
  rangs: { seuil: number; titre: string }[];
  /** Messages de l'appli Configuration et du système (réglages absurdes). */
  strings: Record<string, string>;
}
