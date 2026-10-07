"use client";
/**
 * Moniteur d'État 14" : boîtier beige, tube cathodique 800×600 (lignes, grille RGB, reflet, bombé),
 * bouton marche/arrêt, démagnétisation et voyant. Mis à l'échelle de la fenêtre du navigateur.
 * Sur un téléphone, le PorkOS Poche : plus de boîtier, l'écran épouse l'appareil (zones sûres comprises).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { EcranContext, ScaleContext } from "@/os/context";
import { echelle } from "@/os/echelle";
import { choisirEcran, choixDansAdresse, MONITEUR, type ChoixEcran } from "@/os/ecran";
import { ambiance, glouglou, jouer } from "@/os/sons";
import { usePleinEcran } from "@/os/pleinEcran";
import { cursorCss } from "./pixel";
import { InfoBulles } from "./InfoBulles";
import { boireVerres, useIvresse } from "@/os/ivresseStore";
import { prendreSaucisson, useGardeManger } from "@/os/saucissonStore";
import { prendreBiere, useCave } from "@/os/biereStore";
import { intensite, stade } from "@/os/ivresse";

export const SCREEN = MONITEUR;
const COQUE = { x: 58, top: 52, bottom: 82 };
/** Démarrage et ambiance sont calés au même niveau : la boucle prolonge le régime établi du démarrage. */
const VOLUME_MACHINE = 0.3;

type Tube = "allumage" | "allume" | "extinction" | "eteint";

interface Props {
  children: React.ReactNode;
  crt: number;
  power: boolean;
  onPower(): void;
  sons: boolean;
  /** Pixels nets : échelle entière imposée, quitte à afficher un écran plus petit. */
  nette: boolean;
  /** Format choisi dans les réglages (l'adresse ?ecran=… l'emporte). */
  affichage: ChoixEcran;
  str(key: string): string;
}

