"use client";
/**
 * Date et heure, au clic sur l'horloge de la barre des tâches : calendrier du mois (feuilletable),
 * horloge à aiguilles, heure en chiffres. La date se constate ; elle ne se modifie pas.
 */
import { useEffect, useRef, useState } from "react";
import { useOs } from "@/os/context";
import { aiguilles, decaler, grilleMois } from "@/os/calendrier";

export function Calendrier({ onClose }: { onClose(): void }) {
  const { str, runAction } = useOs();
  const [now, setNow] = useState(() => new Date());
  const [vue, setVue] = useState(() => ({ annee: now.getFullYear(), mois: now.getMonth() }));
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  // Un clic ailleurs ou Échap referme, comme les menus.
  useEffect(() => {
    const dehors = (e: PointerEvent) => {
      if (!boite.current?.contains(e.target as Node) && !(e.target as HTMLElement | null)?.closest?.("[data-testid=horloge]")) onClose();
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", dehors, true);
    window.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("pointerdown", dehors, true);
      window.removeEventListener("keydown", echap);
    };
  }, [onClose]);

  const a = aiguilles(now);
  const semaines = grilleMois(vue.annee, vue.mois);
  const titre = new Date(vue.annee, vue.mois, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const estAujourdhui = (j: number) => j === now.getDate() && vue.mois === now.getMonth() && vue.annee === now.getFullYear();
  const aiguille = (angle: number, longueur: number, epaisseur: number, couleur: string) => (
    <line x1="40" y1="40" x2={40 + longueur * Math.sin((angle * Math.PI) / 180)} y2={40 - longueur * Math.cos((angle * Math.PI) / 180)} stroke={couleur} strokeWidth={epaisseur} strokeLinecap="square" />
  );

  return (
    <div ref={boite} className="pk-window focused calendrier" role="dialog" aria-label={str("cal.titre")} data-testid="calendrier">
      <header className="pk-titlebar">
        <h2>{str("cal.titre")}</h2>
      </header>
      <div className="calendrier-corps">
        <div className="calendrier-mois">
          <div className="calendrier-nav">
            <button className="pk-btn small" onClick={() => setVue(decaler(vue.annee, vue.mois, -1))} aria-label={str("cal.precedent")}>
              ◂
            </button>
            <b data-testid="calendrier-mois">{titre}</b>
            <button className="pk-btn small" onClick={() => setVue(decaler(vue.annee, vue.mois, 1))} aria-label={str("cal.suivant")}>
              ▸
            </button>
          </div>
          <table className="pk-sunken">
            <thead>
              <tr>
                {str("cal.jours")
                  .split(",")
                  .map((j, i) => (
                    <th key={i}>{j}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {semaines.map((s, i) => (
                <tr key={i}>
                  {s.map((j, k) => (
                    <td key={k} className={j === null ? undefined : `${estAujourdhui(j) ? "aujourdhui" : ""}${j === 12 ? " douze" : ""}`} title={j === 12 ? str("cal.douze") : undefined}>
                      {j ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="calendrier-horloge">
          <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="37" fill="#fffdf7" stroke="#6d5f45" strokeWidth="2" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={i % 3 === 0 ? 38.5 : 39} y="5" width={i % 3 === 0 ? 3 : 2} height={i % 3 === 0 ? 6 : 3} fill={i === 0 ? "#661323" : "#24201c"} transform={`rotate(${i * 30} 40 40)`} />
            ))}
            {aiguille(a.h, 20, 4, "#24201c")}
            {aiguille(a.m, 29, 3, "#24201c")}
            {aiguille(a.s, 31, 1, "#c01018")}
            <circle cx="40" cy="40" r="3" fill="#b58b4d" />
          </svg>
          <b className="calendrier-heure" data-testid="calendrier-heure">
            {now.toLocaleTimeString("fr-FR")}
          </b>
          <span className="note">{str("cal.fuseau")}</span>
        </div>
      </div>
      <div className="calendrier-pied">
        <button
          className="pk-btn"
          onClick={() =>
            runAction({
              type: "dialog",
              dialog: {
                title: str("barre.dateheure.titre"),
                icon: "info",
                body: str("barre.dateheure", { date: now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), heure: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }),
                buttons: [{ label: "OK" }],
              },
            })
          }
        >
          {str("cal.modifier")}
        </button>
        <button className="pk-btn" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}
