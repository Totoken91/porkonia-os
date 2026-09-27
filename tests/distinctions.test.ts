import { describe, expect, it } from "vitest";
import type { Distinction } from "@/content/types";
import { correspond, etatVide, observer, rang, sanitizeDistinctions } from "@/os/distinctions";

const D = (id: string, trigger: Distinction["trigger"]): Distinction => ({ id, titre: id, motif: "", metal: "bronze", trigger });
const defs: Distinction[] = [
  D("zap", { type: "signal", name: "tv:tour" }),
  D("brume", { type: "signal", name: "tv:integral:brume-*" }),
  D("rafraichir", { type: "signal", name: "nav:actualiser", fois: 3 }),
  D("tele", { type: "app-open", app: "tv" }),
  D("tout", { type: "toutes-applis" }),
  D("fin", { type: "toutes-distinctions" }),
];
const J = "2026-09-27";

describe("distinctions civiques", () => {
  it("décerne sur signal, une seule fois", () => {
    const a = observer(defs, etatVide(), { kind: "signal", name: "tv:tour" }, [], J);
    expect(a.nouvelles.map((d) => d.id)).toEqual(["zap"]);
    expect(a.etat.obtenues.zap).toBe(J);
    expect(observer(defs, a.etat, { kind: "signal", name: "tv:tour" }, [], J).nouvelles).toEqual([]);
  });

  it("accepte les signaux par préfixe", () => {
    expect(correspond("tv:integral:brume-*", "tv:integral:brume-046")).toBe(true);
    expect(correspond("tv:integral:brume-*", "tv:integral:journal")).toBe(false);
    expect(correspond("tv:tour", "tv:tour:2")).toBe(false);
  });

  it("compte les gestes répétés", () => {
    let e = etatVide();
    for (let i = 0; i < 2; i++) {
      const r = observer(defs, e, { kind: "signal", name: "nav:actualiser" }, [], J);
      expect(r.nouvelles).toEqual([]);
      e = r.etat;
    }
    const r = observer(defs, e, { kind: "signal", name: "nav:actualiser" }, [], J);
    expect(r.nouvelles.map((d) => d.id)).toEqual(["rafraichir"]);
    expect(r.etat.compteurs.rafraichir).toBeUndefined();
  });

  it("toutes les applis, puis toutes les distinctions", () => {
    let e = etatVide();
    for (const n of ["tv:tour", "tv:integral:brume-012", "nav:actualiser", "nav:actualiser", "nav:actualiser"]) e = observer(defs, e, { kind: "signal", name: n }, ["tv", "mail"], J).etat;
    e = observer(defs, e, { kind: "app-open", app: "mail" }, ["tv", "mail"], J).etat;
    expect(e.obtenues.tout).toBeUndefined();
    const r = observer(defs, e, { kind: "app-open", app: "tv" }, ["tv", "mail"], J);
    expect(r.nouvelles.map((d) => d.id)).toEqual(["tele", "tout", "fin"]);
  });

  it("donne le rang du dernier seuil franchi", () => {
    const rangs = [{ seuil: 0, titre: "A" }, { seuil: 2, titre: "B" }, { seuil: 5, titre: "C" }];
    expect(rang(rangs, 0)).toBe("A");
    expect(rang(rangs, 4)).toBe("B");
    expect(rang(rangs, 9)).toBe("C");
  });

  it("oublie un état conservé mal formé", () => {
    expect(sanitizeDistinctions({ obtenues: { zap: J, inconnue: J, brume: 3 }, compteurs: { rafraichir: 2, zap: -1 }, applis: ["tv", 4] }, defs)).toEqual({ obtenues: { zap: J }, compteurs: { rafraichir: 2 }, applis: ["tv"] });
    expect(sanitizeDistinctions("n'importe quoi", defs)).toEqual(etatVide());
  });
});
