import { describe, expect, it } from "vitest";
import { porkosPack } from "../src/content/packs/porkos";
import { convertirRpg, jouer, nouvellePartie, relirePartie, stats, type Monstre, type Partie } from "../src/apps/jambonjon/logic";
import { buildReference, xpNiveauRpg } from "../src/apps/jambonjon/equilibrage";
import { etatMonstre, ligne } from "../src/apps/jambonjon/rpg";

const jeu = porkosPack.jambonjon;
function fixture(id = "berthe", niveau = 1): Partie {
  const p = nouvellePartie(jeu, 42, id);
  p.carte = { w: 7, h: 7, cases: Array.from({ length: 49 }, (_, i) => i % 7 === 0 || i % 7 === 6 || i < 7 || i >= 42 ? 1 : 0), vu: Array(49).fill(true), decor: Array(49).fill(0) };
  p.joueur.x = 3; p.joueur.y = 3; p.joueur.dir = 0; p.joueur.niveau = niveau;
  p.joueur.rpg!.rangs = buildReference(niveau); p.joueur.rpg!.points = niveau - p.joueur.rpg!.rangs.reduce((a, n) => a + n, 0);
  p.joueur.pv = stats(p.joueur).pvMax; p.joueur.mousse = stats(p.joueur).mousseMax;
  p.monstres = [monstre(100)]; p.sol = [];
  return p;
}
function monstre(pv: number, x = 3, y = 2, uid = 900): Monstre {
  return { uid, type: "gobelin", niveau: 1, elite: false, boss: false, x, y, pv, pvMax: pv, att: 6, def: 0, xp: 1, eveille: true, sonne: 0 };
}

describe("Ordre Cochon : intégration des classes", () => {
  it("crée les douze chevaliers avec un kit initial viable et une innée identifiée", () => {
    for (const c of jeu.rpg!.chevaliers) {
      const p = nouvellePartie(jeu, 1, c.id);
      expect(p.joueur.rpg!.classe).toBe(c.classe);
      expect(p.joueur.rpg!.rangs).toEqual([1, 0, 0, 0, 0, 0]);
      expect(p.joueur.pv).toBe(stats(p.joueur).pvMax);
      expect(p.joueur.equipe.armure).toBeTruthy();
      expect(relirePartie(JSON.parse(JSON.stringify(p)))).not.toBeNull();
      expect(p.monstres.some((m) => m.elite)).toBe(false);
    }
  });
  it("apprend sans tour et refuse rang prématuré, indice invalide ou point absent", () => {
    let p = fixture("colin"); p.joueur.niveau = 3; p.joueur.rpg!.points = 2;
    const avant = JSON.stringify(p);
    const q = jouer(p, jeu, { type: "apprendre", competence: 2 });
    expect(q.joueur.rpg!.rangs[2]).toBe(1); expect(q.tour).toBe(p.tour);
    expect(JSON.stringify(p)).toBe(avant);
    expect(jouer(q, jeu, { type: "apprendre", competence: 2 })).toBe(q);
    expect(jouer(q, jeu, { type: "apprendre", competence: 3 })).toBe(q);
    expect(jouer(q, jeu, { type: "apprendre", competence: -1 })).toBe(q);
  });
  it("borne le niveau à 20 et ne soigne que partiellement une montée", () => {
    let p = fixture(); p.joueur.pv = 2; p.monstres[0]!.pv = 1; p.monstres[0]!.xp = xpNiveauRpg(1);
    p = jouer(p, jeu, { type: "agir" });
    expect(p.joueur.niveau).toBe(2); expect(p.joueur.rpg!.points).toBe(1);
    expect(p.joueur.pv).toBeGreaterThan(2); expect(p.joueur.pv).toBeLessThan(stats(p.joueur).pvMax);
    p = fixture("berthe", 20); p.monstres[0]!.pv = 1; p.monstres[0]!.xp = 999_999;
    p = jouer(p, jeu, { type: "agir" }); expect(p.joueur.niveau).toBe(20); expect(p.joueur.xp).toBe(0);
  });
  it("garde le sac, la carte et les identifiants lors de la conversion d'une ancienne partie", () => {
    const p = nouvellePartie(jeu, 123); const texte = JSON.stringify(p);
    const q = convertirRpg(p, jeu, "ysee");
    expect(q.carte).toEqual(p.carte); expect(q.joueur.sac).toEqual(p.joueur.sac);
    expect(q.joueur.equipe).toEqual(p.joueur.equipe); expect(q.prochainUid).toBe(p.prochainUid);
    expect(q.joueur.rpg!.chevalier).toBe("ysee"); expect(JSON.stringify(p)).toBe(texte);
    expect(relirePartie(JSON.parse(JSON.stringify(q)))).not.toBeNull();
    q.joueur.rpg!.points = 400; expect(relirePartie(q)).toBeNull();
  });
});

