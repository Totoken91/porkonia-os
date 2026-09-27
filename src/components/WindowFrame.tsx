"use client";
/** Fenêtre : châssis de l'atelier, déplaçable par la barre de titre, redimensionnable par le coin. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AppManifest, MenuEntry } from "@/content/types";
import { WinContext, useOs, useScale, type MenuHandlers, type MenuState, type WinApi } from "@/os/context";
import { findShortcut, isPlainShortcut, menuForKey } from "@/os/menus";
import { MenuBar } from "./MenuBar";
import type { Viewport, Win, WinAction } from "@/os/windows";
import { Icon } from "./Icon";

interface Props {
  win: Win;
  manifest: AppManifest;
  focused: boolean;
  vp: Viewport;
  dispatch(a: WinAction): void;
  /** Déplacement « par le contour » (réglage d'époque) : seule une silhouette suit la souris. */
  outline?: boolean;
  /** Le programme « ne répond pas » : fenêtre voilée, titre suffixé, clic = boîte de dialogue. */
  frozen?: boolean;
  onFrozenClick?(): void;
  children: React.ReactNode;
}

export function WindowFrame({ win, manifest, focused, vp, dispatch, outline, frozen, onFrozenClick, children }: Props) {
  const scale = useScale();
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const final = useRef<WinAction | null>(null);
  const { runAction, str, pack, showMenu } = useOs();
  const menuSysteme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    showMenu({ clientX: r.left, clientY: r.bottom }, [
      { label: str("barre.restaurer"), disabled: !win.maximized, onSelect: () => dispatch({ type: "toggleMaximize", id: win.id }) },
      { label: str("barre.deplacer"), disabled: true },
      { label: str("barre.taille"), disabled: true },
      { label: str("barre.reduire1"), onSelect: () => dispatch({ type: "minimize", id: win.id }) },
      { label: str("barre.agrandir"), disabled: win.maximized, onSelect: () => dispatch({ type: "toggleMaximize", id: win.id }) },
      { separator: true },
      { label: str("barre.fermer"), bold: true, onSelect: () => dispatch({ type: "close", id: win.id }) },
    ]);
  };

  /* ------------------------------ Barre de menus ------------------------------ */
  const handlers = useRef<{ current: MenuHandlers }>({ current: {} });
  const [menuState, setMenuState] = useState<MenuState>({});
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const registerMenu = useCallback((h: { current: MenuHandlers }, st: MenuState) => {
    handlers.current = h;
    setMenuState(st);
  }, []);
  const builtin: MenuHandlers = {
    "fenetre.fermer": () => dispatch({ type: "close", id: win.id }),
    "fenetre.reduire": () => dispatch({ type: "minimize", id: win.id }),
    "fenetre.agrandir": () => dispatch({ type: "toggleMaximize", id: win.id }),
    "aide.apropos": () =>
      runAction({
        type: "dialog",
        dialog: {
          title: str("apropos.titre", { app: manifest.title }),
          icon: "sceau",
          body: str("apropos.corps", { texte: manifest.about ?? manifest.title, os: pack.os.name, version: pack.os.version, edition: pack.os.edition, vendor: pack.os.vendor }),
          buttons: [{ label: "OK" }],
        },
      }),
  };
  type Entree = Extract<MenuEntry, { label: string }>;
  const cle = (it: Entree) => (it.arg ? `${it.command}:${it.arg}` : (it.command ?? ""));
  const enabled = (it: Entree) => {
    if (it.disabled || menuState[cle(it)]?.disabled || (it.command && menuState[it.command]?.disabled)) return false;
    if (it.action) return true;
    return !!it.command && !!(builtin[it.command] ?? handlers.current.current[it.command]);
  };
  const checked = (it: Entree) => !!menuState[cle(it)]?.checked;
  const run = (it: Entree) => {
    if (!enabled(it)) return;
    if (it.action) return runAction(it.action);
    if (it.command) (builtin[it.command] ?? handlers.current.current[it.command])?.(it.arg);
  };
  const runRef = useRef({ run, enabled });
  runRef.current = { run, enabled };

  // Raccourcis clavier et Alt+lettre, pour la fenêtre au premier plan seulement.
  useEffect(() => {
    const menus = manifest.menus;
    if (!focused || !menus || win.minimized) return;
    const key = (e: KeyboardEvent) => {
      if (menuOpen !== null || document.querySelector(".dialog-layer")) return;
      if (e.altKey && !e.ctrlKey && e.key.length === 1) {
        const i = menuForKey(menus, e.key);
        if (i >= 0) {
          e.preventDefault();
          setMenuOpen(i);
        }
        return;
      }
      const it = findShortcut(menus, e);
      if (!it || !runRef.current.enabled(it)) return;
      const t = e.target as HTMLElement | null;
      if (isPlainShortcut(it.shortcut!) && t?.closest?.("input, textarea, select")) return;
      e.preventDefault();
      runRef.current.run(it);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [focused, manifest.menus, menuOpen, win.minimized]);
  const drag = useRef<{ kind: "move" | "resize"; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const api = useMemo<WinApi>(
    () => ({
      win,
      focused,
      setTitle: (title) => dispatch({ type: "retitle", id: win.id, title }),
      resize: (w, h) => dispatch({ type: "resize", id: win.id, w, h, vp }),
      close: () => dispatch({ type: "close", id: win.id }),
      registerMenu,
    }),
    [win, focused, dispatch, vp, registerMenu],
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
    const action: WinAction = d.kind === "move" ? { type: "move", id: win.id, x, y, vp } : { type: "resize", id: win.id, w: x, h: y, vp };
    if (!outline) return dispatch(action);
    final.current = action;
    setGhost(d.kind === "move" ? { ...win.rect, x, y } : { ...win.rect, w: Math.max(240, x), h: Math.max(140, y) });
  };
  const end = () => {
    drag.current = null;
    if (final.current) dispatch(final.current);
    final.current = null;
    setGhost(null);
  };

  if (manifest.habillage) {
    // Fenêtre habillée : l'appli dessine son boîtier ; on la déplace en l'attrapant par une zone [data-poignee].
    return (
      <>
        <section
          className={`pk-window habille habille-${manifest.habillage}${focused ? " focused" : ""}`}
          style={{ left: win.rect.x, top: win.rect.y, width: win.rect.w, height: win.rect.h, zIndex: win.z, display: win.minimized ? "none" : undefined }}
          onPointerDownCapture={() => !focused && dispatch({ type: "focus", id: win.id })}
          onPointerDown={(e) => {
            const t = e.target as HTMLElement;
            if (t.closest("[data-poignee]") && !t.closest("button, canvas")) start("move")(e);
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label={win.title}
          data-testid={`window-${win.appId}`}
          data-win={win.id}
        >
          <WinContext.Provider value={api}>{children}</WinContext.Provider>
          {frozen && (
            <div
              className="gel"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFrozenClick?.();
              }}
              data-testid="fenetre-gelee"
            />
          )}
        </section>
        {ghost && <div className="contour-fenetre" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, zIndex: win.z + 1 }} aria-hidden="true" />}
      </>
    );
  }

  return (
    <>
    <section
      className={`pk-window${focused ? " focused" : ""}${win.maximized ? " maximized" : ""}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z, display: win.minimized ? "none" : undefined }}
      onPointerDownCapture={() => !focused && dispatch({ type: "focus", id: win.id })}
      aria-label={win.title}
      data-testid={`window-${win.appId}`}
      data-win={win.id}
    >
      <header className="pk-titlebar" onPointerDown={start("move")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onDoubleClick={() => dispatch({ type: "toggleMaximize", id: win.id })}>
        <button
          className="icone-systeme"
          aria-label={str("barre.fermer")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={menuSysteme}
          onDoubleClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "close", id: win.id });
          }}
          data-testid="menu-systeme"
        >
          <Icon name={manifest.icon} size={16} />
        </button>
        <h2>
          {win.title}
          {frozen && str("gel.suffixe")}
        </h2>
        <div className="pk-controls">
          <button className="pk-ctl" aria-label="Réduire" onClick={() => dispatch({ type: "minimize", id: win.id })}>
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 7h6" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
          <button className="pk-ctl" aria-label={win.maximized ? "Restaurer" : "Agrandir"} onClick={() => dispatch({ type: "toggleMaximize", id: win.id })}>
            {win.maximized ? (
              <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><path d="M2.5.5h6v5M2.5 1.5h6" fill="none" stroke="currentColor" /><rect x="0.5" y="3.5" width="5" height="5" fill="none" stroke="currentColor" /><path d="M0 4.5h6" stroke="currentColor" /></svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true"><rect x="0.5" y="0.5" width="8" height="8" fill="none" stroke="currentColor" /><path d="M0 1.5h9" stroke="currentColor" strokeWidth="2" /></svg>
            )}
          </button>
          <button className="pk-ctl close" aria-label="Fermer" onClick={() => dispatch({ type: "close", id: win.id })} data-testid="window-close">
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.8" /></svg>
          </button>
        </div>
      </header>
      {manifest.menus && <MenuBar menus={manifest.menus} open={menuOpen} setOpen={setMenuOpen} run={run} enabled={enabled} checked={checked} />}
      <WinContext.Provider value={api}>{children}</WinContext.Provider>
      {frozen && (
        <div
          className="gel"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFrozenClick?.();
          }}
          data-testid="fenetre-gelee"
        />
      )}
      {!win.maximized && <div className="pk-resize" onPointerDown={start("resize")} onPointerMove={move} onPointerUp={end} onPointerCancel={end} />}
    </section>
    {ghost && <div className="contour-fenetre" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h, zIndex: win.z + 1 }} aria-hidden="true" />}
    </>
  );
}
