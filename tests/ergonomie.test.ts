import { describe, expect, it } from "vitest";
import { aiguilles, decaler, grilleMois } from "@/os/calendrier";
import { ordreRecents, voisine, type Win } from "@/os/windows";

const w = (id: string, z: number, minimized = false) => ({ id, z, minimized }) as Win;

describe("commutateur de tâches", () => {
  it("met la fenêtre active d'abord, puis les plus récentes, les réduites en dernier", () => {
    expect(ordreRecents([w("a", 1), w("b", 5), w("c", 3, true), w("d", 4)], "b")).toEqual(["b", "d", "a", "c"]);
    expect(ordreRecents([w("a", 1), w("b", 2)], null)).toEqual(["b", "a"]);
    expect(ordreRecents([], null)).toEqual([]);
  });
});

describe("croix directionnelle du Poche", () => {
  const pile = [w("a", 1), w("b", 5), w("c", 3, true), w("d", 4)];
  it("gauche ramène le programme d'avant, droite tourne jusqu'au plus ancien", () => {
    expect(voisine(pile, "b", "gauche")).toBe("d");
    expect(voisine(pile, "b", "droite")).toBe("c");
  });
  it("ne fait rien sans autre programme, et ramène l'unique programme s'il est caché", () => {
    expect(voisine([], null, "gauche")).toBeNull();
    expect(voisine([w("a", 1)], "a", "droite")).toBeNull();
    expect(voisine([w("a", 1, true)], null, "droite")).toBe("a");
  });
});

describe("calendrier", () => {
  it("compose les semaines du lundi au dimanche", () => {
    // Septembre 2026 commence un mardi et compte 30 jours.
    const g = grilleMois(2026, 8);
    expect(g[0]).toEqual([null, 1, 2, 3, 4, 5, 6]);
    expect(g.at(-1)).toEqual([28, 29, 30, null, null, null, null]);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    // Février 2021 tient en quatre semaines pile.
    expect(grilleMois(2021, 1)).toHaveLength(4);
  });

  it("passe d'un mois à l'autre, à travers les années", () => {
    expect(decaler(2026, 11, 1)).toEqual({ annee: 2027, mois: 0 });
    expect(decaler(2026, 0, -1)).toEqual({ annee: 2025, mois: 11 });
    expect(decaler(2026, 8, 12)).toEqual({ annee: 2027, mois: 8 });
  });

  it("place les aiguilles", () => {
    expect(aiguilles(new Date(2026, 8, 27, 12, 12, 0))).toEqual({ h: 6, m: 72, s: 0 });
    expect(aiguilles(new Date(2026, 8, 27, 3, 0, 30)).h).toBeCloseTo(90.25);
  });
});