describe("Ordre Cochon : géométrie et économie d'actions", () => {
  it("bloque les sorts et les projectiles au premier mur", () => {
    const p = fixture("heloise"); p.carte.cases[2 * 7 + 3] = 1; p.monstres = [monstre(100, 3, 1)];
    expect(ligne(p, 3)).toHaveLength(0);
    const q = jouer(p, jeu, { type: "competence", slot: 0 });
    expect(q.tour).toBe(p.tour); expect(q.joueur.mousse).toBe(p.joueur.mousse);
    expect(q.monstres[0]!.pv).toBe(100);
  });
  it("repousse sans traverser un mur et donne une collision quand il n'y a pas de place", () => {
    const p = fixture("berthe", 5);
    const q = jouer(p, jeu, { type: "competence", slot: 1 }); expect(q.monstres[0]!.y).toBe(1);
    p.carte.cases[1 * 7 + 3] = 1;
    const r = jouer(p, jeu, { type: "competence", slot: 1 }); expect(r.monstres[0]!.y).toBe(2);
    expect(r.evenements).toContain("collision"); expect(r.monstres[0]!.pv).toBeLessThan(q.monstres[0]!.pv);
  });
  it("déplace le DPS une seule fois et n'autorise pas le côté occupé", () => {
    const p = fixture("roseline", 5); p.carte.cases[3 * 7 + 2] = 1;
    const q = jouer(p, jeu, { type: "competence", slot: 1, cote: "gauche" }); expect(q.tour).toBe(0); expect(q.joueur.x).toBe(3);
    const r = jouer(p, jeu, { type: "competence", slot: 1, cote: "droite" }); expect(r.tour).toBe(1); expect(r.joueur.x).toBe(4);
    p.carte.cases[3 * 7 + 4] = 1;
    const f = jouer(p, jeu, { type: "competence", slot: 1 }); expect(f.tour).toBe(1); expect(f.joueur.x).toBe(3);
    expect(f.joueur.pv).toBeGreaterThan(jouer(p, jeu, { type: "agir" }).joueur.pv);
    expect(f.joueur.rpg!.riposte).toBe(0);
  });
  it("ne récupère pas une compétence en tournant et laisse l'attaque gratuite sans mousse", () => {
    let p = fixture("basile", 5); p = jouer(p, jeu, { type: "competence", slot: 0 });
    const d = [...p.joueur.rpg!.delais]; p = jouer(p, jeu, { type: "tournerG" }); expect(p.joueur.rpg!.delais).toEqual(d);
    p = jouer(p, jeu, { type: "tournerD" }); p.joueur.mousse = 0;
    const q = jouer(p, jeu, { type: "competence", slot: 0 }); expect(q.tour).toBe(p.tour);
    const r = jouer(p, jeu, { type: "agir" }); expect(r.tour).toBe(p.tour + 1); expect(r.joueur.mousse).toBeGreaterThanOrEqual(0);
  });
  it("applique protection, riposte et malédiction sans modifier l'état précédent", () => {
    const p = fixture("gaspard", 5); p.monstres[0]!.att = 20; const avant = JSON.stringify(p);
    const garde = jouer(p, jeu, { type: "competence", slot: 0 });
    const simple = jouer(p, jeu, { type: "agir" });
    expect(garde.joueur.pv).toBeGreaterThan(simple.joueur.pv); expect(garde.joueur.rpg!.riposte).toBeGreaterThan(0);
    expect(JSON.stringify(p)).toBe(avant);
    const mage = fixture("heloise", 5); const m = jouer(mage, jeu, { type: "competence", slot: 0 });
    expect(m.monstres[0]!.rpg!.malediction).toBeGreaterThan(0); expect(mage.monstres[0]!.rpg).toBeUndefined();
  });
  it("annonce une attaque sur une case fixe et récompense l'esquive d'Agathe", () => {
    let p = fixture("agathe", 5); p.monstres[0]!.boss = true;
    p = jouer(p, jeu, { type: "attendre" }); expect(p.monstres[0]!.rpg!.annonce).toEqual({ x: 3, y: 3 });
    const pv = p.joueur.pv; p = jouer(p, jeu, { type: "droite" });
    expect(p.joueur.pv).toBe(pv); expect(p.joueur.rpg!.saigne).toBe(p.tour);
    const recu = jouer(jouer(fixture("agathe", 5), jeu, { type: "attendre" }), jeu, { type: "attendre" }); expect(recu.joueur.pv).toBeLessThan(pv);
  });
});

