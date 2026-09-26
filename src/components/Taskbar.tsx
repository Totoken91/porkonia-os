"use client";
/** Barre des tâches, menu PorkOS (avec sous-menus) et zone de notification. */
import { useEffect, useRef, useState } from "react";
import type { AppManifest } from "@/content/types";
import { useOs } from "@/os/context";
import type { Win } from "@/os/windows";
import { Icon } from "./Icon";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);
  return <span className="heure">{now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "12:12"}</span>;
}

interface Props {
  windows: Win[];
  focusedId: string | null;
  onTask(w: Win): void;
}

type Sub = "programmes" | "accessoires" | null;

export function Taskbar({ windows, focusedId, onTask }: Props) {
  const { pack, str, openApp, runAction } = useOs();
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
        <Icon name="dossier" size={24} />
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
                <Icon name="texte" size={24} />
                <span>{str("menu.documents")}</span>
              </button>
            </li>
            {config && (
              <li onPointerEnter={() => setSub(null)}>
                <button onClick={go(() => openApp(config.id))}>
                  <Icon name={config.icon} size={24} />
                  <span>{str("menu.systeme")}</span>
                </button>
              </li>
            )}
            <li className="separateur" />
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => runAction({ type: "lock" }))}>
                <Icon name="cadenas" size={24} />
                <span>{str("menu.verrouiller")}</span>
              </button>
            </li>
            <li onPointerEnter={() => setSub(null)}>
              <button onClick={go(() => runAction({ type: "dialog-ref", id: "arret" }))}>
                <Icon name="embleme" size={24} />
                <span>{str("menu.arreter")}</span>
              </button>
            </li>
          </ul>
        </div>
      )}
      <nav className="taskbar">
        <button ref={startBtn} className="tb-start pk-btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} data-testid="start">
          <img src="/brand/embleme-64.png" alt="" width={18} height={18} />
          <b>{str("demarrer")}</b>
        </button>
        <span className="tb-poignee" />
        <div className="tb-tasks">
          {windows.map((w) => {
            const m = pack.apps.find((a) => a.id === w.appId);
            return (
              <button key={w.id} className="tb-task pk-btn" aria-pressed={w.id === focusedId && !w.minimized} onClick={() => onTask(w)} title={w.title}>
                {m && <Icon name={m.icon} size={16} />}
                <span>{w.title}</span>
              </button>
            );
          })}
        </div>
        <div className="tb-tray">
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
