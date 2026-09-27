"use client";
/**
 * Session ouverte : bureau, fenêtres, barre des tâches et moteur d'événements.
 * Les événements (pop-ups, pubs, mises à jour) viennent des règles du pack via l'ordonnanceur pur.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ActionRef, Ad, ContentPack, DesktopIcon, DialogSpec, ForcedUpdate, UserProfile } from "@/content/types";
import { APPS } from "@/apps/registry";
import { OsContext, makeStr, type OsApi } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import { emptyRuleState, schedule, type SchedulerInput } from "@/os/scheduler";
import { DEFAULT_SETTINGS, type Settings } from "@/os/settings";
import { jouer, type Son } from "@/os/sons";
import { emptyWinState, winReducer, type Viewport, type WinAction } from "@/os/windows";
import { Desktop, type Rect } from "./Desktop";
import { Economiseur } from "./Economiseur";
import { SCREEN } from "./Monitor";
import { AdBox, DialogBox, Toasts, UpdateScreen, type LiveToast } from "./Overlays";
import { Taskbar } from "./Taskbar";
import { Wallpaper } from "./Wallpaper";
import { WindowFrame } from "./WindowFrame";

type Input = SchedulerInput extends infer T ? (T extends unknown ? Omit<T, "elapsed"> : never) : never;

const TASKBAR = 28;
const VP: Viewport = { w: SCREEN.w, h: SCREEN.h, bottom: TASKBAR };
const AREA = { w: SCREEN.w, h: SCREEN.h - TASKBAR };
const START: Rect = { x: 2, y: SCREEN.h - TASKBAR + 3, w: 70, h: 22 };

interface Zoom {
  key: number;
  from: Rect;
  to: Rect;
}

interface Props {
  pack: ContentPack;
  user: UserProfile;
  settings: Settings;
  setSettings(s: Settings): void;
  impatient: boolean;
  onLock(): void;
  onSleep(): void;
  onShutdown(): void;
  onRestart(): void;
}

export function Session({ pack, user, settings, setSettings, impatient, onLock, onSleep, onShutdown, onRestart }: Props) {
  const vp = VP;
  const [wins, dispatchRaw] = useReducer(winReducer, undefined, emptyWinState);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [dialogs, setDialogs] = useState<DialogSpec[]>([]);
  const [ad, setAd] = useState<Ad | null>(null);
  const [update, setUpdate] = useState<ForcedUpdate | null>(null);
  const [busy, setBusy] = useState(0);
  const [zooms, setZooms] = useState<Zoom[]>([]);
  const [saver, setSaver] = useState(false);

  const rng = useMemo(() => makeRng(Date.now() & 0xffffffff), []);
  const str = useMemo(() => makeStr(pack), [pack]);
  const loginAt = useRef(0);
  const rules = useRef(emptyRuleState());
  const counter = useRef(0);
  const lastActivity = useRef(Date.now());
  const live = useRef({ ad, update, settings, vp, wins });
  live.current = { ad, update, settings, vp, wins };
  const runRef = useRef<(a: ActionRef) => void>(() => {});

  const playSound = useCallback((son: Son) => {
    const s = live.current.settings;
    if (s.sons) jouer(son, Math.max(0.15, s.hymne / 100));
  }, []);

  const zoom = useCallback((from: Rect, to: Rect) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = ++counter.current;
    setZooms((z) => [...z, { key, from, to }]);
  }, []);

  /** Rectangle (coordonnées de l'écran) du bouton de tâche d'une fenêtre, pour l'animation de réduction. */
  const taskRect = (id: string): Rect => {
    const el = document.querySelector<HTMLElement>(`[data-task="${id}"]`);
    const ecran = el?.closest<HTMLElement>(".ecran");
    if (!el || !ecran) return START;
    const e = ecran.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = SCREEN.w / e.width;
    return { x: (r.left - e.left) * k, y: (r.top - e.top) * k, w: r.width * k, h: r.height * k };
  };

  const dispatch = useCallback(
    (a: WinAction) => {
      const w = "id" in a ? live.current.wins.windows.find((x) => x.id === a.id) : undefined;
      if (w && a.type === "minimize") zoom(w.rect, taskRect(w.id));
      if (w && a.type === "focus" && w.minimized) zoom(taskRect(w.id), w.rect);
      dispatchRaw(a);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoom],
  );

  const feed = useCallback(
    (input: Input) => {
      const elapsed = Date.now() - loginAt.current;
      const r = schedule(pack.rules, rules.current, { ...input, elapsed } as SchedulerInput, rng, live.current.settings as unknown as Record<string, unknown>);
      rules.current = r.state;
      for (const { action } of r.actions) runRef.current(action);
    },
    [pack.rules, rng],
  );

  /** Ouverture d'un programme : sablier, chargement « du disque », puis zoom vers la fenêtre. */
  const openApp = useCallback(
    (appId: string, args?: Record<string, string>, from: Rect = START) => {
      const m = pack.apps.find((a) => a.id === appId);
      if (!m) return;
      setBusy((b) => b + 1);
      const delai = 350 + Math.floor(rng() * 450);
      setTimeout(() => {
        setBusy((b) => b - 1);
        const before = live.current.wins;
        const existing = m.single ? before.windows.find((w) => w.appId === appId) : undefined;
        dispatchRaw({ type: "open", appId, title: m.title, args, size: m.size, single: m.single, vp: live.current.vp });
        if (existing) {
          if (existing.minimized) zoom(taskRect(existing.id), existing.rect);
        } else {
          const offset = (before.windows.length % 6) * 22;
          const x = Math.max(4, Math.round((VP.w - m.size.w) / 2) - 60 + offset);
          const y = Math.max(4, Math.round((VP.h - VP.bottom - m.size.h) / 2) - 50 + offset);
          zoom(from, { x, y, w: Math.min(m.size.w, VP.w), h: Math.min(m.size.h, VP.h - VP.bottom) });
        }
        feed({ kind: "app-open", app: appId });
      }, delai);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack.apps, feed, rng, zoom],
  );

  const pushToast = useCallback((title: string, body: string) => {
    const key = ++counter.current;
    setToasts((ts) => [...ts.slice(-2), { key, title, body }]);
  }, []);

  const runAction = useCallback(
    (a: ActionRef) => {
      switch (a.type) {
        case "toast":
          return pushToast(a.toast.title, a.toast.body);
        case "toast-pool": {
          const pool = pack.toastPools[a.pool];
          if (pool?.length) {
            const t = pick(rng, pool);
            pushToast(t.title, t.body);
          }
          return;
        }
        case "dialog":
          return setDialogs((d) => (d.some((x) => x.title === a.dialog.title) ? d : [...d, a.dialog]));
        case "dialog-ref": {
          const d = pack.dialogs[a.id];
          if (d) setDialogs((q) => (q.includes(d) ? q : [...q, d]));
          return;
        }
        case "ad": {
          if (live.current.ad || live.current.update || !pack.ads.length) return;
          setAd(pack.ads.find((x) => x.id === a.id) ?? pick(rng, pack.ads));
          return;
        }
        case "update": {
          const u = pack.updates.find((x) => x.id === a.id);
          if (u && !live.current.update) setUpdate(u);
          return;
        }
        case "open":
          return openApp(a.app, a.args);
        case "sleep":
          return onSleep();
        case "lock":
          return onLock();
        case "shutdown":
          return onShutdown();
        case "restart":
          return onRestart();
        case "signal":
          return feed({ kind: "signal", name: a.name });
      }
    },
    [pack, rng, pushToast, openApp, onSleep, onLock, onShutdown, onRestart, feed],
  );
  runRef.current = runAction;

  // Horloge des règles : une vérification par seconde depuis l'ouverture de session.
  useEffect(() => {
    loginAt.current = Date.now();
    playSound("demarrage");
    if (impatient) setTimeout(() => runRef.current({ type: "signal", name: "boot:impatience" }), 4000);
    const id = setInterval(() => {
      feed({ kind: "tick" });
      const s = live.current.settings;
      if (s.economiseur > 0 && !live.current.update && Date.now() - lastActivity.current > s.economiseur * 1000) setSaver(true);
    }, 1000);
    const actif = () => (lastActivity.current = Date.now());
    window.addEventListener("pointermove", actif);
    window.addEventListener("pointerdown", actif);
    window.addEventListener("keydown", actif);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointermove", actif);
      window.removeEventListener("pointerdown", actif);
      window.removeEventListener("keydown", actif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, impatient]);

  // Chaque boîte de dialogue qui s'affiche sonne, comme il se doit.
  const premier = dialogs[0];
  useEffect(() => {
    if (premier) playSound(premier.icon === "erreur" ? "erreur" : "ding");
  }, [premier, playSound]);

  const api = useMemo<OsApi>(
    () => ({
      pack,
      user,
      settings,
      setSettings: (patch) => setSettings({ ...live.current.settings, ...patch }),
      openApp: (id, args) => openApp(id, args),
      runAction,
      signal: (name) => feed({ kind: "signal", name }),
      str,
      rng,
      playSound,
      showScreensaver: () => setSaver(true),
    }),
    [pack, user, settings, setSettings, openApp, runAction, feed, str, rng, playSound],
  );

  const closeToast = useCallback((key: number) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);
  const launch = useCallback(
    (d: DesktopIcon, from: Rect) => ("app" in d.open ? openApp(d.open.app, d.open.args, from) : runAction(d.open.action)),
    [openApp, runAction],
  );
  const exitSaver = useCallback(() => {
    lastActivity.current = Date.now();
    setSaver(false);
  }, []);

  return (
    <OsContext.Provider value={api}>
      <div className={`bureau${busy > 0 ? " occupe" : ""}`}>
        <Wallpaper pack={pack} fond={settings.fond} />
        <Desktop area={AREA} onLaunch={launch} />

        <div className="fenetres">
          {wins.windows.map((w) => {
            const m = pack.apps.find((a) => a.id === w.appId)!;
            const App = APPS[m.kind];
            return (
              <WindowFrame key={w.id} win={w} manifest={m} focused={wins.focusedId === w.id} vp={vp} dispatch={dispatch} outline={!settings.contenuFenetres}>
                <App />
              </WindowFrame>
            );
          })}
        </div>

        {zooms.map((z) => (
          <ZoomRect key={z.key} from={z.from} to={z.to} onDone={() => setZooms((all) => all.filter((x) => x.key !== z.key))} />
        ))}

        <Toasts toasts={toasts} onClose={closeToast} />
        <Taskbar
          windows={wins.windows}
          focusedId={wins.focusedId}
          onTask={(w) => dispatch(w.id === wins.focusedId && !w.minimized ? { type: "minimize", id: w.id } : { type: "focus", id: w.id })}
        />
        {dialogs[0] && (
          <DialogBox
            dialog={dialogs[0]}
            onAnswer={(then) => {
              setDialogs((d) => d.slice(1));
              if (then) runAction(then);
            }}
          />
        )}
        {ad && !update && (
          <AdBox
            ad={ad}
            onClose={() => setAd(null)}
            onCta={() => {
              setAd(null);
              feed({ kind: "signal", name: "pub:cta" });
            }}
          />
        )}
        {update && (
          <UpdateScreen
            update={update}
            onDone={() => {
              if (update.resetSettings) setSettings(DEFAULT_SETTINGS);
              setUpdate(null);
              playSound("ding");
            }}
          />
        )}
        {saver && <Economiseur onExit={exitSaver} />}
      </div>
    </OsContext.Provider>
  );
}

/** Rectangle en pointillés qui file d'un point à un autre (ouverture, réduction, restauration). */
function ZoomRect({ from, to, onDone }: { from: Rect; to: Rect; onDone(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate) return onDone();
    const frames = [from, to].map((r) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }));
    const anim = el.animate(frames, { duration: 230, easing: "steps(7, end)", fill: "forwards" });
    anim.onfinish = onDone;
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={ref} className="zoom" style={{ left: from.x, top: from.y, width: from.w, height: from.h }} aria-hidden="true" />;
}
