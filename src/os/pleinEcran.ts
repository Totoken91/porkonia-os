"use client";
/**
 * Plein écran de PorkOS : la page entière (moniteur ou Poche) passe en plein écran du navigateur ; l'échelle du
 * moniteur suit d'elle-même le redimensionnement. Préfixes WebKit pris en charge ; là où l'API manque (iPhone),
 * `disponible` vaut faux et les commandes ne s'affichent pas.
 */
import { useCallback, useEffect, useState } from "react";

type DocWebkit = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => Promise<void> };
type ElWebkit = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function pleinEcranActif(doc: Document = document): boolean {
  const d = doc as DocWebkit;
  return Boolean(d.fullscreenElement ?? d.webkitFullscreenElement);
}

export function pleinEcranDisponible(doc: Document = document): boolean {
  const d = doc as DocWebkit;
  return Boolean(d.fullscreenEnabled ?? d.webkitFullscreenEnabled);
}

export async function basculerPleinEcran(doc: Document = document): Promise<void> {
  const d = doc as DocWebkit;
  try {
    if (pleinEcranActif(doc)) await (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d);
    else {
      const el = doc.documentElement as ElWebkit;
      await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
  } catch {
    // Refus du navigateur (geste requis, politique de la page) : on reste tel quel.
  }
}

/** État du plein écran, tenu à jour (touche Échap, F11 du navigateur…). */
export function usePleinEcran(): { actif: boolean; disponible: boolean; basculer(): void } {
  const [actif, setActif] = useState(false);
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    setDisponible(pleinEcranDisponible());
    const maj = () => setActif(pleinEcranActif());
    maj();
    document.addEventListener("fullscreenchange", maj);
    document.addEventListener("webkitfullscreenchange", maj);
    return () => {
      document.removeEventListener("fullscreenchange", maj);
      document.removeEventListener("webkitfullscreenchange", maj);
    };
  }, []);
  const basculer = useCallback(() => void basculerPleinEcran(), []);
  return { actif, disponible, basculer };
}
