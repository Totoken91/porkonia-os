import { describe, expect, it } from "vitest";
import { acheter, allocationDisponible, ALLOCATION_JOUR, COMMISSION, coutAchat, crediter, debiter, formaterPork, ouvrir, PRIME_BIENVENUE, produitVente, sanitize, toucherAllocation, valoriser, vendre } from "@/os/banque";
import { boire, ELIMINATION, intensite, MAX_VERRES, niveau, sanitize as sanEbriete, sobre, stade } from "@/os/ivresse";
import { composer, cotes, etoiles, gain, LONGUEUR, simuler } from "@/apps/grosses/course";
import { coursSeance, PAS_SEANCE } from "@/apps/navigateur/portail";
import { porkosPack } from "@/content/packs/porkos";

const t0 = new Date("2026-10-04T10:00:00");

describe("Banque en ligne", () => {
  it("ouvre un compte avec la prime de bienvenue, code à quatre chiffres", () => {
    expect(ouvrir("PK-1", "Citoyen", "12", t0)).toBeNull();
    const c = ouvrir("PK-1", "Citoyen", "1212", t0)!;
    expect(c.solde).toBe(PRIME_BIENVENUE);
    expect(c.historique).toHaveLength(1);
    expect(formaterPork(1250)).toContain("Pork$");
  });

  it("débite et crédite, refuse les montants invalides et le découvert", () => {
    const c = ouvrir("PK-1", "C", "1212", t0)!;
    const d = debiter(c, 30, "Pari", t0);
    expect(d.ok && d.compte.solde).toBe(PRIME_BIENVENUE - 30);
    expect(debiter(c, 1000, "x", t0)).toEqual({ ok: false, erreur: "solde" });
    expect(debiter(c, -5, "x", t0)).toEqual({ ok: false, erreur: "montant" });
    expect(debiter(c, 2.5, "x", t0)).toEqual({ ok: false, erreur: "montant" });
    const k = crediter(c, 40, "Gain", t0);
    expect(k.ok && k.compte.historique[0]!.solde).toBe(PRIME_BIENVENUE + 40);
  });

  it("verse l'allocation une fois par jour", () => {
    const c = ouvrir("PK-1", "C", "1212", t0)!;
    expect(allocationDisponible(c, t0)).toBe(true);
    const r = toucherAllocation(c, t0);
    expect(r.ok && r.compte.solde).toBe(PRIME_BIENVENUE + ALLOCATION_JOUR);
    if (!r.ok) return;
    expect(allocationDisponible(r.compte, t0)).toBe(false);
    expect(toucherAllocation(r.compte, t0).ok).toBe(false);
    expect(allocationDisponible(r.compte, new Date("2026-10-05T08:00:00"))).toBe(true);
  });

  it("achète et vend des titres, commission comprise, prix de revient au prorata", () => {
    const c = ouvrir("PK-1", "C", "1212", t0)!;
    expect(coutAchat(10, 5)).toBe(50 + Math.max(1, Math.round(50 * COMMISSION)));
    const a = acheter(c, "Jambon", 5, 10, t0);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.compte.portefeuille.Jambon).toEqual({ qte: 5, cout: coutAchat(10, 5) });
    expect(a.compte.solde).toBe(PRIME_BIENVENUE - coutAchat(10, 5));
    expect(acheter(a.compte, "Jambon", 500, 10, t0)).toEqual({ ok: false, erreur: "solde" });
    expect(vendre(a.compte, "Jambon", 9, 10, t0)).toEqual({ ok: false, erreur: "quantite" });
    const v = vendre(a.compte, "Jambon", 2, 12, t0);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.compte.portefeuille.Jambon!.qte).toBe(3);
    expect(v.compte.solde).toBe(a.compte.solde + produitVente(12, 2));
    const tout = vendre(v.compte, "Jambon", 3, 12, t0);
    expect(tout.ok && tout.compte.portefeuille.Jambon).toBeUndefined();
    // la commission rend l'aller-retour immédiat perdant
    const aller = acheter(c, "Cornichon", 10, 1.2, t0);
    if (!aller.ok) throw new Error("achat");
    const retour = vendre(aller.compte, "Cornichon", 10, 1.2, t0);
    expect(retour.ok && retour.compte.solde).toBeLessThan(c.solde);
    expect(valoriser(a.compte, { Jambon: 20 }).valeur).toBe(100);
  });

  it("relit un compte conservé et écarte le reste", () => {
    const c = ouvrir("PK-1", "C", "1212", t0)!;
    const a = acheter(c, "Jambon", 2, 10, t0);
    if (!a.ok) throw new Error("achat");
    expect(sanitize(JSON.parse(JSON.stringify(a.compte)))).toEqual(a.compte);
    expect(sanitize({ ...c, solde: -5 })).toBeNull();
    expect(sanitize("n'importe quoi")).toBeNull();
    expect(sanitize({ ...c, portefeuille: { X: { qte: -1, cout: 3 } } })!.portefeuille).toEqual({});
  });
});

