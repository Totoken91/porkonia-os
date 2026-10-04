import {describe,expect,it} from 'vitest';
import {porkosPack} from '../src/content/packs/porkos';
import {jouer,nouvellePartie,relirePartie,stats} from '../src/apps/jambonjon/logic';
import {estRefuge,reposDisponible} from '../src/apps/jambonjon/refuge';
import {composerAmbiance} from '../src/apps/jambonjon/ambiance';
const jeu=porkosPack.jambonjon;
function etage(n=3){
  let p=nouvellePartie(jeu,42,'ysee');
  while(p.etage<n){const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);p.monstres=[];p=jouer(p,jeu,{type:'agir'});}
  return p;
}
function halte(n=3){const p=etage(n),i=p.carte.cases.indexOf(2);p.monstres=[];p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);return p;}
describe('Refuges de fin d’acte',()=>{
  it('ouvre le coin repos d’une ancienne carte conçue sans refaire la partie',()=>{
    const p=halte(),x=p.joueur.x;delete p.carte.coinRepos;
    for(let y=1;y<=2;y++)for(let dx=-2;dx<=2;dx++)p.carte.cases[y*p.carte.w+x+dx]=1;
    const avant=JSON.stringify(p),q=jouer(p,jeu,{type:'tournerD'});
    expect(JSON.stringify(p)).toBe(avant);expect(q.carte.coinRepos).toEqual({x,y:3});
    expect(q.carte.cases[5*p.carte.w+5]).toBe(p.carte.cases[5*p.carte.w+5]);
    expect(q.sol).toEqual(p.sol);expect(q.alea).toBe(p.alea);expect(q.tour).toBe(p.tour);
  });
  it.each([3,6,9])('étage %s : alcôve ouverte au nord, foyer éclairé et repos auprès de la couchette',n=>{
    const p=halte(n),coin=p.carte.coinRepos!;
    expect(coin).toEqual({x:p.joueur.x,y:3});
    for(let y=1;y<=3;y++)for(let x=coin.x-2;x<=coin.x+2;x++)expect(p.carte.cases[y*p.carte.w+x]).not.toBe(1);
    const a=composerAmbiance(p.carte);expect(a.murs[coin.x]).toBe(10);expect(a.lumiere[p.carte.w+coin.x]).toBeGreaterThan(0);
    p.joueur.y=1;p.joueur.x=coin.x-1;expect(estRefuge(p)).toBe(true);
    expect(relirePartie(JSON.parse(JSON.stringify(p)))?.carte.coinRepos).toEqual(coin);
  });
  it.each([3,6,9])('étage %s : soigne une fois, sans temps ni provisions, et persiste après rechargement',n=>{
    const p=halte(n);p.joueur.pv=1;p.joueur.mousse=0;p.joueur.faim=1;p.joueur.ivresse=5;p.joueur.rpg!.delais=[2,2,2];
    const avant=JSON.stringify(p),q=jouer(p,jeu,{type:'reposer'});
    expect(JSON.stringify(p)).toBe(avant);expect(q.tour).toBe(p.tour);
    expect(q.joueur.pv).toBe(stats(q.joueur).pvMax);expect(q.joueur.mousse).toBe(stats(q.joueur).mousseMax);
    expect(q.joueur.faim).toBe(100);expect(q.joueur.ivresse).toBe(0);expect(q.joueur.rpg!.delais).toEqual([0,0,0]);
    expect(q.joueur.jambons).toBe(p.joueur.jambons);expect(q.joueur.bieres).toBe(p.joueur.bieres);
    const charge=relirePartie(JSON.parse(JSON.stringify(q)))!;expect(reposDisponible(charge)).toBe(false);
    charge.joueur.pv=1;expect(jouer(charge,jeu,{type:'reposer'})).toBe(charge);
    const suite=jouer(q,jeu,{type:'agir'});expect(suite.etage).toBe(n+1);expect(estRefuge(suite)).toBe(false);
  });
  it('refuse le repos et la réaffectation hors de la halte, avec boss ou poursuite',()=>{
    const p=halte();p.refuge=true;p.joueur.y++;
    expect(jouer(p,jeu,{type:'reposer'})).toBe(p);expect(jouer(p,jeu,{type:'repartir'})).toBe(p);
    p.joueur.y--;const boss=etage().monstres.find(m=>m.boss)!;p.monstres=[boss];expect(estRefuge(p)).toBe(false);
    boss.boss=false;boss.eveille=true;expect(estRefuge(p)).toBe(false);
    const hors=halte(2);expect(estRefuge(hors)).toBe(false);
  });
  it.each([3,6,9])('étage %s : équipement garanti, sac plein sans perte, aucune victoire prématurée',n=>{
    let p=etage(n);const boss=p.monstres.find(m=>m.boss)!;p.monstres=[boss];p.sol=[];
    p.joueur.x=boss.x;p.joueur.y=boss.y+1;p.joueur.dir=0;boss.pv=1;
    const objet=p.joueur.equipe.arme!;p.joueur.sac=Array.from({length:12},(_,i)=>({...objet,uid:10000+i}));
    p=jouer(p,jeu,{type:'agir'});expect(p.fin).toBeNull();expect(p.sol).toHaveLength(1);
    const prix=p.sol[0]!;expect(prix.butin.type).toBe('objet');if(prix.butin.type!=='objet')throw Error('butin');
    expect(prix.butin.objet.rarete).toBe(n===3?'garde':'cru');expect(prix.butin.objet.niveau).toBe(n);const uidPrix=prix.butin.objet.uid;
    p.joueur.x=prix.x;p.joueur.y=prix.y;p=jouer(p,jeu,{type:'ramasser'});expect(p.sol).toHaveLength(1);
    p=jouer(p,jeu,{type:'jeter',uid:10000});p=jouer(p,jeu,{type:'ramasser'});
    expect(p.joueur.sac.some(o=>o.uid===uidPrix)).toBe(true);
  });
  it('conserve les anciennes sauvegardes et refuse un registre de repos invalide',()=>{
    const p=halte();expect(relirePartie(JSON.parse(JSON.stringify(p)))).not.toBeNull();
    p.refugesVisites=[3,3];expect(relirePartie(p)).toBeNull();p.refugesVisites=[12];expect(relirePartie(p)).toBeNull();
  });
});
