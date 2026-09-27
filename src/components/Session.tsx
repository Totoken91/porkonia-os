"use client";
/**
 * Session ouverte : bureau, fenêtres, barre des tâches et moteur d'événements.
 * Les événements (pop-ups, pubs, mises à jour) viennent des règles du pack via l'ordonnanceur pur.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ActionRef, Ad, ContentPack, DesktopIcon, DialogSpec, ForcedUpdate, UserProfile } from "@/content/types";
import { APPS } from "@/apps/registry";
import { OsContext, makeStr, type MailApi, type OsApi } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import { emptyRuleState, schedule, type SchedulerInput } from "@/os/scheduler";
import { etatVide, observer, sanitizeDistinctions, type EtatDistinctions } from "@/os/distinctions";
import { DEFAULT_SETTINGS, type Settings } from "@/os/settings";
import { jouer, type Son } from "@/os/sons";
import { deliver, initBoite, markRead, move, sanitizeBoite, saveDraft, send, type Boite, type Brouillon, type Dossier } from "@/os/mailbox";
import { emptyWinState, saveWindows, winReducer, type SavedWin, type Viewport, type WinAction } from "@/os/windows";
import { ContextMenu, type MenuItem, type MenuState } from "./Menu";
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
  /** Restaurer les fenêtres de la session précédente (faux après un arrêt brutal). */
  restaurer: boolean;
}

