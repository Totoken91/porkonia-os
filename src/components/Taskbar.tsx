"use client";
/** Barre des tâches, menu PorkOS (avec sous-menus) et zone de notification. */
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppManifest } from "@/content/types";
import { useOs } from "@/os/context";
import { ordreRecents, voisine, type Win, type WinAction } from "@/os/windows";
import { Icon } from "./Icon";
import { Calendrier } from "./Calendrier";
import { demanderPleinEcran } from "./Monitor";

/** Horloge : un clic ouvre Date et heure (calendrier et horloge à aiguilles). */
function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(id);
  }, []);
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <span
        className={`heure${ouvert ? " active" : ""}`}
        role="button"
        tabIndex={-1}
        onClick={() => setOuvert((o) => !o)}
        data-testid="horloge"
        title={now ? now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : undefined}
      >
        {now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "12:12"}
      </span>
      {ouvert && <Calendrier onClose={fermer} />}
    </>
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
  /** PorkOS Poche : barre d'état en haut, façade à boutons physiques en bas (comme un PDA). */
  poche?: boolean;
}

type Sub = "programmes" | "accessoires" | null;

/** Bascule le plein écran du navigateur (le Poche s'y met tout seul à l'allumage, quand c'est permis). */
function BoutonPleinEcran({ str }: { str(k: string): string }) {
  const [plein, setPlein] = useState(false);
  const [permis, setPermis] = useState(false);
  useEffect(() => {
    setPermis(!!document.fullscreenEnabled);
    const on = () => setPlein(!!document.fullscreenElement);
    on();
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  if (!permis) return null;
  const label = str(plein ? "poche.plein-ecran.quitter" : "poche.plein-ecran");
  return (
    <button className="tb-son" onClick={() => (plein ? document.exitFullscreen().catch(() => {}) : demanderPleinEcran())} aria-label={label} title={label} data-testid="plein-ecran">
      <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        {plein ? <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" fill="none" stroke="#2a2118" strokeWidth="2" /> : <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" fill="none" stroke="#2a2118" strokeWidth="2" />}
      </svg>
    </button>
  );
}

export function Taskbar({ windows, focusedId, onTask, dispatch, onLayout, busy, poche }: Props) {
  const { pack, str, openApp, runAction, settings, setSettings, mail, showMenu } = useOs();
  const nonLus = mail.boite.messages.filter((m) => m.folder === "reception" && !m.read).length;
  const [open, setOpen] = useState(false);
  const [taches, setTaches] = useState(false);
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

  const menuDemarrer = () => (
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
  );

  const tray = (
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
      {poche && <BoutonPleinEcran str={str} />}
      <Clock />
    </div>
  );

  const premierPlan = windows.find((w) => w.id === focusedId && !w.minimized);
  const fermerTiroirs = () => (setOpen(false), setTaches(false));
  const retour = () => {
    fermerTiroirs();
    if (!premierPlan) return;
    // Retour au programme d'avant (le plus récent après celui-ci), sinon à l'accueil.
    const precedent = ordreRecents(windows, focusedId)[1];
    dispatch({ type: "minimize", id: premierPlan.id });
    if (precedent) dispatch({ type: "focus", id: precedent });
  };
  const tourner = (sens: "gauche" | "droite") => {
    fermerTiroirs();
    const id = voisine(windows, focusedId, sens);
    if (id) dispatch({ type: "focus", id });
  };
  /** Haut / bas de la croix : fait défiler ce qui est à l'écran (programme au premier plan, sinon le lanceur). */
  const defiler = (sens: 1 | -1) => {
    const racine = premierPlan ? document.querySelector(`[data-testid="window-${premierPlan.appId}"]`) : document.querySelector(".lanceur");
    if (!racine) return;
    const candidats = [racine, ...Array.from(racine.querySelectorAll<HTMLElement>("*"))] as HTMLElement[];
    const cible = candidats
      .filter((el) => el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY))
      .sort((x, y) => y.clientHeight - x.clientHeight)[0];
    cible?.scrollBy({ top: sens * Math.max(60, cible.clientHeight * 0.7), behavior: "smooth" });
  };
  if (poche) {
    return (
      <>
        {open && menuDemarrer()}
        <header className="barre-etat">
          <span className="be-marque">
            <img src="/brand/embleme-64.png" alt="" width={16} height={16} />
            <b>{premierPlan ? premierPlan.title : pack.os.name}</b>
          </span>
          {tray}
        </header>
        {taches && (
          <div className="taches-poche" data-testid="taches">
            <header>
              <b>{str("poche.taches.titre")}</b>
              {windows.length > 0 && (
                <button className="pk-btn" onClick={() => (setTaches(false), dispatch({ type: "closeAll" }))}>
                  {str("poche.taches.tout")}
                </button>
              )}
            </header>
            {windows.length === 0 && <p>{str("poche.taches.aucun")}</p>}
            <ul>
              {[...windows].sort((a, b) => b.z - a.z).map((w) => {
                const m = pack.apps.find((a) => a.id === w.appId);
                return (
                  <li key={w.id} className={w.id === focusedId && !w.minimized ? "actif" : undefined}>
                    <button className="tache" data-task={w.id} onClick={() => (setTaches(false), dispatch({ type: "focus", id: w.id }))}>
                      {m && <Icon name={m.icon} size={32} />}
                      <span>{w.title}</span>
                    </button>
                    <button className="tache-fermer" aria-label={`${str("barre.fermer")} ${w.title}`} onClick={() => dispatch({ type: "close", id: w.id })}>
                      <svg width="12" height="12" viewBox="0 0 8 8" aria-hidden="true"><path d="M0 0l8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.6" /></svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <nav className="facade" aria-label={str("poche.facade")}>
          <div className="facade-boutons">
            <button ref={startBtn} className="fb-bouton fb-demarrer" aria-expanded={open} aria-haspopup="menu" onClick={() => (fermerTiroirs(), setOpen((o) => !o))} data-testid="start" aria-label={str("demarrer")}>
              <img src="/brand/embleme-64.png" alt="" width={32} height={32} />
            </button>
            <button className="fb-bouton" onClick={retour} disabled={!premierPlan} aria-label={str("poche.retour")} data-testid="retour">
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M14 4l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" /></svg>
            </button>
            <div className="croix" role="group" aria-label={str("poche.croix")}>
              <button className="croix-b croix-haut" onClick={() => defiler(-1)} aria-label={str("poche.croix.haut")} data-testid="croix-haut">
                <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true"><path d="M7 1l6 8H1z" fill="currentColor" /></svg>
              </button>
              <button className="croix-b croix-gauche" onClick={() => tourner("gauche")} disabled={!voisine(windows, focusedId, "gauche")} aria-label={str("poche.croix.gauche")} data-testid="croix-gauche">
                <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"><path d="M1 7l8-6v12z" fill="currentColor" /></svg>
              </button>
              <button className="croix-centre" onClick={() => (fermerTiroirs(), onLayout("desktop"))} aria-label={str("poche.accueil")} data-testid="afficher-bureau">
                <svg width="18" height="18" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 11l8-7 8 7M5 9v9h4v-5h4v5h4V9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="miter" /></svg>
              </button>
              <button className="croix-b croix-droite" onClick={() => tourner("droite")} disabled={!voisine(windows, focusedId, "droite")} aria-label={str("poche.croix.droite")} data-testid="croix-droite">
                <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true"><path d="M9 7L1 1v12z" fill="currentColor" /></svg>
              </button>
              <button className="croix-b croix-bas" onClick={() => defiler(1)} aria-label={str("poche.croix.bas")} data-testid="croix-bas">
                <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden="true"><path d="M7 9l6-8H1z" fill="currentColor" /></svg>
              </button>
            </div>
            <button className={`fb-bouton${taches ? " actif" : ""}`} onClick={() => (setOpen(false), setTaches((t) => !t))} aria-label={str("poche.taches")} aria-expanded={taches} data-testid="taches-bouton">
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="3" y="6" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M7 3h12v12" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
              {windows.length > 0 && <i className="fb-compte">{windows.length}</i>}
            </button>
            <button className="fb-bouton fb-courrier" onClick={() => (fermerTiroirs(), openApp("mail"))} aria-label={str("poche.courrier")} data-testid="raccourci-courrier">
              <svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true"><path d="M2 2h20v14H2zM2 2l10 8 10-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="miter" /></svg>
              {nonLus > 0 && <i className="fb-voyant" aria-hidden="true" />}
            </button>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      {open && menuDemarrer()}
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
        {tray}
      </nav>
    </>
  );
}
