import { describe,expect,it } from 'vitest';
import { porkosPack } from '../src/content/packs/porkos';
import { jouer,nouvellePartie,type Partie } from '../src/apps/jambonjon/logic';
import { actionRapide,gainsNiveau,impactsCombat,statutCompetence } from '../src/apps/jambonjon/retours-combat';
import { xpNiveauRpg } from '../src/apps/jambonjon/equilibrage';
const jeu=porkosPack.jambonjon;
function fixture(id='colin') {
  const p=nouvellePartie(jeu,42,id);p.joueur.x=3;p.joueur.y=3;p.joueur.dir=0;p.joueur.niveau=3;p.joueur.rpg!.rangs=[1,1,1,0,0,0];
  p.carte={w:7,h:7,cases:Array.from({length:49},(_,i)=>i<7||i>=42||i%7===0||i%7===6?1:0),vu:Array(49).fill(true),decor:Array(49).fill(0)};
  p.monstres=[{uid:900,type:'inspecteur',niveau:1,elite:false,boss:false,x:3,y:2,pv:100,pvMax:100,att:1,def:0,xp:1,eveille:true,sonne:0}];p.sol=[];return p;
}
describe('Retours de combat et commandes directes',()=>{
  it('distingue un niveau insuffisant d’une compétence non apprise',()=>{
    const p=fixture('ysee');p.joueur.rpg!.rangs[3]=0;p.joueur.niveau=1;
    expect(statutCompetence(p,2)).toMatchObject({cle:'jbj.rpg.niveauRequis',n:7,bloquee:true});
    p.joueur.niveau=7;expect(statutCompetence(p,2)).toEqual({cle:'jbj.rpg.aApprendre',bloquee:true});
  });
  it('explique mousse, récupération et portée sans consommer de tour',()=>{
    const p=fixture('ysee');p.joueur.mousse=0;const avant=JSON.stringify(p);
    expect(statutCompetence(p,0)).toMatchObject({cle:'jbj.rpg.manqueMousse',bloquee:true});
    expect(JSON.stringify(p)).toBe(avant);
    p.joueur.rpg!.delais[0]=2;expect(statutCompetence(p,0)).toEqual({cle:'jbj.rpg.delai',n:2,bloquee:true});
    p.joueur.rpg!.delais[0]=0;p.joueur.mousse=40;
    expect(statutCompetence(p,0)).toEqual({cle:'jbj.rpg.pret',bloquee:false});
    p.carte.cases[2*7+3]=1;expect(statutCompetence(p,0)).toEqual({cle:'jbj.rpg.horsPortee',bloquee:false});
  });
  it('ne demande un côté que lorsque les deux pas DPS sont possibles',()=>{
    const p=fixture();expect(actionRapide(p,1)).toBeNull();
    p.carte.cases[3*7+2]=1;expect(actionRapide(p,1)).toEqual({type:'competence',slot:1,cote:'droite'});
    const q=jouer(p,jeu,actionRapide(p,1)!);expect(q.joueur.x).toBe(4);expect(q.tour).toBe(p.tour+1);
    p.carte.cases[3*7+4]=1;expect(actionRapide(p,1)).toEqual({type:'competence',slot:1,cote:undefined});
    expect(actionRapide(fixture('ysee'),1)).toEqual({type:'competence',slot:1});
  });
  it('dérive les vrais dégâts et la mort sans fabriquer un impact pour une action refusée',()=>{
    const p=fixture('ysee'),a={type:'competence',slot:0} as const,q=jouer(p,jeu,a);
    const avant=JSON.stringify(p),effets=impactsCombat(p,q,a,1000);
    expect(effets[0]).toMatchObject({degats:p.monstres[0]!.pv-q.monstres[0]!.pv,style:'sel',mort:false,debut:1000,x:3.5,y:2.5});
    expect(JSON.stringify(p)).toBe(avant);expect(impactsCombat(p,p,a,1000)).toEqual([]);
    p.monstres[0]!.pv=1;const mort=jouer(p,jeu,a);expect(impactsCombat(p,mort,a,1000)[0]).toMatchObject({degats:1,mort:true});
  });
  it('annonce tous les niveaux franchis, points gagnés et compétences accessibles',()=>{
    const p=fixture('ysee');p.joueur.niveau=1;p.joueur.rpg!.rangs=[1,0,0,0,0,0];p.joueur.rpg!.points=0;
    p.monstres[0]!.pv=1;p.monstres[0]!.xp=xpNiveauRpg(1)+xpNiveauRpg(2);
    const q:Partie=jouer(p,jeu,{type:'competence',slot:0}),g=gainsNiveau(p,q)!;
    expect(g).toMatchObject({niveau:3,points:2,debloquees:[1,2]});expect(g.pv).toBeGreaterThan(0);expect(gainsNiveau(q,q)).toBeNull();
  });
});
