"use client";
/**
 * Moniteur d'État 14" : boîtier beige, tube cathodique 800×600 (lignes, grille RGB, reflet, bombé),
 * bouton marche/arrêt, démagnétisation et voyant. Mis à l'échelle de la fenêtre du navigateur.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ScaleContext } from "@/os/context";
import { echelle } from "@/os/echelle";
import { ambiance, jouer } from "@/os/sons";
import { cursorCss } from "./pixel";
import { InfoBulles } from "./InfoBulles";

export const SCREEN = { w: 800, h: 600 };
const COQUE = { x: 58, top: 52, bottom: 82 };
/** Démarrage et ambiance sont calés au même niveau : la boucle prolonge le régime établi du démarrage. */
const VOLUME_MACHINE = 0.6;

type Tube = "allumage" | "allume" | "extinction" | "eteint";

interface Props {
  children: React.ReactNode;
  crt: number;
  power: boolean;
  onPower(): void;
  sons: boolean;
  /** Pixels nets : échelle entière imposée, quitte à afficher un écran plus petit. */
  nette: boolean;
  str(key: string): string;
}

export function Monitor({ children, crt, power, onPower, sons, nette, str }: Props) {
  const [box, setBox] = useState<{ vw: number; vh: number; dpr: number } | null>(null);
  const [ignore, setIgnore] = useState(false);
  const [tube, setTube] = useState<Tube>(power ? "allumage" : "eteint");
  // Tant qu'on n'a jamais allumé, une invitation clignote à côté du bouton d'alimentation.
  const [jamaisAllume, setJamaisAllume] = useState(!power);
  const premier = useRef(true);
  const allumeA = useRef(0);
  const [degauss, setDegauss] = useState(false);

  useEffect(() => {
    const on = () => setBox({ vw: window.innerWidth, vh: window.innerHeight, dpr: window.devicePixelRatio || 1 });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const debut = premier.current;
    premier.current = false;
    if (!power && debut) return; // éteinte au chargement : rien à animer
    if (power) {
      setJamaisAllume(false);
      setTube("allumage");
      if (sons) {
        jouer("allumage", 0.4);
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

  const bezel = !!box && box.vw >= 720 && box.vh >= 520;
  const W = SCREEN.w + (bezel ? COQUE.x * 2 : 0);
  const H = SCREEN.h + (bezel ? COQUE.top + COQUE.bottom : 0);
  const fit = box ? Math.min((box.vw * (bezel ? 0.98 : 1)) / W, (box.vh * (bezel ? 0.98 : 1)) / H) : 1;
  const scale = box ? echelle(fit, box.dpr, nette) : 1;
  const zoom = Math.max(1, Math.round(scale));
  const crtEff = (scale < 0.85 ? crt * 0.35 : crt) / 100;
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
  if (!box) return <div className="piece" />;
  const portrait = box.vh > box.vw && box.vw < 600;

  // Un bouton physique ne garde pas le focus : sinon Espace (pour passer le BIOS) rééteindrait la machine.
  const appuyer = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    onPower();
  };

  const demagnetiser = () => {
    if (degauss || !power) return;
    setDegauss(true);
    if (sons) jouer("demagnetiser", 0.7);
    setTimeout(() => setDegauss(false), 1300);
  };

  return (
    <div className="piece">
      <div style={{ width: W * scale, height: H * scale }}>
        <div className={bezel ? "moniteur" : "moniteur nu"} style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <div className="coque">
            <div className="cadre-tube">
              <div
                className={`ecran tube-${tube}${degauss ? " degauss" : ""}`}
                style={{ width: SCREEN.w, height: SCREEN.h, "--crt": crtEff, "--grain": grain ? `url(${grain})` : "none", ...curseurs } as React.CSSProperties}
              >
                {/* Aberration chromatique : rouge et bleu légèrement décalés, comme sur un tube mal convergé. */}
                <svg className="filtres-crt" aria-hidden="true" width="0" height="0">
                  <filter id="crt-convergence" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
                    <feOffset in="r" dx={0.25 + 0.75 * crtEff} dy="0" result="r2" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="v" />
                    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
                    <feOffset in="b" dx={-(0.25 + 0.75 * crtEff)} dy="0" result="b2" />
                    <feBlend in="r2" in2="v" mode="screen" result="rv" />
                    <feBlend in="rv" in2="b2" mode="screen" />
                  </filter>
                </svg>
                <div className={`tube${crtEff > 0.12 ? " convergence" : ""}`}>
                  {tube !== "eteint" && <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>}
                </div>
                {tube !== "eteint" && <InfoBulles />}
                <div className="crt crt-halo" aria-hidden="true" />
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
      {!bezel && jamaisAllume && !power && (
        <span className="invite-allumer flottant" aria-hidden="true">
          {str("moniteur.allumer")} ▸
        </span>
      )}
      {!bezel && (
        <button className="bouton-marche flottant" onClick={appuyer} aria-pressed={power} aria-label={str("moniteur.alimentation")} data-testid="power">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
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
