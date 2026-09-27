"use client";
/** Contextes partagés : l'OS (pack, réglages, actions) et la fenêtre courante (pour les applis). */
import { createContext, useContext } from "react";
import type { ActionRef, ContentPack, UserProfile } from "@/content/types";
import type { Rng } from "./rng";
import type { Son } from "./sons";
import type { Settings } from "./settings";
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
}

export interface WinApi {
  win: Win;
  focused: boolean;
  setTitle(title: string): void;
  resize(w: number, h: number): void;
  close(): void;
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
