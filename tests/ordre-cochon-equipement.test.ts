import { describe, expect, it } from 'vitest';
import { porkosPack } from '../src/content/packs/porkos';
import { bonusEquipementRpg } from '../src/apps/jambonjon/equipement-rpg';
import { jouer, nouvellePartie, relirePartie } from '../src/apps/jambonjon/logic';

const jeu = porkosPack.jambonjon;
const bonus = (id: string, niveau: number, rarete = 'commun') => bonusEquipementRpg(jeu.objets.find(d => d.id === id)!, niveau, rarete);

describe('Choix d’équipement RPG', () => {
  it.each([4, 8, 12])('armures au %s : protection, compromis ou réserve de PV', n => {
    const cotte = bonus('couennes', n), gilet = bonus('gilet', n), manteau = bonus('manteau', n);
    expect(cotte.def).toBeGreaterThan(gilet.def); expect(gilet.def).toBeGreaterThan(manteau.def);
    expect(manteau.pv).toBeGreaterThan(gilet.pv); expect(gilet.pv).toBeGreaterThan(cotte.pv);
  });
  it.each([2, 6, 12])('coiffes au %s : les compromis sont visibles dès leur découverte', n => {
    const charlotte = bonus('charlotte', n), bob = bonus('bob', n), casque = bonus('casque', n), couronne = bonus('couronne', n);
    expect(casque.def).toBeGreaterThan(bob.def); expect(bob.def).toBeGreaterThan(charlotte.def);
    expect(charlotte.mousse).toBeGreaterThan(bob.mousse); expect(bob.mousse).toBeGreaterThan(casque.mousse);
    expect(couronne.pv).toBeGreaterThan(0); expect(couronne.mousse).toBe(0);
  });
  it.each([5, 8, 12])('armes au %s : hachoir puissant, os pour les PV, louche pour la mousse', n => {
    const hachoir = bonus('hachoir', n), os = bonus('os', n), louche = bonus('louche', n);
    expect(hachoir.att).toBeGreaterThan(os.att); expect(hachoir.att).toBeGreaterThan(louche.att);
    expect(os.pv).toBeGreaterThan(hachoir.pv); expect(louche.mousse).toBeGreaterThan(hachoir.mousse);
  });
  it.each([3, 6, 12])('breloques au %s : défense contre PV, puissance contre mousse', n => {
    const id = bonus('pork-id', n), nappe = bonus('nappe', n), appeau = bonus('appeau', n), decap = bonus('decapsuleur', n);
    expect(id.def).toBeGreaterThan(nappe.def); expect(nappe.pv).toBeGreaterThan(id.pv);
    expect(appeau.att).toBeGreaterThan(decap.att); expect(decap.mousse).toBeGreaterThan(appeau.mousse);
  });
  it('les bonus progressent avec l’étage et la rareté, sans inventer de statistiques absentes', () => {
    for (const def of jeu.objets) {
      expect(def.profilRpg?.description).toBeTruthy();
      for (let n = def.etage; n <= 12; n++) {
        const qualites = jeu.raretes.map(r => bonus(def.id, n, r.id));
        for (const stat of ['att', 'def', 'pv', 'mousse'] as const) {
          qualites.forEach((b, i) => {
            expect(Number.isInteger(b[stat])).toBe(true); expect(b[stat]).toBeGreaterThanOrEqual(0);
            if (!def[stat]) expect(b[stat]).toBe(0);
            if (i) expect(b[stat]).toBeGreaterThanOrEqual(qualites[i - 1]![stat]);
            if (n > def.etage) expect(b[stat]).toBeGreaterThanOrEqual(bonus(def.id, n - 1, jeu.raretes[i]!.id)[stat]);
          });
        }
      }
    }
  });
  it('conserve exactement les valeurs d’un ancien objet au rechargement et à l’équipement', () => {
    const p = nouvellePartie(jeu, 42, 'berthe');
    p.joueur.sac = [{ uid: 800, base: 'manteau', niveau: 6, rarete: 'cru', att: 0, def: 3, pv: 11, mousse: 0 }];
    const ancien = { ...p.joueur.sac[0]! };
    const charge = relirePartie(JSON.parse(JSON.stringify(p)))!;
    expect(charge.joueur.sac[0]).toEqual(ancien);
    const q = jouer(charge, jeu, { type: 'equiper', uid: 800 });
    expect(q.joueur.equipe.armure).toEqual(ancien); expect(q.tour).toBe(p.tour);
  });
  it('applique le profil aux réserves nouvellement créées', () => {
    let p = nouvellePartie(jeu, 42, 'berthe');
    while (p.etage < 6) {
      const i = p.carte.cases.indexOf(2); p.joueur.x = i % p.carte.w; p.joueur.y = Math.floor(i / p.carte.w);
      p.monstres = []; p = jouer(p, jeu, { type: 'agir' });
    }
    const objets = p.sol.flatMap(s => s.butin.type === 'objet' ? [s.butin.objet] : []);
    expect(objets.length).toBeGreaterThan(0);
    for (const o of objets) expect(o).toMatchObject(bonus(o.base, o.niveau, o.rarete));
  });
});
