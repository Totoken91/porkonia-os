"use client";
/**
 * Session ouverte : bureau, fenêtres, barre des tâches et moteur d'événements.
 * Les événements (pop-ups, pubs, mises à jour) viennent des règles du pack via l'ordonnanceur pur.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ActionRef, Ad, ContentPack, DialogSpec, ForcedUpdate, UserProfile } from "@/content/types";
import { APPS } from "@/apps/registry";
import { OsContext, makeStr, type OsApi } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import { emptyRuleState, schedule, type SchedulerInput } from "@/os/scheduler";

type Input = SchedulerInput extends infer T ? (T extends unknown ? Omit<T, "elapsed"> : never) : never;
import { DEFAULT_SETTINGS, type Settings } from "@/os/settings";
import { emptyWinState, winReducer, type Viewport } from "@/os/windows";
import { Icon } from "./Icon";
import { AdBox, DialogBox, Toasts, UpdateScreen, type LiveToast } from "./Overlays";
import { SCREEN } from "./Monitor";
import { Taskbar } from "./Taskbar";
import { Wallpaper } from "./Wallpaper";
import { WindowFrame } from "./WindowFrame";

const TASKBAR = 28;
const VP: Viewport = { w: SCREEN.w, h: SCREEN.h, bottom: TASKBAR };

interface Props {
  pack: ContentPack;
  user: UserProfile;
  settings: Settings;
  setSettings(s: Settings): void;
  impatient: boolean;
  onLock(): void;
  onSleep(): void;
}

export function Session({ pack, user, settings, setSettings, impatient, onLock, onSleep }: Props) {
  const vp = VP;
  const [wins, dispatch] = useReducer(winReducer, undefined, emptyWinState);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [dialogs, setDialogs] = useState<DialogSpec[]>([]);
  const [ad, setAd] = useState<Ad | null>(null);
  const [update, setUpdate] = useState<ForcedUpdate | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const rng = useMemo(() => makeRng(Date.now() & 0xffffffff), []);
  const str = useMemo(() => makeStr(pack), [pack]);
  const loginAt = useRef(0);
  const rules = useRef(emptyRuleState());
  const toastKey = useRef(0);
  const live = useRef({ ad, update, settings, vp });
  live.current = { ad, update, settings, vp };
  const runRef = useRef<(a: ActionRef) => void>(() => {});

  const feed = useCallback(
    (input: Input) => {
      const elapsed = Date.now() - loginAt.current;
      const r = schedule(pack.rules, rules.current, { ...input, elapsed } as SchedulerInput, rng, live.current.settings as unknown as Record<string, unknown>);
      rules.current = r.state;
      for (const { action } of r.actions) runRef.current(action);
    },
    [pack.rules, rng],
  );

  const openApp = useCallback(
    (appId: string, args?: Record<string, string>) => {
      const m = pack.apps.find((a) => a.id === appId);
      if (!m) return;
      dispatch({ type: "open", appId, title: m.title, args, size: m.size, single: m.single, vp: live.current.vp });
      feed({ kind: "app-open", app: appId });
    },
    [pack.apps, feed],
  );

  const pushToast = useCallback((title: string, body: string) => {
    const key = ++toastKey.current;
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
        case "signal":
          return feed({ kind: "signal", name: a.name });
      }
    },
    [pack, rng, pushToast, openApp, onSleep, onLock, feed],
  );
  runRef.current = runAction;

  // Horloge des règles : une vérification par seconde depuis l'ouverture de session.
  useEffect(() => {
    loginAt.current = Date.now();
    if (impatient) setTimeout(() => runRef.current({ type: "signal", name: "boot:impatience" }), 4000);
    const id = setInterval(() => feed({ kind: "tick" }), 1000);
    return () => clearInterval(id);
  }, [feed, impatient]);

  const api = useMemo<OsApi>(
    () => ({
      pack,
      user,
      settings,
      setSettings: (patch) => setSettings({ ...live.current.settings, ...patch }),
      openApp,
      runAction,
      signal: (name) => feed({ kind: "signal", name }),
      str,
      rng,
    }),
    [pack, user, settings, setSettings, openApp, runAction, feed, str, rng],
  );

  const closeToast = useCallback((key: number) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);

  return (
    <OsContext.Provider value={api}>
      <div className="bureau" onPointerDown={(e) => (e.target as HTMLElement).closest(".desk-icon") || setSelected(null)}>
        <Wallpaper pack={pack} fond={settings.fond} />
        <div className="desk-icons" role="listbox" aria-label="Bureau">
          {pack.desktop.map((d) => {
            const launch = () => ("app" in d.open ? openApp(d.open.app, d.open.args) : runAction(d.open.action));
            return (
              <button
                key={d.id}
                className="desk-icon"
                role="option"
                aria-selected={selected === d.id}
                onClick={(e) => {
                  setSelected(d.id);
                  if ((e.nativeEvent as PointerEvent).pointerType === "touch") launch();
                }}
                onDoubleClick={launch}
                onKeyDown={(e) => e.key === "Enter" && launch()}
                data-testid={`icon-${d.id}`}
              >
                <Icon name={d.icon} size={32} />
                <span>{d.label}</span>
              </button>
            );
          })}
        </div>

        <div className="fenetres">
          {wins.windows.map((w) => {
            const m = pack.apps.find((a) => a.id === w.appId)!;
            const App = APPS[m.kind];
            return (
              <WindowFrame key={w.id} win={w} manifest={m} focused={wins.focusedId === w.id} vp={vp} dispatch={dispatch}>
                <App />
              </WindowFrame>
            );
          })}
        </div>

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
            }}
          />
        )}
      </div>
    </OsContext.Provider>
  );
}