describe("Ivresse", () => {
  it("monte avec chaque bière et redescend avec le temps", () => {
    let e = sobre();
    e = boire(e, 1000);
    e = boire(e, 1000, 2);
    expect(niveau(e, 1000)).toBe(3);
    expect(niveau(e, 1000 + 60_000)).toBeCloseTo(3 - 60 * ELIMINATION * 1, 5);
    expect(niveau(e, 1000 + 400_000)).toBe(0);
    expect(boire(sobre(), 0, 99).v).toBe(MAX_VERRES);
  });
  it("gradue les effets", () => {
    expect(intensite(0)).toBe(0);
    expect(intensite(12)).toBe(1);
    expect(intensite(4)).toBeGreaterThan(intensite(2));
    expect(stade(0)).toBe("sobre");
    expect(stade(4)).toBe("rond");
    expect(stade(12)).toBe("fini");
  });
  it("relit un état conservé, redevenu sobre s'il est trop vieux", () => {
    expect(sanEbriete({ v: 5, t: 1000 }, 1000 + 10_000).v).toBe(5);
    expect(sanEbriete({ v: 1, t: 0 }, 10 * 60_000)).toEqual(sobre());
    expect(sanEbriete("x", 0)).toEqual(sobre());
  });
});

describe("Course de Grosses", () => {
  const noms = porkosPack.grosses.cochons;
  const cochons = composer(noms, 42);
  it("compose six cochonnes différentes", () => {
    expect(cochons).toHaveLength(6);
    expect(new Set(cochons.map((c) => c.nom)).size).toBe(6);
    expect(etoiles(cochons[0]!)).toBeGreaterThanOrEqual(1);
  });
  it("simule une course complète, déterministe", () => {
    const r = simuler(cochons, 5);
    expect([...r.classement].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(r.positions.at(-1)!.every((p) => p === LONGUEUR)).toBe(true);
    expect(r.positions.length).toBeGreaterThan(200);
    expect(r.positions.length).toBeLessThan(900);
    expect(simuler(cochons, 5).classement).toEqual(r.classement);
    for (let i = 1; i < r.positions.length; i++) r.positions[i]!.forEach((p, k) => expect(p).toBeGreaterThanOrEqual(r.positions[i - 1]![k]!));
  });
  it("donne des cotes plus basses aux favorites, avec la taxe de l'État", () => {
    const c = cotes(cochons);
    const meilleure = cochons.map((x, k) => ({ k, f: x.vitesse * 2 + x.endurance + x.sprint })).sort((a, b) => b.f - a.f);
    expect(c.gagnant[meilleure[0]!.k]!).toBeLessThan(c.gagnant[meilleure.at(-1)!.k]!);
    const somme = c.gagnant.reduce((a, x) => a + 1 / x, 0);
    expect(somme).toBeGreaterThan(1);
    expect(somme).toBeLessThan(1.4);
    c.place.forEach((x, k) => expect(x).toBeLessThan(c.gagnant[k]!));
    expect(cotes(cochons)).toEqual(c);
  });
  it("paie les paris gagnants et place", () => {
    const c = { gagnant: [3, 4, 5, 6, 7, 8], place: [1.5, 1.6, 1.7, 1.8, 1.9, 2] };
    const classement = [2, 0, 4, 1, 3, 5];
    expect(gain({ type: "gagnant", cochon: 2, mise: 10 }, classement, c)).toBe(50);
    expect(gain({ type: "gagnant", cochon: 0, mise: 10 }, classement, c)).toBe(0);
    expect(gain({ type: "place", cochon: 4, mise: 10 }, classement, c)).toBe(19);
    expect(gain({ type: "place", cochon: 3, mise: 10 }, classement, c)).toBe(0);
  });
});

describe("Séance de bourse", () => {
  it("cote chaque titre, déterministe, avec une série de douze cours", () => {
    const b = porkosPack.portal.bourse;
    const t = new Date("2026-10-04T10:00:07").getTime();
    const c = coursSeance(b, t);
    expect(c).toHaveLength(b.length);
    expect(c.every((x) => x.valeur > 0 && x.serie.length === 12 && x.serie[11] === x.valeur)).toBe(true);
    expect(coursSeance(b, t)).toEqual(c);
    expect(coursSeance(b, t + PAS_SEANCE)[0]!.serie[10]).toBe(c[0]!.valeur);
    expect(new Set(Array.from({ length: 30 }, (_, i) => coursSeance(b, t + i * PAS_SEANCE)[0]!.valeur)).size).toBeGreaterThan(5);
  });
});
