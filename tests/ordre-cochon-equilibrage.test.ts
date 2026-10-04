import { describe, expect, it } from "vitest";
import { budgetsXpEtages, buildReference, buildValide, coefficients, degatsRpg, ennemiReference, niveauDepuisXp, rangMaximum, statsRpg, xpNiveauRpg, type ClasseRpg } from "../src/apps/jambonjon/equilibrage";
import { simulerCombat } from "../scripts/ordre-cochon/simulation";

const classes: ClasseRpg[] = ["tank", "dps", "jambonmancien"];
const paliers = [[1, 1], [5, 3], [10, 6], [15, 9], [20, 12]] as const;

describe("RPG : budget et progression", () => {
  it("n'invente pas des rangs gratuits pour les combats de référence", () => {
    for (let niveau = 1; niveau <= 20; niveau++) {
      const r = buildReference(niveau);
      expect(buildValide(niveau, r)).toBe(true);
      expect(r.reduce((a, n) => a + n, 0)).toBeLessThanOrEqual(niveau);
    }
    expect(buildValide(20, [5, 5, 5, 5, 5, 5])).toBe(false);
    expect(buildValide(1, [1, 0, 1, 0, 0, 0])).toBe(false);
    expect(rangMaximum(6, 3)).toBe(0);
    expect(rangMaximum(7, 3)).toBe(2);
    expect(rangMaximum(16, 5)).toBe(0);
    expect(rangMaximum(17, 5)).toBe(5);
  });

  it("traite les seuils exacts d'XP et s'arrête au niveau 20", () => {
    const total = Array.from({ length: 19 }, (_, i) => xpNiveauRpg(i + 1)).reduce((a, n) => a + n, 0);
    expect(niveauDepuisXp(xpNiveauRpg(1) - 1).niveau).toBe(1);
    expect(niveauDepuisXp(xpNiveauRpg(1))).toEqual({ niveau: 2, reste: 0 });
    expect(niveauDepuisXp(total - 1).niveau).toBe(19);
    expect(niveauDepuisXp(total)).toEqual({ niveau: 20, reste: 0 });
    expect(niveauDepuisXp(total * 2)).toEqual({ niveau: 20, reste: 0 });
    expect(niveauDepuisXp(total * 0.9).niveau).toBe(19);
    expect(niveauDepuisXp(total * 0.8).niveau).toBe(18);
    expect(budgetsXpEtages()).toHaveLength(12);
    expect(budgetsXpEtages().reduce((a, n) => a + n, 0)).toBe(total);
    expect(() => niveauDepuisXp(-1)).toThrow();
    expect(() => statsRpg("tank", 21, 12)).toThrow();
  });
});

describe("RPG : enveloppe de puissance", () => {
  it("garde les adversaires courants à 3–5 frappes simples avec du matériel courant", () => {
    for (const [niveau, etage] of paliers) for (const classe of classes) {
      const s = statsRpg(classe, niveau, etage);
      const e = ennemiReference(niveau, "courant");
      const coups = Math.ceil(e.pvMax / degatsRpg(s.puissance, e.defense, classe === "jambonmancien" ? 0.9 : 1));
      expect(coups).toBeGreaterThanOrEqual(3);
      expect(coups).toBeLessThanOrEqual(5);
    }
  });

  it("ne multiplie pas toute la puissance du personnage par la rareté de ses objets", () => {
    for (const classe of classes) {
      const normal = statsRpg(classe, 20, 12);
      const rare = statsRpg(classe, 20, 12, "etat");
      expect(rare.puissance / normal.puissance).toBeLessThan(1.15);
      expect(rare.pvMax / normal.pvMax).toBeLessThan(1.1);
    }
  });

  it("préserve une dépense nette de mousse même au rang maximum", () => {
    const c = coefficients("jambonmancien", [5, 5, 5, 5, 5, 5]);
    expect(c.couts.reduce<number>((a, n) => a + n, 0)).toBeLessThanOrEqual(statsRpg("jambonmancien", 1, 1).mousseMax);
    expect(c.couts[2] - Math.floor(c.couts[2] * c.remboursement)).toBeGreaterThan(0);
    expect(c.garde).toBeLessThan(0.65);
    expect(degatsRpg(10, 1_000)).toBe(1);
    expect(degatsRpg(10, 20, 1, 1)).toBeGreaterThan(degatsRpg(10, 20));
  });
});

describe("RPG : combats de référence", () => {
  it("est reproductible et ne dépense jamais une mousse négative", () => {
    const o = { classe: "jambonmancien" as const, niveau: 10, etage: 6, situation: "groupe" as const, graine: 42 };
    expect(simulerCombat(o)).toEqual(simulerCombat(o));
    for (const [niveau, etage] of paliers) for (let graine = 1; graine <= 32; graine++) {
      const r = simulerCombat({ ...o, niveau, etage, graine, mousseInitiale: 0 });
      expect(r.mousseFin).toBeGreaterThanOrEqual(0);
      expect(r.mousseFin).toBeLessThanOrEqual(statsRpg("jambonmancien", niveau, etage).mousseMax);
      expect(r.actions.simple).toBeGreaterThan(0);
    }
  });

  it("permet aux trois classes de battre chaque boss de référence sans consommable ni rareté", () => {
    for (const [niveau, etage] of paliers.slice(1)) for (const classe of classes) for (let graine = 1; graine <= 64; graine++) {
      const r = simulerCombat({ classe, niveau, etage, situation: "boss", graine });
      expect(r.victoire, `${classe}, niveau ${niveau}, graine ${graine}`).toBe(true);
      expect(r.tours).toBeGreaterThanOrEqual(12);
      expect(r.tours).toBeLessThanOrEqual(20);
      expect(r.consommables).toBe(0);
    }
  });

  it("conserve des défaites possibles lorsqu'on ignore les outils de sa classe", () => {
    for (const classe of classes) {
      const r = simulerCombat({ classe, niveau: 20, etage: 12, situation: "boss", graine: 17, simpleSeulement: true });
      expect(r.victoire).toBe(false);
    }
  });
});
