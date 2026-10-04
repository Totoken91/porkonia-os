"use client";
import { useState } from "react";
import { useOs } from "@/os/context";
import type { ClasseRpg } from "./equilibrage";

export function Chevaliers({ choisir, annuler, reprise }: { choisir: (id: string) => void; annuler: () => void; reprise: boolean }) {
  const { pack, str } = useOs();
  const [classe, setClasse] = useState<ClasseRpg>("tank");
  const [selection, setSelection] = useState("berthe");
  const chevaliers = pack.jambonjon.rpg!.chevaliers;
  const choisi = chevaliers.find((c) => c.id === selection)!;
  return <div className="jbj jbj-choix" data-testid="jbj-chevaliers">
    <header><h2>{str("jbj.rpg.choix")}</h2><button className="pk-btn" onClick={annuler}>{str("jbj.rpg.retour")}</button></header>
    <div className="jbj-classes" role="tablist" aria-label={str("jbj.rpg.choix")}>
      {(["tank", "dps", "jambonmancien"] as const).map((c) => <button key={c} role="tab" aria-selected={classe === c} className={`pk-btn ${classe === c ? "choisi" : ""}`} onClick={() => { setClasse(c); setSelection(chevaliers.find((n) => n.classe === c)!.id); }} data-testid={`jbj-classe-${c}`}>{str(`jbj.rpg.${c}`)}</button>)}
    </div>
    <p className="jbj-classe-devise">{str(`jbj.rpg.${classe}Jeu`)}</p>
    <div className="jbj-choix-corps">
      <div className="jbj-chevaliers-grille">
        {chevaliers.filter((c) => c.classe === classe).map((c) => <button key={c.id} className={`jbj-chevalier ${selection === c.id ? "choisi" : ""}`} aria-pressed={selection === c.id} onClick={() => setSelection(c.id)} data-testid={`jbj-chevalier-${c.id}`}>
          <img className="jbj-blason" src={`/ordre-cochon/blasons/${c.id}.png`} width={64} height={64} alt="" draggable={false}/><b>{c.nom}</b><span>{c.innee}</span>
        </button>)}
      </div>
      <article className="jbj-chevalier-fiche" aria-live="polite">
        <h3>{choisi.nom}</h3><p>{choisi.histoire}</p><hr/><b>{str("jbj.rpg.innee")} · {choisi.innee}</b><p>{choisi.effet}</p>
      </article>
    </div>
    <footer><button className="pk-btn" onClick={() => choisir(selection)} data-testid="jbj-partir">{str(reprise ? "jbj.rpg.reprendre" : "jbj.rpg.partir")}</button></footer>
  </div>;
}
