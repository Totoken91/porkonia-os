import { describe, expect, it } from "vitest";
import { accel, findShortcut, matchShortcut, menuForKey } from "@/os/menus";
import { porkosPack } from "@/content/packs/porkos";

const ev = (key: string, mods: Partial<{ ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) => ({ key, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

describe("menus de fenêtre", () => {
  it("repère la lettre d'accès", () => {
    expect(accel("&Fichier")).toEqual({ avant: "", lettre: "F", apres: "ichier", cle: "f" });
    expect(accel("Aff&ichage").cle).toBe("i");
    expect(accel("Sans lettre").cle).toBeNull();
  });
  it("reconnaît les raccourcis", () => {
    expect(matchShortcut("Ctrl+S", ev("s", { ctrlKey: true }))).toBe(true);
    expect(matchShortcut("Ctrl+S", ev("s"))).toBe(false);
    expect(matchShortcut("F5", ev("F5"))).toBe(true);
    expect(matchShortcut("F5", ev("F5", { ctrlKey: true }))).toBe(false);
    expect(matchShortcut("Maj+F2", ev("F2", { shiftKey: true }))).toBe(true);
  });
  it("le pack déclare des menus cohérents", () => {
    for (const app of porkosPack.apps) {
      const menus = app.menus ?? [];
      const lettres = menus.map((m) => accel(m.label).cle).filter(Boolean);
      expect(new Set(lettres).size, `lettres d'accès en double dans ${app.id}`).toBe(lettres.length);
      const raccourcis = menus.flatMap((m) => m.items).filter((it) => !("separator" in it) && it.shortcut).map((it) => ("shortcut" in it ? it.shortcut : ""));
      expect(new Set(raccourcis).size, `raccourci en double dans ${app.id}`).toBe(raccourcis.length);
      for (const r of raccourcis) expect(r).not.toMatch(/^Ctrl\+[NTW]$/); // réservés par le navigateur
    }
    const nav = porkosPack.apps.find((a) => a.id === "navigateur")!;
    expect(menuForKey(nav.menus!, "f")).toBe(0);
    expect(findShortcut(nav.menus!, ev("F5"))?.command).toBeTruthy();
  });
});
