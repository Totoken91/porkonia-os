"use client";
/**
 * Lanceur du PorkOS Poche : à la place du bureau, une grille d'icônes taillée pour le doigt. Raccourcis du système,
 * fichiers posés sur le Bureau, puis programmes et accessoires du menu. Un appui suffit à ouvrir.
 */
import { useMemo } from "react";
import type { DesktopIcon, FsNode } from "@/content/types";
import { useOs } from "@/os/context";
import { childPath } from "@/os/fs";
import { BUREAU, raccourcisVers } from "@/os/vfs";
import { Icon } from "./Icon";
import { iconOf } from "./Fichier";
import type { Rect } from "./Desktop";

const NULLE_PART: Rect = { x: 0, y: 0, w: 0, h: 0 };

export function Lanceur({ onLaunch }: { onLaunch(icon: DesktopIcon, from: Rect): void }) {
  const { pack, str, openApp, fs, settings } = useOs();
  const bureau = fs.disque.racine.children.find((c) => c.name === BUREAU && c.type === "dossier") as Extract<FsNode, { type: "dossier" }> | undefined;
  const fichiers = (bureau?.children ?? []).filter((n) => settings.fichiersCaches || !n.cache);
  // Les programmes déjà présents en raccourci ne sont pas répétés plus bas.
  const surBureau = useMemo(() => new Set(pack.desktop.flatMap((d) => ("app" in d.open ? [d.open.app] : []))), [pack.desktop]);
  const groupe = (g: "programmes" | "accessoires") => pack.apps.filter((a) => a.menu === g && !surBureau.has(a.id) && (!a.installable || raccourcisVers(fs.disque, a.id).length > 0));

  return (
    <div className="lanceur" data-testid="bureau">
      <section>
        <h3>{str("poche.bureau")}</h3>
        <div className="lanceur-grille">
          {pack.desktop.map((d) => (
            <button key={d.id} className="tuile" onClick={() => onLaunch(d, NULLE_PART)} data-testid={`icon-${d.id}`}>
              <Icon name={d.icon} size={32} />
              <span>{d.label}</span>
            </button>
          ))}
          {fichiers.map((n) => (
            <button key={n.name} className="tuile" onClick={() => fs.ouvrir(childPath(BUREAU, n.name))} data-testid={`icon-f:${n.name}`}>
              <Icon name={iconOf(n, pack.apps)} size={32} />
              <span>{n.name}</span>
            </button>
          ))}
        </div>
      </section>
      {(["programmes", "accessoires"] as const).map((g) =>
        groupe(g).length ? (
          <section key={g}>
            <h3>{str(`poche.${g}`)}</h3>
            <div className="lanceur-grille">
              {groupe(g).map((a) => (
                <button key={a.id} className="tuile" onClick={() => openApp(a.id)} title={a.blurb} data-testid={`lance-${a.id}`}>
                  <Icon name={a.icon} size={32} />
                  <span>{a.title}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </div>
  );
}
