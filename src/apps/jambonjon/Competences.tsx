"use client";
import { useOs } from "@/os/context";
import { coefficients, DEBLOCAGES, rangMaximum, SEUILS_RANGS } from "./equilibrage";
import { estRefuge } from "./refuge";
import type { Action, Partie } from "./logic";
import { mesureCompetence, palierInnee, SLOTS_ACTIFS } from "./rpg";

export function Competences({ partie, agir, fermer }: { partie: Partie; agir: (a: Action) => void; fermer: () => void }) {
  const { pack, str } = useOs();
  const j = partie.joueur, r = j.rpg!;
  const c = coefficients(r.classe, r.rangs);
  const chevalier = pack.jambonjon.rpg!.chevaliers.find((n) => n.id === r.chevalier)!;
  return <section className="jbj-rpg-panel" data-testid="jbj-competences" aria-label={str("jbj.rpg.competences")}>
    <header><div><h2>{str("jbj.rpg.competences")}</h2><span>{chevalier.nom} · {str(`jbj.rpg.${r.classe}`)}</span></div><button className="pk-btn" onClick={fermer} data-testid="jbj-fermer-competences">{str("jbj.rpg.retour")}</button></header>
    <div className="jbj-rpg-panel-corps">
      <article className="jbj-innee"><img className="jbj-blason-innee" src={`/ordre-cochon/blasons/${chevalier.id}.png`} width={32} height={32} alt="" draggable={false}/><b>{str("jbj.rpg.innee")} · {chevalier.innee}</b><p>{chevalier.effet}</p><span>{str("jbj.rpg.inneePalier", { n: palierInnee(j.niveau) + 1 })}</span></article>
      <p className="jbj-points" data-testid="jbj-points">{str("jbj.rpg.points", { n: r.points })}</p>
      <div className="jbj-competences-grille">
        {pack.jambonjon.rpg!.competences[r.classe].map((competence, i) => {
          const rang = r.rangs[i]!;
          const max = rangMaximum(j.niveau, i);
          const slot = SLOTS_ACTIFS.findIndex((n) => n === i);
          const requis = Math.max(DEBLOCAGES[i]!, SEUILS_RANGS[rang] ?? 20);
          const mesure = mesureCompetence(partie, i);
          return <article className={`jbj-competence ${max === 0 ? "verrouillee" : ""}`} key={i} data-testid={`jbj-competence-${i}`}>
            <div className="jbj-competence-entete"><b>{competence.nom}</b><span>{str(slot >= 0 ? "jbj.rpg.active" : "jbj.rpg.passive")}</span></div>
            <p>{competence.effet}</p>
            <div className="jbj-rangs" aria-label={str("jbj.rpg.rang", { n: rang })}>{[1, 2, 3, 4, 5].map((n) => <i className={n <= rang ? "plein" : ""} key={n}/>)}</div>
            {rang > 0 && <small className="jbj-valeur">{str(mesure.cle, { n: mesure.n })}</small>}
            {slot >= 0 && <small>{str(c.couts[slot]! ? "jbj.rpg.cout" : "jbj.rpg.physique", { n: c.couts[slot]! })} · {str("jbj.rpg.recuperation", { n: c.delais[slot]! })}</small>}
            <button className="pk-btn" onClick={() => agir({ type: "apprendre", competence: i })} disabled={!r.points || rang >= max} data-testid={`jbj-apprendre-${i}`}>{str(rang === 5 ? "jbj.rpg.maximum" : rang >= max ? "jbj.rpg.niveauRequis" : "jbj.rpg.ameliorer", { n: requis })}</button>
          </article>;
        })}
      </div>
      <button className="pk-btn" onClick={() => agir({ type: "repartir" })} data-testid="jbj-repartir" disabled={!estRefuge(partie)} title={str("jbj.rpg.refugeRequis")}>{str("jbj.rpg.repartir")}</button>
    </div>
  </section>;
}
