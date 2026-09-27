"use client";
/**
 * Moniteur d'État 14" : boîtier beige, tube cathodique 800×600 (lignes, grille RGB, reflet, bombé),
 * bouton marche/arrêt, démagnétisation, voyant et pied. Mis à l'échelle de la fenêtre du navigateur.
 */
import { useEffect, useMemo, useState } from "react";
import { ScaleContext } from "@/os/context";
import { jouer } from "@/os/sons";
import { cursorCss } from "./pixel";

export const SCREEN = { w: 800, h: 600 };
const COQUE = { x: 58, top: 52, bottom: 82, pied: 64 };

type Tube = "allumage" | "allume" | "extinction" | "eteint";

interface Props {
  children: React.ReactNode;
  crt: number;
  power: boolean;
  onPower(): void;
  sons: boolean;
  str(key: string): string;
}

export function Monitor({ children, crt, power, onPower, sons, str }: Props) {
  const [box, setBox] = useState<{ vw: number; vh: number } | null>(null);
  const [ignore, setIgnore] = useState(false);
  const [tube, setTube] = useState<Tube>("allumage");
  const [degauss, setDegauss] = useState(false);

  useEffect(() => {
    const on = () => setBox({ vw: window.innerWidth, vh: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    if (power) {
      setTube("allumage");
      if (sons) jouer("allumage", 0.6);
      const t = setTimeout(() => setTube("allume"), 1100);
      return () => clearTimeout(t);
    }
    setTube("extinction");
    const t = setTimeout(() => setTube("eteint"), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [power]);

  const bezel = !!box && box.vw >= 720 && box.vh >= 520;
  const W = SCREEN.w + (bezel ? COQUE.x * 2 : 0);
  const H = SCREEN.h + (bezel ? COQUE.top + COQUE.bottom + COQUE.pied : 0);
  const scale = box ? Math.min((box.vw * (bezel ? 0.98 : 1)) / W, (box.vh * (bezel ? 0.98 : 1)) / H) : 1;
  const zoom = Math.max(1, Math.round(scale));
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
                style={{ width: SCREEN.w, height: SCREEN.h, "--crt": crt / 100, ...curseurs } as React.CSSProperties}
              >
                <div className="tube">
                  {tube !== "eteint" && <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>}
                </div>
                <div className="crt crt-lignes" aria-hidden="true" />
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
                  <button className="bouton-marche" onClick={onPower} aria-pressed={power} title={str("moniteur.alimentation")} aria-label={str("moniteur.alimentation")} data-testid="power">
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                      <path d="M3.6 3.2a4 4 0 1 0 4.8 0M6 1.5v4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              </div>
            )}
          </div>
          {bezel && (
            <div className="pied" aria-hidden="true">
              <i className="col" />
              <i className="socle" />
            </div>
          )}
        </div>
      </div>
      {!bezel && (
        <button className="bouton-marche flottant" onClick={onPower} aria-pressed={power} aria-label={str("moniteur.alimentation")} data-testid="power">
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
