import { describe, expect, it } from "vitest";
import { cellAt, cellPos, defaultLayout, dimsFor, inRect, moveIcons, neighbor, sanitizeLayout } from "@/os/desktop";

const d = dimsFor(800, 572);
const ids = ["a", "b", "c", "d"];

describe("grille du bureau", () => {
  it("range les icônes en colonne, de haut en bas", () => {
    expect(d).toEqual({ cols: 10, rows: 7 });
    expect(defaultLayout(ids, { cols: 10, rows: 3 })).toEqual({ a: { c: 0, r: 0 }, b: { c: 0, r: 1 }, c: { c: 0, r: 2 }, d: { c: 1, r: 0 } });
  });
  it("aimante un point vers la case la plus proche, sans sortir de l'écran", () => {
    expect(cellAt(cellPos({ c: 3, r: 2 }).x + 20, cellPos({ c: 3, r: 2 }).y - 20, d)).toEqual({ c: 3, r: 2 });
    expect(cellAt(5000, -40, d)).toEqual({ c: 9, r: 0 });
  });
  it("ne superpose jamais deux icônes", () => {
    const l = defaultLayout(ids, d);
    const moved = moveIcons(l, ["a"], 0, 1, d); // vers la case de « b »
    const cells = Object.values(moved).map((c) => `${c.c}:${c.r}`);
    expect(new Set(cells).size).toBe(ids.length);
    expect(moved.b).toEqual(l.b);
    expect(moved.a).not.toEqual(l.b);
  });
  it("déplace un groupe d'un seul bloc", () => {
    const l = defaultLayout(ids, d);
    const moved = moveIcons(l, ["a", "b"], 4, 2, d);
    expect(moved.a).toEqual({ c: 4, r: 2 });
    expect(moved.b).toEqual({ c: 4, r: 3 });
  });
  it("répare une disposition enregistrée abîmée", () => {
    const l = sanitizeLayout({ a: { c: 2, r: 2 }, b: { c: 2, r: 2 }, c: { c: 99, r: 0 }, zz: { c: 0, r: 0 } }, ids, d);
    expect(Object.keys(l).sort()).toEqual(ids);
    expect(new Set(Object.values(l).map((c) => `${c.c}:${c.r}`)).size).toBe(ids.length);
    expect(l.a).toEqual({ c: 2, r: 2 });
  });
  it("sélectionne au lasso et navigue au clavier", () => {
    const l = defaultLayout(ids, d);
    expect(inRect(l, { x: 0, y: 0, w: 80, h: 100 }).sort()).toEqual(["a", "b"]);
    expect(neighbor(l, "a", "bas")).toBe("b");
    expect(neighbor(l, "a", "haut")).toBe("a");
  });
});

describe("échelle du moniteur", async () => {
  const { echelle } = await import("@/os/echelle");
  it("arrondit à un nombre entier de pixels physiques quand la perte est faible", () => {
    expect(echelle(1.04, 1, false)).toBe(1);
    expect(echelle(2.1, 1, false)).toBe(2);
    expect(echelle(1.4, 1, false)).toBe(1.4);
    expect(echelle(1.4, 1, true)).toBe(1);
    expect(echelle(1.1, 2, false)).toBe(1); // 2,2 px physiques → 2
    expect(echelle(0.6, 1, true)).toBe(0.6);
  });
});
