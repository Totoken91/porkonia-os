"use client";
/** Moniteur d'État : écran 800×600 réglementaire, mis à l'échelle de la fenêtre, dans son boîtier beige. */
import { useEffect, useState } from "react";
import { ScaleContext } from "@/os/context";

export const SCREEN = { w: 800, h: 600 };
const BEZEL = { x: 40, top: 36, bottom: 58 };

export function Monitor({ children, crt, marque, modele, rotation, continuer }: { children: React.ReactNode; crt: number; marque: string; modele: string; rotation: string; continuer: string }) {
  const [box, setBox] = useState<{ vw: number; vh: number } | null>(null);
  const [ignore, setIgnore] = useState(false);
  useEffect(() => {
    const on = () => setBox({ vw: window.innerWidth, vh: window.innerHeight });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  if (!box) return <div className="piece" />;

  const bezel = box.vw >= 720 && box.vh >= 520;
  const W = SCREEN.w + (bezel ? BEZEL.x * 2 : 0);
  const H = SCREEN.h + (bezel ? BEZEL.top + BEZEL.bottom : 0);
  const scale = Math.min((box.vw * (bezel ? 0.97 : 1)) / W, (box.vh * (bezel ? 0.97 : 1)) / H);
  const portrait = box.vh > box.vw && box.vw < 600;

  return (
    <div className="piece">
      <div style={{ width: W * scale, height: H * scale }}>
        <div className={bezel ? "moniteur" : "moniteur nu"} style={{ width: W, height: H, transform: `scale(${scale})` }}>
          <div className="ecran" style={{ width: SCREEN.w, height: SCREEN.h, "--crt": crt / 100 } as React.CSSProperties}>
            <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
          </div>
          {bezel && (
            <div className="plaque">
              <span className="marque">
                <img src="/brand/embleme-64.png" alt="" width={16} height={16} />
                {marque}
              </span>
              <span className="modele">{modele}</span>
              <span className="voyant" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
      {portrait && !ignore && (
        <div className="rotation">
          <p>{rotation}</p>
          <button className="pk-btn" onClick={() => setIgnore(true)}>
            {continuer}
          </button>
        </div>
      )}
    </div>
  );
}
