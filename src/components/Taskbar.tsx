"use client";
/** Barre des tâches, menu PorkOS (avec sous-menus) et zone de notification. */
import { useEffect, useRef, useState } from "react";
import type { AppManifest } from "@/content/types";
import { useOs } from "@/os/context";
import type { Win, WinAction } from "@/os/windows";
import { Icon } from "./Icon";

function Clock() {
  const { str, runAction } = useOs();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      className="heure"
      onDoubleClick={() => {
        const d = new Date();
        runAction({
          type: "dialog",
          dialog: {
            title: str("barre.dateheure.titre"),
            icon: "info",
            body: str("barre.dateheure", { date: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), heure: d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }),
            buttons: [{ label: "OK" }],
          },
        });
      }}
      data-testid="horloge"
      title={now ? now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : undefined}>
      {now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "12:12"}
    </span>
  );
}

interface Props {
  windows: Win[];
  focusedId: string | null;
  onTask(w: Win): void;
  dispatch(a: WinAction): void;
  onLayout(op: "desktop" | "cascade" | "tile"): void;
  /** Activité en cours (chargement) : le témoin réseau s'affole. */
  busy: boolean;
}

type Sub = "programmes" | "accessoires" | null;

export function Taskbar({ windows, focusedId, onTask, dispatch, onLayout, busy }: Props) {
  const { pack, str, openApp, runAction, settings, setSettings, mail, showMenu } = useOs();
  const nonLus = mail.boite.messages.filter((m) => m.folder === "reception" && !m.read).length;
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<Sub>(null);
  const menu = useRef<HTMLDivElement>(null);
  const startBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !startBtn.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => setSub(null), [open]);

  const go = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const group = (g: AppManifest["menu"]) => pack.apps.filter((a) => a.menu === g);
  const config = group("systeme")[0];

  const Flyout = ({ id, apps }: { id: Exclude<Sub, null>; apps: AppManifest[] }) => (
    <li className="menu-parent" onPointerEnter={() => setSub(id)}>
      <button aria-expanded={sub === id} onClick={() => setSub(sub === id ? null : id)} data-testid={`menu-${id}`}>
        <Icon name="dossier" size={32} />
        <span>{str(`menu.${id}`)}</span>
        <i className="fleche" />
      </button>
      {sub === id && (
        <ul className="menu-sous">
          {apps.map((a) => (
            <li key={a.id}>
              <button onClick={go(() => openApp(a.id))} title={a.blurb}>
                <Icon name={a.icon} size={16} />
                <span>{a.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <>
      {open && (
        <div className="menu-porkos" ref={menu} data-testid="programme">
          <div className="menu-bandeau">
            <span>{str("menu.bandeau")}</span>
          </div>
          <ul>
            <Flyout id="programmes" apps={group("programmes")} />
            <Flyout id="accessoires" apps={group("accessoires")} />
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => openApp("fichiers", { path: "Documents officiels" }))}>
                <Icon name="texte" size={32} />
                <span>{str("menu.documents")}</span>
              </button>
            </li>
            {config && (
              <li onPointerEnter={() => setSub(null)}>
                <button onClick={go(() => openApp(config.id))}>
                  <Icon name={config.icon} size={32} />
                  <span>{str("menu.systeme")}</span>
                </button>
              </li>
            )}
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => openApp("executer"))} data-testid="menu-executer">
                <Icon name="executer" size={32} />
                <span>{str("menu.executer")}</span>
              </button>
            </li>
            <li className="separateur" />
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => runAction({ type: "lock" }))}>
                <Icon name="cadenas" size={32} />
                <span>{str("menu.verrouiller")}</span>
              </button>
            </li>
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => runAction({ type: "dialog-ref", id: "arret" }))}>
                <Icon name="embleme" size={32} />
                <span>{str("menu.arreter")}</span>
              </button>
            </li>
          </ul>
        </div>
      )}
      <nav
        className="taskbar"
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          showMenu(e, [
            { label: str("barre.cascade"), onSelect: () => onLayout("cascade") },
            { label: str("barre.mosaique"), onSelect: () => onLayout("tile") },
            { label: str("barre.reduire"), onSelect: () => onLayout("desktop") },
            { separator: true },
            { label: str("barre.proprietes"), onSelect: () => openApp("config") },
          ]);
        }}
      >
        <button ref={startBtn} className="tb-start pk-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} data-testid="start">
          <img src="/brand/embleme-64.png" alt="" width={18} height={18} />
          <b>{str("demarrer")}</b>
        </button>
        <span className="tb-poignee" />
        <div className="tb-rapide">
          <button onClick={() => onLayout("desktop")} title={str("barre.bureau")} aria-label={str("barre.bureau")} data-testid="afficher-bureau">
            <Icon name="bureau" size={16} />
          </button>
          <button onClick={() => openApp("navigateur")} title="PigNet Navigateur" aria-label="PigNet Navigateur">
            <Icon name="navigateur" size={16} />
          </button>
          <button onClick={() => openApp("mail")} title="Courrier d'État" aria-label="Courrier d'État">
            <Icon name="mail" size={16} />
          </button>
        </div>
        <span className="tb-poignee" />
        <div className="tb-tasks">
          {windows.map((w) => {
            const m = pack.apps.find((a) => a.id === w.appId);
            return (
              <button key={w.id} data-task={w.id} className="tb-task pk-btn" aria-pressed={w.id === focusedId && !w.minimized} onClick={() => onTask(w)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  showMenu(e, [
                    { label: str("barre.restaurer"), disabled: !w.minimized && !w.maximized, onSelect: () => (w.minimized ? dispatch({ type: "focus", id: w.id }) : dispatch({ type: "toggleMaximize", id: w.id })) },
                    { label: str("barre.reduire1"), disabled: w.minimized, onSelect: () => dispatch({ type: "minimize", id: w.id }) },
                    { label: str("barre.agrandir"), disabled: w.maximized && !w.minimized, onSelect: () => (w.maximized ? dispatch({ type: "focus", id: w.id }) : (dispatch({ type: "focus", id: w.id }), dispatch({ type: "toggleMaximize", id: w.id }))) },
                    { separator: true },
                    { label: str("barre.fermer"), bold: true, onSelect: () => dispatch({ type: "close", id: w.id }) },
                  ]);
                }}
                title={w.title}>
                {m && <Icon name={m.icon} size={16} />}
                <span>{w.title}</span>
              </button>
            );
          })}
        </div>
        <div className="tb-tray">
          {nonLus > 0 && (
            <button className="tb-son tb-courrier" onClick={() => openApp("mail")} title={str("courrier.nonlus", { n: nonLus })} aria-label={str("courrier.nonlus", { n: nonLus })} data-testid="tray-courrier">
              <Icon name="mail" size={16} />
            </button>
          )}
          <button className="tb-son" onClick={() => setSettings({ sons: !settings.sons })} title={str("barre.sons")} aria-pressed={settings.sons} aria-label={str("config.sons")}>
            <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
              <path d="M2 6h3l4-3v10l-4-3H2z" fill="#e8e0cc" stroke="#000" />
              {settings.sons ? <path d="M11 5c1 1 1 5 0 6M13 3c2 2 2 8 0 10" fill="none" stroke="#000" /> : <path d="M11 5l4 6M15 5l-4 6" stroke="#b3121b" strokeWidth="1.5" />}
            </svg>
          </button>
          <span className={`tb-reseau${busy ? " actif" : ""}`} title={str("barre.reseau")} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
              <rect x="1" y="2" width="8" height="6" fill="#e8e0cc" stroke="#000" />
              <rect x="2.5" y="3.5" width="5" height="3" className="lampe a" />
              <rect x="7" y="8" width="8" height="6" fill="#e8e0cc" stroke="#000" />
              <rect x="8.5" y="9.5" width="5" height="3" className="lampe b" />
              <path d="M5 8v3h2" fill="none" stroke="#000" />
            </svg>
          </span>
          <span title="Douzi Ambrée : niveau de mousse conforme">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 5h8v9H3z" fill="#e0a526" stroke="#2a2118" />
              <path d="M11 7h2v4h-2" fill="none" stroke="#2a2118" />
              <path d="M2.5 5c0-2 2-2.5 3-1.5 1-1.5 3.5-1 3.5.5 1-.5 2.5 0 2 1z" fill="#fff" stroke="#2a2118" strokeWidth=".8" />
            </svg>
          </span>
          <Clock />
        </div>
      </nav>
    </>
  );
}
