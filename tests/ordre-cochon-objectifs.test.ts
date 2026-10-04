import {describe,expect,it} from 'vitest';
import {porkosPack} from '../src/content/packs/porkos';
import {jouer,nouvellePartie,relirePartie} from '../src/apps/jambonjon/logic';
import {xpAccomplissement,xpNiveauRpg,niveauDepuisXp} from '../src/apps/jambonjon/equilibrage';
const jeu=porkosPack.jambonjon;
const sortie=(p:ReturnType<typeof nouvellePartie>)=>{const i=p.carte.cases.indexOf(2);p.joueur.x=i%p.carte.w;p.joueur.y=Math.floor(i/p.carte.w);};
describe('Progression par accomplissement',()=>{
  it('garantit le premier niveau en accomplissant un étage, sans obliger toutes ses rencontres',()=>{
    const p=nouvellePartie(jeu,42,'ysee');sortie(p);const q=jouer(p,jeu,{type:'agir'});
    expect(q.etage).toBe(2);expect(q.joueur.niveau).toBe(2);expect(q.joueur.rpg!.points).toBe(1);
    expect(q.journal.some(e=>e.cle==='jbj.rpg.accomplissement')).toBe(true);expect(q.evenements).toContain('niveau');
    expect(relirePartie(JSON.parse(JSON.stringify(q)))).not.toBeNull();
  });
  it('ne donne aucun bonus pour tourner, attendre ou tenter une descente gardée',()=>{
    let p=nouvellePartie(jeu,42,'berthe');p.monstres=[];sortie(p);p=jouer(p,jeu,{type:'agir'});p.monstres=[];sortie(p);p=jouer(p,jeu,{type:'agir'});sortie(p);p.joueur.dir=0;
    const avant={niveau:p.joueur.niveau,xp:p.joueur.xp};const q=jouer(p,jeu,{type:'agir'});
    expect(q.etage).toBe(3);expect(q.joueur).toMatchObject(avant);
    const t=jouer(q,jeu,{type:'tournerD'});expect(t.joueur).toMatchObject(avant);
    expect(q.journal.filter(e=>e.cle==='jbj.rpg.accomplissement')).toHaveLength(2);
  });
  it('additionne le bonus à l’XP déjà gagnée au combat et conserve les points',()=>{
    const p=nouvellePartie(jeu,42,'colin');p.joueur.xp=50;sortie(p);
    const q=jouer(p,jeu,{type:'agir'}),attendu=niveauDepuisXp(50+xpAccomplissement(1));
    expect(q.joueur.niveau).toBe(attendu.niveau);expect(q.joueur.xp).toBe(attendu.reste);
    expect(q.joueur.rpg!.points).toBe(q.joueur.niveau-1);expect(xpAccomplissement(1)).toBe(xpNiveauRpg(1));
  });
  it('conserve la campagne historique sans RPG et borne le plafond à 20',()=>{
    const ancien=nouvellePartie(jeu,42);sortie(ancien);expect(jouer(ancien,jeu,{type:'agir'}).joueur.xp).toBe(ancien.joueur.xp);
    const p=nouvellePartie(jeu,42,'berthe');p.joueur.niveau=20;p.joueur.rpg!.points=19;sortie(p);
    const q=jouer(p,jeu,{type:'agir'});expect(q.joueur.niveau).toBe(20);expect(q.joueur.xp).toBe(0);
    for(const n of [-1,0,12,13,1.5])expect(xpAccomplissement(n)).toBe(0);
  });
});
