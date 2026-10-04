import { describe, expect, it } from 'vitest';
import { porkosPack } from '../src/content/packs/porkos';
import { jouer, nouvellePartie, relirePartie, stats, type Partie } from '../src/apps/jambonjon/logic';
import { buildReference } from '../src/apps/jambonjon/equilibrage';
import { casesMenace } from '../src/apps/jambonjon/boss';

const jeu = porkosPack.jambonjon;
function rencontre(type = 'inspecteur', y = 2): Partie {
  const p = nouvellePartie(jeu, 42, 'berthe');
  p.etage = 4;
  p.carte = { w: 9, h: 9, cases: Array.from({ length: 81 }, (_, i) => i < 9 || i >= 72 || i % 9 === 0 || i % 9 === 8 ? 1 : 0), vu: Array(81).fill(true), decor: Array(81).fill(0) };
  p.joueur.x = 4; p.joueur.y = 5; p.joueur.dir = 0; p.joueur.niveau = 7;
  p.joueur.rpg!.rangs = buildReference(7); p.joueur.rpg!.points = 7 - p.joueur.rpg!.rangs.reduce((a, n) => a + n, 0);
  p.joueur.pv = stats(p.joueur).pvMax; p.joueur.mousse = stats(p.joueur).mousseMax;
  p.monstres = [{ uid: 900, type, niveau: 7, elite: false, boss: false, x: 4, y, pv: 500, pvMax: 500, att: 20, def: 0, xp: 1, eveille: true, sonne: 0 }];
  p.sol = [];
  return p;
}

describe('Attaques ordinaires annoncées', () => {
  it.each([['inspecteur', 2], ['tonneau', 4]] as const)('%s : marque fixe, esquive, récupération puis reprise', (type, y) => {
    let p = rencontre(type, y), pv = p.joueur.pv;
    p = jouer(p, jeu, { type: 'attendre' });
    expect(p.joueur.pv).toBe(pv);
    expect(casesMenace(p.monstres[0]!.rpg!.annonce!)).toEqual([{ x: 4, y: 5 }]);
    expect(p.monstres[0]).toMatchObject({ x: 4, y });
    p = relirePartie(JSON.parse(JSON.stringify(p)))!;
    p = jouer(p, jeu, { type: 'gauche' });
    expect(p.joueur.pv).toBe(pv); expect(p.monstres[0]!.rpg!.annonce).toBeUndefined();
    expect(p.journal.some(m => m.cle === 'jbj.ennemi.reprise')).toBe(true);
    const apresImpact = p.tour;
    p = relirePartie(JSON.parse(JSON.stringify(p)))!;
    p = jouer(p, jeu, { type: 'attendre' });
    expect(p.monstres[0]).toMatchObject({ x: 4, y });
    expect(p.joueur.pv).toBe(pv);
    expect(p.tour).toBe(apresImpact + 1);
    p = jouer(p, jeu, { type: 'attendre' });
    if (type === 'tonneau' && p.monstres[0]!.x === 4 && p.monstres[0]!.y === y) p = jouer(p, jeu, { type: 'attendre' });
    expect(p.monstres[0]!.x === 4 && p.monstres[0]!.y === y).toBe(false);
  });
  it('le verdict touche si l’on reste sur la marque, avec moins de dégâts que l’écrasement', () => {
    const pertes = ['inspecteur', 'tonneau'].map(type => {
      let p = rencontre(type, type === 'tonneau' ? 4 : 2);
      const pv = p.joueur.pv;
      p = jouer(p, jeu, { type: 'attendre' });
      p = jouer(p, jeu, { type: 'attendre' });
      return pv - p.joueur.pv;
    });
    expect(pertes[0]).toBeGreaterThan(0); expect(pertes[1]).toBeGreaterThan(pertes[0]!);
  });
  it('le verdict ne vise ni en diagonale, ni à travers un mur, ni au-delà de trois pas', () => {
    const situations = [rencontre(), rencontre(), rencontre('inspecteur', 1)];
    situations[0]!.monstres[0]!.x = 3;
    situations[1]!.carte.cases[3 * 9 + 4] = 1;
    for (const p of situations) expect(jouer(p, jeu, { type: 'attendre' }).monstres[0]!.rpg!.annonce).toBeUndefined();
  });
  it('le tonneau ne prépare son coup qu’au contact', () => {
    const p = rencontre('tonneau', 3);
    expect(jouer(p, jeu, { type: 'attendre' }).monstres[0]!.rpg!.annonce).toBeUndefined();
  });
  it('un butoir interrompt le coup avant l’impact', () => {
    let p = rencontre('tonneau', 4);
    p = jouer(p, jeu, { type: 'attendre' });
    const pv = p.joueur.pv;
    p = jouer(p, jeu, { type: 'competence', slot: 1 });
    expect(p.monstres[0]!.rpg!.annonce).toBeUndefined(); expect(p.joueur.pv).toBe(pv);
  });
  it('une élite conserve son attaque lourde au contact, sans adopter le tir ordinaire', () => {
    const p = rencontre(); p.monstres[0]!.elite = true;
    expect(jouer(p, jeu, { type: 'attendre' }).monstres[0]!.rpg!.annonce).toBeUndefined();
    const q = rencontre('inspecteur', 4); q.monstres[0]!.elite = true;
    expect(jouer(q, jeu, { type: 'attendre' }).journal.some(m => m.cle === 'jbj.rpg.annonce')).toBe(true);
  });
  it('sans case d’esquive, le tonneau utilise un coup normal, sans écrasement inévitable', () => {
    const p = rencontre('tonneau', 4), pv = p.joueur.pv;
    for (const [x, y] of [[3, 5], [5, 5], [4, 6]]) p.carte.cases[y! * 9 + x!] = 1;
    const q = jouer(p, jeu, { type: 'attendre' });
    expect(q.monstres[0]!.rpg!.annonce).toBeUndefined(); expect(q.joueur.pv).toBeLessThan(pv);
  });
  it('permet aussi d’éviter le tonneau en reculant', () => {
    const p = jouer(rencontre('tonneau', 4), jeu, { type: 'attendre' });
    const q = jouer(p, jeu, { type: 'reculer' });
    expect(q.joueur.y).toBe(6); expect(q.joueur.pv).toBe(p.joueur.pv);
    expect(q.monstres[0]!.rpg!.annonce).toBeUndefined();
  });
  it('tuer le lanceur avant l’impact supprime son attaque', () => {
    let p = rencontre('tonneau', 4); p.monstres[0]!.pv = 1;
    p = jouer(p, jeu, { type: 'attendre' });
    const q = jouer(p, jeu, { type: 'agir' });
    expect(q.monstres).toHaveLength(0); expect(q.joueur.pv).toBe(p.joueur.pv);
  });
  it('la partie historique sans classes conserve le combat classique', () => {
    const p = rencontre('inspecteur', 4); delete p.joueur.rpg;
    const q = jouer(p, jeu, { type: 'attendre' });
    expect(q.monstres[0]!.rpg).toBeUndefined();
    expect(q.journal.some(m => m.cle.startsWith('jbj.ennemi.'))).toBe(false);
  });
});
