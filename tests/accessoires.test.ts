import { describe, expect, it } from "vitest";
import { avancement, cible, etape, fragmenter, type Bloc } from "@/apps/defrag/logic";
import { imageVide, remplir, tamponner, trait } from "@/apps/paint/logic";
import { makeRng } from "@/os/rng";

describe("Défragmenteur", () => {
  it("range le disque sans jamais bouger les blocs système", () => {
    let blocs = fragmenter(300, makeRng(12));
    const vise = cible(blocs);
    const systeme = blocs.map((b, i) => (b === "systeme" ? i : -1)).filter((i) => i >= 0);
    let pas = 0;
    for (let e = etape(blocs, vise); e; e = etape(blocs, vise)) {
      blocs = e.blocs;
      if (++pas > 1000) throw new Error("ne termine pas");
    }
    expect(blocs).toEqual(vise);
    expect(avancement(blocs, vise)).toBe(1);
    for (const i of systeme) expect(blocs[i]).toBe("systeme");
    // Fichiers regroupés par famille, avant le vide.
    const fichiers = blocs.filter((b) => b !== "systeme");
    const premierLibre = fichiers.indexOf("libre");
    expect(fichiers.slice(premierLibre).every((b) => b === "libre")).toBe(true);
    const f = fichiers.slice(0, premierLibre) as number[];
    expect([...f].sort((a, b) => a - b)).toEqual(f);
  });

  it("ne fait rien sur un disque déjà rangé", () => {
    const b: Bloc[] = [0, 0, "systeme", 1, "libre"];
    expect(etape(b, cible(b))).toBeNull();
  });
});

describe("PorkPaint", () => {
  it("remplit une zone fermée sans déborder", () => {
    const im = imageVide(10, 10);
    trait(im, 2, 2, 7, 2, 1);
    trait(im, 7, 2, 7, 7, 1);
    trait(im, 7, 7, 2, 7, 1);
    trait(im, 2, 7, 2, 2, 1);
    expect(remplir(im, 4, 4, 5)).toBe(16);
    expect(im.px[0]).toBe(0);
    expect(im.px[4 * 10 + 4]).toBe(5);
    expect(remplir(im, 4, 4, 5)).toBe(0);
    expect(remplir(im, 0, 0, 3)).toBe(100 - 16 - 20);
  });

  it("trace des traits épais et pose des tampons", () => {
    const im = imageVide(8, 8);
    trait(im, 0, 0, 7, 7, 2, 1);
    expect([0, 9, 18, 63].map((i) => im.px[i])).toEqual([2, 2, 2, 2]);
    const im2 = imageVide(5, 5);
    trait(im2, 2, 2, 2, 2, 4, 3);
    expect(im2.px.filter((p) => p === 4).length).toBe(9);
    tamponner(im2, [".a.", "a.a"], 2, 2);
    expect(im2.px[1 * 5 + 2]).toBe(10);
    expect(im2.px[2 * 5 + 2]).toBe(4);
    const im3 = imageVide(6, 6);
    tamponner(im3, ["a"], 3, 3, 2);
    expect(im3.px.filter((p) => p === 10).length).toBe(4);
  });
});
