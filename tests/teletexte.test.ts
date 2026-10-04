import { describe, expect, it } from "vitest";
import { porkosPack } from "@/content/packs/porkos";
import { COLONNES, couper, entete, pageTeletexte, pointilles, voisine } from "@/apps/channel-pork/teletexte-logic";

const d = new Date(2026, 8, 27, 17, 5, 32);

describe("PorkTexte", () => {
  it("coupe les textes à la largeur de l'écran", () => {
    const l = couper("Le Grand Maître a inauguré ce matin une prise USB. Elle fonctionne, et elle a été homologuée.");
    expect(l.length).toBeGreaterThan(1);
    for (const x of l) expect(x.length).toBeLessThanOrEqual(COLONNES - 2);
    expect(couper("a\nb")).toEqual(["a", "b"]);
  });

  it("aligne libellés et numéros sur toute la largeur", () => {
    expect(pointilles("Météo de la mousse", "200")).toHaveLength(COLONNES - 2);
    expect(pointilles("Un libellé beaucoup trop long pour tenir sur une seule ligne", "200")).toHaveLength(COLONNES - 2);
    expect(entete("PORKTEXTE", 100, d)).toBe("P100  PORKTEXTE" + " ".repeat(COLONNES - 15 - 14) + "27/09 17:05:32");
  });

  it("compose les pages, écrites ou tirées du pack", () => {
    const sommaire = pageTeletexte(porkosPack, 100, d)!;
    expect(sommaire.lignes.filter((l) => l.page).map((l) => l.page)).toEqual([101, 200, 300, 400, 500, 888]);
    for (const n of sommaire.lignes.flatMap((l) => (l.page ? [l.page] : []))) expect(pageTeletexte(porkosPack, n, d)).not.toBeNull();
    const programmes = pageTeletexte(porkosPack, 101, d)!;
    expect(programmes.lignes).toHaveLength(porkosPack.channels.length * 3);
    expect(pageTeletexte(porkosPack, 300, d)!.lignes.length).toBeGreaterThan(porkosPack.portal.bourse.length);
    for (const n of [101, 200, 300, 400, 500]) for (const l of pageTeletexte(porkosPack, n, d)!.lignes) expect(l.texte.length).toBeLessThanOrEqual(COLONNES - 1);
    expect(pageTeletexte(porkosPack, 123, d)).toBeNull();
  });

  it("fait défiler les pages diffusées en boucle, sans les pages cachées", () => {
    expect(voisine(porkosPack, 100, 1)).toBe(101);
    expect(voisine(porkosPack, 888, 1)).toBe(100);
    expect(voisine(porkosPack, 100, -1)).toBe(888);
    expect(voisine(porkosPack, 999, -1)).toBe(888);
    expect(voisine(porkosPack, 123, 1)).toBe(200);
  });
});
