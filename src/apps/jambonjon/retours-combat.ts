/** Retours transitoires : dérivés du résultat réel, sans modifier le moteur ni le hasard. */
import { passable, stats, type Action, type Partie } from './logic';
import { disponible } from './rpg';
import { DEBLOCAGES } from './equilibrage';

export function cotesLibres(p:Partie) {
  const libre=(offset:number)=>{
    const d=(p.joueur.dir+offset)%4,x=p.joueur.x+[0,1,0,-1][d]!,y=p.joueur.y+[-1,0,1,0][d]!;
    return passable(p.carte,x,y)&&!p.monstres.some(m=>m.x===x&&m.y===y);
  };
  return {gauche:libre(3),droite:libre(1)};
}
/** null : seul cas où un choix tactique reste nécessaire. */
export function actionRapide(p:Partie,slot:number):Action|null {
  if(p.joueur.rpg?.classe==='dps'&&slot===1&&disponible(p,slot)) {
    const c=cotesLibres(p);
    if(c.gauche&&c.droite)return null;
    return {type:'competence',slot,cote:c.gauche?'gauche':c.droite?'droite':undefined};
  }
  return {type:'competence',slot};
}
export type StyleImpact='frappe'|'garde'|'butoir'|'revers'|'double'|'pas'|'execution'|'sel'|'rot'|'explosion'|'saignement';
export interface ImpactVisuel { uid:number;x:number;y:number;degats:number;mort:boolean;style:StyleImpact;debut:number }
export function impactsCombat(avant:Partie,apres:Partie,a:Action,debut:number):ImpactVisuel[] {
  if(apres.tour===avant.tour)return [];
  const classe=avant.joueur.rpg?.classe;
  const styles:Record<string,StyleImpact[]>={tank:['garde','butoir','revers'],dps:['double','pas','execution'],jambonmancien:['sel','rot','explosion']};
  const direct=a.type==='agir'||a.type==='competence'||a.type==='rot';
  const style=a.type==='competence'&&classe?styles[classe]?.[a.slot]??'frappe':a.type==='rot'?'rot':'frappe';
  return avant.monstres.flatMap(m=>{
    const survivant=apres.monstres.find(n=>n.uid===m.uid),degats=m.pv-(survivant?.pv??0);
    return degats>0?[{uid:m.uid,x:m.x+.5,y:m.y+.5,degats,mort:!survivant,style:direct?style:m.rpg?.malediction?'sel':'saignement',debut}]:[];
  });
}
export function gainsNiveau(avant:Partie,apres:Partie) {
  if(apres.joueur.niveau<=avant.joueur.niveau)return null;
  const a=stats(avant.joueur),b=stats(apres.joueur);
  return {niveau:apres.joueur.niveau,points:(apres.joueur.rpg?.points??0)-(avant.joueur.rpg?.points??0),
    pv:b.pvMax-a.pvMax,mousse:b.mousseMax-a.mousseMax,att:b.att-a.att,def:b.def-a.def,
    debloquees:DEBLOCAGES.flatMap((n,i)=>n>avant.joueur.niveau&&n<=apres.joueur.niveau?[i]:[])};
}
