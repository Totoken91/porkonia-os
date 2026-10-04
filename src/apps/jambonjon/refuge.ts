import type { Partie } from './logic';
/** L'escalier de fin d'acte est sûr après la victoire et la fin des poursuites. */
export function estRefuge(p: Partie): boolean {
  const j=p.joueur;
  const coin=p.carte.coinRepos;
  const dansHalte=coin?Math.abs(j.x-coin.x)<=2&&j.y>=1&&j.y<=3:p.carte.cases[j.y*p.carte.w+j.x]===2;
  return !!j.rpg && [3,6,9].includes(p.etage) && dansHalte
    && !p.fin && !p.monstres.some(m=>m.boss||m.eveille);
}
export const reposDisponible=(p:Partie)=>estRefuge(p)&&!p.refugesVisites?.includes(p.etage);
