import {describe,expect,it} from 'vitest';
import {porkosPack} from '../src/content/packs/porkos';
import {jouer,nouvellePartie,distances,stats} from '../src/apps/jambonjon/logic';
const jeu=porkosPack.jambonjon;
function salle(n=3){let p=nouvellePartie(jeu,42,'ysee');while(p.etage<n){const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.monstres=[];p=jouer(p,jeu,{type:'agir'});}p.monstres=p.monstres.filter(m=>m.boss);return p;}
describe('Gardiens dans leur salle',()=>{
  it.each([3,6,9,12])('étage %s : attend au poste plutôt que de poursuivre depuis l’entrée',n=>{
    let p=salle(n);const avant={x:p.monstres[0]!.x,y:p.monstres[0]!.y};
    for(let t=0;t<8;t++)p=jouer(p,jeu,{type:'attendre'});
    expect(p.monstres[0]).toMatchObject({...avant,eveille:false});
  });
  it('s’éveille lors d’une approche visible et conserve ses caractéristiques',()=>{
    let p=salle();const m=p.monstres[0]!,avant={pvMax:m.pvMax,att:m.att,def:m.def,xp:m.xp};
    p.joueur.x=m.x;p.joueur.y=m.y+3;p=jouer(p,jeu,{type:'attendre'});
    expect(p.monstres[0]).toMatchObject({...avant,eveille:true});expect(p.journal.some(e=>e.cle==='jbj.boss.entree')).toBe(true);
  });
  it('ne repère pas une approche cachée par un mur même à trois pas',()=>{
    const p=salle(),m=p.monstres[0]!;p.joueur.x=m.x-1;p.joueur.y=m.y-2;p.carte.cases[(m.y-1)*p.carte.w+m.x-1]=1;
    expect(distances(p.carte,p.joueur.x,p.joueur.y)[m.y*p.carte.w+m.x]).toBe(3);
    expect(jouer(p,jeu,{type:'attendre'}).monstres[0]!.eveille).toBe(false);
  });
  it('garde sa salle quand le joueur recule, sans annuler les blessures reçues',()=>{
    let p=salle();const g=jeu.campagne![2]!.gardien!;p.monstres[0]!.eveille=true;p.monstres[0]!.pv=50;
    p.joueur.x=g.x;p.joueur.y=12;p.joueur.niveau=20;p.joueur.rpg!.points=19;p.joueur.pv=stats(p.joueur).pvMax;
    for(let t=0;t<12;t++)p=jouer(p,jeu,{type:'attendre'});
    const m=p.monstres[0]!;expect(Math.abs(m.x-g.x)+Math.abs(m.y-g.y)).toBeLessThanOrEqual(2);expect(m.pv).toBe(50);
  });
  it('fait revenir un ancien gardien égaré par les cases libres, sans téléportation',()=>{
    const p=salle(),m=p.monstres[0]!,g=jeu.campagne![2]!.gardien!;m.x=g.x;m.y=10;m.eveille=true;
    const q=jouer(p,jeu,{type:'attendre'}),n=q.monstres[0]!;
    expect(Math.abs(n.x-m.x)+Math.abs(n.y-m.y)).toBe(1);expect(n.y).toBe(9);expect(n.pv).toBe(m.pv);
  });
});
