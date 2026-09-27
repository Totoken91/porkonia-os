"use client";
/** Calculatrice d'État : clavier à la souris ou au clavier, afficheur à douze chiffres, remarques de l'afficheur. */
import { useEffect, useRef, useState } from "react";
import { useMenuCommands, useOs, useWin } from "@/os/context";
import { appuyer, calculNeuf, enFrancais, remarque, type Touche } from "./logic";

const TOUCHES: { l: string; k: Touche; cls?: string; titre?: string }[] = [
  { l: "C", k: { t: "c" }, cls: "rouge" },
  { l: "CE", k: { t: "ce" }, cls: "rouge" },
  { l: "±", k: { t: "signe" } },
  { l: "÷", k: { t: "op", v: "/" }, cls: "op" },
  { l: "×12", k: { t: "douzaine" }, cls: "or", titre: "calc.douzaine" },
  { l: "7", k: { t: "chiffre", v: "7" } },
  { l: "8", k: { t: "chiffre", v: "8" } },
  { l: "9", k: { t: "chiffre", v: "9" } },
  { l: "×", k: { t: "op", v: "*" }, cls: "op" },
  { l: "%", k: { t: "pourcent" } },
  { l: "4", k: { t: "chiffre", v: "4" } },
  { l: "5", k: { t: "chiffre", v: "5" } },
  { l: "6", k: { t: "chiffre", v: "6" } },
  { l: "−", k: { t: "op", v: "-" }, cls: "op" },
  { l: "=", k: { t: "egal" }, cls: "egal" },
  { l: "1", k: { t: "chiffre", v: "1" } },
  { l: "2", k: { t: "chiffre", v: "2" } },
  { l: "3", k: { t: "chiffre", v: "3" } },
  { l: "+", k: { t: "op", v: "+" }, cls: "op plus" },
  { l: "0", k: { t: "chiffre", v: "0" }, cls: "zero" },
  { l: ",", k: { t: "virgule" } },
];

export function Calculatrice() {
  const { str } = useOs();
  const { focused } = useWin();
  const [c, setC] = useState(calculNeuf);
  const [appuyee, setAppuyee] = useState<string | null>(null);
  const presser = (l: string, k: Touche) => {
    setC((x) => appuyer(x, k));
    setAppuyee(l);
    setTimeout(() => setAppuyee((a) => (a === l ? null : a)), 90);
  };
  useMenuCommands({ "calc.copier": () => void navigator.clipboard?.writeText(enFrancais(c.affichage)).catch(() => {}) }, { "calc.standard": { checked: true } });

  // Clavier du poste, quand la calculatrice est au premier plan.
  const presserRef = useRef(presser);
  presserRef.current = presser;
  useEffect(() => {
    if (!focused) return;
    const f = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest?.("input, textarea")) return;
      const k = e.key;
      const p = presserRef.current;
      if (/^[0-9]$/.test(k)) p(k, { t: "chiffre", v: k });
      else if (k === "," || k === ".") p(",", { t: "virgule" });
      else if (k === "+") p("+", { t: "op", v: "+" });
      else if (k === "-") p("−", { t: "op", v: "-" });
      else if (k === "*" || k === "x") p("×", { t: "op", v: "*" });
      else if (k === "/") p("÷", { t: "op", v: "/" });
      else if (k === "Enter" || k === "=") p("=", { t: "egal" });
      else if (k === "Escape") p("C", { t: "c" });
      else if (k === "Backspace" || k === "Delete") p("CE", { t: "ce" });
      else if (k === "%") p("%", { t: "pourcent" });
      else if (k === "d" || k === "D") p("×12", { t: "douzaine" });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [focused]);

  const note = remarque(c);
  return (
    <div className="app-col calc">
      <div className="calc-ecran pk-sunken" data-testid="calc-ecran" aria-live="polite">
        <span className="calc-op">{c.op ? { "+": "+", "-": "−", "*": "×", "/": "÷" }[c.op] : ""}</span>
        <b>{c.erreur ? "E" : enFrancais(c.affichage)}</b>
      </div>
      <div className="calc-note" data-testid="calc-note">
        {note ? str(note) : " "}
      </div>
      <div className="calc-touches">
        {TOUCHES.map(({ l, k, cls, titre }) => (
          <button key={l} className={`pk-btn calc-touche${cls ? ` ${cls}` : ""}${appuyee === l ? " enfoncee" : ""}`} onClick={() => presser(l, k)} title={titre ? str(titre) : undefined} data-testid={`calc-${l}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
