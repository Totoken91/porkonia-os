"use client";
/** Barre de menus d'une fenêtre : menus déroulants, lettres d'accès soulignées, navigation au clavier. */
import { useEffect, useRef, useState } from "react";
import type { MenuEntry, MenuSpec } from "@/content/types";
import { accel } from "@/os/menus";

type Entree = Extract<MenuEntry, { label: string }>;

interface Props {
  menus: MenuSpec[];
  open: number | null;
  setOpen(i: number | null): void;
  run(item: Entree): void;
  enabled(item: Entree): boolean;
  checked(item: Entree): boolean;
}

function Libelle({ label }: { label: string }) {
  const a = accel(label);
  return (
    <>
      {a.avant}
      {a.lettre && <u>{a.lettre}</u>}
      {a.apres}
    </>
  );
}

export function MenuBar({ menus, open, setOpen, run, enabled, checked }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState(-1);

  useEffect(() => setHot(-1), [open]);
  useEffect(() => {
    if (open === null) return;
    const down = (e: PointerEvent) => !bar.current?.contains(e.target as Node) && setOpen(null);
    const key = (e: KeyboardEvent) => {
      const items = menus[open]!.items;
      const actives = items.map((it, i) => (!("separator" in it) && enabled(it) ? i : -1)).filter((i) => i >= 0);
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowLeft") setOpen((open - 1 + menus.length) % menus.length);
      else if (e.key === "ArrowRight") setOpen((open + 1) % menus.length);
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const pos = actives.indexOf(hot);
        const next = e.key === "ArrowDown" ? actives[(pos + 1) % actives.length] : actives[(pos - 1 + actives.length) % actives.length];
        setHot(next ?? -1);
      } else if (e.key === "Enter" && hot >= 0) {
        const it = items[hot]!;
        if (!("separator" in it)) {
          setOpen(null);
          run(it);
        }
      } else {
        // lettre d'accès d'une entrée
        const i = items.findIndex((it) => !("separator" in it) && enabled(it) && accel(it.label).cle === e.key.toLowerCase());
        if (i < 0) return;
        const it = items[i] as Entree;
        setOpen(null);
        run(it);
      }
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key, true);
    };
  }, [open, hot, menus, enabled, run, setOpen]);

  return (
    <div className="pk-menubar" ref={bar} role="menubar">
      {menus.map((m, i) => (
        <div key={m.label} className="menu-titre">
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === i}
            data-testid={`menubar-${accel(m.label).cle ?? i}`}
            onPointerDown={(e) => {
              e.preventDefault();
              setOpen(open === i ? null : i);
            }}
            onPointerEnter={() => open !== null && open !== i && setOpen(i)}
          >
            <Libelle label={m.label} />
          </button>
          {open === i && (
            <div className="menu-deroulant" role="menu">
              {m.items.map((it, j) =>
                "separator" in it ? (
                  <hr key={j} />
                ) : (
                  <button
                    key={j}
                    role={it.radio ? "menuitemradio" : "menuitem"}
                    disabled={!enabled(it)}
                    className={j === hot ? "chaud" : undefined}
                    aria-checked={checked(it)}
                    onPointerEnter={() => setHot(j)}
                    onClick={() => {
                      setOpen(null);
                      run(it);
                    }}
                  >
                    <span className="coche">{checked(it) ? (it.radio ? <i className="puce" /> : <i className="v" />) : null}</span>
                    <span className="libelle">
                      <Libelle label={it.label} />
                    </span>
                    <span className="raccourci">{it.shortcut}</span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
