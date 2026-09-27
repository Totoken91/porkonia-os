"use client";
/**
 * Commutateur de tâches : Alt+² (Alt+` sur clavier QWERTY) fait défiler les fenêtres ouvertes, Maj pour
 * revenir en arrière, relâcher Alt bascule, Échap renonce. Alt+Tab appartient au vrai ordinateur :
 * le navigateur ne le laisse jamais passer.
 */
import { useEffect, useRef, useState } from "react";
import type { AppManifest } from "@/content/types";
import { useOs } from "@/os/context";
import { ordreRecents, type Win } from "@/os/windows";
import { Icon } from "./Icon";

interface Props {
  windows: Win[];
  focusedId: string | null;
  apps: AppManifest[];
  onChoisir(id: string): void;
}

export function Commutateur({ windows, focusedId, apps, onChoisir }: Props) {
  const { str } = useOs();
  const [etat, setEtat] = useState<{ ordre: string[]; i: number } | null>(null);
  const courant = useRef({ etat, windows, focusedId, onChoisir });
  courant.current = { etat, windows, focusedId, onChoisir };

  useEffect(() => {
    const bas = (e: KeyboardEvent) => {
      const c = courant.current;
      if (e.altKey && e.code === "Backquote") {
        e.preventDefault();
        e.stopPropagation();
        if (!c.etat) {
          const ordre = ordreRecents(c.windows, c.focusedId);
          if (ordre.length) setEtat({ ordre, i: ordre.length > 1 ? 1 : 0 });
        } else {
          const n = c.etat.ordre.length;
          setEtat({ ...c.etat, i: (c.etat.i + (e.shiftKey ? -1 : 1) + n) % n });
        }
      } else if (c.etat && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setEtat(null);
      }
    };
    const haut = (e: KeyboardEvent) => {
      const c = courant.current;
      if (e.key !== "Alt" || !c.etat) return;
      // Sinon certains navigateurs ouvriraient leur propre barre de menus.
      e.preventDefault();
      const id = c.etat.ordre[c.etat.i];
      setEtat(null);
      if (id && c.windows.some((w) => w.id === id)) c.onChoisir(id);
    };
    window.addEventListener("keydown", bas, true);
    window.addEventListener("keyup", haut, true);
    return () => {
      window.removeEventListener("keydown", bas, true);
      window.removeEventListener("keyup", haut, true);
    };
  }, []);

  if (!etat) return null;
  const fenetres = etat.ordre.map((id) => windows.find((w) => w.id === id)).filter((w): w is Win => !!w);
  const choisie = fenetres[etat.i];
  return (
    <div className="commutateur-couche" data-testid="commutateur">
      <div className="pk-window focused commutateur" role="listbox" aria-label={str("commutateur.titre")}>
        <div className="commutateur-icones">
          {fenetres.map((w, i) => (
            <span
              key={w.id}
              role="option"
              aria-selected={i === etat.i}
              className={i === etat.i ? "choisie" : undefined}
              onPointerDown={() => {
                setEtat(null);
                onChoisir(w.id);
              }}
            >
              <Icon name={apps.find((a) => a.id === w.appId)?.icon ?? "dossier"} size={32} />
            </span>
          ))}
        </div>
        <div className="commutateur-titre pk-sunken" data-testid="commutateur-titre">
          {choisie?.title}
        </div>
      </div>
    </div>
  );
}
