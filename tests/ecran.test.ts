import { describe, expect, it } from "vitest";
import { BARRE_ETAT, BARRE_NAV, BARRE_TACHES, choisirEcran, choixDansAdresse, echelleHabillage } from "../src/os/ecran";

describe("choisirEcran", () => {
  it("garde le moniteur 800×600 sur un écran d'ordinateur ou une tablette", () => {
    expect(choisirEcran(1366, 800)).toEqual({ mode: "moniteur", w: 800, h: 600, haut: 0, bas: BARRE_TACHES });
    expect(choisirEcran(768, 1024).mode).toBe("moniteur");
  });
  it("passe au Poche sur un téléphone, en portrait comme en paysage, à la taille de l'appareil", () => {
    expect(choisirEcran(390, 844)).toEqual({ mode: "poche", w: 390, h: 844, haut: BARRE_ETAT, bas: BARRE_NAV });
    expect(choisirEcran(844, 390)).toMatchObject({ mode: "poche", w: 844, h: 390 });
  });
  it("respecte un choix imposé et un plancher de taille", () => {
    expect(choisirEcran(1366, 800, "poche").mode).toBe("poche");
    expect(choisirEcran(390, 844, "moniteur")).toMatchObject({ mode: "moniteur", w: 800, h: 600 });
    expect(choisirEcran(200, 150, "poche")).toMatchObject({ w: 300, h: 300 });
  });
  it("lit le choix dans l'adresse", () => {
    expect(choixDansAdresse("?ecran=poche")).toBe("poche");
    expect(choixDansAdresse("?ecran=moniteur&x=1")).toBe("moniteur");
    expect(choixDansAdresse("?ecran=n'importe")).toBe("auto");
    expect(choixDansAdresse("")).toBe("auto");
  });
});

describe("echelleHabillage", () => {
  it("réduit un boîtier trop grand pour la zone", () => {
    expect(echelleHabillage({ w: 560, h: 506 }, { w: 390, h: 768 })).toBe(0.69);
  });
  it("agrandit un petit boîtier sans dépasser le maximum", () => {
    expect(echelleHabillage({ w: 320, h: 300 }, { w: 844, h: 800 })).toBe(1.5);
  });
});