export function Session({ pack, user, settings, setSettings, impatient, onLock, onSleep, onShutdown, onRestart, restaurer }: Props) {
  const vp = VP;
  const [wins, dispatchRaw] = useReducer(winReducer, undefined, emptyWinState);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [dialogs, setDialogs] = useState<DialogSpec[]>([]);
  const [ad, setAd] = useState<Ad | null>(null);
  const [update, setUpdate] = useState<ForcedUpdate | null>(null);
  const [busy, setBusy] = useState(0);
  const [zooms, setZooms] = useState<Zoom[]>([]);
  const [saver, setSaver] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<MenuState | null>(null);
  const [gele, setGele] = useState<Record<string, boolean>>({});
  const [fatal, setFatal] = useState(false);
  const cleCourrier = `porkos.courrier.${pack.id}`;
  const [boite, setBoiteState] = useState<Boite>(() => initBoite(pack.mails));
  const boiteRef = useRef(boite);
  const setBoite = useCallback(
    (f: (b: Boite) => Boite) => {
      const next = f(boiteRef.current);
      boiteRef.current = next;
      setBoiteState(next);
      try {
        window.localStorage.setItem(cleCourrier, JSON.stringify(next));
      } catch {
        /* courrier non retenu */
      }
    },
    [cleCourrier],
  );
  useEffect(() => {
    try {
      const b = sanitizeBoite(JSON.parse(window.localStorage.getItem(cleCourrier) ?? "null"), pack.mails);
      boiteRef.current = b;
      setBoiteState(b);
    } catch {
      /* boîte neuve */
    }
  }, [cleCourrier, pack.mails]);

  // Distinctions civiques, retenues dans le navigateur pour chaque citoyen du poste.
  const cleDecor = `porkos.distinctions.${pack.id}.${user.id}`;
  const [decor, setDecor] = useState<EtatDistinctions>(() => {
    try {
      return sanitizeDistinctions(JSON.parse(window.localStorage.getItem(cleDecor) ?? "null"), pack.distinctions);
    } catch {
      return etatVide();
    }
  });
  const decorRef = useRef(decor);
  const applisDuPoste = useMemo(() => pack.apps.filter((a) => a.menu).map((a) => a.id), [pack.apps]);
  const decerneRef = useRef<(d: import("@/content/types").Distinction) => void>(() => {});

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
      if (input.kind === "tick") return;
      const d = observer(pack.distinctions, decorRef.current, input, applisDuPoste, new Date().toISOString());
      if (JSON.stringify(d.etat) === JSON.stringify(decorRef.current)) return;
      decorRef.current = d.etat;
      setDecor(d.etat);
      try {
        window.localStorage.setItem(cleDecor, JSON.stringify(d.etat));
      } catch {
        /* distinctions non retenues */
      }
      d.nouvelles.forEach((x, i) => setTimeout(() => decerneRef.current(x), 600 + i * 400));
    },
    [pack.rules, pack.distinctions, rng, applisDuPoste, cleDecor],
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

  /** Un message arrive : il est déposé, la zone de notification sonne. */
  const arrive = (m: import("@/content/types").Mail) => {
    setBoite((b) => deliver(b, m, maintenant()));
    pushToast(str("courrier.arrive.titre"), str("courrier.arrive", { de: m.from.replace(/\s*<[^>]*>/, ""), objet: m.subject }));
    playSound("ding");
  };

  /**
   * File des bulles : une seule à l'écran, les suivantes attendent qu'elle se referme. Au-delà de quatre,
   * les plus anciennes en attente sont oubliées (un rappel civique de retard n'a plus d'intérêt).
   */
  const pushToast = useCallback((title: string, body: string, action?: ActionRef) => {
    const key = ++counter.current;
    setToasts((ts) => {
      const file = [...ts, { key, title, body, action }];
      return file.length > 4 ? [file[0]!, ...file.slice(-3)] : file;
    });
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
        case "freeze": {
          // On ne gèle qu'un programme à l'arrière-plan : on le découvre figé en y revenant.
          const cands = live.current.wins.windows.filter((w) => !w.minimized && w.id !== live.current.wins.focusedId && !["bienvenue", "executer"].includes(w.appId));
          if (!cands.length) return;
          const w = pick(rng, cands);
          setGele((g) => ({ ...g, [w.id]: true }));
          setTimeout(() => setGele((g) => ({ ...g, [w.id]: false })), 7000 + Math.floor(rng() * 5000));
          return;
        }
        case "fatal":
          feed({ kind: "signal", name: "systeme:fatal" });
          setFatal(true);
          playSound("erreur");
          return;
        case "window":
          if (a.op === "close") dispatchRaw({ type: "close", id: a.id });
          setGele((g) => ({ ...g, [a.id]: false }));
          return;
        case "mail": {
          const m = pack.mails.find((x) => x.id === a.id);
          if (m && !boiteRef.current.messages.some((x) => x.id === m.id)) arrive(m);
          return;
        }
      }
    },
    [pack, rng, pushToast, openApp, onSleep, onLock, onShutdown, onRestart, feed],
  );
  runRef.current = runAction;
  decerneRef.current = (d) => {
    pushToast(str("distinctions.decernee"), str("distinctions.bulle", { titre: d.titre, motif: d.motif }), { type: "open", app: "distinctions" });
    playSound("medaille");
  };

  // Horloge des règles : une vérification par seconde depuis l'ouverture de session.
  useEffect(() => {
    loginAt.current = Date.now();
    playSound("demarrage");
    setTimeout(() => feed({ kind: "signal", name: "session:ouverte" }), 6000);
    if (!restaurer) setTimeout(() => feed({ kind: "signal", name: "session:perdue" }), 7000);
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

  const mail = useMemo<MailApi>(
    () => ({
      boite,
      lire: (id, lu = true) => setBoite((b) => markRead(b, id, lu)),
      deplacer: (id, dossier: Dossier) => setBoite((b) => move(b, id, dossier)),
      brouillon: (d: Brouillon, id?: string) => {
        let nid = id ?? "";
        setBoite((b) => {
          const [nb, i] = saveDraft(b, d, pack.mailbox.address, maintenant(), id);
          nid = i;
          return nb;
        });
        return nid;
      },
      envoyer: (d: Brouillon, draftId?: string) => {
        setBoite((b) => send(b, d, pack.mailbox.address, maintenant(), draftId)[0]);
        feed({ kind: "signal", name: "courrier:envoye" });
        // L'administration répond toujours, et vite : c'est même la seule chose qu'elle fait vite.
        const r = pick(rng, pack.mailbox.autoReplies);
        const id = `auto-${Date.now()}`;
        setTimeout(
          () => arrive({ id, folder: "reception", from: r.from, to: pack.mailbox.address, date: "", subject: /^re\s*:/i.test(d.subject) ? d.subject : `RE: ${d.subject || "(sans objet)"}`, body: r.body }),
          8000 + Math.floor(rng() * 7000),
        );
      },
      relever: () => feed({ kind: "signal", name: "courrier:relever" }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boite, setBoite, pack, rng, feed],
  );

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
      mail,
      distinctions: decor,
      showMenu: (at, items: MenuItem[]) => {
        const ecran = document.querySelector<HTMLElement>(".ecran");
        if (!ecran) return;
        const r = ecran.getBoundingClientRect();
        const k = SCREEN.w / r.width;
        setCtxMenu({ x: (at.clientX - r.left) * k, y: (at.clientY - r.top) * k, items });
      },
    }),
    [pack, user, settings, setSettings, openApp, runAction, feed, str, rng, playSound, mail, decor],
  );

  // Session : on retrouve ses fenêtres, sauf après un arrêt brutal.
  const cleFenetres = `porkos.fenetres.${pack.id}`;
  const restaurationFaite = useRef(false);
  useEffect(() => {
    let saved: SavedWin[] = [];
    try {
      const raw = JSON.parse(window.localStorage.getItem(cleFenetres) ?? "[]");
      if (Array.isArray(raw)) saved = raw.filter((w) => w && pack.apps.some((a) => a.id === w.appId) && w.rect && typeof w.rect.x === "number" && w.appId !== "executer");
    } catch {
      /* rien à restaurer */
    }
    if (saved.length) {
      if (restaurer) {
        dispatchRaw({ type: "restore", windows: saved, vp: VP });
        setTimeout(() => pushToast(pack.os.name, str("session.restauree")), 2500);
      } else setTimeout(() => pushToast(pack.os.name, str("session.perdue")), 2500);
    }
    restaurationFaite.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restaurationFaite.current) return;
    try {
      window.localStorage.setItem(cleFenetres, JSON.stringify(saveWindows(wins)));
    } catch {
      /* session non retenue */
    }
  }, [wins, cleFenetres]);

  /** Fenêtre gelée cliquée : la boîte « … a cessé de répondre ». */
  const surGel = (id: string) => {
    const w = live.current.wins.windows.find((x) => x.id === id);
    if (!w) return;
    const app = pack.apps.find((a) => a.id === w.appId)?.title ?? w.title;
    runAction({
      type: "dialog",
      dialog: {
        title: str("gel.titre", { app }),
        icon: "erreur",
        body: str("gel.texte", { app }),
        buttons: [
          { label: str("gel.attendre") },
          { label: str("gel.fermer"), then: { type: "window", op: "close", id } },
          { label: str("gel.signaler"), then: { type: "toast", toast: { title: str("gel.signaler"), body: str("gel.signale") } } },
        ],
      },
    });
  };

  const layout = (op: "desktop" | "cascade" | "tile") => dispatch(op === "desktop" ? { type: "minimizeAll" } : { type: op, vp: VP });

  const closeToast = useCallback((key: number) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);
  const launch = useCallback(
    (d: DesktopIcon, from: Rect) => ("app" in d.open ? openApp(d.open.app, d.open.args, from) : runAction(d.open.action)),
    [openApp, runAction],
  );
  const exitSaver = useCallback(() => {
    lastActivity.current = Date.now();
    setSaver(false);
    feed({ kind: "signal", name: "economiseur:vu" });
  }, [feed]);

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
              <WindowFrame
                key={w.id}
                win={w}
                manifest={m}
                focused={wins.focusedId === w.id}
                vp={vp}
                dispatch={dispatch}
                outline={!settings.contenuFenetres}
                frozen={!!gele[w.id]}
                onFrozenClick={() => surGel(w.id)}
              >
                <App />
              </WindowFrame>
            );
          })}
        </div>

        {zooms.map((z) => (
          <ZoomRect key={z.key} from={z.from} to={z.to} onDone={() => setZooms((all) => all.filter((x) => x.key !== z.key))} />
        ))}

        <Toasts toasts={toasts.slice(0, 1)} onClose={closeToast} onAction={runAction} />
        <Taskbar
          windows={wins.windows}
          focusedId={wins.focusedId}
          onTask={(w) => dispatch(w.id === wins.focusedId && !w.minimized ? { type: "minimize", id: w.id } : { type: "focus", id: w.id })}
          dispatch={dispatch}
          onLayout={layout}
          busy={busy > 0}
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
        {ctxMenu && <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} bounds={{ w: SCREEN.w, h: SCREEN.h }} />}
        {saver && <Economiseur onExit={exitSaver} />}
        {fatal && (
          <EcranFatal
            titre={str("fatal.titre")}
            texte={str("fatal.texte")}
            suite={str("fatal.suite")}
            onExit={() => {
              setFatal(false);
              const f = live.current.wins.focusedId;
              if (f) dispatch({ type: "close", id: f });
            }}
          />
        )}
      </div>
    </OsContext.Provider>
  );
}

/** Écran d'exception fatale : texte d'époque en plein écran ; une touche ou un clic pour revenir. */
function EcranFatal({ titre, texte, suite, onExit }: { titre: string; texte: string; suite: string; onExit(): void }) {
  useEffect(() => {
    const debut = Date.now();
    const sortir = () => Date.now() - debut > 500 && onExit();
    window.addEventListener("keydown", sortir);
    window.addEventListener("pointerdown", sortir);
    return () => {
      window.removeEventListener("keydown", sortir);
      window.removeEventListener("pointerdown", sortir);
    };
  }, [onExit]);
  return (
    <div className="fatal" data-testid="fatal">
      <div>
        <p className="fatal-titre">
          <span>{titre}</span>
        </p>
        <p>{texte}</p>
        <p className="fatal-suite">{suite}</p>
      </div>
    </div>
  );
}

/** Horodatage des messages livrés ou envoyés pendant la session. */
function maintenant() {
  return `aujourd'hui ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
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
