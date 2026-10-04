"use client";
import { useOs } from '@/os/context';
import { estRefuge, reposDisponible } from './refuge';
import type { Action, Partie } from './logic';

export function Refuge({partie,agir,competences}:{partie:Partie;agir:(a:Action)=>void;competences:()=>void}) {
  const {str}=useOs();
  if(!estRefuge(partie))return null;
  return <section className="jbj-refuge" data-testid="jbj-refuge" aria-label={str('jbj.refuge.titre')}>
    <strong>{str(`jbj.refuge.nom${partie.etage}`)}</strong>
    <span className="jbj-refuge-detail">{str('jbj.refuge.description')}</span>
    <div>
      <button className="pk-btn" data-testid="jbj-reposer" onClick={()=>agir({type:'reposer'})} disabled={!reposDisponible(partie)}>{str(reposDisponible(partie)?'jbj.refuge.reposer':'jbj.refuge.repose')}</button>
      <button className="pk-btn" onClick={competences}>{str('jbj.rpg.competences')}</button>
      <button className="pk-btn" data-testid="jbj-refuge-descendre" disabled={partie.carte.cases[partie.joueur.y*partie.carte.w+partie.joueur.x]!==2} title={str('jbj.refuge.escalier')} onClick={()=>agir({type:'agir'})}>{str('jbj.refuge.continuer')}</button>
    </div>
  </section>;
}