/** Plein écran du navigateur (Android, ordinateur) : demandé au geste de l'utilisateur, ignoré s'il est refusé. */
export function demanderPleinEcran(el: Element = document.documentElement) {
  if (document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
}

export function Monitor({ children, crt, power, onPower, sons, nette, affichage, str }: Props) {
  const plein = usePleinEcran();
  const [box, setBox] = useState<{ vw: number; vh: number; dpr: number } | null>(null);
  const [choixAdresse, setChoixAdresse] = useState<ChoixEcran>("auto");
  // Zone sûre du Poche (encoche, barre d'accueil) : mesurée sur une sonde qui en porte les marges.
  const sonde = useRef<HTMLDivElement>(null);
  const [sure, setSure] = useState<{ w: number; h: number; x: number; y: number } | null>(null);
  const [ignore, setIgnore] = useState(false);
  const [tube, setTube] = useState<Tube>(power ? "allumage" : "eteint");
  // Tant qu'on n'a jamais allumé, une invitation clignote à côté du bouton d'alimentation.
  const [jamaisAllume, setJamaisAllume] = useState(!power);
  const premier = useRef(true);
  const allumeA = useRef(0);
  const [degauss, setDegauss] = useState(false);
  const verres = useIvresse();
  const cave = useCave();
  const gardeManger=useGardeManger();
  const [bouchee,setBouchee]=useState(false);
  const [gorgee, setGorgee] = useState(false);
  const ivre = intensite(verres);

  useEffect(() => {
    setChoixAdresse(choixDansAdresse(window.location.search));
    const on = () => {
      setBox({ vw: window.innerWidth, vh: window.innerHeight, dpr: window.devicePixelRatio || 1 });
      const r = sonde.current?.getBoundingClientRect();
      if (r) setSure({ w: r.width, h: r.height, x: r.left, y: r.top });
    };
    on();
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    window.visualViewport?.addEventListener("resize", on);
    const ro = typeof ResizeObserver !== "undefined" && sonde.current ? new ResizeObserver(on) : null;
    if (ro && sonde.current) ro.observe(sonde.current);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
      window.visualViewport?.removeEventListener("resize", on);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const debut = premier.current;
    premier.current = false;
    if (!power && debut) return; // éteinte au chargement : rien à animer
    if (power) {
      setJamaisAllume(false);
      setTube("allumage");
      if (sons) {
        jouer("allumage", 0.2);
        jouer("demarrage-pc", VOLUME_MACHINE);
      }
      allumeA.current = performance.now();
      const t = setTimeout(() => setTube("allume"), 1100);
      return () => clearTimeout(t);
    }
    setTube("extinction");
    const t = setTimeout(() => setTube("eteint"), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [power]);

  // Ronronnement de la machine allumée (ventilateur, secteur, sifflement du tube).
  useEffect(() => {
    // Juste après l'allumage, la boucle prend le relais à la fin du démarrage (fondu de 6,5 s à 7,5 s).
    const ecoule = (performance.now() - allumeA.current) / 1000;
    ambiance(power && sons, VOLUME_MACHINE, allumeA.current ? Math.max(0, 6.5 - ecoule) : 0);
    return () => ambiance(false);
  }, [power, sons]);

  const choix = choixAdresse !== "auto" ? choixAdresse : affichage;
  const ecran = box ? choisirEcran(sure?.w ?? box.vw, sure?.h ?? box.vh, choix) : choisirEcran(1366, 800);
  const poche = ecran.mode === "poche";
  const bezel = !poche && !!box && box.vw >= 720 && box.vh >= 520;
  const W = ecran.w + (bezel ? COQUE.x * 2 : 0);
  const H = ecran.h + (bezel ? COQUE.top + COQUE.bottom : 0);
  const fit = box ? Math.min((box.vw * (bezel ? 0.98 : 1)) / W, (box.vh * (bezel ? 0.98 : 1)) / H) : 1;
  const scale = poche ? 1 : box ? echelle(fit, box.dpr, nette) : 1;
  const zoom = Math.max(1, Math.round(scale));
  // Le Poche allège le tube : les effets coûteux (halo, convergence) fatiguent les petits processeurs.
  const crtEff = (poche ? crt * 0.45 : scale < 0.85 ? crt * 0.35 : crt) / 100;
  // Grain du tube : une petite tuile de bruit générée une fois, animée en CSS.
  const [grain, setGrain] = useState<string | null>(null);
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    if (!g) return;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    setGrain(c.toDataURL());
  }, []);
  const curseurs = useMemo(
    () =>
      ({
        "--c-fleche": cursorCss("fleche", zoom),
        "--c-sablier": cursorCss("sablier", zoom, "progress"),
        "--c-main": cursorCss("main", zoom, "pointer"),
      }) as React.CSSProperties,
    [zoom],
  );
  if (!box)
    return (
      <div className="piece">
        <div className="sonde-sure" ref={sonde} aria-hidden="true" />
      </div>
    );
  const portrait = !poche && box.vh > box.vw && box.vw < 600;

  // Un bouton physique ne garde pas le focus : sinon Espace (pour passer le BIOS) rééteindrait la machine.
  const appuyer = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    // Sur un téléphone, allumer passe aussi l'appareil en plein écran (quand le navigateur le permet).
    if (poche && !power) demanderPleinEcran();
    onPower();
  };

  const demagnetiser = () => {
    if (degauss || !power) return;
    setDegauss(true);
    if (sons) jouer("demagnetiser", 0.7);
    setTimeout(() => setDegauss(false), 1300);
  };

  return (
    <div className={`piece${poche ? " poche" : ""}`}>
      <div className="sonde-sure" ref={sonde} aria-hidden="true" />
      <div style={{ width: W * scale, height: H * scale }}>
        <div className={bezel ? "moniteur" : "moniteur nu"} style={{ width: W, height: H, transform: scale === 1 ? undefined : `scale(${scale})` }}>
          <div className="coque">
            <div className="cadre-tube">
              <div
                className={`ecran tube-${tube}${degauss ? " degauss" : ""}${poche ? " poche" : ""}`}
                style={{ width: ecran.w, height: ecran.h, "--crt": crtEff, "--grain": grain ? `url(${grain})` : "none", "--haut": `${ecran.haut}px`, "--bas": `${ecran.bas}px`, ...curseurs } as React.CSSProperties}
                data-mode={ecran.mode}
              >
                {/* Aberration chromatique : rouge et bleu légèrement décalés, comme sur un tube mal convergé. */}
                <svg className="filtres-crt" aria-hidden="true" width="0" height="0">
                  <filter id="crt-convergence" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
                    <feOffset in="r" dx={0.25 + 0.75 * crtEff} dy="0" result="r2" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="v" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
                    <feOffset in="b" dx={-(0.25 + 0.75 * crtEff)} dy="0" result="b2" />
                    {/* Au bord, le canal décalé manque d'une colonne : on y remet le canal d'origine (sinon liseré coloré). */}
                    <feComposite in="r2" in2="r" operator="over" result="r3" />
                    <feComposite in="b2" in2="b" operator="over" result="b3" />
                    <feBlend in="r3" in2="v" mode="screen" result="rv" />
                    <feBlend in="rv" in2="b3" mode="screen" />
                  </filter>
                </svg>
                {ivre > 0 && !poche && (
                  <svg className="filtres-crt" aria-hidden="true" width="0" height="0">
                    {/* Ivresse : l'image ondule (déplacement par bruit) et se dédouble, de plus en plus fort. */}
                    <filter id="ivresse" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
                      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.014" numOctaves="2" seed="3" result="bruit">
                        <animate attributeName="baseFrequency" dur="9s" values="0.006 0.014;0.011 0.008;0.006 0.014" repeatCount="indefinite" />
                      </feTurbulence>
                      <feDisplacementMap in="SourceGraphic" in2="bruit" scale={6 + ivre * 64} xChannelSelector="R" yChannelSelector="G" result="ondule" />
                      <feOffset in="ondule" dx={4 + ivre * 22} dy={ivre * 6} result="fantome" />
                      <feBlend in="ondule" in2="fantome" mode="lighten" />
                    </filter>
                  </svg>
                )}
                <div
                  className={`tube${crtEff > 0.12 && !poche ? " convergence" : ""}${ivre > 0 ? ` ivre ivre-${stade(verres)}${poche ? " ivre-poche" : ""}` : ""}`}
                  style={ivre > 0 ? ({ "--ivre": ivre.toFixed(3) } as React.CSSProperties) : undefined}
                >
                  {tube !== "eteint" && (
                    <EcranContext.Provider value={ecran}>
                      <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
                    </EcranContext.Provider>
                  )}
                </div>
                {tube !== "eteint" && !poche && <InfoBulles />}
                <div className="crt crt-lignes" aria-hidden="true" />
                <div className="crt crt-grain" aria-hidden="true" />
                <div className="crt crt-grille" aria-hidden="true" />
                <div className="crt crt-roulant" aria-hidden="true" />
                <div className="crt crt-vignette" aria-hidden="true" />
                <div className="crt crt-reflet" aria-hidden="true" />
                <div className="crt crt-lueur" aria-hidden="true" />
              </div>
            </div>
            {bezel && (
              <div className="facade">
                <span className="marque">
                  <img src="/brand/embleme-64.png" alt="" width={18} height={18} />
                  PORKONIA
                </span>
                <span className="modele">Moniteur d&apos;État 14&quot; · 800×600 · Homologué</span>
                <span className="commandes">
                  {plein.disponible && (
                    <button
                      className="bouton-plein"
                      onClick={plein.basculer}
                      aria-pressed={plein.actif}
                      title={str(plein.actif ? "moniteur.quitterPleinEcran" : "moniteur.pleinEcran")}
                      aria-label={str(plein.actif ? "moniteur.quitterPleinEcran" : "moniteur.pleinEcran")}
                      data-testid="plein-ecran"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                        <path d={plein.actif ? "M4 1v3H1M8 1v3h3M4 11V8H1M8 11V8h3" : "M1 4V1h3M11 4V1H8M1 8v3h3M11 8v3H8"} fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                  )}
                  <button className="bouton-rond" onClick={demagnetiser} title={str("moniteur.demagnetiser")} aria-label={str("moniteur.demagnetiser")} data-testid="degauss">
                    <i />
                  </button>
                  <span className={`voyant${power ? " allume" : ""}`} aria-hidden="true" />
                  {jamaisAllume && !power && (
                    <span className="invite-allumer" aria-hidden="true">
                      {str("moniteur.allumer")} ▸
                    </span>
                  )}
                  <button className="bouton-marche" onClick={appuyer} aria-pressed={power} title={str("moniteur.alimentation")} aria-label={str("moniteur.alimentation")} data-testid="power">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {poche && !power && tube === "eteint" && (
        <div className="poche-eteint">
          <img src="/brand/embleme-128.png" alt="" width={96} height={96} />
          <b>PorkOS</b>
          <span>{str("poche.modele")}</span>
          <button className="bouton-allumer" onClick={appuyer} aria-pressed={false} aria-label={str("moniteur.alimentation")} data-testid="power">
            <svg width="28" height="28" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
          <span className="invite-allumer">{str("moniteur.allumer")}</span>
        </div>
      )}
      {!bezel && !poche && jamaisAllume && !power && (
        <span className="invite-allumer flottant" aria-hidden="true">
          {str("moniteur.allumer")} ▸
        </span>
      )}
      {!bezel && !poche && (
        <button className="bouton-marche flottant" onClick={appuyer} aria-pressed={power} aria-label={str("moniteur.alimentation")} data-testid="power">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {cave.stock > 0 && tube !== "eteint" && (
        <button
          className={`choppe${gorgee ? " boit" : ""}`}
          onClick={(e) => {
            e.currentTarget.blur();
            if (gorgee || !prendreBiere()) return;
            setGorgee(true);
            if (sons) glouglou(0.5);
            boireVerres(1);
            setTimeout(() => setGorgee(false), 1000);
          }}
          title={str("porkomazon.choppe")}
          aria-label={str("porkomazon.choppe")}
          data-testid="choppe"
        >
          <img src="/brand/biere-douzi.png" alt="" width={84} height={126} draggable={false} />
          <span className="choppe-n">{cave.stock}</span>
        </button>
      )}
      {gardeManger.stock > 0 && tube !== "eteint" && <button
        className={`saucisson-table${bouchee?" mange":""}`}
        data-testid="saucisson-table" title={str("porkomazon.mangerSaucisson")} aria-label={str("porkomazon.mangerSaucisson")}
        onClick={e=>{e.currentTarget.blur();if(bouchee||!prendreSaucisson())return;setBouchee(true);setTimeout(()=>setBouchee(false),700);}}
      >
        <img src="/brand/saucisson-planche.png" alt="" width={148} height={96} draggable={false}/>
        <span className="choppe-n">{gardeManger.stock}</span>
      </button>}
      {portrait && !ignore && (
        <div className="rotation">
          <p>{str("ecran.rotation")}</p>
          <button className="pk-btn" onClick={() => setIgnore(true)}>
            {str("ecran.continuer")}
          </button>
        </div>
      )}
    </div>
  );
}
