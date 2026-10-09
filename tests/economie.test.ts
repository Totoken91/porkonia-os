import { describe, expect, it } from "vitest";
import { acheter, ouvrir, sanitize, type Compte } from "@/os/banque";
import { compteurLibre, demandeResiliation, etatDividende, preleverAbonnement, prixIndexe, primesPour, resilier, souscrire, toucherDividende, verserPrime } from "@/os/economie";
import { boire, eponger, niveau } from "@/os/ivresse";
import { porkosPack } from "@/content/packs/porkos";

const eco = porkosPack.economie;
const jour = (j: number, h = 12) => new Date(2026, 9, j, h);
const compte = (solde = 100): Compte => ({ ...ouvrir("PK-1", "Kenny", "1234", jour(1))!, solde });
const prime = (id: string) => eco.primes.find((p) => p.id === id)!;
const sauc = eco.abonnements.find((a) => a.id === "saucissignal")!;

describe("Primes civiques", () => {
  it("trouve les primes d'un signal, familles comprises", () => {
    expect(primesPour("nappe:conforme", eco.primes).map((p) => p.id)).toEqual(["nappe"]);
    expect(primesPour("tv:integral:eric-saucissignal", eco.primes).map((p) => p.id)).toEqual(["television"]);
    expect(primesPour("nappe:conforme:vii", eco.primes)).toEqual([]);
  });
  it("plafonne par jour et repart le lendemain", () => {
    let c = compte(0);
    for (let k = 0; k < 3; k++) {
      const r = verserPrime(c, prime("nappe"), jour(2, 10 + k));
      expect(r.ok).toBe(true);
      if (r.ok) c = r.compte;
    }
    expect(c.solde).toBe(15);
    expect(verserPrime(c, prime("nappe"), jour(2, 20))).toEqual({ ok: false, erreur: "plafond" });
    expect(verserPrime(c, prime("nappe"), jour(3, 9)).ok).toBe(true);
  });
  it("ne verse une prime unique qu'une fois, même des jours plus tard", () => {
    const r = verserPrime(compte(0), prime("ordre-affineur"), jour(2));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.compte.solde).toBe(150);
    expect(compteurLibre(r.compte, "prime:ordre-affineur", "unique", jour(20))).toBe(false);
    expect(verserPrime(r.compte, prime("ordre-affineur"), jour(20)).ok).toBe(false);
  });
});

describe("Dividende en nature", () => {
  const d = eco.dividendes[0]!;
  it("exige le seuil de parts, puis une fois par jour", () => {
    let c = compte(10_000);
    expect(etatDividende(c, d, jour(2))).toBe("parts");
    const r = acheter(c, d.titre, d.seuil, 12, jour(2));
    if (!r.ok) throw Error(r.erreur);
    c = r.compte;
    expect(etatDividende(c, d, jour(2))).toBe("disponible");
    const apres = toucherDividende(c, d, jour(2))!;
    expect(etatDividende(apres, d, jour(2))).toBe("deja");
    expect(toucherDividende(apres, d, jour(2, 18))).toBeNull();
    expect(etatDividende(apres, d, jour(3))).toBe("disponible");
  });
});

describe("Abonnement Saucissignal", () => {
  it("prélève une fois par période, sans rattrapage, et reporte un impayé", () => {
    let c = souscrire(compte(30), sauc, jour(1));
    expect(souscrire(c, sauc, jour(2))).toBe(c);
    expect(preleverAbonnement(c, sauc, jour(7))).toBeNull();
    const p1 = preleverAbonnement(c, sauc, jour(8, 13))!;
    expect(p1.resultat).toBe("preleve");
    expect(p1.compte.solde).toBe(18);
    c = p1.compte;
    // Trois mois d'absence : une seule échéance à la fois.
    const p2 = preleverAbonnement(c, sauc, jour(28))!;
    expect(p2.n).toBe(2);
    expect(preleverAbonnement(p2.compte, sauc, jour(28, 14))).toBeNull();
    // Solde insuffisant : rien n'est prélevé.
    const pauvre = { ...p2.compte, solde: 3 };
    expect(preleverAbonnement(pauvre, sauc, jour(29 + 7))).toMatchObject({ resultat: "impaye", compte: pauvre });
  });
  it("se résilie par le mot, au correspondant, et plus rien n'est prélevé", () => {
    expect(demandeResiliation(sauc, "Je veux RÉSILIER, Éric.")).toBe(true);
    expect(demandeResiliation(sauc, "je résilie")).toBe(true);
    expect(demandeResiliation(sauc, "Bonjour, ça va ?")).toBe(false);
    const c = resilier(souscrire(compte(), sauc, jour(1)), sauc.id);
    expect(c.abonnements?.[sauc.id]).toBeUndefined();
    expect(preleverAbonnement(c, sauc, jour(30))).toBeNull();
  });
  it("conserve compteurs et abonnements dans la sauvegarde, et écarte le reste", () => {
    const r = verserPrime(souscrire(compte(), sauc, jour(1)), prime("nappe"), jour(1));
    if (!r.ok) throw Error();
    const relu = sanitize(JSON.parse(JSON.stringify(r.compte)))!;
    expect(relu.compteurs).toEqual(r.compte.compteurs);
    expect(relu.abonnements).toEqual(r.compte.abonnements);
    const abime = sanitize({ ...r.compte, compteurs: { x: { jour: "hier", jour_n: -1, total: 1 } }, abonnements: { y: { depuis: "jamais" } } })!;
    expect(abime.compteurs).toBeUndefined();
    expect(abime.abonnements).toBeUndefined();
  });
});

describe("Prix indexés et saucisson", () => {
  it("suit le cours, arrondi, jamais sous 1 Pork$", () => {
    expect(prixIndexe(4, 12, 12)).toBe(4);
    expect(prixIndexe(4, 15, 12)).toBe(5);
    expect(prixIndexe(4, 9, 12)).toBe(3);
    expect(prixIndexe(4, 0.1, 12)).toBe(1);
  });
  it("éponge l'ivresse sans passer sous zéro", () => {
    const ivre = boire({ v: 0, t: 0 }, 1000, 4);
    expect(niveau(eponger(ivre, 1000, eco.eponge), 1000)).toBeCloseTo(4 - eco.eponge);
    expect(niveau(eponger(ivre, 1000, 10), 1000)).toBe(0);
  });
});

describe("Cohérence du pack", () => {
  it("relie primes, dividendes, abonnements et indexation à des éléments qui existent", () => {
    const mails = porkosPack.mails.map((m) => m.id);
    const titres = porkosPack.portal.bourse.map((b) => b.nom);
    expect(mails).toContain("eco-primes");
    for (const a of eco.abonnements) {
      expect(mails).toContain(a.bienvenue);
      for (const r of a.rapports) expect(mails).toContain(r);
      expect(porkosPack.correspondants.map((c) => c.id)).toContain(a.correspondant);
    }
    for (const d of eco.dividendes) expect(titres).toContain(d.titre);
    for (const p of porkosPack.porkomazon.produits) if (p.indexe) expect(titres).toContain(p.indexe);
    expect(new Set(eco.primes.map((p) => p.id)).size).toBe(eco.primes.length);
  });
});
