"use client";
/** Mes décorations : les distinctions civiques du citoyen, obtenues ou à obtenir, et son rang. Tout vient du pack. */
import { useState } from "react";
import type { Distinction } from "@/content/types";
import { useMenuCommands, useOs } from "@/os/context";
import { rang } from "@/os/distinctions";

type Filtre = "toutes" | "obtenues" | "manquantes";

const METAL: Record<Distinction["metal"], [string, string, string]> = {
  or: ["#ffeb8a", "#f5c542", "#8a5a0a"],
  argent: ["#ffffff", "#c0c0c0", "#5a5a5a"],
  bronze: ["#f0b27a", "#c07838", "#6e4318"],
};

/** Médaille pendue à son ruban, dessinée au pixel ; grisée tant qu'elle n'est pas obtenue. */
function Medaille({ metal, obtenue }: { metal: Distinction["metal"]; obtenue: boolean }) {
  const [reflet, base, ombre] = obtenue ? METAL[metal] : ["#e0d8c4", "#c9bea3", "#8f836a"];
  const ruban = obtenue ? "#b0141c" : "#b3a384";
  const liseré = obtenue ? "#f5c542" : "#d6ccb4";
  return (
    <svg width="26" height="34" viewBox="0 0 26 34" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="7" y="0" width="12" height="13" fill="#000" />
      <rect x="8" y="0" width="10" height="12" fill={ruban} />
      <rect x="12" y="0" width="2" height="12" fill={liseré} />
      <rect x="6" y="12" width="14" height="3" fill="#000" />
      <rect x="7" y="13" width="12" height="1" fill={liseré} />
      <circle cx="13" cy="24" r="9.5" fill="#000" />
      <circle cx="13" cy="24" r="8.5" fill={ombre} />
      <circle cx="12.5" cy="23.5" r="7.5" fill={base} />
      <rect x="8" y="19" width="2" height="2" fill={reflet} />
      <rect x="10" y="18" width="2" height="1" fill={reflet} />
      {/* groin en relief */}
      <ellipse cx="13" cy="24" rx="3.5" ry="2.5" fill="none" stroke={ombre} strokeWidth="1" />
      <rect x="11" y="24" width="1" height="1" fill={ombre} />
      <rect x="14" y="24" width="1" height="1" fill={ombre} />
    </svg>
  );
}

export function Distinctions() {
  const { pack, str, distinctions: etat } = useOs();
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  useMenuCommands(
    { "decor.filtre": (f) => f && setFiltre(f as Filtre) },
    Object.fromEntries((["toutes", "obtenues", "manquantes"] as const).map((f) => [`decor.filtre:${f}`, { checked: f === filtre }])),
  );
  const defs = pack.distinctions;
  const n = defs.filter((d) => etat.obtenues[d.id]).length;
  const visibles = defs.filter((d) => (filtre === "toutes" ? true : filtre === "obtenues" ? !!etat.obtenues[d.id] : !etat.obtenues[d.id]));
  const cases = 20;
  const pleines = Math.round((n / Math.max(1, defs.length)) * cases);

  return (
    <div className="app-col decor">
      <div className="decor-tete">
        <Medaille metal="or" obtenue={n > 0} />
        <div>
          <b data-testid="decor-rang">{str("distinctions.rang", { rang: rang(pack.rangs, n) })}</b>
          <span>{str("distinctions.compte", { n, total: defs.length })}</span>
          <div className="decor-jauge" role="progressbar" aria-valuemin={0} aria-valuemax={defs.length} aria-valuenow={n}>
            {Array.from({ length: cases }, (_, i) => (
              <i key={i} className={i < pleines ? "plein" : undefined} />
            ))}
          </div>
        </div>
      </div>
      <ul className="decor-liste" data-testid="decor-liste">
        {!visibles.length && <li className="decor-vide">{str("distinctions.aucune")}</li>}
        {visibles.map((d) => {
          const date = etat.obtenues[d.id];
          const secret = !date && !d.indice;
          return (
            <li key={d.id} className={date ? "obtenue" : "manquante"} data-testid={`decor-${d.id}`}>
              <Medaille metal={d.metal} obtenue={!!date} />
              <div>
                <b>{secret ? str("distinctions.secret") : d.titre}</b>
                <p>{date ? d.motif : secret ? "???" : d.indice}</p>
                {date && <small>{str("distinctions.le", { date: new Date(date).toLocaleDateString("fr-FR") })}</small>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
