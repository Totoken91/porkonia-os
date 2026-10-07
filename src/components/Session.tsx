"use client";
/**
 * Session ouverte : bureau, fenêtres, barre des tâches et moteur d'événements.
 * Les événements (pop-ups, pubs, mises à jour) viennent des règles du pack via l'ordonnanceur pur.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ActionRef, Ad, ContentPack, DesktopIcon, DialogSpec, ForcedUpdate, UserProfile } from "@/content/types";
import { APPS } from "@/apps/registry";
import { OsContext, makeStr, useEcran, type MailApi, type OsApi } from "@/os/context";
import { makeRng, pick } from "@/os/rng";
import { emptyRuleState, schedule, type SchedulerInput } from "@/os/scheduler";
import { etatVide, observer, sanitizeDistinctions, type EtatDistinctions } from "@/os/distinctions";
import { POUBELLE, deplacer, sanitizeDisque, supprimer, type Disque, type Resultat } from "@/os/vfs";
import { resolve as resoudre } from "@/os/fs";
import { DEFAULT_SETTINGS, type Settings } from "@/os/settings";
import { jouer, type Son } from "@/os/sons";
import { surLivraisonSaucisson } from "@/os/saucissonStore";
import { surLivraison } from "@/os/biereStore";
import { surWarp } from "@/os/ivresseStore";
import { deliver, initBoite, markRead, move, sanitizeBoite, saveDraft, send, type Boite, type Brouillon, type Dossier } from "@/os/mailbox";
import { emptyWinState, saveWindows, winReducer, type SavedWin, type Viewport, type WinAction } from "@/os/windows";
import { filAvec, texteDuCitoyen, trouverCorrespondant } from "@/os/correspondance";
import { ContextMenu, type MenuItem, type MenuState } from "./Menu";
import { Desktop, type Rect } from "./Desktop";
import { Lanceur } from "./Lanceur";
import { Economiseur } from "./Economiseur";
import { AdBox, DialogBox, Toasts, UpdateScreen, type LiveToast } from "./Overlays";
import { Taskbar } from "./Taskbar";
import { Commutateur } from "./Commutateur";
import { Wallpaper } from "./Wallpaper";
import { WindowFrame } from "./WindowFrame";
import { Assistant } from "./Assistant";
import type { EvenementOs } from "@/os/assistant";

type Input = SchedulerInput extends infer T ? (T extends unknown ? Omit<T, "elapsed"> : never) : never;


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
  /** Veille patriotique en cours : le temps des événements (pubs, rappels, gels) est suspendu. */
  veille?: boolean;
}

/** Délai minimal entre deux bulles de distinction (ms). */
const DISCRETION_MEDAILLES = 120_000;
/** Démarrage calme : pendant ce délai après la connexion, les bulles attendent, puis passent regroupées. */
const DEMARRAGE_CALME = 25_000;

