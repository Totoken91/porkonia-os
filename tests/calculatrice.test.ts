import { describe, expect, it } from "vitest";
import { appuyer, calculNeuf, enFrancais, formater, remarque, type Touche } from "@/apps/calculatrice/logic";

const taper = (s: string) => {
  let c = calculNeuf();
  for (const ch of s) {
    const k: Touche =
      ch >= "0" && ch <= "9" ? { t: "chiffre", v: ch } : ch === "," ? { t: "virgule" } : ch === "=" ? { t: "egal" } : ch === "D" ? { t: "douzaine" } : ch === "%" ? { t: "pourcent" } : ch === "C" ? { t: "c" } : { t: "op", v: ch as "+" };
    c = appuyer(c, k);
  }
  return c;
};

describe("Calculatrice d'État", () => {
  it("calcule comme une calculatrice de bureau", () => {
    expect(taper("2+3=").affichage).toBe("5");
    expect(taper("2+3*4=").affichage).toBe("20");
    expect(taper("7/2=").affichage).toBe("3.5");
    expect(enFrancais(taper("1,5+1,25=").affichage)).toBe("2,75");
    expect(taper("200+10%").affichage).toBe("20");
    expect(taper("3D").affichage).toBe("36");
  });

  it("s'arrête à douze chiffres", () => {
    expect(taper("1234567890123").affichage).toBe("123456789012");
    expect(taper("999999999999*10=").erreur).toBe("trop-gros");
    expect(formater(1 / 3)).toBe("0.33333333333");
  });

  it("refuse de diviser par zéro, et C remet tout à zéro", () => {
    const c = taper("5/0=");
    expect(c.erreur).toBe("table-vide");
    expect(appuyer(c, { t: "chiffre", v: "4" })).toBe(c);
    expect(taper("5/0=C").erreur).toBeNull();
  });

  it("commente les nombres qui comptent à Porkonia", () => {
    expect(remarque(taper("5+6="))).toBe("calc.onze");
    expect(remarque(taper("1D"))).toBe("calc.douze");
    expect(remarque(taper("11"))).toBeNull();
    expect(remarque(taper("5/0="))).toBe("calc.table-vide");
  });
});
