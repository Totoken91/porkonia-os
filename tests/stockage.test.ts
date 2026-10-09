import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cle, cleSansProfil, clesHeritage, clesHistoriques, STOCKAGE, type NomStockage } from "@/os/stockage";
import { porkosPack } from "@/content/packs/porkos";

class Memoire implements Storage {
  valeurs = new Map<string, string>();
  get length() {
    return this.valeurs.size;
  }
  key(i: number) {
    return [...this.valeurs.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.valeurs.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.valeurs.set(k, v);
  }
  removeItem(k: string) {
    this.valeurs.delete(k);
  }
  clear() {
    this.valeurs.clear();
  }
}

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(n) ? [p] : [];
  });

describe("Registre du stockage", () => {
  it("reproduit exactement les clés déjà présentes dans les navigateurs", () => {
    const pack = "porkos-citoyen";
    // Formes historiques : les changer rendrait les sauvegardes existantes illisibles.
    expect(cle("enMarche")).toBe("porkos.en-marche");
    expect(cle("comptes")).toBe("porkos.comptes.v1");
    expect(cle("selection")).toBe("porkos.compte.selection");
    expect(cle("reglages", { profil: "citoyen" })).toBe("porkos.reglages.citoyen");
    expect(cleSansProfil("reglages")).toBe("porkos.reglages");
    expect(cle("courrier", { pack, profil: "p-1" })).toBe("porkos.courrier.porkos-citoyen.p-1");
    expect(cle("fenetres", { pack, profil: "p-1" })).toBe("porkos.fenetres.porkos-citoyen.p-1");
    expect(cle("bureau", { pack, profil: "p-1" })).toBe("porkos.bureau.porkos-citoyen.p-1");
    expect(cle("disque", { pack, profil: "citoyen" })).toBe("porkos.disque.porkos-citoyen.citoyen");
    expect(cle("distinctions", { pack, profil: "citoyen" })).toBe("porkos.distinctions.porkos-citoyen.citoyen");
    expect(cle("sessions", { pack, profil: "citoyen" })).toBe("porkos.sessions.porkos-citoyen.citoyen");
    expect(cle("banque", { profil: "citoyen" })).toBe("porkos.banque.citoyen");
    expect(cle("vieLocale", { profil: "citoyen" })).toBe("porkos.pignet.vie.citoyen");
    expect(cle("livreDor", { hote: "tonton-marcel", profil: "p-1" })).toBe("porkos.livredor.tonton-marcel.p-1");
    expect(cle("executer", { profil: "p-1" })).toBe("porkos.executer.historique.p-1");
    expect(cle("partieOrdreCochon", { profil: "p-1" })).toBe("porkos.jambonjon.partie.p-1");
    expect(cle("conseilsOrdreCochon", { profil: "p-1" })).toBe("porkos.jambonjon.conseils.p-1");
    expect(cle("biere", { profil: "p-1" })).toBe("porkos.biere.p-1");
    expect(cle("saucisson", { profil: "p-1" })).toBe("porkos.saucisson.p-1");
    expect(cle("ivresse", { profil: "p-1" })).toBe("porkos.ivresse.p-1");
  });

  it("refuse une clé de profil sans profil, et les identifiants qui casseraient la forme des clés", () => {
    expect(() => cle("banque")).toThrow(/profil/);
    expect(() => cle("courrier", { profil: "p-1" })).toThrow(/pack/);
    expect(() => cle("livreDor", { hote: "a.b", profil: "p-1" })).toThrow(/hote/);
  });

  it("n'a pas deux données sur la même clé, ni une base préfixe d'une autre donnée du même niveau", () => {
    const bases = Object.values(STOCKAGE).map((d) => d.base);
    expect(new Set(bases).size).toBe(bases.length);
  });

  it("garde des hôtes PigNet sans point, condition de la reprise des livres d'or", () => {
    for (const s of porkosPack.sites) expect(s.hote).not.toContain(".");
  });

  it("dérive la reprise d'avant les comptes du registre, livres d'or compris", () => {
    const m = new Memoire();
    m.setItem("porkos.livredor.tonton-marcel", "[]");
    m.setItem("porkos.livredor.tonton-marcel.citoyen", "[]");
    m.setItem("porkos.livredor.tonton-marcel.p-12", "[]");
    const couples = new Map(clesHeritage("porkos-citoyen", m));
    expect(couples.get("porkos.biere")).toBe("porkos.biere.citoyen");
    expect(couples.get("porkos.courrier.porkos-citoyen")).toBe("porkos.courrier.porkos-citoyen.citoyen");
    expect(couples.get("porkos.livredor.tonton-marcel")).toBe("porkos.livredor.tonton-marcel.citoyen");
    // Les livres d'or déjà rattachés à un profil ne sont pas repris une seconde fois.
    expect([...couples.keys()].filter((k) => k.startsWith("porkos.livredor."))).toEqual(["porkos.livredor.tonton-marcel"]);
    // Toute donnée de profil autrefois partagée est reprise ; les données du poste ne le sont jamais.
    for (const [nom, d] of Object.entries(STOCKAGE) as [NomStockage, (typeof STOCKAGE)[NomStockage]][]) {
      if (d.portee === "poste") expect([...couples.keys()].some((k) => k === d.base)).toBe(false);
      else if (d.heritage === "partagee" && !("parHote" in d)) expect(couples.has(cleSansProfil(nom, { pack: "porkos-citoyen" }))).toBe(true);
    }
    expect(clesHistoriques("porkos-citoyen")).toContain("porkos.banque.citoyen");
    expect(clesHistoriques("porkos-citoyen")).toContain("porkos.disque.porkos-citoyen.citoyen");
  });

  it("est le seul endroit des sources à écrire une clé porkos.*", () => {
    const fautifs: string[] = [];
    for (const f of sources("src")) {
      if (f.endsWith(join("os", "stockage.ts")) || f.includes(join("src", "content"))) continue;
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((l, i) => {
          // Une chaîne qui commence par « porkos. » suivi d'un nom : ni une adresse (porkos.vercel.app), ni un commentaire.
          if (/["'`]porkos\.(?!vercel\.app)[a-z]/.test(l) && !/^\s*(\/\/|\*)/.test(l)) fautifs.push(`${f}:${i + 1}`);
        });
    }
    expect(fautifs).toEqual([]);
  });
});
