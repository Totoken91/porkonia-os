import type { MonstreDef } from '@/content/types';
import type { Monstre, Partie } from './logic';

export type CaseMenace = { x: number; y: number };
export type AnnonceBoss = CaseMenace & { cases?: CaseMenace[] };
const directions = [[0,-1],[1,0],[0,1],[-1,0]] as const;
export function casesMenace(annonce: AnnonceBoss): CaseMenace[] { return annonce.cases ?? [annonce]; }
export function menaceSur(annonce: AnnonceBoss, cible: CaseMenace): boolean {
  return casesMenace(annonce).some(c => c.x === cible.x && c.y === cible.y);
}
/** Les marques restent fixes. Une sortie en un pas est garantie même dans un couloir. */
export function preparerAttaqueBoss(p: Partie, m: Monstre, attaque: MonstreDef['attaqueBoss']): AnnonceBoss {
  const j = p.joueur;
  const ouverte = (x:number,y:number) => x>=0 && y>=0 && x<p.carte.w && y<p.carte.h && p.carte.cases[y*p.carte.w+x] !== 1;
  let cases: CaseMenace[] = [{x:j.x,y:j.y}];
  if (attaque === 'ligne') {
    const dx=Math.sign(j.x-m.x),dy=Math.sign(j.y-m.y);
    cases=[];
    for(let n=1;n<=4;n++) { const x=m.x+dx*n,y=m.y+dy*n; if(!ouverte(x,y))break; cases.push({x,y}); }
  } else if (attaque === 'pressoir') {
    cases=directions.map(([dx,dy])=>({x:m.x+dx,y:m.y+dy})).filter(c=>ouverte(c.x,c.y));
  } else if (attaque === 'sceau') {
    const voisine=directions.map(([dx,dy])=>({x:j.x+dx,y:j.y+dy})).find(c=>ouverte(c.x,c.y)&&!(c.x===m.x&&c.y===m.y));
    if(voisine)cases.push(voisine);
  }
  const echappe=directions.some(([dx,dy])=>{
    const x=j.x+dx,y=j.y+dy;
    return ouverte(x,y)&&!p.monstres.some(n=>n.x===x&&n.y===y)&&!cases.some(c=>c.x===x&&c.y===y);
  });
  if(!echappe)cases=directions.some(([dx,dy])=>ouverte(j.x+dx,j.y+dy)&&!p.monstres.some(n=>n.x===j.x+dx&&n.y===j.y+dy))?[{x:j.x,y:j.y}]:[];
  return {x:j.x,y:j.y,cases};
}

export function ligneEntre(p:Partie,a:CaseMenace,b:CaseMenace):boolean {
  let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=-Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1;let erreur=dx+dy;
  while(x!==b.x||y!==b.y){const e=2*erreur;if(e>=dy){erreur+=dy;x+=sx;}if(e<=dx){erreur+=dx;y+=sy;}if(p.carte.cases[y*p.carte.w+x]===1)return false;}
  return true;
}
