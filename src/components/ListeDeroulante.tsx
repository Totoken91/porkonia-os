"use client";
/**
 * Liste déroulante d'époque, dessinée maison : champ creusé, bouton à flèche en relief, liste qui se déroule
 * sous le champ. Remplace le <select> du navigateur, dont la liste moderne trahissait le poste de 1998.
 * Clavier : flèches, Début/Fin, Entrée ou Espace pour ouvrir et choisir, Échap pour refermer.
 */
import { useEffect, useId, useRef, useState } from "react";

export interface OptionListe<V extends string | number> {
  value: V;
  label: string;
  disabled?: boolean;
}

interface Props<V extends string | number> {
  value: V;
  options: OptionListe<NoInfer<V>>[];
  onChange(value: NoInfer<V>): void;
  "aria-label": string;
  testId?: string;
}

export function ListeDeroulante<V extends string | number>({ value, options, onChange, "aria-label": label, testId }: Props<V>) {
  const [ouverte, setOuverte] = useState(false);
  const [survol, setSurvol] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const racine = useRef<HTMLDivElement>(null);
  const id = useId();
  const choisie = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!ouverte) return;
    const dehors = (e: PointerEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuverte(false);
    };
    document.addEventListener("pointerdown", dehors, true);
    return () => document.removeEventListener("pointerdown", dehors, true);
  }, [ouverte]);

  const ouvrir = () => {
    setSurvol(Math.max(0, options.findIndex((o) => o.value === value)));
    setOuverte(true);
  };
  const choisir = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    onChange(o.value);
    setOuverte(false);
  };
  /** Option suivante disponible dans la direction `pas`, en restant dans la liste. */
  const voisine = (depart: number, pas: number) => {
    for (let i = depart + pas; i >= 0 && i < options.length; i += pas) if (!options[i]!.disabled) return i;
    return depart;
  };

  const clavier = (e: React.KeyboardEvent) => {
    const courant = ouverte ? survol : Math.max(0, options.findIndex((o) => o.value === value));
    let cible: number | null = null;
    if (e.key === "ArrowDown") cible = voisine(courant, 1);
    else if (e.key === "ArrowUp") cible = voisine(courant, -1);
    else if (e.key === "Home") cible = voisine(-1, 1);
    else if (e.key === "End") cible = voisine(options.length, -1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (ouverte) choisir(survol);
      else ouvrir();
      return;
    } else if (e.key === "Escape" && ouverte) {
      e.stopPropagation();
      setOuverte(false);
      return;
    } else return;
    e.preventDefault();
    // Fermée, les flèches changent directement la valeur, comme sur les listes d'époque.
    if (ouverte) setSurvol(cible);
    else choisir(cible);
  };

  return (
    <div className={`pk-liste${ouverte ? " ouverte" : ""}`} ref={racine}>
      <button
        type="button"
        className="pk-liste-champ"
        role="combobox"
        aria-label={label}
        aria-expanded={ouverte}
        aria-controls={id}
        data-testid={testId}
        onClick={() => (ouverte ? setOuverte(false) : ouvrir())}
        onKeyDown={clavier}
      >
        <span className="pk-liste-valeur">{choisie?.label}</span>
        <span className="pk-liste-fleche" aria-hidden="true">
          <svg width="7" height="4" viewBox="0 0 7 4"><path d="M0 0h7L3.5 4z" fill="currentColor" /></svg>
        </span>
      </button>
      {ouverte && (
        <ul className="pk-liste-options" role="listbox" id={id} aria-label={label}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              className={i === survol ? "survol" : undefined}
              onPointerEnter={() => !o.disabled && setSurvol(i)}
              onClick={() => choisir(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
