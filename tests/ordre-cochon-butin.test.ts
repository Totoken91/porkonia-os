import { describe, expect, it } from 'vitest';
import { porkosPack } from '../src/content/packs/porkos';
import { distances, jouer, nouvellePartie, relirePartie, type Partie } from '../src/apps/jambonjon/logic';
import { assemblerEtage } from '../src/apps/jambonjon/campagne';

const jeu = porkosPack.jambonjon;
function rencontre(etage = 4, graine = 42): Partie {
  const p = nouvellePartie(jeu, graine, 'berthe');
  p.etage = etage;
  p.carte = { w: 7, h: 7, cases: Array.from({ length: 49 }, (_, i) => i < 7 || i >= 42 || i % 7 === 0 || i % 7 === 6 ? 1 : 0), vu: Array(49).fill(true), decor: Array(49).fill(0) };
  p.joueur.x = 3; p.joueur.y = 3; p.joueur.dir = 0;
  p.monstres = [{ uid: 900, type: 'gobelin', niveau: 1, elite: true, boss: false, x: 3, y: 2, pv: 1, pvMax: 1, att: 1, def: 0, xp: 1, eveille: true, sonne: 0 }];
  p.sol = [];
  return p;
}
function objets(p: Partie) { return p.sol.flatMap(s => s.butin.type === 'objet' ? [s.butin.objet] : []); }

describe('Récompense des élites', () => {
  it('place trois rencontres d’élite déterministes, sans ajouter de boss ni verrouiller les escaliers', () => {
    const elites = jeu.campagne!.flatMap(e => e.rencontres.filter(m => m.elite).map(m => ({ etage: e.etage, m, sortie: e.sortie })));
    expect(elites.map(e => e.etage)).toEqual([4, 8, 10]);
    for (const e of elites) {
      const plan = jeu.campagne!.find(p => p.etage === e.etage)!;
      const carte = assemblerEtage(plan);
      carte.cases[e.m.y * carte.w + e.m.x] = 1;
      // La sortie reste accessible même si l’on contourne la rencontre.
      expect(distances(carte, plan.entree.x, plan.entree.y)[e.sortie.y * carte.w + e.sortie.x]).toBeGreaterThan(0);
    }
  });
  it.each([2, 4, 7, 11])('étage %s : un équipement garanti au niveau de l’étage, avec un seuil de qualité', etage => {
    for (let graine = 1; graine <= 30; graine++) {
      const q = jouer(rencontre(etage, graine), jeu, { type: 'agir' });
      expect(objets(q)).toHaveLength(1);
      const o = objets(q)[0]!;
      expect(o.niveau).toBe(etage);
      expect(etage < 7 ? ['garde', 'cru', 'etat'] : ['cru', 'etat']).toContain(o.rarete);
      expect(jeu.objets.find(d => d.id === o.base)!.etage).toBeLessThanOrEqual(etage);
      expect(q.journal.some(m => m.cle === 'jbj.msg.butinElite')).toBe(true);
    }
  });
  it('préserve les tirages supérieurs au minimum, sans équiper automatiquement', () => {
    const qualites = new Set<string>();
    for (let graine = 1; graine <= 100; graine++) {
      const p = rencontre(4, graine), q = jouer(p, jeu, { type: 'agir' });
      qualites.add(objets(q)[0]!.rarete);
      expect(q.joueur.equipe).toEqual(p.joueur.equipe);
      expect(q.joueur.sac).toEqual(p.joueur.sac);
    }
    expect(qualites).toEqual(new Set(['garde', 'cru', 'etat']));
  });
  it('sac plein : garde le prix au sol après sauvegarde, puis permet de le ramasser', () => {
    let p = rencontre();
    const arme = p.joueur.equipe.arme!;
    p.joueur.sac = Array.from({ length: 12 }, (_, i) => ({ ...arme, uid: 10000 + i }));
    p = jouer(p, jeu, { type: 'agir' });
    const prix = objets(p)[0]!;
    p.joueur.y = 2;
    p = jouer(p, jeu, { type: 'ramasser' });
    expect(objets(p)).toEqual([prix]);
    p = relirePartie(JSON.parse(JSON.stringify(p)))!;
    expect(objets(p)).toEqual([prix]);
    p = jouer(p, jeu, { type: 'jeter', uid: 10000 });
    p = jouer(p, jeu, { type: 'ramasser' });
    expect(p.joueur.sac.filter(o => o.uid === prix.uid)).toEqual([prix]);
    expect(objets(p).some(o => o.uid === prix.uid)).toBe(false);
  });
  it('un ennemi ordinaire ne donne pas systématiquement un équipement', () => {
    let sansObjet = 0;
    for (let graine = 1; graine <= 30; graine++) {
      const p = rencontre(4, graine); p.monstres[0]!.elite = false;
      if (!objets(jouer(p, jeu, { type: 'agir' })).length) sansObjet++;
    }
    expect(sansObjet).toBeGreaterThan(0);
  });
});
