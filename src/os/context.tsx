"use client";
/** Contextes partagés : l'OS (pack, réglages, actions) et la fenêtre courante (pour les applis). */
import { createContext, useContext, useEffect, useRef } from "react";
import { choisirEcran, type Ecran } from "./ecran";
import type { ActionRef, ContentPack, UserProfile } from "@/content/types";
import type { Rng } from "./rng";
import type { Son } from "./sons";
import type { Boite, Brouillon, Dossier } from "./mailbox";
import type { MenuItem } from "@/components/Menu";
import type { Settings } from "./settings";
import type { EtatDistinctions } from "./distinctions";
import type { Disque, Resultat } from "./vfs";
import type { Win } from "./windows";

export interface OsApi {
  pack: ContentPack;
  user: UserProfile;
  settings: Settings;
  setSettings(patch: Partial<Settings>): void;
  openApp(appId: string, args?: Record<string, string>): void;
  runAction(action: ActionRef): void;
  signal(name: string): void;
  /** Texte du pack (clé de `strings`), avec remplacement de {variables}. */
  str(key: string, vars?: Record<string, string | number>): string;
  rng: Rng;
  /** Son système (ignoré si les sons sont coupés). */
  playSound(son: Son): void;
  /** Lance l'écran de veille (aperçu). */
  showScreensaver(): void;
  /** Messagerie du poste (état partagé : appli Courrier, zone de notification, règles). */
  mail: MailApi;
  /** Disque du poste : fichiers modifiables, Poubelle d'État, presse-papiers. */
  fs: FsApi;
  /** Distinctions civiques obtenues par le citoyen (appli Mes décorations). */
  distinctions: EtatDistinctions;
  /** Menu contextuel à l'endroit d'un clic (coordonnées du navigateur converties en coordonnées d'écran). */
  showMenu(at: { clientX: number; clientY: number }, items: MenuItem[]): void;
}

export interface MailApi {
  boite: Boite;
  lire(id: string, lu?: boolean): void;
  deplacer(id: string, dossier: Dossier): void;
  envoyer(d: Brouillon, draftId?: string): void;
  brouillon(d: Brouillon, id?: string): string;
  relever(): void;
}

export interface FsApi {
  disque: Disque;
  /** Applique une opération du disque ; un refus s'affiche en boîte d'erreur. Rend les chemins produits, ou null. */
  appliquer(op: (d: Disque) => Resultat): string[] | null;
  /** Dépose des éléments dans un dossier, ou sur la Poubelle d'État (POUBELLE). */
  deposer(chemins: string[], depot: string, copie?: boolean): string[] | null;
  /** Ouvre un élément selon son type (dossier, document, image, raccourci). */
  ouvrir(chemin: string): void;
  pressePapiers: { chemins: string[]; couper: boolean } | null;
  setPressePapiers(p: { chemins: string[]; couper: boolean } | null): void;
}

export type MenuHandlers = Record<string, (arg?: string) => void>;
/** État des entrées de menu (coche, grisé), indexé par `commande` ou `commande:argument`. */
export type MenuState = Record<string, { checked?: boolean; disabled?: boolean }>;

export interface WinApi {
  win: Win;
  focused: boolean;
  /** Branche les commandes de menu de l'appli (voir useMenuCommands). */
  registerMenu(handlers: { current: MenuHandlers }, state: MenuState): void;
  setTitle(title: string): void;
  resize(w: number, h: number): void;
  close(): void;
  /** Réduire dans la barre des tâches (fenêtres habillées, qui dessinent leurs propres boutons). */
  minimize(): void;
}

export const OsContext = createContext<OsApi | null>(null);
export const WinContext = createContext<WinApi | null>(null);

export function useOs(): OsApi {
  const v = useContext(OsContext);
  if (!v) throw new Error("useOs hors de PorkOS");
  return v;
}

export function useWin(): WinApi {
  const v = useContext(WinContext);
  if (!v) throw new Error("useWin hors d'une fenêtre");
  return v;
}

export function makeStr(pack: ContentPack) {
  return (key: string, vars?: Record<string, string | number>) => {
    let s = pack.strings[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

/** Facteur d'échelle de l'écran 4:3 (les déplacements à la souris sont divisés par ce facteur). */
export const ScaleContext = createContext(1);
export const useScale = () => useContext(ScaleContext);

/** Format de l'écran en cours (moniteur 800×600 ou PorkOS Poche à la taille de l'appareil). */
export const EcranContext = createContext<Ecran>(choisirEcran(1366, 800));
export const useEcran = () => useContext(EcranContext);

/**
 * Déclare les commandes de menu d'une appli. Les libellés viennent du pack ; l'appli ne fournit que le comportement
 * et l'état (coché, grisé) de ses commandes.
 */
export function useMenuCommands(handlers: MenuHandlers, state: MenuState = {}) {
  const { registerMenu } = useWin();
  const ref = useRef(handlers);
  ref.current = handlers;
  const key = JSON.stringify(state);
  useEffect(() => registerMenu(ref, JSON.parse(key) as MenuState), [key, registerMenu]);
}