export function Session({ pack, user, settings, setSettings, impatient, onLock, onSleep, onShutdown, onRestart, restaurer, veille }: Props) {
  // Zone des fenêtres : sous la barre d'état du Poche (rien sur le moniteur), au-dessus de la barre du bas.
  const ecran = useEcran();
  const poche = ecran.mode === "poche";
  const vp = useMemo<Viewport>(() => ({ w: ecran.w, h: ecran.h - ecran.haut, bottom: ecran.bas, poche }), [ecran.w, ecran.h, ecran.haut, ecran.bas, poche]);
  const AREA = { w: ecran.w, h: ecran.h - ecran.haut - ecran.bas };
  const START: Rect = { x: 2, y: ecran.h - ecran.bas + 3, w: 70, h: 22 };
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

  // Disque du poste, retenu dans le navigateur pour chaque citoyen.
  const cleDisque = `porkos.disque.${pack.id}.${user.id}`;
  const [disque, setDisqueState] = useState<Disque>(() => {
    let brut: unknown = null;
    try {
      brut = JSON.parse(window.localStorage.getItem(cleDisque) ?? "null");
    } catch {
      /* disque neuf */
    }
    return sanitizeDisque(brut, pack.filesystem);
  });
  const disqueRef = useRef(disque);
  const [pressePapiers, setPressePapiers] = useState<{ chemins: string[]; couper: boolean } | null>(null);

  // Numéro de cette session pour ce citoyen : certains courriers attendent qu'on revienne.
  const cleSessions = `porkos.sessions.${pack.id}.${user.id}`;
  const [numeroSession] = useState(() => {
    try {
      const n = Number(window.localStorage.getItem(cleSessions));
      return (Number.isInteger(n) && n > 0 ? n : 0) + 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(cleSessions, String(numeroSession));
    } catch {
      /* compteur non retenu */
    }
  }, [cleSessions, numeroSession]);

  const rng = useMemo(() => makeRng(Date.now() & 0xffffffff), []);
  const str = useMemo(() => makeStr(pack), [pack]);
  const loginAt = useRef(0);
  const rules = useRef(emptyRuleState());
  const counter = useRef(0);
  const medailles = useRef<{ derniere: number; enAttente: number; minuterie?: ReturnType<typeof setTimeout> }>({ derniere: 0, enAttente: 0 });
  const lastActivity = useRef(Date.now());
  const live = useRef({ ad, update, settings, vp, wins, veille, saver: false });
  live.current = { ad, update, settings, vp, wins, veille, saver };
  const runRef = useRef<(a: ActionRef) => void>(() => {});

  const playSound = useCallback((son: Son) => {
    const s = live.current.settings;
    if (s.sons) jouer(son, Math.max(0.15, s.hymne / 100));
  }, []);

  const zoom = useCallback((from: Rect, to: Rect) => {
    // Au doigt, les programmes s'ouvrent en plein écran : pas de rectangle qui file.
    if (live.current.vp.poche) return;
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
    const k = live.current.vp.w / e.width;
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

  const [evOs, setEvOs] = useState<{ n: number; ev: EvenementOs } | null>(null);
  const feed = useCallback(
    (input: Input) => {
      const elapsed = Date.now() - loginAt.current;
      const r = schedule(pack.rules, rules.current, { ...input, elapsed } as SchedulerInput, rng, live.current.settings as unknown as Record<string, unknown>, numeroSession);
      rules.current = r.state;
      for (const { action } of r.actions) runRef.current(action);
      if (input.kind === "tick") return;
      if (input.kind === "app-open" || input.kind === "signal") setEvOs((e) => ({ n: (e?.n ?? 0) + 1, ev: input.kind === "app-open" ? { kind: "app-open", app: input.app } : { kind: "signal", name: input.name } }));
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
    [pack.rules, pack.distinctions, rng, applisDuPoste, cleDecor, numeroSession],
  );

  /** Ouverture d'un programme : sablier, chargement « du disque », puis zoom vers la fenêtre. */
  const openApp = useCallback(
    (appId: string, args?: Record<string, string>, from?: Rect) => {
      const m = pack.apps.find((a) => a.id === appId);
      if (!m) return;
      setBusy((b) => b + 1);
      // Le disque mouline un peu ; sur le Poche, la mémoire flash d'État répond plus vite.
      const delai = live.current.vp.poche ? 120 + Math.floor(rng() * 160) : 350 + Math.floor(rng() * 450);
      setTimeout(() => {
        setBusy((b) => b - 1);
        const before = live.current.wins;
        const existing = m.single ? before.windows.find((w) => w.appId === appId) : undefined;
        dispatchRaw({ type: "open", appId, title: m.title, args, size: m.size, single: m.single, vp: live.current.vp });
        if (existing) {
          if (existing.minimized) zoom(taskRect(existing.id), existing.rect);
        } else {
          const V = live.current.vp;
          const offset = (before.windows.length % 6) * 22;
          const x = Math.max(4, Math.round((V.w - m.size.w) / 2) - 60 + offset);
          const y = Math.max(4, Math.round((V.h - V.bottom - m.size.h) / 2) - 50 + offset);
          zoom(from ?? { x: 2, y: V.h - V.bottom + 3, w: 70, h: 22 }, { x, y, w: Math.min(m.size.w, V.w), h: Math.min(m.size.h, V.h - V.bottom) });
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
  const auDemarrage = useRef<{ toasts: { title: string; body: string; action?: ActionRef }[]; medailles: import("@/content/types").Distinction[] } | null>({ toasts: [], medailles: [] });
  const pushToast = useCallback((title: string, body: string, action?: ActionRef) => {
    if (auDemarrage.current) {
      auDemarrage.current.toasts.push({ title, body, action });
      return;
    }
    const key = ++counter.current;
    setToasts((ts) => {
      const file = [...ts, { key, title, body, action }];
      return file.length > 4 ? [file[0]!, ...file.slice(-3)] : file;
    });
  }, []);

  // Livraisons Porkomazon et ivresse : annoncées par la zone de notification et par les signaux du système.
  useEffect(() => {
    const a = surLivraison((n) => {
      pushToast(str("porkomazon.livre.titre"), str("porkomazon.livre", { n }));
      playSound("ding");
    });
    const saucisson = surLivraisonSaucisson((n) => {
      pushToast(str("porkomazon.livre.titre"), str("porkomazon.livre.saucisson", { n }));
      playSound("ding");
    });
    const b = surWarp(() => feed({ kind: "signal", name: "ivresse:warp" }));
    return () => {
      a();
      saucisson();
      b();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushToast]);

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
  // Une bulle par distinction au plus toutes les deux minutes ; celles d'entre-temps sont regroupées en une seule.
  decerneRef.current = (d) => {
    if (auDemarrage.current) {
      auDemarrage.current.medailles.push(d);
      return;
    }
    const m = medailles.current;
    if (Date.now() - m.derniere > DISCRETION_MEDAILLES) {
      m.derniere = Date.now();
      pushToast(str("distinctions.decernee"), str("distinctions.bulle", { titre: d.titre, motif: d.motif }), { type: "open", app: "distinctions" });
      playSound("medaille");
      return;
    }
    m.enAttente += 1;
    if (m.minuterie) return;
    m.minuterie = setTimeout(() => {
      const n = m.enAttente;
      Object.assign(m, { enAttente: 0, minuterie: undefined, derniere: Date.now() });
      if (n) pushToast(str("distinctions.decernee"), n === 1 ? str("distinctions.autre") : str("distinctions.autres", { n: String(n) }), { type: "open", app: "distinctions" });
    }, m.derniere + DISCRETION_MEDAILLES - Date.now());
  };

  // Fin du démarrage calme : une bulle pour les médailles (regroupées), puis les autres, au plus deux.
  useEffect(() => {
    const t = setTimeout(() => {
      const att = auDemarrage.current;
      auDemarrage.current = null;
      if (!att) return;
      const [premiere] = att.medailles;
      if (premiere) {
        medailles.current.derniere = Date.now();
        if (att.medailles.length === 1) pushToast(str("distinctions.decernee"), str("distinctions.bulle", { titre: premiere.titre, motif: premiere.motif }), { type: "open", app: "distinctions" });
        else pushToast(str("distinctions.plusieurs", { n: String(att.medailles.length) }), att.medailles.map((m) => m.titre).join(" · "), { type: "open", app: "distinctions" });
        playSound("medaille");
      }
      for (const x of att.toasts.slice(-2)) pushToast(x.title, x.body, x.action);
    }, DEMARRAGE_CALME);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Horloge des règles : une vérification par seconde depuis l'ouverture de session.
  useEffect(() => {
    loginAt.current = Date.now();
    playSound("demarrage");
    setTimeout(() => feed({ kind: "signal", name: "session:ouverte" }), 6000);
    if (!restaurer) setTimeout(() => feed({ kind: "signal", name: "session:perdue" }), 7000);
    if (impatient) setTimeout(() => runRef.current({ type: "signal", name: "boot:impatience" }), 4000);
    const id = setInterval(() => {
      // En veille ou sous l'économiseur, l'horloge des règles s'arrête : rien ne surgit dessous ni au réveil.
      if (live.current.veille || live.current.saver) {
        loginAt.current += 1000;
        return;
      }
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
        const correspondant = trouverCorrespondant(d.to, pack.correspondants);
        const fil = correspondant ? filAvec(boiteRef.current.messages, correspondant, pack.mailbox.signature) : [];
        setBoite((b) => send(b, d, pack.mailbox.address, maintenant(), draftId)[0]);
        feed({ kind: "signal", name: "courrier:envoye" });
        const objetReponse = /^re\s*:/i.test(d.subject) ? d.subject : `RE: ${d.subject || "(sans objet)"}`;
        if (correspondant) {
          // Une personnalité répond en personnage (relais serveur vers le modèle) ; hors ligne, sa lettre de secours.
          feed({ kind: "signal", name: `courrier:personnage:${correspondant.id}` });
          const debut = Date.now();
          void (async () => {
            let corps = correspondant.secours;
            try {
              const r = await fetch("/api/courrier", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ correspondant: correspondant.id, objet: d.subject, corps: texteDuCitoyen(d.body, pack.mailbox.signature), fil }),
                signal: AbortSignal.timeout(30_000),
              });
              const j = r.ok ? ((await r.json()) as { corps?: unknown }) : null;
              if (typeof j?.corps === "string" && j.corps.trim()) corps = j.corps;
            } catch {
              /* relais absent ou injoignable : lettre de secours */
            }
            // Personne ne répond instantanément, même pas une personnalité.
            const attente = Math.max(0, 3500 + Math.floor(rng() * 3000) - (Date.now() - debut));
            setTimeout(() => arrive({ id: `rep-${correspondant.id}-${Date.now()}`, folder: "reception", from: correspondant.adresse, to: pack.mailbox.address, date: "", subject: objetReponse, body: corps }), attente);
          })();
          return;
        }
        // L'administration répond toujours, et vite : c'est même la seule chose qu'elle fait vite.
        const r = pick(rng, pack.mailbox.autoReplies);
        const id = `auto-${Date.now()}`;
        setTimeout(
          () => arrive({ id, folder: "reception", from: r.from, to: pack.mailbox.address, date: "", subject: objetReponse, body: r.body }),
          8000 + Math.floor(rng() * 7000),
        );
      },
      relever: () => feed({ kind: "signal", name: "courrier:relever" }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boite, setBoite, pack, rng, feed],
  );

  const fs = useMemo<import("@/os/context").FsApi>(() => {
    const dateDuJour = () => new Date().toLocaleDateString("fr-FR");
    const refuser = (erreur: string, vars?: Record<string, string>) =>
      runAction({ type: "dialog", dialog: { title: str("fichiers.titre"), icon: "erreur", body: pack.strings[erreur] ? str(erreur, vars) : erreur, buttons: [{ label: "OK" }] } });
    const appliquer = (op: (d: Disque) => Resultat) => {
      const r = op(disqueRef.current);
      if (!r.ok) {
        refuser(r.erreur, r.vars);
        return null;
      }
      disqueRef.current = r.disque;
      setDisqueState(r.disque);
      try {
        window.localStorage.setItem(cleDisque, JSON.stringify(r.disque));
      } catch {
        /* disque non retenu : trop plein, ou navigation privée */
      }
      return r.chemins;
    };
    return {
      disque,
      appliquer,
      deposer: (chemins, depot, copie = false) => {
        if (!chemins.length) return [];
        if (depot === POUBELLE) {
          const r = appliquer((d) => supprimer(d, chemins, dateDuJour()));
          if (r) playSound("ding");
          return r;
        }
        return appliquer((d) => deplacer(d, chemins, depot, copie));
      },
      ouvrir: (chemin) => {
        if (chemin === POUBELLE) return openApp("fichiers", { path: POUBELLE });
        const n = resoudre(disqueRef.current.racine, chemin);
        if (!n) return refuser("fichiers.err.introuvable", { nom: chemin });
        if (n.type === "dossier") {
          if (n.locked) runAction({ type: "dialog", dialog: { title: str("fichiers.verrouille"), icon: "erreur", body: n.locked, buttons: [{ label: str("fichiers.verrouille.ok") }] } });
          else openApp("fichiers", { path: chemin });
        } else if (n.type === "texte") openApp("texte", { path: chemin });
        else if (n.type === "image") openApp("visionneuse", { path: chemin });
        else openApp(n.app, n.args);
      },
      pressePapiers,
      setPressePapiers,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disque, pressePapiers, pack, str, runAction, openApp, cleDisque]);

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
      fs,
      showMenu: (at, items: MenuItem[]) => {
        const ecran = document.querySelector<HTMLElement>(".ecran");
        if (!ecran) return;
        const r = ecran.getBoundingClientRect();
        const k = live.current.vp.w / r.width;
        setCtxMenu({ x: (at.clientX - r.left) * k, y: (at.clientY - r.top) * k, items });
      },
    }),
    [pack, user, settings, setSettings, openApp, runAction, feed, str, rng, playSound, mail, decor, fs],
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
        dispatchRaw({ type: "restore", windows: saved, vp: live.current.vp });
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

  const layout = (op: "desktop" | "cascade" | "tile") => dispatch(op === "desktop" ? { type: "minimizeAll" } : { type: op, vp });

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
      <div className={`bureau${busy > 0 ? " occupe" : ""}${settings.assistant ? " avec-gruik" : ""}`}>
        <Wallpaper pack={pack} fond={settings.fond} />
        {poche ? <Lanceur onLaunch={launch} /> : <Desktop area={AREA} onLaunch={launch} />}

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
        <Assistant ev={evOs} calme={wins.windows.some((w) => w.appId === "bienvenue" && !w.minimized)} />
        <Taskbar
          windows={wins.windows}
          focusedId={wins.focusedId}
          onTask={(w) => dispatch(w.id === wins.focusedId && !w.minimized ? { type: "minimize", id: w.id } : { type: "focus", id: w.id })}
          dispatch={dispatch}
          onLayout={layout}
          busy={busy > 0}
          poche={poche}
        />
        <Commutateur windows={wins.windows} focusedId={wins.focusedId} apps={pack.apps} onChoisir={(id) => dispatch({ type: "focus", id })} />
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
        {ctxMenu && <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} bounds={{ w: ecran.w, h: ecran.h }} />}
        {saver && <Economiseur onExit={exitSaver} w={ecran.w} h={ecran.h} />}
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
