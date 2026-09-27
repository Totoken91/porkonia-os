"use client";
/** Pièces communes à l'explorateur et au bureau : icône d'un élément du disque, champ de renommage. */
import { useEffect, useRef } from "react";
import type { FsNode, IconKey } from "@/content/types";

/** Icône d'un élément ; un raccourci prend celle de l'appli qu'il ouvre (`applis` : manifestes du pack). */
export const iconOf = (n: FsNode, applis: { id: string; icon: IconKey }[] = []): IconKey =>
  n.type === "dossier" ? (n.locked ? "cadenas" : "dossier") : n.type === "texte" ? "texte" : n.type === "image" ? "image" : (applis.find((a) => a.id === n.app)?.icon ?? "navigateur");

/** Champ de renommage : Entrée valide, Échap annule, quitter le champ valide. */
export function Renommage({ nom, onFin }: { nom: string; onFin(nouveau: string | null): void }) {
  const champ = useRef<HTMLInputElement>(null);
  const fini = useRef(false);
  useEffect(() => {
    const el = champ.current;
    if (!el) return;
    el.focus();
    const point = nom.lastIndexOf(".");
    el.setSelectionRange(0, point > 0 ? point : nom.length);
  }, [nom]);
  const finir = (v: string | null) => {
    if (fini.current) return;
    fini.current = true;
    onFin(v);
  };
  return (
    <input
      ref={champ}
      className="renommage"
      defaultValue={nom}
      aria-label="Nouveau nom"
      data-testid="renommage"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finir(e.currentTarget.value);
        else if (e.key === "Escape") finir(null);
      }}
      onBlur={(e) => finir(e.currentTarget.value)}
    />
  );
}

