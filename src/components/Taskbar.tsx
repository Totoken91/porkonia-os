"use client";
/** Bandeau d'information, barre des tâches (« canaux ») et menu « Au programme ». */
import { useEffect, useRef, useState } from "react";
import { useOs } from "@/os/context";
import type { Win } from "@/os/windows";
import { Icon } from "./Icon";

export function Ticker() {
  const { pack, str } = useOs();
  const text = pack.ticker.join("   ■   ");
  return (
    <div className="ticker" aria-label="Bandeau d'information">
      <span className="flash">{str("bandeau.flash")}</span>
      <div className="rail">
        <div style={{ animationDuration: `${Math.round(text.length / 7)}s` }}>{text}</div>
      </div>
    </div>
  );
}

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

export function Taskbar({ windows, focusedId, onTask }: Props) {
  const { pack, str, openApp, runAction } = useOs();
  const [open, setOpen] = useState(false);
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

  const listed = pack.apps.filter((a) => a.slot);

  return (
    <>
      {open && (
        <div className="programme" ref={menu} data-testid="programme">
          <header>
            <small>{str("menu.soustitre")}</small>
            <b>{str("menu.titre")}</b>
          </header>
          <ul>
            {listed.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => {
                    setOpen(false);
                    openApp(a.id);
                  }}
                >
                  <span className="horaire">{a.slot}</span>
                  <Icon name={a.icon} size={30} />
                  <span className="nom">
                    {a.title}
                    {a.blurb && <span className="blurb">{a.blurb}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <footer>
            <button className="pk-btn" onClick={() => { setOpen(false); runAction({ type: "lock" }); }}>
              {str("menu.verrouiller")}
            </button>
            <button className="pk-btn" onClick={() => { setOpen(false); runAction({ type: "dialog-ref", id: "arret" }); }}>
              {str("menu.arreter")}
            </button>
          </footer>
        </div>
      )}
      <nav className="taskbar">
        <button ref={startBtn} className="tb-start" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)} data-testid="start">
          <img src="/brand/embleme-64.png" alt="" width={26} height={26} />
          {pack.os.name}
        </button>
        <div className="tb-tasks">
          {windows.map((w, i) => (
            <button key={w.id} className="tb-task" aria-pressed={w.id === focusedId && !w.minimized} onClick={() => onTask(w)} title={w.title}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <span>{w.title}</span>
            </button>
          ))}
        </div>
        <div className="tb-tray">
          <span className="direct">
            <i />
            {str("barre.direct")}
          </span>
          <Clock />
        </div>
      </nav>
    </>
  );
}