describe("Ordre Cochon : innées", () => {
  it("protège Odette quand elle boit et réduit le prochain sort de Basile", () => {
    const o = fixture("odette"), b = fixture("basile"); o.joueur.pv = 20;
    expect(jouer(o, jeu, { type: "boire" }).joueur.pv).toBeGreaterThan(jouer({ ...o, joueur: { ...o.joueur, rpg: { ...o.joueur.rpg!, chevalier: "berthe" } } }, jeu, { type: "boire" }).joueur.pv);
    let q = jouer(b, jeu, { type: "boire" }); const mousse = q.joueur.mousse; q = jouer(q, jeu, { type: "competence", slot: 0 });
    expect(mousse - q.joueur.mousse).toBeLessThan(5); expect(q.joueur.rpg!.reduction).toBe(0);
  });
  it("renvoie une seule fois avec Anselme et donne un bouclier de mort avec Marin", () => {
    let p = fixture("anselme"); const q = jouer(p, jeu, { type: "attendre" }); const pv = q.monstres[0]!.pv;
    const r = jouer(q, jeu, { type: "attendre" }); expect(r.monstres[0]!.pv).toBe(pv);
    p = fixture("marin"); p.monstres[0]!.pv = 1; p.monstres.push(monstre(100, 4, 3, 901));
    const m = jouer(p, jeu, { type: "agir" }); expect(m.journal.some((j) => j.cle === "jbj.rpg.recu" && Number(j.vars!.absorbe) > 0)).toBe(true);
  });
  it("transfère la seconde entaille de Colin et traverse avec Ysée sans gain multiple", () => {
    const p = fixture("colin"); p.monstres[0]!.pv = 1; p.monstres.push(monstre(100, 4, 3, 901));
    const q = jouer(p, jeu, { type: "competence", slot: 0 }); expect(q.monstres.find((m) => m.uid === 901)!.pv).toBeLessThan(100);
    const y = fixture("ysee"); y.monstres = [monstre(100, 3, 2), monstre(100, 3, 1, 901)];
    const z = jouer(y, jeu, { type: "agir" }); expect(z.monstres.every((m) => m.pv < 100)).toBe(true);
  });
  it("prépare Roseline, maudit avec Héloïse et repousse une fois avec Théobald", () => {
    const r = fixture("roseline"); r.monstres[0]!.x = 2; r.monstres[0]!.y = 2;
    expect(jouer(r, jeu, { type: "gauche" }).joueur.rpg!.perce).toBe(true);
    const h = fixture("heloise"); h.monstres[0]!.pv = 80;
    expect(jouer(h, jeu, { type: "agir" }).monstres[0]!.rpg!.sale).toBe(true);
    const t = fixture("theobald"); etatMonstre(t.monstres[0]!).contact = 0;
    const u = jouer(t, jeu, { type: "agir" }); expect(u.monstres[0]!.rpg!.reflux).toBe(true);
  });
  it("réaffecte seulement dans un refuge et rejette les sauvegardes avec des points inventés", () => {
    const p = fixture("berthe", 10); expect(jouer(p, jeu, { type: "repartir" })).toBe(p);
    p.refuge = true; p.monstres = [];
    const q = jouer(p, jeu, { type: "repartir" }); expect(q.joueur.rpg!.points).toBe(9); expect(q.tour).toBe(p.tour);
    q.joueur.rpg!.chevalier = "inconnu"; expect(relirePartie(q)).toBeNull();
  });
  it("n'applique pas les passives du Tank aux compétences du mage", () => {
    const p = fixture("ysee", 15); p.joueur.pv = 30;
    const e = etatMonstre(p.monstres[0]!); e.pousse = true;
    const q = jouer(p, jeu, { type: "agir" });
    expect(q.evenements).not.toContain("soin");
    expect(q.joueur.pv).toBeLessThanOrEqual(30);
  });
  it("frappe les trois voisins du Grand revers et laisse l'adversaire derrière intact", () => {
    const p = fixture("berthe", 10);
    p.monstres = [monstre(100, 3, 2), monstre(100, 2, 3, 901), monstre(100, 4, 3, 902), monstre(100, 3, 4, 903)];
    const q = jouer(p, jeu, { type: "competence", slot: 2 });
    expect(q.monstres.filter((m) => m.uid !== 903).every((m) => m.pv < 100)).toBe(true);
    expect(q.monstres.find((m) => m.uid === 903)!.pv).toBe(100);
  });
  it("ne permet pas d'interrompre chaque attaque lourde du boss", () => {
    let p = fixture("berthe", 10); p.monstres[0]!.boss = true;
    p = jouer(p, jeu, { type: "attendre" });
    p = jouer(p, jeu, { type: "competence", slot: 1 });
    expect(p.monstres[0]!.rpg!.interrompu).toBe(true);
    while (!p.monstres[0]!.rpg!.annonce) p = jouer(p, jeu, { type: "attendre" });
    p.joueur.rpg!.delais[1] = 0;
    const pv = p.joueur.pv; p = jouer(p, jeu, { type: "competence", slot: 1 });
    expect(p.joueur.pv).toBeLessThan(pv);
  });
});
