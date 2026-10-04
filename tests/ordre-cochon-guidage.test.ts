import { describe, expect, it } from 'vitest';
import { porkosPack } from '../src/content/packs/porkos';
import { conseilSuivant, CONSEILS_DEBUT } from '../src/apps/jambonjon/guidage';
import { jouer, nouvellePartie, relirePartie, stats, type Partie } from '../src/apps/jambonjon/logic';
import { etatMonstre } from '../src/apps/jambonjon/rpg';
const jeu = porkosPack.jambonjon;
function debut(id = 'berthe'): Partie {
  const p = nouvellePartie(jeu, 42, id);
  p.carte = { w: 7, h: 7, cases: Array.from({ length: 49 }, (_, i) => i < 7 || i >= 42 || i % 7 === 0 || i % 7 === 6 ? 1 : 0), vu: Array(49).fill(true), decor: Array(49).fill(0) };
  p.joueur.x = 3; p.joueur.y = 3; p.joueur.dir = 0; p.monstres = []; p.sol = [];
  return p;
}
const conseil = (p: Partie) => conseilSuivant(p, stats(p.joueur).pvMax);
describe('Conseils du premier acte', () => {
  it('donne l’objectif au départ et conserve le registre après sauvegarde', () => {
    const p = debut();
    expect(p.guide).toEqual({ actif: true, vus: ['mission'] });
    expect(p.journal.at(-1)?.cle).toBe('jbj.guide.mission');
    expect(relirePartie(JSON.parse(JSON.stringify(p)))?.guide).toEqual(p.guide);
    for (const id of CONSEILS_DEBUT) expect(porkosPack.strings[`jbj.guide.${id}`]).toBeTruthy();
  });
  it('priorise un besoin de soin sur le premier butin et ne donne qu’un conseil par action', () => {
    const p = debut(); p.joueur.pv = 1;
    p.joueur.sac = [{ ...p.joueur.equipe.arme!, uid: 900 }];
    const avant = JSON.stringify(p), q = jouer(p, jeu, { type: 'attendre' });
    expect(JSON.stringify(p)).toBe(avant);
    expect(q.guide!.vus).toEqual(['mission', 'soin']);
    expect(q.journal.at(-1)?.cle).toBe('jbj.guide.soin');
    const r = jouer(q, jeu, { type: 'attendre' });
    expect(r.guide!.vus).toEqual(['mission', 'soin', 'butin']);
  });
  it('conseille la comparaison à la récupération d’un premier objet, même gratuite', () => {
    const p = debut(); p.sol = [{ x: 3, y: 3, butin: { type: 'objet', objet: { ...p.joueur.equipe.arme!, uid: 900 } } }];
    const q = jouer(p, jeu, { type: 'ramasser' });
    expect(q.tour).toBe(p.tour); expect(q.guide!.vus).toContain('butin');
    const r = jouer(relirePartie(JSON.parse(JSON.stringify(q)))!, jeu, { type: 'attendre' });
    expect(r.journal.filter(m => m.cle === 'jbj.guide.butin')).toHaveLength(1);
  });
  it('montre le point gagné au premier escalier, sans changer l’XP ni le niveau', () => {
    const p = debut(); p.carte.cases[3 * 7 + 3] = 2;
    const q = jouer(p, jeu, { type: 'agir' });
    expect(q.etage).toBe(2); expect(q.joueur.niveau).toBe(2); expect(q.joueur.rpg!.points).toBe(1);
    expect(q.guide!.vus).toContain('niveau'); expect(q.journal.at(-1)?.cle).toBe('jbj.guide.niveau');
  });
  it('explique la descente lorsque l’on atteint un escalier libéré', () => {
    const p = debut(); p.carte.cases[2 * 7 + 3] = 2;
    const q = jouer(p, jeu, { type: 'avancer' });
    expect(q.guide!.vus).toContain('escalier'); expect(q.etage).toBe(1);
    const boss = nouvellePartie(jeu, 42, 'berthe').monstres[0]!;
    boss.boss = true; p.monstres = [boss]; p.joueur.y = 2;
    expect(conseil(p)).not.toBe('escalier');
  });
  it('conseille les compétences devant un ennemi visible, sans traverser les murs', () => {
    const p = debut('ysee'), m = nouvellePartie(jeu, 42, 'berthe').monstres[0]!;
    m.x = 3; m.y = 1; m.eveille = true; p.monstres = [m];
    expect(conseil(p)).toBe('combat'); p.carte.cases[2 * 7 + 3] = 1;
    expect(conseil(p)).toBeNull();
  });
  it('ne promet une riposte après l’esquive que s’il reste une pause de récupération', () => {
    const p = debut(), m = nouvellePartie(jeu, 42, 'berthe').monstres[0]!;
    m.x = 1; m.y = 1; p.monstres = [m]; p.evenements = ['esquive'];
    expect(conseil(p)).toBeNull(); etatMonstre(m).recuperation = p.tour;
    expect(conseil(p)).toBe('esquive');
  });
  it('désactive sans tour ni hasard, conserve les conseils vus et permet de réactiver', () => {
    const p = debut(), q = jouer(p, jeu, { type: 'conseils', actif: false });
    expect(q.guide).toEqual({ actif: false, vus: ['mission'] }); expect(q.tour).toBe(p.tour); expect(q.alea).toBe(p.alea);
    q.joueur.pv = 1; expect(conseil(q)).toBeNull();
    const r = jouer(q, jeu, { type: 'conseils', actif: true }); expect(conseil(r)).toBe('soin');
  });
  it('ne s’impose pas aux sauvegardes existantes sans guide, mais peut être activé', () => {
    const p = debut(); delete p.guide; p.joueur.pv = 1;
    const charge = relirePartie(JSON.parse(JSON.stringify(p)))!;
    expect(conseil(charge)).toBeNull();
    expect(conseil(jouer(charge, jeu, { type: 'conseils', actif: true }))).toBe('soin');
  });
  it.each(['mort', 'victoire', 'acte2', 'historique'] as const)('ne donne pas de conseils en contexte %s', contexte => {
    const p = debut(); p.joueur.pv = 1;
    if (contexte === 'acte2') p.etage = 4;
    else if (contexte === 'historique') delete p.joueur.rpg;
    else p.fin = contexte;
    expect(conseil(p)).toBeNull();
  });
  it('refuse les registres de guide malformés', () => {
    for (const guide of [null, { actif: 'oui', vus: [] }, { actif: true, vus: ['inconnu'] }, { actif: true, vus: ['mission', 'mission'] }]) {
      expect(relirePartie({ ...debut(), guide })).toBeNull();
    }
  });
  it('conserve les mêmes tours, déplacements, ressources et hasard avec ou sans conseils', () => {
    let actif = debut(), muet = jouer(actif, jeu, { type: 'conseils', actif: false });
    actif.joueur.pv = 1; muet.joueur.pv = 1;
    for (const type of ['avancer', 'tournerD', 'avancer', 'manger', 'attendre', 'tournerG', 'avancer'] as const) {
      actif = jouer(actif, jeu, { type }); muet = jouer(muet, jeu, { type });
      const comparable = (p: Partie) => { const { guide, journal, ...reste } = p; void guide; void journal; return reste; };
      expect(comparable(actif)).toEqual(comparable(muet));
    }
  });
});
