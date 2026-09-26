"use client";
/** Fenêtre : châssis de l'atelier, déplaçable par la barre de titre, redimensionnable par le coin. */
import { useMemo, useRef } from "react";
import type { AppManifest } from "@/content/types";
import { WinContext, useScale, type WinApi } from "@/os/context";
import type { Viewport, Win, WinAction } from "@/os/windows";
import { Icon } from "./Icon";

interface Props {
  win: Win;
  manifest: AppManifest;
  focused: boolean;
  vp: Viewport;
  dispatch(a: WinAction): void;
  children: React.ReactNode;
}

export function WindowFrame({ win, manifest, focused, vp, dispatch, children }: Props) {
  const scale = useScale();
  const drag = useRef<{ kind: "move" | "resize"; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const api = useMemo<WinApi>(
    () => ({
      win,
      focused,
      setTitle: (title) => dispatch({ type: "retitle", id: win.id, title }),
      resize: (w, h) => dispatch({ type: "resize", id: win.id, w, h, vp }),
      close: () => dispatch({ type: "close", id: win.id }),
    }),
    [win, focused, dispatch, vp],
  );

  const rect = win.maximized ? { x: 0, y: 0, w: vp.w, h: vp.h - vp.bottom } : win.rect;

  const start = (kind: "move" | "resize") => (e: React.PointerEvent) => {
    if (e.button !== 0 || (kind === "move" && win.maximized)) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind, sx: e.clientX, sy: e.clientY, ox: kind === "move" ? win.rect.x : win.rect.w, oy: kind === "move" ? win.rect.y : win.rect.h };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const x = d.ox + Math.round((e.clientX - d.sx) / scale);
    const y = d.oy + Math.round((e.clientY - d.sy) / scale);
    dispatch(d.kind === "move" ? { type: "move", id: win.id, x, y, vp } : { type: "resize", id: win.id, w: x, h: y, vp });
  };
  const end = () => (drag.current = null);

  return (
    <section
      className={`pk-window${focused ? " focused" : ""}${win.maximized ? " maximized" : ""}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z, display: win.minimized ? "none" : undefined }}
      onPointerDownCapture={() => !focused && dispatch({ type: "focus", id: win.id })}
      aria-label={win.title}
      data-testid={`window-${win.appId}`}
    >
      <header className="pk-titlebar" onPointerDown={start("move")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onDoubleClick={() => dispatch({ type: "toggleMaximize", id: win.id })}>
        <Icon name={manifest.icon} size={16} />
        <h2>{win.title}</h2>
        <div className="pk-controls">
          <button className="pk-ctl" aria-label="Réduire" onClick={() => dispatch({ type: "minimize", id: win.id })}>
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 7h6" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
          <button className="pk-ctl" aria-label={win.maximized ? "Restaurer" : "Agrandir"} onClick={() => dispatch({ type: "toggleMaximize", id: win.id })}>
            <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="currentColor" /><path d="M0 1.5h9" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
          <button className="pk-ctl close" aria-label="Fermer" onClick={() => dispatch({ type: "close", id: win.id })} data-testid="window-close">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
          </button>
        </div>
      </header>
      <WinContext.Provider value={api}>{children}</WinContext.Provider>
      {!win.maximized && <div className="pk-resize" onPointerDown={start("resize")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />}
    </section>
  );
}
