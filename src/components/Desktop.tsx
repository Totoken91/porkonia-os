"use client";
/**
 * Bureau : icônes sur grille magnétique, déplaçables (seules ou en groupe), sélection au lasso
 * ou au clavier, menus contextuels. La disposition est retenue dans le navigateur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesktopIcon } from "@/content/types";
import { useOs } from "@/os/context";
import { GRID, cellAt, cellPos, defaultLayout, dimsFor, inRect, moveIcons, neighbor, sanitizeLayout, type Layout } from "@/os/desktop";
import { Icon } from "./Icon";
import { ContextMenu, type MenuState } from "./Menu";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  area: { w: number; h: number };
  onLaunch(icon: DesktopIcon, from: Rect): void;
}

const ICONE = { w: 74, h: 66 };

export function Desktop({ area, onLaunch }: Props) {
  const { pack, str, signal, openApp, runAction } = useOs();
  const ids = useMemo(() => pack.desktop.map((d) => d.id), [pack.desktop]);
  const dims = useMemo(() => dimsFor(area.w, area.h), [area.w, area.h]);
  const cle = `porkos.bureau.${pack.id}`;
  const zone = useRef<HTMLDivElement>(null);

  const [layout, setLayout] = useState<Layout>(() => defaultLayout(ids, dims));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ ids: string[]; dx: number; dy: number } | null>(null);
  const [lasso, setLasso] = useState<Rect | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [clignote, setClignote] = useState(false);
  const geste = useRef<{ kind: "icone" | "lasso"; x: number; y: number; ids: string[]; moved: boolean; base: Set<string> } | null>(null);

  useEffect(() => {
    try {
      setLayout(sanitizeLayout(JSON.parse(window.localStorage.getItem(cle) ?? "null"), ids, dims));
    } catch {
      setLayout(sanitizeLayout(null, ids, dims));
    }
  }, [cle, ids, dims]);
  const save = useCallback(
    (l: Layout) => {
      setLayout(l);
      try {
        window.localStorage.setItem(cle, JSON.stringify(l));
      } catch {
        /* disposition non retenue */
      }
    },
    [cle],
  );

  /** Coordonnées logiques (écran 800×600) d'un événement, quelle que soit l'échelle du moniteur. */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = zone.current!.getBoundingClientRect();
    const k = area.w / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const iconRect = (id: string): Rect => {
    const p = cellPos(layout[id] ?? { c: 0, r: 0 });
    return { x: p.x + (GRID.cw - ICONE.w) / 2, y: p.y, w: ICONE.w, h: ICONE.h };
  };
  const launch = (d: DesktopIcon) => onLaunch(d, iconRect(d.id));

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = geste.current;
      if (!g || !zone.current) return;
      const p = local(e);
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      g.moved = true;
      if (g.kind === "icone") setDrag({ ids: g.ids, dx, dy });
      else {
        const rect = { x: g.x, y: g.y, w: dx, h: dy };
        setLasso(rect);
        const hit = inRect(layout, rect, ICONE);
        setSelected(new Set([...(e.ctrlKey ? g.base : []), ...hit]));
      }
    };
    const up = (e: PointerEvent) => {
      const g = geste.current;
      geste.current = null;
      if (!g) return;
      if (g.kind === "icone" && g.moved && zone.current) {
        const p = local(e);
        const lead = g.ids[0]!;
        const from = cellPos(layout[lead]!);
        const target = cellAt(from.x + p.x - g.x, from.y + p.y - g.y, dims);
        save(moveIcons(layout, g.ids, target.c - layout[lead]!.c, target.r - layout[lead]!.r, dims));
      }
      setDrag(null);
      setLasso(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, dims, save]);

  const proprietes = (d: DesktopIcon) =>
    runAction({
      type: "dialog",
      dialog: { title: str("prop.titre", { nom: d.label }), icon: "info", body: str("prop.corps", { nom: d.label }), buttons: [{ label: "OK" }] },
    });

  const actualiser = () => {
    setClignote(true);
    setTimeout(() => setClignote(false), 160);
    signal("bureau:actualiser");
  };

  const menuIcone = (d: DesktopIcon, x: number, y: number) =>
    setMenu({
      x,
      y,
      items: [
        { label: str("ctx.ouvrir"), bold: true, onSelect: () => launch(d) },
        { separator: true },
        { label: str("ctx.couper"), disabled: true },
        { label: str("ctx.copier"), disabled: true },
        { separator: true },
        { label: str("ctx.supprimer"), onSelect: () => signal("bureau:supprimer") },
        { label: str("ctx.renommer"), disabled: true },
        { separator: true },
        { label: str("ctx.proprietes"), onSelect: () => proprietes(d) },
      ],
    });

  const menuBureau = (x: number, y: number) =>
    setMenu({
      x,
      y,
      items: [
        { label: str("ctx.reorganiser"), onSelect: () => save(defaultLayout(ids, dims)) },
        { label: str("ctx.aligner"), onSelect: () => save(sanitizeLayout(layout, ids, dims)) },
        { separator: true },
        { label: str("ctx.actualiser"), onSelect: actualiser },
        { separator: true },
        { label: str("ctx.nouveau"), disabled: true },
        { separator: true },
        { label: str("ctx.bureau.proprietes"), onSelect: () => openApp("config") },
      ],
    });

  const clavier = (e: React.KeyboardEvent) => {
    const courant = focus ?? [...selected][0] ?? ids[0]!;
    const dirs: Record<string, "haut" | "bas" | "gauche" | "droite"> = { ArrowUp: "haut", ArrowDown: "bas", ArrowLeft: "gauche", ArrowRight: "droite" };
    if (dirs[e.key]) {
      e.preventDefault();
      const n = focus || selected.size ? neighbor(layout, courant, dirs[e.key]!) : courant;
      setFocus(n);
      setSelected(new Set([n]));
    } else if (e.key === "Enter") {
      pack.desktop.filter((d) => selected.has(d.id)).forEach(launch);
    } else if (e.key === "Delete" && selected.size) signal("bureau:supprimer");
    else if (e.key === "F5") {
      e.preventDefault();
      actualiser();
    }
  };

  return (
    <div
      ref={zone}
      className="bureau-zone"
      tabIndex={0}
      role="listbox"
      aria-label="Bureau"
      aria-multiselectable="true"
      onKeyDown={clavier}
      onPointerDown={(e) => {
        if (e.button !== 0 || e.target !== e.currentTarget) return;
        const p = local(e);
        if (!e.ctrlKey) setSelected(new Set());
        setFocus(null);
        geste.current = { kind: "lasso", x: p.x, y: p.y, ids: [], moved: false, base: new Set(selected) };
      }}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setSelected(new Set());
        const p = local(e);
        menuBureau(p.x, p.y);
      }}
    >
      {!clignote &&
        pack.desktop.map((d) => {
          const r = iconRect(d.id);
          const sel = selected.has(d.id);
          return (
            <button
              key={d.id}
              className={`desk-icon${focus === d.id ? " focus" : ""}`}
              style={{ left: r.x, top: r.y }}
              role="option"
              aria-selected={sel}
              tabIndex={-1}
              data-testid={`icon-${d.id}`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const p = local(e);
                let next = selected;
                if (e.ctrlKey) {
                  next = new Set(selected);
                  if (next.has(d.id)) next.delete(d.id);
                  else next.add(d.id);
                } else if (!selected.has(d.id)) next = new Set([d.id]);
                setSelected(next);
                setFocus(d.id);
                zone.current?.focus({ preventScroll: true });
                geste.current = { kind: "icone", x: p.x, y: p.y, ids: [d.id, ...[...next].filter((i) => i !== d.id)], moved: false, base: next };
              }}
              onClick={(e) => {
                if ((e.nativeEvent as PointerEvent).pointerType === "touch" && !drag) launch(d);
              }}
              onDoubleClick={() => launch(d)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!selected.has(d.id)) setSelected(new Set([d.id]));
                const p = local(e);
                menuIcone(d, p.x, p.y);
              }}
            >
              <Icon name={d.icon} size={32} selected={sel} />
              <span>{d.label}</span>
            </button>
          );
        })}

      {drag &&
        drag.ids.map((id) => {
          const d = pack.desktop.find((x) => x.id === id)!;
          const r = iconRect(id);
          return (
            <div key={`fantome-${id}`} className="desk-icon fantome" style={{ left: r.x + drag.dx, top: r.y + drag.dy }} aria-hidden="true">
              <Icon name={d.icon} size={32} selected />
              <span>{d.label}</span>
            </div>
          );
        })}

      {lasso && (
        <div
          className="lasso"
          style={{ left: Math.min(lasso.x, lasso.x + lasso.w), top: Math.min(lasso.y, lasso.y + lasso.h), width: Math.abs(lasso.w), height: Math.abs(lasso.h) }}
        />
      )}
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} bounds={area} />}
    </div>
  );
}
