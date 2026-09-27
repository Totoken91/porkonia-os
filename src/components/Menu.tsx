"use client";
/** Menu contextuel d'époque (clic droit), positionné en coordonnées d'écran et gardé dans l'écran. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type MenuItem = { separator: true } | { label: string; bold?: boolean; disabled?: boolean; onSelect?: () => void };

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

export function ContextMenu({ menu, onClose, bounds }: { menu: MenuState; onClose(): void; bounds: { w: number; h: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const t = setTimeout(() => window.addEventListener("pointerdown", down), 0);
    window.addEventListener("keydown", key);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  // Mesure réelle du menu : il s'ouvre vers la gauche ou vers le haut s'il déborderait de l'écran.
  const [pos, setPos] = useState({ x: menu.x, y: menu.y, visible: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({
      x: menu.x + w > bounds.w ? Math.max(0, menu.x - w) : menu.x,
      y: menu.y + h > bounds.h ? Math.max(0, menu.y - h) : menu.y,
      visible: true,
    });
  }, [menu, bounds.w, bounds.h]);
  const { x, y } = pos;

  return (
    <div className="menu-contexte" ref={ref} style={{ left: x, top: y, visibility: pos.visible ? "visible" : "hidden" }} role="menu" data-testid="menu-contexte" onContextMenu={(e) => e.preventDefault()}>
      {menu.items.map((it, i) =>
        "separator" in it ? (
          <hr key={i} />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={it.disabled}
            className={it.bold ? "gras" : undefined}
            onClick={() => {
              onClose();
              it.onSelect?.();
            }}
          >
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}
