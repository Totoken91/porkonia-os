import { describe, expect, it } from "vitest";
import { autrePiste, formatTemps, titreDefilant } from "@/apps/porkamp/logic";
import { porkosPack } from "@/content/packs/porkos";
import { existsSync } from "node:fs";

describe("PorkAmp", () => {
  it("affiche les temps d'époque", () => {
    expect(formatTemps(0)).toBe("0:00");
    expect(formatTemps(83.9)).toBe("1:23");
    expect(formatTemps(NaN)).toBe("-:--");
  });

  it("enchaîne les pistes en boucle, ou au hasard sans répéter", () => {
    expect(autrePiste(3, 4, 1, false, 0)).toBe(0);
    expect(autrePiste(0, 4, -1, false, 0)).toBe(3);
    for (const r of [0, 0.3, 0.6, 0.999]) expect(autrePiste(2, 4, 1, true, r)).not.toBe(2);
    expect(autrePiste(0, 1, 1, true, 0.5)).toBe(0);
  });

  it("compose le texte défilant", () => {
    expect(titreDefilant(0, { titre: "Merci Copain", artiste: "DJ Viteau" }, 192)).toBe("1. DJ Viteau - Merci Copain (3:12)  ***  ");
  });

  it("ne liste que des pistes présentes dans public/", () => {
    expect(porkosPack.lecteur.pistes.length).toBeGreaterThan(0);
    for (const p of porkosPack.lecteur.pistes) expect(existsSync(`public${p.src}`)).toBe(true);
  });
});
