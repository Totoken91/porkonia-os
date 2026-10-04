import {describe,expect,it} from 'vitest';
import {porkosPack} from '../src/content/packs/porkos';
import {campagneOrdre,premierActe} from '../src/content/packs/ordre-cochon-campagne';
import {assemblerEtage} from '../src/apps/jambonjon/campagne';
import {composerAmbiance} from '../src/apps/jambonjon/ambiance';
import {convertirRpg,distances,jouer,nouvellePartie,relirePartie} from '../src/apps/jambonjon/logic';
const jeu=porkosPack.jambonjon;
describe('Premier acte conçu',()=>{
  it.each(campagneOrdre)('étage $etage : entrée sûre, sortie et réserves accessibles, rencontres espacées',plan=>{
    const avant=JSON.stringify(plan),c=assemblerEtage(plan),d=distances(c,plan.entree.x,plan.entree.y);
    expect(JSON.stringify(plan)).toBe(avant);expect(c.cases.filter(n=>n===2)).toHaveLength(1);
    expect(d[plan.sortie.y*c.w+plan.sortie.x]).toBeGreaterThan(15);
    c.cases.forEach((n,i)=>{if(n!==1)expect(d[i]).toBeGreaterThanOrEqual(0);});
    for(let x=0;x<c.w;x++){expect(c.cases[x]).toBe(1);expect(c.cases[(c.h-1)*c.w+x]).toBe(1);}
    for(let y=0;y<c.h;y++){expect(c.cases[y*c.w]).toBe(1);expect(c.cases[y*c.w+c.w-1]).toBe(1);}
    const occupe=new Set([plan.entree.y*c.w+plan.entree.x,plan.sortie.y*c.w+plan.sortie.x]);
    for(const m of plan.rencontres){const i=m.y*c.w+m.x;expect(d[i]).toBeGreaterThanOrEqual(4);expect(occupe.has(i)).toBe(false);occupe.add(i);expect(jeu.monstres.find(n=>n.id===m.type)).toBeTruthy();}
    for(const r of plan.reserves){const i=r.y*c.w+r.x;expect(d[i]).toBeGreaterThan(0);expect(occupe.has(i)).toBe(false);occupe.add(i);}
    if(plan.gardien){const i=plan.gardien.y*c.w+plan.gardien.x;expect(d[i]).toBeGreaterThan(0);expect(occupe.has(i)).toBe(false);}
    expect(plan.reserves.filter(r=>r.type==='objet').length).toBeGreaterThan(0);
    expect(composerAmbiance(c).torches.length).toBeGreaterThan(0);
  });
  it('garde les plans fixes et des récompenses reproductibles, sans partage de mémoire entre parties',()=>{
    const a=nouvellePartie(jeu,42,'ysee'),b=nouvellePartie(jeu,42,'ysee'),c=nouvellePartie(jeu,123,'colin');
    expect(a).toEqual(b);expect(a.carte.cases).toEqual(c.carte.cases);
    a.carte.cases[1]=0;expect(b.carte.cases[1]).toBe(1);
    expect(b.carte.zones).toHaveLength(b.carte.w*b.carte.h);
    expect(relirePartie(JSON.parse(JSON.stringify(b)))?.carte.zones).toEqual(b.carte.zones);
  });
  it('conserve une ancienne carte pendant sa partie, puis utilise le prochain plan à la descente',()=>{
    const ancien=nouvellePartie(jeu,42),p=convertirRpg(ancien,jeu,'berthe');
    expect(p.carte.cases).toEqual(ancien.carte.cases);expect(p.carte.zones).toBeUndefined();
    const escalier=p.carte.cases.indexOf(2);p.joueur.x=escalier%p.carte.w;p.joueur.y=Math.floor(escalier/p.carte.w);p.monstres=[];
    const q=jouer(p,jeu,{type:'agir'});expect(q.etage).toBe(2);expect(q.carte.cases).toEqual(assemblerEtage(premierActe[1]!).cases);
    const sortie=q.carte.cases.indexOf(2);q.joueur.x=sortie%q.carte.w;q.joueur.y=Math.floor(sortie/q.carte.w);q.monstres=[];
    const r=jouer(q,jeu,{type:'agir'});expect(r.etage).toBe(3);expect(r.carte.cases).toEqual(assemblerEtage(premierActe[2]!).cases);
    expect(r.fin).toBeNull();expect(jeu.etages).toBe(12);
  });
  it('respecte le thème conçu des salles au lieu de le recalculer depuis leurs coordonnées',()=>{
    const c=assemblerEtage(premierActe[0]!),a=composerAmbiance(c);
    // Réserve de tonneaux à droite : aucune décoration de jambon héritée.
    const murs=[...a.murs.entries()].filter(([i])=>i%c.w>=17&&i%c.w<=21&&Math.floor(i/c.w)>=9&&Math.floor(i/c.w)<=15&&c.cases[i]===1).map(([,v])=>v);
    expect(murs).toContain(2);expect(murs).not.toContain(1);
  });
  it('enchaîne douze plans, conserve une XP positive au niveau 20 et place quatre gardiens aux fins d’acte',()=>{
    let p=nouvellePartie(jeu,42,'ysee');
    for(let etage=1;etage<=12;etage++){
      expect(p.etage).toBe(etage);expect(p.carte.cases).toEqual(assemblerEtage(campagneOrdre[etage-1]!).cases);
      expect(p.monstres.every(m=>m.xp>0)).toBe(true);
      expect(p.monstres.filter(m=>m.boss)).toHaveLength(etage%3===0?1:0);
      if(etage<12){const sortie=p.carte.cases.indexOf(2);p.joueur.x=sortie%p.carte.w;p.joueur.y=Math.floor(sortie/p.carte.w);p.monstres=[];p=jouer(p,jeu,{type:'agir'});}
    }
    expect(p.monstres.find(m=>m.boss)).toMatchObject({x:15,y:5,type:'affineur',niveau:20});
  });
  it('ne termine pas une ancienne partie au boss du cinquième étage',()=>{
    const p=nouvellePartie(jeu,42,'ysee');p.etage=5;
    p.monstres=[{...p.monstres[0]!,type:'affineur',boss:true,pv:1,x:p.joueur.x,y:p.joueur.y-1}];
    const q=jouer(p,jeu,{type:'agir'});expect(q.tues).toBe(1);expect(q.fin).toBeNull();
    p.etage=12;expect(jouer(p,jeu,{type:'agir'}).fin).toBe('victoire');
  });
});
